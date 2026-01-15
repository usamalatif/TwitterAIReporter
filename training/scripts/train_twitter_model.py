"""
Train AI Tweet Detector v2
Uses TweepFake (Kaggle) + short ChatGPT samples for better tweet detection
"""

import os
import sys
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from datasets import load_dataset, Dataset, concatenate_datasets
import torch
from transformers import (
    DistilBertTokenizer,
    DistilBertForSequenceClassification,
    TrainingArguments,
    Trainer
)
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import warnings
warnings.filterwarnings('ignore')

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models" / "twitter-detector-v2"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)

def download_tweepfake():
    """Download TweepFake from Kaggle"""
    tweepfake_path = DATA_DIR / "tweepfake.csv"

    if tweepfake_path.exists():
        print(f"✅ TweepFake already downloaded: {tweepfake_path}")
        return pd.read_csv(tweepfake_path)

    try:
        import kaggle
        print("📥 Downloading TweepFake from Kaggle...")
        kaggle.api.dataset_download_files(
            'mtesconi/twitter-deep-fake-text',
            path=str(DATA_DIR),
            unzip=True
        )

        # Find the CSV file
        for f in DATA_DIR.glob("*.csv"):
            if "tweet" in f.name.lower() or "fake" in f.name.lower():
                df = pd.read_csv(f)
                df.to_csv(tweepfake_path, index=False)
                print(f"✅ TweepFake downloaded: {len(df)} samples")
                return df

    except Exception as e:
        print(f"⚠️ Could not download TweepFake: {e}")
        print("   Set up Kaggle API: https://www.kaggle.com/settings -> Create New Token")
        return None

def load_short_ai_texts(max_samples=30000, max_length=500):
    """Load short AI-generated texts from ai-text-detection-pile"""
    print("📥 Loading short AI texts from ai-text-detection-pile...")

    ds = load_dataset('artem9k/ai-text-detection-pile', split='train')

    # Filter for short texts
    short_ai = []
    short_human = []

    for item in ds:
        text = item['text'].strip()
        if len(text) < max_length and len(text) > 20:
            if item['source'] == 'ai':
                short_ai.append({'text': text, 'label': 1})
            else:
                short_human.append({'text': text, 'label': 0})

        # Early stop if we have enough
        if len(short_ai) >= max_samples and len(short_human) >= max_samples:
            break

    print(f"   Found {len(short_ai)} short AI texts, {len(short_human)} short human texts")

    # Balance the dataset
    min_count = min(len(short_ai), len(short_human), max_samples)
    short_ai = short_ai[:min_count]
    short_human = short_human[:min_count]

    return short_ai + short_human

def prepare_combined_dataset():
    """Combine TweepFake + short AI texts"""
    all_data = []

    # Try to load TweepFake
    tweepfake_df = download_tweepfake()
    if tweepfake_df is not None:
        print(f"📊 TweepFake columns: {tweepfake_df.columns.tolist()}")

        # TweepFake uses 'account.type' column: 'human' or 'bot'
        # and 'text' for the tweet content
        if 'text' in tweepfake_df.columns:
            text_col = 'text'
        elif 'tweet' in tweepfake_df.columns:
            text_col = 'tweet'
        else:
            text_col = tweepfake_df.columns[0]

        if 'account.type' in tweepfake_df.columns:
            label_col = 'account.type'
        elif 'label' in tweepfake_df.columns:
            label_col = 'label'
        else:
            label_col = tweepfake_df.columns[-1]

        for _, row in tweepfake_df.iterrows():
            text = str(row[text_col]).strip()
            label_val = str(row[label_col]).lower()

            # Map to 0=human, 1=AI
            if 'human' in label_val:
                label = 0
            elif 'bot' in label_val or 'ai' in label_val or 'fake' in label_val:
                label = 1
            else:
                continue

            if len(text) > 10:
                all_data.append({'text': text, 'label': label})

        print(f"✅ Added {len(all_data)} samples from TweepFake")

    # Add short AI texts from pile
    pile_data = load_short_ai_texts(max_samples=15000)
    all_data.extend(pile_data)
    print(f"✅ Total dataset: {len(all_data)} samples")

    # Convert to DataFrame and shuffle
    df = pd.DataFrame(all_data)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    # Check balance
    human_count = (df['label'] == 0).sum()
    ai_count = (df['label'] == 1).sum()
    print(f"📊 Human: {human_count}, AI: {ai_count}")

    return df

class TweetDataset(torch.utils.data.Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item['labels'] = torch.tensor(self.labels[idx])
        return item

    def __len__(self):
        return len(self.labels)

def compute_metrics(pred):
    labels = pred.label_ids
    preds = pred.predictions.argmax(-1)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average='binary')
    acc = accuracy_score(labels, preds)
    return {
        'accuracy': acc,
        'f1': f1,
        'precision': precision,
        'recall': recall
    }

def main():
    print("=" * 60)
    print("🐦 AI Tweet Detector v2 Training")
    print("=" * 60)

    # Prepare data
    df = prepare_combined_dataset()

    if len(df) < 1000:
        print("❌ Not enough data. Please set up Kaggle API for TweepFake.")
        print("   1. Go to https://www.kaggle.com/settings")
        print("   2. Click 'Create New Token' under API section")
        print("   3. Move kaggle.json to ~/.kaggle/")
        return

    # Split data
    train_df, test_df = train_test_split(df, test_size=0.1, random_state=42, stratify=df['label'])
    train_df, val_df = train_test_split(train_df, test_size=0.1, random_state=42, stratify=train_df['label'])

    print(f"\n📊 Data splits:")
    print(f"   Train: {len(train_df)}")
    print(f"   Val:   {len(val_df)}")
    print(f"   Test:  {len(test_df)}")

    # Load tokenizer
    print("\n📥 Loading DistilBERT tokenizer...")
    tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')

    # Tokenize
    print("🔤 Tokenizing...")
    train_encodings = tokenizer(train_df['text'].tolist(), truncation=True, padding=True, max_length=128)
    val_encodings = tokenizer(val_df['text'].tolist(), truncation=True, padding=True, max_length=128)
    test_encodings = tokenizer(test_df['text'].tolist(), truncation=True, padding=True, max_length=128)

    # Create datasets
    train_dataset = TweetDataset(train_encodings, train_df['label'].tolist())
    val_dataset = TweetDataset(val_encodings, val_df['label'].tolist())
    test_dataset = TweetDataset(test_encodings, test_df['label'].tolist())

    # Load model
    print("📥 Loading DistilBERT model...")
    model = DistilBertForSequenceClassification.from_pretrained(
        'distilbert-base-uncased',
        num_labels=2
    )

    # Determine device
    if torch.cuda.is_available():
        device = "cuda"
    elif torch.backends.mps.is_available():
        device = "mps"
    else:
        device = "cpu"
    print(f"🖥️  Using device: {device}")

    # Training arguments
    training_args = TrainingArguments(
        output_dir=str(MODEL_DIR / "checkpoints"),
        num_train_epochs=3,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=32,
        warmup_steps=500,
        weight_decay=0.01,
        logging_dir=str(MODEL_DIR / "logs"),
        logging_steps=100,
        eval_strategy="steps",
        eval_steps=500,
        save_strategy="steps",
        save_steps=500,
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        use_mps_device=(device == "mps"),
        fp16=(device == "cuda"),
    )

    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
    )

    # Train
    print("\n🚀 Starting training...")
    trainer.train()

    # Evaluate
    print("\n📊 Evaluating on test set...")
    results = trainer.evaluate(test_dataset)
    print(f"   Accuracy:  {results['eval_accuracy']:.4f}")
    print(f"   F1 Score:  {results['eval_f1']:.4f}")
    print(f"   Precision: {results['eval_precision']:.4f}")
    print(f"   Recall:    {results['eval_recall']:.4f}")

    # Save model
    final_path = MODEL_DIR / "final"
    print(f"\n💾 Saving model to {final_path}...")
    trainer.save_model(str(final_path))
    tokenizer.save_pretrained(str(final_path))

    print("\n✅ Training complete!")
    print(f"   Model saved to: {final_path}")

    # Test some examples
    print("\n🧪 Testing predictions...")
    test_texts = [
        "lol this movie was trash, the ending made no sense at all",
        "The implementation of artificial intelligence in modern healthcare represents a paradigm shift.",
        "just had the best coffee at my local cafe!! ☕️",
        "I believe that leveraging synergies across cross-functional teams enables optimal outcomes.",
        "bro what r u even talking about 😂😂",
    ]

    model.eval()
    model.to(device)

    for text in test_texts:
        inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=1)
            ai_prob = probs[0][1].item()

        label = "🤖 AI" if ai_prob > 0.5 else "👤 Human"
        print(f"   {label} ({ai_prob:.1%}): {text[:60]}...")

if __name__ == "__main__":
    main()

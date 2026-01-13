#!/usr/bin/env python3
"""
TweetGuard AI Detector - Local Training Script
Optimized for Apple Silicon (M1/M2/M3/M4) Macs

Usage:
    python train_local.py

Requirements:
    pip install -r requirements.txt
"""

import os
import sys
import json
import random
import warnings
from pathlib import Path

import numpy as np
import torch
from datasets import load_dataset, Dataset
from transformers import (
    DistilBertTokenizer,
    DistilBertForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

warnings.filterwarnings('ignore')

# ============================================
# Configuration
# ============================================

CONFIG = {
    'model_name': 'distilbert-base-uncased',
    'max_length': 128,
    'batch_size': 16,  # Reduce to 8 if you run out of memory
    'epochs': 3,
    'learning_rate': 5e-5,
    'max_samples_per_class': 15000,  # Reduce for faster training
    'output_dir': './tweetguard_model',
    'tfjs_output_dir': './tweetguard_tfjs_model',
}

# ============================================
# Device Setup (Apple Silicon MPS)
# ============================================

def setup_device():
    """Setup the best available device for training."""
    if torch.backends.mps.is_available():
        device = torch.device("mps")
        print("✅ Using Apple Silicon GPU (MPS)")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
        print("✅ Using NVIDIA GPU (CUDA)")
    else:
        device = torch.device("cpu")
        print("⚠️ Using CPU (training will be slower)")

    return device

# ============================================
# Data Loading & Preparation
# ============================================

def load_and_prepare_data():
    """Load HC3 dataset and prepare for training."""
    print("\n📥 Loading HC3 dataset from HuggingFace...")
    print("   (This may take a few minutes on first run)")

    try:
        hc3 = load_dataset("Hello-SimpleAI/HC3", "all", trust_remote_code=True)
        print(f"   ✅ Loaded {len(hc3['train'])} samples")
    except Exception as e:
        print(f"   ❌ Error loading dataset: {e}")
        print("   Trying alternative loading method...")
        hc3 = load_dataset("Hello-SimpleAI/HC3", trust_remote_code=True)

    return hc3

def extract_texts_and_labels(dataset):
    """Extract human and AI texts from HC3 dataset."""
    texts = []
    labels = []

    print("\n🔄 Extracting texts...")

    for item in dataset:
        # Human answers (label = 0)
        if 'human_answers' in item and item['human_answers']:
            for answer in item['human_answers']:
                if answer and len(answer.strip()) > 20:
                    texts.append(answer.strip())
                    labels.append(0)

        # ChatGPT answers (label = 1)
        if 'chatgpt_answers' in item and item['chatgpt_answers']:
            for answer in item['chatgpt_answers']:
                if answer and len(answer.strip()) > 20:
                    texts.append(answer.strip())
                    labels.append(1)

    return texts, labels

def filter_for_twitter(texts, labels, max_chars=500, min_chars=20):
    """Filter and truncate texts to be Twitter-like."""
    filtered_texts = []
    filtered_labels = []

    for text, label in zip(texts, labels):
        text = text.strip()

        if len(text) < min_chars:
            continue

        # Truncate long texts
        if len(text) > max_chars:
            text = text[:max_chars]
            last_period = text.rfind('.')
            if last_period > max_chars // 2:
                text = text[:last_period + 1]

        filtered_texts.append(text)
        filtered_labels.append(label)

    return filtered_texts, filtered_labels

def balance_dataset(texts, labels, max_per_class):
    """Balance dataset to have equal human and AI samples."""
    human_data = [(t, l) for t, l in zip(texts, labels) if l == 0]
    ai_data = [(t, l) for t, l in zip(texts, labels) if l == 1]

    random.seed(42)
    random.shuffle(human_data)
    random.shuffle(ai_data)

    min_samples = min(len(human_data), len(ai_data), max_per_class)

    balanced = human_data[:min_samples] + ai_data[:min_samples]
    random.shuffle(balanced)

    return [t for t, l in balanced], [l for t, l in balanced]

# ============================================
# Model Training
# ============================================

def compute_metrics(eval_pred):
    """Compute evaluation metrics."""
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=1)

    precision, recall, f1, _ = precision_recall_fscore_support(
        labels, predictions, average='binary'
    )
    accuracy = accuracy_score(labels, predictions)

    return {
        'accuracy': accuracy,
        'f1': f1,
        'precision': precision,
        'recall': recall
    }

def train_model(train_dataset, val_dataset, device):
    """Train the DistilBERT model."""
    print(f"\n🤖 Loading {CONFIG['model_name']}...")

    model = DistilBertForSequenceClassification.from_pretrained(
        CONFIG['model_name'],
        num_labels=2,
        id2label={0: "human", 1: "ai"},
        label2id={"human": 0, "ai": 1}
    )

    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    print(f"   Parameters: {total_params:,}")
    print(f"   Estimated size: {total_params * 4 / 1e6:.1f} MB")

    # Training arguments optimized for Apple Silicon
    training_args = TrainingArguments(
        output_dir='./results',
        num_train_epochs=CONFIG['epochs'],
        per_device_train_batch_size=CONFIG['batch_size'],
        per_device_eval_batch_size=CONFIG['batch_size'] * 2,
        warmup_steps=500,
        weight_decay=0.01,
        logging_dir='./logs',
        logging_steps=100,
        eval_strategy='steps',
        eval_steps=500,
        save_strategy='steps',
        save_steps=500,
        load_best_model_at_end=True,
        metric_for_best_model='f1',
        greater_is_better=True,
        dataloader_num_workers=0,  # Important for MPS
        use_mps_device=(device.type == 'mps'),
        report_to='none',
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
    )

    print(f"\n🚀 Starting training...")
    print(f"   Epochs: {CONFIG['epochs']}")
    print(f"   Batch size: {CONFIG['batch_size']}")
    print(f"   Device: {device}")
    print(f"\n   This will take approximately 1-2 hours on Apple Silicon.")
    print("-" * 50)

    train_result = trainer.train()

    print("-" * 50)
    print(f"✅ Training complete!")
    print(f"   Time: {train_result.metrics['train_runtime'] / 60:.1f} minutes")

    return trainer, model

# ============================================
# Model Export
# ============================================

def save_pytorch_model(model, tokenizer):
    """Save PyTorch model and tokenizer."""
    save_path = CONFIG['output_dir']
    os.makedirs(save_path, exist_ok=True)

    model.save_pretrained(save_path)
    tokenizer.save_pretrained(save_path)

    print(f"\n💾 PyTorch model saved to {save_path}")

    # Calculate size
    total_size = sum(
        os.path.getsize(os.path.join(save_path, f))
        for f in os.listdir(save_path)
    )
    print(f"   Size: {total_size / 1e6:.2f} MB")

def convert_to_tensorflowjs(tokenizer):
    """Convert model to TensorFlow.js format."""
    print("\n🔄 Converting to TensorFlow.js...")

    try:
        from transformers import TFDistilBertForSequenceClassification
        import subprocess

        # Load PyTorch model into TensorFlow
        print("   Loading into TensorFlow...")
        tf_model = TFDistilBertForSequenceClassification.from_pretrained(
            CONFIG['output_dir'],
            from_pt=True
        )

        # Save as TensorFlow SavedModel
        tf_save_path = './tweetguard_tf_model'
        tf_model.save_pretrained(tf_save_path, saved_model=True)
        print(f"   ✅ TensorFlow model saved")

        # Convert to TensorFlow.js
        tfjs_path = CONFIG['tfjs_output_dir']
        os.makedirs(tfjs_path, exist_ok=True)

        saved_model_path = f"{tf_save_path}/saved_model/1"

        print("   Converting to TensorFlow.js (this may take a few minutes)...")
        result = subprocess.run([
            'tensorflowjs_converter',
            '--input_format=tf_saved_model',
            '--output_format=tfjs_graph_model',
            '--quantize_uint8',
            '--skip_op_check',
            saved_model_path,
            tfjs_path
        ], capture_output=True, text=True)

        if result.returncode == 0:
            print(f"   ✅ TensorFlow.js model saved to {tfjs_path}")
        else:
            print(f"   ⚠️ Conversion warning: {result.stderr}")

        # Export vocabulary
        vocab = tokenizer.get_vocab()
        vocab_path = f"{tfjs_path}/vocab.json"
        with open(vocab_path, 'w') as f:
            json.dump(vocab, f)
        print(f"   ✅ Vocabulary exported ({len(vocab)} tokens)")

        # Export tokenizer config
        tokenizer_config = {
            'max_length': CONFIG['max_length'],
            'pad_token_id': tokenizer.pad_token_id,
            'cls_token_id': tokenizer.cls_token_id,
            'sep_token_id': tokenizer.sep_token_id,
            'unk_token_id': tokenizer.unk_token_id,
            'do_lower_case': True
        }
        config_path = f"{tfjs_path}/tokenizer_config.json"
        with open(config_path, 'w') as f:
            json.dump(tokenizer_config, f, indent=2)
        print(f"   ✅ Tokenizer config exported")

        # Calculate final size
        total_size = sum(
            os.path.getsize(os.path.join(tfjs_path, f))
            for f in os.listdir(tfjs_path)
        )
        print(f"\n📦 TensorFlow.js model size: {total_size / 1e6:.2f} MB")

        return True

    except Exception as e:
        print(f"   ❌ Conversion error: {e}")
        print("   You can convert manually later using the Colab notebook.")
        return False

# ============================================
# Test Model
# ============================================

def test_model(model, tokenizer, device):
    """Test model with sample texts."""
    print("\n🧪 Testing model with sample texts...")

    test_samples = [
        "Just had the best coffee at that new place downtown! Highly recommend 🥤",
        "The implementation of machine learning algorithms has revolutionized data processing.",
        "lol cant believe what happened today 😂 my dog literally ate my homework",
        "In conclusion, the systematic analysis demonstrates a clear correlation between variables.",
        "anyone else tired of these AI takes? like just let people enjoy things"
    ]

    model.eval()
    model.to(device)

    print("-" * 60)
    for text in test_samples:
        inputs = tokenizer(
            text,
            return_tensors='pt',
            truncation=True,
            max_length=CONFIG['max_length'],
            padding=True
        )

        # Move to device
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=1)

        human_prob = probs[0][0].item()
        ai_prob = probs[0][1].item()

        prediction = "AI" if ai_prob > 0.5 else "Human"
        confidence = max(human_prob, ai_prob)

        print(f"\nText: {text[:60]}...")
        print(f"Prediction: {prediction} ({confidence*100:.1f}% confidence)")
    print("-" * 60)

# ============================================
# Main
# ============================================

def main():
    print("=" * 60)
    print("🤖 TweetGuard AI Detector - Local Training")
    print("=" * 60)

    # Setup device
    device = setup_device()

    # Load data
    hc3 = load_and_prepare_data()
    texts, labels = extract_texts_and_labels(hc3['train'])
    print(f"   Total extracted: {len(texts)} samples")
    print(f"   Human: {labels.count(0)}, AI: {labels.count(1)}")

    # Filter for Twitter-like content
    texts, labels = filter_for_twitter(texts, labels)
    print(f"\n   After filtering: {len(texts)} samples")

    # Balance dataset
    texts, labels = balance_dataset(texts, labels, CONFIG['max_samples_per_class'])
    print(f"   After balancing: {len(texts)} samples")
    print(f"   Human: {labels.count(0)}, AI: {labels.count(1)}")

    # Split data
    train_texts, temp_texts, train_labels, temp_labels = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )
    val_texts, test_texts, val_labels, test_labels = train_test_split(
        temp_texts, temp_labels, test_size=0.5, random_state=42, stratify=temp_labels
    )

    print(f"\n📊 Dataset splits:")
    print(f"   Train: {len(train_texts)}")
    print(f"   Validation: {len(val_texts)}")
    print(f"   Test: {len(test_texts)}")

    # Load tokenizer
    print(f"\n📝 Loading tokenizer...")
    tokenizer = DistilBertTokenizer.from_pretrained(CONFIG['model_name'])

    # Create datasets
    def tokenize(texts, labels):
        encodings = tokenizer(
            texts,
            padding='max_length',
            truncation=True,
            max_length=CONFIG['max_length'],
            return_tensors='pt'
        )
        dataset = Dataset.from_dict({
            'input_ids': encodings['input_ids'],
            'attention_mask': encodings['attention_mask'],
            'label': labels
        })
        dataset.set_format('torch')
        return dataset

    print("   Tokenizing datasets...")
    train_dataset = tokenize(train_texts, train_labels)
    val_dataset = tokenize(val_texts, val_labels)
    test_dataset = tokenize(test_texts, test_labels)
    print("   ✅ Tokenization complete")

    # Train model
    trainer, model = train_model(train_dataset, val_dataset, device)

    # Evaluate on test set
    print("\n📈 Evaluating on test set...")
    test_results = trainer.evaluate(test_dataset)

    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Accuracy:  {test_results['eval_accuracy']*100:.2f}%")
    print(f"F1 Score:  {test_results['eval_f1']*100:.2f}%")
    print(f"Precision: {test_results['eval_precision']*100:.2f}%")
    print(f"Recall:    {test_results['eval_recall']*100:.2f}%")
    print("=" * 50)

    # Test with samples
    test_model(model, tokenizer, device)

    # Save model
    save_pytorch_model(model, tokenizer)

    # Convert to TensorFlow.js
    convert_to_tensorflowjs(tokenizer)

    # Final instructions
    print("\n" + "=" * 60)
    print("✅ TRAINING COMPLETE!")
    print("=" * 60)
    print(f"\nNext steps:")
    print(f"1. Copy model files from '{CONFIG['tfjs_output_dir']}/' to your extension's 'model/' folder")
    print(f"2. Update your extension to use the real model")
    print(f"\nModel files location:")
    print(f"   {os.path.abspath(CONFIG['tfjs_output_dir'])}")
    print("=" * 60)

if __name__ == '__main__':
    main()

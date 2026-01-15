#!/usr/bin/env python3
"""
Train DistilBERT model for AI text detection.

This script fine-tunes DistilBERT on the prepared dataset for
detecting AI-generated text, optimized for short social media content.

Usage:
    python train_model.py --data ../data --output ../models/distilbert-ai-detector

Features:
    - Mixed precision training (FP16) for faster training
    - Gradient accumulation for larger effective batch sizes
    - Early stopping to prevent overfitting
    - Best model checkpointing
    - Detailed evaluation metrics
"""

import argparse
import json
import os
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    DistilBertTokenizer,
    DistilBertForSequenceClassification,
    Trainer,
    TrainingArguments,
    EarlyStoppingCallback,
    DataCollatorWithPadding,
)
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
)
from tqdm import tqdm


class AIDetectionDataset(Dataset):
    """Custom dataset for AI text detection."""

    def __init__(self, data: list, tokenizer, max_length: int = 128):
        self.data = data
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        item = self.data[idx]
        text = item['text']
        label = item['label']

        # Tokenize
        encoding = self.tokenizer(
            text,
            truncation=True,
            max_length=self.max_length,
            padding='max_length',
            return_tensors='pt'
        )

        return {
            'input_ids': encoding['input_ids'].squeeze(),
            'attention_mask': encoding['attention_mask'].squeeze(),
            'labels': torch.tensor(label, dtype=torch.long)
        }


def load_data(data_dir: Path):
    """Load train/val/test datasets."""
    train_path = data_dir / "train.json"
    val_path = data_dir / "val.json"
    test_path = data_dir / "test.json"

    with open(train_path, 'r', encoding='utf-8') as f:
        train_data = json.load(f)
    with open(val_path, 'r', encoding='utf-8') as f:
        val_data = json.load(f)
    with open(test_path, 'r', encoding='utf-8') as f:
        test_data = json.load(f)

    return train_data, val_data, test_data


def compute_metrics(eval_pred):
    """Compute evaluation metrics."""
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=1)

    accuracy = accuracy_score(labels, predictions)
    precision, recall, f1, _ = precision_recall_fscore_support(
        labels, predictions, average='binary'
    )

    return {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
    }


def evaluate_model(model, tokenizer, test_data, device, max_length=128):
    """Detailed evaluation on test set."""
    model.eval()

    all_preds = []
    all_labels = []
    all_probs = []

    test_dataset = AIDetectionDataset(test_data, tokenizer, max_length)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)

    with torch.no_grad():
        for batch in tqdm(test_loader, desc="Evaluating"):
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels']

            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            logits = outputs.logits

            probs = torch.softmax(logits, dim=1)
            preds = torch.argmax(probs, dim=1)

            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.numpy())
            all_probs.extend(probs[:, 1].cpu().numpy())  # Probability of AI class

    # Calculate metrics
    accuracy = accuracy_score(all_labels, all_preds)
    precision, recall, f1, _ = precision_recall_fscore_support(
        all_labels, all_preds, average='binary'
    )
    conf_matrix = confusion_matrix(all_labels, all_preds)

    print("\n" + "=" * 60)
    print("📊 Test Set Evaluation Results")
    print("=" * 60)
    print(f"\nAccuracy: {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1 Score: {f1:.4f}")
    print(f"\nConfusion Matrix:")
    print(f"  TN: {conf_matrix[0][0]:5d}  FP: {conf_matrix[0][1]:5d}")
    print(f"  FN: {conf_matrix[1][0]:5d}  TP: {conf_matrix[1][1]:5d}")
    print("\nClassification Report:")
    print(classification_report(
        all_labels, all_preds,
        target_names=['Human', 'AI']
    ))

    return {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'confusion_matrix': conf_matrix.tolist(),
    }


def main():
    parser = argparse.ArgumentParser(description="Train AI detection model")
    parser.add_argument("--data", type=str, default="../data",
                       help="Path to data directory")
    parser.add_argument("--output", type=str, default="../models/distilbert-ai-detector",
                       help="Output directory for model")
    parser.add_argument("--epochs", type=int, default=5,
                       help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32,
                       help="Training batch size")
    parser.add_argument("--learning-rate", type=float, default=2e-5,
                       help="Learning rate")
    parser.add_argument("--max-length", type=int, default=128,
                       help="Maximum sequence length")
    parser.add_argument("--warmup-steps", type=int, default=500,
                       help="Number of warmup steps")
    parser.add_argument("--weight-decay", type=float, default=0.01,
                       help="Weight decay for regularization")
    parser.add_argument("--fp16", action="store_true",
                       help="Use mixed precision training")
    parser.add_argument("--gradient-accumulation", type=int, default=1,
                       help="Gradient accumulation steps")
    args = parser.parse_args()

    # Set up paths
    data_dir = Path(args.data)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Device setup
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🖥️ Using device: {device}")

    if device.type == "cuda":
        print(f"  GPU: {torch.cuda.get_device_name(0)}")
        print(f"  Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

    # Load data
    print("\n📂 Loading data...")
    train_data, val_data, test_data = load_data(data_dir)
    print(f"  Train: {len(train_data)} samples")
    print(f"  Val: {len(val_data)} samples")
    print(f"  Test: {len(test_data)} samples")

    # Load tokenizer and model
    print("\n🤖 Loading DistilBERT model...")
    model_name = "distilbert-base-uncased"
    tokenizer = DistilBertTokenizer.from_pretrained(model_name)
    model = DistilBertForSequenceClassification.from_pretrained(
        model_name,
        num_labels=2,
        id2label={0: "Human", 1: "AI"},
        label2id={"Human": 0, "AI": 1},
    )
    model.to(device)

    # Create datasets
    train_dataset = AIDetectionDataset(train_data, tokenizer, args.max_length)
    val_dataset = AIDetectionDataset(val_data, tokenizer, args.max_length)

    # Training arguments
    training_args = TrainingArguments(
        output_dir=str(output_dir / "checkpoints"),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size * 2,
        learning_rate=args.learning_rate,
        warmup_steps=args.warmup_steps,
        weight_decay=args.weight_decay,
        gradient_accumulation_steps=args.gradient_accumulation,
        fp16=args.fp16 and torch.cuda.is_available(),
        logging_dir=str(output_dir / "logs"),
        logging_steps=100,
        eval_strategy="steps",
        eval_steps=500,
        save_strategy="steps",
        save_steps=500,
        save_total_limit=3,
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        greater_is_better=True,
        report_to="none",  # Disable wandb/tensorboard
        dataloader_num_workers=0,  # Avoid multiprocessing issues
    )

    # Data collator
    data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        tokenizer=tokenizer,
        data_collator=data_collator,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
    )

    # Train
    print("\n🚀 Starting training...")
    print(f"  Epochs: {args.epochs}")
    print(f"  Batch size: {args.batch_size}")
    print(f"  Learning rate: {args.learning_rate}")
    print(f"  Max length: {args.max_length}")

    train_result = trainer.train()

    # Save final model
    print("\n💾 Saving model...")
    trainer.save_model(str(output_dir / "final"))
    tokenizer.save_pretrained(str(output_dir / "final"))

    # Evaluate on test set
    print("\n🧪 Evaluating on test set...")
    test_metrics = evaluate_model(
        model, tokenizer, test_data, device, args.max_length
    )

    # Save training info
    training_info = {
        'model_name': model_name,
        'training_args': {
            'epochs': args.epochs,
            'batch_size': args.batch_size,
            'learning_rate': args.learning_rate,
            'max_length': args.max_length,
            'warmup_steps': args.warmup_steps,
            'weight_decay': args.weight_decay,
        },
        'train_samples': len(train_data),
        'val_samples': len(val_data),
        'test_samples': len(test_data),
        'test_metrics': test_metrics,
        'training_time': str(datetime.now()),
    }

    with open(output_dir / "training_info.json", 'w') as f:
        json.dump(training_info, f, indent=2)

    print("\n" + "=" * 60)
    print("✅ Training complete!")
    print("=" * 60)
    print(f"\nModel saved to: {output_dir / 'final'}")
    print(f"\nNext steps:")
    print(f"  1. Export to TensorFlow.js: python export_model.py --model {output_dir / 'final'}")


if __name__ == "__main__":
    main()

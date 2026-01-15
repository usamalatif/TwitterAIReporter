#!/usr/bin/env python3
"""
Download and prepare datasets for AI text detection training.

Datasets used:
1. HC3 (Human ChatGPT Comparison Corpus) - 40k Q&A pairs
2. ai-text-detection-pile - Large scale GPT2/3/ChatGPT texts
3. Optional: Additional tweet-specific data

Usage:
    python download_datasets.py --output ../data
"""

import argparse
import json
import os
from pathlib import Path

from datasets import load_dataset, concatenate_datasets
from tqdm import tqdm
import pandas as pd


def download_hc3(output_dir: Path, max_samples: int = None):
    """
    Download HC3 dataset from Hugging Face.
    Contains human expert answers and ChatGPT answers.
    """
    print("\n📥 Downloading HC3 dataset...")

    all_data = []

    try:
        # Try loading without subset specification (new format)
        ds = load_dataset("Hello-SimpleAI/HC3", "all", split="train", trust_remote_code=True)

        for item in tqdm(ds, desc="Processing HC3"):
            question = item.get('question', '')

            # Human answers (label = 0)
            human_answers = item.get('human_answers', [])
            for answer in human_answers:
                if answer and len(answer.strip()) > 20:
                    all_data.append({
                        'text': answer.strip(),
                        'label': 0,  # Human
                        'source': 'hc3',
                        'category': 'qa'
                    })

            # ChatGPT answers (label = 1)
            chatgpt_answers = item.get('chatgpt_answers', [])
            for answer in chatgpt_answers:
                if answer and len(answer.strip()) > 20:
                    all_data.append({
                        'text': answer.strip(),
                        'label': 1,  # AI
                        'source': 'hc3',
                        'category': 'qa'
                    })

            if max_samples and len(all_data) >= max_samples:
                break

    except Exception as e:
        print(f"  Warning: Could not load HC3: {e}")
        print("  Trying alternative datasets...")

    if max_samples and len(all_data) > max_samples:
        import random
        random.shuffle(all_data)
        all_data = all_data[:max_samples]

    print(f"  ✅ HC3: {len(all_data)} samples")
    return all_data


def download_ai_detection_pile(output_dir: Path, max_samples: int = None):
    """
    Download artem9k/ai-text-detection-pile dataset.
    Contains GPT2, GPT3, ChatGPT generated text.
    """
    print("\n📥 Downloading ai-text-detection-pile...")

    all_data = []

    try:
        ds = load_dataset("artem9k/ai-text-detection-pile", split="train")

        # Debug: check first item structure
        first_item = next(iter(ds))
        print(f"  Dataset columns: {list(first_item.keys())}")
        print(f"  Sample item: {first_item}")

        for item in tqdm(ds, desc="Processing ai-detection-pile"):
            text = item.get('text', '')
            # Label might be 'generated' (1=AI) or 'label' field
            label = item.get('generated', item.get('label', 0))

            # Convert string labels
            if isinstance(label, str):
                label = 1 if label.lower() in ['ai', 'generated', 'gpt', '1', 'true'] else 0
            elif isinstance(label, bool):
                label = 1 if label else 0

            source = item.get('source', 'unknown')

            if text and len(text.strip()) > 20:
                all_data.append({
                    'text': text.strip(),
                    'label': int(label),
                    'source': f'pile_{source}',
                    'category': 'essay'
                })

            if max_samples and len(all_data) >= max_samples:
                break

    except Exception as e:
        print(f"  Warning: Could not load ai-text-detection-pile: {e}")

    # Print label distribution
    if all_data:
        human_count = sum(1 for d in all_data if d['label'] == 0)
        ai_count = sum(1 for d in all_data if d['label'] == 1)
        print(f"  Distribution: {human_count} human, {ai_count} AI")

    print(f"  ✅ ai-detection-pile: {len(all_data)} samples")
    return all_data


def download_chatgpt_detection(output_dir: Path, max_samples: int = None):
    """
    Download additional ChatGPT detection datasets.
    """
    print("\n📥 Downloading additional ChatGPT detection data...")

    all_data = []

    # Try Hello-SimpleAI/chatgpt-detector-roberta dataset
    try:
        print("  Trying chatgpt-detector-roberta dataset...")
        ds = load_dataset("Hello-SimpleAI/chatgpt-detector-roberta", split="train", trust_remote_code=True)

        for item in tqdm(ds, desc="Processing chatgpt-detector"):
            text = item.get('text', '')
            label = item.get('label', 0)

            if text and len(text.strip()) > 20:
                all_data.append({
                    'text': text.strip(),
                    'label': int(label),
                    'source': 'chatgpt_detector',
                    'category': 'mixed'
                })

            if max_samples and len(all_data) >= max_samples:
                break

    except Exception as e:
        print(f"  Warning: Could not load chatgpt-detector-roberta: {e}")

    # Try NicolaiSivesworried/ChatGPT-Research-Dataset
    if len(all_data) < (max_samples or 10000):
        try:
            print("  Trying ChatGPT-Research-Dataset...")
            ds = load_dataset("NicolaiSivesworried/ChatGPT-Research-Dataset", split="train", trust_remote_code=True)

            for item in tqdm(ds, desc="Processing ChatGPT-Research"):
                human_text = item.get('human_text', '') or item.get('Human', '')
                ai_text = item.get('ai_text', '') or item.get('ChatGPT', '') or item.get('chatgpt_text', '')

                if human_text and len(human_text.strip()) > 20:
                    all_data.append({
                        'text': human_text.strip(),
                        'label': 0,  # Human
                        'source': 'chatgpt_research',
                        'category': 'mixed'
                    })

                if ai_text and len(ai_text.strip()) > 20:
                    all_data.append({
                        'text': ai_text.strip(),
                        'label': 1,  # AI
                        'source': 'chatgpt_research',
                        'category': 'mixed'
                    })

                if max_samples and len(all_data) >= max_samples:
                    break

        except Exception as e:
            print(f"  Warning: Could not load ChatGPT-Research-Dataset: {e}")

    # Try aadityaubhat/GPT-wiki-intro (GPT generated Wikipedia intros)
    if len(all_data) < (max_samples or 10000):
        try:
            print("  Trying GPT-wiki-intro dataset...")
            ds = load_dataset("aadityaubhat/GPT-wiki-intro", split="train", trust_remote_code=True)

            for item in tqdm(ds, desc="Processing GPT-wiki"):
                wiki_intro = item.get('wiki_intro', '')
                gpt_intro = item.get('generated_intro', '') or item.get('gpt_intro', '')

                if wiki_intro and len(wiki_intro.strip()) > 20:
                    all_data.append({
                        'text': wiki_intro.strip(),
                        'label': 0,  # Human
                        'source': 'gpt_wiki',
                        'category': 'wiki'
                    })

                if gpt_intro and len(gpt_intro.strip()) > 20:
                    all_data.append({
                        'text': gpt_intro.strip(),
                        'label': 1,  # AI
                        'source': 'gpt_wiki',
                        'category': 'wiki'
                    })

                if max_samples and len(all_data) >= max_samples:
                    break

        except Exception as e:
            print(f"  Warning: Could not load GPT-wiki-intro: {e}")

    # Print distribution
    if all_data:
        human_count = sum(1 for d in all_data if d['label'] == 0)
        ai_count = sum(1 for d in all_data if d['label'] == 1)
        print(f"  Distribution: {human_count} human, {ai_count} AI")

    print(f"  ✅ Additional data: {len(all_data)} samples")
    return all_data


def create_short_text_samples(data: list, max_length: int = 280) -> list:
    """
    Create tweet-length samples from longer texts.
    This helps the model learn to detect AI in short-form content.
    """
    print("\n✂️ Creating short-text (tweet-length) samples...")

    short_samples = []

    for item in tqdm(data, desc="Creating short samples"):
        text = item['text']

        # Skip if already short
        if len(text) <= max_length:
            short_samples.append({
                **item,
                'text_type': 'original_short'
            })
            continue

        # Split long text into sentences
        sentences = text.replace('!', '.').replace('?', '.').split('.')
        sentences = [s.strip() for s in sentences if s.strip()]

        # Create samples from consecutive sentences that fit in max_length
        current_chunk = ""
        for sentence in sentences:
            if len(current_chunk) + len(sentence) + 1 <= max_length:
                current_chunk = f"{current_chunk} {sentence}".strip() if current_chunk else sentence
            else:
                if len(current_chunk) >= 30:  # Minimum viable length
                    short_samples.append({
                        'text': current_chunk,
                        'label': item['label'],
                        'source': item['source'],
                        'category': item['category'],
                        'text_type': 'chunked'
                    })
                current_chunk = sentence if len(sentence) <= max_length else ""

        # Don't forget the last chunk
        if len(current_chunk) >= 30:
            short_samples.append({
                'text': current_chunk,
                'label': item['label'],
                'source': item['source'],
                'category': item['category'],
                'text_type': 'chunked'
            })

    print(f"  ✅ Created {len(short_samples)} short-text samples")
    return short_samples


def balance_dataset(data: list) -> list:
    """
    Balance the dataset to have equal human/AI samples.
    """
    import random

    human_samples = [d for d in data if d['label'] == 0]
    ai_samples = [d for d in data if d['label'] == 1]

    print(f"\n⚖️ Balancing dataset...")
    print(f"  Human samples: {len(human_samples)}")
    print(f"  AI samples: {len(ai_samples)}")

    # Undersample the majority class
    min_count = min(len(human_samples), len(ai_samples))

    random.shuffle(human_samples)
    random.shuffle(ai_samples)

    balanced = human_samples[:min_count] + ai_samples[:min_count]
    random.shuffle(balanced)

    print(f"  ✅ Balanced dataset: {len(balanced)} samples ({min_count} each)")
    return balanced


def save_dataset(data: list, output_dir: Path, name: str):
    """Save dataset to JSON and CSV formats."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save as JSON
    json_path = output_dir / f"{name}.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  💾 Saved {json_path}")

    # Save as CSV
    csv_path = output_dir / f"{name}.csv"
    df = pd.DataFrame(data)
    df.to_csv(csv_path, index=False, encoding='utf-8')
    print(f"  💾 Saved {csv_path}")

    return json_path, csv_path


def main():
    parser = argparse.ArgumentParser(description="Download AI detection datasets")
    parser.add_argument("--output", type=str, default="../data",
                       help="Output directory for datasets")
    parser.add_argument("--max-samples", type=int, default=None,
                       help="Maximum samples per dataset (for testing)")
    parser.add_argument("--short-only", action="store_true",
                       help="Only keep short-text samples (tweet-length)")
    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("🚀 AI Text Detection Dataset Downloader")
    print("=" * 60)

    # Download all datasets
    all_data = []

    # 1. HC3 - Best quality human vs ChatGPT data
    hc3_data = download_hc3(output_dir, args.max_samples)
    all_data.extend(hc3_data)

    # 2. ai-text-detection-pile - Large scale
    pile_data = download_ai_detection_pile(output_dir, args.max_samples)
    all_data.extend(pile_data)

    # 3. Additional sources
    extra_data = download_chatgpt_detection(output_dir, args.max_samples)
    all_data.extend(extra_data)

    print(f"\n📊 Total raw samples: {len(all_data)}")

    # Create short-text samples for tweet detection
    short_data = create_short_text_samples(all_data, max_length=280)

    # Balance the dataset
    balanced_data = balance_dataset(short_data)

    # Split into train/val/test (80/10/10)
    import random
    random.shuffle(balanced_data)

    n = len(balanced_data)
    train_end = int(n * 0.8)
    val_end = int(n * 0.9)

    train_data = balanced_data[:train_end]
    val_data = balanced_data[train_end:val_end]
    test_data = balanced_data[val_end:]

    print(f"\n📁 Dataset splits:")
    print(f"  Train: {len(train_data)}")
    print(f"  Validation: {len(val_data)}")
    print(f"  Test: {len(test_data)}")

    # Save datasets
    print("\n💾 Saving datasets...")
    save_dataset(train_data, output_dir, "train")
    save_dataset(val_data, output_dir, "val")
    save_dataset(test_data, output_dir, "test")
    save_dataset(balanced_data, output_dir, "full")

    # Save dataset statistics
    stats = {
        'total_samples': len(balanced_data),
        'train_samples': len(train_data),
        'val_samples': len(val_data),
        'test_samples': len(test_data),
        'human_samples': len([d for d in balanced_data if d['label'] == 0]),
        'ai_samples': len([d for d in balanced_data if d['label'] == 1]),
        'sources': list(set(d['source'] for d in balanced_data)),
        'avg_text_length': sum(len(d['text']) for d in balanced_data) / len(balanced_data)
    }

    stats_path = output_dir / "stats.json"
    with open(stats_path, 'w') as f:
        json.dump(stats, f, indent=2)
    print(f"  💾 Saved {stats_path}")

    print("\n" + "=" * 60)
    print("✅ Dataset download complete!")
    print("=" * 60)
    print(f"\nNext steps:")
    print(f"  1. Review data in {output_dir}")
    print(f"  2. Run training: python train_model.py --data {output_dir}")


if __name__ == "__main__":
    main()

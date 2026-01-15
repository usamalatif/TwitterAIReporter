#!/usr/bin/env python3
"""
Export trained PyTorch model to TensorFlow.js format.

This script converts the fine-tuned DistilBERT model to TensorFlow.js
format for deployment in the Node.js inference server.

Usage:
    python export_model.py --model ../models/distilbert-ai-detector/final --output ../models/tfjs

The export process:
    1. Load PyTorch model
    2. Export to ONNX format
    3. Convert ONNX to TensorFlow SavedModel
    4. Convert SavedModel to TensorFlow.js format
"""

import argparse
import json
import os
import shutil
from pathlib import Path

import torch
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification


def export_to_onnx(model_path: Path, output_path: Path, max_length: int = 128):
    """Export PyTorch model to ONNX format."""
    print("\n📦 Exporting to ONNX...")

    # Load model
    model = DistilBertForSequenceClassification.from_pretrained(str(model_path))
    model.eval()

    # Create dummy input
    dummy_input_ids = torch.ones(1, max_length, dtype=torch.long)
    dummy_attention_mask = torch.ones(1, max_length, dtype=torch.long)

    # Export
    onnx_path = output_path / "model.onnx"
    torch.onnx.export(
        model,
        (dummy_input_ids, dummy_attention_mask),
        str(onnx_path),
        input_names=['input_ids', 'attention_mask'],
        output_names=['logits'],
        dynamic_axes={
            'input_ids': {0: 'batch_size'},
            'attention_mask': {0: 'batch_size'},
            'logits': {0: 'batch_size'}
        },
        opset_version=14,
        do_constant_folding=True,
    )

    print(f"  ✅ ONNX model saved to {onnx_path}")
    return onnx_path


def export_to_saved_model(onnx_path: Path, output_path: Path):
    """Convert ONNX to TensorFlow SavedModel."""
    print("\n📦 Converting ONNX to TensorFlow SavedModel...")

    try:
        import onnx
        from onnx_tf.backend import prepare

        # Load ONNX model
        onnx_model = onnx.load(str(onnx_path))

        # Convert to TensorFlow
        tf_rep = prepare(onnx_model)

        # Export
        saved_model_path = output_path / "saved_model"
        tf_rep.export_graph(str(saved_model_path))

        print(f"  ✅ SavedModel saved to {saved_model_path}")
        return saved_model_path

    except ImportError as e:
        print(f"  ⚠️ onnx-tf not available, using alternative method...")
        return export_to_saved_model_direct(onnx_path.parent.parent / "final", output_path)


def export_to_saved_model_direct(model_path: Path, output_path: Path, max_length: int = 128):
    """
    Export directly from PyTorch to TensorFlow SavedModel.
    Alternative method that doesn't require onnx-tf.
    """
    print("\n📦 Converting PyTorch to TensorFlow SavedModel (direct)...")

    try:
        import tensorflow as tf
        from transformers import TFDistilBertForSequenceClassification

        # Load the PyTorch model config
        config_path = model_path / "config.json"
        with open(config_path, 'r') as f:
            config = json.load(f)

        # Load TensorFlow version of the model
        tf_model = TFDistilBertForSequenceClassification.from_pretrained(
            str(model_path),
            from_pt=True  # Convert from PyTorch
        )

        # Create concrete function for serving
        @tf.function(input_signature=[
            tf.TensorSpec([None, max_length], tf.int32, name='input_ids'),
            tf.TensorSpec([None, max_length], tf.int32, name='attention_mask'),
        ])
        def serve(input_ids, attention_mask):
            outputs = tf_model(input_ids=input_ids, attention_mask=attention_mask)
            return {'logits': outputs.logits}

        # Save
        saved_model_path = output_path / "saved_model"
        tf.saved_model.save(
            tf_model,
            str(saved_model_path),
            signatures={'serving_default': serve}
        )

        print(f"  ✅ SavedModel saved to {saved_model_path}")
        return saved_model_path

    except Exception as e:
        print(f"  ❌ Direct conversion failed: {e}")
        raise


def export_to_tfjs(saved_model_path: Path, output_path: Path):
    """Convert TensorFlow SavedModel to TensorFlow.js format."""
    print("\n📦 Converting to TensorFlow.js...")

    import subprocess

    tfjs_path = output_path / "tfjs"
    tfjs_path.mkdir(parents=True, exist_ok=True)

    # Use tensorflowjs_converter CLI
    cmd = [
        "tensorflowjs_converter",
        "--input_format=tf_saved_model",
        "--output_format=tfjs_graph_model",
        "--signature_name=serving_default",
        "--saved_model_tags=serve",
        str(saved_model_path),
        str(tfjs_path)
    ]

    print(f"  Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"  ❌ Conversion failed:")
        print(result.stderr)
        raise RuntimeError("TensorFlow.js conversion failed")

    print(f"  ✅ TensorFlow.js model saved to {tfjs_path}")
    return tfjs_path


def copy_tokenizer_files(model_path: Path, output_path: Path):
    """Copy tokenizer files needed for inference."""
    print("\n📋 Copying tokenizer files...")

    tokenizer = DistilBertTokenizer.from_pretrained(str(model_path))

    # Save vocab and config
    vocab = tokenizer.get_vocab()
    vocab_path = output_path / "vocab.json"
    with open(vocab_path, 'w', encoding='utf-8') as f:
        json.dump(vocab, f, ensure_ascii=False)
    print(f"  ✅ Saved {vocab_path}")

    # Create tokenizer config for inference
    tokenizer_config = {
        "max_length": 128,
        "pad_token_id": tokenizer.pad_token_id,
        "cls_token_id": tokenizer.cls_token_id,
        "sep_token_id": tokenizer.sep_token_id,
        "unk_token_id": tokenizer.unk_token_id,
        "vocab_size": tokenizer.vocab_size,
    }

    config_path = output_path / "tokenizer_config.json"
    with open(config_path, 'w') as f:
        json.dump(tokenizer_config, f, indent=2)
    print(f"  ✅ Saved {config_path}")


def verify_export(tfjs_path: Path):
    """Verify the exported model files."""
    print("\n🔍 Verifying export...")

    required_files = ['model.json']
    for f in required_files:
        if not (tfjs_path / f).exists():
            raise FileNotFoundError(f"Missing required file: {f}")

    # Check for weight files
    weight_files = list(tfjs_path.glob("group*.bin"))
    if not weight_files:
        raise FileNotFoundError("No weight files found")

    print(f"  ✅ Found model.json")
    print(f"  ✅ Found {len(weight_files)} weight file(s)")

    # Check model.json structure
    with open(tfjs_path / "model.json", 'r') as f:
        model_json = json.load(f)

    print(f"  ✅ Model format: {model_json.get('format', 'unknown')}")

    return True


def main():
    parser = argparse.ArgumentParser(description="Export model to TensorFlow.js")
    parser.add_argument("--model", type=str, required=True,
                       help="Path to trained PyTorch model")
    parser.add_argument("--output", type=str, default="../models/tfjs",
                       help="Output directory for TensorFlow.js model")
    parser.add_argument("--max-length", type=int, default=128,
                       help="Maximum sequence length")
    parser.add_argument("--skip-onnx", action="store_true",
                       help="Skip ONNX conversion, use direct TF conversion")
    args = parser.parse_args()

    model_path = Path(args.model)
    output_path = Path(args.output)
    output_path.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("🚀 Model Export to TensorFlow.js")
    print("=" * 60)
    print(f"\nSource: {model_path}")
    print(f"Output: {output_path}")

    # Step 1: Export to ONNX (optional)
    if not args.skip_onnx:
        try:
            onnx_path = export_to_onnx(model_path, output_path, args.max_length)
            saved_model_path = export_to_saved_model(onnx_path, output_path)
        except Exception as e:
            print(f"  ⚠️ ONNX route failed, trying direct conversion: {e}")
            saved_model_path = export_to_saved_model_direct(model_path, output_path, args.max_length)
    else:
        saved_model_path = export_to_saved_model_direct(model_path, output_path, args.max_length)

    # Step 2: Convert to TensorFlow.js
    tfjs_path = export_to_tfjs(saved_model_path, output_path)

    # Step 3: Copy tokenizer files
    copy_tokenizer_files(model_path, tfjs_path)

    # Step 4: Verify export
    verify_export(tfjs_path)

    # Clean up intermediate files
    print("\n🧹 Cleaning up intermediate files...")
    onnx_file = output_path / "model.onnx"
    if onnx_file.exists():
        onnx_file.unlink()
    saved_model_dir = output_path / "saved_model"
    if saved_model_dir.exists():
        shutil.rmtree(saved_model_dir)

    print("\n" + "=" * 60)
    print("✅ Export complete!")
    print("=" * 60)
    print(f"\nTensorFlow.js model saved to: {tfjs_path}")
    print(f"\nTo deploy:")
    print(f"  1. Copy {tfjs_path} to inference/model/")
    print(f"  2. Restart the inference server")
    print(f"  3. Test with: curl -X POST http://localhost:8000/predict -d '{{\"text\": \"test\"}}'")


if __name__ == "__main__":
    main()

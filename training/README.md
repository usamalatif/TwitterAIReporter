# TweetGuard AI Model Training Guide

## Overview

This guide walks you through training the AI detection model for the TweetGuard Chrome extension.

**What you'll create:**
- A DistilBERT model trained to detect AI-generated text
- Optimized TensorFlow.js model (~15-50MB) for browser deployment
- ~75-82% accuracy on human vs AI classification

**Requirements:**
- Google account (for Colab)
- ~2-4 hours (training time on free GPU)

---

## Quick Start

### Step 1: Open Google Colab

1. Go to [Google Colab](https://colab.research.google.com/)
2. Click **File → Upload notebook**
3. Upload `TweetGuard_AI_Detector_Training.ipynb`

### Step 2: Enable GPU

1. Click **Runtime → Change runtime type**
2. Select **T4 GPU** (free tier)
3. Click **Save**

### Step 3: Run All Cells

1. Click **Runtime → Run all**
2. Wait for training to complete (~2-4 hours)
3. Download the model when prompted

### Step 4: Install in Extension

1. Extract `tweetguard_tfjs_model.zip`
2. Copy all files to `TwitterAIReporter/model/`
3. The extension will automatically use the new model

---

## Detailed Steps

### 1. Dataset Preparation

The notebook uses these datasets:
- **HC3 (Human-ChatGPT Comparison)**: 24K+ samples comparing human and ChatGPT responses
- Automatically downloads from HuggingFace

Data is filtered for Twitter-like content:
- Max 500 characters (truncated to simulate tweets)
- Balanced 50/50 human vs AI split
- ~30K total training samples

### 2. Model Architecture

**DistilBERT-base-uncased**
- 66M parameters (40% smaller than BERT)
- 6 transformer layers
- 768 hidden dimensions
- Binary classification head

Why DistilBERT?
- Fast inference (~10-30ms per tweet)
- Small enough for browser (~50MB)
- 97% of BERT's accuracy

### 3. Training Configuration

```
Epochs: 3
Batch size: 16
Learning rate: 5e-5
Max sequence length: 128
Early stopping: patience=3
```

### 4. Expected Results

| Metric | Expected Range |
|--------|---------------|
| Accuracy | 75-82% |
| F1 Score | 74-81% |
| Precision | 73-82% |
| Recall | 72-82% |

### 5. Output Files

After training, you'll get:

```
tweetguard_tfjs_model/
├── model.json           # Model architecture
├── group1-shard1of4.bin # Weights (sharded)
├── group1-shard2of4.bin
├── group1-shard3of4.bin
├── group1-shard4of4.bin
├── vocab.json           # Tokenizer vocabulary
└── tokenizer_config.json # Tokenizer settings
```

---

## Troubleshooting

### "Out of memory" error
- Reduce batch size to 8
- Use smaller dataset subset
- Restart runtime and try again

### Slow training
- Verify GPU is enabled (Runtime → Change runtime type)
- Check GPU usage with `!nvidia-smi`
- Free Colab GPUs can be slow; be patient

### Model too large
- Ensure quantization is enabled (`--quantize_uint8`)
- Try `--quantize_float16` for smaller size
- Consider pruning if >100MB

### Conversion errors
- Update tensorflowjs: `!pip install --upgrade tensorflowjs`
- Try without `--skip_op_check` flag
- Check TensorFlow version compatibility

---

## Improving Accuracy

To get better results:

1. **More data**: Add custom Twitter samples
2. **Fine-tune longer**: Increase epochs to 5-10
3. **Adjust threshold**: Tune the 0.5 cutoff in the extension
4. **Ensemble**: Combine with GPTZero API (Pro tier)

### Adding Custom Training Data

```python
# Add your own labeled examples
custom_data = [
    {"text": "Your human tweet example", "label": 0},
    {"text": "Your AI-generated example", "label": 1},
]

# Append to training data
for item in custom_data:
    texts.append(item["text"])
    labels.append(item["label"])
```

---

## Integration with Extension

After downloading the model:

1. **Copy files to extension:**
   ```
   cp -r tweetguard_tfjs_model/* TwitterAIReporter/model/
   ```

2. **Update detector.js** to use real model (see Phase 2 implementation)

3. **Test locally** before publishing

---

## Resources

- [Google Colab](https://colab.research.google.com/)
- [HuggingFace HC3 Dataset](https://huggingface.co/datasets/Hello-SimpleAI/HC3)
- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [DistilBERT Paper](https://arxiv.org/abs/1910.01108)

---

## License

This training notebook is part of the TweetGuard project.
Model is based on DistilBERT (Apache 2.0 License).

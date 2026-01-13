/**
 * TweetGuard Inference API
 * Node.js server with TensorFlow.js for AI detection
 */

const express = require('express');
const cors = require('cors');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Global state
let model = null;
let tokenizer = null;

/**
 * Simple WordPiece Tokenizer for BERT
 */
class BertTokenizer {
  constructor(vocabPath, configPath) {
    const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    this.vocab = vocab;
    this.inverseVocab = Object.fromEntries(
      Object.entries(vocab).map(([k, v]) => [v, k])
    );
    this.maxLength = config.max_length || 128;
    this.padTokenId = config.pad_token_id || 0;
    this.clsTokenId = config.cls_token_id || 101;
    this.sepTokenId = config.sep_token_id || 102;
    this.unkTokenId = config.unk_token_id || 100;
  }

  tokenize(text) {
    text = text.toLowerCase().trim();
    const words = text.split(/\s+/);
    const tokens = [];

    for (const word of words) {
      let remaining = word;
      let isFirst = true;

      while (remaining.length > 0) {
        let found = false;

        for (let end = remaining.length; end > 0; end--) {
          let substr = remaining.slice(0, end);
          if (!isFirst) {
            substr = '##' + substr;
          }

          if (this.vocab.hasOwnProperty(substr)) {
            tokens.push(this.vocab[substr]);
            remaining = remaining.slice(isFirst ? end : end);
            isFirst = false;
            found = true;
            break;
          }
        }

        if (!found) {
          tokens.push(this.unkTokenId);
          remaining = remaining.slice(1);
          isFirst = false;
        }
      }
    }

    return tokens;
  }

  encode(text, maxLength = null) {
    const len = maxLength || this.maxLength;
    let tokens = this.tokenize(text);

    // Truncate if needed (leaving room for [CLS] and [SEP])
    if (tokens.length > len - 2) {
      tokens = tokens.slice(0, len - 2);
    }

    // Add special tokens
    const inputIds = [this.clsTokenId, ...tokens, this.sepTokenId];
    const attentionMask = new Array(inputIds.length).fill(1);

    // Pad to max length
    while (inputIds.length < len) {
      inputIds.push(this.padTokenId);
      attentionMask.push(0);
    }

    return { inputIds, attentionMask };
  }
}

/**
 * Load model and tokenizer on startup
 */
async function loadModel() {
  const modelPath = process.env.MODEL_PATH || './model';

  console.log(`Loading model from ${modelPath}...`);

  try {
    // Load TensorFlow.js model
    const modelJsonPath = `file://${path.resolve(modelPath)}/model.json`;
    model = await tf.loadGraphModel(modelJsonPath);
    console.log('✅ Model loaded successfully');

    // Load tokenizer
    const vocabPath = path.join(modelPath, 'vocab.json');
    const configPath = path.join(modelPath, 'tokenizer_config.json');
    tokenizer = new BertTokenizer(vocabPath, configPath);
    console.log('✅ Tokenizer loaded successfully');

    // Warm up the model
    console.log('Warming up model...');
    const warmupResult = await predict('Test text for warmup');
    console.log('✅ Model warmed up:', warmupResult);

  } catch (error) {
    console.error('❌ Failed to load model:', error);
    process.exit(1);
  }
}

/**
 * Run prediction on text
 */
async function predict(text) {
  if (!model || !tokenizer) {
    throw new Error('Model not loaded');
  }

  // Tokenize
  const encoded = tokenizer.encode(text, 128);

  // Create tensors
  const inputIds = tf.tensor2d([encoded.inputIds], [1, 128], 'int32');
  const attentionMask = tf.tensor2d([encoded.attentionMask], [1, 128], 'int32');

  try {
    // Run inference
    const outputs = await model.executeAsync({
      'input_ids:0': inputIds,
      'attention_mask:0': attentionMask
    });

    // Get logits
    let logits;
    if (Array.isArray(outputs)) {
      logits = outputs[0];
    } else {
      logits = outputs;
    }

    // Apply softmax
    const probabilities = tf.softmax(logits);
    const probs = await probabilities.data();

    // Cleanup
    inputIds.dispose();
    attentionMask.dispose();
    if (Array.isArray(outputs)) {
      outputs.forEach(t => t.dispose());
    } else {
      outputs.dispose();
    }
    probabilities.dispose();

    // NOTE: Labels are inverted from TF.js conversion
    // probs[0] = AI probability, probs[1] = human probability
    const aiProb = probs[0];
    const humanProb = probs[1];

    return {
      aiProb: Math.round(aiProb * 10000) / 10000,
      humanProb: Math.round(humanProb * 10000) / 10000
    };
  } catch (error) {
    // Cleanup on error
    inputIds.dispose();
    attentionMask.dispose();
    throw error;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    modelLoaded: model !== null,
    tokenizerLoaded: tokenizer !== null,
    memory: tf.memory()
  });
});

// Prediction endpoint
app.post('/predict', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ error: 'Text too long (max 1000 chars)' });
    }

    const result = await predict(text.trim());
    res.json(result);

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Prediction failed' });
  }
});

// Start server
const PORT = process.env.PORT || 8000;

loadModel().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TweetGuard Inference API running on port ${PORT}`);
  });
});

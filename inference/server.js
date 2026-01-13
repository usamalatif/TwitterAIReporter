/**
 * TweetGuard Inference API
 * Node.js server with TensorFlow.js for AI detection
 */

const express = require('express');
const cors = require('cors');
const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Global state
let model = null;
let tokenizer = null;

/**
 * Register custom Erfc op (used by GELU activation in DistilBERT)
 * Uses Abramowitz & Stegun polynomial approximation
 */
function registerCustomOps() {
  try {
    tf.registerOp('Erfc', (node) => {
      const x = node.inputs[0];
      return tf.tidy(() => {
        // Abramowitz & Stegun approximation constants
        const a1 = tf.scalar(0.254829592);
        const a2 = tf.scalar(-0.284496736);
        const a3 = tf.scalar(1.421413741);
        const a4 = tf.scalar(-1.453152027);
        const a5 = tf.scalar(1.061405429);
        const p = tf.scalar(0.3275911);
        const one = tf.scalar(1);

        // erfc(x) = 1 - erf(x)
        // erf approximation for positive x
        const absX = tf.abs(x);
        const t = tf.div(one, tf.add(one, tf.mul(p, absX)));

        const t2 = tf.mul(t, t);
        const t3 = tf.mul(t2, t);
        const t4 = tf.mul(t3, t);
        const t5 = tf.mul(t4, t);

        const poly = tf.add(
          tf.mul(a1, t),
          tf.add(
            tf.mul(a2, t2),
            tf.add(
              tf.mul(a3, t3),
              tf.add(
                tf.mul(a4, t4),
                tf.mul(a5, t5)
              )
            )
          )
        );

        const expTerm = tf.exp(tf.neg(tf.mul(absX, absX)));
        const erfApprox = tf.sub(one, tf.mul(poly, expTerm));

        // Handle sign: erf(-x) = -erf(x)
        const sign = tf.sign(x);
        const erfSigned = tf.mul(erfApprox, sign);

        // erfc(x) = 1 - erf(x)
        return tf.sub(one, erfSigned);
      });
    });
    console.log('✅ Custom Erfc op registered');
  } catch (e) {
    // Op may already be registered
    if (!e.message.includes('already registered')) {
      console.error('Warning: Could not register Erfc op:', e.message);
    }
  }
}

/**
 * Custom IOHandler to load model from local filesystem
 */
function fileSystemIOHandler(modelPath) {
  return {
    load: async function() {
      const modelJsonPath = path.join(modelPath, 'model.json');
      const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, 'utf8'));

      // Load weight data
      const weightSpecs = modelJson.weightsManifest[0].weights;
      const weightPaths = modelJson.weightsManifest[0].paths;

      // Combine all weight shards
      const weightBuffers = [];
      for (const weightPath of weightPaths) {
        const fullPath = path.join(modelPath, weightPath);
        const buffer = fs.readFileSync(fullPath);
        weightBuffers.push(buffer);
      }

      // Concatenate all buffers
      const totalLength = weightBuffers.reduce((sum, buf) => sum + buf.length, 0);
      const combinedBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const buffer of weightBuffers) {
        combinedBuffer.set(new Uint8Array(buffer), offset);
        offset += buffer.length;
      }

      return {
        modelTopology: modelJson.modelTopology,
        weightSpecs: weightSpecs,
        weightData: combinedBuffer.buffer,
        format: modelJson.format,
        generatedBy: modelJson.generatedBy,
        convertedBy: modelJson.convertedBy,
        signature: modelJson.signature,
        userDefinedMetadata: modelJson.userDefinedMetadata
      };
    }
  };
}

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
  const absoluteModelPath = path.resolve(modelPath);

  console.log(`Loading model from ${absoluteModelPath}...`);

  // Register custom ops before loading model
  registerCustomOps();

  try {
    // Load TensorFlow.js model using custom file handler
    const ioHandler = fileSystemIOHandler(absoluteModelPath);
    model = await tf.loadGraphModel(ioHandler);
    console.log('✅ Model loaded successfully');

    // Load tokenizer
    const vocabPath = path.join(absoluteModelPath, 'vocab.json');
    const configPath = path.join(absoluteModelPath, 'tokenizer_config.json');
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

    // Model outputs: probs[0] and probs[1]
    // Testing shows formal text gets high probs[1], casual text gets high probs[0]
    // So probs[0] = human, probs[1] = AI (original training labels)
    const humanProb = probs[0];
    const aiProb = probs[1];

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

// TweetGuard AI Detector - Real TensorFlow.js Model
// Uses DistilBERT for AI text detection

// TensorFlow.js will be accessed via getTF() to ensure it's loaded
function getTF() {
  const tf = window.TweetGuardTF || window.tf;
  if (tf && typeof tf.loadGraphModel === 'function') {
    return tf;
  }
  return null;
}

// Register custom Erfc op (complementary error function)
// Used by GELU activation in DistilBERT
function registerCustomOps() {
  const tf = getTF();
  if (!tf) return;

  try {
    // Erfc(x) = 1 - erf(x)
    // Using Abramowitz and Stegun approximation
    tf.registerOp('Erfc', (node) => {
      const x = node.inputs[0];

      // erfc approximation using polynomial (Abramowitz & Stegun)
      return tf.tidy(() => {
        const a1 = tf.scalar(0.254829592);
        const a2 = tf.scalar(-0.284496736);
        const a3 = tf.scalar(1.421413741);
        const a4 = tf.scalar(-1.453152027);
        const a5 = tf.scalar(1.061405429);
        const p = tf.scalar(0.3275911);
        const one = tf.scalar(1);

        const sign = tf.sign(x);
        const absX = tf.abs(x);
        const t = tf.div(one, tf.add(one, tf.mul(p, absX)));

        // Horner's method for polynomial
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
              tf.add(tf.mul(a4, t4), tf.mul(a5, t5))
            )
          )
        );

        const expTerm = tf.exp(tf.neg(tf.mul(absX, absX)));
        const erf = tf.sub(one, tf.mul(poly, expTerm));
        const erfSigned = tf.mul(sign, erf);

        // erfc(x) = 1 - erf(x)
        return tf.sub(one, erfSigned);
      });
    });
    console.log('[TweetGuard] Registered custom Erfc op');
  } catch (e) {
    // Op might already be registered or not needed
    console.log('[TweetGuard] Erfc op registration:', e.message);
  }
}

// Get extension resource URL (works in both isolated and main world)
function getResourceUrl(path) {
  // Try window variable first
  if (window.TWEETGUARD_BASE_URL) {
    return window.TWEETGUARD_BASE_URL + path;
  }
  // Try data attribute on documentElement (set by loader.js)
  const baseUrlFromAttr = document.documentElement.dataset.tweetguardBaseUrl;
  if (baseUrlFromAttr) {
    return baseUrlFromAttr + path;
  }
  // Fallback for isolated world
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(path);
  }
  throw new Error('Cannot resolve extension resource URL');
}

class BertTokenizer {
  constructor() {
    this.vocab = null;
    this.vocabReverse = null;
    this.config = null;
    this.ready = false;
  }

  async load() {
    if (this.ready) return;

    try {
      // Load vocabulary
      const vocabUrl = getResourceUrl('model/vocab.json');
      const vocabResponse = await fetch(vocabUrl);
      this.vocab = await vocabResponse.json();

      // Create reverse vocab for debugging
      this.vocabReverse = {};
      for (const [token, id] of Object.entries(this.vocab)) {
        this.vocabReverse[id] = token;
      }

      // Load config
      const configUrl = getResourceUrl('model/tokenizer_config.json');
      const configResponse = await fetch(configUrl);
      this.config = await configResponse.json();

      this.ready = true;
      console.log('[TweetGuard] Tokenizer loaded, vocab size:', Object.keys(this.vocab).length);
    } catch (error) {
      console.error('[TweetGuard] Failed to load tokenizer:', error);
      throw error;
    }
  }

  // Basic WordPiece tokenization
  tokenize(text) {
    if (!this.ready) {
      throw new Error('Tokenizer not loaded');
    }

    // Lowercase if configured
    if (this.config.do_lower_case) {
      text = text.toLowerCase();
    }

    // Basic cleaning
    text = text.replace(/\s+/g, ' ').trim();

    // Simple word splitting
    const words = text.split(/\s+/);
    const tokens = [];

    for (const word of words) {
      // Try to find the whole word first
      if (this.vocab[word] !== undefined) {
        tokens.push(word);
        continue;
      }

      // WordPiece: break into subwords
      let remaining = word;
      let isFirst = true;

      while (remaining.length > 0) {
        let found = false;
        let end = remaining.length;

        while (end > 0) {
          let substr = remaining.slice(0, end);
          if (!isFirst) {
            substr = '##' + substr;
          }

          if (this.vocab[substr] !== undefined) {
            tokens.push(substr);
            remaining = remaining.slice(end);
            isFirst = false;
            found = true;
            break;
          }
          end--;
        }

        if (!found) {
          // Unknown character, use [UNK]
          tokens.push('[UNK]');
          remaining = remaining.slice(1);
          isFirst = false;
        }
      }
    }

    return tokens;
  }

  // Convert tokens to IDs
  convertTokensToIds(tokens) {
    return tokens.map(token => {
      const id = this.vocab[token];
      return id !== undefined ? id : this.config.unk_token_id;
    });
  }

  // Full encoding for model input
  encode(text, maxLength = 128) {
    const tokens = this.tokenize(text);

    // Truncate if needed (leave room for [CLS] and [SEP])
    const maxTokens = maxLength - 2;
    const truncatedTokens = tokens.slice(0, maxTokens);

    // Add special tokens
    const fullTokens = ['[CLS]', ...truncatedTokens, '[SEP]'];
    const inputIds = this.convertTokensToIds(fullTokens);

    // Create attention mask (1 for real tokens, 0 for padding)
    const attentionMask = new Array(inputIds.length).fill(1);

    // Pad to maxLength
    while (inputIds.length < maxLength) {
      inputIds.push(this.config.pad_token_id);
      attentionMask.push(0);
    }

    return {
      inputIds: inputIds,
      attentionMask: attentionMask
    };
  }
}

class AIDetector {
  constructor() {
    this.model = null;
    this.tokenizer = new BertTokenizer();
    this.cache = new Map();
    this.isLoading = false;
    this.isReady = false;
    this.maxCacheSize = 500;
  }

  async initialize() {
    if (this.isReady || this.isLoading) return;

    this.isLoading = true;
    console.log('[TweetGuard] Initializing AI detector...');

    try {
      // Load tokenizer
      await this.tokenizer.load();

      // Get TensorFlow.js reference
      const tf = getTF();
      if (!tf) {
        throw new Error('TensorFlow.js not available');
      }
      this.tf = tf; // Store reference for later use

      // Check TensorFlow.js
      console.log('[TweetGuard] TensorFlow.js version:', tf.version ? tf.version.tfjs : 'unknown');
      console.log('[TweetGuard] Available backends:', Object.keys(tf.engine().registryFactory));

      // Register custom ops before loading model
      registerCustomOps();

      // Load TensorFlow.js model
      console.log('[TweetGuard] Loading model...');
      const modelUrl = getResourceUrl('model/model.json');

      if (typeof tf.loadGraphModel !== 'function') {
        console.error('[TweetGuard] loadGraphModel not available');
        throw new Error('TensorFlow.js loadGraphModel not available');
      }

      this.model = await tf.loadGraphModel(modelUrl);
      console.log('[TweetGuard] Model loaded successfully');

      // Warm up the model with a dummy prediction
      console.log('[TweetGuard] Warming up model...');
      const dummyInput = {
        'input_ids:0': tf.ones([1, 128], 'int32'),
        'attention_mask:0': tf.ones([1, 128], 'int32')
      };
      const warmupResult = await this.model.executeAsync(dummyInput);

      // Dispose warmup tensors
      if (Array.isArray(warmupResult)) {
        warmupResult.forEach(t => t.dispose());
      } else {
        warmupResult.dispose();
      }
      dummyInput['input_ids:0'].dispose();
      dummyInput['attention_mask:0'].dispose();

      this.isReady = true;
      this.isLoading = false;
      console.log('[TweetGuard] AI detector ready!');
    } catch (error) {
      console.error('[TweetGuard] Failed to initialize:', error);
      this.isLoading = false;
      throw error;
    }
  }

  async detect(text, tweetId) {
    // Check cache first
    if (this.cache.has(tweetId)) {
      return this.cache.get(tweetId);
    }

    // Ensure model is loaded
    if (!this.isReady) {
      await this.initialize();
    }

    const tf = this.tf;

    try {
      // Tokenize text
      const encoded = this.tokenizer.encode(text, 128);

      // Create tensors with correct input names (from model signature)
      const inputIds = tf.tensor2d([encoded.inputIds], [1, 128], 'int32');
      const attentionMask = tf.tensor2d([encoded.attentionMask], [1, 128], 'int32');

      // Run inference with correct input names
      const outputs = await this.model.executeAsync({
        'input_ids:0': inputIds,
        'attention_mask:0': attentionMask
      });

      // Get logits (handle both array and single tensor output)
      let logits;
      if (Array.isArray(outputs)) {
        logits = outputs[0];
      } else {
        logits = outputs;
      }

      // Apply softmax to get probabilities
      const probabilities = tf.softmax(logits);
      const probs = await probabilities.data();

      // Cleanup tensors
      inputIds.dispose();
      attentionMask.dispose();
      if (Array.isArray(outputs)) {
        outputs.forEach(t => t.dispose());
      } else {
        outputs.dispose();
      }
      probabilities.dispose();

      // NOTE: Labels appear inverted from TF.js conversion
      // probs[0] = AI probability, probs[1] = human probability
      const aiProb = probs[0];
      const humanProb = probs[1];

      const result = {
        score: aiProb,
        humanProb: humanProb,
        aiProb: aiProb,
        isAI: aiProb > 0.5,
        confidence: aiProb > 0.8 ? 'high' : aiProb > 0.6 ? 'medium' : 'low'
      };

      // Cache result
      this.cache.set(tweetId, result);

      // Limit cache size
      if (this.cache.size > this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      return result;
    } catch (error) {
      console.error('[TweetGuard] Detection error:', error);
      return {
        score: 0.5,
        humanProb: 0.5,
        aiProb: 0.5,
        isAI: false,
        confidence: 'error',
        error: error.message
      };
    }
  }

  // Get memory stats
  getMemoryInfo() {
    const tf = this.tf || getTF();
    return tf ? tf.memory() : { numTensors: 0 };
  }
}

// Create global detector instance
const detector = new AIDetector();

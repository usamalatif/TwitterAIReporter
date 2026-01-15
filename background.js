// Kitha Background Script
// Handles API calls to server with authentication and rate limiting

// API endpoints - use Vercel for authenticated requests, Railway for free tier
const VERCEL_API_URL = 'https://www.kitha.co'; // Update with your Vercel URL
const RAILWAY_API_URL = 'https://twitteraireporter-production-1dad.up.railway.app';

// Set to true to test directly with Railway (bypassing Vercel)
const USE_RAILWAY_DIRECT = false;
const FREE_SCAN_LIMIT = 50;

// Logging helper
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[Kitha BG ${timestamp}] ${message}`, data);
  } else {
    console.log(`[Kitha BG ${timestamp}] ${message}`);
  }
}

// Check if it's a new day and reset counter
async function checkDailyReset() {
  const data = await chrome.storage.local.get(['lastScanDate', 'dailyScans']);
  const today = new Date().toDateString();

  if (data.lastScanDate !== today) {
    await chrome.storage.local.set({
      dailyScans: 0,
      lastScanDate: today
    });
    return 0;
  }
  return data.dailyScans || 0;
}

// Check if user can scan (has API key or under daily limit)
async function canScan() {
  const data = await chrome.storage.local.get(['apiKey', 'dailyScans', 'lastScanDate']);

  // Pro users with API key have unlimited scans
  if (data.apiKey) {
    return { allowed: true, isPro: true };
  }

  // Check daily limit for free users
  const dailyScans = await checkDailyReset();

  if (dailyScans >= FREE_SCAN_LIMIT) {
    return { allowed: false, isPro: false, remaining: 0 };
  }

  return {
    allowed: true,
    isPro: false,
    remaining: FREE_SCAN_LIMIT - dailyScans
  };
}

// Increment scan counter (local tracking)
async function incrementScanCount() {
  const data = await chrome.storage.local.get(['dailyScans', 'tweetsScanned', 'apiKey']);

  // Don't count daily limit for pro users (server handles this)
  if (data.apiKey) {
    await chrome.storage.local.set({
      tweetsScanned: (data.tweetsScanned || 0) + 1
    });
    return;
  }

  // Increment both daily and total for free users
  await chrome.storage.local.set({
    dailyScans: (data.dailyScans || 0) + 1,
    tweetsScanned: (data.tweetsScanned || 0) + 1
  });
}

// Increment AI detected counter
async function incrementAICount() {
  const data = await chrome.storage.local.get(['aiDetected']);
  await chrome.storage.local.set({
    aiDetected: (data.aiDetected || 0) + 1
  });
}

// Call the API for detection
// Use Railway directly for testing, or Vercel for production
async function detectAI(text, tweetId) {
  const startTime = performance.now();
  const data = await chrome.storage.local.get(['apiKey']);
  const hasApiKey = !!data.apiKey;

  log(`Starting API call for tweet ${tweetId}`, { textLength: text.length, hasApiKey });

  try {
    // Use Railway directly for testing (bypasses Vercel/auth)
    if (USE_RAILWAY_DIRECT) {
      log(`Fetching ${RAILWAY_API_URL}/predict (direct mode)...`);

      const response = await fetch(`${RAILWAY_API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const fetchTime = performance.now() - startTime;
      log(`Fetch completed in ${fetchTime.toFixed(0)}ms, status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`Railway API error: ${response.status}`);
      }

      const result = await response.json();
      const totalTime = performance.now() - startTime;
      log(`Railway API complete in ${totalTime.toFixed(0)}ms`, result);

      return {
        success: true,
        aiProb: result.aiProb,
        humanProb: result.humanProb,
        isAI: result.aiProb > 0.5
      };
    }

    // Production: Use Vercel API - it handles both authenticated and anonymous requests
    log(`Fetching ${VERCEL_API_URL}/api/detect...`);

    const headers = {
      'Content-Type': 'application/json',
    };

    // Add API key if user has one (for pro features)
    if (hasApiKey) {
      headers['X-API-Key'] = data.apiKey;
    }

    const response = await fetch(`${VERCEL_API_URL}/api/detect`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, tweetId })
    });

    // Handle auth errors (only for users with API key)
    if (response.status === 401 && hasApiKey) {
      log('API key invalid or expired');
      return {
        success: false,
        error: 'Invalid API key. Please check your key at kitha.co',
        authError: true
      };
    }

    if (response.status === 429) {
      log('Rate limit exceeded on server');
      return {
        success: false,
        error: 'Rate limit exceeded',
        limitReached: true
      };
    }

    const fetchTime = performance.now() - startTime;
    log(`Fetch completed in ${fetchTime.toFixed(0)}ms, status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    const totalTime = performance.now() - startTime;
    log(`API call complete in ${totalTime.toFixed(0)}ms`, result);

    return {
      success: true,
      aiProb: result.aiProb,
      humanProb: result.humanProb,
      isAI: result.aiProb > 0.5
    };
  } catch (error) {
    const totalTime = performance.now() - startTime;
    log(`API error after ${totalTime.toFixed(0)}ms: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Validate API key with server
async function validateApiKey(apiKey) {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/user`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey
      }
    });

    if (response.ok) {
      const user = await response.json();
      return {
        valid: true,
        user: {
          email: user.email,
          subscription: user.subscription
        }
      };
    }

    return { valid: false, error: 'Invalid API key' };
  } catch (error) {
    log('API key validation error:', error);
    return { valid: false, error: 'Could not validate API key' };
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log(`Received message: ${message.type}`, { tweetId: message.tweetId });

  if (message.type === 'CHECK_CAN_SCAN') {
    canScan().then(sendResponse);
    return true;
  }

  if (message.type === 'DETECT_AI') {
    const msgStartTime = performance.now();
    log(`Processing DETECT_AI for tweet ${message.tweetId}`);

    (async () => {
      // Check if can scan first (local check for free users)
      log(`Checking scan limits...`);
      const scanCheck = await canScan();
      log(`Scan check result:`, scanCheck);

      if (!scanCheck.allowed) {
        log(`Scan not allowed - limit reached`);
        sendResponse({
          success: false,
          limitReached: true,
          remaining: 0
        });
        return;
      }

      // Call the API
      const result = await detectAI(message.text, message.tweetId);

      if (result.success) {
        // Increment counters
        log(`Incrementing counters...`);
        await incrementScanCount();
        if (result.isAI) {
          await incrementAICount();
        }
      }

      const totalMsgTime = performance.now() - msgStartTime;
      log(`Total message handling time: ${totalMsgTime.toFixed(0)}ms`);
      sendResponse(result);
    })();
    return true;
  }

  if (message.type === 'VALIDATE_API_KEY') {
    validateApiKey(message.apiKey).then(sendResponse);
    return true;
  }

  if (message.type === 'INCREMENT_SCAN') {
    incrementScanCount().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'INCREMENT_AI') {
    incrementAICount().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    (async () => {
      // Ensure daily reset is checked before returning settings
      await checkDailyReset();
      const data = await chrome.storage.local.get(['apiKey', 'dailyScans', 'lastScanDate', 'tweetsScanned', 'aiDetected']);
      sendResponse(data);
    })();
    return true;
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Kitha] Extension installed');
  chrome.storage.local.set({
    tweetsScanned: 0,
    aiDetected: 0,
    dailyScans: 0,
    lastScanDate: new Date().toDateString()
  });
});

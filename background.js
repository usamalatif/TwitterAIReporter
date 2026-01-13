// TweetGuard Background Script
// Handles API calls to server and scan limits

const API_URL = 'https://twitteraireporter-production.up.railway.app';
const FREE_SCAN_LIMIT = 50;

// Logging helper
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[TweetGuard BG ${timestamp}] ${message}`, data);
  } else {
    console.log(`[TweetGuard BG ${timestamp}] ${message}`);
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

// Increment scan counter
async function incrementScanCount() {
  const data = await chrome.storage.local.get(['dailyScans', 'tweetsScanned', 'apiKey']);

  // Don't count daily limit for pro users
  if (data.apiKey) {
    await chrome.storage.local.set({
      tweetsScanned: (data.tweetsScanned || 0) + 1
    });
    return;
  }

  // Increment both daily and total
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

// Call the inference API
async function detectAI(text, tweetId) {
  const startTime = performance.now();
  log(`Starting API call for tweet ${tweetId}`, { textLength: text.length });

  try {
    log(`Fetching ${API_URL}/predict...`);
    const fetchStart = performance.now();

    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, tweetId })
    });

    const fetchTime = performance.now() - fetchStart;
    log(`Fetch completed in ${fetchTime.toFixed(0)}ms, status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const parseStart = performance.now();
    const result = await response.json();
    const parseTime = performance.now() - parseStart;

    const totalTime = performance.now() - startTime;
    log(`API call complete in ${totalTime.toFixed(0)}ms (fetch: ${fetchTime.toFixed(0)}ms, parse: ${parseTime.toFixed(0)}ms)`, result);

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
      // Check if can scan first
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

  if (message.type === 'INCREMENT_SCAN') {
    incrementScanCount().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'INCREMENT_AI') {
    incrementAICount().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['apiKey', 'dailyScans', 'lastScanDate', 'tweetsScanned', 'aiDetected']).then(sendResponse);
    return true;
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[TweetGuard] Extension installed');
  chrome.storage.local.set({
    tweetsScanned: 0,
    aiDetected: 0,
    dailyScans: 0,
    lastScanDate: new Date().toDateString()
  });
});

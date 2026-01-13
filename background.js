// TweetGuard Background Script
// Handles API key validation and scan limits

const FREE_SCAN_LIMIT = 50;

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

  // Don't count for pro users
  if (data.apiKey) {
    // Just increment total
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

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_CAN_SCAN') {
    canScan().then(sendResponse);
    return true; // Keep channel open for async response
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
    chrome.storage.local.get(['apiKey', 'dailyScans', 'lastScanDate']).then(sendResponse);
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

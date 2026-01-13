// TweetGuard Popup Script

const FREE_SCAN_LIMIT = 50;

// Load stats and settings from storage
async function loadData() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'tweetsScanned',
      'aiDetected',
      'apiKey',
      'dailyScans',
      'lastScanDate'
    ], resolve);
  });
}

// Save API key
async function saveApiKey(key) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ apiKey: key }, resolve);
  });
}

// Remove API key
async function removeApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.remove('apiKey', resolve);
  });
}

// Check if it's a new day and reset counter if needed
function checkDailyReset(data) {
  const today = new Date().toDateString();
  if (data.lastScanDate !== today) {
    // Reset daily counter
    chrome.storage.local.set({
      dailyScans: 0,
      lastScanDate: today
    });
    return 0;
  }
  return data.dailyScans || 0;
}

// Update UI based on current state
async function updateUI() {
  const data = await loadData();

  // Update stats
  document.getElementById('tweetsScanned').textContent =
    (data.tweetsScanned || 0).toLocaleString();
  document.getElementById('aiDetected').textContent =
    (data.aiDetected || 0).toLocaleString();

  // Check daily reset
  const dailyScans = checkDailyReset(data);
  const hasApiKey = !!data.apiKey;

  // Update API status section
  const apiIcon = document.getElementById('apiIcon');
  const apiText = document.getElementById('apiText');
  const apiButton = document.getElementById('apiButton');
  const scanLimitSection = document.getElementById('scanLimitSection');
  const limitProgress = document.getElementById('limitProgress');
  const limitText = document.getElementById('limitText');

  if (hasApiKey) {
    // Pro user with API key
    apiIcon.textContent = '🔓';
    apiText.textContent = 'Pro Plan (Unlimited)';
    apiButton.textContent = 'Remove API Key';
    apiButton.classList.add('remove');
    scanLimitSection.classList.add('hidden');
  } else {
    // Free user
    apiIcon.textContent = '🔒';
    apiText.textContent = 'Free Plan (50 scans/day)';
    apiButton.textContent = 'Enter API Key';
    apiButton.classList.remove('remove');
    scanLimitSection.classList.remove('hidden');

    // Update progress bar
    const percentage = Math.min((dailyScans / FREE_SCAN_LIMIT) * 100, 100);
    limitProgress.style.width = `${percentage}%`;
    limitText.textContent = `${dailyScans} / ${FREE_SCAN_LIMIT} scans today`;

    // Change color if limit reached
    if (dailyScans >= FREE_SCAN_LIMIT) {
      limitProgress.classList.add('limit-reached');
      document.getElementById('statusIndicator').classList.remove('active');
      document.getElementById('statusIndicator').classList.add('limited');
      document.getElementById('statusText').textContent = 'Daily Limit Reached';
    } else {
      limitProgress.classList.remove('limit-reached');
      document.getElementById('statusIndicator').classList.add('active');
      document.getElementById('statusIndicator').classList.remove('limited');
      document.getElementById('statusText').textContent = 'Extension Active';
    }
  }
}

// Toggle API key input section
function toggleApiInput(show) {
  const apiSection = document.getElementById('apiSection');
  const apiInputSection = document.getElementById('apiInputSection');

  if (show) {
    apiSection.classList.add('hidden');
    apiInputSection.classList.remove('hidden');
    document.getElementById('apiKeyInput').focus();
  } else {
    apiSection.classList.remove('hidden');
    apiInputSection.classList.add('hidden');
    document.getElementById('apiKeyInput').value = '';
  }
}

// Validate API key format (basic validation)
function validateApiKey(key) {
  // Accept any non-empty key for now
  // In production, you'd validate against your server
  return key && key.length >= 8;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initial load
  updateUI();

  // Refresh stats every second while popup is open
  setInterval(updateUI, 1000);

  // API button click
  document.getElementById('apiButton').addEventListener('click', async () => {
    const data = await loadData();

    if (data.apiKey) {
      // Remove API key
      if (confirm('Remove your API key? You will be limited to 50 scans per day.')) {
        await removeApiKey();
        updateUI();
      }
    } else {
      // Show input section
      toggleApiInput(true);
    }
  });

  // Save API key
  document.getElementById('saveApiKey').addEventListener('click', async () => {
    const key = document.getElementById('apiKeyInput').value.trim();

    if (!validateApiKey(key)) {
      alert('Please enter a valid API key (at least 8 characters)');
      return;
    }

    await saveApiKey(key);
    toggleApiInput(false);
    updateUI();
  });

  // Cancel API key input
  document.getElementById('cancelApiKey').addEventListener('click', () => {
    toggleApiInput(false);
  });

  // Enter key to save
  document.getElementById('apiKeyInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('saveApiKey').click();
    }
  });
});

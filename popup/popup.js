// Kitha Popup Script

const FREE_SCAN_LIMIT = 50;

// Load stats and settings from background script
// This ensures daily reset is properly checked
async function loadData() {
  return new Promise((resolve) => {
    // Get settings from background (handles daily reset)
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
      // Also get user info stored locally
      chrome.storage.local.get(['userEmail', 'userSubscription'], (userData) => {
        resolve({ ...settings, ...userData });
      });
    });
  });
}

// Save API key and user info
async function saveApiKey(key, userEmail = null, userSubscription = null) {
  return new Promise((resolve) => {
    const data = { apiKey: key };
    if (userEmail) data.userEmail = userEmail;
    if (userSubscription) data.userSubscription = userSubscription;
    chrome.storage.local.set(data, resolve);
  });
}

// Remove API key
async function removeApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['apiKey', 'userEmail', 'userSubscription'], resolve);
  });
}

// Validate API key with server
async function validateApiKeyWithServer(key) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'VALIDATE_API_KEY', apiKey: key },
      resolve
    );
  });
}

// Get daily scan count
// Background script already handles daily reset via GET_SETTINGS
function getDailyScans(data) {
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

  // Get daily scan count
  const dailyScans = getDailyScans(data);
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
    const subscriptionText = data.userSubscription === 'pro' ? 'Pro Plan (Unlimited)' : 'Logged In';
    apiText.textContent = data.userEmail ? `${subscriptionText}` : 'Pro Plan (Unlimited)';
    apiButton.textContent = 'Remove API Key';
    apiButton.classList.add('remove');
    scanLimitSection.classList.add('hidden');

    // Show email if available
    if (data.userEmail) {
      apiText.innerHTML = `${subscriptionText}<br><small style="opacity: 0.7">${data.userEmail}</small>`;
    }
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
  const removeConfirmSection = document.getElementById('removeConfirmSection');

  if (show) {
    apiSection.classList.add('hidden');
    apiInputSection.classList.remove('hidden');
    removeConfirmSection.classList.add('hidden');
    document.getElementById('apiKeyInput').focus();
    document.getElementById('apiError').classList.add('hidden');
  } else {
    apiSection.classList.remove('hidden');
    apiInputSection.classList.add('hidden');
    removeConfirmSection.classList.add('hidden');
    document.getElementById('apiKeyInput').value = '';
  }
}

// Toggle remove confirmation section
function toggleRemoveConfirm(show) {
  const apiSection = document.getElementById('apiSection');
  const apiInputSection = document.getElementById('apiInputSection');
  const removeConfirmSection = document.getElementById('removeConfirmSection');

  if (show) {
    apiSection.classList.add('hidden');
    apiInputSection.classList.add('hidden');
    removeConfirmSection.classList.remove('hidden');
  } else {
    apiSection.classList.remove('hidden');
    apiInputSection.classList.add('hidden');
    removeConfirmSection.classList.add('hidden');
  }
}

// Show loading state on save button
function setLoading(loading) {
  const saveBtn = document.getElementById('saveApiKey');
  if (loading) {
    saveBtn.textContent = 'Validating...';
    saveBtn.disabled = true;
  } else {
    saveBtn.textContent = 'Save';
    saveBtn.disabled = false;
  }
}

// Show error message
function showError(message) {
  const errorEl = document.getElementById('apiError');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
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
      // Show remove confirmation UI
      toggleRemoveConfirm(true);
    } else {
      // Show input section
      toggleApiInput(true);
    }
  });

  // Confirm remove API key
  document.getElementById('confirmRemoveKey').addEventListener('click', async () => {
    await removeApiKey();
    toggleRemoveConfirm(false);
    updateUI();
  });

  // Cancel remove API key
  document.getElementById('cancelRemoveKey').addEventListener('click', () => {
    toggleRemoveConfirm(false);
  });

  // Save API key
  document.getElementById('saveApiKey').addEventListener('click', async () => {
    const key = document.getElementById('apiKeyInput').value.trim();

    if (!key || key.length < 8) {
      showError('Please enter a valid API key (at least 8 characters)');
      return;
    }

    setLoading(true);

    // Validate with server
    const result = await validateApiKeyWithServer(key);

    setLoading(false);

    if (result.valid) {
      await saveApiKey(key, result.user?.email, result.user?.subscription);
      toggleApiInput(false);
      updateUI();
    } else {
      showError(result.error || 'Invalid API key. Please check and try again.');
    }
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

  // Clear error on input
  document.getElementById('apiKeyInput').addEventListener('input', () => {
    document.getElementById('apiError').classList.add('hidden');
  });
});

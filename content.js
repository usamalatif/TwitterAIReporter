// TweetGuard AI Detector - Content Script
// Detects and labels AI-generated tweets in real-time

(function() {
  'use strict';

  // Track processed tweets
  const processedTweets = new Set();
  let tweetsScanned = 0;
  let aiDetected = 0;
  let modelLoaded = false;
  let scanLimitReached = false;
  let requestIdCounter = 0;
  const pendingRequests = new Map();

  // Send message to background via loader bridge
  function sendToBackground(type, data = {}) {
    return new Promise((resolve, reject) => {
      const requestId = ++requestIdCounter;

      const handler = (event) => {
        if (event.source !== window) return;
        const msg = event.data;
        if (!msg || msg.source !== 'tweetguard-loader' || msg.requestId !== requestId) return;

        window.removeEventListener('message', handler);
        pendingRequests.delete(requestId);

        if (msg.error) {
          reject(new Error(msg.error));
        } else {
          resolve(msg.response);
        }
      };

      pendingRequests.set(requestId, handler);
      window.addEventListener('message', handler);

      window.postMessage({
        source: 'tweetguard-content',
        type: type,
        data: data,
        requestId: requestId
      }, '*');

      // Timeout after 5 seconds
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          window.removeEventListener('message', handler);
          pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 5000);
    });
  }

  // Check if we can scan (API key or under limit)
  async function canScan() {
    try {
      const result = await sendToBackground('CHECK_CAN_SCAN');
      return result;
    } catch (e) {
      console.error('[TweetGuard] Error checking scan limit:', e);
      // Allow scanning on error (fail open)
      return { allowed: true, isPro: false };
    }
  }

  // Increment scan counter
  async function incrementScan() {
    try {
      await sendToBackground('INCREMENT_SCAN');
    } catch (e) {
      console.error('[TweetGuard] Error incrementing scan:', e);
    }
  }

  // Increment AI counter
  async function incrementAI() {
    try {
      await sendToBackground('INCREMENT_AI');
    } catch (e) {
      console.error('[TweetGuard] Error incrementing AI count:', e);
    }
  }

  // Determine badge style based on score
  function getBadgeInfo(result) {
    const percentage = Math.round(result.aiProb * 100);

    if (result.aiProb < 0.3) {
      return {
        emoji: '✍️',
        text: 'Human',
        className: 'ai-badge-human',
        tooltip: `Human: ${Math.round(result.humanProb * 100)}% | AI: ${percentage}%`
      };
    } else if (result.aiProb < 0.6) {
      return {
        emoji: '🤔',
        text: `${percentage}%`,
        className: 'ai-badge-uncertain',
        tooltip: `Uncertain - Human: ${Math.round(result.humanProb * 100)}% | AI: ${percentage}%`
      };
    } else {
      return {
        emoji: '🤖',
        text: `${percentage}%`,
        className: 'ai-badge-ai',
        tooltip: `Likely AI - Human: ${Math.round(result.humanProb * 100)}% | AI: ${percentage}%`
      };
    }
  }

  // Extract tweet ID from a tweet element
  function getTweetId(tweetElement) {
    const link = tweetElement.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/\/status\/(\d+)/);
      return match ? match[1] : null;
    }
    return `tweet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Extract tweet text
  function getTweetText(tweetElement) {
    const textElement = tweetElement.querySelector('[data-testid="tweetText"]');
    if (textElement) {
      return textElement.innerText.trim();
    }
    return '';
  }

  // Create and inject the AI detection badge
  function addAIBadge(tweetElement, result) {
    if (tweetElement.querySelector('.ai-detector-badge')) {
      return;
    }

    const badgeInfo = getBadgeInfo(result);

    const badge = document.createElement('span');
    badge.className = `ai-detector-badge ${badgeInfo.className}`;
    badge.title = badgeInfo.tooltip;
    badge.innerHTML = `<span class="ai-badge-emoji">${badgeInfo.emoji}</span><span class="ai-badge-text">${badgeInfo.text}</span>`;

    const usernameContainer = tweetElement.querySelector('[data-testid="User-Name"]');

    if (usernameContainer) {
      const innerContainer = usernameContainer.querySelector('div[dir="ltr"]') || usernameContainer;
      innerContainer.appendChild(badge);
    }
  }

  // Add limit reached badge
  function addLimitBadge(tweetElement) {
    if (tweetElement.querySelector('.ai-detector-badge')) {
      return;
    }

    const badge = document.createElement('span');
    badge.className = 'ai-detector-badge ai-badge-loading';
    badge.title = 'Daily scan limit reached. Add API key for unlimited scans.';
    badge.innerHTML = '<span class="ai-badge-emoji">🔒</span><span class="ai-badge-text">Limit</span>';

    const usernameContainer = tweetElement.querySelector('[data-testid="User-Name"]');
    if (usernameContainer) {
      const innerContainer = usernameContainer.querySelector('div[dir="ltr"]') || usernameContainer;
      innerContainer.appendChild(badge);
    }
  }

  // Add loading badge while detecting
  function addLoadingBadge(tweetElement) {
    if (tweetElement.querySelector('.ai-detector-badge')) {
      return null;
    }

    const badge = document.createElement('span');
    badge.className = 'ai-detector-badge ai-badge-loading';
    badge.innerHTML = '<span class="ai-badge-emoji">⏳</span><span class="ai-badge-text">...</span>';

    const usernameContainer = tweetElement.querySelector('[data-testid="User-Name"]');
    if (usernameContainer) {
      const innerContainer = usernameContainer.querySelector('div[dir="ltr"]') || usernameContainer;
      innerContainer.appendChild(badge);
      return badge;
    }
    return null;
  }

  // Process a single tweet element
  async function processTweet(tweetElement) {
    const tweetId = getTweetId(tweetElement);

    if (!tweetId || processedTweets.has(tweetId)) {
      return;
    }

    const text = getTweetText(tweetElement);

    // Skip tweets with very short text
    if (!text || text.length < 20) {
      return;
    }

    processedTweets.add(tweetId);

    // Check scan limit before processing
    if (!scanLimitReached) {
      const scanCheck = await canScan();
      if (!scanCheck.allowed) {
        scanLimitReached = true;
        showLimitNotification();
      }
    }

    if (scanLimitReached) {
      addLimitBadge(tweetElement);
      return;
    }

    // Add loading indicator
    const loadingBadge = addLoadingBadge(tweetElement);

    try {
      // Run AI detection
      const result = await detector.detect(text, tweetId);

      // Remove loading badge
      if (loadingBadge) {
        loadingBadge.remove();
      }

      // Add result badge
      addAIBadge(tweetElement, result);

      // Update stats via background
      await incrementScan();
      tweetsScanned++;

      if (result.isAI) {
        await incrementAI();
        aiDetected++;
      }

    } catch (error) {
      console.error('[TweetGuard] Error processing tweet:', error);
      if (loadingBadge) {
        loadingBadge.remove();
      }
    }
  }

  // Show notification when limit is reached
  function showLimitNotification() {
    const notification = document.createElement('div');
    notification.id = 'tweetguard-limit-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff9800 0%, #f44336 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        max-width: 300px;
      ">
        <div style="font-weight: 600; margin-bottom: 8px;">
          🔒 Daily Scan Limit Reached
        </div>
        <div style="font-size: 12px; opacity: 0.9;">
          You've used all 50 free scans today. Add an API key in the extension popup for unlimited scans.
        </div>
        <button id="tweetguard-dismiss" style="
          margin-top: 12px;
          padding: 8px 16px;
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 12px;
          cursor: pointer;
        ">Dismiss</button>
      </div>
    `;
    document.body.appendChild(notification);

    document.getElementById('tweetguard-dismiss').addEventListener('click', () => {
      notification.remove();
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }

  // Intersection Observer for lazy processing
  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          processTweet(entry.target);
        }
      });
    },
    {
      rootMargin: '200px',
      threshold: 0.1
    }
  );

  // Find and observe all tweet elements
  function observeTweets() {
    const tweets = document.querySelectorAll('[data-testid="tweet"]');

    tweets.forEach((tweet) => {
      if (!tweet.hasAttribute('data-ai-observed')) {
        tweet.setAttribute('data-ai-observed', 'true');
        intersectionObserver.observe(tweet);
      }
    });
  }

  // Mutation Observer for infinite scroll
  const mutationObserver = new MutationObserver((mutations) => {
    clearTimeout(mutationObserver.timeout);
    mutationObserver.timeout = setTimeout(observeTweets, 100);
  });

  // Wait for Twitter to load
  function waitForTwitter() {
    return new Promise((resolve) => {
      if (document.querySelector('[data-testid="tweet"]')) {
        resolve();
        return;
      }

      const checkInterval = setInterval(() => {
        if (document.querySelector('[data-testid="tweet"]')) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 200);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 30000);
    });
  }

  // Show loading status
  function showLoadingStatus() {
    const status = document.createElement('div');
    status.id = 'tweetguard-status';
    status.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 10px;
      ">
        <div style="
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <span>Loading AI Detection Model...</span>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(status);
    return status;
  }

  // Initialize the extension
  async function init() {
    console.log('[TweetGuard] Starting initialization...');

    // Show loading status
    const loadingStatus = showLoadingStatus();

    try {
      // Wait for Twitter DOM
      await waitForTwitter();

      // Initialize AI detector (loads model)
      console.log('[TweetGuard] Loading AI model...');
      await detector.initialize();
      modelLoaded = true;

      // Remove loading status
      loadingStatus.remove();

      // Start observing tweets
      observeTweets();

      // Watch for new tweets
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });

      console.log('[TweetGuard] Initialized successfully!');
      console.log('[TweetGuard] Memory usage:', detector.getMemoryInfo());

    } catch (error) {
      console.error('[TweetGuard] Initialization failed:', error);
      loadingStatus.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #ff4444;
          color: white;
          padding: 12px 20px;
          border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          z-index: 10000;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        ">
          ❌ Failed to load AI model
        </div>
      `;
      setTimeout(() => loadingStatus.remove(), 5000);
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

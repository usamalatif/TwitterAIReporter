// TweetGuard AI Detector - Content Script
// Detects and labels AI-generated tweets using server API

(function() {
  'use strict';

  // Logging helper
  function log(message, data = null) {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[TweetGuard CS ${timestamp}] ${message}`, data);
    } else {
      console.log(`[TweetGuard CS ${timestamp}] ${message}`);
    }
  }

  // Track processed tweets
  const processedTweets = new Set();
  let scanLimitReached = false;

  // SVG Icons (balanced size)
  const ICONS = {
    human: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    ai: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`,
    uncertain: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    lock: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    loading: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    error: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    thumbsUp: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`,
    thumbsDown: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`
  };

  // Threshold constants - adjusted for better accuracy
  const THRESHOLD_HUMAN = 0.4;      // Below this = Human
  const THRESHOLD_AI = 0.7;         // Above this = AI (Vibed)
  // Between 0.4-0.7 = Uncertain

  // Determine badge style based on score
  function getBadgeInfo(result) {
    const percentage = Math.round(result.aiProb * 100);

    if (result.aiProb < THRESHOLD_HUMAN) {
      return {
        icon: ICONS.human,
        text: 'Human',
        className: 'ai-badge-human',
        tooltip: `Human: ${Math.round(result.humanProb * 100)}% | AI: ${percentage}%`,
        prediction: 'human'
      };
    } else if (result.aiProb < THRESHOLD_AI) {
      return {
        icon: ICONS.uncertain,
        text: `${percentage}%`,
        className: 'ai-badge-uncertain',
        tooltip: `Uncertain - Human: ${Math.round(result.humanProb * 100)}% | AI: ${percentage}%`,
        prediction: 'uncertain'
      };
    } else {
      return {
        icon: ICONS.ai,
        text: `Vibed ${percentage}%`,
        className: 'ai-badge-ai',
        tooltip: `Likely AI-generated (vibed) - Human: ${Math.round(result.humanProb * 100)}% | AI: ${percentage}%`,
        prediction: 'ai'
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

  // Send feedback to server
  async function sendFeedback(tweetId, tweetText, aiProb, prediction, isCorrect) {
    try {
      const response = await fetch('https://www.kitha.co/api/model-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweetId,
          tweetText: tweetText.substring(0, 500), // Limit text length
          aiProb,
          prediction,
          isCorrect,
          timestamp: new Date().toISOString()
        })
      });
      return response.ok;
    } catch (error) {
      log('Failed to send feedback:', error);
      return false;
    }
  }

  // Create and inject the AI detection badge with feedback buttons
  function addAIBadge(tweetElement, result) {
    if (tweetElement.querySelector('.ai-detector-badge')) {
      return;
    }

    const badgeInfo = getBadgeInfo(result);
    const tweetId = getTweetId(tweetElement);
    const tweetText = getTweetText(tweetElement);

    const badge = document.createElement('span');
    badge.className = `ai-detector-badge ${badgeInfo.className}`;
    badge.title = badgeInfo.tooltip;

    // Badge content with feedback buttons
    badge.innerHTML = `
      <span class="ai-badge-icon">${badgeInfo.icon}</span>
      <span class="ai-badge-text">${badgeInfo.text}</span>
      <span class="ai-badge-feedback" title="Is this correct?">
        <button class="ai-feedback-btn ai-feedback-correct" title="Correct">
          ${ICONS.thumbsUp}
        </button>
        <button class="ai-feedback-btn ai-feedback-wrong" title="Wrong">
          ${ICONS.thumbsDown}
        </button>
      </span>
    `;

    // Add feedback button handlers
    const correctBtn = badge.querySelector('.ai-feedback-correct');
    const wrongBtn = badge.querySelector('.ai-feedback-wrong');
    const feedbackContainer = badge.querySelector('.ai-badge-feedback');

    // Prevent badge clicks from triggering profile navigation
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    correctBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const success = await sendFeedback(tweetId, tweetText, result.aiProb, badgeInfo.prediction, true);
      if (success) {
        feedbackContainer.innerHTML = '<span class="ai-feedback-thanks">Thanks!</span>';
      }
    });

    wrongBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const success = await sendFeedback(tweetId, tweetText, result.aiProb, badgeInfo.prediction, false);
      if (success) {
        feedbackContainer.innerHTML = '<span class="ai-feedback-thanks">Thanks!</span>';
      }
    });

    // Find the time element and insert badge after it (inline with name/handle/time)
    const usernameContainer = tweetElement.querySelector('[data-testid="User-Name"]');

    if (usernameContainer) {
      // Try to find the time element to insert after it
      const timeElement = usernameContainer.querySelector('time');
      if (timeElement && timeElement.parentElement) {
        // Insert after the time's parent (the link containing time)
        timeElement.parentElement.parentElement.appendChild(badge);
      } else {
        // Fallback: append to the username container
        usernameContainer.appendChild(badge);
      }
    }
  }

  // Add limit reached badge
  function addLimitBadge(tweetElement) {
    if (tweetElement.querySelector('.ai-detector-badge')) {
      return;
    }

    const badge = document.createElement('span');
    badge.className = 'ai-detector-badge ai-badge-limit';
    badge.title = 'Daily scan limit reached. Add API key for unlimited scans.';
    badge.innerHTML = `<span class="ai-badge-icon">${ICONS.lock}</span><span class="ai-badge-text">Limit</span>`;

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    const usernameContainer = tweetElement.querySelector('[data-testid="User-Name"]');
    if (usernameContainer) {
      const timeElement = usernameContainer.querySelector('time');
      if (timeElement && timeElement.parentElement) {
        timeElement.parentElement.parentElement.appendChild(badge);
      } else {
        usernameContainer.appendChild(badge);
      }
    }
  }

  // Add loading badge while detecting
  function addLoadingBadge(tweetElement) {
    if (tweetElement.querySelector('.ai-detector-badge')) {
      return null;
    }

    const badge = document.createElement('span');
    badge.className = 'ai-detector-badge ai-badge-loading';
    badge.innerHTML = `<span class="ai-badge-icon ai-badge-spin">${ICONS.loading}</span><span class="ai-badge-text">...</span>`;

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    const usernameContainer = tweetElement.querySelector('[data-testid="User-Name"]');
    if (usernameContainer) {
      const timeElement = usernameContainer.querySelector('time');
      if (timeElement && timeElement.parentElement) {
        timeElement.parentElement.parentElement.appendChild(badge);
      } else {
        usernameContainer.appendChild(badge);
      }
      return badge;
    }
    return null;
  }

  // Add error badge
  function addErrorBadge(tweetElement) {
    if (tweetElement.querySelector('.ai-detector-badge')) {
      return;
    }

    const badge = document.createElement('span');
    badge.className = 'ai-detector-badge ai-badge-error';
    badge.title = 'Failed to analyze tweet';
    badge.innerHTML = `<span class="ai-badge-icon">${ICONS.error}</span><span class="ai-badge-text">Error</span>`;

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    const usernameContainer = tweetElement.querySelector('[data-testid="User-Name"]');
    if (usernameContainer) {
      const timeElement = usernameContainer.querySelector('time');
      if (timeElement && timeElement.parentElement) {
        timeElement.parentElement.parentElement.appendChild(badge);
      } else {
        usernameContainer.appendChild(badge);
      }
    }
  }

  // Process a single tweet element
  async function processTweet(tweetElement) {
    const startTime = performance.now();
    const tweetId = getTweetId(tweetElement);

    if (!tweetId || processedTweets.has(tweetId)) {
      return;
    }

    const text = getTweetText(tweetElement);

    // Skip tweets with very short text
    if (!text || text.length < 20) {
      log(`Skipping tweet ${tweetId} - text too short (${text?.length || 0} chars)`);
      return;
    }

    log(`Processing tweet ${tweetId}`, { textLength: text.length, textPreview: text.substring(0, 50) + '...' });
    processedTweets.add(tweetId);

    // If limit already reached, show limit badge
    if (scanLimitReached) {
      addLimitBadge(tweetElement);
      return;
    }

    // Add loading indicator
    const loadingBadge = addLoadingBadge(tweetElement);

    try {
      // Send to background script for API call
      log(`Sending message to background for tweet ${tweetId}...`);
      const msgStartTime = performance.now();

      const result = await chrome.runtime.sendMessage({
        type: 'DETECT_AI',
        text: text,
        tweetId: tweetId
      });

      const msgTime = performance.now() - msgStartTime;
      log(`Background response received in ${msgTime.toFixed(0)}ms`, result);

      // Remove loading badge
      if (loadingBadge) {
        loadingBadge.remove();
      }

      if (result.limitReached) {
        scanLimitReached = true;
        addLimitBadge(tweetElement);
        showLimitNotification();
        return;
      }

      if (result.success) {
        addAIBadge(tweetElement, result);
        const totalTime = performance.now() - startTime;
        log(`Tweet ${tweetId} processed successfully in ${totalTime.toFixed(0)}ms - AI: ${(result.aiProb * 100).toFixed(1)}%`);
      } else {
        addErrorBadge(tweetElement);
        log(`Tweet ${tweetId} failed - no success`);
      }

    } catch (error) {
      const totalTime = performance.now() - startTime;
      log(`Error processing tweet ${tweetId} after ${totalTime.toFixed(0)}ms: ${error.message}`);
      if (loadingBadge) {
        loadingBadge.remove();
      }
      addErrorBadge(tweetElement);
    }
  }

  // Show notification when limit is reached
  function showLimitNotification() {
    if (document.getElementById('tweetguard-limit-notification')) {
      return;
    }

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
        <div style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Daily Scan Limit Reached
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
    let newTweets = 0;

    tweets.forEach((tweet) => {
      if (!tweet.hasAttribute('data-ai-observed')) {
        tweet.setAttribute('data-ai-observed', 'true');
        intersectionObserver.observe(tweet);
        newTweets++;
      }
    });

    if (newTweets > 0) {
      log(`Found ${newTweets} new tweets to observe (total on page: ${tweets.length})`);
    }
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

  // Initialize the extension
  async function init() {
    const initStartTime = performance.now();
    log('Starting initialization...');

    try {
      // Wait for Twitter DOM
      log('Waiting for Twitter DOM...');
      const waitStart = performance.now();
      await waitForTwitter();
      log(`Twitter DOM ready in ${(performance.now() - waitStart).toFixed(0)}ms`);

      // Start observing tweets
      log('Starting to observe tweets...');
      observeTweets();

      // Watch for new tweets
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });

      const totalInitTime = performance.now() - initStartTime;
      log(`Initialized successfully in ${totalInitTime.toFixed(0)}ms`);

    } catch (error) {
      log(`Initialization failed: ${error.message}`);
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

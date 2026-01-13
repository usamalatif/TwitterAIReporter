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

  // Add error badge
  function addErrorBadge(tweetElement) {
    if (tweetElement.querySelector('.ai-detector-badge')) {
      return;
    }

    const badge = document.createElement('span');
    badge.className = 'ai-detector-badge ai-badge-loading';
    badge.title = 'Failed to analyze tweet';
    badge.innerHTML = '<span class="ai-badge-emoji">⚠️</span><span class="ai-badge-text">Error</span>';

    const usernameContainer = tweetElement.querySelector('[data-testid="User-Name"]');
    if (usernameContainer) {
      const innerContainer = usernameContainer.querySelector('div[dir="ltr"]') || usernameContainer;
      innerContainer.appendChild(badge);
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

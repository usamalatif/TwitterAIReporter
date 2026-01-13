// TweetGuard Loader - Injects scripts into page's MAIN world
// Also acts as a bridge between MAIN world and extension APIs

(function() {
  'use strict';

  console.log('[TweetGuard Loader] Starting...');

  // Get the extension base URL for resource access
  const extensionBaseUrl = chrome.runtime.getURL('');
  console.log('[TweetGuard Loader] Extension URL:', extensionBaseUrl);

  // Store the base URL in a data attribute on documentElement
  document.documentElement.dataset.tweetguardBaseUrl = extensionBaseUrl;

  // Function to inject a script element into the page
  function injectScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        console.log('[TweetGuard Loader] Loaded:', url.split('/').pop());
        resolve();
      };
      script.onerror = (e) => {
        console.error('[TweetGuard Loader] Failed to load:', url, e);
        reject(e);
      };
      (document.head || document.documentElement).appendChild(script);
    });
  }

  // Bridge: Listen for messages from MAIN world and forward to background
  window.addEventListener('message', async (event) => {
    // Only accept messages from same window
    if (event.source !== window) return;

    const message = event.data;
    if (!message || message.source !== 'tweetguard-content') return;

    try {
      // Forward to background script
      const response = await chrome.runtime.sendMessage({
        type: message.type,
        data: message.data
      });

      // Send response back to MAIN world
      window.postMessage({
        source: 'tweetguard-loader',
        requestId: message.requestId,
        response: response
      }, '*');
    } catch (error) {
      console.error('[TweetGuard Loader] Bridge error:', error);
      window.postMessage({
        source: 'tweetguard-loader',
        requestId: message.requestId,
        error: error.message
      }, '*');
    }
  });

  // Main injection sequence
  async function startInjection() {
    try {
      // Load TensorFlow.js
      console.log('[TweetGuard Loader] Loading TensorFlow.js...');
      await injectScript(chrome.runtime.getURL('lib/tf.min.js'));

      // Small delay to let TF.js initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load detector.js
      console.log('[TweetGuard Loader] Loading detector...');
      await injectScript(chrome.runtime.getURL('detector.js'));

      // Load content.js
      console.log('[TweetGuard Loader] Loading content script...');
      await injectScript(chrome.runtime.getURL('content.js'));

      console.log('[TweetGuard Loader] All scripts loaded');

    } catch (error) {
      console.error('[TweetGuard Loader] Injection failed:', error);
    }
  }

  // Start injection when document is ready
  if (document.documentElement) {
    startInjection();
  } else {
    const observer = new MutationObserver(() => {
      if (document.documentElement) {
        observer.disconnect();
        document.documentElement.dataset.tweetguardBaseUrl = extensionBaseUrl;
        startInjection();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  }
})();

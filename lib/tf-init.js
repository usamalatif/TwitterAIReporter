// Initialize TensorFlow.js - capture reference before anything else runs
// This runs AFTER tf.min.js loads
(function() {
  'use strict';
  console.log('[TweetGuard] tf-init.js executing...');

  // TensorFlow.js should be on window.tf after tf.min.js executes
  var tfLib = window.tf;

  console.log('[TweetGuard] Checking TensorFlow.js...');
  console.log('[TweetGuard] window.tf exists:', !!tfLib);
  console.log('[TweetGuard] window.tf type:', typeof tfLib);

  if (tfLib) {
    console.log('[TweetGuard] TF object keys (first 20):', Object.keys(tfLib).slice(0, 20).join(', '));
    console.log('[TweetGuard] loadGraphModel type:', typeof tfLib.loadGraphModel);
    console.log('[TweetGuard] tensor2d type:', typeof tfLib.tensor2d);
    console.log('[TweetGuard] version:', tfLib.version);
  }

  if (tfLib && typeof tfLib.loadGraphModel === 'function') {
    // Store multiple references to ensure availability
    window.tfjs = tfLib;
    window.TweetGuardTF = tfLib;
    self.TweetGuardTF = tfLib;
    console.log('[TweetGuard] TensorFlow.js captured successfully!');
    console.log('[TweetGuard] Version:', tfLib.version ? tfLib.version.tfjs : 'unknown');
  } else if (tfLib && Object.keys(tfLib).length > 0) {
    console.error('[TweetGuard] TensorFlow.js loaded but loadGraphModel not found');
    console.error('[TweetGuard] This might be a core-only build without converter support');
  } else {
    console.error('[TweetGuard] TensorFlow.js not loaded properly');
    console.error('[TweetGuard] window.tf is:', tfLib);
  }
})();

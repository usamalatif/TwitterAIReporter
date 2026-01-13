// Force TensorFlow.js to export to window
// This wrapper prevents module detection issues in Chrome extensions
(function() {
  'use strict';

  // Save any existing module/exports to restore later
  var _module = typeof module !== 'undefined' ? module : undefined;
  var _exports = typeof exports !== 'undefined' ? exports : undefined;
  var _define = typeof define !== 'undefined' ? define : undefined;

  // Remove module detection to force UMD global export
  if (typeof module !== 'undefined') {
    module = undefined;
  }
  if (typeof exports !== 'undefined') {
    exports = undefined;
  }
  if (typeof define !== 'undefined') {
    define = undefined;
  }

  console.log('[TweetGuard] tf-wrapper: Module detection disabled for TensorFlow.js');
})();

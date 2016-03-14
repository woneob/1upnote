;(function($, win, doc, undefined) {
  'use strict';

  var $win = $(win);
  var $doc = $(doc);

  // Enable CSS active pseudo styles in Mobile Safari
  $doc.on({
    touchstart: function() {},
    ready: function() {
      FastClick.attach(doc.body);
    }
  });
})(jQuery, window, document);

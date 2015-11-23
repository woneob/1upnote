;(function($, win, doc) {
  var $win = $(win);
  var $doc = $(doc);

  // Enable CSS active pseudo styles in Mobile Safari
  $doc.on({
    touchstart: function() {}
  });
})(jQuery, window, document);

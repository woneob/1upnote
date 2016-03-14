;(function($, win, doc, undefined) {
  'use strict';

  var $win = $(win);
  var $doc = $(doc);

  $.extend($.fn, {
    menuButton: function() {
      var $button = this.eq(0);
      var toggleClassName = 'menuShown';

      var menuToggle = function() {
        var $this = $(this);
        var isMenuShown = $this.hasClass(toggleClassName);
        var toggleMethod = (isMenuShown ? 'remove' : 'add') + 'Class';

        $this[toggleMethod](toggleClassName);
      };

      $button.on('click', menuToggle);
    }
  });

  $doc.on({
    touchstart: function() {},
    ready: function() {
      FastClick.attach(this.body);
      $('#menuButton').menuButton();
    }
  });
})(jQuery, window, document);

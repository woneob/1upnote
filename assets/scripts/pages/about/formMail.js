;(function($) {
  $.fn.formMail = function() {
    var $form = this.eq(0);

    if (!$form.length) {
      return;
    }

    var formSubmit = function(e) {
      e.preventDefault();

      var url = $form.attr('action');
      var data = $form.serialize();

      $.ajax({
        url: url,
        method: 'post',
        data: data,
        dataType: 'json',
        success: function(data) {
          alert('Your email was sent!');
          $form.trigger('reset');
        },
        error: function(error) {
          alert('Failed to send email');
          console.error(error);
        }
      });
    };

    $form.on('submit', formSubmit);
  };

  $('#contactForm').formMail();
})(jQuery);

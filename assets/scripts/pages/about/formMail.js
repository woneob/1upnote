;(function($) {
  $.fn.formMail = function() {
    var $forms = this;

    var formSubmit = function($form) {
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

    return $forms.each(function() {
      var $this = $(this);

      $this.on('submit', function(e) {
        e.preventDefault();
        formSubmit($this);
      });
    });
  };

  $('#contactForm').formMail();
})(jQuery);

module.exports = function() {
  return {
    escape: function(string) {
      var entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
      };

      return String(string).replace(/[&<>"'`=\/]/g, function(s) {
        return entityMap[s];
      });
    }
  };
};

var prism = require('prismjs');

module.exports = {
  highlight: function(str, opts) {
    str = prism.highlight(str, prism.languages[opts.lang]);
    str = str.replace(/(?:\r\n|\r|\n)/g, '<br>');

    return str;
  }
};

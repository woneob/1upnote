module.exports = function(site) {
  return [
    '  _ _   _ ___',
    ' / | | | | _ `',
    ' | | |_| |  _/',
    ' |_|.___/|_|',
    '',
    ' ' + site.name + ' v' + site.version,
    ' ' + site.tagline,
    ' This site is hosted on GitHub Pages',
    ''
  ].join('\n');
};

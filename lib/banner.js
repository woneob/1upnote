module.exports = function(site, date) {
  return [
    '  _ _   _ ___',
    ' / | | | | _ `',
    ' | | |_| |  _/',
    ' |_|.___/|_|',
    '',
    ' ' + site.name + ' v' + site.version,
    ' ' + site.tagline,
    ' last updated at ' + date(new Date(), 'longDate'),
    ''
  ].join('\n');
};

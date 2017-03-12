module.exports = function(yargs) {
  return yargs
    .options({
      port: {
        alias: 'p',
        describe: 'Set server port number.',
        default: 8080,
        type: 'number'
      },
      clean: {
        describe: 'Clean before starting a build.',
        default: false,
        type: 'boolean'
      },
      pretty: {
        describe: 'Disable code compression.',
        default: false,
        type: 'boolean'
      },
      version: {
        alias: 'v',
        describe: 'Show Version information.',
        exitProcess: true
      }
    })
    .version(function() {
      return site.name + '- v' + site.version;
    })
    .detectLocale(false)
    .help()
    .argv;
};

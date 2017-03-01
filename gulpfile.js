var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');
var lazypipe = require('lazypipe');
var glob = require('glob');
var yaml = require('js-yaml');
var $ = require('gulp-load-plugins')();
var site =  require('./package.json');

var base = {
  src: path.resolve(__dirname, site.src),
  dist: path.resolve(__dirname, site.dist)
};

gulp.task('server', function() {
  $.connect.server({
    root: site.dist,
    livereload: false
  });
});

gulp.task('style', function() {
  var dirname = 'styles';

  var opts = {
    postcss: [
      autoprefixer({
        remove: false,
        cascade: false
      }),
      cssnano({
        safe: true
      })
    ]
  };

  return gulp
    .src(path.join(site.src, dirname, '/**/*.scss'))
    .pipe($.plumber())
    .pipe($.sassLint())
    .pipe($.sassLint.format())
    .pipe($.sassLint.failOnError())
    .pipe($.sass().on('error', $.sass.logError))
    .pipe($.postcss(opts.postcss))
    .pipe(gulp.dest(path.join(site.dist, dirname)));
});

gulp.task('script', function() {
  var dirname = 'scripts';
  var isOptimizable = function(file) {
    var originPath = file.path;
    var stripPath = path.join(base.src, dirname, '/');
    var originDir = path.dirname(originPath.replace(stripPath, ''));
    var baseDir = originDir.split(path.sep)[0];

    var disallowList = [
      'libs',
      'plugins'
    ];

    return disallowList.indexOf(baseDir) < 0;
  };

  var optimizeChains = lazypipe()
    .pipe($.eslint)
    .pipe($.eslint.format)
    .pipe($.uglify);

  return gulp
    .src(path.join(base.src, dirname, '**/*.js'))
    .pipe($.if(isOptimizable, optimizeChains()))
    .pipe(gulp.dest(path.join(base.dist, dirname)));
});

gulp.task('others', function() {
  var dirname = 'others';
  var opts = {
    ejs: {
      site: site
    },
    rename: {
      extname: ''
    }
  };

  var isEjs = function(file) {
    return path.extname(file.path) === '.ejs';
  };

  return gulp
    .src(path.join(base.src, dirname, '**/*'))
    .pipe($.if(isEjs, $.ejs(opts.ejs)))
    .pipe($.if(isEjs, $.rename(opts.rename)))
    .pipe(gulp.dest(base.dist));
});

gulp.task('page', function() {
  var routes = fs.readFileSync(path.join(base.src, 'pages/.routes.yml'));
  var pages = yaml.safeLoad(routes);
  var extName = '.pug';
  var opts = {
    pug: {
      basedir: path.join(base.src, 'layouts'),
      pretty: true,
      data: {
        site: site
      }
    }
  };

  var getPageName = function(str) {
    return str
      .replace(/\.pug$/, '')
      .replace(path.join(base.src, 'pages'), '')
      .replace(/\\/g, '/') || '/';
  };

  var preset = function(file) {
    var contents = file.contents.toString();
    var indent = '\u0020'.repeat(2);
    var pageName = file.path;
    var data = {};

    if (path.basename(pageName, extName) === 'index') {
      pageName = path.resolve(pageName, '../');
    }

    pageName = getPageName(pageName);
    data.page = pages[pageName];

    var assets = function(type, pageName) {
      var cases = {
        styles: {
          files: '**/*.scss',
          tag: function(src) {
            src = src.replace(/\.[^/.]+$/, '.css');
            return 'link(rel= \'stylesheet\', href=\'' + src + '\')';
          }
        },
        scripts: {
          files: '**/*.js',
          tag: function(src) {
            return 'script(src=\'' + src + '\')';
          }
        }
      };

      var fileRoot = path.join(site.src, type, 'pages', pageName);
      var filePath = path.join(fileRoot, cases[type].files);
      var files = glob.sync(filePath);
      var html = '';

      if (type === 'scripts' && data.page.plugins) {
        files = data.page.plugins.map(function(link) {
          return '/scripts/plugins/' + link;
        }).concat(files);
      }

      files.forEach(function(src) {
        src = src.replace(site.src, '');
        html += indent + cases[type].tag(src) + '\n';
      });

      return html;
    };

    file.contents = new Buffer([
      'extends /' + data.page.layout,
      'block append styles',
      assets('styles', pageName),
      'block append scripts',
      assets('scripts', pageName),
      'block content',
      contents.replace(/^(?!\s*$)/mg, indent)
    ].join('\n'));

    var contentPath = path.join(base.src, 'data/pages', pageName, '*.yml');
    var contents = glob.sync(contentPath);

    contents.forEach(function(content) {
      var baseName = path.basename(content, '.yml');
      var contentData = yaml.safeLoad(fs.readFileSync(content, 'utf-8'));

      data[baseName] = contentData;
    });

    return data;
  };

  return gulp
    .src(path.join(site.src, 'pages/**/*' + extName))
    .pipe($.data(preset))
    .pipe($.pug(opts.pug))
    .pipe(gulp.dest(site.dist));
});

gulp.task('default', ['server']);
gulp.task('build', [
  'style',
  'script',
  'others',
  'page'
]);
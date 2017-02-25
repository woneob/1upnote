var path = require('path');
var gulp = require('gulp');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');
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

gulp.task('default', ['server']);
gulp.task('build', ['style']);

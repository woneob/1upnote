var gulp = require('gulp');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');
var $ = require('gulp-load-plugins')();
var site =  require('./package.json');

gulp.task('server', function() {
  $.connect.server({
    root: 'dist',
    livereload: true
  });
});

gulp.task('style', function() {
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
    .src('src/styles/**/*.scss')
    .pipe($.sass().on('error', $.sass.logError))
    .pipe($.postcss(opts.postcss))
    .pipe(gulp.dest('dist/styles'));
});

gulp.task('default', ['server']);
gulp.task('build', ['style']);

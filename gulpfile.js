var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var site =  require('./package.json');

gulp.task('server', function() {
  $.connect.server({
    root: 'dist',
    livereload: true
  });
});

gulp.task('style', function() {
  return gulp
    .src('src/styles/**/*.scss')
    .pipe($.sass().on('error', $.sass.logError))
    .pipe(gulp.dest('dist/styles'));
});

gulp.task('default', ['server']);
gulp.task('build', ['style']);

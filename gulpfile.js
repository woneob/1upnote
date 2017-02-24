var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var site =  require('./package.json');

gulp.task('server', function() {
  $.connect.server({
    root: 'dist',
    livereload: true
  });
});

gulp.task('default', ['server']);

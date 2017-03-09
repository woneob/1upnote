var fs = require('fs');
var url = require('url');
var path = require('path');
var gulp = require('gulp');
var argv = require('yargs').argv;
var del = require('del');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');
var lazypipe = require('lazypipe');
var glob = require('glob');
var yaml = require('js-yaml');
var $ = require('gulp-load-plugins')();
var site =  require('./package.json');
var viewUtils = require('./lib/viewUtils.js')();
var banner = require('./lib/banner.js')(site);

var objectFilter = function(obj, predicate) {
  return Object.keys(obj).filter(function(key) {
    return predicate(obj[key]);
  }).reduce(function(res, key) {
    return res[key] = obj[key], res;
  }, {});
};

var base = {
  src: path.resolve(__dirname, site.src),
  dist: path.resolve(__dirname, site.dist)
};

var router = function() {
  var file = fs.readFileSync(path.join(base.src, 'pages/.routes.yml'));
  var pages = yaml.safeLoad(file);
  var posts = objectFilter(pages, function(item) {
    return item.type === 'post';
  });

  return {
    pages: pages,
    posts: posts
  };
};

gulp.task('clean', function() {
  $.cached.caches = {};

  if (argv.clean) {
    return del(path.join(site.dist, '**'));
  } else {
    return false;
  }
});

gulp.task('server', function() {
  var middleware = function(connect, opt) {
    var norFoundMiddleware = function(req, res, next) {
      var reqUrlPathname = url.parse(req.url).pathname;
      var reqPathObj = path.parse(reqUrlPathname);
      var filePath;

      if (req.method === 'GET' && reqPathObj.ext === '') {
        filePath = path.join(base.dist, reqUrlPathname, 'index.html');

        fs.exists(filePath, function(exists) {
          var notFoundPath;
          var notFoundStream;

          if (exists) {
            next();
          } else {
            res.writeHead(404, {
              'Content-Type': 'text/html'
            });

            notFoundPath = path.join(base.dist, '404.html');
            notFoundStream  = fs.createReadStream(notFoundPath);
            notFoundStream.pipe(res);
          }
        });
      } else {
        next();
      }
    };

    return [
      norFoundMiddleware
    ];
  };

  var opts = {
    name: site.name + ' development server',
    root: site.dist,
    livereload: false,
    middleware: middleware
  };

  $.connect.server(opts);
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

  var addBanner = function(file) {
    file.contents = new Buffer([
      '/*!',
      banner,
      '*/',
      file.contents.toString()
    ].join('\n'));

    return;
  };

  return gulp
    .src(path.join(site.src, dirname, '/**/[^_]*.scss'))
    .pipe($.plumber())
    .pipe($.cached(dirname))
    .pipe($.progeny())
    .pipe($.sassLint())
    .pipe($.sassLint.format())
    .pipe($.sassLint.failOnError())
    .pipe($.data(addBanner))
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

  var addBanner = function(file) {
    file.contents = new Buffer([
      '/*!',
      banner,
      '*/',
      file.contents.toString()
    ].join('\n'));
  };

  var optimizeChains = lazypipe()
    .pipe($.eslint)
    .pipe($.eslint.format)
    .pipe($.uglify)
    .pipe($.data, addBanner);

  return gulp
    .src(path.join(base.src, dirname, '**/*.js'))
    .pipe($.plumber())
    .pipe($.cached(dirname))
    .pipe($.if(isOptimizable, optimizeChains()))
    .pipe(gulp.dest(path.join(base.dist, dirname)));
});

gulp.task('others', function() {
  var dirname = 'others';
  var opts = {
    ejs: {
      site: site,
      banner: banner,
      $: viewUtils
    },
    rename: {
      extname: ''
    }
  };

  opts.ejs = Object.assign(opts.ejs, router());

  var ejsChins = lazypipe()
    .pipe($.ejs, opts.ejs)
    .pipe($.rename, opts.rename);

  return gulp
    .src(path.join(base.src, dirname, '**/*'))
    .pipe($.plumber())
    .pipe($.if(/\.ejs$/, ejsChins()))
    .pipe(gulp.dest(base.dist));
});

gulp.task('image', function() {
  var dirname = 'images';

  var opts = {
    imagemin: {
      verbose: true
    }
  };

  return gulp
    .src(path.join(base.src, dirname, '**/*.{gif,jpg,png,svg}'))
    .pipe($.imagemin(opts.imagemin))
    .pipe(gulp.dest(path.join(base.dist, dirname)));
});

gulp.task('favicon', function() {
  var dirname = 'images/icons';
  var sizes = [
    '16x16',
    '32x32'
  ];

  var icons = sizes.map(function(size) {
    return path.join(base.src, site.icons[size]);
  });

  return gulp
    .src(icons)
    .pipe($.toIco('favicon.ico'))
    .pipe(gulp.dest(path.join(base.dist)));
});

gulp.task('page', function() {
  var dirname = 'pages';
  var routes = router();
  var extName = '.pug';
  var indent = '\u0020'.repeat(2);
  var opts = {
    pug: {
      basedir: path.join(base.src, 'layouts'),
      pretty: false,
      data: {
        banner: banner,
        site: site,
        $: viewUtils
      }
    }
  };

  var getPageName = function(str) {
    return str
      .replace(/\.pug$/, '')
      .replace(path.join(base.src, dirname), '')
      .replace(/\\/g, '/')
      .replace(/^\//, '');
  };

  var replaceDestDir = function(to) {
    return path.join(base.src, dirname, to);
  };

  var assets = function(type, page) {
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

    var fileRoot = path.join(site.src, type, dirname, page.name);
    var filePath = path.join(fileRoot, cases[type].files);
    var files = glob.sync(filePath);
    var html = '';

    if (type === 'scripts' && page.plugins.length) {
      files = page.plugins.map(function(link) {
        return '/scripts/plugins/' + link;
      }).concat(files);
    }

    files.forEach(function(src) {
      src = src.replace(site.src, '');
      html += indent + cases[type].tag(src) + '\n';
    });

    return html;
  };

  var preset = function(file) {
    var contents = file.contents.toString();
    var pageName = file.path;
    var data = {};

    pageName = getPageName(pageName);
    data.posts = routes.posts;

    var page = Object.assign({
      name: pageName,
      layout: 'default',
      type: 'page',
      title: '',
      description: '',
      summary: '',
      permalink: '/' + pageName,
      date: new Date().toISOString(),
      search: true,
      plugins: []
    }, routes.pages[pageName]);

    file.contents = new Buffer([
      'extends /' + page.layout,
      'block append styles',
      assets('styles', page),
      'block append scripts',
      assets('scripts', page),
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

    var permalink = page.permalink;
    var isDefaultPl = permalink !== '/' + pageName && path.extname(permalink);
    var filename = isDefaultPl ? '' : 'index' + extName;
    var dest = path.join(permalink, filename);

    file.path = path.join(base.src, dirname, dest);
    data.page = page;

    return data;
  };

  return gulp
    .src(path.join(site.src, dirname, '**/*' + extName))
    .pipe($.plumber())
    .pipe($.data(preset))
    .pipe($.pug(opts.pug))
    .pipe(gulp.dest(site.dist));
});

gulp.task('watch', function() {
  gulp.watch(path.join(site.src, 'styles/**/*.scss'), [
    'style'
  ]);

  gulp.watch(path.join(site.src, 'scripts/**/*.js'), [
    'script'
  ]);

  gulp.watch(path.join(site.src, 'others/**/*'), [
    'others'
  ]);

  gulp.watch([
    path.join(site.src, 'pages/.routes.yml'),
    path.join(site.src, '{pages,layouts}/**/*.pug'),
    path.join(site.src, 'data/**/*.yml')
  ], {
    dot: true
  }, [
    'page'
  ]);
});

gulp.task('build', $.sequence('clean', [
  'style',
  'script',
  'others',
  'page'
]));

gulp.task('default', $.sequence('build', 'server', 'watch'));

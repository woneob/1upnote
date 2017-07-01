var fs = require('fs');
var url = require('url');
var path = require('path');
var gulp = require('gulp');
var yargs = require('yargs');
var del = require('del');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');
var lazypipe = require('lazypipe');
var glob = require('glob');
var yaml = require('js-yaml');
var chalk = require('chalk');
var cheerio = require('cheerio');
var $ = require('gulp-load-plugins')();
var site =  require('./package.json');
var utils = require('./lib/utils');
var filters = require('./lib/filters');
var banner = require('./lib/banner')(site, utils.date);
var argv = require('./lib/argv')(yargs);

var base = {
  src: path.resolve(__dirname, site.src),
  dist: path.resolve(__dirname, site.dist)
};

var router = function() {
  var file = fs.readFileSync(path.join(base.src, 'pages/.routes.yml'));
  var pages = yaml.safeLoad(file).map(function(page) {
    page = Object.assign({
      file: '',
      layout: 'default',
      type: 'page',
      title: '',
      description: '',
      summary: '',
      permalink: page.file,
      date: new Date().toISOString(),
      search: true,
      data: {},
      plugins: []
    }, page);

    return page;
  });

  var posts = pages.filter(function(page) {
    return page.type === 'post';
  }).sort(function(a, b) {
    return new Date(a.date) - new Date(b.date);
  }).reverse();

  return {
    pages: pages,
    posts: posts,
    totalPosts: posts.length
  };
};

gulp.task('clean', function() {
  $.cached.caches = {};

  if (!argv.clean) {
    $.util.log(
      chalk.yellow('warn: '),
      chalk.cyan('clean'),
      'task passed. use',
      chalk.green('--clean'),
      'option'
    );

    return;
  }

  return del(path.join(site.dist, '**'));
});

gulp.task('server', function() {
  var notFoundError = function(req, res, next) {
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

  var middleware = function(connect, opt) {
    return [
      notFoundError
    ];
  };

  var opts = {
    name: site.name + ' development server',
    root: site.dist,
    port: argv.port,
    livereload: false,
    middleware: middleware
  };

  $.connect.server(opts);
});

gulp.task('style', function() {
  var dirname = 'styles';

  var opts = {
    sass: {
      outputStyle: 'expanded'
    },
    postcss: [
      autoprefixer({
        remove: false,
        cascade: false
      }),
      cssnano({
        safe: true,
        core: !argv.pretty
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
    .pipe($.sass(opts.sass).on('error', $.sass.logError))
    .pipe($.postcss(opts.postcss))
    .pipe(gulp.dest(path.join(site.dist, dirname)));
});

gulp.task('script', function() {
  var dirname = 'scripts';
  var isOptimizable = function(file) {
    if (argv.pretty) {
      return false;
    }

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
    '16',
    '32'
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
  var dirs = {
    page: 'pages',
    other: 'others'
  };

  var exts = {
    view: '.pug',
    data: '.yml'
  };

  var indent = '\u0020'.repeat(2);
  var dataObj = Object.assign({
    banner: banner,
    site: site,
    $: utils
  }, router());

  var opts = {
    pug: {
      basedir: path.join(base.src, 'layouts'),
      pretty: argv.pretty,
      filters: filters
    },
    ejs: dataObj,
    rename: {
      extname: ''
    },
    plumber: function(error) {
      $.util.log(chalk.red(error.message));
      this.emit('end');
    }
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

    var fileRoot = path.join(site.src, type, dirs.page, page.file);
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

  var getPageName = function(str) {
    return str
      .replace(/\.pug$/, '')
      .replace(path.join(base.src, dirs.page), '')
      .replace(/\\/g, '/')
      .replace(/^\//, '');
  };

  var preset = function(file) {
    var contents = file.contents.toString();
    var pageName = getPageName(file.path);

    var data = Object.assign(dataObj, {
      data: {},
      page: dataObj.pages.find(function(page) {
        return page.file === '/' + pageName;
      })
    });

    var page = data.page;
    var dataFile = '*' + exts.data;
    var dataPath = path.join(base.src, 'data/pages', page.file, dataFile);
    var dataGlob = glob.sync(dataPath);

    dataGlob.forEach(function(file) {
      var baseName = path.basename(file, exts.data);
      var contentData = yaml.safeLoad(fs.readFileSync(file));
      data.data[baseName] = contentData;
    });

    file.path = (function(filePath) {
      filePath += path.extname(filePath) ? '' : '/index' + exts.view;
      return path.join(base.src, dirs.page, filePath);
    })(page.permalink);

    page.nearbyPosts = {};

    var postIdx;
    var hasOlderPost;
    var hasNewerPost;

    if (page.type === 'post') {
      postIdx = dataObj.posts.findIndex(function(post) {
        return post.file === '/' + pageName;
      });

      hasNewerPost = postIdx - 1 >= 0;
      hasOlderPost = postIdx + 1 <= dataObj.totalPosts - 1;

      page.nearbyPosts.newer = hasNewerPost ? dataObj.posts[postIdx - 1] : null;
      page.nearbyPosts.older = hasOlderPost ? dataObj.posts[postIdx + 1] : null;
    }

    file.contents = new Buffer([
      'extends /' + page.layout,
      'block append styles',
      assets('styles', page),
      'block append scripts',
      assets('scripts', page),
      'block content',
      contents.replace(/^(?!\s*$)/mg, indent)
    ].join('\n'));

    return data;
  };

  var otherCompile = function() {
    var ejsChins = lazypipe()
      .pipe($.ejs, opts.ejs)
      .pipe($.rename, opts.rename);

    return gulp
      .src(path.join(base.src, dirs.other, '**/*'))
      .pipe($.plumber(opts.plumber))
      .pipe($.if(/\.ejs$/, ejsChins()))
      .pipe(gulp.dest(base.dist));
  };

  return gulp
    .src(path.join(base.src, dirs.page, '**/*' + exts.view))
    .pipe($.plumber())
    .pipe($.data(preset))
    .pipe($.pug(opts.pug))
    .pipe(gulp.dest(site.dist))
    .on('end', otherCompile);
});

gulp.task('feed', function() {
  var opts = {
    cheerio: {
      normalizeWhitespace: false,
      xmlMode: false
    },
    pug: {
      pretty: argv.pretty,
      data: {
        banner: banner,
        site: site,
        $: utils,
        posts: router().posts
      }
    },
    rename: {
      extname: '.xml'
    }
  };

  var postFileName = function(filePath) {
    return filePath
      .replace(base.dist, '')
      .replace(/\\/g, '/')
      .replace(/index\.html$/i, '')
      .replace(/(.+)\/$/, '$1');
  };

  var setArticle = function(file) {
    var postIdx = opts.pug.data.posts.findIndex(function(post) {
      return post.permalink === postFileName(file.path);
    });

    if (postIdx < 0) {
      return;
    }

    var contents = file.contents.toString();
    var dom = cheerio.load(contents, opts.cheerio);

    opts.pug.data.posts[postIdx].article = dom('#postContent').html();
    return;
  };

  return gulp
    .src(path.join(base.dist, '**/*.html'))
    .pipe($.data(setArticle))
    .on('end', function() {
      return gulp
        .src(path.join(base.src, 'feed/feed.pug'))
        .pipe($.pug(opts.pug))
        .pipe($.rename(opts.rename))
        .pipe(gulp.dest(base.dist));
    });
});

gulp.task('watch', function() {
  gulp.watch(path.join(site.src, 'styles/**/*.scss'), [
    'style'
  ]);

  gulp.watch(path.join(site.src, 'scripts/**/*.js'), [
    'script'
  ]);

  gulp.watch(path.join(site.src, 'images/**/*.{gif,jpg,png,svg}'), [
    'image'
  ]);

  gulp.watch([
    path.join(site.src, 'pages/.routes.yml'),
    path.join(site.src, '{pages,layouts}/**/*.pug'),
    path.join(site.src, 'others/**/*'),
    path.join(site.src, 'data/**/*.yml')
  ], {
    dot: true
  }, [
    'page'
  ]);
});

gulp.task('build', $.sequence('clean', [
  'favicon',
  'image',
  'style',
  'script',
  'page'
], 'feed'));

gulp.task('default', $.sequence('build', 'server', 'watch'));

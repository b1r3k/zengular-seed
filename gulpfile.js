'use strict';

var gulp = require('gulp');
var del = require('del');
var chalk = require('chalk');
var bowerFiles = require('main-bower-files');
var runSequence = require('run-sequence');
var sq = require('streamqueue');
var path = require('path');
var fs = require('fs');
var karma = require('karma').server;
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var q = require('q');
var $ = require('gulp-load-plugins')();

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var additionalArg = process.argv[3] ? process.argv[3].substr(2) : false;

var toInject = [
    'client/app.js',
    'client/directives/**/*.js', '!client/directives/**/*.spec.js',
    'client/filters/**/*.js', '!client/filters/**/*.spec.js',
    'client/services/**/*.js', '!client/services/**/*.spec.js',
    'client/views/**/*.js', '!client/views/**/*.spec.js',
    'client/styles/css/**/*.css'
];

var toDelete = [];

/**
 * Log. With options.
 *
 * @param {String} msg
 * @param {Object} options
 */
function log (msg, options) {
    options = options || {};
    console.log(
        (options.padding ? '\n' : '') +
            chalk.yellow(' > ' + msg) +
            (options.padding ? '\n' : '')
    );
}

/**
 * Inject css/js files in index.html
 */
gulp.task('inject', function () {
    var sources = gulp.src(toInject, { read: false });

    return gulp.src('client/index.html')
        .pipe($.inject(gulp.src(bowerFiles(), { read: false }), {
            name: 'bower',
            relative: 'true'
        }))
        .pipe($.inject(sources, { relative: true }))
        .pipe(gulp.dest('client'));
});

/**
 * Watch files and reload page.
 * Recompile scss if needed.
 * Reinject files
 */
var APP_SRC = [
    'client/**/*.js',
    '!client/**/*.spec.js',
    '!client/bower_components/**/*',
    '!/lib/**/*'
];

var TPL_SRC = [
    'client/**/*.html',
    '!client/index.html'
];

gulp.task('transcompile:clean', function (cb) {
    del(['.babel/**/*'], cb);
});

var babelInit = function () {
    var appWithoutJS = gulp.src(['client/**/*', '!client/**/*.js', '!client/bower_components/**/*']),
        bowerComponents = gulp.src(['client/bower_components/**/*']);

    var promiseWithoutJS = q.defer(),
        promiseBower = q.defer();

    log('Babel init..')

    sq({objectMode: true}, appWithoutJS)
        .pipe(gulp.dest('.babel/client'))
        .on('end', function () {
            promiseWithoutJS.resolve();
        });

    sq({objectMode: true}, bowerComponents)
        .pipe(gulp.dest('.babel/client/bower_components'))
        .on('end', function () {
            promiseBower.resolve();
        });

    return q.all([promiseWithoutJS, promiseBower]);
};

gulp.task('watch', ['transcompile:clean', 'inject'], function () {

    $.livereload.listen();
    babelInit();

    gulp.watch('bower.json', function () {
        gulp.src('client/index.html')
            .pipe($.plumber())
            .pipe($.inject(gulp.src(bowerFiles(), { read: false }), {
                name: 'bower',
                relative: 'true'
            }))
            .pipe(gulp.dest('client'));
    });

    var CSS_SRC = 'client/styles/**/*.css',
        MAIN_SRC = ['client/index.html'];

    gulp.src(MAIN_SRC)
        .pipe($.plumber())
        .pipe($.watch(MAIN_SRC))
        .pipe(gulp.dest('.babel/client'))
        .pipe($.livereload());

    gulp.src(CSS_SRC)
        .pipe($.plumber())
        .pipe($.watch(CSS_SRC))
        .pipe(gulp.dest('.babel/client/styles'))
        .pipe($.livereload());

    gulp.src(APP_SRC)
        .pipe($.plumber())
        .pipe($.watch(APP_SRC))
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('.babel/client'))
        .pipe($.livereload());

    gulp.src(TPL_SRC)
        .pipe($.plumber())
        .pipe($.watch(TPL_SRC))
        .pipe(gulp.dest('.babel/client'))
        .pipe($.livereload());

});

/**
 * Control things
 */
gulp.task('control', function () {
    return gulp.src([
            'client/**/**/*.js',
            '!client/bower_components/**'
        ])
        .pipe($.jshint())
        .pipe($.jshint.reporter('default'));
});

gulp.task('e2e', ['serve'], function () {
  gulp.src('client/views/**/*.e2e.js')
    .pipe($.protractor.protractor({
      configFile: 'protractor.conf.js'
    }))
    .on('error', function (e) {
      $.util.log(e.message);
      process.exit(-1);
    })
    .on('end', function () {
      process.exit(0);
    });
});

/**
 * Tests
 */
function testServer (done) {

    log('Running server test...', { padding: true });

    gulp.src('server/**/*.spec.js', { read: false })
        .pipe($.plumber())
        .pipe($.mocha({ reporter: 'spec' }))
        .once('end', function () {
            done();
        });
}

function testClient (done) {

    log('Running client test...', { padding: true });

    karma.start({
        configFile: __dirname + '/karma.conf.js'
    }, done);
}

gulp.task('test', function (done) {
    process.env.NODE_ENV = 'test';

    if (additionalArg === 'client') {
        return testClient(function () {
            process.exit();
            done();
        });
    } else if (additionalArg === 'server') {
        return testServer(function () {
            process.exit();
            done();
        });
    } else if (additionalArg === false) {
        return testClient(function () {
            process.exit();
            done();
        });
    } else {
        console.log('Wrong parameter [%s], availables : --client, --server', additionalArg);
    }
});

function waitForExpress (cb) {
    var id;

    id = setInterval(function () {
        if (fs.readFileSync('.bangular-refresh', 'utf-8') === 'done') {
            clearTimeout(id);
            fs.unlinkSync('.bangular-refresh');
            cb();
        }
    }, 100);
}

/**
 * Launch server
 */
gulp.task('serve', ['watch'], function () {
    var config = require('./server/config/environment');

    var openOpts = {
        url: 'http://localhost:' + config.port,
        already: false
    };

    return $.nodemon({
        script: 'server/server.js',
        ext: 'js',
        ignore: ['client', 'dist', 'node_modules'],
        restart: ['gulpfile.js']
    })
        .on('start', function () {
            fs.writeFileSync('.bangular-refresh', 'waiting');

            if (!openOpts.already) {
                openOpts.already = true;
                waitForExpress(function () {
                    gulp.src('.babel/client/index.html')
                        .pipe($.open('', openOpts));
                });
            } else {
                waitForExpress(function () {
                    $.livereload.changed('/');
                });
            }
        });
});

gulp.task('preview', ['build'], function () {
    process.env.NODE_ENV = 'production';

    var config = require('./server/config/environment');

    var openOpts = {
        url: 'http://localhost:' + config.port,
        already: false
    };

    require('./server/server');
    return gulp.src('client/index.html')
        .pipe($.open('', openOpts));
});

/**
 * Build
 */
gulp.task('clean:dist', function (cb) {
    del(['dist/**', '!dist', '!dist/.git{,/**}'], cb);
});

gulp.task('clean:finish', function (cb) {
    del([
        '.tmp/**',
    ].concat(toDelete), cb);
});

gulp.task('babel', function () {
    return gulp.src('src/app.js')
        .pipe(babel())
        .pipe(gulp.dest('dist'));
});

gulp.task('copy:dist', function () {
    var assets = gulp.src('client/assets/**/*', { base: './' });

    return sq({ objectMode: true }, assets)
        .pipe(gulp.dest('dist/'));
});

gulp.task('usemin', ['inject'], function () {
    var prodUsemin = $.usemin({
        js2: [babel(), $.concat('app.js')]
    });

    return gulp.src('client/index.html')
        .pipe($.plumber())
        .pipe(prodUsemin)
        .pipe(gulp.dest('dist/client/'));
});

gulp.task('cssmin', function () {
    return gulp.src('dist/client/app.css')
        .pipe($.minifyCss())
        .pipe(gulp.dest('dist/client/'));
});

gulp.task('scripts', function () {
    var tpl = gulp.src('client/views/**/*.html')
            .pipe($.angularTemplatecache({
                root: 'views',
                module: 'validately'
            })),
        directive_tpl = gulp.src('client/directives/**/*.html')
            .pipe($.angularTemplatecache({
                root: 'directives',
                module: 'validately'
            })),
        common_tpl = gulp.src('client/templates/**/*.html')
            .pipe($.angularTemplatecache({
                root: 'templates',
                module: 'validately'
            }));

    var app = gulp.src('dist/client/app.js').pipe($.ngAnnotate()),
        lib = gulp.src('dist/client/lib.js');

    sq({ objectMode: true }, app, tpl, directive_tpl, common_tpl)
        .pipe($.concat('app.js'))
        .pipe($.if(additionalArg !== 'debug', $.uglify()))
        .pipe(gulp.dest('dist/client/'));

    return lib.pipe($.plumber())
        .pipe($.if(additionalArg !== 'debug', $.uglify()))
        .pipe(gulp.dest('dist/client/'));
});

gulp.task('replace', function () {
    return gulp.src('dist/client/index.html')
        .pipe($.replace(/ng-app="validately"/, 'ng-app="validately" ng-strict-di'))
        .pipe(gulp.dest('dist/client'));
});


gulp.task('build', function (cb, debug) {
    if (additionalArg === 'debug') {
        runSequence(
            ['clean:dist'],
            ['usemin', 'copy:dist'],
            ['scripts', 'cssmin'],
            'clean:finish',
            cb);
    } else {
        // PROD BUILD
        runSequence(
            ['clean:dist'],
            ['usemin', 'copy:dist'],
            ['scripts', 'cssmin'],
            'replace',
            'clean:finish',
            cb);
    }
});

gulp.task('deploy', ['build'], function () {
    var distPath = 'dist/**';
    var config = {
        src: distPath,
        options: {
            destination: '/var/www/validately/web/frontend/dist/',
            root: 'dist/',
            hostname: 'validately-ssd',
            incremental: true,
            progress: true,
            relative: true,
            emptyDirectories: true,
            recursive: true,
            clean: true,
            exclude: [],
            include: []
        }
    }

    return gulp.src(config.src)
        .pipe($.rsync(config.options));
});

/**
 * Git versioning and bump
 */

gulp.task('version', function () {
    return gulp.src(['./package.json', './bower.json'])
        .pipe($.bump({
            type: additionalArg ? additionalArg : 'patch'
        }))
        .pipe(gulp.dest('./'));
});

gulp.task('bump', ['version'], function () {
    fs.readFile('./package.json', function (err, data) {
        if (err) {
            return;
        }
        return gulp.src(['./package.json', './bower.json'])
            .pipe($.git.add())
            .pipe($.git.commit('chore(core): bump to ' + JSON.parse(data).version));
    });
});

gulp.task('default', ['serve']);

'use strict';

module.exports = function (config) {
    config.set({

        basePath: 'client',

        frameworks: ['jasmine'],

        preprocessors: {
            '**/*.html': ['ng-html2js'],
            'app.js': ['babel'],
            'views/**/*.js': ['babel'],
            'services/**/*.js': ['babel'],
            'directives/**/*.js': ['babel'],
            'tests/common.js': ['babel'],
            'filters/**/*.js': ['babel']
        },

        ngHtml2JsPreprocessor: {
            stripPrefix: 'client/',
            moduleName: 'templates'
        },

        'babelPreprocessor': {
            options: {
                sourceMap: 'inline'
            },
            filename: function (file) {
                return file.originalPath.replace(/\.js$/, '.es5.js');
            },
            sourceFileName: function (file) {
                return file.originalPath;
            }
        },

        plugins: [
            'karma-phantomjs-launcher',
            'karma-chrome-launcher',
            'karma-jasmine',
            'karma-ng-html2js-preprocessor',
            'karma-babel-preprocessor'
        ],

        files: [
            '../node_modules/karma-babel-preprocessor/node_modules/babel-core/browser-polyfill.js',
            'bower_components/angular/angular.js',
            'bower_components/angular-mocks/angular-mocks.js',
            'bower_components/angular-route/angular-route.js',
            'bower_components/angular-cookies/angular-cookies.js',
            'app.js',
            'app.local.js',
            'views/**/*.js',
            'services/**/*.js',
            'directives/**/*.js',
            'directives/**/*.html',
            'filters/**/*.js',
            'tests/common.js'
        ],

        exclude: [
            'views/**/*.e2e.js'
        ],

        reporters: ['progress'],

        port: 9876,

        colors: true,

        // possible values:
        // config.LOG_DISABLE
        // config.LOG_ERROR
        // config.LOG_WARN
        // config.LOG_INFO
        // config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        autoWatch: true,

        browsers: ['PhantomJS'],

        singleRun: false
    });
};

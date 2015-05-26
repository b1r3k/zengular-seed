'use strict';

angular.module('zengSeed', [
        'ngRoute',
        'ngCookies'
    ])
    .constant('appConfig', {
        debugMode: false
    })
    .config(($compileProvider, $logProvider, appConfig) => {
        $compileProvider.debugInfoEnabled(appConfig.debugMode);
        $logProvider.debugEnabled(appConfig.debugMode);
    })
    .config(function ($routeProvider, $locationProvider) {

        $routeProvider
            .otherwise({
                redirectTo: '/'
            });

        $locationProvider.html5Mode(true);

    });

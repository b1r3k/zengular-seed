'use strict';

angular.module('zengSeed', [
  'ngRoute',
  'ngCookies'
])
  .config(function ($routeProvider, $locationProvider) {

    $routeProvider
      .otherwise({
        redirectTo: '/'
      });

    $locationProvider.html5Mode(true);

  });

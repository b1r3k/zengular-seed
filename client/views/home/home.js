'use strict';

angular.module('zengSeed')
    .config(function ($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'views/home/home.html',
                controller: 'HomeCtrl',
                controllerAs: 'vm'
            });
    });

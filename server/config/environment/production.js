'use strict';
var path = require('path');

module.exports = {
    ip: process.env.IP || undefined,
    root: path.normalize(__dirname + '/../../..'),
};

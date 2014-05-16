// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

var tessel = require('tessel');

var port = process.argv[2] || 'A';
var gps = require('../').use(tessel.port[port]);

console.log('# testing on port', port);
console.log('1..1');

gps.on('ready', function () {
  console.log('ok - servo is ready and connected');
  process.exit(0);
});

gps.on('error', function (err) {
  console.log('not ok - servo emitted error:', err);
  process.exit(1);
});

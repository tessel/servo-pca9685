var tessel = require('tessel');
var servos = require('../').connect(tessel.port('A'), loop);

function loop () {
  servos.moveServo(1, 0, function () {
    setTimeout(function () {
      servos.moveServo(1, 180, function () {
        setTimeout(loop, 500);
      });
    }, 500);
  })
}
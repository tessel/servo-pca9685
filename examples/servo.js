var tessel = require('tessel');
var servo = require('../');

// Initialize the servo.
console.log("initalizing");

// Port A, servo 1, calibrate min/max PWM of 4-15
var cs61 = servo.connect(tessel.port('A'), 5, 13);

cs61.on('connected', function () {
  var pos = 0;
  setInterval(function () {
    console.log("Deg rotation:", pos);
    cs61.moveServo(2, pos);

    // Increment by 45 deg
    pos += 45;
    if (pos > 180) {
      pos = 0;
    }
  }, 500);
});
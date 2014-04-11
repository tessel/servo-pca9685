var tessel = require('tessel');
var servo = require('../');

var hardware = tessel.port('A');

// Initialize the servo.
console.log("initalizing");


// Port A, servo 1, calibrate min/max PWM of 4-15
var cs61 = servo.connect(hardware, 0.03, 0.125);

cs61.on('connected', function () {
  var pos = 0;
  setInterval(function () {
    console.log("Deg rotation:", pos);
    cs61.moveServo(2, pos, function() {
      cs61.readServo(2, function(err, duty) {
        console.log('Read position:\t', duty);
      });
    });

    // Increment by 45 deg
    pos += 0.1;
    if (pos > 1) {
      pos = 0;
    }
  }, 2000);
});
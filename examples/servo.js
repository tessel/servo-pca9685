var tessel = require('tessel');
var servo = require('../');

var hardware = tessel.port('A');

// Initialize the servo.
console.log("Initalizing...");

var servoController = servo.connect(hardware);

servoController.on('connected', function () {
  var pos = 0;  //  Target position of the servo between 0 (min) and 1 (max).
  setInterval(function () {
    console.log("Deg rotation:", pos);
    //  Move servo #2 to position pos.
    servoController.moveServo(2, pos, function() {
      //  Read the approximate target positon of servo #2 back from the module. 
      //  Please refer to the docs if you plan to use this value for something.
      servoController.readServo(2, function(err, duty) {
        console.log('Read position:\t', duty);
      });
    });

    // Increment by 10% (~18 deg for a normal servo)
    pos += 0.1;
    if (pos > 1) {
      pos = 0;
    }
  }, 2000);
});
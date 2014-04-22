/*********************************************
This servo module demo turns the servo around
18 degrees every 500ms, then resets it after
10 turns, reading out position to the console
at each movement.
*********************************************/

var tessel = require('tessel');
var servo = require('../');

var hardware = tessel.port('A');

// Initialize the servo.
console.log("Initalizing...");

var servoController = servo.use(hardware);

var r = 0x06 + (1 - 1) * 4;
var a = 1, b = 1;

servoController.on('ready', function () {
  var pos = 0;  //  Target position of the servo between 0 (min) and 1 (max).
  //  Set the minimum and maximum duty cycle for servo 1
  servoController.configureServo(1, 0.015, 0.13, function() {
    setInterval(function () {
      console.log("Deg rotation:", pos);
      //  Set servo #1 to position pos.
      servoController.setServo(1, pos, function() {
        //  Read the approximate target positon of servo #1 back from the module. 
        //  Please refer to the docs if you plan to use this value for something.
        // servoController.readServo(1, function(err, duty) {
        //   console.log('Read position:\t', duty);
        // });
      });
  
      // Increment by 10% (~18 deg for a normal servo)
      pos += 0.1;
      if (pos > 1) {
        pos = 0;
      }
    }, 500);
  });
});

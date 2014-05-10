/*********************************************
This servo module demo turns the servo around
~18 degrees every 500ms, then resets it after
10 turns, reading out position to the console
at each movement.
*********************************************/

// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

var tessel = require('tessel');
var servo = require('../').use(tessel.port('A'));

servo.on('ready', function () {
  var pos = 0;  //  Target position of the servo between 0 (min) and 1 (max).
  //  Set the minimum and maximum duty cycle for servo 1.
  //  If the servo doesn't move to its full extent or stalls out
  //  and gets hot, try tuning these values (0.05 and 0.12).
  //  Moving them towards each other = less movement range
  //  Moving them apart = more range, more likely to stall and burn out
  servo.configure(1, 0.05, 0.12, function () {
    setInterval(function () {
      console.log('% of full rotation:', pos);
      //  Set servo #1 to position pos.
      servo.move(1, pos, function () {
        //  Read the approximate target positon of servo #1 back from the module.
        //  Please refer to the docs if you plan to use this value for something.
        // servoController.read(1, function(err, duty) {
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

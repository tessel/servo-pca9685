var tessel = require('tessel');
var servoController = require('../').use(tessel.port('A'));

var loop = function() {
  //  Set the position of servo #1 to one side
  servoController.setServo(1, 0, function () {
    setTimeout(function () {
      //  Set its position the other side
      servoController.setServo(1, 1, function () {
        //  Once more, with feeling
        setTimeout(loop, 500);
      });
    }, 500);
  })
}

servoController.on('ready', function () {
  //  Set the minimum and maximum duty cycle for servo 1.
  //
  //  If the servo doesn't move to its full extent or stalls out
  //  and gets hot, try tuning these values (0.05 and 0.12). 
  //  Moving them towards each other = less movement range
  //  Moving them apart = more range, more likely to stall and burn out
  servoController.configureServo(1, 0.05, 0.12, function () {
    loop();
  });
});
var tessel = require('tessel');
var servoController = require('../').connect(tessel.port('A'));

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

servoController.on('connected', function () {
  loop();
});
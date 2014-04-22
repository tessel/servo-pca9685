var tessel = require('tessel');
var servo = require('../');

// Port A, servo 1, calibrate min/max PWM of 4-15
var cs61 = servo.use(tessel.port('A'));
//Set accelerometer GPIO pins
var xpin = tessel.port('gpio').analog(0);
var ypin = tessel.port('gpio').analog(1);
var zpin = tessel.port('gpio').analog(2);

//Analog read pin
function readpin (pin) {
  return (pin.read() - 512) / (512 / 3);
}

//Turn x, y, z values into a number of degrees to increment position
function changecalc(x, y, z) {
  var ans = 10 * y;
  return ans;
}

cs61.on('ready', function () {
  setInterval(function () {
    //Read accelerometer pins
    var x = readpin(xpin);
    var y = readpin(ypin);
    var z = readpin(zpin);

    var val = (y + 1) * (180 / 2);
    console.log(val);
    cs61.move(val > 180 ? 180 : val < 0 ? 0 : val);

    // Increment by calculated value
    // for (var i = 1; i < changecalc(x, y, z); i++){
    //  pos += 1;
    // }
    // pos += changecalc(x, y, z);
  }, 10);
});
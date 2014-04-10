// address bit is 111xy11 where x is controlled by GPIO2 and y is controlled by GPIO1
// by default x and y will be 0
// used http://www.nxp.com/documents/data_sheet/PCA9685.pdf as a reference

var events = require('events');
var util = require('util');

//
// I2C Configuration
//

var I2C_ADDRESS = 0x73;
var LED0_ON_L = 0x06;
var LED0_ON_H = 0x07;
var LED0_OFF_L = 0x08;
var LED0_OFF_H = 0x09;
var MAX = 4096;
var MODE1 = 0x0;
var PRE_SCALE = 0xFE;

/**
 * ServoController
 */

function ServoController (hardware, low, high)
{
  this.hardware = hardware;

  this.i2c = new hardware.I2C(I2C_ADDRESS);
  this.i2c.initialize();

  this.low = low || 5;
  this.high = high || 15;
}

util.inherits(ServoController, events.EventEmitter);

ServoController.prototype._readRegister = function (register, next)
{
  this.i2c.transfer([register], 1, function (err, data) {
    next(err, data[0]);
  });
}

ServoController.prototype._writeRegister = function (register, data, next)
{
  this.i2c.send([register, data], next)
}


// sets the driver frequency. freq has units of Hz
ServoController.prototype.setFrequency = function (freq, next)
{
  var prescaleval = (25000000 / MAX) / freq - 1;
  var prescale = Math.floor(prescaleval); 
  
  var self = this;
  self._readRegister(MODE1, function (err, oldmode) {
    // gotta sleep it before we can change the prescale
    var newmode = oldmode | 0x10;
    self._writeRegister(MODE1, newmode);
    self._writeRegister(PRE_SCALE, prescale); 
    self._writeRegister(MODE1, oldmode, function () {
      // Delay 100ms
      setTimeout(function () {
        self._writeRegister(MODE1, 0xa1);
        next && next();
      }, 100)
    });
  });
}

// 0...180
ServoController.prototype.moveServo = function (idx, val, next)
{
  if (idx < 1 || idx > 16) {
    throw "Servos are 1-indexed. Servos can be between 1-16.";
  }

  var servo = this;
  // servo.onconnect(function () {
    this.setPWM(idx, ((val / 180) * (this.high - this.low)) + this.low, next);
  // });
};

// Servo.prototype.onconnect = function (fn) {
//   if (!this._connected) {
//     this.on('connect', fn);
//   } else {
//     fn();
//   }
// };

// servo: 1... 16
// on: 1...100% of time that the servo is on
ServoController.prototype.setPWM = function (idx, on, next)
{
  if (idx < 1 || idx > 16) {
    throw "Servos are 1-indexed. Servos can be between 1-16.";
  }

  var convert_on = 0;
  var convert_off = Math.floor(MAX / 100 * on);

  // Queue writes
  this._writeRegister(LED0_ON_L + (idx - 1) * 4, convert_on);
  this._writeRegister(LED0_ON_H + (idx - 1) * 4, convert_on >> 8);
  this._writeRegister(LED0_OFF_L + (idx - 1) * 4, convert_off);
  this._writeRegister(LED0_OFF_H + (idx - 1) * 4, convert_off >> 8, next);
}

function connect (hardware, low, high, next)
{
  if (typeof low == 'function') {
    next = low;
    low = null;
  }

  var servos = new ServoController(hardware, low, high);
  servos.setFrequency(50, function () {
    servos._connected = true;
    next && next();
    servos.emit('connected');
  });
  return servos;
}

//
// Reading
//

// TODO: fix this
// function read_servo(servo){
//   var on_low = read_register(LED0_ON_L+(servo-1)*4);
//   var on_high = read_register(LED0_ON_H+(servo-1)*4)>>8;
//   console.log("on_low: ", on_low, " on_high: ", on_high);
//   var on = on_low + on_high;
//   var off_low = read_register(LED0_OFF_L+(servo-1)*4);
//   var off_high = read_register(LED0_OFF_H+(servo-1)*4)>>8;
//   console.log("off_low: ", off_low, " off_high: ", off_high);

//   var off = off_low + off_high;

//   console.log("Servo: ", servo, " on: ", on, " off: ", off);
// }


/**
 * Public API
 */

exports.connect = connect;
exports.ServoController = ServoController;

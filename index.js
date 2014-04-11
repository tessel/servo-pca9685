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

function ServoController (hardware, low, high, addr2, addr3)
{
  this.hardware = hardware;

  //  Enable the outpts
  hardware.gpio(3).writeSync(0);

  //  Configure I2C address
  this.address = I2C_ADDRESS;

  addr2 = addr2 || 0;
  addr3 = addr3 || 0;

  hardware.gpio(2).writeSync(addr2);
  hardware.gpio(1).writeSync(addr3);

  this.address |= addr2 << 2;
  this.address |= addr3 << 3;

  this.i2c = new hardware.I2C(this.address);
  this.i2c.initialize();

  //  PWM bounds
  this.low = low || 5;
  this.high = high || 15;
}

util.inherits(ServoController, events.EventEmitter);

ServoController.prototype._readRegister = function (register, next)
{
  this.i2c.transfer(new Buffer([register]), 1, function (err, data) {
    next(err, data[0]);
  });
}

ServoController.prototype._writeRegister = function (register, data, next)
{
  this.i2c.send(new Buffer([register, data]), next);
}

ServoController.prototype._chainWrite = function(registers, data, next)
{
  var self = this;
  if (registers.length == 0) {
    next && next();
  }
  else {
    self.i2c.send(new Buffer([registers[0], data[0]]), function() {
      self._chainWrite(registers.slice(1), data.slice(1), next);
    });
  }
}

// sets the driver frequency. freq has units of Hz
ServoController.prototype.setFrequency = function (freq, next)
{
  var prescaleval = (25000000 / MAX) / freq - 1;
  var prescale = Math.floor(prescaleval); 
  
  var self = this;
  self._readRegister(MODE1, function (err, oldmode) {
    var newmode = oldmode | 0x10;
    var registers = [MODE1, PRE_SCALE, MODE1, MODE1];
    var data = [newmode, prescale, oldmode, 0xa1];
    self._chainWrite(registers, data, next);
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

  // Set up writes
  var registers = [LED0_ON_L + (idx - 1) * 4, 
    LED0_ON_H + (idx - 1) * 4, 
    LED0_OFF_L + (idx - 1) * 4,
    LED0_OFF_H + (idx - 1) * 4];
  var data = [convert_on, 
    convert_on >> 8, 
    convert_off, 
    convert_off >> 8];
  this._chainWrite(registers, data, next);
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
    servos.emit('connected');
    next && next();
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

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
  /*
  Constructor

  Args
    hardware
      Tessel port to use
    low
      Minimum PWM value (should be 0-1.0 for best results)
    high
      Maximum PWM value (should be low-1.0 for best results)
    addr2
      I2C address bit 2
    addr3
      I2C address bit 3
  */
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
  this.low = low || 0.05;
  if (low === 0) {
    this.low = 0;
  }
  this.high = high || 0.15;
}

util.inherits(ServoController, events.EventEmitter);

ServoController.prototype._readRegister = function (register, next)
{
  /*
  Read from registers on the PCA9685 via I2C

  Args
    register
      Register to read
    next
      Callback; gets reply byte as its arg
  */
  this.i2c.transfer(new Buffer([register]), 1, function (err, data) {
    next && next(err, data[0]);
  });
}

ServoController.prototype._chainRead = function (registers, next, replies) {
  /*
  Read from the given registers on the PCA9685 via I2C and pass thier replies to the callback

  Args
    registers
      An array of registers to read
    next
      Callback; gets an array of reply bytes as an arg
    replies
      An array to which the replies will be pushed
  */
  var replies = replies || [];
  var self = this;
  if (registers.length == 0) {
    console.log('replies:\t', replies)
    next && next(replies);
  }
  else {
    self.i2c.transfer(new Buffer([registers[0]]), 1, function(err, data) {
      replies.push(data[0]);
      self._chainRead(registers.slice(1), next, replies);
    });
  }
}

ServoController.prototype._writeRegister = function (register, data, next)
{
  /*
  Write to registers on the PCA9685 via I2C

  Args
    register
      Register to read
    data
      Bytes to send
    next
      Callback
  */
    this.i2c.send(new Buffer([register, data]), next);
}

ServoController.prototype._chainWrite = function(registers, data, next)
{
  /*
  Make multiple writes to the PCA9685's registers via I2C
  
  Args
    registers
      An array of register addresses
    data
      Ana array of data payloads
    next
      Callback
  */
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

ServoController.prototype.setFrequency = function (freq, next)
{
  /*
  Set the PWM frequency for the PCA9685 chip. Note that thi is common to all servos attached to the chip.

  Args
    freq
      PWM frequency, in units of Hertz
    next
      Callback
  */
  var prescaleVal = (25000000 / MAX) / freq - 1;
  var prescale = Math.floor(prescaleVal); 
  
  var self = this;
  self._readRegister(MODE1, function (err, oldMode) {
    var newMode = oldMode | 0x10;
    var registers = [MODE1, PRE_SCALE, MODE1, MODE1];
    var data = [newMode, prescale, oldMode, 0xa1];
    self._chainWrite(registers, data, next);
  });
}

// 0...1.0
ServoController.prototype.moveServo = function (idx, val, next)
{
  /*
  Set the position of the specified servo

  Args
    idx
      Index of the servo. NOTE: servos are 1-indexed
    val
      Position to which the the servo is to move. 0-1 of its full scale.
    next
      Callback
  */
  if (idx < 1 || idx > 16) {
    throw "Servos are 1-indexed. Servos can be between 1-16.";
  }

  var servo = this;
  // servo.onconnect(function () {
    this.setPWM(idx, (val * (this.high - this.low)) + this.low, next);
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
  /*
  Set the specified channel's PWM value

  Args
    idx
      Servo index to set
    on
      PWM value (0-1) for the specified servo
    next
      Callback
  */

  if (idx < 1 || idx > 16) {
    throw "Servos are 1-indexed. Servos can be between 1-16.";
  }

  var convert_on = 0;
  var convert_off = Math.floor(MAX * on);

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
  /*
  Connect to the Servo Module

  Args
    hardware
      Tessel port to use
    low
      Minimum PWM value (should be 0-1.0 for best results)
    high
      Maximum PWM value (should be low-1.0 for best results)
    next
      Callback
  */
  if (typeof low == 'function') {
    next = low;
    low = null;
  }

  var servos = new ServoController(hardware, low, high);
  servos.setFrequency(50, function() {
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
ServoController.prototype.readServo = function (servo, next) {
  /*
  Read the current position target for the specified servo

  Args
    servo
      The servo index
    next
      Callback; gets the current PWM percentage as an arg
  */

  var registers = [LED0_ON_L + (servo - 1) * 4, 
    LED0_ON_H + (servo - 1) * 4, 
    LED0_OFF_L + (servo - 1) * 4,
    LED0_OFF_H + (servo - 1) * 4];
  this._chainRead(registers, function(replies) {
    //  When in the count cycle the pin goes high
    var on = replies[0] + (replies[1] << 8);
    //  When it goes low
    var off = replies[2] + (replies[3] << 8);
    //  Effective duty cycle
    var duty = (off - on) / MAX;
  });

  // var on_low = this._readRegister(LED0_ON_L + (servo - 1) * 4);
  // var on_high = this._readRegister(LED0_ON_H + (servo - 1) * 4) >> 8;
  // console.log("on_low: ", on_low, " on_high: ", on_high);
  // var on = on_low + on_high;
  // var off_low = this._readRegister(LED0_OFF_L + (servo - 1) * 4);
  // var off_high = this._readRegister(LED0_OFF_H + (servo - 1) * 4) >> 8;
  // console.log("off_low: ", off_low, " off_high: ", off_high);

  // var off = off_low + off_high; 

  // console.log("Servo: ", servo, " on: ", on, " off: ", off);
}


/**
 * Public API
 */

exports.connect = connect;
exports.ServoController = ServoController;

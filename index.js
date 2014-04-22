/**
Tessel servo-pca9685 module

References:
http://www.nxp.com/documents/data_sheet/PCA9685.pdf
http://en.wikipedia.org/wiki/Servo_control
https://github.com/adafruit/Adafruit-PWM-Servo-Driver-Library
*/

var events = require('events');
var util = require('util');

// I2C Configuration
var I2C_ADDRESS = 0x73;
var LED0_ON_L = 0x06;
var LED0_ON_H = 0x07;
var LED0_OFF_L = 0x08;
var LED0_OFF_H = 0x09;
var MAX = 4096;
var MODE1 = 0x0;
var PRE_SCALE = 0xFE;


function servoController (hardware, low, high, addr2, addr3)
{
  /**
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
  //  Set default high and low duty cycles for the module
  this.low = low || 0.05;
  if (low === 0) {
    this.low = 0;
  }
  this.high = high || 0.2;

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

  this.i2c = hardware.I2C(this.address);

  //  Store PWM settings for each servo individually
  this.servoConfigurations = {};
}

util.inherits(servoController, events.EventEmitter);

servoController.prototype._readRegister = function (register, next)
{
  /**
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

servoController.prototype._chainRead = function (registers, next, replies) {
  /**
  Read from the given registers on the PCA9685 via I2C and pass thier replies to the callback

  Args
    registers
      An array of registers to read
    next
      Callback; gets an array of reply bytes as an arg
    replies
      An array to which err, replies will be pushed
  */
  var replies = replies || [];
  var self = this;
  if (registers.length == 0) {
    next && next(null, replies);
  }
  else {
    self.i2c.transfer(new Buffer([registers[0]]), 1, function(err, data) {
      if (err) {
        next && next(err, replies);
      }
      replies.push(data[0]);
      self._chainRead(registers.slice(1), next, replies);
    });
  }
}

servoController.prototype._writeRegister = function (register, data, next)
{
  /**
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

servoController.prototype._chainWrite = function(registers, data, next)
{
  /**
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

servoController.prototype.setFrequency = function (freq, next)
{
  /**
  Set the PWM frequency for the PCA9685 chip.

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
    if (err) {
      next && next(err, null);
    }
    var newMode = oldMode | 0x10;
    var registers = [MODE1, PRE_SCALE, MODE1, MODE1];
    var data = [newMode, prescale, oldMode, 0xa1];
    self._chainWrite(registers, data, next);
  });
}

servoController.prototype.setServo = function (index, val, next)
{
  /**
  Set the position of the specified servo

  Args
    index
      Index of the servo. NOTE: servos are 1-indexed
    val
      Position to which the the servo is to move. 0-1 of its full scale.
    next
      Callback
  */
  if (index < 1 || index > 16) {
    throw "Servos are 1-indexed. Servos can be between 1-16.";
  }

  //  If unconfigured, use the controller's default values
  if (!this.servoConfigurations[index]) {
    this.configureServo(index, this.low, this.high, null);
  }

  var low = this.servoConfigurations[index][0];
  var high = this.servoConfigurations[index][1];

  this.setDuty(index, (val * (high - low)) + low, next);
};

servoController.prototype.setDuty = function (index, on, next)
{
  /**
  Set the specified channel's duty cycle

  Args
    index
      Servo index to set
    on
      Duty cycle (0-1) for the specified servo
    next
      Callback
  */

  if (index < 1 || index > 16) {
    throw "Servos are 1-indexed. Servos can be between 1-16.";
  }

  var convert_on = 0;
  var convert_off = Math.floor(MAX * on);

  // Set up writes
  var registers = [LED0_ON_L + (index - 1) * 4, 
    LED0_ON_H + (index - 1) * 4, 
    LED0_OFF_L + (index - 1) * 4,
    LED0_OFF_H + (index - 1) * 4];
  var data = [convert_on, 
    convert_on >> 8, 
    convert_off, 
    convert_off >> 8];
  this._chainWrite(registers, data, next);
}

servoController.prototype.configureServo = function (index, low, high, next) {
  /**
  Set the PWM max and min for the specified servo.

  Many hobby servos, motor speed controllers, etc. expect a nominal 20 ms 
  period and map duty cycles (% time the signal is high for a given period) of 
  10% and 20% to minimum and maximum positions, respectively. The protocol is 
  not particularly strict, though, so it is not uncommon for servos to respond 
  to duty cycles outside the 10%-20% range. This command allows each servo's
  minimum and maximum PWM values to be controlled individually.

  Args
    index
      Servo to configure
    low
      PWM lower bound (value for setServo(index, 0))
    high
      PWM upper bound (value for setServo(index, 1))
    next
      Callback
  */
  this.servoConfigurations[index] = [low, high];
  next && next();
}

function use (hardware, low, high, next)
{
  /**
  Connect to the Servo Module

  Args
    hardware
      Tessel port to use
    low
      Minimum duty cycle (0-1.0)
    high
      Maximum duty cycle (should be between low and 1.0 for best results)
    next
      Callback
  */
  if (typeof low == 'function') {
    next = low;
    low = null;
  }

  var servos = new servoController(hardware, low, high);
  servos.setFrequency(50, function(err) {
    if (!err) {
      servos._connected = true;
      setImmediate(function() {
        servos.emit('ready');
      });
    }
    else {
      setImmediate(function() {
        servos.emit('error');
      });
    }
    
    next && next();
    
  });
  return servos;
}

servoController.prototype.readServo = function (servo, next) {
  /**
  Read the current approximate position target for the specified servo.

  For each channel on the PCA9685, there are two 12 bit registers that
  correspond to the counter values at which the line is set high and low. This
  function reads these registers, calculates the theoretical duty cycle, and 
  then maps it against the range of duty cycles to which the servo is 
  calibrated in ```configureServo```. The ratio of the true duty cycle to the 
  range of configured duty cycles is passed to the callback.

  Because this function cannot determine the true position of a physical servo 
  and the math it does is inherently lossy, we do not recommend using this 
  function in feedback loops.

  Args
    servo
      The servo index
    next
      Callback; gets err, approximate position target as args
  */
  if (!this.servoConfigurations[servo]) {
    next && next(new Error('servo not configured'), null);
  }

  var self = this;
  var registers = [LED0_ON_L + (servo - 1) * 4, 
    LED0_ON_H + (servo - 1) * 4, 
    LED0_OFF_L + (servo - 1) * 4,
    LED0_OFF_H + (servo - 1) * 4];
  self._chainRead(registers, function(err, replies) {
    //  When in the count cycle the pin goes high
    var on = replies[0] + (replies[1] << 8);
    //  When it goes low
    var off = replies[2] + (replies[3] << 8);
    //  Effective duty cycle
    var duty = (off - on) / MAX;

    var low = self.servoConfigurations[servo][0];
    var high = self.servoConfigurations[servo][1];
    var specificMaxDuty = (high - low);
                                        //  empirically determined fudge factors
    next(null, ((duty - low) / specificMaxDuty + 8 / 4096) * 1023/1024);
  });
}


exports.use = use;
exports.servoController = servoController;
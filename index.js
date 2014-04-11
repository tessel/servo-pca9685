// address bit is 111xy11 where x is controlled by GPIO2 and y is controlled by GPIO1
// by default x and y will be 0
// used http://www.nxp.com/documents/data_sheet/PCA9685.pdf as a reference

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
  this.low = low || 0.05;
  if (low === 0) {
    this.low = 0;
  }
  this.high = high || 0.15;

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

  //  Store PWM settings for each servo individually
  this.servoConfigurations = {};
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
    if (err) {
      next && next(err, null);
    }
    var newMode = oldMode | 0x10;
    var registers = [MODE1, PRE_SCALE, MODE1, MODE1];
    var data = [newMode, prescale, oldMode, 0xa1];
    self._chainWrite(registers, data, next);
  });
}

ServoController.prototype.moveServo = function (index, val, next)
{
  /*
  Set the position of the specified servo

  Args
    index
      Index of the servo. NOTE: servos are 1-indexed
    val
      Position to which the the servo is to move. 0-1 of its full scale.
    next
      Callback
  */
  var self = this;
  if (index < 1 || index > 16) {
    throw "Servos are 1-indexed. Servos can be between 1-16.";
  }

  //  If unconfigured, use the controller's default values
  if (!self.servoConfigurations[index]) {
    self.configureServo(index, this.low, this.high, null);
  }

  var low = this.servoConfigurations[index][0];
  var high = this.servoConfigurations[index][1];

  var servo = this;
  this.setPWM(index, (val * (high - low)) + low, next);
};

ServoController.prototype.setPWM = function (index, on, next)
{
  /*
  Set the specified channel's PWM value

  Args
    index
      Servo index to set
    on
      PWM value (0-1) for the specified servo
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

ServoController.prototype.configureServo = function (index, low, high, next) {
  /*
  Set the PWM max and min for the specified servo

  Args
    index
      Servo to configure
    low
      PWM lower bound (value for moveServo(index, 0))
    high
      PWM upper bound (value for moveServo(index, 1))
    next
      Callback
  */
  this.servoConfigurations[index] = [low, high];
  next && next();
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

ServoController.prototype.readServo = function (servo, next) {
  /*
  Read the current position target for the specified servo

  Args
    servo
      The servo index
    next
      Callback; gets err, current PWM percentage as args
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
                                                      //  empirically determined
    next(null, duty / specificMaxDuty - low / specificMaxDuty + 9 / 4096);
  });
}


exports.connect = connect;
exports.ServoController = ServoController;
// Copyright 2014 Technical Machine, Inc. See the COPYRIGHT
// file at the top-level directory of this distribution.
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.

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

function servoController (hardware, low, high, addr2, addr3) {
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
  this.high = high || 0.12;

  //  Enable the outpts
  hardware.digital[2].write(0);

  //  Configure I2C address
  this.address = I2C_ADDRESS;

  addr2 = addr2 || 0;
  addr3 = addr3 || 0;

  hardware.digital[1].write(addr2);
  hardware.digital[0].write(addr3);

  this.address |= addr2 << 2;
  this.address |= addr3 << 3;

  this.i2c = hardware.I2C(this.address);

  //  Store PWM settings for each servo individually
  this.servoConfigurations = {};
}

util.inherits(servoController, events.EventEmitter);

// Reads fom the given registers on the PCA9685 via I2C and passes their replies to the callback
servoController.prototype._chainRead = function (registers, callback, replies) {
  /**
  Args
    registers
      An array of registers to read
    callback
      Callback; gets an array of reply bytes as an arg
    replies
      An array to which err, replies will be pushed
  */
  var replies = replies || [];  // jshint ignore:line
  var self = this;
  if (registers.length === 0) {
    if (callback) {
      callback(null, replies);
    }
  }
  else {
    self.i2c.transfer(new Buffer([registers[0]]), 1, function (err, data) {
      if (err) {
        if (callback) {
          callback(err, replies);
        }
      }
      replies.push(data[0]);
      self._chainRead(registers.slice(1), callback, replies);
    });
  }
};

// Makes multiple writes to the PCA9685's registers via I2C
servoController.prototype._chainWrite = function (registers, data, callback) {
  /**
  Args
    registers
      An array of register addresses
    data
      Ana array of data payloads
    callback
      Callback
  */
  var self = this;
  if (registers.length === 0) {
    if (callback) {
      callback();
    }
  } else {
    self.i2c.send(new Buffer([registers[0], data[0]]), function () {
      self._chainWrite(registers.slice(1), data.slice(1), callback);
    });
  }
};

// Reads from registers on the PCA9685 via I2C
servoController.prototype._readRegister = function (register, callback) {
  /**
  Args
    register
      Register to read
    callback
      Callback; gets reply byte as its arg
  */
  this.i2c.transfer(new Buffer([register]), 1, function (err, data) {
    if (callback) {
      callback(err, data[0]);
    }
  });
};

// Writes to registers on the PCA9685 via I2C
servoController.prototype._writeRegister = function (register, data, callback) {
  /**
  Args
    register
      Register to read
    data
      Bytes to send
    callback
      Callback
  */
  this.i2c.send(new Buffer([register, data]), callback);
};

// Sets the PWM max and min for the specified servo
servoController.prototype.configure = function (index, low, high, callback) {
  /**
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
      PWM lower bound (value for move(index, 0))
    high
      PWM upper bound (value for move(index, 1))
    callback
      Callback
  */
  if (low >= high) {
    var err = new Error('Minimum PWM must be smaller than maximum PWM.');
    if (callback) {
      callback(err);
    }
    return err;
  }
  
  this.servoConfigurations[index] = [low, high];
  if (callback) {
    callback(null);
  }
};

// Get the PWM max and min for the specified servo
servoController.prototype.getConfiguration = function (index, callback) {
  /**
  Args
    index
      index of servo configuration to read. NOTE: 1-indexed
    callback
      Callback

  Callback parameters
    err
      null
    config
      An array with the following contents:
        0 - low
          PWM lower bound (PWM value for move(index, 0))
        1 - high
          PWM upper bound (PWM value for move(index, 1))

  Returns
    config
      as described above
  */
  if (!this.servoConfigurations[index]) {
    if (callback) {
      callback(new Error('Specified servo channel has not been configured'), null);
    }
    return new Error('Specified servo channel has not been configured');
  } else {
    if (callback) {
      callback(null, this.servoConfigurations[index]);
    }
    return this.servoConfigurations[index];
  }
};

// Sets the position of the specified servo
servoController.prototype.move = function (index, val, callback) {
  /**
  Args
    index
      Index of the servo. NOTE: servos are 1-indexed
    val
      Position to which the the servo is to move. 0-1 of its full scale.
    callback
      Callback
  */
  if (index < 1 || index > 16) {
    var err = new Error('Servos are 1-indexed. Servos can be between 1-16.');
    if (callback) {
      callback(err);
    }
    return err;
  }
  
  if (val < 0 || val > 1) {
    var err = new Error('Invalid position. Value must be between 0 and 1');
    if (callback) {
      callback(err);
    }
    return err;
  }

  //  If unconfigured, use the controller's default values
  if (!this.servoConfigurations[index]) {
    this.configure(index, this.low, this.high, null);
  }

  var low = this.servoConfigurations[index][0];
  var high = this.servoConfigurations[index][1];

  this.setDutyCycle(index, (val * (high - low)) + low, callback);
};

// Reads the current approximate position target for the specified servo
servoController.prototype.read = function (servo, callback) {
  /**
  For each channel on the PCA9685, there are two 12 bit registers that
  correspond to the counter values at which the line is set high and low. This
  function reads these registers, calculates the theoretical duty cycle, and
  then maps it against the range of duty cycles to which the servo is
  calibrated in ```configure```. The ratio of the true duty cycle to the
  range of configured duty cycles is passed to the callback.

  Because this function cannot determine the true position of a physical servo
  and the math it does is inherently lossy, we do not recommend using this
  function in feedback loops.

  Args
    servo
      The servo index
    callback
      Callback; gets err, approximate position target as args
  */
  if (!this.servoConfigurations[servo]) {
    if (callback) {
      callback(new Error('Unconfigured servo cannot have a defined position. Configure your servo before reading.'), null);
    }
  }

  var self = this;
  var registers = [LED0_ON_L + (servo - 1) * 4,
    LED0_ON_H + (servo - 1) * 4,
    LED0_OFF_L + (servo - 1) * 4,
    LED0_OFF_H + (servo - 1) * 4];
  self._chainRead(registers, function (err, replies) {
    //  When in the count cycle the pin goes high
    var on = replies[0] + (replies[1] << 8);
    //  When it goes low
    var off = replies[2] + (replies[3] << 8);
    //  Duty cycle with no phase shift
    var currentDuty = (off - on) / MAX;

    var low = self.servoConfigurations[servo][0];
    var high = self.servoConfigurations[servo][1];
    var range = (high - low);

    if (callback) {
      callback(null, (currentDuty - low) / range);
    }
    return (currentDuty - low) / range; 
  });
};

// Sets the duty cycle for the specified servo
servoController.prototype.setDutyCycle = function (index, on, callback) {
  /**
  Args
    index
      Servo index to set
    on
      Duty cycle (0-1) for the specified servo
    callback
      Callback
  */

  if (index < 1 || index > 16) {
    var err = new Error('Servos are 1-indexed. Servos can be between 1-16.');
    if (callback) {
      callback(err);
    }
    return err;
  }
  
  if (on < 0 || on > 1) {
    var err = new Error('Invalid duty cycle. Value must be between 0 and 1');
    if (callback) {
      callback(err);
    }
    return err;
  }

  var convertOn = 0;
  var convertOff = Math.floor(MAX * on);

  // Set up writes
  var registers = [LED0_ON_L + (index - 1) * 4,
    LED0_ON_H + (index - 1) * 4,
    LED0_OFF_L + (index - 1) * 4,
    LED0_OFF_H + (index - 1) * 4];
  var data = [convertOn,
    convertOn >> 8,
    convertOff,
    convertOff >> 8];
  this._chainWrite(registers, data, callback);
};

// Sets the PWM frequency in Hz for the PCA9685 chip
servoController.prototype.setModuleFrequency = function (freq, callback) {
  /**
  Args
    freq
      PWM frequency, in units of Hertz
    callback
      Callback
  */
  var prescaleVal = (25000000 / MAX) / freq - 1;
  var prescale = Math.floor(prescaleVal);

  var self = this;
  self._readRegister(MODE1, function (err, oldMode) {
    if (err) {
      if (callback) {
        callback(err, null);
      }
      return err;
    }
    var newMode = oldMode | 0x10;
    var registers = [MODE1, PRE_SCALE, MODE1, MODE1];
    var data = [newMode, prescale, oldMode, 0xa1];
    self._chainWrite(registers, data, callback);
  });
};

function use (hardware, low, high, callback) {
  /**
  Connect to the Servo Module

  Args
    hardware
      Tessel port to use
    low
      Minimum duty cycle (0-1.0)
    high
      Maximum duty cycle (should be between low and 1.0 for best results)
    callback
      Callback
  */
  if (typeof low == 'function') {
    callback = low;
    low = null;
  }

  var servos = new servoController(hardware, low, high);
  servos.setModuleFrequency(50, function (err) {
    if (!err) {
      servos._connected = true;
      setImmediate(function () {
        servos.emit('ready');
      });
      if (callback) {
        callback(null, servos);
      }
    } else {
      setImmediate(function () {
        servos.emit('error', err);
      });
      if (callback) {
        callback(err);
      }
    }
  });
  return servos;
}

exports.use = use;
exports.servoController = servoController;

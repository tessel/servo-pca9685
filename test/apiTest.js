var test = require('tinytap');
test.count(361);
var async = require('async');

var portname = process.argv[2] || 'A';
var tessel = require('tessel');
var servoLib = require('../');
var servo;

var genArray = function (min, max, interval) {
  var collector = [];
  for (var i = min; i < max + 0.001; i = i + interval) {
    collector.push(i);
  }
  return collector;
};

var genRandArray = function (num, scale) {
  // num: how many; scale: 0-X
  var collector = [];
  for (var i = 0; i < num; i++) {
    var item = Math.random();
    if (scale) {
      item = item  * scale;
    }
    collector.push(item);
  }
  return collector;
};

// 16 servos, numbered 1 to 16
var servos = genArray(1, 16, 1);

async.series([
  // Test connecting
  test('Connecting to servo module, checking for ready event', function (t) {
    servo = servoLib.use(tessel.port[portname], function (err, servo) {
      t.ok(servo, 'The servo module object was not returned');
      t.equal(err, undefined, 'There was an error connecting');
      // Test events
      var timeout = 1000;
      // ready
      var readyTimer = setTimeout(function () {
        t.ok(false, 'failed to emit ready event in a reasonable amount of time');
        t.end();
      }, timeout);
      servo.on('ready', function () {
        clearTimeout(readyTimer);
        servo.removeAllListeners('ready');
        t.ok(true, 'ready was emitted');
        t.end();
      });
      // error
      // Fail if we get an error
      servo.on('error', function (err) {
        t.ok(false, 'error caught: ' + err);
        t.end();
      });
    });
  }),
  
  // Methods
  test('configure', function (t) {
    var testArraySize = 5;
    var minPWMs = genRandArray(testArraySize);
    var maxPWMs = genRandArray(testArraySize);
    var count = 0;
    var total = servos.length * minPWMs.length;
    var maxPWM;
    servos.forEach(function (thisServo) {
      minPWMs.forEach(function (minPWM, index) {
        maxPWM = maxPWMs[index];
        servo.configure(thisServo, minPWM, maxPWM, function (err) {
          // Make sure errors get caught properly
          if (minPWM < maxPWM) {
            // Shouldn't error
            t.equal(err, undefined, 'There was an error configuring servo ' + thisServo + ' to [min, max] [' + minPWM + ', ' + maxPWM + ']: ' + err);
          } else {
            // Should error
            t.ok(err !== undefined, 'Silent failure on minPWM >= maxPWM for servo ' + thisServo + ' and values [min, max] [' + minPWM + ', ' + maxPWM + ']');
          }
          // Configure back to a good range for our servos
          servo.configure(thisServo, 0.0275, 0.1225, function (err) {
            t.equal(err, undefined, 'There was an error configuring servo ' + thisServo + ' to [min, max] [' + minPWM + ', ' + maxPWM + ']: ' + err);
            count++;
            if (count === total) {
              t.end();
            }
          });
        });
      });
    });
  }),
  
  test('move', function (t) {
    var positions = genRandArray(3, 1.5);
    var count = 0;
    var total = servos.length * positions.length;
    servos.forEach(function (thisServo) {
      positions.forEach(function (position) {
        servo.move(thisServo, position, function (err) {
          // Make sure errors get caught properly
          if (position >= 0 && position <= 1) {
            // Shouldn't error
            t.equal(err, undefined, 'There was an error moving servo ' + thisServo + ' to position ' + pos + ': ' + err);
          } else {
            // Should error
            t.ok(err !== undefined, 'Silent failure of out-of-range position for servo ' + thisServo + ' to position ' + position);
          }
          count++;
          if (count === total) {
            t.end();
          }
        });
      });
    });
  }),
  
  test('read', function (t) {
    var total = servos.length;
    var count = 0;
    servos.forEach(function (thisServo) {
      servo.read(thisServo, function (err, data) {
        t.equal(err, undefined, 'There was an error reading servo ' + thisServo + ': ' + err);
        t.equal(typeof data, 'number', 'Data read from servo is NaN');
        t.ok(data >= 0 && data <= 1, 'Invalid data returned');
        count++;
        if (count === total) {
          t.end();
        }
      });
    });
  }),
  
  test('setDutyCycle', function (t) {
    var dutyCycles = genArray(0, 1, 0.2); // Array of duty cycles from 0 to 1, by .1
    var total = dutyCycles.length * servos.length; // So we know when it's done
    var count = 0;
    dutyCycles.forEach(function (dutyCycle) {
      servos.forEach(function (thisServo) {
        servo.setDutyCycle(thisServo, dutyCycle, function (err) {
          t.equal(err, undefined, 'There was an error setting the duty cycle of servo ' + thisServo + ' to ' + dutyCycle + ': ' + err);
          count++;
          if (count === total) {
            t.end();
          }
        });
      });
    });
  }),
  
  test('setModuleFrequency', function (t) {
    var frequencies = [100000, 10000, 1000, 250, 100, 50];
    var total = frequencies.length;
    var count = 0;
    frequencies.forEach(function (freq) {
      servo.setModuleFrequency(freq, function (err) {
        t.equal(err, undefined, 'There was an error setting the module frequency to ' + freq + ': ' + err);
        count++;
        if (count === total) {
          // Make sure we leave the module frequency at 50 to work with our servos.
          servo.setModuleFrequency(50, function (err) {
            t.end();
          });
        }
      });
    });
  }),
  
  test('move, setDutyCycle, and read', function (t) {
    var testVals = genRandArray(5);
    var tolerance = 0.5; // This is a huge tolerance.
    var count = 0;
    var total = servos.length * testVals.length * 2;
    // Move and read
    servos.forEach(function (thisServo) {
      testVals.forEach(function (val) {
        servo.move(thisServo, val, function (err) {
          t.equal(err, undefined, 'There was an error moving servo ' + thisServo + ' to position ' + pos + ': ' + err);
          servo.read(thisServo, function (err, data) {
            t.equal(err, undefined, 'There was an error reading servo ' + thisServo + ': ' + err);
            t.equal(typeof data, 'number', 'Data read from servo is NaN');
            t.ok(data >= 0 && data <= 1, 'Invalid data returned');
            t.ok(data > (val - tolerance) && data < (val + tolerance), 'Servo ' + thisServo + ' moved to ' + data + ' when it should have moved to ' + val);
          });
        });
      });
    });
    // Set duty cycle and read
    servos.forEach(function (thisServo) {
      testVals.forEach(function (val) {
        servo.setDutyCycle(thisServo, val, function (err) {
          t.equal(err, undefined, 'There was an error setting the duty cycle of servo ' + thisServo + ' to ' + pos + ': ' + err);
          servo.read(thisServo, function (err, data) {
            t.equal(err, undefined, 'There was an error reading servo ' + thisServo + ': ' + err);
            t.equal(typeof data, 'number', 'Data read from servo is NaN');
            t.ok(data >= 0 && data <= 1, 'Invalid data returned');
            t.ok(data > (val - tolerance) && data < (val + tolerance), 'Servo ' + thisServo + ' has duty cycle ' + data + ' when it should have duty cycle ' + val);
          });
        });
      });
    });
  })
  
  ]);
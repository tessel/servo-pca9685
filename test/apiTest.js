var test = require('tinytap');
test.count(3 + 320 + 48 + 96 + 6 + 800 + 800);
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
      item = item * scale;
    }
    collector.push(item);
  }
  return collector;
};

// 16 servos, numbered 1 to 16
var servos = genArray(1, 16, 1);

async.series([
  // Test connecting - 3 subtests
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
  // 320 subtests
  test('configure, getConfiguration', function (t) {
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
            t.equal(servo.getConfiguration(thisServo)[0], 0.0275, 'Error reading configuarions');
            t.equal(servo.getConfiguration(thisServo)[1], 0.1225, 'Error reading configuarions');
            count++;
            if (count === total) {
              t.end();
            }
          });
        });
      });
    });
  }),
  
  // 48 subtests
  test('move', function (t) {
    var positions = genRandArray(3, 1.5);
    var count = 0;
    var total = servos.length * positions.length;
    servos.forEach(function (thisServo) {
      positions.forEach(function (position) {
        servo.move(thisServo, position, function (err) {
          // Make sure errors get caught properly
          if (position >= -0.000245 && position <= 1.000245) {
            // Shouldn't error
            t.equal(err, undefined, 'There was an error moving servo ' + thisServo + ' to position ' + position + ': ' + err);
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
  
  // 96 subtests
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
  
  // 6 subtests
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
  
  // 800 subtests
  test('move and read', function (t) {
    var tolerance = 0.005;

    // Move and read
    // 5 * 16 * 10 = 800
    var positionsToTry = 10;
    var theTest = function (servoNumber, positionNumber, servos, positions) {
      var thisServo = servos[servoNumber];
      // Normal operational range, give or take
      servo.configure(thisServo, 0.02, 0.12, function () {
        var targetPosition = positions[positionNumber];
        servo.move(thisServo, targetPosition, function (err) {
          servo.read(thisServo, function (err2, readPosition) {
            t.equal(err, undefined, 'There was an error moving servo ' + thisServo + ' to position ' + targetPosition + ': ' + err);
            // console.log(thisServo+'\t'+targetPosition+'\t'+readPosition);
            t.equal(err2, undefined, 'There was an error reading servo ' + thisServo + ': ' + err2);
            t.equal(typeof readPosition, 'number', 'Data read from servo is NaN');
            t.ok(readPosition >= -0.000245 && readPosition <= 1.000245, 'Invalid data returned');
            t.ok(Math.abs(readPosition - targetPosition) < tolerance, 'Servo ' + thisServo + ' moved to ' + readPosition + ' when it should have moved to ' + targetPosition + '\t' + Math.abs(readPosition - targetPosition));

            // Recursion
            if (positionNumber + 1 === positions.length && servoNumber + 1 === servos.length) {
              t.end();
            } else if (positionNumber + 1 === positions.length) {
              theTest(servoNumber + 1, 0, servos, genRandArray(positions.length));
            } else {
              theTest(servoNumber, positionNumber + 1, servos, genRandArray(positions.length));
            }
          });
        });
      });
    };
    theTest(0, 0, servos, genRandArray(positionsToTry));
  }), 

  // 800 subtests
  // 5 * 16 * 10 = 800
  test('setDutyCycle and read', function (t) {

    // This time, we can afford to be really serious
    var tolerance = 0.000245; //  1/4096 + 1e-6 = quantum + rounding error
    var positionsToTry = 10;
    var theTest = function (servoNumber, positionNumber, servos, positions) {
      var thisServo = servos[servoNumber];
      // Reuse the same code for both tests with this one weird trick!
      servo.configure(thisServo, 0, 1, function () {
        var targetPosition = positions[positionNumber];
        servo.setDutyCycle(thisServo, targetPosition, function (err) {
          servo.read(thisServo, function (err2, readPosition) {
            t.equal(err, undefined, 'There was an error moving servo ' + thisServo + ' to position ' + targetPosition + ': ' + err);
            // console.log(thisServo+'\t'+targetPosition+'\t'+readPosition);
            t.equal(err2, undefined, 'There was an error reading servo ' + thisServo + ': ' + err2);
            t.equal(typeof readPosition, 'number', 'Data read from servo is NaN');
            t.ok(readPosition >= -0.000245 && readPosition <= 1.000245, 'Invalid data returned');
            t.ok(Math.abs(readPosition - targetPosition) < tolerance, 'Servo ' + thisServo + ' duty cycle set to ' + readPosition + ' when it should have been set to ' + targetPosition + '\t' + Math.abs(readPosition - targetPosition));

            // Recursion
            if (positionNumber + 1 === positions.length && servoNumber + 1 === servos.length) {
              t.end();
            } else if (positionNumber + 1 === positions.length) {
              theTest(servoNumber + 1, 0, servos, genRandArray(positions.length));
            } else {
              theTest(servoNumber, positionNumber + 1, servos, genRandArray(positions.length));
            }
          });
        });
      });
    };
    theTest(0, 0, servos, genRandArray(positionsToTry));
  }),
  
]);

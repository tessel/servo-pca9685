#Servo
Driver for the servo-pca9685 Tessel servo module ([PCA9685](http://www.nxp.com/documents/data_sheet/PCA9685.pdf)), capable of driving up to 16 servos at once. Can also be used to drive other devices which accept a 3.3 V PWM signal (most motor controllers, LEDs, gate drivers, etc.).

## TODO

This can be used with LEDs also and this package is very narrowly named.

##Installation
```sh
npm install servo-pca9685
```

##Example
```js
/*********************************************
This servo module demo turns the servo around
~18 degrees every 500ms, then resets it after
10 turns, reading out position to the console
at each movement.
*********************************************/

var tessel = require('tessel');
var servo = require('../');

var hardware = tessel.port('A');

// Initialize the servo.
console.log('Initalizing...');

var servoController = servo.use(hardware);

servoController.on('ready', function () {
  var pos = 0;  //  Target position of the servo between 0 (min) and 1 (max).
  //  Set the minimum and maximum duty cycle for servo 1.
  //  If the servo doesn't move to its full extent or stalls out
  //  and gets hot, try tuning these values (0.05 and 0.12).
  //  Moving them towards each other = less movement range
  //  Moving them apart = more range, more likely to stall and burn out
  servoController.configureServo(1, 0.05, 0.12, function () {
    setInterval(function () {
      console.log('Deg rotation:', pos);
      //  Set servo #1 to position pos.
      servoController.setServo(1, pos, function () {
        //  Read the approximate target positon of servo #1 back from the module.
        //  Please refer to the docs if you plan to use this value for something.
        // servoController.readServo(1, function(err, duty) {
        //   console.log('Read position:\t', duty);
        // });
      });

      // Increment by 10% (~18 deg for a normal servo)
      pos += 0.1;
      if (pos > 1) {
        pos = 0;
      }
    }, 500);
  });
});
```

##Methods

*  **`servo`.configureServo(whichServo, minPWM, maxPWM, callback())** Sets the PWM max and min for the specified servo.

*  **`servo`.move(whichServo, positionOrSpeed, callback())** `positionOrSpeed` is a value between 0 and 1. On a normal servo, this value is the position to move to as a percent of the total available rotational range. On a continuous rotation servo, this value represents the rotation speed: 0 is fast in one direction, 1 is fast in the other direction, and 0.5 is stopped.

*  **`servo`.readServo(whichServo, callback())** Reads the current approximate position target for the specified servo.

*  **`servo`.setDutyCycle(whichServo, on, callback())** Sets the duty cycle for the specified servo. `on` is duty cycle uptime, range from 0-1.

*  **`servo`.setFrequency(Hertz, callback())** Sets the PWM frequency in Hz for the PCA9685 chip.

##Events

*  *ready*

*  *error*

##Hardware/Advanced usage

*  The servos used in conjucntion with this module should be powered through the 5.5 mm barrel jack.
*  The physical *module* is marked with "S", "+", and "-". These correspond to signal, power, and GND. On most *servos*, the GND wire will be black/brown and the signal wire will be yellow/white. Red typically denotes 5 V power.
*  This module can be used to drive most speed controllers, which in turn can control a wide variety of actuators. It can also be used to drive small LEDs with current limiting resistors in series.
*  The bare square pads by the barrel jack allow the addition of a capacitor to the input power rail if desired. The pad closest to the board edge is connected to GND, the other to the barrel jack's positive pin. This addition is not requred for proper module functionality.

## License

Software License Agreement (BSD License)

Copyright (c) 2012, Adafruit Industries

Copyright (c) 2014, Technical Machine

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
1. Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holders nor the
names of its contributors may be used to endorse or promote products
derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS ''AS IS'' AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

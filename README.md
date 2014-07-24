#Servo
Driver for the servo-pca9685 Tessel servo module, capable of driving up to 16 servos at once. Can also be used to drive other devices which accept a 3.3 V PWM signal (most motor controllers, LEDs, gate drivers, etc.). The hardware documentation for this module can be found [here](https://github.com/tessel/hardware/blob/master/modules-overview.md#servo).

If you run into any issues you can ask for support on the [Servo Module Forums](http://forums.tessel.io/category/servo).

###Installation
```sh
npm install servo-pca9685
```

###Example
```js
/*********************************************
This servo module demo turns the servo around
1/10 of its full rotation  every 500ms, then
resets it after 10 turns, reading out position
to the console at each movement.
*********************************************/

var tessel = require('tessel');
var servolib = require('servo-pca9685'); 

var servo = servolib.use(tessel.port['A']);

var servo1 = 1; // We have a servo plugged in at position 1

servo.on('ready', function () {
  var position = 0;  //  Target position of the servo between 0 (min) and 1 (max).

  //  Set the minimum and maximum duty cycle for servo 1.
  //  If the servo doesn't move to its full extent or stalls out
  //  and gets hot, try tuning these values (0.05 and 0.12).
  //  Moving them towards each other = less movement range
  //  Moving them apart = more range, more likely to stall and burn out
  servo.configure(servo1, 0.05, 0.12, function () {
    setInterval(function () {
      console.log('Position (in range 0-1):', position);
      //  Set servo #1 to position pos.
      servo.move(servo1, position);

      // Increment by 10% (~18 deg for a normal servo)
      position += 0.1;
      if (position > 1) {
        position = 0; // Reset servo position
      }
    }, 500); // Every 500 milliseconds
  });
});
```

###Methods
&#x20;<a href="#api-servo-configure-whichServo-minPWM-maxPWM-callback-Sets-the-PWM-max-and-min-for-the-specified-servo" name="api-servo-configure-whichServo-minPWM-maxPWM-callback-Sets-the-PWM-max-and-min-for-the-specified-servo">#</a> servo<b>.configure</b>( whichServo, minPWM, maxPWM, callback(err) ) Sets the PWM max and min for the specified servo.  

&#x20;<a href="#api-servo-move-whichServo-positionOrSpeed-callback-positionOrSpeed-is-a-value-between-0-and-1-On-a-normal-servo-this-value-is-the-position-to-move-to-as-a-percent-of-the-total-available-rotational-range-On-a-continuous-rotation-servo-this-value-represents-the-rotation-speed-0-is-fast-in-one-direction-1-is-fast-in-the-other-direction-and-0-5-is-stopped" name="api-servo-move-whichServo-positionOrSpeed-callback-positionOrSpeed-is-a-value-between-0-and-1-On-a-normal-servo-this-value-is-the-position-to-move-to-as-a-percent-of-the-total-available-rotational-range-On-a-continuous-rotation-servo-this-value-represents-the-rotation-speed-0-is-fast-in-one-direction-1-is-fast-in-the-other-direction-and-0-5-is-stopped">#</a> servo<b>.move</b>( whichServo, positionOrSpeed, callback(err) ) positionOrSpeed is a value between 0 and 1. On a normal servo, this value is the position to move to as a percent of the total available rotational range. On a continuous rotation servo, this value represents the rotation speed: 0 is fast in one direction, 1 is fast in the other direction, and 0.5 is stopped.  

&#x20;<a href="#api-servo-read-whichServo-callback-Reads-the-current-approximate-position-target-for-the-specified-servo" name="api-servo-read-whichServo-callback-Reads-the-current-approximate-position-target-for-the-specified-servo">#</a> servo<b>.read</b>( whichServo, callback(err, reading) ) Reads the current approximate position target for the specified servo.  

&#x20;<a href="#api-servo-setDutyCycle-whichServo-on-callback-Sets-the-duty-cycle-for-the-specified-servo-on-is-duty-cycle-uptime-range-from-0-1" name="api-servo-setDutyCycle-whichServo-on-callback-Sets-the-duty-cycle-for-the-specified-servo-on-is-duty-cycle-uptime-range-from-0-1">#</a> servo<b>.setDutyCycle</b>( whichServo, on, callback(err) ) Sets the duty cycle for the specified servo. on is duty cycle uptime, range from 0-1.  

&#x20;<a href="#api-servo-setModuleFrequency-Hertz-callback-Sets-the-PWM-frequency-in-Hz-for-the-PCA9685-chip" name="api-servo-setModuleFrequency-Hertz-callback-Sets-the-PWM-frequency-in-Hz-for-the-PCA9685-chip">#</a> servo<b>.setModuleFrequency</b>( Hertz, callback(err) ) Sets the PWM frequency in Hz for the PCA9685 chip.  

###Events
&#x20;<a href="#api-servo-on-error-callback-err-Emitted-upon-error" name="api-servo-on-error-callback-err-Emitted-upon-error">#</a> servo<b>.on</b>( 'error', callback(err) ) Emitted upon error.  

&#x20;<a href="#api-servo-on-ready-callback-Emitted-upon-first-successful-communication-between-the-Tessel-and-the-module" name="api-servo-on-ready-callback-Emitted-upon-first-successful-communication-between-the-Tessel-and-the-module">#</a> servo<b>.on</b>( 'ready', callback() ) Emitted upon first successful communication between the Tessel and the module.  

###Hardware/Advanced usage
*  The servos used in conjunction with this module should be powered through the 5.5 mm barrel jack.
*  The physical *module* is marked with "S", "+", and "-". These correspond to signal, power, and GND. On most *servos*, the GND wire will be black/brown and the signal wire will be yellow/white. Red typically denotes 5 V power.
*  This module can be used to drive most speed controllers, which in turn can control a wide variety of actuators. It can also be used to drive small LEDs with current limiting resistors in series.
*  The bare square pads by the barrel jack allow the addition of a capacitor to the input power rail if desired. The pad closest to the board edge is connected to GND, the other to the barrel jack's positive pin. This addition is not required for proper module functionality.

###License
MIT or Apache 2.0, at your option
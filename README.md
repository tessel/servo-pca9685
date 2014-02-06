#Servo
Driver for the servo-pca9685 Tessel servo module ([PCA9685](http://www.adafruit.com/datasheets/PCA9685.pdf)), capable of driving up to 16 servos at once.

## TODO

This can be used with LEDs also and this package is very narrowly named.

##Installation
```sh
npm install servo-pca9685
```

##Example
```js
var servo = require('servo-pca9685').connect(hardwareapi);
servo.moveServo(1, 0);
servo.once('move', function () {
  servo.moveServo(1, 90);
  servo.once('move', function () {
    servo.moveServo(1, 180);
  });
});
```

*  **servos.<b>setFrequency</b> (`hertz`)** 

*  servos.<b>moveServo</b> (`servonumber`, `degrees`)** 

*  servos *emits* (`"move"`, `servonumber`, `degrees`)

##Methods

*  **`servo`.setFrequency(hertz)**

*  **`servo`.moveServo(servonumber, degrees)**

##Events

*  *move, servonumber, degrees*
  
##Advanced

In which somebody writes about how to power serious motors etc (probably Eric)

## License

MIT

# PCA9685 as a servo driver

Install:

```
npm install servo-pca9685
```

Import:

API:

`servos = require('servo-pca9685').connect(hardwareapi)`

*  **servos.<b>setFrequency</b> (`hertz`)** 

*  servos.<b>moveServo</b> (`servonumber`, `degrees`)** 

*  servos *emits* (`"move"`, `servonumber`, `degrees`)

Example:

```javascript
var actuator = servo.connect(myhardware);
actuator.moveServo(1, 0);
actuator.once('move', function () {
  actuator.moveServo(1, 90);
  actuator.once('move', function () {
    actuator.moveServo(1, 180);
  });
})
```

## TODO

This can be used with LEDs also and this package is very narrowly named.

## License

MIT
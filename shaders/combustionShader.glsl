/*
Add temperature based on fuel, and apply cooling.
*/

precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uFuel;
uniform sampler2D uTemperature;
uniform vec2 texelSize;
uniform float dt;
uniform float burnTemperature;
uniform float cooling; // cooling coefficient.

void main () {
  float temp = texture2D(uTemperature, vUv).x;
  float fuel = texture2D(uFuel, vUv).x;
  temp = max(0.0, temp - dt * cooling * temp / burnTemperature);
  if (fuel > 0.0) {
    temp = burnTemperature;
  }
  gl_FragColor = vec4(temp, 0.0, 0.0, 1.0);
}

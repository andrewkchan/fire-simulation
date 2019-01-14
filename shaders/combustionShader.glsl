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

float fuelTemperature (float fuel) {
  return fuel * burnTemperature;
}

void main () {
  float temp = texture2D(uTemperature, vUv).x;
  float fuel = texture2D(uFuel, vUv).x;
  // cool existing temperature.
  temp = max(0.0, temp - dt * cooling * pow(temp / burnTemperature, 4.0));
  // add more heat based on fuel.
  temp = max(temp, fuelTemperature(fuel));
  gl_FragColor = vec4(temp, 0.0, 0.0, 1.0);
}

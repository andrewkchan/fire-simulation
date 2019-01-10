/*
Add impulse to a velocity field due to thermal buoyancy.
*/

precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uTemperature;
uniform vec2 texelSize;
uniform float dt;
uniform float buoyancy; // buoyancy parameter.

void main () {
  float dTemp = texture2D(uTemperature, vUv).x;
  vec2 impulse = dt * buoyancy * dTemp * vec2(0.0, 1.0);
  vec2 vel = texture2D(uVelocity, vUv).xy;
  gl_FragColor = vec4(vel + impulse, 0.0, 1.0);
}

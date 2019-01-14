/*
Advect an array of particles through a velocity field, assuming built-in interpolation.
*/

precision highp float;
precision mediump sampler2D;

varying vec2 vUv; // for particles, each texel is a separate particle.
uniform sampler2D uVelocity;
uniform vec2 texelSize; // simulation grid size.
uniform float dt;
uniform sampler2D particleData; // texture where each texel color -> (particle position, particle velocity).
uniform float dissipation; // velocity dissipation.

void main () {
  vec2 p = texture2D(particleData, vUv).xy; // particle position (clip space).
  vec2 v = texture2D(particleData, vUv).zw; // particle velocity.

  vec2 vf = texture2D(uVelocity, (p + 1.)*0.5).xy * texelSize.x;
  v += (vf - v) * dissipation;
  p += dt * v;

  gl_FragColor = vec4(p, v);
}

/*
Reset the position + velocity of any particles that have reached the end of their lifespans.
Call this shader before resetting their lifespans!
*/

precision highp float;
precision mediump sampler2D;

varying vec2 vUv; // for particles, each texel is a separate particle.
uniform vec2 initialPosition;
uniform vec2 initialVelocity;
uniform sampler2D particleData; // texture where each texel color -> (particle position, particle velocity).
uniform sampler2D particleLifespans; // texture where each texel color -> (particle lifespan, 0...)

float rand (vec2 st) {
  return fract(sin(dot(st.xy,
                       vec2(12.9898,78.233)))*
      43758.5453123);
}
void main () {
  float life = texture2D(particleLifespans, vUv).x;
  // each particle ID --> some different perturbation of initial conditions.
  float perturbationX = 0.05 * rand(vec2(1., vUv.y));
  float perturbationY = 0.05 * rand(vec2(vUv.x, 1.));

  vec2 p = texture2D(particleData, vUv).xy; // particle position (clip space).
  vec2 v = texture2D(particleData, vUv).zw; // particle velocity.
  if (life <= 0.0) {
    gl_FragColor = vec4(initialPosition + vec2(perturbationX, perturbationY), initialVelocity + vec2(perturbationX, perturbationY));
  } else {
    gl_FragColor = texture2D(particleData, vUv);
  }
}

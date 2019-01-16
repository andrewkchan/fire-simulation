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

vec2 random2(vec2 st){
    st = vec2( dot(st,vec2(127.1,311.7)),
              dot(st,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(st)*43758.5453123);
}
void main () {
  float life = texture2D(particleLifespans, vUv).x;
  // each particle ID --> some different perturbation of initial conditions.
  vec2 perturbation = 0.05 * random2(vUv);

  vec2 p = texture2D(particleData, vUv).xy; // particle position (clip space).
  vec2 v = texture2D(particleData, vUv).zw; // particle velocity.
  if (life <= 0.0) {
    gl_FragColor = vec4(initialPosition + perturbation, initialVelocity + perturbation);
  } else {
    gl_FragColor = texture2D(particleData, vUv);
  }
}

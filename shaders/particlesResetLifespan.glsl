/*
Reset the lifespan of any particles that have reached the end of their lifespans.
*/

precision highp float;
precision mediump sampler2D;

varying vec2 vUv; // for particles, each texel is a separate particle.
uniform float initialLifespan;
uniform sampler2D particleLifespans; // texture where each texel color -> (particle lifespan, 0...)

float rand (vec2 st) {
  return fract(sin(dot(st.xy,
                       vec2(12.9898,78.233)))*
      43758.5453123);
}
void main () {
  float life = texture2D(particleLifespans, vUv).x;
  // each particle ID --> some different perturbation of initial conditions.
  float perturbation = rand(vUv) * 0.1;
  if (life <= 0.0) {
    gl_FragColor = vec4(initialLifespan + perturbation * initialLifespan, 0., 0., 1.);
  } else {
    gl_FragColor = vec4(life, 0., 0., 1.);
  }
}

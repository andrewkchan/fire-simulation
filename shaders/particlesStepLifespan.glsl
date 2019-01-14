/*
Reduce particle lifespans by dt.
*/

precision highp float;
precision mediump sampler2D;

varying vec2 vUv; // for particles, each texel is a separate particle.
uniform float dt;
uniform sampler2D particleLifespans; // texture where each texel color -> (particle lifespan, 0...)

void main () {
  float life = texture2D(particleLifespans, vUv).x;
  gl_FragColor = vec4(life - dt, 0., 0., 1.);
}

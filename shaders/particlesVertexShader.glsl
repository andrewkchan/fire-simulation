/*
Transform a particle array texture into an array of vertices to render.
*/

precision highp float;
precision mediump sampler2D;

uniform sampler2D particleData;
uniform float size;
attribute vec2 particleUV;
varying vec2 vUv; // each texel maps to its own particle.

void main () {
  vec2 p = texture2D(particleData, particleUV).xy;
  vec2 v = texture2D(particleData, particleUV).zw;
  gl_PointSize = size;
  gl_Position = vec4(p, 0.0, 1.0);
}

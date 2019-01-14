/*
Render particles from a particle array to a texture where each particle is the given color.
*/

precision highp float;
precision mediump sampler2D;

uniform vec3 color;

void main () {
  gl_FragColor = vec4(color, 1.0);
}

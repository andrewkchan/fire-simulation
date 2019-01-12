precision highp float;
precision mediump sampler2D;

varying vec4 color;

void main () {
  gl_FragColor = vec4(color);
}

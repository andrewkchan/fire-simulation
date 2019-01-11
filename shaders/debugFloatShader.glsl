precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uTexture;
uniform float scalar;

void main () {
  float value = scalar * texture2D(uTexture, vUv).x;
  gl_FragColor = vec4(value, value, value, 1.0);
}

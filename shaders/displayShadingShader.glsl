/*
Boost edge pixels, e.g. pixels where one side is brighter than the other side.
Non-edge pixels get attenuated by a factor as low as 0.7.
*/

precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 VB;
uniform sampler2D uTexture;
uniform vec2 texelSize;

void main () {
  vec3 L = texture2D(uTexture, vL).rgb;
  vec3 R = texture2D(uTexture, vR).rgb;
  vec3 T = texture2D(uTexture, vT).rgb;
  vec3 B = texture2D(uTexture, vB).rgb;
  vec3 C = texture2D(uTexture, vUv).rgb;

  float dx = length(R) - length(L);
  float dy = length(T) - length(B);

  vec3 n = normalize(vec3(dx, dy, length(texelSize)));
  vec3 l = vec3(0.0, 0.0, 1.0);

  float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
  C.rgb *= diffuse;

  gl_FragColor = vec4(C, 1.0);
}

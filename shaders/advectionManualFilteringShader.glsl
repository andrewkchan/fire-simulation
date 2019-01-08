/*
Advect a source field through the given velocity field with a manual interpolation function.
*/

precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uVelocity; // velocity texture.
uniform sampler2D uSource; // source field texture (scalar or velocity field)
uniform vec2 texelSize;
uniform vec2 dyeTexelSize;
uniform float dt;
uniform float dissipation;

/* bilinear interpolation function.
@param sampler2D sam - Texture to do the interpolation.
@param vec2 uv - uv coords.
@param vec2 tsize - Texel (grid square) size.
*/
vec4 bilerp (in sampler2D sam, in vec2 uv, in vec2 tsize) {
  vec2 st = uv / tsize - 0.5;

  vec2 iuv = floor(st);
  vec2 fuv = fract(st);

  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
  vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
  vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}

void main () {
  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
  gl_FragColor = dissipation * bilerp(uSource, coord, dyeTexelSize);
  gl_FragColor.a = 1.0;
}

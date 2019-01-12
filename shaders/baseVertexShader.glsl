precision highp float;
precision mediump sampler2D;

attribute vec2 aPosition; // range from (-1.0, -1.0) to (1.0, 1.0)
varying vec2 vUv; // UV mapping (texture) coordinates.
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 texelSize;

void main () {
  vUv = aPosition * 0.5 + 0.5; // range from (0.0, 0.0) to (1.0, 1.0)

  // get the uv coordinates surrounding the current texel.
  vL = vUv - vec2(texelSize.x, 0.0); // left texel.
  vR = vUv + vec2(texelSize.x, 0.0); // right texel.
  vT = vUv + vec2(0.0, texelSize.y); // top texel.
  vB = vUv - vec2(0.0, texelSize.y); // bottom texel.
  gl_Position = vec4(aPosition, 0.0, 1.0);
}

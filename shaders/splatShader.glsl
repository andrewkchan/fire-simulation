/*
Given uniforms point, color, radius, uTarget, aspectRatio, create a gaussian splat
at the point with the given color and radius in the target texture.
*/

precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uTarget; // target texture to create the splat
uniform float aspectRatio;
uniform vec3 color; // color of the splat
uniform vec2 point; // x, y point to create the splat
uniform float radius; // radius of the splat
uniform bool useMax; // if TRUE, output is max rather than additive.

void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color; // gaussian splat.
  vec3 base = texture2D(uTarget, vUv).xyz;
  if (useMax) {
    gl_FragColor = vec4(max(base, splat), 1.0);
  } else {
    gl_FragColor = vec4(base + splat, 1.0);
  }
}

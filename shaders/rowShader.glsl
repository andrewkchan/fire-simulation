/*
Fill a texel row below the y-coordinate with noise in the target texture.
*/

precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uTarget; // target texture to create the row
uniform float y; // y-coordinate of the row (in grid coordinates).
uniform bool useMax; // if TRUE, output is max rather than additive.
uniform vec2 texelSize; // simulation grid width.

float rand (vec2 st) {
  return fract(sin(dot(st.xy,
                       vec2(12.9898,78.233)))*
      43758.5453123);
}

float noise(vec2 p, float freq){
	float unit = 256.*texelSize.x/freq;
	vec2 ij = floor(p/unit);
	vec2 xy = mod(p,unit)/unit;
	xy = .5*(1.-cos(3.1415926535*xy));
	float a = rand((ij+vec2(0.,0.)));
	float b = rand((ij+vec2(1.,0.)));
	float c = rand((ij+vec2(0.,1.)));
	float d = rand((ij+vec2(1.,1.)));
	float x1 = mix(a, b, xy.x);
	float x2 = mix(c, d, xy.x);
	return mix(x1, x2, xy.y);
}

void main () {
  vec3 base = texture2D(uTarget, vUv).xyz;
  vec3 noise = vec3(noise(vUv, 100.)/.9 + .1, 0.0, 0.0);
  // vec3 noise = vec3(1., 0., 0.);
  if (vUv.y < texelSize.y * y) {
    if (useMax) {
      gl_FragColor = vec4(max(base, noise), 1.0);
    } else {
      gl_FragColor = vec4(base + noise, 1.0);
    }
  } else {
    gl_FragColor = vec4(base, 1.0);
  }
}

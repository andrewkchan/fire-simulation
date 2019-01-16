precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uDensity;
uniform sampler2D uTemperature;
uniform sampler2D uFuel;
uniform float burnTemperature;

// Blackbody color palette. Handy for all kinds of things.
vec3 blackbody(float t){
  // t = tLow + (tHigh - tLow)*t;
  t *= (3000./burnTemperature); // Temperature range. Otherwise hardcoded from 0K to 4000K.

  // Planckian locus or black body locus approximated in CIE color space.
  float cx = (0.860117757 + 1.54118254e-4*t + 1.28641212e-7*t*t)/(1.0 + 8.42420235e-4*t + 7.08145163e-7*t*t);
  float cy = (0.317398726 + 4.22806245e-5*t + 4.20481691e-8*t*t)/(1.0 - 2.89741816e-5*t + 1.61456053e-7*t*t);

  // Converting the chromacity coordinates to XYZ tristimulus color space.
  float d = (2.*cx - 8.*cy + 4.);
  vec3 XYZ = vec3(3.*cx/d, 2.*cy/d, 1. - (3.*cx + 2.*cy)/d);

  // Converting XYZ color space to RGB: https://www.cs.rit.edu/~ncs/color/t_spectr.html
  vec3 RGB = mat3(3.240479, -0.969256, 0.055648, -1.537150, 1.875992, -0.204043,
                  -0.498535, 0.041556, 1.057311) * vec3(1./XYZ.y*XYZ.x, 1., 1./XYZ.y*XYZ.z);

  // Apply Stefan–Boltzmann's law to the RGB color
  return max(RGB, 0.)*pow(t*0.0004, 4.);
}

void main () {
  float temp = texture2D(uTemperature, vUv).x;
  float fuel = texture2D(uFuel, vUv).x;
  float visibility = (exp(10.*fuel)-exp(-10.*fuel))/(exp(10.*fuel)+exp(-10.*fuel));
  // float visibility = 1.;
  vec4 density = texture2D(uDensity, vUv);

  gl_FragColor = vec4(visibility*blackbody(temp), 1.0);
}

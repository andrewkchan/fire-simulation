precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uFuel;
uniform sampler2D uTemperature;
uniform float fuelScalar;
uniform float temperatureScalar;

void main () {
  float temp = temperatureScalar * texture2D(uTemperature, vUv).x;
  float fuel = fuelScalar * texture2D(uFuel, vUv).x;
  gl_FragColor = vec4(temp, fuel, 0.0, 1.0);
}

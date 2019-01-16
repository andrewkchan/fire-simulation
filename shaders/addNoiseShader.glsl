/*
Blends in procedural, time-evolving perlin noise to the given texture.
http://www.science-and-fiction.org/rendering/noise.html#perlin_noise
*/

precision highp float;
precision mediump sampler2D;

varying vec2 vUv;
uniform sampler2D uTarget; // target texture
uniform vec2 texelSize;
uniform float blendLevel;
uniform float time;

float rand3D(in vec3 co){
    return fract(sin(dot(co.xyz ,vec3(12.9898,78.233,144.7272))) * 43758.5453);
}
float simple_interpolate(in float a, in float b, in float x)
{
   return a + smoothstep(0.0,1.0,x) * (b-a);
}
float interpolatedNoise3D(in float x, in float y, in float z)
{
    float integer_x = x - fract(x);
    float fractional_x = x - integer_x;

    float integer_y = y - fract(y);
    float fractional_y = y - integer_y;

    float integer_z = z - fract(z);
    float fractional_z = z - integer_z;

    float v1 = rand3D(vec3(integer_x, integer_y, integer_z));
    float v2 = rand3D(vec3(integer_x+1.0, integer_y, integer_z));
    float v3 = rand3D(vec3(integer_x, integer_y+1.0, integer_z));
    float v4 = rand3D(vec3(integer_x+1.0, integer_y +1.0, integer_z));

    float v5 = rand3D(vec3(integer_x, integer_y, integer_z+1.0));
    float v6 = rand3D(vec3(integer_x+1.0, integer_y, integer_z+1.0));
    float v7 = rand3D(vec3(integer_x, integer_y+1.0, integer_z+1.0));
    float v8 = rand3D(vec3(integer_x+1.0, integer_y +1.0, integer_z+1.0));

    float i1 = simple_interpolate(v1,v5, fractional_z);
    float i2 = simple_interpolate(v2,v6, fractional_z);
    float i3 = simple_interpolate(v3,v7, fractional_z);
    float i4 = simple_interpolate(v4,v8, fractional_z);

    float ii1 = simple_interpolate(i1,i2,fractional_x);
    float ii2 = simple_interpolate(i3,i4,fractional_x);

    return simple_interpolate(ii1 , ii2 , fractional_y);
}
float Noise3D(in vec3 coord, in float wavelength)
{
   return interpolatedNoise3D(coord.x/wavelength, coord.y/wavelength, coord.z/wavelength);
}
void main() {
    vec3 st = vec3(vUv, fract(time) * 0.7);
    float L = texelSize.x;
    float noise = 0.25 * (Noise3D(st, L) + Noise3D(st, L * 2.) + Noise3D(st, L * 3.) + Noise3D(st, L * 4.));
    // float noise = Noise3D(st, L);
    float base = texture2D(uTarget, vUv).x;
    base += blendLevel * (noise - base);
    gl_FragColor = vec4(base, 0.0, 0.0, 1.0);
}

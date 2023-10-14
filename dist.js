(() => {
  // shaders/addNoiseShader.glsl
  var addNoiseShader_default = "/*\r\nBlends in procedural, time-evolving perlin noise to the given texture.\r\nhttp://www.science-and-fiction.org/rendering/noise.html#perlin_noise\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nuniform sampler2D uTarget; // target texture\r\nuniform vec2 texelSize;\r\nuniform float blendLevel;\r\nuniform float time;\r\n\r\nfloat rand3D(in vec3 co){\r\n    return fract(sin(dot(co.xyz ,vec3(12.9898,78.233,144.7272))) * 43758.5453);\r\n}\r\nfloat simple_interpolate(in float a, in float b, in float x)\r\n{\r\n   return a + smoothstep(0.0,1.0,x) * (b-a);\r\n}\r\nfloat interpolatedNoise3D(in float x, in float y, in float z)\r\n{\r\n    float integer_x = x - fract(x);\r\n    float fractional_x = x - integer_x;\r\n\r\n    float integer_y = y - fract(y);\r\n    float fractional_y = y - integer_y;\r\n\r\n    float integer_z = z - fract(z);\r\n    float fractional_z = z - integer_z;\r\n\r\n    float v1 = rand3D(vec3(integer_x, integer_y, integer_z));\r\n    float v2 = rand3D(vec3(integer_x+1.0, integer_y, integer_z));\r\n    float v3 = rand3D(vec3(integer_x, integer_y+1.0, integer_z));\r\n    float v4 = rand3D(vec3(integer_x+1.0, integer_y +1.0, integer_z));\r\n\r\n    float v5 = rand3D(vec3(integer_x, integer_y, integer_z+1.0));\r\n    float v6 = rand3D(vec3(integer_x+1.0, integer_y, integer_z+1.0));\r\n    float v7 = rand3D(vec3(integer_x, integer_y+1.0, integer_z+1.0));\r\n    float v8 = rand3D(vec3(integer_x+1.0, integer_y +1.0, integer_z+1.0));\r\n\r\n    float i1 = simple_interpolate(v1,v5, fractional_z);\r\n    float i2 = simple_interpolate(v2,v6, fractional_z);\r\n    float i3 = simple_interpolate(v3,v7, fractional_z);\r\n    float i4 = simple_interpolate(v4,v8, fractional_z);\r\n\r\n    float ii1 = simple_interpolate(i1,i2,fractional_x);\r\n    float ii2 = simple_interpolate(i3,i4,fractional_x);\r\n\r\n    return simple_interpolate(ii1 , ii2 , fractional_y);\r\n}\r\nfloat Noise3D(in vec3 coord, in float wavelength)\r\n{\r\n   return interpolatedNoise3D(coord.x/wavelength, coord.y/wavelength, coord.z/wavelength);\r\n}\r\nvoid main() {\r\n    vec3 st = vec3(vUv, fract(time) * 0.7);\r\n    float L = texelSize.x;\r\n    float noise = 0.25 * (Noise3D(st, L) + Noise3D(st, L * 2.) + Noise3D(st, L * 3.) + Noise3D(st, L * 4.));\r\n    // float noise = Noise3D(st, L);\r\n    float base = texture2D(uTarget, vUv).x;\r\n    base += blendLevel * (noise - base);\r\n    gl_FragColor = vec4(base, 0.0, 0.0, 1.0);\r\n}\r\n";

  // shaders/advectionManualFilteringShader.glsl
  var advectionManualFilteringShader_default = "/*\r\nAdvect a source field through the given velocity field with a manual interpolation function.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nuniform sampler2D uVelocity; // velocity texture.\r\nuniform sampler2D uSource; // source field texture (scalar or velocity field)\r\nuniform vec2 texelSize;\r\nuniform vec2 dyeTexelSize;\r\nuniform float dt;\r\nuniform float dissipation;\r\n\r\n/* bilinear interpolation function.\r\n@param sampler2D sam - Texture to do the interpolation.\r\n@param vec2 uv - uv coords.\r\n@param vec2 tsize - Texel (grid square) size.\r\n*/\r\nvec4 bilerp (in sampler2D sam, in vec2 uv, in vec2 tsize) {\r\n  vec2 st = uv / tsize - 0.5;\r\n\r\n  vec2 iuv = floor(st);\r\n  vec2 fuv = fract(st);\r\n\r\n  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);\r\n  vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);\r\n  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);\r\n  vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);\r\n\r\n  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);\r\n}\r\n\r\nvoid main () {\r\n  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;\r\n  gl_FragColor = dissipation * bilerp(uSource, coord, dyeTexelSize);\r\n  gl_FragColor.a = 1.0;\r\n}\r\n";

  // shaders/advectionShader.glsl
  var advectionShader_default = "/*\r\nAdvect a source field through a velocity field, assuming built-in interpolation.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nuniform sampler2D uVelocity;\r\nuniform sampler2D uSource;\r\nuniform vec2 texelSize;\r\nuniform float dt;\r\nuniform float dissipation;\r\n\r\nvoid main () {\r\n  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;\r\n  gl_FragColor = dissipation * texture2D(uSource, coord);\r\n  gl_FragColor.a = 1.0;\r\n}\r\n";

  // shaders/baseVertexShader.glsl
  var baseVertexShader_default = "precision highp float;\r\nprecision mediump sampler2D;\r\n\r\nattribute vec2 aPosition; // range from (-1.0, -1.0) to (1.0, 1.0)\r\nvarying vec2 vUv; // UV mapping (texture) coordinates.\r\nvarying vec2 vL;\r\nvarying vec2 vR;\r\nvarying vec2 vT;\r\nvarying vec2 vB;\r\nuniform vec2 texelSize;\r\n\r\nvoid main () {\r\n  vUv = aPosition * 0.5 + 0.5; // range from (0.0, 0.0) to (1.0, 1.0)\r\n\r\n  // get the uv coordinates surrounding the current texel.\r\n  vL = vUv - vec2(texelSize.x, 0.0); // left texel.\r\n  vR = vUv + vec2(texelSize.x, 0.0); // right texel.\r\n  vT = vUv + vec2(0.0, texelSize.y); // top texel.\r\n  vB = vUv - vec2(0.0, texelSize.y); // bottom texel.\r\n  gl_Position = vec4(aPosition, 0.0, 1.0);\r\n}\r\n";

  // shaders/buoyancyShader.glsl
  var buoyancyShader_default = "/*\r\nAdd impulse to a velocity field due to thermal buoyancy.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nuniform sampler2D uVelocity;\r\nuniform sampler2D uTemperature;\r\nuniform vec2 texelSize;\r\nuniform float dt;\r\nuniform float buoyancy; // buoyancy parameter.\r\n\r\nvoid main () {\r\n  float dTemp = texture2D(uTemperature, vUv).x;\r\n  vec2 impulse = dt * buoyancy * dTemp * vec2(0.0, 1.0);\r\n  vec2 vel = texture2D(uVelocity, vUv).xy;\r\n  gl_FragColor = vec4(vel + impulse, 0.0, 1.0);\r\n}\r\n";

  // shaders/clearShader.glsl
  var clearShader_default = "precision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nuniform sampler2D uTexture;\r\nuniform float value;\r\n\r\nvoid main () {\r\n  gl_FragColor = value * texture2D(uTexture, vUv);\r\n}\r\n";

  // shaders/combustionShader.glsl
  var combustionShader_default = "/*\r\nAdd temperature based on fuel, and apply cooling.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nuniform sampler2D uFuel;\r\nuniform sampler2D uTemperature;\r\nuniform sampler2D uNoise;\r\nuniform vec2 texelSize;\r\nuniform float dt;\r\nuniform float burnTemperature;\r\nuniform float noiseBlending;\r\nuniform float cooling; // cooling coefficient.\r\n\r\nfloat fuelTemperature (float fuel) {\r\n  return fuel * burnTemperature;\r\n}\r\n\r\nvoid main () {\r\n  float temp = texture2D(uTemperature, vUv).x;\r\n  float fuel = texture2D(uFuel, vUv).x;\r\n  float noise = 2.*(texture2D(uNoise, vUv).x - 0.5); // zero-mean noise.\r\n  // fuel += noise * noiseBlending;\r\n  // cool existing temperature.\r\n  temp = max(0.0, temp - dt * cooling * pow(temp / burnTemperature, 4.0));\r\n  // add more heat based on fuel.\r\n  temp = max(temp, fuelTemperature(fuel));\r\n  gl_FragColor = vec4(temp, 0.0, 0.0, 1.0);\r\n}\r\n";

  // shaders/curlShader.glsl
  var curlShader_default = "/*\r\nCompute the curl (vorticity) of a velocity field.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nvarying vec2 vL;\r\nvarying vec2 vR;\r\nvarying vec2 vT;\r\nvarying vec2 vB;\r\nuniform sampler2D uVelocity;\r\nuniform sampler2D uNoise;\r\nuniform float blendLevel;\r\n\r\nvoid main () {\r\n  float L = texture2D(uVelocity, vL).y;\r\n  float R = texture2D(uVelocity, vR).y;\r\n  float T = texture2D(uVelocity, vT).x;\r\n  float B = texture2D(uVelocity, vB).x;\r\n  float vorticity = (R - L) - (T - B);\r\n  float noise = 1000. * (texture2D(uNoise, vUv).x - 0.5); // scale 0-1 noise up to the right level.\r\n  vorticity += blendLevel * noise;\r\n  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);\r\n}\r\n";

  // shaders/debugFireShader.glsl
  var debugFireShader_default = "precision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nuniform sampler2D uFuel;\r\nuniform sampler2D uTemperature;\r\nuniform float fuelScalar;\r\nuniform float temperatureScalar;\r\n\r\nvoid main () {\r\n  float temp = temperatureScalar * texture2D(uTemperature, vUv).x;\r\n  float fuel = fuelScalar * texture2D(uFuel, vUv).x;\r\n  gl_FragColor = vec4(temp, fuel, 0.0, 1.0);\r\n}\r\n";

  // shaders/debugFloatShader.glsl
  var debugFloatShader_default = "precision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nuniform sampler2D uTexture;\r\nuniform float scalar;\r\n\r\nvoid main () {\r\n  float value = scalar * texture2D(uTexture, vUv).x;\r\n  gl_FragColor = vec4(value, value, value, 1.0);\r\n}\r\n";

  // shaders/displayShader.glsl
  var displayShader_default = "/*\r\nDisplay a texture.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nuniform sampler2D uTexture;\r\n\r\nvoid main () {\r\n  gl_FragColor = texture2D(uTexture, vUv);\r\n}\r\n";

  // shaders/displayFireShader.glsl
  var displayFireShader_default = "precision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nuniform sampler2D uDensity;\r\nuniform sampler2D uTemperature;\r\nuniform sampler2D uFuel;\r\nuniform float burnTemperature;\r\n\r\n// Blackbody color palette. Handy for all kinds of things.\r\nvec3 blackbody(float t){\r\n  // t = tLow + (tHigh - tLow)*t;\r\n  t *= (3000./burnTemperature); // Temperature range. Otherwise hardcoded from 0K to 4000K.\r\n\r\n  // Planckian locus or black body locus approximated in CIE color space.\r\n  float cx = (0.860117757 + 1.54118254e-4*t + 1.28641212e-7*t*t)/(1.0 + 8.42420235e-4*t + 7.08145163e-7*t*t);\r\n  float cy = (0.317398726 + 4.22806245e-5*t + 4.20481691e-8*t*t)/(1.0 - 2.89741816e-5*t + 1.61456053e-7*t*t);\r\n\r\n  // Converting the chromacity coordinates to XYZ tristimulus color space.\r\n  float d = (2.*cx - 8.*cy + 4.);\r\n  vec3 XYZ = vec3(3.*cx/d, 2.*cy/d, 1. - (3.*cx + 2.*cy)/d);\r\n\r\n  // Converting XYZ color space to RGB: https://www.cs.rit.edu/~ncs/color/t_spectr.html\r\n  vec3 RGB = mat3(3.240479, -0.969256, 0.055648, -1.537150, 1.875992, -0.204043,\r\n                  -0.498535, 0.041556, 1.057311) * vec3(1./XYZ.y*XYZ.x, 1., 1./XYZ.y*XYZ.z);\r\n\r\n  // Apply Stefan\u2013Boltzmann's law to the RGB color\r\n  return max(RGB, 0.)*pow(t*0.0004, 4.);\r\n}\r\n\r\nvoid main () {\r\n  float temp = texture2D(uTemperature, vUv).x;\r\n  float fuel = texture2D(uFuel, vUv).x;\r\n  float visibility = (exp(10.*fuel)-exp(-10.*fuel))/(exp(10.*fuel)+exp(-10.*fuel));\r\n  // float visibility = 1.;\r\n  vec4 density = texture2D(uDensity, vUv);\r\n\r\n  gl_FragColor = vec4(visibility*blackbody(temp), 1.0);\r\n}\r\n";

  // shaders/divergenceShader.glsl
  var divergenceShader_default = "/*\r\nComputes the divergence of a velocity field at the given point through finite differences.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nvarying vec2 vL;\r\nvarying vec2 vR;\r\nvarying vec2 vT;\r\nvarying vec2 vB;\r\nuniform sampler2D uVelocity;\r\n\r\nvec2 sampleVelocity (in vec2 uv) {\r\n  vec2 multiplier = vec2(1.0, 1.0);\r\n  if (uv.x < 0.0) { uv.x = 0.0; multiplier.x = -1.0; }\r\n  if (uv.x > 1.0) { uv.x = 1.0; multiplier.x = -1.0; }\r\n  if (uv.y < 0.0) { uv.y = 0.0; multiplier.y = -1.0; }\r\n  if (uv.y > 1.0) { uv.y = 1.0; multiplier.y = -1.0; }\r\n  return multiplier * texture2D(uVelocity, uv).xy;\r\n}\r\n\r\nvoid main () {\r\n  float L = sampleVelocity(vL).x;\r\n  float R = sampleVelocity(vR).x;\r\n  float T = sampleVelocity(vT).y;\r\n  float B = sampleVelocity(vB).y;\r\n  float div = 0.5 * (R - L + T - B);\r\n  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);\r\n}\r\n";

  // shaders/particlesAdvectionShader.glsl
  var particlesAdvectionShader_default = "/*\r\nAdvect an array of particles through a velocity field, assuming built-in interpolation.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv; // for particles, each texel is a separate particle.\r\nuniform sampler2D uVelocity;\r\nuniform vec2 texelSize; // simulation grid size.\r\nuniform float dt;\r\nuniform sampler2D particleData; // texture where each texel color -> (particle position, particle velocity).\r\nuniform float dissipation; // velocity dissipation.\r\n\r\nvoid main () {\r\n  vec2 p = texture2D(particleData, vUv).xy; // particle position (clip space).\r\n  vec2 v = texture2D(particleData, vUv).zw; // particle velocity.\r\n\r\n  vec2 vf = texture2D(uVelocity, (p + 1.)*0.5).xy * texelSize.x;\r\n  v += (vf - v) * dissipation;\r\n  p += dt * v;\r\n\r\n  gl_FragColor = vec4(p, v);\r\n}\r\n";

  // shaders/particlesRenderShader.glsl
  var particlesRenderShader_default = "/*\r\nRender particles from a particle array to a texture where each particle is the given color.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nuniform vec3 color;\r\n\r\nvoid main () {\r\n  gl_FragColor = vec4(color, 1.0);\r\n}\r\n";

  // shaders/particlesResetData.glsl
  var particlesResetData_default = "/*\r\nReset the position + velocity of any particles that have reached the end of their lifespans.\r\nCall this shader before resetting their lifespans!\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv; // for particles, each texel is a separate particle.\r\nuniform vec2 initialPosition;\r\nuniform vec2 initialVelocity;\r\nuniform sampler2D particleData; // texture where each texel color -> (particle position, particle velocity).\r\nuniform sampler2D particleLifespans; // texture where each texel color -> (particle lifespan, 0...)\r\n\r\nvec2 random2(vec2 st){\r\n    st = vec2( dot(st,vec2(127.1,311.7)),\r\n              dot(st,vec2(269.5,183.3)) );\r\n    return -1.0 + 2.0*fract(sin(st)*43758.5453123);\r\n}\r\nvoid main () {\r\n  float life = texture2D(particleLifespans, vUv).x;\r\n  // each particle ID --> some different perturbation of initial conditions.\r\n  vec2 perturbation = 0.05 * random2(vUv);\r\n\r\n  vec2 p = texture2D(particleData, vUv).xy; // particle position (clip space).\r\n  vec2 v = texture2D(particleData, vUv).zw; // particle velocity.\r\n  if (life <= 0.0) {\r\n    gl_FragColor = vec4(initialPosition + perturbation, initialVelocity + perturbation);\r\n  } else {\r\n    gl_FragColor = texture2D(particleData, vUv);\r\n  }\r\n}\r\n";

  // shaders/particlesResetLifespan.glsl
  var particlesResetLifespan_default = "/*\r\nReset the lifespan of any particles that have reached the end of their lifespans.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv; // for particles, each texel is a separate particle.\r\nuniform float initialLifespan;\r\nuniform sampler2D particleLifespans; // texture where each texel color -> (particle lifespan, 0...)\r\n\r\nfloat rand (vec2 st) {\r\n  return fract(sin(dot(st.xy,\r\n                       vec2(12.9898,78.233)))*\r\n      43758.5453123);\r\n}\r\nvoid main () {\r\n  float life = texture2D(particleLifespans, vUv).x;\r\n  // each particle ID --> some different perturbation of initial conditions.\r\n  float perturbation = rand(vUv) * 0.1;\r\n  if (life <= 0.0) {\r\n    gl_FragColor = vec4(initialLifespan + perturbation * initialLifespan, 0., 0., 1.);\r\n  } else {\r\n    gl_FragColor = vec4(life, 0., 0., 1.);\r\n  }\r\n}\r\n";

  // shaders/particlesStepLifespan.glsl
  var particlesStepLifespan_default = "/*\r\nReduce particle lifespans by dt.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv; // for particles, each texel is a separate particle.\r\nuniform float dt;\r\nuniform sampler2D particleLifespans; // texture where each texel color -> (particle lifespan, 0...)\r\n\r\nvoid main () {\r\n  float life = texture2D(particleLifespans, vUv).x;\r\n  gl_FragColor = vec4(life - dt, 0., 0., 1.);\r\n}\r\n";

  // shaders/particlesVertexShader.glsl
  var particlesVertexShader_default = "/*\r\nTransform a particle array texture into an array of vertices to render.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nuniform sampler2D particleData;\r\nuniform float size;\r\nattribute vec2 particleUV;\r\nvarying vec2 vUv; // each texel maps to its own particle.\r\n\r\nvoid main () {\r\n  vec2 p = texture2D(particleData, particleUV).xy;\r\n  vec2 v = texture2D(particleData, particleUV).zw;\r\n  gl_PointSize = size;\r\n  gl_Position = vec4(p, 0.0, 1.0);\r\n}\r\n";

  // shaders/pressureIterationShader.glsl
  var pressureIterationShader_default = "/*\r\nCompute a single Jacobi iteration to approximately solve the Poisson equation\r\nfor pressure.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nvarying vec2 vL;\r\nvarying vec2 vR;\r\nvarying vec2 vT;\r\nvarying vec2 vB;\r\nuniform sampler2D uPressure;\r\nuniform sampler2D uDivergence;\r\n\r\nvec2 boundary (in vec2 uv) {\r\n  uv = min(max(uv, 0.0), 1.0);\r\n  return uv;\r\n}\r\n\r\nvoid main () {\r\n  float L = texture2D(uPressure, boundary(vL)).x;\r\n  float R = texture2D(uPressure, boundary(vR)).x;\r\n  float T = texture2D(uPressure, boundary(vT)).x;\r\n  float B = texture2D(uPressure, boundary(vB)).x;\r\n  float divergence = texture2D(uDivergence, vUv).x;\r\n  float pressure = (L + R + B + T - divergence) * 0.25;\r\n  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);\r\n}\r\n";

  // shaders/projectionShader.glsl
  var projectionShader_default = "precision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nvarying vec2 vL;\r\nvarying vec2 vR;\r\nvarying vec2 vT;\r\nvarying vec2 vB;\r\nuniform sampler2D uPressure;\r\nuniform sampler2D uVelocity;\r\n\r\n/*\r\nClamp a vec2 to the range(0.0, 1.0).\r\n*/\r\nvec2 boundary (in vec2 uv) {\r\n  uv = min(max(uv, 0.0), 1.0);\r\n  return uv;\r\n}\r\n\r\nvoid main () {\r\n  float L = texture2D(uPressure, boundary(vL)).x;\r\n  float R = texture2D(uPressure, boundary(vR)).x;\r\n  float T = texture2D(uPressure, boundary(vT)).x;\r\n  float B = texture2D(uPressure, boundary(vB)).x;\r\n  vec2 velocity = texture2D(uVelocity, vUv).xy;\r\n\r\n  // subtract the pressure gradient as computed by finite differences.\r\n  velocity.xy -= vec2(R - L, T - B);\r\n  \r\n  gl_FragColor = vec4(velocity, 0.0, 1.0);\r\n}\r\n";

  // shaders/rowShader.glsl
  var rowShader_default = "/*\r\nFill a texel row below the y-coordinate with noise in the target texture.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nuniform sampler2D uTarget; // target texture to create the row\r\nuniform float y; // y-coordinate of the row (in grid coordinates).\r\nuniform bool useMax; // if TRUE, output is max rather than additive.\r\nuniform vec2 texelSize; // simulation grid width.\r\n\r\nfloat rand (vec2 st) {\r\n  return fract(sin(dot(st.xy,\r\n                       vec2(12.9898,78.233)))*\r\n      43758.5453123);\r\n}\r\n\r\nfloat noise(vec2 p, float freq){\r\n	float unit = 256.*texelSize.x/freq;\r\n	vec2 ij = floor(p/unit);\r\n	vec2 xy = mod(p,unit)/unit;\r\n	xy = .5*(1.-cos(3.1415926535*xy));\r\n	float a = rand((ij+vec2(0.,0.)));\r\n	float b = rand((ij+vec2(1.,0.)));\r\n	float c = rand((ij+vec2(0.,1.)));\r\n	float d = rand((ij+vec2(1.,1.)));\r\n	float x1 = mix(a, b, xy.x);\r\n	float x2 = mix(c, d, xy.x);\r\n	return mix(x1, x2, xy.y);\r\n}\r\n\r\nvoid main () {\r\n  vec3 base = texture2D(uTarget, vUv).xyz;\r\n  vec3 noise = vec3(noise(vUv, 100.)/.9 + .1, 0.0, 0.0);\r\n  // vec3 noise = vec3(1., 0., 0.);\r\n  if (vUv.y < texelSize.y * y) {\r\n    if (useMax) {\r\n      gl_FragColor = vec4(max(base, noise), 1.0);\r\n    } else {\r\n      gl_FragColor = vec4(base + noise, 1.0);\r\n    }\r\n  } else {\r\n    gl_FragColor = vec4(base, 1.0);\r\n  }\r\n}\r\n";

  // shaders/splatShader.glsl
  var splatShader_default = "/*\r\nGiven uniforms point, color, radius, uTarget, aspectRatio, create a gaussian splat\r\nat the point with the given color and radius in the target texture.\r\n*/\r\n\r\nprecision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nuniform sampler2D uTarget; // target texture to create the splat\r\nuniform float aspectRatio;\r\nuniform vec3 color; // color of the splat\r\nuniform vec2 point; // x, y point to create the splat\r\nuniform float radius; // radius of the splat\r\nuniform bool useMax; // if TRUE, output is max rather than additive.\r\n\r\nvoid main () {\r\n  vec2 p = vUv - point.xy;\r\n  p.x *= aspectRatio;\r\n  vec3 splat = exp(-dot(p, p) / radius) * color; // gaussian splat.\r\n  vec3 base = texture2D(uTarget, vUv).xyz;\r\n  if (useMax) {\r\n    gl_FragColor = vec4(max(base, splat), 1.0);\r\n  } else {\r\n    gl_FragColor = vec4(base + splat, 1.0);\r\n  }\r\n}\r\n";

  // shaders/vorticityConfinementShader.glsl
  var vorticityConfinementShader_default = "precision highp float;\r\nprecision mediump sampler2D;\r\n\r\nvarying vec2 vUv;\r\nvarying vec2 vL;\r\nvarying vec2 vR;\r\nvarying vec2 vT;\r\nvarying vec2 vB;\r\nuniform sampler2D uVelocity;\r\nuniform sampler2D uCurl;\r\nuniform float confinement; // vorticity confinement constant.\r\nuniform float dt;\r\n\r\nvoid main () {\r\n  float L = texture2D(uCurl, vL).x;\r\n  float R = texture2D(uCurl, vR).x;\r\n  float T = texture2D(uCurl, vT).x;\r\n  float B = texture2D(uCurl, vB).x;\r\n  float C = texture2D(uCurl, vUv).x;\r\n\r\n  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));\r\n  force /= length(force) + 0.0001;\r\n  force *= confinement * C;\r\n  force.y *= -1.0;\r\n\r\n  vec2 vel = texture2D(uVelocity, vUv).xy;\r\n  gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);\r\n}\r\n";

  // main.js
  var canvas = document.getElementsByTagName("canvas")[0];
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  var config = {
    BUOYANCY: 0.2,
    BURN_TEMPERATURE: 1700,
    CONFINEMENT: 15,
    COOLING: 3e3,
    DISPLAY_MODE: 0,
    DYE_RESOLUTION: 512,
    FUEL_DISSIPATION: 0.92,
    DENSITY_DISSIPATION: 0.99,
    NOISE_BLENDING: 0.5,
    NOISE_VOLATILITY: 0.1,
    PRESSURE_DISSIPATION: 0.8,
    PRESSURE_ITERATIONS: 20,
    SIM_RESOLUTION: 256,
    SPLAT_RADIUS: 0.7,
    VELOCITY_DISSIPATION: 0.98
  };
  var DISPLAY_MODES = ["Normal", "DebugFire", "DebugTemperature", "DebugFuel", "DebugPressure", "DebugDensity", "DebugNoise"];
  var LAST_TEX_ID = 0;
  function getWebGLContext(canvas2) {
    const params = {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false
    };
    let gl2 = canvas2.getContext("webgl2", params);
    const isWebGL2 = !!gl2;
    if (!isWebGL2) {
      gl2 = canvas2.getContext("webgl", params) || canvas2.getContext("experimental-webgl", params);
    }
    let halfFloat;
    let supportLinearFiltering;
    if (isWebGL2) {
      gl2.getExtension("EXT_color_buffer_float");
      supportLinearFiltering = gl2.getExtension("OES_texture_float_linear");
    } else {
      halfFloat = gl2.getExtension("OES_texture_half_float");
      supportLinearFiltering = gl2.getExtension("OES_texture_half_float_linear");
    }
    gl2.clearColor(0, 0, 0, 1);
    const halfFloatTexType = isWebGL2 ? gl2.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
    let formatRGBA;
    let formatRG;
    let formatR;
    if (isWebGL2) {
      formatRGBA = getSupportedFormat(gl2, gl2.RGBA16F, gl2.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(gl2, gl2.RG16F, gl2.RG, halfFloatTexType);
      formatR = getSupportedFormat(gl2, gl2.R16F, gl2.RED, halfFloatTexType);
    } else {
      formatRGBA = getSupportedFormat(gl2, gl2.RGBA, gl2.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(gl2, gl2.RGBA, gl2.RGBA, halfFloatTexType);
      formatR = getSupportedFormat(gl2, gl2.RGBA, gl2.RGBA, halfFloatTexType);
    }
    if (formatRGBA == null) {
      console.log(isWebGL2 ? "webgl2" : "webgl", "not supported");
    } else {
      console.log(isWebGL2 ? "webgl2" : "webgl", "supported");
    }
    return {
      gl: gl2,
      ext: {
        formatRGBA,
        formatRG,
        formatR,
        halfFloatTexType,
        supportLinearFiltering
      }
    };
  }
  function getSupportedFormat(gl2, internalFormat, format, type) {
    if (!supportRenderTextureFormat(gl2, internalFormat, format, type)) {
      switch (internalFormat) {
        case gl2.R16F:
          return getSupportedFormat(gl2, gl2.RG16F, gl2.RG, type);
        case gl2.RG16F:
          return getSupportedFormat(gl2, gl2.RGBA16F, gl2.RGBA, type);
        default:
          return null;
      }
    }
    return {
      internalFormat,
      format
    };
  }
  function supportRenderTextureFormat(gl2, internalFormat, format, type) {
    let texture = gl2.createTexture();
    gl2.bindTexture(gl2.TEXTURE_2D, texture);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MIN_FILTER, gl2.NEAREST);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MAG_FILTER, gl2.NEAREST);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_S, gl2.CLAMP_TO_EDGE);
    gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_T, gl2.CLAMP_TO_EDGE);
    gl2.texImage2D(gl2.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    let fbo = gl2.createFramebuffer();
    gl2.bindFramebuffer(gl2.FRAMEBUFFER, fbo);
    gl2.framebufferTexture2D(gl2.FRAMEBUFFER, gl2.COLOR_ATTACHMENT0, gl2.TEXTURE_2D, texture, 0);
    const status = gl2.checkFramebufferStatus(gl2.FRAMEBUFFER);
    if (status != gl2.FRAMEBUFFER_COMPLETE) {
      return false;
    }
    return true;
  }
  var { gl, ext } = getWebGLContext(canvas);
  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(shader);
    }
    return shader;
  }
  var shaders = {
    addNoiseShader: compileShader(gl.FRAGMENT_SHADER, addNoiseShader_default),
    advectionManualFilteringShader: compileShader(gl.FRAGMENT_SHADER, advectionManualFilteringShader_default),
    advectionShader: compileShader(gl.FRAGMENT_SHADER, advectionShader_default),
    baseVertexShader: compileShader(gl.VERTEX_SHADER, baseVertexShader_default),
    buoyancyShader: compileShader(gl.FRAGMENT_SHADER, buoyancyShader_default),
    clearShader: compileShader(gl.FRAGMENT_SHADER, clearShader_default),
    combustionShader: compileShader(gl.FRAGMENT_SHADER, combustionShader_default),
    curlShader: compileShader(gl.FRAGMENT_SHADER, curlShader_default),
    debugFireShader: compileShader(gl.FRAGMENT_SHADER, debugFireShader_default),
    debugFloatShader: compileShader(gl.FRAGMENT_SHADER, debugFloatShader_default),
    displayShader: compileShader(gl.FRAGMENT_SHADER, displayShader_default),
    displayFireShader: compileShader(gl.FRAGMENT_SHADER, displayFireShader_default),
    divergenceShader: compileShader(gl.FRAGMENT_SHADER, divergenceShader_default),
    particlesAdvectionShader: compileShader(gl.FRAGMENT_SHADER, particlesAdvectionShader_default),
    particlesRenderShader: compileShader(gl.FRAGMENT_SHADER, particlesRenderShader_default),
    particlesResetDataShader: compileShader(gl.FRAGMENT_SHADER, particlesResetData_default),
    particlesResetLifespanShader: compileShader(gl.FRAGMENT_SHADER, particlesResetLifespan_default),
    particlesStepLifespanShader: compileShader(gl.FRAGMENT_SHADER, particlesStepLifespan_default),
    particlesVertexShader: compileShader(gl.VERTEX_SHADER, particlesVertexShader_default),
    pressureIterationShader: compileShader(gl.FRAGMENT_SHADER, pressureIterationShader_default),
    projectionShader: compileShader(gl.FRAGMENT_SHADER, projectionShader_default),
    rowShader: compileShader(gl.FRAGMENT_SHADER, rowShader_default),
    splatShader: compileShader(gl.FRAGMENT_SHADER, splatShader_default),
    vorticityConfinementShader: compileShader(gl.FRAGMENT_SHADER, vorticityConfinementShader_default)
  };
  var GLProgram = class {
    constructor(vertexShader, fragmentShader) {
      this.uniforms = {};
      this.program = gl.createProgram();
      gl.attachShader(this.program, vertexShader);
      gl.attachShader(this.program, fragmentShader);
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        throw gl.getProgramInfoLog(this.program);
      }
      const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < uniformCount; i++) {
        const uniformName = gl.getActiveUniform(this.program, i).name;
        this.uniforms[uniformName] = gl.getUniformLocation(this.program, uniformName);
      }
    }
    bind() {
      gl.useProgram(this.program);
    }
  };
  var blit = (() => {
    const quadVertexBuffer = gl.createBuffer();
    const quadElementBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadElementBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    return (destination) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexBuffer);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  })();
  function initFramebuffers() {
    let simRes = getResolution(config.SIM_RESOLUTION);
    let dyeRes = getResolution(config.DYE_RESOLUTION);
    simWidth = simRes.width;
    simHeight = simRes.height;
    dyeWidth = dyeRes.width;
    dyeHeight = dyeRes.height;
    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    curl = createFBO(
      simWidth,
      simHeight,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );
    density = createDoubleFBO(
      dyeWidth,
      dyeHeight,
      rgba.internalFormat,
      rgba.format,
      texType,
      ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST
    );
    divergence = createFBO(
      simWidth,
      simHeight,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );
    fuel = createDoubleFBO(
      simWidth,
      simHeight,
      r.internalFormat,
      r.format,
      texType,
      ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST
    );
    noise = createDoubleFBO(
      simWidth,
      simHeight,
      r.internalFormat,
      r.format,
      texType,
      ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST
    );
    pressure = createDoubleFBO(
      simWidth,
      simHeight,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );
    temperature = createDoubleFBO(
      simWidth,
      simHeight,
      r.internalFormat,
      r.format,
      texType,
      ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST
    );
    velocity = createDoubleFBO(
      simWidth,
      simHeight,
      rg.internalFormat,
      rg.format,
      texType,
      ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST
    );
  }
  function getResolution(resolution) {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1) {
      aspectRatio = 1 / aspectRatio;
    }
    let max = resolution * aspectRatio;
    let min = resolution;
    if (gl.drawingBufferWidth > gl.drawingBufferHeight) {
      return { width: max, height: min };
    } else {
      return { width: min, height: max };
    }
  }
  function createFBO(w, h, internalFormat, format, type, filter) {
    const texId = LAST_TEX_ID++;
    gl.activeTexture(gl.TEXTURE0 + texId);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      texture,
      fbo,
      texId
    };
  }
  function createDoubleFBO(w, h, internalFormat, format, type, filter) {
    let fbo1 = createFBO(w, h, internalFormat, format, type, filter);
    let fbo2 = createFBO(w, h, internalFormat, format, type, filter);
    return {
      get read() {
        return fbo1;
      },
      get write() {
        return fbo2;
      },
      swap() {
        let temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      }
    };
  }
  function update() {
    resizeCanvas();
    input();
    step(0.016);
    render();
    requestAnimationFrame(update);
  }
  function input() {
    gl.viewport(0, 0, simWidth, simHeight);
    rowProgram.bind();
    gl.uniform2f(rowProgram.uniforms.texelSize, 1 / simWidth, 1 / simHeight);
    gl.uniform1f(rowProgram.uniforms.y, 10);
    gl.uniform1i(rowProgram.uniforms.uTarget, fuel.read.texId);
    gl.uniform1f(rowProgram.uniforms.useMax, true);
    blit(fuel.write.fbo);
    fuel.swap();
    for (let i = 0; i < pointers.length; i++) {
      const pointer = pointers[i];
      if (pointer.moved) {
        splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color);
        pointer.moved = false;
      }
    }
  }
  function resizeCanvas() {
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      initFramebuffers();
    }
  }
  function render() {
    let width = gl.drawingBufferWidth;
    let height = gl.drawingBufferHeight;
    gl.viewport(0, 0, width, height);
    switch (DISPLAY_MODES[config.DISPLAY_MODE]) {
      case "Normal": {
        displayFireProgram.bind();
        gl.uniform1i(displayFireProgram.uniforms.uDensity, density.read.texId);
        gl.uniform1i(displayFireProgram.uniforms.uTemperature, temperature.read.texId);
        gl.uniform1i(displayFireProgram.uniforms.uFuel, fuel.read.texId);
        gl.uniform1f(displayFireProgram.uniforms.burnTemperature, config.BURN_TEMPERATURE);
        blit(null);
        fireSources.forEach((fireSource) => {
          fireSource.renderParticles(width, height, null, { r: 1, g: 1, b: 1 });
        });
        break;
      }
      case "DebugFire": {
        debugFireProgram.bind();
        gl.uniform1i(debugFireProgram.uniforms.uFuel, fuel.read.texId);
        gl.uniform1i(debugFireProgram.uniforms.uTemperature, temperature.read.texId);
        gl.uniform1f(debugFireProgram.uniforms.temperatureScalar, 1e-3);
        gl.uniform1f(debugFireProgram.uniforms.fuelScalar, 1);
        blit(null);
        break;
      }
      case "DebugTemperature": {
        debugFloatProgram.bind();
        gl.uniform1i(debugFloatProgram.uniforms.uTexture, temperature.read.texId);
        gl.uniform1f(debugFloatProgram.uniforms.scalar, 1e-3);
        blit(null);
        break;
      }
      case "DebugFuel": {
        debugFloatProgram.bind();
        gl.uniform1i(debugFloatProgram.uniforms.uTexture, fuel.read.texId);
        gl.uniform1f(debugFloatProgram.uniforms.scalar, 1);
        blit(null);
        break;
      }
      case "DebugPressure": {
        debugFloatProgram.bind();
        gl.uniform1i(debugFloatProgram.uniforms.uTexture, pressure.read.texId);
        gl.uniform1f(debugFloatProgram.uniforms.scalar, 1);
        blit(null);
        break;
      }
      case "DebugNoise": {
        debugFloatProgram.bind();
        gl.uniform1i(debugFloatProgram.uniforms.uTexture, noise.read.texId);
        gl.uniform1f(debugFloatProgram.uniforms.scalar, 1);
        blit(null);
        break;
      }
      default: {
        displayProgram.bind();
        gl.uniform1i(displayProgram.uniforms.uTexture, density.read.texId);
        blit(null);
        break;
      }
    }
    document.getElementById("debug-box").innerHTML = DISPLAY_MODES[config.DISPLAY_MODE];
  }
  function splat(x, y, dx, dy, color) {
    gl.viewport(0, 0, simWidth, simHeight);
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.texId);
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x / canvas.width, 1 - y / canvas.height);
    gl.uniform3f(splatProgram.uniforms.color, dx, -dy, 1);
    gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS / 100);
    gl.uniform1f(splatProgram.uniforms.useMax, false);
    blit(velocity.write.fbo);
    velocity.swap();
    gl.uniform1i(splatProgram.uniforms.uTarget, fuel.read.texId);
    gl.uniform3f(splatProgram.uniforms.color, 1, 0, 0);
    gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS / 100);
    gl.uniform1f(splatProgram.uniforms.useMax, true);
    blit(fuel.write.fbo);
    fuel.swap();
    gl.viewport(0, 0, dyeWidth, dyeHeight);
    gl.uniform1i(splatProgram.uniforms.uTarget, density.read.texId);
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS / 100);
    gl.uniform1f(splatProgram.uniforms.useMax, false);
    blit(density.write.fbo);
    density.swap();
  }
  var pointers = [new pointerPrototype()];
  var fireSources = [];
  var simWidth;
  var simHeight;
  var dyeWidth;
  var dyeHeight;
  var curl;
  var density;
  var divergence;
  var fuel;
  var noise;
  var pressure;
  var temperature;
  var velocity;
  var addNoiseProgram;
  var advectionProgram;
  var buoyancyProgram;
  var clearProgram;
  var combustionProgram;
  var curlProgram;
  var debugFireProgram;
  var debugFloatProgram;
  var displayProgram;
  var displayFireProgram;
  var divergenceProgram;
  var particlesAdvectionProgram;
  var particlesRenderProgram;
  var particlesResetDataProgram;
  var particlesResetLifespanProgram;
  var particlesStepLifespanProgram;
  var pressureIterationProgram;
  var projectionProgram;
  var rowProgram;
  var splatProgram;
  var vorticityConfinementProgram;
  function step(dt) {
    gl.viewport(0, 0, simWidth, simHeight);
    fireSources.forEach((fireSource) => {
      fireSource.renderParticles(simWidth, simHeight, fuel.read.fbo, { r: 1, g: 0, b: 0 });
    });
    combustionProgram.bind();
    gl.uniform2f(combustionProgram.uniforms.texelSize, 1 / simWidth, 1 / simHeight);
    gl.uniform1i(combustionProgram.uniforms.uFuel, fuel.read.texId);
    gl.uniform1i(combustionProgram.uniforms.uTemperature, temperature.read.texId);
    gl.uniform1i(combustionProgram.uniforms.uNoise, noise.read.texId);
    gl.uniform1f(combustionProgram.uniforms.noiseBlending, config.NOISE_BLENDING);
    gl.uniform1f(combustionProgram.uniforms.burnTemperature, config.BURN_TEMPERATURE);
    gl.uniform1f(combustionProgram.uniforms.cooling, config.COOLING);
    gl.uniform1f(combustionProgram.uniforms.dt, dt);
    blit(temperature.write.fbo);
    temperature.swap();
    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.texelSize, 1 / simWidth, 1 / simHeight);
    if (!ext.supportLinearFiltering) {
      gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, 1 / simWidth, 1 / simHeight);
    }
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.texId);
    gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read.texId);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    blit(velocity.write.fbo);
    velocity.swap();
    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, 1 / simWidth, 1 / simHeight);
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.texId);
    gl.uniform1i(curlProgram.uniforms.uNoise, noise.read.texId);
    gl.uniform1f(curlProgram.uniforms.blendLevel, config.NOISE_BLENDING);
    blit(curl.fbo);
    vorticityConfinementProgram.bind();
    gl.uniform2f(vorticityConfinementProgram.uniforms.texelSize, 1 / simWidth, 1 / simHeight);
    gl.uniform1i(vorticityConfinementProgram.uniforms.uVelocity, velocity.read.texId);
    gl.uniform1i(vorticityConfinementProgram.uniforms.uCurl, curl.texId);
    gl.uniform1f(vorticityConfinementProgram.uniforms.confinement, config.CONFINEMENT);
    gl.uniform1f(vorticityConfinementProgram.uniforms.dt, dt);
    blit(velocity.write.fbo);
    velocity.swap();
    buoyancyProgram.bind();
    gl.uniform2f(buoyancyProgram.uniforms.texelSize, 1 / simWidth, 1 / simHeight);
    gl.uniform1i(buoyancyProgram.uniforms.uVelocity, velocity.read.texId);
    gl.uniform1i(buoyancyProgram.uniforms.uTemperature, temperature.read.texId);
    gl.uniform1f(buoyancyProgram.uniforms.buoyancy, config.BUOYANCY);
    gl.uniform1f(buoyancyProgram.uniforms.dt, dt);
    blit(velocity.write.fbo);
    velocity.swap();
    clearProgram.bind();
    let pressureTexId = pressure.read.texId;
    gl.activeTexture(gl.TEXTURE0 + pressureTexId);
    gl.bindTexture(gl.TEXTURE_2D, pressure.read.texture);
    gl.uniform1i(clearProgram.uniforms.uTexture, pressureTexId);
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE_DISSIPATION);
    blit(pressure.write.fbo);
    pressure.swap();
    gl.viewport(0, 0, simWidth, simHeight);
    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, 1 / simWidth, 1 / simHeight);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.texId);
    blit(divergence.fbo);
    pressureIterationProgram.bind();
    gl.uniform1i(pressureIterationProgram.uniforms.uPressure, pressureTexId);
    gl.uniform2f(pressureIterationProgram.uniforms.texelSize, 1 / simWidth, 1 / simHeight);
    gl.uniform1i(pressureIterationProgram.uniforms.uDivergence, divergence.texId);
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.bindTexture(gl.TEXTURE_2D, pressure.read.texture);
      blit(pressure.write.fbo);
      pressure.swap();
    }
    projectionProgram.bind();
    gl.uniform2f(projectionProgram.uniforms.texelSize, 1 / simWidth, 1 / simHeight);
    gl.uniform1i(projectionProgram.uniforms.uPressure, pressure.read.texId);
    gl.uniform1i(projectionProgram.uniforms.uVelocity, velocity.read.texId);
    blit(velocity.write.fbo);
    velocity.swap();
    advectionProgram.bind();
    gl.viewport(0, 0, dyeWidth, dyeHeight);
    if (!ext.supportLinearFiltering) {
      gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, 1 / dyeWidth, 1 / dyeHeight);
    }
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.texId);
    gl.uniform1i(advectionProgram.uniforms.uSource, density.read.texId);
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
    blit(density.write.fbo);
    density.swap();
    gl.viewport(0, 0, simWidth, simHeight);
    if (!ext.supportLinearFiltering) {
      gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, 1 / simWidth, 1 / simHeight);
    }
    gl.uniform1i(advectionProgram.uniforms.uSource, temperature.read.texId);
    gl.uniform1f(advectionProgram.uniforms.dissipation, 1);
    blit(temperature.write.fbo);
    temperature.swap();
    gl.uniform1i(advectionProgram.uniforms.uSource, fuel.read.texId);
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.FUEL_DISSIPATION);
    blit(fuel.write.fbo);
    fuel.swap();
    gl.uniform1i(advectionProgram.uniforms.uSource, noise.read.texId);
    gl.uniform1f(advectionProgram.uniforms.dissipation, 1);
    blit(noise.write.fbo);
    noise.swap();
    addNoiseProgram.bind();
    gl.uniform2f(addNoiseProgram.uniforms.texelSize, 1 / simWidth, 1 / simHeight);
    gl.uniform1f(addNoiseProgram.uniforms.time, (/* @__PURE__ */ new Date()).getTime() / 1e4 % 1);
    gl.uniform1i(addNoiseProgram.uniforms.uTarget, noise.read.texId);
    gl.uniform1f(addNoiseProgram.uniforms.blendLevel, config.NOISE_VOLATILITY);
    blit(noise.write.fbo);
    noise.swap();
    fireSources.forEach((fireSource) => fireSource.step(dt));
  }
  function main() {
    advectionProgram = new GLProgram(
      shaders.baseVertexShader,
      ext.supportLinearFiltering ? shaders.advectionShader : shaders.advectionManualFilteringShader
    );
    addNoiseProgram = new GLProgram(shaders.baseVertexShader, shaders.addNoiseShader);
    buoyancyProgram = new GLProgram(shaders.baseVertexShader, shaders.buoyancyShader);
    clearProgram = new GLProgram(shaders.baseVertexShader, shaders.clearShader);
    combustionProgram = new GLProgram(shaders.baseVertexShader, shaders.combustionShader);
    curlProgram = new GLProgram(shaders.baseVertexShader, shaders.curlShader);
    debugFireProgram = new GLProgram(shaders.baseVertexShader, shaders.debugFireShader);
    debugFloatProgram = new GLProgram(shaders.baseVertexShader, shaders.debugFloatShader);
    displayProgram = new GLProgram(shaders.baseVertexShader, shaders.displayShader);
    displayFireProgram = new GLProgram(shaders.baseVertexShader, shaders.displayFireShader);
    divergenceProgram = new GLProgram(shaders.baseVertexShader, shaders.divergenceShader);
    particlesAdvectionProgram = new GLProgram(shaders.baseVertexShader, shaders.particlesAdvectionShader);
    particlesRenderProgram = new GLProgram(shaders.particlesVertexShader, shaders.particlesRenderShader);
    particlesResetDataProgram = new GLProgram(shaders.baseVertexShader, shaders.particlesResetDataShader);
    particlesResetLifespanProgram = new GLProgram(shaders.baseVertexShader, shaders.particlesResetLifespanShader);
    particlesStepLifespanProgram = new GLProgram(shaders.baseVertexShader, shaders.particlesStepLifespanShader);
    pressureIterationProgram = new GLProgram(shaders.baseVertexShader, shaders.pressureIterationShader);
    projectionProgram = new GLProgram(shaders.baseVertexShader, shaders.projectionShader);
    rowProgram = new GLProgram(shaders.baseVertexShader, shaders.rowShader);
    splatProgram = new GLProgram(shaders.baseVertexShader, shaders.splatShader);
    vorticityConfinementProgram = new GLProgram(shaders.baseVertexShader, shaders.vorticityConfinementShader);
    initFramebuffers();
    addNoiseProgram.bind();
    gl.uniform2f(addNoiseProgram.uniforms.texelSize, 1 / simWidth, 1 / simHeight);
    gl.uniform1f(addNoiseProgram.uniforms.time, (/* @__PURE__ */ new Date()).getTime() / 1e6 % 1);
    gl.uniform1i(addNoiseProgram.uniforms.uTarget, noise.read.texId);
    gl.uniform1f(addNoiseProgram.uniforms.blendLevel, 1);
    blit(noise.write.fbo);
    noise.swap();
    update();
  }
  canvas.addEventListener("mousemove", (e) => {
    pointers[0].moved = pointers[0].down;
    pointers[0].dx = (e.offsetX - pointers[0].x) * 5;
    pointers[0].dy = (e.offsetY - pointers[0].y) * 5;
    pointers[0].x = e.offsetX;
    pointers[0].y = e.offsetY;
  });
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touches = e.targetTouches;
    for (let i = 0; i < touches.length; i++) {
      let pointer = pointers[i];
      pointer.moved = pointer.down;
      pointer.dx = (touches[i].pageX - pointer.x) * 8;
      pointer.dy = (touches[i].pageY - pointer.y) * 8;
      pointer.x = touches[i].pageX;
      pointer.y = touches[i].pageY;
    }
  }, false);
  canvas.addEventListener("mousedown", () => {
    pointers[0].down = true;
    pointers[0].color = generateColor();
  });
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touches = e.targetTouches;
    for (let i = 0; i < touches.length; i++) {
      if (i >= pointers.length) {
        pointers.push(new pointerPrototype());
      }
      pointers[i].id = touches[i].identifier;
      pointers[i].down = true;
      pointers[i].x = touches[i].pageX;
      pointers[i].y = touches[i].pageY;
      pointers[i].color = generateColor();
    }
  });
  window.addEventListener("mouseup", () => {
    pointers[0].down = false;
  });
  window.addEventListener("touchend", (e) => {
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++)
      for (let j = 0; j < pointers.length; j++)
        if (touches[i].identifier == pointers[j].id)
          pointers[j].down = false;
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      config.DISPLAY_MODE = (config.DISPLAY_MODE + 1) % DISPLAY_MODES.length;
    }
  });
  function pointerPrototype() {
    this.id = -1;
    this.x = 0;
    this.y = 0;
    this.dx = 0;
    this.dy = 0;
    this.down = false;
    this.moved = false;
    this.color = [30, 0, 300];
  }
  function generateColor() {
    return {
      r: Math.random() * 0.15 + 0.05,
      g: Math.random() * 0.15 + 0.05,
      b: Math.random() * 0.15 + 0.05
    };
  }
  main();
})();
//# sourceMappingURL=dist.js.map

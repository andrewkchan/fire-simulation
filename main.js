'use strict';

const canvas = document.getElementsByTagName('canvas')[0];
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

let config = {
  BUOYANCY: 0.15,
  BURN_TEMPERATURE: 3500,
  CONFINEMENT: 30,
  COOLING: 3000,
  DYE_RESOLUTION: 512,
  FUEL_DISSIPATION: 0.9,
  DENSITY_DISSIPATION: 0.99,
  PRESSURE_DISSIPATION: 0.8,
  PRESSURE_ITERATIONS: 20,
  SIM_RESOLUTION: 256,
  SPLAT_RADIUS: 0.5,
  VELOCITY_DISSIPATION: 0.98,
};

let pointers = [new pointerPrototype()];
let splatStack = [];

function getWebGLContext (canvas) {
  const params = {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
  };

  let gl = canvas.getContext('webgl2', params);
  const isWebGL2 = !!gl;
  if (!isWebGL2) {
    gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
  }

  let halfFloat;
  let supportLinearFiltering;
  if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
  } else {
    halfFloat = gl.getExtension('OES_texture_half_float');
    supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
  let formatRGBA;
  let formatRG;
  let formatR;

  if (isWebGL2) {
    formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
    formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
    formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
  } else {
    formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
  }

  if (formatRGBA == null) {
    console.log(isWebGL2 ? 'webgl2' : 'webgl', 'not supported');
  } else {
    console.log(isWebGL2 ? 'webgl2' : 'webgl', 'supported');
  }

  return {
    gl,
    ext: {
      formatRGBA,
      formatRG,
      formatR,
      halfFloatTexType,
      supportLinearFiltering,
    },
  };
}

function getSupportedFormat (gl, internalFormat, format, type) {
  if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
    switch (internalFormat) {
      case gl.R16F:
        return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
      case gl.RG16F:
        return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
      default:
        return null;
    }
  }

  return {
    internalFormat,
    format,
  };
}

function supportRenderTextureFormat (gl, internalFormat, format, type) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

  let fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status != gl.FRAMEBUFFER_COMPLETE) {
    return false;
  }
  return true;
}

const { gl, ext } = getWebGLContext(canvas);

/*
class GLProgram

Encapsulates a WebGL program with vertex and fragment shader.
*/
class GLProgram {
  constructor (vertexShader, fragmentShader) {
    this.uniforms = {}; // contains location of uniforms indexed by variable name.
    this.program = gl.createProgram(); // the WebGL program.

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

  bind () {
    gl.useProgram(this.program);
  }
}

/*
Compiles a shader of the given type (either gl.VERTEX_SHADER or gl.FRAGMENT_SHADER) and source code (string).
Returns the WebGL shader handler.
*/
function compileShader (type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw gl.getShaderInfoLog(shader);
  }

  return shader;
}

/*
Render quad to a specified framebuffer `destination`. If null, render to the default framebuffer.
*/
const blit = (() => {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  return (destination) => {
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
    5,
    simWidth,
    simHeight,
    r.internalFormat,
    r.format,
    texType,
    gl.NEAREST,
  );
  density = createDoubleFBO(
    2,
    dyeWidth,
    dyeHeight,
    rgba.internalFormat,
    rgba.format,
    texType,
    ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST,
  );
  divergence = createFBO(
    4,
    simWidth,
    simHeight,
    r.internalFormat,
    r.format,
    texType,
    gl.NEAREST,
  );
  fuel = createDoubleFBO(
    10,
    simWidth,
    simHeight,
    r.internalFormat,
    r.format,
    texType,
    ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST,
  );
  pressure = createDoubleFBO(
    6,
    simWidth,
    simHeight,
    r.internalFormat,
    r.format,
    texType,
    gl.NEAREST,
  );
  temperature = createDoubleFBO(
    8,
    simWidth,
    simHeight,
    r.internalFormat,
    r.format,
    texType,
    ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST,
  );
  velocity = createDoubleFBO(
    0,
    simWidth,
    simHeight,
    rg.internalFormat,
    rg.format,
    texType,
    ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST,
  );
}

function getResolution (resolution) {
  let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
  if (aspectRatio < 1) {
    aspectRatio = 1.0 / aspectRatio;
  }

  let max = resolution * aspectRatio;
  let min = resolution;

  if (gl.drawingBufferWidth > gl.drawingBufferHeight) {
    return { width: max, height: min };
  } else {
    return { width: min, height: max };
  }
}

function createFBO (texId, w, h, internalFormat, format, type, filter) {
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
    texId,
  };
}

function createDoubleFBO (texId, w, h, internalFormat, format, type, filter) {
  let fbo1 = createFBO(texId, w, h, internalFormat, format, type, filter);
  let fbo2 = createFBO(texId + 1, w, h, internalFormat, format, type, filter);

  return {
    get read () {
      return fbo1;
    },
    get write () {
      return fbo2;
    },
    swap () {
      let temp = fbo1;
      fbo1 = fbo2;
      fbo2 = temp;
    },
  };
}

function update () {
  resizeCanvas();
  input();
  step(0.016);
  render();
  requestAnimationFrame(update);
}

function input () {
  if (splatStack.length > 0) {
    multipleSplats(splatStack.pop());
  }

  for (let i = 0; i < pointers.length; i++) {
    const pointer = pointers[i];
    if (pointer.moved) {
      splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color);
      pointer.moved = false;
    }
  }
}

function resizeCanvas () {
  if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    initFramebuffers();
  }
}

function render () {
  let width = gl.drawingBufferWidth;
  let height = gl.drawingBufferHeight;

  gl.viewport(0, 0, width, height);

  // displayProgram.bind();
  // gl.uniform1i(displayProgram.uniforms.uTexture, density.read.texId);
  // debugFloatProgram.bind();
  // gl.uniform1i(debugFloatProgram.uniforms.uTexture, temperature.read.texId);
  // gl.uniform1f(debugFloatProgram.uniforms.scalar, 0.001);
  // debugFireProgram.bind();
  // gl.uniform1i(debugFireProgram.uniforms.uFuel, fuel.read.texId);
  // gl.uniform1i(debugFireProgram.uniforms.uTemperature, temperature.read.texId);
  // gl.uniform1f(debugFireProgram.uniforms.temperatureScalar, 0.001);
  // gl.uniform1f(debugFireProgram.uniforms.fuelScalar, 1.0);

  displayFireProgram.bind();
  gl.uniform1i(displayFireProgram.uniforms.uDensity, density.read.texId);
  gl.uniform1i(displayFireProgram.uniforms.uTemperature, temperature.read.texId);

  blit(null);
}

function splat (x, y, dx, dy, color) {
  gl.viewport(0, 0, simWidth, simHeight);
  splatProgram.bind();
  gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.texId);
  gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
  gl.uniform2f(splatProgram.uniforms.point, x / canvas.width, 1.0 - y / canvas.height);
  gl.uniform3f(splatProgram.uniforms.color, dx, -dy, 1.0);
  gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS / 100.0);
  gl.uniform1f(splatProgram.uniforms.useMax, false);
  blit(velocity.write.fbo);
  velocity.swap();

  gl.uniform1i(splatProgram.uniforms.uTarget, fuel.read.texId);
  gl.uniform3f(splatProgram.uniforms.color, 1.0, 0.0, 0.0);
  gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS / 100.0);
  gl.uniform1f(splatProgram.uniforms.useMax, true);
  blit(fuel.write.fbo);
  fuel.swap();

  gl.viewport(0, 0, dyeWidth, dyeHeight);
  gl.uniform1i(splatProgram.uniforms.uTarget, density.read.texId);
  gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
  gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS / 100.0);
  gl.uniform1f(splatProgram.uniforms.useMax, true);
  blit(density.write.fbo);
  density.swap();
}

function multipleSplats (amount) {
  for (let i = 0; i < amount; i++) {
    const color = generateColor();
    color.r *= 10.0;
    color.g *= 10.0;
    color.b *= 10.0;
    const x = canvas.width * Math.random();
    const y = canvas.height * Math.random();
    const dx = 1000 * (Math.random() - 0.5);
    const dy = 1000 * (Math.random() - 0.5);
    splat(x, y, dx, dy, color);
  }
}

let simWidth;
let simHeight;
let dyeWidth;
let dyeHeight;

let curl;
let density;
let divergence;
let fuel;
let pressure;
let temperature;
let velocity;

let advectionProgram;
let buoyancyProgram;
let clearProgram;
let combustionProgram;
let curlProgram;
let debugFireProgram;
let debugFloatProgram;
let displayProgram;
let displayFireProgram;
let divergenceProgram;
let pressureIterationProgram;
let projectionProgram;
let splatProgram;
let vorticityConfinementProgram;

/*
Update the programs by delta time.
*/
function step (dt) {
  gl.viewport(0, 0, simWidth, simHeight);

  // Combustion step.
  // Burn fuel and cool temperature.
  combustionProgram.bind();
  gl.uniform2f(combustionProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
  gl.uniform1i(combustionProgram.uniforms.uFuel, fuel.read.texId);
  gl.uniform1i(combustionProgram.uniforms.uTemperature, temperature.read.texId);
  gl.uniform1f(combustionProgram.uniforms.burnTemperature, config.BURN_TEMPERATURE);
  gl.uniform1f(combustionProgram.uniforms.cooling, config.COOLING);
  gl.uniform1f(combustionProgram.uniforms.dt, dt);
  blit(temperature.write.fbo);
  temperature.swap();

  // Advection step.
  // Advect velocity through the velocity field.
  advectionProgram.bind();
  gl.uniform2f(advectionProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
  if (!ext.supportLinearFiltering) {
    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, 1.0 / simWidth, 1.0 / simHeight);
  }
  gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.texId);
  gl.uniform1i(advectionProgram.uniforms.uSource, velocity.read.texId);
  gl.uniform1f(advectionProgram.uniforms.dt, dt);
  gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
  blit(velocity.write.fbo);
  velocity.swap();

  // Do vorticity confinement on the velocity field.
  // First, compute curl of the velocity.
  curlProgram.bind();
  gl.uniform2f(curlProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
  gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.texId);
  blit(curl.fbo);
  // Confine vortices.
  vorticityConfinementProgram.bind();
  gl.uniform2f(vorticityConfinementProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
  gl.uniform1i(vorticityConfinementProgram.uniforms.uVelocity, velocity.read.texId);
  gl.uniform1i(vorticityConfinementProgram.uniforms.uCurl, curl.texId);
  gl.uniform1f(vorticityConfinementProgram.uniforms.confinement, config.CONFINEMENT);
  gl.uniform1f(vorticityConfinementProgram.uniforms.dt, dt);
  blit(velocity.write.fbo);
  velocity.swap();

  // Add thermal buoyancy to velocity.
  buoyancyProgram.bind();
  gl.uniform2f(buoyancyProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
  gl.uniform1i(buoyancyProgram.uniforms.uVelocity, velocity.read.texId);
  gl.uniform1i(buoyancyProgram.uniforms.uTemperature, temperature.read.texId);
  gl.uniform1f(buoyancyProgram.uniforms.buoyancy, config.BUOYANCY);
  gl.uniform1f(buoyancyProgram.uniforms.dt, dt);
  blit(velocity.write.fbo);
  velocity.swap();

  // Projection step.
  gl.viewport(0, 0, simWidth, simHeight);
  // Compute velocity divergence field.
  divergenceProgram.bind();
  gl.uniform2f(divergenceProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
  gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.texId);
  blit(divergence.fbo);
  // Solve for pressure field with Jacobi iteration.
  pressureIterationProgram.bind();
  gl.uniform2f(pressureIterationProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
  gl.uniform1i(pressureIterationProgram.uniforms.uDivergence, divergence.texId);
  let pressureTexId = pressure.read.texId;
  gl.uniform1i(pressureIterationProgram.uniforms.uPressure, pressureTexId);
  gl.activeTexture(gl.TEXTURE0 + pressureTexId);
  for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
    gl.bindTexture(gl.TEXTURE_2D, pressure.read.texture);
    blit(pressure.write.fbo);
    pressure.swap();
  }
  // Subtract pressure gradient from velocity field to project.
  projectionProgram.bind();
  gl.uniform2f(projectionProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
  gl.uniform1i(projectionProgram.uniforms.uPressure, pressure.read.texId);
  gl.uniform1i(projectionProgram.uniforms.uVelocity, velocity.read.texId);
  blit(velocity.write.fbo);
  velocity.swap();

  // Advect density (color) through the velocity field.
  advectionProgram.bind();
  gl.viewport(0, 0, dyeWidth, dyeHeight);
  if (!ext.supportLinearFiltering) {
    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, 1.0 / dyeWidth, 1.0 / dyeHeight);
  }
  gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.texId);
  gl.uniform1i(advectionProgram.uniforms.uSource, density.read.texId);
  gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
  blit(density.write.fbo);
  density.swap();
  // Advect temperature.
  gl.viewport(0, 0, simWidth, simHeight);
  if (!ext.supportLinearFiltering) {
    gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, 1.0 / simWidth, 1.0 / simHeight);
  }
  gl.uniform1i(advectionProgram.uniforms.uSource, temperature.read.texId);
  gl.uniform1f(advectionProgram.uniforms.dissipation, 1.0);
  blit(temperature.write.fbo);
  temperature.swap();
  // Advect fuel.
  gl.uniform1i(advectionProgram.uniforms.uSource, fuel.read.texId);
  gl.uniform1f(advectionProgram.uniforms.dissipation, config.FUEL_DISSIPATION);
  blit(fuel.write.fbo);
  fuel.swap();
}

function main () {
  let shaderSources = {
    advectionManualFilteringShader: {
      url: "./shaders/advectionManualFilteringShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    advectionShader: {
      url: "./shaders/advectionShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    baseVertexShader: {
      url: "./shaders/baseVertexShader.glsl",
      type: gl.VERTEX_SHADER,
    },
    buoyancyShader: {
      url: "./shaders/buoyancyShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    clearShader: {
      url: "./shaders/clearShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    combustionShader: {
      url: "./shaders/combustionShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    curlShader: {
      url: "./shaders/curlShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    debugFireShader: {
      url: "./shaders/debugFireShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    debugFloatShader: {
      url: "./shaders/debugFloatShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    displayShader: {
      url: "./shaders/displayShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    displayFireShader: {
      url: "./shaders/displayFireShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    divergenceShader: {
      url: "./shaders/divergenceShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    pressureIterationShader: {
      url: "./shaders/pressureIterationShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    projectionShader: {
      url: "./shaders/projectionShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    splatShader: {
      url: "./shaders/splatShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
    vorticityConfinementShader: {
      url: "./shaders/vorticityConfinementShader.glsl",
      type: gl.FRAGMENT_SHADER,
    },
  };
  let shaders = {};
  let shaderFetches = Object.keys(shaderSources).map((shaderName) => {
    return fetch(shaderSources[shaderName].url)
      .then(response => response.text())
      .then(text => { shaders[shaderName] = compileShader(shaderSources[shaderName].type, text); });
  });
  Promise.all(shaderFetches).then(_ => {
    console.log(shaders);
    advectionProgram =
      new GLProgram(
        shaders.baseVertexShader,
        ext.supportLinearFiltering ? shaders.advectionShader : shaders.advectionManualFilteringShader
      );
    buoyancyProgram           = new GLProgram(shaders.baseVertexShader, shaders.buoyancyShader);
    clearProgram              = new GLProgram(shaders.baseVertexShader, shaders.clearShader);
    combustionProgram         = new GLProgram(shaders.baseVertexShader, shaders.combustionShader);
    curlProgram               = new GLProgram(shaders.baseVertexShader, shaders.curlShader);
    debugFireProgram          = new GLProgram(shaders.baseVertexShader, shaders.debugFireShader);
    debugFloatProgram         = new GLProgram(shaders.baseVertexShader, shaders.debugFloatShader);
    displayProgram            = new GLProgram(shaders.baseVertexShader, shaders.displayShader);
    displayFireProgram        = new GLProgram(shaders.baseVertexShader, shaders.displayFireShader);
    divergenceProgram         = new GLProgram(shaders.baseVertexShader, shaders.divergenceShader);
    pressureIterationProgram  = new GLProgram(shaders.baseVertexShader, shaders.pressureIterationShader);
    projectionProgram         = new GLProgram(shaders.baseVertexShader, shaders.projectionShader);
    splatProgram              = new GLProgram(shaders.baseVertexShader, shaders.splatShader);
    vorticityConfinementProgram = new GLProgram(shaders.baseVertexShader, shaders.vorticityConfinementShader);

    initFramebuffers();
    // multipleSplats(parseInt(Math.random() * 20) + 5);

    update();
  });
}

canvas.addEventListener('mousemove', (e) => {
  pointers[0].moved = pointers[0].down;
  pointers[0].dx = (e.offsetX - pointers[0].x) * 5.0;
  pointers[0].dy = (e.offsetY - pointers[0].y) * 5.0;
  pointers[0].x = e.offsetX;
  pointers[0].y = e.offsetY;
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touches = e.targetTouches;
  for (let i = 0; i < touches.length; i++) {
    let pointer = pointers[i];
    pointer.moved = pointer.down;
    pointer.dx = (touches[i].pageX - pointer.x) * 8.0;
    pointer.dy = (touches[i].pageY - pointer.y) * 8.0;
    pointer.x = touches[i].pageX;
    pointer.y = touches[i].pageY;
  }
}, false);

canvas.addEventListener('mousedown', () => {
  pointers[0].down = true;
  pointers[0].color = generateColor();
});

canvas.addEventListener('touchstart', (e) => {
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

window.addEventListener('mouseup', () => {
  pointers[0].down = false;
});

window.addEventListener('touchend', (e) => {
  const touches = e.changedTouches;
  for (let i = 0; i < touches.length; i++)
    for (let j = 0; j < pointers.length; j++)
      if (touches[i].identifier == pointers[j].id)
        pointers[j].down = false;
});

function pointerPrototype () {
    this.id = -1;
    this.x = 0;
    this.y = 0;
    this.dx = 0;
    this.dy = 0;
    this.down = false;
    this.moved = false;
    this.color = [30, 0, 300];
}

function generateColor () {
  return {
    r: Math.random() * 0.15 + 0.05,
    g: Math.random() * 0.15 + 0.05,
    b: Math.random() * 0.15 + 0.05,
  };
}

main();

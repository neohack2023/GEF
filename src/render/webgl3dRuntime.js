import {
  createBassTunnelVertices,
  createTunnelUniforms,
  resizeGpuCanvas
} from './threeSceneGeometry.js';

const VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aTunnel;

uniform vec4 uSceneA;
uniform vec4 uSceneB;

out float vDepth;
out float vSpark;

void main() {
  float aspect = uSceneA.x;
  float time = uSceneA.y;
  float bass = uSceneA.z;
  float mid = uSceneA.w;
  float treble = uSceneB.x;
  float glitch = uSceneB.y;
  float rms = uSceneB.z;
  float beat = uSceneB.w;

  float depth = fract(aTunnel.y + time * (0.055 + rms * 0.04));
  float z = 1.2 + depth * 25.0;
  float pulse = 1.0 + bass * 0.8 + beat * 0.45;
  float ripple = sin(depth * 20.0 - time * 2.0) * (0.08 + mid * 0.22);
  float jitter = step(0.86, glitch) * sin(aTunnel.x * 17.0 + time * 31.0) * 0.08;
  float radius = 1.25 * pulse + ripple + jitter;
  float twist = aTunnel.x + depth * 3.2 + time * (0.22 + mid * 0.3);
  vec2 ring = vec2(cos(twist), sin(twist)) * radius;
  vec2 projected = ring / max(z * 0.18, 0.18);
  projected.x /= max(aspect, 0.01);

  gl_Position = vec4(projected, depth * 0.92, 1.0);
  vDepth = depth;
  vSpark = treble + beat * 0.5;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in float vDepth;
in float vSpark;
out vec4 outColor;

void main() {
  vec3 nearColor = vec3(0.0, 1.0, 0.53);
  vec3 farColor = vec3(0.0, 0.38, 1.0);
  vec3 color = mix(nearColor, farColor, vDepth);
  color += vec3(0.38, 0.08, 0.56) * clamp(vSpark, 0.0, 1.0);
  float alpha = mix(0.9, 0.08, vDepth);
  outColor = vec4(color, alpha);
}`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('WebGL2 could not allocate a shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Unknown shader compile failure.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error('WebGL2 could not allocate a program.');
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Unknown WebGL2 link failure.';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

export class WebGl3dRuntime {
  constructor(canvas, { onLost } = {}) {
    this.canvas = canvas;
    this.onLost = onLost;
    this.gl = null;
    this.program = null;
    this.vertexBuffer = null;
    this.vertexArray = null;
    this.vertexCount = 0;
    this.sceneALocation = null;
    this.sceneBLocation = null;
    this.handleContextLost = (event) => {
      event.preventDefault();
      this.onLost?.('WebGL2 context lost.');
    };
  }

  init() {
    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      depth: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: true
    });
    if (!gl) throw new Error('WebGL2 is unavailable.');

    this.gl = gl;
    this.program = createProgram(gl);
    const vertices = createBassTunnelVertices();
    this.vertexCount = vertices.length / 2;
    this.vertexBuffer = gl.createBuffer();
    if (!this.vertexBuffer) throw new Error('WebGL2 could not allocate the tunnel buffer.');
    this.vertexArray = gl.createVertexArray();
    if (!this.vertexArray) throw new Error('WebGL2 could not allocate the tunnel vertex array.');
    gl.bindVertexArray(this.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.sceneALocation = gl.getUniformLocation(this.program, 'uSceneA');
    this.sceneBLocation = gl.getUniformLocation(this.program, 'uSceneB');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    return { backend: 'webgl2' };
  }

  render(width, height, time, audio) {
    if (!this.gl || !this.program) return;
    const gl = this.gl;
    const size = resizeGpuCanvas(this.canvas, width, height);
    const uniforms = createTunnelUniforms(size.width, size.height, time, audio);
    gl.viewport(0, 0, size.width, size.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.uniform4fv(this.sceneALocation, uniforms.subarray(0, 4));
    gl.uniform4fv(this.sceneBLocation, uniforms.subarray(4, 8));
    gl.drawArrays(gl.LINES, 0, this.vertexCount);
  }

  dispose() {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost, false);
    if (this.gl && this.vertexArray) this.gl.deleteVertexArray(this.vertexArray);
    if (this.gl && this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer);
    if (this.gl && this.program) this.gl.deleteProgram(this.program);
    this.vertexBuffer = null;
    this.vertexArray = null;
    this.program = null;
    this.gl = null;
  }
}

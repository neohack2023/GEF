import {
  createBassTunnelVertices,
  createTunnelUniforms,
  resizeGpuCanvas
} from './threeSceneGeometry.js';

const SHADER = `
struct SceneUniforms {
  sceneA: vec4f,
  sceneB: vec4f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) depth: f32,
  @location(1) spark: f32,
}

@group(0) @binding(0) var<uniform> scene: SceneUniforms;

@vertex
fn vertexMain(@location(0) tunnel: vec2f) -> VertexOutput {
  let aspect = scene.sceneA.x;
  let time = scene.sceneA.y;
  let bass = scene.sceneA.z;
  let mid = scene.sceneA.w;
  let treble = scene.sceneB.x;
  let glitch = scene.sceneB.y;
  let rms = scene.sceneB.z;
  let beat = scene.sceneB.w;
  let depth = fract(tunnel.y + time * (0.055 + rms * 0.04));
  let z = 1.2 + depth * 25.0;
  let pulse = 1.0 + bass * 0.8 + beat * 0.45;
  let ripple = sin(depth * 20.0 - time * 2.0) * (0.08 + mid * 0.22);
  let jitter = step(0.86, glitch) * sin(tunnel.x * 17.0 + time * 31.0) * 0.08;
  let radius = 1.25 * pulse + ripple + jitter;
  let twist = tunnel.x + depth * 3.2 + time * (0.22 + mid * 0.3);
  let ring = vec2f(cos(twist), sin(twist)) * radius;
  var projected = ring / max(z * 0.18, 0.18);
  projected.x /= max(aspect, 0.01);

  var output: VertexOutput;
  output.position = vec4f(projected, depth * 0.92, 1.0);
  output.depth = depth;
  output.spark = treble + beat * 0.5;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let nearColor = vec3f(0.0, 1.0, 0.53);
  let farColor = vec3f(0.0, 0.38, 1.0);
  var color = mix(nearColor, farColor, input.depth);
  color += vec3f(0.38, 0.08, 0.56) * clamp(input.spark, 0.0, 1.0);
  let alpha = mix(0.9, 0.08, input.depth);
  return vec4f(color, alpha);
}`;

export class WebGpu3dRuntime {
  constructor(canvas, { onLost } = {}) {
    this.canvas = canvas;
    this.onLost = onLost;
    this.adapter = null;
    this.device = null;
    this.context = null;
    this.pipeline = null;
    this.vertexBuffer = null;
    this.uniformBuffer = null;
    this.bindGroup = null;
    this.vertexCount = 0;
  }

  async init() {
    if (!navigator.gpu) throw new Error('WebGPU is unavailable or requires a secure context.');
    this.adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!this.adapter) throw new Error('WebGPU did not return an adapter.');
    this.device = await this.adapter.requestDevice();
    this.device.lost.then((info) => {
      this.onLost?.(`WebGPU device lost: ${info.message || info.reason || 'unknown reason'}`);
    });

    this.context = this.canvas.getContext('webgpu');
    if (!this.context) throw new Error('WebGPU canvas context is unavailable.');
    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format,
      alphaMode: 'premultiplied'
    });

    const module = this.device.createShaderModule({ label: 'GEF Bass Tunnel 3D', code: SHADER });
    const compilation = await module.getCompilationInfo();
    const errors = compilation.messages.filter((message) => message.type === 'error');
    if (errors.length) throw new Error(errors.map((message) => message.message).join('; '));

    this.pipeline = this.device.createRenderPipeline({
      label: 'GEF curated 3D line pipeline',
      layout: 'auto',
      vertex: {
        module,
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }]
        }]
      },
      fragment: {
        module,
        entryPoint: 'fragmentMain',
        targets: [{
          format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
          }
        }]
      },
      primitive: { topology: 'line-list' }
    });

    const usage = globalThis.GPUBufferUsage;
    const vertices = createBassTunnelVertices();
    this.vertexCount = vertices.length / 2;
    this.vertexBuffer = this.device.createBuffer({
      label: 'GEF Bass Tunnel geometry',
      size: vertices.byteLength,
      usage: usage.VERTEX | usage.COPY_DST
    });
    this.device.queue.writeBuffer(this.vertexBuffer, 0, vertices);
    this.uniformBuffer = this.device.createBuffer({
      label: 'GEF Bass Tunnel uniforms',
      size: 32,
      usage: usage.UNIFORM | usage.COPY_DST
    });
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }]
    });
    return { backend: 'webgpu' };
  }

  render(width, height, time, audio) {
    if (!this.device || !this.context || !this.pipeline) return;
    const size = resizeGpuCanvas(this.canvas, width, height);
    const uniforms = createTunnelUniforms(size.width, size.height, time, audio);
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniforms);
    const encoder = this.device.createCommandEncoder({ label: 'GEF 3D frame' });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.draw(this.vertexCount);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  dispose() {
    this.vertexBuffer?.destroy();
    this.uniformBuffer?.destroy();
    this.context?.unconfigure();
    this.vertexBuffer = null;
    this.uniformBuffer = null;
    this.bindGroup = null;
    this.pipeline = null;
    this.context = null;
    this.device = null;
    this.adapter = null;
  }
}

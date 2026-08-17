const TAU = Math.PI * 2;

export const BASS_TUNNEL_LIMITS = Object.freeze({
  rings: 28,
  segments: 24,
  maxDevicePixelRatio: 2
});

export function createBassTunnelVertices({
  rings = BASS_TUNNEL_LIMITS.rings,
  segments = BASS_TUNNEL_LIMITS.segments
} = {}) {
  const safeRings = Math.max(2, Math.min(Math.floor(rings), BASS_TUNNEL_LIMITS.rings));
  const safeSegments = Math.max(3, Math.min(Math.floor(segments), BASS_TUNNEL_LIMITS.segments));
  const vertices = new Float32Array(safeRings * safeSegments * 2 * 2);
  let offset = 0;

  for (let ring = 0; ring < safeRings; ring += 1) {
    const depth = ring / safeRings;
    for (let segment = 0; segment < safeSegments; segment += 1) {
      const angle = (segment / safeSegments) * TAU;
      const nextAngle = ((segment + 1) / safeSegments) * TAU;
      vertices[offset++] = angle;
      vertices[offset++] = depth;
      vertices[offset++] = nextAngle;
      vertices[offset++] = depth;
    }
  }

  return vertices;
}

export function createTunnelUniforms(width, height, time, audio = {}) {
  return new Float32Array([
    Math.max(width, 1) / Math.max(height, 1),
    Number.isFinite(time) ? time : 0,
    Number.isFinite(audio.bass) ? audio.bass : 0,
    Number.isFinite(audio.mid) ? audio.mid : 0,
    Number.isFinite(audio.treble) ? audio.treble : 0,
    Number.isFinite(audio.glitch) ? audio.glitch : 0,
    Number.isFinite(audio.rms) ? audio.rms : 0,
    Number.isFinite(audio.beat) ? audio.beat : 0
  ]);
}

export function resizeGpuCanvas(canvas, width, height) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, BASS_TUNNEL_LIMITS.maxDevicePixelRatio);
  const nextWidth = Math.max(1, Math.floor(width * pixelRatio));
  const nextHeight = Math.max(1, Math.floor(height * pixelRatio));

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  return { width: nextWidth, height: nextHeight, pixelRatio };
}

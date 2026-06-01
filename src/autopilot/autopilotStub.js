import { appendAutopilotLog } from '../storage/localLibrary.js';

const themes = [
  'quantum field data visualization',
  'bioluminescent deep-sea flora',
  'hyper-dimensional tesseract unfolding',
  'cyberpunk neon datastream',
  'sacred geometry mandala',
  'liquid metal ferrofluid ripple',
  'abstract glitch typography space',
  'holographic wireframe mountain',
  'microscopic cellular division',
  'synesthetic frequency spectrum map'
];

const motions = [
  'recursive fractal zooming',
  'fluid motion simulation',
  'chaotic strange attractor drift',
  'trigonometric wave interference',
  'orbital ring rotation',
  'cellular automata evolution',
  'Lissajous curve overlay',
  'topology warp motion'
];

const audioMappings = [
  'bass-driven geometric fracturing',
  'treble-sparking particle shimmer',
  'centroid-mapped hue shifting',
  'glitch-triggered time slicing',
  'beat-synced radial bloom',
  'rms-powered shadow expansion'
];

export function generateSeedIdeas(count = 5) {
  const ideas = [];
  for (let i = 0; i < count; i++) {
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const motion = motions[Math.floor(Math.random() * motions.length)];
    const mapping = audioMappings[Math.floor(Math.random() * audioMappings.length)];
    ideas.push(`${theme} using ${motion} with ${mapping}.`);
  }
  return ideas;
}

export function queueVariations(promptText, count = 5) {
  const cleanPrompt = promptText.trim();
  const queue = [];
  for (let i = 0; i < count; i++) {
    queue.push({
      prompt: `${cleanPrompt}\n\nIteration ${i + 1} of ${count}: keep the core theme but vary motion, density, and audio mapping.`,
      index: i,
      status: 'queued'
    });
  }
  logAutopilot('QUEUE', `Queued ${queue.length} safe design variation notes.`);
  return queue;
}

export function logAutopilot(type, message, extra = {}) {
  const entry = {
    ts: new Date().toISOString(),
    type,
    message,
    ...extra
  };
  appendAutopilotLog(entry);
  return entry;
}

export function safeAutopilotNotice() {
  return [
    'Autopilot Forge is staged in safe mode.',
    'This build generates prompt queues and design notes only.',
    'Remote model calls and generated-code execution should be reintroduced through a reviewed adapter layer.'
  ].join(' ');
}

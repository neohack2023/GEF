const $ = (id) => document.getElementById(id);

const CHIPS = [
  ['Bass Pulse', 'Emphasize bass-reactive pulses with visible pressure waves and low-frequency movement.'],
  ['Glitch Cuts', 'Add controlled glitch slicing that reacts to sudden audio changes.'],
  ['Grid Structure', 'Use a structured geometric grid or lattice as the main visual anchor.'],
  ['Bloom Hits', 'Use beat-triggered bloom moments on strong transients.'],
  ['Calm Drift', 'Keep motion smooth, spacious, and slow with gentle audio response.'],
  ['High Energy', 'Push toward dense movement, layered visuals, and sharp audio response.']
];

function setStatus(text) {
  const status = $('status-bar');
  if (!status) return;
  status.textContent = text;
  window.setTimeout(() => {
    status.textContent = 'STABLE ENGINE ACTIVE';
    status.className = '';
  }, 1800);
}

function appendToPrompt(text) {
  const box = $('autopilot-seeds');
  if (!box) return;

  const clean = String(text || '').trim();
  if (!clean) return;

  const prefix = box.value.trim() ? '\n' : '';
  box.value = `${box.value.trimEnd()}${prefix}${clean}`;
  box.focus();
  box.setSelectionRange(box.value.length, box.value.length);
}

function makeButton(label, text) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-small';
  button.textContent = label;
  button.addEventListener('click', () => {
    appendToPrompt(text);
    setStatus(`Added ${label} to Foundry prompt.`);
  });
  return button;
}

function makeSlider(id, label, value) {
  const wrap = document.createElement('div');
  wrap.style.marginTop = '8px';

  const header = document.createElement('div');
  header.className = 'slider-header';

  const name = document.createElement('span');
  name.textContent = label;

  const readout = document.createElement('span');
  readout.className = 'slider-val';
  readout.textContent = `${value}/10`;

  const slider = document.createElement('input');
  slider.id = id;
  slider.type = 'range';
  slider.min = '0';
  slider.max = '10';
  slider.step = '1';
  slider.value = String(value);
  slider.addEventListener('input', () => {
    readout.textContent = `${slider.value}/10`;
  });

  header.append(name, readout);
  wrap.append(header, slider);
  return wrap;
}

function rangeWord(value, low, mid, high) {
  if (value <= 3) return low;
  if (value <= 7) return mid;
  return high;
}

function addSliderSummary() {
  const density = Number($('prompt-density')?.value || 5);
  const motion = Number($('prompt-motion')?.value || 5);
  const audio = Number($('prompt-audio')?.value || 7);
  const texture = $('prompt-texture')?.value || 'balanced';
  const stage = $('evo-stage')?.value || 'AUTO';

  appendToPrompt([
    'Prompt builder settings:',
    `Stage target: ${stage}.`,
    `Density: ${rangeWord(density, 'minimal', 'balanced', 'dense')}.`,
    `Motion: ${rangeWord(motion, 'slow', 'medium', 'fast')}.`,
    `Audio response: ${rangeWord(audio, 'subtle', 'clear', 'strong')}.`,
    `Texture direction: ${texture}.`,
    'Suggest one curated module from the available GEF module catalog.'
  ].join('\n'));
  setStatus('Added builder settings to Foundry prompt.');
}

function injectPromptBuilder() {
  const box = $('autopilot-seeds');
  if (!box || $('foundry-prompt-builder')) return;

  const panel = document.createElement('div');
  panel.id = 'foundry-prompt-builder';
  panel.style.marginTop = '10px';
  panel.style.padding = '10px';
  panel.style.background = 'rgba(0,184,255,.06)';
  panel.style.border = '1px solid rgba(0,184,255,.2)';
  panel.style.borderRadius = '10px';

  const title = document.createElement('div');
  title.className = 'section-title';
  title.style.marginTop = '0';
  title.textContent = 'Prompt Builder';

  const note = document.createElement('div');
  note.className = 'tiny-note';
  note.textContent = 'These controls add editable text into the Foundry prompt window.';

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr 1fr 1fr';
  grid.style.gap = '6px';
  grid.style.marginTop = '8px';
  CHIPS.forEach(([label, text]) => grid.appendChild(makeButton(label, text)));

  const texture = document.createElement('select');
  texture.id = 'prompt-texture';
  texture.style.marginTop = '8px';
  [
    ['balanced', 'Texture: Balanced'],
    ['clean geometric', 'Texture: Clean Geometric'],
    ['liquid organic', 'Texture: Liquid Organic'],
    ['sharp digital', 'Texture: Sharp Digital'],
    ['soft cinematic', 'Texture: Soft Cinematic']
  ].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    texture.appendChild(option);
  });

  const addDetails = document.createElement('button');
  addDetails.type = 'button';
  addDetails.className = 'btn-small btn-good';
  addDetails.style.marginTop = '8px';
  addDetails.style.width = '100%';
  addDetails.style.color = '#000';
  addDetails.style.background = '#00ff88';
  addDetails.textContent = 'Add Builder Details to Prompt';
  addDetails.addEventListener('click', addSliderSummary);

  panel.append(
    title,
    note,
    grid,
    makeSlider('prompt-density', 'Density', 5),
    makeSlider('prompt-motion', 'Motion', 5),
    makeSlider('prompt-audio', 'Audio Reactivity', 7),
    texture,
    addDetails
  );

  box.insertAdjacentElement('afterend', panel);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectPromptBuilder);
} else {
  injectPromptBuilder();
}

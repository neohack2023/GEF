# GEF Audio Metrics

GEF turns audio into visual control signals.

This document explains what the current meters mean, how the browser audio data is read, how the current implementation maps bins into bass/mid/treble/glitch/centroid/rms, and what should be improved next.

Core principle:

> Audio metrics are control voltage for visuals, not forensic audio truth.

The current system is intentionally lightweight and real-time. It is designed to steer visuals, not to be a full mastering analyzer or scientific MIR toolkit.

---

## Current implementation files

```text
src/audio/analyzer.js
src/app.js
src/render/visualModules.js
```

Current flow:

```text
media file / microphone
  -> AudioContext
  -> AnalyserNode
  -> getByteFrequencyData(Uint8Array)
  -> normalized metrics
  -> UI meters
  -> visual modules
```

Current analyzer setup:

```js
this.ctx = new (window.AudioContext || window.webkitAudioContext)();
this.analyser = this.ctx.createAnalyser();
this.analyser.fftSize = 1024;
this.analyser.smoothingTimeConstant = 0.1;
this.streamDestination = this.ctx.createMediaStreamDestination();
this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
this.prevDataArray = new Uint8Array(this.analyser.frequencyBinCount);
```

Current metric object:

```js
{
  bass: 0,
  mid: 0,
  treble: 0,
  beat: 0,
  glitch: 0,
  centroid: 0,
  rms: 0
}
```

---

## Browser audio foundation

GEF currently uses `AnalyserNode.getByteFrequencyData()`.

Browser facts that matter:

- `getByteFrequencyData()` copies current frequency-domain data into a `Uint8Array`.
- The returned values are integers from `0` to `255`.
- Each array item represents a frequency bin.
- Bins are spread linearly from `0` Hz to one half of the `AudioContext.sampleRate`, also called the Nyquist frequency.
- `frequencyBinCount` is always half of `fftSize`.
- `fftSize` is the FFT window size in samples. A larger FFT gives more frequency detail but less time detail.
- `smoothingTimeConstant` applies browser-level smoothing between analysis frames.

Useful references:

```text
https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteFrequencyData
https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/fftSize
https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/frequencyBinCount
https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/smoothingTimeConstant
```

---

## Current FFT settings

Current values:

```text
fftSize = 1024
frequencyBinCount = 512
smoothingTimeConstant = 0.1
```

Frequency resolution formula:

```js
const nyquistHz = audioContext.sampleRate / 2;
const binWidthHz = nyquistHz / analyser.frequencyBinCount;
// equivalent: audioContext.sampleRate / analyser.fftSize
```

Example at 48 kHz sample rate:

```text
nyquistHz = 24000 Hz
frequencyBinCount = 512
binWidthHz = 46.875 Hz
```

Example at 44.1 kHz sample rate:

```text
nyquistHz = 22050 Hz
frequencyBinCount = 512
binWidthHz = 43.066 Hz
```

Important:

The current code uses fixed bin ranges. That means the actual Hz range shifts depending on browser/device sample rate.

---

## Current bin bands

Current code:

```js
if (i < 10) bass += value;
else if (i < 70) mid += value;
else if (i < 200) treble += value;
```

Current averages:

```js
bass /= 10;
mid /= 60;
treble /= 130;
```

Approximate frequency coverage at 48 kHz sample rate:

| Metric | Bins | Approx Hz span |
| --- | ---: | ---: |
| `bass` | 0-9 | 0 to <468.75 Hz |
| `mid` | 10-69 | 468.75 to <3281.25 Hz |
| `treble` | 70-199 | 3281.25 to <9375 Hz |

Approximate frequency coverage at 44.1 kHz sample rate:

| Metric | Bins | Approx Hz span |
| --- | ---: | ---: |
| `bass` | 0-9 | 0 to <430.66 Hz |
| `mid` | 10-69 | 430.66 to <3014.65 Hz |
| `treble` | 70-199 | 3014.65 to <8613.28 Hz |

These are visualization bands, not studio EQ bands.

---

## Current normalization

Current code:

```js
const value = (this.dataArray[i] / 255) * audioSense;
```

Meaning:

- `dataArray[i] / 255` converts browser byte frequency values into a rough `0.0` to `1.0` range.
- `audioSense` is a user-controlled multiplier.
- If `audioSense` is above `1.0`, metrics can exceed `1.0` internally.

Recommended improvement:

Clamp visual-facing metric values after scaling.

```js
function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
```

---

## Current smoothing

GEF currently has two smoothing layers.

### Browser smoothing

```js
this.analyser.smoothingTimeConstant = 0.1;
```

This provides light smoothing inside the analyzer.

### GEF attack/release smoothing

For bass/mid/treble:

```js
target.bass += (bass > target.bass ? 0.8 : 0.08) * (bass - target.bass);
target.mid += (mid > target.mid ? 0.8 : 0.08) * (mid - target.mid);
target.treble += (treble > target.treble ? 0.8 : 0.08) * (treble - target.treble);
```

Meaning:

- Fast attack: values rise quickly.
- Slow release: values decay slowly.
- This gives visuals punch without flickering into static confetti.

Centroid smoothing:

```js
target.centroid += (centroid > target.centroid ? 0.5 : 0.1) * (centroid - target.centroid);
```

Beat/glitch decay:

```js
target.beat = detected ? 1 : target.beat * 0.8;
target.glitch = detected ? 1 : target.glitch * 0.8;
```

---

## Metric definitions

### `bass`

Current meaning:

Average normalized energy in bins `0-9`.

Used for:

- ring radius expansion
- low-end visual pressure
- beat detector input

Current code shape:

```js
if (i < 10) bass += value;
bass /= 10;
```

Visual interpretation:

```text
Higher bass = bigger, heavier, more pressure-based visuals.
```

Caution:

This is not true sub-bass only. At 48 kHz, it covers roughly `0` to `<468.75 Hz`.

---

### `mid`

Current meaning:

Average normalized energy in bins `10-69`.

Used for:

- ring wobble
- grid spacing compression
- body/motion response

Current code shape:

```js
else if (i < 70) mid += value;
mid /= 60;
```

Visual interpretation:

```text
Higher mid = more body motion and structural bending.
```

---

### `treble`

Current meaning:

Average normalized energy in bins `70-199`.

Used for:

- grid visibility
- shimmer-like overlays
- high-frequency intensity

Current code shape:

```js
else if (i < 200) treble += value;
treble /= 130;
```

Visual interpretation:

```text
Higher treble = brighter, sharper, more spark-like overlays.
```

---

### `beat`

Current meaning:

A low-end spike detector based on bass energy compared against a recent rolling bass history.

Current code:

```js
const averageBass = this.energyHist.reduce((sum, value) => sum + value, 0) / this.energyHist.length;
target.beat = bass > averageBass * 1.4 && bass > 0.2 ? 1 : target.beat * 0.8;

this.energyHist[this.histIdx] = bass;
this.histIdx = (this.histIdx + 1) % this.energyHist.length;
```

Current detection rule:

```text
beat = 1 when bass > rollingAverageBass * 1.4 and bass > 0.2
```

Visual interpretation:

```text
Beat is a flash trigger, not a BPM detector.
```

Used for:

- beat bloom
- full-screen pulse
- impact moments

Known limitation:

Dense bass passages can chatter because there is no cooldown/refractory period yet.

Recommended upgrade:

```js
const beatCooldownMs = 120;
let lastBeatAt = 0;

function detectBeat({ bass, averageBass, now }) {
  const enoughTime = now - lastBeatAt > beatCooldownMs;
  const isSpike = bass > averageBass * 1.45 && bass > 0.22;

  if (enoughTime && isSpike) {
    lastBeatAt = now;
    return 1;
  }

  return 0;
}
```

---

### `glitch`

Current meaning:

A positive spectral-flux trigger.

Current code:

```js
const previous = this.prevDataArray[i] / 255;
if (value > previous) flux += value - previous;

target.glitch = flux > glitchThreshold ? 1 : target.glitch * 0.8;
this.prevDataArray.set(this.dataArray);
```

Meaning:

- Compares the current spectrum against the previous spectrum.
- Only counts bins that increased.
- If the accumulated increase crosses `glitchThreshold`, the glitch trigger fires.

Visual interpretation:

```text
Glitch reacts to sudden spectral change, not just loudness.
```

This is close to a simplified positive spectral flux measurement. Spectral flux is commonly used to measure how quickly a signal spectrum changes from one frame to the next and can be used in onset detection.

Known limitation:

The current flux is a raw sum, so it depends on the number of bins scanned and `audioSense`. It should become normalized.

Recommended upgrade:

```js
function positiveFlux(current, previous, audioSense = 1) {
  let flux = 0;
  for (let i = 0; i < current.length; i++) {
    const now = (current[i] / 255) * audioSense;
    const old = previous[i] / 255;
    if (now > old) flux += now - old;
  }
  return flux / current.length;
}
```

---

### `centroid`

Current meaning:

A normalized spectral center-of-mass estimate based on bin positions.

Current code:

```js
centroidNumerator += value * i;
centroidDenominator += value;

const centroid = centroidDenominator > 0
  ? (centroidNumerator / centroidDenominator) / this.dataArray.length
  : 0;
```

Visual interpretation:

```text
Higher centroid = brighter perceived spectrum, more high-frequency weight.
```

Spectral centroid is usually defined as the weighted mean of frequencies in a spectrum, using magnitude as the weight. It is often associated with perceived brightness.

Known limitation:

GEF currently stores centroid as normalized bin position, not Hz.

Recommended upgrade:

```js
function spectralCentroidHz(dataArray, sampleRate, audioSense = 1) {
  const nyquistHz = sampleRate / 2;
  const binWidthHz = nyquistHz / dataArray.length;
  let weighted = 0;
  let total = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const magnitude = (dataArray[i] / 255) * audioSense;
    const hz = i * binWidthHz;
    weighted += hz * magnitude;
    total += magnitude;
  }

  return total > 0 ? weighted / total : 0;
}
```

Recommended normalized version:

```js
const centroidHz = spectralCentroidHz(dataArray, audioContext.sampleRate, audioSense);
const centroidNorm = centroidHz / (audioContext.sampleRate / 2);
```

---

### `rms`

Current meaning:

A root-mean-square estimate over normalized frequency-bin values.

Current code:

```js
rmsSum += value * value;
const rms = Math.sqrt(rmsSum / this.dataArray.length);
```

Visual interpretation:

```text
Higher rms = more overall spectral energy.
```

Known limitation:

This is not true waveform RMS. It is frequency-domain energy proxy RMS.

Recommended upgrade:

Use `getFloatTimeDomainData()` for a true waveform RMS lane.

```js
function waveformRms(timeDomainArray) {
  let sum = 0;
  for (let i = 0; i < timeDomainArray.length; i++) {
    sum += timeDomainArray[i] * timeDomainArray[i];
  }
  return Math.sqrt(sum / timeDomainArray.length);
}
```

Future metric split:

```js
{
  rmsSpectrum: 0,
  rmsWaveform: 0
}
```

---

## UI meter mapping

Current meter widths:

```js
fillBass.style.width = `${Math.min(metrics.bass * 100, 100)}%`;
fillMid.style.width = `${Math.min(metrics.mid * 100, 100)}%`;
fillTreble.style.width = `${Math.min(metrics.treble * 100, 100)}%`;
fillGlitch.style.width = `${Math.min(metrics.glitch * 100, 100)}%`;
fillCentroid.style.width = `${Math.min(metrics.centroid * 1000, 100)}%`;
```

Note:

`centroid * 1000` is a visual scaling hack. It makes the centroid meter more visible because centroid values often sit low in the normalized range.

Recommended replacement:

```js
const meterScales = {
  bass: 100,
  mid: 100,
  treble: 100,
  glitch: 100,
  centroid: 250,
  rms: 100
};
```

Then render all meters through one helper:

```js
function meterWidth(metricValue, scale = 100) {
  return `${Math.min(Math.max(metricValue * scale, 0), 100)}%`;
}
```

---

## How visuals use metrics

### `voidCore`

Uses:

- `audio.bass` for ring radius expansion
- `audio.glitch` for horizontal wobble
- `audio.mid` for vertical wobble
- `audio.centroid` for color shift
- `audio.beat` for full-screen pulse

### `spectralGrid`

Uses:

- `audio.mid` for spacing compression
- `audio.glitch` for line bending
- `audio.treble` for opacity
- `audio.centroid` for color shift

### `beatBloom`

Uses:

- `audio.beat` as a trigger

### `chromaSlice`

Uses:

- `audio.glitch` as the threshold and displacement driver

---

## Current limitations

### 1. Bands are bin-based, not Hz-based

The current code uses fixed bin indexes. This works, but a 48 kHz context and a 44.1 kHz context map bins to slightly different frequencies.

Fix:

```js
const hzBands = {
  bass: [20, 250],
  lowMid: [250, 600],
  mid: [600, 2500],
  treble: [2500, 9000]
};
```

### 2. Byte frequency data is not linear amplitude

`getByteFrequencyData()` returns byte-scaled frequency-domain values. GEF treats those values as normalized visual energy. That is fine for visuals, but the docs should not call it precise loudness.

Fix:

Use language like:

```text
normalized visual energy
frequency-bin intensity
spectral energy proxy
```

Avoid language like:

```text
true loudness
studio-level RMS
scientific amplitude
```

### 3. Glitch threshold is raw flux

The current `glitchThreshold` slider compares against raw summed flux. Normalize flux so slider behavior is more predictable.

### 4. Beat has no cooldown

Add a cooldown to prevent repeated triggering during sustained low-end sections.

### 5. RMS is not waveform RMS

Add a separate time-domain buffer for true waveform RMS.

### 6. Metrics can exceed 1.0

`audioSense` can push values past 1.0. Clamp visual-facing metrics.

---

## Proposed v0.7 metric engine

Target files:

```text
src/audio/audioBands.js
src/audio/analyzer.js
src/audio/metricSmoothing.js
src/audio/beatDetector.js
src/audio/audioDebug.js
```

Target metric shape:

```js
{
  bass: 0,
  lowMid: 0,
  mid: 0,
  highMid: 0,
  treble: 0,
  beat: 0,
  glitch: 0,
  centroid: 0,
  centroidHz: 0,
  rmsSpectrum: 0,
  rmsWaveform: 0,
  flux: 0,
  peak: 0,
  sampleRate: 48000,
  fftSize: 1024,
  binWidthHz: 46.875
}
```

Target band helper:

```js
export function hzToBin(hz, sampleRate, fftSize) {
  const binWidthHz = sampleRate / fftSize;
  return Math.max(0, Math.floor(hz / binWidthHz));
}

export function averageHzBand(dataArray, sampleRate, fftSize, minHz, maxHz, audioSense = 1) {
  const start = hzToBin(minHz, sampleRate, fftSize);
  const end = Math.min(hzToBin(maxHz, sampleRate, fftSize), dataArray.length);

  let sum = 0;
  let count = 0;

  for (let i = start; i < end; i++) {
    sum += (dataArray[i] / 255) * audioSense;
    count++;
  }

  return count > 0 ? sum / count : 0;
}
```

Target smoothing helper:

```js
export function attackRelease(previous, next, attack = 0.8, release = 0.08) {
  const coefficient = next > previous ? attack : release;
  return previous + coefficient * (next - previous);
}
```

Target debug payload:

```js
{
  sampleRate,
  fftSize,
  frequencyBinCount,
  binWidthHz,
  bandRangesHz,
  rawBands,
  smoothedBands,
  thresholds,
  beatCooldownMs
}
```

---

## Telemetry recommendations

When logging feedback or model decisions, include enough metric context to explain the visual result later.

Minimum snapshot:

```js
{
  audioSnapshot: {
    bass,
    mid,
    treble,
    beat,
    glitch,
    centroid,
    rms,
    sampleRate,
    fftSize,
    binWidthHz
  }
}
```

Better v0.7 snapshot:

```js
{
  audioSnapshot: {
    metrics,
    rawBands,
    smoothedBands,
    thresholds: {
      glitchThreshold,
      beatMultiplier,
      beatMinBass,
      beatCooldownMs
    },
    analyzer: {
      sampleRate,
      fftSize,
      frequencyBinCount,
      smoothingTimeConstant
    }
  }
}
```

Why this matters:

- Helps compare accepted/rejected visuals.
- Helps the SLM learn which visual modules work under different audio conditions.
- Helps reproduce bugs.
- Helps prevent the feedback dataset from becoming vibes in a trench coat.

---

## Naming rules

Use honest metric names.

Good names:

```text
bassEnergy
midEnergy
trebleEnergy
positiveFlux
glitchTrigger
centroidNorm
centroidHz
rmsSpectrum
rmsWaveform
beatTrigger
```

Avoid misleading names:

```text
trueLoudness
perfectBeat
exactBPM
masteringRMS
realSubBass
```

---

## Best next build order

1. Add `audioBands.js`.
2. Add `hzToBin()` and `averageHzBand()`.
3. Add debug values: `sampleRate`, `fftSize`, `frequencyBinCount`, `binWidthHz`.
4. Normalize `positiveFlux`.
5. Add beat cooldown.
6. Split `rmsSpectrum` and `rmsWaveform`.
7. Clamp visual-facing metrics.
8. Add peak-hold meter values.
9. Add telemetry audio snapshots.
10. Feed audio snapshots into SLM module-choice prompts.

---

## Reference notes reviewed

Browser references:

- MDN `AnalyserNode.getByteFrequencyData()`
- MDN `AnalyserNode.fftSize`
- MDN `AnalyserNode.frequencyBinCount`
- MDN `AnalyserNode.smoothingTimeConstant`

Audio feature references:

- Spectral flux: spectrum change between frames, often used for timbre or onset detection.
- Spectral centroid: weighted spectral center, often associated with perceived brightness.

Reference URLs:

```text
https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteFrequencyData
https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/fftSize
https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/frequencyBinCount
https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/smoothingTimeConstant
https://en.wikipedia.org/wiki/Spectral_flux
https://en.wikipedia.org/wiki/Spectral_centroid
```

---

## Audio maxims

- Visual metrics should be stable before they are clever.
- Bass is pressure, mid is body, treble is edge.
- Glitch should react to change, not just volume.
- Beat is a trigger, not BPM.
- Centroid is brightness pressure, not a mood detector.
- RMS needs a label: spectrum proxy or waveform truth.
- Store enough audio context to explain the visual later.

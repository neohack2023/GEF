export class AudioAnalyzer {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.streamDestination = null;
    this.dataArray = null;
    this.prevDataArray = null;
    this.source = null;
    this.metrics = {
      bass: 0,
      mid: 0,
      treble: 0,
      beat: 0,
      glitch: 0,
      centroid: 0,
      rms: 0
    };
    this.energyHist = new Array(30).fill(0);
    this.histIdx = 0;
  }

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.1;
      this.streamDestination = this.ctx.createMediaStreamDestination();
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.prevDataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  route(sourceNode, isMic = false) {
    try {
      if (this.source) this.source.disconnect();
    } catch {}

    try {
      this.analyser.disconnect();
    } catch {}

    this.source = sourceNode;
    this.source.connect(this.analyser);
    this.analyser.connect(this.streamDestination);

    if (!isMic) {
      this.analyser.connect(this.ctx.destination);
    }
  }

  update(glitchThreshold = 1.5, audioSense = 1.0) {
    if (!this.analyser) return this.metrics;

    this.analyser.getByteFrequencyData(this.dataArray);

    let bass = 0;
    let mid = 0;
    let treble = 0;
    let flux = 0;
    let centroidNumerator = 0;
    let centroidDenominator = 0;
    let rmsSum = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      const value = (this.dataArray[i] / 255) * audioSense;

      if (i < 10) bass += value;
      else if (i < 70) mid += value;
      else if (i < 200) treble += value;

      const previous = this.prevDataArray[i] / 255;
      if (value > previous) flux += value - previous;

      centroidNumerator += value * i;
      centroidDenominator += value;
      rmsSum += value * value;
    }

    bass /= 10;
    mid /= 60;
    treble /= 130;

    const target = this.metrics;
    target.bass += (bass > target.bass ? 0.8 : 0.08) * (bass - target.bass);
    target.mid += (mid > target.mid ? 0.8 : 0.08) * (mid - target.mid);
    target.treble += (treble > target.treble ? 0.8 : 0.08) * (treble - target.treble);

    const centroid = centroidDenominator > 0
      ? (centroidNumerator / centroidDenominator) / this.dataArray.length
      : 0;
    target.centroid += (centroid > target.centroid ? 0.5 : 0.1) * (centroid - target.centroid);

    const rms = Math.sqrt(rmsSum / this.dataArray.length);
    target.rms += (rms > target.rms ? 0.8 : 0.08) * (rms - target.rms);

    const averageBass = this.energyHist.reduce((sum, value) => sum + value, 0) / this.energyHist.length;
    target.beat = bass > averageBass * 1.4 && bass > 0.2 ? 1 : target.beat * 0.8;

    this.energyHist[this.histIdx] = bass;
    this.histIdx = (this.histIdx + 1) % this.energyHist.length;

    target.glitch = flux > glitchThreshold ? 1 : target.glitch * 0.8;
    this.prevDataArray.set(this.dataArray);

    return target;
  }
}

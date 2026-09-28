/* Audio-derived spectrum: cached offline analysis, deterministic seeking and output. */
(() => {
'use strict';
const tr = J.layerText, clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
J.normalizeNativeSpectrum = value => {
  const v = value || {}, color = c => typeof c === 'string' && /^#[\da-f]{6}$/i.test(c) ? c : '#ffffff';
  return { top: color(v.top), bottom: color(v.bottom),
    sensitivity: Number.isFinite(v.sensitivity) ? clamp(v.sensitivity, -12, 24) : 8,
    pulse: Number.isFinite(v.pulse) ? clamp(v.pulse, 0, 100) : 100,
    returnMs: Number.isFinite(v.returnMs) ? clamp(v.returnMs, 60, 600) : 140 };
};
const defaults = J.defaultProject, upgrade = J.upgradeLayerProject;
J.defaultProject = () => ({ ...defaults(), spectrumMode: 'none', nativeSpectrum: J.normalizeNativeSpectrum() });
J.upgradeLayerProject = (p, source) => {
  upgrade(p, source);
  p.spectrumMode = ['none', 'generated', 'external'].includes(source?.spectrumMode) ? source.spectrumMode : source ? 'external' : 'none';
  p.nativeSpectrum = J.normalizeNativeSpectrum(p.nativeSpectrum); return p;
};
J.activeSpectrumDuration = (p, audio, media = J.layerSession) => p.spectrumMode === 'generated'
  ? (audio?.buffer ? audio.buffer.length / audio.buffer.sampleRate : 0)
  : p.spectrumMode !== 'none' && media?.front ? J.spectrumDuration(media.front, media.matte) : 0;
J.nativeMotionKey = p => { const c = J.normalizeNativeSpectrum(p.nativeSpectrum); return JSON.stringify([c.sensitivity, c.pulse, c.returnMs]); };

// Self-contained so exactly this implementation also runs in a Blob worker.
function analyzePCM(samples, sampleRate, progress) {
  const rate = 60, bars = 64, size = sampleRate > 60000 ? 4096 : 2048;
  const frames = Math.ceil(samples.length / sampleRate * rate), raw = new Float32Array(frames * bars);
  const real = new Float64Array(size), imag = new Float64Array(size), win = new Float64Array(size), reverse = new Uint32Array(size);
  let sum = 0; const bits = Math.log2(size);
  for (let i = 0; i < size; i++) {
    win[i] = .5 - .5 * Math.cos(2 * Math.PI * i / (size - 1)); sum += win[i];
    let x = i, r = 0; for (let b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>>= 1; } reverse[i] = r;
  }
  function fftAt(start) {
    for (let i = 0; i < size; i++) { const j = start + i; real[reverse[i]] = (j >= 0 && j < samples.length ? samples[j] : 0) * win[i]; imag[i] = 0; }
    for (let width = 2; width <= size; width *= 2) {
      const half = width / 2, angle = -2 * Math.PI / width, cr = Math.cos(angle), ci = Math.sin(angle);
      for (let base = 0; base < size; base += width) {
        let wr = 1, wi = 0;
        for (let j = 0; j < half; j++) {
          const a = base + j, b = a + half, xr = wr * real[b] - wi * imag[b], xi = wr * imag[b] + wi * real[b];
          real[b] = real[a] - xr; imag[b] = imag[a] - xi; real[a] += xr; imag[a] += xi;
          const next = wr * cr - wi * ci; wi = wr * ci + wi * cr; wr = next;
        }
      }
    }
  }
  // A bounded whole-song prescan chooses one range, independent of playback and
  // motion settings. Reuse the original FFT/window; do not lengthen the attack.
  const binHz = sampleRate / size, ceiling = Math.min(16000, sampleRate / 2);
  const firstBin = Math.max(1, Math.ceil(20 / binHz)), lastBin = Math.floor(ceiling / binHz);
  const power = new Float64Array(size / 2 + 1), smoothed = new Float64Array(power.length);
  const scanFrames = samples.length < size ? 0 : Math.min(600, Math.max(1, Math.ceil(samples.length / sampleRate * 4)));
  for (let f = 0; f < scanFrames; f++) {
    fftAt(scanFrames === 1 ? Math.floor((samples.length - size) / 2) : Math.round(f * (samples.length - size) / (scanFrames - 1)));
    for (let k = firstBin; k <= lastBin; k++) power[k] += (real[k] ** 2 + imag[k] ** 2) * 4 / (sum * sum * scanFrames);
    if (f % 30 === 0) progress?.(.15 * f / scanFrames);
  }
  let total = 0;
  for (let k = firstBin; k <= lastBin; k++) {
    for (let d = -2; d <= 2; d++) if (k + d >= firstBin && k + d <= lastBin) smoothed[k] += power[k + d] * (3 - Math.abs(d)) / 9;
    total += smoothed[k];
  }
  let low = 80, high = Math.min(12000, sampleRate / 2);
  const fallback = !scanFrames || !Number.isFinite(total) || total <= 1e-12;
  if (!fallback) {
    let cumulative = 0, lowBin = firstBin, highBin = lastBin, foundLow = false;
    for (let k = firstBin; k <= lastBin; k++) {
      cumulative += smoothed[k];
      if (!foundLow && cumulative >= total * .002) { lowBin = k; foundLow = true; }
      if (cumulative >= total * .998) { highBin = k; break; }
    }
    // Outward margin/rounding avoids clipping the estimated useful spectrum.
    // Always include 250–4000 Hz, limited only by the source Nyquist frequency.
    low = Math.max(60, Math.min(250, Math.floor(lowBin * binHz * .9 / 10) * 10));
    high = Math.min(ceiling, Math.max(4000, Math.ceil(highBin * binHz * 1.1 / 100) * 100));
  }
  // Very high sample rates still need at least 64 distinct bins. Keep the
  // existing monotonic edge allocation and widen the upper limit if necessary.
  high = Math.min(sampleRate / 2, Math.max(high, Math.ceil((Math.max(1, Math.floor(low / binHz)) + bars - 1) * binHz / 100) * 100));
  const last = Math.min(size / 2 + 1, Math.floor(high * size / sampleRate) + 1);
  const edges = new Uint32Array(bars + 1); edges[0] = Math.max(1, Math.floor(low * size / sampleRate)); edges[bars] = last;
  for (let b = 1; b < bars; b++) edges[b] = Math.max(edges[b - 1] + 1, Math.min(last - (bars - b), Math.round(low * Math.pow(high / low, b / bars) * size / sampleRate)));
  progress?.(.15);
  for (let f = 0; f < frames; f++) {
    fftAt(Math.round(f * sampleRate / rate) - size / 2);
    for (let b = 0; b < bars; b++) {
      let power = 0; for (let k = edges[b]; k < edges[b + 1]; k++) power += real[k] ** 2 + imag[k] ** 2;
      const amplitude = Math.sqrt(power / Math.max(1, edges[b + 1] - edges[b])) * 2 / sum;
      raw[f * bars + b] = 20 * Math.log10(Math.max(1e-8, amplitude));
    }
    if (f % 120 === 0) progress?.(.15 + .85 * f / frames);
  }
  return { raw, rate, bars, frames, duration: samples.length / sampleRate,
    frequencyRange: { low, high, fallback }, fftSize: size, bandEdges: Array.from(edges), scanFrames };
}
J.analyzeNativePCM = analyzePCM;
const aborted = signal => { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
J.analyzeNativeAudio = async (buffer, signal, progress) => {
  aborted(signal);
  const mono = new Float32Array(buffer.length), channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  for (let i = 0; i < mono.length; i += 262144) {
    aborted(signal); const end = Math.min(i + 262144, mono.length);
    for (let c = 0; c < channels.length; c++) for (let j = i; j < end; j++) mono[j] += channels[c][j] / channels.length;
    progress?.(.05 * end / mono.length); await tick();
  }
  aborted(signal);
  const script = `const analyze = ${analyzePCM.toString()}; onmessage = e => { try { const r = analyze(e.data.samples, e.data.sampleRate, p => postMessage({progress:p})); postMessage({result:r}, [r.raw.buffer]); } catch(e) { postMessage({error:e.message}); } };`;
  const url = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }));
  let worker, stop;
  try {
    worker = new Worker(url);
    return await new Promise((resolve, reject) => {
      stop = () => reject(new DOMException('Cancelled', 'AbortError')); signal?.addEventListener('abort', stop, { once: true });
      worker.onmessage = e => e.data.error ? reject(new Error(e.data.error)) : e.data.result ? resolve(e.data.result) : progress?.(.05 + .95 * e.data.progress);
      worker.onerror = e => { e.preventDefault(); reject(new Error(e.message || 'Spectrum worker failed')); };
      worker.postMessage({ samples: mono, sampleRate: buffer.sampleRate }, [mono.buffer]);
    });
  } finally { signal?.removeEventListener('abort', stop); worker?.terminate(); URL.revokeObjectURL(url); }
};
J.shapeNativeSpectrum = async (analysis, settings, signal) => {
  const c = J.normalizeNativeSpectrum(settings), { raw, frames, bars, rate } = analysis;
  const values = new Float32Array(raw.length), baseline = new Float32Array(bars), current = new Float32Array(bars);
  const baseAlpha = 1 - Math.exp(-1 / (rate * .06)), release = 1 - Math.exp(-4.605 / (rate * c.returnMs / 1000)), amount = c.pulse / 100;
  for (let f = 0; f < frames; f++) {
    if (f % 300 === 0) { aborted(signal); await tick(); }
    let peak = -160; for (let b = 0; b < bars; b++) peak = Math.max(peak, raw[f * bars + b] + c.sensitivity);
    const energy = clamp((peak + 65) / 57, 0, 1), gate = energy * energy * (3 - 2 * energy);
    for (let b = 0; b < bars; b++) {
      const db = raw[f * bars + b] + c.sensitivity;
      const v = Math.pow(clamp((db - (peak - 36)) / 36, 0, 1), 1.3) * gate;
      // A fixed difference scale lets even a saturated sustained tone fall to zero.
      const pulse = clamp((v - baseline[b]) * 1.8, 0, 1);
      baseline[b] += (v - baseline[b]) * baseAlpha;
      const target = (1 - amount) * v + amount * pulse;
      current[b] = target >= current[b] ? target : current[b] + (target - current[b]) * release;
      if (current[b] < .015) current[b] = 0;
      values[f * bars + b] = current[b];
    }
  }
  aborted(signal); return { ...analysis, raw: undefined, values };
};
J.nativeSpectrumLevels = (data, t) => {
  const levels = new Float32Array(64);
  if (!data || t < 0 || t >= data.duration) return levels;
  const pos = t * data.rate, a = Math.min(data.frames - 1, Math.floor(pos)), b = Math.min(data.frames - 1, a + 1), mix = pos - Math.floor(pos);
  for (let k = 0; k < 64; k++) levels[k] = data.values[a * 64 + k] * (1 - mix) + data.values[b * 64 + k] * mix;
  return levels;
};
J.NativeSpectrumReader = class {
  constructor(spectrum, w, h) { this.spectrum = spectrum; this.w = w; this.h = h; this.canvas = J.layerCanvas(w, h); this.ctx = this.canvas.getContext('2d', { willReadFrequently: true }); }
  framePixels(t, layout, settings = this.spectrum.settings) {
    const ctx = this.ctx, c = J.normalizeNativeSpectrum(settings), rect = J.spectrumRect(this.w, this.h, 768, 120, layout);
    ctx.clearRect(0, 0, this.w, this.h);
    const gradient = ctx.createLinearGradient(0, rect.y + rect.height, 0, rect.y);
    gradient.addColorStop(0, c.bottom); gradient.addColorStop(1, c.top); ctx.fillStyle = gradient;
    const levels = J.nativeSpectrumLevels(this.spectrum.data, t), cell = rect.width / 64;
    for (let i = 0; i < 64; i++) if (levels[i] > 0) {
      const height = levels[i] * rect.height;
      ctx.fillRect(rect.x + cell * (i + .225), rect.y + rect.height - height, cell * .55, height);
    }
    const pixels = ctx.getImageData(0, 0, this.w, this.h).data;
    // Preserve intentional black bars as 030303; empty pixels stay RGB=0/alpha=0.
    for (let i = 0; i < pixels.length; i += 4) {
      if (!pixels[i + 3]) continue;
      const alpha = pixels[i + 3] / 255;
      for (let k = 0; k < 3; k++) pixels[i + k] = Math.round(pixels[i + k] * alpha);
      if (!(pixels[i] || pixels[i + 1] || pixels[i + 2])) pixels[i] = pixels[i + 1] = pixels[i + 2] = 3;
      pixels[i + 3] = 255;
    }
    return pixels;
  }
  async pixels(t, signal, layout) { aborted(signal); return this.framePixels(t, layout); }
  async close() {}
};
J.createSpectrumReader = (spectrum, w, h, t0, fps, total, signal) => spectrum.kind === 'generated'
  ? Promise.resolve(new J.NativeSpectrumReader(spectrum, w, h))
  : J.DecodedSpectrumReader.create(spectrum.front, spectrum.matte, w, h, t0, fps, total, signal);
J.spectrumSourceDuration = s => s?.kind === 'generated' ? s.data.duration : s ? J.spectrumDuration(s.front, s.matte) : 0;
})();

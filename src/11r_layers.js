/* Layer-only engine: SRT, binary matte/front frames and paired MP4 export. */
(() => {
'use strict';
J.layerApp = true;
J.layerText = (ja, en) => document.documentElement.lang === 'en' ? en : ja;
const msg = J.layerText;

J.validateCues = cues => {
  if (!Array.isArray(cues) || !cues.length || cues.length > 20000) throw new Error(msg('字幕は1〜20,000件で指定してください。', 'Provide 1–20,000 subtitle cues.'));
  return cues.map((c, i) => {
    if (!c || !Number.isFinite(c.start) || !Number.isFinite(c.end) || c.start < 0 || c.end <= c.start || typeof c.text !== 'string' || !c.text.trim())
      throw new Error(msg('字幕 ' + (i + 1) + ' の時刻または本文が不正です。', 'Invalid time or text in cue ' + (i + 1) + '.'));
    return { id: String(c.id || i + 1), start: c.start, end: c.end, text: c.text };
  }).sort((a, b) => a.start - b.start);
};
J.parseSRT = raw => {
  const blocks = String(raw).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim().split(/\n[ \t]*\n/);
  const cues = [], clock = '(\\d{2,}):([0-5]\\d):([0-5]\\d)[,.](\\d{3})';
  const re = new RegExp('^' + clock + '\\s*-->\\s*' + clock + '\\s*$');
  for (let i = 0; i < blocks.length; i++) {
    const rows = blocks[i].split('\n');
    if (/^\d+$/.test(rows[0].trim())) rows.shift();
    const m = (rows.shift() || '').trim().match(re);
    if (!m || !rows.join('\n').trim()) throw new Error(msg('SRTのブロック ' + (i + 1) + ' を読めません。', 'Cannot read SRT block ' + (i + 1) + '.'));
    const seconds = n => +m[n] * 3600 + +m[n + 1] * 60 + +m[n + 2] + +m[n + 3] / 1000;
    // SRT formatting tags are not lyric control syntax. Keep line breaks and punctuation literally.
    const text = rows.join('\n').replace(/<\/?(?:b|i|u|font)(?:\s[^>]*)?>/gi, '');
    cues.push({ id: String(i + 1), start: seconds(1), end: seconds(5), text });
  }
  return J.validateCues(cues);
};


J.defaultSpectrumLayout = () => ({ left: 3, bottom: 3, scaleX: 100, scaleY: 100 });
J.normalizeSpectrumLayout = value => {
  const out = J.defaultSpectrumLayout(), limits = { left: [-100, 100], bottom: [-100, 100], scaleX: [1, 400], scaleY: [1, 400] };
  for (const key of Object.keys(out)) if (Number.isFinite(value?.[key])) out[key] = Math.max(limits[key][0], Math.min(limits[key][1], value[key]));
  return out;
};
J.spectrumRect = (w, h, sourceW, sourceH, value) => {
  const p = J.normalizeSpectrumLayout(value);
  const baseWidth = w * 0.65;
  const width = baseWidth * p.scaleX / 100, height = baseWidth * sourceH / sourceW * p.scaleY / 100;
  return { x: w * p.left / 100, y: h * (1 - p.bottom / 100) - height, width, height };
};
J.spectrumMatteName = name => name.replace(/(\.[^.]+)$/, '_matte_dark$1');
J.findSpectrumMatte = (files, front) => {
  const wanted = J.spectrumMatteName(front.name).toLowerCase();
  const dir = f => (f.webkitRelativePath || '').replace(/[^/]+$/, '').toLowerCase();
  const matches = Array.from(files).filter(f => f.name.toLowerCase() === wanted && (!front.webkitRelativePath || dir(f) === dir(front)));
  return matches.length === 1 ? matches[0] : null; // Never guess among same-name files in different folders.
};

J.normalizeBloomThreshold = value => Number.isFinite(value) ? Math.max(0, Math.min(128, Math.round(value))) : 32;

const defaultProject = J.defaultProject;
J.defaultProject = () => {
  const p = defaultProject();
  p.layerOnly = true; p.includeAudio = false; p.keyBg = 'off';
  p.spectrumLayout = J.defaultSpectrumLayout();
  p.layerEffectsVersion = 1;
  p.bloomThreshold = 32;
  return p;
};
// Old layer releases forced these controls off and hid them from the UI.
J.upgradeLayerProject = (project, source) => {
  // Preserve the old onTwos-only project format without changing saved motion cadence.
  if (source?.fx && source.fx.koma == null) project.fx.koma = source.fx.onTwos === false ? 0 : 12;
  if (source?.layerOnly && !source.layerEffectsVersion) {
    const defaults = defaultProject().fx;
    for (const key of ['decor', 'texture', 'bgSwitch', 'hud', 'flash']) project.fx[key] = defaults[key];
  }
  project.layerEffectsVersion = 1;
  project.bloomThreshold = J.normalizeBloomThreshold(project.bloomThreshold);
  return project;
};
const plan = J.plan;
J.plan = (project, audio) => {
  const p = Object.assign({}, project, { layerOnly: true, keyBg: 'off', title: '', artist: '' });
  const out = plan(p, audio);
  out.bloomThreshold = J.normalizeBloomThreshold(project.bloomThreshold);
  out.layerOnly = true; out.keyBg = null; out.explicitCues = Array.isArray(project.subtitleCues);
  // Keep original colours, ornaments, graphics, effects and joins. Only omit standalone cards.
  out.cuts = out.cuts.filter(c => c.line >= 0 && c.layout !== 'interlude');
  out.cuts.forEach((c, i) => { c.index = i; });
  const media = J.layerSession;
  if (media?.merge && media.front) out.duration = Math.max(out.duration, J.spectrumDuration(media.front, media.matte));
  return out;
};
// Separate overlapping cues into non-overlapping tracks. Reindex cuts for morph/transition lookups.
J.layerTracks = plan => {
  const tracks = [];
  for (const line of plan.lines) {
    let track = tracks.find(g => g.end <= line.start);
    if (!track) { track = { end: -Infinity, lines: [] }; tracks.push(track); }
    track.lines.push(line); track.end = line.end;
  }
  return tracks.map(track => {
    const ids = new Set(track.lines.map(l => l.index));
    return Object.assign({}, plan, { lines: track.lines,
      cuts: plan.cuts.filter(c => ids.has(c.line)).map((c, index) => Object.assign({}, c, { index })) });
  });
};
// Reserve black artwork before flattening. Coverage follows the resulting RGB,
// never the soft alpha footprint: invisible blur/fade tails must stay empty.
J.layerPixels = rgba => {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3] / 255;
    if (!a) continue;
    const black = rgba[i] === 0 && rgba[i + 1] === 0 && rgba[i + 2] === 0;
    out[i] = Math.round((black ? 3 : rgba[i]) * a);
    out[i + 1] = Math.round((black ? 3 : rgba[i + 1]) * a);
    out[i + 2] = Math.round((black ? 3 : rgba[i + 2]) * a);
    out[i + 3] = (out[i] || out[i + 1] || out[i + 2]) ? 255 : 0;
  }
  return out;
};

// Only remove low-energy pixels ADDED by bloom, before deriving either output.
// Existing ink/particles (even dark ones) are protected by the pre-bloom frame.
// max RGB, rather than luminance, also protects saturated red/blue light.
J.layerBloomMin = 32;
J.cleanLayerBloom = (base, result, threshold = J.layerBloomMin) => {
  threshold = J.normalizeBloomThreshold(threshold);
  const coverage = J.layerPixels(base);
  for (let i = 0; i < result.length; i += 4) {
    if (coverage[i + 3]) continue;
    const brightness = Math.round(Math.max(result[i], result[i + 1], result[i + 2]) * result[i + 3] / 255);
    if (brightness < threshold) result[i] = result[i + 1] = result[i + 2] = result[i + 3] = 0;
  }
  return result;
};

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
J.layerCanvas = canvas;
J.binaryPixels = (rgba, matte = null) => {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const on = matte ? (matte[i] + matte[i + 1] + matte[i + 2]) < 384 : rgba[i + 3] >= 128;
    if (on && (rgba[i] || rgba[i + 1] || rgba[i + 2])) { out[i] = rgba[i]; out[i + 1] = rgba[i + 1]; out[i + 2] = rgba[i + 2]; out[i + 3] = 255; }
  }
  return out;
};
J.overPixels = (back, front) => {
  const out = new Uint8ClampedArray(back);
  for (let i = 0; i < front.length; i += 4) if (front[i + 3]) out.set(front.subarray(i, i + 4), i);
  return out;
};
J.pairPixels = rgba => {
  const front = new Uint8ClampedArray(rgba.length), matte = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] >= 128) {
      front[i] = rgba[i]; front[i + 1] = rgba[i + 1]; front[i + 2] = rgba[i + 2];
    }
    // The matte is exactly the inverse binary mask of the final front RGB.
    const m = (front[i] || front[i + 1] || front[i + 2]) ? 0 : 255;
    front[i + 3] = matte[i + 3] = 255;
    matte[i] = matte[i + 1] = matte[i + 2] = m;
  }
  return { front, matte };
};
J.LayerRenderer = class {
  constructor(w, h) {
    this.w = w; this.h = h; this.engine = new J.Renderer();
    this.raw = canvas(w, h); this.part = canvas(w, h); this.layer = canvas(w, h);
    this.front = canvas(w, h); this.matte = canvas(w, h); this.plans = new WeakMap();
  }
  draw(plan, t, fast = false) {
    const x = this.raw.getContext('2d', { willReadFrequently: true });
    x.clearRect(0, 0, this.w, this.h);
    let tracks = this.plans.get(plan);
    if (!tracks) { tracks = J.layerTracks(plan); this.plans.set(plan, tracks); }
    const active = tracks.filter(p => p.lines.some(l => t >= l.start && t < l.end) && p.cuts.some(c => t >= c.start && t < c.end));
    for (let i = 0; i < active.length; i++) {
      this.engine.frame(this.part.getContext('2d', { willReadFrequently: true }), active[i], t, {
        scale: this.w / plan.W, transparent: true, layerComposition: true, bloomThreshold: J.normalizeBloomThreshold(plan.bloomThreshold), noHud: i < active.length - 1, fast,
      });
      x.drawImage(this.part, 0, 0);
    }
    const pixels = J.layerPixels(x.getImageData(0, 0, this.w, this.h).data);
    this.layer.getContext('2d').putImageData(new ImageData(pixels, this.w, this.h), 0, 0);
    return pixels;
  }
  pair(pixels) {
    const p = J.pairPixels(pixels);
    this.front.getContext('2d').putImageData(new ImageData(p.front, this.w, this.h), 0, 0);
    this.matte.getContext('2d').putImageData(new ImageData(p.matte, this.w, this.h), 0, 0);
    return { front: this.front, matte: this.matte };
  }
};

function abort(signal) { if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError'); }
function event(target, name, signal, start) {
  return new Promise((resolve, reject) => {
    let timer;
    const clear = () => { clearTimeout(timer); target.removeEventListener(name, done); target.removeEventListener('error', bad); signal?.removeEventListener('abort', cancelled); };
    const done = () => { clear(); resolve(); }, bad = () => { clear(); reject(new Error(msg('メディアを読み込めません。対応形式を確認してください。', 'Cannot decode this media format.'))); };
    const cancelled = () => { clear(); reject(new DOMException('Cancelled', 'AbortError')); };
    target.addEventListener(name, done, { once: true }); target.addEventListener('error', bad, { once: true });
    signal?.addEventListener('abort', cancelled, { once: true });
    timer = setTimeout(() => { clear(); reject(new Error(msg('メディアの読み込みがタイムアウトしました。', 'Media load timed out.'))); }, 30000);
    if (signal?.aborted) { cancelled(); return; }
    try { start?.(); } catch (e) { clear(); reject(e); }
  });
}
J.loadLayerMedia = async (file, videoOnly = false) => {
  const video = videoOnly || file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|ogv)$/i.test(file.name);
  const el = document.createElement(video ? 'video' : 'img'), url = URL.createObjectURL(file);
  if (video) { el.muted = true; el.playsInline = true; el.preload = 'auto'; }
  try {
    await event(el, video ? 'loadeddata' : 'load', null, () => { el.src = url; if (video) el.load(); });
    if (video && (!Number.isFinite(el.duration) || el.duration <= 0)) throw new Error(msg('動画の長さを取得できません。', 'Cannot determine video duration.'));
    return { el, file, video, name: file.name, url, duration: video ? el.duration : Infinity,
      width: video ? el.videoWidth : el.naturalWidth, height: video ? el.videoHeight : el.naturalHeight,
      dispose() { if (video) el.pause(); el.removeAttribute('src'); if (video) el.load(); URL.revokeObjectURL(url); } };
  } catch (e) { URL.revokeObjectURL(url); throw e; }
};
J.seekLayerMedia = async (media, t, signal) => {
  abort(signal);
  if (!media.video) return;
  const target = Math.max(0, Math.min(t, Math.max(0, media.duration - 0.0001)));
  if (Math.abs(media.el.currentTime - target) < 0.00001 && media.el.readyState >= 2 && !media.el.seeking) return;
  await event(media.el, 'seeked', signal, () => { media.el.currentTime = target; });
  if (media.el.readyState < 2) await event(media.el, 'loadeddata', signal);
};
J.spectrumDuration = (front, matte) => matte ? Math.min(front.duration, matte.duration) : front.duration;
J.validateSpectrum = (front, matte, fps = 30) => {
  if (!front) throw new Error(msg('スペアナのフロント動画を選択してください。', 'Select a spectrum front video.'));
  if (!matte) return;
  if (front.width !== matte.width || front.height !== matte.height || Math.abs(front.duration - matte.duration) > 1 / fps + 0.005)
    throw new Error(msg('スペアナ2本の画面サイズと長さを揃えてください。', 'Spectrum videos must have matching dimensions and duration.'));
};
J.SpectrumReader = class {
  constructor(front, matte, w, h) {
    J.validateSpectrum(front, matte);
    this.front = front; this.matte = matte; this.w = w; this.h = h;
    this.a = canvas(w, h); this.b = canvas(w, h);
  }
  framePixels(layout, frontSample = null, matteSample = null) {
    const a = this.a.getContext('2d', { willReadFrequently: true }), b = this.b.getContext('2d', { willReadFrequently: true });
    a.fillStyle = '#000'; a.fillRect(0, 0, this.w, this.h);
    b.fillStyle = '#fff'; b.fillRect(0, 0, this.w, this.h);
    const r = J.spectrumRect(this.w, this.h, this.front.width, this.front.height, layout);
    if (frontSample) frontSample.draw(a, r.x, r.y, r.width, r.height);
    else a.drawImage(this.front.el, r.x, r.y, r.width, r.height);
    if (this.matte) {
      if (matteSample) matteSample.draw(b, r.x, r.y, r.width, r.height);
      else b.drawImage(this.matte.el, r.x, r.y, r.width, r.height);
    }
    return J.binaryPixels(a.getImageData(0, 0, this.w, this.h).data, this.matte ? b.getImageData(0, 0, this.w, this.h).data : null);
  }
  async pixels(t, signal, layout) {
    if (t < 0 || t >= J.spectrumDuration(this.front, this.matte)) return new Uint8ClampedArray(this.w * this.h * 4);
    await Promise.all([J.seekLayerMedia(this.front, t, signal), this.matte ? J.seekLayerMedia(this.matte, t, signal) : Promise.resolve()]);
    return this.framePixels(layout);
  }
};
J.exportLayerPair = async ({ plan, project, spectrum = null, range = null, signal, onProgress }) => {
  plan = Object.assign({}, plan, { bloomThreshold: J.normalizeBloomThreshold(project.bloomThreshold ?? plan.bloomThreshold) });
  const [w, h] = J.outputSize(project), fps = plan.fps;
  if (spectrum) J.validateSpectrum(spectrum.front, spectrum.matte, fps);
  const fullDuration = Math.max(plan.duration, spectrum ? J.spectrumDuration(spectrum.front, spectrum.matte) : 0);
  const t0 = range ? range.t0 : 0, end = range ? Math.min(fullDuration, range.t1) : fullDuration;
  const total = Math.max(1, Math.ceil((end - t0) * fps - 1e-7));
  const attempts = await J.videoAttempts(w, h, fps, J.videoBitrate(w, h, fps, project.quality || 'high'));
  if (!attempts.length) throw new Error(msg('MP4出力にはWebCodecs対応のChrome / Edgeが必要です。', 'MP4 export requires Chrome / Edge with WebCodecs.'));
  const errors = [];
  for (const codec of attempts) {
    abort(signal);
    const writers = [];
    let reader = null;
    try {
      if (spectrum) reader = await J.DecodedSpectrumReader.create(spectrum.front, spectrum.matte, w, h, t0, fps, total, signal);
      for (const name of ['front', 'matte']) {
        const target = new Mp4Muxer.ArrayBufferTarget();
        const mux = new Mp4Muxer.Muxer({ target, video: { codec: codec.mux, width: w, height: h, frameRate: fps }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
        const state = { name, target, mux, error: null, count: 0 };
        state.encoder = new VideoEncoder({ output(chunk, meta) { try { mux.addVideoChunk(chunk, meta); state.count++; } catch (e) { state.error = e; } }, error(e) { state.error = e; } });
        writers.push(state); state.encoder.configure(Object.assign({}, codec.cfg, { latencyMode: 'quality' }));
      }
      const render = new J.LayerRenderer(w, h);
      for (let i = 0; i < total; i++) {
        abort(signal);
        let pixels = render.draw(plan, t0 + i / fps);
        if (reader) pixels = J.overPixels(await reader.pixels(t0 + i / fps, signal, project.spectrumLayout), pixels);
        const pair = render.pair(pixels);
        for (const state of writers) {
          if (state.error) throw state.error;
          const vf = new VideoFrame(pair[state.name], { timestamp: Math.round(i * 1e6 / fps), duration: Math.round((i + 1) * 1e6 / fps) - Math.round(i * 1e6 / fps) });
          try { state.encoder.encode(vf, { keyFrame: i % (fps * 2) === 0 }); } finally { vf.close(); }
        }
        const deadline = performance.now() + 30000;
        while (writers.some(s => s.encoder.encodeQueueSize > 3)) {
          abort(signal);
          if (writers.some(s => s.error)) throw writers.find(s => s.error).error;
          if (performance.now() > deadline) throw new Error('Encoder timeout');
          await new Promise(r => setTimeout(r, 5));
        }
        if (i % 3 === 0) { onProgress?.(i / total, (i + 1) + ' / ' + total); await new Promise(r => setTimeout(r, 0)); }
      }
      for (const s of writers) {
        await Promise.race([s.encoder.flush(), new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Encoder flush timeout')), 30000); s.flushTimer = timer; })]);
        clearTimeout(s.flushTimer); abort(signal);
        if (s.error) throw s.error;
        if (s.count !== total) throw new Error('Incomplete video frames');
        s.mux.finalize();
      }
      const files = writers.map(s => ({
        name: (spectrum ? 'combined_front' : 'subtitle_front') + (s.name === 'matte' ? '_matte_dark' : '') + '.mp4',
        blob: new Blob([s.target.buffer], { type: 'video/mp4' }),
      }));
      const manifest = { format: 'jizura-binary-layer-pair-v1', width: w, height: h, fps, frames: total, timelineStart: t0, duration: total / fps,
        bloomThreshold: plan.bloomThreshold, matte: 'white=transparent, black=opaque; threshold decoded luminance at 128', front: 'RGB on black, no audio', composite: 'subtitle over spectrum', spectrumLayout: spectrum ? J.normalizeSpectrumLayout(project.spectrumLayout) : null };
      abort(signal); onProgress?.(1, msg('完了', 'Done'));
      return { files, manifest };
    } catch (e) {
      if (signal?.aborted || e.name === 'AbortError') throw e;
      errors.push(codec.label + ': ' + e.message);
    } finally {
      for (const s of writers) { clearTimeout(s.flushTimer); try { s.encoder.close(); } catch (_) {} }
      await reader?.close();
    }
  }
  throw new Error(msg('MP4出力に失敗しました。', 'MP4 export failed. ') + errors.join(' / '));
};
})();

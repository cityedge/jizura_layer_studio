/* Optional flattened MP4 output. Layer-pair exports stay silent and background-free. */
(() => {
'use strict';
const tr = J.layerText;
const number = (v, fallback, min, max) => Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
J.normalizeSimpleTitle = value => ({
  enabled: value?.enabled === true, text: typeof value?.text === 'string' ? value.text.slice(0, 2000).replace(/\r\n?/g, '\n') : '',
  all: value?.all !== false, start: number(value?.start, 0, 0, 86400), end: number(value?.end, 10, 0, 86400),
  font: typeof value?.font === 'string' && /^[\p{L}\p{N}_-]{1,110}$/u.test(value.font) ? value.font : 'gothic_bold',
  family: typeof value?.family === 'string' ? value.family.replace(/["\\\x00-\x1f\x7f]/g, '').trim().slice(0, 100) : '',
  bold: value?.bold !== false, italic: value?.italic === true, size: number(value?.size, 5, 1, 30),
  color: /^#[0-9a-f]{6}$/i.test(value?.color) ? value.color : '#ffffff', outline: value?.outline !== false,
  backing: value?.backing !== false, opacity: number(value?.opacity, 50, 0, 100),
  position: /^(top|middle|bottom)-(left|center|right)$/.test(value?.position) ? value.position : 'top-left',
  x: number(value?.x, 0, -100, 100), y: number(value?.y, 0, -100, 100), fade: value?.fade !== false,
});
J.normalizeSimpleExport = value => ({
  duration: Number.isFinite(value?.duration) && value.duration > 0 && value.duration <= 86400 ? value.duration : null,
  includeAudio: value?.includeAudio !== false,
  title: J.normalizeSimpleTitle(value?.title),
});
const defaults = J.defaultProject, upgrade = J.upgradeLayerProject;
J.defaultProject = () => ({ ...defaults(), simpleExport: J.normalizeSimpleExport() });
J.upgradeLayerProject = (project, source) => {
  upgrade(project, source); project.simpleExport = J.normalizeSimpleExport(project.simpleExport); return project;
};
J.simpleMaterialDuration = (plan, audio, front, matte, background = null) => {
  const buffer = audio?.buffer;
  const sound = buffer ? buffer.length / buffer.sampleRate : audio?.duration || 0;
  const spectrum = front ? J.spectrumDuration(front, matte) : 0;
  const ends = (plan?.lines || []).map(l => l.end);
  const video = background?.video ? (background.videoDuration ?? background.duration) : 0;
  return Math.max(0.001, ...ends, sound, spectrum, Number.isFinite(video) ? video : 0);
};
J.simpleExportSpan = (duration, fps, range) => {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 86400 || !Number.isFinite(fps) || fps <= 0)
    throw new Error(tr('出力時間は0秒より大きく、86,400秒以内で指定してください。', 'Duration must be greater than zero and at most 86,400 seconds.'));
  const t0 = range ? Math.max(0, range.t0) : 0, end = range ? Math.min(duration, range.t1) : duration;
  if (!Number.isFinite(t0) || !Number.isFinite(end) || end <= t0)
    throw new Error(tr('指定した出力時間と書き出し範囲が重なりません。', 'Duration does not overlap the selected export range.'));
  const frames = Math.max(1, Math.ceil((end - t0) * fps - 1e-7));
  return { t0, frames, duration: frames / fps };
};
J.simpleTitleError = value => {
  const s = J.normalizeSimpleTitle(value);
  if (!s.enabled) return '';
  if (!s.text.trim()) return tr('タイトル本文を入力するか、タイトル表示をオフにしてください。', 'Enter title text or turn off the title.');
  if (!s.all && s.end <= s.start) return tr('タイトルの終了は開始より後にしてください。', 'Title end must be after its start.');
  if (s.font === 'custom' && !s.family) return tr('PCにインストール済みのフォント名を入力してください。', 'Enter an installed PC font family.');
  return '';
};
J.simpleTitleWindow = (value, span) => {
  const s = J.normalizeSimpleTitle(value);
  if (!s.enabled || !s.text.trim() || !span) return null;
  const start = s.all ? span.t0 : Math.max(span.t0, s.start);
  const end = s.all ? span.t0 + span.duration : Math.min(span.t0 + span.duration, s.end);
  return end > start ? { start, end } : null;
};
J.simpleTitleAlpha = (value, t, span) => {
  const win = J.simpleTitleWindow(value, span);
  if (!win || t < win.start || t >= win.end) return 0;
  if (value.fade === false) return 1;
  const fade = Math.min(1, (win.end - win.start) / 2);
  return Math.max(0, Math.min(1, (t - win.start) / fade, (win.end - t) / fade));
};
J.simpleTitleFont = (s, px) => {
  const face = J.faceOf?.(s.font) || J.FONTS?.[s.font] || J.FONTS?.gothic_bold;
  const family = s.font === 'custom' ? '"' + s.family + '",sans-serif' : (face ? face.family + ',' + face.fb : 'sans-serif');
  return `${s.italic ? 'italic ' : ''}${s.bold ? 700 : 400} ${px}px ${family}`;
};
let titleFontRevision = 0;
J.ensureSimpleTitleFont = async value => {
  const s = J.normalizeSimpleTitle(value); if (!s.enabled) return;
  const error = J.simpleTitleError(s); if (error) throw new Error(error);
  const missing = J.missingUserFonts?.([s.font]);
  if (missing?.length) throw new Error(tr('タイトルの旧ファイル書体を変更してください。', 'Replace the legacy uploaded title font.'));
  if (s.font !== 'custom') await J.ensureFonts(s.text, [s.font]);
  await document.fonts?.load(J.simpleTitleFont(s, 64), s.text);
  titleFontRevision++;
};
// One measured layout is shared by both passes; no title pixels enter layer/matte exports.
const titleLayouts = new WeakMap();
J.simpleTitleFrame = (ctx, value, t, span) => {
  const s = J.normalizeSimpleTitle(value), alpha = J.simpleTitleAlpha(s, t, span);
  if (!alpha || J.simpleTitleError(s)) return null;
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const key = JSON.stringify([s, w, h, J.lang, document.fonts?.status, titleFontRevision]);
  let layout = titleLayouts.get(ctx);
  if (!layout || layout.key !== key) {
    const short = Math.min(w, h), pad = short * .018, margin = short * .035;
    let px = short * s.size / 100;
    const lines = s.text.split('\n');
    ctx.save(); ctx.font = J.simpleTitleFont(s, px);
    let width = Math.max(...lines.map(l => ctx.measureText(l).width), px);
    const scale = Math.min(1, (w - 2 * (margin + pad)) / width, (h - 2 * (margin + pad)) / (lines.length * px * 1.3));
    px *= scale; width *= scale;
    const height = lines.length * px * 1.3, [v, a] = s.position.split('-');
    const x = (a === 'left' ? margin + pad : a === 'right' ? w - margin - pad - width : (w - width) / 2) + s.x * w / 100;
    const y = (v === 'top' ? margin + pad : v === 'bottom' ? h - margin - pad - height : (h - height) / 2) + s.y * h / 100;
    // Bake the outline and fill together, then fade the result once. This avoids
    // the outline showing through a partially transparent fill during fades.
    const ink = J.layerCanvas(w, h), ix = ink.getContext('2d');
    ix.font = J.simpleTitleFont(s, px); ix.textBaseline = 'middle'; ix.textAlign = a;
    ix.lineJoin = 'round'; ix.lineWidth = Math.max(.5, px * .075); ix.strokeStyle = '#000'; ix.fillStyle = s.color;
    const tx = x + (a === 'left' ? 0 : a === 'right' ? width : width / 2);
    lines.forEach((line, i) => { const ty = y + (i + .5) * px * 1.3; if (s.outline) ix.strokeText(line, tx, ty); ix.fillText(line, tx, ty); });
    layout = { key, width, height, x, y, pad, ink };
    ctx.restore(); titleLayouts.set(ctx, layout);
  }
  return { ...layout, settings: s, alpha };
};
J.drawSimpleTitle = (ctx, frame, pass) => {
  if (!frame) return;
  const { settings: s, alpha, x, y, width, height, pad, ink } = frame;
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = alpha;
  if (pass === 'backing') {
    if (s.backing) { ctx.globalAlpha *= s.opacity / 100; ctx.fillStyle = '#000'; ctx.fillRect(x - pad, y - pad, width + pad * 2, height + pad * 2); }
  } else ctx.drawImage(ink, 0, 0);
  ctx.restore();
};
const abort = signal => { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); };
const tick = () => new Promise(r => setTimeout(r, 0));
async function bounded(promise, signal) {
  let timer, stop;
  try {
    abort(signal);
    return await Promise.race([promise, new Promise((_, reject) => {
      stop = () => reject(new DOMException('Cancelled', 'AbortError'));
      signal?.addEventListener('abort', stop, { once: true });
      timer = setTimeout(() => reject(new Error(tr('エンコードがタイムアウトしました。', 'Encoding timed out.'))), 30000);
    })]);
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', stop); }
}
async function drain(encoder, getError, signal) {
  const until = performance.now() + 30000;
  while (encoder.encodeQueueSize > 4) {
    abort(signal); if (getError()) throw getError();
    if (performance.now() > until) throw new Error(tr('エンコーダーが応答しません。', 'Encoder stopped responding.'));
    await tick();
  }
  if (getError()) throw getError();
}
// Resample at most five seconds at a time; long silent tails do not allocate a full-song buffer.
async function encodeSound(buffer, mux, span, config, signal, progress) {
  let error = null, count = 0;
  const encoder = new AudioEncoder({ output(chunk, meta) { try { mux.addAudioChunk(chunk, meta); count++; } catch (e) { error = e; } }, error(e) { error = e; } });
  try {
    encoder.configure(config);
    const sr = config.sampleRate, channels = config.numberOfChannels, total = Math.round(span.duration * sr);
    for (let offset = 0; offset < total; offset += sr * 5) {
      abort(signal);
      const length = Math.min(sr * 5, total - offset), sourceTime = span.t0 + offset / sr;
      let block = null;
      if (sourceTime < buffer.length / buffer.sampleRate) {
        const offline = new OfflineAudioContext(channels, length, sr), source = offline.createBufferSource();
        source.buffer = buffer; source.connect(offline.destination); source.start(0, sourceTime);
        block = await bounded(offline.startRendering(), signal);
      }
      for (let j = 0; j < length; j += 4800) {
        abort(signal);
        const n = Math.min(4800, length - j), data = new Float32Array(n * channels);
        if (block) for (let c = 0; c < channels; c++) data.set(block.getChannelData(c).subarray(j, j + n), c * n);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: channels, timestamp: Math.round((offset + j) * 1e6 / sr), data });
        try { encoder.encode(ad); } finally { ad.close(); }
        await drain(encoder, () => error, signal);
      }
      progress?.(0.9 + 0.09 * (offset + length) / total, tr('音声をエンコード中', 'Encoding audio')); await tick();
    }
    await bounded(encoder.flush(), signal); if (error) throw error;
    if (!count) throw new Error(tr('音声が出力されませんでした。', 'No encoded audio was produced.'));
  } finally { try { encoder.close(); } catch (_) {} }
}
J.exportSimpleVideo = async ({ plan, project, background = null, spectrum = null, audio = null, range = null, signal, onProgress }) => {
  if (background?.simpleError) throw new Error(background.simpleError);
  const settings = J.normalizeSimpleExport(project.simpleExport), span = J.simpleExportSpan(settings.duration, plan.fps, range);
  await J.ensureSimpleTitleFont(settings.title);
  const [w, h] = J.outputSize(project), fps = plan.fps;
  let audioConfig = null;
  if (settings.includeAudio && audio?.buffer) {
    audioConfig = { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: Math.min(2, audio.buffer.numberOfChannels), bitrate: 192000 };
    if (typeof AudioEncoder === 'undefined' || !await AudioEncoder.isConfigSupported(audioConfig).then(r => r.supported).catch(() => false))
      throw new Error(tr('この環境ではAAC音声を出力できません。「音源を含めない」を選ぶか対応環境で出力してください。', 'AAC audio encoding is unavailable. Select “Exclude audio” or use a supported environment.'));
  }
  abort(signal);
  const attempts = (await J.videoAttempts(w, h, fps, J.videoBitrate(w, h, fps, project.quality || 'high'))).filter(c => c.mux === 'avc');
  if (!attempts.length) throw new Error(tr('H.264 MP4出力に対応していません。', 'H.264 MP4 encoding is unavailable.'));
  const errors = [];
  for (const codec of attempts) {
    let reader = null, backgroundReader = null, encoder = null, error = null, count = 0, audioPhase = false;
    try {
      abort(signal);
      if (spectrum) reader = await J.createSpectrumReader(spectrum, w, h, span.t0, fps, span.frames, signal);
      if (background?.video) backgroundReader = await J.VideoBackgroundReader.create(background, span, fps, signal);
      const target = new Mp4Muxer.ArrayBufferTarget(), mux = new Mp4Muxer.Muxer({ target, video: { codec: 'avc', width: w, height: h, frameRate: fps },
        ...(audioConfig ? { audio: { codec: 'aac', sampleRate: audioConfig.sampleRate, numberOfChannels: audioConfig.numberOfChannels } } : {}), fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
      encoder = new VideoEncoder({ output(chunk, meta) { try { mux.addVideoChunk(chunk, meta); count++; } catch (e) { error = e; } }, error(e) { error = e; } });
      encoder.configure({ ...codec.cfg, latencyMode: 'quality' });
      const mode = J.normalizeLayerMode(project.layerMode);
      const render = new J.LayerRenderer(w, h, mode, project.layerBackgroundOpacity, project.hideDecorativeText), canvas = J.layerCanvas(w, h), base = J.layerCanvas(w, h);
      const ctx = canvas.getContext('2d'), bx = base.getContext('2d');
      bx.fillStyle = '#000'; bx.fillRect(0, 0, w, h);
      if (background && !background.video) {
        const ratio = Math.min(w / background.width, h / background.height), dw = background.width * ratio, dh = background.height * ratio;
        bx.drawImage(background.el, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
      for (let i = 0; i < span.frames; i++) {
        abort(signal);
        const t = span.t0 + i / fps;
        if (backgroundReader) await backgroundReader.drawNext(bx);
        let pixels = render.draw(plan, t);
        if (reader) pixels = J.composeLayerPixels(await reader.pixels(t, signal, project.spectrumLayout), pixels, mode);
        ctx.drawImage(base, 0, 0);
        const title = J.simpleTitleFrame(ctx, settings.title, t, span);
        J.drawSimpleTitle(ctx, title, 'backing');
        render.layer.getContext('2d').putImageData(new ImageData(pixels, w, h), 0, 0);
        ctx.drawImage(render.layer, 0, 0);
        J.drawSimpleTitle(ctx, title, 'text');
        const frame = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round((i + 1) * 1e6 / fps) - Math.round(i * 1e6 / fps) });
        try { encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 }); } finally { frame.close(); }
        await drain(encoder, () => error, signal);
        if (i % 3 === 0) { onProgress?.((audioConfig ? 0.9 : 0.99) * (i + 1) / span.frames, `${i + 1} / ${span.frames}`); await tick(); }
      }
      await bounded(encoder.flush(), signal); if (error) throw error;
      if (count !== span.frames) throw new Error(tr('映像フレームが不足しています。', 'Encoded video frames are incomplete.'));
      if (audioConfig) { audioPhase = true; await encodeSound(audio.buffer, mux, span, audioConfig, signal, onProgress); }
      abort(signal); mux.finalize(); onProgress?.(1, tr('完了', 'Done'));
      return { files: [{ name: 'simple_video.mp4', blob: new Blob([target.buffer], { type: 'video/mp4' }) }], ...span, audio: !!audioConfig };
    } catch (e) {
      if (signal?.aborted || e.name === 'AbortError') throw new DOMException('Cancelled', 'AbortError');
      if (audioPhase) throw e;
      errors.push(codec.label + ': ' + e.message);
    } finally { try { encoder?.close(); } catch (_) {} await Promise.allSettled([reader?.close(), backgroundReader?.close()]); }
  }
  throw new Error(tr('簡易動画の出力に失敗しました。', 'Simple export failed. ') + errors.join(' / '));
};
})();

/* Optional flattened MP4 output. Layer-pair exports stay silent and background-free. */
(() => {
'use strict';
const tr = J.layerText;
J.normalizeSimpleExport = value => ({
  duration: Number.isFinite(value?.duration) && value.duration > 0 && value.duration <= 86400 ? value.duration : null,
  includeAudio: value?.includeAudio !== false,
});
const defaults = J.defaultProject, upgrade = J.upgradeLayerProject;
J.defaultProject = () => ({ ...defaults(), simpleExport: J.normalizeSimpleExport() });
J.upgradeLayerProject = (project, source) => {
  upgrade(project, source); project.simpleExport = J.normalizeSimpleExport(project.simpleExport); return project;
};
J.simpleMaterialDuration = (plan, audio, front, matte) => {
  const buffer = audio?.buffer;
  const sound = buffer ? buffer.length / buffer.sampleRate : audio?.duration || 0;
  const spectrum = front ? J.spectrumDuration(front, matte) : 0;
  const ends = (plan?.lines || []).map(l => l.end);
  return Math.max(0.001, ...ends, sound, spectrum);
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
  if (background?.video) throw new Error(tr('簡易動画出力には背景を静止画に変更するか、解除してください。', 'Use a still background or clear the video background for simple export.'));
  const settings = J.normalizeSimpleExport(project.simpleExport), span = J.simpleExportSpan(settings.duration, plan.fps, range);
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
    let reader = null, encoder = null, error = null, count = 0, audioPhase = false;
    try {
      abort(signal);
      if (spectrum) reader = await J.createSpectrumReader(spectrum, w, h, span.t0, fps, span.frames, signal);
      const target = new Mp4Muxer.ArrayBufferTarget(), mux = new Mp4Muxer.Muxer({ target, video: { codec: 'avc', width: w, height: h, frameRate: fps },
        ...(audioConfig ? { audio: { codec: 'aac', sampleRate: audioConfig.sampleRate, numberOfChannels: audioConfig.numberOfChannels } } : {}), fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
      encoder = new VideoEncoder({ output(chunk, meta) { try { mux.addVideoChunk(chunk, meta); count++; } catch (e) { error = e; } }, error(e) { error = e; } });
      encoder.configure({ ...codec.cfg, latencyMode: 'quality' });
      const render = new J.LayerRenderer(w, h), canvas = J.layerCanvas(w, h), base = J.layerCanvas(w, h);
      const ctx = canvas.getContext('2d'), bx = base.getContext('2d');
      bx.fillStyle = '#000'; bx.fillRect(0, 0, w, h);
      if (background) {
        const ratio = Math.min(w / background.width, h / background.height), dw = background.width * ratio, dh = background.height * ratio;
        bx.drawImage(background.el, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
      for (let i = 0; i < span.frames; i++) {
        abort(signal);
        const t = span.t0 + i / fps;
        let pixels = render.draw(plan, t);
        if (reader) pixels = J.overPixels(await reader.pixels(t, signal, project.spectrumLayout), pixels);
        ctx.drawImage(base, 0, 0);
        render.layer.getContext('2d').putImageData(new ImageData(pixels, w, h), 0, 0);
        ctx.drawImage(render.layer, 0, 0);
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
    } finally { try { encoder?.close(); } catch (_) {} await reader?.close(); }
  }
  throw new Error(tr('簡易動画の出力に失敗しました。', 'Simple export failed. ') + errors.join(' / '));
};
})();

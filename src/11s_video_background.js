/* Background export uses decoded presentation timestamps, never preview seeks.
   Only the current output canvas is retained after the final video frame. */
(() => {
'use strict';
const tr = J.layerText, cancelled = () => new DOMException('Cancelled', 'AbortError');
J.VideoBackgroundReader = class {
  static async open(media, signal) {
    const reader = new J.VideoBackgroundReader();
    reader.signal = signal;
    reader.onAbort = () => reader.disposeInput();
    try {
      if (signal?.aborted) throw cancelled();
      if (typeof Mediabunny === 'undefined' || typeof VideoDecoder === 'undefined')
        throw new Error(tr('背景動画の出力にはVideoDecoder対応のChrome / Edgeが必要です。', 'Video backgrounds require Chrome / Edge with VideoDecoder.'));
      reader.input = new Mediabunny.Input({ source: new Mediabunny.BlobSource(media.file), formats: [Mediabunny.MP4, Mediabunny.QTFF, Mediabunny.WEBM, Mediabunny.MATROSKA, Mediabunny.OGG] });
      signal?.addEventListener('abort', reader.onAbort, { once: true });
      reader.track = await reader.wait(reader.input.getPrimaryVideoTrack());
      if (!reader.track || !await reader.wait(reader.track.canDecode()))
        throw new Error(tr('背景動画の映像コーデックをデコードできません: ', 'Cannot decode the background video codec: ') + media.name);
      const last = await reader.wait(new Mediabunny.EncodedPacketSink(reader.track).getPacket(Infinity, { metadataOnly: true }));
      reader.duration = await reader.wait(reader.track.computeDuration());
      if (!last || !Number.isFinite(last.timestamp) || !Number.isFinite(reader.duration) || reader.duration <= 0)
        throw new Error(tr('背景動画の映像の長さを取得できません。', 'Cannot determine the background video track duration.'));
      reader.lastTimestamp = last.timestamp;
      return reader;
    } catch (e) { await reader.close(); if (signal?.aborted) throw cancelled(); throw e; }
  }
  static async create(media, span, fps, signal) {
    const reader = await this.open(media, signal);
    try {
      function* times() {
        for (let i = 0; i < span.frames; i++) {
          const t = span.t0 + i / fps + 0.000001;
          yield t;
          if (t >= reader.lastTimestamp) break;
        }
      }
      reader.iterator = new Mediabunny.VideoSampleSink(reader.track).samplesAtTimestamps(times());
      return reader;
    } catch (e) { await reader.close(); throw e; }
  }
  disposeInput() {
    if (this.disposed) return;
    this.disposed = true; this.input?.dispose();
  }
  async wait(promise) {
    let timer, stop;
    try {
      if (this.signal?.aborted) throw cancelled();
      return await Promise.race([promise, new Promise((_, reject) => {
        stop = () => reject(cancelled());
        this.signal?.addEventListener('abort', stop, { once: true });
        timer = setTimeout(() => {
          this.disposeInput();
          reject(new Error(tr('背景動画の読み出しがタイムアウトしました。', 'Background video decoding timed out.')));
        }, 30000);
      })]);
    } finally { clearTimeout(timer); this.signal?.removeEventListener('abort', stop); }
  }
  async drawNext(ctx) {
    if (this.signal?.aborted) throw cancelled();
    if (this.held) return;
    const result = await this.wait(this.iterator.next().then(result => {
      if (this.disposed || this.signal?.aborted) { result.value?.close(); throw cancelled(); }
      return result;
    }));
    if (result.done) throw new Error(tr('背景動画のフレームが不足しています。', 'Background video frames ended unexpectedly.'));
    const sample = result.value;
    const { width: w, height: h } = ctx.canvas;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    if (!sample) return; // Preserve a positive track offset as leading black.
    try {
      const scale = Math.min(w / sample.displayWidth, h / sample.displayHeight);
      const dw = sample.displayWidth * scale, dh = sample.displayHeight * scale;
      sample.draw(ctx, (w - dw) / 2, (h - dh) / 2, dw, dh);
      this.lastDrawnTimestamp = sample.timestamp;
      this.held = sample.timestamp >= this.lastTimestamp - 0.000001;
    } finally { sample.close(); }
  }
  async close() {
    this.signal?.removeEventListener('abort', this.onAbort);
    this.disposeInput();
    if (this.iterator) await Promise.allSettled([this.iterator.return()]);
  }
};
J.probeBackgroundVideo = async media => {
  const reader = await J.VideoBackgroundReader.open(media);
  try { return reader.duration; } finally { await reader.close(); }
};
})();

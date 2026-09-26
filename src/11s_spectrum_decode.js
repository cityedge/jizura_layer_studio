/* Offline spectrum decoding. Preview video elements never supply export frames. */
(() => {
'use strict';
const msg = J.layerText;
const cancelled = () => new DOMException('Cancelled', 'AbortError');

J.DecodedSpectrumReader = class extends J.SpectrumReader {
  static async create(front, matte, w, h, t0, fps, total, signal) {
    const reader = new J.DecodedSpectrumReader(front, matte, w, h);
    reader.inputs = []; reader.iterators = []; reader.signal = signal;
    reader.onAbort = () => reader.inputs.forEach(input => input.dispose());
    signal?.addEventListener('abort', reader.onAbort, { once: true });
    try {
      if (signal?.aborted) throw cancelled();
      if (typeof Mediabunny === 'undefined' || typeof VideoDecoder === 'undefined')
        throw new Error(msg('スペアナの出力にはVideoDecoder対応のChrome / Edgeが必要です。', 'Spectrum export requires Chrome / Edge with VideoDecoder.'));
      for (const media of [front, matte].filter(Boolean)) {
        const input = new Mediabunny.Input({ source: new Mediabunny.BlobSource(media.file), formats: [Mediabunny.MP4, Mediabunny.QTFF, Mediabunny.WEBM, Mediabunny.MATROSKA, Mediabunny.OGG] });
        reader.inputs.push(input);
        const track = await reader.wait(input.getPrimaryVideoTrack());
        if (!track || !await reader.wait(track.canDecode()))
          throw new Error(msg('素材の映像コーデックをデコードできません: ', 'Cannot decode the source video codec: ') + media.name);
        const sink = new Mediabunny.VideoSampleSink(track);
        // Only compensate for sub-microsecond container/WebCodecs rounding at a frame boundary.
        // Do not rebase each track to its first frame: edit-list offsets must retain their meaning.
        function* times() { for (let i = 0; i < total; i++) yield t0 + i / fps + 0.000001; }
        reader.iterators.push(sink.samplesAtTimestamps(times()));
      }
      return reader;
    } catch (e) { await reader.close(); if (signal?.aborted) throw cancelled(); throw e; }
  }
  async wait(promise) {
    let timer, stop;
    try {
      if (this.signal?.aborted) throw cancelled();
      return await Promise.race([promise, new Promise((_, reject) => {
        stop = () => reject(cancelled());
        this.signal?.addEventListener('abort', stop, { once: true });
        timer = setTimeout(() => {
          this.inputs.forEach(input => input.dispose());
          reject(new Error(msg('素材フレームの読み出しがタイムアウトしました。', 'Source frame decoding timed out.')));
        }, 30000);
      })]);
    } finally { clearTimeout(timer); this.signal?.removeEventListener('abort', stop); }
  }
  async pixels(t, signal, layout) {
    if (signal?.aborted) throw cancelled();
    if (t < 0 || t >= J.spectrumDuration(this.front, this.matte)) return new Uint8ClampedArray(this.w * this.h * 4);
    const samples = [];
    try {
      // Sequential awaits ensure a partial failure still closes the other track's acquired frame.
      for (const iterator of this.iterators) {
        const result = await this.wait(iterator.next());
        if (result.done) throw new Error(msg('素材フレームが不足しています。', 'Source frames ended unexpectedly.'));
        samples.push(result.value);
      }
      this.lastTimestamps = samples.map(sample => sample?.timestamp ?? null);
      if (!samples[0] || (this.matte && !samples[1])) return new Uint8ClampedArray(this.w * this.h * 4);
      return this.framePixels(layout, samples[0], samples[1]);
    } finally { samples.forEach(sample => sample?.close()); }
  }
  async close() {
    this.signal?.removeEventListener('abort', this.onAbort);
    this.inputs.forEach(input => input.dispose());
    await Promise.allSettled(this.iterators.map(iterator => iterator.return()));
  }
};
})();

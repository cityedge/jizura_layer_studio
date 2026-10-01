/* Preview-only players: pitch-preserving media, plus decoded-PCM legacy 1x fallback. */
J.PreviewAudio = class {
  constructor(onError, onFallback) {
    this.onError = onError; this.onFallback = onFallback;
    this.media = null; this.url = null; this.serial = 0;
    this.mode = 'media'; this.buffer = null; this.ctx = null; this.gain = null; this.src = null;
    this.rate = 1; this.vol = 0.8; this.muted = false;
    this.running = false; this.pending = false; this.offset = 0; this.tail = null;
  }
  load(file, buffer = null) {
    this.clear(); this.buffer = buffer;
    try { this.loadMedia(file); }
    catch (_) { this.cancelReady?.(); this.ready = Promise.resolve(false); }
  }
  loadMedia(file) {
    const media = this.media = document.createElement('audio');
    media.preload = 'auto'; media.preservesPitch = true; this.applyVol();
    this.ready = new Promise(resolve => {
      const finish = ok => {
        media.removeEventListener('loadedmetadata', loaded); media.removeEventListener('error', failed);
        if (this.cancelReady === cancel) this.cancelReady = null;
        resolve(ok);
      };
      const loaded = () => finish(true), failed = () => finish(false), cancel = () => finish(false);
      this.cancelReady = cancel;
      media.addEventListener('loadedmetadata', loaded); media.addEventListener('error', failed);
    });
    media.addEventListener('ended', () => {
      if (this.media !== media || !this.running || this.mode !== 'media') return;
      this.pending = false; this.tail = { t: media.duration, at: performance.now() };
    });
    media.addEventListener('error', () => {
      if (this.media === media && this.running && this.mode === 'media') this.fail(this.serial);
    });
    this.url = URL.createObjectURL(file); media.src = this.url; media.load();
  }
  async play(offset, rate = this.rate, mode = this.mode) {
    this.stop();
    const token = this.serial, media = this.media;
    this.mode = mode; this.offset = Math.max(0, offset); this.rate = mode === 'legacy' ? 1 : rate;
    this.running = true; this.pending = true;
    // Some restricted players never settle play()/metadata promises. Do not hang forever.
    this.startTimer = setTimeout(() => { if (token === this.serial && this.pending) this.fail(token); }, 10000);
    try {
      if (mode === 'legacy') { await this.playLegacy(token); return; }
      if (!media || !await this.ready) throw new Error('Preview audio unavailable');
      if (token !== this.serial) return;
      media.playbackRate = this.rate; media.preservesPitch = true;
      if (this.offset >= media.duration) {
        this.started(); this.tail = { t: this.offset, at: performance.now() }; return;
      }
      media.currentTime = this.offset;
      await media.play();
      if (token === this.serial) this.started();
    } catch (err) { if (token === this.serial) this.fail(token); }
  }
  async playLegacy(token) {
    if (!this.buffer) throw new Error('No decoded preview audio');
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.gain = null;
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
    if (token !== this.serial) return;
    if (this.ctx.state !== 'running') throw new Error('Preview audio context unavailable');
    if (!this.gain) { this.gain = this.ctx.createGain(); this.gain.connect(this.ctx.destination); }
    this.applyVol();
    const now = this.ctx.currentTime;
    this.legacyStart = now - this.offset;
    if (this.offset < this.buffer.duration) {
      const src = this.src = this.ctx.createBufferSource(); src.buffer = this.buffer; src.connect(this.gain);
      src.start(now, this.offset);
    }
    this.started();
  }
  started() { this.pending = false; clearTimeout(this.startTimer); this.startTimer = null; }
  fail(token) {
    if (token !== this.serial || !this.running) return;
    const offset = this.time(), fallback = this.mode === 'media' && !!this.buffer;
    this.stop();
    if (fallback) {
      this.mode = 'legacy'; this.rate = 1;
      this.onFallback?.(offset);
      this.play(offset, 1, 'legacy');
    } else this.onError?.();
  }
  get seeking() { return this.mode === 'media' && !!this.media?.seeking; }
  time() {
    if (!this.running || this.pending) return this.offset;
    if (this.mode === 'legacy') return Math.max(0, this.ctx.currentTime - this.legacyStart);
    if (this.tail) return this.tail.t + (performance.now() - this.tail.at) * this.rate / 1000;
    return this.media?.currentTime ?? this.offset;
  }
  setRate(rate) {
    const t = this.time();
    if (this.tail) this.tail = { t, at: performance.now() };
    this.rate = this.mode === 'legacy' ? 1 : rate;
    if (this.mode === 'media' && this.media) { this.media.playbackRate = rate; this.media.preservesPitch = true; }
  }
  stop() {
    this.offset = this.time(); this.serial++; this.running = false; this.pending = false;
    clearTimeout(this.startTimer); this.startTimer = null;
    if (this.src) { try { this.src.stop(); } catch (_) {} try { this.src.disconnect(); } catch (_) {} this.src = null; }
    this.tail = null; this.media?.pause();
  }
  clear() {
    this.stop(); this.cancelReady?.();
    const old = this.media; this.media = null;
    if (old) { try { old.removeAttribute('src'); old.load(); } catch (_) {} }
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null; this.offset = 0; this.buffer = null;
  }
  setVol(v, muted) {
    if (v != null) this.vol = Math.max(0, Math.min(1, v));
    if (muted != null) this.muted = !!muted;
    this.applyVol();
  }
  applyVol() {
    if (this.media) { this.media.volume = this.vol * this.vol; this.media.muted = this.muted; }
    if (this.gain) {
      const v = this.muted ? 0 : this.vol * this.vol;
      try { this.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.015); } catch (_) { this.gain.gain.value = v; }
    }
  }
};

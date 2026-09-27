/* Editing-only media references never enter the serialized project. */
(() => {
'use strict';
const $ = id => document.getElementById(id), tr = J.layerText;
const session = { background: null, front: null, matte: null, busy: false, generation: {}, preview: 'composite' };
J.layerSession = session;
let renderer = null, spectrumPreview = null;
const dirty = () => { if (J.ui) J.ui.need = true; };
function syncMedia(m, t, playing) {
  if (!m?.video) return;
  const v = m.el, target = Math.max(0, Math.min(t, m.duration - 0.001));
  if (!v.seeking && Math.abs(v.currentTime - target) > (playing ? 0.15 : 0.0005)) v.currentTime = target;
  if (playing && t < m.duration) { if (v.paused) v.play().catch(() => {}); } else v.pause();
}
function fit(ctx, m, w, h) {
  const ratio = Math.min(w / m.width, h / m.height), dw = m.width * ratio, dh = m.height * ratio;
  ctx.drawImage(m.el, (w - dw) / 2, (h - dh) / 2, dw, dh);
}
J.drawLayerPreview = (ctx, plan, t, opt) => {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  if (!renderer || renderer.w !== w || renderer.h !== h) { renderer = new J.LayerRenderer(w, h); spectrumPreview = null; }
  let pixels = renderer.draw(plan, t, opt.fast);
  for (const m of [session.background, session.front, session.matte]) syncMedia(m, t, J.ui.playing);
  if (session.front && t < J.spectrumDuration(session.front, session.matte)) {
    if (!spectrumPreview || spectrumPreview.front !== session.front || spectrumPreview.matte !== session.matte)
      spectrumPreview = new J.SpectrumReader(session.front, session.matte, w, h);
    if (session.front.el.readyState >= 2 && (!session.matte || session.matte.el.readyState >= 2)) {
      pixels = J.overPixels(spectrumPreview.framePixels(J.ui.project.spectrumLayout), pixels);
    }
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  if (session.preview === 'matte') ctx.drawImage(renderer.pair(pixels).matte, 0, 0);
  else if (session.preview === 'front') ctx.drawImage(renderer.pair(pixels).front, 0, 0);
  else {
    if (session.preview === 'composite' && session.background) fit(ctx, session.background, w, h);
    renderer.layer.getContext('2d').putImageData(new ImageData(pixels, w, h), 0, 0);
    ctx.drawImage(renderer.layer, 0, 0);
  }
  ctx.restore();
};
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
function button(id, text, fn) { const b = el('button', text); b.type = 'button'; b.id = id; b.addEventListener('click', fn); return b; }
function fileInput(id, text, accept, fn) {
  const label = el('label', text, 'file'), input = el('input'); input.type = 'file'; input.id = id; input.accept = accept;
  input.addEventListener('change', async () => { const f = input.files?.[0]; if (!f) return; try { await fn(f, Array.from(input.files)); } catch (e) { status(e.message, true); } finally { input.value = ''; } });
  label.append(input); return label;
}
const cueDrafts = new Map();
let showingCueError = false;
function status(text, error = false) {
  const draftError = [...cueDrafts.values()].find(d => d.error)?.error;
  const s = $('layerStatus'); s.textContent = draftError || text; s.classList.toggle('error', !!draftError || error);
}
function syncCueErrors() {
  const error = [...cueDrafts.values()].find(d => d.error)?.error;
  J.layerCueEditsInvalid = !!error;
  if (error) status(error, true); else if (showingCueError) status('');
  showingCueError = !!error;
  if ($('layerExport')) $('layerExport').disabled = session.busy || !!error;
  document.querySelectorAll('.cue-actions button[id^="cue-add-"]').forEach(b => { b.disabled = session.busy || !!error; });
  if ($('layerAddCue')) {
    const atZero = J.ui.project.subtitleCues?.some(c => c.start === 0);
    $('layerAddCue').disabled = session.busy || !!error || !!atZero;
    $('layerAddCue').title = atZero ? tr('先頭の字幕が0秒から始まるため追加できません。', 'The first cue starts at zero; there is no room before it.') : tr('0秒から最初の字幕までの範囲に、最長3秒で追加します。', 'Add up to 3 seconds from zero, ending before the first cue.');
  }
  J.syncFillerUI?.();
}
function changed() { const a = J.uiApi; a.pause(); a.syncUI(); a.replan(); a.flushSave(); }
async function loadMedia(key, file, videoOnly) {
  const n = session.generation[key] = (session.generation[key] || 0) + 1;
  status(tr('読み込み中…', 'Loading…'));
  const m = await J.loadLayerMedia(file, videoOnly);
  if (session.generation[key] !== n) { m.dispose(); return; }
  if ((key === 'matte' || key === 'front' && !session.front) && session[key === 'front' ? 'matte' : 'front']) {
    try { J.validateSpectrum(key === 'front' ? m : session.front, key === 'matte' ? m : session.matte, J.ui.project.fps); }
    catch (e) { m.dispose(); throw e; }
  }
  if (key === 'front' && session.front) clearMedia('matte');
  session[key]?.dispose(); session[key] = m;
  if (m.video) { m.el.addEventListener('seeked', dirty); m.el.addEventListener('loadeddata', dirty); }
  $('layerName-' + key).textContent = file.name;
  if (key !== 'background') J.uiApi.replan();
  status(tr('読み込みました。素材はこの作業中だけ保持します。', 'Loaded. Media is kept for this editing session only.'));
  J.syncLayerUI(); dirty();
}

async function loadSpectrumPair(frontFile, matteFile) {
  const ftoken = session.generation.front = (session.generation.front || 0) + 1;
  const mtoken = session.generation.matte = (session.generation.matte || 0) + 1;
  status(tr('スペアナのペアを読み込み中…', 'Loading spectrum pair…'));
  const loaded = await Promise.allSettled([J.loadLayerMedia(frontFile, true), J.loadLayerMedia(matteFile, true)]);
  const dispose = () => loaded.forEach(r => { if (r.status === 'fulfilled') r.value.dispose(); });
  if (ftoken !== session.generation.front || mtoken !== session.generation.matte) { dispose(); return; }
  const failed = loaded.find(r => r.status === 'rejected');
  if (failed) { dispose(); throw failed.reason; }
  const [front, matte] = loaded.map(r => r.value);
  try { J.validateSpectrum(front, matte, J.ui.project.fps); } catch (e) { dispose(); throw e; }
  for (const [key, media] of [['front', front], ['matte', matte]]) {
    session[key]?.dispose(); session[key] = media;
    media.el.addEventListener('seeked', dirty); media.el.addEventListener('loadeddata', dirty);
    $('layerName-' + key).textContent = media.name;
  }
  J.uiApi.replan(); J.syncLayerUI(); dirty();
  status(tr('対応マットを自動読込: ', 'Matching matte loaded: ') + matteFile.name);
}
async function selectSpectrumFront(file, selected) {
  const fronts = selected.filter(f => !/_matte_dark\.[^.]+$/i.test(f.name));
  if (fronts.length !== 1) throw new Error(tr('フロント1本を選んでください。対応マットは任意です。', 'Select one front video, optionally with its matching matte.'));
  const front = fronts[0], matte = J.findSpectrumMatte(selected, front);
  if (matte) return loadSpectrumPair(front, matte);
  if (selected.length > 1) throw new Error(tr('同名_matte_darkの組み合わせが見つかりません。', 'No matching _matte_dark pair was found.'));
  await loadMedia('front', front, true);
  status(session.matte ? tr('フロントとマットで合成します。', 'Compositing with front and matte.') : tr('フロントを読み込みました。マットなし：RGB 000000だけを透明にして合成します。', 'Front loaded. No matte: only RGB 000000 is transparent.'));
}
function spectrumControls(panel) {
  panel.append(el('p', tr('フロントと同名_matte_darkを2本まとめて選ぶと、自動でペアを読み込みます。', 'Select both the front and its _matte_dark file to load the pair automatically.'), 'note'));
  const grid = el('div', null, 'spectrum-position');
  for (const [key, ja, en, min, max] of [
    ['left', '左から（画面幅%）', 'Left (% of frame width)', -100, 100],
    ['bottom', '下から（画面高%）', 'Bottom (% of frame height)', -100, 100],
    ['scaleX', '横倍率（%）', 'Horizontal scale (%)', 1, 400],
    ['scaleY', '縦倍率（%）', 'Vertical scale (%)', 1, 400],
  ]) {
    const label = el('label', tr(ja, en)), input = el('input');
    input.type = 'number'; input.min = min; input.max = max; input.step = '0.5'; input.id = 'spectrum-' + key;
    input.setAttribute('aria-label', tr(ja, en));
    input.addEventListener('input', () => {
      if (!Number.isFinite(input.valueAsNumber)) return;
      J.ui.project.spectrumLayout = J.normalizeSpectrumLayout({ ...J.ui.project.spectrumLayout, [key]: input.valueAsNumber });
      J.uiApi.flushSave(); dirty();
    });
    input.addEventListener('change', () => J.syncLayerUI());
    label.append(input); grid.append(label);
  }
  panel.append(el('h3', tr('スペアナの位置・倍率', 'Spectrum position and scale')), grid,
    el('p', tr('基本幅は画面の65%。横・縦100%で元の縦横比を維持。左右・上下の倍率は独立し、素材枠の左端・下端が位置の基準です。', 'Base width is 65% of the frame. Both scales at 100% preserve the source aspect ratio. Scales are independent; position anchors the left and bottom source edges.'), 'note'),
    button('spectrumReset', tr('基本位置に戻す', 'Reset position'), () => {
      J.ui.project.spectrumLayout = J.defaultSpectrumLayout(); J.uiApi.flushSave(); J.syncLayerUI(); dirty();
    }));
}


function bloomControls(panel) {
  const section = el('div', null, 'layer-bloom'); section.id = 'layerBloomControls';
  const label = el('label', tr('外周ブルームの除去', 'Exterior bloom cleanup'));
  label.htmlFor = 'layerBloomRange';
  const row = el('div', null, 'layer-bloom-inputs');
  const range = el('input'), number = el('input');
  for (const input of [range, number]) {
    input.type = input === range ? 'range' : 'number';
    input.min = '0'; input.max = '128'; input.step = '1';
    input.id = input === range ? 'layerBloomRange' : 'layerBloomNumber';
    input.setAttribute('aria-label', tr('外周ブルームの除去しきい値', 'Exterior bloom cleanup threshold'));
    input.setAttribute('aria-describedby', 'layerBloomHelp');
    input.addEventListener('input', () => {
      if (!Number.isFinite(input.valueAsNumber) || session.busy) return;
      const value = J.normalizeBloomThreshold(input.valueAsNumber);
      J.ui.project.bloomThreshold = value;
      if (J.ui.plan) J.ui.plan.bloomThreshold = value;
      range.value = value;
      if (input === range) number.value = value;
      J.uiApi.flushSave(); dirty();
    });
    input.addEventListener('change', () => {
      const value = J.normalizeBloomThreshold(J.ui.project.bloomThreshold);
      range.value = number.value = value;
    });
  }
  const reset = button('layerBloomReset', tr('32に戻す', 'Reset to 32'), () => {
    J.ui.project.bloomThreshold = 32;
    if (J.ui.plan) J.ui.plan.bloomThreshold = 32;
    range.value = number.value = 32;
    J.uiApi.flushSave(); dirty();
  });
  row.append(range, number);
  const help = el('p', tr('0〜128（初期値32）。0は除去なし。大きいほど外側の暗い光彩を強く除去します。文字・図形・火花は保持します。プレビューと出力に反映し、プロジェクトに保存します。',
    '0–128 (default 32). 0 disables cleanup. Higher values remove more dim exterior glow. Text, shapes and sparks are preserved. Applies to preview and export; saved with the project.'), 'note');
  help.id = 'layerBloomHelp';
  section.append(label, row, reset, help); panel.append(section);
}

function clearMedia(key) {
  session.generation[key] = (session.generation[key] || 0) + 1;
  session[key]?.dispose(); session[key] = null; $('layerName-' + key).textContent = tr('未選択', 'None');
  if (key !== 'background') {
    J.uiApi.replan();
    if (key === 'matte' && session.front) status(tr('マットを解除しました。RGB 000000だけを透明にします。', 'Matte removed. Only RGB 000000 is transparent.'));
  }
  J.syncLayerUI(); dirty();
}
let downloadUrls = [];
function clearDownloads() {
  $('layerDownloads')?.replaceChildren();
  downloadUrls.forEach(url => URL.revokeObjectURL(url)); downloadUrls = [];
}
function offerDownloads(files, title) {
  clearDownloads();
  const prefix = (title || 'jizura_layers').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 60);
  const links = files.map(file => {
    const a = el('a', file.name.includes('_matte_dark') ? tr('マットMP4を保存', 'Save matte MP4') : tr('フロントMP4を保存', 'Save front MP4'));
    a.href = URL.createObjectURL(file.blob); downloadUrls.push(a.href);
    a.download = prefix + '_' + file.name; a.title = a.download;
    $('layerDownloads').append(a);
    return a;
  });
  // Keep these links alive so each file can also be saved by an explicit user click.
  links.forEach(a => a.click());
}
window.addEventListener('pagehide', e => { if (!e.persisted) clearDownloads(); });
async function exportPair() {
  if (J.ui.exporting) return;
  // Commit the focused editor before capturing the plan; never export stale valid data.
  document.activeElement?.blur();
  syncCueErrors();
  if (J.layerCueEditsInvalid) return;
  let spectrum = null;
  try {
    if (session.front) { J.validateSpectrum(session.front, session.matte, J.ui.project.fps); spectrum = { front: session.front, matte: session.matte }; }
    J.uiApi.pause();
    const ac = new AbortController(); J.ui.exporting = ac; session.busy = true;
    for (const m of [session.background, session.front, session.matte]) if (m?.video) m.el.pause();
    // Disable mutation while a fixed project/plan is encoded.
    const controls = [...document.querySelectorAll('#app button, #app input, #app select, #app textarea')];
    const disabled = controls.map(e => e.disabled);
    controls.forEach(e => { e.disabled = true; }); $('layerCancel').disabled = false;
    $('layerCancel').hidden = false; $('layerProgress').hidden = false;
    clearDownloads();
    status(tr('フォントを準備中…', 'Preparing fonts…'));
    try {
      const project = structuredClone(J.ui.project), plan = J.ui.plan, range = J.uiApi.exportRange();
      await J.ensureFonts(project.lyrics, J.fontsOfPlan(plan));
      const missing = J.missingUserFonts(J.fontsOfPlan(plan));
      if (missing.length) throw new Error(tr('不足しているフォントを読み直してください: ', 'Reload missing fonts: ') + missing.join(', '));
      const pair = await J.exportLayerPair({ plan, project, spectrum, range, signal: ac.signal,
        onProgress(p, m) { $('layerProgress').value = p; status(tr('ペア動画を生成中 ', 'Encoding pair ') + m); } });
      if (ac.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      offerDownloads(pair.files, project.title);
      status(tr('2本のMP4を生成し、ダウンロードを開始しました。保存されない場合は下のリンクから個別に保存してください。', 'Two MP4s are ready and downloads have started. If either is missing, save it using the links below.'));
    } finally {
      controls.forEach((e, i) => { e.disabled = disabled[i]; });
      J.ui.exporting = null; session.busy = false; $('layerCancel').hidden = true; dirty(); J.syncLayerUI();
    }
  } catch (e) { status(e.name === 'AbortError' ? tr('出力を中止しました。', 'Export cancelled.') : e.message, e.name !== 'AbortError'); }
}
function cueTable() {
  const root = $('layerCues'), cues = J.ui.project.subtitleCues;
  root.replaceChildren(); root.hidden = !Array.isArray(cues);
  if (!cues) return;
  const title = el('summary', tr('SRTの本文・開始・終了を編集', 'Edit SRT text, start and end'));
  root.append(title);
  const addCue = afterIndex => {
    if (J.layerCueEditsInvalid) return;
    if (J.ui.project.subtitleCues.length >= 20000) { status(tr('字幕は20,000件まで追加できます。', 'The limit is 20,000 cues.'), true); return; }
    J.uiApi.pushEdit(); const index = J.addLayerCue(J.ui.project, afterIndex);
    changed(); J.editLayerCueText(index);
    J.uiApi.toast(tr('通常字幕を追加しました。本文と時刻を編集できます（Ctrl+Zで戻す）。', 'Normal cue added. Edit its text and times (Ctrl+Z to undo).'));
  };
  const add = button('layerAddCue', tr('先頭に字幕を追加', 'Add subtitle at start'), () => addCue(null));
  root.append(add, el('p', tr('空欄は描画なし。全角スペースは文字として保持し、半角スペースで区分できます。追加は最長3秒、他の字幕の時刻は動かしません。重なる場合は時刻を調整してください。',
    'Empty text draws nothing. Ideographic spaces are retained; ASCII spaces separate groups. New cues last up to 3s without moving other cues. Adjust times if they overlap.'), 'note'));
  cues.forEach((cue, i) => {
    const row = el('div', null, 'layer-cue'), label = el('strong', String(i + 1));
    row.classList.toggle('is-filler', !!cue.filler);
    if (cue.filler) row.append(el('span', tr('フィラー', 'Filler'), 'filler-badge'));
    const start = el('input'), end = el('input'), text = el('textarea');
    [start, end].forEach(e => { e.type = 'number'; e.step = '0.001'; e.min = '0'; });
    start.value = cue.start; end.value = cue.end; text.value = cue.text; text.rows = Math.min(4, cue.text.split('\n').length + 1);
    const draft = cueDrafts.get(cue.id);
    if (draft) { start.value = draft.start; end.value = draft.end; text.value = draft.text; }
    start.setAttribute('aria-label', tr('字幕', 'Cue ') + (i + 1) + tr(' 開始秒', ' start seconds'));
    end.setAttribute('aria-label', tr('字幕', 'Cue ') + (i + 1) + tr(' 終了秒', ' end seconds'));
    text.setAttribute('aria-label', tr('字幕', 'Cue ') + (i + 1) + tr(' 本文', ' text'));
    const feedback = el('span', null, 'cue-error'); feedback.id = 'cue-error-' + i; feedback.setAttribute('role', 'status');
    const readDraft = event => {
      const d = { base: JSON.stringify(cue), start: start.value, end: end.value, text: text.value, error: '' };
      try {
        if (d.start === '' || d.end === '') throw new Error(tr('開始・終了時刻を入力してください。', 'Enter both start and end times.'));
        if (event.target === start && Number.isFinite(+d.start)) { d.end = String(+d.start + (cue.end - cue.start)); end.value = d.end; }
        if (!Number.isFinite(+d.start) || !Number.isFinite(+d.end) || +d.start < 0 || +d.end <= +d.start)
          throw new Error(tr('開始は0秒以上、終了は開始より後にしてください。', 'Start must be at least zero; end must be after start.'));
        d.next = { start: +d.start, end: +d.end, text: d.text };
      } catch (e) { d.error = tr('字幕 ' + (i + 1) + '：', 'Cue ' + (i + 1) + ': ') + e.message; }
      cueDrafts.set(cue.id, d); feedback.textContent = d.error;
      for (const input of [start, end]) { input.setAttribute('aria-invalid', String(!!d.error)); input.setAttribute('aria-describedby', feedback.id); }
      syncCueErrors(); return d;
    };
    const save = event => {
      const d = readDraft(event); if (d.error) return;
      const index = J.ui.project.subtitleCues.findIndex(c => c.id === cue.id);
      if (JSON.stringify(d.next) !== JSON.stringify({ start: cue.start, end: cue.end, text: cue.text })) {
        J.uiApi.pushEdit(); J.editLayerCue(J.ui.project, index, d.next);
      }
      cueDrafts.delete(cue.id); syncCueErrors(); changed();
    };
    [start, end, text].forEach(e => { e.addEventListener('input', readDraft); e.addEventListener('change', save); });
    if (draft) { feedback.textContent = draft.error; for (const input of [start, end]) input.setAttribute('aria-invalid', String(!!draft.error)); }
    const actions = el('div', null, 'cue-actions');
    const insert = button('cue-add-' + i, tr('この後に追加', 'Add after'), () => addCue(J.ui.project.subtitleCues.findIndex(c => c.id === cue.id)));
    const remove = button('cue-delete-' + i, tr('削除', 'Delete'), () => {
      const index = J.ui.project.subtitleCues.findIndex(c => c.id === cue.id);
      J.uiApi.pushEdit(); J.deleteLayerCue(J.ui.project, index); cueDrafts.delete(cue.id); syncCueErrors(); changed();
      J.uiApi.toast(tr('字幕を削除しました（Ctrl+Zで戻せます）。', 'Subtitle deleted (Ctrl+Z to undo).'));
    });
    insert.setAttribute('aria-label', tr('字幕' + (i + 1) + 'の後に追加', 'Add after cue ' + (i + 1)));
    remove.setAttribute('aria-label', tr('字幕' + (i + 1) + 'を削除', 'Delete cue ' + (i + 1)));
    actions.append(insert, remove);
    row.append(label, start, el('span', '→'), end, text, feedback, actions); root.append(row);
  });
}
J.editLayerCueText = index => {
  const root = $('layerCues'); root.open = true;
  const text = root.querySelectorAll('textarea')[index];
  text?.scrollIntoView({ block: 'center' }); text?.focus();
};
let cueSignature = '';
J.syncLayerUI = () => {
  if (!$('layerPanel') || session.busy) return;
  J.syncFillerUI?.();
  const cues = J.ui.project.subtitleCues, srt = Array.isArray(cues);
  for (const [id, draft] of cueDrafts) if (JSON.stringify(cues?.find(c => c.id === id)) !== draft.base) cueDrafts.delete(id);
  syncCueErrors();
  document.documentElement.classList.toggle('srt-active', srt);
  $('lyrics').readOnly = srt; $('lyrics').value = J.ui.project.lyrics;
  $('layerSrtInfo').textContent = srt ? cues.length + tr('件の字幕（本文・時刻を編集できます）', ' cues (text and timing are editable)') : tr('SRTを読み込むか、字幕を入力してください。', 'Import SRT or type subtitles.');
  const signature = JSON.stringify(cues);
  if (signature !== cueSignature) { cueSignature = signature; cueTable(); syncCueErrors(); }
  J.ui.project.spectrumLayout = J.normalizeSpectrumLayout(J.ui.project.spectrumLayout);
  for (const [key, value] of Object.entries(J.ui.project.spectrumLayout)) {
    const input = $('spectrum-' + key); if (input) input.value = value;
  }
  J.ui.project.bloomThreshold = J.normalizeBloomThreshold(J.ui.project.bloomThreshold);
  for (const id of ['layerBloomRange', 'layerBloomNumber']) if ($(id)) $(id).value = J.ui.project.bloomThreshold;
  const ready = !!session.front;
  $('layerName-matte').textContent = session.matte ? session.matte.name : (ready ? tr('未指定：RGB 000000を透明化', 'None: RGB 000000 is transparent') : tr('未選択（任意）', 'None (optional)'));
};
function boot() {
  document.documentElement.classList.add('layer-app');
  const guide = $('guideDlg');
  document.querySelectorAll('.guide-open').forEach(b => b.addEventListener('click', () => {
    J.uiApi.pause();
    if ($('termsDlg').open) $('termsDlg').close();
    guide.showModal();
    guide.scrollTop = 0;
    $('guideTitle').focus({ preventScroll: true });
  }));
  $('songTitle').placeholder = tr('プロジェクト名', 'Project name');
  $('songTitle').title = tr('出力ファイル名に使用', 'Used for export filenames');
  for (const id of ['outKey', 'eKey', 'outAudio']) $(id)?.closest('label')?.classList.add('layer-removed');
  $('colorOn').closest('label').previousElementSibling.textContent = tr('文字色', 'Text colors');
  $('colorOn').closest('label').querySelector('span').textContent = tr('文字色を指定する', 'Override text colors');
  document.querySelector('.col-left h2').textContent = tr('字幕', 'Subtitles');
  const panel = el('section', null, 'layer-panel'); panel.id = 'layerPanel';
  const inputs = el('div', null, 'layer-controls');
  inputs.append(fileInput('layerSrt', tr('SRTを読み込む', 'Import SRT'), '.srt', async file => {
    const cues = J.parseSRT(new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()));
    cueDrafts.clear(); syncCueErrors();
    J.uiApi.pushEdit(); Object.assign(J.ui.project, { subtitleCues: cues, lyrics: cues.map(c => c.text).join('\n\n'), overrides: {}, exportRange: null });
    J.ui.project.timing.lineTimes = {}; changed(); J.uiApi.seek(0);
    status(tr('SRTを読み込みました。終了時刻・改行・空白区間を保持します。', 'SRT imported. End times, line breaks and gaps are preserved.'));
  }));
  const info = el('p', '', 'note'); info.id = 'layerSrtInfo';
  const cues = el('details'); cues.id = 'layerCues';
  panel.append(inputs, info, cues);
  J.mountFillerUI(inputs);
  const spectrumHeading = el('h3', tr('スペアナ合成（字幕が手前・0秒で同期）', 'Spectrum composite (subtitles in front, aligned at 0s)'));
  const mergeHelp = el('p', tr('フロント動画を読み込むと自動合成します。合成しない場合はフロント動画を「解除」してください。マットは任意です。未指定ならRGB 000000だけを透明化します。指定する場合はフロントとサイズ・長さを揃えてください。基本は幅65%・左下3%余白で配置し、終了後は空白になります。素材は再起動時に選び直してください。', 'Loading a front video automatically composites it. Clear the front video to stop compositing. Matte is optional. Without it, only RGB 000000 is transparent. If supplied, match the front size and duration. Default: 65% width, 3% margins at left/bottom. Empty after the end. Reselect media after reopening.'), 'note');
  for (const [key, ja, en, accept, only] of [
    ['background', '作業用背景（画像・動画）', 'Preview background (image/video)', 'image/*,video/*', false],
    ['front', 'スペアナのフロント動画', 'Spectrum front video', 'video/*', true],
    ['matte', 'スペアナのマット動画（任意）', 'Spectrum matte video (optional)', 'video/*', true],
  ]) {
    const row = el('div', null, 'layer-media');
    row.append(fileInput('layerFile-' + key, tr(ja, en), accept, (f, files) => key === 'front' ? selectSpectrumFront(f, files) : loadMedia(key, f, only)));
    if (key === 'front') row.querySelector('input').multiple = true;
    const name = el('span', tr('未選択', 'None'), 'muted'); name.id = 'layerName-' + key;
    row.append(name, button('layerClear-' + key, tr('解除', 'Clear'), () => clearMedia(key)));
    if (key === 'background') panel.append(el('hr', null, 'layer-divider'));
    if (key === 'front') panel.append(spectrumHeading, mergeHelp);
    panel.append(row);
    if (key === 'background') {
      // Move the existing section intact so audio/timing handlers and mobile folding stay attached.
      const audio = $('audioFile').closest('.sec');
      audio.id = 'layerAudioSection'; audio.classList.add('layer-audio-section');
      panel.append(el('hr', null, 'layer-divider'), audio, el('hr', null, 'layer-divider'));
    }
  }
  spectrumControls(panel);
  const select = el('select'); select.id = 'layerPreview'; select.setAttribute('aria-label', tr('プレビュー表示', 'Preview display'));
  [['composite','作業用背景＋字幕で表示','Preview background + subtitles'],['front','黒背景フロント','Front on black'],['matte','白黒マット','Binary matte']].forEach(([value, ja, en]) => { const o = el('option', tr(ja, en)); o.value = value; select.append(o); });
  select.addEventListener('change', () => { session.preview = select.value; dirty(); });
  panel.append(el('hr', null, 'layer-divider'));
  panel.append(el('h2', tr('字幕レイヤー', 'Subtitle layers')));
  panel.append(el('p', tr('黒背景のフロント＋白黒2値マット。音声・作業用背景は出力しません。', 'Front on black + binary matte. No audio or preview background in exports.'), 'note'));
  panel.append(el('p', tr('文字色・装飾・図形・切替を保持します。暗い文字は作業用背景で確認してください。薄い演出は黒地での明るさとして残り、マットは2値です。', 'Preserves text colours, ornaments, graphics and transitions. Check dark text over a preview background. Soft effects retain their brightness on black; mattes stay binary.'), 'note'));
  panel.append(select, button('layerExport', tr('マット＋フロント MP4を出力', 'Export matte + front MP4'), exportPair));
  const progress = el('progress'); progress.id = 'layerProgress'; progress.max = 1; progress.value = 0; progress.hidden = true;
  const cancel = button('layerCancel', tr('出力を中止', 'Cancel export'), () => J.ui.exporting?.abort()); cancel.hidden = true;
  const output = el('p', tr('フロントとマットを、2本のMP4として直接保存します。', 'Downloads front and matte directly as two MP4 files.'), 'note'); output.id = 'layerStatus'; output.setAttribute('role', 'status');
  const downloads = el('div'); downloads.id = 'layerDownloads';
  panel.append(progress, cancel, output, downloads);
  const left = document.querySelector('.col-left');
  left.prepend(panel);
  $('lineList').closest('.sec').classList.add('layer-cut-list');
  bloomControls(left);
  $('resetDlg').addEventListener('close', () => { if ($('resetDlg').returnValue === 'reset') ['background', 'front', 'matte'].forEach(clearMedia); });
  J.syncLayerUI(); dirty();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

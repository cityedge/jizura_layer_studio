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
  syncMedia(session.background, t, J.ui.playing);
  for (const m of [session.front, session.matte]) {
    if (J.ui.project.spectrumMode === 'external') syncMedia(m, t, J.ui.playing);
    else if (m?.video && !m.el.paused) m.el.pause();
  }
  if (J.ui.project.spectrumMode === 'generated') {
    const native = J.drawNativeSpectrumPixels(w, h, t);
    if (native) pixels = J.overPixels(native, pixels);
  } else if (J.ui.project.spectrumMode !== 'none' && session.front && t < J.spectrumDuration(session.front, session.matte)) {
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
  for (const id of ['layerExport', 'layerExportFront']) if ($(id)) $(id).disabled = session.busy || !!error || !!J.nativeSpectrumBlocked?.();
  document.querySelectorAll('.cue-actions button[id^="cue-add-"]').forEach(b => { b.disabled = session.busy || !!error; });
  if ($('layerAddCue')) {
    const atZero = J.ui.project.subtitleCues?.some(c => c.start === 0);
    $('layerAddCue').disabled = session.busy || !!error || !!atZero;
    $('layerAddCue').title = atZero ? tr('先頭の字幕が0秒から始まるため追加できません。', 'The first cue starts at zero; there is no room before it.') : tr('0秒から最初の字幕までの範囲に、最長3秒で追加します。', 'Add up to 3 seconds from zero, ending before the first cue.');
  }
  for (const id of ['layerShiftBack', 'layerShiftForward']) if ($(id)) $(id).disabled = session.busy || !J.ui.project.subtitleCues?.length;
  J.syncFillerUI?.();
  syncSimpleExportUI();
}
function changed() { const a = J.uiApi; a.pause(); a.syncUI(); a.replan(); a.flushSave(); }
async function loadMedia(key, file, videoOnly) {
  const n = session.generation[key] = (session.generation[key] || 0) + 1;
  status(tr('読み込み中…', 'Loading…'));
  const m = await J.loadLayerMedia(file, videoOnly);
  if (key === 'background' && m.video) {
    try { m.videoDuration = await J.probeBackgroundVideo(m); }
    catch (e) { m.simpleError = tr('背景動画を簡易出力できません: ', 'Cannot export this video background: ') + e.message; }
  }
  if (session.generation[key] !== n) { m.dispose(); return; }
  if ((key === 'matte' || key === 'front' && !session.front) && session[key === 'front' ? 'matte' : 'front']) {
    try { J.validateSpectrum(key === 'front' ? m : session.front, key === 'matte' ? m : session.matte, J.ui.project.fps); }
    catch (e) { m.dispose(); throw e; }
  }
  if (key === 'front' && session.front) clearMedia('matte');
  session[key]?.dispose(); session[key] = m;
  if (key === 'front') J.ui.project.spectrumMode = 'external';
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
  J.ui.project.spectrumMode = 'external';
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
  panel.append(el('p', tr('フロントと同名_matte_darkを2本まとめて選ぶと、自動でペアを読み込みます。', 'Select both the front and its _matte_dark file to load the pair automatically.'), 'note spectrum-external'));
  const placement = el('div', null, 'spectrum-placement');
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
  placement.append(el('h3', tr('スペアナの位置・倍率', 'Spectrum position and scale')), grid,
    button('spectrumReset', tr('基本位置に戻す', 'Reset position'), () => {
      J.ui.project.spectrumLayout = J.defaultSpectrumLayout(); J.uiApi.flushSave(); J.syncLayerUI(); dirty();
    }));
  panel.append(placement);
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
    const a = el('a', file.name === 'simple_video.mp4' ? tr('簡易動画MP4を保存', 'Save simple video MP4') : file.name.includes('_matte_dark') ? tr('マットMP4を保存', 'Save matte MP4') : tr('フロントMP4を保存', 'Save front MP4'));
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
  return exportVideo(false);
}
async function exportVideo(simple, frontOnly = false) {
  if (J.ui.exporting) return;
  // Commit the focused editor before capturing the plan; never export stale valid data.
  document.activeElement?.blur();
  syncCueErrors();
  if (J.layerCueEditsInvalid) return;
  if (simple && $('simpleExport').disabled) return;
  let spectrum = null;
  try {
    spectrum = J.getSpectrumForExport();
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
      const args = { plan, project, spectrum, range, signal: ac.signal,
        onProgress(p, m) { $('layerProgress').value = p; status((simple ? tr('簡易動画を生成中 ', 'Encoding simple video ') : frontOnly ? tr('フロント動画を生成中 ', 'Encoding front video ') : tr('ペア動画を生成中 ', 'Encoding pair ')) + m); } };
      const pair = simple ? await J.exportSimpleVideo({ ...args, background: session.background, audio: J.ui.audio }) : frontOnly ? await J.exportLayerFront(args) : await J.exportLayerPair(args);
      if (ac.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      offerDownloads(pair.files, project.title);
      status(simple ? tr('簡易動画MP4を生成しました。保存されない場合はリンクから保存してください。', 'Simple video MP4 is ready. Use the save link if needed.') : frontOnly ? tr('フロントMP4を生成しました。保存されない場合はリンクから保存してください。', 'Front MP4 is ready. Use the save link if needed.') : tr('2本のMP4を生成し、ダウンロードを開始しました。保存されない場合は下のリンクから個別に保存してください。', 'Two MP4s are ready and downloads have started. If either is missing, save it using the links below.'));
    } finally {
      controls.forEach((e, i) => { e.disabled = disabled[i]; });
      J.ui.exporting = null; session.busy = false; $('layerCancel').hidden = true; dirty(); J.syncLayerUI();
    }
  } catch (e) { status(e.name === 'AbortError' ? tr('出力を中止しました。', 'Export cancelled.') : e.message, e.name !== 'AbortError'); }
}
let simpleProject = null, simpleInvalidDraft = false, simpleMaterials = null;
function syncSimpleExportUI() {
  if (!$('simpleExport') || session.busy) return;
  const project = J.ui.project, input = $('simpleDuration');
  const projectChanged = simpleProject !== project;
  if (projectChanged) { simpleProject = project; simpleInvalidDraft = false; }
  const materials = [session.background, session.front, session.matte, J.ui.audio?.buffer, project.spectrumMode,
    JSON.stringify((J.ui.plan?.lines || []).map(c => [c.start, c.end]))];
  const materialsChanged = !projectChanged && simpleMaterials && materials.some((v, i) => v !== simpleMaterials[i]);
  simpleMaterials = materials;
  const settings = project.simpleExport = J.normalizeSimpleExport(project.simpleExport);
  const recalculate = settings.duration == null || materialsChanged;
  if (recalculate) {
    settings.duration = J.simpleMaterialDuration(J.ui.plan, J.ui.audio, project.spectrumMode === 'external' ? session.front : null, project.spectrumMode === 'external' ? session.matte : null, session.background);
    simpleInvalidDraft = false;
    if (materialsChanged) J.uiApi.flushSave();
  }
  if (projectChanged || recalculate || (!simpleInvalidDraft && document.activeElement !== input)) input.value = settings.duration;
  $('simpleNoAudio').checked = !settings.includeAudio;
  let span, reason = '';
  try {
    if (simpleInvalidDraft) throw new Error(tr('出力時間を正しく入力してください。', 'Enter a valid duration.'));
    span = J.simpleExportSpan(settings.duration, project.fps, J.uiApi.exportRange());
  } catch (e) { reason = e.message; }
  if (session.background?.simpleError) reason = session.background.simpleError;
  if (J.layerCueEditsInvalid) reason = tr('字幕の時刻エラーを修正してください。', 'Correct the subtitle timing error.');
  if (J.nativeSpectrumBlocked?.()) reason = tr('音源を読み込み、スペアナ解析の完了を待ってください。', 'Load audio and wait for spectrum analysis to finish.');
  $('simpleExport').disabled = !!reason;
  input.setAttribute('aria-invalid', String(simpleInvalidDraft));
  const help = $('simpleExportInfo'); help.classList.toggle('error', !!reason);
  help.textContent = reason || tr(`実際の映像：${span.duration.toFixed(3)}秒・${span.frames}フレーム（${project.fps}fps）。`, `Video: ${span.duration.toFixed(3)}s · ${span.frames} frames (${project.fps}fps).`)
    + (span.t0 ? tr(` 開始：${span.t0.toFixed(3)}秒。`, ` Starts at ${span.t0.toFixed(3)}s.`) : '')
    + (settings.includeAudio && J.ui.audio?.buffer ? tr(' 読み込んだ音源を含みます。', ' Includes the loaded audio.') : tr(' 音声なし。', ' No audio.'));
}
J.syncSimpleExportUI = syncSimpleExportUI;
function simpleExportControls(panel) {
  panel.append(button('simpleExport', tr('簡易動画MP4を出力', 'Export simple video MP4'), () => exportVideo(true)));
  const controls = el('div', null, 'simple-export-controls');
  const label = el('label', tr('出力時間（秒）', 'Duration (seconds)')), input = el('input');
  input.id = 'simpleDuration'; input.type = 'number'; input.min = '0.001'; input.max = '86400'; input.step = 'any'; input.required = true;
  input.setAttribute('aria-label', tr('簡易動画の出力時間（秒）', 'Simple video duration (seconds)'));
  input.addEventListener('input', () => {
    const value = input.valueAsNumber;
    simpleInvalidDraft = !Number.isFinite(value) || value <= 0 || value > 86400;
    if (!simpleInvalidDraft) { J.ui.project.simpleExport.duration = value; J.uiApi.flushSave(); }
    syncSimpleExportUI();
  });
  label.append(input);
  const audio = el('label', null, 'simple-audio'), check = el('input'); check.type = 'checkbox'; check.id = 'simpleNoAudio';
  check.addEventListener('change', () => { J.ui.project.simpleExport.includeAudio = !check.checked; J.uiApi.flushSave(); syncSimpleExportUI(); });
  audio.append(check, document.createTextNode(tr('音源を含めない', 'Exclude audio')));
  controls.append(label, audio); panel.append(controls);
  const help = el('p', null, 'note'); help.id = 'simpleExportInfo'; help.setAttribute('role', 'status'); panel.append(help);
  panel.append(el('p', tr('画像・動画背景＋スペアナ＋字幕を1本のMP4にします。背景動画は0秒から再生し、終了後は最終フレームを保持。背景の音声は使わず、読み込んだ音源だけを使用します。',
    'Exports an image/video background, spectrum and subtitles as one MP4. Background video starts at zero and holds its final frame. Only separately loaded audio is used, not the background soundtrack.'), 'note'));
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
  const toolbar = el('div', null, 'cue-toolbar'); toolbar.append(add);
  for (const [id, delta] of [['layerShiftBack', -0.1], ['layerShiftForward', 0.1]]) {
    const label = (delta > 0 ? '+' : '-') + '0.1' + tr('秒', 's');
    const shift = button(id, label, () => {
      document.activeElement?.blur(); syncCueErrors();
      if (J.layerCueEditsInvalid) return;
      try {
        const next = J.prepareLayerCueShift(J.ui.project.subtitleCues, delta);
        J.uiApi.pushEdit(); J.ui.project.subtitleCues = next;
        J.ui.project.timing.lineTimes = {}; J.ui.project.exportRange = null;
        changed(); status('');
        J.uiApi.toast(tr('全字幕を' + label + '移動しました（Ctrl+Zで戻せます）。', 'All cues shifted ' + label + ' (Ctrl+Z to undo).'));
      } catch (e) { status(e.message, true); showingCueError = true; }
    });
    shift.title = tr('全字幕の開始・終了を移動。0秒より前の開始は0秒に固定し、長さが0以下になる場合は変更しません。', 'Shift all starts and ends. Starts clamp at zero; no changes if any duration would be zero or negative.');
    shift.setAttribute('aria-label', tr('全字幕を' + label + '移動', 'Shift all subtitles ' + label));
    shift.addEventListener('pointerdown', e => e.preventDefault());
    toolbar.append(shift);
  }
  root.append(toolbar, el('p', tr('テキストを空欄にすると描画しません。追加では3秒の字幕を追加し、他の字幕の時刻は動かしません。重なる場合は時刻を調整してください。',
    'Empty text draws nothing. Adding inserts a 3-second cue without moving other cues. Adjust times if they overlap.'), 'note'));
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
function mountPartEditor() {
  const input = $('lyrics'), originalLabel = input.getAttribute('aria-label');
  const controls = el('div', null, 'cue-toolbar'); controls.id = 'partControls';
  const help = el('p', tr('本文は変更できません。Enterで区切りを追加（行頭なら上、それ以外は下）し、空行をBackspace／Deleteで削除します。↵は字幕本文内の改行です。',
    'Text is protected. Enter adds a break above the cue at its start, otherwise below; Backspace/Delete removes a blank separator. ↵ marks a line break within the cue.'), 'note');
  help.id = 'partHelp';
  const srt = () => Array.isArray(J.ui.project.subtitleCues);
  const target = action => J.partEditTarget(J.ui.project.subtitleCues, input.selectionStart, input.selectionEnd, action);
  const update = J.syncPartEditor = () => {
    controls.hidden = help.hidden = !srt();
    input.readOnly = false;
    input.setAttribute('aria-label', srt() ? tr('字幕のパート区切り編集（本文は変更できません）', 'Subtitle part breaks (text protected)') : originalLabel);
    if (srt()) input.setAttribute('aria-describedby', help.id); else input.removeAttribute('aria-describedby');
    add.disabled = !srt() || session.busy || J.layerCueEditsInvalid || target('add') < 0;
    remove.disabled = !srt() || session.busy || J.layerCueEditsInvalid || (target('backward') < 0 && target('forward') < 0);
  };
  const edit = action => {
    if (!srt() || session.busy || J.ui.exporting || J.layerCueEditsInvalid) return;
    const i = target(action); if (i < 0) return;
    const beforeText = action === 'add' && input.selectionStart === J.subtitlePartRows(J.ui.project.subtitleCues)[i].start;
    const scroll = input.scrollTop;
    J.uiApi.pushEdit(); J.ui.project.subtitleCues[i].partBefore = action === 'add';
    changed();
    const row = J.subtitlePartRows(J.ui.project.subtitleCues)[i];
    // Inserting above a cue keeps the caret with its text, as in a text editor.
    const caret = action === 'add' && !beforeText ? row.start - 1 : row.start;
    input.focus(); input.setSelectionRange(caret, caret); input.scrollTop = scroll; update();
  };
  const add = button('partAdd', tr('区切り追加', 'Add part break'), () => edit('add'));
  const remove = button('partRemove', tr('区切り削除', 'Remove part break'), () => edit(target('backward') >= 0 ? 'backward' : 'forward'));
  for (const b of [add, remove]) b.addEventListener('pointerdown', e => e.preventDefault());
  controls.append(add, remove); input.after(controls, help);
  input.addEventListener('keydown', e => {
    if (!srt() || e.isComposing) return;
    if ((e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase())) {
      e.preventDefault(); e.stopPropagation();
      if (!session.busy && !J.ui.exporting) J.uiApi.edGo(e.key.toLowerCase() === 'y' || e.shiftKey ? 1 : -1);
    } else if (!e.ctrlKey && !e.metaKey && !e.altKey && ['Enter', 'Backspace', 'Delete'].includes(e.key)) {
      e.preventDefault(); edit(e.key === 'Enter' ? 'add' : e.key === 'Backspace' ? 'backward' : 'forward');
    }
  });
  input.addEventListener('beforeinput', e => {
    if (!srt()) return;
    e.preventDefault();
    if (['insertLineBreak', 'insertParagraph'].includes(e.inputType)) edit('add');
    else if (e.inputType === 'deleteContentBackward') edit('backward');
    else if (e.inputType === 'deleteContentForward' || e.inputType === 'deleteByCut') edit('forward');
    else if (['historyUndo', 'historyRedo'].includes(e.inputType) && !session.busy && !J.ui.exporting) J.uiApi.edGo(e.inputType === 'historyUndo' ? -1 : 1);
  });
  // Some IME, paste and browser editing paths emit non-cancelable input events.
  input.addEventListener('input', () => {
    if (!srt()) return;
    const caret = input.selectionStart; input.value = J.subtitlePartText(J.ui.project.subtitleCues);
    input.setSelectionRange(Math.min(caret, input.value.length), Math.min(caret, input.value.length)); update();
  });
  input.addEventListener('drop', e => { if (srt()) e.preventDefault(); });
  for (const event of ['click', 'keyup', 'select', 'focus']) input.addEventListener(event, update);
  document.addEventListener('selectionchange', () => { if (document.activeElement === input) update(); });
  update();
}
J.syncLayerUI = () => {
  if (!$('layerPanel') || session.busy) return;
  J.syncNativeSpectrumUI?.();
  J.syncFillerUI?.();
  const cues = J.ui.project.subtitleCues, srt = Array.isArray(cues);
  for (const [id, draft] of cueDrafts) if (JSON.stringify(cues?.find(c => c.id === id)) !== draft.base) cueDrafts.delete(id);
  syncCueErrors();
  document.documentElement.classList.toggle('srt-active', srt);
  if (srt) J.ui.project.lyrics = J.subtitlePartText(cues);
  if ($('lyrics').value !== J.ui.project.lyrics) $('lyrics').value = J.ui.project.lyrics;
  J.syncPartEditor?.();
  $('layerSrtInfo').textContent = srt ? cues.length + tr('件の字幕（本文・時刻を編集できます）', ' cues (text and timing are editable)') : tr('SRTを読み込むか、字幕を入力してください。', 'Import SRT or type subtitles.');
  const signature = JSON.stringify(cues);
  if (signature !== cueSignature) { cueSignature = signature; cueTable(); syncCueErrors(); }
  J.ui.project.spectrumLayout = J.normalizeSpectrumLayout(J.ui.project.spectrumLayout);
  for (const [key, value] of Object.entries(J.ui.project.spectrumLayout)) {
    const input = $('spectrum-' + key); if (input) input.value = value;
  }
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
  mountPartEditor();
  const panel = el('section', null, 'layer-panel'); panel.id = 'layerPanel';
  const inputs = el('div', null, 'layer-controls');
  inputs.append(fileInput('layerSrt', tr('SRTを読み込む', 'Import SRT'), '.srt', async file => {
    const cues = J.parseSRT(new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()));
    cueDrafts.clear(); syncCueErrors();
    J.uiApi.pushEdit(); Object.assign(J.ui.project, { subtitleCues: cues, lyrics: cues.map(c => c.text).join('\n\n'), overrides: {}, localLooks: null, exportRange: null });
    J.ui.project.simpleExport.duration = null;
    J.ui.project.timing.lineTimes = {}; changed(); J.uiApi.seek(0);
    status(tr('SRTを読み込みました。終了時刻・改行・空白区間を保持します。', 'SRT imported. End times, line breaks and gaps are preserved.'));
  }));
  const info = el('p', '', 'note'); info.id = 'layerSrtInfo';
  const cues = el('details'); cues.id = 'layerCues';
  panel.append(inputs, info, cues);
  J.mountFillerUI(inputs);
  const spectrumHeading = el('h3', tr('スペアナ（字幕が手前・0秒で同期）', 'Spectrum (subtitles in front, aligned at 0s)'));
  const mergeHelp = el('p', tr('スペアナ等の動画をアルファ合成できます。マット動画は任意で、未指定ならRGB 000000を透明化します。マットを指定する場合はフロントとサイズ・長さを揃えてください。', 'Composite spectrum or other videos using alpha. The matte is optional; without it, RGB 000000 is transparent. If supplied, match the front size and duration.'), 'note');
  mergeHelp.classList.add('spectrum-external');
  for (const [key, ja, en, accept, only] of [
    ['background', '作業用背景（画像・動画）', 'Preview background (image/video)', 'image/*,video/*', false],
    ['front', 'スペアナのフロント動画', 'Spectrum front video', 'video/*', true],
    ['matte', 'スペアナのマット動画（任意）', 'Spectrum matte video (optional)', 'video/*', true],
  ]) {
    const row = el('div', null, 'layer-media');
    if (key !== 'background') row.classList.add('spectrum-external');
    row.append(fileInput('layerFile-' + key, tr(ja, en), accept, (f, files) => key === 'front' ? selectSpectrumFront(f, files) : loadMedia(key, f, only)));
    if (key === 'front') row.querySelector('input').multiple = true;
    const name = el('span', tr('未選択', 'None'), 'muted'); name.id = 'layerName-' + key;
    row.append(name, button('layerClear-' + key, tr('解除', 'Clear'), () => clearMedia(key)));
    if (key === 'background') panel.append(el('hr', null, 'layer-divider'));
    if (key === 'front') { panel.append(spectrumHeading); J.mountNativeSpectrumUI(panel); panel.append(mergeHelp); }
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
  panel.append(el('p', tr('黒背景のフロント動画と白黒2値のマット動画を作成します。マット＋フロントのペア出力には、音声・作業用背景は含みません。', 'Creates a front video on black and a binary matte. Matte + front pair exports exclude audio and preview backgrounds.'), 'note'));
  panel.append(select, button('layerExport', tr('マット＋フロント MP4を出力', 'Export matte + front MP4'), exportPair));
  panel.append(button('layerExportFront', tr('フロントだけ MP4を出力', 'Export front MP4 only'), () => exportVideo(false, true)));
  panel.append(el('p', tr('フロントのみはマット生成を省略します。音声・作業用背景は含みません。', 'Front-only export skips matte generation. Audio and preview backgrounds are excluded.'), 'note'));
  const progress = el('progress'); progress.id = 'layerProgress'; progress.max = 1; progress.value = 0; progress.hidden = true;
  const cancel = button('layerCancel', tr('出力を中止', 'Cancel export'), () => J.ui.exporting?.abort()); cancel.hidden = true;
  const output = el('p', tr('フロントとマットを、2本のMP4として直接保存します。', 'Downloads front and matte directly as two MP4 files.'), 'note'); output.id = 'layerStatus'; output.setAttribute('role', 'status');
  const downloads = el('div'); downloads.id = 'layerDownloads';
  panel.append(progress, cancel, output, downloads);
  simpleExportControls(panel);
  const left = document.querySelector('.col-left');
  left.prepend(panel);
  $('lineList').closest('.sec').classList.add('layer-cut-list');
  $('resetDlg').addEventListener('close', () => { if ($('resetDlg').returnValue === 'reset') ['background', 'front', 'matte'].forEach(clearMedia); });
  J.syncLayerUI(); dirty();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

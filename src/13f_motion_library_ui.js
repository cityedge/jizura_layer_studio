/* Shared library management and isolated, silent audition. Only Apply edits a cue. */
(() => {
'use strict';
const tr = J.layerText, clone = x => JSON.parse(JSON.stringify(x));
const el = (tag, text) => { const e = document.createElement(tag); if (text != null) e.textContent = text; return e; };
const uid = () => 'motion-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
const bundle = (items, serial = nextNumber) => ({ format: 'jizura-motion-library', version: 1, nextNumber: serial, items });
let dialog, opener, select, name, save, rename, remove, apply, status, targetLabel, saveNote, sampleButton, canvas, playButton, scrub;
let items = [], nextNumber = 1, target, source, candidate, audition, active = '', wasPlaying, epoch = 0, raf = 0, running = false, elapsed = 0, last = 0;
const current = () => items.find(i => i.id === active);
function message(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
function read() {
  const raw = localStorage.getItem(J.motionLibraryKey);
  const data = raw ? JSON.parse(raw) : null;
  nextNumber = Number.isSafeInteger(data?.nextNumber) && data.nextNumber > 0 ? data.nextNumber : 1;
  return data ? J.parseMotionLibrary(data) : [];
}
function persist(next, serial = nextNumber) {
  // Commit storage before updating the visible list; quota failure must not lose data.
  localStorage.setItem(J.motionLibraryKey, JSON.stringify(bundle(next, serial))); items = next; nextNumber = serial;
}
function automaticNumber() {
  let serial = nextNumber;
  for (const item of items) {
    const match = /^motion(\d+)$/i.exec(item.name), n = match ? Number(match[1]) : 0;
    if (Number.isSafeInteger(n) && n >= serial && n < Number.MAX_SAFE_INTEGER - 1) serial = n + 1;
  }
  return serial;
}
function stop() { running = false; cancelAnimationFrame(raf); raf = 0; playButton.textContent = tr('再生', 'Play'); }
function paint() {
  if (!audition) return;
  const ctx = canvas.getContext('2d'), lang = J.lang;
  try {
    J.setLang(audition.plan.lang);
    audition.renderer.draw(audition.plan, audition.start + Math.min(elapsed, audition.duration - .001), false);
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(audition.renderer.layer, 0, 0);
    scrub.value = String(elapsed);
  } catch (e) { stop(); candidate = null; apply.disabled = true; message(e.message, true); return false; }
  finally { J.setLang(lang); }
  return true;
}
function tick(now) {
  if (!running || !dialog.open) return;
  elapsed = (elapsed + Math.min(.1, (now - last) / 1000)) % audition.duration; last = now; paint();
  if (running) raf = requestAnimationFrame(tick);
}
function run() { if (!audition) return; running = true; last = performance.now(); playButton.textContent = tr('停止', 'Pause'); raf = requestAnimationFrame(tick); }
function restoreFonts() { J.registerProjectFonts(J.ui.project.userFonts || []); }
function preview(p, index, audio) {
  stop(); audition = null; elapsed = 0;
  // Install only the project's font references. The caller restores the main
  // project's registry on close; no font file is read or stored here.
  const refs = new Map((J.ui.project.userFonts || []).map(f => [f.key, f]));
  for (const f of p.userFonts || []) refs.set(f.key, f);
  J.registerProjectFonts([...refs.values()]);
  const lang = J.lang;
  let plan;
  try { plan = J.plan(p, audio); } finally { J.setLang(lang); }
  const ln = plan.lines.find(l => l.index === index);
  if (!ln) throw new Error(tr('試写できる字幕がありません。', 'No subtitle to preview.'));
  const scale = Math.min(560 / plan.W, 320 / plan.H, 1);
  canvas.width = Math.max(2, Math.round(plan.W * scale)); canvas.height = Math.max(2, Math.round(plan.H * scale));
  audition = { plan, start: ln.start, duration: Math.max(.01, ln.visEnd - ln.start), renderer: new J.LayerRenderer(canvas.width, canvas.height, p.layerMode, p.layerBackgroundOpacity, p.hideDecorativeText) };
  scrub.min = '0'; scrub.max = String(audition.duration); scrub.step = '.01'; scrub.disabled = false; playButton.disabled = false;
  const token = ++epoch;
  Promise.resolve(J.ensureFonts?.(ln.text, J.fontsOfPlan(plan))).then(() => { if (dialog.open && epoch === token) paint(); }).catch(() => {});
  if (!paint()) throw new Error(tr('このモーションの試写に失敗しました。', 'Could not render this motion.'));
  run();
}
function refreshList() {
  select.replaceChildren();
  for (const item of items) { const option = el('option', item.name); option.value = item.id; select.append(option); }
  if (!items.some(i => i.id === active)) active = '';
  select.value = active; if (!active) select.selectedIndex = -1;
  select.disabled = !items.length;
  name.value = current()?.name || '';
  rename.disabled = remove.disabled = sampleButton.disabled = !current();
}
function choose(useSample = false) {
  stop(); epoch++; candidate = null; audition = null; apply.disabled = true; playButton.disabled = true; scrub.disabled = true;
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  const item = current();
  rename.disabled = remove.disabled = sampleButton.disabled = !item;
  if (!item && !source) {
    message(tr('一覧からモーションを選ぶと試写できます。', 'Select a library motion to preview it.')); return;
  }
  if (item) name.value = item.name;
  try {
    if (!item) {
      const lang = J.lang; let p;
      const original = J.ui.project;
      // A locked cue may still be saved/auditioned; unlock only this private draft.
      const draft = { ...original, overrides: { ...original.overrides, [target.index]: { ...original.overrides?.[target.index], lock: false } } };
      try { p = J.prepareMotionApply(draft, J.ui.plan, target.index, source, J.uiApi.audioLike()); }
      finally { J.setLang(lang); }
      preview(p, target.index, J.uiApi.audioLike());
      message(tr('保存対象のモーションを試写中です。名前は空欄のままでも保存できます。', 'Previewing the motion to save. Leave the name blank for automatic numbering.'));
      return;
    }
    if (target && !useSample) {
      const lang = J.lang;
      try { candidate = J.prepareMotionApply(J.ui.project, J.ui.plan, target.index, item.recipe, J.uiApi.audioLike()); }
      finally { J.setLang(lang); }
      candidate.overrides[target.index].randomDraw.libraryName = item.name;
      J.rekeyLocalLooks(candidate, J.ui.plan, J.uiApi.audioLike());
      preview(candidate, target.index, J.uiApi.audioLike()); apply.disabled = false;
      message(tr('選択中の字幕で試写中です。「適用」までは元の演出を変更しません。', 'Previewing the selected subtitle. The project changes only when you Apply.'));
    } else {
      const lang = J.lang; let p;
      try { p = J.motionSampleProject(item.recipe); } finally { J.setLang(lang); }
      p.layerMode = J.ui.project.layerMode; p.layerBackgroundOpacity = J.ui.project.layerBackgroundOpacity;
      preview(p, 0, null); message(tr('サンプルテキストで試写中です。字幕を選んで開くと適用できます。', 'Previewing sample text. Open with a subtitle selected to apply.'));
    }
  } catch (e) {
    candidate = null; apply.disabled = true; stop(); restoreFonts();
    message(tr('適用できません：', 'Cannot apply: ') + e.message + (target && !useSample ? tr('「サンプルで試写」で動きを確認できます。', ' Use “Preview sample” to view the motion.') : ''), true);
  }
}
function safely(action) { try { action(); } catch (e) { message(e.message, true); } }
function mount() {
  if (dialog) return;
  dialog = el('dialog'); dialog.id = 'motionLibraryDialog'; dialog.className = 'motion-library';
  const heading = el('h2', tr('モーションライブラリ', 'Motion library')); heading.id = 'motionLibraryHeading'; dialog.setAttribute('aria-labelledby', heading.id);
  targetLabel = el('p'); targetLabel.id = 'motionLibraryTarget';
  const hint = el('p', tr('字幕1つ分の演出を保存し、別の歌詞へ適用します。文字数に合わせて配置を再計算します。試写は無音・素材背景なしです。', 'Save one subtitle’s motion and reuse it with new lyrics. Layout is recalculated for the new text. Previews are silent, without media backgrounds.')); hint.className = 'muted';
  const layout = el('div'); layout.className = 'motion-library-grid'; const editor = el('div'), viewer = el('div');
  select = el('select'); select.id = 'motionLibraryList'; select.size = 8; select.setAttribute('aria-label', tr('保存済みモーション', 'Saved motions'));
  const label = el('label', tr('モーション名', 'Motion name')); name = el('input'); name.id = 'motionLibraryName'; name.maxLength = 120; name.placeholder = tr('空欄なら自動採番（motion001…）', 'Blank: auto-number (motion001…)'); label.htmlFor = name.id;
  const row = el('div'); row.className = 'motion-library-actions';
  function button(text, id, parent, handler) { const b = el('button', text); b.id = id; b.type = 'button'; b.addEventListener('click', handler); parent.append(b); return b; }
  save = button(tr('モーション保存', 'Save motion'), 'motionLibrarySave', row, () => safely(() => {
    if (!source) throw new Error(saveNote.textContent);
    const typed = name.value.trim(), serial = automaticNumber();
    const title = typed || 'motion' + String(serial).padStart(3, '0');
    if (items.length >= 500) throw new Error(tr('最大500件です。', 'Up to 500 motions are supported.'));
    const item = { id: uid(), name: title, recipe: clone(source) }; persist([...items, item], typed ? nextNumber : serial + 1); active = item.id; refreshList(); choose();
  }));
  rename = button(tr('名前変更', 'Rename'), 'motionLibraryRename', row, () => safely(() => {
    if (!current()) return; const title = name.value.trim(); if (!title) throw new Error(tr('名前を入力してください。', 'Enter a name.'));
    persist(items.map(i => i.id === active ? { ...i, name: title } : i)); refreshList(); message(tr('名前を変更しました。', 'Renamed.'));
  }));
  remove = button(tr('削除', 'Delete'), 'motionLibraryDelete', row, () => safely(() => {
    if (!current() || !confirm(tr('このモーションを共通ライブラリから削除しますか？適用済みの字幕は変わりません。', 'Delete this motion from the shared library? Applied subtitles stay unchanged.'))) return;
    persist(items.filter(i => i.id !== active)); refreshList(); choose();
  }));
  saveNote = el('p'); saveNote.id = 'motionLibrarySaveNote'; saveNote.className = 'muted'; save.setAttribute('aria-describedby', saveNote.id);
  editor.append(select, label, name, row, saveNote);
  canvas = el('canvas'); canvas.id = 'motionLibraryPreview'; canvas.width = 560; canvas.height = 315; canvas.setAttribute('aria-label', tr('モーション試写', 'Motion preview'));
  const controls = el('div'); controls.className = 'motion-library-actions';
  playButton = button(tr('再生', 'Play'), 'motionLibraryPlay', controls, () => running ? stop() : run());
  scrub = el('input'); scrub.type = 'range'; scrub.setAttribute('aria-label', tr('試写位置', 'Preview position')); scrub.addEventListener('input', () => { stop(); elapsed = Number(scrub.value); paint(); }); controls.append(scrub);
  sampleButton = button(tr('サンプルで試写', 'Preview sample'), 'motionLibrarySample', controls, () => choose(true));
  button(tr('選択字幕で試写', 'Preview selected cue'), 'motionLibraryCue', controls, () => choose()).disabled = false;
  viewer.append(canvas, controls); layout.append(editor, viewer);
  status = el('p'); status.id = 'motionLibraryStatus'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const storage = el('div'); storage.className = 'motion-library-actions';
  button(tr('ライブラリJSONを保存', 'Export library JSON'), 'motionLibraryExport', storage, () => safely(() => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle(items), null, 2)], { type: 'application/json' }));
    const a = el('a'); a.href = url; a.download = 'jizura-motion-library.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }));
  const file = el('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true; file.id = 'motionLibraryFile';
  button(tr('ライブラリJSONを読み込む', 'Import library JSON'), 'motionLibraryImport', storage, () => file.click()); storage.append(file);
  file.addEventListener('change', async () => {
    const f = file.files?.[0], token = epoch; file.value = ''; if (!f) return;
    try {
      if (f.size > 20000000) throw new Error(tr('JSONは20MB以下にしてください。', 'JSON must be 20 MB or smaller.'));
      const data = JSON.parse(await f.text()), imported = J.parseMotionLibrary(data); if (!dialog.open || epoch !== token) return;
      const next = clone(items); let added = 0;
      for (const item of imported) {
        const old = next.find(i => i.id === item.id);
        if (old && JSON.stringify(old.recipe) === JSON.stringify(item.recipe)) continue;
        next.push({ ...item, id: old ? uid() : item.id }); added++;
      }
      if (next.length > 500) throw new Error(tr('最大500件です。', 'Up to 500 motions are supported.'));
      const serial = Number.isSafeInteger(data.nextNumber) && data.nextNumber > 0 ? data.nextNumber : 1;
      persist(next, Math.max(nextNumber, serial)); refreshList(); choose(); message(tr(`${added}件を追加しました。`, `Added ${added} motions.`));
    } catch (e) { message(e.message, true); }
  });
  const footer = el('div'); footer.className = 'motion-library-actions motion-library-footer';
  button(tr('閉じる', 'Close'), 'motionLibraryClose', footer, () => dialog.close());
  apply = button(tr('適用', 'Apply'), 'motionLibraryApply', footer, () => safely(() => {
    if (!candidate || !target) return;
    const next = candidate, index = target.index, resume = wasPlaying;
    dialog.close(); J.registerProjectFonts(next.userFonts || []); J.uiApi.applyMotionProject(next, index, resume);
  })); apply.className = 'primary';
  dialog.append(heading, targetLabel, hint, layout, status, storage, footer); document.body.append(dialog);
  select.addEventListener('change', () => { active = select.value; choose(); });
  dialog.addEventListener('close', () => { stop(); epoch++; audition = candidate = source = null; restoreFonts(); opener?.focus({ preventScroll: true }); });
}
function boot() {
  opener = el('button', tr('モーションライブラリ…', 'Motion library…')); opener.type = 'button'; opener.id = 'btnMotionLibrary'; opener.className = 'small';
  document.getElementById('btnOmakase').after(opener);
  opener.addEventListener('click', () => {
    if (J.ui.exporting || J.ui.tap || J.layerSession?.busy) return;
    mount(); target = J.uiApi.cueRerollTarget(); wasPlaying = J.ui.playing; J.uiApi.pause(); epoch++;
    source = null; active = ''; let error = '';
    try { items = read(); } catch (e) { items = []; error = tr('ライブラリを読み込めません。ブラウザの保存内容を確認してください。', 'Cannot read the library. Check browser storage.'); }
    try { source = J.captureMotionRecipe(J.ui.project, J.ui.plan, target?.index); }
    catch (e) { saveNote.textContent = e.message; }
    save.disabled = !source || !!error;
    if (source) saveNote.textContent = tr('保存は現在選択中の字幕を対象にします。名前変更・削除はライブラリだけを変更します。', 'Save captures the selected subtitle. Rename and Delete affect only the library.');
    targetLabel.textContent = target ? tr(`対象：字幕 ${target.index + 1}「${target.text}」`, `Target: subtitle ${target.index + 1} “${target.text}”`) : tr('対象字幕なし：サンプルを試写できます。', 'No subtitle selected: browse sample previews.');
    document.getElementById('motionLibraryCue').disabled = !target;
    refreshList(); dialog.showModal(); choose(); if (error) message(error, true);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

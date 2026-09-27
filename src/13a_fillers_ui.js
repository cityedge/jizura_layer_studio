/* Bilingual modal; draft changes take effect only on Generate or Remove. */
(() => {
'use strict';
const $ = id => document.getElementById(id), tr = J.layerText;
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
const media = () => ({ audioDuration: J.ui.audio?.duration, spectrumDuration: J.layerSession.front ? J.spectrumDuration(J.layerSession.front, J.layerSession.matte) : undefined });
const read = () => ({ threshold: +$('filler-threshold').value, preGap: +$('filler-preGap').value, postGap: +$('filler-postGap').value,
  length: $('filler-length').value, types: Object.fromEntries(J.fillerKinds.map(k => [k, { enabled: $('filler-' + k).checked, weight: +$('filler-weight-' + k).value }])) });
let form, preview, generate, remove;
function refresh() {
  const valid = form.checkValidity(), cfg = read();
  const selected = Object.values(cfg.types).some(v => v.enabled);
  generate.disabled = !valid || !selected;
  if (!valid) { preview.textContent = tr('時間は範囲内の数値を指定してください。', 'Enter times within the allowed range.'); return; }
  const a = J.fillerAnalysis(J.ui.project, cfg, media());
  generate.disabled ||= a.count + a.normal.length > 20000;
  const basis = { audio: tr('音源', 'audio'), spectrum: tr('スペアナ', 'spectrum'), subtitles: tr('通常字幕の末尾（アウトロは未確定）', 'last normal cue (outro unknown)') }[a.basis];
  preview.textContent = tr(`普通の基準 ${a.baseline.toFixed(2)}秒 ／ 平均 ${a.meanChars.toFixed(1)}文字。対象 ${a.gaps.length}区間・${a.count}件。終端：${basis}。`,
    `Normal duration: ${a.baseline.toFixed(2)}s · Mean text: ${a.meanChars.toFixed(1)} characters · ${a.gaps.length} gaps / ${a.count} cues. End: ${basis}.`);
  if (!selected) preview.textContent += tr(' 種類を1つ以上選んでください。', ' Select at least one type.');
  if (a.count + a.normal.length > 20000) preview.textContent += tr(' 字幕20,000件を超えます。長さや閾値を大きくしてください。', ' More than 20,000 cues. Increase duration or threshold.');
  for (const k of J.fillerKinds) $('filler-weight-' + k).disabled = !cfg.types[k].enabled;
}
function apply(clear) {
  try {
    const p = J.ui.project, settings = read();
    const prepared = clear ? { settings: p.fillerSettings, fillers: [] } : J.prepareFillers(p, settings, media());
    J.uiApi.pushEdit(); J.replaceFillers(p, prepared);
    $('fillerDlg').close(); J.uiApi.replan(); J.uiApi.flushSave();
    J.uiApi.toast(clear ? tr('フィラーを削除しました（Ctrl+Zで戻せます）', 'Fillers removed (Ctrl+Z to undo)') : tr(`${prepared.fillers.length}件のフィラーを生成しました（Ctrl+Zで戻せます）`, `${prepared.fillers.length} fillers generated (Ctrl+Z to undo)`));
  } catch (e) { preview.textContent = e.message; }
}
J.syncFillerUI = () => {
  if (!$('addFillers')) return;
  const cues = J.ui.project.subtitleCues;
  $('addFillers').disabled = !cues?.some(c => !c.filler) || !!J.ui.tap || !!J.ui.exporting || !!J.layerCueEditsInvalid;
  $('addFillers').textContent = cues?.some(c => c.filler) ? tr('フィラーを再生成…', 'Regenerate fillers…') : tr('フィラーを追加…', 'Add fillers…');
};
J.mountFillerUI = controls => {
  const open = el('button', tr('フィラーを追加…', 'Add fillers…')); open.type = 'button'; open.id = 'addFillers'; controls.append(open);
  const dlg = el('dialog', null, 'terms publication-dialog filler-dialog'); dlg.id = 'fillerDlg'; dlg.setAttribute('aria-labelledby', 'fillerTitle');
  form = el('form'); form.method = 'dialog';
  const title = el('h2', tr('空白区間にフィラーを追加', 'Add fillers to subtitle gaps')); title.id = 'fillerTitle';
  form.append(title, el('p', tr('生成した本文は仮置きです。自由に書き換えられます。再生成すると、手動で編集したものも含め、既存のフィラーをすべて置き換えます。通常字幕とその演出は保持します。',
    'Generated text is a placeholder you can edit freely. Regeneration replaces every existing filler, including edited ones. Normal subtitles and their effects are preserved.'), 'note'));
  const grid = el('div', null, 'filler-grid');
  for (const [key, ja, en, min] of [['threshold', '空白の閾値（秒）', 'Minimum usable gap (s)', 0.1], ['preGap', 'プリギャップ（秒）', 'Pre-gap (s)', 0], ['postGap', 'ポストギャップ（秒）', 'Post-gap (s)', 0]]) {
    const label = el('label', tr(ja, en)), input = el('input'); input.id = 'filler-' + key; input.type = 'number'; input.min = min; input.max = 600; input.step = '0.1'; input.required = true; label.append(input); grid.append(label);
  }
  const lengthLabel = el('label', tr('フィラー1件の平均長さ', 'Average filler duration')), length = el('select'); length.id = 'filler-length';
  for (const [value, ja, en] of [['short', '短め（0.75倍）', 'Short (×0.75)'], ['normal', '普通（1倍）', 'Normal (×1)'], ['long', '長め（1.5倍）', 'Long (×1.5)']]) { const opt = el('option', tr(ja, en)); opt.value = value; length.append(opt); }
  lengthLabel.append(length); grid.append(lengthLabel); form.append(grid);
  form.append(el('p', tr('プリ：通常字幕の終了から空ける時間。ポスト：次の通常字幕まで空ける時間。両方を差し引いた残りに閾値を適用します。初期値では5.8秒以上の間奏が対象です。前奏はポストのみ、アウトロはプリのみを確保します。',
    'Pre-gap leaves space after normal subtitles; post-gap leaves space before the next normal subtitle. The threshold applies after these margins. Defaults require a 5.8s interior gap. Intros use only post-gap; outros use only pre-gap.'), 'note'));
  form.append(el('p', tr('「普通」は通常字幕の表示時間を長い順に並べた上位50%の平均です。個々の長さには変化を付け、空白区間に収めます。',
    'Normal uses the mean duration of the longer half of normal cues. Individual lengths vary to fit each gap.'), 'note'));
  const types = el('fieldset'); types.append(el('legend', tr('本文の種類と抽選ウェイト', 'Text types and selection weights')));
  for (const [key, ja, en] of [['spaces', '空白文字', 'Whitespace'], ['lyrics', '歌詞テキスト', 'Lyric text'], ['timestamp', 'タイムスタンプ', 'Timestamp'], ['symbols', '図形文字', 'Symbols']]) {
    const row = el('div', null, 'filler-type'), label = el('label'), check = el('input'); check.type = 'checkbox'; check.id = 'filler-' + key;
    label.append(check, document.createTextNode(tr(ja, en))); const weightLabel = el('label', tr('重み', 'Weight')), select = el('select'); select.id = 'filler-weight-' + key;
    select.setAttribute('aria-label', tr(ja + 'の重み', en + ' weight'));
    for (let i = 1; i <= 10; i++) { const option = el('option', String(i)); option.value = i; select.append(option); }
    weightLabel.append(select); row.append(label, weightLabel); types.append(row);
  }
  form.append(types, el('p', tr('空白文字は全角スペース2〜5個のまとまりを半角スペースで3〜4区分に分けます。文字は見えず、台紙や装飾などの演出を利用できます（演出によっては何も見えません）。図形文字は通常字幕の平均文字数に合わせて抽選。歌詞は長さに関係なく抽選。[timestamp] は開始時刻に追従し、通常字幕にも手入力できます。',
    'Whitespace uses 3–4 groups of 2–5 ideographic spaces, separated by ASCII spaces. Text is invisible; plates and decorations can still appear, depending on the effect. Symbols follow the mean lyric length. Lyrics are chosen regardless of length. [timestamp] follows the cue start and also works in normal cues.'), 'note'));
  preview = el('p', null, 'filler-preview'); preview.id = 'fillerPreview'; preview.setAttribute('role', 'status'); form.append(preview);
  const actions = el('div', null, 'filler-actions');
  remove = el('button', tr('フィラーをすべて削除', 'Remove all fillers')); remove.id = 'removeFillers'; remove.type = 'button'; remove.addEventListener('click', () => apply(true));
  const cancel = el('button', tr('キャンセル', 'Cancel')); cancel.id = 'cancelFillers'; cancel.type = 'button'; cancel.addEventListener('click', () => dlg.close());
  generate = el('button', tr('生成する', 'Generate'), 'primary'); generate.id = 'generateFillers'; generate.type = 'submit';
  actions.append(remove, cancel, generate); form.append(actions); dlg.append(form); document.body.append(dlg);
  form.addEventListener('input', refresh); form.addEventListener('change', refresh);
  form.addEventListener('submit', e => { e.preventDefault(); if (!generate.disabled) apply(false); });
  open.addEventListener('click', () => {
    if (J.ui.tap || J.ui.exporting) return;
    J.uiApi.pause(); const cfg = J.normalizeFillerSettings(J.ui.project.fillerSettings);
    for (const key of ['threshold', 'preGap', 'postGap', 'length']) $('filler-' + key).value = cfg[key];
    for (const [key, v] of Object.entries(cfg.types)) { $('filler-' + key).checked = v.enabled; $('filler-weight-' + key).value = v.weight; }
    remove.disabled = !J.ui.project.subtitleCues.some(c => c.filler);
    refresh(); dlg.showModal(); dlg.scrollTop = 0; $('filler-threshold').focus();
  });
};
})();

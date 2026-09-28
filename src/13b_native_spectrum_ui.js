/* Native/external spectrum selection and session-only analysis cache. */
(() => {
'use strict';
const $ = id => document.getElementById(id), tr = J.layerText;
const state = J.nativeSpectrumState = { buffer: null, raw: null, data: null, key: '', pending: false, error: '', progress: 0, controller: null };
let previewReader = null;
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
const ready = () => state.buffer === J.ui.audio?.buffer && state.key === J.nativeMotionKey(J.ui.project) && !!state.data && !state.pending;
J.nativeSpectrumBlocked = () => J.ui.project.spectrumMode === 'generated' && !ready();
function showProgress() {
  const info = $('nativeSpectrumInfo'); if (!info) return;
  info.textContent = !J.ui.audio?.buffer ? tr('先に音源を読み込んでください。', 'Load audio first.') : state.error || (state.pending
    ? tr(`スペアナを解析中… ${Math.round(state.progress * 100)}%`, `Analyzing spectrum… ${Math.round(state.progress * 100)}%`)
    : tr('64本のバー。色は最大高さを基準に固定します。', '64 bars. Colors are fixed to the maximum height.'));
  info.classList.toggle('error', !!state.error);
  $('nativeSpectrumRetry').hidden = !state.error;
  const range = state.raw?.frequencyRange, label = $('nativeSpectrumRange');
  label.hidden = !range || !J.ui.audio?.buffer || state.buffer !== J.ui.audio.buffer;
  label.textContent = range ? tr(`自動音域：${range.low.toLocaleString('ja-JP')}〜${range.high.toLocaleString('ja-JP')}Hz`, `Auto range: ${range.low.toLocaleString('en-US')}–${range.high.toLocaleString('en-US')} Hz`)
    + (range.fallback ? tr('（推定できないため標準範囲）', ' (default; insufficient signal)') : '') : '';
}
async function prepare(buffer, key) {
  state.controller?.abort();
  const controller = new AbortController(); state.controller = controller;
  if (state.buffer !== buffer) { state.raw = null; state.buffer = buffer; }
  state.key = key; state.data = null; state.pending = true; state.error = ''; state.progress = 0;
  const settings = { ...J.ui.project.nativeSpectrum };
  showProgress();
  try {
    const raw = state.raw || await J.analyzeNativeAudio(buffer, controller.signal, p => { if (state.controller === controller) { state.progress = p * .9; showProgress(); } });
    if (controller.signal.aborted) return;
    state.raw = raw; state.progress = .9; showProgress();
    const data = await J.shapeNativeSpectrum(raw, settings, controller.signal);
    if (state.controller === controller && !controller.signal.aborted) { state.data = data; state.progress = 1; }
  } catch (e) {
    if (e.name !== 'AbortError' && state.controller === controller) state.error = tr('スペアナ解析に失敗しました: ', 'Spectrum analysis failed: ') + e.message;
  } finally {
    if (state.controller === controller) { state.pending = false; J.ui.need = true; showProgress(); J.syncLayerUI(); }
  }
}
J.syncNativeSpectrumUI = () => {
  if (!$('spectrumMode')) return;
  const p = J.ui.project, buffer = J.ui.audio?.buffer;
  p.nativeSpectrum = J.normalizeNativeSpectrum(p.nativeSpectrum);
  $('spectrumMode').value = p.spectrumMode;
  $('spectrumMode').querySelector('[value="generated"]').disabled = !buffer;
  $('nativeSpectrumSettings').hidden = p.spectrumMode !== 'generated';
  document.querySelectorAll('.spectrum-external').forEach(e => e.hidden = p.spectrumMode !== 'external');
  document.querySelectorAll('.spectrum-placement').forEach(e => e.hidden = p.spectrumMode === 'none');
  for (const [key, value] of Object.entries(p.nativeSpectrum)) {
    const input = $('native-' + key); if (document.activeElement !== input) input.value = value;
    const output = $('native-value-' + key); if (output) output.textContent = value + (key === 'returnMs' ? 'ms' : key === 'sensitivity' ? 'dB' : '%');
  }
  if (!buffer || p.spectrumMode !== 'generated') {
    if (state.pending) { state.controller?.abort(); state.controller = null; state.pending = false; state.key = ''; }
    if (state.buffer !== buffer) { state.buffer = buffer; state.raw = state.data = null; state.key = ''; state.error = ''; }
  } else {
    const key = J.nativeMotionKey(p);
    if (state.buffer !== buffer || state.key !== key || (!state.data && !state.pending && !state.error)) prepare(buffer, key);
  }
  showProgress();
};
J.getSpectrumForExport = () => {
  const p = J.ui.project;
  if (p.spectrumMode === 'none') return null;
  if (p.spectrumMode === 'generated') {
    if (!ready()) throw new Error(state.error || tr('音源を読み込み、スペアナ解析の完了を待ってください。', 'Load audio and wait for spectrum analysis to finish.'));
    return { kind: 'generated', data: state.data, settings: { ...p.nativeSpectrum } };
  }
  const { front, matte } = J.layerSession;
  if (!front) return null;
  J.validateSpectrum(front, matte, p.fps); return { front, matte };
};
J.drawNativeSpectrumPixels = (w, h, t) => {
  if (!ready()) return null;
  if (!previewReader || previewReader.w !== w || previewReader.h !== h || previewReader.spectrum.data !== state.data)
    previewReader = new J.NativeSpectrumReader({ data: state.data, settings: J.ui.project.nativeSpectrum }, w, h);
  return previewReader.framePixels(t, J.ui.project.spectrumLayout, J.ui.project.nativeSpectrum);
};
J.mountNativeSpectrumUI = panel => {
  const label = el('label', tr('スペアナの入力', 'Spectrum source'), 'native-source'), select = el('select'); select.id = 'spectrumMode';
  for (const [value, ja, en] of [['none', 'なし', 'None'], ['generated', '音源から生成', 'Generate from audio'], ['external', '外部動画', 'External video']]) {
    const option = el('option', tr(ja, en)); option.value = value; select.append(option);
  }
  select.addEventListener('change', () => { J.ui.project.spectrumMode = select.value; J.uiApi.replan(); J.uiApi.flushSave(); });
  label.append(select); panel.append(label);
  const controls = el('div'); controls.id = 'nativeSpectrumSettings';
  const colors = el('div', null, 'native-colors');
  for (const [key, ja, en] of [['top', '上端の色', 'Top color'], ['bottom', '下端の色', 'Bottom color']]) {
    const row = el('label', tr(ja, en)), input = el('input'); input.type = 'color'; input.id = 'native-' + key;
    input.addEventListener('input', () => { J.ui.project.nativeSpectrum[key] = input.value; J.ui.need = true; J.uiApi.flushSave(); });
    row.append(input); colors.append(row);
  }
  controls.append(colors);
  for (const [key, ja, en, min, max, step] of [['sensitivity', '感度', 'Sensitivity', -12, 24, 1], ['pulse', '拍動の強さ', 'Pulse strength', 0, 100, 1], ['returnMs', '戻る速さ（短いほど速い）', 'Return time (shorter is faster)', 60, 600, 10]]) {
    const row = el('label', null, 'native-motion'), input = el('input'), value = el('output');
    row.append(el('span', tr(ja, en)));
    input.type = 'range'; input.id = 'native-' + key; input.min = min; input.max = max; input.step = step; value.id = 'native-value-' + key;
    input.addEventListener('input', () => { J.ui.project.nativeSpectrum[key] = input.valueAsNumber; J.uiApi.flushSave(); J.syncLayerUI(); J.ui.need = true; });
    row.append(input, value); controls.append(row);
  }
  const info = el('p', null, 'note'); info.id = 'nativeSpectrumInfo'; info.setAttribute('role', 'status');
  const range = el('p', null, 'note'); range.id = 'nativeSpectrumRange'; range.hidden = true;
  const retry = el('button', tr('解析を再試行', 'Retry analysis')); retry.id = 'nativeSpectrumRetry'; retry.type = 'button';
  retry.addEventListener('click', () => { state.error = ''; state.key = ''; J.syncLayerUI(); });
  controls.append(info, range, retry); panel.append(controls);
};
window.addEventListener('pagehide', () => { state.controller?.abort(); state.controller = null; state.pending = false; });
window.addEventListener('pageshow', e => { if (e.persisted) J.syncLayerUI(); });
})();

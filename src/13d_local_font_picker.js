/* Optional installed-family picker. Enumeration happens only after a user click;
   only the selected family name reaches the project, never font files or the list. */
(() => {
'use strict';
const tr = J.layerText;
const el = (tag, text) => { const e = document.createElement(tag); if (text != null) e.textContent = text; return e; };
let dialog, search, list, status, sample, apply, selectFamily, origin, request = 0, families = [];
function refresh() {
  const term = search.value.trim().toLocaleLowerCase();
  const previous = list.value;
  const shown = families.filter(name => name.toLocaleLowerCase().includes(term));
  list.replaceChildren(...shown.map(name => new Option(name, name)));
  list.value = shown.includes(previous) ? previous : (shown[0] || '');
  apply.disabled = !list.value;
  sample.style.fontFamily = list.value ? '"' + J.safeFamily(list.value) + '",sans-serif' : 'sans-serif';
  status.textContent = tr(`${shown.length} / ${families.length} 書体`, `${shown.length} / ${families.length} families`);
}
function mount() {
  if (dialog) return;
  dialog = el('dialog'); dialog.id = 'localFontPicker'; dialog.className = 'local-font-picker';
  dialog.setAttribute('aria-labelledby', 'localFontPickerHeading');
  const heading = el('h2', tr('PCのフォントから選ぶ', 'Choose an installed PC font')); heading.id = 'localFontPickerHeading';
  const note = el('p', tr('許可した場合に、このPCの書体名を取得します。一覧やフォント本体は保存しません。選べない場合は元の画面でフォント名を入力できます。', 'With your permission, read font family names from this PC. Neither the list nor font files are saved. If unavailable, enter a font name in the original screen.')); note.className = 'note';
  search = el('input'); search.type = 'search'; search.id = 'localFontSearch'; search.placeholder = tr('書体名で絞り込む', 'Filter font families'); search.setAttribute('aria-label', search.placeholder);
  list = el('select'); list.id = 'localFontChoices'; list.size = 10; list.setAttribute('aria-label', tr('PCの書体一覧', 'Installed font families'));
  status = el('p'); status.id = 'localFontStatus'; status.className = 'note'; status.setAttribute('role','status');
  sample = el('p', 'Aa Bb 123 あいうえお 字幕'); sample.className = 'local-font-sample';
  apply = el('button', tr('この書体を使う', 'Use this font')); apply.id = 'localFontUse'; apply.type = 'button';
  const close = el('button', tr('キャンセル', 'Cancel')); close.type = 'button'; close.id = 'localFontCancel';
  const actions = el('div'); actions.className = 'local-font-actions'; actions.append(close, apply);
  dialog.append(heading, note, search, list, status, sample, actions); document.body.append(dialog);
  search.addEventListener('input', refresh);
  list.addEventListener('change', () => { apply.disabled = !list.value; sample.style.fontFamily = '"' + J.safeFamily(list.value) + '",sans-serif'; });
  close.addEventListener('click', () => dialog.close());
  apply.addEventListener('click', () => {
    if (!list.value) return;
    const name = list.value, callback = selectFamily;
    dialog.close(); callback?.(name);
  });
  dialog.addEventListener('close', () => {
    request++; families = []; list.replaceChildren(); search.value = ''; selectFamily = null;
    origin?.focus({preventScroll:true}); origin = null;
  });
}
J.createLocalFontPickerButton = onSelect => {
  const button = el('button', tr('PCのフォントから選ぶ…', 'Choose installed PC font…')); button.type = 'button'; button.className = 'local-font-open';
  button.addEventListener('click', async () => {
    mount(); const seq = ++request; selectFamily = onSelect; origin = button;
    families = []; search.value = ''; search.disabled = true; list.replaceChildren(); list.disabled = true; apply.disabled = true; sample.style.fontFamily = 'sans-serif';
    status.textContent = tr('フォント一覧を取得中…', 'Reading installed fonts…'); dialog.showModal();
    try {
      if (!window.isSecureContext || typeof window.queryLocalFonts !== 'function') {
        status.textContent = tr('この環境では一覧を取得できません。対応するPC版ブラウザのHTTPS公開サイトで利用するか、フォント名を直接入力してください。', 'Font enumeration is unavailable here. Use the HTTPS site in a supported desktop browser, or enter the font name manually.'); return;
      }
      const fonts = await window.queryLocalFonts();
      if (seq !== request || !dialog.open) return;
      families = [...new Set(fonts.map(f => typeof f.family === 'string' ? J.safeFamily(f.family) : '').filter(Boolean))].sort((a,b) => a.localeCompare(b));
      search.disabled = list.disabled = false; refresh();
      if (!families.length) status.textContent = tr('利用できる書体がありません。フォント名の直接入力も使えます。', 'No font families were returned. You can enter a font name manually.');
      search.focus();
    } catch (e) {
      if (seq !== request || !dialog.open) return;
      status.textContent = e.name === 'NotAllowedError'
        ? tr('フォントへのアクセスが許可されませんでした。フォント名の直接入力を使うか、ブラウザのサイト設定で許可して再度開いてください。', 'Font access was not allowed. Enter a name manually, or allow access in browser site settings and reopen the picker.')
        : tr('フォント一覧を取得できませんでした。フォント名を直接入力してください。', 'Could not read installed fonts. Enter the font name manually.');
    }
  });
  return button;
};
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('localFont'), add = document.getElementById('btnAddFont');
  if (!input || !add) return;
  const button = J.createLocalFontPickerButton(name => { input.value = name; add.click(); }); button.id = 'pickEffectFont';
  input.closest('.row').after(button);
});
})();

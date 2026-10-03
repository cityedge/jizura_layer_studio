/* Simple-video settings are live controls; closing retains valid changes. */
(() => {
'use strict';
const tr = J.layerText, $ = id => document.getElementById(id);
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
const fields = new Map(), invalid = new Set();
let dialog, preview, scrub, timeLabel, pcFontButton, fontSignature = '', projectRef = null;
const settings = () => J.ui.project.simpleExport.title;
const save = () => { J.uiApi.flushSave(); J.ui.need = true; J.syncSimpleExportUI(); };
J.simpleTitleDraftError = () => {
  const s = settings(); if (!s.enabled) return '';
  return [...invalid].some(k => !(s.all && ['start','end'].includes(k)) && !(s.font !== 'custom' && k === 'family') && !(k === 'opacity' && !s.backing))
    ? tr('タイトル設定の数値を正しく入力してください。', 'Correct the invalid title setting.') : '';
};
J.syncSimpleTitleUI = changed => {
  if (!dialog) return;
  if (changed || projectRef !== J.ui.project) { invalid.clear(); projectRef = J.ui.project; fontSignature = ''; }
  const s = settings();
  if (pcFontButton) pcFontButton.disabled = !s.enabled;
  for (const [key, input] of fields) {
    if (!invalid.has(key) && document.activeElement !== input) {
      if (input.type === 'checkbox') input.checked = s[key]; else input.value = s[key];
    }
    input.disabled = key !== 'enabled' && (!s.enabled || (s.all && ['start','end'].includes(key)) || (key === 'family' && s.font !== 'custom') || (key === 'opacity' && !s.backing));
    input.setAttribute('aria-invalid', String(invalid.has(key) && !input.disabled));
  }
  const signature = JSON.stringify([s.enabled, s.font, s.family, s.bold, s.italic, s.text, J.lang]);
  if (signature !== fontSignature) {
    fontSignature = signature;
    if (!J.simpleTitleError(s)) J.ensureSimpleTitleFont(s).then(() => { J.ui.need = true; }).catch(e => { if (fontSignature === signature) $('simpleSettingsInfo').textContent = e.message; });
  }
  scrub.max = J.ui.project.simpleExport.duration || 1;
};
J.mountSimpleSettings = (panel, outputControls) => {
  const open = el('button', tr('簡易動画設定…', 'Simple video settings…')); open.id = 'simpleSettingsOpen'; open.type = 'button'; panel.append(open);
  dialog = el('dialog', null, 'simple-settings-dialog'); dialog.id = 'simpleSettingsDlg'; dialog.setAttribute('aria-labelledby', 'simpleSettingsHeading');
  const head = el('h2', tr('簡易動画設定', 'Simple video settings')); head.id = 'simpleSettingsHeading';
  dialog.append(head, el('p', tr('変更はその場で反映・保存されます。タイトルは背景付きプレビューと簡易MP4にだけ表示します。', 'Changes apply and save immediately. Titles appear only in background-composite previews and simple MP4 exports.'), 'note'));
  const layout = el('div', null, 'simple-settings-layout'), controls = el('div', null, 'simple-settings-fields');
  controls.append(outputControls);
  const grid = el('div', null, 'simple-title-grid'); controls.append(grid);
  function field(key, ja, en, type, options = {}) {
    const label = el('label', null, type === 'checkbox' ? 'simple-check' : ''), input = el(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input');
    input.id = 'simpleTitle-' + key; input.setAttribute('aria-label', tr(ja, en));
    if (input.tagName === 'INPUT') input.type = type;
    if (options.wide) label.classList.add('simple-wide');
    if (options.min != null) { input.min = options.min; input.max = options.max; input.step = options.step ?? 'any'; }
    if (type === 'textarea') { input.rows = 3; input.maxLength = 2000; }
    if (key === 'family') input.maxLength = 100;
    if (type === 'checkbox') label.append(input, document.createTextNode(tr(ja, en))); else label.append(el('span', tr(ja, en)), input);
    if (options.items) for (const [value, jaLabel, enLabel] of options.items) input.add(new Option(tr(jaLabel, enLabel), value));
    input.addEventListener(type === 'select' || type === 'checkbox' ? 'change' : 'input', () => {
      let value = type === 'checkbox' ? input.checked : type === 'number' ? input.valueAsNumber : input.value;
      if (type === 'number' && (!Number.isFinite(value) || value < +input.min || value > +input.max)) invalid.add(key);
      else { invalid.delete(key); settings()[key] = value; }
      save();
    });
    grid.append(label); fields.set(key, input); return input;
  }
  field('enabled','タイトルを表示','Show title','checkbox',{wide:true});
  field('text','タイトル本文（改行可）','Title text (line breaks allowed)','textarea',{wide:true});
  field('all','全部（最初から最後まで）','Whole video (start to finish)','checkbox',{wide:true});
  field('start','開始（秒）','Start (seconds)','number',{min:0,max:86400});
  field('end','終了（秒）','End (seconds)','number',{min:0,max:86400});
  field('fade','フェードイン・アウト（各1秒）','Fade in/out (1 second each)','checkbox',{wide:true});
  const font = field('font','フォント','Font','select',{wide:true});
  field('family','PCのフォント名','Installed PC font family','text',{wide:true});
  pcFontButton = J.createLocalFontPickerButton(name => {
    settings().font = 'custom'; settings().family = name; invalid.delete('family'); save();
  });
  pcFontButton.id = 'pickTitleFont'; pcFontButton.classList.add('simple-wide'); grid.append(pcFontButton);
  field('bold','太字','Bold','checkbox'); field('italic','イタリック','Italic','checkbox');
  field('size','文字サイズ（短辺の%）','Font size (% of short side)','number',{min:1,max:30,step:0.5});
  field('color','文字色','Text color','color');
  field('outline','黒いふち','Black outline','checkbox'); field('backing','半透明黒の下地','Translucent black backing','checkbox');
  field('opacity','下地の不透明度（%）','Backing opacity (%)','number',{min:0,max:100,wide:true});
  field('position','基準位置','Anchor position','select',{wide:true,items:[['top-left','左上','Top left'],['top-center','上中央','Top center'],['top-right','右上','Top right'],['middle-left','左中央','Middle left'],['middle-center','中央','Center'],['middle-right','右中央','Middle right'],['bottom-left','左下','Bottom left'],['bottom-center','下中央','Bottom center'],['bottom-right','右下','Bottom right']]});
  field('x','横の微調整（画面幅の%）','Horizontal offset (% of width)','number',{min:-100,max:100});
  field('y','縦の微調整（画面高の%）','Vertical offset (% of height)','number',{min:-100,max:100});
  controls.append(el('p', tr('右・下への移動は正の値。長い本文は画面に収まるよう縮小します。下地は背景直上、スペアナ・字幕より下です。表示区間は出力範囲との重なりを使い、2秒未満ではフェードを短縮します。', 'Positive offsets move right/down. Long text shrinks to fit. Backing is above the background but below spectrum and lyrics. The visible interval intersects the export range; fades shorten for intervals under two seconds.'), 'note'));
  const viewer = el('div', null, 'simple-settings-preview');
  viewer.append(el('h3', tr('仕上がりプレビュー', 'Composite preview')));
  preview = el('canvas'); preview.id = 'simpleTitlePreview'; preview.setAttribute('aria-label', tr('タイトルを含む簡易動画のプレビュー', 'Simple video preview including title'));
  const time = el('label'); timeLabel = el('span'); scrub = el('input'); scrub.type = 'range'; scrub.id = 'simpleTitleTime'; scrub.min = 0; scrub.step = .01; scrub.setAttribute('aria-label', tr('プレビュー時刻（秒）', 'Preview time (seconds)')); time.append(timeLabel,scrub);
  viewer.append(preview,time); layout.append(controls,viewer); dialog.append(layout);
  const info = el('p', null, 'note'); info.id = 'simpleSettingsInfo'; info.setAttribute('role','status'); dialog.append(info);
  const foot = el('div', null, 'simple-settings-actions'), close = el('button', tr('閉じる','Close')); close.type='button'; close.addEventListener('click',()=>dialog.close()); foot.append(close); dialog.append(foot); document.body.append(dialog);
  let raf = 0, last = 0;
  function draw(now) {
    if (!dialog.open) return;
    raf = requestAnimationFrame(draw);
    if (now - last < 150) return; last = now;
    const [w,h]=J.outputSize(J.ui.project), ratio=w/h;
    const pw=Math.round(Math.min(720,420*ratio)), ph=Math.round(pw/ratio);
    if(preview.width!==pw||preview.height!==ph){preview.width=pw;preview.height=ph;}
    const t=Number(scrub.value); timeLabel.textContent=tr(`確認時刻：${t.toFixed(2)}秒`,`Preview time: ${t.toFixed(2)}s`);
    J.drawLayerPreview(preview.getContext('2d'),J.ui.plan,t,{fast:false,simpleSettingsPreview:true});
  }
  open.addEventListener('click',()=>{
    J.uiApi.pause(); font.replaceChildren();
    for(const [key,f] of Object.entries(J.FONTS)) if(!f.legacyUpload) font.add(new Option((J.faceOf?.(key)||f).label,key));
    font.add(new Option(tr('PCのフォント名を指定','Enter installed PC font name'),'custom'));
    if(![...font.options].some(o=>o.value===settings().font)) font.add(new Option(settings().font,settings().font));
    J.syncSimpleExportUI(); scrub.value=Math.min(+scrub.max,Math.max(0,J.ui.t)); dialog.showModal(); last=0; raf=requestAnimationFrame(draw);
  });
  dialog.addEventListener('close',()=>{cancelAnimationFrame(raf);J.ui.need=true;J.syncSimpleExportUI();$('viewport')?.focus({preventScroll:true});});
};
})();

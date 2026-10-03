/* Browser-wide editable library, portable project definitions, and a draft modal.
   Never edit applied snapshots or replan merely because the library changed. */
(() => {
'use strict';
const tr = J.layerText, clone = x => JSON.parse(JSON.stringify(x));
const KEY = 'jizura.layers.userThemes.v1';
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
// Summaries of each pack's palettes, font roles and recipe biases, not promises
// of a particular draw. Keep these aligned with 04_styles / 11p_styles / horror3.
const styleHints = {
  noir: ['白黒に琥珀・シアンの色ずれ、太いゴシック。縦組みや幅を詰めた文字、横に流れる配置を好み、文字が集まる・切り込む登場と、砕ける・漂う退場に寄りやすい。', 'Black and white with amber/cyan separation and heavy sans-serif type. Favors vertical, condensed and scrolling arrangements, assembling or sliced entrances, and exploding or drifting exits.'],
  crimson: ['深紅・ピンクに白黒と青緑、太いゴシック。巨大文字や散らした配置を好み、文字の乱れ・切断・グリッチで信号が壊れるような印象を作りやすい。', 'Crimson and pink with black, white and mint accents, using heavy sans-serif type. Favors oversized or scattered text, scrambling, slices and glitch exits for a damaged-signal feel.'],
  caution: ['黄・赤・黒に青の差し色、太い明朝とゴシック。円環や書体を混ぜた配置を好み、回転・飛び出し・散開に、矢印や計器風の装飾を組み合わせやすい。', 'Yellow, red and black with blue accents and heavy serif/sans type. Favors rings and mixed typography, spins, pops and scattering, with arrows and instrument-like ornaments.'],
  magenta: ['鮮やかなピンク・白・青と太い丸文字。波打つ文字や注釈付きの配置を好み、弾む・落ちる登場と、散らばる・縮む退場で元気な印象になりやすい。', 'Vivid pink, white and blue with bold rounded type. Favors wavy text and annotated layouts, popping or dropping entrances, and scattering or shrinking exits for an energetic feel.'],
  paper: ['生成り・藍・マゼンタと太い明朝、強めの紙の質感。積み重ねや大小の文字を混ぜる配置を好み、ワイプや伸縮で現れ、漂うように消える傾向。', 'Cream, navy and magenta with bold Mincho serif type and strong paper texture. Favors stacked and mixed-size text, wipe or stretch entrances, and drifting exits.'],
  hud: ['炭色・白・橙と太いゴシック、粒子感や発光。円やリング状の配置を好み、ぼかし・タイプ表示・文字の集合に、格子や計器風の装飾を添えやすい。', 'Charcoal, white and orange with heavy sans-serif type, grain and glow. Favors circles and rings, blur, typing and assembly, with grids and instrument-style ornaments.'],
  mint: ['黒・青緑・ライムと太いゴシック、走査線や強めの色ずれ。ラベルや反復配置を好み、文字の入れ替わり・点滅・切断で端末画面のような印象になりやすい。', 'Black, teal and lime with heavy sans-serif type, scanlines and pronounced color separation. Favors labels and repeated text, scrambling, flickering and sliced exits for a terminal-like feel.'],
  specimen: ['墨色・生成りに控えめな金茶、明朝中心で色ずれは弱め。辞書の注釈や縦組みを好み、タイプ表示やぼかし、引き出し線で組版を見せる傾向。', 'Ink, cream and muted gold-brown with Mincho serif type and restrained color separation. Favors dictionary-like annotations, vertical text, typing and blur, with leader lines emphasizing typography.'],
  transit: ['オリーブ・黄・黒に白文字、太いゴシック。大小の混在や斜め・散開配置を好み、回転・落下・伸縮と矢印や図形で標識のような印象を作りやすい。', 'Olive, yellow and black with white, bold sans-serif text. Favors mixed sizes, diagonals and scattered layouts, with spins, drops, stretches, arrows and shapes for a signage feel.'],
  blueprint: ['鮮青・白・黒と太いゴシック。斜めの配置や大きな文字、ラベルを好み、ワイプ・切断・伸縮に図形やストライプを組み合わせやすい。', 'Strong blue, white and black with heavy sans-serif type. Favors diagonal layouts, large text and labels, using wipes, slices and stretching alongside shapes and stripes.'],
  rouge: ['明るいグレー・黒と赤のグラデーション、太いゴシック。巨大文字やカプセル状の配置を好み、ズームで現れて縮む動きや、ワイプに寄りやすい。', 'Light gray and black with red gradients and heavy sans-serif type. Favors oversized text and capsule layouts, zooming entrances, shrinking exits and wipes.'],
  mono: ['灰色・白を基調に赤青や緑の強い色ずれ、太い明朝。円環・カプセル・反復配置を好み、文字の集合やぼかし、爆散・グリッチの退場を使いやすい。', 'Gray and white with strong red/blue or green separation and bold Mincho serif type. Favors rings, capsules and repeated layouts, assembly or blur entrances, and exploding or glitch exits.'],
  sakura: ['桜色・梅紫と丸文字・明朝の組み合わせ。縦組みや吊り下げ配置を好み、ぼかしながら現れ、溶ける・浮かぶように消える演出や、花びら・光のぼけを選びやすい。', 'Cherry pink and plum with rounded and Mincho serif type. Favors vertical or hanging layouts, blurred entrances, dissolving or rising exits, petals and soft bokeh.'],
  ocean: ['濃紺・シアンと細いゴシック。泡や奥行きのある配置、せり上がる文字を好み、波紋・浮遊粒子・発光・波のゆがみを組み合わせやすい。', 'Deep navy and cyan with light sans-serif type. Favors bubbles, depth and rising text, with ripples, floating particles, glow and wave distortion.'],
  sunset: ['橙・ピンク・菫色と太い明朝。大きな文字や弧を描く配置、ズームやせり上がる登場を好み、縦グラデーションや光の筋、フィルムが焼けるような光を使いやすい。', 'Orange, pink and violet with bold Mincho serif type. Favors large or arched text, zooming and rising entrances, vertical gradients, light sweeps and film-burn effects.'],
  forest: ['苔色・生成り・茶と手書き風の文字・明朝、紙の質感。縦の段組みや吊り下げ配置を好み、線を描く登場、にじみ、手描きの下線や囲みを使いやすい。', 'Moss, cream and brown with handwritten and Mincho serif type and paper texture. Favors vertical columns and hanging layouts, drawn strokes, ink bleeds and scribbled underlines or circles.'],
  vapor: ['薄紫・ピンク・水色と明朝・ドット文字。鏡像や遠近配置、残像を伴う登場・退場を好み、レトロな格子やVHSの揺れ・色にじみを使いやすい。', 'Lavender, pink and cyan with Mincho serif and pixel type. Favors mirrored and perspective layouts, echoing entrances/exits, retro grids and VHS rolling or color smearing.'],
  newsprint: ['更紙の灰色・墨・赤と見出し向けの明朝、網点や版ずれ。段組み・両端揃え・大きな頭文字を好み、タイプ表示や覆って消す動きで新聞の紙面に寄せやすい。', 'Newsprint gray, ink and red with headline serif type, halftones and print misregistration. Favors columns, justified text and drop caps, typing entrances and covering wipes for a newspaper feel.'],
  synth80: ['マゼンタ・シアンのネオン色と立体的な太い書体、強い発光と走査線。ネオン看板や遠近配置を好み、点灯・ズーム・残像とレトロな格子を組み合わせやすい。', 'Neon magenta and cyan with dimensional bold type, strong glow and scanlines. Favors neon signs and perspective layouts, lighting up, zooming and echoes with retro grids.'],
  kraft: ['クラフト紙・生成りに朱と藍、太い見出し文字と手書き風の本文。テープ・ラベル・切符の配置を好み、スタンプのような登場や折り畳む退場で紙の工作に寄せやすい。', 'Kraft brown and cream with vermilion/navy accents, bold headlines and handwritten body type. Favors tape, labels and tickets, stamped entrances and folding exits for a paper-craft feel.'],
  candy: ['ミント・ピンク・黄・紫のパステルと丸く太い文字。泡や弾む行、伸び縮みする配置を好み、バウンドやゴムのような動きに紙吹雪・ハート・星を添えやすい。', 'Mint, pink, yellow and purple pastels with bold rounded type. Favors bubbles, bouncing lines and elastic layouts, rubbery motion, confetti, hearts and stars.'],
  acid: ['黒・黄緑・マゼンタと荒い形の書体・ドット文字、強い色ずれ。ドット状や降り注ぐ配置を好み、グリッチ・ちらつき・画素のずれ・激しい揺れで壊れた映像に寄せやすい。', 'Black, acid green and magenta with irregular and pixel type and strong color separation. Favors dot-matrix or raining text, glitch, flicker, pixel drift and hard shake for a broken-video feel.'],
  sumi: ['和紙の生成り・墨・朱と筆文字。縦組みや印章、漢字を大きく見せる配置を好み、墨のにじみ・筆順のような登場に、落款や筆跡を添えやすい。', 'Washi cream, ink and vermilion with brush lettering. Favors vertical text, seals and featured kanji, ink-bleed or drawn-stroke entrances, stamp marks and brush ornaments.'],
  gold: ['漆黒・金・象牙色と細めの明朝。枠で囲む配置や中央の文字を好み、字間の変化やぼかし、金色のグラデーション・きらめき・光の筋に寄りやすい。', 'Black, gold and ivory with delicate Mincho serif type. Favors framed or centered text, changing letter spacing, blur, gold gradients, sparkles and light sweeps.'],
  hrRuin: ['褪せた緑灰色・錆色と明朝、ざらついた質感。侵食やにじみのある文字、廊下・点滅する照明・カビ、埃や亀裂を好み、廃墟のような不穏さに寄せやすい。', 'Faded green-gray and rust with Mincho serif type and coarse grain. Favors eroded or bleeding text, corridors, failing lamps, mold, dust and cracks for an abandoned-place atmosphere.'],
  hrNightRec: ['黒・白・赤とゴシック、強い粒子と走査線。監視カメラや砂嵐のテレビ風配置を好み、縦揺れ・点滅・映像途絶やノイズで古い録画に寄せやすい。', 'Black, white and red with sans-serif type, heavy grain and scanlines. Favors CCTV and static-TV layouts, vertical rolling, flickering, signal loss and noise for an old-recording feel.'],
  hrCurse: ['黄ばんだ紙・褪せた墨・暗い赤と手書き風の文字・筆文字。壁の落書きや行方不明の張り紙風配置を好み、にじみ・侵食・滴り・引っかき傷で不気味な手紙に寄せやすい。', 'Yellowed paper, faded ink and dark red with handwritten and brush type. Favors wall scrawls and missing-person notices, ink bleed, erosion, drips and scratches for an unsettling letter-like feel.'],
};
const moodHints = {
  glitch: ['切断・文字の入れ替わり・ちらつきなど、破損した信号のような動き。グリッチと色ずれを強めに使います。', 'Sliced, scrambled and flickering text with strong glitch and color separation, like a damaged signal.'],
  calm: ['緩やかな動きと控えめな装飾。ぼかし・ワイプ・浮遊などを好み、激しい揺れやグリッチを抑えます。', 'Gentler motion and restrained ornaments. Favors blur, wipes and drifting, with less jitter and glitch.'],
  pop: ['弾む・落ちる・回転するなど、元気な動き。装飾が多めで、文字を次々と切り替える傾向です。', 'Energetic pops, drops and spins, with more ornaments and frequent text changes.'],
  graphic: ['斜め配置・ラベル・図形など、グラフィックな構成。ワイプや切断で切り替え、装飾を多めに使います。', 'Graphic arrangements with diagonal text, labels and shapes. Favors wipes and slices with plentiful ornaments.'],
  editorial: ['組版・縦組み・注釈など、誌面のような構成。動きは比較的控えめで、タイプ表示やワイプを好みます。', 'Page-like typography, vertical text and annotations. Relatively restrained movement, favoring typing and wipes.'],
  emotional: ['大きな文字や重なり、集合・浮遊・ぼかしなどで余韻を作ります。色ずれや質感も比較的強めです。', 'Large or layered text with assembly, drifting and blur for expressive motion. Color separation and texture can be strong.'],
  horror: ['不規則なちらつき、文字の乱れ、暗い質感などで不穏さを出します。ホラー用の演出セットも使います。', 'Uneasy flicker, scrambled text and dark textures. Also enables the horror expression set.'],
  chaos: ['特定の系統を優先せず、使用可能な演出と幅広い強度から抽選します。', 'No preferred family: draws broadly from available techniques and a wide range of effect strengths.'],
};
J.userThemeHint = (group, key) => {
  if (key === 'random') return tr('この枠が当たると、使用可能な全候補から均等に選びます。個別ウェイトが0の候補も出ます。', 'When this entry wins, choose uniformly from all available candidates, including those with individual weight zero.');
  if (group === 'styles' && key === 'fromMood') return tr('その回の雰囲気を使い、相性のよいスタイルを優先する従来の抽選を行います。2キーでは現在の字幕の雰囲気を使い、未設定ならランダムに選びます。', 'Use the draw’s mood and the original preference for compatible styles. Key 2 uses the current cue’s mood; an unset mood falls back to a random available style.');
  if (group === 'moods') return tr(...(moodHints[key] || ['', '']));
  return styleHints[key] ? tr(...styleHints[key]) : J.STYLES[key]?.desc || '';
};
let library, dialog, list, name, editor, status, file, referenceMood, distributionInfo, hint, hintAnchor, hintPinned = false, drafts = [], active = '', origin, save, remove, duplicate, session = 0;
function hideHint() {
  hintAnchor?.removeAttribute('aria-describedby'); hintAnchor = null; hintPinned = false;
  if (hint) hint.hidden = true;
}
function showHint(anchor, group, key) {
  hideHint(); hintAnchor = anchor; hint.textContent = J.userThemeHint(group, key); hint.hidden = false;
  anchor.setAttribute('aria-describedby', hint.id);
  const r = anchor.getBoundingClientRect(), box = hint.getBoundingClientRect();
  hint.style.left = Math.max(16, Math.min(r.left, window.innerWidth - box.width - 16)) + 'px';
  const below = r.bottom + 6;
  hint.style.top = Math.max(16, Math.min(below + box.height <= window.innerHeight - 16 ? below : r.top - box.height - 6, window.innerHeight - box.height - 16)) + 'px';
}
const read = () => {
  if (!library) { try { library = J.normalizeUserThemes(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { library = []; } }
  return library;
};
const persist = themes => {
  library = clone(themes);
  try { localStorage.setItem(KEY, JSON.stringify(library)); return true; } catch { return false; }
};
J.mergeUserThemeLibrary = project => {
  const merged = J.mergeUserThemeLists(read(), project.userThemes);
  if (merged.idMap[project.theme]) project.theme = merged.idMap[project.theme];
  project.userThemes = clone(merged.themes);
  project.theme = J.normalizeTheme(project.theme, project);
  persist(merged.themes);
};
const current = () => drafts.find(t => t.id === active);
const error = message => { status.textContent = message; status.classList.add('error'); };
const clearStatus = () => { status.textContent = ''; status.classList.remove('error'); };
function validDrafts() {
  for (const t of drafts) {
    if (!t.name.trim()) { error(tr('テーマ名を入力してください。', 'Enter a theme name.')); active = t.id; render(); return null; }
    for (const [key, label] of [['styles', tr('スタイル', 'Style')], ['moods', tr('雰囲気', 'Mood')]]) {
      if (!Object.values(t[key]).some(w => w > 0)) {
        error(tr(`「${t.name}」の${label}は、少なくとも1項目を1以上にしてください。`, `“${t.name}”: set at least one ${label.toLowerCase()} weight above zero.`)); active = t.id; render(); return null;
      }
    }
  }
  return J.normalizeUserThemes(drafts);
}
function renderList() {
  list.replaceChildren(); const seen = new Map();
  for (const t of drafts) {
    const label = t.name.trim() || tr('名称未設定', 'Unnamed'), n = (seen.get(label) || 0) + 1; seen.set(label, n);
    list.add(new Option(label + (n > 1 ? ` (${n})` : ''), t.id));
  }
  list.value = active;
}
function render() {
  hideHint(); if (distributionInfo) distributionInfo.textContent = '';
  renderList(); const t = current(); editor.hidden = !t; remove.disabled = duplicate.disabled = !t;
  if (!t) return;
  name.value = t.name;
  for (const select of editor.querySelectorAll('select[data-group]')) select.value = String(t[select.dataset.group][select.dataset.key] || 0);
}
function mount() {
  if (dialog) return;
  dialog = el('dialog', null, 'user-theme-dialog'); dialog.id = 'userThemeDialog';
  const heading = el('h2', tr('ユーザーテーマ', 'User themes')); heading.id = 'userThemeHeading'; dialog.setAttribute('aria-labelledby', heading.id);
  const note = el('p', tr('スタイルと雰囲気の抽選ウェイトを設定します。名前にホバー／タップすると説明を表示。「変更を保存」後、テーマを選び、おまかせ／字幕ガチャ1で適用します。', 'Set style and mood draw weights. Hover or tap a name for help. Save changes, then select the theme and apply Auto-compose or cue draw 1.'), 'note');
  const toolbar = el('div', null, 'user-theme-toolbar');
  list = el('select'); list.id = 'userThemeList'; list.setAttribute('aria-label', tr('編集するユーザーテーマ', 'User theme to edit'));
  const button = (ja, en, id, action) => { const b = el('button', tr(ja, en)); b.type = 'button'; b.id = id; b.addEventListener('click', action); return b; };
  const add = button('新規', 'New', 'userThemeAdd', () => {
    const t = { id: J.newUserThemeId(), name: tr('新しいテーマ', 'New theme'), styles: { random: 1 }, moods: { random: 1 } };
    drafts.push(t); active = t.id; clearStatus(); render(); name.focus(); name.select();
  });
  duplicate = button('複製', 'Duplicate', 'userThemeDuplicate', () => {
    const t = clone(current()); t.id = J.newUserThemeId(); t.name = (t.name + tr(' のコピー', ' copy')).slice(0, 80);
    drafts.push(t); active = t.id; clearStatus(); render(); name.focus(); name.select();
  });
  remove = button('削除', 'Delete', 'userThemeDelete', () => {
    const index = drafts.findIndex(t => t.id === active); drafts.splice(index, 1); active = drafts[Math.min(index, drafts.length - 1)]?.id || ''; clearStatus(); render();
  });
  toolbar.append(list, add, duplicate, remove);
  editor = el('div'); editor.id = 'userThemeEditor';
  const label = el('label', tr('テーマ名', 'Theme name'), 'user-theme-name'); name = el('input'); name.id = 'userThemeName'; name.maxLength = 80; label.append(name);
  const help = el('p', tr('0は通常の抽選から除外。ランダムの枠が当たると、その群の0の項目も含む使用可能な全候補から均等に選びます。指定した候補に必要な演出セットは適用先だけで有効になります。', 'Zero excludes a direct choice. When a random entry wins, choose uniformly from every available candidate in that group, including zero-weight items. Sets required by explicit choices are enabled only in the scope being changed.'), 'note');
  const distribution = el('div', null, 'user-theme-distribution');
  const referenceLabel = el('label', tr('参考にする雰囲気', 'Reference mood'));
  referenceMood = el('select'); referenceMood.id = 'userThemeReferenceMood';
  for (const [key, mood] of Object.entries(J.MOODS)) referenceMood.add(new Option(mood.name, key));
  referenceLabel.append(referenceMood);
  const applyDistribution = button('雰囲気の分布を使う', 'Use mood distribution', 'userThemeApplyDistribution', () => {
    const t = current(); if (!t) return;
    const result = J.approximateMoodStyleWeights(J.ui.project, referenceMood.value);
    t.styles = result.weights; t.moods = { [referenceMood.value]: 1 }; clearStatus(); render();
    distributionInfo.textContent = result.preferredCount
      ? tr(`主候補${result.preferredCount}種を直接選ぶ割合：約${(result.mainShare * 100).toFixed(1)}%。残りはランダムです。ここから自由に調整できます。`, `Direct preferred-pool share (${result.preferredCount} styles): about ${(result.mainShare * 100).toFixed(1)}%. The rest is random. Adjust the weights as desired.`)
      : tr('優先候補がないため、スタイル欄は「ランダムにスタイルを選ぶ」だけを1にしました。', 'No preferred styles: only Choose a random style is set to 1 in the style group.');
  });
  distribution.append(referenceLabel, applyDistribution);
  const distributionHelp = el('p', tr('両方の欄を上書きします。スタイルは近似配分、雰囲気は選択したものを1、ほかを0にします。現在の使用設定を基準にし、ホラー参照時は必要セットを含めます。展開後のランダム候補は元の抽選と異なる場合があります。', 'Replaces both groups: approximate style weights, and the selected mood at 1 with all others at 0. Uses current set switches, including the required set for a Horror reference. The resulting random pool may differ from the original draw.'), 'note');
  distributionInfo = el('p', '', 'note'); distributionInfo.id = 'userThemeDistributionInfo'; distributionInfo.setAttribute('role', 'status');
  const columns = el('div', null, 'user-theme-columns');
  for (const [group, ja, en, keys, registry] of [['styles', 'スタイルのウェイト', 'Style weights', J.STYLE_ORDER, J.STYLES], ['moods', '雰囲気のウェイト', 'Mood weights', Object.keys(J.MOODS), J.MOODS]]) {
    const section = el('section'), h = el('h3', tr(ja, en));
    const clear = button('すべて0', 'Zero all', 'userThemeZero-' + group, () => { current()[group] = {}; clearStatus(); render(); });
    const header = el('div', null, 'user-theme-group-heading'); header.append(h, clear); section.append(header);
    for (const key of ['random', ...(group === 'styles' ? ['fromMood'] : []), ...keys]) {
      const text = key === 'random' ? (group === 'styles' ? tr('ランダムにスタイルを選ぶ', 'Choose a random style') : tr('ランダムに雰囲気を選ぶ', 'Choose a random mood')) : key === 'fromMood' ? tr('雰囲気から決める', 'Choose from mood') : registry[key].name;
      const row = el('div', null, 'user-theme-weight');
      const info = el('button', text, 'user-theme-help'); info.type = 'button'; info.id = `userThemeHelp-${group}-${key}`;
      info.setAttribute('aria-label', tr(`${text}の説明`, `About ${text}`));
      info.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') showHint(info, group, key); });
      info.addEventListener('pointerleave', e => { if (!hintPinned && document.activeElement !== info && !hint.contains(e.relatedTarget)) hideHint(); });
      info.addEventListener('focus', () => showHint(info, group, key));
      info.addEventListener('blur', () => { if (hintAnchor === info) hideHint(); });
      info.addEventListener('click', () => { if (hintAnchor === info && hintPinned) hideHint(); else { showHint(info, group, key); hintPinned = true; } });
      row.append(info);
      const weight = el('select'); weight.dataset.group = group; weight.dataset.key = key; weight.id = `userTheme-${group}-${key}`;
      weight.setAttribute('aria-label', tr(`${text}のウェイト`, `${text} weight`));
      for (let i = 0; i <= 10; i++) weight.add(new Option(String(i), String(i)));
      weight.addEventListener('change', () => { const t = current(); if (t) { t[group][key] = Number(weight.value); clearStatus(); distributionInfo.textContent = ''; } });
      row.append(weight); section.append(row);
    }
    columns.append(section);
  }
  editor.append(label, help, distribution, distributionHelp, distributionInfo, columns);
  const files = el('div', null, 'user-theme-toolbar');
  const exportButton = button('テーマJSONを保存', 'Export themes JSON', 'userThemeExport', () => {
    const themes = validDrafts(); if (!themes) return;
    J.saveFile('jizura-user-themes.json', JSON.stringify(J.userThemesFile(themes), null, 2));
    status.classList.remove('error'); status.textContent = tr('ダイアログ内の全テーマを保存しました。', 'Exported all themes in this dialog.');
  });
  file = el('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true; file.id = 'userThemeFile';
  const importButton = button('テーマJSONを読み込む', 'Import themes JSON', 'userThemeImport', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files?.[0]; if (!f) return;
    const opened = session;
    try {
      if (f.size > 2 * 1024 * 1024) throw new Error('Too large');
      const imported = J.parseUserThemeFile(JSON.parse(await f.text()));
      if (!dialog.open || opened !== session) return;
      // Validate drafts first so an import cannot silently discard unfinished edits.
      const valid = validDrafts(); if (!valid) return;
      const merged = J.mergeUserThemeLists(valid, imported); drafts = clone(merged.themes);
      active = imported.length ? merged.idMap[imported[0].id] : active; render();
      status.classList.remove('error'); status.textContent = tr('読み込みました。「変更を保存」でライブラリへ反映します。', 'Imported. Save changes to update the library.');
    } catch { if (dialog.open && opened === session) error(tr('ユーザーテーマJSONを読み込めません。形式・ウェイト（0〜10）・各群の合計を確認してください。', 'Cannot import themes. Check the file format, weights (0–10), and nonzero totals for both groups.')); }
    finally { if (opened === session) file.value = ''; }
  });
  files.append(exportButton, importButton, file);
  const storage = el('p', tr('全テーマをブラウザ共通ライブラリとプロジェクトJSONへ保存します。削除・編集しても適用済み字幕や9の基準は変わりません。同名テーマは別IDで管理します。', 'All themes are saved in the browser library and project JSON. Editing or deleting them leaves applied cues and key 9’s baseline intact. Same-name themes have separate IDs.'), 'note');
  status = el('p', '', 'note'); status.id = 'userThemeStatus'; status.setAttribute('role', 'status');
  const actions = el('div', null, 'user-theme-actions');
  const cancel = button('キャンセル', 'Cancel', 'userThemeCancel', () => dialog.close());
  save = button('変更を保存', 'Save changes', 'userThemeSave', () => {
    const themes = validDrafts(); if (!themes) return;
    const stored = persist(themes), p = J.ui.project;
    p.userThemes = clone(themes); p.theme = J.normalizeTheme(p.theme, p);
    J.uiApi.syncOmakaseThemes(); J.uiApi.flushSave(); dialog.close();
    J.uiApi.toast(stored ? tr('ユーザーテーマを保存しました。', 'User themes saved.') : tr('ブラウザへ保存できませんでした。テーマJSONを保存して保管してください。', 'Browser storage failed. Export themes JSON to keep a backup.'));
  }); save.classList.add('primary'); actions.append(cancel, save);
  const footer = el('div', null, 'user-theme-footer'); footer.append(files, status, actions);
  hint = el('div', null, 'user-theme-hint'); hint.id = 'userThemeHint'; hint.setAttribute('role', 'tooltip'); hint.hidden = true;
  hint.addEventListener('pointerleave', () => { if (!hintPinned && document.activeElement !== hintAnchor) hideHint(); });
  dialog.append(heading, note, toolbar, editor, storage, footer, hint); document.body.append(dialog);
  dialog.addEventListener('click', e => { if (!e.target.closest('.user-theme-help') && !hint.contains(e.target)) hideHint(); });
  dialog.addEventListener('scroll', hideHint);
  window.addEventListener('resize', hideHint);
  dialog.addEventListener('keydown', e => { if (e.key === 'Escape' && !hint.hidden) { e.preventDefault(); e.stopPropagation(); hideHint(); } });
  list.addEventListener('change', () => { active = list.value; clearStatus(); render(); });
  name.addEventListener('input', () => { if (current()) { current().name = name.value; clearStatus(); renderList(); } });
  dialog.addEventListener('close', () => { hideHint(); session++; drafts = []; active = ''; file.value = ''; origin?.focus({preventScroll:true}); origin = null; });
}
J.addUserThemeManagerButton = (parent, suffix) => {
  const b = el('button', tr('ユーザーテーマ…', 'User themes…')); b.type = 'button'; b.className = 'small'; b.id = 'manageThemes-' + suffix;
  b.addEventListener('click', () => {
    if (J.ui.exporting || J.ui.tap || J.layerSession?.busy) return;
    J.uiApi.pause(); mount(); session++; origin = b; drafts = clone(read()); active = drafts.some(t => t.id === J.ui.project.theme) ? J.ui.project.theme : drafts[0]?.id || '';
    referenceMood.value = Object.hasOwn(J.MOODS, J.ui.project.mood) ? J.ui.project.mood : 'calm';
    status.textContent = ''; status.classList.remove('error'); render(); dialog.showModal();
  }); parent.append(b);
};
})();

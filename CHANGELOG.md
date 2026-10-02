## 1.4.1 — 2026-10-02

- 中央ペイン全体を常時縦スクロールに変更。カード・手法選択の高さを制限せず、増減時もプレビューの大きさと先頭からのスクロール量を維持。タイムライン端の目印・番号を内側に収め、スマホ配置は維持。
- Use one permanently scrollable desktop center pane. Let cards and technique choices grow naturally while preserving preview size and scroll offset. Keep timeline endpoint handles/labels inside the canvas and preserve mobile layout.
- 簡易動画設定をダイアログへ集約し、出力時間と音源除外を移動。独立したタイトル本文・書体・太字／斜体・サイズ・色・ふち・9位置と微調整・半透明黒下地を追加。全編／開始終了秒、前後各1秒のフェード（短区間は短縮）、範囲出力、JSON、日英UIに対応。下地は背景直上、タイトルは最前面。背景付きプレビューと簡易MP4のみへ反映し、レイヤー出力は維持。
- Consolidate simple-video duration/audio controls in a settings dialog. Add independent title text, font, bold/italic, size/color, outline, nine anchors/offsets and translucent black backing. Support whole-video or timed intervals, one-second fades shortened for brief intervals, range export, JSON and Japanese/English UI. Place backing above the background and title above all overlays; apply only to composite previews and simple MP4.

## 1.4.0 — 2026-10-02

- 日英マニュアルを現行の操作順へ再構成。透明度・テーマ・出力・保存の説明を本文へ統合し、更新履歴を分離。加算のない編集環境向けに、乗算と差の絶対値・白ベタ2枚による半透明合成手順を掲載。短いガイドとアプリ内ガイドも更新。
- Reorganize Japanese/English manuals around current workflows, integrating opacity, themes, exports and storage into the main text and separating release history. Document Multiply plus Difference with two white layers as an alternative to Add for alpha compositing; update short and in-app guides.

- おまかせテーマ「なし・文字PV・キネティック・和風・ホラー・ポップ・バラード」を追加。全体抽選では必要なセットを有効化し、字幕ガチャ1〜3では対象字幕だけに適用。4・6は字幕の基準、9は最後に全体へ適用したテーマと設定を維持。0・5は選択テーマから独立。JSON・履歴・統一感・フィラーに対応。
- Add No theme / Lyric video / Kinetic / Japanese / Horror / Pop / Ballad. Enable required sets globally for Auto-compose and locally for cue draws 1–3. Preserve cue settings for 4/6 and the applied global baseline for 9; 0/5 ignore the pending theme. Support JSON, history, coherence and fillers.
- 字幕ガチャ後の全体変更を「前の案」で戻した際に、「次の案」が失われる問題を修正。テーマによるセットの自動有効化も履歴で復元。
- Preserve forward look history after undoing a global change following a cue draw, and restore theme-enabled set switches when navigating history.

- 「飾りの数字・時刻を隠す」を追加。本文の数字・タイムスタンプフィラーを保護し、演出抽選を変えずプレビュー・全出力で共有。初期値オフ、JSON保存対応。
- Add Hide decorative numbers and times, preserving numeric lyrics and timestamp fillers without rerolling effects. Shared by previews and all exports; off by default and saved in JSON.

- 半透明モードに「背景色の不透明度」スライダーを追加（0〜100%、初期値40%）。プレビュー・全出力で共有し、JSONへ保存。背景色の参照から混色・グラデーション・テクスチャへ透明度を引き継ぎ、文字・前景・つなぎ・画面加工も対象とします。混色率から直接不透明度を作る個別修正を撤去し、半透明の作業用バッファを明示的に初期化。保存配色・抽選・二値モードは維持します。
- Add a Background color opacity slider (0–100%, default 40%) shared by previews and all exports and saved in project JSON. Propagate palette background alpha through mixtures, gradients and textures, including text, foreground parts, transitions and post effects. Remove per-effect mix-ratio conversions and explicitly clear translucent scratch buffers. Preserve saved palettes, random choices and binary rendering.

- 透明度モード「二値（従来）／半透明（グレーマット）」を追加。プレビュー・ペア・フロントのみ・簡易MP4に共通で適用し、JSONに保存。旧JSONは二値で復元。
- Add Binary (legacy) / Alpha (grayscale matte) opacity modes shared by preview, pair, front-only and simple MP4 exports. Persist in JSON; legacy projects remain binary.
- 半透明モードはプリマルチプライ済みRGBと白＝透明の連続グレーマットを出力。ファイル名に `_alpha` を付加。簡易出力は透明度を保って背景へ合成。スペアナは二値のまま、字幕が手前で透過合成。外周ブルーム除去は維持。
- Alpha mode exports premultiplied RGB with an inverse grayscale alpha matte and `_alpha` filenames. Simple export composites retained opacity onto the background. Spectra stay binary; subtitles blend over them. Exterior bloom removal is unchanged.

- 本家v0.10.0〜v0.10.1の改善を部分移植。字幕一覧のレイアウト選択肢は操作時に、手法カードは分類を開いたときに生成し、サムネイルは表示範囲のみ描画。
- Port selected upstream v0.10.0–v0.10.1 improvements: populate layout menus on interaction, create technique cards on opening their group, and paint thumbnails only within the viewport.
- 長い英単語の自動分割・レイアウト内改行を単語単位に変更。ハイフン後の分割・再結合に対応し、英語中心の横画面コマ割りは左から右へ。空白フィラーと既存の1文字単語修正は維持。
- Preserve long English words in automatic chunks and layout wrapping, retain hyphen boundaries, and order landscape panels left-to-right for Latin lyrics. Keep whitespace fillers and the existing single-letter-word fix.
- JSON読込時に、前のプロジェクトの編集Undo/Redo・前の案/次の案を消去。ロック時の末尾効果は既存の所属情報による保持を継続し、フィラー・字幕ガチャ・JSON復元を含む回帰テストを追加。
- Clear the previous project's edit and look histories when loading JSON. Retain the existing effect-ownership logic for late locked-cue accents, with regression coverage for fillers, cue redraws and JSON restoration.

## 1.3.2 — 2026-10-01

- フォントファイルの読み込み・保存を廃止。追加書体はPCの書体名指定に統一し、日本語名のJSON復元を修正。音源のブラウザ保存・自動復元も廃止し、旧素材キャッシュを起動時に削除。字幕・設定の自動保存は維持。
- Remove font-file imports and binary storage; use installed PC family names and preserve Japanese names across JSON reloads. Remove audio caching/restoration and clean up legacy media caches at startup. Keep project autosave.
- JSON読込後に再開手順のダイアログを表示。字幕・フィラーは復元済みでSRTは再読込不要、音源・背景・外部スペアナは別途必要であることを案内。
- Show a resume dialog after opening JSON: subtitles and fillers are restored without reimporting SRT; audio, background and external spectrum media must be supplied separately.

- 英語の1文字単語が前の語と連結される問題（`Had a` → `Hada`、`and I` → `andI`）を修正。単独文字の結合をかなに限定し、英単語・数字・図形の区切りを保持。
- Fix single-letter English words merging into the preceding word (`Had a` → `Hada`, `and I` → `andI`). Limit single-character merging to kana, preserving boundaries for English words, numbers and symbols.

## 1.3.1 — 2026-10-01

- プレビュー速度の末尾に「旧1×」を追加。解析済み音声を元のWeb Audio方式で1倍再生し、通常プレーヤーの読み込み・再生失敗や開始待ちのタイムアウト時にも同じ位置から自動切替。手動切替、音量・消音、シーク・ループに対応。旧方式でも失敗した場合は通知して停止。
- Add Legacy 1× to preview speeds, using decoded audio through Web Audio. Fall back at the current position after standard-player loading/playback failure or a startup timeout. Support manual switching, volume/mute, seeking and looping; stop with a message if legacy playback also fails.
- マウスで通常画面の選択・チェック・スライダー等を操作した後にプレビューへフォーカスを戻す処理を追加。左ペインの追加項目も対象にし、文字・数値入力、ダイアログ、キーボード操作、明示的なフォーカス移動は保護。プレビュー速度に正確な2/3倍を追加。
- Return focus to the preview after pointer-operated main-editor controls, including added left-pane settings. Preserve text/number editing, dialogs, keyboard operation and deliberate autofocus. Add an exact 2/3× preview speed.
- プレビュー速度に1倍・0.8倍・2/3倍・0.5倍を追加。ブラウザの音程維持再生を使用し、字幕・背景動画・スペアナを同じ時刻で再生。速度はセッション内のみ保持し、MP4出力・保存済みタイミングには反映しません。タップ同期中は1倍に固定。
- Add pitch-preserving preview speeds of 1×, 0.8×, 2/3× and 0.5×, with synchronized subtitles, background video and spectrum. Speed is session-only and does not alter MP4 exports or saved timing. Tap sync uses 1×.
- 字幕ガチャのボタンを物理キーに合わせた1〜6・9・0の順に配置し、「0 ランダム」を右端へ移動。
- Order subtitle-draw buttons as 1–6, 9, 0, placing Random at the right end to match the number row.
- 字幕ガチャのQショートカットを廃止し、微調整は6に統一。画面のボタン・ツールチップ・日英ガイドも数字キー表記へ変更。
- Remove the Q shortcut for subtitle draws; use 6 for Fine-tune. Update buttons, tooltips and Japanese/English guides to numeric shortcuts.
- 字幕ガチャ「9：全体のテイスト」を追加。最後に全体へ適用したスタイル・雰囲気・配色・書体・演出候補・統一感を基準に、対象字幕の個別指定を解除して再抽選。基準をJSONへ保存し、旧JSONは全体設定を使用。ロック・Undo・再生中の0.3秒前への移動に対応。
- Add 9 / Global taste: clear the current cue's local choices and redraw using the latest global style, mood, colors, fonts, technique pool and Unified look. Persist the baseline in JSON, infer it from global settings for older projects, and retain locks, Undo and playback lead-in.
- JSON再読込時の候補ON項目の補完・プロパティ順序の違いで、保存した字幕ガチャ結果が無効になる問題を修正。1.3.0以前の保存済み比較情報も意味的に比較します。
- Preserve saved cue draws when JSON import expands enabled candidate entries or reorders properties; compare legacy context records semantically too.

## 1.3.0 — 2026-10-01

- 隠しデバッグキーを変更：Oは高被覆レイアウト33種、Pは高被覆背景35種を現在の字幕へ抽選。修正前の描画調査で最大被覆率50％以上だった候補を使用し、通常の採用チェックを迂回。文字数適合・ロック・Undo・JSON保存に対応。現在の被覆率を測定する機能ではありません。
- Change hidden debug keys: O draws from 33 high-coverage layouts, P from 35 backgrounds for the current cue, bypassing normal inclusion switches. Pools use the pre-revision audit's maximum coverage of at least 50%, not a live measurement. Preserve text compatibility, locks, Undo and JSON persistence. See `docs/DEBUG_REVIEW.md`.

- 背景を広く覆っていた13種類の背景・レイアウトを調整。光・グラデーション・影絵は演出に必要な面を残して外側を抜き、背景模様は輪郭化。グラデは中央の斜め約1/3、二色スイープは広い楕円、周辺光は四隅、影絵は光源と文字・影を結ぶ扇形に元の描画を残す。惑星の面・大気光、照明の点滅、廊下の明暗も維持。字幕帯の中央・テレビの周辺光を除去。懐中電灯の照射半径を25％拡大し、監視モニターに外側8％の余白を追加。半透明化や画素の色による一括削除ではなく、描画領域を変更。プレビュー・出力・演出見本に反映。
- Adapt 13 broad background/layout fills while preserving their filled light fields: a diagonal central third for Gradient, a broad ellipse for Duotone Sweep, filled corners for Vignette Pulse, and a fan connecting Shadow Play's lamp, text and shadow. Retain the planetary disk/atmosphere, flickering illumination and corridor shading; outline background patterns and remove Subtitle Bar's picture backing and Static TV's room glow. Enlarge the flashlight radius by 25% and inset CCTV monitors by 8%. Bound drawing regions rather than introducing translucency or color-based pixel removal; apply to previews, exports and technique samples.

- 前のカットの最終画像を次の冒頭へ残すつなぎを追加：余韻を縮小、斜めに断ち切る、放射状に砕ける。既存方式を維持し、同一パート・接続時刻・長さを確認して自動抽選。Undo／JSON保存に対応。
- Add Retreating echo, Diagonal split and Radial shatter transitions using the outgoing cut's final image. Keep legacy transitions; constrain automatic choices by part, touching boundaries and cut duration, with Undo and JSON persistence.
- 簡易MP4出力が動画背景に対応。表示時刻に基づく順次デコードで字幕・内部生成／外部動画のスペアナと合成し、範囲出力でも元の時刻を維持。
- 背景動画は0秒から同期し、終端後は最後のフレームを保持。背景動画内の音声は除外し、別途読み込んだ曲だけを使用。
- 出力時間の自動計算に背景の映像トラック終了時刻を追加。非対応コーデックは理由を表示し、キャンセル・失敗時にデコーダーを解放。
- 日英のアプリ内ガイド・README・詳細マニュアルを更新。
- Add timestamp-decoded video backgrounds to simple MP4 export, alongside generated or external spectra. Preserve source times for range exports, hold the final frame, ignore background soundtracks, and include video-track duration in automatic length calculation. Keep pair/front-only exports background-free. Update Japanese and English documentation.

## 1.2.1 — 2026-09-30

- 全体の構成変更後のプレビューを最初の字幕の0.5秒前（最短0秒）から開始。おまかせ・部分変更・全体シャッフル・案の履歴に適用し、フィラーと空白文字も対象に含め、空欄は除外。
- Start previews after global look changes 0.5 seconds before the first nonempty cue, clamped to zero. Apply to Auto-compose, partial changes, global Shuffle and look history; include fillers and whitespace effects.

- SRT読み込み後の「字幕」欄でパート区切りのみ編集可能に。Enterで区切りを追加（行頭なら上、それ以外は下）、空行をBackspace／Deleteで削除。マウス用ボタン、Undo／Redo、JSON保存に対応し、本文・時刻は保護。
- 自動区切りを手動で追加・解除でき、統一感と字幕間のつなぎに反映。本文内の改行は一覧では↵で表示。
- 行頭で区切りを追加した後は、カーソルを下へ移動した本文の先頭に保持。
- Keep the caret at the moved text's start when inserting a part break above a cue.
- Edit only part breaks in the SRT subtitle summary: Enter adds a break above the cue at its start, otherwise below; Backspace/Delete removes a blank separator. Include mouse controls, Undo/Redo and JSON persistence while protecting text and timing. Manual boundaries affect Unified look and cross-cue joins; embedded text line breaks display as ↵.

## 1.2.0 — 2026-09-29

- 0キー／ボタンの「ランダム」を追加。スタイル・雰囲気の枠を外し、レイアウトの適合条件や演出密度を考慮して広く抽選。基礎設定を保持し、2〜5の部分変更、Q／6での基礎設定への復帰、Undo・JSON保存に対応。
- Add Random on key/button 0: broad compatible combinations with restrained effect density, retained base settings, partial changes via 2–5, return to base settings via Q/6, Undo and JSON persistence.
- SRT使用中は全体・行ごとのタップ同期を無効化。同期中のSRT読み込みでは同期と再生を終了し、時刻欄・ドラッグ・±0.1秒での調整へ案内。
- Disable both tap-sync entry points while using SRT; importing SRT during tap sync ends the session and pauses playback. Keep time fields, dragging and ±0.1s shifts available.
- 内蔵スペアナに「初期設定に戻す」を追加。上下の色を白、感度+8dB、拍動100%、戻る速さ140msへ戻し、位置・倍率・自動音域を維持。
- Add Reset to defaults for the generated spectrum: white top/bottom colors, +8dB sensitivity, 100% pulse and 140ms return time, preserving placement and automatic frequency range.
- 日英の詳細マニュアル・アプリ内ガイド・README・公開手順を公開版に合わせて更新。
- Update both manuals, in-app guides, READMEs and publishing instructions for the release.

- 字幕ガチャを6種類に拡張（1：全体、2：スタイル、3：雰囲気、4：演出、5：配色、6／Q：微調整）。字幕ごとの設定を保持して部分的に再抽選でき、Undo・JSON・プレビュー・出力に反映。
- 「フロントだけ MP4を出力」を追加。マット生成とマット用エンコーダーを省略し、黒背景・無音のフロントを1本保存。
- Add six local subtitle draws (1 Everything, 2 Style, 3 Mood, 4 Performance, 5 Colors, 6/Q Fine-tune), persistent local looks and front-only MP4 export without matte generation or encoding.
- SRTの通常字幕間に3秒以上の空白がある場合の自動パート分け、読み取り専用のパート表示、時刻が一致する字幕間のつなぎを追加。
- 字幕単位の再抽選（Q）を追加。全体ルール・手動指定・他字幕の演出を維持し、再生中は0.3秒前へ移動。UndoとJSON保存に対応。左右を2秒移動、Shift＋左右を字幕移動、A／Dを1フレーム、Shift＋A／Dを1秒移動に変更。
- Add automatic SRT parts at 3-second normal-cue gaps, matching-boundary joins, isolated subtitle rerolls (Q) with Undo and persistence, plus cue/2-second navigation and A/D fine seeking.

## 1.1.0 — 2026-09-28

- 全フィラー種類の重みを0〜10に統一。重み0を抽選から除外し、生成対象がすべて0なら既存フィラーを保持してエラー表示。
- Allow weights 0–10 for every filler type. Exclude zero-weight types and reject generation without replacing fillers when all active weights are zero.

- フィラーの種類に「指定テキスト」を追加。初期値は空欄・重み0。全文を保持し、有効な重みで本文が空の場合は既存フィラーを変更せずエラー表示。
- Add Custom text fillers, initially empty with weight 0. Preserve the full text and reject empty active custom text without replacing existing fillers.

- 後処理で外側へ追加されたブルームを常に全除去。文字・図形・スパーク本体と内側の明るさの変化を保護。左ペインのしきい値設定を削除し、旧プロジェクトの値は無視・破棄。
- Always remove exterior post-processing bloom while preserving original artwork, sparks and interior brightness. Remove the threshold UI and discard legacy threshold settings.

- 内蔵スペアナの周波数範囲を曲全体の粗い予備解析で自動設定。250〜4,000Hzの安全範囲を確保し、「自動音域」を表示。FFTサイズ・帯域重複防止・音量と拍動処理を維持。
- Automatically estimate the native spectrum range from a bounded whole-song scan, retain the 250–4,000 Hz safety band, and display the range without changing FFT sizes or motion processing.

- 音源解析による64バーの内蔵スペアナを追加。「なし／音源から生成／外部動画」を切り替え、固定上下グラデーション・感度・拍動・戻る速さ・位置と倍率を調整できます。プレビュー・シーク・ペア／簡易MP4で解析済みの同じ動きを使用し、設定はJSONに保存。
- Add a 64-band audio-derived spectrum with cached worker analysis, pulse shaping, fixed-height gradients and shared preview/export rendering. Preserve external video input, binary matte semantics and version 1.1.0.

- 左ペインとフィラーダイアログの説明を縮小・簡潔化。全SRT字幕を±0.1秒移動するボタンを追加（不正時は全件変更せず停止、Undo対応）。

- 静止画背景・スペアナ・字幕を1本にまとめる「簡易動画MP4を出力」を追加。読み込んだ音源を含めることも、無音で保存することもできます。
- 出力時間は素材の読み込み・変更時に字幕・スペアナ・デコード済み音源の最長へ自動更新し、手動でも修正できます。「音源を含めない」を選んでも音源長は計算対象です。素材の追加・読み替え・解除や字幕時刻の変更があれば再計算します。
- 簡易出力は既存の解像度・fps・画質・範囲設定を使用。背景動画が指定されている場合は簡易出力を無効にし、静止画への変更または解除を案内します。
- 従来の無音フロント／マット出力を維持。簡易出力の設定をJSONへ保存し、日英の利用ガイド・マニュアルを更新。
- Add optional still-background MP4 export with AAC audio or silence, duration updated when materials change, and atomic ±0.1s shifts for all SRT cues. Simplify notes and reduce their font sizes in both languages.

## 1.0.0 — 2026-09-27

- 上部の字幕追加を先頭への追加に変更。最初の字幕が0秒開始の場合は無効化。初期フィラー重みを空白3・歌詞8・タイムスタンプ2・図形1に調整。
- Prepend subtitles into the opening gap; disable at zero start. Set default filler weights to Whitespace 3, Lyrics 8, Timestamp 2, Symbols 1.

- JIZURA Layer Studio v1.0.0として正式公開向けのバージョン・配布物を整備。
- SRT字幕の個別追加・削除とUndoに対応。空欄を無描画として保存し、全角スペースのまとまりを半角スペースで区切った演出を利用可能に。不正な時刻の修正後にエラー表示を解除し、未反映の古いデータによる出力を防止。
- フィラー本文に空白文字を追加。全角スペース2〜5個を3〜4区分に分け、初期重みは空白3・歌詞8・タイムスタンプ2・図形1。日英の説明・マニュアルを更新。
- 日英の詳細ユーザーマニュアル `user_guide.md` / `user_guide.en.md` を追加。元JIZURAから残したスタイル・書体・歌詞記法・拍とタップ・手法・ロック・行／カット編集と、レイヤー専用機能を説明。
- READMEの機能案内を拡充。アプリ内ガイドと短いワークフローから詳細版へ案内し、公開用フォルダ・ZIPにマニュアルを同梱。
- Prepare the 1.0.0 release with bilingual manuals, individual cue add/delete/undo, silent empty cues, segmented whitespace fillers (weights 3/8/2/1), and corrected validation/export feedback.

## 0.9.0-layer.21 — 2026-09-27

- フィラーの初期余白をプリ0.3秒・ポスト0.5秒に変更。全種類オン、重みは図形1・歌詞10・タイムスタンプ2。保存済みの設定は維持。
- 時刻タグを半角スペース区切りの `MM SS mmm` へ変更。タイムラインの未選択フィラー番号を赤、選択時は従来の黄色で表示。
- Shorter default margins, lyric-heavy mixed fillers, space-separated timestamps and red inactive filler labels on the timeline.

## 0.9.0-layer.20 — 2026-09-27

- SRT読み込み後のフィラー生成ダイアログを追加。プリ／ポストギャップを引いた空白に閾値を適用し、初期値は5秒・余白1秒／2秒・図形文字のみ。
- 通常字幕の長めの表示時間・平均文字数を参照。図形文字・歌詞・追従する `[timestamp]` を有効／無効と1〜10の重みで抽選。
- フィラーの手編集・再生成・一括削除・取り消し・JSON保存に対応。通常字幕の演出は独立して生成し、挿入による変更を防止。
- Add bilingual filler generation with usable-gap thresholds, adaptive durations, weighted text types, editable placeholders, timestamp tags, undo and project persistence; preserve normal-cue rendering.

## 0.9.0-layer.19 — 2026-09-27

- SRTを編集可能な初期データとして扱い、タイムラインのクリック移動・ドラッグ、行の開始秒入力、タップ同期を有効化。
- 開始時刻の変更では表示時間を維持して終了も移動。並び替え時は行の演出設定も移動し、取り消しとJSON保存に反映。
- Imported cues are editable: enable timeline seeking, duration-preserving retiming and tap sync; keep effect overrides attached when cues reorder.

## 0.9.0-layer.18 — 2026-09-27

- スペアナ合成チェックを削除。フロント動画があればプレビュー・出力に自動合成し、フロントの「解除」で停止。
- Automatically composite a loaded spectrum front in preview and export; clear it to stop. Remove the compositing checkbox and update Japanese/English guidance.

## 0.9.0-layer.17 — 2026-09-27

- 日英の利用ガイド・READMEに、cityedgeのAudio Spectrum Overlay Makerをスペアナ動画の制作ツールとして案内。
- 字幕レイヤーの説明をプレビュー表示選択の直前へ移動。スペアナ合成チェックと説明を素材選択の前へ移動。
- Add the spectrum creation tool to Japanese/English guides and READMEs; place layer output guidance above preview selection and spectrum compositing guidance above media inputs.

## 0.9.0-layer.16 — 2026-09-27

- 字幕とスペアナの合成時に、画素ごとの配列ビュー生成を省いて高速化。
- 外周ブルーム判定の中間RGBA配列を省略。黒文字の030303予約、閾値、二値マットの描画結果を維持。
- Speed up subtitle/spectrum compositing and bloom coverage checks without changing rendered pixels or frame timing.

## 0.9.0-layer.15 — 2026-09-26

- 画面・HTML・言語メニュー・配布物を日本語／英語の2言語に整理。字幕本文の言語対応は維持。
- 不要な翻訳・README・ビルド分岐を削除。
- 手動更新で消えない旧ファイルの一覧を配布フォルダに同梱。GitHubの削除手順を日英で追加。

## 0.9.0-layer.14 — 2026-09-26

- 標準30fps、コマ打ち15／10枚・秒。既存の24fps・12／8枚・秒設定は維持。
- スペアナのMP4出力をPTSに基づくデコードへ変更。Mediabunny 1.60.0（MPL-2.0）を同梱。
- After Effects向け書き出し・変換・CEP／ScriptUI・ビルド・専用テストを削除。字幕の演出は維持。
- 公開URL、利用ガイド、第三者ライセンスを更新。配布フォルダとRelease ZIPの同時生成。

# JIZURA Layer Studio: 0.9.0-layer.13

- Prepare the independent cityedge fork for manual publication; no remote publishing or upstream synchronization.
- Rename the app and page metadata; add Japanese/English user guides and original/derivative attribution.
- Embed full app and mp4-muxer license notices in every HTML edition, including standalone downloads.
- Rewrite current workflow and publication documentation; mark inherited language editions as partial translations of the fork.
- Add an allowlisted manual-upload bundle with source, build tools, documentation and checksums; exclude Git history, input media and legacy AE/CEP distributions.
- Keep the existing automatic MP4 pair downloads and individual save links unchanged.

# Layer fork: 0.9.0-layer.12

- Allow spectrum front videos without a matte: exact RGB zero becomes transparent in preview and paired export.
- Enable front-only merging and use front duration; adding/removing a matte switches compositing modes without reloading the front.
- Keep optional matte validation and matching-file pairing, with Japanese/English guidance.

# Layer fork: 0.9.0-layer.11

- Move bloom cleanup below the cut list at the bottom of the left sidebar, with a divider.
- Add 480p, 540p, 1360×766 (16:9), and 900p export presets in both editing modes; retain 720p, 1080p, 1440p and 4K.
- Label the intermediate preset with its actual even output dimensions for the selected aspect ratio.

# Layer fork: 0.9.0-layer.10

- Restrict the SRT file picker filter to .srt.
- Move the existing audio/timing section directly below preview background, preserving its controls.
- Separate SRT, preview background, audio/timing, spectrum and output groups with dividers.

# Layer fork: 0.9.0-layer.9

- Add live exterior bloom cleanup slider and numeric input (0–128, default 32) with reset, Japanese/English guidance, and project persistence.
- Keep render/export thresholds per project; clamp invalid values and protect original artwork at every setting.

# Layer fork: 0.9.0-layer.8

- Remove only dim exterior pixels introduced by automatic bloom or bloomFlash, from the front before generating its binary matte (max RGB on black < 32).
- Protect pre-bloom artwork, including dark text, particles and sparks; retain visible exterior light.
- Keep exact inverse nonblack front/matte coverage for both min/max and inverse-alpha compositors.

# Layer fork: 0.9.0-layer.7

- Confine automatic bloom to existing artwork coverage in layer output. Additive glow outside ticket/text shapes was becoming an opaque dark border under the binary matte.
- Keep bloom inside shapes and preserve black lettering, graphics, and intentional outlines.

# Layer fork: 0.9.0-layer.6

- Derive binary matte coverage strictly from final nonblack front RGB.
- Reserve black artwork before alpha flattening; invisible blur and fade tails no longer become opaque #030303 halos.
- Use the same coverage for preview and spectrum composition; ignore black front pixels inside oversized imported mattes.

# Layer fork: 0.9.0-layer.5

- Reserve exact RGB black for empty front pixels: opaque #000000 becomes #030303 after compositing; mattes and other colours remain unchanged.
- Front preview uses the same pair conversion as MP4 output.

# Layer fork: 0.9.0-layer.4

- Restored original palettes, decorations, background graphics, HUD, effects, transitions and morphs; base fill remains excluded.
- Binary mattes preserve black artwork and all nonzero coverage. Soft artwork retains its RGB brightness on black.
- Restored effect controls and migrate old forced-off settings once.
- Reindexed overlapping subtitle tracks for joins; explicit SRT boundaries remain authoritative.
- Layer transitions replace transparent regions without stale glyphs. Full-frame effects and glow are retained.

# Layer fork: 0.9.0-layer.3

- Removed folder selection; multi-file selection still detects matching _matte_dark videos.
- Renamed composite preview to clarify background + subtitles.
- Export downloads two MP4 files directly, with individual save links instead of ZIP packaging.
- Spectrum defaults to 65% frame width and 3% left/bottom margins.

# Layer fork: 0.9.0-layer.2

- Spectrum defaults to 45% frame width, original aspect ratio and 5% left/bottom margins.
- Persisted position and independent horizontal/vertical scale, shared by preview and MP4.
- Folder or multi-file input detects same-directory _matte_dark pairs. Export filenames follow the same convention.

# Layer fork: 0.9.0-layer.1

- SRT import preserves start/end times, gaps, multiline text and literal punctuation.
- Preview-only still/video media stays outside saved projects and exports.
- Binary matte (white empty / black opaque) and colored front MP4 are encoded from the same frames, with no audio, and saved together in a ZIP.
- Optional spectrum matte/front pair is composited behind subtitles. Decoded matte values are thresholded at 128.
- Standalone video/PNG output controls and background-only effects are removed from this fork UI.

# 変更の記録（CHANGELOG）

JIZURA のバージョンは `メジャー.マイナー.パッチ` の形で付けます。

- **マイナー**（0.6 → 0.7）：機能の追加や、見た目・操作が変わる変更
- **パッチ**（0.7.0 → 0.7.1）：不具合の修正だけの更新
- **メジャー**（0.x → 1.0）：プロジェクトファイルや AE 用 JSON の形式が変わるなど、互換性に関わる変更

いまのバージョンはリポジトリ直下の `VERSION` に書いてあり、ブラウザ版の左上（JIZURA のロゴの横）、AE パネル（スクリプト版の見出しと、診断レポート）に表示されます。保存したプロジェクトファイルと AE 用 JSON にも `appVersion` として記録されます。

## v0.9.0 — 2026-09-26

### 追加

- **After Effects パネル**：v0.8.0 で追加した文字PV系・キネティック・ホラーの153部品を、AE でも組み立てられるようにしました（全860部品）。スクリプト版パネルに「文字PV系の部品を使う」「キネティックの部品を使う」「ホラーの演出も使う」のチェックと、雰囲気「ホラー」を追加しました。
- **カットごとの差し替え**（詳細モード・#23）：カット情報から、そのカットだけレイアウト・登場・保持・退場・装飾・加工・背景・カメラ・つなぎを替えられます。「このカットをシャッフル／おまかせ」も追加。
- **ロック**（詳細モード・#24）：手法の分類ごとの ON/OFF と、演出のスライダー・フラッシュ・コマ打ちの値を、おまかせのあとも残せます。
- **行ループ・カットループ**（#22）：ループボタンで 全体 → 行 → カット → なし を切り替えます。
- **Tiếng Việt（ベトナム語）版**の画面（#20）。
- 「今の案」の見出し書体に、実際に描いている書体の名前を表示します（#21）。

### 修正

- カットごとに差し替えても、ほかのカットの抽選結果が変わらないようにしました（差し替え前と同じ順で抽選し、差し替えは別の乱数で行います）。
- カット情報の行が、差し替えの一覧を開いたときに隠れないようにしました。

## v0.8.0 — 2026-09-25

### 追加

- **部品を153追加**（全部で707 → 860）。「ランダムで使う演出の範囲」に、セットごとのチェックを追加しました。追加分のチェックとは別に使えます。
  - **文字PV系**（50・初期状態オン）：最初の公開版の部品から派生した、線・数字・字組みだけで見せる部品。
  - **キネティック**（51・初期状態オン）：語ごとに動く、動き重視の部品。曲の拍があるときは語の切り替わりを拍に合わせます。
  - **ホラー**（52＋配色セット3・初期状態オフ）：不気味な雰囲気の部品。オンにすると、おまかせの雰囲気に「ホラー」が加わります。
- 手法タブとスタイル一覧に「文」「キ」「ホ」の印を付けました。

### 改善

- 起動を少し速くしました（書き出し形式の確認を最初の描画のあとに回し、結果を使い回すようにしました）。

### After Effects パネル

- 新しい3つのセットは、今はブラウザ版だけです。「AE用に書き出し」の JSON では、それぞれ一番近い既存の部品に置き換えて組み立てます。

## v0.7.0 — 2026-09-25

### 追加

- **スマホモード**：スマホでは「スマホ / かんたん / 詳細」の3つから画面を選べます（幅の狭い画面・タッチ操作の端末で表示。初めて開いたときはスマホモード）。
  - おまかせボタンをヘッダーに固定し、スクロールしても押せます。
  - プレビューを上に固定します。
  - 行一覧は歌詞だけを並べ、タップした行だけ詳しい操作を開きます。見出しをタップすると、まとまりごとにたたんだり開いたりできます。
  - 保存・開く・初期化などは「メニュー」にまとめました。ボタンを指で押しやすい大きさにしました。
- **共有して保存**：書き出したあと、対応しているブラウザでは共有シートから写真アプリなどに保存できます。
- **バージョン表示**：画面・AE パネル・保存ファイルにバージョンを表示・記録します。

### 書き出しの安定化

- スマホモードでは、最初の解像度を 720p にし、1080p を超える解像度は 1080p で書き出します。
- 書き出し中は画面が消えないようにしました（対応ブラウザのみ）。
- 書き出し中に別のアプリやタブに切り替えても、エンコーダーが止まったと誤って判断しないようにしました。

### ドキュメント

- README を見出し・小見出しごとにたためるようにしました。
- CHANGELOG（このファイル）を追加しました。

## v0.6.0 — 2026-09-25

バージョン管理を始めた時点の状態です。それまでに入っていた主な機能は次のとおりです。

- 歌詞からカットを自動で組み立てる本体（707 部品・24 スタイル）、おまかせ・前の案 / 次の案・ここだけ変える
- 日本語・English・繁體中文・简体中文・한국어・Bahasa Indonesia の画面
- 歌詞の言語の自動判定と、言語ごとの書体の置き換え、言語に合わせたランダム文字
- 曲の拍の検出、タップ同期、タイムラインでの時刻調整、元に戻す
- MP4（曲入り）・連番PNG・透過PNG・透過PNGレイヤー・グリーンバック / ブラックバックの書き出し、選んだ行だけの書き出し
- 書き出しの安定化（少しずつ書き出す・ソフトウェアのエンコーダーへの切り替え・ファイルに直接保存）
- 統一感・文字整列・中央を空ける（キャラクター用。縦長では上下 / 左右を選べる）
- 画面の固定表示、歌詞を消す、初期化、はじめての案内
- 行ごとの再抽選と鍵（鍵をかけた行は、ほかの再抽選でもそのまま残る）
- After Effects パネル（スクリプト版・CEP 版、日本語 / English）。長い曲の分割生成、軽量モード、範囲指定

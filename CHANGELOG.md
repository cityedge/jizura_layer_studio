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

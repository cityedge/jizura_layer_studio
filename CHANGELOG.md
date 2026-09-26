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

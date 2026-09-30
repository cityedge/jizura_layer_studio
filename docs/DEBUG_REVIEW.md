# 塗り面積のレビュー / Fill coverage review

開発用の隠しキーです。通常のガチャ（0〜6／Q）は変更していません。

| キー | 現在の字幕に適用する候補 |
| --- | --- |
| O | 塗り面積が大きかったレイアウト33種 |
| P | 塗り面積が大きかった背景35種（旧「新つなぎレビュー」を置換） |

現在の字幕の各カットへ同じ種類を設定します。Oは背景を、Pはレイアウトを保持するので、両方を順に押して組み合わせられます。元のレイアウトが背景を隠す場合は、Pで選んだ背景も見えにくくなります。レイアウトの加工・カメラ制約には従います。

ほかの字幕・本文・時刻・カット構成は維持します。字幕の開始へ移動し、再生中は0.3秒前から再生を続けます。ロック中・字幕のない位置・編集中の入力欄・ダイアログ・出力中では実行しません。Ctrl+Zで戻せ、結果はプロジェクトJSONに保存できます。

候補は修正前の調査（`output/background-review/audit.json`、作業フォルダ内）の固定リストです。16:9、noir／paper、0.3・0.8・1.3・1.8・2.15秒の試験画像で、最大被覆率が50％以上だったものを採用しました。試験文字も含む値であり、背景単体の面積や、あらゆる字幕・配色での被覆率を保証する判定ではありません。修正済み演出や、変更対象外だった前景の板・図形も含めます。候補の実体は `src/11w_cue_workflow.js` の `J.coverageReviewPools` です。

現在の画面を測定して候補を選ぶ機能ではありません。現在は背景がよく見えるようになった演出も出ます。「追加」「和風」「ホラー」などの通常の採用チェックを無視し、文字数の適合条件を満たす候補から抽選します。直前と同じ候補は、ほかに候補があれば避けます。

## English

Hidden development keys: **O** selects one of 33 historically high-coverage layouts; **P** selects one of 35 backgrounds, replacing the transition-review shortcut. The chosen type is applied to all cuts of the current cue. O keeps its backgrounds; P keeps its layouts, which may obscure the background. Layout-specific treatment and camera restrictions still apply.

Other cues, text, timing and cut structure are preserved. Seek to the cue start when paused, or 0.3 seconds before it while playing. Locked cues, empty timeline positions, text entry, dialogs and exports are protected. Undo and project JSON persistence are supported. Normal 0–6/Q draws are unchanged.

These fixed pools come from the pre-revision audit: maximum coverage >=50% across noir/paper samples at 0.3, 0.8, 1.3, 1.8 and 2.15 seconds in 16:9. Sample text contributes to the measurement. Revised effects and large foreground props remain included. This is not live pixel analysis or a coverage guarantee for arbitrary palettes/text. Normal inclusion switches are bypassed; text compatibility is retained and immediate repeats are avoided where alternatives exist.

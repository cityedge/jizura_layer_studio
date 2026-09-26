# 手動アップロードによる公開

この派生版は、GitHubのFork機能・git push・原版との同期を使わず、独立したリポジトリとして公開できます。原版の著作権表示とMITライセンス、第三者ライセンスは配布物に残してください。

## 公開用フォルダを作る

Python 3.10以降の環境で、リポジトリ直下から実行します。外部Pythonパッケージは不要です。

```text
python tools/package_release.py
```

`python`は使用する環境のPython実行ファイルに置き換えられます。既定では`dist/JIZURA-Layer-Studio-バージョン-日時/`を作ります。出力先の親フォルダは`--output`で指定できます。毎回新しいフォルダを作るため、前の公開物を上書きしません。

- `upload/`：アップロードするアプリ・ソース・説明・ライセンス一式。
- `UPLOAD_README.txt`：アップロードする場所の説明。
- `SHA256SUMS.txt`：`upload/`内のファイルのハッシュ一覧。

パッケージ作成時にHTMLを再ビルドします。許可リストにあるファイルだけをコピーし、`.git`、仮想環境、入力素材、テスト生成物、旧版のAE/CEP配布物は含めません。ソースとビルドスクリプトも含むので、公開物からHTMLを再生成できます。パッケージ作成はGit操作や公開操作を行いません。

## GitHubへ手動アップロード

1. 自分のGitHubアカウントで新しいリポジトリを作ります。名前の例は`JIZURA-layer-studio`。Forkボタンは使いません。READMEやライセンスの自動生成も不要です。
2. `upload/`の**中身**を、リポジトリのアップロード画面へドラッグします。`index.html`、`LICENSE`、`README.md`がリポジトリのルートに並ぶ形にしてください。`upload/`という親フォルダごとは置きません。
3. ファイル数が多い場合は、ルートのファイル、`app/`、`src/`、各言語フォルダなどに分けてアップロードします。ブラウザからのアップロードは1ファイル25 MiB、1回100ファイルまでという制限があります。
4. GitHub上の「Commit changes」で確定します。これはWeb画面での保存操作です。手元からgit pushする必要はありません。
5. `README.md`、`LICENSE`、英語版`en/index.html`などが正しい場所にあることを確認します。

ソース: [GitHub公式・ファイルの追加](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)

## アプリをブラウザで使えるURLにする

GitHub Pagesを使う場合、リポジトリのSettings → Pagesで、公開元を「Deploy from a branch」、アップロード先のブランチ（通常main）、フォルダを`/ (root)`に設定します。公開が完了したらGitHubが示すURLを開いてください。GitHub Pagesの利用可否はアカウントのプランとリポジトリの公開範囲に依存します。

全ファイルをアップロードしてからPagesを有効にしてください。日本語→英語への切り替え、利用ガイド、利用について、短いMP4ペアの出力を公開URLで確認します。複数ダウンロードの確認が出たら許可します。個別保存リンクも使えます。

ソース: [GitHub公式・Pagesの公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 次回の更新

1. ソースを修正して`VERSION`と`CHANGELOG.md`を更新します。
2. ビルド・テスト後、新しい公開用フォルダを生成します。
3. 同じリポジトリへ新しいファイルを手動アップロードします。削除・改名した古いファイルはWeb画面でも削除してください。アップロードだけでは古いファイルは消えません。
4. Pagesの更新後、画面に表示されるバージョンと動作を確認します。

手元のコミットは復元用の記録として利用できます。原版の更新を取り込むかどうかは、この派生版で個別に判断します。

## 公開先URL

標準の公開URLは https://cityedge.github.io/jizura_layer_studio/ です。canonicalとOG URLにも設定します。別のサイトで公開する場合は環境変数`JIZURA_SITE_URL`にそのURLを指定し、空文字ならメタ情報を省略できます。言語切り替えは相対リンクで動きます。

アプリ名は`app/publication.py`と`app/body.html`、利用ガイドは`app/guide.ja.html`・`app/guide.en.html`が編集元です。利用についてのライセンス全文は`LICENSE`・`THIRD_PARTY_NOTICES.md`からビルド時に埋め込みます。生成されたHTMLだけを直接修正しないでください。

## Release用ZIP

パッケージ作成時に`upload/`の中身をまとめたZIPも生成します。ZIP内のルートに`index.html`があります。GitHub Releasesの添付ファイルに使えます。Pages更新用にはZIPを展開した中身をアップロードしてください。Mediabunnyのソース配布物とライセンスも含めたまま配布してください。

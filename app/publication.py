"""Release identity and self-contained notices, applied after upstream localization."""
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAME = 'JIZURA Layer Studio'


def read(name):
    return (ROOT / name).read_text(encoding='utf-8')


def body(source, lang, version):
    ja = lang == 'ja'
    guide_label = '利用ガイド' if ja else 'User guide'
    heading = '利用について' if ja else 'About / rights'
    intro = ('本アプリは、hakoniwa氏の「JIZURA」を基に、cityedgeが字幕レイヤー制作向けに改変した非公式派生版です。原版の作者が本派生版の開発・保守を担当するものではありません。' if ja else
             'This is an unofficial derivative of JIZURA by hakoniwa, adapted by cityedge for subtitle layer production. The original author does not maintain this edition.')
    rights = ('出力動画を利用するために、本アプリのMITライセンス表示を動画へ付ける必要はありません。歌詞・音楽・画像・動画・フォントなど、使用する素材の権利と利用条件は個別に確認してください。' if ja else
              'You do not need to place this app’s MIT license notice in exported videos. Check the rights and terms of the lyrics, music, images, videos, fonts and other material you use.')
    privacy = ('選択した素材はブラウザ内で処理し、アプリからサーバーへ送信しません。設定と字幕はブラウザの保存領域に自動保存します。フォント取得時にはGoogle Fontsへ接続します。素材ファイルはプロジェクトJSONに含みません。' if ja else
               'Selected media is processed in your browser and is not uploaded by the app. Settings and subtitles are autosaved in browser storage. Font loading connects to Google Fonts. Media files are not embedded in project JSON.')
    terms = f'''<dialog id="termsDlg" class="terms publication-dialog" aria-labelledby="termsTitle">
  <form method="dialog">
    <h2 id="termsTitle" tabindex="-1">{heading}</h2>
    <div class="terms-main"><p class="terms-big">{NAME}</p><p>cityedge fork · v{escape(version)}</p></div>
    <p>{intro}</p>
    <p><a href="https://github.com/852wa/JIZURA" target="_blank" rel="noopener">{'原版 JIZURA — hakoniwa' if ja else 'Original JIZURA — hakoniwa'}</a></p>
    <p>{rights}</p>
    <p class="muted terms-note">{privacy}</p>
    <p>{'原版と本派生版はMITライセンスです。無保証で提供します。' if ja else 'The original and this derivative are MIT licensed and provided without warranty.'}</p>
    <details class="terms-oss"><summary>{'アプリのライセンス全文' if ja else 'Full application license'}</summary><pre class="license-text">{escape(read('LICENSE'))}</pre></details>
    <details class="terms-oss"><summary>{'使用しているオープンソース' if ja else 'Third-party software and fonts'}</summary><pre class="license-text">{escape(read('THIRD_PARTY_NOTICES.md'))}</pre></details>
    <details class="terms-oss"><summary>Mediabunny · MPL-2.0</summary><p><a href="https://registry.npmjs.org/mediabunny/-/mediabunny-1.60.0.tgz">{'使用版のソースコード（1.60.0）' if ja else 'Source code of the bundled version (1.60.0)'}</a></p><pre class="license-text">{escape(read('vendor/mediabunny.LICENSE.txt'))}</pre></details>
    <p><button type="button" class="guide-open">{guide_label}</button></p>
    <div class="terms-foot"><span class="muted">Original © 2026 hakoniwa<br>Modifications © 2026 cityedge · MIT</span><button value="close" class="primary" autofocus>{'閉じる' if ja else 'Close'}</button></div>
  </form>
</dialog>'''
    source, count = re.subn(r'<dialog id="termsDlg".*?</dialog>', lambda _: terms, source, count=1, flags=re.S)
    if count != 1:
        raise ValueError('About dialog not found')
    source = source.replace('<button id="btnTerms"', f'<button id="btnGuide" type="button" class="ghost guide-open">{guide_label}</button>\n      <button id="btnTerms"', 1)
    return source + '\n' + read('app/guide.ja.html' if ja else 'app/guide.en.html').replace('@VERSION@', escape(version))

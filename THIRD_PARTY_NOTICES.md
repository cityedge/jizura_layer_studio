# Third-party notices

## Mediabunny 1.60.0 (bundled, MPL-2.0)

Copyright (c) 2026-present, Vanilagy and contributors.
The unchanged browser bundle `vendor/mediabunny.min.js` is embedded in each HTML edition
to decode spectrum frames by presentation timestamp. This library is licensed under
the Mozilla Public License 2.0, separately from this application's MIT-licensed code.
Full license: `vendor/mediabunny.LICENSE.txt` (also embedded in the About dialog).
The complete upstream source distribution is included as `vendor/mediabunny-1.60.0.tgz`.
Source distribution: https://registry.npmjs.org/mediabunny/-/mediabunny-1.60.0.tgz
Upstream: https://github.com/Vanilagy/mediabunny
No changes have been made to Mediabunny. Preserve its license and source availability
notice when redistributing the standalone HTML or a packaged copy.

## mp4-muxer 5.2.2 (bundled)

`vendor/mp4-muxer.min.js` is embedded in `index.html` and is used to write MP4 files.
Source: https://github.com/Vanilagy/mp4-muxer — licensed under the MIT License:

```
MIT License

Copyright (c) 2023 Vanilagy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Fonts (not bundled)

The web app loads the following typefaces at runtime from Google Fonts (https://fonts.google.com/); they are not
included in this repository. They are distributed by their authors under the SIL Open Font License 1.1:
Noto Sans JP, Noto Serif JP, Dela Gothic One, Zen Kaku Gothic New, Zen Old Mincho, Kaisei Tokumin,
M PLUS Rounded 1c, Mochiy Pop One, DotGothic16, Yuji Syuku, IBM Plex Mono, IBM Plex Sans JP.

Additional families requested by the current effect/language font tables (also not bundled):
Reggae One, Rampart One, Potta One, Kiwi Maru, Klee One, Shippori Mincho B1;
Noto Sans TC, Noto Serif TC, Noto Sans SC, Noto Serif SC, Noto Sans KR, Noto Serif KR;
WDXL Lubrifont TC, Chiron GoRound TC, Huninn, LXGW WenKai TC, LXGW Marker Gothic;
ZCOOL QingKe HuangYou, ZCOOL KuaiLe, ZCOOL XiaoWei, Ma Shan Zheng;
IBM Plex Sans KR, Black Han Sans, Jua, Do Hyeon, Gowun Dodum, Gowun Batang, Nanum Brush Script.
The active list is defined in `src/02_fonts.js` and `src/02b_lang.js`.
Font-specific license files are available from the Google Fonts source repository:
https://github.com/google/fonts

System fonts and fonts selected by the user are not distributed with this app and retain their own licenses.

## Original application

JIZURA Layer Studio is based on JIZURA v0.9.0 by hakoniwa:
https://github.com/852wa/JIZURA
The original MIT copyright and license are preserved in `LICENSE`, with a separate notice for cityedge's modifications.
The original community translations are retained; fork-specific guides and controls are Japanese/English.

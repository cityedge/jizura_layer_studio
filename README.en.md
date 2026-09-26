# JIZURA Layer Studio
**Animated subtitle layers · cityedge fork · v0.9.0-layer.15**

[Open English app](en/index.html) · [日本語](README.md) · [User guide](docs/LAYER_WORKFLOW.en.md) · [Manual publication](docs/PUBLISHING.en.md)

Create a subtitle front on black and a binary matte as two synchronized, silent MP4 files for compositing over another video.

This is an **unofficial derivative of [JIZURA by hakoniwa](https://github.com/852wa/JIZURA)**, adapted by cityedge for subtitle layer production. The original author does not maintain this edition. Thanks to the original effect engine and community translations.

## Quick start

1. Download the repository files and open `en/index.html` in desktop Chrome / Edge. GitHub's source viewer does not execute the app; use the published Pages URL if available.
2. Import a UTF-8 SRT or type subtitles.
3. Auto-compose effects, then adjust individual lines.
4. Load a preview background and optional spectrum video.
5. Export the MP4 pair. Allow multiple downloads when prompted, or use the individual save links.

User guide and About / rights dialogs are available in the app. The interface supports Japanese (`index.html`) and English (`en/index.html`), selectable from the top language menu. This does not restrict subtitle text languages or fonts.

## Features

- Preserve SRT start/end times, line breaks, gaps and overlapping cues; edit text and times.
- Preview-only image/video backgrounds, excluded from exports.
- Original text colours, graphics, ornaments and transitions.
- Spectrum front import with optional matching matte; without it, only RGB 000000 is transparent.
- Spectrum defaults: 65% frame width, 3% left/bottom margins; adjustable position and independent scales.
- Exterior bloom cleanup: 0–128, default 32.
- Two direct silent MP4 downloads; matte filename adds `_matte_dark`.
- 480p, 540p, 720p, 1360×766, 900p, 1080p, 1440p and 4K presets; actual dimensions depend on aspect ratio.
- Project JSON save/restore.

Finished background/audio video, PNG export and After Effects output are outside this edition's scope.

## Composite, save and compatibility

New projects default to 30fps and 15 drawings/s. Spectrum export selects decoded frames by presentation timestamp; see the user guide for frame correspondence and legacy project settings.

Apply the matte with Darken, then the front with Lighten. Align both videos in time and size. For alpha-based compositing, white matte means transparent and black means opaque. The pre-encode matte is binary; lossy MP4 may introduce small colour/edge changes. No partial alpha is exported.

Selected media stays in the browser; fonts are loaded from Google Fonts. Settings/subtitles are autosaved locally; save project JSON explicitly too. Background, spectrum and song files are not embedded: reselect them when reopening.

MP4 needs WebCodecs and H.264 encoding support. Desktop Chrome / Edge is recommended; availability varies by browser/OS. Long/4K exports are not thoroughly verified; start with a short range.

## Build and manual publication

Use Python 3.10+ (standard library only); replace `python` with your environment's executable.

```text
python build.py
node dev/layer_test.js
python tools/package_release.py
```

The bundle is generated under `dist/`. Upload the contents of its `upload/` folder to an independent repository following the [publication guide](docs/PUBLISHING.en.md). No Fork, git push or upstream synchronization is required.

When updating from layer.13 / layer.14, also delete the obsolete GitHub files listed in the release folder's `DELETE_FROM_REPOSITORY.txt`. Uploading replacements does not delete old files.

Source lives in `src/`; UI, translations and notices in `app/`; the MP4 library in `vendor/`. Each generated HTML includes application code and license notices. See [workflow details](docs/LAYER_WORKFLOW.en.md) and [change history](CHANGELOG.md).

## Rights

The original and derivative are [MIT licensed](LICENSE). Preserve original copyright and license text when redistributing. See [third-party notices](THIRD_PARTY_NOTICES.md).

Exported videos do not require an application MIT credit. Check the rights and terms of your lyrics, music, images, videos, fonts and other material separately. The software is provided without warranty.

Bundled Mediabunny 1.60.0 is separately licensed under MPL-2.0. Its unmodified source distribution and license are included in `vendor/`.

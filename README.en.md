# JIZURA Layer Studio
**Animated subtitle layers · cityedge fork · v1.1.0**

[Open English app](en/index.html) · [日本語](README.md) · **[Detailed user manual](user_guide.en.md)** · [Quick workflow](docs/LAYER_WORKFLOW.en.md) · [Manual publication](docs/PUBLISHING.en.md)

Create a subtitle front on black and a binary matte as two synchronized, silent MP4 files for compositing over another video.

An optional [simple video export](user_guide.en.md#exporting-a-simple-video) combines a still background, spectrum, subtitles and optional audio into one MP4.

This is an **unofficial derivative of [JIZURA by hakoniwa](https://github.com/852wa/JIZURA)**, adapted by cityedge for subtitle layer production. The original author does not maintain this edition. Thanks to the original effect engine and community translations.

Use Add subtitle at start, Add after and Delete in the SRT editor to add/remove normal cues; Ctrl+Z undoes changes. Empty text keeps a silent slot. Ideographic spaces are valid text; ASCII spaces separate groups. Invalid times block export until corrected.

## Quick start

After importing SRT, use **Add fillers…** to generate editable placeholders in intros, interludes and outros. Defaults enable all types (Whitespace 3, Lyrics 8, Timestamp 2, Symbols 1, Custom text 0). Custom text accepts user-entered text and is initially empty and require at least 5 seconds after subtracting a 0.3-second pre-gap and 0.5-second post-gap. Configure types, weights, duration and margins in the dialog. Regeneration replaces edited fillers too, while preserving normal subtitles and their effects. See [Filler subtitles](docs/LAYER_WORKFLOW.en.md#filler-subtitles).

1. Download the repository files and open `en/index.html` in desktop Chrome / Edge. GitHub's source viewer does not execute the app; use the published Pages URL if available.
2. Import a UTF-8 SRT or type subtitles.
3. Auto-compose effects, then adjust individual lines.
4. Load a preview background and optionally generate a spectrum from audio or import spectrum footage.
5. Export the MP4 pair. Allow multiple downloads when prompted, or use the individual save links.

User guide and About / rights dialogs are available in the app. The interface supports Japanese (`index.html`) and English (`en/index.html`), selectable from the top language menu. This does not restrict subtitle text languages or fonts.

## Create spectrum videos

The built-in spectrum scans the whole song to choose a frequency range including 250–4,000 Hz. Auto range shows the result, fixed throughout playback. FFT sizes, level handling and pulse processing remain unchanged.

The app can also generate 64 bars from the loaded song. Choose **Generate from audio** under Spectrum source, then adjust sensitivity, pulse strength, return time and top/bottom colors. The gradient is fixed to the maximum height. Preview, pair export and simple export share the same motion. See [Built-in spectrum](user_guide.en.md#generating-from-audio).

[Audio Spectrum Overlay Maker](https://github.com/cityedge/audio-spectrum-overlay-maker) is a tool developed by cityedge for creating spectrum videos to import into this app. Use it to prepare your spectrum footage.

## Features

The retained JIZURA effects engine works alongside this edition's layer tools. The [user manual](user_guide.en.md) explains controls, workflows and limits.

| Task | Features and instructions |
|---|---|
| Prepare text | [Editable SRT cues](user_guide.en.md#importing-and-editing-srt), [direct input, LRC and markup](user_guide.en.md#typing-subtitles-directly) |
| Follow music | [Beat analysis, BPM and tap sync](user_guide.en.md#audio-and-timing), [timeline zoom, seek and line/cut looping](user_guide.en.md#playback-and-timeline) |
| Explore proposals | [Auto-compose, Shuffle, partial rerolls and look history](user_guide.en.md#auto-compose-and-shuffle) |
| Refine typography | [Styles, three font roles and local/uploaded fonts](user_guide.en.md#styles-and-fonts), [colors](user_guide.en.md#colors) |
| Control motion | [Motion, glitch, chromatic offset, ornaments, density, texture, HUD, cadence, unity and typesetting](user_guide.en.md#effects) |
| Choose techniques | [Ten candidate groups, sets and locks](user_guide.en.md#choosing-techniques), [individual line/cut replacement](user_guide.en.md#editing-individual-lines-and-cuts) |
| Work over footage | [Preview background and display modes](user_guide.en.md#preview-background-and-display-modes), [center-clear layout](user_guide.en.md#leaving-the-center-clear) |
| Fill instrumental gaps | [Editable fillers, durations, weights and timestamp tags](user_guide.en.md#filler-subtitles) |
| Add a spectrum | [Optional matte, pair selection, position, scale and frame synchronization](user_guide.en.md#compositing-a-spectrum-video) |
| Deliver and resume | [MP4 pairs/ranges](user_guide.en.md#exporting-mp4), [external compositing](user_guide.en.md#compositing-in-a-video-editor), [JSON projects](user_guide.en.md#saving-and-resuming) |

Layer-production specifications:

- Import SRT as an editable starting point. Click the timeline to seek; drag start handles, type start times or tap to retime cues while preserving their duration. Edit text and end times in the cue editor.
- Image/video preview backgrounds, excluded from pair exports.
- Original text colours, graphics, ornaments and transitions.
- Choose None, Generate from audio or External video as the spectrum source. External footage accepts an optional matching matte; without it, only RGB 000000 is transparent.
- Spectrum defaults: 65% frame width, 3% left/bottom margins; adjustable position and independent scales.
- Always remove exterior bloom added by post-processing; preserve text, graphics, sparks and interior brightness changes.
- Two direct silent MP4 downloads; matte filename adds `_matte_dark`.
- 480p, 540p, 720p, 1360×766, 900p, 1080p, 1440p and 4K presets; actual dimensions depend on aspect ratio.
- Project JSON save/restore.

Duration automatically follows the longest subtitle, spectrum or decoded audio when materials are loaded or changed, and remains manually editable. Audio counts even with Exclude audio checked. Loading, replacing or clearing media and changing subtitle times recalculate it. Video backgrounds disable simple export. PNG and After Effects output are not provided.

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
node dev/filler_test.js
node dev/simple_export_test.js
python tools/package_release.py
```

The bundle is generated under `dist/`. Upload the contents of its `upload/` folder to an independent repository following the [publication guide](docs/PUBLISHING.en.md). No Fork, git push or upstream synchronization is required.

When updating from layer.13 / layer.14, also delete the obsolete GitHub files listed in the release folder's `DELETE_FROM_REPOSITORY.txt`. Uploading replacements does not delete old files.

Source lives in `src/`; UI, translations and notices in `app/`; the MP4 library in `vendor/`. Each generated HTML includes application code and license notices. See [workflow details](docs/LAYER_WORKFLOW.en.md) and [change history](CHANGELOG.md).

## Rights

The original and derivative are [MIT licensed](LICENSE). Preserve original copyright and license text when redistributing. See [third-party notices](THIRD_PARTY_NOTICES.md).

Exported videos do not require an application MIT credit. Check the rights and terms of your lyrics, music, images, videos, fonts and other material separately. The software is provided without warranty.

Bundled Mediabunny 1.60.0 is separately licensed under MPL-2.0. Its unmodified source distribution and license are included in `vendor/`.

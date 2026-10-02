# JIZURA Layer Studio v1.4.0 User Manual

JIZURA Layer Studio animates lyrics and subtitles with typography, motion, graphics and ornaments. Create a **silent front/matte MP4 pair** for external compositing, or a **simple MP4 video** with an image/video background and optional audio already combined. Built on JIZURA's effects engine, it provides SRT editing, fillers, cue-level draws, themes, generated/external spectra and binary or translucent layer output.

[Open app](https://cityedge.github.io/jizura_layer_studio/en/) · [README](README.en.md) · [日本語マニュアル](user_guide.md) · [Publishing instructions](docs/PUBLISHING.en.md)

This manual describes the retained features of v1.4.0. Features removed from the original JIZURA are not presented as available operations.

## Contents

- [Capabilities](#capabilities)
- [Requirements and startup](#requirements-and-startup)
- [Your first video](#your-first-video)
- [Workspace and modes](#workspace-and-modes)
- [Lines and cuts](#lines-and-cuts)
- [Importing and editing SRT](#importing-and-editing-srt)
- [Typing subtitles directly](#typing-subtitles-directly)
- [Audio and timing](#audio-and-timing)
- [Playback and timeline](#playback-and-timeline)
- [Preview background and display modes](#preview-background-and-display-modes)
- [Opacity and background color opacity](#opacity-and-background-color-opacity)
- [Auto-compose and Shuffle](#auto-compose-and-shuffle)
- [Styles and fonts](#styles-and-fonts)
- [Colors](#colors)
- [Effects](#effects)
- [Choosing techniques](#choosing-techniques)
- [Editing individual lines and cuts](#editing-individual-lines-and-cuts)
- [Leaving the center clear](#leaving-the-center-clear)
- [Filler subtitles](#filler-subtitles)
- [Compositing a spectrum video](#compositing-a-spectrum-video)
- [Exterior bloom cleanup](#exterior-bloom-cleanup)
- [Exporting MP4](#exporting-mp4)
- [Exporting a simple video](#exporting-a-simple-video)
- [Compositing in a video editor](#compositing-in-a-video-editor)
- [Saving and resuming](#saving-and-resuming)
- [Keyboard controls](#keyboard-controls)
- [Suggested workflows](#suggested-workflows)
- [Troubleshooting](#troubleshooting)
- [Limits and data handling](#limits-and-data-handling)
- [Distribution files and licenses](#distribution-files-and-licenses)
- [Version history](#version-history)

## Capabilities

| Task | Features |
|---|---|
| Prepare subtitles | UTF-8 SRT import, editable text/start/end, direct text entry, LRC start times |
| Animate | Theme-guided Auto-compose, Shuffle, cue draws 0–6/9, styles, layouts, motion, ornaments and transitions |
| Constrain choices | Technique checkboxes, expression sets, line locks, parameter and technique-group locks |
| Follow music | Beat/energy analysis, BPM override, tap synchronization, timeline editing |
| Fill gaps | Editable placeholders in SRT intros, interludes and outros |
| Preview | Image/video background, front view, binary/grayscale matte view |
| Combine footage | Generate 64 spectrum bars from audio or load external spectrum footage; position and scale it |
| Export | Synchronized front + binary/grayscale matte, front only, or simple video with background/audio; range export |
| Preserve work | Browser autosave and downloadable project JSON |

The primary front/matte pair excludes background and audio for external editing. Optional simple video export combines an image/video background, overlays and audio into one MP4. After Effects projects and PNG sequences are not supported.

## Requirements and startup

### Hosted version

Open the [English app](https://cityedge.github.io/jizura_layer_studio/en/) in desktop Chrome or Edge. No installation is required. MP4 export needs WebCodecs and a supported video encoder; availability depends on browser and OS.

### ZIP version

1. Extract the Release ZIP.
2. Open `en/index.html` in Chrome or Edge. `index.html` at the root opens Japanese.
3. Keep the directory structure intact for language navigation and documentation.

End users do not need Python, Node.js or ffmpeg to run this browser app. The app can run locally, but built-in fonts may be fetched from Google Fonts. Without a connection, check fallback appearance or use a PC-installed font.

### Two language settings

The header language menu switches the **interface** between Japanese and English. It does not translate your subtitles. Save before switching pages.

The lyric-language selector controls text segmentation and font choices: automatic, Japanese, Traditional Chinese, Simplified Chinese, Korean or English. It is independent of the interface language.

## Your first video

1. **Prepare subtitles.** Import SRT or type lyrics for a new project. To resume saved work, open JSON and reload audio, background and external spectrum media; do not reimport SRT.
2. **Load audio and background media.** Check timing and readability over your image or video.
3. **Choose opacity mode.** Use Alpha (grayscale matte) to retain translucency, or Binary (legacy) for a black/white mask workflow. In Alpha mode, adjust Background color opacity as needed (default 40%).
4. **Auto-compose.** Optionally select a theme first. Compare proposals with the previous/next controls.
5. **Refine individual cues.** Edit part breaks, use numbered subtitle draws, and use 9 to return a cue to the global taste. Lock lines you want to keep.
6. **Add fillers** to SRT gaps if needed, then edit their placeholder text.
7. **Add a spectrum** using Generate from audio or External video.
8. **Test a short range** at 540p or 720p and 30fps. Export a front/matte pair for external editing, or a simple video for a finished background/audio composite.
9. **Save project JSON.** Store source media separately.
10. **Export the whole video.** Reset the range to Whole and verify resolution and duration.

Binary pairs use Darken then Lighten. Alpha pairs use Multiply then Add; Difference with two white layers can substitute for Add. Follow the mode-specific [compositing instructions](#compositing-in-a-video-editor). Simple video is already composited and needs no such step.

## Workspace and modes

| Region | Controls |
|---|---|
| Header | Project name, modes, interface language, Open/Save JSON, Reset, User guide, About |
| Upper left | SRT, fillers, cue editor, preview background, audio/timing, spectrum, opacity/decorative-number settings, display mode, pair/front/simple MP4 export |
| Lower left | Subtitle text, lyric language, line/cut list |
| Center | Preview, playback, volume, loop, look history, Auto-compose, timeline, current cut information |
| Right | Easy controls or detailed Style, Effects, Techniques and Export tabs |

**Easy** emphasizes Auto-compose and the current proposal, with buttons to reroll only style, palette, mood or composition. **Detailed** exposes fonts, colors, effect parameters, technique candidates and individual cut replacement. Switching modes preserves the project.

On a narrow screen, scroll through the workspace. Mobile mode folds some controls and changes the layout; its first activation may reduce a resolution above 720p to 720p. Check output settings before final export. Desktop is recommended for large renders.

## Lines and cuts

A **line** is a subtitle unit. With SRT, one cue block corresponds to one line even if its text contains line breaks.

Automatic segmentation and layout wrapping keep English words together where possible, including spaces in `Had a` and `and I`. Hyphens offer split points, and Latin-text landscape panels run left to right.

A **cut** is a timed combination of text and effects inside a line. A line may be divided into several words or phrases shown sequentially with different layouts and motion. Ten subtitle cues can therefore contain many more than ten cuts.

Increasing cut count or cut density adds switches within the same available time. Reduce them when the words do not have enough reading time.

## Importing and editing SRT

### Input format

Choose a `.srt` file with Import SRT. Use UTF-8; a UTF-8 BOM is supported.

```srt
1
00:00:07,000 --> 00:00:10,000
A song across the night

2
00:00:15,800 --> 00:00:20,000
The next lyric begins
A second line
```

Start/end times, line breaks and empty intervals are preserved. SRT files require a body line and an end after the start; whitespace counts as text. The maximum is 20,000 cues, and editing can remove every cue. Overlapping cues are drawn together. Basic SRT formatting tags are stripped, rather than reproducing their embedded font/color formatting.

SRT is editable starting data. **The original file is never rewritten.** Save edited data in project JSON. There is no edited-SRT export command.

### Cue editor

Open Edit SRT text, start and end. A line's edit button or a double-click on its text also opens the corresponding entry.

| Edit | Result |
|---|---|
| Text | Changes the cue text; line breaks are allowed |
| Start time | Moves both start and end, preserving duration |
| End time only | Changes duration without moving start |
| Move across another cue | Reorders by time; line overrides follow their cue |
| Add subtitle at start | Adds an empty normal cue from zero; disabled when the first cue starts at zero |
| Add after | Adds an empty normal cue starting at that cue's end |
| Delete | Removes that slot without moving other cue times |

Prepending starts at zero and fits before the first cue. The button is disabled if that cue already starts at zero. New cues last up to three seconds, shortened to the next later start when present. Adjust times if they overlap existing cues. You can delete the last cue and add again from an empty list. Ctrl+Z undoes additions/deletions. Manually added cues are normal cues and survive filler regeneration.

Completely empty text retains the slot and timing but renders no text or decorations for that cue. Whitespace-only text instead generates effects around invisible text. Use ideographic spaces for width and ASCII spaces to separate groups, for example `　　 　　　 　 　　`. Plates and decorations can appear; glyph-dependent effects may show nothing. JSON preserves the exact spaces.

Invalid times show an error beside the cue and below export, blocking export of stale data. Correcting the input clears that error.

For example, moving a 10–14s cue to 12s makes it 12–16s. Editing just its end to 13s then gives it a one-second duration.

After SRT import the main text area allows only part-break editing; use the cue editor for text and time changes. Importing another SRT replaces the current cues, manual part boundaries and per-line overrides. Save a JSON first if you want to retain the current version.

The -0.1s and +0.1s buttons beside Add subtitle at start move all starts and ends, including fillers. Starts clamp at zero; moving only the end earlier shortens that cue. Missing/invalid times or a resulting zero/negative duration abort the whole operation without changes. Ctrl+Z undoes it. The source SRT and audio beat grid are unchanged.

## Typing subtitles directly

Without SRT, type into the subtitle text area. One source line is normally one phrase. The app estimates placement using text length and timing settings; refine it with the song and tap synchronization.

To return from SRT editing to direct input, save the project first and use Clear lyrics. It removes cues, timing, overrides and the export range, and is undoable.

### Direct-input notation

| Notation | Meaning |
|---|---|
| New line | Next phrase |
| Blank line | Adds a small gap before the next phrase |
| `/` | Explicit division, such as `Across the night/I remember` |
| `*word*` | Marks emphasis |
| Trailing `!` | Marks an impact for effects such as flashes and shaking |
| `text\|note` | Supplies small annotation text for compatible layouts |
| `[01:23.45]text` | LRC start time |
| Line beginning with `#` | Ignored comment |
| `[interlude 8]` | Eight-second lyric-free interval; four seconds if omitted |

This edition removes the original standalone interlude cards from layer rendering. An interlude marker can reserve time, but does not restore the original background-only scene. Use SRT fillers for animated text in gaps.

In imported SRT, `/`, `*`, `|` and `!` are ordinary characters, not these controls. `[timestamp]` is a separate feature for SRT-derived cue text, explained below.

## Audio and timing

### Load a song

Select an audio file. MP3, WAV, M4A, AAC, Ogg and FLAC are offered, subject to browser decoder support. The app displays duration and estimated BPM after analysis.

Detected beats inform internal cut timing, and energy can affect animation. This is not speech recognition or automatic word-level lyric alignment. The song is for analysis and monitoring; pair exports are silent, while simple video export can include it.

### SRT versus beats

With SRT, edited cue start/end times define the subtitle interval. Loading a song does not replace them with beat times. Cuts within those intervals can still use beat information.

Dragging a cue moves its interval and causes internal cuts to be recalculated. It does not move the song's beat grid. These are separate layers of timing information.

| Setting | Purpose |
|---|---|
| BPM | A positive value supplies a regular beat grid; zero/unset allows analyzed beats |
| Start | Initial placement for automatic direct-input timing |
| Line duration | Duration scale for automatic direct-input timing |
| Snap to beats | Moves relevant cuts or dragged times toward nearby beats |
| Clear manual timing | Removes direct-input timing overrides; hidden for SRT |

Start and line-duration controls do not batch-shift or stretch SRT cues.

### Tap sync

Start tap synchronization, listen to playback, and press TAP or Space when the displayed next line begins. Backspace or the back button undoes one tap. Finish ends the session; Escape also pauses playback. A line's tap button starts from that line.

Tap synchronization is for direct subtitle input without SRT. With SRT, both the main and per-line tap buttons are disabled. Use time fields, timeline dragging or ±0.1s shifts instead. Importing SRT during tap synchronization ends the session and pauses playback. Use Clear lyrics to return to direct input and enable tap synchronization again. The tap pass can be undone using the edit undo controls.

## Playback and timeline

Play/pause, seek with the slider, toggle looping, and adjust preview volume or mute. Volume affects monitoring only.

Use Speed to choose 1×, 0.8×, 2/3× or 0.5×. 2/3× is approximately 0.667×. Audio keeps its pitch while subtitles, background video and spectrum follow the same timeline. Switch during playback, seek, loop, or draw a new cue without resetting the selected speed. Pitch correction can slightly change the sound's texture.

Finishing a mouse adjustment to a dropdown, checkbox or slider in the main editor returns focus to the preview, so number-key and Space shortcuts work immediately. Text/time/number fields, dialogs, and settings operated with Tab or arrow keys keep focus. Clicking the preview image or timeline also returns to shortcut operation after editing text.

Speed affects preview only: MP4 speed, duration and audio, cue times, and beat analysis remain unchanged. It is not saved in project JSON and resets to 1× when reopening the page. Starting tap sync returns to 1× and disables speed changes for that session.

Legacy 1×, at the bottom of the menu, plays decoded audio through the original Web Audio path at normal speed. Select it manually if standard playback behaves poorly. Switching during playback retains the current position, with a possible brief audio gap. A standard-player loading/playback failure, or a 10-second startup timeout, automatically switches to Legacy 1× and displays a message. This also changes slow playback to normal speed. If legacy playback fails too, playback stops. Select a regular speed to return to the standard player. Tap sync retains the legacy engine if selected.

The loop button cycles through whole piece → line → cut → off. Line looping repeats that line's cut interval; cut looping repeats the current cut. Use these while refining one moment.

| Timeline action | Result |
|---|---|
| Click the colored band | Seek to that time |
| Drag an upper start handle | Move that cue; SRT end follows start |
| Shift-drag | Temporarily avoid beat snapping |
| Wheel or +/− | Zoom |
| Shift-wheel or horizontal wheel | Pan the zoomed timeline |
| Fit/whole view | Show the complete timeline |
| Click a line's text | Seek to its start |

Numbers are gray for normal cues and red for fillers. Hovered or dragged handles show yellow numbers. Colored bands represent cuts; waveform and beat indicators help relate them to music.

### Two histories

Undo / Ctrl+Z handles subtitle text, timing, filler generation and related editing. Ctrl+Shift+Z or Ctrl+Y redoes those edits. Previous/next proposal buttons navigate **look history**, independently of subtitle editing. Ctrl+Z is not universal undo for every setting. Save important proposals as separate JSON files; session history is not a durable backup.

## Preview background and display modes

Load an image or video as the preview background. It is fitted within the frame without changing its aspect ratio, so unmatched ratios can leave borders. Video follows preview time. Clear removes the background reference without changing the source file.

| Display | What it shows |
|---|---|
| Preview background + subtitles | Composite over the working background, including loaded spectrum |
| Front on black | Colors, text and ornaments; black represents empty space |
| Binary / grayscale matte | White transparent, black opaque; Alpha mode adds intermediate gray coverage |

This selector only controls preview. Pair exports exclude the background; simple video export composites the image/video background with spectrum and subtitles regardless of the selected preview mode.

## Opacity and background color opacity

Select Opacity mode under Subtitle layers. One setting controls preview, matte + front, front-only and simple video exports. It is saved in project JSON; older projects open in Binary (legacy). Switching modes does not redraw the random composition.

- **Binary (legacy)** does not retain partial opacity: partial opacity is baked into RGB against black, with a binary matte.
- **Alpha (grayscale matte)** retains subtitle and decoration opacity. Simple video composites it directly onto the background. Matte preview displays intermediate gray values.

In Alpha mode, the palette background color is translucent during rendering. Use the **Background color opacity** slider to adjust it from 0–100% (default: 40%). Higher values make fills more opaque; lower values reveal more of your background media. The setting applies to previews and all exports: matte + front, front only, and simple MP4. It is saved in project JSON; older projects without the setting use 40%. The slider is disabled in Binary mode, which retains legacy rendering.

This applies to backgrounds, transitions and post effects, including text or foreground parts that use the background color as their ink. The same RGB stored in another palette field or a fixed color is unaffected. Saved palettes, random choices and spectrum opacity remain unchanged.

Color mixtures interpolate both premultiplied color and opacity. At the default setting, mixing the 40%-opaque background color with opaque text color gives about 45% opacity at a 9% text-color ratio, or 52% at 20%. Fades and gradient opacity multiply the result, while overlapping fills can become more opaque. This does not set a fixed opacity for the entire finished frame. At 0%, mixed text/accent color contributions remain; at 100%, the effect's own fades still apply.

Spectra remain binary in both modes. Their visible bars are opaque; translucent subtitles blend over them. Exterior bloom removal remains active. Background-dependent blend effects are not guaranteed to reproduce every original JIZURA result exactly.

This does not change the opacity of imported background media. See [Exporting MP4](#exporting-mp4) for layer files and [Compositing in a video editor](#compositing-in-a-video-editor) for blending them. Simple video export performs the opacity-aware composition inside this app.

## Auto-compose and Shuffle

Whole-project Auto-compose, partial changes, Shuffle and look-history navigation seek to **0.5 seconds before the first cue with text, clamped to zero**. Fillers and whitespace effects count; completely empty cues are skipped. Simple/Phone modes start playback automatically; Advanced mode preserves the playing/paused state. Local subtitle draws still restart 0.3 seconds before the target when playing, or at its start when paused.

**Auto-compose** changes style, mood, effects, palette and composition together. R triggers it when not editing text. Use it to explore overall direction.

**Shuffle** rerolls composition using current settings. Use it when you like the general palette and mood but want a different arrangement. Locked lines retain their structure.

Easy mode also offers separate rerolls for style, palette, mood and composition. Palette affects accent/ghost colors; mood affects effect settings and candidate techniques; composition changes arrangement and motion combinations.

### Themes for Auto-compose and subtitle draws

Choose a theme beside the central Auto-compose button or above Auto-compose in Simple mode. Both selectors share one setting. New and older projects default to **No theme**, retaining the existing behavior. A theme guides selection rather than excluding every unrelated technique.

| Theme | Mood candidates | Sets enabled when needed |
|---|---|---|
| No theme | Existing settings | None |
| Lyric video | Editorial, graphic, emotional | Typography/PV |
| Kinetic | Pop, graphic, glitch | Kinetic |
| Japanese | Calm, emotional, editorial | Japanese and additional expressions |
| Horror | Horror | Horror |
| Pop | Pop | None |
| Ballad | Calm, emotional | None |

Selecting alone changes no existing effects, set switches, playhead position or key-9 baseline. Whole-project Auto-compose enables required sets globally; whole-project Style/Mood changes also consider the selected theme. Existing candidate and parameter locks remain respected.

For subtitle draws, required sets are enabled **inside the target cue only**. With global Horror off, select Horror and press 1 to create one horror cue without altering global switches or other cues. Boundary transitions may change how neighboring cues connect.

| Key | Theme behavior |
|---|---|
| 1 Everything | Draw a new combination in the selected theme |
| 2 Style | Consider the theme while keeping current mood and palette |
| 3 Mood | Draw a mood within the theme while keeping style, fonts and palette |
| 4 Performance / 6 Fine-tune | Use the cue's applied settings and candidates, ignoring a newly selected theme |
| 5 Colors | Reroll colors independently of the theme |
| 9 Global taste | Return to the last globally applied settings and theme |
| 0 Random | Do not constrain the draw by the selected theme |

Because 2 and 3 preserve some properties, they may not fully match a new theme; use 1 for a complete change. For example, compose the whole project as Ballad, select Horror and press 1 for one cue, then press 9 to restore that cue to the original Ballad taste. Pending, globally applied and cue-local settings are saved in project JSON.

### Expression set switches

Additional expressions, Japanese motifs, typography/PV, kinetic and horror sets control automatic candidates. Horror enables horror styles and techniques. With No theme, Auto-compose uses those parts for the horror mood; a themed draw enables its required sets. A partial draw such as cue key 2 can combine a horror-themed style with a retained non-horror mood. The additional set contains elements added after the original app's first release.

These controls primarily filter automatic selection. A technique explicitly assigned to a line or cut may remain even when its set is excluded from automatic choices.

## Styles and fonts

Choose a style card in Detailed mode. Styles bundle font, palette, typography and effect tendencies: noir, pop, blueprint, printed matter, Japanese motifs and others.

Style-thumbnail backgrounds do not become the layer's empty-space color. Empty output stays black, while graphic panels such as tickets remain when they are part of an effect.

### Font roles

| Role | Typical use |
|---|---|
| Display | Large main subtitles |
| Serif | Serif-oriented scenes |
| Small/body text | Supporting information |

Choose the style default to let the style decide. These are roles used by layouts, rather than word-processor formatting of an arbitrary selected character.

### Installed PC fonts

Install additional fonts on your PC first. In Detailed mode, enter the family name and choose Add. This selects the display font; assign other roles as needed. Japanese family names are supported.

Project JSON and browser project autosave retain names and selections only, never font binaries. Install the same fonts on other PCs. An unavailable or misspelled family may render with a browser fallback.

Font files cannot be imported directly. Legacy uploaded fonts preview with fallback; export is blocked while those fonts are used. Install the font on your PC and select its actual family name, or choose a built-in font. On startup, this version deletes old audio and uploaded-font binaries from browser storage.

## Colors

| Color | Typical role |
|---|---|
| Accent | Emphasis and graphic elements |
| Ghost A/B | Offset/overlapping colors |
| Text | Main subtitle color |
| Secondary | Supporting text |

Enable custom accent or text colors to override the style. Random palette rerolls accent/ghost colors. Different effects use these roles differently; one color input does not recolor every visible object.

Check dark text over a working background. Meaningful pure-black artwork becomes RGB 030303 before opacity multiplication, so faint artwork can produce still lower RGB values. In Alpha mode, the matte retains coverage; do not infer opacity from front RGB alone.

## Effects

Effect sliders use a 0–100 strength/frequency scale. Each technique responds differently.

| Parameter | Practical use |
|---|---|
| Motion | Increase or reduce movement and shaking |
| Glitch | Amount or frequency of glitch-like effects |
| Chromatic offset | Color separation and overlap |
| Ornaments | Amount of surrounding graphics |
| Cut density | Fineness of internal switching; reduce for readability |
| Texture | Texture intensity where applicable; removed background processing may have no visible effect |
| Background switching | Variation in behind-text graphics, not switching imported preview files |

### Automatic parts and subtitle rerolls

By default, SRT cues start a new part after at least 3 seconds with no normal subtitle visible. Overlapping cues are considered together; fillers and completely empty cues do not define automatic boundaries. Text/timing edits recalculate automatic boundaries, with manual choices taking precedence at edited boundaries.

The subtitle summary lets you **edit part breaks only**, protecting text and timing.

1. Click a cue's row and press Enter or **Add part break** to insert a blank separator above it when the caret is at the start of the row, otherwise below it. No separator is added before the first cue or where one already exists. Touching cue times can still be split into separate parts.
2. Inserting above a row keeps the caret at the moved text's start. Place the caret on a blank separator and press Backspace/Delete or **Remove part break** to join the parts. Automatic boundaries can also be removed.
3. Use Ctrl-Z to undo and Ctrl-Shift-Z/Ctrl-Y to redo. Manual boundaries are saved in project JSON.

Use the SRT cue editor to change text. The summary shows one row per cue, displaying embedded line breaks as ↵ and empty/whitespace-only text as labels. Original text remains intact; typing, pasting or deleting a selection containing text cannot change it here.

A manual choice belongs to the **cue immediately after the boundary** and follows it when retimed. Deleting that cue removes the choice. Normal-cue choices survive filler regeneration; choices on fillers disappear when those fillers are deleted or regenerated. Reimporting SRT restores automatic boundaries for the new cues. Removing a part break does not shorten the actual silent interval.

Unified look uses these parts to coordinate layout, motion and color. Cross-cue transitions are eligible only within a part when the previous end equals the next start at millisecond precision. Eligible boundaries do not always receive a transition.

The subtitle draw buttons and number keys affect only the current subtitle. A line's dice is equivalent to Fine-tune. **0 Random** samples compatible layouts, motion, ornaments, fonts and colors without style/mood preferences. It retains base settings separately, honors effect-pack permissions and cue locks, and bypasses Unified look. Ornament counts and screen accents are limited to avoid overcrowding; Typesetting restraint still applies.

| Key | Draw | Changes |
|---|---|---|
| 0 | Random | Broad compatible combinations with restrained density; retains base style/mood separately |
| 1 | Everything | Style, mood, fonts, palette, performance and cut structure |
| 2 | Style | Style, fonts and related performance; keeps mood and palette |
| 3 | Mood | Mood, motion and ornaments; keeps style, fonts and palette |
| 4 | Performance | Broadly redraws layout, motion, ornaments and cut structure; keeps style, mood, fonts and palette |
| 5 | Colors | Palette only; preserves cut structure, motion, timing and screen events |
| 6 | Fine-tune | Narrow redraw within the subtitle's current style, mood, palette and technique pool |
| 9 | Global taste | Clear local choices and redraw effects/cut structure in the latest global framework |

9 creates a new draw using the global style, mood, fonts, palette, technique pool and Unified look; it does not restore the exact original animation. It clears local taste, manual techniques and forced cut counts. 6 uses the cue's own retained base; 9 returns to the global base, which subsequent 6 draws also use.

Global Auto-compose, partial changes, Shuffle and manual edits to global settings update the baseline; cue-level draws do not. The baseline is saved in JSON. Older projects use their existing global settings, not an unavailable earlier history. Other cues, text, timing and locks remain intact. Ctrl-Z undoes the draw.

Each subtitle retains its local settings. Use Everything to explore, then Mood, Colors and Fine-tune to refine without returning to the global starting look. The global controls stay unchanged; the local style and mood appear beside the draw buttons. Unified look favors small pools for Fine-tune, loosens them for Performance and builds a new local combination for Everything. Draws use the cue’s applied set permissions. Keys 1–3 enable sets required by the selected theme inside that cue, even if the corresponding global switch is off. Keys 4/6 retain the applied cue framework rather than adopting a newly selected theme. Broad draws retry repeated layout/motion combinations, but manual choices and short text may limit variation.

Keys 1–3 consider the [selected theme](#themes-for-auto-compose-and-subtitle-draws); 0/5 are independent of it. Key 9 restores the applied global theme as well as other global settings. Merely selecting a theme does not change that baseline.

All modes preserve text, cue times and locks. Everything clears that cue's manual effect choices. Style replaces layout, background graphic and treatment choices; Mood replaces entrance, exit, hold, ornaments, camera, transitions and treatment choices. Performance replaces both sets and cut structure while retaining fonts and colors. Modes 2–4 overwrite manual and per-cut choices within their scope and retain other choices. Ordinary Fine-tune retains manual choices. Other subtitles retain their artwork and effects; joins immediately around the target may change.

After Random, 2–4 replace their own groups and 5 changes only colors. 6 removes the random composition and redraws within the retained base settings, including subsequent Style/Mood changes. Pre-random manual choices return except for groups replaced by 2–4. Ctrl-Z restores the exact preceding result. Random compositions are saved in project JSON. Random uses at most three ornaments and one extra screen-effect event per cut, reducing density further for busy layouts or strong cameras.

During playback, the preview seeks to 0.3 seconds before the subtitle (clamped to zero) and keeps playing. Repeated 6 presses during that lead-in keep the same target. While paused, rerolling seeks to the cue start and remains paused. Normal cues and fillers are eligible. In a gap, nothing is rerolled; overlapping cues use the latest start. The button shows the target number. Ctrl-Z restores the previous draw, and project JSON retains results. Changing global settings rebuilds the composition under those settings.

### Unity and typesetting

Unity relates palettes/layouts across sections and repeated lyrics. Typesetting adjusts tracking, particles and Latin text while restraining decorations/treatments. Direct input can also receive a small timing lead, but SRT start/end times are not globally shifted by this option.

### Flash and HUD

Flash enables brief flashes. Turn it off to reduce flashing, and also review screen-effect candidates. HUD adds small information such as scene numbers and times; select style-dependent, always on or off.

### Hide decorative numbers and times

Enable this checkbox under Subtitle layers to hide numeric ornaments such as `No.01`, `#03` and timecodes added by HUDs or layouts. Numbers in subtitle text and `[timestamp]` fillers remain visible. Matching text in the current lyric is preserved conservatively. Frames, shapes and nonnumeric ornaments such as `REC` and `UNTITLED` remain.

Default: off. Applies to Binary and Alpha previews and all exports, and is saved in project JSON. It does not reroll effects or change the global taste restored by key 9.

The HUD selector controls the shared HUD. This checkbox also covers numeric ornaments drawn independently by layouts; use it when numbers remain with the HUD switched off.

### Cadence and fps

| Cadence | Subtitle motion |
|---|---|
| Full | At output fps |
| On twos | 15 drawings per second |
| On threes | 10 drawings per second |

New projects default to 30fps output with 15 drawings/s. A 30fps file can intentionally hold each subtitle pose for two frames. Try Full for smoother motion. Legacy 12/8 drawings/s values are retained for older projects. Spectrum footage is independent of subtitle cadence.

### Seed

The seed selects the random composition. The same text, timing, settings and seed help reproduce a composition; use a new seed for another arrangement. This is not a guarantee of identical pixels across app versions and font environments.

## Choosing techniques

The Techniques tab shows looping previews. Filter by name and check which techniques may be selected.

| Group | Controls |
|---|---|
| Layout | Typography and arrangement |
| Entrance | How text arrives |
| Hold | Motion while visible |
| Exit | How text leaves |
| Ornaments | Surrounding lines, shapes and decoration |
| Text treatment | Surface/outline effects |
| Background | Graphics behind text |
| Camera | Zoom, movement and framing |
| Screen effects | Screen-wide processing |
| Transitions | Connections between cuts |

All on, all off and invert affect the shown items when filtered. Basic fallbacks such as no treatment or still motion can remain available to keep a valid composition.

Thumbnails are isolated examples. Layer-specific omissions and the actual text, background and combinations can change the final appearance.

### Transitions that retain the previous subtitle

The Kinetic set includes **Retreating echo**, **Diagonal split** and **Radial shatter**. They retain the outgoing cut's final image at the start of the incoming cut, then shrink, split or fragment it. Background media and the spectrum are unaffected.

Automatic choices require touching cuts within the same part, with an outgoing cut of at least 0.45 seconds and an incoming cut of at least one second. Separate SRT cues must also have matching end/start times. Auto-compose and Random can select these effects; manual selection is also available. Cue times and cut lengths stay unchanged.

Retreating echo retains the incoming cut's normal entrance; the other two replace it. Their maximum duration is 0.8–1.1 seconds, shortened to fit the incoming cut and finish before its exit. The outgoing image is still: its original animation does not continue playing.

If the outgoing effect has already disappeared, there may be little image left to carry into the next cut.

### Locks

| Lock | What it preserves |
|---|---|
| Line lock | That line's cut structure and chosen techniques |
| Effect-parameter lock | Values that Auto-compose should not replace |
| Technique-group lock | Candidate on/off choices that Auto-compose should preserve |

Locks do not turn a line into a frozen rendered clip. Text edits, timing, global fonts and output geometry can still change how it looks. Recheck the preview after changing those conditions.

## Editing individual lines and cuts

Click a line to seek, use its dice to reroll only that line, reduce its cut count if it switches too often, or specify a layout. Lock successful lines before shuffling the rest.

In Detailed mode, click a technique chip in the current cut information below the timeline—layout, entrance, hold, exit, treatment and other supported categories—to open replacement candidates. This changes the current cut. Auto removes the explicit assignment.

Changing one cut is different from filtering all automatic candidates in the Techniques tab. It is useful when the overall result works except for a single moment.

The cut-information area also has Shuffle and Auto-compose buttons for that cut only. Distinguish them from the whole-project buttons beside playback.

Separate SRT cues are eligible for transitions only within the same part with matching end/start times, preserving silent intervals. Transitions within a cue remain available.

## Leaving the center clear

The center-clear option places text into side bands, splitting text within a cut across the two regions. Landscape uses left/right; portrait defaults to top/bottom and also offers left/right.

The dotted preview guides are editing aids. Graphics and screen effects are not guaranteed to avoid the center completely. Check your character/background in the actual composite.

## Filler subtitles

### Generate editable placeholders

Add fillers is available only after SRT import. It becomes Regenerate fillers when fillers exist. Load any audio/spectrum needed to establish the outro length first, open the dialog, set margins/duration/types, review the candidate count, then Generate.

Generated text is a placeholder. Edit it freely. Filler identity is separate from text, so replacing symbols with lyrics or a timestamp does not make the cue a normal subtitle. Fillers have red timeline numbers and a filler badge in the editor.

### Threshold and margins

| Setting | Default | Meaning |
|---|---:|---|
| Usable gap threshold | 5s | Minimum time remaining after margins |
| Pre-gap | 0.3s | Space after the preceding normal cue |
| Post-gap | 0.5s | Space before the next normal cue |

Defaults require an interior gap of at least **5.8 seconds**. If normal text ends at 10s and resumes at 15.8s, fillers occupy 10.3–15.3s. Intros use only post-gap; outros only pre-gap. Overlapping normal cues form one occupied interval; existing fillers are ignored during gap detection.

### Average duration

Normal is the mean duration of the longer half of current normal cues, rounding the count up. Short uses ×0.75; Long ×1.5. For durations 1, 2, 4 and 6 seconds, Normal is the mean of 4 and 6: five seconds.

Individual fillers vary in length to fit each eligible interval, rather than using a rigid fixed duration. Existing fillers do not influence the reference calculation.

### Text types and weights

| Type | Initially enabled | Weight | Text |
|---|---|---:|---|
| Whitespace | Yes | 3 | 3–4 groups of 2–5 ideographic spaces separated by ASCII spaces |
| Lyrics | Yes | 8 | A whole randomly selected normal cue |
| Timestamp | Yes | 2 | A literal `[timestamp]` placeholder |
| Symbols | Yes | 1 | Repeated, mixed, alternating or symmetric symbols |
| Custom text | Yes | 0 | The full text entered by the user (empty by default) |

Weights range from 0–10 for every type. Default relative chances for Whitespace, Lyrics, Timestamp and Symbols are 3:8:2:1; a small sample need not match that ratio exactly. Disabled types and weight 0 are excluded. If all active weights are zero, generation reports an error and keeps existing fillers.

Generating with Custom text enabled at a positive weight and an empty text field shows an error and leaves existing fillers intact. Spaces and line breaks are preserved; `[timestamp]` also works. The text, weight and checkbox are saved in project JSON. Older projects gain an empty Custom text field with weight 0.

Whitespace uses plates and decorations without visible lyric glyphs. You can edit each group's length. Group count does not force an exact number of cuts: duration and cut settings still apply. Saved weights/checks are preserved; older settings gain Whitespace enabled at weight 3.

Only symbol lengths follow average normal text length, excluding whitespace. Lyrics are selected whole regardless of length.

### Timestamp tags

```text
Editor and JSON: [timestamp]
At a start time of 125.853s: 02 05 853
```

ASCII spaces separate minutes, seconds and milliseconds to permit segmented motion. This does not force exactly three cuts; technique selection and lyric-language segmentation still apply.

Type the tag into normal or filler SRT cues, alone or alongside text such as `TIME [timestamp]`. Multiple tags work too. Moving the cue updates the displayed value. It shows **cue start time**, not a clock that advances during playback. The tag is supported in SRT-derived cues, not as a general direct-input lyric command.

### Regenerate, remove and save

Regeneration replaces **every existing filler, including manually edited fillers**. Normal text, timing and effects are preserved. Remove all fillers returns to normal cues only. Ctrl+Z undoes generation/removal. Settings and filler identity persist in JSON; Cancel/Escape leave the project unchanged.

### Outro and safeguards

End time uses audio duration first, then spectrum duration, otherwise the last normal cue, and never ends before the last normal cue. Without media, the app cannot infer the outro after the final subtitle. Regenerate if you load the song later and want its outro filled.

Safeguards: target duration at least 0.25s, symbols at most 120 characters, total cues at most 20,000. Saved settings take precedence over newer defaults.

## Compositing a spectrum video

Choose **None**, **Generate from audio** or **External video** under Spectrum source. Generated and imported spectra are mutually exclusive. None hides the overlay while retaining session media and settings. Both appear behind subtitles, aligned at time zero, including subtitle-free intervals.

### Generating from audio

1. Load a song under Audio and timing.
2. Select Generate from audio; it is unavailable without audio.
3. Wait for analysis, then play or seek and adjust colors, motion and placement.
4. Use pair export or simple video export. No separate spectrum video or matte is required.

There are 64 narrow continuous bars with gaps and no peak-hold line. Reference geometry is 768×120 (6.4:1). Defaults are 65% frame width, 3% left/bottom margins and 100% horizontal/vertical scales: about 1248×195 at 1920×1080.

| Control | Default and behavior |
|---|---|
| Top / bottom color | Both white; click to open a color picker |
| Sensitivity | +8dB, range −12 to +24dB; higher values respond to quieter audio |
| Pulse strength | 100%, range 0–100%; emphasizes increases and suppresses sustained sound. Zero follows the ordinary spectral level |
| Return time | 140ms, range 60–600ms; shorter falls faster. Attack is immediate |

**Reset to defaults** sets both colors to white, sensitivity to +8dB, pulse strength to 100%, and return time to 140ms. Position, scale, and the automatic frequency range stay unchanged.

**The gradient is fixed to the maximum height.** With red at the top and green at the bottom, short bars show green; yellow and red appear as they rise. Each bar does not stretch the whole gradient. Choose identical colors for solid bars.

The actual audio spectrum drives individual bands, rather than simulated BPM pulses. Sustained tones can settle near zero at 100% pulse strength. If the motion is too sparse, raise sensitivity or lower pulse strength. Preview volume and mute do not affect analysis.

Analysis runs in a browser worker and is cached for the session. Colors and placement update without reanalysis; motion changes reuse the frequency analysis. Exports are disabled while processing or after an error; failed analysis offers Retry. Preview, seeking and exports share the same 60Hz motion data, independent of subtitle cadence. The spectrum disappears after the audio ends.

When generation is enabled, a coarse scan samples up to 600 windows across the whole song to estimate its frequency range. The range always includes **250–4,000 Hz**, extending outward as needed, subject to the source Nyquist limit (half its sample rate). Silent or very short material falls back to 80–12,000 Hz, with a default-range note on screen.

The selected range appears under Auto range and stays fixed throughout the song. Replacing audio estimates it again; color, placement, sensitivity and pulse changes do not change it. FFT sizes and window lengths are unchanged. The existing low-band allocation follows distinct FFT bins; separate bands can still move similarly when the audio does.

JSON stores source mode, colors, motion and placement, not audio or analysis data. Reload the song when reopening a generated-spectrum project. Audio is not cached or automatically restored. Intentional black bars use RGB 030303, empty space uses 000000, and only nonzero front pixels become black in the binary matte. Original JIZURA equalizer-like subtitle effects remain separate from this feature.

### Prepare footage

[Audio Spectrum Overlay Maker](https://github.com/cityedge/audio-spectrum-overlay-maker), developed by cityedge, creates more extensively configurable spectrum footage to import using External video.

### Automatic compositing

Select External video and load a spectrum front to composite it automatically. Clear the front or select None to stop compositing.

Select the front and its matching matte together in the front-file dialog:

```text
speana_sample.mp4
speana_sample_matte_dark.mp4
```

The app matches the `_matte_dark` naming convention among the files you actually select. Merely placing files in the same directory does not grant the browser access. You can also load the matte separately afterward.

| Loaded media | Behavior |
|---|---|
| Front only | Exact RGB 000000 becomes transparent; nearby black values remain |
| Front + matte | Dark matte regions are opaque, except exact black front pixels remain transparent |
| Matte only | Nothing is composited |

Input matte RGB average below 128 is treated as opaque. Match front/matte dimensions and durations. Use nonzero colors for meaningful black spectrum artwork.

Subtitles appear in front of the spectrum. Both use time zero; nothing is shown after the spectrum ends. There is no spectrum offset or trimming control, so prepare shifted material externally.

### Position and scale

Default width is 65% of frame width with 3% left and bottom margins, preserving source aspect ratio.

| Control | Meaning |
|---|---|
| Left | Source rectangle's left edge, as a percentage of frame width |
| Bottom | Source rectangle's bottom edge, as a percentage of frame height |
| Horizontal scale | 100% means the default 65%-wide rectangle |
| Vertical scale | 100% means its corresponding default height |
| Reset position | Left/bottom 3%, both scales 100% |

Horizontal 50% makes the width 32.5% of the frame. Independent scales stretch the shape; equal scales preserve its ratio. Position ranges −100–100%; scales 1–400%. Content outside the frame is clipped.

### Frame selection

Export decodes and selects frames by presentation time. Constant 30fps footage exported at 30fps from a source frame boundary uses frames sequentially. 29.97fps, variable/mismatched fps or an unaligned range start can require holds or drops.

Preview uses video playback/seeking, a different path from export frame selection. Containers include MP4, MOV, WebM, Matroska and Ogg, but codec support is browser-dependent. Unsupported accurate decoding reports an error.

## Exterior bloom cleanup

All exterior light added by automatic post-processing bloom and the Bloom screen effect is removed regardless of brightness. There is no adjustment control. Old project thresholds are ignored and discarded on import.

This removes exterior bloom from the front and builds the corresponding matte; it does not merely shrink the matte. Original black text, graphics and flying sparks remain, along with interior brightness changes. Individual effects' neon, shadows and blur are not universally removed.

Preview, pair MP4 and simple MP4 exports share this behavior. It does not apply to spectrum keying.

## Exporting MP4

This section describes front/matte pair export and front-only export. See [Exporting a simple video](#exporting-a-simple-video) for optional background/audio output.

**Export front MP4 only** saves one silent video on black, including subtitles and the active spectrum, without the preview background or audio. It shares resolution, fps, quality and export-range settings with pair export and supports cancellation and a save link. It skips matte pixel generation and encoding and uses one encoder. Rendering still takes time, so export is not necessarily twice as fast. A separately exported matte is not guaranteed to match; use pair export when you need both.

Choose output settings on the right, then use **Export matte + front MP4** on the left.

### Files

Check output settings on the right and Opacity mode under Subtitle layers before exporting. Use the two files from the same pair-export run together.

| Mode | Front | Matte |
|---|---|---|
| Binary (legacy) | Colored subtitles, ornaments and spectrum baked onto black; empty space is black | Before compression, black where the front is nonblack and white elsewhere |
| Alpha (grayscale matte) | Color multiplied by opacity (premultiplied RGB); empty space is black | White transparent, black opaque, gray partially opaque |

Both are silent MP4s with matching dimensions, fps and frame count, downloaded without ZIP compression. Neither contains background media or song audio. An enabled generated/external spectrum is included.

For a project named `demo`:

| Content / mode | Front filename | Matte filename |
|---|---|---|
| Subtitles / Binary | `demo_subtitle_front.mp4` | `demo_subtitle_front_matte_dark.mp4` |
| Subtitles / Alpha | `demo_subtitle_front_alpha.mp4` | `demo_subtitle_front_alpha_matte_dark.mp4` |
| Spectrum composite / Binary | `demo_combined_front.mp4` | `demo_combined_front_matte_dark.mp4` |
| Spectrum composite / Alpha | `demo_combined_front_alpha.mp4` | `demo_combined_front_alpha_matte_dark.mp4` |

The matte adds `_matte_dark` to the front basename. Never mix modes or files from different renders. Browser settings determine duplicate-name handling; keep each pair together.

Front-only output contains no independent opacity information, so correct translucent compositing requires its matching matte. Black artwork starts as RGB 030303 before opacity multiplication, which can reduce faint black to lower values. Lossy MP4 may alter colors, edges and matte values; test a short range using the [mode-specific compositing workflow](#compositing-in-a-video-editor).

### Aspect and resolution

Choose 16:9, 9:16, 4:3, 3:4, 1:1, 4:5 or 21:9. Resolution uses the short side and rounds dimensions to even numbers for encoding.

| Option | At 16:9 |
|---|---|
| 480p | 854×480 |
| 540p | 960×540 |
| 720p | 1280×720 |
| 1360×766 | 1360×766 |
| 900p | 1600×900 |
| 1080p | 1920×1080 |
| 1440p | 2560×1440 |
| 4K | 3840×2160 |

The intermediate option uses short-side 765 rounded to even dimensions; its label changes for other aspect ratios. Portrait 1080p at 9:16 is 1080×1920.

### Frame rate and quality

Choose 30, 24 or 60fps; 30 is the new-project default. Match spectrum footage when appropriate. Subtitle cadence is separate.

Standard, High and Maximum quality change encoding bitrate, usually affecting file size. They do not change resolution or fps. Start with High and a short test range.

### Range

Choose first and last lines in the export-range controls. A line's range button selects it; Shift-click extends the range. Select Whole for the first entry to return to full export.

With SRT, the range runs from the first selected line's start to the latest selected end. This is a **time window**, not a solo-track filter: other cues and spectrum visible in that time remain included. The exported file begins at time zero for that window; place it at the correct original time in an external editor.

Filler generation and cue reordering can clear the range, so check it before exporting.

### Download and cancel

Export shows progress and disables editing. Cancel stops generation; it does not offer a partial movie. Completion starts two downloads. Allow multiple downloads if prompted. Persistent individual front/matte links let you save either file again without rerendering. Do not reload or close the page before saving.

### Duration and speed

SRT export normally ends at the last cue, extended by a longer spectrum if loaded. Loading audio alone does not necessarily extend SRT export to the song's end. Filler generation can use song length, but check the actual preview/range duration.

Rendering, pixel processing, source decoding and two encodes all take time. GPU model alone does not determine speed. Resolution, fps, effects, CPU, footage and browser encoder matter. Keep the tab open and estimate using a short range first.

## Exporting a simple video

This supplementary feature produces one MP4 containing an image/video background, spectrum, subtitles and optional loaded audio. It does not export a separate matte.

### Steps

1. Prepare subtitles and effects; optionally load an image or video preview background, spectrum and song.
2. Find the neutral-colored Export simple video MP4 button below the pair-export description in the left pane.
3. Check the automatically calculated Duration (seconds), then adjust it manually if needed.
4. Check Exclude audio for silent output. With no song loaded, output is silent regardless of the checkbox.
5. Check the existing aspect, resolution, fps, quality and range settings. The actual video duration and frame count appear below the button.
6. Export. Use the automatic download or the Save simple video MP4 link after completion. Cancel export stops processing without saving a partial file.

The filename is based on the project name: `project_simple_video.mp4`.

### Background and composition

Composition order is background, spectrum, then subtitles. Both images and videos fit inside the frame without changing their aspect ratio, with black padding. No background means black. Front/matte preview modes do not alter simple export's composition.

**Video backgrounds start at timeline zero and hold their final frame after ending.** They do not loop. Generated and external spectra, including external mattes, can be used. Pair and front-only exports continue to exclude the background.

Export decodes the video and selects the frame corresponding to each output timestamp. Constant 30fps footage exported at 30fps from a source frame boundary uses each source frame once, in order. Other rates, 29.97fps and variable-rate footage involve frame holds or drops. This does not guarantee pixel-identical output after scaling, compositing and MP4 compression.

Decoding depends on browser codec support. Loading checks support; unsupported footage disables only simple export and displays a reason. H.264 MP4 is a good starting format. Video backgrounds with external spectrum footage require multiple decoders and may cost more than still backgrounds or generated spectra.

Subtitle colors, decorations, bloom cleanup and spectrum placement/matte processing use the layer pipeline. Binary mode uses the legacy mask; Alpha mode retains opacity when compositing onto the background.

### Duration

Duration is always editable. There is no automatic/manual mode switch. Loading or changing materials automatically copies the maximum of:

| Material | Duration used |
|---|---|
| Subtitles and fillers | Latest end time |
| Spectrum | Front duration, or the shorter paired duration when a matte is supplied |
| Audio | Decoded sample count divided by sample rate |
| Video background | Video-track end time; a longer embedded audio track does not extend it |
| Still background | Excluded; it has no duration |

Duration automatically follows the longest subtitle, spectrum, decoded audio or video background when materials are loaded or changed, and remains manually editable. Audio counts even with Exclude audio checked. Loading, replacing or clearing media and changing subtitle times recalculate it. MP3 uses the decoded buffer, rather than file metadata alone. Color, preview mode and audio inclusion changes preserve manual values. JSON restores the saved duration, but reloading media recalculates it.

Valid input is greater than zero and at most 86,400 seconds; this input limit is not a guarantee that long exports will succeed. Invalid input blocks only simple export. Video duration rounds up to whole frames: 1.001 seconds at 30fps becomes 31 frames, approximately 1.033 seconds.

A selected export range intersects the interval from zero to the specified duration. Background video, spectrum and audio use the same source-time window; exporting from 10 seconds does not restart the background at zero. A non-overlapping range reports an error. The existing Whole timeline label describes the layer timeline; use the simple-export status for this feature's actual output length.

### End behavior and audio

Shorter output trims materials. Longer output retains the still image or the video's final frame, hides ended subtitles/spectrum and adds silence after the song. Nothing loops or fades automatically.

Audio starts at timeline zero and retains its original level. Preview volume/mute does not affect export. Audio tracks within background and spectrum footage are ignored; only the song loaded in Audio and timing is included.

Video uses H.264; audio uses AAC at 48kHz, up to two channels, 192kbps. Excluding audio or having no loaded song creates an MP4 without an audio track. Missing AAC support reports an error; select Exclude audio or use a supported environment. AAC padding may make external tools report a container duration slightly different from the video duration.

Duration and audio inclusion persist in project JSON and autosave. Media binaries are not included; verify that the required sources are loaded when resuming a project.

## Compositing in a video editor

Use a matching pair from one export run. Match start time, duration, playback speed, position and scaling. The tables specify **back-to-front compositing order**, not track numbers. Set every layer to 100% opacity. Put the original song on a separate audio track.

### Binary mode: Darken and Lighten

| Order (back to front) | Material | Blend mode |
|---|---|---|
| 1 | Background image/video | Normal |
| 2 | Binary matte MP4 | Darken |
| 3 | Matching front MP4 | Lighten |

The matte makes the subtitle footprint black, then the front supplies its color. This workflow is for binary pairs. Front-only Lighten loses dark artwork over brighter backgrounds. Binary mode bakes soft effects onto black and cannot restore their original translucency.

### Alpha mode: Multiply and Add

| Order (back to front) | Material | Blend mode |
|---|---|---|
| 1 | Background image/video | Normal |
| 2 | Grayscale matte MP4 (white = transparent) | Multiply |
| 3 | Matching Alpha-mode front MP4 | Add / equivalent Linear Dodge |

For each RGB channel normalized to 0–1, `result = F + B × M`. B is background, F is premultiplied front, and M is the matte (8-bit value divided by 255). White matte retains the background; black blocks it. **Do not multiply the front by alpha again.** Thresholding the matte or using Darken/Lighten cannot reproduce partial opacity.

### When Add is unavailable but Difference is available

If the editor offers Multiply and absolute Difference, use **two full-frame white layers** to substitute for Add.

| Order (back to front) | Material | Blend mode |
|---|---|---|
| 1 | Background image/video | Normal |
| 2 | Grayscale matte MP4 (white = transparent) | Multiply |
| 3 | Full-frame white (RGB 255,255,255) | Difference |
| 4 | Matching Alpha-mode front MP4 | Difference |
| 5 | Full-frame white (RGB 255,255,255) | Difference |

Both white layers must cover the full frame and the same time interval as the pair. Keep every layer at 100% opacity, with no fades, shadows or color correction on the white layers. Each step blends against the accumulated result beneath it. Exclusion is a different operation and is not a substitute for Difference.

Let D be the result of step 2 and F the front. Steps 3–5 produce `1 − D`, then `|1 − D − F|`, then `1 − |1 − D − F|`. If **D + F ≤ 1 in every RGB channel**, the final result equals `D + F`. For D = 0.4 and F = 0.3, the intermediate values are 0.6 → 0.3 → 0.7.

A correct premultiplied front has F = C×α and M = 1−α. With ordinary 0–1 RGB values, `D + F = B×(1−α) + C×α ≤ 1`. Brightness adjustments or mismatched files can violate this condition; Difference then folds the value back downward instead of clipping to white like Add. Compression and editor color processing may also introduce differences. Compare a short export against the app's background composite first.

### Importing the matte as alpha

Opacity is `α = 1 − M`: invert the matte in a workflow that interprets white as opaque. Treat the Alpha-mode front as **premultiplied RGB**. Interpreting it as straight RGB and multiplying by alpha again darkens it. If the editor cannot specify the input interpretation, use the Multiply/Add or Difference workflow above.

Front-only output cannot reconstruct correct partial opacity. Export the matching pair together, or use [simple video export](#exporting-a-simple-video) to finish the composite inside the app.

## Saving and resuming

Use Save to download JSON and Open to restore it. Project name primarily supplies the output filename; it does not create the original app's title card.

| Information | In JSON? |
|---|---|
| Cue text, start/end and filler identity | Yes |
| Filler settings, style, effects, colors, font references, line/cut overrides and locks | Yes |
| Aspect, resolution, fps, export range and spectrum layout | Yes |
| Opacity mode, background color opacity and decorative-number hiding | Yes |
| Pending theme, applied global/cue settings, key-9 baseline, cue draws and part breaks | Yes |
| Simple video duration and audio inclusion | Yes |
| Preview speed | No; starts at 1× |
| Audio/background/spectrum media binaries | No |
| PC font binaries | No |
| Durable undo/look history or rendered MP4 files | No |

Reload audio, background and external spectrum media when reopening. Audio/font binaries are not cached or restored by the app; install additional fonts on the PC. Opening JSON displays a reminder. Subtitles and fillers are already restored: importing SRT again replaces them. Media already loaded in the session remains selected when opening JSON, so check that it belongs to the project.

Autosave depends on origin, browser/profile and local-file location. Clearing browser data or using private mode can remove it. Save important work as JSON.

Reset clears the project, song, settings and session histories after confirmation and cannot be undone. It does not delete downloaded JSON or original media files from disk.

## Keyboard controls

Text inputs and open dialogs suppress some app shortcuts.

| Key | Normal action |
|---|---|
| Space | Play/pause |
| R | Auto-compose |
| 0 | Random draw for the current subtitle |
| 1–5 | Subtitle: Everything / Style / Mood / Performance / Colors |
| 6 | Fine-tune the current subtitle |
| 9 | Redraw the current subtitle using the latest global taste |
| Left/right | Seek back/forward 2 seconds |
| Shift-left/right | Current cue start (previous within 0.3s of start) / next cue start |
| A/D | Seek one output frame |
| Shift-A/D | Seek one second |
| Ctrl-Z | Undo subtitle/timing-related edits |
| Ctrl-Shift-Z or Ctrl-Y | Redo those edits |
| Shift-drag | Avoid timeline beat snapping |

Development keys O/P review historically high-coverage layouts/backgrounds using different pools from normal draws. See the [review-key guide](docs/DEBUG_REVIEW.md#english).

During tap sync, Space/Enter taps, Backspace steps back, and Escape pauses/exits.

## Suggested workflows

### Improve readability

Lower cut density, motion, glitch and ornaments. Try typesetting. Reduce cuts in long lines or adjust SRT line breaks. Replace only difficult cuts with simpler layouts before changing otherwise-correct subtitle timing.

### Create an energetic lyric video

Choose the Lyric video or Kinetic theme, explore with Auto-compose, lock strong lines, then refine entrance/hold/exit per cut. Required sets are enabled by the draw. Add lyric-heavy fillers during instrumental sections and edit their placeholder text.

### Keep a character visible

Load the character footage as a working background, try Alpha mode with adjustable Background color opacity and center-clear layout, and replace panels/tickets or screen-wide effects that obscure the face. Resize/reposition the spectrum to avoid competition with subtitles.

### Make interludes less busy

Increase pre/post gaps, choose longer fillers to reduce their count, and reduce symbol weight. Save a separate JSON before regenerating edited placeholders you may want to retain.

## Troubleshooting

| Symptom | Check or action |
|---|---|
| Cannot find a control | Switch to Detailed and scroll the panes. Output settings are on the right; paired export is on the left. Exterior bloom cleanup is automatic and has no control |
| SRT will not load | Verify UTF-8, valid timestamps, nonempty text and end after start. Renaming an extension does not convert a format |
| Correct timing but unreadable text | Reduce cut count/density and motion; try a simple layout |
| Large dark panel covers footage | Try Alpha mode and lower Background color opacity. Fixed colors and other palette fields are unaffected, so replace remaining obstructive layouts/backgrounds/ornaments. Bloom cleanup does not remove original panels |
| Alpha composite is dark, white or opaque | Use a matching `_alpha` pair, Multiply for the matte and Add for the front. For the Difference substitute, check white → front → white, all at 100%. Do not apply alpha to the front twice; see the compositing chapter |
| Selecting a theme does nothing | Selection alone leaves effects intact. Apply Auto-compose or keys 1–3; 4/6 keep the applied cue base, while 9 restores the global base. Use 1 to change the whole cue framework |
| No fillers | Import SRT, enable a type with positive weight, check the usable gap after margins, and load media to establish the outro |
| Old default values appear | Saved project settings are preserved; change them in the dialog and Generate |
| Spectrum missing | For Generate from audio, load a song. For External video, load a supported front and seek within its duration. Check source mode and reset off-screen placement; matte alone is insufficient |
| Spectrum has dark residue | Without a matte only exact RGB zero is transparent. Compression can make black nonzero; prepare a matching matte and check the source |
| Jerky motion | Check subtitle cadence; for spectrum check actual source/output fps and range alignment. Compare a short export rather than relying only on a heavy preview |
| Slow or failed export | Test a few lines at 540p/720p and 30fps. Follow decoder, missing-font, memory or encoder errors shown by the app |
| Only one MP4 downloaded | Allow multiple downloads or use the two individual links |
| Media disappears on reopen | Reselect audio, background and external spectrum; JSON stores settings and subtitles, not media binaries. Do not reimport SRT |
| Old app version still appears | Reload the updated site, or open HTML from the newly extracted ZIP rather than the old directory |

## Limits and data handling

- No single MP4 with embedded alpha, PNG sequences or After Effects export. Partial opacity is provided by a separate grayscale matte plus premultiplied front video. Simple video export supports images and videos, but does not import background soundtracks or edit multiple background clips.
- No source-SRT overwrite/export or speech recognition.
- No independent multiple-spectrum tracks or spectrum start-offset control.
- Long/4K/60fps combinations can use substantial memory/time; all devices/codecs are not guaranteed.
- Text and media are processed in the browser rather than uploaded by the app. Font fetching uses external network requests.
- Source media remains unchanged. Browser storage is not a backup.

## Distribution files and licenses

| Path | Purpose |
|---|---|
| `index.html`, `en/index.html` | Japanese and English app |
| `user_guide.md`, `user_guide.en.md` | Detailed manuals |
| `README.md`, `README.en.md` | Overview and entry points |
| `docs/LAYER_WORKFLOW.en.md` | Short layer workflow |
| `docs/PUBLISHING.en.md` | Manual publishing instructions |
| `src/`, `app/`, `build.py` | Source and build tools |
| `vendor/` | Libraries, notices and source distribution |
| `LICENSE`, `THIRD_PARTY_NOTICES.md` | License information |

This is an unofficial cityedge derivative of JIZURA by hakoniwa. The original and derivative application code use MIT; bundled libraries have their own terms. Consult the included notices and About dialog.

You do not need to attach this app's MIT notice to exported videos. Check the rights and usage terms of your lyrics, music, images, footage and fonts separately.

## Version history

See [CHANGELOG.md](CHANGELOG.md) for version-by-version additions, changes and fixes. This manual describes current operation. Saved projects use the current renderer when opened, so an app update can change the appearance of an existing composition.

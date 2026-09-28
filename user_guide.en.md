# JIZURA Layer Studio v1.1.0 User Manual

JIZURA Layer Studio turns lyrics and subtitles into animated **silent MP4 layers** for compositing over other footage. It retains JIZURA's typography and effects engine and adds editable SRT cues, filler generation, spectrum compositing, and paired front/matte export.

[Open app](https://cityedge.github.io/jizura_layer_studio/en/) · [README](README.en.md) · [日本語マニュアル](user_guide.md) · [Publishing instructions](docs/PUBLISHING.en.md)

This manual describes the retained features of v1.1.0. Features removed from the original JIZURA are not presented as available operations.

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

## Capabilities

| Task | Features |
|---|---|
| Prepare subtitles | UTF-8 SRT import, editable text/start/end, direct text entry, LRC start times |
| Animate | Auto-compose, Shuffle, styles, layouts, entrance/hold/exit, camera, text treatments, ornaments, transitions |
| Constrain choices | Technique checkboxes, expression sets, line locks, parameter and technique-group locks |
| Follow music | Beat/energy analysis, BPM override, tap synchronization, timeline editing |
| Fill gaps | Editable placeholders in SRT intros, interludes and outros |
| Preview | Image/video background, front view, binary matte view |
| Combine footage | Spectrum front with optional matte; position and independent horizontal/vertical scaling |
| Export | Two silent MP4s with matching dimensions, fps and frame count; line-range export |
| Preserve work | Browser autosave and downloadable project JSON |

The primary front/matte pair excludes background and audio for external editing. Optional simple video export combines a still background and audio into one MP4. Exporting video backgrounds, After Effects projects and PNG sequences is not supported.

## Requirements and startup

### Hosted version

Open the [English app](https://cityedge.github.io/jizura_layer_studio/en/) in desktop Chrome or Edge. No installation is required. MP4 export needs WebCodecs and a supported video encoder; availability depends on browser and OS.

### ZIP version

1. Extract the Release ZIP.
2. Open `en/index.html` in Chrome or Edge. `index.html` at the root opens Japanese.
3. Keep the directory structure intact for language navigation and documentation.

End users do not need Python, Node.js or ffmpeg to run this browser app. The app can run locally, but built-in fonts may be fetched from Google Fonts. Without a connection, check fallback appearance or use a local/uploaded font.

### Two language settings

The header language menu switches the **interface** between Japanese and English. It does not translate your subtitles. Save before switching pages.

The lyric-language selector controls text segmentation and font choices: automatic, Japanese, Traditional Chinese, Simplified Chinese, Korean or English. It is independent of the interface language.

## Your first video

1. Import SRT, or type subtitles if you have no SRT.
2. Load the song to check timing by ear.
3. Load an image or video as a preview background.
4. Try Auto-compose and compare proposals with the previous/next controls.
5. Reroll or replace the few lines that need work; lock the lines you want to keep.
6. If needed, generate fillers in gaps and replace the placeholder text.
7. Optionally load a spectrum front, with its matching matte if available.
8. Export a few lines at 540p or 720p, 30fps, and test the composite.
9. Save a project JSON.
10. Return the range to the whole timeline and export at the intended resolution.

In your external editor, put the matte over the background using **Darken**, then the front over that result using **Lighten**. Add the song as a separate audio track.

## Workspace and modes

| Region | Controls |
|---|---|
| Header | Project name, modes, interface language, Open/Save JSON, Reset, User guide, About |
| Upper left | SRT, fillers, cue editor, preview background, audio/timing, spectrum, display mode, paired MP4 export |
| Lower left | Subtitle text, lyric language, line/cut list |
| Center | Preview, playback, volume, loop, look history, Auto-compose, timeline, current cut information |
| Right | Easy controls or detailed Style, Effects, Techniques and Export tabs |

**Easy** emphasizes Auto-compose and the current proposal, with buttons to reroll only style, palette, mood or composition. **Detailed** exposes fonts, colors, effect parameters, technique candidates and individual cut replacement. Switching modes preserves the project.

On a narrow screen, scroll through the workspace. Mobile mode folds some controls and changes the layout; its first activation may reduce a resolution above 720p to 720p. Check output settings before final export. Desktop is recommended for large renders.

## Lines and cuts

A **line** is a subtitle unit. With SRT, one cue block corresponds to one line even if its text contains line breaks.

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

After SRT import the main text area is a read-only summary; use the cue editor for changes. Importing another SRT replaces the current cues and per-line overrides. Save a JSON first if you want to retain the current version.

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

SRT taps preserve each cue's duration. Fillers are also cues and participate in the sequence. For substantial retiming, adjust normal cues first, then regenerate fillers. The tap pass can be undone using the edit undo controls.

## Playback and timeline

Play/pause, seek with the slider, toggle looping, and adjust preview volume or mute. Volume affects monitoring only.

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
| Binary matte | Black occupied regions, white empty regions |

This selector only controls preview. Pair exports exclude the background; simple video export composites the still background with spectrum and subtitles regardless of the selected preview mode.

## Auto-compose and Shuffle

**Auto-compose** changes style, mood, effects, palette and composition together. R triggers it when not editing text. Use it to explore overall direction.

**Shuffle** rerolls composition using current settings. Use it when you like the general palette and mood but want a different arrangement. Locked lines retain their structure.

Easy mode also offers separate rerolls for style, palette, mood and composition. Palette affects accent/ghost colors; mood affects effect settings and candidate techniques; composition changes arrangement and motion combinations.

### Expression sets

Additional expressions, Japanese motifs, typography/PV, kinetic and horror sets control automatic candidates. Horror also enables the horror mood, and Auto-compose uses those elements for that mood. The additional set contains elements added after the original app's first release.

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

### Local and uploaded fonts

Enter an installed PC font's family name and add it, or load a `.ttf`, `.otf`, `.woff` or `.woff2` file. Adding a font selects it for the display role; assign other roles separately as needed.

Local family resolution depends on the PC and browser. Uploaded font binaries are not embedded in project JSON. The same browser may restore them from storage, but another PC or cleared storage requires reloading them. Reload the original font file if export reports a missing font.

## Colors

| Color | Typical role |
|---|---|
| Accent | Emphasis and graphic elements |
| Ghost A/B | Offset/overlapping colors |
| Text | Main subtitle color |
| Secondary | Supporting text |

Enable custom accent or text colors to override the style. Random palette rerolls accent/ghost colors. Different effects use these roles differently; one color input does not recolor every visible object.

Check dark text over a working background. Meaningful pure-black artwork is reserved as RGB 030303 in the front to distinguish it from empty RGB 000000.

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

### Unity and typesetting

Unity relates palettes/layouts across sections and repeated lyrics. Typesetting adjusts tracking, particles and Latin text while restraining decorations/treatments. Direct input can also receive a small timing lead, but SRT start/end times are not globally shifted by this option.

### Flash and HUD

Flash enables brief flashes. Turn it off to reduce flashing, and also review screen-effect candidates. HUD adds small information such as scene numbers and times; select style-dependent, always on or off.

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

Transitions across separate SRT cues are restricted to preserve their boundaries and empty intervals. Transitions within a cue remain available.

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

**The gradient is fixed to the maximum height.** With red at the top and green at the bottom, short bars show green; yellow and red appear as they rise. Each bar does not stretch the whole gradient. Choose identical colors for solid bars.

The actual audio spectrum drives individual bands, rather than simulated BPM pulses. Sustained tones can settle near zero at 100% pulse strength. If the motion is too sparse, raise sensitivity or lower pulse strength. Preview volume and mute do not affect analysis.

Analysis runs in a browser worker and is cached for the session. Colors and placement update without reanalysis; motion changes reuse the frequency analysis. Exports are disabled while processing or after an error; failed analysis offers Retry. Preview, seeking and exports share the same 60Hz motion data, independent of subtitle cadence. The spectrum disappears after the audio ends.

When generation is enabled, a coarse scan samples up to 600 windows across the whole song to estimate its frequency range. The range always includes **250–4,000 Hz**, extending outward as needed, subject to the source Nyquist limit (half its sample rate). Silent or very short material falls back to 80–12,000 Hz, with a default-range note on screen.

The selected range appears under Auto range and stays fixed throughout the song. Replacing audio estimates it again; color, placement, sensitivity and pulse changes do not change it. FFT sizes and window lengths are unchanged. The existing low-band allocation follows distinct FFT bins; separate bands can still move similarly when the audio does.

JSON stores source mode, colors, motion and placement, not audio or analysis data. Reload the song when reopening a generated-spectrum project; a song restored by the same browser is analyzed again. Intentional black bars use RGB 030303, empty space uses 000000, and only nonzero front pixels become black in the binary matte. Original JIZURA equalizer-like subtitle effects remain separate from this feature.

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

This section describes front/matte pair export. See [Exporting a simple video](#exporting-a-simple-video) for optional flattened output.

Choose output settings on the right, then use **Export matte + front MP4** on the left.

### Files

The front contains colored text, ornaments and any loaded spectrum on black. The matte contains black occupied shapes on white. Both are silent and downloaded directly as MP4, without ZIP compression.

A subtitle-only project named `demo` produces `demo_subtitle_front.mp4` and `demo_subtitle_front_matte_dark.mp4`. Composited output uses combined-output names. The matte always adds `_matte_dark` to the corresponding front basename. Browser download settings determine duplicate-name handling; keep each pair together.

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

This supplementary feature produces one MP4 containing a still background, spectrum, subtitles and optional loaded audio. It does not export a separate matte.

### Steps

1. Prepare subtitles and effects; optionally load a still preview background, spectrum and song.
2. Find the neutral-colored Export simple video MP4 button below the pair-export description in the left pane.
3. Check the automatically calculated Duration (seconds), then adjust it manually if needed.
4. Check Exclude audio for silent output. With no song loaded, output is silent regardless of the checkbox.
5. Check the existing aspect, resolution, fps, quality and range settings. The actual video duration and frame count appear below the button.
6. Export. Use the automatic download or the Save simple video MP4 link after completion. Cancel export stops processing without saving a partial file.

The filename is based on the project name: `project_simple_video.mp4`.

### Background and composition

Composition order is still background, spectrum, then subtitles. The image fits inside the frame without changing its aspect ratio, with black padding. No image means black. Front/matte preview modes do not alter simple export's composition.

**A selected video background disables simple export.** Replace it with a still or clear it. Pair export remains available.

Subtitle colors, decorations, bloom cleanup and spectrum placement/matte processing use the layer pipeline. Subtitle coverage follows the binary layer mask; this does not add translucent light physically to the background.

### Duration

Duration is always editable. There is no automatic/manual mode switch. Loading or changing materials automatically copies the maximum of:

| Material | Duration used |
|---|---|
| Subtitles and fillers | Latest end time |
| Spectrum | Front duration, or the shorter paired duration when a matte is supplied |
| Audio | Decoded sample count divided by sample rate |
| Still background | Excluded; it has no duration |

Duration automatically follows the longest subtitle, spectrum or decoded audio when materials are loaded or changed, and remains manually editable. Audio counts even with Exclude audio checked. Loading, replacing or clearing media and changing subtitle times recalculate it. MP3 uses the decoded buffer, rather than file metadata alone. Color, preview mode and audio inclusion changes preserve manual values. JSON restores the saved duration, but reloading media recalculates it.

Valid input is greater than zero and at most 86,400 seconds; this input limit is not a guarantee that long exports will succeed. Invalid input blocks only simple export. Video duration rounds up to whole frames: 1.001 seconds at 30fps becomes 31 frames, approximately 1.033 seconds.

A selected export range intersects the interval from zero to the specified duration. Audio is trimmed to that same window. A non-overlapping range reports an error. The existing Whole timeline label describes the layer timeline; use the simple-export status for this feature's actual output length.

### End behavior and audio

Shorter output trims materials. Longer output retains the still background, hides ended subtitles/spectrum and adds silence after the song. Nothing loops or fades automatically.

Audio starts at timeline zero and retains its original level. Preview volume/mute does not affect export. Audio tracks within spectrum footage are ignored; only the song loaded in Audio and timing is included.

Video uses H.264; audio uses AAC at 48kHz, up to two channels, 192kbps. Excluding audio or having no loaded song creates an MP4 without an audio track. Missing AAC support reports an error; select Exclude audio or use a supported environment. AAC padding may make external tools report a container duration slightly different from the video duration.

Duration and audio inclusion persist in project JSON and autosave. Media binaries are not included; verify that the required sources are loaded when resuming a project.

## Compositing in a video editor

```text
Top:    front MP4       → Lighten
Middle: matte MP4       → Darken
Bottom: background video/image
Audio:  original song on a separate track
```

Align start time, size, duration and any transforms for both files. If the whole image turns white, check that the matte is not using ordinary source-over blending. Front-only Lighten can lose dark text or colored artwork over bright backgrounds; the pair is the normal workflow.

For alpha-based matte workflows, white means transparent and black means opaque. Invert a white-is-opaque interpretation. The exported matte is binary, not continuous alpha. Soft effects retain their brightness against black in the front. Before compression, exactly the front's nonzero RGB pixels have a black matte; lossy MP4 can slightly alter edges and colors.

## Saving and resuming

Use Save to download JSON and Open to restore it. Project name primarily supplies the output filename; it does not create the original app's title card.

| Information | In JSON? |
|---|---|
| Cue text, start/end and filler identity | Yes |
| Filler settings, style, effects, colors, font references, line/cut overrides and locks | Yes |
| Aspect, resolution, fps, export range and spectrum layout | Yes |
| Simple video duration and audio inclusion | Yes |
| Audio/background/spectrum media binaries | No |
| Uploaded font binaries | No |
| Durable undo/look history or rendered MP4 files | No |

Reselect background and spectrum when reopening. Song/font data may be restored from the same browser's storage, but another PC needs the source files separately.

Autosave depends on origin, browser/profile and local-file location. Clearing browser data or using private mode can remove it. Save important work as JSON.

Reset clears the project, song, settings and session histories after confirmation and cannot be undone. It does not delete downloaded JSON or original media files from disk.

## Keyboard controls

Text inputs and open dialogs suppress some app shortcuts.

| Key | Normal action |
|---|---|
| Space | Play/pause |
| R | Auto-compose |
| Left/right | Seek one output frame |
| Shift-left/right | Seek one second |
| Ctrl-Z | Undo subtitle/timing-related edits |
| Ctrl-Shift-Z or Ctrl-Y | Redo those edits |
| Shift-drag | Avoid timeline beat snapping |

During tap sync, Space/Enter taps, Backspace steps back, and Escape pauses/exits.

## Suggested workflows

### Improve readability

Lower cut density, motion, glitch and ornaments. Try typesetting. Reduce cuts in long lines or adjust SRT line breaks. Replace only difficult cuts with simpler layouts before changing otherwise-correct subtitle timing.

### Create an energetic lyric video

Enable typography/PV and kinetic sets, explore with Auto-compose, lock strong lines, then refine entrance/hold/exit per cut. Add lyric-heavy fillers during instrumental sections and edit their placeholder text.

### Keep a character visible

Load the character footage as a working background, try center-clear layout, and replace panels/tickets or screen-wide effects that obscure the face. Resize/reposition the spectrum to avoid competition with subtitles.

### Make interludes less busy

Increase pre/post gaps, choose longer fillers to reduce their count, and reduce symbol weight. Save a separate JSON before regenerating edited placeholders you may want to retain.

## Troubleshooting

| Symptom | Check or action |
|---|---|
| Cannot find a control | Switch to Detailed and scroll the panes. Output settings are on the right; paired export is on the left. Exterior bloom cleanup is automatic and has no control |
| SRT will not load | Verify UTF-8, valid timestamps, nonempty text and end after start. Renaming an extension does not convert a format |
| Correct timing but unreadable text | Reduce cut count/density and motion; try a simple layout |
| Large dark panel covers footage | Exterior post-processing bloom is removed automatically. Tickets/bands and individual shadows are retained artwork; replace their layout/background/ornaments |
| No fillers | Import SRT, enable a type, check the usable gap after margins, and load media to establish the outro |
| Old default values appear | Saved project settings are preserved; change them in the dialog and Generate |
| Spectrum missing | Load a front, seek within its duration, check codec support, or reset off-screen placement. Matte alone is insufficient |
| Spectrum has dark residue | Without a matte only exact RGB zero is transparent. Compression can make black nonzero; prepare a matching matte and check the source |
| Jerky motion | Check subtitle cadence; for spectrum check actual source/output fps and range alignment. Compare a short export rather than relying only on a heavy preview |
| Slow or failed export | Test a few lines at 540p/720p and 30fps. Follow decoder, missing-font, memory or encoder errors shown by the app |
| Only one MP4 downloaded | Allow multiple downloads or use the two individual links |
| Media disappears on reopen | Reselect background/spectrum; JSON stores settings, not media |
| Old app version still appears | Reload the updated site, or open HTML from the newly extracted ZIP rather than the old directory |

## Limits and data handling

- No video-background movie export, true alpha MP4, continuous-alpha matte, PNG sequences or After Effects export. Simple video export supports still backgrounds.
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

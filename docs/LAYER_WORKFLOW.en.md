# User guide — JIZURA Layer Studio

[日本語](LAYER_WORKFLOW.md) · [README](../README.en.md)

## Subtitles and preview

Import a UTF-8 SRT. Start/end times, line breaks, gaps and overlaps are preserved. Characters like `/`, `*`, `|`, `!` are literal in SRT. Use “Edit SRT text, start and end” rather than inherited row-start/tap controls.

Without SRT, type subtitles using the original lyric syntax. Auto-compose, adjust individual rows, or return to a previous proposal. Effect panels, ribbons, graphics, HUDs and flashes can cover the full frame. Plain base backgrounds and independent title/interlude scenes are excluded.

Load an image/video as a preview background. Songs are for preview/timing only. Neither background nor audio is exported.

## Spectrum

Import a front video; its matte is optional. Select both together to match `speana_sample.mp4` with `speana_sample_matte_dark.mp4`. The app cannot discover unselected sibling files and has no folder picker.

- Without a matte, exactly RGB 000000 after placement/scaling is transparent. Near-black values and compression noise remain.
- With a matte, size/duration must match. Mean matte RGB below 128 is opaque, while RGB-zero front pixels remain transparent. Use nonzero black in external artwork to retain it.
- Add/clear the matte to switch modes. Bloom cleanup does not apply to spectrum media.
- Both start at zero, subtitles in front; media is empty after its end.
- Default: 65% frame width, preserved source aspect, 3% left/bottom margins. Independent scales use the base as 100%. Settings persist in JSON; preview/export share placement. Outside-frame content is clipped.

## FPS and spectrum frames

New projects default to 30fps. Subtitle cadence options are 15 drawings/s (on twos), 10 drawings/s (on threes), and full output fps. Auto-compose uses these cadences. Saved 24fps and legacy 12/8 drawings/s settings are preserved; select 30fps explicitly when updating an existing project. Real-time effect durations and fade speeds are retained.

Export decodes spectrum frames through WebCodecs and selects them by presentation timestamp (PTS), independently of preview playback. A constant 30fps source exported at 30fps from a source frame boundary uses every source frame once, in order. This is frame correspondence, not pixel-identical output: scaling, compositing and lossy MP4 encoding still change pixels.

Front and matte are sampled at the same output times; source files must already be synchronized. 29.97fps, variable-frame-rate and mismatched rates require timestamp-based frame holds or drops. Subtitle cadence does not affect spectrum frames. 24fps and 60fps output remain available.

Supported containers: MP4, MOV, WebM, Matroska and Ogg; codec support depends on the browser. If exact decoding is unavailable, export reports an error rather than silently falling back to video-element seeking. Editing previews still use video elements.

## Exterior bloom cleanup

Below the cut list, adjust 0–128 (default 32). Zero disables cleanup; higher values remove more dark exterior glow. Preview updates without replanning. The value is saved and locked during export.

Only new exterior pixels added by automatic bloom / bloom effects are examined. Original text, graphics and sparks remain. Not every dark shadow or camera blur is removed.

## Output

Preview with background + subtitles, front on black, or binary matte. Use a background to inspect dark artwork.

Export two direct MP4s without ZIP compression. Allow multiple downloads if prompted, or use individual save links. Keep the tab open during export.

Names: `project_subtitle_front.mp4` and `project_subtitle_front_matte_dark.mp4`. Spectrum composites use `combined_front`. Both files have matching dimensions, fps and frame count, without audio.

16:9 presets: 854×480, 960×540, 1280×720, 1360×766, 1600×900, 1920×1080, 2560×1440, 3840×2160. Other aspect ratios change dimensions; both axes are even. The intermediate option displays actual dimensions (766×1360 for portrait).

## Black, matte and compositing

RGB 000000 means empty space. Black subtitle drawing colours become RGB 030303 before alpha is applied. Fades rounded down to zero stay empty.

Exactly the nonblack final front pixels produce black matte pixels before encoding; empty pixels produce white. No outline dilation or partial alpha is exported. Soft effects retain brightness on black, which can create a dark edge over bright footage.

Lossy MP4 compression/colour conversion may change exact RGB and introduce intermediate matte shades. Verify decoded footage in your compositor.

Apply the matte with Darken, then the front with Lighten. Match timing, size and speed. For custom alpha processing use `alpha = 1 - matte / 255`. The pre-encode binary pair also obeys `front + background * (matte / 255)`.

## Save and limitations

Save project JSON explicitly; autosave is a convenience. Subtitles, effects, placement and bloom settings persist, but actual background, spectrum and song files do not. Reselect media after reopening; save before language switching, which reloads the page.

Desktop Chrome / Edge is recommended. MP4 requires WebCodecs and H.264 encoding, depending on browser/OS. Long/4K exports are not thoroughly verified and use substantial memory; start with a short range. File-URL storage behavior depends on browser.

Finished background/audio video, PNG and AE export are not offered. New controls/guides are Japanese/English; other inherited language editions use English for new functionality.

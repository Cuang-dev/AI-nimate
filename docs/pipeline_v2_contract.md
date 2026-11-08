# AI-nimate Pipeline v2 Contract (from vid_20261107_001 onward)

Older episodes keep working untouched. v2 replaces per-episode hand-written scenes
with one shared, data-driven engine. An episode is data only.

## Files per episode (`motion-canvas/production/<id>/`)

- `numbers.json`    Single source of truth for every figure. `{ "figures": { key: {"value": n, "display": "Rp350 juta", "basis": "sourced|estimate", "source": "url or formula"} } }`
- `script.json`     See below.
- `timings.json`    Written by `scripts/v2/synth_narration.py`.
- `storyboard.json` See below.
- `assets_manifest.json`, `asset_qa.json` Image pipeline.
- `final_mix.wav`   Written by `scripts/v2/mix_audio.py`; muxed by render.mjs.

## script.json

```json
{ "video_id": "vid_20261107_001", "channel": "kausalmedia", "series": "POV:",
  "slug": "...", "title": "...", "description": "...", "language": "ID",
  "aspect_ratios": ["16x9"],
  "voice": { "model": "gemini-3.8-flash-tts", "voiceName": "Charon" },
  "tts_style_prompt": "...",
  "chapters": [ { "id": "ch01", "title": "...", "music": "tense|light|warm",
    "sentences": [ { "id": "s01_01",
      "text": "Sewa meja ini cuma [Rp15 ribu|lima belas ribu rupiah] per orang.",
      "pause_after": 0.8 } ] } ] }

Side-card crop: `generate_assets.py` asks Haiku for each passing image's main subject
(grid overlay, badge code proves it read the file, median of 3 runs) and writes
`production/<id>/image_focus.json` (`{"file.png": x}`, 0..1 of width; full record in
asset_qa.json `images.<id>.focus`). The engine centres the collapsed card there. A
storyboard `focusX` on any shot of that image overrides it; leave it out by default.
Backfill: `generate_assets.py --id <id> --focus-only`.
```

`[display|spoken]`: subtitles show `display`, TTS reads `spoken`. Bare words are both.
Use it for all numerals and acronyms: `[PIK|pik]`, `[AC|a-se]`.
`pause_after` is optional seconds of silence spliced after the sentence.
Default splice at each chapter end: 0.7s.

Pacing (automatic, `pace()` in synth_narration.py): after the take is spliced, every
sentence boundary is lengthened to a minimum silence: 0.50s after a statement, 0.70s
after a question or a sentence with a figure, 0.40s after a colon, 1.0s at a chapter end.
Each sentence is also leveled to the take's median loudness (max +/-4 dB) to undo
long-take drift. `synth_narration.py <id> --repace` re-applies this to an existing take
(no new TTS call); run `mix_audio.py <id>` afterwards.

## timings.json

```json
{ "duration_seconds": 0,
  "beats": [ { "beat_id": "beat_01", "chapter_id": "ch01", "title": "", "start": 0, "end": 0, "duration": 0, "spoken_text": "" } ],
  "chapters": "<same array as beats>",
  "sentences": [ { "id": "s01_01", "chapter_id": "ch01", "start": 0, "end": 0, "text": "<display text>" } ],
  "words": [ { "w": "<display token>", "start": 0, "end": 0, "sentence_id": "s01_01", "beat_id": "beat_01" } ],
  "subtitle_chunks": [ { "text": "", "start": 0, "end": 0, "duration": 0, "beat_id": "beat_01", "words": [] } ] }
```

Words always come from the script, never Whisper text. Whisper provides timestamps
only. A `[display|spoken]` token is one display word (never split across chunks).
Two chunk sets, both clause-aware (sentence ends always break, tiny fragments glue to a
neighbour, long clauses split into balanced parts, names and figures are never split off):
`subtitle_chunks` for 16:9 (at most 10 words / 52 chars, one wide line) and
`subtitle_chunks_9x16` (at most 5 words / 34 chars). Never cross a chapter. On screen a
chunk stays up until the next one when the gap is under 1.6s, else 1.0s after its last word.

## storyboard.json

```json
{ "chapters": [ { "id": "ch01", "shots": [ {
    "at": "s01_01",
    "transition": "cut|crossfade|collapse|expand",
    "image": { "src": "ch01_a.png", "mode": "full|side", "motion": "pushIn|pushOut|panLeft|panRight", "focus": "hold|dim", "focusX": 0.5 },  // focusX optional override, see below
    "explainer": { "type": "stack|bars|stat|compare|line|flow|receipt", "title": "...", "yLabel": "...", "xLabel": "...", "columns": ["A", "B"],
      "items": [ { "at": "s01_02@Rp96", "label": "...", "value": "...", "numeric": 96, "tone": "neutral|good|bad|warn", "note": "...", "a": "...", "b": "..." } ] }
} ] } ] }
```

- A shot lasts until the next shot's `at`. It has `image`, `explainer`, or both.
- `at` = sentence id, optionally `@word` (first display word in that sentence that
  starts with `word`, case-insensitive). Unresolvable `at` is a hard error.
- `image.mode: side` needs an explainer. `full` with no explainer is a full-bleed visual.
- Annotations never go on images. Info moves to an explainer via `collapse`.

## Staging rules (engine enforces, stories can't break them)

1. No brow, no title pill, no panel labels, no gridlines, anywhere.
2. Focus: the newest item is opacity 1. Items that have done their job drop to 0.32.
   Future items do not exist on screen (no ghost text). Explainer title stays at 0.6
   after the first item lands.
3. Image in `side` mode: `focus: hold` stays 1.0 while it is still being discussed;
   `dim` drops to 0.4 once the first item lands.
4. Charts: title and axes draw first (at the shot's `at`). Each bar or point draws on
   its `at`. Its `note` appears 0.35s AFTER the mark finishes. Never before.
5. Minimum font 30px on 1920x1080. Value text 44+, stat 150+. All text is Plus Jakarta Sans.
6. Images always animate slowly (no still images). Bars and stats tick up.
7. Sync: all motion starts exactly at resolved `at` time. Scene ends on an exact frame
   so that total frames = round(end*60) - round(start*60); cumulative drift must be 0.

## Language

Plain Indonesian for a layperson. Banned on screen and in speech (linted):
capex, opex, omzet→"pendapatan" is preferred but omzet allowed, margin→"untung",
roi, bep, cash cow, loss leader, high churn, revenue, leakage, f&b, hpp, unit economics, gross, net profit.

## Runner, script source, icons, frame review

- `motion-canvas/scripts/v2/make_episode.mjs <id>`: stages `script lint narration music storyboard
  assets thumbnail crops mix scaffold render qa review`; state in `production/<id>/pipeline_state.json`.
  Paid stages (narration, music, assets, thumbnail, review) rerun only when their inputs change;
  output that existed before the runner is adopted, not regenerated.
- `script_source.txt` is the authored script: `@key: value` header (channel, series, slug, title,
  subtitle, description, thumbnail_text, thumbnail_scene, tts_style_prompt), then `# chNN | title |
  mood` and one sentence per line (`| 0.6` = extra pause). `compile_script.mjs` writes script.json;
  sentence ids are generated; the voice always comes from projects_config.json. Every digit must be
  inside a `[display|spoken]` token.
- Schema checks (`lint_episode.mjs`, `checkSchema`): script.json, numbers.json (sourced figures need
  a URL, estimates say how), storyboard.json (allowed keys, enums, per-type required fields, item
  counts, text lengths), assets_manifest.json. Every message ends in `fix: ...`.
- Icon sets: `assets_manifest.json` `icon_sets: [{id, icons: [{id, prompt}]}]`, 2-6 icons drawn in
  one image call (`scripts/v2/icons.py`), saved as transparent `public/assets/<id>/icons/<icon>.png`.
  A `flow` item may set `"icon": "<icon id>"`; the step box grows to show it above the label.
- Frame review (`review_frames.py`): one frame per shot, 0.4s before it ends; Haiku inspects in
  batches of 4 (badge code per frame proves it was read) and an issue counts only if a repeat
  inspection of that frame alone reports it again. Blank stage is a pixel check.
  Calibration (2026-11-08): bad side-card crop flagged 3/3, blank frame 3/3, good frames 0/6.

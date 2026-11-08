---
name: episode-pipeline
description: Make a new AI-nimate v2 video episode end to end, or fix/resume one. One command (make_episode.mjs) runs every stage and stops with the file to fix. Use for "make a video", "new episode", "resume render", "fix the episode", "QA failed".
---

# Episode Pipeline (v2): runbook

Written for an orchestrator (Gemini Argon, Claude Opus, or similar) that delegates file-scoped jobs to Flash workers. Every rule here is literal. Do not improvise steps that are not listed.

All commands run from `motion-canvas/`. `<id>` is the episode id, `vid_YYYYMMDD_NNN`.

## The loop (this is the whole job after the script exists)

```
node scripts/v2/make_episode.mjs <id>
```

- Exit 0: done. Go to "Finish".
- Exit 1: it printed a block like this:

```
=== STOPPED at stage "storyboard" ===
  - storyboard.json ch04 shot 2 item 3: stack items need "value"
FIX: Edit motion-canvas/production/<id>/storyboard.json as each line says ...
THEN: node scripts/v2/make_episode.mjs <id>
```

  1. Edit ONLY the file named in FIX. Change ONLY what the listed lines say.
  2. Run the THEN command.
  3. Same stage fails 3 times in a row with the same lines: stop and ask the user. Do not work around a check.

Never delete files in `.cache/`, `public/`, or `production/` to "reset" something. Use `--from=<stage>` to redo a stage.

### Long runs (render takes 1-2 hours, narration and assets several minutes)

Start in the background and poll:

```
nohup node scripts/v2/make_episode.mjs <id> > logs/make_<id>.log 2>&1 &
node scripts/v2/make_episode.mjs <id> --status      # every 5-10 minutes
```

`--status` shows each stage, which one is RUNNING, and the last failure with its FIX. If the process died (status says RUNNING but no `node` process): just start the same command again; finished work is cached.

## New episode: steps in order

| # | Who | Do | Check |
|---|---|---|---|
| 1 | orchestrator | Pick the next free id: look in `production/` for today's `vid_YYYYMMDD_NNN`, add 1. | id not in `production/` |
| 2 | orchestrator | `node scripts/v2/make_episode.mjs <id> --init --slug=<words-with-dashes>` | prints "registered" |
| 3 | orchestrator (strong model) | Research. Write `production/<id>/research_dossier.md` (every claim with URL) and `numbers.json` (every figure: value, display, basis sourced/estimate, source). | none yet |
| 4 | orchestrator (strong model) | Write `production/<id>/script_source.txt` (format below). For `@title`, `@thumbnail_text`, `@thumbnail_scene` load the `youtube-packaging` skill first; chapter 1 must deliver the title's promise. | `make_episode --until=lint` exits 0 |
| 5 | Flash worker `storyboard-writer` | Write `storyboard.json`. Needs timings, so first run `make_episode <id> --until=music`. | `make_episode --until=storyboard` exits 0 |
| 6 | Flash worker `asset-director` | Write `assets_manifest.json` (images, characters, icon sets). | `make_episode --until=crops` exits 0 |
| 7 | anyone | The loop: `make_episode <id>` until exit 0. | exit 0 |

Steps 3 and 4 decide whether the video is good. Give them to the strongest model available. Steps 5 to 7 are mechanical: every mistake is caught by a check that says how to fix it.

## script_source.txt format

```
@channel: kausalmedia
@series: POV:
@slug: pov-bisnis-meja-mahjong
@title: POV: Lo Buka Bisnis Sewa Meja Mahjong. Ternyata Uangnya Bukan dari Makanan
@subtitle: one line
@description: 2-3 sentences for YouTube
@thumbnail_text: BUKAN DARI MAKANAN
@thumbnail_scene: one sentence: who, doing what, big expression, empty space left for the text

# ch01 | Judul bab | tense
Satu kalimat per baris.
Angka selalu token: [Rp45 ribu|empat puluh lima ribu rupiah], [PIK|pik], Pasal [303|tiga ratus tiga].
Jeda ekstra di akhir baris: | 0.6
```

Rules the checks enforce (so write them right the first time):
- Every digit is inside a `[display|spoken]` token. `display` = what the subtitle shows, `spoken` = how the voice reads it. A token is one subtitle word, so wrap a figure with its unit (`[Rp45 ribu|...]`), not the word before it.
- Every figure shown must exist in `numbers.json` (`display` or one of `aliases`).
- Plain Indonesian for laypeople. Banned: capex, opex, margin, ROI, BEP, revenue, HPP, gross, net profit, unit economics (full list in `docs/pipeline_v2_contract.md`). "omzet" is fine.
- Chapter mood is `tense`, `light` or `warm` (music bed).
- 8-12 chapters, 6-15 sentences each, one idea per sentence, under 25 words.
- Pauses are added automatically after every sentence. Use `| 0.6` only for a dramatic beat.

## Finish

1. `make_episode` exit 0 means: QA gate passed (`qa_report.json`) and Haiku frame review passed (`frame_review.json`).
2. Look at `production/<id>/review_frames/` yourself if you can see images (one frame per shot).
3. Report to the user: video path `projects/<dirName>/video_16x9.mp4`, duration, anything you overrode.
4. ALWAYS show the packaging choice: the run ends with a `=== CHOOSE THE PACKAGING ===` block (3 titles,
   3 thumbnails, side-by-side image `production/<id>/publish_options.jpg`). Copy that block to the user and
   ask which title and which thumbnail. Do not pick for them.
5. Upload only after the user picks and asks for it:
   `.venv/bin/python motion-canvas/scripts/v2/upload_youtube.py <id> --title N --thumb N --dry-run`, then
   without `--dry-run`. It uploads PRIVATE by default. AI disclosure defaults to "no" (illustrated content);
   add `--ai-disclosure` only for realistic people, places or events.
6. Do not deploy (`npm run deploy`) or git commit unless the user asks.

## Which model does what (and why it is safe)

| Job | Model | Why |
|---|---|---|
| Research, script | strongest available | quality of facts and story; checks only catch format |
| Storyboard, manifest | Flash | schema errors name the field and the fix |
| Image generation | Nano Banana 2 Lite, paid image key (script) | `generate_assets.py`, up to 4 attempts, no Pro |
| Narration TTS | `gemini-3.8-flash-tts`, free Audio keys (script) | locked voice/prompt/seed; guarded limits |
| Background music | local royalty-free files | `music_library/`, no API |
| Image QA, focal points, frame review | Claude Haiku (script) | runs inside the scripts via `claude -p`; calibrated |
| Prompt rewrite after image QA fail | Claude Sonnet (script) | inside `generate_assets.py` |

The orchestrator never judges images itself unless it can see them. The scripts do.

## Stage reference

`script lint narration music storyboard assets thumbnail crops mix scaffold render qa review`

| Stage | Writes | Cost |
|---|---|---|
| script | script.json (from script_source.txt) | free |
| lint | nothing (numbers, jargon, schema) | free |
| narration | timings.json, narration wav (one TTS take + pacing) | free (Audio keys, 1-2 of 10 daily requests) |
| music | beds picked from `music_library/` + `music_credits.txt` | free |
| storyboard | nothing (checks) | free |
| assets | images, icons, character sheet, focal points | about $0.6-1 (Lite) |
| thumbnail | publish_options.json (3 titles + hooks), thumbnail_option_1..3.jpg | about $0.10-0.20 |
| crops | nothing (side-card check) | free |
| mix | final_mix.wav | free |
| scaffold | scene files | free |
| render | video (local CPU, 1-2 h) | free |
| qa | qa_report.json | free |
| review | frame_review.json, review_frames/ | about $0.10 |

Redo a paid stage only when its input changed; the runner does this for you.

## API keys and free-tier limits (read before rerunning paid or free stages)

- `.env`: `GEMINI_TTS_KEY` (Audio1) and `GEMINI_TTS_KEY_2` (Audio2) are FREE and for narration TTS only.
  `GEMINI_IMAGE_KEY` is PAID and for images only. `scripts/v2/keys.py` enforces both rules.
- Free TTS limits per key per model: 3 requests/minute, 10K tokens/minute, 10 requests/day
  (gemini-3.1-flash-tts, gemini-3.8-flash-lite-tts, gemini-3.8-flash-tts, gemini-2.5-flash-tts).
  The guard keeps 25 s between requests, max 8/day per key per model, and stops after repeated 429s.
- Never loop the narration stage to "try again" quickly; one episode needs 1 request. If it says
  "TTS stopped", wait until the printed time.
- Never write a test script that calls TTS or image APIs in parallel or in a loop.

## Google Drive, Sheets, Docs and Colab (account: kausalmediayt@gmail.com)

- After the one-time sign-in, `make_episode` logs every stage to the Sheet "AI-nimate Pipeline Tracker"
  (tabs Episodes, Stage Log, Uploads) and ends each run by syncing the episode folder in Drive
  `AI-nimate/Channels/<channel>/<id>_<slug>/` (Docs: Script, Research, Episode Log; packaging/, qa/, video/, source/).
  Google problems never fail a run; events are queued in `production/<id>/.google_pending.jsonl`.
- Local log of record: `production/<id>/episode_log.md`.
- Render on Colab instead of locally: `.venv/bin/python motion-canvas/scripts/v2/colab_render.py send <id>`,
  then in Colab open `AI-nimate Colab/AI-nimate Render.ipynb (shared with the Colab account: google_workspace.py share-colab <email>)` and Run all, then
  `colab_render.py status <id>` until done, `colab_render.py fetch <id>`, and `make_episode <id>` (qa, review).
- YouTube: one sign-in per channel: `google_workspace.py login --youtube <channel>`.

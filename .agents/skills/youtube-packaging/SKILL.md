---
name: youtube-packaging
description: Brainstorm and pick YouTube title + thumbnail combos for an AI-nimate episode (Indonesian business explainers, illustrated recurring character). Use when writing @title / @thumbnail_text / @thumbnail_scene, when publish_options.py writes the 3 options, or when the user asks for better titles or thumbnails.
---

# YouTube Packaging (title + thumbnail combos)

Distilled from industry practice: YouTube's own title/thumbnail guidance and Test & Compare, Paddy Galloway's
title patterns, the MrBeast production handbook ("the title and thumbnail are part of the video"), and two
reviewed open skills (ravsau/youtuber-skills `youtube-packaging`, ericosiu/ai-marketing-skills
`packaging-youtube-thumbnails`, read 2026-11-08, not installed). Editorial guidance, not CTR guarantees.

`publish_options.py` gives this whole file to the title writer, so every rule here is live.

## 1. Start from the promise, not the wording

Before any title, write these from the script (one line each):
- **Viewer**: who clicks (e.g. "orang yang kepikiran buka usaha kecil").
- **Question** they have before clicking.
- **Verdict**: the surprising answer the video gives.
- **Proof**: the single most concrete figure or fact that makes it real (must be in numbers.json).
- **Stakes**: what the viewer loses if they get it wrong.

A package that the first 30 seconds of the video does not deliver is a broken promise: retention drops and
YouTube stops recommending it. The opening (chapter 1) must show the same thing the package promises.

## 2. Three different lanes, not three wordings

Every episode gets exactly three packages, each a different **viewer question**:

| Lane | Asks | Title shape | Thumbnail beat |
|---|---|---|---|
| Verdict / contrarian | "What's the surprising answer?" | Belief vs reality ("X? Ternyata Y") | the emotion of the twist |
| Proof / number | "Show me the real numbers" | one hard figure up front | the figure's consequence |
| Utility / stakes | "What should I do / avoid?" | decision or risk the viewer faces | the danger or the choice |

Changing a background, prop or synonym is NOT a new lane. Two options that answer the same question fail.

## 3. Title rules (Indonesian channel)

- Front-load the hook: the first ~40 characters must work alone (mobile truncates). Aim 45-65, hard max 70.
- Plain, spoken Indonesian ("lo" allowed); no English business jargon (the lint blocks capex, margin, ROI,
  revenue, profit...); no ALL CAPS title; no emoji; at most one "?" or ":".
- Searchable entity in the title (the business or topic word people type: "meja mahjong", "bisnis laundry").
- Numbers only from numbers.json, written exactly (Rp45 ribu, 79 persen). One number per title.
- Honest: no claim the video does not make; a simulation stays a simulation ("hitungan", "simulasi").
- Good patterns: "X Ternyata Bukan Y", "<Figure>: <Question>?", "POV: Lo <situation>. <Twist>",
  "Kenapa <surprising fact>?", Galloway-style "<Subject> <result> dalam <time> (<mechanism>)" when true.
- Avoid: "Nobody tells you", "Ultimate guide", "Wajib tahu!!!", stacked superlatives, clickbait questions the
  video does not answer.

## 4. Thumbnail hook (the text on the image)

- 2-4 words, CAPS, max 24 characters. It must NOT repeat the title: the title states the premise, the
  thumbnail adds the second idea (emotion, stakes, contrast).
- Read it with the title: together they form one sentence of curiosity, not two copies.

## 5. Thumbnail concept (what is drawn)

- One focal relationship readable at 320x180 in one second: the recurring character's face (big, clear
  emotion) plus at most ONE story object, or the object alone. Max three visual groups including the text.
- **Copy-off test**: hide the text and describe the picture in one literal sentence. If it does not point at
  the lane's idea, or could mean the opposite, redo it.
- Emotion must match the lane: verdict = shock/disbelief, proof = worry or eyes on the object,
  stakes = serious/knowing look or a warning object.
- Our style rules still apply: flat illustration, no generated text/numbers/logos in the art, plain area on
  the text side, nothing important in the bottom-right corner (YouTube's time badge).
- Conceptual illustration is fine (our character is fictional); never draw something that looks like proof
  (fake receipts, fake dashboards, fake screenshots).

## 6. Score, then pick

Score each package 0-10 on: promise fidelity to the script (25%), hook specificity and stakes (25%),
title-thumbnail complementarity (20%), feed legibility at 168x94 (15%), difference from the channel's recent
uploads (15%). Recommend the highest; keep the other two as YouTube **Test & Compare** variants (upload up to 3
thumbnails in YouTube Studio; it picks the winner by watch time, not raw clicks).

## 7. Hard gates (fail = do not offer)

1. Every figure is in numbers.json; no banned jargon (checked by `lint_episode.mjs --check-texts`).
2. The video's opening delivers the promise.
3. Lanes differ (section 2).
4. Hook does not repeat the title and is 2-4 words.
5. Thumbnail scene passes the copy-off test and the style rules.

## 8. After publishing (when the user shares Studio numbers)

Judge a package only with context: CTR next to impressions, traffic source and average view duration, compared
with the channel's own similar videos after 72 hours. No universal "good CTR". Never change a live title or
thumbnail without the user's explicit OK.

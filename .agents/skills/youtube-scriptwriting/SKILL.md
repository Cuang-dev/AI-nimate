---
name: youtube-scriptwriting
description: Professional YouTube video essay & short-form documentary scriptwriting framework. Enforces investigative curiosity, 3–5s visual anchor cadence, phonetic engineering for TTS/Whisper, explicit visual cue annotations, and anti-slop narrative progression.
---

# YouTube Video Essay Scriptwriting Framework (Short-Form & Explainer)

Unlike TikTok which relies on ephemeral trend sounds and hyper-staccato shouting, YouTube audiences demand **substance, investigative curiosity, and intellectual satisfaction**.

---

## 0. The 5-Stage Chain-of-Thought Scriptwriting Protocol (`thinking-scriptwriter`, Model: "flash")

Before generating `script.json`, the `thinking-scriptwriter` subagent must read `production/<video_id>/research_dossier.md` and write `production/<video_id>/script_cot.md` executing these 5 explicit CoT reasoning stages:

1. **`[CoT Step 1: Pattern-Interrupt Hook Selection]`**:
   - Draft **3 distinct candidate hooks** challenging a viewer assumption in under `<3.5s`.
   - Evaluate against psychological pattern interrupt and select the sharpest opening line with zero throat-clearing.
2. **`[CoT Step 2: 'Therefore / However' Causal Spine]`**:
   - Connect every narrative beat via explicit causal tension questions (*"Therefore"*, *"However"*, *"Because of this"*).
   - Strictly ban chronological "and then" listicles; maintain an unbroken forensic causal chain.
3. **`[CoT Step 3: Semantic Diagram Archetype & Sample-Accurate Visual Cadence Mapping]`**:
   - Assign each beat to one of the **5 Distinct Spatial Diagram Archetypes** (`Scale Chasm / Bar + Caliper`, `Closed-Loop Orthogonal Conduit`, `Dual-Axis Parallel Timeline + Wall`, `Quantitative Slope / Decay Curve`, `3-Tier Architectural Layer Stack`) matching the mechanism of the explanation. Ban generic 2-box repeats.
   - Enforce Sample-Accurate Acoustic-to-Visual Sync (`timings.json` Word Trigger Rule):
     - Every major visual reveal (bar growth, counter tick, conduit draw, wall drop, badge flip) MUST be triggered within `±0.3s` of the exact spoken word timestamp in `timings.json` (never 7–9 seconds premature!).
     - Intermediate micro-cues (axis draw, baseline entry, station pop-in, sub-badge overshoot) MUST fill intervening `2.0s–2.8s` intervals so there is never a static stretch `> 3.0s`.
     - Final visual element finishes at least `>= 2.7s` before `beat.end`.
4. **`[CoT Step 4: Anti-Slop & Oral Cadence Audit]`**:
   - Strip AI cliches (`"Di era modern ini"`, `"Pernahkah Anda berpikir"`, unearned moralizing).
   - Enforce natural breath punctuation (commas, em-dashes `—`, periods) every 4–8 words so Whisper word-level timestamps segment cleanly into `≤4`-word chunks.
5. **`[CoT Step 5: Phonetic & Acronym Engineering]`**:
   - Verify explicit phonetic spelling brackets for all tickers, acronyms, and bilingual terms:
     `[S&P|Es-en-Pi]`, `[W-8BEN|W-delapan-B-E-N]`, `[PMK 18|P-M-K delapan belas]`, `[UU HPP|U-U H-P-P]`, `[Pluang|Plu-ang]`, `[BBCA|B-B-C-A]`, `[VOO|V-O-O]`, `[CSPX|C-S-P-X]`.
   - Embed natural delivery markers: `<breath>`, `<chuckle>`, `<short pause>`.

---

## 1. Sample-Accurate Acoustic-to-Visual Sync & Zero-Dead-Air Cadence

- **Sample-Accurate Word Trigger Rule (`±0.3s`)**: Every major visual reveal (bar growth, counter tick, conduit draw, wall drop, badge flip) MUST trigger within `±0.3s` of the exact spoken word timestamp in `timings.json` (never 7–9 seconds premature!).
- **Intervening Micro-Cue Cadence (2.0s–2.8s intervals)**: Intermediate micro-cues (axis draw, baseline entry, station pop-in, sub-badge overshoot) MUST fill intervening `2.0s–2.8s` intervals (or 6–10 spoken words; 6–8 micro-events in 18–25s beats) so there is never a static stretch `> 3.0s`.
- **Strict Hold-Time Guard (`>= 2.7s` Before Beat End)**: The final visual element and animation in every beat MUST finish at least **`>= 2.7s` before `beat.end`** to allow viewers to absorb the complete spatial diagram before scene transition.
- **Fast 1.0s–1.8s Counters**: Number counter tweens must execute briskly in **1.0s to 1.8s** at the exact timestamp the narrator speaks the figure.
- **Automated QA Verification**: Always run `node scripts/qa_verify.mjs <video_id>` after every render to verify visual cue timestamps, hold times, and absence of static stretches `> 3.0s`.

---

## 2. Phonetic & TTS Cadence Engineering

Neural TTS engines (VoxCPM2, ElevenLabs, Edge-TTS) and Whisper alignment require deliberate phonetic syntax:

1. **Phonetic Hints & Pronunciation Spans**:
   - Always spell out, hyphenate, or provide phonetic brackets for acronyms, tickers, and bilingual financial terms so TTS does not slur:
     - `[S&P|Es-en-Pi]`, `[W-8BEN|W-delapan-B-E-N]`, `[PMK 18|P-M-K delapan belas]`, `[UU HPP|U-U H-P-P]`, `[Pluang|Plu-ang]`, `[BBCA|B-B-C-A]`, `[VOO|V-O-O]`, `[CSPX|C-S-P-X]`, `[BEI|B-E-I]`, `[OJK|O-J-K]`.
2. **Punctuation-Driven Subtitle Segmentation**:
   - Compose in short, punchy clauses punctuated by commas (`,`), em-dashes (`—`), or periods (`.`) every **4 to 8 words**.
   - This ensures Whisper word-level timestamps segment cleanly into `≤4`-word chunks (max 25 characters per subtitle window) without mid-thought breaks or awkward line overflows.
3. **Gemini Vocal Tags**:
   - Insert natural delivery markers: `<breath>`, `<chuckle>`, `<short pause>`.

---

## 3. Explicit `[VISUAL CUE @ phrase]` Annotations

All script outputs (`script.json`) must annotate intermediate sub-cues within each beat, linking spoken trigger phrases to exact visual actions:

```json
{
  "id": "beat_003",
  "archetype": "closed_loop_conduit",
  "narration": "Dividen mengalir ke [US|U-S] terpotong [withholding tax|withholding teks] tiga puluh persen, sebelum masuk kembali ke akun Anda.",
  "visualCues": [
    { "action": "draw_baseline", "target": "axis_cross_border", "phrase": "Dividen mengalir" },
    { "action": "draw_conduit", "target": "conduit_leakage", "phrase": "ke [US|U-S]" },
    { "action": "trigger_counter", "target": "counter_tax_drag", "duration": "1.4s", "phrase": "tiga puluh persen" },
    { "action": "stamp_seal", "target": "seal_friction", "phrase": "masuk kembali" }
  ]
}
```

Available visual cue actions:
- `draw_baseline`: Enter diagram base axes, timelines, or frame (`opacity: 0 -> 1`, `scale: 0.95 -> 1.0`).
- `pop_station`: Pop-in a node, entity badge, or institution mark (`scale: 0 -> 1.15 -> 1.0`).
- `draw_conduit`: Animate orthogonal line `<Line end={0->1}>` showing flow direction.
- `trigger_counter`: Run a fast number counter tween (strictly **1.0s to 1.8s**).
- `drop_wall`: Slam a statutory barrier, collision wall, or caliper bracket.
- `stamp_seal`: Slam a warning/status seal (e.g. `JEBAKAN PAJAK`, `100% EXEMPT`).
- `dim_inactive`: Dim inactive nodes to `0.22` opacity to shift focal attention.

---

## 4. Semantic Diagram Archetypes (Ban Generic 2-Box Repeats)

Ground narrative explanations in one of the **5 Distinct Spatial Diagram Archetypes** that physically acts out the mechanism of the beat:
1. **Scale Chasm / Bar + Caliper**: Visualizing quantitative disparities (e.g., *0.03% expense ratio headline vs 30% dividend withholding + 40% estate tax chasm*).
2. **Closed-Loop Orthogonal Conduit**: Tracing circular economic mechanisms (e.g., *dividend cashflows routing through Dublin tax treaties vs direct US withholding leakage*).
3. **Dual-Axis Parallel Timeline + Wall**: Contrasting divergent trajectories and deadlines (e.g., *10-year compounding growth colliding with statutory $60k estate tax threshold*).
4. **Quantitative Slope / Decay Curve**: Explaining non-linear threshold effects (e.g., *effective tax drag curve steepening exponentially with account balance*).
5. **3-Tier Architectural Layer Stack**: Revealing structural plumbing (e.g., *broker custody layer -> clearing house -> sovereign tax jurisdiction*).

Strictly ban repeating generic 2-box dashboard cards across consecutive beats.

---

## 5. The Documentary Curiosity Architecture (60s)

```
[0s - 4s]   ──► The Concrete Anomaly (A real-world paradox or baffling number)
[4s - 15s]  ──► The Physical Evidence (Show the filing, statutory clause, or trading screen)
[15s - 35s] ──► The Business/Tax Engine (How the math or incentive structure actually operates)
[35s - 50s] ──► The Grand Reveal / Contrast (Side-by-side numeric shock comparison)
[50s - 60s] ──► The Hard-Hitting Landing (The systemic reality; zero moralizing)
```

### Stage 1: The Concrete Anomaly (0–4s)
- Drop straight into an economic or legal contradiction.
- *Example*: *"Banyak yang pamer beli saham US di aplikasi, padahal mereka nggak sadar ada jebakan pajak tersembunyi sampai empat puluh persen."*

### Stage 2: The Physical Evidence (4–15s)
- Cite verified statutes and tickers.
- *Example*: *"Berdasarkan US Internal Revenue Code section dua ribu seratus satu, warga non-US kena estate tax sampai 40% untuk aset di atas enam puluh ribu dolar."*

### Stage 3: The Engine / The Mechanism (15–35s)
- Dissect the cash leakage step-by-step with 3–5s visual triggers.

### Stage 4: The Grand Reveal & Contrast (35–50s)
- Present the side-by-side numeric contrast pair (US domicile vs Irish UCITS).

### Stage 5: The Hard-Hitting Landing (50–60s)
- Conclude on the concrete structural truth. Zero generic motivational lessons.

---

## 6. Layman & Non-Investor Accessibility (Zero Unexplained Jargon)

- **Series Brand & TTS Rule**:
  - Series brand is **`Knp?`** in video titles and top-left stage badges (`KNP? // 01: [BEAT TITLE]`).
  - In `spoken_text` (fed to AI TTS), **ALWAYS write the full spoken word `"kenapa"`** (never `"K-N-P"`).
- **Target Audience & Mental Model**:
  - Assume the viewer has **zero background in finance or stock trading**.
  - They should understand every causal link on first listen without feeling alienated by financial jargon.
- **Ban Unexplained Stock-Bro Jargon**:
  - Never use raw market jargon or acronyms (*free float, ARB, trading halt, capex, rebalancing, outflow, FIF, PBV, PER, Emerging Market, Standalone Market*) without immediately translating them into a concrete, everyday real-life analogy:
    - *MSCI* -> *"wasit bursa saham dunia yang nentuin negara mana yang layak dimasuki uang triliunan rupiah dari luar negeri"*.
    - *Emerging to Standalone* -> *"ibarat dari liga utama dunia, Indonesia terancam diturunkan paksa ke kasta terendah—selevel negara yang lagi krisis berat"*.
    - *Free Float* -> *"saham yang beneran dijual bebas ke warga biasa"*.
    - *ARB / Crash* -> *"harga saham ambruk mentok batas bawah berhari-hari"*.
    - *Outflow* -> *"investor asing panik tarik uang triliunan rupiah"*.
- **Plain Indonesian Diagram Labels**:
  - On-screen diagram labels, card titles, and pills **MUST use plain Indonesian words first**, never obscure English financial abbreviations.


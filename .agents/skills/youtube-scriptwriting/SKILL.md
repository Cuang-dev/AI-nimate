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
3. **`[CoT Step 3: Zero-Dead-Air Visual Cadence & Micro-Choreography Mapping]`**:
   - Map every 4–8 word spoken clause to a concrete visual state change (card entry, badge flip, 1.0s–1.8s counter, or warning stamp).
   - Enforce the Zero-Dead-Air Visual Cadence Rule: trigger a concrete visual state change or progressive sub-cue reveal every **2.5s to 3.5s** (or 6–10 spoken words; 6–8 micro-events in 18–25s beats).
   - Strictly ban visual stagnation (>3.5s without visual arrivals) and 10–15s expository dead waits.
4. **`[CoT Step 4: Anti-Slop & Oral Cadence Audit]`**:
   - Strip AI cliches (`"Di era modern ini"`, `"Pernahkah Anda berpikir"`, unearned moralizing).
   - Enforce natural breath punctuation (commas, em-dashes `—`, periods) every 4–8 words so Whisper word-level timestamps segment cleanly into `≤4`-word chunks.
5. **`[CoT Step 5: Phonetic & Acronym Engineering]`**:
   - Verify explicit phonetic spelling brackets for all tickers, acronyms, and bilingual terms:
     `[S&P|Es-en-Pi]`, `[W-8BEN|W-delapan-B-E-N]`, `[PMK 18|P-M-K delapan belas]`, `[UU HPP|U-U H-P-P]`, `[Pluang|Plu-ang]`, `[BBCA|B-B-C-A]`, `[VOO|V-O-O]`, `[CSPX|C-S-P-X]`.
   - Embed natural delivery markers: `<breath>`, `<chuckle>`, `<short pause>`.

---

## 1. Zero-Dead-Air Visual Cadence (The 2.5s–3.5s Rule)

- **Mandatory Visual Trigger Rate**: Every sentence or clause **must trigger a concrete visual state change or progressive sub-cue every 2.5 to 3.5 seconds** (or 6–10 spoken words; 6–8 micro-events in 18–25s beats).
- **Prohibition on Visual Stagnation**: Strictly ban long >3.5s periods without visual arrivals and 10–15 second expository paragraphs where a single figure or entity is mentioned only at the very end. This starves the visual stage, causing dead visual waits or 12-second slow tickers.
- **Progressive Beat Decomposition**: Break explanations into progressive visual steps:
  1. *0–2.5s*: Introduce the subject or instrument -> reveals primary card / icon (`[data-subcue-progress="0.0"]`).
  2. *2.5–5.0s*: Explain the regulatory or fee rule -> flips rate badge / label (`[data-subcue-progress="0.25"]`).
  3. *5.0–7.5s*: Hit the empirical number -> triggers fast 1.0s–1.8s counter (`[data-subcue-progress="0.50"]`).
  4. *7.5–10.5s*: Contrast with the alternative -> reveals side-by-side contrast card (`[data-subcue-progress="0.75"]`).

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
  "narration": "Saham lokal seperti [BBCA|B-B-C-A] kena pajak final 0.1%, tapi aset US seperti [VOO|V-O-O] kena tarif progresif hingga 35%.",
  "visualCues": [
    { "action": "reveal_card", "target": "card_domestic", "phrase": "Saham lokal seperti [BBCA|B-B-C-A]" },
    { "action": "flip_badge", "target": "badge_domestic_tax", "phrase": "kena pajak final 0.1%" },
    { "action": "reveal_card", "target": "card_us", "phrase": "tapi aset US seperti [VOO|V-O-O]" },
    { "action": "trigger_counter", "target": "counter_us_tax", "duration": "1.2s", "phrase": "tarif progresif hingga 35%" }
  ]
}
```

Available visual cue actions:
- `reveal_card`: Enter a new focal card (`opacity: 0 -> 1`, `scale: 0.95 -> 1.0`).
- `flip_badge`: Update or highlight a metric/category badge.
- `trigger_counter`: Run a fast number counter tween (strictly **1.0s to 1.8s**).
- `stamp_seal`: Slam a warning/status seal (e.g. `JEBAKAN PAJAK`, `100% EXEMPT`).
- `dim_card`: Dim an existing card to `0.22` opacity to shift focal attention.

---

## 4. Concrete Contrast Pairs (2-Card Comparative Logic)

Ground narrative explanations in side-by-side numeric contrast pairs:
- **Status Quo / Illusion**: What retail investors believe (e.g., *"VOO biaya cuma 0.03%"*).
- **Forensic Reality / Optimized Alternative**: The hidden friction or optimized route (e.g., *"kena withholding tax 30% dan risiko estate tax 40%; bandingkan dengan Irish UCITS CSPX yang kena 15% treaty dan 0% estate tax"*).

This gives the animator immediate 2-card comparison data without cluttering the screen with dense paragraphs.

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

# Universal Voice Cloning & Phonetic Calibration Scripts

This guide defines the standardized recording parameters and universal 3-phase phonetic calibration scripts required to train, fine-tune, or zero-shot clone voice profiles for high-retention bilingual documentary production (English + Bahasa Indonesia) across VoxCPM2, Qwen3-TTS, IndexTTS2, and ElevenLabs.

---

## 1. Studio Recording Specifications (SSOT)

To guarantee artifact-free neural timbre alignment, acoustic frequency coverage, and sample-accurate Whisper timestamping, all raw voice calibration recordings must conform to:

| Parameter | Specification | Tolerance / Standards |
| :--- | :--- | :--- |
| **Sample Rate** | `48,000 Hz (48 kHz)` | Native, un-resampled |
| **Bit Depth** | `24-bit PCM` | Fixed-point uncompressed |
| **Channel Layout** | `Mono (1.0)` | Single microphone capsule |
| **Audio Format** | `Broadcast WAV (.wav)` | Uncompressed PCM, zero lossy transcode |
| **Integrated Loudness** | `-18.0 LUFS` | `±1.0 LUFS` (ITU-R BS.1770-4) |
| **True Peak Ceiling** | `-1.0 dBFS` | Maximum headroom safety |
| **Noise Floor** | `< -60 dBFS` | Acoustic booth / treated room |
| **Microphone Distance** | `15 cm – 20 cm` | On-axis, pop-filter equipped |
| **Room Acoustics** | `RT60 < 0.2s` | Completely dry, zero room flutter/reverb |

---

## 2. Phase 1: English 44-Phoneme Matrix (Coverage Calibration)

This passage is phonetically engineered to exercise all 44 phonemes of standard contemporary English (short vowels, long vowels, diphthongs, stops, fricatives, affricates, nasals, liquids, and glides) across varied vocal registers, plosive transitions, and rhythmic tempos.

### Calibration Script 1 (English)

> "The quick brown fox jumps over the lazy dog while five boxing wizards jump quickly.
> Beyond the harbor's shallow rim, twelve heavy gray ships weighed anchor under a pale winter moon. The chief engineer scrutinized every gauge, checking pressure valves, bronze gears, and fragile thermal circuits with measured precision.
> 'Listen closely,' he whispered, adjusting the audio sensor until the strange acoustic frequency surged through the quartz speaker.
> A sharp click echoed across the vast metal chamber. Neither joy nor fear moved his weathered face; only calm curiosity endured as the automated machinery whirred smoothly back to life."

#### Phonetic Coverage Checklist
- **Monophthongs**: /iː/ (fleet), /ɪ/ (rim), /e/ (heavy), /æ/ (anchor), /ɑː/ (harbor), /ɒ/ (box), /ɔː/ (pale), /ʊ/ (stood), /uː/ (moon), /ʌ/ (jump), /ɜː/ (circuit), /ə/ (precision).
- **Diphthongs**: /eɪ/ (gray), /aɪ/ (five), /ɔɪ/ (joy), /aʊ/ (brown), /əʊ/ (echoed), /ɪə/ (gear), /eə/ (chamber), /ʊə/ (cure).
- **Consonants**: Complete plosives (/p, b, t, d, k, g/), fricatives (/f, v, θ, ð, s, z, ʃ, ʒ, h/), affricates (/tʃ, dʒ/), nasals (/m, n, ŋ/), liquids (/l, r/), and semivowels (/w, j/).

---

## 3. Phase 2: Bahasa Indonesia 33-Phoneme Matrix (Local Articulation)

This passage spans all 33 phonemes of standard Indonesian, including 6 monophthongs (/a, i, u, e, o, ə/), 3 diphthongs (/ai, au, oi/), dental stops, rolled alveolar trills (/r/), palatal nasals (/ny/), velar nasals (/ng/), and loan consonants (/f, v, z, sy, kh/) common in legal, regulatory, and capital market terminology.

### Calibration Script 2 (Bahasa Indonesia)

> "Pagi itu, sepoi angin pantai mengayunkan lambaian nyiur di tepian teluk yang sunyi. Seorang penyelidik keuangan memeriksa lembaran berkas audit dengan cermat, meneliti setiap klausul undang-undang dan rincian transaksi valuta asing.
> Khusus untuk kasus pembagian dividen bernilai triliunan rupiah, pihak otoritas pajak mendeteksi kejanggalan pada struktur kepemilikan saham lintas batas.
> 'Coba perhatikan selisih angka ini,' tegasnya sambil menunjuk grafik fluktuasi pasar modal yang menurun drastis.
> Fakta empiris membuktikan bahwa tanpa kepatuhan yuridis yang transparan, ilusi keuntungan instan hanya akan menyisakan jerat kewajiban fiskal yang amat mencekik."

#### Phonetic Coverage Checklist
- **Monoftong**: /a/ (pantai), /i/ (sunyi), /u/ (teluk), /e/ (berkas), /o/ (otoritas), /ə/ (cermat).
- **Diftong**: /ai/ (pantai, lambaian), /au/ (klausul), /oi/ (sepoi).
- **Konsonan Khusus & Serapan**: /ny/ (nyiur, menunjuk), /ng/ (keuangan, kejanggalan), /r/ alveolar trill (rincian, drastis), /kh/ (khusus), /f/ & /v/ (fluktuasi, dividen, valuta), /z/ & /sy/ (syarat, izin).

---

## 3. Phase 3: Bilingual Code-Switching Bridge (Financial/Tech Documentary)

The hardest challenge for bilingual neural TTS models (e.g., VoxCPM2, ElevenLabs) is transitioning smoothly between Indonesian sentence syntax and English corporate names, tickers, tax forms, and acronyms without acoustic dropouts, pronunciation stutters, or unnatural pitch spikes.

### Calibration Script 3 (Bilingual Bridge)

> "Banyak investor ritel di Jakarta merasa bangga ketika berhasil membeli saham Apple atau [VOO|V-O-O] langsung lewat aplikasi broker global. Mereka mengira biaya transaksi cuma nol koma nol tiga persen dari expense ratio.
> Tapi coba buka formulir [W-8BEN|W-delapan-B-E-N]. Di sana tertulis jelas bahwa pemerintah Amerika Serikat memungut withholding tax sebesar tiga puluh persen untuk setiap pembagian dividen tunai.
> Bahkan jika aset portofolio lu tembus di atas enam puluh ribu dolar, United States Internal Revenue Service di bawah [IRC §2101|I-R-C pasal dua ribu seratus satu] bisa mengenakan estate tax hingga empat puluh persen.
> Solusi cerdasnya bukan menghindari pasar global, melainkan memanfaatkan instrumen [Irish UCITS ETF|Irish U-C-I-T-S E-T-F] seperti [CSPX|C-S-P-X] yang terlindungi tax treaty lima belas persen dan bebas pajak warisan."

#### Code-Switching Evaluation Points
1. **Acronym Stability**: Clean pronunciation of `VOO`, `W-8BEN`, `IRC §2101`, `UCITS`, and `CSPX` without swallowing syllables.
2. **Bilingual Boundary Transitions**: Smooth prosody transition between Indonesian connecting words (`lewat aplikasi`, `di bawah`, `bebas pajak`) and English financial nouns (`expense ratio`, `withholding tax`, `estate tax`, `tax treaty`).
3. **Number & Percent Dynamics**: Natural spoken cadence on numeric statistics (`nol koma nol tiga persen`, `tiga puluh persen`, `enam puluh ribu dolar`, `empat puluh persen`).

---

## 4. Post-Recording Preprocessing Checklist

Before submitting voice calibration WAVs to model training or fine-tuning pipelines:

1. **Trim Silence**: Trim head/tail silence to exactly `200ms`.
2. **De-Click & De-Ess**: Apply gentle transparent de-clicking (RX De-click) and de-essing on sibilants around `5.5 kHz – 8 kHz`.
3. **Loudness Normalization**: Normalize to `-18.0 LUFS` using 2-pass ITU-R BS.1770 filter with true peak locked at `-1.0 dBFS`.
4. **No Artificial Noise Reduction**: Do NOT apply aggressive noise reduction or frequency gates that create phase smearing in voice cloning latent spaces.

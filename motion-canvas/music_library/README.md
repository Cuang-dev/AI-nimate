# Music library (royalty-free beds)

One folder per chapter mood: `tense/`, `light/`, `warm/`. Put 1 or more tracks in each
(`.mp3 .wav .ogg .flac .m4a`), instrumental, calm enough to sit under narration, ideally loopable.

Every track needs a sidecar file with the same name plus `.license.txt`:

```
source: https://pixabay.com/music/...        (where you downloaded it)
license: Pixabay Content License             (exact license name)
attribution: none                            (or the credit line the license requires)
```

`scripts/v2/generate_music.py` refuses tracks without it, picks one track per mood per episode
(deterministic from the episode id), and writes the credit lines to
`production/<id>/music_credits.txt` for the YouTube description.

Only use sources whose license allows monetized YouTube use without Content ID claims
(e.g. YouTube Audio Library "no attribution required" tracks). Check the license page of each track.

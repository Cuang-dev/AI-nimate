"""API keys by purpose, and a guard that keeps the free TTS keys inside their published limits.

Purposes and keys (environment or repo .env; never printed, sent only as a header):
    tts   -> GEMINI_TTS_KEY (Audio1), GEMINI_TTS_KEY_2 (Audio2)   free tier, narration ONLY
    image -> GEMINI_IMAGE_KEY (paid), else NANO_BANANA_API_KEY    images ONLY
The two purposes can never share a key: api_key() refuses if an image key equals a TTS key, and
tts_key() only ever returns one of the two TTS keys. Background music is local royalty-free files,
so no music API is used at all.

Free-tier limits (per key, per TTS model, from the user's AI Studio quota page, 2026-11-08):
    gemini-3.1-flash-tts      3 RPM  10K TPM  10 RPD
    gemini-3.8-flash-lite-tts 3 RPM  10K TPM  10 RPD
    gemini-3.8-flash-tts      3 RPM  10K TPM  10 RPD
    gemini-2.5-flash-tts      3 RPM  10K TPM  10 RPD
We stay under them with margin: one request at a time per key, >= 25 s between requests on a key
(3 RPM allows 20 s), at most 8 requests per key per model per rolling 24 h (limit 10), and a request
whose input is estimated over 9,000 tokens is refused before sending (limit 10K TPM).
On HTTP 429 we wait on the SAME key (60 s, 180 s, 420 s) and then stop. We never answer a 429 by
switching keys. The second key is used only when the first has spent its daily budget for that model.

Ledger (timestamps only, keys stored as a short hash): ~/.cache/ainimate/api_usage.json
"""
import contextlib
import fcntl
import hashlib
import json
import os
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
TTS_KEY_NAMES = ["GEMINI_TTS_KEY", "GEMINI_TTS_KEY_2"]
IMAGE_KEY_NAMES = ["GEMINI_IMAGE_KEY", "NANO_BANANA_API_KEY"]

FREE_LIMITS = {"rpm": 3, "tpm": 10_000, "rpd": 10}   # every free TTS model, per key
MIN_GAP = 25.0                                        # s between requests on one key (3 RPM -> 20 s)
DAILY_CAP = 8                                         # of 10 RPD
MAX_INPUT_TOKENS = 9_000                              # of 10K TPM
BACKOFF_429 = [60, 180, 420]
STATE_DIR = Path(os.environ.get("AINIMATE_STATE_DIR", Path.home() / ".cache" / "ainimate"))


class QuotaStop(RuntimeError):
    """A free-tier limit is reached: stop and retry later. Never work around it with another key."""


def _dotenv():
    out = {}
    p = REPO / ".env"
    if p.exists():
        for line in p.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip().strip("\"'")
    return out


def _get(names):
    env = _dotenv()
    return [v for v in (os.environ.get(n) or env.get(n) for n in names) if v]


def _tts_keys():
    ks = list(dict.fromkeys(_get(TTS_KEY_NAMES)))
    if not ks:
        raise SystemExit("no TTS key: set GEMINI_TTS_KEY (and GEMINI_TTS_KEY_2) in .env")
    return ks


def api_key(purpose):
    """Only 'image' here; TTS keys come from tts_key() so the free-tier guard is always applied."""
    if purpose != "image":
        raise ValueError(f"api_key({purpose!r}): only 'image'; use tts_key() for narration")
    ks = _get(IMAGE_KEY_NAMES)
    if not ks:
        raise SystemExit("no image key: set GEMINI_IMAGE_KEY in .env")
    if ks[0] in _get(TTS_KEY_NAMES):
        raise SystemExit("GEMINI_IMAGE_KEY equals a TTS key; images must use the paid image key only")
    return ks[0]


def _kid(key, model):
    return hashlib.sha256(key.encode()).hexdigest()[:8] + ":" + model.split("/")[-1]


@contextlib.contextmanager
def _ledger():
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    with open(STATE_DIR / "api_usage.lock", "w") as lf:
        fcntl.flock(lf, fcntl.LOCK_EX)
        try:
            p = STATE_DIR / "api_usage.json"
            d = json.loads(p.read_text()) if p.exists() else {}
            yield d
            p.write_text(json.dumps(d))
        finally:
            fcntl.flock(lf, fcntl.LOCK_UN)


def usage(model):
    """Calls in the last 24 h per TTS key (index 1, 2) for this model."""
    now = time.time()
    with _ledger() as d:
        return {i + 1: len([t for t in d.get(_kid(k, model), []) if now - t < 86400])
                for i, k in enumerate(_tts_keys())}


@contextlib.contextmanager
def tts_key(model, input_text):
    """Yield the key to use for ONE TTS request, after waiting for the spacing rule.
    Picks Audio1 unless it has used its daily budget for this model, then Audio2."""
    est = len(input_text) // 3 + 200  # generous token estimate for Indonesian text + prompt
    if est > MAX_INPUT_TOKENS:
        raise QuotaStop(f"input is ~{est} tokens; free tier allows {FREE_LIMITS['tpm']} per minute. "
                        "Shorten the script or split narration (one request per minute).")
    keys = _tts_keys()
    now = time.time()
    with _ledger() as d:
        live = {k: [t for t in d.get(_kid(k, model), []) if now - t < 86400] for k in keys}
    choice = next((k for k in keys if len(live[k]) < DAILY_CAP), None)
    if choice is None:
        soonest = min(min(v) for v in live.values()) + 86400
        raise QuotaStop(f"both TTS keys used {DAILY_CAP} requests for {model} in 24 h; next slot after "
                        f"{time.ctime(soonest)}")
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    slot = open(STATE_DIR / f"tts_{_kid(choice, model).replace(':', '_')}.slot", "w")
    fcntl.flock(slot, fcntl.LOCK_EX)  # one request per key at a time, across processes
    try:
        while True:
            with _ledger() as d:
                k = _kid(choice, model)
                calls = [t for t in d.get(k, []) if time.time() - t < 86400]
                wait = max(calls) + MIN_GAP - time.time() if calls else 0
                if wait <= 0:
                    d[k] = calls + [time.time()]
                    break
            print(f"  [TTS key {keys.index(choice) + 1}] spacing requests ({FREE_LIMITS['rpm']} RPM), "
                  f"waiting {wait:.0f}s", flush=True)
            time.sleep(wait)
        print(f"  [TTS key {keys.index(choice) + 1}] request {len(calls) + 1}/{DAILY_CAP} today for "
              f"{model.split('/')[-1]}", flush=True)
        yield choice
    finally:
        fcntl.flock(slot, fcntl.LOCK_UN)
        slot.close()


def quota_backoff(attempt, http_code):
    """After a failed request: seconds to wait before retrying on the same key, or QuotaStop."""
    if http_code == 429:
        if attempt >= len(BACKOFF_429):
            raise QuotaStop("rate-limited (429) repeatedly; stopping. Do not switch keys; retry later.")
        return BACKOFF_429[attempt]
    return min(10 * (attempt + 1), 60)

#!/usr/bin/env python3
"""Google Drive / Docs / Sheets mirror of the pipeline, owned by the channel's Google account.

    google_workspace.py login                       one-time sign-in (Drive/Docs/Sheets)
    google_workspace.py login --youtube <channel>   one-time sign-in per YouTube channel (brand account)
    google_workspace.py init                        create AI-nimate/ folders + the tracker sheet
    google_workspace.py event <vid> <stage> <status> [message] [seconds]   log one stage run
    google_workspace.py push <vid>                  sync docs + files of one episode to Drive
    google_workspace.py share-colab <email>         share ONLY "AI-nimate Colab" with the Colab account (editor)
    google_workspace.py status                      show the Drive layout and links

Layout in Drive (account from the consent screen, e.g. kausalmediayt@gmail.com):
  AI-nimate/
    AI-nimate Pipeline Tracker   (Sheet: Episodes, Stage Log, Uploads)
    Channels/<channel>/<vid>_<slug>/  Script, Research, Episode Log (Docs) + packaging/ qa/ video/
    AI-nimate Colab/             render notebook + jobs; shared with the account that has Colab credits
Scope: full Drive (Colab writes render outputs as the user; drive.file could not read them back). Credentials and ids live in
~/.config/ainimate/ (google_client_secret.json, google_token.json, google_ids.json), never in the repo.
Every call is best effort from the pipeline's point of view: make_episode never fails because of Google.
"""
import hashlib
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

MC = Path(__file__).resolve().parents[2]
REPO = MC.parent
CFG = Path.home() / ".config" / "ainimate"
SECRET = CFG / "google_client_secret.json"
TOKEN = CFG / "google_token.json"
IDS = CFG / "google_ids.json"
SCOPES = ["https://www.googleapis.com/auth/drive"]  # full Drive: Colab writes render outputs as the user
YT_SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.force-ssl"]
FOLDER = "application/vnd.google-apps.folder"
DOC = "application/vnd.google-apps.document"
SHEET = "application/vnd.google-apps.spreadsheet"
TABS = {
    "Dashboard": None,  # formulas only, see DASHBOARD
    "Episodes": ["video_id", "channel", "title", "stage", "status", "updated", "script_version", "folder", "script",
                 "research", "log", "video", "qa", "frame_review", "est_google_cost_usd", "youtube",
                 "chosen_title", "chosen_thumbnail"],
    "Script Versions": ["time", "video_id", "version", "words", "sentences", "changes", "doc", "sha"],
    "Packaging": ["video_id", "package", "lane", "score", "recommended", "title", "thumbnail_text", "thumbnail",
                  "chosen"],
    "Stage Log": ["time", "video_id", "stage", "status", "seconds", "message", "host"],
    "Uploads": ["time", "video_id", "channel", "youtube_url", "privacy", "title_option", "thumbnail_option"],
}
DASHBOARD = [
    ["AI-nimate Pipeline", ""],
    ["Episodes", "=COUNTA(Episodes!A2:A)"],
    ["Done (stage review ok)", '=COUNTIFS(Episodes!D2:D,"review",Episodes!E2:E,"ok")'],
    ["Failed (last stage)", '=COUNTIF(Episodes!E2:E,"FAILED")'],
    ["On YouTube", '=COUNTIF(Episodes!P2:P,"http*")'],
    ["Est. Google image cost (USD)", "=SUM(Episodes!O2:O)"],
    ["Stage failures, last 7 days", '=COUNTIFS(\'Stage Log\'!D2:D,"FAILED",\'Stage Log\'!A2:A,">="&TEXT(NOW()-7,"yyyy-mm-dd"))'],
    ["", ""],
    ["Latest stage runs", ""],
    ['=QUERY(\'Stage Log\'!A:F,"select * where A is not null order by A desc limit 15",1)', ""],
]
LITE_IMAGE_USD = 0.034


# ------------------------------------------------------------------ auth
def credentials(scopes=SCOPES, token=TOKEN, interactive=False):
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    creds = Credentials.from_authorized_user_file(str(token), scopes) if token.exists() else None
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    if not creds or not creds.valid:
        if not interactive:
            raise RuntimeError(f"not signed in: run google_workspace.py login ({token.name})")
        if not SECRET.exists():
            sys.exit(f"missing {SECRET}: download the OAuth 'Desktop app' client JSON there (see setup steps)")
        flow = InstalledAppFlow.from_client_secrets_file(str(SECRET), scopes)
        print("Open the URL below in the browser signed in to the channel account "
              "(SSH tunnel for port 8765 must be up).", flush=True)
        creds = flow.run_local_server(port=8765, open_browser=False, prompt="consent",
                                       bind_addr="0.0.0.0")  # reachable through a forward to the server's LAN IP
    CFG.mkdir(parents=True, exist_ok=True)
    token.write_text(creds.to_json())
    token.chmod(0o600)
    return creds


def services():
    from googleapiclient.discovery import build
    c = credentials()
    return (build("drive", "v3", credentials=c, cache_discovery=False),
            build("sheets", "v4", credentials=c, cache_discovery=False))


def load_ids():
    return json.loads(IDS.read_text()) if IDS.exists() else {}


def save_ids(d):
    CFG.mkdir(parents=True, exist_ok=True)
    IDS.write_text(json.dumps(d, indent=2))


# ------------------------------------------------------------------ drive helpers
def ensure_folder(drive, name, parent=None, ids=None, key=None):
    if ids is not None and key and ids.get(key):
        return ids[key]
    q = f"name = '{name}' and mimeType = '{FOLDER}' and trashed = false" + (f" and '{parent}' in parents" if parent else "")
    found = drive.files().list(q=q, fields="files(id)", spaces="drive").execute().get("files", [])
    fid = found[0]["id"] if found else drive.files().create(
        body={"name": name, "mimeType": FOLDER, **({"parents": [parent]} if parent else {})}, fields="id").execute()["id"]
    if ids is not None and key:
        ids[key] = fid
    return fid


def md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def put_file(drive, path, parent, name=None, as_doc=False, known=None):
    """Create or update one file in `parent`. as_doc imports Markdown as a Google Doc.
    Skips the upload when the content did not change. Returns (file id, webViewLink)."""
    from googleapiclient.http import MediaFileUpload
    path = Path(path)
    name = name or path.name
    mime = "text/markdown" if path.suffix == ".md" else None
    cache_key = f"{parent}/{name}"
    digest = md5(path)
    if known is not None and known.get(cache_key, {}).get("md5") == digest:
        return known[cache_key]["id"], known[cache_key]["link"]
    q = f"name = '{name}' and '{parent}' in parents and trashed = false"
    found = drive.files().list(q=q, fields="files(id)", spaces="drive").execute().get("files", [])
    media = MediaFileUpload(str(path), mimetype=mime, resumable=path.stat().st_size > 5_000_000)
    if found:
        f = drive.files().update(fileId=found[0]["id"], media_body=media, fields="id,webViewLink").execute()
    else:
        body = {"name": name, "parents": [parent]}
        if as_doc:
            body["mimeType"] = DOC
        f = drive.files().create(body=body, media_body=media, fields="id,webViewLink").execute()
    if known is not None:
        known[cache_key] = {"id": f["id"], "link": f["webViewLink"], "md5": digest}
    return f["id"], f["webViewLink"]


# ------------------------------------------------------------------ setup
def link(url, label):
    return f'=HYPERLINK("{url}","{label}")' if url else ""


def init():
    drive, sheets = services()
    ids = load_ids()
    root = ensure_folder(drive, "AI-nimate", ids=ids, key="root")
    ensure_folder(drive, "Channels", root, ids, "channels")
    ensure_folder(drive, "AI-nimate Colab", root, ids, "colab")  # shared with the Colab account (share-colab)
    if not ids.get("tracker"):
        ss = sheets.spreadsheets().create(body={
            "properties": {"title": "AI-nimate Pipeline Tracker"},
            "sheets": [{"properties": {"title": t, "gridProperties": {"frozenRowCount": 0 if t == "Dashboard" else 1}}}
                       for t in TABS],
        }, fields="spreadsheetId,spreadsheetUrl,sheets.properties").execute()
        drive.files().update(fileId=ss["spreadsheetId"], addParents=root, fields="id").execute()
        ids["tracker"], ids["tracker_url"] = ss["spreadsheetId"], ss["spreadsheetUrl"]
        ids["tabs"] = {sh["properties"]["title"]: sh["properties"]["sheetId"] for sh in ss["sheets"]}
        data = [{"range": f"'{t}'!A1", "values": [cols]} for t, cols in TABS.items() if cols]
        data.append({"range": "'Dashboard'!A1", "values": DASHBOARD})
        sheets.spreadsheets().values().batchUpdate(spreadsheetId=ss["spreadsheetId"], body={
            "valueInputOption": "USER_ENTERED", "data": data}).execute()
        fmt = []
        for t, sid in ids["tabs"].items():
            if TABS[t]:
                fmt.append({"repeatCell": {"range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
                            "cell": {"userEnteredFormat": {"textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}},
                                                           "backgroundColor": {"red": 0.13, "green": 0.2, "blue": 0.33}}},
                            "fields": "userEnteredFormat(textFormat,backgroundColor)"}})
                fmt.append({"autoResizeDimensions": {"dimensions": {"sheetId": sid, "dimension": "COLUMNS",
                                                                    "startIndex": 0, "endIndex": len(TABS[t])}}})
        for t, col in (("Episodes", TABS["Episodes"].index("status")), ("Stage Log", TABS["Stage Log"].index("status"))):
            for word, rgb in (("ok", (0.85, 0.95, 0.85)), ("FAILED", (0.98, 0.82, 0.82)), ("adopted", (0.9, 0.92, 0.97))):
                fmt.append({"addConditionalFormatRule": {"index": 0, "rule": {
                    "ranges": [{"sheetId": ids["tabs"][t], "startRowIndex": 1, "startColumnIndex": col, "endColumnIndex": col + 1}],
                    "booleanRule": {"condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": word}]},
                                    "format": {"backgroundColor": dict(zip(("red", "green", "blue"), rgb))}}}}})
        fmt.append({"repeatCell": {"range": {"sheetId": ids["tabs"]["Dashboard"], "startRowIndex": 0, "endRowIndex": 1},
                    "cell": {"userEnteredFormat": {"textFormat": {"bold": True, "fontSize": 16}}},
                    "fields": "userEnteredFormat.textFormat"}})
        sheets.spreadsheets().batchUpdate(spreadsheetId=ss["spreadsheetId"], body={"requests": fmt}).execute()
    save_ids(ids)
    print(f"Drive folder: https://drive.google.com/drive/folders/{root}\nTracker: {ids['tracker_url']}")


# ------------------------------------------------------------------ episode helpers
def episode_meta(vid):
    prod = MC / "production" / vid
    script = json.loads((prod / "script.json").read_text()) if (prod / "script.json").exists() else {}
    reg = json.loads((REPO / "projects" / "projects_config.json").read_text())
    entry = next((p for p in reg["projects"].values() if p.get("id") == vid), {})
    return prod, script, entry


def est_cost(prod):
    try:
        q = json.loads((prod / "asset_qa.json").read_text())
    except (OSError, json.JSONDecodeError):
        return ""
    calls = sum(v.get("attempts", 1) for v in q.get("images", {}).values())
    calls += sum(v.get("attempts", 1) for v in q.get("characters", {}).values())
    calls += sum(v.get("attempts", 1) for v in q.get("icon_sets", {}).values())
    calls += sum(len(r.get("candidates", [])) for r in q.get("thumbnail", {}).get("rounds", []))
    return round(calls * LITE_IMAGE_USD, 2)


def append_log_md(prod, line):
    f = prod / "episode_log.md"
    if not f.exists():
        f.write_text(f"# Episode log: {prod.name}\n\nEvery pipeline stage run, newest last. Times are UTC.\n\n")
    with open(f, "a") as h:
        h.write(line + "\n")


def upsert_episode(sheets, ids, vid, fields):
    sid = ids["tracker"]
    cols = TABS["Episodes"]
    rows = sheets.spreadsheets().values().get(spreadsheetId=sid, range="'Episodes'!A:A").execute().get("values", [])
    row_no = next((i + 1 for i, r in enumerate(rows) if r and r[0] == vid), None)
    if row_no:
        cur = sheets.spreadsheets().values().get(spreadsheetId=sid, range=f"'Episodes'!A{row_no}:{chr(64 + len(cols))}{row_no}",
                                                 valueRenderOption="FORMULA").execute().get("values", [[]])[0]
        cur += [""] * (len(cols) - len(cur))
    else:
        cur = [""] * len(cols)
    for k, v in fields.items():
        if k in cols and v not in (None, ""):
            cur[cols.index(k)] = str(v)
    cur[0] = vid
    if row_no:
        sheets.spreadsheets().values().update(spreadsheetId=sid, range=f"'Episodes'!A{row_no}",
                                              valueInputOption="USER_ENTERED", body={"values": [cur]}).execute()
    else:
        sheets.spreadsheets().values().append(spreadsheetId=sid, range="'Episodes'!A1", valueInputOption="USER_ENTERED",
                                              insertDataOption="INSERT_ROWS", body={"values": [cur]}).execute()


def event(vid, stage, status, message="", seconds=""):
    """Local log first (always), then the Sheet (best effort)."""
    prod, script, entry = episode_meta(vid)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    append_log_md(prod, f"- {now} | **{stage}** | {status}" + (f" | {seconds}s" if seconds else "")
                  + (f" | {message}" if message else ""))
    pending = prod / ".google_pending.jsonl"
    rec = {"time": now, "video_id": vid, "stage": stage, "status": status, "seconds": seconds, "message": message}
    try:
        _, sheets = services()
        ids = load_ids()
        if not ids.get("tracker"):
            raise RuntimeError("tracker missing: run google_workspace.py init")
        queued = [json.loads(l) for l in pending.read_text().splitlines()] if pending.exists() else []
        rows = [[r["time"], r["video_id"], r["stage"], r["status"], r["seconds"], r["message"][:500], "server"]
                for r in queued + [rec]]
        sheets.spreadsheets().values().append(spreadsheetId=ids["tracker"], range="'Stage Log'!A1",
                                              valueInputOption="RAW", insertDataOption="INSERT_ROWS",
                                              body={"values": rows}).execute()
        if pending.exists():
            pending.unlink()
        upsert_episode(sheets, ids, vid, {"channel": script.get("channel"),
                                          "title": script.get("title"), "stage": stage, "status": status,
                                          "updated": now, "est_google_cost_usd": est_cost(prod)})
    except Exception as e:  # offline, not signed in, quota: keep it for next time
        with open(pending, "a") as h:
            h.write(json.dumps(rec) + "\n")
        print(f"  [google] tracker not updated ({str(e)[:120]}); queued locally", file=sys.stderr)


def script_markdown(script):
    import re
    out = [f"# {script.get('title', '')}", "",
           f"**Episode:** {script.get('video_id')}  ", f"**Channel:** {script.get('channel')}  ",
           f"**Slug:** {script.get('slug')}  ", f"**Thumbnail hook:** {script.get('thumbnail', {}).get('text', '')}", "",
           script.get("description", ""), ""]
    for c in script.get("chapters", []):
        out += [f"## {c['id']} · {c['title']} ({c.get('music', '')})", ""]
        for s in c["sentences"]:
            disp = re.sub(r"\[([^|\]]*)\|[^\]]*\]", r"\1", s["text"])
            out.append(f"- `{s['id']}` {disp}" + (f" *(jeda {s['pause_after']}s)*" if s.get("pause_after") else ""))
        out.append("")
    return "\n".join(out)


def record_version(drive, sheets, ids, vid, prod, script, versions_folder, known):
    """New Script Versions row + frozen Doc whenever script_source.txt changed. Returns 'vN'."""
    import difflib
    import shutil
    src = prod / "script_source.txt"
    if not src.exists():
        return ""
    vdir = prod / "script_versions"
    vdir.mkdir(exist_ok=True)
    meta_f = vdir / "versions.json"
    meta = json.loads(meta_f.read_text()) if meta_f.exists() else []
    sha = hashlib.sha256(src.read_bytes()).hexdigest()[:12]
    if meta and meta[-1]["sha"] == sha:
        return f"v{meta[-1]['n']}"
    n = len(meta) + 1
    shutil.copy(src, vdir / f"v{n}.txt")
    body = lambda t: [l for l in t.splitlines() if l.strip() and not l.startswith(("#", "@"))]
    if meta:
        old = body((vdir / f"v{meta[-1]['n']}.txt").read_text())
        new = body(src.read_text())
        sm = difflib.SequenceMatcher(a=old, b=new)
        add = rem = chg = 0
        for op, i1, i2, j1, j2 in sm.get_opcodes():
            if op == "insert": add += j2 - j1
            elif op == "delete": rem += i2 - i1
            elif op == "replace": chg += max(i2 - i1, j2 - j1)
        changes = f"{chg} sentences changed, {add} added, {rem} removed"
    else:
        changes = "first version"
    sentences = sum(len(c["sentences"]) for c in script.get("chapters", []))
    words = sum(len(s_["text"].split()) for c in script.get("chapters", []) for s_ in c["sentences"])
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    md = vdir / f"v{n}.md"
    md.write_text(f"> Frozen copy of the script, version {n} ({now} UTC). The live script is the 'Script' doc.\n\n"
                  + script_markdown(script))
    _, url = put_file(drive, md, versions_folder, f"Script v{n} ({now})", as_doc=True, known=known)
    meta.append({"n": n, "sha": sha, "time": now, "changes": changes, "doc": url})
    meta_f.write_text(json.dumps(meta, indent=2))
    sheets.spreadsheets().values().append(spreadsheetId=ids["tracker"], range="'Script Versions'!A1",
                                          valueInputOption="USER_ENTERED", insertDataOption="INSERT_ROWS",
                                          body={"values": [[now, vid, f"v{n}", words, sentences, changes,
                                                            link(url, f"Script v{n}"), sha]]}).execute()
    return f"v{n}"


def replace_rows(sheets, ids, tab, vid, rows):
    """Replace this episode's rows in a tab (keeps everyone else's)."""
    sid = ids["tracker"]
    cols = TABS[tab]
    last = chr(64 + len(cols))
    cur = sheets.spreadsheets().values().get(spreadsheetId=sid, range=f"'{tab}'!A2:{last}",
                                             valueRenderOption="FORMULA").execute().get("values", [])
    keep = [r for r in cur if r and r[0] != vid]
    sheets.spreadsheets().values().clear(spreadsheetId=sid, range=f"'{tab}'!A2:{last}").execute()
    sheets.spreadsheets().values().update(spreadsheetId=sid, range=f"'{tab}'!A2", valueInputOption="USER_ENTERED",
                                          body={"values": keep + rows}).execute()


def push(vid):
    """Mirror one episode to Drive and the tracker. Unchanged files are skipped."""
    drive, sheets = services()
    ids = load_ids()
    if not ids.get("channels"):
        raise SystemExit("run google_workspace.py init first")
    prod, script, entry = episode_meta(vid)
    known = ids.setdefault("files", {})
    ch = ensure_folder(drive, script.get("channel", "channel"), ids["channels"], ids, f"ch:{script.get('channel')}")
    ep = ensure_folder(drive, f"{vid}_{script.get('slug', '')}", ch, ids, f"ep:{vid}")
    sub = {n: ensure_folder(drive, n, ep, ids, f"ep:{vid}:{n}") for n in ("packaging", "qa", "video", "source")}
    versions = ensure_folder(drive, "versions", sub["source"], ids, f"ep:{vid}:versions")
    L = {"folder": f"https://drive.google.com/drive/folders/{ep}"}
    tmp = prod / ".script_doc.md"
    tmp.write_text(script_markdown(script))
    _, L["script"] = put_file(drive, tmp, ep, "Script", as_doc=True, known=known)
    if (prod / "research_dossier.md").exists():
        _, L["research"] = put_file(drive, prod / "research_dossier.md", ep, "Research", as_doc=True, known=known)
    if (prod / "episode_log.md").exists():
        _, L["log"] = put_file(drive, prod / "episode_log.md", ep, "Episode Log", as_doc=True, known=known)
    version = record_version(drive, sheets, ids, vid, prod, script, versions, known)
    for f in ("script_source.txt", "script.json", "numbers.json", "storyboard.json", "assets_manifest.json"):
        if (prod / f).exists():
            put_file(drive, prod / f, sub["source"], known=known)
    out = REPO / "projects" / entry.get("dirName", "") if entry else None
    thumbs = {}
    if out and (out / "options").exists():
        for f in sorted((out / "options").glob("*")):
            _, u = put_file(drive, f, sub["packaging"], known=known)
            if f.name.startswith("Package "):
                thumbs[int(f.name.split()[1])] = u
    for f in [prod / "frame_review.json", *([out / "qa_report.json"] if out else [])]:
        if f.exists():
            put_file(drive, f, sub["qa"], known=known)
    if out and (out / "video_16x9.mp4").exists():
        print("  [google] uploading video (skipped if unchanged)...", flush=True)
        _, L["video"] = put_file(drive, out / "video_16x9.mp4", sub["video"], known=known)
        if (out / "captions.srt").exists():
            put_file(drive, out / "captions.srt", sub["video"], known=known)
    save_ids(ids)
    rd = lambda f: json.loads(f.read_text()) if f and f.exists() else {}
    qa = rd(out / "qa_report.json" if out else None).get("status", "")
    fr = rd(prod / "frame_review.json")
    up = rd(prod / "youtube_upload.json")
    opts = rd(prod / "publish_options.json")
    if opts:
        rows = []
        for i, t in enumerate(opts["titles"], 1):
            rows.append([vid, i, (opts.get("lanes") or [""] * 3)[i - 1], (opts.get("scores") or [""] * 3)[i - 1],
                         "yes" if opts.get("recommend") == i else "", t, opts["hooks"][i - 1],
                         link(thumbs.get(i), f"Thumbnail {i}"),
                         " ".join(x for x, ok in (("title", up.get("title_option") == i),
                                                  ("thumbnail", up.get("thumbnail_option") == i)) if ok)])
        replace_rows(sheets, ids, "Packaging", vid, rows)
    upsert_episode(sheets, ids, vid, {
        "folder": link(L.get("folder"), "Folder"), "script": link(L.get("script"), "Script"),
        "research": link(L.get("research"), "Research"), "log": link(L.get("log"), "Log"),
        "video": link(L.get("video"), "Video"), "script_version": version, "qa": qa,
        "frame_review": "pass" if fr.get("pass") else ("fail" if fr else ""),
        "youtube": link(up.get("url"), "YouTube"), "chosen_title": up.get("title_option"),
        "chosen_thumbnail": up.get("thumbnail_option"),
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")})
    print(f"[google] synced {vid}: {L['folder']}")


def log_upload(vid, rec, channel):
    _, sheets = services()
    ids = load_ids()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    sheets.spreadsheets().values().append(spreadsheetId=ids["tracker"], range="'Uploads'!A1", valueInputOption="RAW",
                                          insertDataOption="INSERT_ROWS", body={"values": [[
                                              now, vid, channel, rec.get("url"), rec.get("privacy"),
                                              rec.get("title_option"), rec.get("thumbnail_option")]]}).execute()


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__)
        return 2
    cmd = a[0]
    if cmd == "login":
        if "--youtube" in a:
            channel = a[a.index("--youtube") + 1]
            credentials(YT_SCOPES, CFG / f"youtube_token_{channel}.json", interactive=True)
            print(f"YouTube sign-in saved for channel '{channel}'")
        else:
            credentials(interactive=True)
            print("Drive/Docs/Sheets sign-in saved")
    elif cmd == "init":
        init()
    elif cmd == "event":
        event(a[1], a[2], a[3], a[4] if len(a) > 4 else "", a[5] if len(a) > 5 else "")
    elif cmd == "push":
        push(a[1])
    elif cmd == "share-colab":
        drive, _ = services()
        ids = load_ids()
        if not ids.get("colab"):
            sys.exit("run init first")
        drive.permissions().create(fileId=ids["colab"], sendNotificationEmail=True,
                                   emailMessage="AI-nimate render jobs. In Drive: Shared with me -> right-click "
                                                "'AI-nimate Colab' -> Organize -> Add shortcut -> My Drive.",
                                   body={"type": "user", "role": "writer", "emailAddress": a[1]}).execute()
        print(f"shared 'AI-nimate Colab' with {a[1]} (editor). In that account's Drive: Shared with me -> "
              "'AI-nimate Colab' -> Organize -> Add shortcut -> My Drive.")
    elif cmd == "status":
        ids = load_ids()
        print(json.dumps({k: v for k, v in ids.items() if k != "files"}, indent=2))
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())

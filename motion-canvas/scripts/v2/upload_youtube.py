#!/usr/bin/env python3
"""Upload a finished v2 episode to YouTube (video, thumbnail, Indonesian captions) in one command.

    upload_youtube.py <video_id> --title 2 --thumb 1 --dry-run   show exactly what would be uploaded
    upload_youtube.py <video_id> --title 2 --thumb 1             upload as PRIVATE (default)
  --title/--thumb pick from the 3 options in production/<id>/publish_options.json (required when it exists).
    upload_youtube.py <video_id> --privacy unlisted     or public; --publish-at 2026-11-10T11:00:00+07:00

Refuses unless the episode passed QA (qa_report.json) and the frame review (frame_review.json),
and refuses a second upload of the same episode (record: production/<id>/youtube_upload.json).

One-time setup (credentials live OUTSIDE the repo, in ~/.config/ainimate/):
  1. Google Cloud console, the project of your choice: enable "YouTube Data API v3".
  2. OAuth consent screen: External, add your Google account as a test user.
  3. Credentials -> Create OAuth client ID -> "Desktop app" -> download JSON to
     ~/.config/ainimate/google_client_secret.json   (the same client google_workspace.py uses)
  4. Sign in once per channel: google_workspace.py login --youtube <channel>  (pick that brand channel
     on the Google screen). Token: ~/.config/ainimate/youtube_token_<channel>.json (chmod 600).
Note: projects that have not passed YouTube's API compliance audit can only upload PRIVATE videos;
publish them by hand in YouTube Studio, or apply for the audit.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

MC = Path(__file__).resolve().parents[2]
REPO = MC.parent
CFG = Path.home() / ".config" / "ainimate"
SECRET = CFG / "google_client_secret.json"  # same OAuth client as google_workspace.py
SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.force-ssl"]
CATEGORY_EDUCATION = "27"


def episode(vid):
    prod = MC / "production" / vid
    script = json.loads((prod / "script.json").read_text())
    reg = json.loads((REPO / "projects" / "projects_config.json").read_text())
    entry = next((p for p in reg["projects"].values() if p.get("id") == vid), None)
    if not entry:
        sys.exit(f"{vid} not in projects_config.json")
    out = REPO / "projects" / entry["dirName"]
    return prod, script, entry, out


def gate(prod, out):
    problems = []
    qa = json.loads((out / "qa_report.json").read_text()) if (out / "qa_report.json").exists() else {}
    if not (qa.get("total") and qa.get("passed") == qa.get("total")):  # every check must pass
        problems.append("qa_report.json is missing or not passing: run make_episode first")
    fr = json.loads((prod / "frame_review.json").read_text()) if (prod / "frame_review.json").exists() else {}
    if not fr.get("pass"):
        problems.append("frame_review.json is missing or not passing: run make_episode --only=review")
    if not (out / "video_16x9.mp4").exists():
        problems.append("video_16x9.mp4 missing")
    return problems


def build_metadata(prod, script, out):
    parts = [script.get("description", "").strip()]
    ch = out / "youtube_chapters.txt"
    if ch.exists():
        parts.append("Bab:\n" + ch.read_text().strip())
    credits = prod / "music_credits.txt"
    if credits.exists():
        lines = [l.split("attribution:", 1)[1].strip() for l in credits.read_text().splitlines()
                 if "attribution:" in l and l.split("attribution:", 1)[1].strip().lower() not in ("", "none")]
        if lines:
            parts.append("Musik:\n" + "\n".join(dict.fromkeys(lines)))
    body = {
        "snippet": {
            "title": script["title"][:100],
            "description": "\n\n".join(p for p in parts if p)[:4900],
            "categoryId": CATEGORY_EDUCATION,
            "defaultLanguage": "id",
            "defaultAudioLanguage": "id",
            "tags": [t for t in [script.get("series", "").strip(": "), "bisnis", "simulasi bisnis", "Indonesia"] if t],
        },
        "status": {
            "privacyStatus": "private",
            "selfDeclaredMadeForKids": False,
            # YouTube's "altered or synthetic content" question covers realistic content only: a real person
            # saying/doing something, altered real footage/places, realistic scenes that did not happen, or
            # AI music as the main focus. Flat illustrated characters + a narrator voice are none of these,
            # so the answer is "no" (user decision 2026-11-08). Use --ai-disclosure if a video ever is.
            "containsSyntheticMedia": False,
        },
    }
    return body


def service(channel):
    """YouTube client for one channel (brand account): token from `google_workspace.py login --youtube <channel>`."""
    token = CFG / f"youtube_token_{channel}.json"
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    if not SECRET.exists():
        sys.exit(f"missing {SECRET}: see the one-time setup at the top of this script")
    creds = Credentials.from_authorized_user_file(str(token), SCOPES) if token.exists() else None
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(str(SECRET), SCOPES)
        print(f"Sign in to the YouTube channel '{channel}': open the URL below (SSH tunnel for port 8765 must be up).")
        creds = flow.run_local_server(port=8765, open_browser=False, prompt="consent",
                                       bind_addr="0.0.0.0")  # reachable through a forward to the server's LAN IP
    CFG.mkdir(parents=True, exist_ok=True)
    token.write_text(creds.to_json())
    token.chmod(0o600)
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("vid")
    ap.add_argument("--privacy", choices=["private", "unlisted", "public"], default="private")
    ap.add_argument("--publish-at", help="RFC3339 time; uploads private and YouTube publishes it then")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--again", action="store_true", help="allow a second upload of the same episode")
    ap.add_argument("--ai-disclosure", action="store_true",
                    help="declare realistic altered/synthetic content (not needed for illustrated videos)")
    ap.add_argument("--title", type=int, choices=[1, 2, 3], help="title option from publish_options.json")
    ap.add_argument("--thumb", type=int, choices=[1, 2, 3], help="thumbnail option (thumbnail_option_N.jpg)")
    a = ap.parse_args()

    prod, script, entry, out = episode(a.vid)
    record = prod / "youtube_upload.json"
    if record.exists() and not a.again:
        sys.exit(f"already uploaded: {json.loads(record.read_text()).get('url')} (use --again to upload a copy)")
    problems = gate(prod, out)
    if problems:
        sys.exit("not uploading:\n  - " + "\n  - ".join(problems))
    body = build_metadata(prod, script, out)
    body["status"]["containsSyntheticMedia"] = bool(a.ai_disclosure)
    opts_file = prod / "publish_options.json"
    opts = json.loads(opts_file.read_text()) if opts_file.exists() else {}
    if opts and (a.title is None or a.thumb is None):
        sys.exit("pick the packaging first: --title 1|2|3 --thumb 1|2|3 (options: " + str(opts_file) + ")")
    if a.title:
        body["snippet"]["title"] = opts["titles"][a.title - 1][:100]
    body["status"]["privacyStatus"] = "private" if a.publish_at else a.privacy
    if a.publish_at:
        body["status"]["publishAt"] = a.publish_at
    video = out / "video_16x9.mp4"
    thumb = MC / "public" / "assets" / a.vid / (f"thumbnail_option_{a.thumb}.jpg" if a.thumb else "thumbnail_16x9.jpg")
    if a.thumb and not thumb.exists():
        sys.exit(f"missing {thumb}: run make_episode --only=thumbnail")
    if not thumb.exists():
        thumb = out / "thumbnail.jpg"
    captions = out / "captions.srt"
    print(json.dumps(body, indent=2, ensure_ascii=False))
    print(f"video: {video} ({video.stat().st_size / 1e6:.0f} MB)\nthumbnail: {thumb}\ncaptions: "
          f"{captions if captions.exists() else 'none'}")
    if a.dry_run:
        print("\n[dry run] nothing uploaded")
        return

    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaFileUpload

    yt = service(script.get("channel", "default"))
    req = yt.videos().insert(part="snippet,status", body=body,
                             media_body=MediaFileUpload(str(video), chunksize=16 * 1024 * 1024, resumable=True,
                                                        mimetype="video/mp4"))
    resp = None
    while resp is None:
        status, resp = req.next_chunk()
        if status:
            print(f"  uploading {status.progress() * 100:.0f}%", flush=True)
    vid_id = resp["id"]
    url = f"https://youtu.be/{vid_id}"
    rec = {"youtube_id": vid_id, "url": url, "privacy": resp["status"].get("privacyStatus"),
           "title_option": a.title, "thumbnail_option": a.thumb, "steps": {}}
    record.write_text(json.dumps(rec, indent=2))  # written right away so a crash never causes a double upload
    print(f"uploaded: {url} ({rec['privacy']})")

    try:
        yt.thumbnails().set(videoId=vid_id, media_body=MediaFileUpload(str(thumb))).execute()
        rec["steps"]["thumbnail"] = "ok"
    except HttpError as e:  # needs a phone-verified channel
        rec["steps"]["thumbnail"] = f"failed: {e.status_code} {e.reason}"
    if captions.exists():
        try:
            yt.captions().insert(part="snippet", body={"snippet": {"videoId": vid_id, "language": "id",
                                                                   "name": "Indonesia", "isDraft": False}},
                                 media_body=MediaFileUpload(str(captions), mimetype="application/octet-stream")).execute()
            rec["steps"]["captions"] = "ok"
        except HttpError as e:
            rec["steps"]["captions"] = f"failed: {e.status_code} {e.reason}"
    record.write_text(json.dumps(rec, indent=2))
    try:  # tracker sheet (best effort)
        import google_workspace as gw
        gw.log_upload(a.vid, rec, script.get("channel", ""))
        gw.push(a.vid)
    except Exception as e:
        print(f"  [google] tracker not updated: {str(e)[:120]}")
    for k, v in rec["steps"].items():
        print(f"  {k}: {v}")
    if rec["privacy"] == "private" and a.privacy != "private" and not a.publish_at:
        print("YouTube kept it PRIVATE: this API project is not audited yet. Publish it in YouTube Studio.")


if __name__ == "__main__":
    main()

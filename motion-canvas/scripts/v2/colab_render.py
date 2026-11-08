#!/usr/bin/env python3
"""Render an episode on Google Colab, using Google Drive as the hand-off (no tunnel needed for the render).

    colab_render.py notebook          upload/refresh the "AI-nimate Render" notebook in Drive "AI-nimate Colab/"
    colab_render.py send <vid>        bundle the render inputs -> Drive AI-nimate/Colab/jobs/<vid>/ (status: queued)
    colab_render.py status <vid>      queued | running | done | failed (+ message)
    colab_render.py fetch <vid>       download the finished render into projects/<dir>/ and .cache/ (then: make_episode)

The Colab account (with the compute units) may differ from the channel account: run
`google_workspace.py share-colab <colab account email>` once, then add the shared folder to its My Drive.
In Colab: open "AI-nimate Colab/AI-nimate Render.ipynb", pick a runtime with many CPUs and high RAM
(the render uses CPU + RAM, not the GPU), Run all. It renders every queued job and marks it done.
Finished chapter clips travel both ways (.cache), so a re-render only redoes changed chapters.
"""
import io
import json
import sys
import tarfile
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import google_workspace as gw  # noqa: E402

MC = gw.MC
REPO = gw.REPO

NOTEBOOK_CELLS = [
    ("markdown", "# AI-nimate Render\nRenders every queued job in `AI-nimate/Colab/jobs/` and writes the result back to Drive.\n"
                 "Runtime: pick the most CPUs / high RAM you can (the render uses CPU, not the GPU). Then **Run all**."),
    ("code", "from google.colab import drive\ndrive.mount('/content/drive')\nimport os, json, glob, subprocess, time, shutil\n"
             "# the job folder lives in the channel account's Drive; this account sees it through a shortcut in My Drive\n"
             "cands = glob.glob('/content/drive/MyDrive/AI-nimate Colab/jobs') + glob.glob('/content/drive/MyDrive/*/AI-nimate Colab/jobs') \\\n"
             "        + glob.glob('/content/drive/.shortcut-targets-by-id/*/AI-nimate Colab/jobs')\n"
             "assert cands, 'AI-nimate Colab folder not found: add the shared folder to My Drive (Shared with me -> Organize -> Add shortcut)'\n"
             "JOBS = cands[0]; print('jobs folder:', JOBS)\n"
             "queued = [d for d in sorted(glob.glob(JOBS + '/*')) if json.load(open(d + '/job.json'))['status'] in ('queued', 'failed')]\n"
             "print('queued jobs:', [os.path.basename(d) for d in queued]); print(os.cpu_count(), 'CPUs')"),
    ("code", "%%bash\nset -e\nif ! node -v 2>/dev/null | grep -q '^v20'; then\n  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null\n"
             "  apt-get install -y nodejs >/dev/null\nfi\nnode -v; ffmpeg -version | head -1"),
    ("code", "def run(cmd, cwd):\n    print('$', cmd); r = subprocess.run(cmd, shell=True, cwd=cwd)\n    if r.returncode: raise RuntimeError(f'{cmd} -> {r.returncode}')\n\n"
             "for job in queued:\n    meta = json.load(open(job + '/job.json')); vid = meta['video_id']\n"
             "    def mark(status, msg=''):\n        meta.update(status=status, message=msg, updated=time.strftime('%Y-%m-%d %H:%M:%S'))\n"
             "        json.dump(meta, open(job + '/job.json', 'w'), indent=2)\n"
             "    mark('running'); work = '/content/work'; shutil.rmtree(work, ignore_errors=True); os.makedirs(work)\n"
             "    try:\n        run(f'tar -xzf \"{job}/bundle.tgz\" -C {work}', '/')\n        mc = work + '/motion-canvas'\n"
             "        run('npm ci --no-audit --no-fund', mc)\n        run('npx playwright install --with-deps chromium', mc)\n"
             "        t0 = time.time()\n        run(meta['render_cmd'], mc)\n"
             "        run(f\"tar -czf /content/out.tgz -C {work} projects/{meta['dir_name']} motion-canvas/.cache/{vid}\", '/')\n"
             "        shutil.copy('/content/out.tgz', job + '/out.tgz')\n        mark('done', f'rendered in {time.time() - t0:.0f}s on {os.cpu_count()} CPUs')\n"
             "    except Exception as e:\n        mark('failed', str(e)[:500]); print('FAILED', vid, e)\n"
             "print('all jobs processed')"),
]


def jobs_folder(drive, ids):
    colab = ids.get("colab") or gw.ensure_folder(drive, "AI-nimate Colab", ids["root"], ids, "colab")
    return gw.ensure_folder(drive, "jobs", colab, ids, "colab_jobs")


def notebook():
    drive, _ = gw.services()
    ids = gw.load_ids()
    nb = {"nbformat": 4, "nbformat_minor": 5, "metadata": {"kernelspec": {"name": "python3", "display_name": "Python 3"}},
          "cells": [{"cell_type": t, "metadata": {}, "source": src, **({"outputs": [], "execution_count": None} if t == "code" else {})}
                    for t, src in NOTEBOOK_CELLS]}
    tmp = Path(tempfile.mkdtemp()) / "AI-nimate Render.ipynb"
    tmp.write_text(json.dumps(nb, indent=1))
    fid, link = gw.put_file(drive, tmp, ids["colab"], known=ids.setdefault("files", {}))
    gw.save_ids(ids)
    print(f"notebook: https://colab.research.google.com/drive/{fid}")


def bundle(vid, out):
    prod, script, entry = gw.episode_meta(vid)
    dir_name = entry["dirName"]
    adds = [MC / f for f in ("package.json", "package-lock.json", "tsconfig.json", "vite.config.ts", "render.mjs")]
    adds += [MC / "src", MC / "scripts", prod, MC / "public" / "assets" / vid]
    # audio: the v2 render muxes production/<id>/final_mix.wav only (already in prod)
    adds += [MC / "public" / f for f in ("fonts",) if (MC / "public" / f).exists()]
    if (MC / ".cache" / vid).exists():
        adds.append(MC / ".cache" / vid)  # finished chapters: Colab only renders what changed
    adds += [REPO / "projects" / "projects_config.json"]
    skip = {"review_frames", "node_modules", "__pycache__"}
    with tarfile.open(out, "w:gz") as tar:
        for p in adds:
            if p.exists():
                tar.add(p, arcname=str(p.relative_to(REPO)),
                        filter=lambda ti: None if (any(s in ti.name.split("/") for s in skip)
                                                   or ti.name.startswith("motion-canvas/src/audio")) else ti)
    return dir_name, script


def send(vid):
    drive, _ = gw.services()
    ids = gw.load_ids()
    jobs = jobs_folder(drive, ids)
    job = gw.ensure_folder(drive, vid, jobs, ids, f"job:{vid}")
    tmp = Path(tempfile.mkdtemp())
    dir_name, script = bundle(vid, tmp / "bundle.tgz")
    print(f"bundle: {(tmp / 'bundle.tgz').stat().st_size / 1e6:.0f} MB", flush=True)
    meta = {"video_id": vid, "dir_name": dir_name, "status": "queued", "message": "",
            "render_cmd": f"node render.mjs --project={vid} --channel={script['channel']} --slug={script['slug']} --aspects=16x9"}
    (tmp / "job.json").write_text(json.dumps(meta, indent=2))
    known = ids.setdefault("files", {})
    gw.put_file(drive, tmp / "bundle.tgz", job, known=known)
    gw.put_file(drive, tmp / "job.json", job, known=None)
    gw.save_ids(ids)
    import shutil
    shutil.rmtree(tmp, ignore_errors=True)  # the bundle is in Drive now; never leave 200 MB in /tmp
    print(f"queued {vid}. In Colab (the account with credits): open 'AI-nimate Colab/AI-nimate Render.ipynb' and Run all.")


def find(drive, parent, name):
    r = drive.files().list(q=f"name = '{name}' and '{parent}' in parents and trashed = false",
                           fields="files(id,modifiedTime,size)").execute().get("files", [])
    return r[0] if r else None


def status(vid, quiet=False):
    drive, _ = gw.services()
    ids = gw.load_ids()
    job = ids.get(f"job:{vid}")
    f = find(drive, job, "job.json") if job else None
    if not f:
        print("no job for", vid)
        return None
    meta = json.loads(drive.files().get_media(fileId=f["id"]).execute())
    if not quiet:
        print(f"{vid}: {meta['status']} {meta.get('message', '')} ({meta.get('updated', '')})")
    return meta


def fetch(vid):
    from googleapiclient.http import MediaIoBaseDownload
    meta = status(vid)
    if not meta or meta["status"] != "done":
        sys.exit("render not done yet")
    drive, _ = gw.services()
    ids = gw.load_ids()
    f = find(drive, ids[f"job:{vid}"], "out.tgz")
    buf = io.BytesIO()
    dl = MediaIoBaseDownload(buf, drive.files().get_media(fileId=f["id"]), chunksize=32 * 1024 * 1024)
    done = False
    while not done:
        _, done = dl.next_chunk()
    buf.seek(0)
    with tarfile.open(fileobj=buf, mode="r:gz") as tar:
        members = [m for m in tar.getmembers() if not m.name.startswith(("/", "..")) and ".." not in m.name.split("/")]
        tar.extractall(REPO, members=members)
    print(f"fetched render of {vid} into projects/{meta['dir_name']}/; next: make_episode.mjs {vid} (qa, review)")


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__)
        return 2
    {"notebook": lambda: notebook(), "send": lambda: send(a[1]), "status": lambda: status(a[1]),
     "fetch": lambda: fetch(a[1])}.get(a[0], lambda: print(__doc__))()
    return 0


if __name__ == "__main__":
    sys.exit(main())

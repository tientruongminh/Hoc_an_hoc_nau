#!/usr/bin/env python3
"""Generate raw AI images listed in tools/assetgen/manifest.json.

Raw outputs are cached in art-source/raw/<id>.jpg; an asset is only regenerated
when its file is missing or --force/--only is given. Credentials come from .env
(ASSETGEN_BASE_URL, ASSETGEN_API_KEY, ASSETGEN_MODEL).

Usage:
  python3 -I tools/assetgen/gen.py                 # generate everything missing
  python3 -I tools/assetgen/gen.py --only kitchen  # (re)generate ids matching a prefix
  python3 -I tools/assetgen/gen.py --list
"""
import argparse
import base64
import concurrent.futures as cf
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "tools/assetgen/manifest.json"
RAW = ROOT / "art-source/raw"
SIZES = {"1:1": "1024x1024", "16:9": "1280x720", "9:16": "720x1280", "2:1": "1440x720", "4:3": "1152x864"}


def load_env():
    env = dict(os.environ)
    f = ROOT / ".env"
    if f.exists():
        for line in f.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env.setdefault(k.strip(), v.strip())
    return env


def build_prompt(manifest, asset):
    style = manifest["styles"][asset.get("style", "sprite")]
    bg = manifest["backgrounds"].get(asset.get("bg", "none"), "")
    return " ".join(p for p in [style, asset["prompt"], bg] if p)


def generate(env, manifest, asset, retries=3):
    body = {
        "model": asset.get("model", env.get("ASSETGEN_MODEL", "xai/grok-imagine-image")),
        "prompt": build_prompt(manifest, asset),
        "n": 1,
        "aspect_ratio": asset.get("aspect", "1:1"),
        # the proxy does not always honour aspect_ratio alone; size pins the orientation
        "size": SIZES.get(asset.get("aspect", "1:1"), "1024x1024"),
        "response_format": "b64_json",
    }
    req = urllib.request.Request(
        env["ASSETGEN_BASE_URL"].rstrip("/") + "/images/generations",
        data=json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + env["ASSETGEN_API_KEY"], "Content-Type": "application/json"},
    )
    last = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                data = json.loads(r.read())
            if "data" not in data:
                raise RuntimeError(str(data)[:300])
            out = RAW / f"{asset['id']}.jpg"
            out.write_bytes(base64.b64decode(data["data"][0]["b64_json"]))
            return asset["id"], "ok"
        except Exception as e:  # network / provider errors: back off and retry
            last = e
            time.sleep(4 * (attempt + 1))
    return asset["id"], f"FAILED: {last}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", help="id prefixes to (re)generate")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("-j", type=int, default=4)
    args = ap.parse_args()

    manifest = json.loads(MANIFEST.read_text())
    env = load_env()
    RAW.mkdir(parents=True, exist_ok=True)
    assets = manifest["assets"]
    if args.list:
        for a in assets:
            mark = "x" if (RAW / f"{a['id']}.jpg").exists() else " "
            print(f"[{mark}] {a['id']:28s} {a.get('kind')}")
        return
    todo = []
    for a in assets:
        exists = (RAW / f"{a['id']}.jpg").exists()
        if args.only:
            if any(a["id"].startswith(p) for p in args.only):
                todo.append(a)
        elif args.force or not exists:
            todo.append(a)
    print(f"generating {len(todo)} assets")
    with cf.ThreadPoolExecutor(args.j) as ex:
        for aid, status in ex.map(lambda a: generate(env, manifest, a), todo):
            print(f"  {aid}: {status}", flush=True)


if __name__ == "__main__":
    sys.exit(main())

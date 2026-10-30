#!/usr/bin/env python3
"""Turn raw AI images (art-source/raw) into game-ready pixel art (game/public/assets).

Steps per asset kind:
  scene     crop the dark void around the room, downscale to native pixels
  prop/icon chroma-key the flat background, trim, downscale to target height
  sheet     chroma-key, split into figures, pack into a uniform-frame strip + JSON
  portrait  chroma-key, split the 2x2 expression grid, downscale
  cg        downscale to 640x360 (shown at 2x)

All downscales use box filtering followed by palette quantization and hard alpha,
so the result reads as crisp pixel art when rendered with nearest-neighbour.
Per-asset overrides live in tools/assetgen/process.json.

Usage: python3 -I tools/assetgen/process.py [id-prefix ...] [--contact]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "art-source/raw"
CONTACT = ROOT / "art-source/contact"
OUT = ROOT / "game/public/assets"
MANIFEST = json.loads((ROOT / "tools/assetgen/manifest.json").read_text())
OVR = json.loads((ROOT / "tools/assetgen/process.json").read_text())

DEFAULTS = {
    "scene": {"scale": 0.35, "colors": 96},
    "prop": {"h": 32, "colors": 32},
    "icon": {"h": 24, "colors": 24},
    "sheet": {"h": 40, "colors": 32, "rows": 3, "cols": 3},
    "portrait": {"h": 80, "colors": 48},
    "cg": {"w": 640, "colors": 0},
}
OUT_DIR = {"scene": "tiles", "prop": "props", "icon": "props", "sheet": "sprites", "portrait": "portraits", "cg": "cg"}


# ---------------------------------------------------------------- helpers
def border_color(a):
    b = np.concatenate([a[:4].reshape(-1, 3), a[-4:].reshape(-1, 3), a[:, :4].reshape(-1, 3), a[:, -4:].reshape(-1, 3)])
    return np.median(b, axis=0)


def chroma_key(img, tol=110, inner_tol=60):
    """Return RGBA with the flat background removed (border-connected + near-exact interior holes)."""
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    bg = border_color(a)
    dist = np.sqrt(((a - bg) ** 2).sum(-1))
    # how "key-coloured" a pixel is: magenta/green keys are saturated, so also check hue direction
    cand = dist < tol
    lab, _ = ndimage.label(cand)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    mask_bg = np.isin(lab, edge[edge > 0]) | (dist < inner_tol)
    # grow by 1px to eat the JPEG fringe, then despill the remaining edge pixels
    mask_bg = ndimage.binary_dilation(mask_bg, iterations=1) & (dist < tol * 1.6)
    alpha = (~mask_bg).astype(np.uint8) * 255
    rgb = a.copy()
    edge_px = ndimage.binary_dilation(mask_bg, iterations=2) & ~mask_bg
    key_dom = np.argmax(bg)  # dominant key channel(s)
    if bg[1] > bg[0] and bg[1] > bg[2]:  # green key
        rgb[..., 1] = np.where(edge_px, np.minimum(rgb[..., 1], (rgb[..., 0] + rgb[..., 2]) / 2 + 10), rgb[..., 1])
    else:  # magenta key
        m = np.minimum(rgb[..., 0], rgb[..., 2])
        rgb[..., 0] = np.where(edge_px, np.minimum(rgb[..., 0], rgb[..., 1] + 30), rgb[..., 0])
        rgb[..., 2] = np.where(edge_px, np.minimum(rgb[..., 2], rgb[..., 1] + 30), rgb[..., 2])
        del m
    del key_dom
    out = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), alpha])
    return Image.fromarray(out, "RGBA")


def trim(rgba, pad=0):
    bbox = rgba.getchannel("A").getbbox()
    if not bbox:
        return rgba
    x0, y0, x1, y1 = bbox
    return rgba.crop((max(0, x0 - pad), max(0, y0 - pad), min(rgba.width, x1 + pad), min(rgba.height, y1 + pad)))


def pixelize(rgba, size, colors):
    """Box-downscale to size, harden alpha, quantize to a small palette."""
    w, h = max(1, round(size[0])), max(1, round(size[1]))
    arr = np.asarray(rgba.convert("RGBA")).astype(np.float32)
    # premultiply so transparent pixels don't bleed key colour into edges
    arr[..., :3] *= arr[..., 3:4] / 255
    pre = Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA").resize((w, h), Image.BOX)
    p = np.asarray(pre).astype(np.float32)
    al = p[..., 3:4]
    rgb = np.where(al > 0, p[..., :3] * 255 / np.maximum(al, 1), 0)
    a_hard = (al[..., 0] > 110).astype(np.uint8) * 255
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    if colors:
        img = img.quantize(colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    out = img.convert("RGBA")
    out.putalpha(Image.fromarray(a_hard, "L"))
    return out


def fit_h(rgba, h, colors):
    return pixelize(rgba, (rgba.width * h / rgba.height, h), colors)


def segment(rgba, min_area_frac=0.002, merge=6):
    """Split an RGBA sheet into figure crops ordered row-major. Returns list of (box, crop)."""
    al = np.asarray(rgba.getchannel("A")) > 0
    grown = ndimage.binary_dilation(al, iterations=merge)
    lab, n = ndimage.label(grown)
    boxes = []
    total = al.size
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        area = (al[sl] & (lab[sl] == i)).sum()
        if area < total * min_area_frac:
            continue
        boxes.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
    if not boxes:
        return []
    # cluster into rows by vertical centre
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], [boxes[0]]
    for b in boxes[1:]:
        prev = cur[-1]
        if (b[1] + b[3]) / 2 - (prev[1] + prev[3]) / 2 > (prev[3] - prev[1]) * 0.5:
            rows.append(cur)
            cur = [b]
        else:
            cur.append(b)
    rows.append(cur)
    ordered = [b for r in rows for b in sorted(r, key=lambda b: b[0])]
    return [(b, rgba.crop(b)) for b in ordered]


def contact_sheet(name, crops):
    CONTACT.mkdir(parents=True, exist_ok=True)
    cw = max(c.width for c in crops) + 8
    ch = max(c.height for c in crops) + 20
    cols = min(len(crops), 6)
    rows = (len(crops) + cols - 1) // cols
    sheet = Image.new("RGBA", (cw * cols, ch * rows), (40, 40, 48, 255))
    d = ImageDraw.Draw(sheet)
    for i, c in enumerate(crops):
        x, y = (i % cols) * cw, (i // cols) * ch
        sheet.alpha_composite(c, (x + 4, y + 16))
        d.text((x + 4, y + 2), str(i), fill=(255, 255, 0, 255))
    scale = max(1, 600 // max(sheet.width, 1))
    sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST).save(CONTACT / f"{name}.png")


def crop_void(img, thresh=28):
    """Crop away the near-black void AI often paints around interiors."""
    a = np.asarray(img.convert("L"))
    rows = np.where((a > thresh).mean(1) > 0.3)[0]
    cols = np.where((a > thresh).mean(0) > 0.3)[0]
    if len(rows) and len(cols):
        return img.crop((cols[0], rows[0], cols[-1] + 1, rows[-1] + 1))
    return img


# ---------------------------------------------------------------- per-kind
def do_scene(a, cfg, out):
    img = Image.open(RAW / f"{a['id']}.jpg").convert("RGB")
    if cfg.get("crop"):
        img = img.crop(tuple(cfg["crop"]))
    elif cfg.get("void", True):
        img = crop_void(img)
    s = cfg["scale"]
    px = pixelize(img.convert("RGBA"), (img.width * s, img.height * s), cfg["colors"])
    px.save(out / f"{a['id']}.png")
    return f"{px.width}x{px.height}"


def do_prop(a, cfg, out):
    rgba = trim(chroma_key(Image.open(RAW / f"{a['id']}.jpg"), cfg.get("tol", 110)))
    px = fit_h(rgba, cfg["h"], cfg["colors"])
    px.save(out / f"{a['id']}.png")
    return f"{px.width}x{px.height}"


def do_sheet(a, cfg, out, contact):
    rgba = chroma_key(Image.open(RAW / f"{a['id']}.jpg"), cfg.get("tol", 110))
    segs = segment(rgba, merge=cfg.get("merge", 6))
    crops = [trim(c) for _, c in segs]
    if contact:
        contact_sheet(a["id"], crops)
    pick = cfg.get("frames") or list(range(min(len(crops), cfg["rows"] * cfg["cols"])))
    crops = [crops[i] for i in pick]
    # one common scale so every frame keeps relative size; normalise by the tallest frame
    ref_h = max(c.height for c in crops)
    s = cfg["h"] / ref_h
    frames = [pixelize(c, (c.width * s, c.height * s), cfg["colors"]) for c in crops]
    fw = max(f.width for f in frames) + 2
    fh = max(f.height for f in frames) + 1
    strip = Image.new("RGBA", (fw * len(frames), fh))
    for i, f in enumerate(frames):  # bottom-centre aligned (feet on the same line)
        strip.alpha_composite(f, (i * fw + (fw - f.width) // 2, fh - f.height - 1))
    strip.save(out / f"{a['id']}.png")
    meta = {"frameWidth": fw, "frameHeight": fh, "frames": len(frames), "anims": cfg.get("anims", {})}
    (out / f"{a['id']}.json").write_text(json.dumps(meta, indent=1))
    return f"{len(segs)} segs -> {len(frames)} frames {fw}x{fh}"


def do_portrait(a, cfg, out, contact):
    rgba = chroma_key(Image.open(RAW / f"{a['id']}.jpg"), cfg.get("tol", 110))
    segs = segment(rgba, merge=cfg.get("merge", 8))
    if len(segs) < 4:  # fall back to a straight 2x2 split
        w, h = rgba.width // 2, rgba.height // 2
        segs = [((x, y, x + w, y + h), rgba.crop((x, y, x + w, y + h))) for y in (0, h) for x in (0, w)]
    crops = [clean_cell(c) for _, c in segs]
    if contact:
        contact_sheet(a["id"], crops)
    pick = cfg.get("frames") or [0, 1, 2, 3]
    names = cfg.get("names", ["0", "1", "2", "3"])
    for i, n in zip(pick, names):
        fit_h(crops[i], cfg["h"], cfg["colors"]).save(out / f"{a['id']}_{n}.png")
    return f"{len(segs)} segs"


def clean_cell(rgba):
    """Portrait cells sometimes come with their own coloured panel and thin frame lines:
    inset past the frame, re-key against the panel colour only if one is present, keep the main blob."""
    w, h = rgba.size
    i = int(min(w, h) * 0.035)
    arr = np.asarray(rgba.crop((i, i, w - i, h - i))).copy()
    a = arr[..., 3] > 0
    edges = np.concatenate([a[:3].ravel(), a[:, :3].ravel(), a[:, -3:].ravel()])
    if edges.mean() > 0.5:  # an opaque panel survived the global key
        rgb = arr[..., :3].astype(np.float32)
        er = np.concatenate([rgb[:3].reshape(-1, 3), rgb[:, :3].reshape(-1, 3), rgb[:, -3:].reshape(-1, 3)])
        panel = np.median(er[edges], axis=0)
        cand = np.sqrt(((rgb - panel) ** 2).sum(-1)) < 70
        lab, _ = ndimage.label(cand)
        border_ids = np.unique(np.concatenate([lab[0], lab[:, 0], lab[:, -1]]))
        a &= ~np.isin(lab, border_ids[border_ids > 0])
    a = ndimage.binary_opening(a, iterations=2)
    lab, n = ndimage.label(a)
    if n:
        sizes = ndimage.sum(a, lab, range(1, n + 1))
        a = ndimage.binary_fill_holes(lab == (np.argmax(sizes) + 1))
    arr[..., 3] = a.astype(np.uint8) * 255
    return trim(Image.fromarray(arr, "RGBA"))


def do_cg(a, cfg, out):
    img = Image.open(RAW / f"{a['id']}.jpg").convert("RGB")
    tw, th = img.width, round(img.width * 9 / 16)
    if th < img.height:  # centre-crop 4:3 renders to 16:9 (bias slightly upward: faces live there)
        y = int((img.height - th) * cfg.get("cropY", 0.4))
        img = img.crop((0, y, tw, y + th))
    w = cfg["w"]
    px = pixelize(img.convert("RGBA"), (w, img.height * w / img.width), cfg["colors"])
    px.convert("RGB").save(out / f"{a['id']}.png")
    return f"{px.width}x{px.height}"


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    contact = "--contact" in sys.argv
    for a in MANIFEST["assets"]:
        if args and not any(a["id"].startswith(p) for p in args):
            continue
        if not (RAW / f"{a['id']}.jpg").exists():
            print(f"  {a['id']}: missing raw")
            continue
        kind = a["kind"]
        cfg = {**DEFAULTS[kind], **OVR.get(a["id"], {})}
        out = OUT / OUT_DIR[kind]
        out.mkdir(parents=True, exist_ok=True)
        try:
            if kind == "scene":
                r = do_scene(a, cfg, out)
            elif kind in ("prop", "icon"):
                r = do_prop(a, cfg, out)
            elif kind == "sheet":
                r = do_sheet(a, cfg, out, contact)
            elif kind == "portrait":
                r = do_portrait(a, cfg, out, contact)
            else:
                r = do_cg(a, cfg, out)
            print(f"  {a['id']}: {r}")
        except Exception as e:  # keep going; report at the end
            print(f"  {a['id']}: ERROR {e}")


if __name__ == "__main__":
    main()

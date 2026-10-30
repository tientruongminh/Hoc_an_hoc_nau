# Asset Pipeline

Mọi hình ảnh trong game đi qua 3 bước có thể tái tạo hoàn toàn từ file trong git:

```
tools/assetgen/manifest.json ──gen.py──▶ art-source/raw/<id>.jpg ──process.py──▶ game/public/assets/** ──index.py──▶ game/src/data/assetIndex.ts
        (prompt + style)                (ảnh AI gốc, KHÔNG commit)            (pixel art sẵn dùng)                 (danh sách key cho Preload)
```

## 0. Thiết lập

```bash
cp .env.example .env            # điền ASSETGEN_API_KEY — file .env đã bị gitignore
python3 -m pip install numpy scipy pillow
```

| Biến | Ý nghĩa |
|---|---|
| `ASSETGEN_BASE_URL` | endpoint OpenAI-compatible (`/v1/images/generations`) |
| `ASSETGEN_API_KEY` | key — **không commit** |
| `ASSETGEN_MODEL` | mặc định `xai/grok-imagine-image` |

## 1. Sinh ảnh — `gen.py`

Mỗi asset trong `manifest.json` có `id`, `kind`, `style`, `bg`, `aspect`, `prompt`.
Prompt cuối = `styles[style]` + `prompt` + `backgrounds[bg]`.

```bash
python3 -I tools/assetgen/gen.py --list            # [x] = đã có raw
python3 -I tools/assetgen/gen.py                   # sinh các asset còn thiếu (4 luồng)
python3 -I tools/assetgen/gen.py --only ch_goose   # sinh lại theo tiền tố id
```

Quy ước tiền tố id: `s_` scene · `ch_` sheet nhân vật 3×3 · `pt_` chân dung 2×2 biểu cảm ·
`pr_` prop · `it_` icon · `cg_` cutscene. Sprite/prop dùng nền `magenta` hoặc `green` để tách nền.

## 2. Hậu kỳ — `process.py`

Biến ảnh AI thành pixel art "thật": box-downscale → lượng tử hoá bảng màu → alpha cứng.

| Kind | Xử lý | Mặc định |
|---|---|---|
| scene | cắt viền tối, scale về độ phân giải gốc | scale 0.35, 96 màu |
| prop | tách nền, trim, scale theo chiều cao | h 32, 32 màu |
| icon | như prop | h 24, 24 màu |
| sheet | tách 9 dáng, xếp strip khung đều + JSON | h 40, 32 màu, lưới 3×3 |
| portrait | tách lưới 2×2 biểu cảm | h 80, 48 màu |
| cg | scale về 640×360 (hiển thị 2×) | giữ màu |

Ghi đè theo từng asset trong `tools/assetgen/process.json` (vd `"s_kitchen": {"scale": 0.5}`).

```bash
python3 -I tools/assetgen/process.py ch_goose          # xử lý lại 1 asset
python3 -I tools/assetgen/process.py --contact         # xuất contact sheet để duyệt nhanh
```

## 3. Đăng ký — `index.py`

```bash
python3 -I tools/assetgen/index.py
```

Quét `game/public/assets` và sinh `game/src/data/assetIndex.ts` (SHEETS kèm kích thước khung,
TILES, PROPS, PORTRAITS, CGS). Preload tự nạp mọi thứ có trong index — không cần sửa code khi thêm asset.

## Sheet nhân vật

9 khung, lưới 3×3 trải phẳng: hàng 0 mặt trước (0–2), hàng 1 nghiêng phải (3–5, lật X cho trái),
hàng 2 sau lưng (6–8). Khung giữa mỗi hàng là tư thế đứng. Animation tạo tự động:
`<sheet>:walk-{down|side|up}` (8 fps, khung [b, b+1, b+2, b+1]) và `<sheet>:idle-{dir}`.

## Âm thanh

Xem [audio-bible.md](../audio-bible.md). Toàn bộ do `tools/audio/synth.py` tổng hợp, seed cố định:

```bash
python3 -m pip install -r tools/audio/requirements.txt
python3 -I tools/audio/synth.py --out game/public/assets/audio
```

## Checklist duyệt asset

- [ ] Đọc rõ ở zoom 3× (nhân vật cao ~40px) — không nhoè, viền tối rõ
- [ ] Không còn viền magenta/xanh lá sau khi tách nền
- [ ] Hướng nhìn top-down nhất quán, không isometric
- [ ] Bảng màu ấm, khớp [art-bible.md](../art-bible.md)

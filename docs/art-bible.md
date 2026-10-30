# Art Bible — Học Ăn Học Nấu

## Tinh thần

Ấm áp, hoài niệm, hài hước đời thường. Một buổi trưa hè ở làng quê miền Tây/Nam Bộ: nắng vàng,
gạch bông, quạt trần, bàn ghế nhựa đỏ xanh, bàn thờ ông bà, ruộng lúa, cây dừa.
Hài kiểu "drama nhà mình" — biểu cảm cường điệu, nhưng không xấu xí hay thô.

## Kỹ thuật hiển thị

| Thông số | Giá trị |
|---|---|
| Canvas | 1280×720, scale FIT, `pixelArt: true`, `roundPixels` |
| Zoom thế giới | 3× (minigame có thể 2×) |
| Nhân vật | ~18–33 × 27–41 px/khung, gốc ở chân, y-sort `depth = 10 + y` |
| Prop | cao ~32 px · icon ~24 px |
| Chân dung | ~80 px, hiển thị 2× trong hộp thoại, 4 biểu cảm/ảnh gốc |
| CG | 640×360, hiển thị 2× toàn màn |
| Góc nhìn | top-down trực giao kiểu farming-sim. **Không isometric**, không phối cảnh |

## Bảng màu UI (`game/src/config.ts`)

| Token | Hex | Dùng cho |
|---|---|---|
| ink | `#2b1d14` | viền, chữ chính |
| paper | `#f6e7c8` | nền hộp thoại / panel |
| accent | `#d9572b` | nút, nhấn mạnh, tên người nói |
| gold | `#f2b84b` | tiền, kết cục tốt, lấp lánh |
| leaf | xanh lá | tiến độ, thành công |
| danger | đỏ | máu, cảnh báo |

Panel UI: nền giấy + viền mực 4px + bóng đổ — vẽ bằng `drawPanel()` để đồng bộ mọi hộp.

## Chữ

**Be Vietnam Pro** (400/600/700/800 + italic) — hiển thị tiếng Việt có dấu chuẩn, đọc tốt ở cỡ nhỏ.
Tiêu đề 800, thoại 400–600. Không dùng font pixel cho thoại dài (khó đọc dấu).

## Chuyển động

- Camera bám nhân vật lerp 0.14; pan cutscene ease `Sine.easeInOut`.
- Walk 8 fps; nhân vật "hop" khi ngạc nhiên, bong bóng cảm xúc (!, ?, ♪).
- Mọi chuyển cảnh qua fade đen 350–700 ms; cutscene có letterbox 70 px.
- Hiệu ứng nhấn: rung camera ngắn (≤0.012), flash trắng 120 ms, bụi khi quét/chạy.

## Nguồn ảnh

Sinh bằng AI theo các style prompt trong `tools/assetgen/manifest.json` (`sprite`, `scene`, `portrait`,
`cg`, `icon`) rồi hậu kỳ — xem [pipeline](pipeline/asset-pipeline.md).

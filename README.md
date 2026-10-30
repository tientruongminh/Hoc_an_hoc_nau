# Học Ăn Học Nấu 🍳

> Game phiêu lưu – nấu ăn hài hước, pixel art, bối cảnh làng quê Việt Nam mùa hè.
> **Chương 1 · Mẹ ơi, con nấu!** — vertical slice chơi được từ đầu tới cuối, 6 kết cục.

Mẹ bị té trật tay ngay trước ngày mở quán. Cậu con trai lớp 11 lười biếng phải dọn bếp, rửa chén,
đấu tay đôi với hai con ngỗng già, đạp "chiến mã đời Tống" đi lấy thịt, gỡ tiền ô ăn quan cho thằng bạn
— rồi đứng bếp chiên cơm dưới sự giám sát của bà Lan.

## Chạy game

Yêu cầu: Node 20+.

```bash
cd game
npm install
npm run dev        # http://localhost:5173
```

| Lệnh | Việc |
|---|---|
| `npm run dev` | dev server có HMR |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | unit test (Vitest) — luật ô ăn quan + AI |
| `npm run build` | typecheck + build production ra `game/dist/` |
| `npm run preview` | chạy thử bản build |

### Điều khiển

| Phím | Hành động |
|---|---|
| WASD / phím mũi tên | di chuyển |
| Shift | chạy |
| E / Space | tương tác, qua thoại (giữ E với vật cần "giữ") |
| Q | rải thóc (minigame ngỗng) |

### Phím tắt cho dev

- `?scene=Goose` (`Ride`, `OAnQuan`, `Wash`, `Cooking`, `Ending&id=goose`…) — mở thẳng một scene.
- `?map=kitchen&spawn=center&stage=clean` — vào thẳng bản đồ ở một mốc cốt truyện.
- `?scene=Cooking&step=plate&burnt=1` — nhảy tới màn chấm điểm món ăn.
- `window.__game` — instance Phaser, dùng cho Playwright/debug.

## Cấu trúc repo

```
game/                 Mã nguồn game (Phaser 3 + TypeScript + Vite)
  src/scenes/         Boot/Preload, Title, World, UI overlay, Ending và 5 minigame
  src/story/          Kịch bản chương 1 (setup theo map + stage, cổng thoát, định tuyến minigame)
  src/minigames/      Thành phần riêng của từng minigame
  src/logic/          Logic thuần (không Phaser), có unit test
  src/data/           Map, nhân vật thoại, kết cục, index asset (sinh tự động)
  public/assets/      Asset đã xử lý, sẵn sàng cho game
tools/assetgen/       Pipeline sinh & xử lý ảnh AI → pixel art
tools/audio/          Tổng hợp toàn bộ nhạc/SFX bằng code (numpy/scipy)
art-source/           Ảnh gốc AI (raw/ không đưa vào git — tái tạo được từ manifest)
docs/                 GDD, art/audio bible, pipeline, biên bản họp, tài liệu thiết kế gốc
```

## Tài liệu

- [GDD Chương 1](docs/gdd/chapter1.md) — luồng chơi, minigame, kết cục, tham số cân bằng
- [Art Bible](docs/art-bible.md) — phong cách, bảng màu, kích thước sprite
- [Audio Bible](docs/audio-bible.md) — nhạc ngũ cung, bộ nhạc cụ tổng hợp
- [Asset pipeline](docs/pipeline/asset-pipeline.md) — sinh ảnh → xử lý → index
- [CONTRIBUTING](CONTRIBUTING.md) — quy trình làm việc, quy ước code, checklist PR
- [CHANGELOG](CHANGELOG.md)

## Tech stack

Phaser 3.90 · TypeScript 5.9 (strict) · Vite 8 · Vitest · font Be Vietnam Pro (fontsource).
Ảnh: sinh bằng AI qua endpoint OpenAI-compatible rồi hậu kỳ thành pixel art bằng Python.
Âm thanh: 100% tổng hợp thủ tục — không sample, không lo bản quyền.

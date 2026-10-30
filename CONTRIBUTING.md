# Contributing

## Quy trình

1. Tạo nhánh từ `main`: `feat/<ngắn-gọn>`, `fix/<...>`, `art/<...>`, `audio/<...>`, `docs/<...>`.
2. Commit theo [Conventional Commits](https://www.conventionalcommits.org/):
   `feat(goose): thêm thóc dụ ngỗng`, `fix(world): reset usingInteract khi restart scene`, `art(kitchen): vẽ lại bếp`.
3. Mở PR — CI phải xanh (typecheck, test, build). Ít nhất 1 người review.
4. Cập nhật `CHANGELOG.md` mục *Unreleased* nếu thay đổi người chơi thấy được.

## Quy ước code

- TypeScript `strict`, không `any` nếu tránh được. Format theo `.editorconfig` (2 space, LF).
- **Logic thuần** (luật chơi, chấm điểm, AI) để trong `src/logic/` hoặc `src/minigames/<x>/` và **phải có unit test**.
- Scene không gọi lẫn nhau trực tiếp: minigame kết thúc bằng `finishMinigame(scene, id, result)`
  (`src/systems/Flow.ts`); cốt truyện quyết định đi đâu tiếp trong `src/story/chapter1.ts`.
- UI dùng chung qua `ui(scene)` (thoại, lựa chọn, toast, quest, fade, CG). Không tự vẽ hộp thoại riêng.
- Âm thanh chỉ qua `sfx()` / `music()` / `ambient()` trong `src/systems/Audio.ts`.
- Text hiển thị cho người chơi viết **tiếng Việt có dấu**; thoại bám `docs/design-source/chap1.docx`.
- Scene được `restart` sẽ tái sử dụng instance — mọi field trạng thái phải reset trong `init()`.

## Asset

- Không commit ảnh raw (`art-source/raw/`) — chúng tái tạo được từ `tools/assetgen/manifest.json`.
- Thêm/sửa asset: sửa manifest → `gen.py --only <id>` → `process.py <id>` → `index.py`. Xem
  [docs/pipeline/asset-pipeline.md](docs/pipeline/asset-pipeline.md).
- **Không bao giờ commit `.env`** (chứa API key). Dùng `.env.example` làm mẫu.

## Checklist PR

- [ ] `npm run typecheck && npm test && npm run build` pass trong `game/`
- [ ] Chơi thử đoạn bị ảnh hưởng (dùng `?map=…&stage=…` hoặc `?scene=…`)
- [ ] Không có lỗi console
- [ ] Ảnh chụp/GIF cho thay đổi hình ảnh

# GDD — Chương 1 · Mẹ ơi, con nấu!

Nguồn kịch bản gốc: `docs/design-source/chap1.docx`. Code: `game/src/story/chapter1.ts`.

## Tóm tắt

Nhân vật chính (lớp 11, nghỉ hè) phải gánh việc nhà khi mẹ — bà Lan, chủ quán cơm — té trật tay.
Chương 1 dạy điều khiển, giới thiệu gia đình, làng quê và vòng lặp "việc nhà → minigame → hậu quả".
Thời lượng mục tiêu: 25–35 phút.

## Luồng chơi (stage)

| # | Stage | Nơi | Mục tiêu người chơi | Kết thúc khi |
|---|---|---|---|---|
| 1 | `intro` | phòng ngủ → bếp | nghe tiếng mẹ hét, chạy xuống bếp (CG mẹ té) | dìu mẹ lên gian quán |
| 2 | `find_number` | phòng mẹ | lục tủ tìm sổ tay có số ba, gọi ba | ba về chở mẹ đi trạm xá |
| 3 | `clean` | bếp | lấy chổi, nhặt 5 mảnh lớn, quét 4 chỗ vụn (giữ E), buộc túi rác, đem ra cửa | đặt túi rác |
| 4 | `wash` | bếp | **Minigame Rửa chén** (6 dĩa) | mẹ gọi điện dặn việc |
| 5 | `eggs` | vườn | (tuỳ chọn) lấy thóc; vào vườn → standoff → **Minigame Ngỗng** | đủ trứng / thua |
| 6 | `store_eggs` | bếp | cất trứng cạnh nồi cơm | — |
| 7 | `doors` | bếp, phòng mẹ | đóng cửa sau, cửa sổ bếp, cửa sổ phòng mẹ (0–3, tự chọn) rồi dắt xe ra đường | **Minigame Đạp xe** |
| 8 | `ba8` | nhà bà 8 | nói chuyện, lấy thịt (ghi sổ) | rời đi |
| 9 | `park` | công viên | cutscene lễ hội, Nam, thanh niên → **Minigame Ô ăn quan** | hết ván |
| 10 | `return` | gian quán | về nhà; kiểm tra cửa; ba mẹ về; **lựa chọn Một/Hai** | — |
| 11 | `tidy` | gian quán | xếp 3 chồng ghế (giữ E) | — |
| 12 | `cook` | bếp | **Minigame Chiên cơm** → ba mẹ nếm | kết cục |

Mỗi mốc ghi checkpoint (`localStorage: haohn.save.v1`). Riêng trước khi rời nhà ghi thêm slot `.doors`
để "Thử lại" từ kết cục *Vườn không nhà trống* quay về đúng lúc còn đóng cửa được.

## Kết cục

| Id | Tên | Điều kiện | Loại |
|---|---|---|---|
| `good` | Truyền nhân quán cơm | điểm chiên cơm ≥ 60 | tốt, hết chương |
| `hospital` | (ngộ độc) | điểm chiên cơm < 60 | hết chương |
| `goose` | Bạn đã bị đánh bại bởi hai con ngỗng | bị cắn 5 lần | thua, thử lại |
| `crash` | Té chỏng gọng | trúng 3 chướng ngại khi đạp xe | thua, thử lại |
| `robbed` | Vườn không nhà trống | về nhà khi chưa đóng đủ 3 cửa | thua, thử lại từ slot `.doors` |
| `slipper` | No đòn | chọn "Hai…?" | thua, thử lại |

Bộ sưu tập kết cục lưu ở `haohn.endings.v1`, xem từ màn hình chính.

## Minigame

### Rửa chén — `WashScene`
6 dĩa bẩn; chà bằng chuột hoặc luân phiên A/D. Bọt, tiếng chà, nhúng nước, xếp giá. Không thua; mục tiêu 40–60 s.

### Ngỗng — `GooseScene`
- 2 ngỗng canh 5 + 3 ổ. Ngỗng đi tuần → phát hiện "!" → rượt → lao cắn; bỏ cuộc sau 7 s hoặc khi bạn vào vòng an toàn quanh rổ.
- Ổ hồi 1 trứng/9 s (tối đa 3); **không được lấy quả cuối** (chừa cho gà ấp — đúng lời mẹ dặn).
- Cầm tối đa 3 trứng, bỏ vào rổ cạnh cửa bếp. Bị cắn: knockback, choáng, vỡ hết trứng đang cầm.
- Thóc (nếu đã lấy ở bếp): Q rải, 3 lần, ngỗng ăn 5 s.
- Thắng: 15 trứng, hoặc ≥10 khi hết 2:00. Dưới 10 → chơi lại. 5 lần cắn → kết cục `goose`.

### Đạp xe — `RideScene`
Đường đất cuộn dọc, A/D lái (có trôi & nghiêng), W/S tăng/giảm tốc, cỏ làm chậm. 3 tim.
Chướng ngại tăng dần: ổ gà, vũng nước (chỉ làm chậm), xe máy lạng lách, gà băng qua, trâu.
Gag "xe bay" ở ~52% quãng đường. 3 lần va → `crash`.

### Ô ăn quan — `OAnQuanScene` (+ `logic/oanquan.ts`)
Luật dân gian: 10 ô dân × 5 quân + 2 ô quan; dân 1 điểm, quan 5 điểm; ăn quân qua ô trống, ăn dây chuyền;
**quan non** (< 5 dân) được bảo vệ; hết dân phải rải lại, thiếu thì vay đối thủ, trả nợ cuối ván.
Cược 10k/20k/50k mỗi ván (không quá tiền đang có). AI 3 mức (minimax). Tiền cuối > 50.000đ → nhánh "gỡ được",
ngược lại nhánh "gỡ không nổi". Không có kết cục thua — chỉ đổi thoại.

### Chiên cơm — `CookingScene`
8 bước chấm 0–100, tổng có trọng số: lấy nguyên liệu · đập & đánh trứng (bấm nhanh) · thái theo nhịp ·
chọn lửa (vừa là đúng) · phi tỏi đúng cửa sổ · đổ trứng rồi cơm ở ~80% · đảo chảo theo nhịp · nêm (nước mắm, tiêu, hành).
Lửa to/chờ lâu → khói, chảo sạm; 2 lần cháy hoặc tổng < 45 → dĩa cháy. Mẹ bình luận từng bước.

## Tham số cân bằng chính

| Tham số | Giá trị | File |
|---|---|---|
| Tiền khởi điểm | 50.000đ | `state/GameState.ts` |
| Tốc độ đi / chạy | 62 / 108 px/s | `config.ts` |
| Ngưỡng kết cục tốt | điểm ≥ 60 | `story/chapter1.ts` |
| Ngưỡng thắng ô ăn quan | tiền > 50.000đ | `story/chapter1.ts` |
| Ngỗng: thời gian / trứng tối thiểu / trứng thắng ngay | 2:00 / 10 / 15 | `scenes/GooseScene.ts` |
| Đạp xe: số tim | 3 | `minigames/ride/rideConfig.ts` |

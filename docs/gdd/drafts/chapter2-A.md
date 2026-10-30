# Chương 2 · Ngày Đầu Mở Quán (bản thảo, hướng A: HÀI TRƯỚC)

> Bản thảo v2 (đã tự chấm theo [script-rubric](../script-rubric.md) và sửa chỗ yếu nhất; xem mục 8).
> Nguồn: [chapter2-research](../../research/chapter2-research.md) (ghi tắt **[NC §x]**), GDD [Chương 1](../chapter1.md), `game/src/story/chapter1.ts`, tài liệu gốc *Game play.docx*, *Bối cảnh.docx*, biên bản họp 11/10 và 19/10.
> **[UV]** = chưa có nguồn xác minh, cần người miền Tây duyệt trước khi sản xuất.
> Quy ước trong thoại: `▶` = người chơi thao tác (cắt chuỗi thoại), `⟂` = sự kiện hệ thống/hình ảnh chen ngang, *(nghiêng)* = biểu cảm / chỉ dẫn diễn xuất. Không chuỗi thoại nào quá 6 câu liền mà không có `▶` hoặc `⟂`.

---

## 1. Logline · cảm xúc · thời lượng

**Logline.** Sáng hôm sau cái dĩa cơm chiên định mệnh, cậu con trai 17 tuổi tuyên bố một "kế hoạch tỉ đô" cho quán cơm Bà Lan, rồi trải qua đúng **một ngày mở quán**: lội bùn ra chợ, trả giá tới mức người bán phải đốt vía, nấu dưới sự giám sát của bà mẹ tay bó bột *nghe tiếng muỗng là biết con bỏ mấy muỗng mắm*, phục vụ một quán ghế nhựa kín người, đi giao cơm đám giỗ mà **mãi không tới nơi**. Tối chốt sổ, kế hoạch tỉ đô chỉ hoàn thành đúng một dòng, dòng mẹ viết: *"Đừng làm bể chén."*

**Mục tiêu cảm xúc (theo thứ tự):**
1. **Cười thành tiếng** ít nhất 2 lần mỗi 5 phút, phần lớn do người chơi tự bấm ra (bấm báo lại, trả giá thêm một nấc, hô to, rút phích loa).
2. **Đã mắt**: nước màu chuyển hổ phách, bùn "bụp", dao "phập", chảo sườn bùng lửa dưới đèn dây.
3. **Ấm**: mẹ không cần nói thương; mẹ đổi dĩa cơm cháy cho con lúc con không nhìn.
4. **Muốn chơi tiếp**: tấm bảng kế hoạch còn dở, sổ nợ bà 8 còn số đỏ, và bên kia đường có cái biển hiệu mới vừa sáng đèn.

**Thời lượng mục tiêu:** 40 phút (dao động 34–45 phút). 11 cảnh, 8 minigame mới (3 cái dùng lại khung minigame Chương 1).

**Bối cảnh thời gian:** một ngày cuối tháng 7 dương lịch, mùa mưa (mưa đêm, mưa chiều), mùa chôm chôm; nước kinh bắt đầu lên nhưng **chưa** nước nổi [NC §2: mùa vụ].

**Thanh HUD xuyên chương:**
- Đồng hồ trong ngày (vòng mặt trời 4:30 → 21:00).
- Tiền (thùng thiếc nhỏ, rung "lẻng xẻng" mỗi lần cộng).
- **Mặt mẹ**: 6 nấc biểu cảm (0 nhăn tít · 1 nhăn · 2 bình thường · 3 hơi cười · 4 cười · 5 cười híp mắt). Bắt đầu ở 2.
- **Bảng dự án ma** thu nhỏ góc phải (6 dòng, đánh dấu dần).
- **Sổ nợ bà 8**: "630.000đ" khoanh đỏ (2 ký ba chỉ × 120k + 3 ký sườn × 130k, theo Ch.1).

---

## 2. Bản đồ vòng lặp thưởng

### 2.1 Dòng thời gian theo phút

Quy ước: **N** = thưởng nhỏ (30–60s), **V** = thưởng vừa (3–5 phút), **M** = móc câu cuối cảnh.

| Phút | Cảnh | Thưởng nhỏ (N) liên tục | Thưởng vừa (V) | Tiến bộ thấy bằng mắt |
|---|---|---|---|---|
| 0:00–0:40 | C0 Báo thức | mỗi lần bấm báo lại: mẹ phản ứng mới (giọng to dần, dép bay) | — | — |
| 0:40–2:30 | C0 Bảng kế hoạch | mỗi nam châm dán lên: tiếng "cạch" + 1 câu mẹ đáp; thắp nhang: khói cuộn | **V1** thẻ "Dép bay #2" (nếu bấm báo lại) + bảng dự án ma xuất hiện trên HUD | bảng đen trống → 5 dòng |
| 2:30–3:00 | C1 Xe đạp | xe "rột rột" tuột sên (gag) | — | — |
| 3:00–4:30 | C1 Lội bùn | mỗi bước kéo chân "bụp" + hạt bùn; né xe tạt nước được ★ | — | chân nhân vật lấm dần (đổi sprite) |
| 4:30–5:30 | C1 Trâu & vịt | đàn vịt chạy vòng quanh nhân vật; trâu ngoáp | **V2** đi xuồng máy ông Hai: 6 giây bình minh trên kinh, ảnh "Bình minh trên kinh" vào album | — |
| 5:30–6:00 | C1 Điện thoại | câu chốt "mẹ đang mang dép của con" | — | — |
| 6:00–9:30 | C2 Trả giá | mỗi lá bài: giá nhảy số, cây nhang "vía" sáng/tối; "E HÈM" từ túi quần | **V3** "PHẬP ×3" + thẻ khách quen Chú Sáu + (tuỳ nhánh) cục mỡ / xương cho không | thịt treo trên giỏ xe |
| 9:30–10:00 | C2 → C3 | chú Sáu hô cả chợ biết quán mở | — | — |
| 10:00–11:00 | C3 Vo gạo, đo nước | nước đục → trong; "Ừ. Một đốt." | — | — |
| 11:00–14:30 | C3 Nước màu | màu chảy theo thời gian; mỗi muỗng "cạch/cạnh" mẹ đếm; "XÈO" | **V4** công thức *Nước màu* + *Thịt kho trứng* vào Sổ công thức; mặt mẹ +1 nếu hổ phách | nồi thịt kho bóng đặt lên quầy |
| 14:30–15:00 | C3 → C4 | tin nhắn Nam: "tao có mang LOA" | — | — |
| 15:00–16:30 | C4 Tên quán | 3 bảng tên trend, mẹ đáp từng cái | — | — |
| 16:30–17:30 | C4 Kéo vải | trống dồn, slow-mo, kim tuyến | **V5** bảng hiệu "CƠM BÀ LAN & CON (tập sự)" treo vĩnh viễn | **quán đổi mặt tiền** |
| 17:30–19:00 | C4 Bác Tư mở hàng | tiền đầu tiên "lẻng xẻng"; thẻ khách quen Bác Tư | — | ly trà đá đầu tiên trên bàn |
| 19:00–25:00 | C5 Giờ cao điểm | **mỗi dĩa giao = tiền bay về HUD + bong bóng khen** (≈ 1 dĩa / 12–15s); câu chào có phản ứng riêng | **V6** (phút 21) cô Bảy dĩa thứ ba; **V7** (phút 23) đèn dây, quạt thứ hai; **V8** (phút 25) ảnh "Ghế nhựa kín" | 4 bàn trống → kín 16 ghế; mỗi 5 dĩa thêm 1 món đồ trong quán |
| 25:00–25:30 | C5 Dư âm | ghế gãy "rắc" | — | ghế gãy dựng ở góc (tồn tại tới cuối game) |
| 25:30–28:00 | C6 Cơm cháy | cạo cơm cháy nguyên tấm; mẹ đổi dĩa; đếm tiền giữa ngày | **V9** thẻ "Cơm cháy" (Sổ công thức, mục *ăn vụng*) | bảng dự án ma: "Bán 50 dĩa 27/50" |
| 28:00 | C6 Móc | đơn đặt 20 phần đám giỗ + rủ hái xoài | — | — |
| 28:00–32:00 | C7 Xoài | mỗi trái câu được "bộp"; Tí hứng hụt; | **V10** "Xoài chúa" + bọc chôm chôm + chậu bông giấy (nhánh xin) / thoát chó (nhánh hái) | chậu bông giấy ở cửa quán |
| 32:00–37:00 | C8 Giao cơm | mỗi chặng 45–60s một gag: sên tuột, ngỗng, cầu khỉ, chuông xe | **V11** ảnh "Hai chiếc đò"; tháp đồ bà Năm gói | thúng đồ về nhiều hơn lúc đi |
| 37:00–41:00 | C9 Đám giỗ | "MỘT–HAI–BA–DÔ" (mỗi 8s); mỗi dĩa đặt đúng chỗ "cạch" | **V12** rút phích loa → im lặng → "Ăn đi cho nóng"; ảnh "Mâm giỗ dưới đèn dây" (key art chương) | đèn dây bật sáng lần đầu; quán kín 20 người |
| 41:00–44:00 | C10 Chốt sổ | mỗi xấp tiền "xoẹt" + bộ đếm nhảy số; mỗi nam châm lật một kết quả | **V13** kết cục + thẻ kết cục + gạch sổ nợ | sổ nợ giảm; bảng dự án ma chốt |
| 44:00 | C10 Móc | biển "CƠM BÁ KHÍ" bên kia đường sáng đèn | — | — |

Khoảng trống dài nhất không có thưởng: **≤ 45 giây** (đoạn thoại vào cảnh C8). Kiểm chứng khi playtest.

### 2.2 Móc câu cuối mỗi cảnh

| Cảnh | Móc câu (câu hỏi bỏ ngỏ / thứ vừa lộ ra) |
|---|---|
| C0 | "Khách đầu thì đừng trả giá gắt." Hai nút đều ghi *Ok mẹ*. Liệu có nghe lời? |
| C1 | Ông Hai: "Bữa nào ghé lấy xoài nghen." + (nếu rớt dép) dép mẹ đang nằm đâu đó trong bùn |
| C2 | Chú Sáu hô cả chợ: "Thằng con bà Lan mở quán!" Cả làng đã biết cậu trả giá kiểu gì |
| C3 | Nồi cơm đã bật nút chưa? (game **không** nhắc lại) + Nam: "tao có mang LOA" |
| C4 | Xe công nông chở thợ gặt quẹo vô: "Quán mở chưa con?" |
| C5 | Bảng: "Bán 50 dĩa: 27/50", gần đạt nhưng chưa tới |
| C6 | 20 phần đám giỗ + "Xin hay hái?" (Tí: xin, Mận: hái) |
| C7 | Xoài đã có, nhưng ông Hai sẽ có mặt ở đám giỗ tối nay |
| C8 | Từ trong quán vọng ra: "MỘT – HAI – BA – DÔ!" |
| C9 | Cô 8 ăn sườn: "Sườn cô bán nè. Mẹ mày còn nợ đó nghen." Phải chốt sổ |
| C10 | Biển "CƠM BÁ KHÍ – KHAI TRƯƠNG NGÀY MAI", chủ là thằng thanh niên ô ăn quan. Mẹ: "Mai bán bánh xèo." |

### 2.3 Tiến bộ thấy bằng mắt: quán thay đổi trong một ngày

| Giờ | Gian quán trông thế nào |
|---|---|
| 4:30 | Ghế nhựa chồng cao (đã xếp từ Ch.1), bảng hiệu phủ vải, bàn thờ Ông Địa chưa thắp nhang |
| 9:30 | Bảng hiệu sơn lại + miếng ván "& CON (tập sự)"; bảng thực đơn phấn có dòng tiếng Anh của Nam |
| 11:00→12:30 | Theo số dĩa bán: **5** bình trà đá đầy · **10** Nam treo dây đèn (chưa bật) · **15** quạt đứng thứ hai · **20** mèo hàng xóm tới nằm dưới bàn ("quán có hơi người") · **25** ống đũa mới · **30** tấm giấy "HẾT THỊT KHO" (đã mắt kiểu tự hào) |
| 13:30 | Ghế gãy dựng ở góc (giữ tới hết game, có thể bấm xem: "Ghế của Nam. 15.000đ.") |
| 15:00 | Bọc chôm chôm treo quầy; chậu bông giấy ông Hai cho (nhánh xin) |
| 18:00 | **Đèn dây bật lần đầu** (khoảnh khắc đã mắt), ghế mượn nhà bà 8 kê ra tới đường |
| 20:30 | Quán đêm: đèn dây, bảng dự án ma chốt, sổ nợ gạch bớt |

Đồ trang trí giữ sang Chương 3.

### 2.4 Bộ sưu tập

| Bộ sưu tập | Số mục ở Ch.2 | Cách mở | Hiển thị |
|---|---|---|---|
| **Sổ công thức** | 6: Cơm nấc tay · Nước màu · Thịt kho trứng · Sườn xào chua ngọt · Gỏi xoài · Cơm cháy *(mục ăn vụng)* | làm món; 1–3 sao theo điểm | trang giấy học trò, chữ mẹ viết tay trái nguệch ngoạc |
| **Sổ khách quen** | 9: Chú Sáu · Bác Tư · Bà Chín · Cô Bảy · Tí & Mận · Ông Hai & con Lu · Chú Năm · Bà Năm · Cô 8 (cập nhật) | gặp + tương tác đặc biệt | thẻ có "món ruột" và "tật" của khách (vd. Cô Bảy: *chê trước, gọi thêm sau*) |
| **Album quán** | 6 ảnh: Dép bay · Bình minh trên kinh · PHẬP · Ghế nhựa kín · Hai chiếc đò · Mâm giỗ dưới đèn dây | tự chụp ở khoảnh khắc đã mắt (tiếng "tách" + viền polaroid 0,6s) | lưới ảnh, bấm vào xem lại 3 giây có tiếng |
| **Kết cục** | 9 (mục 4) | đạt điều kiện | như Ch.1 (`haohn.endings.v1`) |
| **Bảng dự án ma** | 6 dòng + 1 dòng của mẹ | đánh dấu cuối ngày | thấy suốt chương trên HUD |
| **Đếm dép bay** | bộ đếm chạy từ Ch.1 | mỗi lần dép (hoặc quạt nan) bay vào khung hình | "Dép bay: 4 lần · Trúng người: 0 lần" (cố ý: dép không bao giờ trúng người) |
| **Món hỏng** | 4: Thịt kho đen thui · Cơm nhão · Sườn khét · Gỏi xoài chín *(ngọt lịm)* | làm hỏng | thẻ hài, có câu mẹ chấm |

---

## 3. Danh sách cảnh

Nhân vật mới (giọng riêng, đọc thoại che tên vẫn đoán ra):

| Nhân vật | Giọng / tật |
|---|---|
| **Chú Sáu** (bán thịt, con bà 8) | to, nhanh, mê tín chuyện mở hàng, hay "trời đất ơi" |
| **Ông Hai** (vườn xoài) | chậm, rộng rãi, câu nào cũng thành lời mời ăn |
| **Tí** (9 tuổi, nít ranh) | tự tin vô căn cứ, nói "anh ơi" mở đầu mọi câu |
| **Mận** (8 tuổi, em Tí) | ít nói, mặt lạnh, nói đúng một câu là trúng tim đen |
| **Cô Bảy** (hàng xóm) | chê trước, gọi thêm sau, "thôi cũng được" |
| **Bà Chín** (bà cụ) | mặt lạnh, đáp gọn |
| **Chú Năm** (nhà có giỗ bên kia kinh) | nói như cầm micro dù không cầm |
| **Bà Năm** (mẹ chú Năm) | hiền, giữ khách bằng đồ ăn |
| **Bác Tư** (từ Ch.1, công viên) | nói bằng hình ảnh cờ, "nước này" |

Nhân vật cũ giữ giọng Ch.1: **Mẹ** (khô, ngắn, đếm số thay cho mắng; "Một." là vũ khí), **Tôi** (làm quá, tự xưng chiến mã/mẫu hậu, làm biếng nhưng thương mẹ), **Nam** (sống bằng cơm ké, nói từ mạng), **Ba** (cưng con, ăn nhiều), **Cô 8** ("dữ trời", nhắc sổ).

---

### C0 · Báo thức ba lần
**Phòng ngủ → gian quán · 4:30 sáng · 2 phút 30**

**Beat**
- *Thiết lập:* 4:30, gà gáy, đồng hồ reng. Ngày mở quán đầu tiên.
- *Leo thang:* mỗi lần người chơi bấm báo lại, mẹ tới gần thêm một bước. Lên gian quán, cậu viết kế hoạch càng lúc càng to.
- *Câu chốt (người chơi bấm):* lần báo lại thứ 3, chiếc dép bay vào, đáp trúng nút tắt đồng hồ. "Bíp." Hoặc nếu dậy ngay: mẹ đứng sẵn ở cửa, dép giơ lên nửa chừng, hơi tiếc.
- *Dư âm:* thắp nhang, khói cuộn, cảnh lặng 5 giây.

**Thoại chính**

⟂ *Màn đen. Gà gáy. Đồng hồ: 4:30. "Reng reng reng."*
▶ **[Space] Báo lại · [E] Dậy**

*Nhánh báo lại (hệ thống, mỗi lần bấm một phản ứng):*
- Lần 1, Mẹ *(vọng từ xa, chữ nhỏ)*: "Dậy chưa con?"
- Lần 2, ⟂ *tiếng dép lẹp xẹp lại gần.* Mẹ *(chữ vừa)*: "Bốn giờ rưỡi rồi nghen."
- Lần 3, ⟂ *im 1,5 giây. Một chiếc dép bay vào khung, xoay chậm, đáp trúng nút tắt đồng hồ.* "Bíp." Mẹ *(ngoài cửa, giọng đều)*: "Dậy rồi đó."
- Lần 4 (nếu còn cố), ⟂ *chiếc dép thứ hai bay vào, đáp chồng lên chiếc thứ nhất, ngay ngắn như trên kệ.* Mẹ: "Hết dép rồi. Lần sau là cây chổi."

*Nhánh dậy ngay:*
⟂ *Cửa mở. Mẹ đứng sẵn, tay trái cầm dép giơ nửa chừng.*
Mẹ *(hơi tiếc)*: "…Ủa, dậy liền hả."
⟂ *Mẹ hạ dép xuống.*
Mẹ: "Ờ. Tốt."

⟂ *Dưới giường không có dép của tôi. Chỉ có đôi dép nhựa hồng có bông của mẹ.*
▶ **[E] Mang đại**

*Gian quán. Bảng đen "KẾ HOẠCH NGÀY 1". Mẹ ngồi ghế bố, tay phải bó bột treo trước ngực.*
Tôi *(smug)*: "Hôm nay là ngày lịch sử. Quán Bà Lan chính thức bước sang kỷ nguyên mới."
Mẹ *(neutral)*: "Kỷ nguyên mới thì nhớ bật nút nồi cơm."
Tôi: "Mẫu hậu coi thường con quá."

▶ **Kéo 4 trong 6 nam châm lên bảng** (mỗi cái "cạch", mẹ đáp 1 câu theo hệ thống):
- *Bán 50 dĩa*: Mẹ: "Bữa đầu mẹ mở quán bán được mười hai dĩa. Ba con ăn hết ba."
- *Trả hết nợ cô 8*: Mẹ: "Ừ. Cái này mẹ thích."
- *Chế món mới*: Mẹ: "Món cũ nấu chưa xong mà chế."
- *Lên xu hướng*: Mẹ: "Xu hướng là cái gì? Bán được hông?"
- *Mở chi nhánh 2*: Mẹ *(mặt lạnh)*: "Chi nhánh 1 còn chưa có khách."
- *Chà sạch hết nồi*: Mẹ: "Con tự ghi đó nghen. Mẹ hổng có ép."

⟂ *Mẹ cầm phấn bằng tay trái, viết thêm dòng thứ năm, chữ ngoằn ngoèo: "ĐỪNG LÀM BỂ CHÉN".*
Tôi: "Mẹ coi thường con thiệt."
Mẹ: "Mẹ coi trọng cái chén."

▶ **Giữ [E] 2 giây: thắp nhang bàn thờ Ông Địa.** ⟂ *Khói cuộn, chuông nhỏ "boong", nhạc tắt.*
⟂ *Bong bóng ý nghĩ:* "Xin cho quán đông khách… mà đừng đông quá… con mới học nấu…"
Mẹ *(mắt nhắm)*: "Khấn gì mà lâu dữ. Đi chợ đi con."
Mẹ: "Ra sạp thằng Sáu, con cô 8. Lấy thêm một ký ba chỉ với ký xương ống. Vốn nè, hai trăm."
Mẹ: "Nhớ nè: mình là khách mở hàng cho người ta. Đừng có trả giá gắt."
▶ **Lựa chọn: [Ok mẹ] [Ok mẹ]** *(hai nút y chang nhau)*
*(Nếu người chơi lưỡng lự > 3 giây)* Mẹ: "…Hai nút giống nhau mà con suy nghĩ lâu dữ vậy."
Mẹ: "Để máy đó. Có gì mẹ nghe."

**Tương tác:** báo thức (hệ thống phản ứng theo số lần bấm), kéo thả nam châm, giữ E thắp nhang. Không thua. Lựa chọn nam châm quyết định tấm bảng cuối ngày (C10).

**Khoảnh khắc đã mắt: "Dép đáp nút"**
- Hình: chiếc dép hồng xoay 1,5 vòng trên nền tối, vệt chuyển động mờ, tia sáng nhỏ khi chạm nút.
- Tiếng: "vút" kéo dài → "bíp" tắt → 1 giây im tuyệt đối → gà gáy.
- Chuyển động: slow-mo 0,4× trong 1,2 giây, đồng hồ nảy nhẹ 2 lần.
- Thời lượng: 2 giây. Tự chụp vào Album: *Dép bay*.

**Thưởng:** thẻ "Dép bay #2" (#1 là Ch.1), bảng dự án ma lên HUD, mặt mẹ +1 nếu dậy ngay / −1 nếu báo lại ≥ 3.
**Móc câu:** "Đừng trả giá gắt." Hai nút đều là *Ok mẹ*.

**Người chơi mang về:** nhà buôn bán miền Tây hay thắp nhang bàn thờ Ông Địa / Thần Tài trước giờ mở hàng. Nguồn: [NC §2] **[UV]**.
**Callback Ch.1:** dép của mẹ; "Đến nồi cơm còn quên bật nút nữa là…"; chén vỡ; "mẫu hậu"; ghế đã xếp.
**Trend lớp phụ:** "Dự án ma" (cấu trúc của cả chương, cơ chế bền); "Ok mẹ" (hai nút giống nhau); "đại đại đi" (nút *Mang đại*).

---

### C1 · Đường ra chợ
**Cổng nhà → đường đất sau mưa đêm → con kinh · 5:00 sáng · 3 phút 30**

**Beat**
- *Thiết lập:* chiến mã (xe đạp Ch.1) tuột sên ngay cú đạp đầu. Đi bộ "có một khúc à".
- *Leo thang (mãi không tới nơi):* bùn ngập mắt cá → đàn vịt chạy đồng chắn đường → con trâu nằm giữa đường, đứng dậy rồi đi **cùng chiều**, chậm rì.
- *Câu chốt (người chơi bấm):* sau hai phút vật lộn, ông Hai chạy xuồng máy song song dưới kinh: "Xuống đây ông chở." Người chơi bấm E nhảy xuống, xuồng vượt qua con trâu trong 6 giây. Mặt cậu lấm bùn tới gối, im lặng.
- *Dư âm:* điện thoại của mẹ.

**Thoại chính**

Tôi *(smug, vỗ yên xe)*: "Chiến mã ơi, hôm nay mình ra trận."
▶ **[E] Leo lên xe** ⟂ *"Cạch… rột rột rột." Sên tuột. Bánh sau xì hơi "xììì" thong thả 3 giây.*
*Dẫn truyện:* Con chiến mã đã tàn, nay còn tàn hơn.
Tôi: "Thôi được. Đi bộ. Có một khúc à."
⟂ *Camera kéo lùi: con đường đất bùn nhão sau mưa đêm, kéo tới chân trời. Bảng gỗ: "CHỢ ← 1,2 km".*

▶ **Minigame Lội bùn, chặng 1 (60s)** *(đặc tả mục 5.1)*
*(Hệ thống, khi kéo chân ra khỏi bùn sâu)* Tôi: "Ư… ư…" ⟂ "BỤP!"
*(Khi xe máy bấm còi phía sau)* Tôi: "Lá chuối! Lá chuối đâu!"

⟂ *Chặng 2: đàn vịt chạy đồng ~40 con băng ngang.*
Tôi *(đứng im, đếm)*: "Một con… hai con… ba mươi lăm…"
*(Nếu người chơi cố đi, vịt tách dòng chạy vòng quanh nhân vật như nước chảy qua cục đá.)*

⟂ *Chặng 3: con trâu nằm giữa đường, nhai.*
Tôi: "Anh trâu. Em có việc gấp."
Trâu: *(nhai)*
▶ **[Chờ] · [Đi vòng bờ ruộng] · [Năn nỉ tiếp]**
- Chờ: trâu nhắm mắt ngủ. *(Quay lại lựa chọn.)*
- Đi vòng: thêm 15 giây lội bùn sâu gấp đôi.
- Năn nỉ tiếp: Tôi: "Em đang mang dép của mẹ em. Dép mà dơ là em tiêu."
  ⟂ *Trâu đứng dậy… rồi đi đúng hướng chợ, chậm rì. Người chơi bị ép đi sau đít trâu 12 giây ở 30% tốc độ. Nhạc nền chậm 50%, méo như băng cát-xét. Nếu người chơi cố vượt, trâu ngoái lại nhìn. "…"*

⟂ *"Tạch tạch tạch." Một chiếc xuồng máy chạy song song dưới kinh.*
Ông Hai: "Ê, con bà Lan! Đi chợ hả? Xuống đây ông chở, ông cũng ra chợ nè."
▶ **[E] Nhảy xuống xuồng**
⟂ *Xuồng lướt 6 giây: sương sớm, mặt trời đỏ, bầy cò bay, vượt qua con trâu. Trâu nhìn theo.*
Tôi *(bùn tới gối, mặt trống rỗng)*: "…Ông chạy đường này mỗi ngày hả ông?"
Ông Hai: "Ờ. Đường bộ ai mà đi, bùn muốn chết."
⟂ *Im 1 giây. Máy xuồng "tạch tạch".*
Ông Hai: "Bữa nào ghé nhà ông lấy xoài nghen. Xoài chín cây rụng đầy gốc, ông già rồi lượm hổng xuể."

⟂ *Tới bến chợ. Điện thoại rung.*
Mẹ: "Tới chưa con?"
Tôi: "Dạ tới rồi. Mà sao mẹ hổng nói con đi xuồng?"
Mẹ: "Mẹ tưởng con biết. Hồi nhỏ con đi hoài mà."
Mẹ: "Mà con đang mang dép của mẹ phải hông?"
Tôi *(shock)*: "…Sao mẹ biết?"
Mẹ: "Tại mẹ đang mang dép của con."
⟂ *Cắt cảnh 1 giây: chân mẹ trong đôi dép tổ ong đen của con, rộng thùng thình.*
Mẹ: "Đôi đó mẹ mang mười mấy năm rồi. Làm mất là biết tay."
*(Nếu đã rớt dép trong bùn)* ⟂ *Camera lia xuống: một chân dép hồng, một chân trần.* Tôi: "Dạ… con giữ kỹ lắm."

**Minigame:** Lội bùn (mục 5.1). Không thua. Kết quả:
- Hạng **Sạch** (≤ 1 lần bị tạt) / **Lấm** / **Tượng bùn** (≥ 4 lần): đổi chân dung "muddy" tới trưa; chú Sáu và bác Tư có câu riêng.
- **Rớt dép** (kéo chân quá mạnh rồi bỏ đi): cờ `lost_slipper` → trả ở C9.

**Khoảnh khắc đã mắt: "Bụp!"**
- Hình: bàn chân bật khỏi bùn, 12 hạt bùn nâu văng hình vòng cung, dép hồng bay lên xoay (nếu kéo quá tay).
- Tiếng: "ọc ọc" (giữ) → "BỤP" trầm → "chẹp" khi đặt chân xuống.
- Chuyển động: rung màn hình 3px/120ms, slow-mo 0,5× trong 0,4s ngay lúc bật.
- Thời lượng: 0,8 giây, lặp ở mỗi lần kéo chân (biến thể cao độ để không nhàm).
- Phụ: **xuồng máy lúc bình minh** 6 giây: nền chuyển hồng → vàng, nước lấp lánh, tiếng "tạch tạch" + chim. Tự chụp: *Bình minh trên kinh*.

**Thưởng:** ★ né tạt nước; ảnh album; thẻ khách quen Ông Hai (mặt trước).
**Móc câu:** lời mời xoài của ông Hai; dép mẹ (nếu mất).

**Người chơi mang về:** ở miền Tây nhiều khi đường thuỷ mới là đường nhanh: đi chợ bằng xuồng dọc kinh. Mùa mưa (tháng 5–10) đường đất sau mưa đêm thành bùn. Nguồn: [NC §2: mùa vụ, mia.vn]; tiếng máy xuồng [NC §2: âm thanh làng] **[UV]**; vịt chạy đồng **[UV]**.
**Callback Ch.1:** "chiến mã đã tàn nay còn tàn hơn"; dép của mẹ; con đường đạp xe của Ch.1 (ổ gà, trâu).
**Trend lớp phụ:** không. Hài thuần cơ chế "mãi không tới nơi" [NC §1 cơ chế 4].
**Nguồn ý tưởng gốc:** *Game play.docx*: "con đường bùn do tối hôm trước mưa lớn, vượt vũng bùn, tránh xe tạt nước". Cục đá cầm tay trong bản gốc đổi thành **lá chuối che tạt nước**, dễ hiểu trong 10 giây.

---

### C2 · Mở hàng cho chú Sáu
**Chợ quê, sạp thịt · 5:30 sáng · 3 phút 30**

**Beat**
- *Thiết lập:* người chơi là khách đầu tiên trong ngày của chú Sáu. Mẹ đang nghe qua điện thoại để trong túi quần.
- *Leo thang (trả giá leo thang + mẹ biết hết):* trả thấp → chú lau mồ hôi → túi quần: "E HÈM" (giá về lại như cũ) → "MỘT." → mẹ cúp máy → vía chú Sáu về 0, chú hoảng, cho không.
- *Câu chốt (người chơi bấm):* bấm **[Trả thấp]** thêm một lần khi giá đã là 0đ: chú Sáu dúi ngược 5 ngàn vào tay người chơi, "mua đại cho chú hên", rồi đốt tờ giấy hươ hươ sau lưng cậu.
- *Dư âm:* "PHẬP ×3" chặt xương; chú Sáu nhắc sổ nợ; chú hô cả chợ.

**Thoại chính**

⟂ *Chợ sáng: đèn bóng vàng, ghe cập bến, tiếng rao. Chú Sáu vừa thắp cây nhang nhỏ cắm ở góc sạp.*
Chú Sáu: "Mở hàng nè, mở hàng nè! Ủa, thằng con bà Lan hả? Má chú nhắc mày hoài."
*(Nếu hạng Tượng bùn)* Chú Sáu: "Trời đất ơi, mày lội bộ ra hả? Đường đó trâu còn hổng thèm đi."
Chú Sáu: "Ba chỉ một ký trăm hai lăm. Xương ống bốn chục. Lấy hông con?"
Tôi *(nghĩ)*: (Mẹ dặn đừng trả giá gắt. Mà… trăm sáu lăm ngàn…)

▶ **Minigame Trả giá** *(mục 5.2)*. Bốn lá: **[Trả thấp] [Chê hàng] [Làm bộ bỏ đi] [Chốt]**.

*Phản ứng hệ thống theo thanh Vía (cây nhang):*
- Vía 100→70, Chú Sáu: "Trời, con trả vầy chú lỗ đó nghen."
- *(Chê hàng)* Tôi: "Miếng này mỡ nhiều quá chú." Chú Sáu: "Mỡ đó là phước đó con!"
- *(Làm bộ bỏ đi)* ⟂ *Nhân vật đi 3 bước.* Chú Sáu: "Ê ê ê, quay lại, quay lại!"
- Vía 70→40, Chú Sáu *(lau mồ hôi)*: "Con… con là khách mở hàng đó nghen con…"
- **Hành động gắt thứ 2**, ⟂ *túi quần rung, chữ to:* **"E HÈM."** Giá nhảy về 165k, vía +20. Tôi *(nhìn túi quần)*: "…"
- **Gắt thứ 3**, ⟂ *túi quần, chữ cực to, rung màn hình:* **"MỘT."**
- **Gắt thứ 4**, ⟂ *im 2 giây… "tút tút tút."* Mẹ cúp máy. Tôi *(sợ hơn cả lúc thấy dép)*: "…Mẹ?"
- Vía về 0, Chú Sáu *(hoảng)*: "Thôi thôi thôi! Chú lạy con! Lấy đi lấy đi, hổng lấy tiền!"
- ▶ **[Trả thấp] khi giá 0đ:** Chú Sáu *(dúi tờ 5 ngàn vào tay)*: "Nè, chú gửi con năm ngàn, mua đại cho chú hên. Đi giùm chú, đi lẹ!"
  ⟂ *Chú quẹt diêm đốt một tờ giấy, hươ hươ sau lưng tôi. Khói bay theo tôi suốt đoạn đường ra bến (hạt khói bám theo sprite 8 giây).*
  Chú Sáu *(thở ra, nói với bà bán rau kế bên)*: "Khách mở hàng mà kì kèo là xui nguyên ngày, phải đốt cái vía đi chị."

*Nhánh khác:*
- ▶ **[Chốt] ngay nước đầu (165k):** Chú Sáu: "Ê! Mua lẹ vậy là hên dữ à nghen! Nè, chú cho thêm cục mỡ về thắng tóp mỡ." *(Vía bùng sáng; mặt mẹ +1.)*
- ▶ **[Chốt] sau 1–2 nước nhẹ (150–160k):** Chú Sáu: "Thôi trăm năm lăm. Coi như con mở hàng đẹp."

⟂ *Chú Sáu đặt xương lên thớt.* **"PHẬP · PHẬP · PHẬP."**
Chú Sáu: "À, má chú dặn: nhà bà Lan ghi sổ sáu trăm ba chục rồi nghen. Hổng có hối, nói vậy thôi."
Tôi: "Dạ con biết… con biết…"
⟂ *Chú Sáu quay ra chợ, hô to:*
- Nhánh đẹp: "Bữa nay thằng con bà Lan mở quán đó bà con ơi! Ghé ủng hộ nghen!"
- Nhánh gắt: "Bà con ơi, thằng con bà Lan mở quán đó! Mà coi chừng, nó trả giá dữ lắm!"

**Minigame:** Trả giá (mục 5.2). Ảnh hưởng về sau:
- Cờ `haggle = fast | fair | harsh`. `harsh`: được xương cho không (dùng ném chó ở C7) + bác Tư trả giá ngược ở C4. `fast`: cục mỡ → món thêm *tóp mỡ* (bàn thợ gặt khen) + khách tới sớm hơn 10% ở C5.

**Khoảnh khắc đã mắt: "PHẬP" (âm thanh đặc trưng của chương)**
- Hình: dao phay chém xuống, 6 mảnh vụn trắng bắn, chữ "PHẬP" đóng dấu đỏ như con dấu, mỗi lần lệch góc 5°.
- Tiếng: "phập" khô, gỗ thớt dội trầm; lần thứ 3 vang hơn.
- Chuyển động: thớt nảy 2px, màn hình rung 2px/80ms mỗi nhát, nhịp 0,45s.
- Thời lượng: 1,5 giây. Tự chụp: *PHẬP*. Âm "phập" tái dùng làm tiếng **xác nhận chốt đơn** suốt chương (như con dấu Papers, Please [NC §4.6]).

**Thưởng:** thẻ Chú Sáu; mỡ / xương / 5 ngàn tuỳ nhánh; tiếng "lẻng xẻng" khi tiền thối.
**Móc câu:** cả chợ đã biết, và biết cậu trả giá kiểu gì.

**Người chơi mang về:** khách mở hàng mua nhanh là hên, trả giá gắt là xui; có nơi người bán đốt giấy sau lưng để "đốt vía". Nguồn: [NC §2: Mở hàng], vietnamnet.vn / vnexpress.net. Câu giải thích đến **sau** câu đùa, 1 câu, từ chú Sáu (người đang xui nên có lý do nói).
**Callback Ch.1:** sổ nợ bà 8 (630k), "Một/Hai" của mẹ.
**Trend lớp phụ:** không. Cơ chế "thánh trả giá chợ quê" + "tiếng đằng hắng reset giá" [NC §1 cơ chế 8].

---

### C3 · Mẹ biết hết
**Bếp (mẹ ngồi gian quán, cách một vách ván) · 6:30 sáng · 4 phút 30**

**Beat**
- *Thiết lập:* mẹ ngồi quay lưng vào vách, mắt nhắm, quạt nan. Ô nhỏ góc màn hình luôn thấy lưng mẹ.
- *Leo thang:* đo nước bằng đốt tay → mẹ biết dư nước → "Lửa riu riu thôi" → *Ok mẹ* → người chơi vặn lửa lớn → mẹ biết → lén thêm muỗng mắm → mẹ biết số muỗng.
- *Câu chốt (người chơi bấm):* người chơi tự đi tới khe vách nhìn trộm. Mẹ đang nhắm mắt. "Muỗng đường kêu *cạch*, muỗng mắm kêu *cạnh*. Mẹ nghe hai chục năm rồi."
- *Dư âm:* mẹ nếm thịt kho (hai phiên bản: hổ phách / đen thui).

**Thoại chính**

Mẹ *(không quay lại)*: "Vô vo gạo đi con. Mười lon."
▶ **Vo gạo:** xoay chuột / A-D 3 vòng, nước đục chuyển trong.
▶ **Đo nước nấc tay** *(mục 5.3)*.
*(Dư nước)* Mẹ: "Dư rồi. Nhão đó." · Tôi: "Mẹ đâu có thấy!" · Mẹ: "Nghe tiếng nước là biết."
*(Thiếu)* Mẹ: "Thiếu. Cơm sống thì thằng Nam cũng hổng ăn."
*(Đúng)* Mẹ: "Ừ. Một đốt." ⟂ *mặt mẹ +1*
Mẹ: "Đốt tay con chứ hổng phải tay mẹ nghen. Tay mẹ đang bó bột."
Mẹ: "Rồi. Bật nút đi con."
⟂ *Điện thoại rung. Tin nhắn Nam: "ê mày, tao qua phụ nha, có cơm ăn ko". Hệ thống tự kéo nhân vật sang trả lời.*
▶ *(Người chơi gõ trả lời từ 3 câu soạn sẵn: "qua lẹ" / "ko có cơm" / "mang LOA qua")*
⟂ **Nút nồi cơm vẫn chưa bật.** *Đèn nồi tắt. Mọi nồi khác bốc hơi, riêng nồi cơm không. Game không nhắc lại.* *(Nếu người chơi rời bếp mà chưa bật, mẹ nói một câu mập mờ: "Nồi cơm nghe êm quá ha." Người tinh ý sẽ hiểu.)*

Mẹ: "Bắc chảo. Hai muỗng đường, chút dầu. Lửa riu riu thôi nghen."
▶ **Lựa chọn: [Ok mẹ] [Ok mẹ]**
▶ **Minigame Thắng nước màu** *(mục 5.4)*. Núm lửa 3 nấc, người chơi tự vặn.
*(Hệ thống, khi vặn lửa lớn)* Mẹ *(ngay lập tức)*: "Nãy ai nói ok mẹ?"
⟂ *Tôi vặn núm về nhỏ, chậm rãi, nhìn quanh.*
*(Nếu giữ lửa lớn thêm 3 giây)* Mẹ: "Một." ⟂ *Cây quạt nan bay qua khe vách, rơi cạch cạnh chân. Đếm dép bay +1 (ghi chú: "quạt nan, tính luôn").*

⟂ *Thả nước màu: đổ nước mắm.* **"XÈO!"**
*(Hệ thống đếm muỗng mắm; mẹ dặn 2)*
- Muỗng thứ 3, Mẹ: "Ba muỗng rồi đó."
- ▶ *Người chơi giữ E "lén" (múc chậm, không tiếng):* Mẹ: "Lén cũng là muỗng thứ tư."
- ▶ *Nếm bằng vá:* Mẹ: "Lấy muỗng nếm. Đừng có nếm cái vá rồi bỏ lại vô nồi."

▶ **Câu chốt: người chơi đi tới khe vách, bấm E nhìn trộm.**
⟂ *Qua khe: mẹ ngồi quay lưng, mắt nhắm, quạt chậm rãi.*
Tôi: "Mẹ… mẹ có thấy gì đâu?"
Mẹ: "Muỗng đường kêu *cạch*, muỗng mắm kêu *cạnh*. Mẹ nghe hai chục năm rồi."
⟂ *Im 1 giây. Tiếng quạt.*

▶ **Thả thịt ba chỉ + trứng** (kéo thả 12 trứng vào nồi, mỗi trứng "tõm").
Tôi: "Trứng này con đổi bằng cái mông với hai con ngỗng đó mẹ."
Mẹ: "Vậy kho mười hai cái. Chừa ba cái mai chiên cơm."

*Mẹ nếm, phiên bản HỔ PHÁCH:*
⟂ *Mẹ nhai. Mắt mở to 0,3 giây, rồi làm bộ bình thường.*
Mẹ: "Cũng… được."
⟂ *Mẹ lặng lẽ gắp miếng thứ hai.*
Tôi: "Mẹ ăn miếng thứ hai rồi đó."
Mẹ: "Mẹ kiểm tra lại."

*Mẹ nếm, phiên bản ĐEN THUI:*
⟂ *Mẹ nhai. 5 giây im, chỉ có tiếng đồng hồ treo tường "tích tắc". Mặt lạnh tanh.*
Mẹ: "Ừ. Đậm đà."
⟂ *Mẹ uống cạn ly trà đá một hơi. Đá "lách cách".*
Mẹ: "Đen vầy là đắng rồi. Lần sau thấy màu hổ phách là tắt, như màu trà đá này nè."
⟂ *Thẻ món hỏng: "Thịt kho đen thui".*

**Minigame:** Đo nước nấc tay (5.3), Thắng nước màu (5.4). Ảnh hưởng:
- Chất lượng nồi thịt kho (Hổ phách / Cánh gián / Đen thui) đổi lời khen chê của khách ở C5 và C9 (vd. bàn thợ gặt: "Thịt kho gì đen như cà phê, mà… cũng ăn hết").
- Cơm (đúng / nhão / sống) đổi câu chê của Cô Bảy.
- **Nút nồi cơm chưa bật → kết cục *Phi dép thần chưởng*** ở đầu C5 (checkpoint ngay đầu C3).

**Khoảnh khắc đã mắt: "Hổ phách → XÈO"**
- Hình: đường trong chảo chuyển trắng → vàng rơm → **hổ phách** (viền sáng nhấp nháy 1,2s = cửa sổ đúng) → nâu cánh gián → đen + khói xám. Lúc đổ nước mắm: cột hơi trắng bùng cao 40px, 20 hạt bọt li ti, chữ "XÈO" nảy.
- Tiếng: sôi lăn tăn nhỏ dần thành lách tách; "XÈO" lớn + rít dài 1,5s; tiếng muỗng **cạch** (đường) / **cạnh** (mắm) là hai mẫu âm khác cao độ, người chơi học được bằng tai.
- Chuyển động: chảo rung 2px/150ms đúng lúc nước mắm chạm chảo [NC §4.5]; chữ XÈO scale 0 → 1,3 → 1.
- Thời lượng: đổi màu 15–19s, cao trào 2 giây.

**Thưởng:** công thức *Nước màu*, *Thịt kho trứng*, *Cơm nấc tay*; mặt mẹ ±1.
**Móc câu:** nồi cơm (nếu chưa bật); tin Nam "tao có mang LOA".

**Người chơi mang về:** nước màu là đường thắng tới màu hổ phách; để lâu thì cháy đắng (đường thắng khô trong dầu cháy sau 2–3 phút). Nguồn: [NC §3], vnexpress.net. Đo nước cơm bằng một đốt ngón tay **[UV]** (nguồn chỉ có tỉ lệ, dienmayxanh.com). Mẹ giải thích 1 câu, sau câu đùa, vì mẹ là người đang dạy.
**Callback Ch.1:** trứng lấy từ vườn ngỗng; "chừa trứng" (lời dặn Ch.1); "Một"; nồi cơm quên bật nút; mẹ giám sát.
**Trend lớp phụ:** "Ok mẹ" (lựa chọn hai nút giống nhau, hiểu được dù không biết trend). Câu chốt chính là cơ chế bền "mẹ biết hết" [NC §1 cơ chế 5].

---

### C4 · Khai trương
**Gian quán & mặt tiền · 9:30 sáng · 4 phút**

**Beat**
- *Thiết lập:* Nam tới, chở loa kẹo kéo, xưng "truyền thông, trả lương bằng cơm". Đề xuất tên quán theo mạng.
- *Leo thang:* lễ kéo vải hoành tráng: trống dồn, slow-mo, kim tuyến… vải mắc đinh.
- *Câu chốt (người chơi bấm):* người chơi giật vải; vải rách rơi trùm lên đầu Nam, ống pháo giấy nổ "bụp" bên trong. Lộ ra: vẫn là bảng "CƠM BÀ LAN", chỉ thêm miếng ván nhỏ "& CON (tập sự)" mẹ viết tay trái.
- *Dư âm (ấm):* "Tay trái mà. Viết ba lần mới được vậy đó." Rồi khách mở hàng đầu tiên: bác Tư.

**Thoại chính**

⟂ *Nam đạp xe tới, cái loa kẹo kéo cột trên baga, nghiêng 30°.*
Nam *(happy)*: "Chúc mừng khai trương! Tao làm truyền thông cho mày. Trả lương bằng cơm."
Tôi: "Lương bằng cơm là mày lời đó."
Mẹ: "Thằng Nam ăn ba dĩa, bằng tiền điện một tuần."
Nam: "Con ăn ít lắm cô. Bữa nay con mới ăn có hai gói mì."
⟂ *Nam lật ba tấm bìa carton, chữ kẻ bằng bút lông.*

▶ **Chọn 1 tấm đưa mẹ coi:**
- *CƠM BÁ KHÍ*, Mẹ: "Bá gì? Bá Lan hả?"
- *CƠM KHÁ NICHE*, Mẹ: "Ních? Ních cho đầy bụng hả? Ờ, cái đó được." ⟂ *Nam giơ ngón cái. Tôi lắc đầu.*
- *CƠM TUYỆT ĐỐI ĐIỆN ẢNH*, Mẹ: "Quán cơm chứ đâu phải rạp hát."
Mẹ: "Thôi. Bảng cũ còn tốt. Mà mẹ có cái này." ⟂ *chỉ tấm vải phủ bảng hiệu.*
Nam: "Để tao lo hiệu ứng! Mày kéo vải, tao bật nhạc. Ba, hai, một!"

▶ **Giữ [E] kéo vải** *(mục 5.5, tương tác ngắn)*
⟂ *Loa kẹo kéo rè rè trống dồn. 60%: slow-mo. 90%: vải mắc đinh, dừng khựng, nhạc kẹt một nhịp.*
▶ **[A]/[D] giật!**
⟂ *"Roẹt." Vải rách, rơi trùm đầu Nam. "Bụp" nghẹt bên trong: kim tuyến phụt ra từ mép vải. Nam đứng im dưới tấm vải.*
⟂ *Bảng hiệu: "CƠM BÀ LAN" sơn lại mới. Treo dưới: miếng ván nhỏ "& CON (tập sự)", chữ ngoằn ngoèo.*
⟂ *Nhạc tắt. Im 2 giây. Chỉ còn tiếng ve.*
Tôi: "…Chữ ai mà xấu dữ vậy."
Mẹ: "Tay trái mà. Viết ba lần mới được vậy đó."
⟂ *Chân dung Tôi đổi biểu cảm "moved". Không nói gì 1,5 giây.*
Tôi: "…Mà chữ 'tập sự' mẹ viết to hơn chữ 'con' nữa."
Mẹ: "Cố ý đó."
Nam *(dưới tấm vải)*: "Xong chưa? Tao ra được chưa?"

▶ *(Tuỳ chọn) Bấm xem bảng thực đơn:* Nam ghi thêm tiếng Anh bằng phấn.
> Thịt kho trứng: *Meat Warehouse Egg*
> Canh chua: *Sour Guard*
> Cơm chiên (bởi Con): *Fried Rice (by Con)*

Tôi: "'Kho' là cái kho chứa đồ hả mày?" · Nam: "Thì kho là kho." · Mẹ: "Viết tiếng Tây chi, ở đây ai đọc." · Nam: "Lỡ Tây về quê thì sao cô."

⟂ *Bác Tư chắp tay sau lưng đi tới.*
Bác Tư: "Nghe nói quán bà Lan nay có đầu bếp mới. Bác tới mở hàng nè."
Tôi: "Dạ bác Tư! Dĩa cơm thịt kho hai lăm ngàn bác."

*Nhánh `haggle = fast | fair`:*
Bác Tư: "Hai lăm hả. Bác mua lẹ cho con hên." ⟂ *đưa 30 ngàn* "Thối làm chi, lấy hên."

*Nhánh `haggle = harsh` (quả báo nhẹ, đổi vai):*
Bác Tư *(cười hiền)*: "Thằng Sáu nói con trả giá dữ lắm. Bác học theo nghen. Hai chục."
▶ **Trả giá ngược**: giờ người chơi là người bán; cây nhang trên bàn thờ Ông Địa của quán chính là thanh Vía **của mình**, mỗi lần bác Tư bớt nó lụn đi.
Tôi *(hoảng)*: "Bác ơi, con là… con là chủ quán mở hàng…"
Bác Tư: "Ừ, bác biết. Mười lăm."
▶ **[Bán đại cho hên] · [Giữ giá] · [Gạ một nước ô ăn quan]**
- *Giữ giá* hai lần → bác Tư đứng dậy. ⟂ *Mẹ, mặt lạnh tanh:* "E hèm." ⟂ *Bác Tư ngồi xuống lại:* "Thôi hai lăm." *(mẹ đằng hắng là giá reset, lần này về phía mình)*
- *Gạ ô ăn quan:* thế cờ dựng sẵn, 1 nước (mục 5.5). Đúng (ăn dây chuyền 2 ô): Bác Tư: "Nước này được! Trả đủ, thêm năm ngàn cho thằng đánh cờ giỏi." Sai: Bác Tư ăn ngược 1 ô: "Mười ngàn nghen con."
- *Bán đại cho hên:* 20k. Bác Tư: "Con biết điều. Mai bác dẫn ông Ba bên chợ qua." (thêm 1 khách ở C5)

⟂ *"Bình bịch bình bịch." Một chiếc xe công nông chở thợ gặt quẹo vô.* Thợ gặt: "Quán mở chưa con? Sáu người nè!"

**Khoảnh khắc đã mắt: "Kéo vải"**
- Hình: tấm vải đỏ trượt chậm, 30 hạt kim tuyến vàng bạc rơi xoay, nắng xiên qua bụi.
- Tiếng: trống dồn từ loa rè → kẹt một nhịp "rẹt" (lúc mắc đinh) → "roẹt" → "bụp" nghẹt → im lặng + ve.
- Chuyển động: slow-mo 0,5× từ 60% đến 90%, bảng hiệu đung đưa 2 nhịp rồi đứng.
- Thời lượng: 4 giây.

**Thưởng:** bảng hiệu mới (vĩnh viễn), thẻ Bác Tư, tiền đầu tiên, mặt mẹ +1 (nếu bác trả đủ).
**Móc câu:** xe công nông, sáu người.

**Người chơi mang về:** người bán cũng sợ khách mở hàng của mình trả gắt, nên giữ khách đầu bằng mọi giá. Nguồn: [NC §2: Mở hàng]. Ô ăn quan ăn dây chuyền qua ô trống (luật Ch.1, `logic/oanquan.ts`).
**Callback Ch.1:** bác Tư ("rảnh qua nhà bác đánh vài ván"), ô ăn quan, Nam, "dữ trời".
**Trend lớp phụ:** "Bá khí", "Khá niche", "Tuyệt đối điện ảnh" (tên bảng của Nam; bỏ đi thì cảnh vẫn đứng, đúng nghĩa lớp phụ); "Từ điển ẩm thực Việt" (Meat Warehouse Egg). Câu chốt chính là cú bẻ lái "build-up hoành tráng cho thứ quen thuộc" + vải trùm Nam (slapstick).

---

### C5 · Ghế nhựa kín
**Gian quán · 11:00–12:30 · 6 phút**

**Beat**
- *Thiết lập:* 4 bàn, 16 ghế nhựa. Khách tới đều.
- *Leo thang:* khách đông dần → cô Bảy chê mà gọi thêm → đồ ăn rớt → hết thịt kho → đợt thợ gặt thứ hai, nhạc nhanh 1,25×.
- *Câu chốt (người chơi bấm):* (1) người chơi chọn **hô to** "DĨA THỨ BA CỦA CÔ BẢY ĐÂY!", cả quán quay đầu cùng lúc; (2) người chơi bưng **quá 3 dĩa**, một cục sườn rớt, Nam và thằng Tí đứng hình, rồi cả hai cúi xuống "chỉnh quai dép" (Tí đi chân đất).
- *Dư âm:* Nam ngồi phịch xuống ghế: "rắc". "Ghế đó mười lăm ngàn."

**Minigame Giờ cao điểm** *(mục 5.6)*. Thoại trong cảnh chủ yếu là bong bóng ngắn; dưới đây là các sự kiện có kịch bản.

**Hệ thống câu chào** (mỗi khách ngồi xuống, vòng chọn 2 giây, có thể bỏ qua):
**[Dạ ăn gì cô chú?] · [Cơm nước gì chưa người đẹp?] · [Vô ngồi đại đi!]**

| Khách | "Người đẹp" | "Vô ngồi đại đi" |
|---|---|---|
| Thợ gặt | cả bàn cười rần: "Thằng nhỏ lẻo mép ghê!" (+5k tip) | "Đại thì đại!" (gọi món nhanh 30%) |
| Bà Chín | *(mặt lạnh)* "Người đẹp ăn rồi. Ăn từ hồi ba má con chưa quen nhau." (vẫn gọi 1 dĩa) | "Ngồi đại mà gãy ghế ai thường?" *(cài cho gag ghế gãy)* |
| Cô Bảy | "Nịnh hoài. …Thêm cái trứng." | "Đại gì, cô ngồi chỗ quạt." |
| Tí | "Anh khùng hả?" | "Dạ!" *(ngồi luôn lên bàn)* |

**Sự kiện có kịch bản**

⟂ *0:30.* Mẹ *(ngồi ghế bố, đếm bằng tay trái)*: "Bàn hai chưa có trà đá."
⟂ *1:30. Cô Bảy ngồi bàn 4.*
Cô Bảy: "Quán mới hả? Để coi…" ⟂ *nếm* "Hơi mặn. Thôi cũng được. Thêm dĩa nữa."
⟂ *Đồ ăn rớt (kích hoạt khi người chơi bưng > 3 dĩa; nếu tới 3:00 chưa xảy ra thì kích hoạt 1 lần khi va bàn). Cục sườn rớt xuống nền gạch. Đóng băng khung hình. Nhạc tắt. Nam (đang bưng trà) và Tí (bàn 3) cùng nhìn cục sườn. 2 giây.*
⟂ *Đôi đũa bếp dài của mẹ thò vào khung, gắp cục sườn trước.*
Mẹ: "Rớt là của con Vàng."
⟂ *Con chó Vàng ngoe nguẩy. Nam cúi xuống chỉnh quai dép. Tí cúi xuống… chỉnh quai dép, dù đi chân đất.*
⟂ *3:30. Cô Bảy dĩa thứ hai.* Cô Bảy: "Cơm gì đâu mà… thôi cũng được. Thêm dĩa nữa."
⟂ *4:00. Người chơi bưng dĩa thứ ba tới bàn 4.*
▶ **[Đưa nhẹ nhàng] · [HÔ TO]**
- **HÔ TO:** Tôi: **"DĨA THỨ BA CỦA CÔ BẢY ĐÂY!"**
  ⟂ *Mọi khách quay đầu cùng lúc ("xoẹt" ×12, hệ thống). Im 1 giây.*
  Cô Bảy: "…Tại… tại cơm nguội mau quá, ăn lẹ cho nó nóng."
  Thợ gặt: "Nguội mà ăn ba dĩa, nóng chắc chị ăn năm dĩa!"
  ⟂ *Cả quán cười. Cô Bảy trả tiền, nhét thêm 10 ngàn vào tay tôi.* Cô Bảy *(thì thầm)*: "Đừng có nói với ai."
  Tôi: "Dạ con hổng nói." ⟂ *Camera lia: cả quán vẫn đang nhìn.*
- **Đưa nhẹ:** Cô Bảy *(thì thầm)*: "Ngon. Mà đừng nói ai nghe." (+5k)
⟂ *5:00.* Mẹ: "Hết thịt kho rồi. Còn sườn." ▶ *Lật bảng "HẾT"* (tiếng "cạch" tự hào, chữ đỏ). Từ đây sườn xào làm tại chỗ (mini 3 nhịp đảo + né dầu bắn).
⟂ *5:30. Xe công nông thứ hai, 6 thợ. Nhạc 1,25×. 16/16 ghế.*
⟂ *6:00. Hết giờ.*

**Dư âm**
⟂ *Khách về. Quạt quay. Nam ngồi phịch xuống ghế nhựa.* **"RẮC."** ⟂ *Chân ghế gãy. Im 1 giây.*
Mẹ: "Ghế đó mười lăm ngàn."
Nam: "Trừ lương con đi cô."
Mẹ: "Con có lương hồi nào?"
⟂ *Nam nhìn tôi. Tôi nhìn chỗ khác.*

**Kết quả & ảnh hưởng:**
- Số dĩa bán (18–32) → bảng "Bán 50 dĩa: x/50" (gần đạt có chủ ý; đám giỗ 20 phần có thể kéo lên đủ).
- ≥ 7 khách bỏ về → kết cục **Ghế nhựa ngồi chơi** (checkpoint đầu C5).
- Thẻ khách quen: Bà Chín, Cô Bảy (mặt "chê trước gọi sau" nếu HÔ TO), thợ gặt (nhóm).

**Khoảnh khắc đã mắt: "Ghế nhựa kín"**
- Hình: 16 ghế đủ màu đều có người, hơi nước bốc từ mọi dĩa, nắng trưa xuyên mái tôn thành vệt.
- Tiếng: nhạc dừng đột ngột → tiếng muỗng đũa, cười nói hoà vào nhau → "tách" máy ảnh.
- Chuyển động: camera kéo lên cao 1,5 giây (ease-out), khung đứng 1 giây, viền polaroid trượt vào.
- Thời lượng: 3 giây. Tự chụp: *Ghế nhựa kín*.
- Phụ, thưởng mỗi dĩa: đồng tiền bay vòng cung về HUD, "lẻng" cao độ tăng dần theo combo giao liên tục (tối đa 8 bậc).

**Thưởng nhỏ liên tục:** tiền mỗi dĩa (12–15s/lần), tip, câu chào có phản ứng, đồ trang trí mỗi 5 dĩa (mục 2.3).
**Thưởng vừa:** cô Bảy, đèn dây, ảnh album.
**Móc câu:** "27/50", gần đạt.

**Người chơi mang về:** quán cơm quê buổi trưa là chỗ thợ gặt ghé (lúa hè thu thu hoạch giữa hè **[UV]**); trà đá miễn phí là luật bất thành văn của quán cơm bình dân **[UV]**.
**Callback Ch.1:** tiếng "rắc" (tay mẹ ở Ch.1 → ghế Nam ở Ch.2); Nam ăn ké; ghế nhựa đã xếp ở Ch.1.
**Trend lớp phụ:** "Cơm nước gì chưa người đẹp?" (chỉ là một lựa chọn câu chào, câu chốt là phản ứng mặt lạnh của bà Chín: cơ chế "câu cũ sai thế hệ" [NC §1 cơ chế 11]); "Đồ ăn rớt" là cơ chế bền [NC §1 cơ chế 3]; "đại đại đi".

---

### C6 · Cơm cháy
**Gian quán vắng · 13:30 · 2 phút 30 · CẢNH LẶNG**

**Beat**
- *Thiết lập:* quán vắng, quạt trần cọt kẹt, ve kêu, con mèo hàng xóm ngủ. Hai mẹ con ăn trưa muộn.
- *Leo thang (nhỏ, ấm):* ai được miếng cơm cháy to.
- *Câu chốt (người chơi bấm):* chọn ai cũng vậy, lúc camera quay lại thì dĩa đã bị mẹ đổi: con luôn có miếng to.
- *Dư âm:* "Ba con ăn bốn. Mẹ nói giảm cho ổng." Rồi móc câu: Tí, Mận, đơn đám giỗ.

**Thoại chính**

▶ **Giữ [E] cạo cơm cháy đáy nồi** *(mục 5.7)*. Nguyên tấm = ★.
Mẹ: "Cơm cháy để mẹ."
Tôi: "Mẹ đau tay mà ăn cơm cháy cứng."
Mẹ: "Mẹ đau tay chứ đâu có đau răng."
▶ **Chia cơm cháy: [Mẹ miếng to] · [Con miếng to] · [Bẻ đôi]**
- *Mẹ miếng to:* ⟂ *Tôi quay đi lấy nước mắm. Cắt về: hai dĩa đã đổi chỗ.* Tôi: "…Ủa?" · Mẹ *(nhai)*: "Gì?"
- *Con miếng to:* Mẹ: "Ừ, ăn đi. Lớn đầu rồi còn giành với mẹ." ⟂ *Mẹ lén gắp miếng thịt kho bỏ qua dĩa con.*
- *Bẻ đôi:* ⟂ *Gãy lệch. Cả hai nhìn nửa to. Mẹ đẩy nửa to qua.*
⟂ *Mẹ gắp miếng thịt bằng tay trái, rớt. Gắp lại, rớt.*
▶ **[E] Gắp giùm mẹ**
Tôi: "Mẹ há miệng."
Mẹ: "Mẹ trật tay chứ đâu có trật miệng."
⟂ *Mẹ vẫn ăn. Mặt mẹ +1.*

▶ **Đếm tiền giữa ngày** (15 giây, dạng rút gọn của 5.8).
Mẹ: "Bữa đầu mẹ mở quán bán được mười hai dĩa."
Tôi: "Ba ăn ba dĩa."
Mẹ: "Ba con ăn bốn. Mẹ nói giảm cho ổng."

⟂ *Hai cái đầu nhỏ ló lên ở cửa sổ.*
Tí: "Anh ơi! Chiều đi hái xoài hông? Xoài ông Hai chín rụng đầy gốc!"
Mận: "Ổng ngủ trưa tới ba giờ."
Mẹ *(mắt nhắm, không quay lại)*: "Xin hay hái?"
Tí: "…Dạ xin."
Mận: "Dạ hái."
⟂ *Tí và Mận nhìn nhau.*
⟂ *Điện thoại reo.*
Chú Năm *(như đang cầm micro)*: "Con bà Lan hả? Chú Năm bên kia kinh nè! Tối nay giỗ ba chú, đặt hai chục phần cơm! Có gỏi xoài thì càng tốt nghen!"
Tôi: "Dạ được chú!"
Mẹ: "Xoài đâu mà gỏi?"
⟂ *Tí và Mận cười nhe răng ở cửa sổ.*

**Khoảnh khắc đã mắt: "Cơm cháy nguyên tấm"**
- Hình: vá lách vào mép nồi, tấm cơm cháy vàng ruộm bong ra nguyên mảng tròn như cái dĩa, vụn vàng rơi.
- Tiếng: "sột… sột… rắc" giòn, rồi "cộp" khi đặt lên dĩa.
- Chuyển động: tấm cơm cháy nhấc lên chậm, xoay nhẹ 10°, lấp lánh 0,5s.
- Thời lượng: 3 giây.

**Thưởng:** công thức *Cơm cháy (mục ăn vụng)*, mặt mẹ +1, bảng dự án ma cập nhật.
**Móc câu:** 20 phần + gỏi xoài; xin hay hái.

**Người chơi mang về:** nhà Việt chia đồ ăn thay lời thương, mẹ luôn đẩy phần ngon về phía con. Nguồn: [NC §2], vietcetera.com. Cơm cháy đáy nồi là món "ăn vụng" quen của bếp nhà **[UV]**.
**Callback Ch.1:** tay bó bột; ba (Ch.1 "con zai iu"); "Bữa đầu mẹ bán mười hai dĩa" (C0); "dữ trời".
**Trend lớp phụ:** không (cố ý: cảnh lặng).

---

### C7 · Xin hay hái?
**Vườn xoài ông Hai · 14:30 · 4 phút · RẼ NHÁNH**

**Beat**
- *Thiết lập:* ông Hai ngủ võng, con Lu ngủ dưới võng, cây xoài sai trái. Ông Hai đã mời từ sáng (C1), nên hái trộm là ngu một cách thừa thãi. Đó là cái hài.
- *Leo thang:* nhánh hái: Tí "canh" bằng cách hô "AN TOÀN!" mỗi lúc một to.
- *Câu chốt (người chơi bấm):*
  - Nhánh xin: người chơi câu trái **xoài chúa** trên ngọn → cả cành rung, mưa 12 trái, Tí bị vùi tới cổ, Mận cầm nón lá hứng đúng 1 trái, mặt lạnh: **"Một."**
  - Nhánh hái: bị bắt → về quán, mẹ: "Một." … ông Hai cho luôn bọc xoài… mẹ: "Hai." Ông Hai giật mình: "Ủa, tui có làm gì đâu?!"
- *Dư âm:* xoài về quán.

**Thoại chính**

⟂ *Hàng rào dâm bụt. Võng. Tiếng ngáy. Con Lu nằm dưới võng.*
Tí: "Anh ơi, xin chi, ổng ngủ rồi. Anh trèo, em canh. Em canh giỏi lắm."
Mận: "Bữa trước ảnh canh, ổng thức dậy ảnh còn chào ổng."
▶ **[Gõ cổng xin] · [Trèo đại]**

**Nhánh A: Xin**
Tôi: "Ông Hai ơi! Con xin mấy trái xoài."
Ông Hai *(mắt vẫn nhắm)*: "Thì ông mời bây hồi sáng rồi mà. Sào ở vách đó."
▶ **Minigame Câu xoài, 45 giây** *(mục 5.9)*. Cần 6 trái xanh (gỏi) + tuỳ ý trái chín.
*(Hệ thống, Tí hứng hụt, trái rơi trúng đầu "bộp")* Tí: "Hổng sao! Em còn cái đầu!" / "Hổng sao! Trái này mềm!" / "…Anh ơi, đầu em có u chưa?"
*(Câu trái chín khi cần trái xanh)* Mận: "Chín rồi anh. Gỏi thì phải xanh."
▶ **Câu chốt: câu xoài chúa trên ngọn.**
⟂ *Cả cành rung. 12 trái rơi. Tí đứng giữa, bị vùi tới cổ. Mận đứng bên, giơ nón lá, hứng đúng 1 trái.*
Mận *(mặt lạnh)*: **"Một."**
⟂ *Ông Hai mở mắt, cười khà.*
Ông Hai: "Lượm hết đi con, ông ăn hổng hết. Nè, bọc chôm chôm nữa, đem về cho má bây."
Ông Hai: "Chậu bông giấy này nữa, để trước quán cho có màu. Tối ông qua ăn cơm nghen."

**Nhánh B: Trèo đại**
▶ **Minigame Hái trộm** *(mục 5.10)*: trèo (nhịp W/S), hái (E), thanh Tiếng ồn.
*(Hệ thống, Tí "canh", mỗi ~6s, to dần)* Tí: "An toàn!" … "AN TOÀN!" … **"ANH ƠI AN TOÀN NHA!"**
Mận *(thì thầm)*: "Ảnh la vậy là hết an toàn rồi."
⟂ *50%: tai con Lu giật. 80%: Lu mở một mắt. 100%: Lu sủa, ông Hai thức.*

- **B1: Ông Hai thức khi đang trên cây →** ⟂ *Ông Hai nhìn lên. Im 2 giây.*
  Ông Hai: "…Xoài ngọt hông con?"
  Tôi *(trên cây)*: "…Dạ… cũng ngọt."
  → **Kết cục *Bị hàng xóm méc vốn*** (cutscene ở mục 4).
- **B2: Xuống được, Lu đuổi** → chạy tới hàng rào 15 giây, thanh thể lực.
  - Có xương ống (mua ở chợ, hoặc cho không ở nhánh `harsh`): ▶ **[Q] ném xương** → Lu dừng gặm, vẫy đuôi. Thoát sạch. *(Đổi lại: mất xương nấu canh, tối nay không có canh chua.)*
  - Hết thể lực: ⟂ *Lu ngoạm đáy quần "roẹt".* → **Kết cục *3 mũi 1tr5*** (mục 4).
- **B3: Thoát sạch** → tiếp tục, cờ `stolen_mango` (trả ở C9).

**Minigame:** Câu xoài (5.9) / Hái trộm (5.10). Ảnh hưởng: có gỏi xoài hay không ở C9; ông Hai là khách quen (A) hoặc người "biết hết" (B3); chậu bông giấy (A).

**Khoảnh khắc đã mắt: "Mưa xoài"**
- Hình: 12 trái xoài vàng xanh rơi lệch nhịp, lá rụng xoay, Tí ngập tới cổ, ánh nắng chiều xuyên tán lá thành đốm.
- Tiếng: "bộp bộp bộp" dày dần như mưa đá, lá xào xạc, cuối cùng 1 tiếng "bộp" nhỏ vào nón lá của Mận.
- Chuyển động: cành cây cong xuống rồi bật lên (lò xo 2 nhịp), màn hình rung nhẹ 2px theo từng trái lớn.
- Thời lượng: 2,5 giây.

**Thưởng:** xoài, bọc chôm chôm, chậu bông giấy (A); thẻ Tí & Mận, thẻ Ông Hai & Lu; kết cục mới (B1/B2).
**Móc câu:** "Tối ông qua ăn cơm" (A) / ông Hai sẽ có mặt ở đám giỗ (B3).

**Người chơi mang về:** hè miền Tây là mùa chôm chôm, xoài; xin trái nhà hàng xóm thường được cho thêm cả bọc trái khác. Nguồn mùa: [NC §2: mùa vụ], tuoitre.vn (xoài có thể sớm hơn **[UV]**); phong tục cho thêm **[UV]**. Gỏi xoài dùng xoài xanh **[UV]**.
**Callback Ch.1:** "Một/Hai" của mẹ (Mận nói "Một"; mẹ nói "Hai" ở kết cục B1); ngỗng/chó là "boss" theo tài liệu gốc.
**Trend lớp phụ:** không. Cơ chế: kẻ canh gác ồn nhất (NPC phản ứng theo hệ thống [NC §4.2]).
**An toàn:** chó chỉ ngoạm quần; nhánh bị cắn dẫn thẳng tới **đi chích ngừa** (hành động đúng ngoài đời), không có cảnh tự xử lý vết cắn.

---

### C8 · Giao cơm qua kinh
**Đường làng → ngõ ngỗng → cầu khỉ → bến đò → nhà chú Năm · 16:00, mưa chiều · 5 phút**

**Beat**
- *Thiết lập:* "Mười lăm phút là tới."
- *Leo thang (mãi không tới nơi):* sên tuột → đàn ngỗng → cầu khỉ trơn trong mưa → đò "đợi đủ năm người".
- *Câu chốt (người chơi bấm):* người chơi bấm chuông xe, hô sang bờ bên kia "CƠM ĐÁM GIỖ TỚI RỒI!". Bên kia hô lại "Lâu quá, tụi chú qua bển ăn luôn!". Hai chiếc đò, một chở cơm đi, một chở khách về quán, lướt ngang nhau giữa kinh. Im lặng. Một chú bên kia giơ đôi đũa vẫy.
- *Dư âm:* bà Năm gói đồ cho mang về; về nhà xách nhiều đồ hơn lúc đi.

**Thoại chính**

⟂ *20 cà mên cơm chằng trên baga, thau gỏi xoài (nếu có) Nam ôm ngồi sau.*
Mẹ: "Nhà chú Năm bên kia kinh. Qua cầu khỉ rồi đi đò. Năm giờ người ta cúng. Đi đi."
Tôi: "Dạ. Mười lăm phút là tới."
Mẹ *(không ngẩng lên)*: "Ừ. Câu đó mẹ nghe hai chục năm rồi."
Nam: "Tao bấm giờ nha. Mười lăm phút."
⟂ *HUD: đồng hồ đếm ngược "Cúng: 17:00".*

▶ **Chặng 1, đạp xe trong mưa** (khung `RideScene`, 50s): vũng nước, mưa nghiêng.
⟂ *Sên tuột.* ▶ **Giữ [E] + xoay [A]/[D]: tra sên** (5s).
Nam: "Xe mày tàn quá."
Tôi: "Nó tàn từ hồi tao chở mày đi ô ăn quan về."

▶ **Chặng 2, ngõ ngỗng** (30s). ⟂ *Ba con ngỗng chặn ngõ. Nhạc standoff của Ch.1.*
Tôi: "Lại ngỗng."
Nam: "Mày có kinh nghiệm mà."
▶ **[Rải 1 phần cơm] · [Chạy vòng] · [Đứng nhìn thẳng]**
- *Đứng nhìn thẳng (giữ yên 5 giây):* ⟂ *Con đầu đàn nhìn… rồi lạch bạch đi vô bụi, như chưa từng có chuyện gì.*
  Nam: "Ủa, vậy thôi hả?"
  Tôi: "Tụi nó nghe danh tao."
  ⟂ *Con ngỗng quay lại, mổ Nam một phát. "Quạc."* Nam: "Sao mổ TAO?!"
- *Rải 1 phần:* mất 1 phần (−30k), qua êm.
- *Chạy vòng:* +20s bùn.

▶ **Chặng 3, cầu khỉ trong mưa** (40s, khung thăng bằng của Lội bùn). Mỗi lần trượt: 1 cà mên rơi, trôi xuôi, một đàn vịt bơi tới mổ.
Nam *(hệ thống, lần rơi đầu)*: "Vịt ăn cơm sườn kìa mày."

▶ **Chặng 4, bến đò.**
Ông lái đò: "Đợi đủ năm người mới chạy con."
⟂ *Bên kia kinh, nhà chú Năm, người lố nhố. Chuông xe đạp nhấp nháy gợi ý.*
▶ **[E] Bấm chuông, hô** (câu chốt)
⟂ *"Reng reng!"*
Tôi: "CƠM ĐÁM GIỖ TỚI RỒI CHÚ NĂM ƠI!"
Chú Năm *(tí hon bên kia, hô vọng)*: "Ờ! Lâu quá! Tụi chú qua bển ăn luôn!"
Tôi: "Hả?"
⟂ *Một chiếc đò bên kia, chật khách mặc áo đám giỗ, rời bến.*
Ông lái đò bên này: "Đủ người rồi, đi!"
⟂ *Hai chiếc đò gặp nhau giữa kinh. Slow-mo. Mưa ngớt. Hai bên nhìn nhau. Im 3 giây, chỉ có tiếng nước. Một chú bên kia giơ đôi đũa vẫy.*
Nam *(nhỏ)*: "…Mười lăm phút."
*(Nếu người chơi không bấm chuông trong 20 giây: chú Năm gọi điện báo "tụi chú qua bển", hai chiếc đò vẫn lướt nhau nhưng không có câu hô. Gợi ý nhấp nháy rõ để đa số người chơi tự bấm.)*

▶ **Chặng 5, nhà chú Năm.** ⟂ *Nhà vắng. Bàn thờ nhang còn cháy, mâm trái cây có cam sành, vú sữa. Bà Năm ngồi têm trầu.*
Bà Năm: "Tụi nó qua quán con hết rồi. Cúng xong rồi con. Ngồi xuống ăn miếng đã, mưa ướt hết rồi."
Tôi: "Dạ thôi bà, con còn phải về…"
Bà Năm: "Đám giỗ mà để khách về tay không là ông bà buồn."
▶ **Đưa tay ra hứng** (giữ [E]; mỗi nhịp bà chất thêm một món: bánh ít, chè, cá kho, vú sữa, bịch bánh tét… tháp đồ cao dần, lắc lư theo A/D).
Nam *(nhìn tháp đồ)*: "Mày coi nè. Mình về còn nhiều hơn lúc đi."

⟂ *Đò về: 40 giây rút gọn còn 4 giây.* Tôi: "Lúc đi mười lăm phút. Lúc về… năm phút."
⟂ *Từ trong quán vọng ra tiếng loa kẹo kéo:* **"MỘT – HAI – BA – DÔ!"**
⟂ *Tôi và Nam nhìn nhau.*

**Khoảnh khắc đã mắt: "Hai chiếc đò"**
- Hình: góc nhìn ngang mặt nước, hai chiếc đò trượt ngược chiều, mưa chuyển từ nghiêng sang lất phất, ánh chiều vàng ló qua mây; vòng sóng loang giao nhau.
- Tiếng: mưa nhỏ dần → chỉ còn mái chèo "ọp… ọp" và nước vỗ mạn → 3 giây im → một tiếng ếch.
- Chuyển động: slow-mo 0,4×, camera trượt ngang theo khoảng giữa hai đò, dừng khi hai mũi đò ngang nhau.
- Thời lượng: 4 giây. Tự chụp: *Hai chiếc đò*.

**Thưởng:** mỗi chặng một gag; tháp đồ ăn (vật phẩm thật vào kho: bánh ít, chè… dùng ở C10); thẻ Bà Năm; ảnh album.
**Móc câu:** "MỘT – HAI – BA – DÔ!" trong quán nhà mình.

**Người chơi mang về:** đám giỗ miền Tây hàng xóm tự sang phụ, và khách về luôn được gói đồ ăn mang theo. Nguồn: [NC §2: Đám giỗ], znews.vn (2 bài). Câu giải thích của bà Năm đến sau câu đùa "về nhiều hơn lúc đi", 1 câu, người có lý do nói (chủ nhà).
**Callback Ch.1:** xe đạp tàn + đạp xe; ngỗng & nhạc standoff; ô ăn quan; Nam đi chung.
**Trend lớp phụ:** không. Cơ chế bền "mãi không tới nơi" [NC §1 cơ chế 4] (không nhắc tên tác giả gốc, không dùng chữ "bên cồn").

---

### C9 · Đám giỗ về quán
**Gian quán, chạng vạng sau mưa · 18:00 · 4 phút 30 · CAO TRÀO**

**Beat**
- *Thiết lập:* quán kín 20 khách đám giỗ, mẹ một tay, ba vừa đi làm về đang bưng. Chú Năm cầm micro loa kẹo kéo.
- *Leo thang:* "MỘT – HAI – BA – DÔ!" mỗi 8 giây (bằng trà đá), mỗi chữ "DÔ" làm bàn rung, dĩa trượt; phải xào chảo sườn lớn và bày 4 mâm giữa hỗn loạn.
- *Câu chốt (người chơi bấm):* người chơi **rút phích loa** đúng lúc "MỘT – HAI – BA –". Im lặng tuyệt đối 2,5 giây, 20 người đứng hình, ly giơ giữa chừng. Mẹ, giọng đều: "Ăn đi cho nóng." 20 cái ghế nhựa "rột" cùng lúc.
- *Dư âm:* cô 8 ăn sườn, nhắc sổ; ba ăn dĩa thứ tư; các callback trả lại (dép, xoài).

**Thoại chính**

Ba *(laugh)*: "Con về rồi hả! Ba đi làm về thấy quán đông như nhà mình có giỗ."
Mẹ: "Thì nhà người ta có giỗ thiệt."
Chú Năm *(micro)*: "Đầu bếp về rồi bà con ơi! MỘT – HAI – BA –"
Mẹ: "Quán tui bán cơm, hổng bán bia nghen chú Năm."
Chú Năm: "Thì dô trà đá! MỘT – HAI – BA – DÔ!"
⟂ *20 ly trà đá cụng nhau, đá văng lấp lánh.*

▶ **Minigame Mâm giỗ dưới đèn dây** *(mục 5.11)*
**Pha 1: chảo sườn lớn (60s).**
Mẹ *(hệ thống, theo bước)*: "Sốt chưa sệt, đảo nữa." / "Sệt rồi. Lửa lớn lên một cái thôi." / *(khét)* "Khét. Nhưng mà khách đông, mẹ hổng nói."
**Pha 2: bày 4 mâm (45s).** Loa "bùm bùm", dĩa trượt theo nhịp; trẻ con chạy ngang.
*(Hệ thống, mỗi 8 giây)* Chú Năm: "MỘT – HAI – BA – DÔ!" ⟂ *bàn rung, dĩa trượt 6px.*
⟂ *Ổ cắm loa dưới chân bàn nhấp nháy.*
▶ **[E] Rút phích**, bấm đúng lúc "MỘT – HAI – BA –"
⟂ **Cắt tiếng ngay trước chữ "DÔ".** *20 người đứng hình, ly giơ lửng lơ. Đá trong ly kêu "lách cách" nhỏ. 2,5 giây.*
Mẹ *(giọng đều)*: "Ăn đi cho nóng."
⟂ *20 người ngồi xuống cùng lúc. "Rột" ×20. Dĩa thôi trượt; pha 2 dễ hẳn.*
*(Nếu bấm sai nhịp: loa tắt giữa chữ "MỘ–", chú Năm gõ micro "Alô? Alô?", vẫn im được nhưng không có "Ăn đi cho nóng". Nếu không bao giờ rút: hết giờ, cú "DÔ" cuối làm đổ 1 mâm; cô 8 chụp được dĩa sườn bằng một tay: "Bốn chục năm bán thịt, dĩa nào rớt cô cũng chụp." Hài, nhưng điểm thấp hơn.)*

**Khoảnh khắc đã mắt (key art của chương): "Mâm giỗ dưới đèn dây"**
- Hình: dây đèn vàng (treo từ C5) **bật sáng lần đầu** từng bóng lan từ trái qua phải; chảo sườn bùng lửa cam; sốt chuyển từ đục sang **sệt bóng**, ánh đèn dây phản chiếu thành chấm trên mặt sốt; hơi nước bốc thành cột; 4 mâm dưới đèn.
- Tiếng: "tách tách tách" từng bóng đèn → "phừng" lửa bùng → "xèo-ooo" kéo dài 2s → lúc rút phích: cắt sạch, chỉ còn đá "lách cách" → "Ăn đi cho nóng" → "rột" ×20 xếp lớp.
- Chuyển động: rung màn hình 3px lúc lửa bùng; camera zoom chậm vào chảo (1,05×/2s) rồi kéo ra toàn cảnh quán; slow-mo 0,5× khi rút phích.
- Thời lượng: lửa bùng 2s + bật đèn 1,5s + im lặng 2,5s. Tự chụp: *Mâm giỗ dưới đèn dây*.

**Dư âm & các callback trả lại**
⟂ *Cô 8 gắp sườn.*
Cô 8 *(laugh)*: "Sườn này sườn cô bán nè! Mẹ mày còn nợ đó nghen."
Cô 8: "Mà nấu ngon dữ trời."

*Nếu `lost_slipper`:*
Ông Hai: "Ủa, dép ai nằm giữa đường bùn, con trâu tha về chuồng nè." ⟂ *giơ chiếc dép hồng, đã rửa sạch.*
Mẹ: "Dép tui!" ⟂ *Mẹ nhìn tôi.*
Tôi: "…Con giữ kỹ lắm."
Mẹ: "Một."

*Nếu `stolen_mango`:*
Ông Hai *(nhai gỏi)*: "Xoài này giống xoài nhà tui quá ha."
▶ **[Thú nhận] · [Chối]**
- Thú nhận: Ông Hai *(cười khà)*: "Thì ông mời rồi mà! Mai qua lấy nữa." (mặt mẹ giữ nguyên)
- Chối: ⟂ *Tí, đang ăn ké bàn bên:* "Tụi con hái đó ông!" · Mận: "Ảnh trèo, con canh, Tí la." · Ông Hai: "Hèn chi trưa nay nghe ai la 'an toàn'." · Mẹ: "Một." (mặt mẹ −1)

*Nếu xin xoài:* Ông Hai *(đứng dậy, tự hào)*: "Gỏi xoài nhà tui đó bà con!"

⟂ *Chú Năm trả tiền: 20 phần × 30k (trừ phần rơi) + phong bì "lì xì đầu bếp".*
Chú Năm: "Bữa nay giỗ ba chú mà vui như Tết. Năm sau đặt nữa!"
⟂ *Ba đang ăn dĩa thứ tư.* Mẹ *(nhìn tôi)*: "Thấy chưa."

**Thưởng:** công thức *Sườn xào chua ngọt*, *Gỏi xoài*; thẻ Chú Năm, cập nhật thẻ Cô 8; tiền lớn nhất chương; đèn dây (vĩnh viễn); ảnh key art.
**Móc câu:** "Mẹ mày còn nợ đó nghen." Phải chốt sổ.

**Người chơi mang về:** đám giỗ miền Tây thường hai ngày, ăn uống ồn ào sau phần cúng, khách mang lễ như cam sành, vú sữa. Nguồn: [NC §2: Đám giỗ], znews.vn; "một-hai-ba-dô" và đám giỗ thành đám nhậu chỉ để châm biếm [NC §1], vnexpress.net. Ở đây chỉ dô **trà đá**, mẹ cấm bia trong quán; không nhân vật tuổi teen nào uống rượu bia.
**Callback Ch.1:** sườn ghi sổ của bà 8 (giờ thành món bán); "dữ trời"; ba ("con zai iu"); dép của mẹ; "Một".
**Trend lớp phụ:** không. Cơ chế "chuyện trang nghiêm hoá ồn ào" [NC §1 cơ chế 12] + "ngắt nhịp bằng im lặng sau hỗn loạn" (rubric, kỹ thuật cộng điểm).

---

### C10 · Chốt sổ
**Gian quán ban đêm, đèn dây, dế và ếch sau mưa · 20:30 · 3 phút 30**

**Beat**
- *Thiết lập:* đổ hộp thiếc ra bàn, đếm tiền.
- *Leo thang:* chia tiền: trả nợ cô 8 / tiền tiêu vặt mẹ hứa / quỹ quán; rồi lật lần lượt từng nam châm trên bảng dự án ma.
- *Câu chốt (người chơi bấm):* lật nam châm *Chà sạch hết nồi* → camera lia sang bồn rửa: một núi nồi, trên đỉnh có đúng **một** cái nồi sáng bóng. "…Một cái cũng là chà."
- *Dư âm:* tự tay đánh dấu dòng của mẹ "ĐỪNG LÀM BỂ CHÉN" ✓. "Vậy là được rồi." Rồi móc câu Chương 3.

**Thoại chính**

▶ **Minigame Chốt sổ** *(mục 5.8)*: phân loại tiền, bộ đếm nhảy số.
*(Hệ thống, ngẫu nhiên 1 lần)* ⟂ *Tay Nam thò vào xấp tiền 2 ngàn.* ▶ *[E] gạt tay* "bốp". Nam: "Tao đếm phụ mà!"
Ba: "Con zai iu của ba bữa nay bán được bao nhiêu?"
⟂ *Bộ đếm dừng. Con số to giữa màn hình.*

▶ **Chia tiền (3 thanh trượt):** *Trả cô 8* · *Tiền tiêu vặt* · *Quỹ quán*
*(Hệ thống phản ứng)*
- Trả cô 8 ≥ 300k: Mẹ: "Ừ." ⟂ *mặt mẹ +1, chữ "630.000đ" bị gạch, viết số mới bằng tay trái.*
- Trả đủ 630k: ⟂ *Mẹ xé trang sổ, gấp đôi.* Mẹ: "Mai con đem qua cô 8. Tự đưa." *(bí mật, xem kết cục)*
- Tiền tiêu vặt > trả nợ: Mẹ: "Con tính kỹ dữ ha." · Tôi: "Tại mẹ hứa mà! Một là làm, còn cho tiền tiêu vặt." · Mẹ: "Ừ. Mẹ hứa. Lấy đi." *(không phạt: mẹ giữ lời, cảnh hơi ấm, hơi áy náy)*
- Quỹ quán ≥ 15k: Nam: "Ghế đó tao trả bằng… cơm." · Mẹ: "Vậy là nợ thêm."

*Nếu "Bán 50 dĩa" đang ở 47–49:*
▶ **[Mời ba thêm dĩa]** Ba: "Ba no rồi… mà thôi, vì con." ⟂ *+1 dĩa, ba trả tiền.* Mẹ: "Ba con trả tiền thì mới tính."

▶ **Lật bảng dự án ma** (mỗi nam châm một lần bấm, một con dấu "PHẬP" xanh/đỏ):
- *Bán 50 dĩa*: "x/50". *(Nếu < 50)* Nam: "Tao ăn ba dĩa, tính luôn là đủ." · Mẹ: "Ăn chùa hổng tính."
- *Trả hết nợ cô 8*: hiện số còn lại.
- *Chế món mới*: *(nếu có gỏi xoài)* ✓. Mẹ: "Món đó ông bà mình chế lâu rồi."
- *Lên xu hướng*: ⟂ *Điện thoại Nam: clip "hai chiếc đò", 9 lượt xem.* Nam: "Bảy lượt là tao." · Tôi: "Còn hai?" · Nam: "Má tao. Với tao bằng máy má tao."
- *Mở chi nhánh 2*: Nam: "Nhà tao có cái bàn trống…" · Mẹ: "Không."
- ▶ **Chà sạch hết nồi (câu chốt):** ⟂ *Camera lia sang bồn rửa: núi nồi chảo cả ngày. Trên đỉnh: đúng một cái nồi cơm sáng bóng, lấp lánh "ting".*
  Tôi: "…Một cái cũng là chà."
  Mẹ: "Ừ. Một cái."
- ▶ **Dòng của mẹ: "ĐỪNG LÀM BỂ CHÉN".** Người chơi tự cầm phấn đánh dấu ✓ (giữ E vẽ nét).
  ⟂ *Im 1 giây.* Mẹ: "Vậy là được rồi." ⟂ *mặt mẹ lên nấc cao nhất trong ngày.*
  *(Nếu C5 có làm bể chén khi bưng quá tải 2 lần: dòng này không tick được; mẹ: "Bể có hai cái. Hôm qua mẹ bể nguyên chồng." Callback Ch.1, vẫn ấm.)*

*Kết, theo kết cục (mục 4):*
- **Tốt:** Mẹ: "Mai bán tiếp. Mẹ vẫn giám sát." · Tôi: "Ok mẹ." · Mẹ: "…Câu đó mẹ nghe sợ quá."
- **Huề vốn:** Mẹ: "Bữa đầu mẹ cũng vậy. Mười hai dĩa, ba con ăn bốn." · Tôi: "Rồi sao mẹ?" · Mẹ: "Rồi mai bán tiếp."

**Móc câu sang Ch.3 (cutscene 20 giây):**
⟂ *Bên kia đường, một dãy đèn chớp nháy bật sáng. Có người đứng trên thang treo biển:* **"CƠM BÁ KHÍ — KHAI TRƯƠNG NGÀY MAI".**
Nam: "Ủa… cái tên đó tao nghĩ ra mà?!"
⟂ *Bóng người trên thang quay lại: thằng thanh niên ô ăn quan ở Ch.1, cười khẩy.*
Thanh niên: "Chào ông anh. Lại gặp nhau rồi."
⟂ *Tôi đứng im. Mẹ đi ngang, liếc qua bên kia đường một giây, mặt lạnh tanh.*
Mẹ: "Mai bán bánh xèo."
⟂ *Đen. "Chương 3".*

**Khoảnh khắc đã mắt: "Bộ đếm tiền"**
- Hình: tiền đổ ra từ hộp thiếc, từng xấp bay vào cọc đúng mệnh giá, bộ đếm kiểu đồng hồ cơ lật số; nồi sáng bóng trên núi nồi có lấp lánh 4 cánh.
- Tiếng: "xoẹt" mỗi tờ, cao độ tăng theo chuỗi đúng liên tục; lật số "tạch tạch"; con dấu "PHẬP" cho từng dòng bảng; "ting" ở cái nồi.
- Chuyển động: cọc tiền nảy khi thêm tờ; con số tổng phóng 1,2× rồi về; camera lia sang bồn rửa ease-in-out 1,2s.
- Thời lượng: đếm 30–40s; mỗi con dấu 0,4s.

**Thưởng:** kết cục + thẻ; gạch sổ; tiền tiêu vặt (mang sang Ch.3); bảng dự án ma lưu vào bộ sưu tập.
**Người chơi mang về:** quán quê hay "ghi sổ" cho người quen, trả dần khi có. Nguồn: [NC §2] **[UV]**. Bánh xèo được cho là đặt tên theo tiếng "xèo" khi đổ bột, gốc gác còn tranh luận (để dành Ch.3). Nguồn: [NC §3], tuoitre.vn.
**Callback Ch.1:** sổ nợ bà 8; tiền tiêu vặt "Một là làm"; chén bể; thanh niên ô ăn quan; ba "con zai iu".
**Trend lớp phụ:** "Dự án ma" (trả kết cấu cả chương), "Ok mẹ" (câu cuối). Câu cuối đứng được cả khi không biết trend: con nói "ok", mẹ đã bị lừa cả ngày bởi chữ đó.

---

## 4. Bảng kết cục

| Id | Tên | Loại | Điều kiện | Cảnh diễn (tóm tắt + câu chốt) | Phần thưởng khi thua | Thử lại từ |
|---|---|---|---|---|---|---|
| `ch2_good` | **Quán Bà Lan & Con** | tốt, hết chương | doanh thu ngày ≥ 700k **và** mặt mẹ ≥ 3 **và** không dính kết cục thua | C10 bản tốt; "Ok mẹ." / "…Câu đó mẹ nghe sợ quá." | — | — |
| `ch2_debtfree` | **Gạch sổ cô 8** *(bí mật)* | tốt+, hết chương | như trên **và** trả đủ 630k | mẹ xé trang sổ: "Mai con đem qua cô 8. Tự đưa." Ch.3 mở bằng cảnh cậu đưa tiền, cô 8 gói lại cho một ký sườn | tiếng "tách" ảnh đặc biệt *Trang sổ trắng* | — |
| `ch2_even` | **Ngày đầu huề vốn** | trung, hết chương (không phải thua) | doanh thu < 700k hoặc mặt mẹ < 3 | C10 bản huề: "Bữa đầu mẹ cũng vậy… Rồi mai bán tiếp." | Ch.3 mở có thêm mẹo của mẹ | — |
| `slipper2` | **Phi dép thần chưởng** | xấu-hài, thua | quên bật nút nồi cơm ở C3 | đầu C5: mở nồi, gạo sống nằm trong nước lạnh. Im 2s. Mẹ: "Hôm qua con nói gì? 'Đến nồi cơm còn quên bật nút nữa là…'" Dép bay slow-mo 1,5s, **trúng nút nồi cơm** "tạch", đèn sáng. Mẹ: "Đó. Bật vậy đó." Tôi: "…Còn khách thì sao mẹ?" ⟂ *thợ gặt đứng dậy đi.* | thẻ kết cục + Album *Dép bay (bản nồi cơm)* + từ lần thử sau đèn nồi chưa bật nhấp nháy rõ hơn | đầu C3 |
| `ghost_shop` | **Ghế nhựa ngồi chơi** | xấu-hài, thua | ≥ 7 khách bỏ về ở C5 | quán vắng; Tôi và Nam ăn hết nồi thịt kho. Mẹ: "Hai đứa ăn hết vốn rồi đó." Nam: "Trừ lương con." Mẹ: "Con có lương hồi nào." | thẻ "Mẹo của mẹ: thợ gặt hết kiên nhẫn nhanh nhất, phục vụ trước" + bắt đầu lại với 1 bàn đã có trà đá | đầu C5 |
| `snitched` | **Bị hàng xóm méc vốn** | xấu-hài, thua | nhánh hái trộm, tiếng ồn 100% khi đang trên cây | ông Hai dắt về quán, tay xách bọc xoài. Ông Hai: "Bà Lan ơi, thằng nhỏ hái xoài nhà tui." Mẹ *(nhìn con)*: "Một." Tôi đứng im như tượng. 3s ve kêu. Ông Hai: "…Thôi, xoài nè, tui cho luôn. Lần sau gõ cửa nghen con, ông mời rồi mà." Mẹ: "Hai." Ông Hai *(giật mình)*: "Ủa, tui có làm gì đâu?!" Mẹ: "Tui nói thằng nhỏ." | thẻ kết cục + thẻ Ông Hai mặt sau ("Người bị trộm hiền nhất làng") | đầu C7 |
| `rabies` | **3 mũi 1tr5** | xấu-hài, thua | nhánh hái trộm, hết thể lực khi bị Lu đuổi | trạm y tế. Y tá: "Chó nhà ai cũng vậy, bị cắn là chích ngừa liền. Ba mũi." Tôi: "Bao nhiêu chị?" Y tá: "Một triệu rưỡi." *(giá là gag của nhóm, **[UV]**)* Mẹ mở sổ nợ, viết bằng tay trái: "Thằng con, 1.500.000đ". Tôi: "Một ngày con bán cơm mới được…" Mẹ: "Ba ngày." | thẻ kết cục + thẻ con Lu ("Chỉ cắn quần") + từ lần thử sau Tí la nhỏ hơn 20% | đầu C7 |
| `family_out` | **Cả nhà đi ăn quán** *(bí mật)* | xấu-hài | dính 3 kết cục thua liên tiếp trong chương | cả nhà sang nhà cô 8 ăn tối. Cô 8 nấu, cười: "Ghi sổ nghen." Sổ nợ: 630k → 780k. Ba: "Ngon dữ trời." Mẹ: "Ông im." | mở **Chế độ Mẹ chỉ tận tay** (cửa sổ canh giờ rộng +30%) cho các lần thử sau | checkpoint gần nhất |
| `black_braise` | **Thịt kho đen thui** *(món hỏng, không thua)* | hài, không chặn | nước màu vào vùng đen ở C3 | mẹ nhai 5 giây im: "Ừ. Đậm đà." uống cạn ly trà đá | thẻ Món hỏng; khách C5 có câu riêng | — |

Mọi kết cục thua: diễn đủ cảnh hài (≤ 40 giây), mở thẻ mới, **checkpoint ngay trước minigame**, bỏ qua được thoại đã xem. Dép không bao giờ trúng người (bộ đếm "Trúng người: 0").

---

## 5. Minigame mới: đặc tả & tham số cân bằng

Luật mỗi minigame phải học được trong ≤ 10 giây: một dòng hướng dẫn + một lần làm mẫu bằng hình.

### 5.1 Lội bùn (`MudWalkScene`, dùng lại cho cầu khỉ ở C8)
- **Luật:** giữ W đi. Gặp bùn sâu, chân lún, bấm E liên tục để kéo chân. Kéo quá tay thì dép kẹt lại. Xe máy bấm còi phía sau, giữ Q che lá chuối.
- **Thắng/thua:** không thua; xếp hạng Sạch / Lấm / Tượng bùn; cờ `lost_slipper`.
- **Tham số:** chặng 1 dài 60s; 7 hố bùn sâu; kéo chân cần 4–6 lần bấm trong 2s; > 10 lần bấm sau khi chân đã ra = rớt dép (quay lại nhặt mất 2s); còi báo trước 1,2s, cửa sổ che 0,6s; 4 xe máy. Cầu khỉ: thanh thăng bằng ±100, gió/mưa đẩy ngẫu nhiên 8–15/s, A/D bù 40/s, ra ngoài ±80 là trượt (−1 cà mên), tối đa 3 lần.

### 5.2 Trả giá (`HaggleScene`, dùng hai chiều ở C2 và C4)
- **Luật:** mỗi lượt chọn 1 trong 4 lá. Giá giảm thì Vía người bán giảm. Bấm Chốt để mua.
- **Lá:** Trả thấp (−10k, Vía −25) · Chê hàng (−5k, Vía −15) · Làm bộ bỏ đi (40% người bán gọi lại −10k / 60% giữ giá, Vía −10) · Chốt.
- **Hệ thống mẹ:** hành động gắt thứ 2 → "E HÈM" (giá về gốc, Vía +20); thứ 3 → "MỘT."; thứ 4 → cúp máy. Vía ≤ 0 → giá 0đ; thêm một lần Trả thấp → giá −5k + đốt vía (câu chốt).
- **Cờ:** `fast` (Chốt ngay lượt 1), `fair` (giá cuối 150–160k, Vía ≥ 50), `harsh` (Vía < 30).
- **Chiều ngược (C4):** bác Tư bớt 5k/lượt; nhang trên bàn thờ quán lụn 25%/lượt; [Giữ giá] ×2 → mẹ "E hèm" reset về 25k.
- **Thời lượng:** 60–120s.

### 5.3 Đo nước nấc tay (`RiceWaterScene`)
- **Luật:** giữ Space đổ nước, thả khi mặt nước chạm vạch đốt thứ nhất trên ngón tay.
- **Tham số:** tốc độ dâng 6 mm/s (tăng dần lên 9); cửa sổ đúng ±1,5 mm; ±1,5–4 mm = "hơi dư/thiếu" (cơm hơi nhão/khô); ngoài 4 mm = nhão/sống. Một lần chỉnh: bấm X múc bớt (một lần duy nhất). 15–20s.

### 5.4 Thắng nước màu (`CaramelScene`)
- **Luật:** núm lửa 3 nấc. Giữ chảo trên lửa, nhìn màu. Bấm Space đổ nước mắm đúng lúc màu hổ phách.
- **Tham số (lửa riu riu):** trắng 0–8s · vàng rơm 8–14s · **hổ phách 14–16,5s** (viền nhấp nháy) · cánh gián 16,5–19s (chấp nhận, −15 điểm) · đen > 19s (khói, món hỏng). Lửa vừa ×1,3; lửa lớn ×1,6 (cửa sổ hổ phách chỉ còn 1,5s) + mẹ phản ứng. Điểm: hổ phách 100 / cánh gián 70 / vàng rơm 40 (nhạt màu) / đen 10.
- **Muỗng:** đếm số muỗng đường/mắm; dặn 2 mắm, 2 đường; mỗi muỗng dư −10 điểm và mẹ nói đúng con số.

### 5.5 Tương tác ngắn ở C4
- **Kéo vải:** giữ E 3s; ở 90% bấm A/D 3–5 lần để giật. Không thua.
- **Một nước ô ăn quan:** thế cờ dựng sẵn 10 ô, 1 lượt; chọn ô + chiều; đáp án ăn dây chuyền 2 ô (một đáp án đúng, hai đáp án "gần đúng" ăn 1 ô = trả 25k không tip). Dùng `logic/oanquan.ts`. 20s.

### 5.6 Giờ cao điểm (`ServiceScene`, khung Overcooked nhẹ)
- **Luật:** khách ngồi → bong bóng món → lấy cơm ở nồi (E) → múc món ở nồi tương ứng (E) → bưng tới bàn (E). Trà đá do Nam tự lo (đôi khi Nam ngồi ăn, phải gọi: E vào Nam).
- **Khách:** 4 bàn × 4 ghế. Tổng 30 khách / 6 phút (sóng: 6 · 8 · 6 · 10). Kiên nhẫn: thợ gặt 25s, cô Bảy 40s, bà Chín 60s, Tí 35s; xanh → vàng (50%) → đỏ (20%) → bỏ về.
- **Bưng:** tối đa 4 dĩa; > 3 dĩa: tốc độ −25%, 15%/giây nguy cơ rớt (kích hoạt gag đồ ăn rớt lần đầu; lần 2+ chỉ rớt dĩa, −1 dĩa, −1 dòng "Đừng làm bể chén" nếu bể 2 lần).
- **Giá:** dĩa cơm 25k; cơm chiên 20k; tip ngẫu nhiên 0–5k theo câu chào và tốc độ.
- **Sườn xào tại chỗ (sau 5:00):** 4 nhịp đảo theo trống (cửa sổ ±120ms), dầu bắn báo trước 0,5s, Space lùi né.
- **Thắng/thua:** 18–32 dĩa = bình thường; ≥ 7 khách bỏ về = kết cục `ghost_shop`.

### 5.7 Cạo cơm cháy
- Giữ E, rê chuột dọc mép nồi một vòng trong 6s; lệch khỏi mép > 0,4s thì tấm cơm cháy gãy (vẫn ăn được, mất ★). 8s.

### 5.8 Chốt sổ (`LedgerScene`)
- **Luật:** kéo từng tờ vào cọc đúng mệnh giá (500k, 200k, 100k, 50k, 20k, 10k, 5k, 2k, 1k). Đúng liên tục thì "xoẹt" cao dần.
- **Tham số:** 25–45 tờ (theo doanh thu); 40s; sai cọc: tờ bật lại; ≥ 95% đúng → "Sổ khớp" (+mặt mẹ 1). Nam thò tay 1 lần trong khoảng 10–30s, cửa sổ gạt 1,2s (hụt: −2k, Nam: "Tao mượn").
- Sau đó 3 thanh trượt chia tiền, bước 10k.

### 5.9 Câu xoài (nhánh xin)
- **Luật:** chuột ngắm, giữ chuột duỗi sào, thả để giật. Xoài rơi, Tí chạy hứng (AI trễ 0,4s, hụt 30%).
- **Tham số:** 45s; 18 trái (10 xanh, 7 chín, 1 xoài chúa trên ngọn cần duỗi tối đa + giữ 1s); cần ≥ 6 xanh cho gỏi; xoài chúa = câu chốt (mưa 12 trái). Không thua; < 6 xanh thì gỏi ít, chú Năm vẫn vui.

### 5.10 Hái trộm (nhánh hái)
- **Luật:** trèo bằng nhịp W/S luân phiên; hái E (giữ 0,6s / trái); xuống bằng S; chạy Shift.
- **Tiếng ồn:** hái +6; trèo sai nhịp +4; Tí hô "an toàn" mỗi 6s: +8 → +12 → +16; giảm tự nhiên −3/s khi đứng yên. Ngưỡng: 50 tai Lu giật, 80 Lu mở mắt, 100 ông Hai thức (`snitched` nếu đang trên cây).
- **Chạy:** 15s tới hàng rào; thể lực 100, chạy −9/s, đi hồi +5/s; Lu nhanh hơn 10% khi người chơi chạy. Q ném xương (nếu có): Lu dừng 8s. Bị bắt = `rabies`.

### 5.11 Mâm giỗ dưới đèn dây (`FeastScene`, gộp nấu + bày)
- **Pha 1, xào (60s):** thả sườn (E) → rưới sốt (giữ Space 2s) → 8 nhịp đảo theo trống 96 BPM (±120ms) → thanh "sệt bóng" lên 100 → giữ Space 1s cho lửa bùng (giữ > 1,6s = khét). Dầu bắn như 5.6.
- **Pha 2, bày (45s):** 4 mâm × 5 chỗ (cơm, thịt kho, sườn, gỏi, canh/không). Kéo thả. Mỗi chữ "DÔ" (8s/lần) đẩy dĩa 6px theo hướng ngẫu nhiên; dĩa ra khỏi mâm > 20px là rơi. Rút phích: cửa sổ đúng là 1,2s của "MỘT – HAI – BA –"; rút xong không còn đẩy.
- **Điểm:** xào 60% + bày 40%; ảnh hưởng tiền tip của chú Năm (0–100k) và mặt mẹ ±1.

### Tham số kinh tế chương

| Tham số | Giá trị |
|---|---|
| Vốn mẹ đưa đi chợ | 200.000đ (+ tiền mang từ Ch.1) |
| Ba chỉ / xương ống (giá gốc chú Sáu) | 125k / 40k |
| Giá dĩa cơm / cơm chiên | 25k / 20k |
| Đám giỗ | 20 phần × 30k = 600k, −30k mỗi phần mất; tip 0–100k |
| Doanh thu ngày thường gặp | 900k–1,3 triệu |
| Ngưỡng `ch2_good` | doanh thu ≥ 700k và mặt mẹ ≥ 3 |
| Nợ bà 8 | 630k (C10 có thể trả 0–630k) |
| Mặt mẹ | 0–5, bắt đầu 2; +1: dậy ngay, một đốt, hổ phách, mua nhanh/fair, bác Tư trả đủ, ≥ 25 dĩa, cơm cháy (gắp giùm), xin xoài, rút phích đúng nhịp, sổ khớp, trả nợ ≥ 300k; −1: báo lại ≥ 3, mắm dư ≥ 2, giữ lửa lớn, mẹ cúp máy, `stolen_mango` bị lộ, mất dép, ≥ 4 khách bỏ về |
| Checkpoint | đầu mỗi cảnh + ngay trước mỗi minigame (`haohn.save.v1`, slot `.ch2.<cảnh>`) |

---

## 6. Asset mới cần

### Bản đồ
| Id | Tên | Ghi chú |
|---|---|---|
| `mud_road` | Đường đất sau mưa | cuộn ngang 3 màn, có kinh song song (xuồng chạy dưới), trâu, vịt |
| `market` | Chợ quê sáng sớm | sạp thịt chú Sáu (cận), sạp rau, bến ghe, đèn bóng vàng |
| `mango_garden` | Vườn xoài ông Hai | cây xoài lớn (lớp trèo riêng), võng, hàng rào dâm bụt, lối thoát |
| `canal_cross` | Ngõ ngỗng · cầu khỉ · bến đò | 3 đoạn nối, phiên bản mưa |
| `nam_house` | Nhà chú Năm | bàn thờ, mâm trái cây, hiên |
| `front` (biến thể) | Gian quán | 5 trạng thái: sáng sớm / khai trương / trưa đông / đêm đèn dây / đám giỗ; lớp đồ trang trí chồng theo tiến độ |
| `health_post` | Trạm y tế | chỉ dùng cho kết cục `rabies` |

### NPC (chân dung + sprite)
Chú Sáu (neutral, laugh, sweat, panic) · Ông Hai (sleep, smile, surprised) · con Lu (ngủ, tai giật, sủa, chạy, gặm xương, vẫy đuôi) · Tí (grin, hurt, buried) · Mận (deadpan, deadpan_holding_mango) · Cô Bảy (complain, caught, whisper) · Bà Chín (deadpan) · Thợ gặt ×3 biến thể · Chú Năm (mic, laugh) · Bà Năm (smile) · Ông lái đò · Y tá · Trâu · đàn vịt (bầy, có AI tách dòng) · ngỗng ×3 (dùng lại Ch.1, đổi màu).
Biểu cảm mới cho nhân vật cũ: Mẹ `deadpan`, `eyes_closed`, `chewing`, `moved` · Tôi `muddy`, `blank`, `moved`, `on_tree` · Nam `under_cloth`, `mooch` · Ba `full` · Cô 8 `catch`.

### Đạo cụ
Đồng hồ báo thức · dép nhựa hồng có bông · dép tổ ong đen · bảng đen + 7 nam châm · bàn thờ Ông Địa + nhang (sprite khói) · lá chuối · cây nhang vía (3 độ sáng) · thớt + dao phay · nồi cơm điện (đèn bật/tắt, hơi) · chảo nước màu (5 màu) · quạt nan · 12 trứng · bảng hiệu + miếng ván "& CON (tập sự)" + tấm vải đỏ · loa kẹo kéo + phích cắm · ống pháo giấy · bảng thực đơn phấn · 3 tấm bìa tên quán · ghế nhựa (nguyên/gãy) · dây đèn vàng (tắt/bật từng bóng) · quạt đứng · ống đũa · tấm "HẾT" · mèo hàng xóm · nồi cơm cháy + tấm cơm cháy · hộp thiếc tiền + 9 mệnh giá · sào câu xoài · nón lá · xoài xanh/chín/xoài chúa · bọc chôm chôm · chậu bông giấy · xương ống · 20 cà mên · thau gỏi · tháp đồ đám giỗ (bánh ít, chè, cá kho, vú sữa, cam sành) · 4 mâm · ly trà đá (đá rời) · sổ nợ (trang có thể gạch/xé) · núi nồi + 1 nồi sáng · biển "CƠM BÁ KHÍ" + dây đèn chớp.

### CG / khung ảnh album
1. Dép đáp nút đồng hồ · 2. Bình minh trên kinh · 3. PHẬP · 4. Bảng hiệu "& CON (tập sự)" · 5. Ghế nhựa kín · 6. Mưa xoài (Mận "Một.") · 7. Hai chiếc đò · 8. **Mâm giỗ dưới đèn dây (key art)** · 9. Núi nồi một cái sáng · 10. Biển "CƠM BÁ KHÍ" bên kia đường. Kết cục: Phi dép nồi cơm · Méc vốn ("Hai.") · Trạm y tế · Cả nhà ăn nhà cô 8.

### Âm thanh
- **SFX đặc trưng:** "PHẬP" (xác nhận cả chương) · "XÈO" · muỗng **cạch** (đường) và **cạnh** (mắm), hai cao độ phân biệt được · "BỤP" bùn · "E HÈM" / "MỘT." (stinger giọng mẹ + trống trầm) · nam châm "cạch" · tiền "xoẹt" (9 cao độ) + "lẻng xẻng" · "rắc" ghế · "roẹt" vải · "tách" máy ảnh · rút phích (cắt sạch + đá "lách cách") · "rột" ghế ×20 (xếp lớp) · chuông xe "reng reng" · xuồng máy "tạch tạch" · bộ ngỗng/vịt "quạc" · chó Lu (gâu, gầm nhỏ, ngoạm "roẹt") · đèn bật "tách tách" · lửa "phừng".
- **Không khí:** gà gáy sáng **[UV]** · chợ sáng (rao, ghe) · ve trưa · mưa chiều trên mái tôn · dế + ếch đêm sau mưa · loa kẹo kéo rè.
- **Nhạc:** `market_morning` · `rush_hour` (có bản 1,25×) · `quiet_noon` (đờn đơn, cho C6) · `feast_chaos` (có điểm cắt sạch cho rút phích) · `night_ledger` · nhạc standoff Ch.1 (dùng lại) · bản "băng cát-xét chậm" cho đoạn đi sau trâu.

---

## 7. Móc câu sang Chương 3

1. **Đối thủ:** "CƠM BÁ KHÍ" mở ngay bên kia đường, chủ là thằng thanh niên ô ăn quan Ch.1 ("Lại gặp nhau rồi"), dùng **đúng cái tên Nam nghĩ ra** ở C4. Ch.3 có thể là cuộc đua hai quán, nhưng chơi theo kiểu hài: quán bên kia toàn "xu hướng" (trứng cút muối hũ, xếp hàng, đèn chớp [NC §1: cơn sốt đồ ăn]), quán mình toàn đồ quê.
2. **Món mới:** "Mai bán bánh xèo." Minigame đổ – láng – đậy – gấp; chữ "XÈO" bung to khi đổ đẹp, "xè…" nhỏ xíu khi hỏng [NC §5 gợi ý 3].
3. **Sổ nợ:** số còn lại của bà 8 (hoặc cảnh tự tay đem trả nếu `ch2_debtfree`).
4. **Ông Hai và xoài:** "Mai qua lấy nữa." **Chú Năm:** "Năm sau đặt nữa", thêm khả năng nhận tiệc.
5. **Mùa:** nước kinh lên dần; ông Hai nhắc "nước lên chút nữa là cá linh về" **[UV]**: hứa hẹn một chương mùa nước nổi (cuối hè–thu) [NC §2: mùa vụ].
6. **Bảng dự án ma ngày 2:** để trống, mở đầu Ch.3 bằng việc dán nam châm lại, các dòng thất bại hôm qua vẫn còn vết phấn mờ.

---

## 8. Tự chấm theo rubric & nhật ký sửa

### 8.1 Bản v1 (chấm trước khi sửa)

| # | Tiêu chí | Điểm v1 | Ghi chú điểm yếu |
|---|---|---|---|
| 1 | Hài (22) | 4 | C8: câu chốt "khách tự kéo qua quán" nằm trong **thoại** chú Năm qua điện thoại, người chơi không kích hoạt. C6 không có câu chốt do người chơi bấm. |
| 2 | Thị giác (18) | 4 | C6, C10 thiếu lớp chuyển động; C4 mô tả "kim tuyến đẹp" còn chung chung. |
| 3 | Cuốn (15) | 4 | C6 có khoảng ~2 phút 20 không thưởng; không có cơ chế "gần đạt" cho 50 dĩa. |
| 4 | Chất quê (12) | 4 | Nhiều chi tiết **[UV]**; chưa qua người miền Tây duyệt. |
| 5 | Văn hoá (12) | 4 | C8: bà Năm giải thích đám giỗ 3 câu liền (thuyết minh). |
| 6 | Gameplay–truyện (8) | 5 | — |
| 7 | Nhịp (8) | 3 | C6 có chuỗi 8 câu thoại liền; C0 bảng kế hoạch mẹ nói 6 câu liền không thao tác. |
| 8 | Nhân vật (5) | 5 | — |
| | **Tổng v1** | **81,0** | |

**Chỗ yếu nhất: Nhịp (3/5) và Cuốn ở C6, câu chốt C8.**

### 8.2 Sửa trong v2
1. **C8:** đổi câu chốt sang **người chơi bấm chuông xe và hô**, làm bên kia hô lại rồi kéo qua; thêm hai chiếc đò lướt ngang nhau, khoảnh khắc đã mắt đủ 3 lớp + ảnh album.
2. **C6:** chen 4 thao tác vào giữa thoại (cạo cơm cháy, chia cơm cháy 3 lựa chọn, gắp giùm mẹ, đếm tiền giữa ngày). Câu chốt người chơi kích hoạt = **mẹ đổi dĩa**. Không còn chuỗi > 4 câu liền.
3. **C0:** phản ứng của mẹ gắn vào từng lần dán nam châm (hệ thống), không còn độc thoại.
4. **Cuốn:** thêm "Bán 50 dĩa x/50" làm cơ chế gần đạt xuyên chương (C5 → C9 → C10, có lựa chọn "Mời ba thêm dĩa"); thêm đồ trang trí mỗi 5 dĩa; album tự chụp 10 khung.
5. **Văn hoá:** cắt lời bà Năm còn **1 câu** ("Đám giỗ mà để khách về tay không là ông bà buồn"), đặt sau câu đùa của Nam.
6. **Thị giác:** ghi đủ hình · tiếng · chuyển động · thời lượng cho C4 (kéo vải), C6 (cơm cháy), C10 (bộ đếm tiền).
7. **An toàn / cờ đỏ:** kiểm lại: dép không trúng người; chó chỉ ngoạm quần, nhánh bị cắn đi chích ngừa ngay; "dô" bằng trà đá, mẹ cấm bia; không tên người thật, không câu thoại của người nổi tiếng, không thương hiệu thật (hộp thiếc không nhãn, "Cơm Bá Khí" là tên hư cấu); trend chỉ ở lớp phụ.

### 8.3 Bản v2 (chấm lại)

| # | Tiêu chí | Trọng số | Điểm | Quy đổi | Bằng chứng |
|---|---|---|---|---|---|
| 1 | Hài hước | 22 | 5 | 22,0 | Mỗi cảnh có câu chốt do người chơi bấm: báo lại → dép đáp nút (C0) · năn nỉ trâu → đi sau đít trâu, rồi xuồng 6 giây (C1) · trả thấp ở 0đ → chú Sáu trả ngược tiền, đốt vía (C2) · nhìn trộm khe vách → "cạch/cạnh" (C3) · giật vải → trùm Nam (C4) · HÔ TO dĩa thứ ba (C5) · mẹ đổi dĩa (C6) · xoài chúa → Mận "Một." (C7) · bấm chuông → hai chiếc đò (C8) · rút phích → im lặng (C9) · lật "Chà hết nồi" (C10). Leo thang rõ (C2, C5, C8, C9). Callback trong chương ("Một", "hai chục năm", "mười hai dĩa, ba ăn bốn", "con giữ kỹ lắm"). Thua có thưởng (6 kết cục hài). |
| 2 | Thị giác | 18 | 5 | 18,0 | 11 khoảnh khắc đã mắt ghi đủ hình · tiếng · chuyển động · thời lượng; key art "Mâm giỗ dưới đèn dây"; 10 khung album tự chụp. |
| 3 | Cuốn | 15 | 5 | 15,0 | Bảng 2.1: thưởng nhỏ ≤ 45–60s, thưởng vừa mỗi 3–5 phút (V1–V13); quán đổi mặt thấy được (2.3); 7 bộ sưu tập; "x/50" gần đạt; móc câu mọi cảnh (2.2); thua có thẻ + checkpoint ngay trước minigame; nhánh xin/hái muốn chơi lại. |
| 4 | Chất quê Nam Bộ | 12 | 4 | 9,6 | Xuồng máy đi chợ, đường bùn mùa mưa, mở hàng/đốt vía, bàn thờ Ông Địa, vườn xoài/chôm chôm, cầu khỉ, đò, đám giỗ miền Tây, thợ gặt, mưa chiều; thoại "hổng, nghen, bển, dữ trời, ổng, bả, hông". **Chưa 5 vì rubric đòi người miền Tây đọc duyệt và nhiều mục [UV].** |
| 5 | Văn hoá & ẩm thực | 12 | 5 | 12,0 | Mỗi cảnh: phong tục là rắc rối của nhân vật ngay lúc đó (đang trả giá → mở hàng; đang nấu → nước màu; đang giao cơm → đám giỗ); giải thích 1 câu, sau câu đùa, từ người có lý do nói; có nguồn hoặc đánh dấu [UV]. |
| 6 | Gameplay–truyện | 8 | 5 | 8,0 | Cờ `haggle` đổi C4 + C7; chất lượng nước màu/cơm đổi lời khách; nút nồi cơm → kết cục; xin/hái đổi C9; `lost_slipper` trả ở C9; chia tiền đổi thoại C10. Luật mỗi minigame ≤ 10 giây. |
| 7 | Nhịp & cấu trúc | 8 | 4,5 | 7,2 | Mỗi cảnh đủ 4 beat; xen ồn/lặng (C5 ồn → C6 lặng → C7 → C8 → C9 ồn → C10 lặng); ≤ 6 câu liền. Trừ 0,5: C9 dư âm có thể dài nếu cả hai cờ `lost_slipper` + `stolen_mango` cùng bật (cần đo khi playtest; phương án: chỉ diễn 1 cái, cái còn lại dời sang C10). |
| 8 | Nhân vật & móc nối | 5 | 5 | 5,0 | Giọng riêng (bảng nhân vật); callback Ch.1: sổ nợ bà 8, xe đạp tàn, ô ăn quan + bác Tư + thanh niên, Nam, dép mẹ, "Một/Hai", trứng ngỗng, chén bể, nồi cơm quên bật nút, "rắc". Ấm: "& CON (tập sự)", đổi dĩa cơm cháy, "Vậy là được rồi." |
| | **Tổng v2** | 100 | | **96,8** | **Không cờ đỏ.** Ngưỡng ≥ 80: đưa vào sản xuất (sau khi 3 người chấm độc lập xác nhận). |

### 8.4 Việc cần làm trước khi sản xuất
- Người miền Tây đọc duyệt toàn bộ thoại + danh sách **[UV]**: Ông Địa/Thần Tài trước mở hàng · ghi sổ · đo nước bằng đốt tay · vịt chạy đồng · thợ gặt hè thu tháng 7 · trà đá miễn phí · cơm cháy · gỏi xoài xanh · cho thêm bọc trái · giá 3 mũi ngừa dại · "ních" · "nước lên cá linh về" · gà gáy/máy xuồng.
- Playtest đo: cười ≥ 2 lần / 5 phút; không cảnh nào bị bấm lướt hàng loạt; ≥ 80% muốn chơi Ch.3 ngay; tỉ lệ quên bật nút nồi cơm (mục tiêu 25–40%: đủ nhiều để kết cục được thấy, không quá nhiều để thành bẫy).

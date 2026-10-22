# Test Plan — HO-NHA-TÔI

| Thông tin | Chi tiết |
|---|---|
| Sản phẩm | HO-NHA-TÔI — Ứng dụng gia phả số và kết nối gia đình |
| Tài liệu | Kế hoạch kiểm thử (Test Plan) |
| Phiên bản | 1.0 |
| Ngày lập | 2026-10-22 |
| Căn cứ | Đặc tả chức năng HO-NHA-TÔI v1.1 (file ĐẶC TẢ), checklist MVP 21 hạng mục, mã nghiệm thu AT-01..AT-15 và QA-01..QA-12 |
| Quy ước mã test case | HNT-P-xxx (P = kiểm thử), đánh số liên tục toàn bộ tài liệu |

> **Ghi chú về mã nhóm yêu cầu HNT-FG-xxx:** Test Plan nhóm các yêu cầu chức năng chi tiết của PRD thành 30 nhóm kiểm thử (FG = functional group) để test case gọn và dễ theo dõi. Cột "Mã PRD tương ứng" tại mục 3.0 cho biết mỗi nhóm phủ các mã HNT-F-xxx chính thức nào trong 01-PRD/PRD.md.

---

## 1. Mục tiêu & phạm vi kiểm thử

### 1.1. Mục tiêu

- Xác minh toàn bộ chức năng MVP hoạt động đúng theo đặc tả v1.1.
- Chứng minh các tiêu chí nghiệm thu phát hành QA-01..QA-12 và AT-01..AT-15 đều đạt trước khi phát hành.
- Bảo đảm phân quyền được thực thi tại backend/database (không chỉ ẩn trên giao diện), dữ liệu riêng tư không rò rỉ qua API/tìm kiếm/tệp đính kèm.
- Bảo đảm hiệu năng đạt ngưỡng P95 đã công bố trong môi trường kiểm thử thực tế.
- Bảo đảm người lớn tuổi hoàn thành được các tác vụ chính mà không cần hướng dẫn liên tục.

### 1.2. Trong phạm vi (theo checklist MVP 21 hạng mục)

**Tài khoản:** đăng ký/đăng nhập/khôi phục tài khoản; mời tham gia dòng họ và duyệt thành viên; quản lý vai trò và quyền riêng tư.
**Gia phả:** tạo cây nhiều thế hệ; hồ sơ thành viên và quan hệ gia đình; đề xuất sửa/xác minh/phát hiện trùng; lịch sử chỉnh sửa và tìm kiếm.
**Giao tiếp:** phòng chat chung bằng văn bản; chat riêng và yêu cầu nhắn tin từ người lạ; nhóm "Gia đình tôi"; gửi ảnh/tệp, reply, reaction và ghim; chặn, báo cáo và giới hạn spam.
**Cộng đồng:** bảng tin dòng họ; lịch sinh nhật, ngày giỗ và sự kiện; thông báo trong ứng dụng và push; chia sẻ lời mời qua ứng dụng khác.
**Vận hành:** web quản trị; nhật ký thao tác quan trọng; kiểm soát truy cập và lưu trữ tệp; sao lưu, khôi phục và xử lý yêu cầu dữ liệu; kiểm thử khả năng sử dụng với người lớn tuổi.

### 1.3. Ngoài phạm vi (giai đoạn 2/3 — không kiểm thử trong đợt này)

- Tin nhắn thoại, tin nhắn video, gọi thoại/video (kể cả tích hợp dịch vụ thứ ba).
- Bình chọn, album ảnh nâng cao, quản lý sự kiện nâng cao.
- Nhập/xuất Excel, PDF, GEDCOM.
- Tìm kiếm nâng cao, đồng bộ đa thiết bị.
- Mã hóa đầu cuối (E2EE) cho tin nhắn.
- Đóng góp quỹ, tiện ích tổ chức họp họ, lưu trữ tư liệu dài hạn chuyên sâu.

---

## 2. Chiến lược kiểm thử

### 2.1. Các cấp độ kiểm thử

| Cấp độ | Phạm vi | Ví dụ trọng tâm |
|---|---|---|
| Unit test | Backend services, logic nghiệp vụ | Kiểm tra quyền theo vai trò × dòng họ; logic phát hiện trùng hồ sơ; máy trạng thái xác minh gia phả (draft → pending_verification → verified/disputed); idempotency key chống trùng tin nhắn |
| API / Integration test | REST API, WebSocket realtime, Storage, Push | Mọi endpoint kiểm tra phân quyền; URL ký số tệp đính kèm; đồng bộ trạng thái tin nhắn; FCM/APNs |
| E2E test | Luồng người dùng trên mobile | Đăng ký → tạo dòng họ → xây gia phả → chat → sự kiện; luồng người lạ; luồng tranh chấp gia phả |

### 2.2. Các loại kiểm thử

1. **Kiểm thử chức năng** (§3): bao phủ toàn bộ MVP theo test case HNT-P-001..HNT-P-056.
2. **Kiểm thử hiệu năng** (§4): tải màn hình P95 ≤ 2,5s; tin nhắn P95 ≤ 1s; tải lớn; phục hồi mạng.
3. **Kiểm thử bảo mật & phân quyền** (§5): kiểm tra tại backend, chống đoán ID, chống rò rỉ, giới hạn tần suất.
4. **Kiểm thử khả năng sử dụng** (§6): kịch bản người lớn tuổi.
5. **Kiểm thử hồi quy (regression):** chạy lại toàn bộ §3 sau mỗi bản build sửa lỗi trước phát hành.
6. **Kiểm thử smoke:** bộ 10 case cốt lõi (P-001, P-005, P-009, P-012, P-024, P-033, P-040, P-043, P-046, P-049) chạy trên mỗi bản build mới.

### 2.3. Nguyên tắc chung

- Mọi test case phải truy vết được tới mã yêu cầu HNT-FG-xxx hoặc mã nghiệm thu AT-xx/QA-xx.
- Không kiểm thử tính năng ngoài đặc tả; tham số cấu hình (thời hạn OTP, giới hạn tần suất, thời hạn sửa/thu hồi tin nhắn) lấy theo cấu hình hệ thống tại thời điểm kiểm thử và được ghi rõ trong biên bản.
- Dữ liệu kiểm thử gia phả dùng dữ liệu giả lập; không dùng thông tin người thật.

---

## 3. Kiểm thử chức năng

### 3.0. Bảng nhóm yêu cầu và ánh xạ tới mã PRD chính thức

| Mã nhóm | Phạm vi nhóm | Mã PRD tương ứng (HNT-F-xxx) | Nguồn đặc tả |
|---|---|---|---|
| HNT-FG-001 | Đăng ký bằng SĐT + OTP | HNT-F-001 | §5.1, §3.9 |
| HNT-FG-002 | Đăng nhập (OTP/email/OAuth), quản lý phiên | HNT-F-001, HNT-F-002, HNT-F-003, HNT-F-005 | §5.1, §3.9 |
| HNT-FG-003 | Khôi phục tài khoản | HNT-F-004 | §5.2, §3.9 |
| HNT-FG-004 | Tạo dòng họ, mời (link/QR), duyệt thành viên | HNT-F-099, HNT-F-006, HNT-F-007, HNT-F-008 | §3.9, §3.2B |
| HNT-FG-005 | Một tài khoản tham gia nhiều dòng họ; quyền độc lập theo dòng họ | HNT-F-009 | §2, §4 |
| HNT-FG-006 | Tạo cây gia phả nhiều thế hệ | HNT-F-011, HNT-F-012 | GP-01, GP-02 |
| HNT-FG-007 | Quản lý quan hệ gia đình (cha/mẹ/con/vợ-chồng/con nuôi/tái hôn) | HNT-F-013 | GP-03 |
| HNT-FG-008 | Hồ sơ thành viên + quyền riêng tư theo trường | HNT-F-014, HNT-F-055 | GP-04, §3.3 |
| HNT-FG-009 | Tìm kiếm gia phả | HNT-F-015 | GP-05 |
| HNT-FG-010 | Đề xuất sửa + quy trình xác minh (draft → pending_verification → verified/disputed) | HNT-F-016, HNT-F-017, HNT-F-024 | GP-06, GP-07, §2.2 |
| HNT-FG-011 | Phát hiện trùng hồ sơ | HNT-F-018 | GP-08 |
| HNT-FG-012 | Lịch sử chỉnh sửa + khôi phục | HNT-F-019 | GP-09, §2.2 |
| HNT-FG-013 | Liên kết tài khoản với hồ sơ gia phả (không trùng) | HNT-F-059 | §3.3, AT-03/QA-02 |
| HNT-FG-014 | Phân quyền gia phả (xem/đề xuất/sửa/duyệt/quản lý) | HNT-F-021 | GP-11, §4 |
| HNT-FG-015 | Phòng chat chung: văn bản, emoji, ảnh, tệp, reply, reaction, ghim, trạng thái | HNT-F-025, HNT-F-026, HNT-F-027, HNT-F-029, HNT-F-031, HNT-F-033, HNT-F-037, HNT-F-039 | §3.4 |
| HNT-FG-016 | Quản lý phòng chat (thành viên, vai trò, mời/duyệt, quyền, vi phạm) | HNT-F-041 – HNT-F-048 | §3.2B |
| HNT-FG-017 | Chat riêng: kết bạn, yêu cầu người lạ, chặn/báo cáo | HNT-F-060, HNT-F-061, HNT-F-063, HNT-F-064, HNT-F-065 | §3.5 |
| HNT-FG-018 | Giới hạn spam, chặn, báo cáo | HNT-F-062, HNT-F-064, HNT-F-065, HNT-F-098 | §3.4C, §3.5 |
| HNT-FG-019 | Nhóm "Gia đình tôi" | HNT-F-068 – HNT-F-076 | §3.6 |
| HNT-FG-020 | Bảng tin dòng họ | HNT-F-077 – HNT-F-083 | §3.7 |
| HNT-FG-021 | Lịch sự kiện (giỗ, sinh nhật, họp họ; âm/dương lịch) | HNT-F-023, HNT-F-086 – HNT-F-089 | §3.8, §3.1D |
| HNT-FG-022 | Trang chủ: sinh nhật/giỗ/sự kiện/thông báo | HNT-F-084 | §3.6 |
| HNT-FG-023 | Thông báo in-app + push, tùy chỉnh, chống trùng | HNT-F-090, HNT-F-091, HNT-F-092 | §3.7 |
| HNT-FG-024 | Danh bạ thành viên dòng họ + báo cáo hồ sơ | HNT-F-053, HNT-F-054, HNT-F-056, HNT-F-057, HNT-F-058 | §3.3 |
| HNT-FG-025 | Web quản trị dòng họ | HNT-F-093 | Checklist MVP |
| HNT-FG-026 | Nhật ký kiểm toán | HNT-F-094 | §4, §7.1 |
| HNT-FG-027 | Sao lưu & khôi phục | HNT-F-095 | §7.1, QA-10 |
| HNT-FG-028 | Xóa tài khoản & xử lý dữ liệu cá nhân | HNT-F-096 | §7.1, QA-09 |
| HNT-FG-029 | Quản lý quyền riêng tư cá nhân | HNT-F-055 | §3.3C, §4 |
| HNT-FG-030 | Chia sẻ lời mời/liên kết qua ứng dụng khác | HNT-F-085 | §2.1 |

### 3.1. Tài khoản, đăng nhập, khôi phục

### HNT-P-001 — Đăng ký tài khoản bằng số điện thoại và OTP
- **Mã yêu cầu liên quan:** HNT-FG-001
- **Điều kiện tiên quyết:** Thiết bị chưa từng đăng ký; SĐT hợp lệ chưa được dùng.
- **Các bước:**
  1. Mở app, chọn "Đăng ký", nhập SĐT.
  2. Nhận OTP qua SMS, nhập OTP trong thời hạn hiệu lực.
  3. Hoàn tất hồ sơ cơ bản (họ tên).
- **Kết quả mong đợi (Given–When–Then):** Given SĐT chưa đăng ký; When người dùng nhập đúng OTP còn hiệu lực; Then tài khoản được tạo, phiên đăng nhập được thiết lập và chuyển tới màn hình chính.

### HNT-P-002 — OTP sai, hết hạn và giới hạn thử lại
- **Mã yêu cầu liên quan:** HNT-FG-001 (chống lạm dụng OTP)
- **Điều kiện tiên quyết:** Đang ở màn hình nhập OTP.
- **Các bước:**
  1. Nhập sai OTP 5 lần liên tiếp.
  2. Chờ OTP hết hiệu lực (quá thời gian cấu hình) rồi nhập OTP đúng.
  3. Yêu cầu gửi lại OTP quá số lần cho phép trong 1 giờ.
- **Kết quả mong đợi:** Given các lần nhập sai vượt ngưỡng; When tiếp tục gửi yêu cầu; Then hệ thống khóa tạm việc gửi/nhập OTP, OTP hết hạn bị từ chối, và yêu cầu gửi lại vượt giới hạn bị chặn (HTTP 429).

### HNT-P-003 — Đăng nhập và quản lý phiên đăng nhập
- **Mã yêu cầu liên quan:** HNT-FG-002
- **Điều kiện tiên quyết:** Tài khoản đã đăng ký (SĐT/OTP và email/mật khẩu).
- **Các bước:**
  1. Đăng nhập bằng email + mật khẩu đúng → thành công.
  2. Nhập sai mật khẩu 5 lần → kiểm tra khóa tạm.
  3. Vào "Quản lý thiết bị/phiên", đăng xuất phiên trên thiết bị khác.
- **Kết quả mong đợi:** Given thông tin đăng nhập đúng; When đăng nhập; Then phiên mới được tạo. Given phiên đang hoạt động trên thiết bị B; When người dùng đăng xuất phiên đó từ thiết bị A; Then thiết bị B bị buộc đăng xuất và token cũ không còn hiệu lực.

### HNT-P-004 — Khôi phục tài khoản khi đổi số điện thoại/mất thiết bị
- **Mã yêu cầu liên quan:** HNT-FG-003
- **Điều kiện tiên quyết:** Tài khoản đã đăng ký, có email dự phòng.
- **Các bước:**
  1. Chọn "Quên tài khoản/khôi phục", khai báo SĐT cũ + email.
  2. Hoàn tất bước xác minh danh tính theo quy trình.
  3. Cập nhật SĐT mới và đăng nhập lại.
- **Kết quả mong đợi:** Given người dùng mất quyền truy cập SĐT cũ; When hoàn tất xác minh danh tính; Then tài khoản được liên kết sang SĐT mới, dữ liệu (gia phả, chat, nhóm) được giữ nguyên.

### 3.2. Dòng họ: tạo, mời, duyệt, đa dòng họ

### HNT-P-005 — Tạo dòng họ mới
- **Mã yêu cầu liên quan:** HNT-FG-004 (AT-01, QA-01)
- **Điều kiện tiên quyết:** Đã đăng nhập.
- **Các bước:**
  1. Chọn "Tạo dòng họ", nhập tên dòng họ, quê quán, tổ tiên khởi nguồn, phạm vi truy cập (riêng tư).
  2. Lưu và mở không gian dòng họ.
- **Kết quả mong đợi:** Given thông tin hợp lệ; When tạo dòng họ; Then dòng họ được tạo, người tạo là quản trị viên, phòng chat chung và bảng tin mặc định được khởi tạo.

### HNT-P-006 — Mời qua liên kết/QR, liên kết hết hạn và thu hồi
- **Mã yêu cầu liên quan:** HNT-FG-004
- **Điều kiện tiên quyết:** Là quản trị viên dòng họ.
- **Các bước:**
  1. Tạo liên kết mời có thời hạn; chia sẻ cho người dùng mới.
  2. Người mới mở liên kết còn hiệu lực → gửi yêu cầu tham gia.
  3. Thu hồi liên kết; thử mở lại liên kết đã thu hồi/đã hết hạn.
- **Kết quả mong đợi:** Given liên kết còn hiệu lực; When người mới mở; Then cho phép gửi yêu cầu tham gia. Given liên kết đã thu hồi/hết hạn; When mở; Then hiển thị thông báo liên kết không còn hiệu lực và không cho gửi yêu cầu.

### HNT-P-007 — Duyệt/từ chối yêu cầu tham gia dòng họ
- **Mã yêu cầu liên quan:** HNT-FG-004
- **Điều kiện tiên quyết:** Có yêu cầu tham gia đang chờ (người xin khai báo nhánh gia đình và quan hệ).
- **Các bước:**
  1. Quản trị viên mở danh sách yêu cầu, xem thông tin khai báo.
  2. Chấp thuận 1 yêu cầu, từ chối 1 yêu cầu kèm lý do.
- **Kết quả mong đợi:** Given yêu cầu đang chờ; When quản trị viên chấp thuận; Then người xin trở thành thành viên, được cấp quyền mặc định, nhận thông báo. When từ chối; Then yêu cầu đóng, người xin nhận thông báo lý do.

### HNT-P-008 — Một tài khoản tham gia nhiều dòng họ, quyền độc lập
- **Mã yêu cầu liên quan:** HNT-FG-005 (§4: vai trò theo từng dòng họ)
- **Điều kiện tiên quyết:** Tài khoản là quản trị viên dòng họ A.
- **Các bước:**
  1. Xin tham gia và được duyệt vào dòng họ B với vai trò thành viên thường.
  2. Thử thực hiện thao tác quản trị (duyệt thành viên) trong dòng họ B.
  3. Kiểm tra danh sách dòng họ trong hồ sơ cá nhân.
- **Kết quả mong đợi:** Given là admin ở A và member ở B; When thao tác quản trị trong B; Then bị từ chối (403). Quyền ở A không ảnh hưởng B và ngược lại.

### 3.3. Gia phả: cây, quan hệ, hồ sơ

### HNT-P-009 — Tạo và xem cây gia phả nhiều thế hệ
- **Mã yêu cầu liên quan:** HNT-FG-006 (AT-02, QA-01)
- **Điều kiện tiên quyết:** Đã tạo dòng họ.
- **Các bước:**
  1. Thêm tổ tiên khởi nguồn, sau đó thêm 3 thế hệ (mỗi thế hệ ≥ 2 người).
  2. Chuyển chế độ hiển thị: cây dọc → cây ngang → danh sách theo thế hệ.
  3. Phóng to/thu nhỏ/kéo cây, mở hồ sơ từ nút thành viên.
- **Kết quả mong đợi:** Given cây có 4 thế hệ; When xem ở các chế độ; Then hiển thị đúng số thế hệ, số thành viên, chi/nhánh đang xem; thao tác zoom/kéo mượt; mở đúng hồ sơ.

### HNT-P-010 — Quản lý quan hệ: cha/mẹ/con/vợ-chồng, con nuôi, tái hôn
- **Mã yêu cầu liên quan:** HNT-FG-007
- **Điều kiện tiên quyết:** Cây gia phả đã có ít nhất 2 thế hệ.
- **Các bước:**
  1. Thêm quan hệ cha–con, mẹ–con, vợ–chồng.
  2. Thêm quan hệ con nuôi/cha mẹ nuôi và quan hệ tái hôn.
  3. Kiểm tra hiển thị vai vế, thế hệ, chi/nhánh của các thành viên liên quan.
- **Kết quả mong đợi:** Given các loại quan hệ được thêm; When xem cây và hồ sơ; Then quan hệ đặc biệt được ghi nhận đúng loại, thế hệ/vai vế tính đúng, không phá vỡ cấu trúc cây.

### HNT-P-011 — Hồ sơ thành viên và quyền riêng tư theo trường
- **Mã yêu cầu liên quan:** HNT-FG-008 (QA-07)
- **Điều kiện tiên quyết:** Hồ sơ có đủ các nhóm trường: cơ bản, gia đình, nơi ở, học tập/nghề nghiệp, nhóm máu, tư liệu.
- **Các bước:**
  1. Đặt nhóm máu = riêng tư, SĐT = riêng tư, nơi ở = chỉ tỉnh/thành.
  2. Dùng tài khoản thành viên cùng dòng họ (không được cấp quyền) xem hồ sơ.
  3. Dùng tài khoản được cấp quyền xem hồ sơ.
- **Kết quả mong đợi:** Given trường được đặt riêng tư; When người không có quyền xem; Then nhóm máu/SĐT bị ẩn hoàn toàn (kể cả qua API). When người được cấp quyền xem; Then hiển thị đầy đủ.

### HNT-P-012 — Đề xuất sửa → xác minh → cập nhật (luồng verified)
- **Mã yêu cầu liên quan:** HNT-FG-010 (QA-03, AT-11)
- **Điều kiện tiên quyết:** Thành viên có quyền đề xuất; hồ sơ ở trạng thái verified.
- **Các bước:**
  1. Thành viên đề xuất sửa ngày sinh của một hồ sơ (trạng thái → pending_verification).
  2. Người quản lý gia phả mở đề xuất, kiểm tra, phê duyệt.
  3. Kiểm tra hồ sơ, trạng thái và nhật ký.
- **Kết quả mong đợi:** Given đề xuất đang chờ xác minh; When được duyệt; Then hồ sơ cập nhật giá trị mới, trạng thái → verified, nhật ký ghi: người đề xuất, người duyệt, thời gian, giá trị trước/sau, lý do.

### HNT-P-013 — Từ chối đề xuất, giữ nguyên dữ liệu
- **Mã yêu cầu liên quan:** HNT-FG-010
- **Điều kiện tiên quyết:** Có đề xuất đang ở trạng thái pending_verification.
- **Các bước:**
  1. Người quản lý gia phả từ chối đề xuất kèm lý do.
  2. Kiểm tra hồ sơ và thông báo tới người đề xuất.
- **Kết quả mong đợi:** Given đề xuất bị từ chối; When kiểm tra; Then dữ liệu giữ nguyên giá trị cũ, trạng thái hồ sơ không đổi, người đề xuất nhận thông báo lý do.

### HNT-P-014 — Tranh chấp: disputed → xử lý → kết luận
- **Mã yêu cầu liên quan:** HNT-FG-010 (§2.2: cơ chế phản đối, giải quyết tranh chấp)
- **Điều kiện tiên quyết:** Hồ sơ verified có thông tin gây tranh cãi giữa 2 thành viên.
- **Các bước:**
  1. Thành viên A gửi phản đối/yêu cầu sửa sai → hồ sơ chuyển disputed.
  2. Quản trị viên cấp cao mở xử lý tranh chấp, xem lịch sử và các bên.
  3. Ra kết luận, cập nhật hồ sơ về verified.
- **Kết quả mong đợi:** Given có phản đối; When gửi; Then hồ sơ hiển thị trạng thái disputed rõ ràng. When tranh chấp được giải quyết; Then kết luận và toàn bộ quá trình được ghi nhật ký.

### HNT-P-015 — Phát hiện trùng hồ sơ khi tạo mới
- **Mã yêu cầu liên quan:** HNT-FG-011 (AT-03)
- **Điều kiện tiên quyết:** Gia phả đã có hồ sơ "Nguyễn Văn A, sinh 1950".
- **Các bước:**
  1. Tạo hồ sơ mới "Nguyễn Văn A, sinh 1950" (cùng tên + năm sinh).
  2. Quan sát cảnh báo của hệ thống.
- **Kết quả mong đợi:** Given hồ sơ mới có khả năng trùng; When lưu; Then hệ thống cảnh báo danh sách hồ sơ nghi trùng và yêu cầu xác nhận trước khi tạo, tránh tạo hai hồ sơ cho cùng một người.

### HNT-P-016 — Liên kết tài khoản với hồ sơ gia phả, không tạo trùng
- **Mã yêu cầu liên quan:** HNT-FG-013 (AT-03, QA-02)
- **Điều kiện tiên quyết:** Gia phả đã có hồ sơ của người đang sống nhưng chưa có tài khoản.
- **Các bước:**
  1. Người đó đăng ký tài khoản mới.
  2. Thực hiện quy trình xác minh để liên kết tài khoản với hồ sơ có sẵn.
  3. Kiểm tra số lượng hồ sơ của người đó trong gia phả.
- **Kết quả mong đợi:** Given hồ sơ gia phả đã tồn tại; When tài khoản được xác minh và liên kết; Then không tạo bản ghi family_persons mới; tài khoản được gắn đúng hồ sơ duy nhất.

### HNT-P-017 — Lịch sử chỉnh sửa và khôi phục
- **Mã yêu cầu liên quan:** HNT-FG-012
- **Điều kiện tiên quyết:** Hồ sơ đã có ít nhất 2 lần chỉnh sửa được duyệt.
- **Các bước:**
  1. Mở lịch sử chỉnh sửa của hồ sơ.
  2. Khôi phục về phiên bản trước theo chính sách lưu trữ.
- **Kết quả mong đợi:** Given có lịch sử; When xem; Then hiển thị đủ người sửa, thời gian, nội dung trước/sau, lý do. When khôi phục; Then hồ sơ về giá trị phiên bản đã chọn và lần khôi phục được ghi nhật ký mới.

### HNT-P-018 — Tìm kiếm gia phả
- **Mã yêu cầu liên quan:** HNT-FG-009
- **Điều kiện tiên quyết:** Gia phả có ≥ 50 hồ sơ nhiều chi/nhánh/thế hệ.
- **Các bước:**
  1. Tìm theo họ tên, bí danh, quê quán, thế hệ.
  2. Tìm bằng tài khoản chỉ được xem một phần gia phả.
- **Kết quả mong đợi:** Given từ khóa hợp lệ; When tìm kiếm; Then trả về đúng hồ sơ khớp, chỉ gồm những hồ sơ người tìm được phép xem.

### HNT-P-019 — Phân quyền gia phả thực thi tại backend
- **Mã yêu cầu liên quan:** HNT-FG-014 (AT-04, QA-04)
- **Điều kiện tiên quyết:** Tài khoản chỉ có quyền xem gia phả.
- **Các bước:**
  1. Gọi trực tiếp API sửa hồ sơ (bypass giao diện) với token của tài khoản chỉ-xem.
  2. Thử đề xuất sửa (quyền được phép).
- **Kết quả mong đợi:** Given không có quyền sửa; When gọi API sửa trực tiếp; Then server trả 403 và dữ liệu không đổi. Quyền đề xuất vẫn hoạt động bình thường.

### HNT-P-020 — Dữ liệu người đã mất không làm lộ thông tin người sống
- **Mã yêu cầu liên quan:** HNT-FG-008 (§7.1: vấn đề đặc biệt về người đã mất)
- **Điều kiện tiên quyết:** Hồ sơ tổ tiên đã mất có hậu duệ còn sống trong gia phả.
- **Các bước:**
  1. Thành viên được quyền thêm thông tin tổ tiên nhập thêm tư liệu.
  2. Kiểm tra các trường SĐT/địa chỉ của hậu duệ hiển thị kèm theo.
- **Kết quả mong đợi:** Given thêm thông tin tổ tiên; When lưu; Then hệ thống không tự động công khai SĐT, địa chỉ, hồ sơ riêng tư của hậu duệ còn sống.

### 3.4. Danh bạ thành viên dòng họ

### HNT-P-021 — Xem, tìm, lọc danh bạ theo quyền
- **Mã yêu cầu liên quan:** HNT-FG-024
- **Điều kiện tiên quyết:** Dòng họ có ≥ 30 thành viên nhiều chi/nhánh/tỉnh thành.
- **Các bước:**
  1. Lọc theo chi/nhánh, tỉnh/thành; tìm theo tên, nghề nghiệp, nơi ở.
  2. Mở hồ sơ từ danh bạ; thử xem trường riêng tư khi không có quyền.
- **Kết quả mong đợi:** Given bộ lọc hợp lệ; When áp dụng; Then danh sách đúng, hiển thị ảnh/tên/chi-nhánh và chỉ thông tin liên hệ được phép xem.

### HNT-P-022 — Báo cáo hồ sơ sai, trùng lặp, giả mạo
- **Mã yêu cầu liên quan:** HNT-FG-024
- **Điều kiện tiên quyết:** Đã đăng nhập là thành viên dòng họ.
- **Các bước:**
  1. Báo cáo một hồ sơ với lý do "trùng lặp", đính kèm hồ sơ đúng.
  2. Quản trị viên mở xem báo cáo và cập nhật trạng thái xử lý.
- **Kết quả mong đợi:** Given báo cáo được gửi; When kiểm tra; Then hệ thống ghi nhận lý do, dữ liệu liên quan và trạng thái xử lý; quản trị viên thấy được báo cáo.

### 3.5. Phòng chat chung của dòng họ

### HNT-P-023 — Gửi/nhận tin nhắn văn bản theo thời gian thực
- **Mã yêu cầu liên quan:** HNT-FG-015 (AT-05, QA-05)
- **Điều kiện tiên quyết:** 2 tài khoản là thành viên cùng dòng họ, cùng trong phòng chat chung.
- **Các bước:**
  1. Tài khoản A gửi tin nhắn văn bản.
  2. Quan sát thiết bị của tài khoản B.
- **Kết quả mong đợi:** Given cả hai trong phòng chat; When A gửi; Then B nhận và hiển thị tin nhắn gần như tức thời, đúng thứ tự thời gian.

### HNT-P-024 — Gửi ảnh và tệp đính kèm
- **Mã yêu cầu liên quan:** HNT-FG-015 (AT-05)
- **Điều kiện tiên quyết:** Trong phòng chat chung.
- **Các bước:**
  1. Gửi nhiều ảnh cùng lúc; mở xem toàn màn hình.
  2. Gửi tệp PDF, Word, Excel; tải xuống và mở tệp.
- **Kết quả mong đợi:** Given tệp thuộc định dạng cho phép; When gửi; Then ảnh/tệp hiển thị trong cuộc trò chuyện, xem/tải được, tệp không thuộc định dạng cho phép bị từ chối.

### HNT-P-025 — Emoji, reply, reaction, ghim tin nhắn
- **Mã yêu cầu liên quan:** HNT-FG-015
- **Điều kiện tiên quyết:** Trong phòng chat chung có ít nhất 3 tin nhắn.
- **Các bước:**
  1. Gửi tin nhắn có emoji.
  2. Reply một tin nhắn cụ thể → kiểm tra ngữ cảnh trích dẫn.
  3. Thả reaction (like/tim/haha) → kiểm tra tổng hợp.
  4. Ghim thông báo quan trọng (lịch họp họ) → kiểm tra hiển thị ghim.
- **Kết quả mong đợi:** Given thao tác trên tin nhắn tồn tại; When thực hiện; Then emoji hiển thị đúng; reply kèm ngữ cảnh tin gốc; reaction được tổng hợp theo từng loại; tin ghim hiển thị nổi bật cho mọi thành viên.

### HNT-P-026 — Trạng thái gửi/nhận/đọc
- **Mã yêu cầu liên quan:** HNT-FG-015
- **Điều kiện tiên quyết:** 2 thiết bị trong phòng chat chung.
- **Các bước:**
  1. A gửi tin nhắn khi B offline → kiểm tra trạng thái.
  2. B mở app và đọc tin nhắn → kiểm tra trạng thái cập nhật ở A.
- **Kết quả mong đợi:** Given tin nhắn đã gửi; When B nhận/đọc; Then trạng thái chuyển đúng: đang gửi → đã gửi → đã nhận → đã đọc (khi có thể xác nhận).

### HNT-P-027 — Chuyển tiếp, sửa, thu hồi, xóa tin nhắn
- **Mã yêu cầu liên quan:** HNT-FG-015 (§3.4: reply, chuyển tiếp, sửa, thu hồi)
- **Điều kiện tiên quyết:** Trong phòng chat chung, có tin nhắn do chính mình gửi.
- **Các bước:**
  1. Sửa tin nhắn trong thời hạn quy định → kiểm tra dấu "đã sửa".
  2. Sửa tin nhắn quá thời hạn → phải bị từ chối.
  3. Thu hồi tin nhắn → kiểm tra hiển thị trạng thái thu hồi ở mọi thành viên.
  4. Xóa tin nhắn phía mình; chuyển tiếp tin nhắn sang cuộc trò chuyện khác.
- **Kết quả mong đợi:** Given trong thời hạn; When sửa/thu hồi; Then nội dung cập nhật cho mọi người kèm trạng thái. Given quá thời hạn; When sửa; Then bị từ chối. Xóa phía mình không ảnh hưởng hiển thị của người khác.

### HNT-P-028 — Tìm kiếm trong chat, đánh dấu chưa đọc, danh sách tệp đã chia sẻ
- **Mã yêu cầu liên quan:** HNT-FG-015 (§3.4: tìm kiếm, đánh dấu chưa đọc; §3.2B: xem tệp đã chia sẻ)
- **Điều kiện tiên quyết:** Phòng chat có ≥ 50 tin nhắn gồm văn bản, ảnh, tệp.
- **Các bước:**
  1. Tìm theo nội dung, người gửi, mốc thời gian.
  2. Đánh dấu một cuộc trò chuyện là chưa đọc.
  3. Mở danh sách tệp/ảnh/video/liên kết đã chia sẻ.
- **Kết quả mong đợi:** Given dữ liệu tồn tại; When tìm kiếm; Then trả về đúng tin nhắn/tệp khớp. Đánh dấu chưa đọc hiển thị đúng badge. Danh sách media liệt kê đầy đủ.

### HNT-P-029 — Phân quyền trong phòng chat
- **Mã yêu cầu liên quan:** HNT-FG-016
- **Điều kiện tiên quyết:** Quản trị viên cấu hình: nhóm member thường không được ghim, một tài khoản bị tắt quyền gửi tin.
- **Các bước:**
  1. Member thường thử ghim tin nhắn → phải bị từ chối.
  2. Tài khoản bị tắt quyền gửi thử gửi tin nhắn → phải bị chặn.
  3. Admin ghim thông báo → thành công.
- **Kết quả mong đợi:** Given cấu hình quyền; When thao tác vượt quyền (kể cả gọi API trực tiếp); Then server từ chối. Thao tác trong quyền cho phép hoạt động bình thường.

### HNT-P-030 — Quản lý thành viên vi phạm, lịch sử thay đổi
- **Mã yêu cầu liên quan:** HNT-FG-016 (§3.2B)
- **Điều kiện tiên quyết:** Là quản trị viên phòng chat.
- **Các bước:**
  1. Xóa thành viên vi phạm khỏi nhóm, chặn tham gia lại.
  2. Thành viên bị chặn thử tham gia lại bằng liên kết mời.
  3. Mở lịch sử thay đổi thành viên và quyền quản trị.
- **Kết quả mong đợi:** Given thành viên bị xóa + chặn; When tham gia lại; Then bị từ chối theo chính sách. Lịch sử ghi đầy đủ: người thực hiện, hành động, thời gian.

### 3.6. Chat riêng, người lạ, kết bạn, chặn/báo cáo

### HNT-P-031 — Nhắn tin riêng giữa thành viên cùng dòng họ
- **Mã yêu cầu liên quan:** HNT-FG-017 (AT-06, QA-05)
- **Điều kiện tiên quyết:** 2 tài khoản là thành viên cùng dòng họ.
- **Các bước:**
  1. Từ danh bạ, mở hồ sơ → chọn "Nhắn tin".
  2. Gửi văn bản, ảnh, tệp; dùng reply/reaction.
- **Kết quả mong đợi:** Given cả hai là thành viên; When mở trò chuyện; Then cuộc trò chuyện riêng được tạo, tin nhắn gửi/nhận bình thường, độc lập với phòng chat chung.

### HNT-P-032 — Luồng yêu cầu nhắn tin từ người lạ
- **Mã yêu cầu liên quan:** HNT-FG-017 (§3.4A: luồng nhắn tin người lạ)
- **Điều kiện tiên quyết:** A và B chưa kết bạn, chưa từng trò chuyện.
- **Các bước:**
  1. A tìm B, mở hồ sơ, gửi tin nhắn → B nhận "yêu cầu nhắn tin" ở trạng thái chờ.
  2. B chấp nhận → cuộc trò chuyện mở theo quyền riêng tư.
  3. Lặp lại với cặp khác; B từ chối/chặn.
- **Kết quả mong đợi:** Given chưa kết nối; When A gửi; Then B thấy yêu cầu chờ, chưa mở trò chuyện đầy đủ. When B chấp nhận; Then trò chuyện mở. When B từ chối/chặn; Then A không tiếp tục gửi được theo chính sách.

### HNT-P-033 — Giới hạn đối với tin nhắn từ người lạ (chống spam)
- **Mã yêu cầu liên quan:** HNT-FG-018 (§3.5: giới hạn tần suất, hạn chế nội dung không mong muốn)
- **Điều kiện tiên quyết:** A là người lạ đối với B (yêu cầu chưa được chấp nhận).
- **Các bước:**
  1. A gửi nhiều tin nhắn chờ vượt giới hạn số lượng cấu hình.
  2. A thử gửi ảnh/video trong khi yêu cầu chưa được chấp nhận.
  3. Kiểm tra trạng thái trực tuyến của B từ góc nhìn của A.
- **Kết quả mong đợi:** Given chưa được chấp nhận; When vượt giới hạn; Then tin nhắn tiếp theo bị chặn. Ảnh/video không được tự động cho phép. Trạng thái trực tuyến của B không lộ cho A.

### HNT-P-034 — Kết bạn: gửi/chấp nhận/từ chối/hủy
- **Mã yêu cầu liên quan:** HNT-FG-017
- **Điều kiện tiên quyết:** 2 tài khoản chưa kết bạn.
- **Các bước:**
  1. A gửi lời mời kết bạn cho B (thử gửi lặp nhiều lần).
  2. B chấp nhận → kiểm tra trạng thái kết nối.
  3. A hủy kết bạn → kiểm tra lại.
- **Kết quả mong đợi:** Given chưa kết bạn; When gửi lời mời; Then B nhận thông báo, hệ thống ngăn gửi lặp quá nhiều. When B chấp nhận; Then trạng thái kết nối cập nhật. Khi hủy kết bạn, trạng thái trở về chưa kết nối.

### HNT-P-035 — Chặn, bỏ chặn và báo cáo
- **Mã yêu cầu liên quan:** HNT-FG-017, HNT-FG-018 (AT-07, QA-06)
- **Điều kiện tiên quyết:** A và B đã từng trò chuyện.
- **Các bước:**
  1. B chặn A → A thử nhắn tin cho B.
  2. B báo cáo A với lý do quấy rối.
  3. B bỏ chặn A → A nhắn lại.
- **Kết quả mong đợi:** Given B chặn A; When A gửi tin; Then bị ngăn theo chính sách. Báo cáo ghi nhận lý do, dữ liệu liên quan, trạng thái xử lý. When bỏ chặn; Then khả năng liên hệ được khôi phục theo thiết lập.

### HNT-P-036 — Phân biệt xóa cuộc trò chuyện, thu hồi tin nhắn, chặn người dùng
- **Mã yêu cầu liên quan:** HNT-FG-017 (§3.4C: ba hành động khác nhau, không dùng chung cơ chế)
- **Điều kiện tiên quyết:** A và B có cuộc trò chuyện với nhiều tin nhắn.
- **Các bước:**
  1. A xóa cuộc trò chuyện → kiểm tra danh sách chat của A và B.
  2. A thu hồi một tin nhắn → kiểm tra hiển thị ở B.
  3. A chặn B → kiểm tra khả năng B nhắn tin.
- **Kết quả mong đợi:** Given ba hành động riêng biệt; When xóa cuộc trò chuyện; Then chỉ xóa khỏi danh sách của A, B vẫn thấy đầy đủ. Thu hồi hiển thị trạng thái thu hồi ở cả hai. Chặn ngăn B liên hệ A.

### 3.7. Nhóm riêng "Gia đình tôi"

### HNT-P-037 — Tạo nhóm, mời thành viên, phân quyền
- **Mã yêu cầu liên quan:** HNT-FG-019 (AT-06, QA-05)
- **Điều kiện tiên quyết:** Đã đăng nhập.
- **Các bước:**
  1. Chọn "Tạo nhóm gia đình", đặt tên, ảnh đại diện, mời thành viên từ danh bạ/dòng họ, chọn quản trị viên, đặt quyền riêng tư.
  2. Tạo nhóm và bắt đầu trò chuyện.
- **Kết quả mong đợi:** Given thông tin hợp lệ; When tạo; Then nhóm được tạo với đúng thành viên, vai trò, quyền riêng tư; các thành viên nhận lời mời.

### HNT-P-038 — Hoạt động trong nhóm: chat, sự kiện, công việc chung
- **Mã yêu cầu liên quan:** HNT-FG-019 (§3.6B)
- **Điều kiện tiên quyết:** Nhóm "Gia đình tôi" đã có ≥ 4 thành viên.
- **Các bước:**
  1. Gửi tin nhắn, ảnh, reply, reaction, ghim trong nhóm.
  2. Tạo lịch sự kiện (giỗ) + nhắc lịch; tạo danh sách công việc chuẩn bị.
  3. Một tài khoản tham gia thêm 2 nhóm khác → kiểm tra độc lập.
- **Kết quả mong đợi:** Given trong nhóm; When thực hiện; Then các tính năng hoạt động; sự kiện nhắc đúng hẹn; các nhóm hoạt động độc lập nhau.

### HNT-P-039 — Thành viên nhóm không mặc nhiên có quyền gia phả
- **Mã yêu cầu liên quan:** HNT-FG-019 (§3.6C: tách biệt nhóm chat và gia phả)
- **Điều kiện tiên quyết:** Nhóm có thành viên là con rể/con dâu (không cùng huyết thống), không được cấp quyền gia phả.
- **Các bước:**
  1. Thành viên đó thử sửa hồ sơ gia phả (gọi API trực tiếp).
  2. Thành viên đó thử xem hồ sơ riêng tư của toàn dòng họ.
- **Kết quả mong đợi:** Given không được cấp quyền gia phả; When thao tác; Then bị từ chối ở backend. Việc tham gia nhóm chat không suy ra quyền huyết thống hay quyền xem toàn bộ hồ sơ.

### 3.8. Bảng tin dòng họ và trang chủ

### HNT-P-040 — Đăng bài, bình luận, reaction, ghim
- **Mã yêu cầu liên quan:** HNT-FG-020, HNT-FG-022
- **Điều kiện tiên quyết:** Là thành viên dòng họ.
- **Các bước:**
  1. Đăng bài văn bản + ảnh + video/album.
  2. Thành viên khác bình luận, thả reaction.
  3. Admin ghim bài thông báo quan trọng.
- **Kết quả mong đợi:** Given bài viết hợp lệ; When đăng; Then hiển thị trên bảng tin/trang chủ. Bình luận/reaction hoạt động. Bài ghim hiển thị nổi bật.

### HNT-P-041 — Giới hạn người xem theo dòng họ/nhánh/nhóm
- **Mã yêu cầu liên quan:** HNT-FG-020 (§3.7: giới hạn người xem)
- **Điều kiện tiên quyết:** Bài viết giới hạn cho một nhánh gia đình.
- **Các bước:**
  1. Đăng bài giới hạn phạm vi xem cho nhánh X.
  2. Dùng tài khoản thuộc nhánh Y (cùng dòng họ) mở bảng tin.
  3. Lọc bài theo loại, người đăng, thời gian.
- **Kết quả mong đợi:** Given bài giới hạn nhánh X; When tài khoản nhánh Y xem; Then không thấy bài viết (kể cả qua API/tìm kiếm). Bộ lọc trả về đúng tập bài.

### HNT-P-042 — Báo cáo bài viết vi phạm và quản lý nội dung
- **Mã yêu cầu liên quan:** HNT-FG-020
- **Điều kiện tiên quyết:** Bảng tin có bài viết.
- **Các bước:**
  1. Thành viên báo cáo bài viết vi phạm.
  2. Quản trị viên xem báo cáo, gỡ bài.
- **Kết quả mong đợi:** Given báo cáo; When quản trị xử lý; Then bài bị gỡ/khóa theo quyết định, hành động được ghi nhận.

### 3.9. Lịch sự kiện

### HNT-P-043 — Tạo sự kiện giỗ/họp họ với lịch âm–dương
- **Mã yêu cầu liên quan:** HNT-FG-021 (QA-01 phạm vi sự kiện)
- **Điều kiện tiên quyết:** Là thành viên có quyền tạo sự kiện.
- **Các bước:**
  1. Tạo sự kiện ngày giỗ: nhập ngày dương → kiểm tra ngày âm tự quy đổi (và ngược lại).
  2. Gửi lời mời tới các nhánh liên quan; 2 thành viên xác nhận tham dự, 1 từ chối.
  3. Lưu địa điểm, người tổ chức, nội dung.
- **Kết quả mong đợi:** Given ngày hợp lệ; When tạo; Then sự kiện hiển thị cả âm/dương lịch đúng múi giờ; lời mời được gửi; danh sách tham dự cập nhật đúng.

### HNT-P-044 — Trang chủ: sinh nhật, ngày giỗ, sự kiện sắp tới
- **Mã yêu cầu liên quan:** HNT-FG-022 (§3.6: trang chủ)
- **Điều kiện tiên quyết:** Có sinh nhật thành viên, ngày giỗ, sự kiện trong 30 ngày tới.
- **Các bước:**
  1. Mở tab Trang chủ.
  2. Kiểm tra các mục: sinh nhật, ngày giỗ, sự kiện sắp tới, thông báo mới.
- **Kết quả mong đợi:** Given dữ liệu tồn tại và người dùng được phép xem; When mở trang chủ; Then hiển thị đầy đủ, đúng thứ tự thời gian; mục không được phép xem không xuất hiện.

### HNT-P-045 — Nhắc lịch và tư liệu sau sự kiện
- **Mã yêu cầu liên quan:** HNT-FG-021 (§3.1D, §3.8)
- **Điều kiện tiên quyết:** Sự kiện giỗ sắp diễn ra trong 3 ngày.
- **Các bước:**
  1. Kiểm tra thông báo nhắc lịch trước sự kiện.
  2. Sau sự kiện, tải lên ảnh và biên bản.
- **Kết quả mong đợi:** Given sự kiện sắp tới; When đến thời điểm nhắc; Then người tham dự nhận nhắc lịch (không trùng lặp). Tư liệu sau sự kiện được lưu gắn với sự kiện.

### 3.10. Thông báo

### HNT-P-046 — Thông báo in-app và push cho các sự kiện chính
- **Mã yêu cầu liên quan:** HNT-FG-023
- **Điều kiện tiên quyết:** Thiết bị cho phép push notification.
- **Các bước:**
  1. Gây ra các sự kiện: tin nhắn mới, lời mời kết bạn, yêu cầu xác minh gia phả, ngày giỗ sắp đến, thông báo quan trọng của admin.
  2. Kiểm tra cả thông báo đẩy và thông báo trong ứng dụng.
- **Kết quả mong đợi:** Given sự kiện xảy ra; When hệ thống xử lý; Then người nhận liên quan nhận được thông báo đẩy + in-app đúng nội dung, đúng đối tượng.

### HNT-P-047 — Tùy chỉnh thông báo, giờ yên lặng, chống trùng lặp
- **Mã yêu cầu liên quan:** HNT-FG-023 (§3.7: tùy chỉnh; chống gửi trùng)
- **Điều kiện tiên quyết:** Tham gia ≥ 2 nhóm chat.
- **Các bước:**
  1. Tắt thông báo 1 nhóm, bật "chỉ tin quan trọng" nhóm còn lại, đặt giờ yên lặng 22:00–06:00.
  2. Gây ra sự kiện quan trọng (nhắc giỗ) 2 lần trong thời gian ngắn.
- **Kết quả mong đợi:** Given cấu hình tùy chỉnh; When có tin nhắn thường trong giờ yên lặng; Then không rung/chuông. Sự kiện quan trọng không bị gửi thông báo trùng lặp. Thông báo quan trọng yêu cầu xác nhận đã đọc khi admin cấu hình.

### 3.11. Vận hành: quản trị, nhật ký, sao lưu, dữ liệu cá nhân

### HNT-P-048 — Web quản trị dòng họ
- **Mã yêu cầu liên quan:** HNT-FG-025 (checklist MVP)
- **Điều kiện tiên quyết:** Là quản trị viên dòng họ; truy cập web quản trị.
- **Các bước:**
  1. Duyệt thành viên, cập nhật nội quy, đăng thông báo quan trọng.
  2. Phân quyền quản trị viên/phó quản trị viên.
- **Kết quả mong đợi:** Given là admin; When thao tác trên web; Then các thay đổi có hiệu lực trên app; phân quyền được ghi nhận.

### HNT-P-049 — Nhật ký kiểm toán thao tác quan trọng
- **Mã yêu cầu liên quan:** HNT-FG-026 (AT-11, QA-03)
- **Điều kiện tiên quyết:** Đã thực hiện: duyệt đề xuất gia phả, cấp quyền admin, xử lý tranh chấp, xóa dữ liệu.
- **Các bước:**
  1. Mở nhật ký kiểm toán (admin).
  2. Kiểm tra từng sự kiện đã thực hiện.
- **Kết quả mong đợi:** Given các thao tác nhạy cảm đã xảy ra; When xem nhật ký; Then mỗi sự kiện có: người thực hiện, hành động, đối tượng, thời gian, giá trị trước/sau (nếu có). Nhật ký không thể bị xóa bởi admin dòng họ.

### HNT-P-050 — Sao lưu định kỳ và kiểm thử khôi phục
- **Mã yêu cầu liên quan:** HNT-FG-027 (AT-12, QA-10)
- **Điều kiện tiên quyết:** Hệ thống vận hành có lịch sao lưu.
- **Các bước:**
  1. Kiểm tra bản sao lưu gần nhất (thời điểm, tính toàn vẹn).
  2. Thực hiện khôi phục lên môi trường kiểm thử độc lập.
- **Kết quả mong đợi:** Given lịch sao lưu; When kiểm tra; Then bản sao lưu đầy đủ, mới nhất trong khoảng cấu hình. When khôi phục; Then dữ liệu (gia phả, tin nhắn, tệp) khôi phục đúng và nhất quán.

### HNT-P-051 — Xóa tài khoản và xử lý dữ liệu cá nhân
- **Mã yêu cầu liên quan:** HNT-FG-028 (AT-14, QA-09)
- **Điều kiện tiên quyết:** Tài khoản có dữ liệu: hồ sơ cá nhân, tin nhắn, bài viết.
- **Các bước:**
  1. Yêu cầu xóa tài khoản, xác nhận theo quy trình.
  2. Kiểm tra: không đăng nhập được nữa; dữ liệu cá nhân được xử lý theo chính sách.
  3. Kiểm tra lịch sử gia phả của người khác không bị xóa theo.
- **Kết quả mong đợi:** Given yêu cầu xóa được xác nhận; When hoàn tất; Then tài khoản vô hiệu, dữ liệu cá nhân được xóa/ẩn danh theo chính sách. Lịch sử gia phả liên quan người khác được giữ nguyên.

### HNT-P-052 — Yêu cầu tải xuống/sửa/xóa dữ liệu cá nhân (DSAR)
- **Mã yêu cầu liên quan:** HNT-FG-028 (§7.1: quy trình yêu cầu dữ liệu)
- **Điều kiện tiên quyết:** Tài khoản đang hoạt động.
- **Các bước:**
  1. Gửi yêu cầu tải xuống dữ liệu cá nhân.
  2. Gửi yêu cầu sửa một trường dữ liệu cá nhân.
- **Kết quả mong đợi:** Given yêu cầu hợp lệ; When gửi; Then hệ thống tiếp nhận, xử lý trong thời hạn cam kết và phản hồi kết quả cho người dùng.

### HNT-P-053 — Chia sẻ lời mời/liên kết qua ứng dụng khác
- **Mã yêu cầu liên quan:** HNT-FG-030 (§2.1)
- **Điều kiện tiên quyết:** Có liên kết mời dòng họ / liên kết sự kiện / bài viết.
- **Các bước:**
  1. Chọn "Chia sẻ", gửi liên kết qua ứng dụng nhắn tin khác.
  2. Người nhận mở liên kết (chưa cài app) → kiểm tra điều hướng.
- **Kết quả mong đợi:** Given liên kết hợp lệ; When chia sẻ; Then liên kết mở được, điều hướng đúng (mở app hoặc trang hướng dẫn cài đặt). Hệ thống không yêu cầu/đồng bộ dữ liệu từ ứng dụng khác.

---

## 4. Kiểm thử hiệu năng

Mục tiêu nghiệm thu theo đặc tả §5.3/§6.3 (đo trong môi trường kiểm thử thực tế, không mặc định đạt):

| Chỉ tiêu | Ngưỡng |
|---|---|
| Tải màn hình thông thường (mạng ổn định) | P95 ≤ 2,5 giây |
| Hiển thị tin nhắn văn bản tại người nhận (kết nối ổn định) | P95 ≤ 1 giây |

### HNT-P-054 — P95 tải màn hình thông thường ≤ 2,5s
- **Mã yêu cầu liên quan:** HNT-FG-022, HNT-FG-006, HNT-FG-024 (yêu cầu hiệu năng §5.3)
- **Điều kiện tiên quyết:** Môi trường staging, mạng ổn định giả lập 4G; dữ liệu: dòng họ 200 thành viên.
- **Các bước:**
  1. Đo thời gian tải (từ chạm đến nội dung đầy đủ) cho: Trang chủ, Cây gia phả, Danh bạ, Bảng tin — mỗi màn hình 100 lần.
  2. Tính P95.
- **Kết quả mong đợi:** Given mạng ổn định; When tải các màn hình thông thường; Then P95 mỗi màn hình ≤ 2,5 giây.

### HNT-P-055 — P95 hiển thị tin nhắn ≤ 1s
- **Mã yêu cầu liên quan:** HNT-FG-015 (yêu cầu hiệu năng §5.3)
- **Điều kiện tiên quyết:** 2 thiết bị kết nối ổn định, cùng phòng chat.
- **Các bước:**
  1. Gửi 200 tin nhắn văn bản, đo thời gian từ lúc gửi đến khi hiển thị tại người nhận.
  2. Tính P95.
- **Kết quả mong đợi:** Given kết nối ổn định; When gửi tin nhắn văn bản; Then P95 thời gian hiển thị tại người nhận ≤ 1 giây.

### HNT-P-056 — Danh bạ lớn: phân trang, không tải toàn bộ
- **Mã yêu cầu liên quan:** HNT-FG-024 (§5.3: phân trang)
- **Điều kiện tiên quyết:** Dòng họ có 5.000 thành viên (dữ liệu giả lập).
- **Các bước:**
  1. Mở danh bạ, cuộn qua các trang.
  2. Giám sát số bản ghi trả về mỗi request và bộ nhớ thiết bị.
- **Kết quả mong đợi:** Given 5.000 thành viên; When mở/cuộn danh bạ; Then mỗi request chỉ tải một trang (ví dụ 50 bản ghi), không tải toàn bộ; cuộn mượt, không treo app.

### HNT-P-057 — Cây gia phả lớn: tải theo nhánh/thế hệ
- **Mã yêu cầu liên quan:** HNT-FG-006 (§5.3: tải theo nhánh)
- **Điều kiện tiên quyết:** Gia phả có ≥ 1.000 nút, nhiều chi/nhánh.
- **Các bước:**
  1. Mở cây gia phả, quan sát số nút được dựng ban đầu.
  2. Mở rộng từng nhánh/thế hệ.
- **Kết quả mong đợi:** Given cây lớn; When mở; Then chỉ dựng các nút trong nhánh/thế hệ đang xem, tải thêm khi mở rộng; thời gian phản hồi tương đương cây nhỏ.

### HNT-P-058 — Throughput tin nhắn phòng chat chung
- **Mã yêu cầu liên quan:** HNT-FG-015
- **Điều kiện tiên quyết:** Phòng chat có 50 thành viên ảo gửi đồng thời.
- **Các bước:**
  1. Bơm 100 tin nhắn/giây trong 60 giây.
  2. Kiểm tra thứ tự, đầy đủ và độ trễ hiển thị.
- **Kết quả mong đợi:** Given tải cao; When bơm tin nhắn; Then không mất tin nhắn, thứ tự đúng theo thời gian server, không lỗi 5xx.

### HNT-P-059 — Mạng chập chờn: gửi lại, không mất, không trùng
- **Mã yêu cầu liên quan:** HNT-FG-015 (§5.3: lưu bền vững trước khi báo thành công; chống trùng) — (AT-09, QA-08)
- **Điều kiện tiên quyết:** Thiết bị A bật chế độ mạng chập chờn (ngắt/quay lại ngẫu nhiên).
- **Các bước:**
  1. A gửi 20 tin nhắn trong khi mạng chập chờn (kể cả gửi lại do timeout).
  2. Đếm tin nhắn thực tế lưu trên server và hiển thị tại B.
- **Kết quả mong đợi:** Given mạng gián đoạn; When gửi (kể cả retry); Then server lưu đúng 20 tin nhắn duy nhất (idempotency key), không mất, không nhân đôi; trạng thái gửi hiển thị đúng.

### HNT-P-060 — Nén ảnh/video, thumbnail, tải tệp lớn
- **Mã yêu cầu liên quan:** HNT-FG-015 (§5.3)
- **Điều kiện tiên quyết:** Trong phòng chat chung.
- **Các bước:**
  1. Gửi ảnh 10MB → kiểm tra dung lượng thực tế tải lên và thumbnail.
  2. Gửi tệp 50MB → kiểm tra tải lên/tải xuống thành công.
- **Kết quả mong đợi:** Given ảnh lớn; When gửi; Then ảnh được nén/tạo bản xem trước phù hợp trước khi tải lên. Tệp trong giới hạn cấu hình tải lên/tải xuống thành công.

---

## 5. Kiểm thử bảo mật & phân quyền

Nguyên tắc xuyên suốt (§4, §5.2, §7.1 đặc tả): phân quyền kiểm tra tại backend/database; không dựa vào việc ẩn nút trên giao diện.

### HNT-P-061 — Bypass giao diện: gọi API trực tiếp không có quyền
- **Mã yêu cầu liên quan:** HNT-FG-014, HNT-FG-016, HNT-FG-019 (AT-04, QA-04)
- **Điều kiện tiên quyết:** Token của thành viên thường (không phải admin, không có quyền sửa gia phả).
- **Các bước:**
  1. Gọi trực tiếp API: sửa hồ sơ gia phả, duyệt thành viên dòng họ, ghim tin nhắn (khi không có quyền).
  2. Ghi lại mã phản hồi và kiểm tra dữ liệu.
- **Kết quả mong đợi:** Given thiếu quyền; When gọi API trực tiếp; Then server trả 403 (không phải 200), dữ liệu không thay đổi. Mọi kiểm tra quyền nằm ở backend.

### HNT-P-062 — Chống đoán ID (ID enumeration)
- **Mã yêu cầu liên quan:** HNT-FG-008, HNT-FG-029 (§7.1: không cho phép đoán ID) — (AT-08, QA-07)
- **Điều kiện tiên quyết:** Biết ID hồ sơ của người thuộc dòng họ khác.
- **Các bước:**
  1. Dò các ID liên tiếp/UUID lân cận qua API hồ sơ.
  2. Thử truy cập hồ sơ riêng tư của dòng họ mình không tham gia.
- **Kết quả mong đợi:** Given không có quyền xem; When đoán ID; Then mọi truy cập trái phép bị từ chối; phản hồi không tiết lộ sự tồn tại của bản ghi (không phân biệt "không tồn tại" vs "không có quyền" qua nội dung lỗi chi tiết).

### HNT-P-063 — Tệp đính kèm: kiểm tra quyền, không dùng link công khai vĩnh viễn
- **Mã yêu cầu liên quan:** HNT-FG-015 (§7.1: tệp đính kèm kiểm tra quyền) — (AT-08, QA-07)
- **Điều kiện tiên quyết:** Có tệp đính kèm trong cuộc trò chuyện riêng/nhóm kín.
- **Các bước:**
  1. Lấy URL tệp, thử truy cập bằng tài khoản không thuộc cuộc trò chuyện.
  2. Thử truy cập URL đã hết hạn ký số.
  3. Thử truy cập ẩn danh (không token).
- **Kết quả mong đợi:** Given không có quyền; When truy cập URL tệp; Then bị từ chối (403). URL có thời hạn ký số; hết hạn thì không truy cập được; không tồn tại liên kết công khai vĩnh viễn cho tài liệu riêng tư.

### HNT-P-064 — Quản trị viên không đọc được tin nhắn riêng
- **Mã yêu cầu liên quan:** HNT-FG-017 (§4, §7.1: admin không mặc nhiên đọc chat riêng) — (QA-07)
- **Điều kiện tiên quyết:** Là quản trị viên dòng họ (kể cả web quản trị).
- **Các bước:**
  1. Trên web quản trị, tìm chức năng xem nội dung chat riêng của thành viên.
  2. Gọi API đọc tin nhắn của cuộc trò chuyện riêng mình không tham gia.
- **Kết quả mong đợi:** Given là admin nhưng không tham gia cuộc trò chuyện; When cố đọc; Then không có giao diện/API nào cho phép đọc nội dung chat riêng; API trả 403.

### HNT-P-065 — Rate limit OTP, đăng nhập, gửi lời mời, tải tệp
- **Mã yêu cầu liên quan:** HNT-FG-001, HNT-FG-002, HNT-FG-017 (§7.1: giới hạn gửi) 
- **Điều kiện tiên quyết:** Môi trường staging.
- **Các bước:**
  1. Bơm yêu cầu OTP/đăng nhập sai vượt ngưỡng → kiểm tra khóa tạm + 429.
  2. Gửi lời mời kết bạn hàng loạt vượt giới hạn → kiểm tra chặn.
  3. Tải tệp vượt giới hạn tần suất/dung lượng → kiểm tra từ chối.
- **Kết quả mong đợi:** Given vượt giới hạn cấu hình; When tiếp tục gửi; Then hệ thống chặn (429/khóa tạm), ghi log chống spam/abuse.

### HNT-P-066 — Cô lập vai trò theo dòng họ
- **Mã yêu cầu liên quan:** HNT-FG-005 (§4)
- **Điều kiện tiên quyết:** Tài khoản là admin dòng họ A, member dòng họ B.
- **Các bước:**
  1. Dùng token của tài khoản, gọi API quản trị của dòng họ B (duyệt member, đổi cấu hình).
  2. Thử đọc dữ liệu nội bộ chỉ-dành-cho-admin của dòng họ B.
- **Kết quả mong đợi:** Given quyền admin chỉ ở A; When thao tác quản trị ở B; Then bị từ chối 403. Không có leo thang đặc quyền chéo dòng họ.

### HNT-P-067 — Tham gia chat không suy ra quyền gia phả
- **Mã yêu cầu liên quan:** HNT-FG-014 (§4: không tự động cấp quyền sửa gia phả cho người chỉ tham gia chat)
- **Điều kiện tiên quyết:** Tài khoản chỉ tham gia phòng chat chung, không có quyền gia phả.
- **Các bước:**
  1. Gọi API thêm/sửa hồ sơ gia phả và đề xuất quan hệ.
- **Kết quả mong đợi:** Given chỉ có quyền chat; When gọi API gia phả; Then bị từ chối; chỉ được đề xuất theo quyền được cấp (nếu có).

### HNT-P-068 — Trường nhạy cảm mặc định riêng tư
- **Mã yêu cầu liên quan:** HNT-FG-008, HNT-FG-029 (§3.3C: nhóm máu/SĐT/email mặc định riêng tư)
- **Điều kiện tiên quyết:** Hồ sơ mới tạo, chưa chỉnh quyền riêng tư.
- **Các bước:**
  1. Kiểm tra giá trị mặc định của: nhóm máu, SĐT, email.
  2. Thành viên cùng dòng họ (không được cấp quyền) gọi API đọc hồ sơ.
- **Kết quả mong đợi:** Given hồ sơ mới; When chưa cấp quyền; Then nhóm máu/SĐT/email mặc định riêng tư, không trả về qua API cho người không được phép.

### HNT-P-069 — HTTPS/TLS bắt buộc
- **Mã yêu cầu liên quan:** HNT-FG-015 (yêu cầu §7.1)
- **Điều kiện tiên quyết:** Môi trường staging/prod.
- **Các bước:**
  1. Thử gọi API qua HTTP thuần.
  2. Kiểm tra chứng chỉ TLS, HSTS.
- **Kết quả mong đợi:** Given kết nối HTTP; When gọi; Then bị chuyển hướng/từ chối sang HTTPS. Chứng chỉ hợp lệ, HSTS được bật.

### HNT-P-070 — Xóa dữ liệu quan trọng cần xác nhận và cho phép khôi phục
- **Mã yêu cầu liên quan:** HNT-FG-012, HNT-FG-026 (§4: xóa cần xác nhận, lưu lịch sử, cho phép khôi phục)
- **Điều kiện tiên quyết:** Là người quản lý gia phả.
- **Các bước:**
  1. Thử xóa hồ sơ/quan hệ quan trọng → kiểm tra hộp xác nhận.
  2. Sau khi xóa, thử khôi phục theo chính sách.
- **Kết quả mong đợi:** Given thao tác xóa quan trọng; When thực hiện; Then hệ thống yêu cầu xác nhận rõ ràng; dữ liệu xóa được lưu vết và khôi phục được trong thời hạn chính sách; hành động ghi nhật ký.

### HNT-P-071 — Phiên và token: hết hạn, thu hồi
- **Mã yêu cầu liên quan:** HNT-FG-002, HNT-FG-003
- **Điều kiện tiên quyết:** Đang có phiên hoạt động.
- **Các bước:**
  1. Đổi mật khẩu → thử dùng token cũ.
  2. Kích hoạt "đăng xuất tất cả thiết bị" sau khi báo mất thiết bị.
- **Kết quả mong đợi:** Given đổi mật khẩu/thu hồi; When dùng token cũ; Then token vô hiệu (401), mọi phiên khác bị buộc đăng xuất.

### HNT-P-072 — Tìm kiếm không rò rỉ dữ liệu riêng tư
- **Mã yêu cầu liên quan:** HNT-FG-009, HNT-FG-024 (§7.1) — (AT-08)
- **Điều kiện tiên quyết:** Có hồ sơ/tin nhắn/bài viết riêng tư trong hệ thống.
- **Các bước:**
  1. Tìm kiếm full-text với từ khóa khớp nội dung riêng tư, bằng tài khoản không có quyền.
  2. Kiểm tra gợi ý tìm kiếm (autocomplete).
- **Kết quả mong đợi:** Given không có quyền; When tìm kiếm; Then kết quả không chứa bất kỳ mẩu nội dung riêng tư nào (kể cả trong snippet/gợi ý).

### HNT-P-078 — Đăng ký và đăng nhập bằng passkey (FIDO2/WebAuthn)
- **Mã yêu cầu liên quan:** HNT-S-006 trong Ma trận bảo mật (yêu cầu bổ sung)
- **Điều kiện tiên quyết:** Thiết bị hỗ trợ passkey; tài khoản đã đăng nhập.
- **Các bước:**
  1. Trong Cài đặt → Bảo mật, chọn "Thêm passkey", hoàn tất xác thực sinh trắc/PIN của thiết bị.
  2. Đăng xuất, đăng nhập lại bằng passkey thay vì OTP/mật khẩu.
  3. Thử dùng passkey trên thiết bị khác chưa đăng ký.
- **Kết quả mong đợi:** Given passkey đã đăng ký; When đăng nhập bằng passkey trên thiết bị đã đăng ký; Then đăng nhập thành công không cần OTP/mật khẩu; và passkey không dùng được trên thiết bị lạ (phải qua luồng xác minh thiết bị mới).

---

## 6. Kiểm thử khả năng sử dụng (người lớn tuổi)

Căn cứ đặc tả §2.3: khả năng sử dụng của người lớn tuổi là yêu cầu bắt buộc. Tiêu chí nghiệm thu: người dùng thuộc nhóm tuổi mục tiêu hoàn thành được các tác vụ chính trong thử nghiệm sử dụng thực tế mà không cần người khác hướng dẫn liên tục. Mục tiêu thời gian và tỷ lệ thành công được xác định sau vòng thử nghiệm với người dùng thực tế (ghi nhận số liệu, không tự đặt ngưỡng trước).

Đối tượng: 8–12 người dùng từ 60 tuổi trở lên, chưa từng dùng app. Thiết bị: điện thoại Android/iOS phổ thông, cỡ màn hình mục tiêu 5,5"–6,8". Mỗi kịch bản thực hiện độc lập, quan sát viên không gợi ý trừ khi người dùng yêu cầu và bí quá 3 phút (ghi nhận là "cần hỗ trợ").

### HNT-P-073 — Đăng ký qua mã QR lời mời
- **Mã yêu cầu liên quan:** HNT-FG-001, HNT-FG-004 (§2.3: lời mời mở trực tiếp bằng QR)
- **Điều kiện tiên quyết:** Người dùng có QR mời từ người thân; chưa có tài khoản.
- **Các bước:**
  1. Quét mã QR bằng camera điện thoại.
  2. Làm theo hướng dẫn trên màn hình để đăng ký (SĐT + OTP) và vào đúng dòng họ.
- **Kết quả mong đợi:** Given QR hợp lệ; When người dùng làm theo hướng dẫn; Then hoàn thành đăng ký và vào được dòng họ mà không cần người khác thao tác hộ quá 1 lần. Ghi nhận: thời gian hoàn thành, số lần cần hỗ trợ.

### HNT-P-074 — Xem cây gia phả và mở hồ sơ
- **Mã yêu cầu liên quan:** HNT-FG-006, HNT-FG-008 (§2.3: luồng phổ biến ít bước)
- **Điều kiện tiên quyết:** Đã đăng nhập, đã tham gia dòng họ có cây gia phả.
- **Các bước:**
  1. Từ tab Gia phả, tìm tên mình/người thân trong cây.
  2. Phóng to và chạm vào nút thành viên để mở hồ sơ.
- **Kết quả mong đợi:** Given trong tab Gia phả; When thực hiện; Then tìm và mở được hồ sơ trong ≤ 5 thao tác chạm, chữ đủ lớn để đọc, nút bấm dễ chạm. Ghi nhận số bước và lỗi chạm nhầm.

### HNT-P-075 — Xem ngày giỗ sắp tới
- **Mã yêu cầu liên quan:** HNT-FG-021, HNT-FG-022 (§2.3: xem lịch giỗ)
- **Điều kiện tiên quyết:** Đã đăng nhập; có ngày giỗ trong 30 ngày tới.
- **Các bước:**
  1. Mở tab Trang chủ, tìm mục ngày giỗ sắp tới.
  2. Chạm vào để xem chi tiết (ngày âm/dương, địa điểm).
- **Kết quả mong đợi:** Given có ngày giỗ sắp tới; When mở trang chủ; Then thấy ngay mục ngày giỗ, đọc được ngày âm và ngày dương, hiểu được thông tin mà không cần giải thích thuật ngữ.

### HNT-P-076 — Gửi ảnh trong phòng chat
- **Mã yêu cầu liên quan:** HNT-FG-015 (§2.3: gửi ảnh)
- **Điều kiện tiên quyết:** Đã ở trong phòng chat chung của dòng họ.
- **Các bước:**
  1. Chạm nút đính kèm, chọn 1 ảnh từ thư viện.
  2. Gửi và xác nhận ảnh đã gửi thành công (trạng thái rõ ràng).
- **Kết quả mong đợi:** Given trong phòng chat; When gửi ảnh; Then ảnh được gửi trong ≤ 4 thao tác, trạng thái thành công/thất bại hiển thị rõ ràng bằng tiếng Việt dễ hiểu.

### HNT-P-077 — Tăng cỡ chữ, độ tương phản, nhãn nút
- **Mã yêu cầu liên quan:** HNT-FG-029 (§2.3: yêu cầu UI/UX)
- **Điều kiện tiên quyết:** Đã đăng nhập.
- **Các bước:**
  1. Vào Cài đặt, tăng cỡ chữ lên mức lớn nhất.
  2. Duyệt các màn hình chính: kiểm tra chữ có bị cắt/tràn, nút có đủ lớn và có nhãn chữ (không chỉ biểu tượng), màu sắc không phải tín hiệu duy nhất.
- **Kết quả mong đợi:** Given cỡ chữ lớn nhất; When duyệt app; Then không có chữ bị cắt/tràn màn hình; nút bấm đủ lớn, có nhãn rõ ràng; thông tin quan trọng không chỉ truyền đạt bằng màu sắc.

**Tiêu chí đạt chung cho §6:** ≥ 80% người tham gia hoàn thành mỗi kịch bản P-073..P-076 mà không cần hỗ trợ liên tục; mọi điểm "cần hỗ trợ" được ghi nhận và chuyển thành yêu cầu cải tiến UI/UX trước phát hành. (Ngưỡng chính thức chốt sau vòng thử nghiệm đầu tiên theo đặc tả §2.3.)

---

## 7. Ma trận truy vết (Traceability Matrix)

### 7.1. QA-01..QA-12 → test case

| Mã QA | Điều kiện bắt buộc (đặc tả v1.1 §7) | Test case bao phủ |
|---|---|---|
| QA-01 | Tạo và xem được gia phả nhiều thế hệ | HNT-P-005, HNT-P-009, HNT-P-010, HNT-P-043 |
| QA-02 | Liên kết tài khoản với hồ sơ gia phả không tạo bản ghi trùng | HNT-P-015, HNT-P-016 |
| QA-03 | Thay đổi gia phả quan trọng có xác minh và nhật ký | HNT-P-012, HNT-P-013, HNT-P-014, HNT-P-017, HNT-P-049 |
| QA-04 | Quyền xem/sửa được kiểm tra tại backend | HNT-P-019, HNT-P-061, HNT-P-066, HNT-P-067 |
| QA-05 | Chat chung, chat riêng và nhóm gia đình hoạt động độc lập | HNT-P-023, HNT-P-031, HNT-P-037, HNT-P-038 |
| QA-06 | Chặn, từ chối và báo cáo người lạ hoạt động đúng | HNT-P-032, HNT-P-033, HNT-P-034, HNT-P-035 |
| QA-07 | Dữ liệu riêng tư không bị lộ qua API hoặc tệp đính kèm | HNT-P-011, HNT-P-062, HNT-P-063, HNT-P-064, HNT-P-068, HNT-P-072 |
| QA-08 | Tin nhắn không mất hoặc bị nhân đôi trong các tình huống mạng gián đoạn đã kiểm thử | HNT-P-055, HNT-P-058, HNT-P-059 |
| QA-09 | Có quy trình xóa tài khoản và xử lý dữ liệu cá nhân | HNT-P-051, HNT-P-052 |
| QA-10 | Có sao lưu, khôi phục và xử lý sự cố | HNT-P-050 |
| QA-11 | Người lớn tuổi có thể hoàn thành các tác vụ chính trong thử nghiệm sử dụng | HNT-P-073, HNT-P-074, HNT-P-075, HNT-P-076, HNT-P-077 |
| QA-12 | Có chính sách quyền riêng tư, điều khoản sử dụng và hướng dẫn người dùng | Kiểm tra tài liệu: chính sách quyền riêng tư, điều khoản sử dụng, hướng dẫn sử dụng tồn tại và đầy đủ (kết hợp HNT-P-051, HNT-P-052 về quy trình xử lý dữ liệu) |

### 7.2. AT-01..AT-15 → test case

| Mã AT | Tiêu chí đạt (đặc tả v1.0 §9) | Test case bao phủ |
|---|---|---|
| AT-01 | Người dùng tạo được dòng họ và mời thành viên | HNT-P-005, HNT-P-006, HNT-P-007 |
| AT-02 | Có thể xây dựng, cập nhật và xem gia phả nhiều thế hệ | HNT-P-009, HNT-P-010, HNT-P-012 |
| AT-03 | Không tạo trùng hồ sơ khi liên kết tài khoản với người trong gia phả | HNT-P-015, HNT-P-016 |
| AT-04 | Quyền xem/sửa gia phả được kiểm soát ở backend | HNT-P-019, HNT-P-061 |
| AT-05 | Thành viên nhắn tin được trong phòng chat chung | HNT-P-023, HNT-P-024, HNT-P-025, HNT-P-026 |
| AT-06 | Chat riêng và nhóm Gia đình tôi hoạt động độc lập | HNT-P-031, HNT-P-037, HNT-P-038 |
| AT-07 | Người dùng có thể chặn, từ chối và báo cáo người lạ | HNT-P-032, HNT-P-035 |
| AT-08 | Dữ liệu riêng tư không bị lộ qua API, tìm kiếm hoặc tệp đính kèm | HNT-P-062, HNT-P-063, HNT-P-072 |
| AT-09 | Tin nhắn không mất hoặc bị nhân đôi khi mạng gián đoạn | HNT-P-059 |
| AT-10 | Có thể thu hồi hoặc khôi phục quyền truy cập theo chính sách | HNT-P-006 (thu hồi link mời), HNT-P-013 (từ chối đề xuất), HNT-P-017 (khôi phục), HNT-P-071 (thu hồi phiên) |
| AT-11 | Có nhật ký các thao tác quản trị và thay đổi gia phả quan trọng | HNT-P-012, HNT-P-014, HNT-P-017, HNT-P-049 |
| AT-12 | Có quy trình sao lưu, khôi phục và xử lý sự cố | HNT-P-050 |
| AT-13 | Ứng dụng hoạt động tốt trên các kích thước màn hình mục tiêu | HNT-P-073..HNT-P-077 thực hiện trên các cỡ màn hình mục tiêu 5,5"–6,8" (Android/iOS); ghi nhận lỗi hiển thị |
| AT-14 | Có cơ chế xóa tài khoản, xử lý dữ liệu cá nhân và chính sách quyền riêng tư | HNT-P-051, HNT-P-052 |
| AT-15 | Các kịch bản kiểm thử bảo mật và phân quyền đều đạt | Toàn bộ HNT-P-061..HNT-P-072 và HNT-P-078 (§5) đạt 100% |

---

## 8. Môi trường kiểm thử, tiêu chí vào/ra, phân loại lỗi

### 8.1. Môi trường kiểm thử

| Môi trường | Mục đích | Ghi chú |
|---|---|---|
| Dev | Kiểm thử unit, API trong quá trình phát triển | Dữ liệu giả lập |
| Staging | Kiểm thử chức năng, hiệu năng, bảo mật đầy đủ | Cấu hình giống production: PostgreSQL, Object Storage (URL ký số), WebSocket realtime, FCM/APNs sandbox |
| Thiết bị | Android (3 mẫu phổ thông, OS 2 phiên bản gần nhất), iOS (2 mẫu, 2 phiên bản gần nhất) | Bao gồm thiết bị cấu hình thấp cho kiểm thử hiệu năng |
| Mạng | Ổn định (WiFi/4G), chập chờn (giả lập ngắt ngẫu nhiên), offline | Dùng công cụ giả lập mạng cho HNT-P-059 |

Dữ liệu kiểm thử: gia phả giả lập (không dùng thông tin người thật); tài khoản kiểm thử phân theo vai trò × dòng họ.

### 8.2. Tiêu chí vào (Entry criteria)

- Build ổn định, cài đặt được trên thiết bị mục tiêu; smoke test (mục 2.2) đạt 100%.
- Đặc tả v1.1 đã chốt cho phạm vi kiểm thử; không thay đổi yêu cầu giữa đợt kiểm thử hồi quy.
- Dữ liệu kiểm thử và tài khoản các vai trò đã chuẩn bị xong.
- Môi trường staging sẵn sàng (backend, database, storage, push).

### 8.3. Tiêu chí ra (Exit criteria — điều kiện phát hành)

- 100% test case truy vết QA-01..QA-12 và AT-01..AT-15 đạt.
- ≥ 98% test case chức năng (§3) đạt; các case còn lại không thuộc Critical/High và có kế hoạch xử lý.
- Không còn lỗi Critical/High nào chưa sửa (xác minh lại sau khi sửa).
- Chỉ tiêu hiệu năng §4 đạt trên môi trường staging (P95 ≤ 2,5s tải màn hình; P95 ≤ 1s tin nhắn).
- Kiểm thử bảo mật §5 đạt 100% (AT-15).
- Vòng kiểm thử khả năng sử dụng §6 hoàn tất, các điểm "cần hỗ trợ" đã có phương án cải tiến hoặc được chấp nhận bằng văn bản.
- Nhật ký kiểm toán, sao lưu/khôi phục, quy trình xử lý dữ liệu cá nhân đã được kiểm chứng (QA-09, QA-10, QA-12).

### 8.4. Phân loại mức độ lỗi (Severity)

| Mức độ | Định nghĩa | Ví dụ |
|---|---|---|
| Critical | Mất mát/rò rỉ dữ liệu; sập hệ thống; bỏ qua phân quyền | Rò rỉ tin nhắn riêng cho admin; mất tin nhắn khi mạng chập chờn; bypass quyền sửa gia phả qua API |
| High | Chức năng chính không hoạt động; không có cách vòng qua | Không tạo được dòng họ; OTP không gửi được; cây gia phả không tải được |
| Medium | Chức năng phụ lỗi; có cách vòng qua | Reaction không tổng hợp đúng; lọc danh bạ thiếu 1 tiêu chí; thumbnail ảnh không hiển thị |
| Low | Lỗi giao diện/chính tả, không ảnh hưởng nghiệp vụ | Chữ bị cắt ở cỡ chữ lớn (ngoài ngưỡng chấp nhận), sai chính tả nhãn nút |

Ưu tiên sửa: Critical > High > Medium > Low. Lỗi Critical/High chặn phát hành cho đến khi được sửa và kiểm thử lại đạt.

---

## 9. Phụ lục: đối chiếu mã đặc tả gốc

| Mã đặc tả gốc | Nội dung | Test case |
|---|---|---|
| GP-01..GP-12 | Chức năng gia phả | HNT-P-009..HNT-P-020 |
| CHAT-01, 02, 03, 05, 07, 09, 13, 15 | Tính năng chat thuộc MVP (văn bản, emoji, ảnh, tệp, reply, reaction, ghim, trạng thái) | HNT-P-023..HNT-P-026, HNT-P-028 |
| CHAT-08, 10, 11, 12, 14, 16 | Chuyển tiếp, sửa, thu hồi, xóa, tìm kiếm, trích dẫn (đặc tả chốt §3.4) | HNT-P-027, HNT-P-028 |
| CHAT-04, CHAT-06 | Video, tin nhắn thoại — giai đoạn 2, ngoài phạm vi | Không kiểm thử |

---

*Hết Test Plan v1.0 — HO-NHA-TÔI.*

# Ma trận phân quyền, bảo mật và chính sách xử lý dữ liệu — HỌ NHÀ TÔI

> **Tài liệu:** 04 — Bảo mật & phân quyền · **Phiên bản:** 1.0 · **Ngày:** 2026-10-22
> **Nguồn truy vết:** Đặc tả "HỌ NHÀ TÔI" v1.0 (mục 4, 5, 7) và bản chốt v1.1 (mục 4, 5).
> Tài liệu này cụ thể hóa các quy tắc phân quyền, yêu cầu bảo mật (mã `HNT-S-xxx`) và chính sách xử lý dữ liệu.
> Mọi yêu cầu đều có tiêu chí nghiệm thu dạng Given–When–Then.

---

## 1. Vai trò và phạm vi

Hệ thống có 7 vai trò (theo đặc tả mục 4):

| # | Vai trò | Phạm vi quyền chính |
|---|---------|---------------------|
| R1 | Khách (chưa đăng nhập) | Chỉ xem nội dung được công khai |
| R2 | Thành viên ứng dụng | Quản lý hồ sơ của mình, nhắn tin, tham gia nhóm được phép |
| R3 | Thành viên dòng họ | Xem nội dung dòng họ theo quyền, đề xuất dữ liệu gia phả |
| R4 | Người quản lý gia phả | Thêm, sửa quan hệ và hồ sơ trong phạm vi được giao |
| R5 | Quản trị viên dòng họ | Duyệt thành viên, quản lý nội quy, thông báo và quyền nhóm |
| R6 | Quản trị viên cấp cao | Quản lý quyền quản trị, xử lý tranh chấp, cấp quyền đặc biệt |
| R7 | Quản trị hệ thống | Vận hành nền tảng, hỗ trợ kỹ thuật, xử lý sự cố theo quyền kiểm soát |

### Quy tắc phạm vi bắt buộc

1. **Phân quyền theo từng dòng họ.** Một người có thể là Quản trị viên của dòng họ A nhưng chỉ là Thành viên ở dòng họ B. Mọi kiểm tra quyền phải gắn với `lineage_id` cụ thể; không có khái niệm "admin toàn cục" đối với dữ liệu dòng họ.
2. **Tách biệt ba thực thể:** tài khoản đăng nhập (`users`) ≠ hồ sơ gia phả (`family_persons`) ≠ tư cách thành viên cộng đồng (`lineage_memberships`). Quan hệ huyết thống không đồng nghĩa với quyền truy cập hồ sơ; tham gia nhóm chat không đồng nghĩa với quyền sửa gia phả.
3. **Phân quyền phải được kiểm tra tại backend/database.** Ẩn nút trên giao diện không được coi là biện pháp bảo vệ dữ liệu.
4. **Thao tác nhạy cảm** (xóa dữ liệu quan trọng, cấp/thu hồi quyền quản trị, xử lý tranh chấp) phải có xác nhận, ghi nhật ký kiểm toán, và cho phép khôi phục khi chính sách cho phép.

---

## 2. Ma trận phân quyền

**Chú giải:** ✓ = Được phép · ✗ = Không được phép · ◐ = Theo phạm vi / điều kiện (xem ghi chú)

### 2.1. Gia phả

| Chức năng | R1 Khách | R2 TV ứng dụng | R3 TV dòng họ | R4 QL gia phả | R5 QTV dòng họ | R6 QTV cấp cao | R7 QTV hệ thống |
|---|---|---|---|---|---|---|---|
| Xem cây gia phả & hồ sơ | ◐ (1) | ◐ (1) | ✓ (2) | ✓ (2) | ✓ (2) | ✓ (2) | ◐ (8) |
| Đề xuất thêm/sửa hồ sơ, quan hệ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ◐ (8) |
| Duyệt & xác minh thay đổi gia phả | ✗ | ✗ | ✗ | ✓ (3) | ✓ (3) | ✓ | ◐ (8) |
| Sửa trực tiếp hồ sơ/quan hệ | ✗ | ✗ | ✗ | ✓ (3) | ◐ (4) | ✓ | ◐ (8) |
| Tạo dòng họ / gia phả mới | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Xuất dữ liệu gia phả (PDF/ảnh/báo cáo) | ✗ | ✗ | ◐ (5) | ◐ (5) | ✓ (5) | ✓ (5) | ◐ (8) |

Ghi chú: (1) Chỉ nội dung được công khai hoặc được chia sẻ. (2) Trong phạm vi quyền xem được cấp cho từng hồ sơ/trường dữ liệu (xem mục 4.2). (3) Trong phạm vi dòng họ/nhánh được giao. (4) Khi được phân công quản lý gia phả. (5) Theo quyền xuất dữ liệu được cấp khi tạo gia phả. (8) Chỉ khi thực hiện hỗ trợ kỹ thuật/xử lý sự cố theo yêu cầu, có ghi nhật ký.

### 2.2. Thành viên và quản trị dòng họ

| Chức năng | R1 Khách | R2 TV ứng dụng | R3 TV dòng họ | R4 QL gia phả | R5 QTV dòng họ | R6 QTV cấp cao | R7 QTV hệ thống |
|---|---|---|---|---|---|---|---|
| Gửi yêu cầu tham gia dòng họ | ✗ | ✓ | ✓ (6) | ✓ (6) | ✓ (6) | ✓ (6) | ✗ |
| Duyệt / từ chối yêu cầu tham gia | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ◐ (8) |
| Xóa / chặn thành viên vi phạm | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ◐ (8) |
| Quản lý nội quy, thông báo dòng họ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ |
| Cấp / thu hồi vai trò trong dòng họ | ✗ | ✗ | ✗ | ✗ | ◐ (7) | ✓ | ◐ (8) |
| Xử lý tranh chấp dữ liệu gia phả | ✗ | ✗ | ✗ | ◐ (3) | ◐ | ✓ | ◐ (8) |

Ghi chú: (6) Tham gia dòng họ khác khi được mời/chấp thuận. (7) Được cấp vai trò trong dòng họ mình quản trị, trừ vai trò Quản trị viên cấp cao.

### 2.3. Giao tiếp (chat, nhóm, bảng tin)

| Chức năng | R1 Khách | R2 TV ứng dụng | R3 TV dòng họ | R4 QL gia phả | R5 QTV dòng họ | R6 QTV cấp cao | R7 QTV hệ thống |
|---|---|---|---|---|---|---|---|
| Quản trị phòng chat chung (ghim, xóa tin vi phạm, cấu hình quyền gửi) | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ |
| Quản trị nhóm "Gia đình tôi" | ✗ | ◐ (9) | ◐ (9) | ◐ (9) | ◐ (9) | ◐ (9) | ✗ |
| **Đọc tin nhắn riêng của thành viên khác** | **✗** | **✗** | **✗** | **✗** | **✗** | **✗** | **✗ (10)** |
| Quản lý bảng tin (xóa bài vi phạm, ghim) | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ |
| Tạo sự kiện, gửi lời mời, xác nhận tham dự | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ |

Ghi chú: (9) Đối với nhóm do mình tạo hoặc được phân quyền quản trị. (10) **Tuyệt đối không** qua giao diện quản trị; mọi truy cập ngoại lệ (nếu pháp luật yêu cầu) phải có phê duyệt cấp cao và ghi nhật ký đầy đủ (xem HNT-S-013).

### 2.4. Vận hành hệ thống

| Chức năng | R1 Khách | R2 TV ứng dụng | R3 TV dòng họ | R4 QL gia phả | R5 QTV dòng họ | R6 QTV cấp cao | R7 QTV hệ thống |
|---|---|---|---|---|---|---|---|
| Xem nhật ký kiểm toán | ✗ | ✗ | ✗ | ✗ | ◐ (11) | ✓ | ✓ |
| Sao lưu / khôi phục hệ thống | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Tiếp nhận & xử lý yêu cầu dữ liệu cá nhân | ✗ | ✗ | ✗ | ✗ | ◐ (12) | ✓ | ✓ |
| Hỗ trợ kỹ thuật & khôi phục tài khoản | ✗ | ✗ | ✗ | ✗ | ✗ | ◐ | ✓ |

Ghi chú: (11) Nhật ký trong phạm vi dòng họ mình quản trị. (12) Tiếp nhận và phối hợp trong phạm vi dòng họ.

### 2.5. Các quy tắc phân tách nghiêm ngặt

1. **Tham gia phòng chat ≠ quyền sửa gia phả.** Không tự động cấp quyền sửa gia phả cho người chỉ tham gia phòng chat (đặc tả v1.0 mục 4).
2. **Thành viên nhóm "Gia đình tôi" ≠ quyền xem hồ sơ riêng tư toàn dòng họ.** Con rể, con dâu hoặc người được mời có thể ở trong nhóm gia đình, nhưng quyền xem/sửa gia phả và hồ sơ riêng tư phải được cấp riêng (đặc tả v1.0 mục 3.5C; v1.1 mục 3.6).
3. **Quản trị viên KHÔNG BAO GIỜ đọc tin nhắn riêng của thành viên** qua giao diện quản trị — áp dụng cho mọi cấp, kể cả Quản trị hệ thống (đặc tả v1.0 mục 7.1).
4. **Xóa cuộc trò chuyện ≠ thu hồi tin nhắn ≠ chặn người dùng.** Ba hành động khác nhau, không dùng chung cơ chế; xóa phía mình không xóa dữ liệu phía bên kia (đặc tả v1.0 mục 3.4C).
5. **Số điện thoại xác minh chỉ chứng minh quyền kiểm soát số đó**, không chứng minh quan hệ huyết thống (đặc tả v1.0 mục 5.2).

---

## 3. Yêu cầu bảo mật (mã HNT-S)

### 3.1. Xác thực và quản lý tài khoản

**HNT-S-001 — Thực thi phân quyền tại backend/database cho mọi API**
Truy vết: đặc tả v1.0 mục 4, 6.1; v1.1 mục 4, 5.1; AT-04/QA-04.

- **Given** một API truy xuất tài nguyên thuộc dòng họ X,
- **When** người dùng chỉ có vai trò ở dòng họ Y (không phải X), hoặc không có vai trò phù hợp, gọi API đó,
- **Then** hệ thống từ chối với mã 403, không trả về bất kỳ dữ liệu nào của tài nguyên, và ghi nhận sự kiện vào nhật ký bảo mật.
- Tiêu chí bổ sung: kiểm thử chứng minh việc ẩn nút/chức năng trên giao diện không ngăn được truy cập trái phép khi gọi API trực tiếp.

**HNT-S-002 — Xác thực OTP qua số điện thoại**
Truy vết: đặc tả v1.0 mục 5.1; v1.1 mục 3.9.

- **Given** người dùng yêu cầu mã OTP đăng nhập hoặc khôi phục,
- **When** mã OTP được gửi,
- **Then** OTP có thời hạn ngắn (đề xuất ≤ 5 phút), giới hạn số lần nhập sai (đề xuất ≤ 5 lần), giới hạn tần suất gửi lại, và tài khoản/SĐT bị khóa tạm thời sau khi vượt ngưỡng.
- Tiêu chí bổ sung: OTP cũ bị vô hiệu ngay khi OTP mới được gửi; không cho phép dùng lại OTP đã hết hạn.

**HNT-S-003 — Chính sách mật khẩu (đăng nhập bằng email)**
Truy vết: đặc tả v1.0 mục 5.1.

- **Given** người dùng đặt hoặc đổi mật khẩu,
- **When** mật khẩu được gửi lên hệ thống,
- **Then** hệ thống yêu cầu độ mạnh tối thiểu (độ dài, kết hợp ký tự), lưu trữ dưới dạng hash bằng thuật toán chuyên dụng (bcrypt/argon2/PBKDF2) kèm salt, không bao giờ lưu plain text, và khóa tạm thời sau nhiều lần đăng nhập sai liên tiếp.

**HNT-S-004 — Quản lý phiên đăng nhập và thiết bị**
Truy vết: đặc tả v1.0 mục 5.1; v1.1 mục 3.5, 3.9.

- **Given** người dùng đã đăng nhập trên một hoặc nhiều thiết bị,
- **When** người dùng mở mục quản lý thiết bị/phiên,
- **Then** hệ thống hiển thị danh sách phiên đang hoạt động (thiết bị, thời gian, vị trí ước tính), cho phép đăng xuất từng phiên hoặc tất cả phiên từ xa; token phiên có thời hạn và cơ chế làm mới an toàn; mọi phiên bị thu hồi ngay khi đổi mật khẩu hoặc khôi phục tài khoản.

**HNT-S-005 — Khôi phục tài khoản khi đổi số điện thoại hoặc mất thiết bị**
Truy vết: đặc tả v1.0 mục 5.2; v1.1 mục 2.3, 3.9.

- **Given** người dùng mất quyền truy cập SĐT/thiết bị cũ và yêu cầu khôi phục,
- **When** quy trình khôi phục được thực hiện,
- **Then** hệ thống yêu cầu xác minh danh tính nhiều bước (không chỉ dựa vào một yếu tố), vô hiệu hóa mọi phiên cũ sau khi khôi phục thành công, và ghi nhật ký sự kiện khôi phục.
- Tiêu chí bổ sung: người thân được phép **hỗ trợ** thiết lập tài khoản, nhưng hệ thống không chia sẻ mật khẩu/OTP và không cấp quyền truy cập ngầm cho người hỗ trợ.

**HNT-S-006 — Passkey / FIDO2-WebAuthn (tùy chọn, tăng cường bảo mật)**
Truy vết: yêu cầu bổ sung theo đề xuất (người dùng đã hỏi về "khóa truy cập"/FIDO); tương thích đặc tả v1.0 mục 5.1.

> Ghi chú: "khóa truy cập" (passkey) là tên gọi thân thiện với người dùng của chuẩn **FIDO2** (gồm WebAuthn và CTAP2) do FIDO Alliance ban hành. Đây là yêu cầu **tùy chọn**, ưu tiên triển khai từ Giai đoạn 2.

- **Given** người dùng chọn bật đăng nhập bằng khóa truy cập trong cài đặt bảo mật,
- **When** người dùng đăng ký passkey trên thiết bị của mình,
- **Then** hệ thống triển khai đúng chuẩn WebAuthn/FIDO2: khóa riêng không bao giờ rời khỏi thiết bị người dùng, máy chủ chỉ lưu khóa công khai; đăng nhập bằng passkey thay thế hoặc bổ sung cho OTP/mật khẩu.
- Tiêu chí bổ sung: người dùng có thể thu hồi từng passkey đã đăng ký; việc mất thiết bị không làm mất tài khoản nếu còn phương thức khôi phục HNT-S-005.

### 3.2. Kiểm soát truy cập dữ liệu

**HNT-S-007 — Chống đoán ID và kiểm soát liệt kê tài nguyên**
Truy vết: đặc tả v1.0 mục 7.1 ("Không cho phép đoán ID hồ sơ để đọc dữ liệu riêng tư").

- **Given** kẻ tấn công thử thay đổi ID trong URL/API (ví dụ `profile_id`, `attachment_id`),
- **When** ID đó thuộc về hồ sơ/tài nguyên mà họ không có quyền xem,
- **Then** hệ thống từ chối truy cập (403/404 trung tính, không tiết lộ sự tồn tại của tài nguyên).
- Tiêu chí bổ sung: ID tài nguyên dùng định dạng không đoán được (UUID ngẫu nhiên); API tìm kiếm/liệt kê chỉ trả về bản ghi trong phạm vi quyền của người gọi; kiểm thử chứng minh không thể liệt kê toàn bộ ID.

**HNT-S-008 — Kiểm soát truy cập tệp đính kèm**
Truy vết: đặc tả v1.0 mục 6.1, 7.1; AT-08/QA-07.

- **Given** một tệp đính kèm riêng tư (ảnh, video, tài liệu gia đình),
- **When** có yêu cầu tải/xem tệp,
- **Then** hệ thống kiểm tra quyền truy cập của người yêu cầu trước khi phục vụ, dùng URL ký số có thời hạn ngắn; không tồn tại liên kết công khai vĩnh viễn cho tài liệu riêng tư.
- Tiêu chí bổ sung: URL ký số hết hạn không thể dùng lại; người bị thu hồi quyền không tải được tệp mới dù còn giữ URL cũ (kiểm tra quyền tại thời điểm truy cập).

**HNT-S-009 — Giới hạn tần suất và chống spam/quấy rối**
Truy vết: đặc tả v1.0 mục 3.4A, 6.1, 7.1; v1.1 mục 3.5.

- **Given** một tài khoản gửi tin nhắn, lời mời kết bạn, yêu cầu nhắn tin, tải tệp hoặc yêu cầu OTP với tần suất cao bất thường,
- **When** vượt ngưỡng cho phép,
- **Then** hệ thống áp dụng rate limiting (chặn tạm thời, yêu cầu xác minh bổ sung) và ghi nhận hành vi.
- Tiêu chí bổ sung: tin nhắn từ người lạ bị giới hạn số lượng, không tự động cho gửi nhiều ảnh/video, không làm lộ trạng thái trực tuyến của người nhận; tài khoản spam/quấy rối có thể bị hạn chế hoặc khóa theo chính sách, kèm cơ chế báo cáo và kháng nghị.

### 3.3. Ghi nhật ký, sao lưu và ứng phó sự cố

**HNT-S-010 — Nhật ký kiểm toán (audit log)**
Truy vết: đặc tả v1.0 mục 4, 7.1; v1.1 mục 4; AT-11.

- **Given** xảy ra một trong các sự kiện: thay đổi nhạy cảm trong gia phả, xóa dữ liệu quan trọng, cấp/thu hồi quyền quản trị, xử lý tranh chấp, truy cập hỗ trợ của QTV hệ thống,
- **When** sự kiện hoàn tất (hoặc bị từ chối),
- **Then** hệ thống ghi nhật ký gồm: ai thực hiện, thao tác gì, đối tượng nào, thời gian, giá trị trước/sau (với thay đổi dữ liệu), và kết quả; nhật ký được bảo vệ chống sửa/xóa trái phép; chỉ vai trò được phân quyền mới xem được nhật ký trong phạm vi của mình.

**HNT-S-011 — Sao lưu định kỳ và kiểm thử khôi phục**
Truy vết: đặc tả v1.0 mục 7.1; v1.1 mục 5.3, 6; AT-12/QA-10.

- **Given** hệ thống vận hành bình thường,
- **When** đến lịch sao lưu,
- **Then** dữ liệu (database, tệp đính kèm, cấu hình) được sao lưu tự động theo lịch, bản sao lưu được mã hóa và lưu tách biệt; quy trình khôi phục được kiểm thử định kỳ và có biên bản đạt/không đạt.
- Tiêu chí bổ sung: mục tiêu RPO/RTO được công bố nội bộ; dữ liệu gia phả đã xóa có thể khôi phục trong thời gian lưu trữ theo chính sách.

**HNT-S-012 — Quy trình ứng phó sự cố rò rỉ dữ liệu**
Truy vết: đặc tả v1.0 mục 7.1.

- **Given** phát hiện hoặc nghi ngờ xảy ra rò rỉ/mất mát dữ liệu,
- **When** kích hoạt quy trình ứng phó,
- **Then** đội ngũ thực hiện theo trình tự: khoanh vùng → đánh giá phạm vi ảnh hưởng → khắc phục → thông báo cho người bị ảnh hưởng theo quy định pháp luật áp dụng; toàn bộ diễn biến được ghi nhận.
- Tiêu chí bổ sung: đầu mối chịu trách nhiệm và kênh liên lạc khẩn cấp được chỉ định trước khi phát hành; có diễn tập tối thiểu trước mỗi bản phát hành lớn.

### 3.4. Bảo vệ nội dung riêng tư

**HNT-S-013 — Quản trị viên không được đọc tin nhắn riêng của thành viên**
Truy vết: đặc tả v1.0 mục 4, 7.1, 7.2.

- **Given** bất kỳ quản trị viên nào (kể cả Quản trị hệ thống) sử dụng giao diện quản trị,
- **When** họ tìm cách mở nội dung tin nhắn riêng hoặc cuộc trò chuyện riêng của thành viên,
- **Then** hệ thống không hiển thị nội dung; với báo cáo vi phạm, người xử lý chỉ thấy nội dung **được người báo cáo gửi kèm**, không thấy toàn bộ lịch sử trò chuyện.
- Tiêu chí bổ sung: mọi truy cập ngoại lệ vào nội dung trò chuyện (nếu pháp luật yêu cầu) phải có phê duyệt cấp cao, giới hạn phạm vi, và ghi đầy đủ vào nhật ký kiểm toán.

**HNT-S-014 — Xác minh khi liên kết tài khoản với hồ sơ gia phả**
Truy vết: đặc tả v1.0 mục 3.3B; v1.1 mục 3.3; AT-03/QA-02.

- **Given** người trong gia phả đăng ký tài khoản ứng dụng,
- **When** hệ thống thực hiện liên kết tài khoản với hồ sơ gia phả,
- **Then** quy trình xác minh được thực hiện trước khi liên kết (tránh tạo hồ sơ trùng); hệ thống cảnh báo khi phát hiện hồ sơ có khả năng là cùng một người.
- Tiêu chí bổ sung: không tự động tạo hồ sơ gia phả mới khi đã tồn tại hồ sơ trùng khớp; mọi liên kết/hủy liên kết được ghi nhật ký.

**HNT-S-015 — An toàn khi hỗ trợ người thân thiết lập tài khoản**
Truy vết: đặc tả v1.1 mục 2.3, 3.9.

- **Given** người thân hỗ trợ người lớn tuổi tạo tài khoản/đăng nhập,
- **When** quá trình hỗ trợ diễn ra,
- **Then** hệ thống không yêu cầu và không cho phép chia sẻ mật khẩu/OTP cho người hỗ trợ; không cấp quyền truy cập tài khoản ngầm sau khi hỗ trợ xong; có hướng dẫn khôi phục khi đổi số/mất thiết bị.
- Tiêu chí bổ sung: kiểm thử khả năng sử dụng với người lớn tuổi bao gồm kịch bản được người thân hỗ trợ mà không lộ thông tin đăng nhập.

---

## 4. Chính sách xử lý dữ liệu

### 4.1. Phân loại dữ liệu

| Nhóm | Ví dụ | Mức bảo vệ |
|------|-------|------------|
| Thông tin định danh cơ bản | Họ tên, ảnh đại diện, quan hệ gia phả trong phạm vi được cấp | Hiển thị cho thành viên cùng dòng họ hoặc theo lựa chọn cá nhân |
| Thông tin liên hệ | Số điện thoại, email | **Mặc định riêng tư** |
| Dữ liệu nhạy cảm | Nhóm máu, thông tin sức khỏe, địa chỉ cụ thể, giấy tờ tùy thân, dữ liệu trẻ em | **Mặc định riêng tư**, không bắt buộc nhập, chỉ chia sẻ khi chủ thể cho phép rõ ràng |
| Dữ liệu lịch sử chung | Thông tin tổ tiên đã mất, tư liệu gia đình, biên bản sự kiện | Theo quyền truy cập gia phả; người quản lý dữ liệu được chỉ định rõ |

Nguyên tắc: **riêng tư theo mặc định** — không công khai thông tin nhạy cảm chỉ vì người dùng thuộc cùng một dòng họ (đặc tả v1.1 mục 1.2).

### 4.2. Mặc định quyền riêng tư theo trường thông tin

(Nguồn: đặc tả v1.0 mục 3.3C)

| Trường thông tin | Quyền hiển thị mặc định |
|---|---|
| Họ tên, ảnh đại diện | Thành viên cùng dòng họ hoặc theo lựa chọn cá nhân |
| Tuổi / ngày sinh | Có thể chỉ hiển thị tuổi, hoặc ẩn năm sinh |
| Nơi ở | Chỉ hiển thị tỉnh/thành hoặc khu vực tổng quát |
| Điện thoại, email | Mặc định riêng tư |
| Học vấn, công việc | Chủ hồ sơ lựa chọn phạm vi chia sẻ |
| Nhóm máu | **Mặc định riêng tư**, chỉ chia sẻ với người được cấp quyền; là trường tùy chọn, không bắt buộc |
| Quan hệ gia phả | Theo quyền truy cập gia phả |
| Ảnh, tài liệu gia đình | Chủ sở hữu hoặc người được cấp quyền |

Lưu ý đặc biệt: nhóm máu và thông tin sức khỏe là dữ liệu nhạy cảm — không đặt làm trường bắt buộc và không hiển thị công khai (đặc tả v1.0 mục 3.3C).

### 4.3. Lưu trữ và thời hạn

- Dữ liệu gia phả (hồ sơ, quan hệ, lịch sử chỉnh sửa) được lưu trữ lâu dài vì là di sản chung của dòng họ; mọi thay đổi quan trọng đều có lịch sử trước/sau để truy vết và khôi phục.
- Tin nhắn: **xóa cuộc trò chuyện** chỉ xóa khỏi danh sách của người thao tác; **thu hồi** tuân theo chính sách thời hạn và hiển thị trạng thái; **chặn** ngăn liên hệ theo chính sách — ba cơ chế độc lập (đặc tả v1.0 mục 3.4C).
- Nhật ký kiểm toán được lưu trữ tối thiểu theo quy định pháp luật áp dụng và chính sách nội bộ; không cho phép người dùng thường xóa nhật ký liên quan đến mình.
- Bản sao lưu tuân thủ cùng mức bảo vệ như dữ liệu gốc (mã hóa, kiểm soát truy cập).

### 4.4. Quyền của chủ thể dữ liệu

Theo đặc tả v1.0 mục 7.1, hệ thống phải có quy trình cho phép người dùng:

1. **Yêu cầu tải xuống** dữ liệu cá nhân của mình (hồ sơ, nội dung do mình tạo trong phạm vi quyền).
2. **Yêu cầu sửa** thông tin cá nhân không chính xác.
3. **Yêu cầu xóa** dữ liệu cá nhân — thực hiện trong thời hạn công bố, trừ dữ liệu phải lưu theo nghĩa vụ pháp lý hoặc là lịch sử chung của dòng họ (xem 4.5).
4. Mọi yêu cầu được tiếp nhận, theo dõi trạng thái và phản hồi; QTV cấp cao/QTV hệ thống chịu trách nhiệm xử lý (xem ma trận 2.4).

### 4.5. Chính sách xóa tài khoản

(Nguồn: đặc tả v1.1 mục 5.2 — "Việc xóa tài khoản không được tự động xóa lịch sử gia phả của những người khác")

1. Xóa tài khoản **không** xóa hồ sơ gia phả đã xác minh của người đó — đây là lịch sử chung của dòng họ; hệ thống gỡ liên kết giữa tài khoản và hồ sơ, đánh dấu hồ sơ ở trạng thái "chưa liên kết tài khoản".
2. Thông tin định danh đăng nhập (SĐT, email, mật khẩu/hash, token phiên, passkey) bị xóa hoặc vô hiệu hóa hoàn toàn.
3. Dữ liệu liên hệ riêng tư (SĐT, email trong hồ sơ) bị xóa hoặc ẩn danh theo yêu cầu của chủ thể.
4. Tin nhắn: bản sao phía người còn lại **được giữ nguyên** (nguyên tắc 2.5.4); bản sao phía tài khoản bị xóa được gỡ bỏ.
5. Đóng góp vào gia phả (đề xuất, chỉnh sửa đã duyệt) được giữ lại trong lịch sử với định danh ẩn danh ("tài khoản đã xóa") để đảm bảo tính toàn vẹn truy vết, trừ khi pháp luật yêu cầu khác.
6. Người dùng được thông báo rõ phạm vi dữ liệu bị xóa và phạm vi được giữ lại **trước khi** xác nhận xóa.

### 4.6. Dữ liệu của người đã mất — vấn đề đặc biệt

(Nguồn: đặc tả v1.0 mục 7.1)

- Dữ liệu của người đã mất có thể chứa thông tin của người còn sống (hậu duệ). Việc được phép thêm thông tin tổ tiên **không đồng nghĩa** với quyền công khai số điện thoại, địa chỉ hoặc hồ sơ riêng tư của toàn bộ hậu duệ.
- Mỗi dòng họ phải xác định rõ **người quản lý dữ liệu**, cơ chế xác minh thông tin và cách xử lý khi các thành viên tranh chấp về tính chính xác của gia phả.
- Hồ sơ người đã mất vẫn áp dụng mặc định riêng tư cho các trường liên hệ của người còn sống có liên quan.

### 4.7. Dữ liệu trẻ em — thận trọng đặc biệt

(Nguồn: đặc tả v1.0 mục 7 — ứng dụng lưu thông tin về nhiều thế hệ, trẻ em)

- Hồ sơ trẻ em mặc định ở mức riêng tư cao nhất: chỉ người giám hộ/người được ủy quyền và vai trò được phân quyền rõ ràng mới xem được thông tin chi tiết.
- Không sử dụng dữ liệu trẻ em cho bất kỳ mục đích nào ngoài chức năng gia phả và kết nối gia đình đã được đồng ý.
- Mọi tranh chấp liên quan đến dữ liệu trẻ em được ưu tiên xử lý ở cấp Quản trị viên cấp cao.

---

## 5. Lộ trình mã hóa

### 5.1. Giai đoạn MVP — mã hóa khi truyền và khi lưu trữ

(Nguồn: đặc tả v1.0 mục 7.2)

- Mọi kết nối client–server dùng **HTTPS/TLS** (khuyến nghị TLS 1.2 trở lên).
- Dữ liệu **mã hóa khi lưu trữ** (at-rest): cơ sở dữ liệu, object storage, bản sao lưu.
- **Quản lý khóa an toàn**: khóa mã hóa được quản lý tập trung (KMS/HSM hoặc dịch vụ tương đương của nền tảng), phân tách khỏi dữ liệu; quy trình xoay vòng khóa được định nghĩa trước khi phát hành.
- Giới hạn quyền truy cập theo ma trận mục 2; **không cho quản trị viên đọc nội dung chat riêng** thông qua chức năng thông thường (HNT-S-013).

### 5.2. Giai đoạn 3 — cân nhắc mã hóa đầu cuối (E2EE)

(Nguồn: đặc tả v1.0 mục 7.2; v1.1 mục 6)

- E2EE có thể được cân nhắc khi yêu cầu bảo mật và khả năng vận hành cho phép; khi đó **chỉ thiết bị của những người tham gia** mới giải mã được nội dung.
- **Cảnh báo kiến trúc từ đặc tả:** E2EE phức tạp hơn đáng kể ở các khía cạnh sao lưu, tìm kiếm, đồng bộ nhiều thiết bị và khôi phục tài khoản. Nếu định hướng sản phẩm yêu cầu bảo mật ở mức ứng dụng nhắn tin chuyên biệt, **phải thiết kế từ đầu, không bổ sung sau** khi hệ thống chat đã phát triển lớn.
- Điều kiện tiên quyết trước khi triển khai E2EE: thiết kế sao lưu/khôi phục khóa, đồng bộ đa thiết bị, phương án tìm kiếm (chỉ mục cục bộ hoặc searchable encryption), và quy trình khôi phục tài khoản tương thích E2EE.

---

## Phụ lục: Bảng truy vết yêu cầu

| Mã | Nội dung | Đặc tả nguồn | Liên quan AT/QA |
|---|---|---|---|
| HNT-S-001 | Thực thi phân quyền tại backend/database | v1.0: 4, 6.1; v1.1: 4, 5.1 | AT-04, QA-04 |
| HNT-S-002 | Xác thực OTP | v1.0: 5.1; v1.1: 3.9 | — |
| HNT-S-003 | Chính sách mật khẩu | v1.0: 5.1 | — |
| HNT-S-004 | Quản lý phiên & thiết bị | v1.0: 5.1; v1.1: 3.5, 3.9 | — |
| HNT-S-005 | Khôi phục tài khoản | v1.0: 5.2; v1.1: 2.3, 3.9 | — |
| HNT-S-006 | Passkey / FIDO2-WebAuthn (tùy chọn) | Bổ sung theo yêu cầu | — |
| HNT-S-007 | Chống đoán ID | v1.0: 7.1 | AT-08, QA-07 |
| HNT-S-008 | Kiểm soát truy cập tệp đính kèm | v1.0: 6.1, 7.1 | AT-08, QA-07 |
| HNT-S-009 | Rate limiting & chống spam | v1.0: 3.4A, 6.1, 7.1; v1.1: 3.5 | AT-07 |
| HNT-S-010 | Nhật ký kiểm toán | v1.0: 4, 7.1; v1.1: 4 | AT-11 |
| HNT-S-011 | Sao lưu & khôi phục | v1.0: 7.1; v1.1: 5.3, 6 | AT-12, QA-10 |
| HNT-S-012 | Ứng phó sự cố rò rỉ | v1.0: 7.1 | AT-12, QA-10 |
| HNT-S-013 | QTV không đọc tin nhắn riêng | v1.0: 4, 7.1, 7.2 | — |
| HNT-S-014 | Xác minh liên kết tài khoản–hồ sơ | v1.0: 3.3B; v1.1: 3.3 | AT-03, QA-02 |
| HNT-S-015 | An toàn khi hỗ trợ lập tài khoản | v1.1: 2.3, 3.9 | QA-11 |

_AT/QA: mã tiêu chí nghiệm thu trong đặc tả (v1.0 mục 9; v1.1 mục 7)._

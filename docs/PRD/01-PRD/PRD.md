# PRD — Ứng dụng "HỌ NHÀ TÔI"

| Mục | Nội dung |
|---|---|
| Sản phẩm | Họ Nhà Tôi — ứng dụng gia phả số và kết nối gia đình |
| Phiên bản PRD | 1.0 (biên soạn từ Đặc tả chức năng PRD v1.0 và bản chốt định hướng v1.1) |
| Ngày biên soạn | 2026-10-22 |
| Nguồn yêu cầu | File đặc tả "ĐẶC TẢ" trong thư mục HO-NHA-TOI (Google Drive) |
| Quy ước mã | HNT-F-xxx: yêu cầu chức năng · HNT-N-xxx: yêu cầu phi chức năng (trong PRD này) · HNT-U-xxx: yêu cầu UI/UX (xem tài liệu UI/UX) · HNT-P-xxx: yêu cầu kiểm thử (xem Test Plan) |
| Tiêu chí nghiệm thu | Viết theo định dạng Given–When–Then, có thể kiểm chứng được |

## Mục lục

1. [Tổng quan sản phẩm](#1-tổng-quan-sản-phẩm)
2. [Đối tượng người dùng và vai trò](#2-đối-tượng-người-dùng-và-vai-trò)
3. [Yêu cầu chức năng theo phân hệ](#3-yêu-cầu-chức-năng-theo-phân-hệ)
4. [Yêu cầu phi chức năng](#4-yêu-cầu-phi-chức-năng)
5. [Phạm vi MVP](#5-phạm-vi-mvp)
6. [Ma trận truy vết](#6-ma-trận-truy-vết)
7. [Ngoài phạm vi](#7-ngoài-phạm-vi)
8. [Thuật ngữ](#8-thuật-ngữ)

---

## 1. Tổng quan sản phẩm

### 1.1. Tầm nhìn

Họ Nhà Tôi là ứng dụng gia phả số và kết nối gia đình, giúp các thành viên lưu giữ cội nguồn, tìm kiếm người thân, chia sẻ thông tin, tổ chức hoạt động gia đình và duy trì kết nối giữa nhiều thế hệ.

Ứng dụng hướng tới 4 giá trị:

1. Lưu giữ lịch sử, gia phả và tư liệu gia đình.
2. Xây dựng danh bạ thành viên có cấu trúc, dễ tìm kiếm.
3. Kết nối thông qua phòng chat dòng họ, chat riêng và nhóm gia đình.
4. Quản lý ngày giỗ, sinh nhật, họp họ, sự kiện và hoạt động chung.

### 1.2. Ba trụ cột sản phẩm

Họ Nhà Tôi không chỉ là ứng dụng vẽ gia phả hoặc nhóm chat họ hàng. Sản phẩm kết hợp ba nhu cầu chính:

1. **Gia phả số — lưu giữ cội nguồn.** Tạo cây gia phả nhiều thế hệ, quản lý thành viên, quan hệ huyết thống, ngày giỗ, thông tin tổ tiên và tư liệu gia đình. Đây là giá trị khác biệt cốt lõi và là lõi dữ liệu của sản phẩm.
2. **Cộng đồng dòng họ — kết nối họ hàng.** Mỗi dòng họ có một không gian chung với bảng tin, phòng chat, danh sách thành viên, thông báo, sự kiện và hoạt động của họ. Đây là động lực sử dụng thường xuyên.
3. **Mạng xã hội gia đình — liên lạc riêng tư.** Nhắn tin riêng, kết bạn, tạo nhóm gia đình nhỏ, chia sẻ ảnh/video, gọi thoại và quản lý quyền riêng tư tương tự các ứng dụng nhắn tin phổ biến. Chat là công cụ giao tiếp, không yêu cầu thay thế ứng dụng nhắn tin hiện có.

### 1.3. Nguyên tắc sản phẩm (chốt theo đặc tả v1.1)

| Nguyên tắc | Quy định |
|---|---|
| Gia phả là lõi | Dữ liệu quan hệ gia đình phải có cấu trúc, không chỉ là hình ảnh cây gia phả. |
| Kết nối là giá trị sử dụng thường xuyên | Chat, bảng tin, sự kiện và danh bạ hỗ trợ người dùng quay lại ứng dụng. |
| Không bắt buộc thay thế Zalo | Cho phép sử dụng song song; tạo giá trị mà nhóm chat thông thường không có (gia phả, danh bạ có quan hệ, ngày giỗ, kho tư liệu, lịch sử dòng họ). |
| Cộng đồng cùng đóng góp | Nhiều người được bổ sung dữ liệu theo quyền, có xác minh và lịch sử chỉnh sửa. |
| Ưu tiên người lớn tuổi | Chữ dễ đọc, thao tác đơn giản, hướng dẫn rõ ràng. Khả năng sử dụng của người lớn tuổi là yêu cầu thiết kế bắt buộc. |
| Riêng tư theo mặc định | Không công khai thông tin nhạy cảm chỉ vì người dùng cùng dòng họ. |
| Tách biệt danh tính và quan hệ | Tài khoản ứng dụng, hồ sơ gia phả và tư cách thành viên cộng đồng là các thực thể riêng. |
| Phát triển theo giai đoạn | MVP trước, chức năng nâng cao sau khi có dữ liệu sử dụng thực tế. |

### 1.4. Định vị các phân hệ

- **Gia phả** là lõi dữ liệu.
- **Dòng họ** là cộng đồng.
- **Phòng chat** là công cụ giao tiếp.
- **Nhóm "Gia đình tôi"** là không gian riêng tư.
- **Hồ sơ thành viên** là danh bạ kết nối.
- **Quyền riêng tư** là yêu cầu xuyên suốt.

### 1.5. Cấu trúc điều hướng

Ứng dụng gồm 5 tab chính: **Trang chủ**, **Gia phả**, **Tin nhắn**, **Dòng họ**, **Cá nhân**. Nhóm "Gia đình tôi" được truy cập từ tab Tin nhắn hoặc Cá nhân; không tạo tab riêng. Một tài khoản có thể tham gia nhiều dòng họ nếu được mời hoặc được chấp thuận; mỗi dòng họ có dữ liệu, thành viên và người quản trị riêng.

---

## 2. Đối tượng người dùng và vai trò

### 2.1. Nhóm người dùng

- **Người lớn tuổi** (nhóm trọng tâm): cần chữ dễ đọc, thao tác ít bước, lời mời dễ mở bằng liên kết/mã QR, có thể nhờ người thân hỗ trợ thiết lập tài khoản.
- **Người trẻ**: sử dụng thuận tiện, đóng góp dữ liệu gia phả, kết nối họ hàng.
- **Người quản lý gia phả / quản trị viên dòng họ**: duy trì dữ liệu, duyệt thành viên, điều hành cộng đồng.

### 2.2. Ma trận vai trò

Phân quyền theo từng dòng họ và từng nhóm, không áp dụng chung toàn hệ thống.

| Vai trò | Phạm vi quyền |
|---|---|
| Khách (chưa đăng nhập) | Chỉ xem giới thiệu và nội dung được công khai |
| Thành viên ứng dụng | Quản lý hồ sơ của mình, nhắn tin, tham gia nhóm được phép |
| Thành viên dòng họ | Xem nội dung dòng họ theo quyền, đề xuất dữ liệu gia phả |
| Người quản lý gia phả | Thêm, sửa quan hệ và hồ sơ trong phạm vi được cấp |
| Quản trị viên dòng họ | Duyệt thành viên, quản lý nội quy, thông báo và quyền nhóm |
| Quản trị viên cấp cao | Quản lý quản trị viên, xử lý tranh chấp, cấp quyền đặc biệt |
| Quản trị hệ thống | Vận hành nền tảng, hỗ trợ và xử lý sự cố theo quyền kiểm soát |

Quy tắc bắt buộc:

- Một người có thể là quản trị viên của dòng họ A nhưng chỉ là thành viên ở dòng họ B.
- Không tự động cấp quyền sửa gia phả cho người chỉ tham gia phòng chat.
- Thao tác xóa dữ liệu quan trọng phải có xác nhận; một số thao tác cần lưu lịch sử và cho phép khôi phục.
- Quản trị viên không mặc nhiên được đọc tin nhắn riêng tư của các thành viên.
- Các quyền nhạy cảm cần được kiểm soát và ghi nhật ký truy cập.

---

## 3. Yêu cầu chức năng theo phân hệ

Quy ước độ ưu tiên: **MVP** (giai đoạn 1) · **Giai đoạn 2** (hoàn thiện) · **Giai đoạn 3** (mở rộng).

### 3.1. Đăng ký, đăng nhập và tham gia dòng họ

**HNT-F-001 — Đăng ký bằng số điện thoại và OTP**
- Mô tả: Người dùng đăng ký tài khoản bằng số điện thoại; hệ thống gửi mã OTP để xác thực quyền kiểm soát số điện thoại.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng nhập số điện thoại hợp lệ, When yêu cầu gửi OTP, Then mã OTP được gửi trong vòng 60 giây và có giới hạn số lần gửi lại.
  - Given người dùng nhập đúng OTP còn hiệu lực, When xác nhận, Then tài khoản được tạo và đăng nhập thành công.

**HNT-F-002 — Đăng ký/đăng nhập bằng email**
- Mô tả: Người dùng đăng ký hoặc đăng nhập bằng email với mật khẩu hoặc liên kết đăng nhập gửi qua email.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng nhập email và mật khẩu đúng, When đăng nhập, Then phiên đăng nhập được tạo.
  - Given người dùng chọn đăng nhập bằng liên kết, When mở liên kết còn hiệu lực, Then đăng nhập thành công mà không cần mật khẩu.

**HNT-F-003 — Đăng nhập bằng Google/Apple**
- Mô tả: Đăng nhập bằng tài khoản Google hoặc Apple ID nếu được triển khai.
- Ưu tiên: Giai đoạn 2
- Tiêu chí nghiệm thu:
  - Given người dùng chọn đăng nhập bằng Google/Apple, When hoàn tất ủy quyền, Then tài khoản được liên kết hoặc tạo mới và đăng nhập thành công.

**HNT-F-004 — Khôi phục tài khoản**
- Mô tả: Có phương án khôi phục tài khoản khi người dùng đổi số điện thoại hoặc mất thiết bị, kèm hướng dẫn rõ ràng.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng mất quyền truy cập số điện thoại cũ nhưng xác minh được danh tính qua kênh dự phòng, When yêu cầu khôi phục, Then tài khoản được khôi phục và liên kết với thông tin mới.

**HNT-F-005 — Quản lý phiên đăng nhập và đăng xuất khỏi thiết bị**
- Mô tả: Người dùng xem danh sách thiết bị/phiên đang đăng nhập và đăng xuất từ xa khỏi thiết bị không còn sử dụng.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng có 2 phiên đang hoạt động, When đăng xuất khỏi một thiết bị, Then phiên đó bị vô hiệu và thiết bị yêu cầu đăng nhập lại.

**HNT-F-006 — Mời tham gia dòng họ bằng liên kết/mã QR**
- Mô tả: Cho phép mời người thân bằng liên kết mời hoặc mã QR dễ mở; cho phép chia sẻ liên kết sự kiện, lời mời gia phả và bài viết qua ứng dụng khác. Không yêu cầu đồng bộ tin nhắn hay danh bạ từ ứng dụng khác.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given quản trị viên tạo liên kết mời, When người được mời mở liên kết, Then mở được màn hình tham gia dòng họ mà không cần chuyển danh bạ hay lịch sử chat từ ứng dụng khác.

**HNT-F-007 — Gửi yêu cầu tham gia dòng họ**
- Mô tả: Người dùng tìm dòng họ hoặc nhận lời mời, gửi yêu cầu tham gia; có thể chọn nhánh gia đình và khai báo quan hệ khi gửi yêu cầu.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng chưa là thành viên, When gửi yêu cầu tham gia kèm thông tin nhánh/quan hệ, Then yêu cầu được ghi nhận và chuyển tới quản trị viên dòng họ.

**HNT-F-008 — Duyệt yêu cầu tham gia và phân quyền**
- Mô tả: Quản trị viên dòng họ xác minh, chấp thuận hoặc từ chối yêu cầu tham gia và cấp quyền ban đầu cho thành viên mới.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given có yêu cầu tham gia đang chờ, When quản trị viên chấp thuận, Then người dùng trở thành thành viên dòng họ với vai trò và quyền đã cấp, đồng thời nhận thông báo kết quả.

**HNT-F-009 — Một tài khoản tham gia nhiều dòng họ**
- Mô tả: Một tài khoản có thể tham gia nhiều dòng họ; vai trò và quyền được quản lý độc lập theo từng dòng họ.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng là quản trị viên dòng họ A, When được chấp thuận vào dòng họ B, Then ở dòng họ B người dùng chỉ có quyền thành viên, quyền quản trị ở dòng họ A không thay đổi.

**HNT-F-010 — Hỗ trợ người thân thiết lập tài khoản**
- Mô tả: Cho phép người thân hỗ trợ người lớn tuổi thiết lập tài khoản, nhưng không tự động cấp quyền truy cập tài khoản cho người hỗ trợ và không chia sẻ mật khẩu.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người thân hỗ trợ thiết lập, When hoàn tất, Then tài khoản thuộc quyền kiểm soát của chủ tài khoản và người hỗ trợ không có quyền truy cập ngầm.

**HNT-F-099 — Tạo dòng họ mới**
- Mô tả: Người dùng đã đăng nhập có thể tạo một dòng họ mới với tên dòng họ, quê quán và thông tin nhà thờ họ (nếu có); người tạo mặc nhiên trở thành quản trị viên dòng họ và có thể bắt đầu mời thành viên.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng đã đăng nhập, When tạo dòng họ với tên và quê quán hợp lệ, Then dòng họ được tạo, người tạo có vai trò quản trị viên dòng họ và phòng chat chung của dòng họ được khởi tạo.

### 3.2. Phân hệ gia phả

**HNT-F-011 — Tạo gia phả mới** (GP-01)
- Mô tả: Tạo gia phả với tên dòng họ, tên chi/nhánh, quê quán, địa chỉ nhà thờ họ, tên tổ tiên khởi nguồn, ảnh đại diện tổ tiên, ảnh nhà thờ họ, gia huy/biểu tượng dòng họ, chế độ hiển thị (cây dọc, cây ngang, danh sách theo thế hệ) và phạm vi truy cập (riêng tư, thành viên được duyệt, công khai một phần).
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng nhập đầy đủ tên dòng họ, quê quán và tổ tiên khởi nguồn, When xác nhận tạo, Then gia phả được tạo với người tạo là người quản lý đầu tiên.

**HNT-F-012 — Hiển thị cây gia phả nhiều thế hệ** (GP-02)
- Mô tả: Hiển thị cây nhiều thế hệ, nhiều chi và nhiều nhánh; hiển thị số thế hệ, số thành viên và nhánh đang xem; hỗ trợ phóng to, thu nhỏ, kéo cây và mở hồ sơ trực tiếp từ nút thành viên; tải theo nhánh/thế hệ khi cây lớn thay vì dựng toàn bộ cùng lúc.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given cây gia phả có 5 thế hệ và nhiều chi, When mở cây, Then hiển thị đúng cấu trúc thế hệ/chi/nhánh và mở được hồ sơ khi chạm vào nút thành viên.

**HNT-F-013 — Quản lý quan hệ gia đình** (GP-03)
- Mô tả: Thêm cha, mẹ, con, vợ/chồng; hỗ trợ con nuôi, cha/mẹ nuôi, quan hệ tái hôn và quan hệ đặc biệt. Mỗi quan hệ được lưu có cấu trúc, không chỉ lưu ảnh cây gia phả.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given hồ sơ một thành viên, When thêm quan hệ con nuôi, Then quan hệ được lưu với loại quan hệ "con nuôi" và hiển thị đúng trên cây.

**HNT-F-014 — Hồ sơ thành viên trong gia phả** (GP-04)
- Mô tả: Mỗi người có hồ sơ riêng gồm các nhóm: thông tin cơ bản (họ tên, tên thường gọi, ảnh, ngày sinh/mất, giới tính, quê quán, nơi ở); gia đình và quan hệ (cha mẹ, vợ/chồng, con, anh chị em, thế hệ, chi/nhánh, vai vế); học tập và công việc; thông tin bổ sung (sở thích, kỹ năng, tiểu sử, thành tích); tư liệu gia đình (ảnh, video, tài liệu). Số điện thoại, email, nhóm máu tuân theo quyền riêng tư.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given hồ sơ đầy đủ các nhóm thông tin, When người có quyền xem mở hồ sơ, Then hiển thị đúng các nhóm thông tin; các trường riêng tư bị ẩn với người không có quyền.

**HNT-F-015 — Tìm kiếm trong gia phả** (GP-05)
- Mô tả: Tìm kiếm theo họ tên, bí danh, quê quán, thế hệ, chi/nhánh; chỉ trả về thông tin người tìm được phép xem.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given cây có thành viên tên "Nguyễn Văn An", When tìm kiếm "Văn An", Then trả về hồ sơ đúng và không lộ trường riêng tư của người không có quyền.

**HNT-F-016 — Đề xuất thêm/sửa dữ liệu theo quyền** (GP-06)
- Mô tả: Thành viên được đề xuất thêm hoặc sửa hồ sơ, quan hệ và thông tin mới theo quyền được cấp; người được thêm vào gia phả không mặc nhiên có quyền sửa toàn bộ gia phả.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given thành viên có quyền đề xuất nhưng không có quyền sửa trực tiếp, When gửi đề xuất sửa ngày sinh, Then đề xuất được ghi nhận ở trạng thái chờ duyệt và dữ liệu hiện tại giữ nguyên.

**HNT-F-017 — Xác minh và xử lý mâu thuẫn/tranh chấp** (GP-07)
- Mô tả: Người quản lý gia phả duyệt các đề xuất; thay đổi quan hệ cha mẹ, vợ/chồng, ngày sinh/mất hoặc thông tin lịch sử quan trọng có thể yêu cầu xác minh; có cơ chế gửi yêu cầu xác minh khi thông tin mâu thuẫn, cơ chế phản đối, yêu cầu sửa sai và giải quyết tranh chấp.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given một đề xuất thay đổi quan hệ cha–con đang chờ, When người quản lý từ chối kèm lý do, Then đề xuất chuyển trạng thái bị từ chối, dữ liệu giữ nguyên và người đề xuất nhận được lý do.

**HNT-F-018 — Phát hiện hồ sơ có khả năng trùng** (GP-08)
- Mô tả: Hệ thống cảnh báo khi hồ sơ mới có khả năng là cùng một người với hồ sơ đã tồn tại, tránh tạo hai hồ sơ cho cùng một người.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given đã tồn tại hồ sơ "Trần Thị B, sinh 1950", When tạo hồ sơ mới "Trần Thị B, sinh 1950", Then hệ thống hiển thị cảnh báo trùng lặp trước khi cho phép tạo.

**HNT-F-019 — Lịch sử chỉnh sửa gia phả** (GP-09)
- Mô tả: Lưu người chỉnh sửa, thời gian chỉnh sửa, giá trị trước/sau và lý do; cho phép khôi phục dữ liệu đã sửa hoặc xóa theo chính sách lưu trữ.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given một hồ sơ bị sửa sai, When người quản lý mở lịch sử, Then xem được giá trị trước/sau, người sửa, thời gian và khôi phục được phiên bản trước.

**HNT-F-020 — Nhập và xuất dữ liệu gia phả** (GP-10)
- Mô tả: Nhập thành viên thủ công; nhập Excel theo mẫu chuẩn; nhập cây gia phả từ định dạng GEDCOM khi tương thích; xuất cây gia phả dạng PDF, ảnh hoặc báo cáo danh sách; xuất dữ liệu cá nhân theo quyền được cấp.
- Ưu tiên: Giai đoạn 2
- Tiêu chí nghiệm thu:
  - Given file Excel đúng mẫu chuẩn, When nhập, Then các hồ sơ được tạo đúng và báo cáo số bản ghi thành công/thất bại.

**HNT-F-021 — Phân quyền gia phả** (GP-11)
- Mô tả: Thiết lập quyền xem, đề xuất, sửa, duyệt và quản lý cho từng phạm vi; đặt quyền xem, sửa, thêm thành viên và xuất dữ liệu khi tạo gia phả.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng chỉ có quyền xem, When gọi API sửa hồ sơ, Then backend từ chối và không thay đổi dữ liệu.

**HNT-F-022 — Kho tư liệu gia phả** (GP-12)
- Mô tả: Lưu ảnh, video, tài liệu, giấy tờ lịch sử, tiểu sử, kỷ niệm và ảnh tư liệu của gia đình theo quyền truy cập.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người có quyền tải tư liệu, When tải ảnh giấy tờ gia đình, Then tư liệu được lưu, gắn với đúng hồ sơ và chỉ người có quyền mới xem được.

**HNT-F-023 — Sự kiện gia phả (ngày giỗ, sinh, mất)**
- Mô tả: Quản lý ngày sinh, ngày mất, ngày giỗ, giỗ tổ, họp họ, lễ mừng thọ, cưới hỏi, sinh con; hỗ trợ lịch âm và lịch dương; nhắc lịch trước sự kiện; danh sách người tham dự và thông báo tới các nhánh liên quan; lưu ảnh, biên bản và tư liệu sau mỗi sự kiện.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given một ngày giỗ được tạo với lịch âm, When đến thời điểm nhắc, Then người dùng trong phạm vi được phép nhận thông báo nhắc lịch đúng ngày dương tương ứng.

**HNT-F-024 — Trạng thái xác minh của hồ sơ**
- Mô tả: Mỗi hồ sơ có trạng thái dữ liệu (nháp, chờ xác minh, đã xác minh, tranh chấp); trạng thái xác minh được lưu riêng với quyền truy cập; hồ sơ chưa xác minh được đánh dấu trạng thái rõ ràng.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given hồ sơ ở trạng thái chờ xác minh, When người dùng mở hồ sơ, Then hiển thị nhãn trạng thái "chờ xác minh" rõ ràng.

### 3.3. Phòng chat chung của dòng họ

**HNT-F-025 — Tin nhắn văn bản theo thời gian thực** (CHAT-01)
- Mô tả: Gửi, nhận tin nhắn văn bản theo thời gian thực trong phòng chat dòng họ.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given hai thành viên trong cùng phòng chat, When A gửi tin nhắn văn bản, Then B nhận được tin nhắn gần như tức thì khi kết nối ổn định.

**HNT-F-026 — Emoji và biểu tượng cảm xúc** (CHAT-02)
- Mô tả: Chèn emoji, biểu tượng cảm xúc vào tin nhắn.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng soạn tin nhắn, When chèn emoji, Then emoji hiển thị đúng trên thiết bị người nhận.

**HNT-F-027 — Gửi và xem ảnh** (CHAT-03)
- Mô tả: Gửi nhiều ảnh, xem ảnh toàn màn hình.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng chọn 5 ảnh, When gửi, Then cả 5 ảnh được gửi và người nhận xem được toàn màn hình.

**HNT-F-028 — Gửi và phát video** (CHAT-04)
- Mô tả: Gửi video, xem trước và phát video trong cuộc trò chuyện.
- Ưu tiên: Giai đoạn 2
- Tiêu chí nghiệm thu:
  - Given người dùng gửi một video, When người nhận mở, Then xem được bản xem trước và phát video.

**HNT-F-029 — Tệp đính kèm** (CHAT-05)
- Mô tả: Gửi tệp PDF, Word, Excel và các định dạng được phép.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng đính kèm file PDF, When gửi, Then người nhận tải và mở được file theo quyền truy cập.

**HNT-F-030 — Tin nhắn thoại** (CHAT-06)
- Mô tả: Ghi âm, gửi, nghe lại, tua và điều chỉnh tốc độ phát tin nhắn thoại.
- Ưu tiên: Giai đoạn 2
- Tiêu chí nghiệm thu:
  - Given người dùng ghi âm 30 giây, When gửi, Then người nhận nghe lại được, tua được và đổi được tốc độ phát.

**HNT-F-031 — Trả lời tin nhắn** (CHAT-07)
- Mô tả: Reply một tin nhắn cụ thể kèm hiển thị ngữ cảnh tin nhắn được trả lời (trích dẫn).
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given một tin nhắn trong phòng chat, When người dùng trả lời tin nhắn đó, Then tin nhắn trả lời hiển thị kèm trích dẫn ngữ cảnh gốc.

**HNT-F-032 — Chuyển tiếp tin nhắn** (CHAT-08)
- Mô tả: Chuyển tiếp tin nhắn cho cá nhân hoặc nhóm khác.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given một tin nhắn, When chuyển tiếp cho một cuộc trò chuyện khác, Then tin nhắn xuất hiện tại cuộc trò chuyện đích.

**HNT-F-033 — Thả cảm xúc (reaction)** (CHAT-09)
- Mô tả: Like, tim, haha và các reaction khác trên tin nhắn.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given một tin nhắn, When người dùng thả reaction "tim", Then reaction hiển thị trên tin nhắn cho các thành viên.

**HNT-F-034 — Sửa tin nhắn** (CHAT-10)
- Mô tả: Sửa nội dung tin nhắn trong thời hạn được quy định, có hiển thị đã chỉnh sửa.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given tin nhắn còn trong thời hạn cho phép sửa, When người gửi sửa nội dung, Then nội dung mới hiển thị kèm dấu hiệu đã chỉnh sửa.

**HNT-F-035 — Thu hồi tin nhắn** (CHAT-11)
- Mô tả: Thu hồi tin nhắn theo chính sách thời hạn, hiển thị trạng thái đã thu hồi.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given tin nhắn còn trong thời hạn thu hồi, When người gửi thu hồi, Then tin nhắn được thay bằng trạng thái "đã thu hồi" ở mọi thành viên.

**HNT-F-036 — Xóa tin nhắn** (CHAT-12)
- Mô tả: Xóa tin nhắn phía mình, hoặc xóa với mọi người khi đủ quyền.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng chọn xóa phía mình, When xác nhận, Then tin nhắn biến mất khỏi thiết bị của người đó nhưng vẫn hiển thị với người khác.

**HNT-F-037 — Ghim tin nhắn** (CHAT-13)
- Mô tả: Ghim thông báo quan trọng, lịch họp họ trong phòng chat.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người có quyền ghim, When ghim một tin nhắn, Then tin nhắn được ghim hiển thị nổi bật đầu phòng chat.

**HNT-F-038 — Tìm kiếm trong chat** (CHAT-14)
- Mô tả: Tìm nội dung tin nhắn, người gửi, tệp và mốc thời gian. Tìm kiếm nâng cao (đa điều kiện, toàn hệ thống) thuộc giai đoạn 2.
- Ưu tiên: MVP (cơ bản) / Giai đoạn 2 (nâng cao)
- Tiêu chí nghiệm thu:
  - Given phòng chat có lịch sử tin nhắn, When tìm từ khóa, Then trả về các tin nhắn chứa từ khóa kèm người gửi và thời gian.

**HNT-F-039 — Trạng thái gửi/nhận/đọc** (CHAT-15)
- Mô tả: Hiển thị trạng thái đang gửi, đã gửi, đã nhận, đã đọc khi có thể xác nhận, tuân theo thiết lập quyền riêng tư.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người nhận đã mở tin nhắn, When hệ thống xác nhận, Then người gửi thấy trạng thái "đã đọc".

**HNT-F-040 — Trích dẫn ngữ cảnh tin nhắn** (CHAT-16)
- Mô tả: Hiển thị ngữ cảnh tin nhắn được trả lời khi xem tin nhắn reply.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given một tin nhắn trả lời, When xem tin nhắn, Then hiển thị đoạn trích của tin nhắn gốc.

**HNT-F-041 — Cấu hình phòng chat dòng họ**
- Mô tả: Hiển thị tên dòng họ, ảnh đại diện và mô tả nhóm; cho phép đổi tên nhóm, ảnh bìa, mô tả và thông tin nhóm; hiển thị danh sách thành viên, số lượng và vai trò.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người có quyền quản lý, When đổi tên và ảnh bìa nhóm, Then thông tin mới hiển thị cho toàn bộ thành viên.

**HNT-F-042 — Mời thành viên qua liên kết mời**
- Mô tả: Thêm thành viên theo lời mời hoặc quy trình phê duyệt; tạo liên kết mời có thể hết hạn hoặc bị thu hồi.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given liên kết mời đã bị thu hồi, When người mới mở liên kết, Then không thể tham gia bằng liên kết đó.

**HNT-F-043 — Gán quản trị viên và phó quản trị viên**
- Mô tả: Gán hoặc gỡ vai trò quản trị viên, phó quản trị viên của phòng chat/nhóm.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given thành viên thường, When được gán làm phó quản trị viên, Then có quyền quản trị theo cấu hình vai trò.

**HNT-F-044 — Cấu hình quyền trong nhóm chat**
- Mô tả: Cấu hình ai được phép gửi tin nhắn, ghim bài hoặc thêm thành viên.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given nhóm bật chế độ chỉ quản trị viên được gửi tin, When thành viên thường gửi tin, Then hệ thống từ chối.

**HNT-F-045 — Tắt thông báo và chế độ tin quan trọng**
- Mô tả: Tắt thông báo nhóm; bật chế độ chỉ thông báo tin quan trọng.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng tắt thông báo nhóm, When có tin nhắn mới, Then không phát thông báo đẩy cho người đó.

**HNT-F-046 — Xử lý thành viên vi phạm**
- Mô tả: Quản lý thành viên vi phạm: xóa khỏi nhóm, chặn tham gia lại theo chính sách.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given thành viên bị chặn tham gia lại, When người đó dùng liên kết mời, Then không thể gia nhập lại nhóm.

**HNT-F-047 — Xem tệp, ảnh, video và liên kết đã chia sẻ**
- Mô tả: Xem danh sách tệp, ảnh, video và liên kết đã chia sẻ trong nhóm.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given nhóm đã chia sẻ 10 ảnh và 2 tệp, When mở kho chia sẻ, Then liệt kê đầy đủ 12 mục.

**HNT-F-048 — Thông báo biến động nhóm và lịch sử thay đổi**
- Mô tả: Thông báo khi có thành viên mới, thay đổi quản trị viên hoặc cập nhật nội quy; lưu lịch sử thay đổi thành viên và quyền quản trị.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given quản trị viên thêm thành viên mới, When hoàn tất, Then nhóm nhận thông báo thành viên mới và lịch sử ghi nhận sự kiện.

**HNT-F-049 — Bình chọn trong nhóm chat**
- Mô tả: Tạo bình chọn (ví dụ: chọn ngày họp họ, địa điểm tổ chức, phương án đóng góp), thu thập và hiển thị kết quả.
- Ưu tiên: Giai đoạn 2
- Tiêu chí nghiệm thu:
  - Given một bình chọn đang mở, When thành viên bỏ phiếu, Then kết quả được cập nhật và hiển thị theo thời gian thực.

**HNT-F-050 — Sự kiện trong nhóm chat**
- Mô tả: Tạo lịch họp họ, giỗ tổ, ngày giỗ; gửi lời mời, xác nhận tham dự và nhắc lịch.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given sự kiện họp họ được tạo, When thành viên xác nhận tham dự, Then danh sách tham dự được cập nhật và người xác nhận nhận nhắc lịch trước sự kiện.

**HNT-F-051 — Thông báo quan trọng từ quản trị viên**
- Mô tả: Quản trị viên đăng thông báo nổi bật; có thể yêu cầu xác nhận đã đọc.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given thông báo yêu cầu xác nhận đã đọc, When thành viên mở thông báo, Then hệ thống ghi nhận trạng thái đã đọc của thành viên đó.

**HNT-F-052 — Gọi thoại/video nhóm**
- Mô tả: Gọi thoại và video nhóm thông qua dịch vụ gọi bên thứ ba; không tự xây dựng hạ tầng gọi video trong phiên bản đầu.
- Ưu tiên: Giai đoạn 2
- Tiêu chí nghiệm thu:
  - Given nhóm đã tích hợp dịch vụ gọi, When người dùng bắt đầu cuộc gọi nhóm, Then các thành viên nhận được lời mời tham gia cuộc gọi.

---

### 3.4. Danh bạ thành viên dòng họ

**HNT-F-053 — Xem danh sách thành viên dòng họ**
- Mô tả: Xem danh sách thành viên theo họ tên, chi/nhánh và thế hệ; hiển thị ảnh đại diện, tên, chi/nhánh và thông tin liên hệ được phép xem.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given dòng họ có 200 thành viên thuộc nhiều chi, When mở danh bạ, Then danh sách hiển thị theo chi/nhánh/thế hệ và chỉ lộ thông tin liên hệ trong phạm vi quyền.

**HNT-F-054 — Tìm kiếm và lọc thành viên**
- Mô tả: Tìm theo tên, quê quán, nơi ở, nghề nghiệp; lọc theo tỉnh/thành hoặc nhóm gia đình.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng lọc theo tỉnh "Đồng Nai", When áp dụng bộ lọc, Then chỉ hiển thị thành viên có nơi ở tại Đồng Nai.

**HNT-F-055 — Hồ sơ thành viên theo quyền riêng tư**
- Mô tả: Trường thông tin hiển thị theo quyền: họ tên/ảnh đại diện (thành viên cùng dòng họ hoặc theo lựa chọn cá nhân); tuổi/ngày sinh (có thể chỉ hiển thị tuổi hoặc ẩn năm sinh); nơi ở (chỉ tỉnh/thành hoặc khu vực tổng quát); điện thoại, email và nhóm máu mặc định riêng tư; học vấn, công việc do chủ hồ sơ chọn phạm vi chia sẻ; quan hệ gia phả theo quyền truy cập gia phả. Nhóm máu và thông tin sức khỏe không là trường bắt buộc và không hiển thị công khai.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given hồ sơ có số điện thoại ở chế độ riêng tư, When thành viên khác mở hồ sơ, Then số điện thoại không hiển thị.

**HNT-F-056 — Nhắn tin và kết bạn từ danh bạ**
- Mô tả: Từ danh bạ có thể mở hồ sơ thành viên, gửi tin nhắn riêng hoặc lời mời kết bạn.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng mở hồ sơ thành viên trong danh bạ, When chọn "Nhắn tin", Then mở cuộc trò chuyện với người đó.

**HNT-F-057 — Xem quan hệ gia phả của thành viên**
- Mô tả: Xem quan hệ gia phả của thành viên nếu đã được xác lập và người xem có quyền.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given hai thành viên đã có quan hệ gia phả được xác minh, When mở hồ sơ, Then hiển thị quan hệ (ví dụ: "anh họ") theo quyền truy cập.

**HNT-F-058 — Đề xuất bổ sung/sửa và báo cáo hồ sơ**
- Mô tả: Gửi yêu cầu bổ sung, sửa hoặc xác minh hồ sơ; báo cáo hồ sơ sai, trùng lặp hoặc giả mạo.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng báo cáo một hồ sơ giả mạo kèm lý do, When gửi báo cáo, Then báo cáo được ghi nhận kèm dữ liệu liên quan và trạng thái xử lý.

**HNT-F-059 — Liên kết tài khoản với hồ sơ gia phả**
- Mô tả: Khi người trong gia phả đăng ký ứng dụng, hệ thống thực hiện quy trình xác minh để liên kết tài khoản với đúng hồ sơ gia phả, tránh tạo hồ sơ trùng. Phân biệt rõ "thành viên gia phả" (có thể chưa dùng ứng dụng, ví dụ người đã mất) và "tài khoản ứng dụng" (đã đăng ký, đăng nhập).
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given tồn tại hồ sơ gia phả của người đang sống chưa có tài khoản, When người đó đăng ký và xác minh, Then tài khoản được liên kết với hồ sơ hiện có thay vì tạo hồ sơ mới.

### 3.5. Nhắn tin riêng

**HNT-F-060 — Tìm kiếm thành viên và mở cuộc trò chuyện**
- Mô tả: Tìm kiếm thành viên theo tên, tên tài khoản hoặc số điện thoại nếu được phép; mở hồ sơ rồi chọn "Nhắn tin"; tạo cuộc trò chuyện riêng từ danh sách thành viên gia phả; nhắn tin cho người cùng dòng họ hoặc khác dòng họ nếu chính sách cho phép.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng tìm thấy thành viên theo tên, When chọn "Nhắn tin", Then cuộc trò chuyện riêng được mở.

**HNT-F-061 — Yêu cầu nhắn tin từ người lạ**
- Mô tả: Gửi tin nhắn cho người chưa kết bạn; người nhận nhận được yêu cầu nhắn tin ở trạng thái chờ và có thể chấp nhận (mở cuộc trò chuyện theo quyền riêng tư) hoặc từ chối/chặn.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given A gửi tin nhắn cho B chưa kết nối, When B mở yêu cầu, Then B thấy nội dung chờ và có các lựa chọn chấp nhận, từ chối hoặc chặn.

**HNT-F-062 — Giới hạn spam đối với tin nhắn người lạ**
- Mô tả: Tin nhắn từ người lạ bị giới hạn số lượng, không tự động cho phép gửi nhiều ảnh/video và không làm lộ trạng thái trực tuyến của người nhận.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người lạ đã gửi đủ số tin nhắn chờ tối đa, When gửi thêm, Then hệ thống chặn và thông báo đã đạt giới hạn.

**HNT-F-063 — Kết bạn**
- Mô tả: Gửi lời mời kết bạn (gửi thông báo, ngăn gửi lặp quá nhiều), chấp nhận lời mời (cập nhật trạng thái kết nối), từ chối (đóng yêu cầu, hạn chế gửi lại liên tục), hủy kết bạn.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given A gửi lời mời kết bạn cho B, When B chấp nhận, Then trạng thái hai người chuyển thành bạn bè.

**HNT-F-064 — Chặn và bỏ chặn người dùng**
- Mô tả: Chặn tài khoản để ngăn nhắn tin và tương tác theo chính sách; bỏ chặn để khôi phục khả năng liên hệ theo thiết lập.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given A đã chặn B, When B gửi tin nhắn cho A, Then tin nhắn không được gửi tới A.

**HNT-F-065 — Báo cáo tài khoản và nội dung vi phạm**
- Mô tả: Báo cáo hành vi quấy rối, spam, nội dung vi phạm; hệ thống ghi nhận lý do, dữ liệu liên quan và trạng thái xử lý.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng báo cáo một tài khoản quấy rối, When gửi báo cáo, Then báo cáo được ghi nhận với lý do và trạng thái "đang xử lý".

**HNT-F-066 — Tùy chỉnh cuộc trò chuyện riêng**
- Mô tả: Ghim tin nhắn quan trọng; đánh dấu chưa đọc; lưu tin nhắn; tùy chỉnh hình nền và tên gợi nhớ; tắt thông báo; lưu trữ hoặc xóa cuộc trò chuyện khỏi danh sách của mình (không mặc nhiên xóa dữ liệu phía bên kia); hiển thị trạng thái gửi/nhận/đọc theo thiết lập quyền riêng tư.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng xóa cuộc trò chuyện khỏi danh sách của mình, When kiểm tra phía người còn lại, Then cuộc trò chuyện và tin nhắn phía họ vẫn nguyên vẹn.

**HNT-F-067 — Chia sẻ hồ sơ và liên kết gia phả trong chat**
- Mô tả: Chia sẻ hồ sơ thành viên hoặc liên kết gia phả trong cuộc trò chuyện theo quyền cho phép.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng chia sẻ liên kết gia phả, When người nhận mở liên kết, Then chỉ xem được nội dung trong phạm vi quyền của mình.

### 3.6. Nhóm riêng "Gia đình tôi"

**HNT-F-068 — Tạo nhóm gia đình**
- Mô tả: Người dùng chọn "Tạo nhóm gia đình", đặt tên nhóm (ví dụ "Gia đình nhà Phụng"), chọn ảnh đại diện, mời thành viên từ danh bạ/dòng họ hoặc bằng liên kết mời, chọn quản trị viên, chọn quyền riêng tư và quyền thành viên.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng nhập tên nhóm và mời 4 thành viên, When xác nhận tạo, Then nhóm được tạo với đúng thành viên và người tạo là quản trị viên.

**HNT-F-069 — Tham gia nhiều nhóm gia đình**
- Mô tả: Một tài khoản có thể tham gia nhiều nhóm riêng (gia đình bên nội, bên ngoại, anh chị em ruột, nhóm chuẩn bị giỗ/cưới...).
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng đã ở 3 nhóm gia đình, When được mời vào nhóm thứ 4, Then tham gia thành công và xem được cả 4 nhóm.

**HNT-F-070 — Trò chuyện trong nhóm gia đình**
- Mô tả: Nhóm riêng sử dụng phần lớn tính năng của chat chung: tin nhắn, ảnh, video, tệp, ghi âm, reply, reaction, ghim, tìm kiếm; gọi thoại/video nếu hệ thống đã tích hợp.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given nhóm gia đình đang hoạt động, When thành viên gửi ảnh và reply một tin nhắn, Then các thành viên khác nhận được đầy đủ.

**HNT-F-071 — Album ảnh gia đình**
- Mô tả: Chia sẻ album ảnh gia đình trong nhóm riêng.
- Ưu tiên: Giai đoạn 2
- Tiêu chí nghiệm thu:
  - Given nhóm tạo album "Tết 2026", When thành viên thêm ảnh, Then ảnh được lưu vào album và hiển thị cho thành viên nhóm.

**HNT-F-072 — Bình chọn và lịch sự kiện trong nhóm**
- Mô tả: Tạo bình chọn, lịch sự kiện và nhắc lịch trong nhóm gia đình.
- Ưu tiên: Giai đoạn 2
- Tiêu chí nghiệm thu:
  - Given nhóm tạo bình chọn chọn ngày họp mặt, When thành viên bỏ phiếu, Then kết quả tổng hợp hiển thị cho cả nhóm.

**HNT-F-073 — Nhắc sinh nhật và ngày kỷ niệm**
- Mô tả: Thông báo sinh nhật, ngày kỷ niệm của thành viên trong nhóm.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given hôm nay là sinh nhật một thành viên nhóm, When đến ngày, Then nhóm nhận được thông báo chúc mừng sinh nhật.

**HNT-F-074 — Danh sách công việc chuẩn bị sự kiện**
- Mô tả: Chia sẻ danh sách công việc chuẩn bị giỗ, cưới hỏi hoặc họp mặt trong nhóm.
- Ưu tiên: Giai đoạn 2
- Tiêu chí nghiệm thu:
  - Given danh sách công việc chuẩn bị giỗ tổ, When thành viên đánh dấu hoàn thành một việc, Then trạng thái được cập nhật cho cả nhóm.

**HNT-F-075 — Chia sẻ khoản đóng góp/chi phí chung**
- Mô tả: Chia sẻ khoản đóng góp hoặc chi phí chung nếu có nhu cầu, với quyền xem rõ ràng.
- Ưu tiên: Giai đoạn 3
- Tiêu chí nghiệm thu:
  - Given một khoản đóng góp được tạo với quyền xem giới hạn, When thành viên ngoài phạm vi truy cập, Then không xem được chi tiết khoản đóng góp.

**HNT-F-076 — Quản lý nhóm gia đình**
- Mô tả: Quản lý thành viên và vai trò, tùy chỉnh thông báo và quyền riêng tư, lưu lịch sử thay đổi nhóm.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given quản trị viên xóa một thành viên khỏi nhóm, When hoàn tất, Then thành viên bị xóa không còn xem/gửi tin trong nhóm và lịch sử ghi nhận sự kiện.

**Lưu ý kiến trúc:** Nhóm gia đình là không gian giao tiếp, có thành viên được mời; gia phả thể hiện quan hệ huyết thống. Không giả định mọi thành viên nhóm chat đều cùng huyết thống (ví dụ con rể, con dâu). Thành viên nhóm không mặc nhiên được cấp quyền sửa gia phả hoặc xem hồ sơ riêng tư của toàn bộ dòng họ.

### 3.7. Trang chủ và bảng tin dòng họ

**HNT-F-077 — Đăng bài lên bảng tin**
- Mô tả: Đăng bài văn bản, ảnh, video và album lên bảng tin dòng họ. Bảng tin lưu nội dung lâu dài, có thể tìm lại; phòng chat chỉ dùng cho trao đổi nhanh — hai phân hệ không nhập làm một.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given thành viên có quyền đăng bài, When đăng bài kèm 3 ảnh, Then bài viết hiển thị trên bảng tin dòng họ.

**HNT-F-078 — Tương tác với bài viết**
- Mô tả: Bình luận, thả cảm xúc, chia sẻ bài viết trong phạm vi được phép.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given một bài viết trên bảng tin, When thành viên bình luận, Then bình luận hiển thị dưới bài viết cho người có quyền xem.

**HNT-F-079 — Ghim bài viết và thông báo quan trọng**
- Mô tả: Ghim bài và thông báo quan trọng lên đầu bảng tin.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người có quyền ghim, When ghim một bài thông báo, Then bài viết hiển thị cố định đầu bảng tin.

**HNT-F-080 — Phân loại bài viết**
- Mô tả: Phân loại bài viết: thông báo, hoạt động, tư liệu, kỷ niệm, tìm kiếm người thân.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given bài viết được gắn loại "tìm kiếm người thân", When lọc theo loại, Then bài viết xuất hiện trong kết quả lọc.

**HNT-F-081 — Giới hạn người xem bài viết**
- Mô tả: Giới hạn người xem theo dòng họ, nhánh gia đình hoặc nhóm riêng.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given bài viết giới hạn cho một nhánh gia đình, When thành viên ngoài nhánh truy cập, Then không xem được bài viết.

**HNT-F-082 — Báo cáo và quản lý nội dung vi phạm**
- Mô tả: Báo cáo bài viết vi phạm; quản trị viên quản lý, gỡ hoặc xử lý nội dung.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given bài viết bị nhiều thành viên báo cáo, When quản trị viên gỡ bài, Then bài viết không còn hiển thị trên bảng tin.

**HNT-F-083 — Lọc bài viết**
- Mô tả: Lọc bài theo người đăng, thời gian và loại nội dung.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given bảng tin có 50 bài viết, When lọc theo người đăng A, Then chỉ hiển thị bài của A.

**HNT-F-084 — Trang chủ tổng hợp "Hôm nay trong dòng họ"**
- Mô tả: Trang chủ cho biết ngay hôm nay gia đình có việc gì: tin mới từ dòng họ, sinh nhật và ngày kỷ niệm, nhắc sinh nhật/ngày giỗ/lễ mừng thọ trong phạm vi được phép xem, thông báo mới của ban quản lý, khoảnh khắc gia đình, sự kiện sắp tới và danh sách đăng ký tham gia. Không biến trang chủ thành mạng xã hội công khai.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given hôm nay có 1 sinh nhật và 1 sự kiện sắp tới trong dòng họ, When mở trang chủ, Then cả hai mục hiển thị trong phần tổng hợp.

**HNT-F-085 — Chia sẻ liên kết ra ứng dụng khác**
- Mô tả: Chia sẻ liên kết sự kiện, lời mời gia phả và bài viết qua ứng dụng khác.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given một sự kiện sắp diễn ra, When người dùng chia sẻ liên kết, Then liên kết mở được thông tin sự kiện ở ứng dụng khác.

### 3.8. Lịch sự kiện

**HNT-F-086 — Tạo sự kiện**
- Mô tả: Tạo sự kiện giỗ tổ, ngày giỗ, sinh nhật, họp họ, họp mặt; hiển thị ngày âm, ngày dương và múi giờ phù hợp; lưu địa điểm, người tổ chức, nội dung và tài liệu.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng tạo sự kiện giỗ tổ với ngày âm, When lưu, Then sự kiện hiển thị cả ngày âm và ngày dương tương ứng.

**HNT-F-087 — Lời mời, xác nhận tham dự và nhắc lịch**
- Mô tả: Gửi lời mời sự kiện, xác nhận tham dự, nhắc lịch trước sự kiện.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given sự kiện có 20 người được mời, When 12 người xác nhận tham dự, Then danh sách 12 người được ghi nhận và họ nhận nhắc lịch trước sự kiện.

**HNT-F-088 — Bình chọn thời gian/địa điểm sự kiện**
- Mô tả: Bình chọn thời gian hoặc địa điểm tổ chức sự kiện.
- Ưu tiên: Giai đoạn 2
- Tiêu chí nghiệm thu:
  - Given bình chọn chọn địa điểm họp họ với 3 phương án, When thành viên bỏ phiếu, Then phương án nhiều phiếu nhất được đánh dấu.

**HNT-F-089 — Lưu tư liệu sau sự kiện**
- Mô tả: Ghi nhận ảnh, biên bản và tư liệu sau mỗi sự kiện.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given sự kiện đã kết thúc, When ban tổ chức tải biên bản và ảnh, Then tư liệu được gắn với sự kiện và lưu trữ theo quyền.

### 3.9. Hệ thống thông báo

**HNT-F-090 — Thông báo đẩy và thông báo trong ứng dụng**
- Mô tả: Thông báo đẩy trên điện thoại, thông báo trong ứng dụng (và email tùy chọn) cho các sự kiện: tin nhắn mới, lời mời kết bạn, yêu cầu nhắn tin, được mời tham gia dòng họ/nhóm gia đình, có người yêu cầu tham gia dòng họ, sự kiện sắp diễn ra, ngày giỗ sắp đến, hồ sơ gia phả được cập nhật hoặc cần xác minh, thông báo quan trọng từ quản trị viên, phản hồi hoặc thay đổi trạng thái yêu cầu.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given có tin nhắn mới khi ứng dụng đang chạy nền, When tin nhắn đến, Then người dùng nhận được thông báo đẩy.

**HNT-F-091 — Tùy chỉnh thông báo**
- Mô tả: Người dùng tùy chỉnh âm thanh, giờ yên lặng, thông báo theo từng nhóm và tắt thông báo không cần thiết.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng bật giờ yên lặng 22:00–06:00, When có tin nhắn lúc 23:00, Then không phát âm thanh thông báo.

**HNT-F-092 — Chống gửi thông báo trùng lặp**
- Mô tả: Với sự kiện quan trọng, hệ thống chống gửi thông báo trùng lặp.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given một sự kiện nhắc lịch, When tiến trình nhắc chạy lại, Then mỗi người dùng chỉ nhận một thông báo cho cùng một sự kiện.

### 3.10. Quản trị và vận hành

**HNT-F-093 — Web quản trị**
- Mô tả: Trang web quản trị cho quản trị viên: duyệt thành viên, quản lý nội quy, thông báo, quyền nhóm và hỗ trợ xử lý sự cố.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given quản trị viên đăng nhập web quản trị, When mở danh sách chờ duyệt, Then xem và xử lý được các yêu cầu tham gia.

**HNT-F-094 — Nhật ký kiểm toán**
- Mô tả: Lưu nhật ký các thao tác quản trị, thay đổi gia phả quan trọng, cấp quyền quản trị và xử lý tranh chấp.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given quản trị viên cấp quyền quản trị cho thành viên, When hoàn tất, Then nhật ký ghi nhận người thực hiện, thời gian và nội dung thay đổi.

**HNT-F-095 — Sao lưu và khôi phục dữ liệu**
- Mô tả: Sao lưu định kỳ, kiểm thử khôi phục; có quy trình xử lý sự cố rò rỉ dữ liệu và thông báo cho người bị ảnh hưởng theo quy định áp dụng.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given bản sao lưu mới nhất, When thực hiện khôi phục thử nghiệm, Then dữ liệu được khôi phục đầy đủ trong thời gian cam kết.

**HNT-F-096 — Xử lý yêu cầu dữ liệu cá nhân**
- Mô tả: Quy trình yêu cầu tải xuống, sửa và xóa dữ liệu cá nhân; cơ chế xóa tài khoản. Việc xóa tài khoản không tự động xóa lịch sử gia phả của những người khác; cần chính sách xử lý dữ liệu liên quan.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given người dùng yêu cầu xóa tài khoản, When quy trình hoàn tất, Then dữ liệu cá nhân bị xóa theo chính sách và lịch sử gia phả của người khác được giữ lại.

**HNT-F-097 — Kiểm soát truy cập tệp lưu trữ**
- Mô tả: Tệp đính kèm được kiểm tra quyền truy cập; không sử dụng liên kết công khai vĩnh viễn cho tài liệu riêng tư; object storage dùng URL ký số và giới hạn truy cập.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given URL tệp riêng tư đã hết hạn ký, When truy cập URL, Then hệ thống từ chối.

**HNT-F-098 — Giới hạn chống spam**
- Mô tả: Giới hạn gửi tin nhắn, gửi lời mời và tải tệp; cơ chế chống spam và bảo vệ hệ thống.
- Ưu tiên: MVP
- Tiêu chí nghiệm thu:
  - Given tài khoản gửi vượt ngưỡng tin nhắn trong một phút, When tiếp tục gửi, Then hệ thống tạm chặn và thông báo.

---

## 4. Yêu cầu phi chức năng

### 4.1. Hiệu năng và kỹ thuật (HNT-N-001 – HNT-N-008)

**HNT-N-001 — Thời gian tải màn hình**
- Yêu cầu: P95 thời gian tải màn hình thông thường không quá 2,5 giây trên mạng ổn định.
- Cách đo: đo trong môi trường kiểm thử thực tế, trên các màn hình mục tiêu.

**HNT-N-002 — Độ trễ tin nhắn văn bản**
- Yêu cầu: P95 thời gian hiển thị tin nhắn văn bản tại thiết bị người nhận không quá 1 giây khi kết nối ổn định.

**HNT-N-003 — Phân trang và tải lười**
- Yêu cầu: Danh sách thành viên phân trang, không tải toàn bộ một lần; cây gia phả lớn tải theo nhánh/thế hệ, không dựng tất cả nút cùng lúc.

**HNT-N-004 — Tối ưu media**
- Yêu cầu: Ảnh và video được nén hoặc tạo bản xem trước (thumbnail) phù hợp trước khi hiển thị/gửi.

**HNT-N-005 — Bền vững và chống trùng tin nhắn**
- Yêu cầu: Tin nhắn được lưu bền vững trước khi báo gửi thành công; có cơ chế thử gửi lại khi mạng gián đoạn và chống tạo tin nhắn trùng khi mạng chập chờn.

**HNT-N-006 — Giám sát vận hành**
- Yêu cầu: Có giám sát lỗi (crash reporting), log tập trung, theo dõi thời gian phản hồi, tỷ lệ gửi thông báo thành công và cảnh báo vận hành.

**HNT-N-007 — Kiến trúc và khả năng mở rộng**
- Yêu cầu: Ứng dụng di động đa nền tảng (Android, iOS) dùng chung backend; có web quản trị; hỗ trợ realtime cho chat, trạng thái và thông báo; kiến trúc cho phép mở rộng khi tăng số dòng họ, thành viên và tin nhắn.

**HNT-N-008 — Sao lưu và khôi phục**
- Yêu cầu: Sao lưu định kỳ, kiểm thử khôi phục; lưu nhật ký hoạt động quản trị.

### 4.2. Bảo mật và quyền riêng tư (HNT-N-009 – HNT-N-018)

**HNT-N-009 — Mã hóa kết nối và lưu trữ**
- Yêu cầu: Mã hóa kết nối bằng HTTPS/TLS; mã hóa khi truyền và khi lưu trữ đối với dữ liệu nhạy cảm; quản lý khóa an toàn. (MVP: chưa bắt buộc mã hóa đầu cuối; xem HNT-N-016.)

**HNT-N-010 — Phân quyền tại backend/database**
- Yêu cầu: Phân quyền truy cập theo tài khoản, dòng họ, nhóm và từng loại dữ liệu; kiểm tra quyền tại backend và database. Không được chỉ ẩn chức năng trên giao diện để bảo vệ dữ liệu.

**HNT-N-011 — Chống đoán ID**
- Yêu cầu: Không cho phép đoán ID hồ sơ để đọc dữ liệu riêng tư của người khác (ID không liệt kê được, mọi truy cập đều kiểm tra quyền).

**HNT-N-012 — Bảo vệ tin nhắn riêng**
- Yêu cầu: Tin nhắn riêng không được hiển thị cho quản trị viên dòng họ qua giao diện quản trị; quản trị viên không mặc nhiên được đọc tin nhắn riêng tư của thành viên.

**HNT-N-013 — Bảo vệ tệp đính kèm**
- Yêu cầu: Tệp đính kèm phải được kiểm tra quyền truy cập; không sử dụng liên kết công khai vĩnh viễn cho tài liệu riêng tư.

**HNT-N-014 — Quyền dữ liệu cá nhân**
- Yêu cầu: Có quy trình yêu cầu tải xuống, sửa và xóa dữ liệu cá nhân; có chính sách quyền riêng tư, điều khoản sử dụng và hướng dẫn người dùng.

**HNT-N-015 — Chống lạm dụng và báo cáo**
- Yêu cầu: Có cơ chế báo cáo người dùng, spam, quấy rối và nội dung vi phạm; có giới hạn gửi tin nhắn, gửi lời mời và tải tệp.

**HNT-N-016 — Lộ trình mã hóa đầu cuối**
- Yêu cầu: Giai đoạn nâng cao cân nhắc mã hóa đầu cuối (E2EE) cho tin nhắn, trong đó chỉ thiết bị của những người tham gia có thể giải mã. Nếu triển khai, phải thiết kế từ đầu cho sao lưu, tìm kiếm, đồng bộ nhiều thiết bị và khôi phục tài khoản.

**HNT-N-017 — Dữ liệu người đã mất**
- Yêu cầu: Dữ liệu của người đã mất có thể chứa thông tin của người còn sống; việc được phép thêm thông tin tổ tiên không đồng nghĩa được quyền công khai số điện thoại, địa chỉ hoặc hồ sơ riêng tư của toàn bộ hậu duệ. Cần xác định rõ người quản lý dữ liệu và cơ chế xử lý tranh chấp.

**HNT-N-018 — Nhật ký truy cập quyền nhạy cảm**
- Yêu cầu: Các quyền nhạy cảm được kiểm soát và ghi nhật ký truy cập; các thay đổi nhạy cảm, xóa dữ liệu quan trọng, cấp quyền quản trị và xử lý tranh chấp phải có nhật ký kiểm toán.

---

## 5. Phạm vi MVP

Checklist 21 hạng mục theo đặc tả v1.1, mỗi hạng mục ánh xạ tới mã yêu cầu HNT-F.

| # | Hạng mục MVP | Mã yêu cầu |
|---|---|---|
| 1 | Đăng ký, đăng nhập, khôi phục tài khoản | HNT-F-001, HNT-F-002, HNT-F-004, HNT-F-005 |
| 2 | Tạo dòng họ, mời tham gia và duyệt thành viên | HNT-F-099, HNT-F-006, HNT-F-007, HNT-F-008, HNT-F-009 |
| 3 | Quản lý vai trò và quyền riêng tư | HNT-F-008, HNT-F-021, HNT-F-055, HNT-F-010 |
| 4 | Tạo cây nhiều thế hệ | HNT-F-011, HNT-F-012, HNT-F-013 |
| 5 | Hồ sơ thành viên và quan hệ gia đình | HNT-F-014, HNT-F-024 |
| 6 | Đề xuất sửa, xác minh, phát hiện trùng | HNT-F-016, HNT-F-017, HNT-F-018 |
| 7 | Lịch sử chỉnh sửa và tìm kiếm | HNT-F-019, HNT-F-015 |
| 8 | Phòng chat chung bằng văn bản | HNT-F-025, HNT-F-026, HNT-F-031 – HNT-F-040, HNT-F-041 – HNT-F-048, HNT-F-050, HNT-F-051 |
| 9 | Chat riêng và yêu cầu nhắn tin từ người lạ | HNT-F-060, HNT-F-061, HNT-F-062 |
| 10 | Nhóm Gia đình tôi | HNT-F-068, HNT-F-069, HNT-F-070, HNT-F-073, HNT-F-076 |
| 11 | Gửi ảnh/tệp, reply, reaction và ghim | HNT-F-027, HNT-F-029, HNT-F-031, HNT-F-033, HNT-F-037 |
| 12 | Chặn, báo cáo và giới hạn spam | HNT-F-063, HNT-F-064, HNT-F-065, HNT-F-098 |
| 13 | Bảng tin dòng họ | HNT-F-077 – HNT-F-083 |
| 14 | Lịch sinh nhật, ngày giỗ và sự kiện | HNT-F-023, HNT-F-084, HNT-F-086, HNT-F-087, HNT-F-089 |
| 15 | Thông báo trong ứng dụng và push | HNT-F-090, HNT-F-091, HNT-F-092 |
| 16 | Chia sẻ lời mời qua ứng dụng khác | HNT-F-006, HNT-F-085 |
| 17 | Web quản trị | HNT-F-093 |
| 18 | Nhật ký thao tác quan trọng | HNT-F-094 |
| 19 | Kiểm soát truy cập và lưu trữ tệp | HNT-N-007, HNT-N-010, HNT-F-097 |
| 20 | Sao lưu, khôi phục và xử lý yêu cầu dữ liệu | HNT-F-095, HNT-F-096 |
| 21 | Kiểm thử khả năng sử dụng với người lớn tuổi | HNT-P-xxx (xem Test Plan) |

Điều kiện chuyển sang Giai đoạn 2: sau khi MVP được kiểm thử và có người dùng thực tế, mới ưu tiên tin nhắn thoại, tìm kiếm nâng cao, gọi thoại/video, nhập/xuất Excel/PDF/GEDCOM hoàn thiện, đồng bộ đa thiết bị, album/bình chọn/quản lý sự kiện nâng cao và mã hóa đầu cuối.

---

## 6. Ma trận truy vết

Ánh xạ mỗi yêu cầu HNT-F tới mã/tiểu mục trong đặc tả gốc.

| Mã PRD | Tên yêu cầu | Nguồn đặc tả |
|---|---|---|
| HNT-F-001 | Đăng ký bằng số điện thoại và OTP | §5.1 |
| HNT-F-002 | Đăng ký/đăng nhập bằng email | §5.1 |
| HNT-F-003 | Đăng nhập bằng Google/Apple | §5.1 |
| HNT-F-004 | Khôi phục tài khoản | §5.1, §5.2 |
| HNT-F-005 | Quản lý phiên đăng nhập | §5.1 |
| HNT-F-006 | Mời tham gia dòng họ bằng liên kết/mã QR | §5.2, v1.1 §2.1 |
| HNT-F-099 | Tạo dòng họ mới | §5.2, AT-01 |
| HNT-F-007 | Gửi yêu cầu tham gia dòng họ | §5.2 |
| HNT-F-008 | Duyệt yêu cầu tham gia và phân quyền | §5.2, §4 |
| HNT-F-009 | Một tài khoản tham gia nhiều dòng họ | §2, §4, v1.1 §5.2 |
| HNT-F-010 | Hỗ trợ người thân thiết lập tài khoản | v1.1 §2.3 |
| HNT-F-011 | Tạo gia phả mới | GP-01 |
| HNT-F-012 | Hiển thị cây gia phả nhiều thế hệ | GP-02 |
| HNT-F-013 | Quản lý quan hệ gia đình | GP-03 |
| HNT-F-014 | Hồ sơ thành viên trong gia phả | GP-04, §3.1.C |
| HNT-F-015 | Tìm kiếm trong gia phả | GP-05 |
| HNT-F-016 | Đề xuất thêm/sửa dữ liệu theo quyền | GP-06, v1.1 §2.2 |
| HNT-F-017 | Xác minh và xử lý mâu thuẫn/tranh chấp | GP-07, v1.1 §2.2 |
| HNT-F-018 | Phát hiện hồ sơ có khả năng trùng | GP-08 |
| HNT-F-019 | Lịch sử chỉnh sửa gia phả | GP-09 |
| HNT-F-020 | Nhập và xuất dữ liệu gia phả | GP-10 |
| HNT-F-021 | Phân quyền gia phả | GP-11 |
| HNT-F-022 | Kho tư liệu gia phả | GP-12 |
| HNT-F-023 | Sự kiện gia phả (ngày giỗ, sinh, mất) | §3.1.D |
| HNT-F-024 | Trạng thái xác minh của hồ sơ | v1.1 §3.2 |
| HNT-F-025 | Tin nhắn văn bản theo thời gian thực | CHAT-01 |
| HNT-F-026 | Emoji và biểu tượng cảm xúc | CHAT-02 |
| HNT-F-027 | Gửi và xem ảnh | CHAT-03 |
| HNT-F-028 | Gửi và phát video | CHAT-04 |
| HNT-F-029 | Tệp đính kèm | CHAT-05 |
| HNT-F-030 | Tin nhắn thoại | CHAT-06 |
| HNT-F-031 | Trả lời tin nhắn | CHAT-07 |
| HNT-F-032 | Chuyển tiếp tin nhắn | CHAT-08 |
| HNT-F-033 | Thả cảm xúc (reaction) | CHAT-09 |
| HNT-F-034 | Sửa tin nhắn | CHAT-10 |
| HNT-F-035 | Thu hồi tin nhắn | CHAT-11 |
| HNT-F-036 | Xóa tin nhắn | CHAT-12 |
| HNT-F-037 | Ghim tin nhắn | CHAT-13 |
| HNT-F-038 | Tìm kiếm trong chat | CHAT-14 |
| HNT-F-039 | Trạng thái gửi/nhận/đọc | CHAT-15 |
| HNT-F-040 | Trích dẫn ngữ cảnh tin nhắn | CHAT-16 |
| HNT-F-041 | Cấu hình phòng chat dòng họ | §3.2.B |
| HNT-F-042 | Mời thành viên qua liên kết mời | §3.2.B |
| HNT-F-043 | Gán quản trị viên và phó quản trị viên | §3.2.B |
| HNT-F-044 | Cấu hình quyền trong nhóm chat | §3.2.B |
| HNT-F-045 | Tắt thông báo và chế độ tin quan trọng | §3.2.B |
| HNT-F-046 | Xử lý thành viên vi phạm | §3.2.B |
| HNT-F-047 | Xem tệp, ảnh, video và liên kết đã chia sẻ | §3.2.B |
| HNT-F-048 | Thông báo biến động nhóm và lịch sử thay đổi | §3.2.B |
| HNT-F-049 | Bình chọn trong nhóm chat | §3.2.C |
| HNT-F-050 | Sự kiện trong nhóm chat | §3.2.C |
| HNT-F-051 | Thông báo quan trọng từ quản trị viên | §3.2.C |
| HNT-F-052 | Gọi thoại/video nhóm | §3.2.C, v1.1 §3.4 |
| HNT-F-053 | Xem danh sách thành viên dòng họ | §3.3.A |
| HNT-F-054 | Tìm kiếm và lọc thành viên | §3.3.A |
| HNT-F-055 | Hồ sơ thành viên theo quyền riêng tư | §3.3.C |
| HNT-F-056 | Nhắn tin và kết bạn từ danh bạ | §3.3.A |
| HNT-F-057 | Xem quan hệ gia phả của thành viên | §3.3.A |
| HNT-F-058 | Đề xuất bổ sung/sửa và báo cáo hồ sơ | §3.3.A |
| HNT-F-059 | Liên kết tài khoản với hồ sơ gia phả | §3.3.B, v1.1 §3.3 |
| HNT-F-060 | Tìm kiếm thành viên và mở cuộc trò chuyện | §3.4.A, v1.1 §3.5 |
| HNT-F-061 | Yêu cầu nhắn tin từ người lạ | §3.4.A, v1.1 §3.5 |
| HNT-F-062 | Giới hạn spam đối với tin nhắn người lạ | §3.4.A, v1.1 §3.5 |
| HNT-F-063 | Kết bạn | §3.4.C |
| HNT-F-064 | Chặn và bỏ chặn người dùng | §3.4.A, §3.4.C |
| HNT-F-065 | Báo cáo tài khoản và nội dung vi phạm | §3.4.A, §3.4.C |
| HNT-F-066 | Tùy chỉnh cuộc trò chuyện riêng | §3.4.B |
| HNT-F-067 | Chia sẻ hồ sơ và liên kết gia phả trong chat | §3.4.B |
| HNT-F-068 | Tạo nhóm gia đình | §3.5.A, v1.1 §3.6 |
| HNT-F-069 | Tham gia nhiều nhóm gia đình | §3.5.A |
| HNT-F-070 | Trò chuyện trong nhóm gia đình | §3.5.B |
| HNT-F-071 | Album ảnh gia đình | §3.5.B |
| HNT-F-072 | Bình chọn và lịch sự kiện trong nhóm | §3.5.B |
| HNT-F-073 | Nhắc sinh nhật và ngày kỷ niệm | §3.5.B |
| HNT-F-074 | Danh sách công việc chuẩn bị sự kiện | §3.5.B |
| HNT-F-075 | Chia sẻ khoản đóng góp/chi phí chung | §3.5.B |
| HNT-F-076 | Quản lý nhóm gia đình | §3.5.B, v1.1 §3.6 |
| HNT-F-077 | Đăng bài lên bảng tin | §3.6, v1.1 §3.7 |
| HNT-F-078 | Tương tác với bài viết | §3.6 |
| HNT-F-079 | Ghim bài viết và thông báo quan trọng | §3.6 |
| HNT-F-080 | Phân loại bài viết | §3.6 |
| HNT-F-081 | Giới hạn người xem bài viết | §3.6 |
| HNT-F-082 | Báo cáo và quản lý nội dung vi phạm | §3.6 |
| HNT-F-083 | Lọc bài viết | §3.6 |
| HNT-F-084 | Trang chủ tổng hợp "Hôm nay trong dòng họ" | §3.6 |
| HNT-F-085 | Chia sẻ liên kết ra ứng dụng khác | v1.1 §2.1, v1.1 §3.7 |
| HNT-F-086 | Tạo sự kiện | §3.1.D, v1.1 §3.8 |
| HNT-F-087 | Lời mời, xác nhận tham dự và nhắc lịch | §3.1.D, v1.1 §3.8 |
| HNT-F-088 | Bình chọn thời gian/địa điểm sự kiện | v1.1 §3.8 |
| HNT-F-089 | Lưu tư liệu sau sự kiện | §3.1.D, v1.1 §3.8 |
| HNT-F-090 | Thông báo đẩy và thông báo trong ứng dụng | §3.7, v1.1 §3.10 |
| HNT-F-091 | Tùy chỉnh thông báo | §3.7 |
| HNT-F-092 | Chống gửi thông báo trùng lặp | §3.7 |
| HNT-F-093 | Web quản trị | §8 MVP, §6.1 |
| HNT-F-094 | Nhật ký kiểm toán | §4, §7.1 |
| HNT-F-095 | Sao lưu và khôi phục dữ liệu | §7.1 |
| HNT-F-096 | Xử lý yêu cầu dữ liệu cá nhân | §7.1, v1.1 §5.2 |
| HNT-F-097 | Kiểm soát truy cập tệp lưu trữ | §7.1 |
| HNT-F-098 | Giới hạn chống spam | §7.1 |

Yêu cầu phi chức năng truy vết: HNT-N-001 – HNT-N-008 → §6.3, v1.1 §5.3; HNT-N-009 – HNT-N-018 → §7.1, §7.2, v1.1 §4.

---

## 7. Ngoài phạm vi

Các mục sau không thuộc phạm vi PRD này (thuộc Giai đoạn 2/3 hoặc bị loại trừ theo đặc tả):

- Mã hóa đầu cuối (E2EE) cho tin nhắn trong MVP — xem lộ trình tại HNT-N-016.
- Tự xây dựng hạ tầng gọi thoại/video; gọi nhóm quy mô lớn.
- Đồng bộ tin nhắn, danh bạ hoặc lịch sử chat từ Zalo hoặc ứng dụng nhắn tin khác; thu thập dữ liệu tài khoản Zalo.
- Biến trang chủ/bảng tin thành mạng xã hội công khai cạnh tranh về nội dung giải trí.
- Lưu trữ tư liệu gia tộc dài hạn chuyên sâu và lịch sử chỉnh sửa chuyên sâu (giai đoạn 3).
- Các tiện ích đóng góp quỹ, tổ chức họp họ và quản lý hoạt động dòng họ ở quy mô đầy đủ (giai đoạn 3, trừ HNT-F-075 ở mức cơ bản).
- Cam kết tiến độ phát triển cụ thể — thời gian thực hiện được ước lượng sau khi chốt nền tảng, nhân lực, yêu cầu bảo mật và tiêu chí nghiệm thu.

---

## 8. Thuật ngữ

| Thuật ngữ | Giải nghĩa |
|---|---|
| Dòng họ (lineage) | Cộng đồng các thành viên có chung nguồn gốc họ hàng trên ứng dụng; mỗi dòng họ có dữ liệu, thành viên và quản trị riêng. |
| Chi / nhánh | Đơn vị phân chia bên trong một dòng họ (ví dụ: chi trưởng, nhánh miền Nam). |
| Gia phả | Cây dữ liệu có cấu trúc ghi nhận các thế hệ, quan hệ huyết thống và hôn nhân của một dòng họ. |
| Thành viên gia phả | Người được ghi nhận trong cây gia phả; có thể chưa sử dụng ứng dụng (ví dụ: người đã mất). |
| Tài khoản ứng dụng | Danh tính đăng nhập của người dùng; tách biệt với hồ sơ gia phả. |
| Người quản lý gia phả | Vai trò được cấp quyền thêm/sửa quan hệ và hồ sơ trong phạm vi được giao. |
| Quản trị viên dòng họ | Vai trò duyệt thành viên, quản lý nội quy, thông báo và quyền nhóm của một dòng họ. |
| Phòng chat dòng họ | Phòng chat chung mặc định của một dòng họ, dành cho thành viên đã được chấp thuận. |
| Nhóm "Gia đình tôi" | Nhóm chat riêng của một gia đình nhỏ bên trong dòng họ; thành viên được mời, không đồng nhất với quan hệ huyết thống. |
| Bảng tin dòng họ | Nơi đăng thông báo, bài viết, ảnh hoạt động có thể tìm lại lâu dài; khác với phòng chat (trao đổi nhanh, tin nhắn trôi theo thời gian). |
| Kho tư liệu | Nơi lưu ảnh, video, giấy tờ và tài liệu quan trọng của gia đình/dòng họ. |
| OTP | Mật khẩu dùng một lần gửi qua SMS để xác thực số điện thoại. |
| GEDCOM | Định dạng trao đổi dữ liệu gia phả tiêu chuẩn. |
| E2EE | Mã hóa đầu cuối — chỉ thiết bị của người tham gia mới giải mã được nội dung. |
| P95 | Phân vị 95 — 95% số lần đo đạt hoặc tốt hơn ngưỡng. |
| Audit log | Nhật ký kiểm toán ghi nhận thao tác quan trọng: ai làm gì, khi nào. |

---

*Hết tài liệu PRD.*

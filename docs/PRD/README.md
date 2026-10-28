# HỌ NHÀ TÔI

Ứng dụng gia phả số và kết nối gia đình — lưu giữ cội nguồn, kết nối họ hàng qua nhiều thế hệ.

## Tầm nhìn

- **Gia phả số**: cây gia phả nhiều thế hệ, hồ sơ thành viên, ngày giỗ, tư liệu gia đình.
- **Cộng đồng dòng họ**: bảng tin, phòng chat, sự kiện, danh bạ thành viên.
- **Mạng xã hội gia đình**: chat riêng, nhóm "Gia đình tôi", chia sẻ ảnh/video.

Nguyên tắc xuyên suốt: ưu tiên người lớn tuổi, riêng tư theo mặc định, không bắt buộc thay thế Zalo.

## Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [00-Index](docs/PRD/00-Index.md) | Tổng mục, quy ước mã yêu cầu |
| [PRD](docs/PRD/01-PRD/PRD.md) | 99 yêu cầu chức năng (HNT-F-001–099) + 18 phi chức năng (HNT-N-001–018), tiêu chí nghiệm thu Given–When–Then |
| [UI/UX](docs/PRD/02-UI-UX/UIUX-Spec.md) | 16 màn hình (HNT-U-001–016), 5 luồng thao tác |
| [Kỹ thuật](docs/PRD/03-KyThuat/Technical-Spec.md) | Kiến trúc, sơ đồ CSDL, API, realtime (HNT-T-001–027) |
| [Bảo mật](docs/PRD/04-BaoMat/Security-Matrix.md) | Ma trận phân quyền 7 vai trò, chính sách dữ liệu (HNT-S-001–015) |
| [Test Plan](docs/PRD/05-TestPlan/Test-Plan.md) | 78 test case (HNT-P-001–078): chức năng, hiệu năng, bảo mật, usability |

## Công nghệ đề xuất (theo đặc tả)

- Mobile: Flutter hoặc React Native · Web quản trị: Next.js
- Backend: NestJS (hoặc BaaS) · CSDL: PostgreSQL · Realtime: WebSocket
- Push: FCM/APNs · Lưu trữ: Object Storage (signed URL)

## Trạng thái

Tài liệu đặc tả hoàn tất (2026-10-22). Triển khai theo 3 giai đoạn: MVP → hoàn thiện → mở rộng (xem PRD mục 5).

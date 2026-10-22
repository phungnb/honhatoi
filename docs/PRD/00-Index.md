# HO-NHA-TÔI — Khung bộ tài liệu PRD

> **Trạng thái:** ✅ Hoàn tất ngày 2026-10-22 — 5 tài liệu đã được điền đầy đủ từ đặc tả gốc (Google Doc "ĐẶC TẢ" trong thư mục Drive HO-NHA-TOI).

## Bản đồ tài liệu

| # | Thư mục / file | Nội dung |
|---|---|---|
| 00 | `00-Index.md` (file này) | Khung chung, quy ước mã yêu cầu, tiêu chí nghiệm thu |
| 01 | `01-PRD/PRD.md` | PRD: yêu cầu chức năng + phi chức năng, mã yêu cầu & tiêu chí nghiệm thu từng chức năng |
| 02 | `02-UI-UX/UIUX-Spec.md` | Đặc tả UI/UX cho từng màn hình và luồng thao tác |
| 03 | `03-KyThuat/Technical-Spec.md` | Đặc tả kỹ thuật: kiến trúc, sơ đồ database, API |
| 04 | `04-BaoMat/Security-Matrix.md` | Ma trận phân quyền, bảo mật, chính sách xử lý dữ liệu |
| 05 | `05-TestPlan/Test-Plan.md` | Test Plan: chức năng, hiệu năng, bảo mật, khả năng sử dụng |

## Quy ước mã yêu cầu

| Nhóm | Tiền tố | Ví dụ |
|---|---|---|
| Chức năng | `HNT-F` | HNT-F-001 |
| Phi chức năng (trong PRD) | `HNT-N` | HNT-N-001 |
| UI/UX | `HNT-U` | HNT-U-001 |
| Kỹ thuật | `HNT-T` | HNT-T-001 |
| Bảo mật | `HNT-S` | HNT-S-001 |
| Kiểm thử | `HNT-P` | HNT-P-001 |

Mỗi yêu cầu bắt buộc có **tiêu chí nghiệm thu (Acceptance Criteria)** viết theo dạng Given–When–Then, có thể kiểm chứng được.

## Lịch sử hoàn thành

- 2026-10-22 09:38 — Dựng khung 5 tài liệu (chờ đặc tả gốc).
- 2026-10-22 10:05 — Đọc đặc tả gốc từ Google Drive (Doc "ĐẶC TẢ", thư mục HO-NHA-TOI); điền đầy đủ 5 tài liệu; rà soát nhất quán mã yêu cầu toàn bộ (HNT-F-001–099, HNT-N-001–018, HNT-U-001–016, HNT-T-001–027, HNT-S-001–015, HNT-P-001–078, nhóm HNT-FG-001–030).

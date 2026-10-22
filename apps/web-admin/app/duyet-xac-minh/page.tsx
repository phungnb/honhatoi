"use client";

import { useState } from "react";

type ProposalStatus = "cho-duyet" | "da-duyet" | "tu-choi";

interface Proposal {
  id: string;
  loai: "Thêm thành viên" | "Sửa hồ sơ";
  dongHo: string;
  nguoiDeXuat: string;
  noiDung: string;
  thoiGian: string;
}

// TODO: thay dữ liệu mẫu bằng API backend (GET /admin/de-xuat-xac-minh?trang_thai=cho-duyet)
const MOCK: Proposal[] = [
  {
    id: "DX-001",
    loai: "Thêm thành viên",
    dongHo: "Họ Nguyễn tại Đồng Nai",
    nguoiDeXuat: "Nguyễn Văn Hùng",
    noiDung: "Thêm «Trần Thị Cúc» — vợ ông Nguyễn Văn Bình, đời thứ 2",
    thoiGian: "22/10/2026 09:15",
  },
  {
    id: "DX-002",
    loai: "Sửa hồ sơ",
    dongHo: "Họ Nguyễn tại Đồng Nai",
    nguoiDeXuat: "Nguyễn Thị Lan",
    noiDung: "Sửa năm sinh của «Minh Anh» từ 2019 thành 2020",
    thoiGian: "22/10/2026 08:47",
  },
  {
    id: "DX-003",
    loai: "Thêm thành viên",
    dongHo: "Họ Trần tại TP.HCM",
    nguoiDeXuat: "Trần Văn Hải",
    noiDung: "Thêm «Trần Gia Huy» — con ông Trần Văn Hải, đời thứ 3",
    thoiGian: "21/10/2026 20:03",
  },
];

const STATUS_BADGE: Record<ProposalStatus, { label: string; cls: string }> = {
  "cho-duyet": { label: "Chờ duyệt", cls: "warm" },
  "da-duyet": { label: "Đã duyệt", cls: "brand" },
  "tu-choi": { label: "Đã từ chối", cls: "danger" },
};

export default function DuyetXacMinhPage() {
  const [statuses, setStatuses] = useState<Record<string, ProposalStatus>>({});

  // TODO: gọi API backend POST /admin/de-xuat-xac-minh/:id/duyet
  // và POST /admin/de-xuat-xac-minh/:id/tu-choi, sau đó tải lại danh sách
  const setStatus = (id: string, s: ProposalStatus) =>
    setStatuses((prev) => ({ ...prev, [id]: s }));

  const pendingCount = MOCK.filter(
    (p) => (statuses[p.id] ?? "cho-duyet") === "cho-duyet"
  ).length;

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Duyệt xác minh gia phả</h1>
        <p className="page-desc">
          Xét duyệt các đề xuất thêm hoặc sửa thành viên trong cây gia phả.{" "}
          <strong style={{ color: "var(--brand)" }}>
            {pendingCount} đề xuất đang chờ.
          </strong>
        </p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Loại</th>
              <th>Dòng họ</th>
              <th>Người đề xuất</th>
              <th>Nội dung</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {MOCK.map((p) => {
              const st = statuses[p.id] ?? "cho-duyet";
              const badge = STATUS_BADGE[st];
              return (
                <tr key={p.id}>
                  <td style={{ color: "var(--muted)" }}>{p.id}</td>
                  <td>
                    <span className="badge info">{p.loai}</span>
                  </td>
                  <td>{p.dongHo}</td>
                  <td>{p.nguoiDeXuat}</td>
                  <td style={{ minWidth: 260 }}>{p.noiDung}</td>
                  <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {p.thoiGian}
                  </td>
                  <td>
                    <span className={`badge ${badge.cls}`}>{badge.label}</span>
                  </td>
                  <td>
                    {st === "cho-duyet" ? (
                      <div className="btn-row">
                        <button
                          className="btn primary"
                          onClick={() => setStatus(p.id, "da-duyet")}
                        >
                          Duyệt
                        </button>
                        <button
                          className="btn danger-outline"
                          onClick={() => setStatus(p.id, "tu-choi")}
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : (
                      <span className="muted-text">Đã xử lý</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="muted-text section-gap">
        Ghi chú: mọi lượt duyệt hoặc từ chối đều được ghi vào nhật ký kiểm
        toán cùng người thực hiện và thời gian.
      </p>
    </>
  );
}

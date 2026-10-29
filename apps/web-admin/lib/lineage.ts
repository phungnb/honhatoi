"use client";

/**
 * Dòng họ đang xem — dùng chung cho mọi tab của không gian con cháu
 * (Trang chủ, Gia phả…). Chọn họ ở tab nào thì tab khác theo; lựa chọn
 * nhớ trong trình duyệt.
 */

import { useCallback, useEffect, useState } from "react";
import { get } from "@/lib/api";
import type { MyLineage } from "@/lib/roles";

const KEY = "hnt_lineage_id";

function readSaved(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function useLineages() {
  const [lineages, setLineages] = useState<MyLineage[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [loading, setLoading] = useState(true);
  /** "unauthorized" khi chưa đăng nhập; câu lỗi khi lỗi khác. */
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const b = await get<{ data?: { lineages?: MyLineage[] } }>("/lineages?limit=100");
      const list = b?.data?.lineages ?? [];
      setLineages(list);
      const saved = readSaved();
      setCurrentId(list.some((l) => l.id === saved) ? saved : list[0]?.id ?? "");
      setError(null);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setError(m.includes("API 401") ? "unauthorized" : `Không tải được danh sách dòng họ: ${m}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const select = useCallback((id: string) => {
    setCurrentId(id);
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      // trình duyệt chặn lưu — vẫn chọn được trong phiên này
    }
  }, []);

  const current = lineages.find((l) => l.id === currentId) ?? null;
  return { lineages, current, select, loading, error, reload };
}

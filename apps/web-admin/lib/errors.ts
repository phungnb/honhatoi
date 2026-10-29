/** Lấy câu thông báo tiếng Việt từ lỗi "API 4xx: {json}" của lib/api.ts. */
export function apiMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const json = raw.replace(/^API \d+: /, "");
  try {
    const body = JSON.parse(json) as {
      message?: string | string[];
      error?: { message?: string };
    };
    const msg = body?.error?.message ?? body?.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (msg) return msg;
  } catch {
    // không phải JSON — trả nguyên văn
  }
  return raw;
}

/**
 * Nén ảnh trong trình duyệt trước khi gửi: cạnh dài tối đa 1600 px, JPEG
 * chất lượng 0,82 — ảnh điện thoại 4–8 MB còn khoảng 200–500 KB, vừa giới
 * hạn 4 MB của máy chủ và đỡ tốn dung lượng mạng của các cụ.
 * GIF giữ nguyên (ảnh động). Ảnh xoay theo EXIF được dựng đúng chiều.
 */

export interface AnhDaNen {
  blob: Blob;
  width: number;
  height: number;
  type: string;
}

const MAX_SIDE = 1600;
export const MAX_BYTES = 4 * 1024 * 1024;

export async function nenAnh(file: File): Promise<AnhDaNen> {
  if (file.type === "image/gif" && file.size <= MAX_BYTES) {
    const bmp = await createImageBitmap(file).catch(() => null);
    return { blob: file, width: bmp?.width ?? 0, height: bmp?.height ?? 0, type: "image/gif" };
  }
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Không đọc được ảnh này (định dạng chưa hỗ trợ). Hãy chọn ảnh JPG hoặc PNG.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không xử lý được ảnh");
  ctx.fillStyle = "#fff"; // nền trắng cho ảnh PNG trong suốt khi đổi sang JPEG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
  if (!blob) throw new Error("Không nén được ảnh");
  if (blob.size > MAX_BYTES) throw new Error("Ảnh quá lớn sau khi nén (trên 4 MB)");
  return { blob, width: w, height: h, type: "image/jpeg" };
}

/**
 * Ảnh chân dung cho cây gia phả: cắt vuông giữa ảnh, 512×512, JPEG 0,85.
 * Khung tròn trên cây chỉ 64 px nên ảnh nhỏ là đủ nét, tải nhanh trên 3G.
 */
export async function nenChanDung(file: File): Promise<Blob> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Không đọc được ảnh này (định dạng chưa hỗ trợ). Hãy chọn ảnh JPG hoặc PNG.");
  }
  const side = Math.min(bmp.width, bmp.height);
  // Ảnh dọc (chân dung): lấy phần trên nhiều hơn để không cắt mất đầu.
  const sx = (bmp.width - side) / 2;
  const sy = bmp.height > bmp.width ? (bmp.height - side) * 0.25 : 0;
  const out = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không xử lý được ảnh");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out, out);
  ctx.drawImage(bmp, sx, sy, side, side, 0, 0, out, out);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("Không nén được ảnh");
  return blob;
}

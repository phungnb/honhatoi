import type { MetadataRoute } from "next";

/** Cài lên màn hình điện thoại như một app (PWA), giống RaceHub. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Họ Nhà Tôi — Gia phả số của dòng họ",
    short_name: "Họ Nhà Tôi",
    description:
      "Cây gia phả theo đời, ngày giỗ âm lịch, tra vai vế xưng hô, mời con cháu qua Zalo.",
    start_url: "/app",
    display: "standalone",
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    lang: "vi",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

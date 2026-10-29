import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Họ Nhà Tôi — Gia phả số của dòng họ",
  description:
    "Gia phả số cho dòng họ Việt: cây gia phả theo đời, ngày giỗ âm lịch, tra vai vế xưng hô.",
  appleWebApp: { capable: true, title: "Họ Nhà Tôi", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <div className="shell">
          <Sidebar />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Họ Nhà Tôi — Gia phả số của dòng họ",
  description:
    "Gia phả số cho dòng họ Việt: cây gia phả theo đời, ngày giỗ âm lịch, tra vai vế xưng hô.",
  appleWebApp: { capable: true, title: "Họ Nhà Tôi", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f14" },
  ],
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
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Áp cỡ chữ và giao diện đã chọn trước khi vẽ trang để không bị nháy. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var c=localStorage.getItem("hnt_co_chu");if(c)document.documentElement.dataset.coChu=c;var t=localStorage.getItem("hnt_giao_dien");if(t)document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body>
        <div className="shell">
          <Sidebar />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}

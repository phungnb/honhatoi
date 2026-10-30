/** Biểu tượng nét mảnh dùng cho thanh tab dưới và nút tròn (theo bản mẫu prototype/index.html). */

const PATHS: Record<string, React.ReactNode> = {
  "trang-chu": (
    <>
      <path d="M3 10.5L12 3l9 7.5V21H3z" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  "gia-pha": (
    <>
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="5" cy="12" r="2.2" />
      <circle cx="19" cy="12" r="2.2" />
      <circle cx="12" cy="19" r="2.2" />
      <path d="M12 7.5v2M6.5 10.5l-1 1M17.5 10.5l1 1M12 14.5v2" />
    </>
  ),
  "tin-nhan": <path d="M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z" />,
  "dong-ho": (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.6-3.4 2.8-5 5.5-5s4.9 1.6 5.5 5" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M15.5 14.6c2.9.2 4.7 1.7 5.2 4.4" />
    </>
  ),
  "ca-nhan": (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c1-4 3.9-6 7-6s6 2 7 6" />
    </>
  ),
  chuong: (
    <>
      <path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16z" />
      <path d="M10 20a2 2 0 004 0" />
    </>
  ),
  tim: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  gui: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  "dang-nhap": (
    <>
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </>
  ),
};

export default function BieuTuong({ ten, size = 22 }: { ten: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={ten === "gui" ? 2.4 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[ten] ?? PATHS["trang-chu"]}
    </svg>
  );
}

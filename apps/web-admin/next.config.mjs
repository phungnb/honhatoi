/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gộp về 1 cổng quản lý /quan-ly (28/10/2026). Đường dẫn cũ chuyển hướng
  // để không gãy link đã gửi; các trang dữ liệu mẫu cũ đã bỏ.
  async redirects() {
    return [
      { source: "/", destination: "/app", permanent: false },
      { source: "/duyet-xac-minh", destination: "/quan-ly", permanent: false },
      {
        source: "/admin/:lineageId/duyet-xac-minh",
        destination: "/quan-ly/:lineageId",
        permanent: false,
      },
      { source: "/dong-ho", destination: "/quan-ly", permanent: false },
      { source: "/thanh-vien", destination: "/quan-ly", permanent: false },
      { source: "/nhat-ky", destination: "/quan-ly", permanent: false },
      { source: "/cai-dat", destination: "/quan-ly", permanent: false },
    ];
  },
};

export default nextConfig;

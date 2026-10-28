import QuanLyHo from "@/components/QuanLyHo";

/** /quan-ly/[lineageId] — mọi việc quản lý của một dòng họ ở một chỗ. */
export default function Page({ params }: { params: { lineageId: string } }) {
  return <QuanLyHo lineageId={params.lineageId} />;
}

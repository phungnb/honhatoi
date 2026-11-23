import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, ReactNode, Suspense } from "react";
import { BAI, NHOM, TRINH_TU_GIO, tenNgan, timBai, vanBanThuan } from "@/lib/van-khan";
import CongCuKhan from "@/components/CongCuKhan";

export function generateStaticParams() {
  return BAI.map((b) => ({ slug: b.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const b = timBai(params.slug);
  if (!b) return { title: "Văn khấn · Họ Nhà Tôi" };
  const dau = b.paras.find((p) => p.length > 40) ?? "";
  return { title: `${b.title} · Họ Nhà Tôi`, description: dau.replace(/[*#]/g, "").slice(0, 160) };
}

/** **đậm** và *nghiêng* trong một dòng. */
function dong(s: string): ReactNode[] {
  return s.split(/(\*\*.+?\*\*|\*.+?\*)/g).map((t, i) =>
    t.startsWith("**") ? (
      <strong key={i}>{t.slice(2, -2)}</strong>
    ) : t.startsWith("*") && t.length > 2 ? (
      <em key={i}>{t.slice(1, -1)}</em>
    ) : (
      <Fragment key={i}>{t}</Fragment>
    ),
  );
}

function Doan({ p }: { p: string }) {
  const h = p.match(/^#{1,6}\s+(.+)$/);
  if (h) return <h3>{dong(h[1])}</h3>;
  const dongs = p.split("\n");
  if (dongs.every((d) => d.startsWith("- ")))
    return (
      <ul>
        {dongs.map((d, i) => (
          <li key={i}>{dong(d.slice(2))}</li>
        ))}
      </ul>
    );
  return (
    <p>
      {dongs.map((d, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {dong(d)}
        </Fragment>
      ))}
    </p>
  );
}

function tenNguon(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function BaiKhanPage({ params }: { params: { slug: string } }) {
  const b = timBai(params.slug);
  if (!b) notFound();
  const nhom = NHOM.find((n) => n.id === b.group);
  const cungNhom = BAI.filter((x) => x.group === b.group);
  const i = cungNhom.findIndex((x) => x.slug === b.slug);
  const truoc = cungNhom[i - 1];
  const sau = cungNhom[i + 1];
  const laGio = TRINH_TU_GIO.some((t) => t.slug === b.slug);

  return (
    <div className="van-khan">
      <nav className="sub" aria-label="Vị trí">
        <Link href="/van-khan">Văn khấn</Link> › {nhom?.name}
      </nav>
      <div className="page-head">
        <h1 className="page-title">{b.title}</h1>
      </div>

      {/* Đọc ?ten=&ngay= từ trang Giỗ sắp tới để nhắc người khấn điền đúng. */}
      <Suspense fallback={null}>
        <CongCuKhan vanBan={vanBanThuan(b)} slug={b.slug} />
      </Suspense>

      <article className="bai-khan card">
        {b.paras.map((p, k) => (
          <Doan key={k} p={p} />
        ))}
      </article>

      {b.notes.map((n, k) => (
        <p key={k} className="muted-text section-gap">
          Ghi chú: {dong(n.replace(/^Ghi chú:\s*/i, ""))}
        </p>
      ))}

      {laGio && (
        <section className="card section-gap khong-in">
          <h2 className="card-title">Thứ tự khấn quanh ngày giỗ</h2>
          <ol className="trinh-tu">
            {TRINH_TU_GIO.map((t) => {
              const x = timBai(t.slug);
              if (!x) return null;
              return (
                <li key={t.slug} className={t.slug === b.slug ? "dang-xem" : ""}>
                  <span className="sub">{t.khi}</span>
                  {t.slug === b.slug ? (
                    <strong>{tenNgan(x.title)} (đang xem)</strong>
                  ) : (
                    <Link href={`/van-khan/${t.slug}`}>{tenNgan(x.title)}</Link>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="bai-tiep section-gap">
        {truoc ? (
          <Link className="btn" href={`/van-khan/${truoc.slug}`}>
            ‹ {tenNgan(truoc.title)}
          </Link>
        ) : (
          <span />
        )}
        {sau && (
          <Link className="btn" href={`/van-khan/${sau.slug}`}>
            {tenNgan(sau.title)} ›
          </Link>
        )}
      </div>

      {b.source && (
        <p className="muted-text section-gap">
          Nguồn tham khảo:{" "}
          <a href={b.source} target="_blank" rel="noopener noreferrer nofollow">
            {tenNguon(b.source)}
          </a>
          . Mỗi vùng, mỗi nhà có lệ riêng; nên hỏi người cao tuổi trong họ khi có khác biệt.
        </p>
      )}
    </div>
  );
}

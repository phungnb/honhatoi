"use client";

/**
 * Bảng tin dòng họ (đặc tả 3.6): thông báo, hoạt động, tư liệu, kỷ niệm,
 * tìm người thân. Nội dung lưu lâu dài, tìm lại được, tách khỏi phòng chat.
 * Ai trong họ cũng đăng được; chỉ Ban quản trị đăng Thông báo (báo cả họ)
 * và ghim bài.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { del, get, post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";
import { useLineages } from "@/lib/lineage";
import { isLineageAdmin } from "@/lib/roles";
import DongHoTabs from "@/components/DongHoTabs";

interface PostItem {
  id: string;
  title: string | null;
  content: string;
  category: string | null;
  isPinned: boolean;
  createdAt: string;
  author: { id: string | null; name: string };
  isMine: boolean;
  reactions: Record<string, number>;
  myReactions: string[];
  commentCount: number;
}

interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string };
  canDelete: boolean;
}

const CATEGORIES: Record<string, string> = {
  thong_bao: "Thông báo",
  hoat_dong: "Hoạt động",
  tu_lieu: "Tư liệu",
  ky_niem: "Kỷ niệm",
  tim_nguoi_than: "Tìm người thân",
};

const REACTIONS: { key: string; icon: string; label: string }[] = [
  { key: "like", icon: "👍", label: "Thích" },
  { key: "love", icon: "❤️", label: "Thương" },
  { key: "pray", icon: "🙏", label: "Thành kính" },
];

function when(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BangTinPage() {
  const { current, loading, error } = useLineages();
  const admin = current ? isLineageAdmin(current) : false;
  const [filter, setFilter] = useState("");
  const [posts, setPosts] = useState<PostItem[] | null>(null);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);

  const load = useCallback(
    async (before?: string) => {
      if (!current) return;
      if (!before) setPosts(null);
      try {
        const q = new URLSearchParams({ limit: "20" });
        if (filter) q.set("category", filter);
        if (before) q.set("before", before);
        const b = await get<{ data?: { posts?: PostItem[]; nextBefore?: string | null } }>(
          `/lineages/${current.id}/posts?${q}`,
        );
        const list = b?.data?.posts ?? [];
        setPosts((prev) => (before && prev ? [...prev, ...list] : list));
        setNextBefore(b?.data?.nextBefore ?? null);
      } catch (e) {
        setErr(apiMessage(e));
        setPosts((prev) => prev ?? []);
      }
    },
    [current, filter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const replace = (p: PostItem) => setPosts((list) => list?.map((x) => (x.id === p.id ? p : x)) ?? null);

  if (error === "unauthorized")
    return (
      <Link className="btn primary" href="/dang-nhap">
        Đăng nhập để xem bảng tin dòng họ
      </Link>
    );

  if (!loading && !current)
    return (
      <p className="muted-text">
        Bạn chưa thuộc dòng họ nào. <Link href="/app">Tạo họ hoặc nhập mã mời</Link>.
      </p>
    );

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Dòng họ</h1>
        <p className="page-desc">{current?.name}: tin tức, thông báo và tư liệu chung của cả họ.</p>
      </div>
      <DongHoTabs active="bang-tin" />
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}

      {writing && current ? (
        <VietBai
          lineageId={current.id}
          admin={admin}
          onDone={(p) => {
            setWriting(false);
            if (p) setPosts((list) => [p, ...(list ?? [])]);
          }}
        />
      ) : (
        <button className="btn primary section-gap" onClick={() => setWriting(true)}>
          + Viết bài
        </button>
      )}

      <div className="btn-row section-gap" style={{ flexWrap: "wrap" }} aria-label="Lọc theo loại bài">
        <button className={`btn${!filter ? " primary" : ""}`} onClick={() => setFilter("")}>
          Tất cả
        </button>
        {Object.entries(CATEGORIES).map(([k, v]) => (
          <button key={k} className={`btn${filter === k ? " primary" : ""}`} onClick={() => setFilter(k)}>
            {v}
          </button>
        ))}
      </div>

      {posts === null ? (
        <p className="muted-text section-gap">Đang tải…</p>
      ) : posts.length === 0 ? (
        <div className="card section-gap">
          <p className="muted-text">
            Chưa có bài nào{filter ? ` loại ${CATEGORIES[filter]}` : ""}. Hãy là người đầu tiên chia sẻ tin
            của họ: ảnh họp mặt, chuyện xưa, thông báo việc họ.
          </p>
        </div>
      ) : (
        posts.map((p) => (
          <BaiViet
            key={p.id}
            p={p}
            lineageId={current!.id}
            admin={admin}
            onChange={replace}
            onRemoved={() => setPosts((list) => list?.filter((x) => x.id !== p.id) ?? null)}
          />
        ))
      )}
      {nextBefore && (
        <button className="btn section-gap" onClick={() => void load(nextBefore)}>
          Xem bài cũ hơn
        </button>
      )}
    </>
  );
}

function VietBai({
  lineageId,
  admin,
  onDone,
}: {
  lineageId: string;
  admin: boolean;
  onDone: (p: PostItem | null) => void;
}) {
  const [category, setCategory] = useState("hoat_dong");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!content.trim()) return setErr("Bài viết chưa có nội dung.");
    setBusy(true);
    setErr(null);
    try {
      const b = await post<{ data?: { post?: PostItem } }>(`/lineages/${lineageId}/posts`, {
        category,
        content: content.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
      });
      onDone(b?.data?.post ?? null);
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card section-gap">
      <h2 className="card-title">Viết bài</h2>
      <label className="muted-text" style={{ display: "block", marginTop: 8 }}>
        Loại bài
        <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.entries(CATEGORIES)
            .filter(([k]) => k !== "thong_bao" || admin)
            .map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
        </select>
      </label>
      <label className="muted-text" style={{ display: "block", marginTop: 8 }}>
        Tiêu đề (không bắt buộc)
        <input className="field" value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="muted-text" style={{ display: "block", marginTop: 8 }}>
        Nội dung
        <textarea
          className="field"
          rows={5}
          value={content}
          maxLength={10000}
          onChange={(e) => setContent(e.target.value)}
          placeholder="VD: Chiều Chủ nhật này họ mình dọn dẹp nhà thờ họ, mời các gia đình…"
        />
      </label>
      {category === "thong_bao" && (
        <p className="muted-text" style={{ marginTop: 6 }}>
          Thông báo sẽ được gửi tới mọi người trong họ.
        </p>
      )}
      {err && <p style={{ color: "var(--danger)", marginTop: 8 }}>{err}</p>}
      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn primary" disabled={busy} onClick={() => void submit()}>
          {busy ? "Đang đăng…" : "Đăng bài"}
        </button>
        <button className="btn" onClick={() => onDone(null)}>
          Thôi
        </button>
      </div>
    </div>
  );
}

function BaiViet({
  p,
  lineageId,
  admin,
  onChange,
  onRemoved,
}: {
  p: PostItem;
  lineageId: string;
  admin: boolean;
  onChange: (p: PostItem) => void;
  onRemoved: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const base = `/lineages/${lineageId}/posts/${p.id}`;

  async function act(fn: () => Promise<{ data?: { post?: PostItem } }>) {
    setErr(null);
    try {
      const b = await fn();
      if (b?.data?.post) onChange(b.data.post);
    } catch (e) {
      setErr(apiMessage(e));
    }
  }

  async function remove() {
    if (!confirmDel) return setConfirmDel(true);
    try {
      await del(base);
      onRemoved();
    } catch (e) {
      setErr(apiMessage(e));
    }
  }

  return (
    <article className={`card section-gap bai-viet${p.isPinned ? " ghim" : ""}`}>
      <div className="bai-meta">
        {p.isPinned && <span className="badge">Đã ghim</span>}
        {p.category && <span className={`badge${p.category === "thong_bao" ? " warm" : ""}`}>{CATEGORIES[p.category]}</span>}
        <span className="muted-text">
          {p.author.name} · {when(p.createdAt)}
        </span>
      </div>
      {p.title && <h2 className="bai-tieu-de">{p.title}</h2>}
      <p className="bai-noi-dung">{p.content}</p>

      <div className="btn-row" style={{ marginTop: 12, flexWrap: "wrap" }}>
        {REACTIONS.map((r) => (
          <button
            key={r.key}
            className={`btn chip${p.myReactions.includes(r.key) ? " primary" : ""}`}
            aria-pressed={p.myReactions.includes(r.key)}
            aria-label={r.label}
            onClick={() => void act(() => post(`${base}/reactions`, { emoji: r.key }))}
          >
            {r.icon} {p.reactions[r.key] ?? 0}
          </button>
        ))}
        <button className="btn chip" onClick={() => setShowComments((v) => !v)}>
          Bình luận ({p.commentCount})
        </button>
        {admin && (
          <button className="btn chip" onClick={() => void act(() => post(`${base}/pin`, { pinned: !p.isPinned }))}>
            {p.isPinned ? "Bỏ ghim" : "Ghim"}
          </button>
        )}
        {(p.isMine || admin) && (
          <button className="btn chip danger-outline" onClick={() => void remove()}>
            {confirmDel ? "Bấm lần nữa để xóa" : "Xóa"}
          </button>
        )}
      </div>
      {err && <p style={{ color: "var(--danger)", marginTop: 8 }}>{err}</p>}
      {showComments && (
        <BinhLuan
          base={base}
          onCount={(n) => n !== p.commentCount && onChange({ ...p, commentCount: n })}
        />
      )}
    </article>
  );
}

function BinhLuan({ base, onCount }: { base: string; onCount: (n: number) => void }) {
  const [items, setItems] = useState<CommentItem[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const b = await get<{ data?: { comments?: CommentItem[] } }>(`${base}/comments`);
      const list = b?.data?.comments ?? [];
      setItems(list);
      onCount(list.length);
    } catch (e) {
      setErr(apiMessage(e));
      setItems([]);
    }
    // onCount đổi mỗi lần vẽ lại bài; chỉ tải lại khi đổi bài.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await post(`${base}/comments`, { content: text.trim() });
      setText("");
      await load();
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await del(`${base}/comments/${id}`);
      await load();
    } catch (e) {
      setErr(apiMessage(e));
    }
  }

  return (
    <div className="binh-luan">
      {items === null ? (
        <p className="muted-text">Đang tải…</p>
      ) : (
        items.map((c) => (
          <div key={c.id} className="binh-luan-item">
            <strong>{c.author.name}</strong> <span className="muted-text">{when(c.createdAt)}</span>
            <p>{c.content}</p>
            {c.canDelete && (
              <button className="link-btn" onClick={() => void remove(c.id)}>
                Xóa
              </button>
            )}
          </div>
        ))
      )}
      <div className="btn-row" style={{ marginTop: 8 }}>
        <input
          className="field"
          style={{ flex: 1, marginTop: 0 }}
          value={text}
          maxLength={2000}
          placeholder="Viết bình luận…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
        />
        <button className="btn primary" disabled={busy || !text.trim()} onClick={() => void send()}>
          Gửi
        </button>
      </div>
      {err && <p style={{ color: "var(--danger)", marginTop: 8 }}>{err}</p>}
    </div>
  );
}

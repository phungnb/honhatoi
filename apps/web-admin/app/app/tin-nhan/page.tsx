"use client";

/**
 * Tin nhắn: nhóm chat cả họ, nhóm gia đình tự lập và nhắn riêng với người
 * trong họ. Bấm vào một tin để trả lời, thả cảm xúc, ghim, sửa/thu hồi
 * (tin của mình) hoặc báo cáo (tin người khác). Tin mới tự tải lại mỗi 5
 * giây khi đang mở cuộc trò chuyện (API chạy serverless nên chưa có kết
 * nối thời gian thực).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { del, get, getAccessToken, patch, post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";
import { useLineages } from "@/lib/lineage";
import { isLineageAdmin } from "@/lib/roles";
import BaoCao from "@/components/BaoCao";

interface Reaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

interface Message {
  id: string;
  senderId: string | null;
  senderName: string | null;
  content: string | null;
  recalled: boolean;
  createdAt: string;
  editedAt?: string | null;
  pinnedAt?: string | null;
  replyTo?: { id: string; senderName: string | null; content: string | null; recalled: boolean } | null;
  reactions?: Reaction[];
}

interface Conversation {
  id: string;
  type: string;
  title?: string | null;
  lineageId?: string | null;
  myRole?: string;
  lastMessage: Message | null;
  unreadCount: number;
  peerName?: string;
  peerId?: string;
  members?: { userId: string; displayName: string }[];
}

interface Member {
  userId: string;
  user: { id: string; displayName: string };
}

interface Blocked {
  userId: string;
  displayName: string;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function myUserId(): string {
  try {
    const t = getAccessToken() ?? "";
    const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      sub?: string;
    };
    return p.sub ?? "";
  } catch {
    return "";
  }
}

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

const kind = (c: Conversation) => c.type.toLowerCase();

const initial = (name: string) => name.trim().split(/\s+/).pop()?.[0] ?? "?";

/** Bỏ dấu để tìm tên không phân biệt dấu. */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

export default function TinNhanPage() {
  const { current, loading, error } = useLineages();
  const [me, setMe] = useState("");
  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [blocks, setBlocks] = useState<Blocked[]>([]);
  const [open, setOpen] = useState<Conversation | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setMe(myUserId()), []);

  const loadConvs = useCallback(async () => {
    try {
      const b = await get<{ data?: { conversations?: Conversation[] } }>("/chat/conversations?limit=50");
      setConvs(b?.data?.conversations ?? []);
    } catch (e) {
      setErr(apiMessage(e));
      setConvs([]);
    }
  }, []);

  const loadBlocks = useCallback(async () => {
    try {
      const b = await get<{ data?: { blocks?: Blocked[] } }>("/chat/blocks");
      setBlocks(b?.data?.blocks ?? []);
    } catch {
      setBlocks([]);
    }
  }, []);

  useEffect(() => {
    if (error) return;
    void loadConvs();
    void loadBlocks();
  }, [error, loadConvs, loadBlocks]);

  useEffect(() => {
    if (!current) return;
    get<{ data?: { members?: Member[] } }>(`/lineages/${current.id}/members?limit=100`)
      .then((b) => setMembers(b?.data?.members ?? []))
      .catch(() => setMembers([]));
  }, [current]);

  async function openGroup() {
    if (!current) return;
    setBusy(true);
    setErr(null);
    try {
      const b = await post<{ data?: { conversation?: Conversation } }>(
        `/chat/lineages/${current.id}/group`,
        {},
      );
      if (b?.data?.conversation) setOpen({ ...b.data.conversation, lastMessage: null, unreadCount: 0 });
      void loadConvs();
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function openDirect(m: Member) {
    setBusy(true);
    setErr(null);
    try {
      const b = await post<{ data?: { conversation?: Conversation } }>("/chat/conversations", {
        type: "direct",
        memberIds: [m.userId],
      });
      if (b?.data?.conversation)
        setOpen({
          ...b.data.conversation,
          lastMessage: null,
          unreadCount: 0,
          peerName: m.user.displayName,
          peerId: m.userId,
        });
      void loadConvs();
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function unblock(userId: string) {
    try {
      await del(`/chat/blocks/${userId}`);
      await loadBlocks();
    } catch (e) {
      setErr(apiMessage(e));
    }
  }

  // Mở thẳng cuộc trò chuyện riêng từ danh bạ: /app/tin-nhan?voi=<userId>.
  const voiDone = useRef(false);
  useEffect(() => {
    if (voiDone.current || !members.length) return;
    const voi = new URLSearchParams(window.location.search).get("voi");
    if (!voi) return;
    voiDone.current = true;
    window.history.replaceState(null, "", "/app/tin-nhan");
    const m = members.find((x) => x.userId === voi);
    if (m) void openDirect(m);
    // openDirect không đổi theo lần vẽ; chỉ chạy khi danh sách thành viên về.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  const others = useMemo(() => {
    const f = fold(filter.trim());
    return members.filter((m) => m.userId !== me && (!f || fold(m.user.displayName).includes(f)));
  }, [members, me, filter]);

  if (error === "unauthorized")
    return (
      <Link className="btn primary" href="/dang-nhap">
        Đăng nhập để nhắn tin
      </Link>
    );

  if (open) {
    const peerId = open.peerId ?? open.members?.find((m) => m.userId !== me)?.userId;
    const lineageAdmin = !!current && open.lineageId === current.id && isLineageAdmin(current);
    return (
      <PhongChat
        conv={open}
        me={me}
        title={titleOf(open, me)}
        peerId={kind(open) === "direct" ? peerId : undefined}
        blockedByMe={!!peerId && blocks.some((b) => b.userId === peerId)}
        canPin={kind(open) !== "lineage_group" || open.myRole === "admin" || lineageAdmin}
        onBlocksChanged={() => void loadBlocks()}
        onBack={() => {
          setOpen(null);
          void loadConvs();
        }}
      />
    );
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Tin nhắn</h1>
        <p className="page-desc">Nhóm chat cả họ, nhóm gia đình và nhắn riêng với người trong họ.</p>
      </div>
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      {!loading && !current && (
        <p className="muted-text">
          Bạn chưa thuộc dòng họ nào. <Link href="/app">Tạo họ hoặc nhập mã mời</Link>.
        </p>
      )}
      {current && (
        <div className="btn-row section-gap" style={{ flexWrap: "wrap" }}>
          <button className="btn primary" disabled={busy} onClick={() => void openGroup()}>
            Nhóm chat cả họ
          </button>
          <button className={`btn${creating ? " primary" : ""}`} onClick={() => setCreating((v) => !v)}>
            Tạo nhóm gia đình
          </button>
        </div>
      )}

      {creating && current && (
        <TaoNhom
          lineageId={current.id}
          members={members.filter((m) => m.userId !== me)}
          onCancel={() => setCreating(false)}
          onCreated={(c) => {
            setCreating(false);
            setOpen(c);
            void loadConvs();
          }}
        />
      )}

      <section className="section-gap">
        <h2 className="card-title">Cuộc trò chuyện</h2>
        {convs === null ? (
          <p className="muted-text">Đang tải…</p>
        ) : convs.length === 0 ? (
          <p className="muted-text">Chưa có cuộc trò chuyện nào.</p>
        ) : (
          <div className="list">
            {convs.map((c) => (
              <button
                key={c.id}
                className={`list-item${c.unreadCount > 0 ? " unread" : ""}`}
                onClick={() => setOpen(c)}
              >
                <span className="avatar">
                  {kind(c) === "lineage_group" ? "Họ" : kind(c) === "family_group" ? "Nhà" : initial(titleOf(c, me))}
                </span>
                <span className="grow">
                  <strong>{titleOf(c, me)}</strong>
                  <span className="sub" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.lastMessage
                      ? `${c.lastMessage.senderId === me ? "Bạn" : c.lastMessage.senderName ?? ""}: ${
                          c.lastMessage.recalled ? "đã thu hồi" : c.lastMessage.content ?? ""
                        }`
                      : "Chưa có tin nhắn"}
                  </span>
                </span>
                {c.unreadCount > 0 && <span className="bell-count">{c.unreadCount}</span>}
              </button>
            ))}
          </div>
        )}
      </section>

      {members.length > 1 && (
        <section className="section-gap">
          <h2 className="card-title">Nhắn riêng</h2>
          {members.length > 8 && (
            <input
              className="field"
              placeholder="Tìm người trong họ…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ marginBottom: 8 }}
            />
          )}
          <div className="list">
            {others.map((m) => (
              <button key={m.userId} className="list-item" disabled={busy} onClick={() => void openDirect(m)}>
                <span className="avatar">{initial(m.user.displayName)}</span>
                <span className="grow">
                  <strong>{m.user.displayName}</strong>
                </span>
              </button>
            ))}
            {others.length === 0 && <p className="muted-text">Không có ai khớp.</p>}
          </div>
        </section>
      )}

      {blocks.length > 0 && (
        <section className="section-gap">
          <h2 className="card-title">Đã chặn</h2>
          <div className="list">
            {blocks.map((b) => (
              <div key={b.userId} className="list-item">
                <span className="avatar">{initial(b.displayName)}</span>
                <span className="grow">
                  <strong>{b.displayName}</strong>
                </span>
                <button className="btn" onClick={() => void unblock(b.userId)}>
                  Bỏ chặn
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function titleOf(c: Conversation, me: string): string {
  if (c.title) return c.title;
  if (c.peerName) return c.peerName;
  if (kind(c) === "direct") return c.members?.find((m) => m.userId !== me)?.displayName ?? "Nhắn riêng";
  return "Nhóm";
}

/** Tạo nhóm gia đình: đặt tên và chọn người trong họ. */
function TaoNhom({
  lineageId,
  members,
  onCancel,
  onCreated,
}: {
  lineageId: string;
  members: Member[];
  onCancel: () => void;
  onCreated: (c: Conversation) => void;
}) {
  const [title, setTitle] = useState("Gia đình tôi");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const shown = members.filter((m) => !filter.trim() || fold(m.user.displayName).includes(fold(filter.trim())));

  function toggle(id: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function create() {
    if (!title.trim()) return setErr("Hãy đặt tên nhóm");
    if (picked.size === 0) return setErr("Hãy chọn ít nhất một người");
    setBusy(true);
    setErr(null);
    try {
      const b = await post<{ data?: { conversation?: Conversation } }>("/chat/conversations", {
        type: "family_group",
        lineageId,
        title: title.trim(),
        memberIds: Array.from(picked),
      });
      if (b?.data?.conversation)
        onCreated({ ...b.data.conversation, lastMessage: null, unreadCount: 0, myRole: "admin" });
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card section-gap">
      <h2 className="card-title">Nhóm gia đình mới</h2>
      <p className="sub">Nhóm nhỏ cho bố mẹ, anh chị em, con cháu — chỉ người được chọn mới thấy.</p>
      <label>
        Tên nhóm
        <input className="field" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      {members.length > 8 && (
        <input
          className="field"
          placeholder="Tìm người…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      <div className="chon-nguoi">
        {shown.map((m) => (
          <label key={m.userId} className="chon-nguoi-item">
            <input type="checkbox" checked={picked.has(m.userId)} onChange={() => toggle(m.userId)} />
            {m.user.displayName}
          </label>
        ))}
        {members.length === 0 && <p className="muted-text">Họ chưa có thành viên khác.</p>}
      </div>
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      <div className="btn-row section-gap">
        <button className="btn primary" disabled={busy} onClick={() => void create()}>
          Tạo nhóm ({picked.size} người)
        </button>
        <button className="btn" onClick={onCancel}>
          Hủy
        </button>
      </div>
    </div>
  );
}

function PhongChat({
  conv,
  me,
  title,
  peerId,
  blockedByMe,
  canPin,
  onBlocksChanged,
  onBack,
}: {
  conv: Conversation;
  me: string;
  title: string;
  peerId?: string;
  blockedByMe: boolean;
  canPin: boolean;
  onBlocksChanged: () => void;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pinned, setPinned] = useState<Message[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Message[] | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const lastId = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const b = await get<{ data?: { messages?: Message[]; pinned?: Message[] } }>(
        `/chat/conversations/${conv.id}/messages?limit=50`,
      );
      const list = (b?.data?.messages ?? []).slice().reverse();
      setMessages(list);
      setPinned(b?.data?.pinned ?? []);
      const newest = list[list.length - 1];
      if (newest && newest.id !== lastId.current) {
        lastId.current = newest.id;
        void post(`/chat/conversations/${conv.id}/read`, { messageId: newest.id }).catch(() => undefined);
        setTimeout(() => bottom.current?.scrollIntoView({ block: "end" }), 0);
      }
    } catch (e) {
      setErr(apiMessage(e));
    }
  }, [conv.id]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  /** Chạy một thao tác, báo lỗi nếu có, rồi tải lại. */
  async function run(fn: () => Promise<unknown>) {
    setErr(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(apiMessage(e));
    }
  }

  function jumpTo(id: string) {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return setErr("Tin này cũ hơn 50 tin gần nhất nên không hiện trong khung chat.");
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setFlash(id);
    setTimeout(() => setFlash((f) => (f === id ? null : f)), 1600);
  }

  async function send() {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setErr(null);
    try {
      if (editing) {
        await patch(`/chat/messages/${editing.id}`, { content });
      } else {
        await post(`/chat/conversations/${conv.id}/messages`, {
          clientMessageId: crypto.randomUUID(),
          type: "text",
          content,
          replyToId: replyTo?.id,
        });
      }
      setText("");
      setReplyTo(null);
      setEditing(null);
      await load();
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setSending(false);
    }
  }

  async function search() {
    const term = q.trim();
    if (!term) return setResults(null);
    try {
      const b = await get<{ data?: { messages?: Message[] } }>(
        `/chat/conversations/${conv.id}/messages?limit=50&q=${encodeURIComponent(term)}`,
      );
      setResults(b?.data?.messages ?? []);
    } catch (e) {
      setErr(apiMessage(e));
    }
  }

  async function toggleBlock() {
    if (!peerId) return;
    if (!blockedByMe && confirm !== "block") return setConfirm("block");
    setConfirm(null);
    await run(() => (blockedByMe ? del(`/chat/blocks/${peerId}`) : post("/chat/blocks", { userId: peerId })));
    onBlocksChanged();
  }

  async function leave() {
    if (confirm !== "leave") return setConfirm("leave");
    setErr(null);
    try {
      await post(`/chat/conversations/${conv.id}/leave`, {});
      onBack();
    } catch (e) {
      setErr(apiMessage(e));
    }
  }

  function pick(m: Message, mode: "reply" | "edit") {
    setSelected(null);
    if (mode === "reply") {
      setEditing(null);
      setReplyTo(m);
    } else {
      setReplyTo(null);
      setEditing(m);
      setText(m.content ?? "");
    }
    setTimeout(() => input.current?.focus(), 0);
  }

  const k = kind(conv);
  const memberCount = conv.members?.length;

  return (
    <>
      <div className="chat-head">
        <button className="btn" onClick={onBack} aria-label="Quay lại danh sách">
          ←
        </button>
        <div className="grow">
          <h1 className="page-title chat-title">{title}</h1>
          {k !== "direct" && memberCount ? <span className="sub">{memberCount} thành viên</span> : null}
        </div>
        <button className={`btn chip${searchOpen ? " primary" : ""}`} onClick={() => setSearchOpen((v) => !v)}>
          Tìm
        </button>
        {k === "direct" && peerId && (
          <button className="btn chip danger-outline" onClick={() => void toggleBlock()}>
            {blockedByMe ? "Bỏ chặn" : confirm === "block" ? "Bấm lần nữa để chặn" : "Chặn"}
          </button>
        )}
        {k === "family_group" && (
          <button className="btn chip danger-outline" onClick={() => void leave()}>
            {confirm === "leave" ? "Bấm lần nữa để rời" : "Rời nhóm"}
          </button>
        )}
      </div>

      {searchOpen && (
        <div className="card section-gap">
          <div className="btn-row">
            <input
              className="field"
              style={{ flex: 1, marginTop: 0 }}
              placeholder="Tìm trong cuộc trò chuyện…"
              value={q}
              autoFocus
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void search()}
            />
            <button className="btn primary" onClick={() => void search()}>
              Tìm
            </button>
          </div>
          {results && (
            <div className="list" style={{ marginTop: 8 }}>
              {results.length === 0 && <p className="muted-text">Không thấy tin nào khớp.</p>}
              {results.map((m) => (
                <button key={m.id} className="list-item" onClick={() => jumpTo(m.id)}>
                  <span className="grow">
                    <span className="sub">
                      {m.senderId === me ? "Bạn" : m.senderName} · {new Date(m.createdAt).toLocaleString("vi-VN")}
                    </span>
                    <span style={{ display: "block" }}>{m.content}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {pinned.length > 0 && (
        <div className="ghim-bar section-gap">
          <button className="ghim-bar-main" onClick={() => setShowPinned((v) => !v)}>
            <span className="badge brand">Ghim {pinned.length > 1 ? `(${pinned.length})` : ""}</span>
            <span className="ghim-text">
              {pinned[0].senderName}: {pinned[0].content}
            </span>
          </button>
          {showPinned && (
            <div className="list" style={{ marginTop: 8 }}>
              {pinned.map((m) => (
                <div key={m.id} className="list-item">
                  <button className="grow link-plain" onClick={() => jumpTo(m.id)}>
                    <span className="sub">{m.senderName}</span>
                    <span style={{ display: "block" }}>{m.content}</span>
                  </button>
                  {canPin && (
                    <button className="btn chip" onClick={() => void run(() => post(`/chat/messages/${m.id}/pin`, { pinned: false }))}>
                      Bỏ ghim
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      <div className="chat-log section-gap">
        {messages.length === 0 && <p className="muted-text">Chưa có tin nhắn. Gửi lời chào cả nhà!</p>}
        {messages.map((m) => {
          const mine = m.senderId === me;
          const isSel = selected === m.id;
          return (
            <div key={m.id} id={`msg-${m.id}`} className={`msg-row${mine ? " mine" : ""}`}>
              <div
                className={`bubble${mine ? " mine" : ""}${isSel ? " selected" : ""}${flash === m.id ? " flash" : ""}`}
                role="button"
                tabIndex={0}
                aria-expanded={isSel}
                onClick={() => {
                  setSelected(isSel ? null : m.id);
                  setConfirm(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && setSelected(isSel ? null : m.id)}
              >
                {!mine && <div className="sub">{m.senderName}</div>}
                {m.replyTo && (
                  <button
                    className="trich-dan"
                    onClick={(e) => {
                      e.stopPropagation();
                      jumpTo(m.replyTo!.id);
                    }}
                  >
                    <strong>{m.replyTo.senderName}</strong>
                    <span>{m.replyTo.recalled ? "Tin nhắn đã thu hồi" : m.replyTo.content}</span>
                  </button>
                )}
                <div className="msg-text" style={{ whiteSpace: "pre-wrap", fontStyle: m.recalled ? "italic" : undefined }}>
                  {m.recalled ? "Tin nhắn đã thu hồi" : m.content}
                </div>
                <div className="sub" style={{ textAlign: "right" }}>
                  {m.pinnedAt && !m.recalled ? "Đã ghim · " : ""}
                  {m.editedAt && !m.recalled ? "đã sửa · " : ""}
                  {hhmm(m.createdAt)}
                </div>
              </div>
              {!!m.reactions?.length && (
                <div className="msg-reactions">
                  {m.reactions.map((r) => (
                    <button
                      key={r.emoji}
                      className={`btn chip${r.reactedByMe ? " primary" : ""}`}
                      aria-pressed={r.reactedByMe}
                      onClick={() => void run(() => post(`/chat/messages/${m.id}/reactions`, { emoji: r.emoji }))}
                    >
                      {r.emoji} {r.count}
                    </button>
                  ))}
                </div>
              )}
              {isSel && !m.recalled && (
                <div className="msg-actions">
                  <div className="msg-emoji">
                    {QUICK_REACTIONS.map((e) => (
                      <button
                        key={e}
                        className="btn chip"
                        aria-label={`Thả ${e}`}
                        onClick={() => {
                          setSelected(null);
                          void run(() => post(`/chat/messages/${m.id}/reactions`, { emoji: e }));
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className="btn-row" style={{ flexWrap: "wrap" }}>
                    <button className="btn chip" onClick={() => pick(m, "reply")}>
                      Trả lời
                    </button>
                    {canPin && (
                      <button
                        className="btn chip"
                        onClick={() => {
                          setSelected(null);
                          void run(() => post(`/chat/messages/${m.id}/pin`, { pinned: !m.pinnedAt }));
                        }}
                      >
                        {m.pinnedAt ? "Bỏ ghim" : "Ghim"}
                      </button>
                    )}
                    <button
                      className="btn chip"
                      onClick={() => {
                        void navigator.clipboard?.writeText(m.content ?? "").catch(() => undefined);
                        setSelected(null);
                      }}
                    >
                      Sao chép
                    </button>
                    {mine && (
                      <button className="btn chip" onClick={() => pick(m, "edit")}>
                        Sửa
                      </button>
                    )}
                    {mine && (
                      <button
                        className="btn chip danger-outline"
                        onClick={() => {
                          if (confirm !== `recall:${m.id}`) return setConfirm(`recall:${m.id}`);
                          setConfirm(null);
                          setSelected(null);
                          void run(() => post(`/chat/messages/${m.id}/recall`, {}));
                        }}
                      >
                        {confirm === `recall:${m.id}` ? "Bấm lần nữa để thu hồi" : "Thu hồi"}
                      </button>
                    )}
                  </div>
                  {!mine && <BaoCao targetType="message" targetId={m.id} label="Báo cáo tin này" />}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <div className="chat-input-wrap">
        {(replyTo || editing) && (
          <div className="chat-context">
            <span className="grow">
              {editing ? (
                <strong>Đang sửa tin nhắn</strong>
              ) : (
                <>
                  <strong>Trả lời {replyTo!.senderId === me ? "chính bạn" : replyTo!.senderName}</strong>
                  <span className="sub" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {replyTo!.content}
                  </span>
                </>
              )}
            </span>
            <button
              className="btn chip"
              aria-label="Hủy"
              onClick={() => {
                if (editing) setText("");
                setReplyTo(null);
                setEditing(null);
              }}
            >
              ✕
            </button>
          </div>
        )}
        {blockedByMe ? (
          <p className="muted-text chat-input">Bạn đã chặn người này. Bỏ chặn để nhắn tiếp.</p>
        ) : (
          <div className="chat-input">
            <textarea
              ref={input}
              className="field"
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Nhắn tin…"
              style={{ marginTop: 0, resize: "none" }}
            />
            <button className="btn primary" disabled={sending || !text.trim()} onClick={() => void send()}>
              {editing ? "Lưu" : "Gửi"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

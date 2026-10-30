"use client";

/**
 * Tin nhắn: nhóm chat cả họ + nhắn riêng với người trong họ. Tin mới tự
 * tải lại mỗi 5 giây khi đang mở cuộc trò chuyện (API chạy serverless nên
 * chưa có kết nối thời gian thực).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { get, getAccessToken, post } from "@/lib/api";
import { apiMessage } from "@/lib/errors";
import { useLineages } from "@/lib/lineage";

interface Message {
  id: string;
  senderId: string | null;
  senderName: string | null;
  content: string | null;
  recalled: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  type: string;
  title?: string | null;
  lineageId?: string | null;
  lastMessage: Message | null;
  unreadCount: number;
  peerName?: string;
  members?: { userId: string; displayName: string }[];
}

interface Member {
  userId: string;
  user: { id: string; displayName: string };
}

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

export default function TinNhanPage() {
  const { current, loading, error } = useLineages();
  const [me, setMe] = useState("");
  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState<Conversation | null>(null);
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

  useEffect(() => {
    if (!error) void loadConvs();
  }, [error, loadConvs]);

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
        setOpen({ ...b.data.conversation, lastMessage: null, unreadCount: 0, peerName: m.user.displayName });
      void loadConvs();
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setBusy(false);
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

  if (error === "unauthorized")
    return (
      <Link className="btn primary" href="/dang-nhap">
        Đăng nhập để nhắn tin
      </Link>
    );

  if (open)
    return (
      <PhongChat
        conv={open}
        me={me}
        title={titleOf(open, me)}
        onBack={() => {
          setOpen(null);
          void loadConvs();
        }}
      />
    );

  const others = members.filter((m) => m.userId !== me);

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Tin nhắn</h1>
        <p className="page-desc">Nhóm chat cả họ và nhắn riêng với người trong họ.</p>
      </div>
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      {!loading && !current && (
        <p className="muted-text">
          Bạn chưa thuộc dòng họ nào. <Link href="/app">Tạo họ hoặc nhập mã mời</Link>.
        </p>
      )}
      {current && (
        <div className="btn-row section-gap">
          <button className="btn primary" disabled={busy} onClick={() => void openGroup()}>
            Nhóm chat cả họ
          </button>
        </div>
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
                <span className="avatar">{c.type.toLowerCase() === "lineage_group" ? "Họ" : "1-1"}</span>
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

      {others.length > 0 && (
        <section className="section-gap">
          <h2 className="card-title">Nhắn riêng</h2>
          <div className="list">
            {others.map((m) => (
              <button key={m.userId} className="list-item" disabled={busy} onClick={() => void openDirect(m)}>
                <span className="avatar">{m.user.displayName.trim().split(/\s+/).pop()?.[0] ?? "?"}</span>
                <span className="grow">
                  <strong>{m.user.displayName}</strong>
                </span>
              </button>
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
  if (c.type.toLowerCase() === "direct")
    return c.members?.find((m) => m.userId !== me)?.displayName ?? "Nhắn riêng";
  return "Nhóm";
}

function PhongChat({
  conv,
  me,
  title,
  onBack,
}: {
  conv: Conversation;
  me: string;
  title: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const lastId = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const b = await get<{ data?: { messages?: Message[] } }>(
        `/chat/conversations/${conv.id}/messages?limit=50`,
      );
      const list = (b?.data?.messages ?? []).slice().reverse();
      setMessages(list);
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

  async function send() {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setErr(null);
    try {
      await post(`/chat/conversations/${conv.id}/messages`, {
        clientMessageId: crypto.randomUUID(),
        type: "text",
        content,
      });
      setText("");
      await load();
    } catch (e) {
      setErr(apiMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="btn-row" style={{ alignItems: "center" }}>
        <button className="btn" onClick={onBack}>
          ← Quay lại
        </button>
        <h1 className="page-title" style={{ fontSize: 20 }}>
          {title}
        </h1>
      </div>
      {err && <p style={{ color: "var(--danger)" }}>{err}</p>}
      <div className="chat-log section-gap">
        {messages.length === 0 && <p className="muted-text">Chưa có tin nhắn. Gửi lời chào cả nhà!</p>}
        {messages.map((m) => {
          const mine = m.senderId === me;
          return (
            <div key={m.id} className={`bubble${mine ? " mine" : ""}`}>
              {!mine && <div className="sub">{m.senderName}</div>}
              <div style={{ whiteSpace: "pre-wrap", fontStyle: m.recalled ? "italic" : undefined }}>
                {m.recalled ? "Tin nhắn đã thu hồi" : m.content}
              </div>
              <div className="sub" style={{ textAlign: "right" }}>
                {hhmm(m.createdAt)}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <div className="chat-input">
        <textarea
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
          Gửi
        </button>
      </div>
    </>
  );
}

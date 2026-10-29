"use client";

/**
 * Đăng nhập (một lần cho cả quản lý và con cháu). Ba lựa chọn, cùng một
 * bảng tài khoản: số điện thoại + OTP, email + mật khẩu, Google.
 * Sau khi đăng nhập, token được lưu để lib/api.ts dùng cho mọi trang.
 */

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { get, post, saveTokens } from "@/lib/api";
import { apiMessage } from "@/lib/errors";
import { MyLineage, canManageLineage } from "@/lib/roles";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

type Method = "phone" | "email";

interface TokenBody {
  data?: { accessToken?: string; refreshToken?: string };
}

interface GoogleIdApi {
  initialize: (o: {
    client_id: string;
    callback: (r: { credential?: string }) => void;
  }) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 8,
  background: "var(--surface)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
};

export default function DangNhapPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Số điện thoại
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  // Email
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const googleBtn = useRef<HTMLDivElement>(null);

  async function finishLogin(body: TokenBody) {
    const access = body?.data?.accessToken;
    if (!access) throw new Error("Máy chủ không trả về token.");
    saveTokens(access, body.data?.refreshToken);
    // Có vai trò quản lý ở ít nhất 1 họ → cổng quản lý; còn lại → con cháu.
    const mine = await get<{ data?: { lineages?: MyLineage[] } }>(
      "/lineages?limit=100",
    ).catch(() => null);
    const manages = (mine?.data?.lineages ?? []).some(canManageLineage);
    router.push(manages ? "/quan-ly" : "/app");
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setBusy(false);
    }
  }

  // Nút Google (Google Identity Services) — chỉ hiện khi đã cấu hình
  // NEXT_PUBLIC_GOOGLE_CLIENT_ID.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const render = () => {
      const id = window.google?.accounts?.id;
      if (!id || !googleBtn.current) return;
      id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r) => {
          if (!r.credential) return;
          void run(async () =>
            finishLogin(
              await post<TokenBody>("/auth/google", { idToken: r.credential }),
            ),
          );
        },
      });
      id.renderButton(googleBtn.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        locale: "vi",
        width: 320,
      });
    };
    if (window.google?.accounts?.id) {
      render();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestCode() {
    if (!phone.trim()) {
      setError("Nhập số điện thoại trước.");
      return;
    }
    void run(async () => {
      await post("/auth/otp/request", { phone: phone.trim(), purpose: "login" });
      setStep(2);
    });
  }

  function verifyCode() {
    if (code.trim().length !== 6) {
      setError("Mã gồm 6 số.");
      return;
    }
    void run(async () =>
      finishLogin(
        await post<TokenBody>("/auth/otp/verify", {
          phone: phone.trim(),
          code: code.trim(),
        }),
      ),
    );
  }

  function submitEmail() {
    if (!email.trim() || !password) {
      setError("Nhập email và mật khẩu.");
      return;
    }
    if (registering && password.length < 8) {
      setError("Mật khẩu cần ít nhất 8 ký tự.");
      return;
    }
    if (registering && !displayName.trim()) {
      setError("Nhập họ tên để người trong họ nhận ra bạn.");
      return;
    }
    void run(async () =>
      finishLogin(
        registering
          ? await post<TokenBody>("/auth/email/register", {
              email: email.trim(),
              password,
              displayName: displayName.trim(),
            })
          : await post<TokenBody>("/auth/email/login", {
              email: email.trim(),
              password,
            }),
      ),
    );
  }

  const tab = (m: Method, label: string) => (
    <button
      className={`btn${method === m ? " primary" : ""}`}
      onClick={() => {
        setMethod(m);
        setError(null);
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Đăng nhập Họ Nhà Tôi</h1>
        <p className="page-desc">
          Chọn cách đăng nhập thuận tiện nhất. Sau này bạn có thể thêm cách
          khác trong trang Tài khoản mà vẫn giữ nguyên vai trò trong dòng họ.
        </p>
      </div>

      <div className="card" style={{ maxWidth: 440 }}>
        {GOOGLE_CLIENT_ID && (
          <>
            <div ref={googleBtn} style={{ minHeight: 44 }} />
            <p
              className="muted-text"
              style={{ textAlign: "center", margin: "16px 0" }}
            >
              hoặc
            </p>
          </>
        )}

        <div className="btn-row" style={{ marginBottom: 16 }}>
          {tab("phone", "Số điện thoại")}
          {tab("email", "Email")}
        </div>

        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

        {method === "phone" &&
          (step === 1 ? (
            <>
              <label className="muted-text">
                Số điện thoại
                <input
                  style={inputStyle}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0865784913"
                  inputMode="tel"
                />
              </label>
              <div className="btn-row" style={{ marginTop: 16 }}>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={requestCode}
                >
                  {busy ? "Đang gửi…" : "Gửi mã xác thực"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="muted-text">
                Mã đã được tạo cho số {phone}. Nhập mã 6 số để đăng nhập.
              </p>
              <label className="muted-text">
                Mã xác thực
                <input
                  style={inputStyle}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                />
              </label>
              <div className="btn-row" style={{ marginTop: 16 }}>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={verifyCode}
                >
                  {busy ? "Đang kiểm tra…" : "Đăng nhập"}
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setStep(1);
                    setCode("");
                    setError(null);
                  }}
                >
                  Đổi số
                </button>
              </div>
            </>
          ))}

        {method === "email" && (
          <>
            {registering && (
              <label className="muted-text" style={{ display: "block" }}>
                Họ và tên
                <input
                  style={inputStyle}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="VD: Nguyễn Văn An"
                  autoComplete="name"
                />
              </label>
            )}
            <label
              className="muted-text"
              style={{ display: "block", marginTop: registering ? 12 : 0 }}
            >
              Email
              <input
                style={inputStyle}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@gmail.com"
                inputMode="email"
                autoComplete="email"
              />
            </label>
            <label
              className="muted-text"
              style={{ display: "block", marginTop: 12 }}
            >
              Mật khẩu{registering ? " (ít nhất 8 ký tự)" : ""}
              <input
                style={inputStyle}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={registering ? "new-password" : "current-password"}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitEmail();
                }}
              />
            </label>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button
                className="btn primary"
                disabled={busy}
                onClick={submitEmail}
              >
                {busy
                  ? "Đang xử lý…"
                  : registering
                    ? "Tạo tài khoản"
                    : "Đăng nhập"}
              </button>
              <button
                className="btn"
                onClick={() => {
                  setRegistering(!registering);
                  setError(null);
                }}
              >
                {registering ? "Đã có tài khoản" : "Tạo tài khoản mới"}
              </button>
            </div>
            {!registering && (
              <p className="muted-text" style={{ marginTop: 16 }}>
                Quên mật khẩu? Liên hệ quản trị nền tảng để được đặt lại.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

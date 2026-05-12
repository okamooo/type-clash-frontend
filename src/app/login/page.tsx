"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import BackButton from "@/components/BackButton";
import WindowPanel from "@/components/WindowPanel";

type FormErrors = {
  email?: string;
  password?: string;
  general?: string;
};

// const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const API_BASE = "http://localhost:8080";

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {};

  if (!email) {
    errors.email = "メールアドレスを入力してください";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "メールアドレスの形式が正しくありません";
  }

  if (!password) {
    errors.password = "パスワードを入力してください";
  }

  return errors;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("reason") === "expired";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validate(email, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data: { message?: string } = await res.json().catch(() => ({}));
        setErrors({ general: data.message ?? "メールアドレスまたはパスワードが正しくありません" });
        return;
      }

      router.push("/home");
    } catch {
      setErrors({ general: "通信エラーが発生しました。再度お試しください" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center">
      <WindowPanel>
        <p className="text-xs tracking-[0.4em] text-slate-500 sm:text-sm">
          ══ TYPE★CLASH ══
        </p>

        <h1 className="mt-3 transform-[perspective(320px)_rotateX(12deg)_skewX(-8deg)_scaleY(1.08)] text-3xl font-bold drop-shadow-[4px_4px_0_#64748b] sm:text-5xl">
          ログイン
        </h1>

        <p className="mt-3 animate-pulse text-xs tracking-[0.3em] text-slate-500 sm:text-sm">
          PLAYER AUTHENTICATION
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 flex w-full max-w-sm flex-col gap-6"
        >
          {isExpired && (
            <p
              role="alert"
              className="border border-yellow-400 bg-yellow-900/30 px-4 py-2 text-sm text-yellow-300 sm:text-base"
            >
              ⚠ セッションの有効期限が切れました。再度ログインしてください。
            </p>
          )}

          {errors.general && (
            <p
              role="alert"
              className="border border-red-400 bg-red-900/30 px-4 py-2 text-sm text-red-300 sm:text-base"
            >
              ✕ {errors.general}
            </p>
          )}

          <div className="flex flex-col gap-2 text-left">
            <label
              htmlFor="email"
              className="text-xs tracking-[0.25em] text-slate-400 sm:text-sm"
            >
              ▸ MAIL ADDRESS
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="user@example.com"
              className="border-2 border-white bg-[#050816] px-3 py-2 text-base text-white outline-none placeholder:text-slate-700 focus:border-yellow-200 focus:shadow-[0_0_10px_rgba(253,224,71,0.25)] sm:text-lg"
            />
            {errors.email && (
              <p role="alert" className="text-xs text-red-300 sm:text-sm">
                ✕ {errors.email}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 text-left">
            <label
              htmlFor="password"
              className="text-xs tracking-[0.25em] text-slate-400 sm:text-sm"
            >
              ▸ PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="border-2 border-white bg-[#050816] px-3 py-2 text-base text-white outline-none focus:border-yellow-200 focus:shadow-[0_0_10px_rgba(253,224,71,0.25)] sm:text-lg"
            />
            {errors.password && (
              <p role="alert" className="text-xs text-red-300 sm:text-sm">
                ✕ {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 border-2 border-white py-3 text-base font-bold transition-all hover:border-yellow-200 hover:text-yellow-200 hover:shadow-[0_0_14px_rgba(253,224,71,0.3)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-xl"
          >
            {isSubmitting ? "[ LOADING... ]" : "▶ ログイン"}
          </button>
        </form>

        <div className="mt-8 w-full max-w-sm border-t border-slate-800 pt-4 text-center">
          <p className="text-xs tracking-widest text-slate-700">
            ── TYPE★CLASH v1.0.0 ──
          </p>
        </div>

        <BackButton />
      </WindowPanel>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

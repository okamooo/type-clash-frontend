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
      setErrors({ general: "通信エラーが発生しました" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center overflow-auto">
      <div className="[&>section]:min-h-[500px] [&>section]:min-w-[500px]">
        <WindowPanel>
          <h1 className="transform-[perspective(320px)_rotateX(12deg)_skewX(-8deg)_scaleY(1.08)] text-4xl font-bold tracking-wide text-white drop-shadow-[4px_4px_0_#64748b]">
            Type<span className="text-yellow-300">★</span>Clash
          </h1>

          <p className="mt-2 whitespace-nowrap text-base tracking-widest text-slate-300">
            リアルタイム対戦型タイピングアプリ
          </p>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-8 flex w-full max-w-sm flex-col gap-4"
          >
            {/* セッション期限切れ */}
            <p
              role={isExpired ? "alert" : undefined}
              className={`min-h-[25px] -mt-6 text-left text-base ${isExpired ? "text-yellow-300" : "text-transparent"}`}
            >
              {isExpired ? "セッションの有効期限が切れました。" : "\u00A0"}
            </p>

            {/* 通信エラー */}
            <p
              role={errors.general ? "alert" : undefined}
              className={`min-h-[25px] -mt-6 text-left text-base ${errors.general ? "text-red-400" : "text-transparent"}`}
            >
              {errors.general ?? "\u00A0"}
            </p>

            {/* メールアドレス */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="email"
                role={errors.email ? "alert" : undefined}
                className={`min-h-[20px] text-left text-sm ${errors.email ? "text-red-300" : "text-slate-200"}`}
              >
                {errors.email ?? "メールアドレス"}
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="*****@outlook.jp"
                className="border border-slate-400 bg-[#0d1b3e]/80 px-4 py-2 text-lg text-white outline-none placeholder:text-slate-400 focus:border-slate-100"
              />
            </div>

            {/* パスワード */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="password"
                role={errors.password ? "alert" : undefined}
                className={`min-h-[20px] text-left text-sm ${errors.password ? "text-red-300" : "text-slate-200"}`}
              >
                {errors.password ?? "パスワード"}
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="border border-slate-400 bg-[#0d1b3e]/80 px-4 py-2 text-lg text-white outline-none placeholder:text-slate-400 focus:border-slate-100"
              />
            </div>

            <p className="-mt-1.5 text-left text-sm">
              <a href="/forgot-password">
                <span className="text-slate-300 underline-offset-2 transition-colors hover:text-sky-400 hover:underline">
                  パスワードを忘れた方はこちら
                </span>
              </a>
            </p>

            {/* ログインボタン */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 border border-slate-400 bg-[#0d1b3e]/60 py-2 text-lg font-bold tracking-[0.03em] text-white hover:border-yellow-200 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "読み込み中..." : "ログイン"}
            </button>

            <p className="mt-3 text-center text-[1.15rem]">
              <a href="/register">
                <span className="text-blue-300 underline-offset-2 transition-colors hover:text-sky-400 hover:underline">
                  新規登録はこちら
                </span>
              </a>
            </p>
          </form>

          <BackButton />
        </WindowPanel>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

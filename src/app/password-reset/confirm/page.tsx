"use client";

import { useState } from "react";

import WindowPanel from "@/components/WindowPanel";

type FormErrors = {
  email?: string;
  general?: string;
};

const API_BASE = "http://localhost:8080";

function validateEmail(email: string): FormErrors {
  const errors: FormErrors = {};

  if (!email) {
    errors.email = "メールアドレスを入力してください";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "メールアドレスの形式が正しくありません";
  }

  return errors;
}

export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validateEmail(email);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch(`${API_BASE}/api/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data: { message?: string } = await res.json().catch(() => ({}));
        setErrors({
          general: data.message ?? "送信に失敗しました",
        });
        return;
      }

      setIsSent(true);
    } catch {
      setErrors({ general: "通信エラーが発生しました" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center overflow-auto">
      <div className="[&>section]:min-h-[400px] [&>section]:min-w-[600px]">
        <WindowPanel>
          <h1 className="text-3xl font-bold tracking-wide text-white">
            パスワード再設定申請
          </h1>

          {isSent ? (
            <div className="mt-6 flex w-full max-w-sm flex-col gap-5">
              <p className="text-center text-sm leading-relaxed text-slate-200">
                パスワード再設定用のメールを送信しました。
                <br />
                メールに記載されているURLからパスワードを再設定してください。
              </p>
              <p className="text-center text-sm text-slate-300">
                <a href="/login">
                  <span className="text-blue-300 underline-offset-2 transition-colors hover:text-sky-400 hover:underline">
                    ログイン画面に戻る
                  </span>
                </a>
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-6 flex w-full max-w-sm flex-col gap-5"
            >
              <p className="whitespace-nowrap -mt-3 text-left text-sm text-slate-300">
                登録済みのメールアドレスを入力してください。
              </p>

              {/* 通信エラー */}
              <p
                role={errors.general ? "alert" : undefined}
                className={`min-h-[25px] -mt-3 text-left text-base ${errors.general ? "text-red-400" : "text-transparent"}`}
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

              {/* 送信ボタン */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 border border-slate-400 bg-[#0d1b3e]/60 py-2 text-lg font-bold tracking-[0.03em] text-white hover:border-yellow-200 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "読み込み中..." : "送信する"}
              </button>

              <p className="text-center text-sm text-slate-300">
                <a href="/login">
                  <span className="text-blue-300 underline-offset-2 transition-colors hover:text-sky-400 hover:underline">
                    ログイン画面に戻る
                  </span>
                </a>
              </p>
            </form>
          )}
        </WindowPanel>
      </div>
    </main>
  );
}

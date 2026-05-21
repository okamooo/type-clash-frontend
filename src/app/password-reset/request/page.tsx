"use client";

import { useState } from "react";

import WindowPanel from "@/components/WindowPanel";

type FormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
};

const API_BASE = "http://localhost:8080";

function validateForm(
  email: string,
  password: string,
  confirmPassword: string
): FormErrors {
  const errors: FormErrors = {};

  if (!email) {
    errors.email = "メールアドレスを入力してください";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "メールアドレスの形式が正しくありません";
  }

  if (!password) {
    errors.password = "新しいパスワードを入力してください";
  } else if (password.length < 8 || password.length > 127) {
    errors.password = "パスワードは8文字以上、127文字以内で入力してください";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "確認用パスワードを入力してください";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "パスワードが一致しません";
  }

  return errors;
}

export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validateForm(email, password, confirmPassword);
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
        body: JSON.stringify({ email, password }),
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

              {/* 新しいパスワード */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="password"
                  role={errors.password ? "alert" : undefined}
                  className={`min-h-[20px] text-left text-sm ${errors.password ? "text-red-300" : "text-slate-200"}`}
                >
                  {errors.password ?? "新しいパスワード"}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="新しいパスワードを入力してください"
                    className="w-full border border-slate-400 bg-[#0d1b3e]/80 px-4 py-2 pr-12 text-lg text-white outline-none placeholder:text-slate-400 focus:border-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示する"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* 新しいパスワード（確認用） */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="confirmPassword"
                  role={errors.confirmPassword ? "alert" : undefined}
                  className={`min-h-[20px] text-left text-sm ${errors.confirmPassword ? "text-red-300" : "text-slate-200"}`}
                >
                  {errors.confirmPassword ?? "新しいパスワード（確認用）"}
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="新しいパスワードを再入力してください"
                    className="w-full border border-slate-400 bg-[#0d1b3e]/80 px-4 py-2 pr-12 text-lg text-white outline-none placeholder:text-slate-400 focus:border-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label={showConfirmPassword ? "パスワードを隠す" : "パスワードを表示する"}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
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

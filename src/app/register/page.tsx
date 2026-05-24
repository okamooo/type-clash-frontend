"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import VerificationCodeForm from "@/components/VerificationCodeForm";
import WindowPanel from "@/components/WindowPanel";

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  verificationCode?: string;
  general?: string;
};

const API_BASE = "http://localhost:8080";

function validateRegister(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): FormErrors {
  const errors: FormErrors = {};

  if (!name) {
    errors.name = "ユーザー名を入力してください";
  }

  if (!email) {
    errors.email = "メールアドレスを入力してください";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "メールアドレスの形式が正しくありません";
  }

  if (!password) {
    errors.password = "パスワードを入力してください";
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

function validateCode(code: string): FormErrors {
  const errors: FormErrors = {};

  if (!code) {
    errors.verificationCode = "認証コードを入力してください";
  }

  return errors;
}

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<"register" | "verify">("register");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validateRegister(
      name,
      email,
      password,
      confirmPassword,
    );
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data: { message?: string } = await res.json().catch(() => ({}));

        if (res.status === 409) {
          setErrors({
            general: "このメールアドレスは既に登録されています。",
          });
          return;
        }

        setErrors({
          general: data.message ?? "ユーザー登録に失敗しました",
        });

        return;
      }

      setStep("verify");
    } catch {
      setErrors({ general: "通信エラーが発生しました" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validateCode(verificationCode);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }


    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: verificationCode }),
      });

      if (!res.ok) {
        const data: { message?: string } = await res.json().catch(() => ({}));
        setErrors({ general: data.message ?? "認証コードが正しくありません" });
        return;
      }

      router.push("/login");
    } catch {
      setErrors({ general: "通信エラーが発生しました" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReSend() {
    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        setErrors({ general: "再送信に失敗しました" });
      }
    } catch {
      setErrors({ general: "通信エラーが発生しました" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center overflow-auto">
      <div className="[&>section]:min-h-[500px] [&>section]:min-w-[600px]">
        <WindowPanel>
          <h1 className="text-3xl font-bold tracking-wide text-white">
            新規登録
          </h1>

          {step === "register" ? (
            <form
              onSubmit={handleRegister}
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

              {/* ユーザー名 */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="name"
                  role={errors.name ? "alert" : undefined}
                  className={`min-h-[20px] text-left text-sm ${errors.name ? "text-red-300" : "text-slate-200"}`}
                >
                  {errors.name ?? "ユーザー名"}
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="username"
                  placeholder="山田 太郎"
                  className="border border-slate-400 bg-[#0d1b3e]/80 px-4 py-2 text-lg text-white outline-none placeholder:text-slate-400 focus:border-slate-100"
                />
              </div>

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
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="8文字以上、127文字以内"
                  className="border border-slate-400 bg-[#0d1b3e]/80 px-4 py-2 text-lg text-white outline-none placeholder:text-slate-400 focus:border-slate-100"
                />
              </div>

              {/* パスワード（確認用） */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="confirmPassword"
                  role={errors.confirmPassword ? "alert" : undefined}
                  className={`min-h-[20px] text-left text-sm ${errors.confirmPassword ? "text-red-300" : "text-slate-200"}`}
                >
                  {errors.confirmPassword ?? "パスワード（確認用）"}
                </label>
                <input
                  id="confirmPassword"
                  type="text"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="パスワードを再入力してください"
                  className="border border-slate-400 bg-[#0d1b3e]/80 px-4 py-2 text-lg text-white outline-none placeholder:text-slate-400 focus:border-slate-100"
                />
              </div>

              {/* 登録ボタン */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 border border-slate-400 bg-[#0d1b3e]/60 py-2 text-lg font-bold tracking-[0.03em] text-white hover:border-yellow-200 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "読み込み中..." : "登録する"}
              </button>

              <p className="text-center text-sm text-slate-300">
                すでにアカウントをお持ちの方は{" "}
                <a href="/login">
                  <span className="text-blue-300 underline-offset-2 transition-colors hover:text-sky-400 hover:underline">
                    ログイン
                  </span>
                </a>
              </p>
            </form>
          ) : (
            <VerificationCodeForm
              verificationCode={verificationCode}
              onCodeChange={setVerificationCode}
              onSubmit={handleVerify}
              onResend={handleReSend}
              isSubmitting={isSubmitting}
              error={errors.general}
              fieldError={errors.verificationCode}
              variant="register"
            />
          )}
        </WindowPanel>
      </div>
    </main>
  );
}

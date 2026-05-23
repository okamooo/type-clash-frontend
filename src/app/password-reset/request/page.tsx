"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import VerificationCodeForm from "@/components/VerificationCodeForm";
import WindowPanel from "@/components/WindowPanel";
import Link from "next/link";

type FormErrors = {
  email?: string;
  verificationCode?: string;
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
  const [step, setStep] = useState<"request" | "verify">("request");

  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});

  const router = useRouter();

  async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
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
        if (res.status === 404) {
          setErrors({ email: "登録されていないメールアドレスです" });
          return;
        }

        setErrors({ general: "送信に失敗しました" });
        return;
      }

      setStep("verify");
      setErrors({});
    } catch {
      setErrors({ general: "通信エラーが発生しました" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!verificationCode.trim()) {
      setErrors({ verificationCode: "認証コードを入力してください" });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp: verificationCode }),
      });

      if (!res.ok) {
        setErrors({ general: "認証コードが正しくありません" });
        return;
      }

      router.push("/password-reset/reset");
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
      const res = await fetch(`${API_BASE}/api/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setErrors({ general: "再送信に失敗しました" });
        return;
      }

      // 成功フィードバック
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);

      // 30秒クールダウン
      setResendCooldown(30);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
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

          {step === "request" ? (
            <form
              onSubmit={handleRequest}
              noValidate
              className="mt-6 flex w-full max-w-sm flex-col gap-5"
            >
              <p className="whitespace-nowrap -mt-3 text-left text-sm text-slate-300">
                登録済みのメールアドレスを入力してください。
              </p>

              {/* 通信エラー */}
              <p
                role={errors.general ? "alert" : undefined}
                className={`min-h-[25px] -mt-3 text-left text-sm ${errors.general ? "text-red-400" : "text-transparent"}`}
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
                <Link href="/login">
                  <span className="text-blue-300 underline-offset-2 transition-colors hover:text-sky-400 hover:underline">
                    ログイン画面に戻る
                  </span>
                </Link>
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
              // 後で外す
              // resendCooldown={resendCooldown}
              // resendSuccess={resendSuccess}
            />
          )}
        </WindowPanel>
      </div>
    </main>
  );
}

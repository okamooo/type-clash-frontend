"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import VerificationCodeForm from "@/components/VerificationCodeForm";
import WindowPanel from "@/components/WindowPanel";
import { useResendCooldown } from "@/hooks/useResendCooldown";
import {
  validateEmail,
  validateVerificationCode,
  type ValidationErrors,
} from "@/lib/validation";
import Link from "next/link";

const API_BASE = "http://localhost:8080";

export default function PasswordResetRequestPage() {
  const [step, setStep] = useState<"request" | "verify">("request");

  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { resendCooldown, resendSuccess, startResendCooldown } =
    useResendCooldown();

  const [errors, setErrors] = useState<ValidationErrors>({});

  const router = useRouter();

  async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const emailError = validateEmail(email);
    const validationErrors: ValidationErrors = emailError ? { email: emailError } : {};
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

    const codeError = validateVerificationCode(verificationCode);
    if (codeError) {
      setErrors({ verificationCode: codeError });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await fetch(`${API_BASE}/api/auth/password-reset/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp: verificationCode }),
      });

      if (!res.ok) {
        setErrors({ general: "認証コードが正しくありません" });
        return;
      }

      router.push("/password-reset/new");
    } catch {
      setErrors({ general: "通信エラーが発生しました" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReSend() {
    setIsResending(true);
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

      startResendCooldown();
    } catch {
      setErrors({ general: "通信エラーが発生しました" });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center overflow-auto">
      <div className="[&>section]:min-w-[600px]">
        <WindowPanel>
          <h1 className="text-3xl font-bold tracking-wide text-white">
            パスワード再設定
          </h1>

          {step === "request" ? (
            <form
              onSubmit={handleRequest}
              noValidate
              className="mt-6 flex w-full max-w-sm flex-col gap-5"
            >
              
              {/* 通信エラー */}
              <p
                role={errors.general ? "alert" : undefined}
                className={`min-h-[20px] text-left text-[15.5px] font-semibold ${errors.general ? "text-red-400" : "text-transparent"}`}
              >
                {errors.general ?? "\u00A0"}
              </p>

              <p className="whitespace-nowrap -mt-4 text-left text-[15px] text-slate-300">
                登録済みのメールアドレスを入力してください
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

              <p className="text-center text-base text-slate-300">
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
              isResending={isResending}
              error={errors.general}
              fieldError={errors.verificationCode}
              resendCooldown={resendCooldown}
              resendSuccess={resendSuccess}
            />
          )}
        </WindowPanel>
      </div>
    </main>
  );
}

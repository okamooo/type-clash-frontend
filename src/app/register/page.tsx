"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import EyeIcon from "@/components/EyeIcon";
import VerificationCodeForm from "@/components/VerificationCodeForm";
import WindowPanel from "@/components/WindowPanel";
import { useResendCooldown } from "@/hooks/useResendCooldown";
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validateVerificationCode,
  type ValidationErrors,
} from "@/lib/validation";
import Link from "next/link";

const API_BASE = "http://localhost:8080";

function validateRegister(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!name) {
    errors.name = "ユーザー名を入力してください";
  }

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const confirmPasswordError = validateConfirmPassword(password, confirmPassword);

  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

  return errors;
}

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<"register" | "verify">("register");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [otpLimitMessage, setOtpLimitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { resendCooldown, resendSuccess, startResendCooldown } =
    useResendCooldown();

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
    setSuccessMessage("");

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
            general: "このメールアドレスは既に登録されています",
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

    const codeError = validateVerificationCode(verificationCode);
    if (codeError) {
      setErrors({ verificationCode: codeError });
      return;
    }

    if (otpLimitMessage) {
      setErrors({ general: otpLimitMessage });
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});

    try {
      // OTP検証 → 成功すると registerToken Cookie がセットされる
      const verifyRes = await fetch(`${API_BASE}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp: verificationCode }),
      });


      if (!verifyRes.ok) {
        const data: { message?: string } = await verifyRes.json().catch(() => ({}));
        const isLimitError = data.message?.startsWith("試行回数の上限に達しました");
        const limitMessage = "試行回数の上限に達しました 再発行してください";

        if (isLimitError) {
          setOtpLimitMessage(limitMessage);
        }

        setErrors({
          general: isLimitError
            ? limitMessage
            : "認証コードが正しくありません",
        });
        return;
      }

      const registerRes = await fetch(`${API_BASE}/api/auth/registerUser`, {
        method: "POST",
        credentials: "include",
      });

      if (!registerRes.ok) {
        const data: { message?: string } = await registerRes.json().catch(() => ({}));
        setErrors({ general: data.message ?? "ユーザー登録に失敗しました" });
        return;
      }

      setSuccessMessage("登録が完了しました");

      setTimeout(() => {
        router.push("/login");
      }, 1500);

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
      const res = await fetch(`${API_BASE}/api/auth/otp/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        setErrors({ general: "再送信に失敗しました" });
        return;
      }

      setOtpLimitMessage("");
      startResendCooldown();
    } catch {
      setErrors({ general: "通信エラーが発生しました" });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center overflow-auto">
      <div
        className={
          step === "verify"
            ? "[&>section]:min-h-[400px] [&>section]:min-w-[535px]"
            : "[&>section]:min-h-[500px] [&>section]:min-w-[535px]"
        }
      >
        <WindowPanel>
          <h1 className="text-3xl font-bold tracking-wide text-white">
            {step === "verify" ? "認証コードを入力" : "新規登録"}
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
                className={`min-h-[20px] -mt-1 text-left text-base font-semibold ${errors.general ? "text-red-400" : "text-transparent"}`}
              >
                {errors.general ?? "\u00A0"}
              </p>

              {/* ユーザー名 */}
              <div className="-mt-2 flex flex-col gap-1">
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
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="8文字以上、127文字以内"
                    className="w-full border border-slate-400 bg-[#0d1b3e]/80 px-4 py-2 pr-12 text-lg text-white outline-none placeholder:text-slate-400 focus:border-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示する"}
                  >
                    <EyeIcon isHidden={!showPassword} />
                  </button>
                </div>
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
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="パスワードを再入力してください"
                    className="w-full border border-slate-400 bg-[#0d1b3e]/80 px-4 py-2 pr-12 text-lg text-white outline-none placeholder:text-slate-400 focus:border-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label={showConfirmPassword ? "パスワードを隠す" : "パスワードを表示する"}
                  >
                    <EyeIcon isHidden={!showConfirmPassword} />
                  </button>
                </div>
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
                <Link href="/login">
                  <span className="text-blue-300 underline-offset-2 transition-colors hover:text-sky-400 hover:underline">
                    ログイン
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
              successMessage={successMessage}
              resendCooldown={resendCooldown}
              resendSuccess={resendSuccess}
            />
          )}
        </WindowPanel>
      </div>
    </main>
  );
}

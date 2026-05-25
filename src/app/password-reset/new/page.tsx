"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import EyeIcon from "@/components/EyeIcon";
import WindowPanel from "@/components/WindowPanel";
import {
  validateConfirmPassword,
  validatePassword,
  type ValidationErrors,
} from "@/lib/validation";
import Link from "next/link";

const API_BASE = "http://localhost:8080";

function validatePasswords(password: string, confirmPassword: string): ValidationErrors {
  const errors: ValidationErrors = {};
  const passwordError = validatePassword(
    password,
    "新しいパスワードを入力してください",
  );
  const confirmPasswordError = validateConfirmPassword(password, confirmPassword);

  if (passwordError) errors.password = passwordError;
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

  return errors;
}

export default function PasswordResetNewPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSessionInvalid, setIsSessionInvalid] = useState(false);

  // クッキーの有無をサーバーに確認する
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/password-reset/verify-session`, {
          method: "GET",
          credentials: "include",
        });

        if (!mounted) return;

        if (!res.ok) {
          setIsSessionInvalid(true);
          setErrors({ general: "有効期限が切れています 再度お試しください" });

          setTimeout(() => {
            if (mounted) {
              router.push("/password-reset/request");
            }
          }, 2000);

          return;
        }
      } catch {
        if (mounted) {
          setErrors({ general: "通信エラーが発生しました" });
        }
      } finally {
        if (mounted) {
          setIsCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  function handleConfirmPasswordBlur() {
    if (!confirmPassword) return;

    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);
    if (confirmPasswordError) {
      setErrors((prev) => ({ ...prev, confirmPassword: confirmPasswordError }));
      return;
    }

    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationErrors = validatePasswords(password, confirmPassword);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage("");

    try {
      // emailはクッキーでバックエンドが参照するため送信不要
      const res = await fetch(`${API_BASE}/api/auth/password-reset/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setErrors({ general: "パスワードの更新に失敗しました" });
        return;
      }

      setSuccessMessage("パスワードを更新しました");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setErrors({ general: "通信エラーが発生しました" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isButtonDisabled =
    isSubmitting || isCheckingSession || isSessionInvalid || Boolean(successMessage);

  return (
    <main className="flex flex-1 items-center justify-center overflow-auto">
      <div className="[&>section]:min-h-[400px] [&>section]:min-w-[535px]">
        <WindowPanel>
          <h1 className="text-3xl font-bold tracking-wide text-white">
            パスワード再設定
          </h1>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-6 flex w-full max-w-sm flex-col gap-5"
          >

            {/* メッセージ表示 */}
            <p
              role={errors.general || successMessage ? "alert" : undefined}
              className={`min-h-[20px] text-left text-[15.5px] font-semibold ${errors.general ? "text-red-400" :
                  successMessage ? "text-emerald-300" :
                    "text-transparent"
                }`}
            >
              {errors.general || successMessage || "\u00A0"}
            </p>

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
                  onBlur={handleConfirmPasswordBlur}
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

            {/* 更新ボタン */}
            <button
              type="submit"
              disabled={isButtonDisabled}
              className="mt-1 border border-slate-400 bg-[#0d1b3e]/60 py-2 text-lg font-bold tracking-[0.03em] text-white hover:border-yellow-200 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCheckingSession
                ? "確認中..."
                : isSubmitting
                  ? "送信中..."
                  : successMessage
                    ? "ログイン画面へ移動中..."
                    : "パスワードを更新する"}
            </button>

            <p className="text-center text-base text-slate-300">
              <Link href="/login">
                <span className="text-blue-300 underline-offset-2 transition-colors hover:text-sky-400 hover:underline">
                  ログイン画面に戻る
                </span>
              </Link>
            </p>
          </form>
        </WindowPanel>
      </div>
    </main>
  );
}

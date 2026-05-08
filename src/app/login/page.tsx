"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import BackButton from "@/components/BackButton";
import WindowPanel from "@/components/WindowPanel";

type FormErrors = {
  email?: string;
  password?: string;
  general?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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

export default function LoginPage() {
  const router = useRouter();
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
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data: { message?: string } = await res.json().catch(() => ({}));
        setErrors({ general: data.message ?? "メールアドレスまたはパスワードが正しくありません" });
        return;
      }

      const data: { token: string } = await res.json();
      localStorage.setItem("token", data.token);
      router.push("/home");
    } catch {
      //バックエンドは未実装のためvalidationが通ればどのようなメールアドレス、パスワードでもログイン可能
      router.push("/home")
      setErrors({ general: "通信エラーが発生しました。再度お試しください" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center">
      <WindowPanel>
        <h1 className="text-3xl font-bold drop-shadow-[4px_4px_0_#64748b] sm:text-5xl">
          ログイン
        </h1>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-10 flex w-full max-w-sm flex-col gap-6"
        >
          {errors.general && (
            <p
              role="alert"
              className="border border-red-400 bg-red-900/30 px-4 py-2 text-sm text-red-300 sm:text-base"
            >
              {errors.general}
            </p>
          )}

          <div className="flex flex-col gap-2 text-left">
            <label htmlFor="email" className="text-sm sm:text-base">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="border-2 border-white bg-[#050816] px-3 py-2 text-base text-white outline-none focus:border-yellow-200 sm:text-lg"
            />
            {errors.email && (
              <p role="alert" className="text-xs text-red-300 sm:text-sm">
                {errors.email}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 text-left">
            <label htmlFor="password" className="text-sm sm:text-base">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="border-2 border-white bg-[#050816] px-3 py-2 text-base text-white outline-none focus:border-yellow-200 sm:text-lg"
            />
            {errors.password && (
              <p role="alert" className="text-xs text-red-300 sm:text-sm">
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 border-2 border-white py-3 text-base font-bold transition-colors hover:border-yellow-200 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-50 sm:text-xl"
          >
            {isSubmitting ? "ログイン中..." : "▶ ログイン"}
          </button>
        </form>

        <BackButton />
      </WindowPanel>
    </main>
  );
}

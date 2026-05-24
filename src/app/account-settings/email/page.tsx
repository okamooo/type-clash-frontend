"use client";

import Link from "next/link";
import { useState } from "react";

import WindowPanel from "@/components/WindowPanel";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { validateConfirmEmail, validateEmail } from "@/lib/validation";

async function updateEmail(email: string): Promise<void> {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    throw new Error("ユーザー情報が取得できませんでした");
  }
  const response = await fetchWithAuth(`/api/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data.message
      ? data.message.replace(/\s*ID:\s*\d+/g, "")
      : `メール変更に失敗しました（${response.status}）`;
    throw new Error(message);
  }
}

export default function EmailSettingsPage() {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setMessage("");
    setErrorMessage("");

    const emailError = validateEmail(email);
    if (emailError) {
      setErrorMessage(emailError);
      return;
    }

    const confirmEmailError = validateConfirmEmail(email, confirmEmail);
    if (confirmEmailError) {
      setErrorMessage(confirmEmailError);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateEmail(email);
      setMessage("メールアドレスを変更しました");
      setEmail("");
      setConfirmEmail("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "通信エラーが発生しました";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center">
      <WindowPanel>
        <h1 className="text-3xl font-bold drop-shadow-[4px_4px_0_#64748b] sm:text-5xl">
          メール変更
        </h1>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit().catch((error: unknown) => {
              console.error(error);
            });
          }}
          className="mt-8 flex w-full max-w-md flex-col gap-5 text-left"
        >
          <label className="flex flex-col gap-2">
            <span className="text-yellow-200">新しいメールアドレス</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border-2 border-white bg-[#050816] px-4 py-3 text-white outline-none focus:border-yellow-200"
              placeholder="guest@example.com"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-yellow-200">確認用メールアドレス</span>
            <input
              type="email"
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              className="border-2 border-white bg-[#050816] px-4 py-3 text-white outline-none focus:border-yellow-200"
              placeholder="guest@example.com"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="self-start border-2 border-white px-4 py-2 transition-colors hover:border-yellow-200 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "▶ 変更中..." : "▶ 変更する"}
          </button>
        </form>

        {message ? <p className="mt-4 text-yellow-200">{message}</p> : null}
        {errorMessage ? (
          <p className="mt-4 text-red-300">{errorMessage}</p>
        ) : null}

        <Link
          href="/account-settings"
          className="mt-8 self-start text-base transition-colors hover:text-yellow-200 sm:text-xl"
        >
          ▶ アカウント設定に戻る
        </Link>
      </WindowPanel>
    </main>
  );
}

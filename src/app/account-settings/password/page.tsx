"use client";

import Link from "next/link";
import { useState } from "react";

import WindowPanel from "@/components/WindowPanel";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    throw new Error("ユーザー情報が取得できませんでした");
  }
  const response = await fetchWithAuth(`/api/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, password: newPassword }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data.message
      ? data.message.replace(/\s*ID:\s*\d+/g, "")
      : `パスワード変更に失敗しました（${response.status}）`;
    throw new Error(message);
  }
}

export default function PasswordSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    setMessage("");
    setErrorMessage("");

    if (newPassword.length < 8 || newPassword.length > 127) {
      setErrorMessage("パスワードは8文字以上、127文字以内で入力してください");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("新しいパスワードが一致していません");
      return;
    }

    try {
      await updatePassword(currentPassword, newPassword);
      setMessage("パスワードを変更しました");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "通信エラーが発生しました";
      setErrorMessage(msg);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center">
      <WindowPanel>
        <h1 className="text-3xl font-bold drop-shadow-[4px_4px_0_#64748b] sm:text-5xl">
          パスワード変更
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
            <span className="text-yellow-200">現在のパスワード</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="border-2 border-white bg-[#050816] px-4 py-3 text-white outline-none focus:border-yellow-200"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-yellow-200">新しいパスワード</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="border-2 border-white bg-[#050816] px-4 py-3 text-white outline-none focus:border-yellow-200"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-yellow-200">新しいパスワードをもう一度</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="border-2 border-white bg-[#050816] px-4 py-3 text-white outline-none focus:border-yellow-200"
              required
            />
          </label>

          <button
            type="submit"
            className="self-start border-2 border-white px-4 py-2 transition-colors hover:border-yellow-200 hover:text-yellow-200"
          >
            ▶ 変更する
          </button>
        </form>

        {errorMessage ? <p className="mt-4 text-red-300">{errorMessage}</p> : null}
        {message ? <p className="mt-4 text-yellow-200">{message}</p> : null}

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

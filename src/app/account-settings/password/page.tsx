"use client";

import Link from "next/link";
import { useState } from "react";

import WindowPanel from "@/components/WindowPanel";

async function updatePassword(currentPassword: string, newPassword: string) {
  console.log("TODO: PATCH /api/users/:userId", {
    currentPassword,
    newPassword,
  });
}

export default function PasswordSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    setMessage("");

    if (newPassword !== confirmPassword) {
      setErrorMessage("新しいパスワードが一致していません");
      return;
    }

    setErrorMessage("");
    await updatePassword(currentPassword, newPassword);
    setMessage("パスワード変更の仮処理を実行しました");
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

"use client";

import Link from "next/link";
import { useState } from "react";

import EyeIcon from "@/components/EyeIcon";
import WindowPanel from "@/components/WindowPanel";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
  removePasswordSpaces,
  validateConfirmPassword,
  validateCurrentPassword,
  validatePassword,
} from "@/lib/validation";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async () => {
    setMessage("");
    setErrorMessage("");

    const currentPasswordError = validateCurrentPassword(currentPassword);
    if (currentPasswordError) {
      setErrorMessage(currentPasswordError);
      return;
    }

    const newPasswordError = validatePassword(newPassword);
    if (newPasswordError) {
      setErrorMessage(newPasswordError);
      return;
    }

    const confirmPasswordError = validateConfirmPassword(
      newPassword,
      confirmPassword,
    );
    if (confirmPasswordError) {
      setErrorMessage(confirmPasswordError);
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setMessage("パスワードを変更しました");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(removePasswordSpaces(event.target.value))}
                className="w-full border-2 border-white bg-[#050816] px-4 py-3 pr-12 text-white outline-none focus:border-yellow-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                aria-label={showCurrentPassword ? "パスワードを隠す" : "パスワードを表示する"}
              >
                <EyeIcon isHidden={!showCurrentPassword} />
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-yellow-200">新しいパスワード</span>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(removePasswordSpaces(event.target.value))}
                className="w-full border-2 border-white bg-[#050816] px-4 py-3 pr-12 text-white outline-none focus:border-yellow-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                aria-label={showNewPassword ? "パスワードを隠す" : "パスワードを表示する"}
              >
                <EyeIcon isHidden={!showNewPassword} />
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-yellow-200">新しいパスワードをもう一度</span>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(removePasswordSpaces(event.target.value))}
                className="w-full border-2 border-white bg-[#050816] px-4 py-3 pr-12 text-white outline-none focus:border-yellow-200"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                aria-label={showConfirmPassword ? "パスワードを隠す" : "パスワードを表示する"}
              >
                <EyeIcon isHidden={!showConfirmPassword} />
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="self-start border-2 border-white px-4 py-2 transition-colors hover:border-yellow-200 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "▶ 変更中..." : "▶ 変更する"}
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

"use client";

import { useEffect, useState } from "react";

import WindowPanel from "@/components/WindowPanel";

const AUTH_SESSION_INVALID_EVENT = "auth-session-invalid";

export default function AuthSessionInvalidModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleAuthSessionInvalid = () => {
      setIsOpen(true);
    };

    window.addEventListener(AUTH_SESSION_INVALID_EVENT, handleAuthSessionInvalid);

    return () => {
      window.removeEventListener(AUTH_SESSION_INVALID_EVENT, handleAuthSessionInvalid);
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    window.location.replace("/");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-session-invalid-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    >
      <WindowPanel className="max-w-md p-5 text-center sm:p-6">
        <h2
          id="auth-session-invalid-title"
          className="text-xl font-bold tracking-wide text-white"
        >
          ログイン状態を確認できません
        </h2>
        <p className="mt-3 text-base leading-7 text-slate-300">
          セッションの有効期限が切れました
          <br />
          再度ログインしてください
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-6 w-[69%] border border-slate-400 bg-[#0d1b3e]/60 px-6 py-2 text-base font-bold tracking-[0.03em] text-white hover:border-yellow-200 hover:text-yellow-200"
        >
          OK
        </button>
      </WindowPanel>
    </div>
  );
}

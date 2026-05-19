"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import UserAvatar from "@/components/UserAvatar";
import WindowPanel from "@/components/WindowPanel";

const MAX_NAME_LENGTH = 50;
const API_BASE = "http://localhost:8080";

const SETTINGS = [
  {
    label: "メール変更",
    href: "/account-settings/email",
    danger: false,
  },
  {
    label: "パスワード変更",
    href: "/account-settings/password",
    danger: false,
  },
  {
    label: "アカウント削除",
    href: "/account-settings/delete",
    danger: true,
  },
] as const;

/**
 * プレイヤー名変更用モーダル
 */
function PlayerNameModal({
  initialName,
  onClose,
  onSave,
}: {
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialName);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onSave(value.trim());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "通信エラーが発生しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isSubmitting) return;

    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="flex w-[90vw] max-w-[340px] flex-col gap-4 rounded-lg border-2 border-white/30 bg-[#0f1e3b] p-6 shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
        <h2 className="text-center text-xl font-bold drop-shadow-[2px_2px_0_#64748b]">
          プレイヤー名
        </h2>

        <div className="mb-1 flex flex-col gap-1">
          <input
            ref={inputRef}
            type="text"
            disabled={isSubmitting}
            maxLength={MAX_NAME_LENGTH}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-white/30 bg-white/10 px-3 py-2 text-lg outline-none focus:border-white/60 disabled:opacity-60"
          />

          <p className="text-xs text-center text-white/50">
            {MAX_NAME_LENGTH}文字まで入力できます
          </p>

          <p
            role={errorMessage ? "alert" : undefined}
            className={`min-h-[30px] -mb-5 text-xs ${errorMessage ? "text-red-400" : "text-transparent"
              }`}
          >
            {errorMessage || "\u00A0"}
          </p>
        </div>

        <div className="mt-10 flex gap-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer border-2 border-white bg-[#050816] py-1.5 font-bold transition-colors hover:border-red-400 hover:text-red-400"
          >
            キャンセル
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!value.trim() || isSubmitting}
            className="flex-1 cursor-pointer border-2 border-white bg-[#050816] py-1.5 font-bold transition-colors hover:border-blue-400 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "保存中..." : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * アカウント設定画面
 */
export default function AccountSettingsPage() {
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);

  const [user, setUser] = useState<{
    id: number;
    name: string;
    email: string;
    iconImage: string | null;
  } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userId = localStorage.getItem("userId");

      if (!userId) return;

      try {
        const res = await fetch(`${API_BASE}/api/users/${userId}`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error();
        }

        const data = await res.json();

        setUser(data);
        
      } catch {
        console.error("ユーザー情報の取得に失敗しました");
      }
    };

    fetchUser();
  }, []);

  const handleGoHome = () => {
    router.push("/home");
  };

  /**
   * プレイヤー名変更APIを呼び出す
   * 通信タイムアウト時はリクエストを中断する
   */
  const handleSaveName = async (newName: string) => {
    if (!user) {
      throw new Error("ユーザー情報が取得できていません");
    }

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 5000);

    try {
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error("ユーザー名の変更に失敗しました");
      }

      const data: { id: number; name: string } = await res.json();

      setUser((prev) => prev ? { ...prev, name: data.name } : prev);

      setShowModal(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(
          "通信に時間がかかっています。時間をおいて再度お試しください"
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return (
    <>
      <main className="flex flex-1 items-center justify-center">
        <WindowPanel>
          <h1 className="text-3xl font-bold drop-shadow-[4px_4px_0_#64748b] sm:text-5xl">
            アカウント設定
          </h1>

          <div className="mt-8 flex w-full max-w-md flex-col items-center">
            {user && <UserAvatar user={user} size="lg" />}

            <div className="mt-5 w-[80%]">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                disabled={!user}
                className="group flex w-full cursor-pointer items-center rounded border border-white/20 bg-white/5 px-3 py-3 text-left text-2xl transition-colors hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex-1 truncate text-center">
                  {user?.name}
                </span>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-colors group-hover:text-yellow-200"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>

            <div className="mt-2 flex flex-col items-center gap-1 text-sm text-white/70">
              <p>ユーザーID: {user?.id}</p>
              <p>メール: {user?.email}</p>
            </div>

            <div className="mt-8 w-full border-2 border-white p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,0.45)]">
              <ul className="flex flex-col gap-4 text-lg">
                {SETTINGS.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={`transition-colors ${item.danger
                        ? "hover:text-red-300"
                        : "hover:text-yellow-200"
                        }`}
                    >
                      ▶ {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoHome}
            className="mt-8 self-start text-base transition-colors hover:text-yellow-200 sm:text-xl"
          >
            ▶ ホーム画面に戻る
          </button>
        </WindowPanel>
      </main>

      {showModal && (
        <PlayerNameModal
          initialName={user?.name ?? ""}
          onClose={() => setShowModal(false)}
          onSave={handleSaveName}
        />
      )}
    </>
  );
}

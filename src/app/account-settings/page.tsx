"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import UserAvatar from "@/components/UserAvatar";
import WindowPanel from "@/components/WindowPanel";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
  removeUserNameSpaces,
  validateUserName,
} from "@/lib/validation";

const MAX_NAME_LENGTH = 50;
const MAX_ICON_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_ICON_FILE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const editIcon = (
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
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);


type PlayerNameModalProps = {
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
};

/**
 * ユーザー名変更用モーダル
 */
function PlayerNameModal(props: PlayerNameModalProps) {

  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(props.initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = async () => {
    const validationError = validateUserName(value);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await props.onSave(value);
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
    setValue(removeUserNameSpaces(e.target.value));

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isSubmitting) return;

    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") props.onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          props.onClose();
        }
      }}
    >
      <div className="flex w-[90vw] max-w-[340px] flex-col gap-4 rounded-lg border-2 border-white/30 bg-[#0f1e3b] p-6 shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
        <h2 className="text-center text-xl font-bold drop-shadow-[2px_2px_0_#64748b]">
          ユーザー名
        </h2>

        <div className="mb-1 flex flex-col gap-1">
          <input
            type="text"
            ref={inputRef}
            value={value}
            disabled={isSubmitting}
            maxLength={MAX_NAME_LENGTH}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-white/30 bg-white/10 px-3 py-1.5 text-lg outline-none focus:border-white/60 disabled:opacity-60"
          />

          <p className="text-xs text-white/50">
            {MAX_NAME_LENGTH}文字まで入力できます
          </p>

          <p
            role="alert"
            className={`min-h-[20px] mt-1 text-sm ${errorMessage ? "text-red-400" : "text-transparent"}`}
          >
            {errorMessage || "\u00A0"}
          </p>
        </div>

        <div className="flex gap-10">
          <button
            type="button"
            onClick={props.onClose}
            className="flex-1 cursor-pointer border-2 border-white bg-[#050816] py-1.5 font-bold transition-colors hover:border-red-400 hover:text-red-400"
          >
            キャンセル
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={Boolean(validateUserName(value)) || isSubmitting}
            className="flex-1 cursor-pointer border-2 border-white bg-[#050816] py-1.5 font-bold transition-colors hover:border-blue-400 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "保存中" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}

type User = {
  id: number;
  name: string;
  email: string;
  iconImage: string | null;
};

/**
 * アカウント設定画面
 */
export default function AccountSettingsPage() {
  const router = useRouter();
  const { updateCurrentUser } = useCurrentUser();
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [iconErrorMessage, setIconErrorMessage] = useState("");
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const userId = localStorage.getItem("userId");

      if (!userId) return;

      try {
        const res = await fetchWithAuth(`/api/users/${userId}`);

        if (!res.ok) {
          throw new Error();
        }

        const data = await res.json();

        setUser(data);
        updateCurrentUser(data);

      } catch {
        console.error("ユーザー情報の取得に失敗しました");
      }
    };

    fetchUser();
  }, [updateCurrentUser]);

  /**
   * ユーザー名変更APIを呼び出す
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
      const res = await fetchWithAuth(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error("ユーザー名の変更に失敗しました");
      }

      const data: { id: number; name: string } = await res.json();

      setUser((prev) => {
        if (!prev) return prev;
        return { ...prev, name: data.name };
      });
      updateCurrentUser({ name: data.name });

      setShowModal(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(
          "時間をおいて再度お試しください"
        );
      }

      throw new Error("通信エラーが発生しました");
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file || !user) return;

    if (!ALLOWED_ICON_FILE_TYPES.includes(file.type)) {
      setIconErrorMessage("PNG、JPEG、WebP形式の画像を選択してください");
      return;
    }

    if (file.size > MAX_ICON_FILE_SIZE) {
      setIconErrorMessage("画像サイズは5MB以下にしてください");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploadingIcon(true);
    setIconErrorMessage("");

    try {
      const res = await fetchWithAuth(`/api/users/${user.id}/icon`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data: { message?: string } = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "画像のアップロードに失敗しました");
      }

      const data: User = await res.json();
      const iconImage = data.iconImage
        ? `${data.iconImage}?t=${Date.now()}`
        : data.iconImage;

      setUser({ ...data, iconImage });
      updateCurrentUser({ ...data, iconImage });
    } catch (error) {
      setIconErrorMessage(
        error instanceof Error
          ? error.message
          : "画像のアップロードに失敗しました"
      );
    } finally {
      setIsUploadingIcon(false);

      if (iconInputRef.current) {
        iconInputRef.current.value = "";
      }
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
            <div className="relative">
              {user && <UserAvatar user={user} size="lg" />}

              <button
                type="button"
                onClick={() => iconInputRef.current?.click()}
                disabled={!user || isUploadingIcon}
                aria-label="アイコン画像を変更"
                className="absolute bottom-0 right-0 flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-[#13224a] text-white transition-colors hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {editIcon}
              </button>
            </div>

            <input
              ref={iconInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleIconFileChange}
            />

            <p
              role={iconErrorMessage ? "alert" : undefined}
              className={`mt-2 min-h-[20px] text-sm ${iconErrorMessage ? "text-red-400" : "text-transparent"}`}
            >
              {iconErrorMessage || "\u00A0"}
            </p>

            <div className="mt-5 w-[80%]">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                disabled={!user}
                className="group flex w-full cursor-pointer items-center rounded border border-white/20 bg-white/5 px-3 py-1.5 text-left text-2xl transition-colors hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex-1 truncate text-center">
                  {user?.name}
                </span>

                {editIcon}
              </button>
            </div>

            <div className="mt-2 flex flex-col items-center gap-1 text-sm text-white/70">
              <p>ユーザーID: {user?.id}</p>
              <p>メール: {user?.email}</p>
            </div>

            <div className="mt-8 w-full border-2 border-white p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,0.45)]">
              <ul className="flex flex-col gap-4 text-lg">
                <li>
                  <Link href="/account-settings/email">
                    ▶ メール変更
                  </Link>
                </li>

                <li>
                  <Link href="/account-settings/password">
                    ▶ パスワード変更
                  </Link>
                </li>

                <li>
                  <Link href="/account-settings/delete">
                    ▶ アカウント削除
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/home")}
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

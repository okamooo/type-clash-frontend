"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import UserAvatar from "@/components/UserAvatar";
import WindowPanel from "@/components/WindowPanel";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

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

export default function AccountSettingsPage() {
  const router = useRouter();
  const { currentUser } = useCurrentUser();

  const handleGoHome = () => {
    router.push("/home");
  };

  return (
    <main className="flex flex-1 items-center justify-center">
      <WindowPanel>
        <h1 className="text-3xl font-bold drop-shadow-[4px_4px_0_#64748b] sm:text-5xl">
          アカウント設定
        </h1>

        <div className="mt-8 flex w-full max-w-md flex-col items-center">
          <UserAvatar user={currentUser} size="lg" />

          <p className="mt-5 text-3xl leading-tight">{currentUser.name}</p>
          <div className="mt-2 flex flex-col items-center gap-1 text-sm text-white/70">
            <p>ユーザーID: {currentUser.id}</p>
            <p>メール: {currentUser.email}</p>
          </div>

          <div className="mt-8 w-full border-2 border-white p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,0.45)]">
            <ul className="flex flex-col gap-4 text-lg">
              {SETTINGS.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`transition-colors ${
                      item.danger ? "hover:text-red-300" : "hover:text-yellow-200"
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
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import SlimeButton from "@/components/SlimeButton";
import UserAvatar from "@/components/UserAvatar";
import WindowPanel from "@/components/WindowPanel";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

const backgroundOptions = [
  { id: 0, label: "背景 1" },
  { id: 1, label: "背景 2" },
] as const;

const headerVisiblePaths = new Set([
  "/home",
  "/cat",
  "/skull",
  "/account-settings",
  "/account-settings/email",
  "/account-settings/password",
  "/account-settings/delete",
]);

export default function CommonHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, updateCurrentUser } = useCurrentUser();
  const headerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState(
    currentUser.backgroundImage,
  );

  useEffect(() => {
    document.body.dataset.backgroundId = String(selectedBackground);
  }, [selectedBackground]);

  useEffect(() => {
    if (!isClicked) {
      return;
    }

    const clickJumpTimer = globalThis.setTimeout(() => {
      setIsClicked(false);
    }, 420);

    return () => globalThis.clearTimeout(clickJumpTimer);
  }, [isClicked]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  if (!headerVisiblePaths.has(pathname)) {
    return null;
  }

  const handleSlimeClick = () => {
    setIsClicked(true);
    setIsOpen((current) => !current);
  };

  const handleBackgroundChange = (backgroundId: number) => {
    setSelectedBackground(backgroundId);
    updateCurrentUser({ backgroundImage: backgroundId });
  };

  const handleLogout = () => {
    // API接続時は POST /api/auth/logout 後に currentUser もクリアする。
    setIsOpen(false);
    router.push("/");
  };

  return (
    <header className="relative z-20 mb-1 flex min-h-16 justify-end sm:mb-2">
      <div ref={headerRef} className="relative flex flex-col items-end">
        <SlimeButton
          isClicked={isClicked}
          isOpen={isOpen}
          onClick={handleSlimeClick}
        />

        {isOpen ? (
          <WindowPanel
            as="nav"
            variant="menu"
            className="absolute top-20 right-0 z-30 w-64 shadow-[8px_8px_0_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-center gap-3 border-b-2 border-white/70 pb-3">
              <UserAvatar user={currentUser} />
              <div>
                <p className="text-xs text-white/70">USER</p>
                <p className="text-lg leading-tight">{currentUser.name}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/account-settings"
                className="self-start whitespace-nowrap transition-colors hover:text-yellow-200"
                onClick={() => setIsOpen(false)}
              >
                ▶ アカウント設定
              </Link>

              <div>
                <p className="mb-2 text-sm text-white/70">背景変更</p>
                <div className="flex gap-2">
                  {backgroundOptions.map((background) => (
                    <button
                      key={background.id}
                      type="button"
                      className={`border-2 px-3 py-1 text-sm transition-colors hover:text-yellow-200 ${
                        selectedBackground === background.id
                          ? "border-yellow-200 text-yellow-200"
                          : "border-white"
                      }`}
                      onClick={() => handleBackgroundChange(background.id)}
                    >
                      {background.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="self-start whitespace-nowrap transition-colors hover:text-yellow-200"
                onClick={handleLogout}
              >
                ▶ ログアウト
              </button>
            </div>
          </WindowPanel>
        ) : null}
      </div>
    </header>
  );
}

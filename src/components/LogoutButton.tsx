"use client";

import { useRouter } from "next/navigation";

import { fetchWithAuth } from "@/lib/fetchWithAuth";

type LogoutButtonProps = Readonly<{
  className?: string;
}>;

export default function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetchWithAuth("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch {
      alert("ログアウトできていません");
    }
  }

  return (
    <button
      onClick={handleLogout}
      className={
        className ??
        "group inline-flex items-center justify-center gap-3 text-2xl transition-colors hover:text-yellow-200 sm:text-3xl"
      }
    >
      <span
        className="w-6 shrink-0 transition-transform group-hover:translate-x-1"
        aria-hidden="true"
      >
        ▶
      </span>
      <span>ログアウト</span>
    </button>
  );
}

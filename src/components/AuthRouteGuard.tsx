"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

const PUBLIC_PATHS = new Set([
  "/",
  "/guest-start",
  "/login",
  "/register",
  "/password-reset/request",
  "/password-reset/new",
]);

export default function AuthRouteGuard() {
  const pathname = usePathname();
  const { updateCurrentUser } = useCurrentUser();

  useEffect(() => {
    if (PUBLIC_PATHS.has(pathname)) {
      return;
    }

    const userId = localStorage.getItem("userId");

    if (!userId) {
      window.location.replace("/");
      return;
    }

    let isActive = true;

    async function verifyCurrentUser() {
      try {
        const res = await fetchWithAuth(`/api/users/${userId}`);

        if (!isActive) {
          return;
        }

        if (!res.ok) {
          window.location.replace("/");
          return;
        }

        const user = await res.json();
        updateCurrentUser(user);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication session is invalid"
        ) {
          return;
        }

        console.error("ログイン状態の確認に失敗しました:", error);
      }
    }

    verifyCurrentUser();

    return () => {
      isActive = false;
    };
  }, [pathname, updateCurrentUser]);

  return null;
}

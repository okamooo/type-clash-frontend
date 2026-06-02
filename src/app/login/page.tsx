import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";

import WindowPanel from "@/components/WindowPanel";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken");

  if (accessToken) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <WindowPanel>
          <h1 className="text-3xl font-bold text-white">
            すでにログインしています
          </h1>
          <p className="mt-6 max-w-md text-center text-base text-slate-200">
            別のアカウントで利用する場合は、
            <br />
            ログアウトしてから再度ログインしてください。
          </p>
          <Link href="/home" className="mt-8 text-lg transition-colors hover:text-yellow-200">
            ホームへ戻る
          </Link>
        </WindowPanel>
      </main>
    );
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

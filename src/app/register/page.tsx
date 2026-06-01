import Link from "next/link";
import { cookies } from "next/headers";

import WindowPanel from "@/components/WindowPanel";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
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
            ログアウトしてから新規登録してください。
          </p>
          <Link href="/home" className="mt-8 text-lg transition-colors hover:text-yellow-200">
            ホームへ戻る
          </Link>
        </WindowPanel>
      </main>
    );
  }

  return <RegisterForm />;
}

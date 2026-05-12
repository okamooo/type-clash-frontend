import Link from "next/link";

import TypewriterText from "@/components/TypewriterText";
import WindowPanel from "@/components/WindowPanel";

export default function CatPage() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <WindowPanel>
        <p className="w-full text-left text-base sm:text-xl">
          <TypewriterText text="にゃ～ん。" />
        </p>
        <Link
          href="/home"
          className="mt-8 self-start text-base transition-colors hover:text-yellow-200 sm:text-xl"
        >
          ▶ ホーム画面へ
        </Link>
      </WindowPanel>
    </main>
  );
}

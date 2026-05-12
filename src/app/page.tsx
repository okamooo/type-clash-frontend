import Link from "next/link";

import MenuItem from "@/components/MenuItem";
import WindowPanel from "@/components/WindowPanel";

export default function TopPage() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <WindowPanel>
        <h1 className="transform-[perspective(320px)_rotateX(12deg)_skewX(-8deg)_scaleY(1.08)] text-4xl font-bold drop-shadow-[4px_4px_0_#64748b] sm:text-6xl">
          Type<span className="text-yellow-300">★</span>Clash
        </h1>
        <p className="mt-6 text-base sm:text-xl">
          リアルタイム対戦型タイピングアプリ
        </p>
        <div className="mt-10 flex flex-col items-start gap-5">
          <Link href="/login">
            <MenuItem showCursor>ログイン</MenuItem>
          </Link>

          <Link href="/guest-start">
            <MenuItem showCursor>ログインしないでスタート</MenuItem>
          </Link>
        </div>
      </WindowPanel>
    </main>
  );
}

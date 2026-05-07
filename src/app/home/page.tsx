import Link from "next/link";

import MenuItem from "@/components/MenuItem";
import WindowPanel from "@/components/WindowPanel";

const MENU = [
  {
    label: "遊ぶ",
    children: [
      {
        label: "シングルモード",
        href: "/single",
      },
      {
        label: "対戦モード",
        href: "/battle",
      },
    ],
  },
  {
    label: "ランキング",
    href: "/rankings",
  },
  {
    label: "スコア履歴",
    href: "/score-history",
  },
  {
    label: "🐱",
    href: "/cat",
  },
  {
    label: "💀",
    href: "/skull",
  },
] as const;

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <WindowPanel>
        <h1 className="text-3xl font-bold drop-shadow-[4px_4px_0_#64748b] sm:text-5xl">
          ホーム
        </h1>
        <nav className="mt-10 flex w-full max-w-md flex-col items-start gap-5">
          {MENU.map((item) => {
            if ("children" in item) {
              return (
                <div key={item.label} className="flex w-full flex-col items-start">
                  <MenuItem showCursor>{item.label}</MenuItem>

                  <div className="mt-4 ml-12 flex flex-col items-start gap-3">
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href}>
                        <MenuItem>{child.label}</MenuItem>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <Link key={item.href} href={item.href}>
                <MenuItem showCursor>{item.label}</MenuItem>
              </Link>
            );
          })}
        </nav>
      </WindowPanel>
    </main>
  );
}

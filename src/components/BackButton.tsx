"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  href?: string;
};

export default function BackButton({ href = "/home" }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="mt-8 self-start text-base transition-colors hover:text-yellow-200 sm:text-xl"
    >
      ◀ 戻る
    </button>
  );
}

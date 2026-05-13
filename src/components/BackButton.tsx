"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mt-8 self-start text-base transition-colors hover:text-yellow-200 sm:text-xl"
    >
      ◀ 戻る
    </button>
  );
}

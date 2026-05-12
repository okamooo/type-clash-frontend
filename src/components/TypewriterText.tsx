"use client";

import { useEffect, useState } from "react";

type TypewriterTextProps = Readonly<{
  text: string;
  speed?: number;
  pauses?: Readonly<Record<number, number>>;
  onComplete?: () => void;
}>;

export default function TypewriterText({
  text,
  speed = 70,
  pauses = {},
  onComplete,
}: TypewriterTextProps) {
  const characters = Array.from(text);
  const [visibleLength, setVisibleLength] = useState(() =>
    characters.length > 0 ? 1 : 0,
  );

  useEffect(() => {
    if (visibleLength >= characters.length) {
      onComplete?.();
      return;
    }

    const timerId = globalThis.setTimeout(() => {
      setVisibleLength((currentLength) =>
        Math.min(currentLength + 1, characters.length),
      );
    }, pauses[visibleLength] ?? speed);

    return () => globalThis.clearTimeout(timerId);
  }, [characters.length, onComplete, pauses, speed, visibleLength]);

  return <>{characters.slice(0, visibleLength).join("")}</>;
}

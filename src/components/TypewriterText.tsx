"use client";

import { useEffect, useState } from "react";

type TypewriterTextProps = Readonly<{
  text: string;
  speed?: number;
  pauses?: Readonly<Record<number, number>>;
}>;

export default function TypewriterText({
  text,
  speed = 70,
  pauses = {},
}: TypewriterTextProps) {
  const [visibleLength, setVisibleLength] = useState(0);
  const characters = Array.from(text);

  useEffect(() => {
    if (visibleLength >= characters.length) {
      return;
    }

    const timerId = globalThis.setTimeout(() => {
      setVisibleLength((currentLength) =>
        Math.min(currentLength + 1, characters.length),
      );
    }, pauses[visibleLength] ?? speed);

    return () => globalThis.clearTimeout(timerId);
  }, [characters.length, pauses, speed, visibleLength]);

  return <>{characters.slice(0, visibleLength).join("")}</>;
}

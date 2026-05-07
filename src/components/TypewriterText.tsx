"use client";

import { useEffect, useState } from "react";

type TypewriterTextProps = Readonly<{
  text: string;
  speed?: number;
}>;

export default function TypewriterText({
  text,
  speed = 70,
}: TypewriterTextProps) {
  const [visibleLength, setVisibleLength] = useState(0);
  const characters = Array.from(text);

  useEffect(() => {
    const timerId = globalThis.setInterval(() => {
      setVisibleLength((currentLength) => {
        const nextLength = currentLength + 1;

        if (nextLength >= characters.length) {
          globalThis.clearInterval(timerId);
        }

        return Math.min(nextLength, characters.length);
      });
    }, speed);

    return () => globalThis.clearInterval(timerId);
  }, [characters.length, speed]);

  return <>{characters.slice(0, visibleLength).join("")}</>;
}

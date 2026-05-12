"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import MessagePanel from "@/components/MessagePanel";
import TypewriterText from "@/components/TypewriterText";
import WindowPanel from "@/components/WindowPanel";

type DeleteStep = "first" | "final" | "done";
type DeleteCommand = Readonly<{
  label: string;
  action: () => Promise<void> | void;
}>;

async function deleteAccount() {
  console.log("TODO: DELETE /api/users/:userId");
}

const doneMessagePrefix = "ぼうけんのしょは\nきえてしまいました\n\n";

const messageByStep = {
  first: "アカウントを けしますか？\n\nこのそうさは\nもとに もどせません。",
  final: "……\n\nほんとうに けしますか？",
  done: `${doneMessagePrefix}(^_−)☆`,
} as const;

const pausesByStep: Readonly<Partial<Record<DeleteStep, Record<number, number>>>> = {
  final: {
    2: 1000,
  },
  done: {
    [Array.from(doneMessagePrefix).length]: 1000,
  },
};

export default function DeleteAccountPage() {
  const router = useRouter();
  const [step, setStep] = useState<DeleteStep>("first");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const commands = useMemo<DeleteCommand[]>(() => {
    if (step === "first") {
      return [
        { label: "やめる", action: () => router.push("/account-settings") },
        {
          label: "けす",
          action: () => {
            setSelectedIndex(0);
            setStep("final");
          },
        },
      ];
    }

    if (step === "final") {
      return [
        { label: "いいえ", action: () => router.push("/account-settings") },
        {
          label: "はい",
          action: async () => {
            setIsDeleting(true);
            await deleteAccount();
            setSelectedIndex(0);
            setStep("done");
            setIsDeleting(false);
          },
        },
      ];
    }

    return [];
  }, [router, step]);

  const runCommand = useCallback(async (command: DeleteCommand | undefined) => {
    if (!command || isDeleting) {
      return;
    }

    await command.action();
  }, [isDeleting]);

  useEffect(() => {
    if (step === "done") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) =>
          current === 0 ? commands.length - 1 : current - 1,
        );
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => (current + 1) % commands.length);
      }

      if (event.key === "Enter") {
        event.preventDefault();
        runCommand(commands[selectedIndex]).catch((error: unknown) => {
          console.error(error);
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commands, runCommand, selectedIndex, step]);

  return (
    <main className="flex flex-1 items-center justify-center">
      <WindowPanel>
        <div className="mt-8 h-108 w-full max-w-lg">
          <MessagePanel className="h-72">
            <TypewriterText
              key={step}
              text={messageByStep[step]}
              speed={45}
              pauses={pausesByStep[step]}
            />
          </MessagePanel>

          {step === "done" ? (
            <button
              type="button"
              className="mt-6 flex text-left text-xl transition-colors hover:text-yellow-200 sm:text-2xl"
              onClick={() => router.push("/")}
            >
              <span className="inline-block w-8 shrink-0" aria-hidden="true">
                ▶
              </span>
              <span>トップページへ</span>
            </button>
          ) : (
            <div className="mt-6 flex flex-col gap-3 text-left text-xl sm:text-2xl">
              {commands.map((command, index) => {
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={command.label}
                    type="button"
                    disabled={isDeleting}
                    className={`inline-flex self-start text-left transition-colors disabled:cursor-wait disabled:opacity-60 ${
                      isSelected ? "text-yellow-200" : "text-white"
                    }`}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => {
                      runCommand(command).catch((error: unknown) => {
                        console.error(error);
                      });
                    }}
                  >
                    <span className="inline-block w-8 shrink-0" aria-hidden="true">
                      {isSelected ? "▶" : ""}
                    </span>
                    <span>{command.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </WindowPanel>
    </main>
  );
}

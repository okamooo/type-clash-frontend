"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import MessagePanel from "@/components/MessagePanel";
import TypewriterText from "@/components/TypewriterText";
import UserAvatar from "@/components/UserAvatar";
import WindowPanel from "@/components/WindowPanel";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

type BattlePlayerRole = "player1" | "player2";

type ResultPlayer = Readonly<{
  id: number;
  name: string;
  iconImage: string | null;
  role: BattlePlayerRole;
  score: number;
  accuracyRate: number;
  typedChars: number;
  missCount: number;
  isWinner: boolean;
}>;

type ResultPlayerDisplay = Readonly<{
  name: string;
  iconImage: string | null;
}>;

type Result = Readonly<{
  id: number;
  winnerId: number | null;
  players: ReadonlyArray<ResultPlayer>;
}>;

// 各項目（スコア・正答率など）の表示完了状態を管理するためのキー
type CompletionKeys = Readonly<{
  score: string;
  accuracy: string;
  typedChars: string;
  missCount: string;
}>;

type BattlePlayerPanelProps = Readonly<{
  className: string;
  player: ResultPlayerDisplay;
  score: string;
  accuracy: string;
  typedChars: string;
  missCount: string;
  completionKeys: CompletionKeys;
  isScoreComplete: boolean;
  isAccuracyComplete: boolean;
  isTypedCharsComplete: boolean;
  markComplete: (panelKey: string) => void;
}>;

type BattlePlayerResult = Omit<BattlePlayerPanelProps, "markComplete"> &
  Readonly<{
    playerId: string;
    isComplete: boolean;
  }>;

type BattleCompleteKeys = Readonly<Record<string, CompletionKeys>>;

function getCompleted(
  completedPanels: Readonly<Record<string, boolean>>,
  panelKey: string,
) {
  return Boolean(completedPanels[panelKey]);
}

function getWinnerLabel(result: Result | null) {
  if (!result) {
    return "";
  }

  const winner = result.players.find((player) => player.isWinner);

  if (!winner) {
    return "引き分け、、、";
  }

  return `${winner.name} の勝利`;
}

function getPlayerResultClassName(
  result: Result | null,
  isWinnerVisible: boolean,
  player: ResultPlayer,
) {
  if (!isWinnerVisible || !result) {
    return "";
  }

  if (result.winnerId === null) {
    return "border-orange-400 shadow-[8px_8px_0_rgba(251,146,60,0.45)]";
  }

  if (player.isWinner) {
    return "border-green-400 shadow-[8px_8px_0_rgba(34,197,94,0.45)]";
  }

  return "border-red-400 shadow-[8px_8px_0_rgba(248,113,113,0.45)]";
}

function buildCompletionKeys(result: Result | null): BattleCompleteKeys {
  if (!result) {
    return {};
  }

  return Object.fromEntries(
    result.players.map((player) => {
      const playerKey = `${player.role}-${player.id}`;

      return [
        playerKey,
        {
          score: `${result.id}-${playerKey}-score`,
          accuracy: `${result.id}-${playerKey}-accuracy`,
          typedChars: `${result.id}-${playerKey}-typed-chars`,
          missCount: `${result.id}-${playerKey}-miss-count`,
        },
      ];
    }),
  );
}

function buildBattlePlayerResults(
  result: Result | null,
  completeKeys: BattleCompleteKeys,
  completedPanels: Readonly<Record<string, boolean>>,
  isWinnerVisible: boolean,
): ReadonlyArray<BattlePlayerResult> {
  if (!result) {
    return [];
  }

  return result.players.map((player) => {
    const playerKey = `${player.role}-${player.id}`;
    const keys = completeKeys[playerKey];

    return {
      playerId: playerKey,
      player: { name: player.name, iconImage: player.iconImage },
      className: getPlayerResultClassName(result, isWinnerVisible, player),
      score: String(player.score),
      accuracy: `${player.accuracyRate}%`,
      typedChars: String(player.typedChars),
      missCount: String(player.missCount),
      completionKeys: keys,
      isScoreComplete: getCompleted(completedPanels, keys.score),
      isAccuracyComplete: getCompleted(completedPanels, keys.accuracy),
      isTypedCharsComplete: getCompleted(completedPanels, keys.typedChars),
      isComplete:
        getCompleted(completedPanels, keys.score) &&
        getCompleted(completedPanels, keys.accuracy) &&
        getCompleted(completedPanels, keys.typedChars) &&
        getCompleted(completedPanels, keys.missCount),
    };
  });
}

function BattlePlayerPanel({
  className,
  player,
  score,
  accuracy,
  typedChars,
  missCount,
  completionKeys,
  isScoreComplete,
  isAccuracyComplete,
  isTypedCharsComplete,
  markComplete,
}: BattlePlayerPanelProps) {
  const handleScoreComplete = useCallback(() => {
    markComplete(completionKeys.score);
  }, [completionKeys.score, markComplete]);
  const handleAccuracyComplete = useCallback(() => {
    markComplete(completionKeys.accuracy);
  }, [completionKeys.accuracy, markComplete]);
  const handleTypedCharsComplete = useCallback(() => {
    markComplete(completionKeys.typedChars);
  }, [completionKeys.typedChars, markComplete]);
  const handleMissCountComplete = useCallback(() => {
    markComplete(completionKeys.missCount);
  }, [completionKeys.missCount, markComplete]);

  return (
    <MessagePanel
      className={`h-96 transition-[border-color,box-shadow] duration-500 ${className}`}
    >
      <div className="flex flex-col items-center">
        <UserAvatar user={player} className="size-14 text-2xl" />
        <p className="mt-3 text-left">{player.name}</p>
        <span className="mt-4 flex flex-col items-start text-left">
          <span>
            スコア：
            <TypewriterText
              key={completionKeys.score}
              text={score}
              speed={120}
              onComplete={handleScoreComplete}
            />
          </span>
          <span>
            正答率：
            {isScoreComplete ? (
              <TypewriterText
                key={completionKeys.accuracy}
                text={accuracy}
                speed={120}
                onComplete={handleAccuracyComplete}
              />
            ) : null}
          </span>
          <span>
            入力文字数:
            {isAccuracyComplete ? (
              <TypewriterText
                key={completionKeys.typedChars}
                text={typedChars}
                speed={120}
                onComplete={handleTypedCharsComplete}
              />
            ) : null}
          </span>
          <span>
            ミス数:
            {isTypedCharsComplete ? (
              <TypewriterText
                key={completionKeys.missCount}
                text={missCount}
                speed={120}
                onComplete={handleMissCountComplete}
              />
            ) : null}
          </span>
        </span>
      </div>
    </MessagePanel>
  );
}

function BattleResultContent() {
  const router = useRouter();
  const { setCanEnterBattle } = useCurrentUser();
  const searchParams = useSearchParams();
  const resultId = searchParams.get("id");

  const [result, setResult] = useState<Result | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(resultId));
  const [fetchError, setFetchError] = useState<string | null>(() =>
    resultId ? null : "対戦IDが 指定されていません。",
  );
  const [completedPanels, setCompletedPanels] = useState<
    Readonly<Record<string, boolean>>
  >({});
  const [visibleWinnerKey, setVisibleWinnerKey] = useState<string | null>(null);

  useEffect(() => {
    if (!resultId) return;

    const fetchResult = async () => {
      setIsLoading(true);
      setFetchError(null);
      setResult(null);

      try {
        const res = await fetchWithAuth(`/api/battle-results?id=${resultId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error("Failed to fetch");

        const data: Result = await res.json();
        setResult(data);
      } catch (err) {
        console.error("Fetch error:", err);
        setFetchError("けっかの 取得に しっぱいしました。");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResult();
  }, [resultId]);

  const resultKey = result ? String(result.id) : "loading";
  const completeKeys = buildCompletionKeys(result);
  const winnerCompleteKey = `${resultKey}-winner`;
  const isWinnerTextComplete = Boolean(completedPanels[winnerCompleteKey]);
  const isWinnerVisible = visibleWinnerKey === resultKey;
  const playerResults = buildBattlePlayerResults(
    result,
    completeKeys,
    completedPanels,
    isWinnerVisible,
  );
  const isTypingComplete =
    result !== null && playerResults.every((player) => player.isComplete);
  const winnerLabel = getWinnerLabel(result);
  const isDraw = result?.winnerId === null;

  useEffect(() => {
    if (!isTypingComplete) {
      return;
    }

    const timerId = globalThis.setTimeout(() => {
      setVisibleWinnerKey(resultKey);
    }, 800);

    return () => globalThis.clearTimeout(timerId);
  }, [isTypingComplete, resultKey]);

  const markComplete = useCallback((panelKey: string) => {
    setCompletedPanels((current) => {
      if (current[panelKey]) {
        return current;
      }

      return {
        ...current,
        [panelKey]: true,
      };
    });
  }, []);
  const handleWinnerComplete = useCallback(() => {
    markComplete(winnerCompleteKey);
  }, [markComplete, winnerCompleteKey]);

  const enableBattleRetry = useCallback(() => {
    setCanEnterBattle(true);
  }, [setCanEnterBattle]);

  const handleRetry = useCallback(() => {
    router.push("/battle");
  }, [router]);

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <WindowPanel className="min-h-168">
          <p className="py-20 text-center text-xl text-slate-400 animate-pulse">
            けっかを よみこみちゅう...
          </p>
        </WindowPanel>
      </main>
    );
  }

  if (fetchError || !result) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <WindowPanel className="min-h-168">
          <MessagePanel className="flex flex-col items-center gap-6 py-12">
            <p className="text-xl text-red-300">{fetchError ?? "けっかが みつかりません。"}</p>
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="text-base transition-colors hover:text-yellow-200 sm:text-xl"
            >
              ▶ home
            </button>
          </MessagePanel>
        </WindowPanel>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center">
      <WindowPanel className="min-h-168">
        <div className="mb-6 flex items-center justify-center gap-4 sm:gap-6">
          <Image
            src="/images/sword.png"
            alt=""
            width={64}
            height={64}
            className="h-12 w-12 [image-rendering:pixelated] sm:h-16 sm:w-16"
            priority
          />
          <h1 className="text-3xl sm:text-4xl">Battle Report</h1>
          <Image
            src="/images/sword.png"
            alt=""
            width={64}
            height={64}
            className="h-12 w-12 [image-rendering:pixelated] sm:h-16 sm:w-16"
            priority
          />
        </div>
        <div className="flex min-h-128 w-full flex-col gap-6">
          <div className="mx-auto grid min-h-96 w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
            {playerResults.map((playerResult) => (
              <BattlePlayerPanel
                key={playerResult.playerId}
                {...playerResult}
                markComplete={markComplete}
              />
            ))}
          </div>

          <MessagePanel className="flex h-44 flex-col justify-center">
            <>
              {isWinnerVisible ? (
                <p className="flex items-center text-xl sm:text-2xl">
                  <TypewriterText
                    key={winnerCompleteKey}
                    text={winnerLabel}
                    speed={70}
                    onComplete={handleWinnerComplete}
                  />
                  {isWinnerTextComplete && !isDraw ? (
                    <Image
                      src="/images/trophy.png"
                      alt="！"
                      width={48}
                      height={48}
                      className="ml-2 h-10 w-10 [image-rendering:pixelated] sm:h-12 sm:w-12"
                    />
                  ) : null}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-4">
                <button
                  type="button"
                  onMouseDown={enableBattleRetry}
                  onTouchStart={enableBattleRetry}
                  onClick={handleRetry}
                  className="self-start text-base transition-colors hover:text-yellow-200 sm:text-xl"
                >
                  ▶ 再挑戦
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/home")}
                  className="self-start text-base transition-colors hover:text-yellow-200 sm:text-xl"
                >
                  ▶ home
                </button>
              </div>
            </>
          </MessagePanel>
        </div>
      </WindowPanel>
    </main>
  );
}

export default function BattleResult() {
  return (
    <Suspense
      fallback={
        <div className="text-white text-center py-20">読み込み中...</div>
      }
    >
      <BattleResultContent />
    </Suspense>
  );
}

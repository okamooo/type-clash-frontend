"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import WindowPanel from "@/components/WindowPanel";
import BackButton from "@/components/BackButton";
import { getApiBaseUrl } from "@/lib/apiConfig";
import {
  getRemainingRomajiDisplay,
  isRomajiComplete,
  isValidRomajiAppend,
  normalizeRomajiKey,
} from "@/lib/romaji";

interface Word {
  id: number;
  displayText: string;
  kanaReading: string;
  romajiTarget: string;
}

export default function SingleModePage() {
  const router = useRouter();

  // --- ステート管理 (主にUI表示用) ---
  const [words, setWords] = useState<Word[]>([]);
  const [, setWordPool] = useState<Word[]>([]); // まだ出題していない単語の山札
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- スコア・統計関連 ---
  const [timeLeft, setTimeLeft] = useState(60);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalInput, setTotalInput] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);

  // --- ロジック同期用 Ref ---
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userInputRef = useRef("");
  const correctCountRef = useRef(0);
  const totalInputRef = useRef(0);

  // --- 1. ワード全件取得 ---
  useEffect(() => {
    const fetchWords = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/words`);
        if (!response.ok) throw new Error("Fetch failed");
        const data = await response.json();
        setWords(data);
      } catch (error) {
        console.error("ワードの取得に失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWords();
  }, []);

  // --- 2. ワードのランダム選択 ---
  const setNextWord = useCallback(() => {
    if (words.length === 0) return;

    setWordPool((prevPool) => {
      let currentPool = [...prevPool];

      // もし空になったら補充してシャッフル
      if (currentPool.length === 0) {
        currentPool = [...words].sort(() => Math.random() - 0.5);
      }

      // 単語リストの最後から1つ取り出す
      const nextWord = currentPool.pop()!;

      setCurrentWord(nextWord);
      setUserInput("");
      userInputRef.current = ""; // 同期

      return currentPool;
    });
  }, [words]);

  // --- 3. ゲーム開始 ---
  const start = useCallback(() => {
    if (isLoading || words.length === 0) return;

    // 値のリセット
    setIsStarted(true);
    setIsFinished(false);
    setTimeLeft(60);
    setCorrectCount(0);
    setTotalInput(0);
    setDisplayScore(0);
    setWordPool([]); // 山札をリセット（新しいゲームごとにシャッフルされるように）

    correctCountRef.current = 0;
    totalInputRef.current = 0;
    userInputRef.current = "";

    // 初回の単語セット
    // setWordPoolの非同期処理を待たずにwordsから直接初回分をセットする工夫
    const initialPool = [...words].sort(() => Math.random() - 0.5);
    const firstWord = initialPool.pop()!;
    setCurrentWord(firstWord);
    setWordPool(initialPool);

    setTimeout(() => inputRef.current?.focus(), 0);
  }, [isLoading, words]);

  // エンターキーで開始
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isStarted && !isFinished && e.key === "Enter") {
        start();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isStarted, isFinished, start]);

  // --- 4. スコア計算ロジック ---
  const calculateCurrentScore = (correct: number, total: number) => {
    if (total === 0) return 0;
    const accuracy = correct / total;
    return Math.ceil(correct * accuracy);
  };

  // --- 5. 入力判定ロジック (KeyDown方式) ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isStarted || isFinished || !currentWord) return;

    // 1文字の入力のみ処理（特殊キーなどは無視）
    if (e.key.length !== 1) return;

    const char = normalizeRomajiKey(e.key);
    if (!char) return;

    const target = currentWord.romajiTarget;
    const currentInput = userInputRef.current;

    // 入力総数を更新
    totalInputRef.current += 1;
    const currentTotal = totalInputRef.current;
    setTotalInput(currentTotal);

    if (isValidRomajiAppend(currentInput, char, target)) {
      const nextInput = currentInput + char;
      // 正解
      userInputRef.current = nextInput;
      setUserInput(nextInput);

      correctCountRef.current += 1;
      const currentCorrect = correctCountRef.current;
      setCorrectCount(currentCorrect);

      const newScore = calculateCurrentScore(currentCorrect, currentTotal);
      setDisplayScore(newScore);

      if (isRomajiComplete(nextInput, target)) {
        // 少しディレイを置いて次のワードへ（打ち切った感のため）
        setTimeout(setNextWord, 50);
      }
    } else {
      // ミス
      const newScore = calculateCurrentScore(
        correctCountRef.current,
        currentTotal,
      );
      setDisplayScore(newScore);
    }
  };

  // --- 6. ゲーム終了処理 ---
  const handleGameEnd = useCallback(() => {
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // 終了時のデータ保存
  useEffect(() => {
    if (isFinished) {
      const saveResult = async () => {
        const finalCorrect = correctCountRef.current;
        const finalTotal = totalInputRef.current;
        const finalScore = calculateCurrentScore(finalCorrect, finalTotal);

        try {
          await fetch(`${getApiBaseUrl()}/api/single-results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: 1,
              rawScore: finalCorrect,
              correctCount: finalCorrect,
              totalInput: finalTotal,
            }),
          });
        } catch (error) {
          console.error("スコアの保存に失敗しました:", error);
        }

        const accuracy =
          finalTotal > 0
            ? ((finalCorrect / finalTotal) * 100).toFixed(1)
            : "0.0";
        router.replace(
          `/result/SingleResult?score=${finalScore}&accuracy=${accuracy}&correct=${finalCorrect}&total=${finalTotal}`,
        );
      };
      saveResult();
    }
  }, [isFinished, router]);

  // --- 7. タイマー管理 ---
  useEffect(() => {
    if (isStarted && !isFinished) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleGameEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, isFinished, handleGameEnd]);

  // フォーカス維持
  useEffect(() => {
    if (isStarted && !isFinished) {
      const focusInterval = setInterval(() => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      }, 500);
      return () => clearInterval(focusInterval);
    }
  }, [isStarted, isFinished]);

  const remainingRomaji = useMemo(() => {
    if (!currentWord) return "";
    return getRemainingRomajiDisplay(
      currentWord.romajiTarget,
      userInput,
    );
  }, [currentWord, userInput]);

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <WindowPanel>
        <div className="flex w-full flex-col items-center">
          <div className="mb-8 flex w-full items-center justify-between">
            <BackButton />
            <div className="text-2xl font-bold tracking-tighter">
              SINGLE MODE
            </div>
            <div className="w-12"></div>
          </div>

          {isLoading ? (
            <div className="py-20 text-slate-400">LOADING WORDS...</div>
          ) : !isStarted ? (
            <div className="flex flex-col items-center py-20">
              <button
                onClick={start}
                className="group relative flex items-center gap-2 text-4xl font-bold italic transition-all hover:scale-110"
              >
                <span className="text-white">PRESS ENTER TO START</span>
              </button>
            </div>
          ) : (
            <div className="flex w-full min-w-0 flex-col items-center">
              <div className="mb-10 grid w-full grid-cols-3 gap-4 border-b pb-4">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">TIME</span>
                  <span
                    className={`text-2xl font-mono ${timeLeft <= 10 ? "text-red-500 animate-pulse" : ""}`}
                  >
                    {timeLeft}s
                  </span>
                </div>
                <div className="flex flex-col items-center border-x">
                  <span className="text-xs text-slate-400">SCORE</span>
                  <span className="text-2xl font-mono">{displayScore}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-slate-400">ACCURACY</span>
                  <span className="text-2xl font-mono">
                    {totalInput > 0
                      ? ((correctCount / totalInput) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </span>
                </div>
              </div>

              <div className="relative flex w-full min-w-0 flex-col items-center py-10 min-h-[240px]">
                {currentWord && (
                  <>
                    <p className="w-full max-w-full px-2 text-center text-lg leading-relaxed text-slate-400 break-words sm:text-xl">
                      {currentWord.kanaReading}
                    </p>
                    <p className="mt-2 w-full max-w-full px-2 text-center text-3xl font-bold leading-snug tracking-wide text-white break-words sm:text-4xl lg:text-5xl">
                      {currentWord.displayText}
                    </p>
                    <p className="mt-8 w-full max-w-full px-2 text-center font-mono text-xl leading-relaxed break-all sm:text-2xl lg:text-3xl">
                      <span className="text-blue-500 underline decoration-2 underline-offset-4 [box-decoration-break:clone]">
                        {userInput}
                      </span>
                      <span className="text-slate-200">{remainingRomaji}</span>
                    </p>
                  </>
                )}
                <input
                  ref={inputRef}
                  autoFocus
                  type="text"
                  onKeyDown={handleKeyDown}
                  value="" // valueを固定してもKeyDownイベントは取れる
                  readOnly // 読み取り専用にすることでIMEの介入を最小限にする
                  inputMode="url"
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  className="absolute inset-0 h-full w-full cursor-default bg-transparent opacity-0 outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </WindowPanel>
    </main>
  );
}

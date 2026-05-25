"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MagicWord, BattleMessage, OpponentInfo } from "@/types/battle";
import { Client } from "@stomp/stompjs";
import UserAvatar from "@/components/UserAvatar";
import MessagePanel from "@/components/MessagePanel";

interface BattlePlayingProps {
  matchId: number;
  currentUser: { id: number; name: string; iconImage: string | null };
  opponent: OpponentInfo;
  words: MagicWord[];
  client: Client | null;
  opponentStatus: BattleMessage | null;
  onFinish: (finalResult: {
    score: number;
    accuracy: number;
    typedChars: number;
    missCount: number;
    myHp: number;
    opponentHp: number;
    reason: string;
  }) => void;
}

const INITIAL_HP = 100;
const BATTLE_TIME = 60;

export default function BattlePlaying({
  matchId,
  currentUser,
  opponent,
  words,
  client,
  opponentStatus,
  onFinish,
}: BattlePlayingProps) {
  const [myHp, setMyHp] = useState(INITIAL_HP);
  const [opponentHp, setOpponentHp] = useState(INITIAL_HP);
  const [timeLeft, setTimeLeft] = useState(BATTLE_TIME);
  const [score, setScore] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const finishedRef = useRef(false);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const statsRef = useRef({
    score: 0,
    typedChars: 0,
    missCount: 0,
    myHp: INITIAL_HP,
    opponentHp: INITIAL_HP,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentWord = words[currentWordIndex % words.length];

  useEffect(() => {
    statsRef.current = { score, typedChars, missCount, myHp, opponentHp };
  }, [score, typedChars, missCount, myHp, opponentHp]);

  const calcAccuracy = (typed: number, misses: number) =>
    typed > 0 ? Math.floor(((typed - misses) / typed) * 100) : 100;

  const handleFinish = useCallback((reason: string) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsFinished(true);

    if (timerRef.current) clearInterval(timerRef.current);

    const { score: finalScore, typedChars: finalTyped, missCount: finalMiss, myHp: finalMyHp, opponentHp: finalOpponentHp } =
      statsRef.current;
    const accuracy = calcAccuracy(finalTyped, finalMiss);

    setTimeout(() => {
      onFinish({
        score: finalScore,
        accuracy,
        typedChars: finalTyped,
        missCount: finalMiss,
        myHp: finalMyHp,
        opponentHp: finalOpponentHp,
        reason,
      });
    }, 10);
  }, [onFinish]);

  const sendUpdate = useCallback((damage: number = 0) => {
    if (!client?.connected) return;

    const stats = statsRef.current;
    const msgId = damage > 0 ? `${currentUser.id}-${Date.now()}-${Math.random()}` : undefined;
    const message: BattleMessage = {
      userId: currentUser.id,
      matchId: matchId,
      score: stats.score,
      accuracyRate: calcAccuracy(stats.typedChars, stats.missCount),
      typedChars: stats.typedChars,
      missCount: stats.missCount,
      currentHp: stats.myHp,
      damage: damage,
      messageId: msgId,
      content: stats.myHp <= 0 ? "LOSER" : damage > 0 ? "ATTACK" : "PLAYING",
    };
    client.publish({
      destination: `/api/battles/${matchId}/update`,
      body: JSON.stringify(message),
    });
  }, [client, currentUser.id, matchId]);

  useEffect(() => {
    if (opponentStatus) {
      setOpponentHp(opponentStatus.currentHp);
      statsRef.current = { ...statsRef.current, opponentHp: opponentStatus.currentHp };

      if (opponentStatus.damage && opponentStatus.damage > 0 && opponentStatus.messageId) {
        if (!processedMessageIds.current.has(opponentStatus.messageId)) {
          processedMessageIds.current.add(opponentStatus.messageId);
          setMyHp((prev) => {
            const nextHp = Math.max(0, prev - (opponentStatus.damage || 0));
            statsRef.current = { ...statsRef.current, myHp: nextHp };
            if (nextHp <= 0 && !finishedRef.current) {
              sendUpdate(0);
              setTimeout(() => handleFinish("lose_ko"), 0);
            }
            return nextHp;
          });
        }
      }

      if (opponentStatus.content === "LOSER" && !isFinished) {
        handleFinish("win_ko");
      }
    }
  }, [opponentStatus, handleFinish, sendUpdate]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleFinish("time_up");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handleFinish]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isFinished || finishedRef.current) return;
    if (e.key.length !== 1) return;

    const targetChar = currentWord.magicTarget[currentInput.length];

    if (e.key === targetChar) {
      const nextInput = currentInput + e.key;

      if (nextInput === currentWord.magicTarget) {
        const damageAmount = currentWord.magicTarget.length;

        statsRef.current = {
          ...statsRef.current,
          opponentHp: Math.max(0, statsRef.current.opponentHp - damageAmount),
          score: statsRef.current.score + damageAmount * 10,
          typedChars: statsRef.current.typedChars + 1,
        };
        setOpponentHp(statsRef.current.opponentHp);
        setScore(statsRef.current.score);
        setTypedChars(statsRef.current.typedChars);
        setCurrentInput("");
        setCurrentWordIndex((prev) => prev + 1);
        sendUpdate(damageAmount);

        if (statsRef.current.opponentHp <= 0) {
          handleFinish("win_ko");
        }
      } else {
        statsRef.current = {
          ...statsRef.current,
          typedChars: statsRef.current.typedChars + 1,
        };
        setTypedChars(statsRef.current.typedChars);
        setCurrentInput(nextInput);
      }
    } else {
      statsRef.current = {
        ...statsRef.current,
        missCount: statsRef.current.missCount + 1,
        typedChars: statsRef.current.typedChars + 1,
      };
      setMissCount(statsRef.current.missCount);
      setTypedChars(statsRef.current.typedChars);
      sendUpdate(0);
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-8" onKeyDown={handleKeyDown} tabIndex={0} autoFocus>
      <div className="flex w-full justify-between items-center px-4">
        <div className="text-2xl font-bold text-yellow-400">
          TIME: {timeLeft}s
        </div>
        <div className="text-2xl font-bold text-white">
          SCORE: {score}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 w-full">
        <div className="flex flex-col items-center gap-4">
          <UserAvatar user={currentUser} size="lg" />
          <div className="w-full bg-gray-700 h-6 rounded-full overflow-hidden border-2 border-white">
            <div
              className="bg-green-500 h-full transition-all duration-300"
              style={{ width: `${(myHp / INITIAL_HP) * 100}%` }}
            />
          </div>
          <p className="text-white font-bold">HP: {myHp} / {INITIAL_HP}</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <UserAvatar user={opponent} size="lg" />
          <div className="w-full bg-gray-700 h-6 rounded-full overflow-hidden border-2 border-white">
            <div
              className="bg-red-500 h-full transition-all duration-300"
              style={{ width: `${(opponentHp / INITIAL_HP) * 100}%` }}
            />
          </div>
          <p className="text-white font-bold">HP: {opponentHp} / {INITIAL_HP}</p>
        </div>
      </div>

      <MessagePanel className="w-full min-h-[160px] flex flex-col items-center justify-center gap-2">
        <p className="text-3xl text-yellow-300 font-bold">{currentWord.magicText}</p>
        <p className="text-xl text-gray-400">{currentWord.magicReading}</p>
        <div className="text-4xl mt-4 font-mono tracking-widest">
          <span className="text-white">{currentInput}</span>
          <span className="text-gray-600">{currentWord.magicTarget.slice(currentInput.length)}</span>
        </div>
      </MessagePanel>

      <p className="text-sm text-slate-500 animate-pulse">
        ※ 画面を クリックして キーボードで 入力してください
      </p>
    </div>
  );
}

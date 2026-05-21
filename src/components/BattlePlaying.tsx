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
  onFinish: (finalResult: any) => void;
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
  // --- ゲーム状態（メモリ管理） ---
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

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentWord = words[currentWordIndex % words.length];

  // --- 終了処理 ---
  const handleFinish = useCallback((reason: string) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsFinished(true);
    
    if (timerRef.current) clearInterval(timerRef.current);

    // 最終的な精度計算
    const accuracy = typedChars > 0 ? Math.floor(((typedChars - missCount) / typedChars) * 100) : 100;

    // 親コンポーネントの状態更新を確実に次フレームに遅らせる
    setTimeout(() => {
      onFinish({
        score,
        accuracy,
        typedChars,
        missCount,
        myHp,
        opponentHp,
        reason,
      });
    }, 10);
  }, [onFinish, score, typedChars, missCount, myHp, opponentHp]);

  // --- 進捗または攻撃を相手に送信する ---
  const sendUpdate = useCallback((damage: number = 0) => {
    if (client?.connected) {
      const msgId = damage > 0 ? `${currentUser.id}-${Date.now()}-${Math.random()}` : undefined;
      const message: BattleMessage = {
        userId: currentUser.id,
        matchId: matchId,
        score: score,
        accuracyRate: typedChars > 0 ? Math.floor(((typedChars - missCount) / typedChars) * 100) : 100,
        typedChars: typedChars,
        missCount: missCount,
        currentHp: myHp,
        damage: damage,
        messageId: msgId,
        content: myHp <= 0 ? "LOSER" : (damage > 0 ? "ATTACK" : "PLAYING"),
      };
      client.publish({
        destination: `/api/battles/${matchId}/update`,
        body: JSON.stringify(message),
      });
    }
  }, [client, currentUser.id, matchId, score, typedChars, missCount, myHp]);

  // --- 相手からのメッセージを受け取った時の処理 ---
  useEffect(() => {
    if (opponentStatus) {
      // 相手の現在のスコアやHPの見た目を更新
      setOpponentHp(opponentStatus.currentHp);

      // 相手からの攻撃（ダメージ）がある場合、かつ未処理のメッセージの場合のみ自分のHPを減らす
      if (opponentStatus.damage && opponentStatus.damage > 0 && opponentStatus.messageId) {
        if (!processedMessageIds.current.has(opponentStatus.messageId)) {
          processedMessageIds.current.add(opponentStatus.messageId);
          setMyHp((prev) => {
            const nextHp = Math.max(0, prev - (opponentStatus.damage || 0));
            if (nextHp <= 0 && !isFinished) {
              // 自分のHPが0になったら負け判定へ
              setTimeout(() => handleFinish("lose_ko"), 0);
            }
            return nextHp;
          });
        }
      }

      // 相手が「負けました」と言ってきたら、自分の勝利判定へ
      if (opponentStatus.content === "LOSER" && !isFinished) {
        handleFinish("win_ko");
      }
    }
  }, [opponentStatus, isFinished, handleFinish]);

  // --- タイマー処理 ---
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

  // --- タイピング入力判定 ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isFinished) return;

    // アルファベットと記号のみ受け付ける（簡易判定）
    if (e.key.length !== 1) return;

    const targetChar = currentWord.magicTarget[currentInput.length];

    if (e.key === targetChar) {
      const nextInput = currentInput + e.key;
      setTypedChars((prev) => prev + 1);

      if (nextInput === currentWord.magicTarget) {
        // 単語完成！攻撃！
        const damageAmount = currentWord.magicTarget.length;
        
        // 自分の画面上の相手HPを（先行して）減らす
        setOpponentHp((prev) => Math.max(0, prev - damageAmount));
        setScore((prev) => prev + (damageAmount * 10));
        setCurrentInput("");
        setCurrentWordIndex((prev) => prev + 1);

        // 相手にダメージを送る
        sendUpdate(damageAmount);
      } else {
        setCurrentInput(nextInput);
      }
    } else {
      // ミス入力
      setMissCount((prev) => prev + 1);
      setTypedChars((prev) => prev + 1);
      // ミス時もステータス（精度）を同期
      sendUpdate(0);
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-8" onKeyDown={handleKeyDown} tabIndex={0} autoFocus>
      {/* ヘッダー情報（残り時間） */}
      <div className="flex w-full justify-between items-center px-4">
        <div className="text-2xl font-bold text-yellow-400">
          TIME: {timeLeft}s
        </div>
        <div className="text-2xl font-bold text-white">
          SCORE: {score}
        </div>
      </div>

      {/* 対戦エリア */}
      <div className="grid grid-cols-2 gap-8 w-full">
        {/* 自分 */}
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

        {/* 相手 */}
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

      {/* タイピングエリア */}
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

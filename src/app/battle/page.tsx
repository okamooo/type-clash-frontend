"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Client } from "@stomp/stompjs";
import WindowPanel from "@/components/WindowPanel";
import TypewriterText from "@/components/TypewriterText";
import MenuItem from "@/components/MenuItem";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import BackButton from "@/components/BackButton";
import UserAvatar from "@/components/UserAvatar";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { getWsBattleUrl } from "@/lib/apiConfig";

type BattleStatus = "searching" | "found" | "ready" | "playing" | "finished";

interface OpponentInfo {
  id: number;
  name: string;
  iconImage: string | null;
}

export default function BattlePage() {
  const router = useRouter();
  const { currentUser, updateCurrentUser } = useCurrentUser();
  const [status, setStatus] = useState<BattleStatus>("searching");
  const [matchId, setMatchId] = useState<number | null>(null);
  const [opponent, setOpponent] = useState<OpponentInfo | null>(null);
  const [isMessageComplete, setIsMessageComplete] = useState(false);

  const clientRef = useRef<Client | null>(null);

  // --- 0. localStorage からユーザー情報を同期 ---
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName");
    
    if (userId && userId !== "0" && userId !== String(currentUser.id)) {
      // localStorage の情報で一旦更新
      updateCurrentUser({
        id: Number(userId),
        name: userName ?? currentUser.name,
      });

      // バックエンドから ID, 名前, アイコンのみを取得して反映
      const syncUser = async () => {
        try {
          const res = await fetchWithAuth(`/api/users/${userId}`);
          if (res.ok) {
            const data = await res.json();
            updateCurrentUser({
              id: data.id,
              name: data.name,
              iconImage: data.iconImage,
            });
          }
        } catch (err) {
          console.error("Failed to sync user info:", err);
        }
      };

      syncUser();
    }
  }, [currentUser.id, updateCurrentUser]);

  // --- 1. WebSocket 接続とマッチング処理 ---
  useEffect(() => {
    // ユーザーIDが確定するまで接続を待機
    if (currentUser.id === 0) return;

    const client = new Client({
      brokerURL: getWsBattleUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      console.log("Connected to WebSocket");

      // マッチング通知を購読
      client.subscribe(
        `/topic/match/notification/${currentUser.id}`,
        (message) => {
          const data = JSON.parse(message.body);
          console.log("DEBUG: Match Notification received:", data);
          if (data.status === "MATCHED") {
            setMatchId(data.matchId);
            fetchOpponentInfo(data.opponentId);
            setStatus("found");
            setIsMessageComplete(false); // メッセージ演出をリセット
          } else if (data.status === "CANCELLED") {
            // 相手が離脱した場合、検索中に戻す
            console.log("Opponent left. Returning to searching...");
            setMatchId(null);
            setOpponent(null);
            setStatus("searching");
          }
        },
      );

      // マッチング待機列に参加
      client.publish({
        destination: "/api/battles/queue/join",
        body: JSON.stringify({ userId: currentUser.id }),
      });
    };

    client.onStompError = (frame) => {
      console.error("STOMP error", frame);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        // 接続されている場合のみ離脱通知を送る
        if (clientRef.current.connected) {
          clientRef.current.publish({
            destination: "/api/battles/queue/leave",
            body: JSON.stringify({ userId: currentUser.id }),
          });
        }
        clientRef.current.deactivate();
      }
    };
  }, [currentUser.id]);

  // 対戦相手の情報取得
  const fetchOpponentInfo = async (id: number) => {
    console.log("DEBUG: [fetchOpponentInfo] Attempting to fetch info for ID:", id);
    try {
      const res = await fetchWithAuth(`/api/users/${id}`);
      const data = await res.json();
      console.log("DEBUG: [fetchOpponentInfo] Received data:", data);
      setOpponent({
        id: data.id,
        name: data.name,
        iconImage: data.iconImage,
      });
    } catch (err) {
      console.error("Failed to fetch opponent info", err);
    }
  };

  const handleFight = () => {
    // 実際の対戦画面へ（カウントダウン等）
    setStatus("ready");
  };

  const handleRun = () => {
    // 待機列から抜けて再度探す
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: "/api/battles/queue/leave",
        body: JSON.stringify({ userId: currentUser.id }),
      });
    }
    // 再度探す場合は status を searching に戻し、再度 join させる
    setStatus("searching");
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: "/api/battles/queue/join",
        body: JSON.stringify({ userId: currentUser.id }),
      });
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <WindowPanel className="max-w-2xl min-h-[400px]">
        <div className="flex w-full flex-col items-center py-6">
          {/* --- ステータス1: 検索中 --- */}
          {status === "searching" && (
            <div className="flex flex-col items-center py-16">
              {/* グルグル（スピンアニメーション） */}
              <div className="relative mb-12">
                <div className="h-24 w-24 animate-spin rounded-full border-b-4 border-t-4 border-yellow-400"></div>
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                  ⚔️
                </div>
              </div>
              <p className="text-2xl text-white">
                <TypewriterText text="対戦相手を さがしています..." />
              </p>
              <div className="mt-12">
                <BackButton />
              </div>
            </div>
          )}

          {/* --- ステータス2: 対戦相手発見 (野生の...が現れた) --- */}
          {status === "found" && opponent && (
            <div className="flex w-full flex-col items-center py-8">
              <div className="flex items-center gap-12 mb-12 animate-bounce">
                <div className="flex flex-col items-center">
                  <UserAvatar user={currentUser} size="lg" />
                  <p className="mt-2 text-sm text-slate-400">あなた</p>
                </div>
                <div className="text-5xl font-black italic text-red-600">
                  VS
                </div>
                <div className="flex flex-col items-center">
                  <UserAvatar user={opponent} size="lg" />
                  <p className="mt-2 text-sm text-slate-400">あいて</p>
                </div>
              </div>

              <div className="w-full bg-black/60 border-4 border-double border-white p-6 text-left min-h-[140px] mb-8">
                <p className="text-2xl leading-relaxed text-white">
                  <TypewriterText
                    text={`やせいの ${opponent.name} が\nあらわれた！`}
                    speed={50}
                    onComplete={() => setIsMessageComplete(true)}
                  />
                </p>
              </div>

              {/* 文言が出終わったらメニューを表示 */}
              <div
                className={`flex flex-col items-start gap-4 transition-opacity duration-500 ${isMessageComplete ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              >
                <button onClick={handleFight} className="text-left w-full">
                  <MenuItem showCursor>たたかう</MenuItem>
                </button>
                <button onClick={handleRun} className="text-left w-full">
                  <MenuItem showCursor>にげる</MenuItem>
                </button>
              </div>
            </div>
          )}

          {/* --- ステータス3: カウントダウン / 準備中 --- */}
          {status === "ready" && (
            <div className="flex flex-col items-center py-20">
              <p className="text-3xl mb-8">じゅんびは いいか！</p>
              <div className="text-8xl font-black text-yellow-400 animate-ping">
                3
              </div>
            </div>
          )}

          {/* 実際に対戦が始まったら、ここからプレイ画面のコンポーネントへ繋ぐ */}
        </div>
      </WindowPanel>
    </main>
  );
}

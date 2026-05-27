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

type BattleStatus = "searching" | "found" | "ready" | "playing" | "finished";

interface OpponentInfo {
  id: number;
  name: string;
  iconImage: string | null;
}

export default function BattlePage() {
  const router = useRouter();
  const { currentUser, updateCurrentUser, canEnterBattle, setCanEnterBattle } = useCurrentUser();
  const [status, setStatus] = useState<BattleStatus>("searching");
  const [matchId, setMatchId] = useState<number | null>(null);
  const [opponent, setOpponent] = useState<OpponentInfo | null>(null);
  const [isMessageComplete, setIsMessageComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // --- URL直叩き防止チェック ---
  useEffect(() => {
    // コンテキストのフラグが立っていない場合はホーム画面へリダイレクト
    if (!canEnterBattle) {
      router.replace("/home");
    }
  }, []); // 最初の一回（マウント時）だけチェック

  // --- 画面を離れる時にフラグを戻しておく ---
  useEffect(() => {
    return () => {
      setCanEnterBattle(false);
    };
  }, [setCanEnterBattle]);

  // --- 0. localStorage からユーザー情報を同期 ---
  useEffect(() => {
    const userId = localStorage.getItem("userId");

    if (!userId || userId === "0" || userId === String(currentUser.id)) return;

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
  }, [currentUser.id, updateCurrentUser]);

  // --- 1. WebSocket 接続とマッチング処理 ---
  useEffect(() => {
    // ユーザーIDが確定するまで接続を待機、または既に接続が開始されている場合は何もしない
    if (currentUser.id === 0 || clientRef.current?.active) return;

    const client = new Client({
      brokerURL: "ws://localhost:8080/ws-battle",
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    const fetchOpponentInfo = async (id: number) => {
      try {
        const res = await fetchWithAuth(`/api/users/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setOpponent({
          id: data.id,
          name: data.name,
          iconImage: data.iconImage,
        });
      } catch (err) {
        console.error("Failed to fetch opponent info:", err);
        // マッチをキャンセルし、バックエンドに再参加を明示的に通知してから検索画面に戻す
        if (client.connected) {
          client.publish({
            destination: "/api/battles/queue/join",
            body: JSON.stringify({ userId: currentUser.id }),
          });
        }
        setMatchId(null);
        setOpponent(null);
        setStatus("searching");
        setError("あいての じょうほうしゅとくに しっぱいしました。さいど マッチングします。");
      }
    };

    client.onConnect = () => {
      setIsConnected(true);
      setError(null);

      // マッチング通知を購読
      subscriptionRef.current = client.subscribe(
        `/topic/match/notification/${currentUser.id}`,
        (message) => {
          let data;
          try {
            data = JSON.parse(message.body);
          } catch (e) {
            console.error("Invalid message format:", message.body);
            return;
          }

          if (data.status === "MATCHED") {
            setMatchId(data.matchId);
            fetchOpponentInfo(data.opponentId);
            setStatus("found");
            setIsMessageComplete(false); // メッセージ演出をリセット
            setError(null);
          } else if (data.status === "CANCELLED") {
            // 相手が離脱した場合、検索中に戻す
            setMatchId(null);
            setOpponent(null);
            setStatus("searching");
            setError("あいてが にげだした！ べつの あいてを さがします。");
            // 再度待機列に入る処理はバックエンド側で自動的に行われるため、フロントからは送信しない
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
      setError("サーバーへの接続に失敗しました。再読み込みしてください。");
      setIsConnected(false);
    };

    client.onDisconnect = () => {
      console.log("Disconnected from WebSocket");
      setIsConnected(false);
      // 検索中または発見中に意図せず切断された場合
      setStatus((currentStatus) => {
        if (currentStatus === "searching" || currentStatus === "found") {
          setError("せつぞくが きれました。");
        }
        return currentStatus;
      });
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
      subscriptionRef.current?.unsubscribe();
    };
  }, [currentUser.id]);

  // --- 2. ブラウザ強制終了時の対策 ---
  useEffect(() => {
    if (currentUser.id === 0) return;

    const handleUnload = () => {
      const data = JSON.stringify({ userId: currentUser.id });
      const blob = new Blob([data], { type: "application/json" });
      // Next.jsのオリジンではなくバックエンドのオリジンへ明示的に送信する
      navigator.sendBeacon("http://localhost:8080/api/battles/queue/leave", blob);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [currentUser.id]);

  const handleFight = () => {
    // 対戦画面へ遷移する前にサブスクリプションを解除
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    // 実際の対戦画面へ（カウントダウン等）
    setStatus("ready");
  };

  const handleRun = () => {
    router.push("/home");
  };

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <WindowPanel className="max-w-2xl min-h-[400px]">
        <div className="flex w-full flex-col items-center py-6">
          {error && (
            <div className="mb-4 text-red-400 text-center font-bold animate-pulse">
              {error}
            </div>
          )}

          {/* --- ステータス1: 検索中 --- */}
          {status === "searching" && (
            <div className="flex flex-col items-center py-16">
              {/* グルグル（スピンアニメーション） */}
              <div className="relative mb-12">
                <div className={`h-24 w-24 animate-spin rounded-full border-b-4 border-t-4 ${isConnected ? "border-yellow-400" : "border-gray-500"}`}></div>
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                  {isConnected ? "⚔️" : "☁️"}
                </div>
              </div>
              <p className="text-2xl text-white">
                <TypewriterText text={isConnected ? "対戦相手を さがしています..." : "サーバーに せつぞくちゅう..."} />
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

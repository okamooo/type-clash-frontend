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
import { MagicWord, BattleStatus, OpponentInfo, BattleMessage } from "@/types/battle";
import BattlePlaying from "@/components/BattlePlaying";

export default function BattlePage() {
  const router = useRouter();
  const { currentUser, updateCurrentUser, canEnterBattle, setCanEnterBattle } = useCurrentUser();
  const [status, setStatus] = useState<BattleStatus>("searching");
  const [matchId, setMatchId] = useState<number | null>(null);
  const [opponent, setOpponent] = useState<OpponentInfo | null>(null);
  const [role, setRole] = useState<"player1" | "player2" | null>(null);
  const [words, setWords] = useState<MagicWord[]>([]);
  const [opponentStatus, setOpponentStatus] = useState<BattleMessage | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isMessageComplete, setIsMessageComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const battleSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

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
    const userName = localStorage.getItem("userName");
    
    if (userId && userId !== "0" && userId !== String(currentUser.id)) {
      // localStorage の情報で一旦更新
      updateCurrentUser({
        id: Number(userId),
        name: userName ?? currentUser.name,
      });

      // バックエンドから ID, 名前, アイコンのみを取得して反映
      const syncUser = async () => {
        if (!userId || userId === "0") return;
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
        // マッチをなかったことにして検索に戻す
        handleMatchError("あいての じょうほうしゅとくに しっぱいしました。さいど マッチングします。");
      }
    };

    const fetchMagicWords = async () => {
      try {
        const res = await fetchWithAuth("/api/magic-words");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setWords(data);
      } catch (err) {
        console.error("Failed to fetch magic words:", err);
        handleMatchError("たいせんワードの しゅとくに しっぱいしました。さいど マッチングします。");
      }
    };

    const handleMatchError = (message: string) => {
      setMatchId(null);
      setOpponent(null);
      setWords([]);
      setStatus("searching");
      setError(message);
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
            const mId = data.matchId;
            setMatchId(mId);
            setRole(data.role);
            fetchOpponentInfo(data.opponentId);
            fetchMagicWords();
            
            // 対戦中の進捗購読を開始
            battleSubscriptionRef.current = client.subscribe(
              `/topic/battle/${mId}`,
              (message) => {
                const battleData = JSON.parse(message.body);

                // サーバーからの対戦開始合図を受け取った場合
                if (battleData.status === "START_BATTLE") {
                  startSynchronizedCountdown();
                  return;
                }

                // 自分以外のデータ（相手のデータ）であれば反映する
                if (battleData.userId !== currentUser.id) {
                  setOpponentStatus(battleData);
                }
              }
            );

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
      if (status === "searching") {
        client.publish({
          destination: "/api/battles/queue/join",
          body: JSON.stringify({ userId: currentUser.id }),
        });
      }
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
      battleSubscriptionRef.current?.unsubscribe();
    };
  }, [currentUser.id]);

  // --- 2. ブラウザ強制終了時の対策 ---
  useEffect(() => {
    if (currentUser.id === 0) return;

    const handleUnload = () => {
      const data = JSON.stringify({ userId: currentUser.id });
      const blob = new Blob([data], { type: "application/json" });
      navigator.sendBeacon("/api/battles/queue/leave", blob);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [currentUser.id]);

  const handleFight = () => {
    if (clientRef.current && clientRef.current.connected && matchId) {
      setIsReady(true);
      // サーバーに準備完了を送る
      clientRef.current.publish({
        destination: "/api/battles/ready",
        body: JSON.stringify({ matchId, userId: currentUser.id }),
      });
    }
  };

  const startSynchronizedCountdown = () => {
    setStatus("ready");
    // 3秒間のカウントダウン開始
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        setStatus("playing");
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const handleBattleFinish = async (result: any) => {
    setStatus("finished");
    
    // 勝者の判定
    let winnerId = null;
    if (result.reason === "win_ko") {
      winnerId = currentUser.id;
    } else if (result.reason === "lose_ko") {
      winnerId = opponent?.id || null;
    } else if (result.reason === "time_up") {
      if (result.myHp > result.opponentHp) {
        winnerId = currentUser.id;
      } else if (result.myHp < result.opponentHp) {
        winnerId = opponent?.id || null;
      } else {
        // HPが同じ場合はスコアで判定
        if (result.score > (opponentStatus?.score || 0)) {
          winnerId = currentUser.id;
        } else if (result.score < (opponentStatus?.score || 0)) {
          winnerId = opponent?.id || null;
        }
      }
    }

    // バックエンドに結果を保存
    try {
      const battleResult = {
        player1Id: role === "player1" ? currentUser.id : opponent?.id,
        player2Id: role === "player2" ? currentUser.id : opponent?.id,
        player1Score: role === "player1" ? result.score : (opponentStatus?.score || 0),
        player2Score: role === "player2" ? result.score : (opponentStatus?.score || 0),
        player1AccuracyRate: role === "player1" ? result.accuracy : (opponentStatus?.accuracyRate || 0),
        player2AccuracyRate: role === "player2" ? result.accuracy : (opponentStatus?.accuracyRate || 0),
        player1TypedChars: role === "player1" ? result.typedChars : (opponentStatus?.typedChars || 0),
        player1MissCount: role === "player1" ? result.missCount : (opponentStatus?.missCount || 0),
        player2TypedChars: role === "player2" ? result.typedChars : (opponentStatus?.typedChars || 0),
        player2MissCount: role === "player2" ? result.missCount : (opponentStatus?.missCount || 0),
        winnerId: winnerId,
      };

      const res = await fetchWithAuth("/api/battle-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(battleResult),
      });

      if (res.ok) {
        const savedResult = await res.json();
        // 結果画面へ遷移 (対戦結果IDを渡す)
        router.push(`/result/BattleResult?id=${savedResult.id}`);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Server error response:", errorData);
        throw new Error(`Failed to save result: ${res.status}`);
      }
    } catch (err) {
      console.error("Error submitting result:", err);
      setError("けっかの ほぞんに しっぱいしました。サーバーの ログを かくにんしてください。");
    }
  };

  const handleRun = () => {
    // 待機列から抜けてメニュー画面へ戻る（ループ防止の対策1）
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination: "/api/battles/queue/leave",
        body: JSON.stringify({ userId: currentUser.id }),
      });
    }
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
                {!isReady ? (
                  <>
                    <button onClick={handleFight} className="text-left w-full">
                      <MenuItem showCursor>たたかう</MenuItem>
                    </button>
                    <button onClick={handleRun} className="text-left w-full">
                      <MenuItem showCursor>にげる</MenuItem>
                    </button>
                  </>
                ) : (
                  <div className="text-xl text-yellow-400 animate-pulse font-bold">
                    あいての じゅんびを まっています...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- ステータス3: カウントダウン / 準備中 --- */}
          {status === "ready" && (
            <div className="flex flex-col items-center py-20">
              <p className="text-3xl mb-8 font-bold">じゅんびは いいか！</p>
              <div className="text-8xl font-black text-yellow-400 animate-ping">
                {countdown}
              </div>
            </div>
          )}

          {/* --- ステータス4: 対戦中 --- */}
          {status === "playing" && matchId && opponent && (
            <BattlePlaying
              matchId={matchId}
              currentUser={currentUser}
              opponent={opponent}
              words={words}
              client={clientRef.current}
              opponentStatus={opponentStatus}
              onFinish={handleBattleFinish}
            />
          )}

          {/* --- ステータス5: 終了 --- */}
          {status === "finished" && (
            <div className="flex flex-col items-center py-20">
              <div className="h-24 w-24 animate-spin rounded-full border-b-4 border-t-4 border-white"></div>
              <p className="mt-8 text-2xl text-white font-bold animate-pulse">
                けっかを ほうこくちゅう...
              </p>
            </div>
          )}
        </div>
      </WindowPanel>
    </main>
  );
}

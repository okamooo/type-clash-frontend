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
import BattlePlaying, { BattlePlayingHandle } from "@/components/BattlePlaying";

const BATTLE_COUNTDOWN_SECONDS = 3;
const BATTLE_TIME_SECONDS = 60;
const API_BASE_URL = "http://localhost:8080";
const INITIAL_HP = 100;

const API_BASE_URL = "http://localhost:8080";

type BattleStatus = "searching" | "found" | "ready" | "playing" | "finished";

const getLeaveDestination = (currentStatus: BattleStatus) =>
  currentStatus === "found" ||
  currentStatus === "ready" ||
  currentStatus === "playing"
    ? "/api/battles/match/leave"
    : "/api/battles/queue/leave";

const getLeaveRestUrl = (currentStatus: BattleStatus) =>
  currentStatus === "searching"
    ? `${API_BASE_URL}/api/battles/queue/leave`
    : `${API_BASE_URL}/api/battles/match/leave`;

interface OpponentInfo {
  id: number;
  name: string;
  iconImage: string | null;
}

export default function BattlePage() {
  const router = useRouter();
  const { currentUser, updateCurrentUser, canEnterBattle, setCanEnterBattle } =
    useCurrentUser();
  const [status, setStatus] = useState<BattleStatus>("searching");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<OpponentInfo | null>(null);
  const [role, setRole] = useState<"player1" | "player2" | null>(null);
  const [words, setWords] = useState<MagicWord[]>([]);
  const [opponentStatus, setOpponentStatus] = useState<BattleMessage | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(BATTLE_COUNTDOWN_SECONDS);
  const [battleEndsAt, setBattleEndsAt] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMessageComplete, setIsMessageComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const clientRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const battleSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const opponentStatusRef = useRef<BattleMessage | null>(null);
  const isSavingRef = useRef(false);
  const battleEndedRef = useRef(false);
  const statusRef = useRef<BattleStatus>("searching");
  const matchIdRef = useRef<number | null>(null);
  const battlePlayingRef = useRef<BattlePlayingHandle>(null);
  const handleBattleFinishRef = useRef<((result: {
    score: number;
    accuracy: number;
    typedChars: number;
    missCount: number;
    myHp: number;
    opponentHp: number;
    reason: string;
  }) => Promise<void>) | null>(null);
  const handleOpponentLeftRef = useRef<() => void>(() => {});

  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  useEffect(() => {
    opponentStatusRef.current = opponentStatus;
  }, [opponentStatus]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  const statusRef = useRef<BattleStatus>("searching");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

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
            body: "{}",
          });
        }
        setMatchId(null);
        setOpponent(null);
        setStatus("searching");
        setError(
          "あいての じょうほうしゅとくに しっぱいしました。さいど マッチングします。",
        );
      }
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

    const publishLeaveOrForfeit = (userId: number) => {
      if (battleEndedRef.current || !clientRef.current?.connected) return;
      const currentStatus = statusRef.current;
      const mId = matchIdRef.current;
      if ((currentStatus === "playing" || currentStatus === "ready") && mId != null) {
        clientRef.current.publish({
          destination: "/api/battles/forfeit",
          body: JSON.stringify({ userId, matchId: mId }),
        });
      } else {
        clientRef.current.publish({
          destination: "/api/battles/queue/leave",
          body: JSON.stringify({ userId }),
        });
      }
    };

    const handleOpponentLeft = () => {
      if (battleEndedRef.current || isSavingRef.current) return;

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      if (statusRef.current === "playing") {
        battlePlayingRef.current?.finishWithReason("opponent_left");
        return;
      }

      if (statusRef.current === "ready") {
        handleBattleFinishRef.current?.({
          score: 0,
          accuracy: 100,
          typedChars: 0,
          missCount: 0,
          myHp: INITIAL_HP,
          opponentHp: INITIAL_HP,
          reason: "opponent_left",
        });
      }
    };

    handleOpponentLeftRef.current = handleOpponentLeft;

    const handleMatchError = (message: string) => {
      setMatchId(null);
      setOpponent(null);
      setRole(null);
      setWords([]);
      setIsReady(false);
      battleSubscriptionRef.current?.unsubscribe();
      battleSubscriptionRef.current = null;
      setStatus("searching");
      setError(message);
    };

    const beginCountdown = (endsAt: number) => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      setStatus("ready");
      const playingStartsAt = endsAt - BATTLE_TIME_SECONDS * 1000;

      const tickCountdown = () => {
        const remainingMs = playingStartsAt - Date.now();
        if (remainingMs <= 0) {
          setCountdown(0);
          setStatus("playing");
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return;
        }
        setCountdown(Math.max(1, Math.ceil(remainingMs / 1000)));
      };

      tickCountdown();
      countdownIntervalRef.current = setInterval(tickCountdown, 200);
    };

    const subscribeToBattle = (mId: number) => {
      battleSubscriptionRef.current?.unsubscribe();
      battleSubscriptionRef.current = client.subscribe(
        `/topic/battle/${mId}`,
        (message) => {
          const battleData = JSON.parse(message.body);
          if (battleData.userId !== currentUser.id) {
            setOpponentStatus(battleData);
          }
        },
      );
    };

    const handleStartBattle = (data: { matchId?: number; battleEndsAt?: number }) => {
      const mId = data.matchId;
      if (mId == null) return;

      const endsAt =
        typeof data.battleEndsAt === "number"
          ? data.battleEndsAt
          : Date.now() + (BATTLE_COUNTDOWN_SECONDS + BATTLE_TIME_SECONDS) * 1000;

      setMatchId(mId);
      setBattleEndsAt(endsAt);
      subscribeToBattle(mId);
      beginCountdown(endsAt);
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
          } catch {
            console.error("Invalid message format:", message.body);
            return;
          }

          if (data.status === "MATCHED") {
            setRole(data.role);
            setMatchId(null);
            setIsReady(false);
            setBattleEndsAt(null);
            battleSubscriptionRef.current?.unsubscribe();
            battleSubscriptionRef.current = null;
            fetchOpponentInfo(data.opponentId);
            fetchMagicWords();
            setStatus("found");
            setIsMessageComplete(false);
            setError(null);
          } else if (data.status === "START_BATTLE") {
            handleStartBattle(data);
          } else if (data.status === "OPPONENT_LEFT") {
            if (battleEndedRef.current || isSavingRef.current) return;
            if (data.matchId != null) {
              setMatchId(data.matchId);
              matchIdRef.current = data.matchId;
            }
            setError("あいてが 切断しました！ 不戦勝です。");
            handleOpponentLeftRef.current();
          } else if (
            data.status === "OPPONENT_LEFT" ||
            data.status === "CANCELLED"
          ) {
            // 対戦中・終了処理中の leave は無視（結果画面遷移時の queue/leave 対策）
            if (
              battleEndedRef.current ||
              statusRef.current === "playing" ||
              statusRef.current === "ready" ||
              statusRef.current === "finished"
            ) {
              return;
            }
            setMatchId(null);
            setOpponent(null);
            setRole(null);
            setIsReady(false);
            setBattleEndsAt(null);
            battleSubscriptionRef.current?.unsubscribe();
            battleSubscriptionRef.current = null;
            setStatus("searching");
            setError("あいてが にげだした！ べつの あいてを さがします。");
          }
        },
      );

      // マッチング待機列に参加
      if (status === "searching") {
        client.publish({
          destination: "/api/battles/queue/join",
          body: "{}",
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
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (clientRef.current) {
        if (clientRef.current.connected && !battleEndedRef.current) {
          publishLeaveOrForfeit(currentUser.id);
        if (clientRef.current.connected) {
          clientRef.current.publish({
            destination: getLeaveDestination(statusRef.current),
            body: "{}",
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
      if (battleEndedRef.current) return;
      const userId = currentUser.id;
      const currentStatus = statusRef.current;
      const mId = matchIdRef.current;
      const isForfeit =
        (currentStatus === "playing" || currentStatus === "ready") && mId != null;
      const payload = isForfeit
        ? JSON.stringify({ userId, matchId: mId })
        : JSON.stringify({ userId });
      const blob = new Blob([payload], { type: "application/json" });
      const url = isForfeit
        ? `${API_BASE_URL}/api/battles/forfeit`
        : `${API_BASE_URL}/api/battles/queue/leave`;
      navigator.sendBeacon(url, blob);
      const currentStatus = statusRef.current;
      if (currentStatus === "finished") return;

      const blob = new Blob(["{}"], { type: "application/json" });
      navigator.sendBeacon(getLeaveRestUrl(currentStatus), blob);
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
                <div
                  className={`h-24 w-24 animate-spin rounded-full border-b-4 border-t-4 ${isConnected ? "border-yellow-400" : "border-gray-500"}`}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                  {isConnected ? "⚔️" : "☁️"}
                </div>
              </div>
              <p className="text-2xl text-white">
                <TypewriterText
                  text={
                    isConnected
                      ? "対戦相手を さがしています..."
                      : "サーバーに せつぞくちゅう..."
                  }
                />
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
          {status === "playing" && matchId && opponent && battleEndsAt !== null && (
            <BattlePlaying
              ref={battlePlayingRef}
              matchId={matchId}
              currentUser={currentUser}
              opponent={opponent}
              words={words}
              client={clientRef.current}
              opponentStatus={opponentStatus}
              battleEndsAt={battleEndsAt}
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

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

const getLeaveDestination = (currentStatus: BattleStatus) => {
  if (currentStatus === "ready" || currentStatus === "playing") {
    return "/api/battles/forfeit";
  }
  if (currentStatus === "found") {
    return "/api/battles/match/leave";
  }
  return "/api/battles/queue/leave";
};

const getLeaveRestUrl = (currentStatus: BattleStatus) => {
  if (currentStatus === "ready" || currentStatus === "playing") {
    return `${API_BASE_URL}/api/battles/forfeit`;
  }
  if (currentStatus === "found") {
    return `${API_BASE_URL}/api/battles/match/leave`;
  }
  return `${API_BASE_URL}/api/battles/queue/leave`;
};

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

  // --- URL直叩き防止チェック ---
  useEffect(() => {
    if (!canEnterBattle) {
      router.replace("/home");
    }
  }, []);

  useEffect(() => {
    return () => {
      setCanEnterBattle(false);
    };
  }, [setCanEnterBattle]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName");

    if (userId && userId !== "0" && userId !== String(currentUser.id)) {
      updateCurrentUser({
        id: Number(userId),
        name: userName ?? currentUser.name,
      });

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
  }, [currentUser.id, currentUser.name, updateCurrentUser]);

  useEffect(() => {
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

    const publishLeave = () => {
      if (battleEndedRef.current || !clientRef.current?.connected) return;
      clientRef.current.publish({
        destination: getLeaveDestination(statusRef.current),
        body: "{}",
      });
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

    const resetToSearching = (message: string) => {
      setMatchId(null);
      setOpponent(null);
      setRole(null);
      setIsReady(false);
      setBattleEndsAt(null);
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

            if (statusRef.current === "found") {
              resetToSearching("あいてが にげだした！ べつの あいてを さがします。");
              return;
            }

            if (data.matchId != null) {
              setMatchId(data.matchId);
              matchIdRef.current = data.matchId;
            }
            setError("あいてが 切断しました！ 不戦勝です。");
            handleOpponentLeftRef.current();
          } else if (data.status === "CANCELLED") {
            if (
              battleEndedRef.current ||
              statusRef.current === "playing" ||
              statusRef.current === "ready" ||
              statusRef.current === "finished"
            ) {
              return;
            }
            resetToSearching("あいてが にげだした！ べつの あいてを さがします。");
          }
        },
      );

      if (statusRef.current === "searching") {
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
          publishLeave();
        }
        clientRef.current.deactivate();
      }
      subscriptionRef.current?.unsubscribe();
      battleSubscriptionRef.current?.unsubscribe();
    };
  }, [currentUser.id]);

  useEffect(() => {
    if (currentUser.id === 0) return;

    const handleUnload = () => {
      if (battleEndedRef.current || statusRef.current === "finished") return;
      const blob = new Blob(["{}"], { type: "application/json" });
      navigator.sendBeacon(getLeaveRestUrl(statusRef.current), blob);
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [currentUser.id]);

  const handleFight = () => {
    if (clientRef.current?.connected && opponent) {
      setIsReady(true);
      clientRef.current.publish({
        destination: "/api/battles/ready",
        body: "{}",
      });
    }
  };

  const handleBattleFinish = async (result: {
    score: number;
    accuracy: number;
    typedChars: number;
    missCount: number;
    myHp: number;
    opponentHp: number;
    reason: string;
  }) => {
    if (isSavingRef.current || !matchId) return;
    isSavingRef.current = true;
    battleEndedRef.current = true;
    setStatus("finished");

    const latestOpponent = opponentStatusRef.current;

    let winnerId: number | null = null;
    if (result.reason === "win_ko") {
      winnerId = currentUser.id;
    } else if (result.reason === "lose_ko") {
      winnerId = opponent?.id ?? null;
    } else if (result.reason === "time_up") {
      if (result.myHp > result.opponentHp) {
        winnerId = currentUser.id;
      } else if (result.myHp < result.opponentHp) {
        winnerId = opponent?.id ?? null;
      } else if (result.score > (latestOpponent?.score ?? 0)) {
        winnerId = currentUser.id;
      } else if (result.score < (latestOpponent?.score ?? 0)) {
        winnerId = opponent?.id ?? null;
      }
    } else if (result.reason === "opponent_left") {
      winnerId = currentUser.id;
    }

    try {
      const battleResult = {
        matchId,
        player1Id: role === "player1" ? currentUser.id : opponent?.id,
        player2Id: role === "player2" ? currentUser.id : opponent?.id,
        player1Score: role === "player1" ? result.score : (latestOpponent?.score ?? 0),
        player2Score: role === "player2" ? result.score : (latestOpponent?.score ?? 0),
        player1AccuracyRate: role === "player1" ? result.accuracy : (latestOpponent?.accuracyRate ?? 0),
        player2AccuracyRate: role === "player2" ? result.accuracy : (latestOpponent?.accuracyRate ?? 0),
        player1TypedChars: role === "player1" ? result.typedChars : (latestOpponent?.typedChars ?? 0),
        player1MissCount: role === "player1" ? result.missCount : (latestOpponent?.missCount ?? 0),
        player2TypedChars: role === "player2" ? result.typedChars : (latestOpponent?.typedChars ?? 0),
        player2MissCount: role === "player2" ? result.missCount : (latestOpponent?.missCount ?? 0),
        winnerId,
      };

      const res = await fetchWithAuth("/api/battle-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(battleResult),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Server error response:", errorData);
        throw new Error(`Failed to save result: ${res.status}`);
      }

      router.push(`/result/BattleResult?id=${matchId}`);
    } catch (err) {
      console.error("Error submitting result:", err);
      isSavingRef.current = false;
      setError("けっかの ほぞんに しっぱいしました。サーバーの ログを かくにんしてください。");
    }
  };

  useEffect(() => {
    handleBattleFinishRef.current = handleBattleFinish;
  });

  const handleRun = () => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: "/api/battles/match/leave",
        body: "{}",
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

          {status === "searching" && (
            <div className="flex flex-col items-center py-16">
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

          {status === "found" && opponent && (
            <div className="flex w-full flex-col items-center py-8">
              <div className="flex items-center gap-12 mb-12 animate-bounce">
                <div className="flex flex-col items-center">
                  <UserAvatar user={currentUser} size="lg" />
                  <p className="mt-2 text-sm text-slate-400">あなた</p>
                </div>
                <div className="text-5xl font-black italic text-red-600">VS</div>
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

          {status === "ready" && (
            <div className="flex flex-col items-center py-20">
              <p className="text-3xl mb-8 font-bold">じゅんびは いいか！</p>
              <div className="text-8xl font-black text-yellow-400 animate-ping">
                {countdown}
              </div>
            </div>
          )}

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

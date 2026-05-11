"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import WindowPanel from "@/components/WindowPanel";

type History = {
  finishedAt: string;
  score: number;
  accuracyRate: number;
};

type HistoryResponse = {
  bestScore: number;
  averageScore: number;
  playCount: number;
  histories: History[];
};

// ISO-8601形式の日時を "yyyy/MM/dd HH:mm" 形式に変換する
function formatDate(isoString: string): { date: string; time: string } {
  const dt = new Date(isoString);

  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");

  const hours = String(dt.getHours()).padStart(2, "0");
  const minutes = String(dt.getMinutes()).padStart(2, "0");

  return {
    date: `${year}/${month}/${day}`,
    time: `${hours}:${minutes}`,
  };
}

// ログイン機能実装後に認証済みユーザーIDを使用する
const USER_ID = 1;

export default function HistoryPage() {
  const [histories, setHistories] = useState<History[]>([]);
  const [bestScore, setBestScore] = useState<number>(0);
  const [averageScore, setAverageScore] = useState<number>(0);
  const [playCount, setPlayCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(
          `http://localhost:8080/api/single-results/history?userId=${USER_ID}`,
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`履歴取得失敗: ${res.status}`);
        }

        const data: HistoryResponse = await res.json();
        setHistories(data.histories);
        setBestScore(data.bestScore);
        setAverageScore(data.averageScore);
        setPlayCount(data.playCount);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          setError("履歴の取得がタイムアウトしました");
        } else {
          setError("履歴の取得に失敗しました");
        }
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="[&>section]:h-[500px] [&>section]:w-[750px] [&>section]:pt-3">
        <WindowPanel>
          {/* タイトル */}
          <div className="flex items-center justify-center gap-3">
            <Image
              className="mt-2"
              src="/images/icon-decoration-left.png"
              alt=""
              width={50}
              height={50}
            />

            <h1 className="text-4xl font-semibold drop-shadow-[4px_4px_0_#64748b] text-slate-200">
              スコア履歴
            </h1>

            <Image
              className="mt-2"
              src="/images/icon-decoration-right.png"
              alt=""
              width={50}
              height={50}
            />
          </div>

          {/* 最高スコア・平均スコア・プレイ回数 */}
          <div className="mt-5 flex justify-center gap-5">
            <div className="flex w-[210px] items-center gap-3 border border-white/30 px-4 py-1">
              <Image
                src="/images/icon_trophy_gold.png"
                alt="最高スコア"
                width={30}
                height={30}
              />
              <div className="flex flex-col" style={{ minWidth: 0 }}>
                <span className="text-xs text-slate-400">最高スコア</span>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="translate-x-[4px] text-[1.1rem] font-bold tracking-[0.1em] text-yellow-200">
                    {bestScore.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400">pt</span>
                </div>
              </div>
            </div>

            <div className="flex w-[210px] items-center gap-3 border border-white/30 px-4 py-1">
              <Image
                src="/images/icon-average-score.png"
                alt="平均スコア"
                width={30}
                height={30}
              />
              <div className="flex flex-col" style={{ minWidth: 0 }}>
                <span className="text-xs text-slate-400">平均スコア</span>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="translate-x-[4px] text-[1.1rem] font-bold tracking-[0.1em] text-yellow-200">
                    {averageScore.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">pt</span>
                </div>
              </div>
            </div>

            <div className="flex w-[210px] items-center gap-3 border border-white/30 px-4 py-1">
              <Image
                src="/images/icon_calendar_green.png"
                alt="プレイ回数"
                width={30}
                height={30}
              />
              <div className="flex flex-col" style={{ minWidth: 0 }}>
                <span className="text-xs text-slate-400">プレイ回数</span>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="translate-x-[4px] text-[1.1rem] font-bold text-yellow-200">
                    {playCount}
                  </span>
                  <span className="text-xs text-slate-400">回</span>
                </div>
              </div>
            </div>
          </div>

          {/* テーブル */}
          <div className="mt-5 w-full">
            <div className="grid grid-cols-[1fr_7rem_7rem] gap-2 border-b border-yellow-200/30 pb-1.5 text-sm text-slate-400">
              <span className="pl-2.5 text-left">日時</span>
              <span className="pl-2.5 text-left">スコア</span>
              <span className="pl-2.5 text-left">正答率</span>
            </div>

            {/* ローディング */}
            {loading && (
              <p className="mt-10 text-center text-slate-500">読み込み中...</p>
            )}

            {/* エラー */}
            {!loading && error && (
              <p className="mt-10 text-center text-red-400">{error}</p>
            )}

            {/* データなし */}
            {!loading && !error && histories.length === 0 && (
              <p className="mt-10 text-center text-slate-500">
                まだプレイ履歴がありません
              </p>
            )}

            {/* 履歴一覧 */}
            {!loading && !error && histories.length > 0 && (
              <ul className="flex flex-col overflow-y-auto max-h-[280px]">
                {histories.map((history) => {
                  const { date, time } = formatDate(history.finishedAt);

                  return (
                    <li
                      key={history.finishedAt}
                      className="grid h-12 shrink-0 grid-cols-[1fr_7rem_7rem] gap-2 border-b border-white/10 px-3 transition-colors hover:bg-white/5"
                    >

                      {/* 日時 */}
                      <span className="flex items-center gap-2 text-sm font-medium tracking-[0.1em] text-slate-300">
                        <span>{date}</span>
                        <span>{time}</span>
                      </span>

                      {/* スコア */}
                      <span className="flex items-center justify-center text-sm font-medium tracking-[0.1em] text-yellow-200">
                        {history.score.toLocaleString()}
                      </span>

                      {/* 正答率 */}
                      <span className="flex items-center justify-center text-sm font-medium tracking-[0.1em] text-slate-300">
                        {history.accuracyRate}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ホームへ戻る */}
          <div className="mt-3">
            <Link
              href="/home"
              className="inline-flex items-center gap-1 text-base text-slate-300"
            >
              <Image
                src="/images/icon-home.png"
                alt=""
                width={25}
                height={25}
              />
              <span className="transition-colors hover:text-yellow-200">
                ホームへ戻る
              </span>
            </Link>
          </div>
        </WindowPanel>
      </div>
    </main>
  );
}

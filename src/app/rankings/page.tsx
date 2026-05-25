"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import WindowPanel from "@/components/WindowPanel";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

type Ranking = {
  userId: number;
  rank: number;
  userName: string;
  score: number;
  accuracyRate: number;
};

type RankingListResponse = {
  totalUsers: number;
  averageBestScore: number;
  rankings: Ranking[];
};

// 順位に応じてメダルまたは順位テキストを返す
function renderRank(rank: number) {
  const medals = ["gold", "silver", "bronze"];

  if (rank <= 3) {
    return (
      <Image
        className="pr-2"
        src={`/images/medal-${medals[rank - 1]}.png`}
        alt={`${rank}位`}
        width={32}
        height={32}
      />
    );
  }

  const startsOne = String(rank).startsWith("1");

  return (
    <span
      className={`whitespace-pre text-sm font-medium tracking-[0.1em] text-slate-300 
        ${startsOne ? "-translate-x-[2px]" : ""
      }`}
    >
      {rank}位
    </span>
  );
}

export default function RankingsPage() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [averageBestScore, setAverageBestScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetchWithAuth(
          "/api/single-results/rankings",
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`ランキング取得失敗: ${res.status}`);
        }

        const data: RankingListResponse = await res.json();
        setRankings(data.rankings);
        setTotalUsers(data.totalUsers);
        setAverageBestScore(data.averageBestScore);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          setError("ランキングの取得がタイムアウトしました");
        } else {
          setError("ランキングの取得に失敗しました");
        }
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, []);

  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="[&>section]:h-[650px] [&>section]:w-[750px] [&>section]:pt-3">
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
              ランキング
            </h1>

            <Image
              className="mt-2"
              src="/images/icon-decoration-right.png"
              alt=""
              width={50}
              height={50}
            />
          </div>

          {/* 参加人数・平均スコア */}
          <div className="mt-5 flex justify-center gap-10">
            <div className="flex w-[300px] items-center gap-2 border border-white/30 px-3 py-1">
              <Image
                src="/images/icon-users.png"
                alt="参加人数"
                width={32}
                height={32}
              />

              <span className="text-sm text-slate-300">参加人数</span>

              <span className="ml-auto text-[1.25rem] font-bold tracking-[0.1em] text-yellow-200">
                {totalUsers}
              </span>

              <span className="mt-1 text-sm text-slate-400">人</span>
            </div>

            <div className="flex w-[300px] items-center gap-2 border border-white/30 px-3 py-1">
              <Image
                src="/images/icon-average-score.png"
                alt="ベスト平均"
                width={30}
                height={30}
              />

              <span className="text-sm text-slate-300">ベスト平均</span>

              <span className="ml-auto text-[1.25rem] font-bold tracking-[0.1em] text-yellow-200">
                {averageBestScore.toFixed(2)}
              </span>

              <span className="mt-1 text-sm text-slate-400">pt</span>
            </div>
          </div>

          {/* テーブル */}
          <div className="mt-5 w-full">
            <div className="grid grid-cols-[5rem_1fr_7rem_7rem] gap-2 border-b border-yellow-200/30 pb-1.5 text-sm text-slate-400">
              <span className="pr-5 text-center">順位</span>
              <span className="pl-2 text-left">ユーザー名</span>
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
            {!loading && !error && rankings.length === 0 && (
              <p className="mt-10 text-center text-slate-500">
                まだランキングデータがありません
              </p>
            )}

            {/* ランキング一覧 */}
            {!loading && !error && rankings.length > 0 && (
              <ul className="flex flex-col overflow-y-auto max-h-[280px]">
                {rankings.map((ranking) => (
                  <li
                    key={ranking.userId}
                    className="grid h-12 shrink-0 grid-cols-[5rem_1fr_7rem_7rem] gap-2 border-b border-white/10 px-3 transition-colors hover:bg-white/5"
                  >
                    {/* 順位 */}
                    <span className="pl-1 flex items-center">
                      {renderRank(ranking.rank)}
                    </span>

                    {/* ユーザー名 */}
                    <span className="flex items-center truncate text-sm font-medium tracking-[0.1em] text-slate-300">
                      {ranking.userName}
                    </span>

                    {/* スコア */}
                    <span className="flex items-center pr-8 justify-center text-sm font-medium tracking-[0.1em] text-slate-300">
                      {ranking.score.toLocaleString()}
                    </span>

                    {/* 正答率 */}
                    <span className="flex items-center pr-8 justify-center text-sm font-medium tracking-[0.1em] text-slate-300">
                      {ranking.accuracyRate}%
                    </span>
                  </li>
                ))}
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

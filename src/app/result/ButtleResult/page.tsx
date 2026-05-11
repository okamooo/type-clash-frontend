"use client";
import WindowPanel from "@/components/WindowPanel";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BattleResult() {

    interface Result {
        id: number
        player1_id: number
        player2_id: number
        winner_id: number
        player1_score: number
        player2_score: number
        player1_accuracy_rate: number
        player2_accuracy_rate: number
    }

    
    const [result, setResult] = useState<Result | null>(null)
    const [displayedText1, setDisplayedText1] = useState("")
    const [displayedText2, setDisplayedText2] = useState("")
    const [done, setDone] = useState(false)

    const router = useRouter();
    const url = "http://localhost:8080"

    //表示時に
    useEffect(() => {
        const fetchResult = async () => {
            try {
                const res = await fetch(`${url}/api/battle-results`, {
                    method: "GET",
                    headers: { 'Content-Type': 'application/json' },
                })
                const data: Result = await res.json()
                setResult(data)
            } catch {
                setResult({
                    id: 1,
                    player1_id: 1,
                    player2_id: 2,
                    winner_id: 1,
                    player1_score: 100,
                    player2_score: 80,
                    player1_accuracy_rate: 89,
                    player2_accuracy_rate: 90
                })
            }
        }
        fetchResult()
    }, [])

    useEffect(() => {
        if (!result) return;

        const fullText1 = `Player 1\nスコア：${result.player1_score}\n正答率：${result.player1_accuracy_rate}%\n入力文字数:\nミス数:`;
        const fullText2 = `Player 2\nスコア：${result.player2_score}\n正答率：${result.player2_accuracy_rate}%\n入力文字数:\nミス数:`;
        let index1 = 0;
        let index2 = 0;
        let fin1 = false;
        let fin2 = false;
        setDisplayedText1("");
        setDisplayedText2("");
        setDone(false);

        const timer = setInterval(() => {
            if (index1 < fullText1.length) {
                index1++;
                setDisplayedText1(fullText1.slice(0, index1));
                if (index1 >= fullText1.length) fin1 = true;
            }
            if (index2 < fullText2.length) {
                index2++;
                setDisplayedText2(fullText2.slice(0, index2));
                if (index2 >= fullText2.length) fin2 = true;
            }
            if (fin1 && fin2) {
                clearInterval(timer);
                setDone(true);
            }
        }, 70);

        return () => clearInterval(timer);
    }, [result])

    const winnerLabel = result
        ? result.winner_id === result.player1_id ? "Player 1 の勝利！" : "Player 2 の勝利！"
        : ""

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="flex gap-6">
                <WindowPanel>
                    <pre className="whitespace-pre-wrap font-[inherit]">
                        {displayedText1}
                    </pre>
                </WindowPanel>
                <WindowPanel>
                    <pre className="whitespace-pre-wrap font-[inherit]">
                        {displayedText2}
                    </pre>
                </WindowPanel>
            </div>
            {done && (
                <WindowPanel>
                    <p className="text-xl">{winnerLabel}</p>
                    <div className="flex gap-4 mt-8">
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            className="self-start text-base transition-colors hover:text-yellow-200 sm:text-xl"
                        >
                            ▶ 再挑戦
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/home')}
                            className="self-start text-base transition-colors hover:text-yellow-200 sm:text-xl"
                        >
                            ▶ home
                        </button>
                    </div>
                </WindowPanel>
            )}
        </div>
    )
}

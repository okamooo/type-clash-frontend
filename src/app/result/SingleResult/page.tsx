"use client";
import BackButton from "@/components/BackButton";
import WindowPanel from "@/components/WindowPanel";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SingleResult() {

    interface Result {
        userid: number
        score: number
        accuracy_rate: number
    }

    const [result, setResult] = useState<Result | null>(null)
    const [displayedText, setDisplayedText] = useState("")
    const [done, setDone] = useState(false)

    const router = useRouter();
    const url = "http://localhost:8080"

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const res = await fetch(`${url}/api/single-results`, {
                    method: "GET",
                    headers: { 'Content-Type': 'application/json' },
                })
                const data: Result = await res.json()
                setResult(data)
            } catch {
                setResult({ userid: 1, score: 100, accuracy_rate: 80 })
            }
        }
        fetchResult()
    }, [])

    useEffect(() => {
        if (!result) return;

        const fullText = `結果\nスコア：${result.score}\n正答率：${result.accuracy_rate}%\n入力文字数:\nミス数:`;
        let index = 0;
        setDisplayedText("");
        setDone(false);

        const timer = setInterval(() => {
            index++;
            setDisplayedText(fullText.slice(0, index));
            if (index >= fullText.length) {
                clearInterval(timer);
                setDone(true);
            }
        }, 50);

        return () => clearInterval(timer);
    }, [result])

    return(
        <>
           <WindowPanel>
                <pre className="whitespace-pre-wrap font-[inherit]">
                    {displayedText}
                </pre>
                {done && (
                    <>
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            className="mt-8 self-start text-base transition-colors hover:text-yellow-200 sm:text-xl"
                        >
                            ▶ 再挑戦
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/home')}
                            className="mt-8 self-start text-base transition-colors hover:text-yellow-200 sm:text-xl"
                        >
                            ▶ home
                        </button>
                    </>
                )}
           </WindowPanel>
        </>
    )
}

"use client";
import BackButton from "@/components/BackButton";
import WindowPanel from "@/components/WindowPanel";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SingleResultContent() {
    interface Result {
        score: string;
        accuracy: string;
        correct: string;
        total: string;
    }

    const [displayedText, setDisplayedText] = useState("");
    const [done, setDone] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();

    const result: Result = {
        score: searchParams.get("score") || "0",
        accuracy: searchParams.get("accuracy") || "0.0",
        correct: searchParams.get("correct") || "0",
        total: searchParams.get("total") || "0",
    };

    useEffect(() => {
        const correct = parseInt(result.correct);
        const total = parseInt(result.total);
        const miss = total - correct;

        const fullText = `結果\nスコア：${result.score}\n正答率：${result.accuracy}%\n入力文字数: ${result.total}\nミス数: ${miss > 0 ? miss : 0}`;
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
    }, [result.score, result.accuracy, result.correct, result.total]);

    return (
        <WindowPanel>
            <pre className="whitespace-pre-wrap font-[inherit] text-left text-xl leading-relaxed">
                {displayedText}
            </pre>
            {done && (
                <div className="flex gap-4 mt-8">
                    <button
                        type="button"
                        onClick={() => router.push('/single')}
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
            )}
        </WindowPanel>
    );
}

export default function SingleResult() {
    return (
        <main className="flex flex-1 items-center justify-center p-4">
            <Suspense fallback={<WindowPanel><p className="text-white">読み込み中...</p></WindowPanel>}>
                <SingleResultContent />
            </Suspense>
        </main>
    );
}

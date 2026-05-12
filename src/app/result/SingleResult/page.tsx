"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import MessagePanel from "@/components/MessagePanel";
import TypewriterText from "@/components/TypewriterText";
import WindowPanel from "@/components/WindowPanel";

const API_BASE_URL = "http://localhost:8080";

type Result = Readonly<{
    userId: number;
    score: number;
    accuracyRate: number;
    typedChars: number;
    missCount: number;
}>;

// API接続時は削除する開発用モックデータ。
const mockSingleResult: Result = {
    userId: 1,
    score: 100,
    accuracyRate: 80,
    typedChars: 230,
    missCount: 4,
};

export default function SingleResult() {
    const router = useRouter();
    // API接続時は初期値を null に戻す。
    const [result, setResult] = useState<Result | null>(mockSingleResult);
    const [completedValues, setCompletedValues] = useState<
        Readonly<Record<string, boolean>>
    >({});

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/single-results`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                const data: Result = await res.json();
                setResult(data);
            } catch {
                setResult(mockSingleResult);
            }
        };
        fetchResult();
    }, []);

    const resultKey = result ? String(result.userId) : "loading";
    const scoreCompleteKey = `${resultKey}-score`;
    const accuracyCompleteKey = `${resultKey}-accuracy`;
    const typedCharsCompleteKey = `${resultKey}-typed-chars`;
    const missCountCompleteKey = `${resultKey}-miss-count`;
    const isResultReady = result !== null;
    const score = result ? String(result.score) : "";
    const accuracy = result ? `${result.accuracyRate}%` : "";
    const typedChars = result ? String(result.typedChars) : "";
    const missCount = result ? String(result.missCount) : "";
    const isScoreComplete = Boolean(completedValues[scoreCompleteKey]);
    const isAccuracyComplete = Boolean(completedValues[accuracyCompleteKey]);
    const isTypedCharsComplete = Boolean(completedValues[typedCharsCompleteKey]);

    const markComplete = useCallback((valueKey: string) => {
        setCompletedValues((current) => {
            if (current[valueKey]) {
                return current;
            }

            return {
                ...current,
                [valueKey]: true,
            };
        });
    }, []);
    const handleScoreComplete = useCallback(() => {
        markComplete(scoreCompleteKey);
    }, [markComplete, scoreCompleteKey]);
    const handleAccuracyComplete = useCallback(() => {
        markComplete(accuracyCompleteKey);
    }, [accuracyCompleteKey, markComplete]);
    const handleTypedCharsComplete = useCallback(() => {
        markComplete(typedCharsCompleteKey);
    }, [markComplete, typedCharsCompleteKey]);
    const handleMissCountComplete = useCallback(() => {
        markComplete(missCountCompleteKey);
    }, [markComplete, missCountCompleteKey]);

    return (
        <main className="flex flex-1 items-center justify-center">
            <WindowPanel className="min-h-136">
                <div className="mb-6 flex items-center justify-center gap-4 sm:gap-6">
                    <Image
                        src="/images/sword.png"
                        alt=""
                        width={64}
                        height={64}
                        className="h-12 w-12 [image-rendering:pixelated] sm:h-16 sm:w-16"
                        priority
                    />
                    <h1 className="text-3xl sm:text-4xl">Result</h1>
                    <Image
                        src="/images/sword.png"
                        alt=""
                        width={64}
                        height={64}
                        className="h-12 w-12 [image-rendering:pixelated] sm:h-16 sm:w-16"
                        priority
                    />
                </div>
                <div className="flex min-h-96 w-full max-w-lg flex-col gap-6">
                    <MessagePanel className="h-72">
                        {isResultReady ? (
                            <div className="flex justify-center">
                                <span className="flex flex-col items-start text-left">
                                    <span>
                                        スコア：
                                        <TypewriterText
                                            key={scoreCompleteKey}
                                            text={score}
                                            speed={50}
                                            onComplete={handleScoreComplete}
                                        />
                                    </span>
                                    <span>
                                        正答率：
                                        {isScoreComplete ? (
                                            <TypewriterText
                                                key={accuracyCompleteKey}
                                                text={accuracy}
                                                speed={50}
                                                onComplete={handleAccuracyComplete}
                                            />
                                        ) : null}
                                    </span>
                                    <span>
                                        入力文字数:
                                        {isAccuracyComplete ? (
                                            <TypewriterText
                                                key={typedCharsCompleteKey}
                                                text={typedChars}
                                                speed={50}
                                                onComplete={handleTypedCharsComplete}
                                            />
                                        ) : null}
                                    </span>
                                    <span>
                                        ミス数:
                                        {isTypedCharsComplete ? (
                                            <TypewriterText
                                                key={missCountCompleteKey}
                                                text={missCount}
                                                speed={50}
                                                onComplete={handleMissCountComplete}
                                            />
                                        ) : null}
                                    </span>
                                </span>
                            </div>
                        ) : null}
                    </MessagePanel>
                    <MessagePanel className="flex h-32 flex-col justify-center">
                        <div className="flex flex-wrap gap-4">
                            <button
                                type="button"
                                onClick={() => router.push("/")}
                                className="self-start text-base transition-colors hover:text-yellow-200 sm:text-xl"
                            >
                                ▶ 再挑戦
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push("/home")}
                                className="self-start text-base transition-colors hover:text-yellow-200 sm:text-xl"
                            >
                                ▶ home
                            </button>
                        </div>
                    </MessagePanel>
                </div>
            </WindowPanel>
        </main>
    );
}

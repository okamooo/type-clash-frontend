"use client";

import { Suspense, useCallback, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import MessagePanel from "@/components/MessagePanel";
import TypewriterText from "@/components/TypewriterText";
import WindowPanel from "@/components/WindowPanel";

type Result = Readonly<{
    score: number;
    accuracyRate: string;
    typedChars: number;
    missCount: number;
}>;

function getSingleResultFromParams(searchParams: URLSearchParams): Result {
    const score = Number(searchParams.get("score") ?? 0);
    const accuracyRate = searchParams.get("accuracy") ?? "0.0";
    const correctCount = Number(searchParams.get("correct") ?? 0);
    const typedChars = Number(searchParams.get("total") ?? 0);
    const missCount = Math.max(typedChars - correctCount, 0);

    return {
        score,
        accuracyRate,
        typedChars,
        missCount,
    };
}

function SingleResultContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const result = getSingleResultFromParams(searchParams);
    const [completedValues, setCompletedValues] = useState<
        Readonly<Record<string, boolean>>
    >({});

    const resultKey = `${result.score}-${result.accuracyRate}-${result.typedChars}-${result.missCount}`;
    const scoreCompleteKey = `${resultKey}-score`;
    const accuracyCompleteKey = `${resultKey}-accuracy`;
    const typedCharsCompleteKey = `${resultKey}-typed-chars`;
    const missCountCompleteKey = `${resultKey}-miss-count`;
    const score = String(result.score);
    const accuracy = `${result.accuracyRate}%`;
    const typedChars = String(result.typedChars);
    const missCount = String(result.missCount);
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
                </MessagePanel>
                <MessagePanel className="flex h-32 flex-col justify-center">
                    <div className="flex flex-wrap gap-4">
                        <button
                            type="button"
                            onClick={() => router.push("/single")}
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
    );
}

export default function SingleResult() {
    return (
        <main className="flex flex-1 items-center justify-center p-4">
            <Suspense
                fallback={
                    <WindowPanel>
                        <p className="text-white">読み込み中...</p>
                    </WindowPanel>
                }
            >
                <SingleResultContent />
            </Suspense>
        </main>
    );
}

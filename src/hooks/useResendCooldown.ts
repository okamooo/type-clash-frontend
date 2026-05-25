"use client";
 
import { useCallback, useEffect, useRef, useState } from "react";
 
/**
 * 認証コードの再送信クールダウンを管理するカスタムフック
 *
 * @param cooldownSeconds - 再送信ボタンを無効化する秒数（デフォルト: 30秒）
 * @param successMessageMs - 再送信成功メッセージを表示する時間（デフォルト: 3秒）
 */
export function useResendCooldown(
  cooldownSeconds = 30,
  successMessageMs = 3000,
) {
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 
  // 両タイマーをまとめてクリアする
  const clearTimers = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
 
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);
 
  // 再送信成功時に呼び出す
  // 成功メッセージの表示とクールダウンカウントダウンを同時に開始する
  const startResendCooldown = useCallback(() => {
    // 前回のタイマーが残っている場合はクリアしてから開始する
    clearTimers();
 
    // 成功メッセージを一定時間後に非表示にする
    setResendSuccess(true);
    successTimerRef.current = setTimeout(() => {
      setResendSuccess(false);
      successTimerRef.current = null;
    }, successMessageMs);
 
    // 1秒ごとにカウントダウンし、0になったらタイマーを止める
    setResendCooldown(cooldownSeconds);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
 
          return 0;
        }
 
        return prev - 1;
      });
    }, 1000);
  }, [clearTimers, cooldownSeconds, successMessageMs]);
 
  // アンマウント時にタイマーをクリアしてメモリリークを防ぐ
  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);
 
  return {
    resendCooldown,   // 再送信ボタンに表示する残り秒数（0のとき再送信可能）
    resendSuccess,    // 再送信成功メッセージの表示フラグ
    startResendCooldown, // 再送信成功時に呼び出す関数
  };
}

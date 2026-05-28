"use client";

import { removeVerificationCodeSpaces } from "@/lib/validation";

type VerificationCodeFormProps = {
  verificationCode: string;
  onCodeChange: (code: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onResend?: () => void;
  isSubmitting?: boolean;
  isResending?: boolean;
  error?: string;
  fieldError?: string;
  successMessage?: string;
  description?: string;
  resendCooldown?: number;
  resendSuccess?: boolean;
};

export default function VerificationCodeForm({
  verificationCode,
  onCodeChange,
  onSubmit,
  onResend,
  isSubmitting = false,
  isResending = false,
  error,
  fieldError,
  successMessage,
  resendCooldown = 0,
  resendSuccess = false,
}: VerificationCodeFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mt-6 flex w-full max-w-sm flex-col gap-5"
    >
      <p
        role={error || successMessage ? "alert" : undefined}
        className={`min-h-[20px] text-left text-[15px] ${error ? "text-red-400" :
          successMessage ? "text-emerald-300" :
            "text-transparent"
          }`}
      >
        {error || successMessage || "\u00A0"}
      </p>

      <p className="whitespace-nowrap -mt-4 text-left text-[15px] text-slate-300">
        メールに送信された認証コードを入力してください
      </p>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="verificationCode"
          role={fieldError ? "alert" : undefined}
          className={`min-h-[20px] text-left text-sm ${fieldError ? "text-red-300" : "text-slate-200"
            }`}
        >
          {fieldError ?? "認証コード"}
        </label>
        <input
          id="verificationCode"
          type="text"
          value={verificationCode}
          onChange={(e) => onCodeChange(removeVerificationCodeSpaces(e.target.value))}
          placeholder="認証コードを入力"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="border border-slate-400 bg-[#0d1b3e]/80 px-4 py-2 text-lg text-white outline-none placeholder:text-slate-400 focus:border-slate-100"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isResending || Boolean(successMessage)}
        className="mt-1 border border-slate-400 bg-[#0d1b3e]/60 py-2 text-lg font-bold tracking-[0.03em] text-white hover:border-yellow-200 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {successMessage
          ? "ログイン画面へ移動中..."
          : isSubmitting
            ? "認証中..."
            : "認証する"}
      </button>

      {onResend && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onResend}
            disabled={isSubmitting || isResending || resendCooldown > 0 || Boolean(successMessage)}
            className="text-sm text-slate-300 underline-offset-2 hover:text-sky-400 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendCooldown > 0
              ? `再送信まで ${resendCooldown} 秒`
              : isResending
                ? "再送信中..."
                : "認証コードを再送信する"}
          </button>
          <p className={`min-h-[20px] text-sm ${resendSuccess ? "text-emerald-300" : "text-transparent"
            }`}>
            {resendSuccess ? "認証コードを再送信しました" : "\u00A0"}
          </p>
        </div>
      )}
    </form>
  );
}

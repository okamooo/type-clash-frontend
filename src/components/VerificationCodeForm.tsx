"use client";

type VerificationCodeFormProps = {
  verificationCode: string;
  onCodeChange: (code: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onResend?: () => void;
  isSubmitting?: boolean;
  error?: string;
  fieldError?: string;
  description?: string;
  variant?: "register" | "settings";
};

export default function VerificationCodeForm({
  verificationCode,
  onCodeChange,
  onSubmit,
  onResend,
  isSubmitting = false,
  error,
  fieldError,
  description = "メールアドレスに送信された認証コードを入力してください。",
  variant = "register",
}: VerificationCodeFormProps) {
  if (variant === "register") {
    return (
      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-6 flex w-full max-w-sm flex-col gap-5"
      >
        <p
          role={error ? "alert" : undefined}
          className={`whitespace-nowrap text-left text-sm ${
            error ? "text-red-400" : "text-slate-300"
          }`}
        >
          {error ?? description}
        </p>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="verificationCode"
            role={fieldError ? "alert" : undefined}
            className={`min-h-[20px] text-left text-sm ${
              fieldError ? "text-red-300" : "text-slate-200"
            }`}
          >
            {fieldError ?? "認証コード"}
          </label>
          <input
            id="verificationCode"
            type="text"
            value={verificationCode}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="認証コードを入力"
            className="border border-slate-400 bg-[#0d1b3e]/80 px-4 py-2 text-lg text-white outline-none placeholder:text-slate-400 focus:border-slate-100"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 border border-slate-400 bg-[#0d1b3e]/60 py-2 text-lg font-bold tracking-[0.03em] text-white hover:border-yellow-200 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "読み込み中..." : "認証する"}
        </button>

        {onResend && (
          <button
            type="button"
            onClick={onResend}
            disabled={isSubmitting}
            className="text-sm text-slate-300 underline-offset-2 hover:text-sky-400 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            認証コードを再送信する
          </button>
        )}
      </form>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mt-8 flex w-full max-w-md flex-col gap-5 text-left"
    >
      <p className="text-sm text-slate-300">{description}</p>

      <label className="flex flex-col gap-2">
        <span className="text-yellow-200">認証コード</span>
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => onCodeChange(e.target.value)}
          className="border-2 border-white bg-[#050816] px-4 py-3 text-white outline-none focus:border-yellow-200"
          placeholder="認証コードを入力"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start border-2 border-white px-4 py-2 transition-colors hover:border-yellow-200 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ▶ 認証する
      </button>

      {error && <p className="text-red-300">{error}</p>}
    </form>
  );
}

export type ValidationErrors = Record<string, string | undefined>;

export function validateEmail(email: string): string | undefined {
  if (!email) {
    return "メールアドレスを入力してください";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "メールアドレスの形式が正しくありません";
  }

  return undefined;
}

export function validateConfirmEmail(
  email: string,
  confirmEmail: string,
): string | undefined {
  const confirmEmailError = validateEmail(confirmEmail);
  if (confirmEmailError) {
    return confirmEmailError;
  }

  if (email !== confirmEmail) {
    return "メールアドレスが一致していません";
  }

  return undefined;
}

export function validatePassword(
  password: string,
  emptyMessage = "パスワードを入力してください",
): string | undefined {
  if (!password) {
    return emptyMessage;
  }

  if (password.length < 8 || password.length > 127) {
    return "パスワードは8文字以上、127文字以内で入力してください";
  }

  return undefined;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (!confirmPassword) {
    return "確認用パスワードを入力してください";
  }

  if (password !== confirmPassword) {
    return "パスワードが一致しません";
  }

  return undefined;
}

export function validateVerificationCode(code: string): string | undefined {
  if (!code.trim()) {
    return "認証コードを入力してください";
  }

  return undefined;
}

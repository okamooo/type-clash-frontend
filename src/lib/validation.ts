export type ValidationErrors = Record<string, string | undefined>;

const USER_NAME_SPACE_PATTERN = /\s/;
const USER_NAME_SPACES_PATTERN = /\s/g;
const PASSWORD_SPACE_PATTERN = /\s/;
const PASSWORD_SPACES_PATTERN = /\s/g;
const VERIFICATION_CODE_SPACE_PATTERN = /\s/;
const VERIFICATION_CODE_SPACES_PATTERN = /\s/g;

export function removeUserNameSpaces(name: string): string {
  return name.replace(USER_NAME_SPACES_PATTERN, "");
}

export function validateUserName(name: string): string | undefined {
  if (!name) {
    return "ユーザー名を入力してください";
  }

  if (USER_NAME_SPACE_PATTERN.test(name)) {
    return "ユーザー名にスペースは使用できません";
  }

  if (name.length > 50) {
    return "ユーザー名は50文字以内で入力してください";
  }

  return undefined;
}

export function removePasswordSpaces(password: string): string {
  return password.replace(PASSWORD_SPACES_PATTERN, "");
}

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

  return undefined;
}

export function validateNewPassword(
  password: string,
  emptyMessage = "パスワードを入力してください",
): string | undefined {
  const passwordError = validatePassword(password, emptyMessage);
  if (passwordError) {
    return passwordError;
  }

  if (PASSWORD_SPACE_PATTERN.test(password)) {
    return "パスワードにスペースは使用できません";
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

export function validateCurrentPassword(password: string): string | undefined {
  if (!password) {
    return "現在のパスワードを入力してください";
  }

  if (password.length > 127) {
    return "現在のパスワードは127文字以内で入力してください";
  }

  return undefined;
}

export function removeVerificationCodeSpaces(code: string): string {
  return code.replace(VERIFICATION_CODE_SPACES_PATTERN, "");
}

export function validateVerificationCode(code: string): string | undefined {
  if (!code) {
    return "認証コードを入力してください";
  }

  if (VERIFICATION_CODE_SPACE_PATTERN.test(code)) {
    return "認証コードにスペースは使用できません";
  }

  if (!/^\d+$/.test(code)) {
    return "認証コードは半角数字で入力してください";
  }

  if (code.length !== 6) {
    return "6桁の認証コードを入力してください";
  }

  return undefined;
}

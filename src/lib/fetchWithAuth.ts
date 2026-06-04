import { getApiBaseUrl } from "@/lib/apiConfig";

const AUTH_SESSION_INVALID_EVENT = "auth-session-invalid";
let isAuthSessionInvalidNotified = false;

export async function fetchWithAuth(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403 || res.status === 503) {
    if (typeof window !== "undefined" && !isAuthSessionInvalidNotified) {
      isAuthSessionInvalidNotified = true;
      window.dispatchEvent(new Event(AUTH_SESSION_INVALID_EVENT));
    }

    throw new Error("Authentication session is invalid");
  }

  return res;
}

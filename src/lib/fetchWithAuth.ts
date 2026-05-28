import { getApiBaseUrl } from "@/lib/apiConfig";

export async function fetchWithAuth(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403 || res.status === 503) {
    window.location.href = "/login?reason=expired";
    throw new Error("Redirecting to login");
  }

  return res;
}

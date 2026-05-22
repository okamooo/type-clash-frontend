// const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const API_BASE = "http://localhost:8080";

export async function fetchWithAuth(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403) {
    window.location.href = "/login?reason=expired";
    throw new Error("Redirecting to login");
  }

  return res;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

export function getToken() {
  return localStorage.getItem("acai_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("acai_token", token);
  else localStorage.removeItem("acai_token");
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: "Erro na requisição" }));
    throw new Error(data.message || "Erro na requisição");
  }

  return response.json();
}

export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

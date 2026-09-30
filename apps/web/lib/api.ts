const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export type Run = {
  id: string;
  hypothesis: string;
  status: string;
  stage: string;
  stages?: { key: string; label: string; status: string }[];
  started_at: string;
  completed_at?: string | null;
  runtime?: number | null;
  results?: any;
  ai_analysis?: string | null;
  strategy_spec?: any;
  validation?: any;
  error?: string | null;
  engine_version?: string | null;
  dataset_versions?: any[];
  data_period?: string | null;
  data_sources?: string[];
};

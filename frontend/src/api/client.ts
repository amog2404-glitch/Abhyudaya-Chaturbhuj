// Thin API client. All calls go to EXPO_PUBLIC_BACKEND_URL + /api.
import { Platform } from "react-native";

import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
export const TOKEN_KEY = "abhyudaya_token";

export function fileUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/api/")) return `${BASE}${path}`;
  return `${BASE}/api/files/${path}`;
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await storage.secureGet<string>(TOKEN_KEY, "");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T = any>(
  path: string,
  opts: { method?: string; body?: any; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) Object.assign(headers, await authHeader());

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = (data && data.detail) || "Something went wrong. Please try again.";
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  return data as T;
}

export async function uploadImage(uri: string, name = "photo.jpg", type = "image/jpeg") {
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    // @ts-expect-error native FormData file shape
    form.append("file", { uri, name, type });
  }
  const headers = await authHeader();
  const res = await fetch(`${BASE}/api/upload`, { method: "POST", headers, body: form });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.detail) || "Image upload failed.");
  return data as { path: string; url: string };
}

export const api = {
  get: <T = any>(path: string, auth = true) => request<T>(path, { auth }),
  post: <T = any>(path: string, body?: any, auth = true) => request<T>(path, { method: "POST", body, auth }),
  patch: <T = any>(path: string, body?: any) => request<T>(path, { method: "PATCH", body }),
};

export type Issue = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  latitude: number;
  longitude: number;
  location_name: string;
  image_url?: string | null;
  status: string;
  upvote_count: number;
  has_upvoted: boolean;
  funding_total: number;
  funding_contributors: number;
  priority_score: number;
  priority_label: string;
  strong_community_interest: boolean;
  is_recurring: boolean;
  distance_km?: number;
  ai_category: string;
  ai_severity: string;
  ai_summary: string;
  ai_suggested_solution: string;
  ai_confidence: number;
  created_at: string;
  updated_at: string;
  reporter_name?: string;
};

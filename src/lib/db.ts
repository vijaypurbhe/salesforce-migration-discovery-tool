import { supabase } from "@/integrations/supabase/client";
// The generated types include every table, but many rows carry typed JSON payloads; a loosely typed handle keeps call sites readable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
}

export const nowStamp = () => new Date().toISOString();
export const shortId = () => Math.random().toString(36).slice(2, 10);

export async function sha256Hex(input: ArrayBuffer | string): Promise<string> {
  const buf = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

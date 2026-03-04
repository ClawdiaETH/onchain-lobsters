/**
 * Minimal Upstash KV client using direct REST API calls.
 * Replaces @vercel/kv which has proven unreliable in this deployment.
 */

const KV_URL   = process.env.KV_REST_API_URL!;
const KV_TOKEN = process.env.KV_REST_API_TOKEN!;

function headers() {
  return { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" };
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`kvGet ${key} → ${res.status}`);
  const { result } = await res.json();
  if (result === null || result === undefined) return null;
  try { return JSON.parse(result) as T; } catch { return result as T; }
}

export async function kvSet(key: string, value: unknown, exSeconds: number): Promise<void> {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  const res = await fetch(KV_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(["SET", key, serialized, "EX", String(exSeconds)]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`kvSet ${key} → ${res.status}`);
}

/**
 * Minimal Upstash KV client using Node.js https (not fetch).
 * fetch() in Next.js App Router is automatically cached even with cache:'no-store'
 * in some Vercel deployment configurations. https.request bypasses that entirely.
 */
import https from "https";

function getEnv() {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("KV_REST_API_URL / KV_REST_API_TOKEN missing");
  return { url: new URL(url), token };
}

function httpsRequest(opts: https.RequestOptions & { body?: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end",  () => resolve(data));
    });
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const { url, token } = getEnv();
  const raw = await httpsRequest({
    hostname: url.hostname,
    path:     `/get/${key}`,
    method:   "GET",
    headers:  { Authorization: `Bearer ${token}` },
  });
  const { result } = JSON.parse(raw);
  if (result === null || result === undefined) return null;
  try { return JSON.parse(result) as T; } catch { return result as T; }
}

export async function kvSet(key: string, value: unknown, exSeconds: number): Promise<void> {
  const { url, token } = getEnv();
  const body = JSON.stringify(["SET", key, typeof value === "string" ? value : JSON.stringify(value), "EX", String(exSeconds)]);
  await httpsRequest({
    hostname: url.hostname,
    path:     "/",
    method:   "POST",
    headers:  {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
    body,
  });
}

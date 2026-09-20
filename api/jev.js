// mtg_cue — Jev（TypeSafe AI System One）中継関数 ver1.0
// ブラウザから api.typesafe.ai を直接呼ぶとCORSで拒否されるため、同一オリジンのここを経由する。
// APIキーは環境変数 TYPESAFE_API_KEY を優先し、無ければリクエストヘッダ x-ts-key を使う。
export default async function handler(req, res) {
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }

  const key = process.env.TYPESAFE_API_KEY || req.headers["x-ts-key"];
  if (!key) { res.status(400).json({ error: "no api key" }); return; }

  const base = (req.headers["x-ts-base"] || "https://api.typesafe.ai").toString().replace(/\/+$/, "");
  const url = base + "/v1/systemone";

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  const t0 = Date.now();
  try {
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    const r = await fetch(url, {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body,
      signal: ctl.signal,
    });
    const text = await r.text();
    res.setHeader("x-ts-ms", String(Date.now() - t0));
    res.status(r.status).setHeader("Content-Type", "application/json").send(text);
  } catch (e) {
    res.status(504).json({ error: String(e && e.message || e) });
  } finally {
    clearTimeout(timer);
  }
}

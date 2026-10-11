import "server-only";
import { NextResponse } from "next/server";

// Herkese açık demo için koruma: IP başına istek sınırı, genel saatlik tavan ve istek boyutu sınırı.
// Bellekte tutulur (tek sunucu örneği için yeterli). Sınırlar ortam değişkenleriyle değiştirilebilir.

const num = (v: string | undefined, d: number) => (v && Number.isFinite(+v) && +v > 0 ? +v : d);
const WINDOW_MS = 10 * 60_000;
const LIMITS = {
  llm: num(process.env.RATE_LIMIT_LLM, 30), // IP başına 10 dakikada yapay zekâ isteği
  github: num(process.env.RATE_LIMIT_GITHUB, 10), // IP başına 10 dakikada repo indirme
};
const GLOBAL_LLM_PER_HOUR = num(process.env.RATE_LIMIT_LLM_GLOBAL, 600); // tüm ziyaretçiler, saatte

type Bucket = keyof typeof LIMITS;
const hits = new Map<string, number[]>();
let global: number[] = [];

function ipOf(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") ?? "yerel").trim();
}

/** Sınır aşıldıysa 429 yanıtı döndürür, aşılmadıysa null. */
export function rateLimit(req: Request, bucket: Bucket): NextResponse | null {
  const now = Date.now();
  if (hits.size > 10_000) for (const [k, v] of hits) if (v[v.length - 1] < now - WINDOW_MS) hits.delete(k);

  const key = `${bucket}:${ipOf(req)}`;
  const recent = (hits.get(key) ?? []).filter((t) => t > now - WINDOW_MS);
  if (recent.length >= LIMITS[bucket]) {
    const wait = Math.ceil((recent[0] + WINDOW_MS - now) / 60_000);
    return NextResponse.json({ error: `Çok fazla istek. Lütfen ${wait} dakika sonra tekrar dene.` }, { status: 429 });
  }
  if (bucket === "llm") {
    global = global.filter((t) => t > now - 3_600_000);
    if (global.length >= GLOBAL_LLM_PER_HOUR) {
      return NextResponse.json({ error: "Demo şu an yoğun. Biraz sonra tekrar dene ya da projeyi kendi anahtarınla yerelde çalıştır." }, { status: 429 });
    }
    global.push(now);
  }
  recent.push(now);
  hits.set(key, recent);
  return null;
}

/** Gövdeyi boyut sınırıyla okur; aşılırsa 413 yanıtı döndürür. */
export async function readJson<T>(req: Request, maxBytes: number): Promise<{ body: T } | { error: NextResponse }> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  const tooBig = () => ({ error: NextResponse.json({ error: "İstek çok büyük." }, { status: 413 }) });
  if (declared > maxBytes) return tooBig();
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) return tooBig();
  try {
    return { body: JSON.parse(text) as T };
  } catch {
    return { error: NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }) };
  }
}

export const MAX_QUESTION = 500;

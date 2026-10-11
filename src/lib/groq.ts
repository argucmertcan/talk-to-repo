import "server-only";

const URL = "https://api.groq.com/openai/v1/chat/completions";
export const MODEL = "openai/gpt-oss-120b";

type Msg = { role: "system" | "user" | "assistant"; content: string };

/** Önceki konuşmayı düz metin bağlam olarak verir.
 *  Geçmişteki cevaplar "assistant" mesajı olarak gidince model o düz metin kalıbını taklit edip JSON yerine düz cevap yazıyordu (json_validate_failed). */
export function historyNote(history: { role: "user" | "assistant"; content: string }[] = [], n = 4) {
  const h = history.slice(-n);
  if (!h.length) return "";
  return `ÖNCEKİ KONUŞMA (sadece bağlam):\n${h.map((t) => `${t.role === "user" ? "Kullanıcı" : "Asistan"}: ${t.content.slice(0, 600)}`).join("\n")}\n\n`;
}

/** Groq'a JSON şemalı istek atar; parse edilmiş nesneyi ve süreyi döndürür. */
export async function groqJson<T>(messages: Msg[], schemaName: string, schema: object, attempt = 1): Promise<{ data: T; ms: number }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY tanımlı değil (.env.local)");
  const t0 = Date.now();
  const res = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
      reasoning_effort: "low",
      response_format: { type: "json_schema", json_schema: { name: schemaName, schema, strict: true } },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    // Model bazen şemaya uymayan düz metin üretiyor (400 json_validate_failed); bir kez daha dene
    if (res.status === 400 && body.includes("json_validate_failed") && attempt < 3) {
      const retry = await groqJson<T>(messages, schemaName, schema, attempt + 1);
      return { data: retry.data, ms: Date.now() - t0 };
    }
    throw new Error(`Groq ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return { data: JSON.parse(json.choices[0].message.content) as T, ms: Date.now() - t0 };
}

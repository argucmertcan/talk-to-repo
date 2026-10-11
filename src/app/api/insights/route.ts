import { NextResponse } from "next/server";
import { groqJson } from "@/lib/groq";
import type { Finding } from "@/lib/analyze";

export interface InsightCard { id: string; title: string; detail: string; question: string }

const schema = {
  type: "object", additionalProperties: false, required: ["summary", "cards"],
  properties: {
    summary: { type: "string" },
    cards: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["id", "title", "detail", "question"],
        properties: { id: { type: "string" }, title: { type: "string" }, detail: { type: "string" }, question: { type: "string" } },
      },
    },
  },
};

const SYSTEM = `Sen kıdemli bir yazılım mimarısın. Sana bir kod deposunun özeti ve statik analizin bulduğu BULGULAR verilecek.
Her bulgu için Türkçe bir içgörü kartı yaz:
- id: bulgunun id'si (aynen)
- title: en fazla 5 kelime, net ("Admin verisi şifresiz açık" gibi)
- detail: 1-2 cümle; neden önemli, somut risk. SADECE bulgudaki dosya adları ve sayıları kullan, uydurma.
- question: bu konuyu derinleştirmek için kullanıcının sorabileceği kısa bir soru ("/admin/export'u kim çağırıyor?")
Önem sırasını koru (high → info). summary: repoyu tek cümlede anlat (ne yapıyor, kaç dosya).`;

export async function POST(req: Request) {
  const { repo, stats, findings, files } = (await req.json()) as { repo: string; stats: object; findings: Finding[]; files: string[] };
  try {
    const { data, ms } = await groqJson<{ summary: string; cards: InsightCard[] }>(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify({ repo, stats, dosyalar: files.slice(0, 120), bulgular: findings.map((f) => ({ id: f.id, onem: f.severity, olgu: f.fact })) }) },
      ],
      "insights",
      schema,
    );
    return NextResponse.json({ ...data, ms });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

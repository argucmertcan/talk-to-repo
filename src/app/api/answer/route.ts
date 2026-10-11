import { NextResponse } from "next/server";
import { groqJson, historyNote } from "@/lib/groq";

const schema = {
  type: "object", additionalProperties: false, required: ["answer", "citations"],
  properties: {
    answer: { type: "string" },
    citations: { type: "array", items: { type: "object", additionalProperties: false, required: ["path", "start", "end"],
      properties: { path: { type: "string" }, start: { type: "integer" }, end: { type: "integer" } } } },
  },
};

const SYSTEM = `Sana bir soru ve kod deposundan getirilmiş KOD PARÇALARI (satır numaralı) verilecek.
Soruyu SADECE bu parçalara dayanarak Türkçe cevapla. Parçalarda olmayan bir şeyi iddia etme; emin değilsen söyle.
- answer: 3-6 kısa cümle ya da numaralı adımlar. Her iddianın sonuna kaynağını [dosya:satır] biçiminde ekle (ör. [src/services/token.service.ts:7-14]).
- citations: answer'da andığın her kaynak; path parçadaki dosya yolu, start/end parçadaki satır numaraları içinde olmalı.
Güvenlik açığı görürsen (yetki kontrolü yok, sabit anahtar vb.) açıkça belirt.`;

export async function POST(req: Request) {
  const { question, snippets, history } = (await req.json()) as {
    question: string; snippets: { dosya: string; satirlar: string; kod: string }[]; history?: { role: "user" | "assistant"; content: string }[];
  };
  try {
    const { data, ms } = await groqJson<{ answer: string; citations: { path: string; start: number; end: number }[] }>(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: `${historyNote(history)}SORU: ${question}\n\nKOD PARÇALARI:\n${snippets.map((s) => `### ${s.dosya} (${s.satirlar})\n${s.kod}`).join("\n\n")}` },
      ],
      "answer",
      schema,
    );
    return NextResponse.json({ ...data, ms });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { groqJson, historyNote } from "@/lib/groq";

const str = { type: "string" };
const schema = {
  type: "object", additionalProperties: false, required: ["reply", "kind", "focus", "path", "read"],
  properties: {
    reply: str,
    kind: { type: "string", enum: ["flow", "locate", "explain", "chat"] },
    focus: { type: "array", items: str },
    path: { type: "array", items: str },
    read: { type: "array", items: { type: "object", additionalProperties: false, required: ["path", "symbol"], properties: { path: str, symbol: { type: ["string", "null"] } } } },
  },
};

const SYSTEM = `Sen "Talk to Repo" uygulamasının beynisin. Bir kod deposu hakkında Türkçe soruları cevaplamak için PLAN yaparsın.
Kodu GÖRMÜYORSUN; sadece İNDEKSİ görüyorsun: her dosyanın yolu, satır sayısı, export'ları, route'ları (köşeli parantezde middleware'ler) ve import ettiği dosyalar.
Plan alanları:
- kind: flow (bir istek/işlem birden çok dosyadan nasıl akıyor), locate (bir şey nerede), explain (bir dosya/özellik ne yapıyor), chat (kod gerektirmeyen sohbet).
- path: flow ise isteğin geçtiği dosyalar, GİRİŞTEN BAŞLAYARAK SIRAYLA (route → controller → service → ... → model). Diğerlerinde boş.
- focus: haritada vurgulanacak dosyalar (en fazla 8).
- read: cevabı yazmak için okunacak parçalar (en fazla 6). symbol olarak indeksteki export adını ver (ör. "requestPasswordReset"); bilmiyorsan null.
- reply: ne yapacağını anlatan tek kısa cümle ("Şifre sıfırlama akışını route'tan veritabanına kadar izliyorum.").
Yolları indeksteki gibi BİREBİR yaz. Import zincirini kullanarak akışı çıkar. Mesaj "HATA:" ile başlıyorsa önceki planın geçersizdi; düzelt.`;

export async function POST(req: Request) {
  const { question, context, history } = (await req.json()) as {
    question: string; context: object; history?: { role: "user" | "assistant"; content: string }[];
  };
  try {
    const { data, ms } = await groqJson<object>(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: `İNDEKS:\n${JSON.stringify(context)}` },
        { role: "user", content: `${historyNote(history, 6)}SORU: ${question}` },
      ],
      "plan",
      schema,
    );
    return NextResponse.json({ plan: data, ms });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

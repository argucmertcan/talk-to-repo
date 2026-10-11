import { NextResponse } from "next/server";
import { groqJson } from "@/lib/groq";

const schema = {
  type: "object", additionalProperties: false, required: ["claudeMd", "architectureMd"],
  properties: { claudeMd: { type: "string" }, architectureMd: { type: "string" } },
};

const SYSTEM = `Sen kıdemli bir yazılım mimarısın. Bir kod deposunun İNDEKSİ ve statik analiz OLGULARI verilecek. İki Markdown belgesi yaz (Türkçe):

1) claudeMd — Claude Code'un bu repoda çalışırken her oturumda okuyacağı CLAUDE.md:
   # <repo adı> başlığı; ## Proje (2-3 cümle ne yapıyor); ## Yapı (klasörler ve sorumlulukları, madde madde);
   ## Komutlar (SADECE olgular.paketler içindeki scripts; orada olmayan komutu ASLA yazma); ## Kurallar (bu koda özgü, somut: route ekleme deseni, middleware kullanımı, model erişimi);
   ## Dikkat (analizdeki kritik/orta bulgular → "yapma / önce şunu düzelt" diliyle, dosya:satır ile).
2) architectureMd — ARCHITECTURE.md: ## Genel bakış; ## Katmanlar; ## İstek akışı (bir örnek akışı adım adım); ## Route tablosu (markdown tablo);
   ## Bilinen riskler. Diyagram yerine tam olarak şu satırı bırak: {{DIAGRAM}}

Kurallar: SADECE verilen olgulara dayan. Kütüphane adı yazacaksan olgular.paketler.bagimliliklar listesinde olmalı (ör. doğrulama kütüphanesi listede ne ise o).
Olmayan teknoloji, komut ya da dosya uydurma; emin değilsen yazma. Kısa ve kullanışlı yaz.`;

export async function POST(req: Request) {
  const { context, facts } = (await req.json()) as { context: object; facts: object };
  try {
    const { data, ms } = await groqJson<{ claudeMd: string; architectureMd: string }>(
      [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify({ indeks: context, olgular: facts }) }],
      "docs",
      schema,
    );
    return NextResponse.json({ ...data, ms });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

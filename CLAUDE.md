# Talk to Repo

Kullanıcı bir kod deposu yükler (GitHub URL'si ya da zip). Uygulama canlı bir mimari harita çizer, otomatik analiz yapar,
kullanıcı Türkçe soru sordukça ilgili dosyalar haritada yanar ve cevap `dosya:satır` alıntılı gelir. İstenirse repo için CLAUDE.md üretir.

## Mimari ilke
- Yapay zekâ (Groq) **bütün kodu görmez.** Kod indeksini (dosya yolları, import'lar, export'lar, route'lar, satır sayıları) motor çıkarır.
- Soru gelince yapay zekâ indeks üzerinden bir **plan** (JSON) yazar: hangi dosyalar vurgulanacak, hangi sırayla, hangi semboller okunacak.
- Motor o parçaları getirir; ikinci adımda cevap yalnızca bu parçalara dayanarak `dosya:satır` alıntılı yazılır.
- Sayıları (satır, import, döngü, bulgu) her zaman kod hesaplar; yapay zekâ yorumlar.

## Teknoloji
- Next.js (App Router) + TypeScript + Tailwind; repo tarayıcıda işlenir (JSZip)
- Harita: d3-force ile yerleşim, SVG ile çizim
- Groq API (`openai/gpt-oss-120b`), anahtar yalnızca sunucuda: `GROQ_API_KEY`

## Kurallar
- Arayüz dili Türkçe.
- API anahtarı istemciye gitmez, loglanmaz.
- Demo repo: `demo/kargo-api` (üretici `demo/generate_kargo_api.py`, zip'i `public/demo/kargo-api.zip`).

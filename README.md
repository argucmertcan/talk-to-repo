# Talk to Repo

Bir kod deposunu yükle (public GitHub adresi ya da zip). Uygulama mimari haritasını çizer, güvenlik ve bakım sorunlarını işaretler;
Türkçe sorduğunda ilgili dosyalar haritada yanar ve cevap `dosya:satır` alıntılı gelir. İstersen o repo için **CLAUDE.md** ve **ARCHITECTURE.md** üretir.

Claude Code ile yapıldı. Nasıl yapıldığını (promptlar, aşamalar, gerçek hatalar) anlatan video: `<YOUTUBE_URL>`

## Neler yapıyor
- **Repo haritası:** her daire bir dosya (boyutu satır sayısı), çizgiler import'lar; klasörler kümelenir.
- **Otomatik analiz:** korumasız route, koda gömülü anahtar, döngüsel bağımlılık, ölü dosya, aşırı büyük dosya, döngü içinde veritabanı sorgusu (N+1).
- **Sohbet:** "Şifre sıfırlama nasıl çalışıyor?" → istek yolu haritada numaralı çizilir, cevaptaki her iddia tıklanabilir `dosya:satır` alıntısıdır.
- **Doküman üretimi:** CLAUDE.md + ARCHITECTURE.md (Mermaid diyagramı koddan üretilir), indirilebilir.

## Mimari ilke
Yapay zekâ **bütün kodu görmez.**
1. Motor (TypeScript) repoyu tarayıp bir indeks çıkarır: dosya yolları, satır sayıları, export/import'lar, route'lar ve middleware'leri. Bulguları da kod bulur.
2. Soru gelince yapay zekâ (Groq, `openai/gpt-oss-120b`) bu indeksten bir **JSON plan** yazar: hangi dosyalar, hangi sırayla, hangi semboller okunacak.
3. Motor planı doğrular (olmayan dosya → planı yeniden ister), parçaları getirir (en fazla 70 satır).
4. Cevap yalnızca bu parçalara dayanarak yazılır; alıntıları kod doğrular.

## Yerelde çalıştır
```bash
npm install
cp .env.example .env.local   # GROQ_API_KEY değerini gir (https://console.groq.com)
npm run dev
```
Açılış ekranında **"Örnek repoyla dene"** kurgusal bir kargo API'sini (81 dosya, bilerek gömülmüş 6 sorun) yükler.
İçindeki "anahtar" sahte bir desendir.

## Yayına alma (Railway vb.)
- Node 20+, build `npm run build`, start `npm start` (Next.js `PORT` değişkenini kendisi okur).
- Ortam değişkeni: `GROQ_API_KEY`. Anahtar yalnızca sunucuda kullanılır, istemciye gitmez.
- Repo tarayıcıda işlenir; sunucu sadece GitHub zip'ini aktarır ve Groq çağrılarını yapar.

## Sınırlar
- Sadece **public** GitHub repoları (`main` ya da `master` dalı). En fazla 2.000 dosya, dosya başına 400 KB.
- Import/route çıkarımı düz regex ile yapılır (JS/TS ağırlıklı); her dilde ve her framework'te kusursuz değildir.

## Git etiketleri: aşama aşama
| Etiket | Aşama |
|---|---|
| `asama-0` | Proje kuralları (CLAUDE.md) + hikâyeli demo repo üreticisi |
| `asama-1-hata` → `asama-1` | İskelet · hata: satır sayısı bir fazla çıkıyordu |
| `asama-2` | Import grafiği ve canlı harita |
| `asama-3` | Statik analiz + içgörü kartları |
| `asama-4-hata` → `asama-4-motor` → `asama-4` | Soru → plan → parçalar → alıntılı cevap · hata: Groq json_validate_failed |
| `asama-5` | Canlı his: animasyonlar, kamera odağı, istek yolu |
| `asama-6-hata` → `asama-6` | CLAUDE.md üretimi · hata: uydurma komut/kütüphane |
| `final-hata` → `final` | Gerçek repoda yanlış alarm düzeltmesi · hata: ikinci soruda JSON hatası (konuşma geçmişi) |

```bash
git checkout asama-6-hata   # uydurma CLAUDE.md'yi kendin gör
```

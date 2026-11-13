# Proje Durumu — ZekAI Hub

**Son güncelleme:** 5 Kasım 2026

## Depo

- GitHub: `https://github.com/mtahiryilmazz/ZekAI-Hub` (branch `main`)
- Çalışma dizini: `D:\mtahiryilmazz\Github\ZekAI-Hub`
- Sunucu: `python tools/swarm_sim.py serve --port 8787` → `http://127.0.0.1:8787/`

## Sağlayıcı (yerel, `~/.zekai/config.json`)

- Sağlayıcı: `google` · model: `gemini-3.5-flash`
- Base URL: **boş** (preset kullanılır); yanlış `https://googleapis.com` değeri sunucuda normalize edilir
- API anahtarı: maskeli `••••lqSQ` (dosyada düz metin — üretimde vault gerekir)
- Doğrulama: `/api/test` → `Pong! 🏓`
- Günlük tavan: `daily_cap_usd = 0` (sınırsız); kullanım `~/.zekai/usage.json`

## Uygulanan özellikler

| Alan | Durum |
|---|---|
| Panel / Görevler / Saha 2.5D / Ofis 3D / Liste | Çalışıyor |
| Açık-koyu tema (`T`), 3D gündüz/gece | Çalışıyor |
| Sağlayıcı kataloğu + model listesi + özel model | Çalışıyor |
| Görev verme (alt panel), plan + T1/T2/T3 | Çalışıyor |
| Görev geçmişi ve sonuç | Çalışıyor |
| Ajan detay popup'ı (token/harcama/aşama) | Çalışıyor |
| Klasör akışı (Denetçi → ajanlar) | Çalışıyor |
| Paylaşılan skill (sürümlü, `/api/skills`) | Çalışıyor |
| Günlük harcama tavanı (sunucu tarafı) | Çalışıyor |
| Mock sağlayıcı (anahtarsız) | Çalışıyor |
| İş planı önce, üretim onaydan sonra | Çalışıyor |
| Adım bazlı klasör rengi (ajan kendi rengi) | Çalışıyor |

## Bilinen sınırlar

- Demo olayları **maliyet/token sayacına yazılmaz**; gerçek sayaç yalnız `/api/chat` yanıtından gelir.
- Maliyet yalnız fiyat tablosundaki modellerde hesaplanır; Gemini 3.5 Flash tabloda yok → `$0.0000`.
- Tek model çağrısı; çoklu ajan çağrıları (debate/council) yok.
- İş planı sezgisel üretilir (0 çağrı); adım süreleri sabit temsildir, gerçek iş süresi değil.
- Onay akışı: plan → kullanıcı onayı → sıralı adımlar → tek üretim çağrısı. Reddedilen planda hiç üretim yapılmaz.
- Araç yok: model repoyu okuyamaz/web'e bakamaz.
- 3D ilk açılış 3-4 sn (PMREM + shader); WebGL yoksa “Saha görünümü” yedeği.
- Dış entegrasyon (Slack/GitHub/Linear) yok; OAuth taklit edilmedi.

## Sıradaki adımlar

1. Ajan hafızası: doğrulanmış sonuçlardan özet + geri çağırma (provenance ile).
2. Skill'i görev planına bağlama: planlayıcı skill'i adımlara çevirsin.
3. Yerel repo aracı (salt okunur dosya listesi/özet) — mock'a düşmeden gerçek yanıt.
4. 2.5D için açık tema paleti.

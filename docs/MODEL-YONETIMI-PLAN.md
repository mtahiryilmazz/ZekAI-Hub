# Model Yönetimi — Bugünkü Durum ve Plan

**Tarih:** 12 Kasım 2026 · **Dayanak:** [audit-server.md](audit-server.md) (25 KB, satır kanıtlı), [audit-ui.md](audit-ui.md) (34 KB, satır kanıtlı)

## Kısa cevap

| Soru | Cevap |
|---|---|
| Ayarlar paneli var mı? | **Var** — "Bağlantı ayarları": sağlayıcı (21), model, base URL, API anahtarı, T1/T2/T3, günlük limit, model getir, test, kaydet, anahtar sil |
| Alt ajanlarda model nasıl seçiliyor? | **Ajan başına model YOK.** 6 ajan 3 sabit katmana bağlı; `tiers` boş olduğu için hepsi aynı modeli çağırıyor |
| Offline (Ollama / LM Studio) | Katalogda **var**, ama **anahtar zorunlu** → anahtarsız çalışmıyor |
| Online model + API key | Tek sağlayıcı + tek anahtar, `~/.zekai/config.json` içinde **düz metin** |
| Yönetim (çoklu sağlayıcı, silme, kullanım) | **Yok** — sağlayıcı CRUD yok, maliyet kırılımı yok, kimlik/rol yok |

## Bugün nasıl çalışıyor (zincir)

```
istem → planTask() (anahtar kelime) → 3 adım
      → her adım: agent.started (görsel)
      → TEK gerçek çağrı: son adımın ajanı + tier
      → POST /api/chat { messages, tier, agent }   ← sunucu "agent" alanını OKUMUYOR
      → call_model(): tiers[tier] ?? cfg.model
```

| Ajan | Katman | Bugünkü model |
|---|---|---|
| Denetçi | T2 | gemini-3.5-flash |
| Planlayıcı | T3 | gemini-3.5-flash |
| Araştırmacı | T1 | gemini-3.5-flash |
| Analist | T2 | gemini-3.5-flash |
| Uygulayıcı | T2 | gemini-3.5-flash |
| Gözden Geçiren | T1 | gemini-3.5-flash |

`config.json` içinde `tiers = {}` → üç katman da global modele düşüyor. Katmanlar arasındaki tek gerçek fark `max_tokens` (450/700/950).

## Kanıtlanmış kusurlar (P0)

| # | Kusur | Kanıt |
|---|---|---|
| 1 | **"Anahtarı sil" çalışmıyor**: `clear_key` yalnız `api_key` alanı da gönderilirse işleniyor | `swarm_sim.py:690-695`; geçici profilde test: silme sonrası `has_key=true` |
| 2 | **Offline sağlayıcı anahtar istiyor**: `if not key: raise` sağlayıcı çözümlemesinden önce | `swarm_sim.py:451-453`; `provider=ollama` → "API anahtarı yok" |
| 3 | **Günlük tavan fiilen tetiklenmiyor**: fiyat tablosu 4 model, Gemini yok → maliyet `0` | `swarm_sim.py:268-273, 417-419`; `today_cost=0.0` |
| 4 | **`/api/test` bütçe dışı**: `add_usage` yok, tavan kontrolü yok | `swarm_sim.py:764-771` vs `817` |
| 5 | **Anahtar düz metin**, Windows'ta `chmod 0o600` no-op | `swarm_sim.py:334-340`; ACL ölçümü: `Authenticated Users Modify` |
| 6 | **Test yanlış modeli doğrular**: her zaman T1'i çağırır, kullanıcının yazdığı modeli değil | `swarm_sim.py:764-771` |
| 7 | **"Aktif model" göstergesi sabit** "T2 · Sonnet 5.5" | `index.html:533` |
| 8 | **Önbellek anahtarı katman modelini içermiyor** → model değişince eski yanıt döner | `swarm_sim.py:800`; test: anahtar aynı kaldı |

## Plan

### P0 — güvenlik ve doğruluk (S)

1. `clear_key` bloğunu `api_key` kontrolünden ayır; onay dialogu + audit satırı.
2. Anahtar kontrolünü `if not key and not preset["local"]` yap → Ollama/LM Studio anahtarsız.
3. `PRICES` tablosunu genişlet; bilinmeyen modelde `cost = null` → tavan **fail-closed** (bilinmeyen maliyette istek reddedilir veya uyarı olayı üretilir).
4. `/api/test` → `add_usage` + tavan kontrolü + **seçili modeli** test et (`model` alanı gövdede).
5. Önbellek anahtarına çözülmüş model + `base_url` ekle; ayar değişiminde `RESP_CACHE.clear()`.

### P1 — ajan başına model ve offline (M)

6. `config.json` → `agent_models: { supervisor: "…", builder: "…" }`; `call_model(messages, tier, agent)`; ajan eşlemesi katmanı ezer.
7. `POST /api/settings` doğrulaması: bilinmeyen sağlayıcı reddedilir, `needs_base` boşsa hata, model allowlist (opsiyonel).
8. `GET /api/models/catalog` (TTL 10 dk): sağlayıcı başına model listesi + `local` bayrağı; arayüzde sağlayıcı seçimine bağlı.
9. Ajan detay popup'ına **model seçimi** + etkin modeli kartta göster.
10. Sağlayıcı kayıt defteri: `providers: { openai: {base, keyRef, model}, ollama: {...} }` + `POST/DELETE /api/providers`.

### P2 — yönetim ve maliyet (M/L)

11. Anahtar kasası: Windows DPAPI (`ProtectedData`) veya `keyring`; anahtarı URL yerine başlıkta gönder (Google `x-goog-api-key`).
12. Kullanım paneli: sağlayıcı/model/token kırılımı; bilinmeyen fiyatta "—".
13. Yerel API'yi kilitle: `Origin`/`Host` kontrolü, CORS'u `127.0.0.1:8787` ile sınırla, oturum token'ı.
14. Rol/yetki: yönetici (ayar) / izleyici (panel) ayrımı; tier politikası sunucuda.

## Kabul ölçütleri

1. `provider=ollama`, anahtar yok → `/api/test` **200** ve model yanıtı.
2. `{"clear_key": true}` → `has_key=false`; config'te `api_key` yok.
3. `builder` ajanı için model `X`, diğerleri `Y` → tek görevde çağrı logu `X` gösterir.
4. Bilinmeyen fiyatlı model + tavan `$0.10` → tavan aşıldığında 400.
5. Aynı istem, farklı `tiers.T1` → ikinci çağrı önbellekten **dönmez**.
6. `/api/test` çağrısı `usage.json`'a yazılır.

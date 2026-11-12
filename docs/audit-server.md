# Sunucu Tarafı Model Yönetimi Denetimi — ZekAI-Hub

**Tarih:** 12 Kasım 2026
**Kapsam:** `tools/swarm_sim.py` (sunucu + sağlayıcı geçidi), `installer/windows/ZekAI-Kontrol.ps1`, `docs/STATE.md`, `docs/MIMARI-UYGUNLUK-ANALIZI.md`; ajan→katman eşlemesinin istemci ayağı için `apps/ops-floor/index.html`.
**Yöntem:** Dosyalar satır satır okundu; iddialar canlı sunucu (`serve --port 8791`) ve modülü içe aktarıp geçici config ile çalıştırma yoluyla ölçüldü. Kod değiştirilmedi; yalnız bu rapor yazıldı.

---

## 1. Yönetici özeti

- Model seçimi **iki katmanlı ve tek yönlü**: istemci ajanı sabit bir katmana (T1/T2/T3) bağlıyor (`apps/ops-floor/index.html:3103-3110`), sunucu katmanı `config.json` içindeki `tiers` sözlüğüyle modele çeviriyor (`tools/swarm_sim.py:435-436`).
- **Ajan başına model yok.** İstemci `agent` alanını gönderiyor (`index.html:3220`) ama sunucu bu alanı hiç okumuyor; gövdeden yalnız `messages`, `tier`, `skill_id` kullanılıyor (`swarm_sim.py:773-799`). Yapısal engel: config şeması tek `provider`/`model`/`api_key` üçlüsü tutuyor, `call_model` yalnız `(messages, tier)` alıyor (`swarm_sim.py:432`).
- **Offline sağlayıcılar katalogda var** (ollama, lmstudio — `swarm_sim.py:287-288`) **ama anahtarsız çalışmıyor**: `call_model` anahtarı sağlayıcıdan bağımsız olarak zorunlu tutuyor (`swarm_sim.py:451-453`). Ölçüldü: `ollama call ERR: ValueError API anahtarı yok`.
- **Anahtar düz metin** `~/.zekai/config.json` içinde; yanıtlarda maskeleme doğru (yalnız `has_key` + `••••lqSQ`). `chmod 0o600` NTFS'te ACL kısıtlamıyor — ölçüldü.
- **Maliyet kontrolleri kısmi ve fiilen devre dışı**: günlük tavan yalnız `/api/chat` içinde, fiyat tablosu 4 model içerdiği için yapılandırılmış modelde maliyet `0` hesaplanıyor; tavan hiç tetiklenmiyor (`docs/STATE.md:37` bunu doğruluyor).

---

## 2. Bulgular

### 2.1 T1/T2/T3 katmanları: hangi model, nereden okunuyor, varsayılan ne?

**Zincir:**

1. **Ajan → katman (istemci, sabit kod):** `supervisor T2, planner T3, researcher T1, analyst T2, builder T2, reviewer T1` — `apps/ops-floor/index.html:3103-3110`.
2. **Görev → ajan seçimi (istemci, anahtar kelime puanı):** `planTask` yalnız eşleşen ajanları alır, en çok 3 adım üretir (`index.html:3137-3152`).
3. **İstek:** gövdede `tier: last.tier` ve `agent: last.agent` gönderilir (`index.html:3220`).
4. **Katman → model (sunucu, config):**
   - `tiers = cfg.get("tiers") or {}` — `tools/swarm_sim.py:435`
   - `model = (tiers.get(tier) if tier else "") or cfg.get("model") or "mock-1"` — `tools/swarm_sim.py:436`
   - Yazma yolu: `POST /api/settings` yalnız `T1/T2/T3` anahtarlarını ve boş olmayan değerleri kabul eder — `swarm_sim.py:696-698`
   - Okuma yolu: `public_cfg()` içinde `"tiers": cfg.get("tiers", {})` — `swarm_sim.py:407`; arayüz `sT1/sT2/sT3` alanlarına basar — `index.html:3022-3025`

**Varsayılan:** Kodda tanımlı bir `DEFAULT_TIERS` **yok**. `tiers` boşsa üç katman da `cfg.model` değerine düşer (`swarm_sim.py:436`). Canlı config'te `tiers={}` olduğu ölçüldü; bu durumda T1=T2=T3=`gemini-3.5-flash`.

**Ölçüm (çalıştırıldı):**

```
tiers={} -> {'T1': 'tek-model', 'T2': 'tek-model', 'T3': 'tek-model'}
tier 'T1' -> a-mini   (tiers={"T1":"a-mini","T2":"b-mid","T3":"c-big"} iken)
tier ''   -> mock-1   (katman yoksa cfg.model)
```

**Sonuç:** Katman mekanizması çalışıyor ama **bugün itibarıyla etkisiz**: `config.json` içinde `tiers` boş olduğu için üç katman aynı modeli çağırıyor; katmanlar arasındaki tek gerçek fark `max_tokens` (`MAX_OUT`, `swarm_sim.py:423`). `docs/STATE.md:26`'daki "plan + T1/T2/T3 — Çalışıyor" ifadesi mekanizma için doğru, **davranış için yanıltıcı**.

**Katman doğrulaması yok:** `/api/chat` gövdedeki `tier` değerini serbest metin olarak alır (`swarm_sim.py:799`); bilinmeyen değer `MAX_OUT.get(tier, 700)` ile sessizce 700'e düşer (`swarm_sim.py:437`).

### 2.2 Ajan başına model ataması var mı?

**Hayır.** Ajan başına **model** yok; yalnız ajan başına **katman** var ve o da istemcide sabit kodlu.

**Kanıt:**

- İstemci `agent` gönderiyor: `body: JSON.stringify({ messages, tier: last.tier, agent: last.agent, skill_id: ... })` — `apps/ops-floor/index.html:3220`.
- Sunucuda `agent` alanını okuyan tek bir satır yok. `swarm_sim.py` içinde `agent_id` yalnız olay zarfı ve terminal renklendirmesi için geçiyor (`swarm_sim.py:50,56,71,98,162,169`); gövde ayrıştırmasında `data.get("agent")` **bulunmuyor**.
- `/api/chat` gövdeden yalnız `messages`, `tier`, `skill_id` alır — `swarm_sim.py:776-799`.
- `call_model(messages, tier="")` imzasında ajan parametresi yok — `swarm_sim.py:432`.

**Engelleyen yapı (üç ayrı kilit):**

1. **Config şeması düz:** `~/.zekai/config.json` anahtarları ölçüldü: `provider, model, base_url, api_key, tiers, daily_cap_usd`. Ajan→model haritası için yer yok.
2. **Yazma uç noktası kapalı:** `POST /api/settings` yalnız `provider`, `model`, `base_url`, `api_key`, `tiers` (T1-T3), `daily_cap_usd` alanlarını işler — `swarm_sim.py:687-703`. Bilinmeyen alanlar sessizce yok sayılır.
3. **Ajan kaydı sunucuda yok:** `state.agents` tamamen tarayıcı durumu (`index.html:968,1232,1258`); sunucuda ajan profili tablosu/dosyası yok. Bu, `docs/MIMARI-UYGUNLUK-ANALIZI.md:28`'deki "Model Gateway — Kısmi" ve §5 Agent Runtime "Yok" değerlendirmesiyle tutarlı.

**Sonuç:** Ajan→model isteği bugünkü mimaride **veri modeli değişikliği** gerektirir (config'e `agent_models` sözlüğü + `call_model`'a ajan parametresi + doğrulama). Mevcut uç noktaları genişletmek yeterli değil.

### 2.3 Offline sağlayıcılar: katalog, base_url, anahtar

**Katalogda var (2 adet):**

| id | Etiket | kind | base | local |
|---|---|---|---|---|
| `ollama` | Ollama (yerel) | openai | `http://127.0.0.1:11434/v1` | `True` |
| `lmstudio` | LM Studio (yerel) | openai | `http://127.0.0.1:1234/v1` | `True` |

Kanıt: `tools/swarm_sim.py:287-288`. Ölçüm: `PROVIDERS count: 21`, `local providers: ['ollama', 'lmstudio']`.

**OpenAI-uyumlu yerel:** Ayrı bir "yerel openai-uyumlu" girdisi yok; bunun yerine `custom` ("Özel API") boş base ile tanımlı ve `needs_base: True` (`swarm_sim.py:297`, ölçüm: `needs_base: ['opencode', 'xiaomi', 'custom']`). Herhangi bir yerel sunucu (vLLM, llama.cpp, LocalAI) `custom` + `base_url` ile bağlanabilir.

**base_url nasıl veriliyor:**

- Preset base'i `resolve_provider` seçer; **config'teki `base_url` preset'i ezer**: `base = (cfg.get("base_url") or preset["base"]).rstrip("/")` — `swarm_sim.py:320`.
- `POST /api/settings` `base_url` alanını serbest metin olarak yazar — `swarm_sim.py:687-689`.
- Google'a özel normalizasyon var (yanlış `googleapis.com` değeri düzeltilir) — `swarm_sim.py:321-322`.
- Arayüz `sBase` alanını `d.base_url` ile doldurur — `index.html:3016`.

**Anahtar gerekiyor mu? Evet — ve bu bir kusur.**

- `call_model` içinde sağlayıcı ayrımından **önce** koşulsuz anahtar kontrolü var:
  `key = cfg.get("api_key")` / `if not key: raise ValueError("API anahtarı yok — Ayarlar'dan ekleyin")` — `swarm_sim.py:451-453`.
- Oysa Ollama/LM Studio anahtar istemez. Ölçüm (geçici config ile, gerçek config'e dokunulmadı):

```
ollama resolved: {'id': 'ollama', 'kind': 'openai', 'base': 'http://127.0.0.1:11434/v1', ...}
ollama call ERR: ValueError API anahtarı yok — Ayarlar'dan ekleyin
lmstudio call ERR: ValueError API anahtarı yok — Ayarlar'dan ekleyin
```

- **Model listesi anahtarsız çalışıyor:** `/api/provider/models` openai dalında başlık yalnız anahtar varsa ekleniyor — `swarm_sim.py:725`. Yani yerel model listesi alınabilir, sohbet alınamaz. Bu tutarsızlık kullanıcıya "bağlandı" izlenimi verip ilk mesajda hata üretir.
- **Yerel liste yalnız aktif sağlayıcı için:** `/api/provider/models` gövde parametresi almaz, `load_cfg()` ile aktif sağlayıcıyı çözer (`swarm_sim.py:712-713`). Google aktifken Ollama modellerini listelemek mümkün değil.
- **Protokol beklentisi:** Ollama için native `/api/tags` değil, OpenAI-uyumlu `GET {base}/models` ve `POST {base}/chat/completions` kullanılıyor (`swarm_sim.py:726,492`).

### 2.4 API anahtarı nerede saklanıyor, düz metin mi, izinler, maskeleme

**Yol:** `Path.home() / ".zekai" / "config.json"` — `swarm_sim.py:262-263`. Windows'ta `C:\Users\<kullanıcı>\.zekai\config.json`.

**Biçim:** Düz JSON, düz metin. Ölçüm: `config.json` anahtarları `provider, model, base_url, api_key, tiers, daily_cap_usd`; `api_key` tipi `String`, uzunluk `53`, dosya içeriği `{"provider": "google", ...}` olarak okunabilir. Şifreleme/DPAPI/vault yok. `docs/STATE.md:15` bunu zaten kabul ediyor ("dosyada düz metin — üretimde vault gerekir"); `docs/MIMARI-UYGUNLUK-ANALIZI.md:122` DPAPI'yi Sprint C önerisi olarak listeliyor.

**İzinler:**

- Kod `save_cfg` içinde `os.chmod(CONFIG_PATH, 0o600)` çağırıyor — `swarm_sim.py:334-340`.
- **Ancak NTFS'te `chmod` ACL yazmaz.** Ölçüm (`.tmp` içinde geçici dosya, `os.chmod(...,0o600)` sonrası):

```
BUILTIN\Administrators Allow FullControl
NT AUTHORITY\SYSTEM Allow FullControl
NT AUTHORITY\Authenticated Users Allow Modify, Synchronize
BUILTIN\Users Allow ReadAndExecute, Synchronize
```

  Yani `0o600` yalnızca POSIX'te koruma sağlar; Windows'ta fiilen **no-op**. `config.json`'ın kendi ACL'i `SYSTEM / Administrators / <kullanıcı> FullControl` — bu, kullanıcı profili dizininden **miras** gelen koruma, `chmod`'un eseri değil.
- Sonuç: koruma seviyesi "kullanıcı profil dizini varsayılanı" kadardır; aynı makinedeki yönetici hesapları ve kullanıcının kendi süreçleri anahtarı okuyabilir. `docs/MIMARI-UYGUNLUK-ANALIZI.md:28`'deki "anahtar düz metin `config.json`" tespiti doğru.

**Maskeleme (yanıtlarda): doğru çalışıyor.**

- `public_cfg()` anahtarı **hiç döndürmez**; yalnız `"has_key": bool(key)` ve `"key_hint": "••••" + key[-4:]` — `swarm_sim.py:400-406`.
- Canlı doğrulama (`GET /api/settings`): dönen alanlar `provider, model, base_url, has_key, key_hint, tiers, daily_cap_usd, today_cost, providers, resolved` — **`api_key` yok**; `has_key=True`, `key_hint=••••lqSQ`.
- Hata yolları anahtarı loglamıyor: sağlayıcı hatası yalnız HTTP kodu + gövdenin ilk 300 karakteri ile raporlanır (`swarm_sim.py:514-531`); anahtar ne hata metnine ne de olaylara yazılıyor.
- **İstisna:** anahtar **dışarıya gönderilirken** `Authorization: Bearer` başlığına konur (`swarm_sim.py:495`) ve hedef `cfg["base_url"]`'dir. Bu, aşağıdaki 2.7'deki yönlendirme riskiyle birleşince önem kazanır.

### 2.5 Sağlayıcı ekleme / silme / düzenleme uç noktası var mı?

**Yok. Model tek aktif sağlayıcı + tek anahtar üzerine kurulu.**

- Sağlayıcı kataloğu **kod içinde sabit sözlük**: `PROVIDERS` — `swarm_sim.py:276-298` (21 girdi, ölçüldü). Çalışma zamanında katalog eklenemez.
- Tek yazma yolu `POST /api/settings`: `provider`, `model`, `base_url`, `api_key`, `tiers`, `daily_cap_usd` alanlarını **tek bir kayda** yazar — `swarm_sim.py:683-708`. Yani "sağlayıcı düzenleme", aslında "aktif sağlayıcıyı değiştirme".
- **Silme yok:** `do_DELETE` yalnız `/api/skills` yolunu işler — `swarm_sim.py:671-677`. Sağlayıcı, anahtar veya model silme uç noktası yok. Anahtar silme yalnız `POST /api/settings` + `clear_key` ile mümkün (`swarm_sim.py:694-695`).
- **Çoklu kayıt yok:** Aynı anda iki sağlayıcı anahtarı tutulamaz; `api_key` tek string. Sağlayıcı değiştirmek anahtarı da değiştirmeyi gerektirir.
- **Doğrulama yok:** `provider` değeri `PROVIDERS`'a karşı kontrol edilmez (`swarm_sim.py:687-689`); bilinmeyen değer `resolve_provider` içinde `PROVIDERS["custom"]`'a düşer (`swarm_sim.py:319`) ve base boş kalır → çalışma anında "uç nokta HTML döndürdü / base URL API adresi olmalı" hatası (`swarm_sim.py:521`). Kaydetme anında uyarı yok.
- **Model doğrulama yok:** `model` serbest metin; `/api/test` (`swarm_sim.py:764-771`) tek yol, ama kaydetme sırasında otomatik çağrılmıyor.

### 2.6 Maliyet kontrolleri nerede?

| Kontrol | Yer | Durum |
|---|---|---|
| Günlük tavan | `cfg.daily_cap_usd` okuma `swarm_sim.py:408`; kontrol `785-788` | Yalnız `/api/chat`; **`/api/test` atlıyor** |
| Kullanım sayacı | `~/.zekai/usage.json` — `swarm_sim.py:265,384-395`; yazma `817` | Tarih değişince sıfırlanır (`385-389`) |
| Fiyat tablosu | `PRICES` 4 model — `swarm_sim.py:268-273` | Bilinmeyen model → maliyet `0` (`417-419`) |
| Kademeli `max_tokens` | `MAX_OUT = {T1:450, T2:700, T3:950}` — `423`; uygulama `468, 480, 490` | Çalışıyor; bilinmeyen katman `700` (`437`) |
| Yanıt önbelleği | `RESP_CACHE` — `424`; anahtar `427-429`; kullanım `800-810` | Süreç içi, 40 kayıtta toptan temizlenir (`808-809`) |
| 429/503 retry | `swarm_sim.py:501-511` | Tek deneme, 1.5 sn bekleme |
| Bağlam kırpma | Sunucu: son 8 mesaj + 4000 karakter (`779-781`), skill 2500 (`795`); istemci: 6 mesaj/2600 karakter (`index.html:3158`) | Çalışıyor |
| CLI bütçe sabiti | `BUDGET_USD = 0.50` — `43` | **Yalnız banner'da** (`182`); zorlamıyor |

**Kritik boşluk — tavan fiilen çalışmıyor:** `cost_of` yalnız `PRICES` içindeki 4 model için fiyat bilir (`swarm_sim.py:268-273,417-419`). Yapılandırılmış sağlayıcı `google` / model `gemini-3.5-flash` bu tabloda **yok**; ölçüm: `cost unknown: 0.0`. Dolayısıyla her istek `$0` yazar, `usage.cost` hiç artmaz ve `usage["cost"] >= cap` koşulu (`swarm_sim.py:787`) hiçbir zaman doğru olmaz. `docs/STATE.md:37` bunu zaten kabul ediyor. Bugünkü haliyle "Günlük harcama tavanı (sunucu tarafı) — Çalışıyor" (`STATE.md:31`) **yalnızca fiyatı bilinen modeller için** geçerlidir.

**Diğer maliyet açıkları:**

- **`/api/test` sayılmıyor:** `call_model` çağrılır (`swarm_sim.py:766`) ama `add_usage` yok; tavan kontrolü de yok. Test düğmesi her basışta ücretsiz sayılan bir çağrı yapar.
- **Eşzamanlılık yarışı:** `ThreadingHTTPServer` + "oku-karşılaştır-sonra yaz" deseni (`swarm_sim.py:785-788` sonra `817`). N eşzamanlı istek tavanı birlikte aşabilir; rezervasyon/kilit yok.
- **Önbellek anahtarı eksik:** `cache_key(provider, model, tier, messages, skill_id)` çağrısında `model` **cfg.model**'dir, katmanın çözdüğü model değil (`swarm_sim.py:800`). Ölçüm: `tiers.T1` `mini-A` → `baska-B` değiştirildiğinde anahtar **aynı** kaldı (`cache key same after tier model change: True`). Sonuç: katman modeli değiştirilince eski modelin yanıtı önbellekten döner; ayrıca `base_url` de anahtarda yok. Önbellek ayar değişiminde temizlenmiyor.
- **Önbellek isabetinde maliyet 0** (`802-804`) — doğru davranış, ama kullanıcıya "tasarruf" olarak raporlanmıyor.

### 2.7 Uç nokta envanteri (tam liste)

| Yöntem | Yol | Satır | İş |
|---|---|---|---|
| GET | `/health` | `590` | Durum, olay sayısı, toplam maliyet |
| GET | `/api/settings` | `595` | Maskeli config + sağlayıcı kataloğu |
| GET | `/api/skills` | `599` | Paylaşılan yetenekler |
| GET | `/api/models` | `603` | **3D GLB varlıkları** (`apps/ops-floor/models`) — LLM modeli değil |
| GET | `/events` | `620` | SSE olay akışı |
| POST | `/api/settings` | `683` | Tek aktif sağlayıcı/anahtar/tier/tavan yazma |
| POST | `/api/provider/models` | `710` | Aktif sağlayıcının model listesi |
| POST | `/api/skills` | `736` | Yetenek ekle/güncelle |
| POST | `/api/test` | `764` | `call_model` ile ping (T1) |
| POST | `/api/chat` | `773` | Tek model çağrısı |
| POST | `/approve` | `823` | Demo onay kapısı |
| DELETE | `/api/skills` | `671` | Yetenek silme |

**Adlandırma tuzağı:** `/api/models` LLM modeli listelemez; `glb_meta` ile 3D sahne varlıklarını döner (`swarm_sim.py:603-619`). Canlı yanıt: `{"models": [{"path": "/models/astronaut.glb", ...}]}`. Model yönetimiyle ilgili tek uç nokta `/api/provider/models`.

### 2.8 Sunucu süreç yönetimi (installer)

`installer/windows/ZekAI-Kontrol.ps1` model/anahtar yönetimi **yapmıyor**; yalnız süreç ve görünüm katmanı:

- Log/PID yolları: `$env:USERPROFILE\.zekai\server.log`, `server.pid` — `ZekAI-Kontrol.ps1:17-18`.
- Sunucuyu `python -u tools\swarm_sim.py serve --port <Port>` ile başlatır — `ZekAI-Kontrol.ps1:58-72`.
- Durdurma `taskkill.exe /T /F /PID` ile — `ZekAI-Kontrol.ps1:74-82` (satır 77).
- Durum kartı sağlayıcı/model/maliyeti **`/api/settings`'ten** okur — `ZekAI-Kontrol.ps1:38-43, 96-110`.
- Dosyada `api_key` geçen tek bir satır yok (tarama: yalnız `api/settings` GET). Anahtar girişi tamamen web panelinden yapılır (`index.html:3041-3042`).

---

## 3. Eksikler (istenen ama olmayan yetenekler)

| # | Eksik | Kanıt / neden |
|---|---|---|
| 1 | **Çoklu sağlayıcı kaydı** (registry, sağlayıcı başına anahtar) | Tek `api_key` + tek `provider` alanı — `swarm_sim.py:687-703`; katalog kod içi sabit — `276-298` |
| 2 | **Ajan başına model** | `call_model(messages, tier)` — `swarm_sim.py:432`; gövdedeki `agent` okunmuyor — `index.html:3220` vs `swarm_sim.py:776-799` |
| 3 | **Offline model listesi (anahtarsız, sağlayıcı seçilebilir)** | Anahtar zorunlu — `swarm_sim.py:451-453`; liste yalnız aktif sağlayıcı — `712-713` |
| 4 | **Anahtar kasası** (DPAPI/Keychain/OS keyring) | Düz metin JSON — `swarm_sim.py:263,336`; `chmod` NTFS'te etkisiz — ölçüldü |
| 5 | **Model yetenek (capability) bilgisi** | `public_cfg` yalnız `label/base/kind/local/needs_base` döner — `swarm_sim.py:410-411`; context window, vision/tool desteği, model başına fiyat yok |
| 6 | **Tier varsayılanları** | `DEFAULT_TIERS` yok; boş `tiers` → üç katman aynı model — `swarm_sim.py:435-436`; canlı config `tiers={}` |
| 7 | **Bilinmeyen modeller için maliyet** | `PRICES` 4 model — `268-273`; `cost_of` varsayılanı `0` — `417-419` |
| 8 | **`/api/test` için tavan ve sayaç** | `call_model` var, `add_usage` yok — `764-771` vs `817` |
| 9 | **Önbellek geçersizleştirme** | Anahtar tier modelini ve `base_url`'i içermiyor — `800`; ölçüldü: anahtar değişmedi |
| 10 | **Sağlayıcı silme/düzenleme uç noktası** | `do_DELETE` yalnız `/api/skills` — `671-677` |
| 11 | **Kaydetme anında doğrulama** (sağlayıcı kimliği, model adı, base URL şeması) | `687-689`; bilinmeyen sağlayıcı sessizce `custom`'a düşer — `319` |
| 12 | **Streaming, sağlık kontrolü, normalize hata, fallback politikası** | `docs/MIMARI-UYGUNLUK-ANALIZI.md:51-52` ile aynı tespit; kodda tek seferlik `urlopen` — `swarm_sim.py:503` |
| 13 | **Kimlik doğrulama / tenant** | Tüm `/api/*` kimliksiz — `swarm_sim.py:583` CORS `*`; `MIMARI-UYGUNLUK-ANALIZI.md:28` |
| 14 | **Kullanım raporu / uyarı eşiği (%80)** | Yalnız `today_cost` alanı — `408-409`; eşik olayı yok |

---

## 4. Riskler (kod okumasından çıkarım — sömürü testi yapılmadı)

1. **Anahtar yönlendirme (exfiltration) yolu:** `POST /api/settings` kimlik doğrulaması istemiyor (`swarm_sim.py:683-708`), yanıtlarda `Access-Control-Allow-Origin: *` var (`583`), `base_url` serbest metin (`687-689`) ve anahtar bir sonraki çağrıda `Authorization: Bearer` olarak o adrese gider (`495`). Tarayıcıda açık herhangi bir sayfa `http://127.0.0.1:8787/api/settings`'e POST atıp `provider=custom`, `base_url=<saldırgan>` yazabilir; sonraki sohbet çağrısı anahtarı saldırgana taşır. *Bu bir çıkarımdır; uçtan uca denenmedi.*
2. **`key_hint` sızıntısı:** Son 4 karakter kimliksiz `GET /api/settings` ile okunabilir (`406`). Tek başına anahtar vermez, ama doğrulama/parmak izi olarak kullanılabilir.
3. **Yerel dosya sistemi:** `~/.zekai` altındaki `skills.json` ve `usage.json` de `save_json` ile yazılıyor (`350-352`) ve `chmod` uygulanmıyor — yalnız `config.json`'a uygulanıyor (`338`).
4. **Path traversal koruması var:** `_file` içinde `commonpath` kontrolü mevcut (`swarm_sim.py:837`) — bu noktada risk görülmedi.

---

## 5. Öneriler (öncelik sırasıyla)

1. **Maliyeti gerçek yap:** `PRICES` tablosunu sağlayıcı bazlı ve model başına genişlet; bilinmeyen modelde `0` yerine "bilinmiyor" işaretle ve tavanı bilinmeyen maliyette **kapat** (fail-closed). Aksi halde tavan bir güvenlik tiyatrosu.
2. **Offline yolu anahtarsız aç:** `swarm_sim.py:451-453` kontrolünü `if not key and not preset.get("local")` biçimine çevir; `custom` için de "anahtar opsiyonel" bayrağı ekle.
3. **Anahtarı düz metinden çıkar:** Windows'ta DPAPI (`ProtectedData`) veya `keyring`; en azından `icacls` ile ACL daralt (chmod değil).
4. **Ajan→model haritası ekle:** `config.json` içine `agent_models: {agent_id: model}`; `call_model(messages, tier, agent)`; `POST /api/settings` doğrulaması. Katman (T1-T3) global varsayılan, ajan eşlemesi onu ezer.
5. **Tier varsayılanı tanımla:** `DEFAULT_TIERS = {"T1": cfg.model, ...}` yerine anlamlı üç model (ör. haiku/sonnet/opus) ve arayüzde boş bırakılırsa bunu göster.
6. **`/api/provider/models`'a `provider` parametresi ekle** ve anahtarsız yerel listeyi destekle; arayüzde sağlayıcı seçimine bağla.
7. **Önbellek anahtarına çözülmüş model + `base_url` ekle**; ayar değişiminde `RESP_CACHE.clear()`.
8. **`/api/test`'i tavan ve sayaç kapsamına al**; `add_usage` çağır.
9. **Capability alanı ekle:** model başına `context_window`, `supports_tools`, `supports_vision`, `price_in/out`; `public_cfg` bunları döndürsün.
10. **Yerel API'yi kilitle:** `Host`/`Origin` kontrolü, rastgele oturum token'ı, CORS'u `*` yerine `http://127.0.0.1:8787` ile sınırla.

---

## 6. Doğrulama günlüğü

**Çalıştırılan kontroller (bu oturumda):**

| # | Komut / yöntem | Sonuç |
|---|---|---|
| 1 | `python -` ile modülü içe aktarma + geçici config | `PROVIDERS count: 21`; `local providers: ['ollama', 'lmstudio']`; `needs_base: ['opencode','xiaomi','custom']` |
| 2 | Aynı oturum, `provider=ollama`, anahtarsız `call_model` | `ValueError: API anahtarı yok — Ayarlar'dan ekleyin` |
| 3 | Aynı oturum, `provider=lmstudio` | Aynı `ValueError` |
| 4 | Aynı oturum, `tiers` dolu/boş | `T1/T2/T3` eşlendi; `tiers={}` → üçü de `tek-model` |
| 5 | Aynı oturum, `cache_key` tier modeli değişimi | `cache key same after tier model change: True` |
| 6 | `Start-Process python tools\swarm_sim.py serve --port 8791` + `GET /api/settings` | `200`; alanlar: `provider, model, base_url, has_key, key_hint, tiers, daily_cap_usd, today_cost, providers, resolved`; `api_key` **yok**; `has_key=True`; `key_hint=••••lqSQ`; `tiers={}`; `daily_cap_usd=0`; 21 sağlayıcı |
| 7 | `GET /api/models` | `200`; GLB varlık listesi (`astronaut.glb`, …) — LLM modeli değil |
| 8 | `POST /api/provider/models` (aktif sağlayıcı google) | `200`; `{"ok": true, "provider": "google", "models": ["gemini-2.5-flash", …]}` |
| 9 | `GET /health` | `200`; `{"ok": true, "events": 4, "cost_usd": 0.0073, …}` |
| 10 | `.tmp` içinde `os.chmod(path, 0o600)` + `Get-Acl` | ACL: `Authenticated Users Modify`, `Users ReadAndExecute` — kısıtlama yok |
| 11 | `~/.zekai/config.json` okuma (değer yazdırılmadı) | Anahtarlar: `provider, model, base_url, api_key, tiers, daily_cap_usd`; `api_key` düz `String`, 53 karakter |
| 12 | `~/.zekai/usage.json` | `{"date": "2026-11-05", "cost": 0.0}` — bugün 12 Kasım, yani okuma sırasında sıfırlanmış sayılıyor |
| 13 | Sunucu süreci | Test sonrası durduruldu (`Stop-Process`); 8791 portu serbest |

**Çalıştırılmayanlar (dürüstlük notu):**

- **Gerçek `/api/chat` çağrısı yapılmadı.** Kullanıcının canlı Google anahtarıyla ücretli istek atmamak için bilinçli olarak atlandı. Bu nedenle tavan kontrolü (`785-788`), önbellek isabeti (`801-804`), `add_usage` (`817`) ve sağlayıcı hata yolları **kod okumasıyla** raporlandı, çalıştırılarak değil.
- **`/api/test`'in tavanı atladığı** kod okumasıyla tespit edildi; canlı doğrulanmadı (aynı ücret nedeni).
- **CORS/`base_url` yönlendirme senaryosu** sömürülmedi; yalnızca kod yolları eşlendi.
- **Windows'ta `chmod` no-op** sonucu geçici bir dosyada ölçüldü; `config.json`'ın kendi ACL'i ayrıca okundu (miras koruma).

---

## 7. Özet hüküm

Sunucu tarafı model yönetimi **tek sağlayıcı, tek anahtar, tek model** varsayımı üzerine kurulu bir prototiptir. Katman (T1-T3) mekanizması gerçekten çalışıyor ama bugün `tiers` boş olduğu için üç katman da aynı modeli çağırıyor; ajan başına model için ne veri modeli ne de uç nokta var; offline sağlayıcılar katalogda olmasına rağmen anahtar zorunluluğu yüzünden kullanılamıyor; maliyet tavanı ise fiyat tablosu eksik olduğu için fiilen hiç tetiklenmiyor. Anahtar maskeleme ve `public_cfg` sözleşmesi temiz; buna karşılık anahtar düz metin duruyor ve NTFS'te `chmod` koruma sağlamıyor.

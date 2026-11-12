# ZekAI Hub — Arayüz Model ve Ayar Yönetimi Denetimi

**Denetim tarihi:** 12 Kasım 2026  
**İncelenen commit:** `9be4805`  
**Kapsam:** `apps/ops-floor/index.html`, `apps/ops-floor/models/README.md`, `docs/STATE.md`; doğrulama için `tools/swarm_sim.py`.  
**Yöntem:** Statik kod okuması + yerel sunucuda salt-okunur API probe'ları + geçici `HOME` profiliyle ayar API'si davranış testi. Tarayıcıda görsel/DOM testi yapılmadı.

> **Kanıt etiketleri:** **[K]** doğrudan kod okuması (satır verildi), **[R]** bu oturumda çalıştırılan test, **[Ç]** kod okumasından çıkarım (doğrudan test edilmedi), **[D]** depo dokümanı. Aynı bölümde yalnız `:NNN` biçiminde verilen satırlar, o bölümde adı geçen dosyaya aittir.

---

## Yönetici özeti

1. **Ayarlar paneli var** ve istenen alanların tamamını içeriyor: sağlayıcı, model, base URL, API anahtarı, T1/T2/T3, günlük limit, test, kaydet, anahtar silme (`apps/ops-floor/index.html:789-845`).
2. **Ajan başına model seçimi yok.** Altı ajan üç sabit katmana (T1/T2/T3) eşleniyor; görev başına yalnızca **son ajan** gerçek model çağrısı yapıyor ve sunucu `agent` alanını tamamen yok sayıyor (`apps/ops-floor/index.html:3103-3110`, `:3208-3221`; `tools/swarm_sim.py:799-806`).
3. **Ollama ve LM Studio presetleri var**, ancak API anahtarı yerel uçlarda da zorunlu; anahtarsız Ollama testi `API anahtarı yok` hatası verdi (`tools/swarm_sim.py:287-288`, `:451-453`; **[R]**).
4. **Model listesi** `/api/provider/models` üzerinden canlı geliyor; Anthropic için iki model sabit, özel modeller yalnızca tarayıcı `localStorage`'ında ve uzak liste yeniden yüklenince kayboluyor (`tools/swarm_sim.py:710-734`; `apps/ops-floor/index.html:2974-2987`, `:3018`, `:3681-3690`).
5. **Anahtar yönetimi zayıf:** tek anahtar `~/.zekai/config.json` içinde düz metin; Windows'ta `chmod 600` etkisiz; **"Anahtarı sil" düğmesi çalışmıyor** (geçici profilde doğrulandı) (`tools/swarm_sim.py:334-340`, `:690-695`; `apps/ops-floor/index.html:3691-3698`; **[R]**).
6. **Yönetim tarafı yok:** sağlayıcı ekleme/düzenleme/silme, sağlayıcı başına anahtar/model, kullanım-maliyet kırılımı ve kullanıcı rolü/yetkisi bulunmuyor (`tools/swarm_sim.py:276-298`, `:671-678`; `apps/ops-floor/index.html:2929-2959`).

---

## 0. Önce kavram ayrımı: iki farklı "model"

Arayüzde "model" kelimesi iki ayrı şeyi anlatıyor; denetimde karışmaması için ayrıldı:

| Kavram | Nerede | Ne yapar | Kanıt |
|---|---|---|---|
| **LLM modeli** | Ayarlar → `#sModel` | `/api/chat` çağrısında kullanılan sağlayıcı modeli | `apps/ops-floor/index.html:805-808`; `tools/swarm_sim.py:432-436` |
| **3D karakter modeli (GLB)** | Maskot → `#nModel`, `#nModelPick`, "Model ölçeği" | Ofis sahnesindeki ajan görseli | `apps/ops-floor/index.html:767-775`; `apps/ops-floor/models/README.md:1-11` |
| **3D model listesi** | `GET /api/models` | `apps/ops-floor/models/*.glb` dosyalarını listeler | `tools/swarm_sim.py:603-618`; `apps/ops-floor/index.html:2711-2739` |

Bu raporda aksi belirtilmedikçe **"model" = LLM modeli**. Maskot panelindeki "Model URL" bir 3D varlıktır; sağlayıcı modeliyle ilgisi yoktur.

---

## 1. Ayarlar paneli var mı, hangi alanlar var?

### 1.1 Panel ve açılış yolları

- Modal: `apps/ops-floor/index.html:789-845`; başlık **"Bağlantı ayarları"** (`:792`).
- `openSettings(open)` yalnızca görünürlüğü değiştirir, açılınca `loadSettings()` çağırır (`:2921-2926`).
- Açılış noktaları:
  - Alt kompozör çubuğu **"Ayarlar"** düğmesi (`:705`, dinleyici `:3610`),
  - Görev konsolu başlığındaki **"Bağlantı ayarları"** (`:625`, dinleyici `:3629`),
  - `?settings=1` URL parametresi (`:3815`).
- `Escape` ve arka plana tıklama modalı kapatır (`:3699-3701`, `:3718`).

### 1.2 Alan envanteri

| # | Alan | Kontrol | Satır | Durum / not |
|---|---|---|---|---|
| 1 | Sağlayıcı | 21 çiplik `#provGrid` + `#sProvider` select | `:796-803`, `:2929-2959` | Sunucudan gelen katalogla doldurulur; HTML'de yalnız 4 yedek seçenek var (`:799-802`) |
| 2 | Model | `#sModel` serbest metin + `#modelList` datalist | `:805-808` | Datalist öneri verir; zorunlu doğrulama yok |
| 3 | Model getir | `#sModels` "Modelleri getir" | `:810` | Önce ayarları sessizce kaydeder (`:2993`) |
| 4 | Özel model ekle | `#sAddModel` "+ Model ekle" | `:811`, `:3681-3690` | Yalnız `localStorage`'a yazar |
| 5 | Base URL | `#sBase` + "Varsayılan" | `:814-819` | Opsiyonel etiketli; 3 sağlayıcıda zorunlu (`needs_base`) |
| 6 | API anahtarı | `#sKey` `type=password` | `:820-822` | Kayıtlıysa boş bırakılır; sunucudan geri doldurulmaz |
| 7 | Günlük limit | `#sCap` sayı, USD | `:823-825` | 0 = sınırsız; sunucu yalnız `/api/chat`'te uygular (`tools/swarm_sim.py:784-788`) |
| 8 | T1 · ucuz | `#sT1` | `:827` | Boşsa global modele düşer (`tools/swarm_sim.py:436`) |
| 9 | T2 · işçi | `#sT2` | `:828` | Aynı |
| 10 | T3 · plan | `#sT3` | `:829` | Aynı |
| 11 | Bağlantıyı test et | `#sTest` | `:840` | Önce kaydeder, sonra `/api/test` (`:3072-3076`) |
| 12 | Anahtarı sil | `#sClear` | `:839`, `:3691-3698` | **Bozuk**; aşağıya bakın |
| 13 | Kaydet | `#sSave` | `:842`, `:3654` | Başarıda modalı kapatır (`:3058`) |
| 14 | Durum satırı | `#sStatus` | `:835`, `:3019-3021` | Sağlayıcı · model · maskeli anahtar · bugünkü maliyet |

**Eksik ayar alanları:** sıcaklık, maksimum çıktı token'ı, istek zaman aşımı, retry/fallback, proxy, sağlayıcı başına anahtar, ajan başına model, model yetenek/bağlam bilgisi. Bunların hiçbiri ne HTML'de ne `public_cfg()` yanıtında var (`tools/swarm_sim.py:398-414`).

### 1.3 Yükleme / kaydetme / test akışı

```
openSettings(true)
  └─ loadSettings()            GET  /api/settings          apps/ops-floor/index.html:3007-3031
       ├─ providerDefs = d.providers
       ├─ renderProviders()  21 çip + select
       ├─ alanları doldur (key hariç)
       └─ renderModelList()  yalnız yerel özel modeller

Kaydet
  └─ saveSettings(false)       POST /api/settings          apps/ops-floor/index.html:3033-3066
       ├─ boş model → "mock-1" / Google → "gemini-3.5-flash"
       ├─ anahtar yalnız doluysa gövdeye eklenir
       ├─ başarıda #sKey temizlenir, loadSettings(), modal kapanır

Test
  └─ testSettings()            saveSettings(true) + POST /api/test   :3068-3089

Modelleri getir
  └─ loadProviderModels()      saveSettings(true) + POST /api/provider/models  :2989-3005
```

**Önemli davranış:** "Modelleri getir" ve "Bağlantıyı test et" düğmeleri, kullanıcı "Kaydet"e basmamış olsa bile formdaki değerleri **sessizce kalıcılaştırır** (`apps/ops-floor/index.html:2993`, `:3072`). Test sırasında yazılan bir anahtar, kaydetme niyeti olmadan diske yazılır.

**Varsayılan model tuzağı:** Model alanı boş bırakılırsa Google dışındaki **her** sağlayıcı için `mock-1` yazılır (`apps/ops-floor/index.html:3038`). OpenAI, Anthropic veya Ollama seçip modeli boş bırakan kullanıcı, farkında olmadan geçersiz bir model kaydeder; hata ancak test/çağrı anında görünür.

---

## 2. Ajan başına model seçilebiliyor mu?

**Cevap: Hayır — ne arayüzde ne sunucu API'sinde.**

### 2.1 Kanıt zinciri

1. **Ajan → katman eşlemesi sabit:** `AGENT_CAPS` içinde altı ajan üç katmana bağlı (`apps/ops-floor/index.html:3103-3110`):
   - `supervisor` T2, `planner` T3, `researcher` T1, `analyst` T2, `builder` T2, `reviewer` T1.
2. **Planlama katmanı taşır, model taşımaz:** `planTask()` yalnız `{agent, tier, caps}` üretir (`:3137-3153`).
3. **Görev başına tek gerçek çağrı:** `sendPrompt()` tüm adımlar için `agent.started/completed` olayı yayar, ama `/api/chat`'i yalnız **son adımın** ajanı ve tier'ı ile çağırır (`:3208`, `:3218-3221`). Ara adımlar simülasyondur.
4. **Sunucu ajanı yok sayar:** `/api/chat` gövdesindeki `agent` alanı hiç okunmaz; yalnız `tier` alınır (`tools/swarm_sim.py:775-806`, özellikle `:799`).
5. **Model seçimi tier → global:** `call_model()` önce `tiers[tier]`, yoksa `cfg.model` kullanır (`tools/swarm_sim.py:432-436`). Ajan kimliğine bakan bir dal yok.
6. **Ajan detayında model yok:** Popup yalnız harcama/token/adım KPI'ları (`apps/ops-floor/index.html:2798-2808`), görev metni ve plan çipleri gösterir; çipler `"Ajan · T2"` biçiminde yalnız katmanı yazar (`:2815-2825`).
7. **Maskot paneli LLM modeli değil, 3D karakter seçer:** Rol başına `select` katalog karakterini seçer; `applyCast()` `a.model = c.model` ile **GLB yolunu** ajana yazar (`:2388`, `:2398-2425`).

### 2.2 Bugünkü gerçek yapılandırma

Çalışan sunucudan okunan ayarlarda `tiers: {}` geldi (**[R]**, Bölüm 8.1). Yani T1/T2/T3 boş; **altı ajanın tamamı aynı global modeli** (`google · gemini-3.5-flash`) kullanıyor. Kullanıcı katmanları doldursa bile görev başına yalnız son ajanın katmanı çağrıya yansır.

### 2.3 Model hangi ekranlarda görünüyor?

| Ekran | LLM modeli | 3D karakter modeli |
|---|---|---|
| **Panel** | Üst şeritte "Aktif model" **sabit** "T2 · Sonnet 5.5" (`:533`); görev konsolu başlığında canlı `provider · model · anahtar` (`:624`, `:3026-3027`) | — |
| **Görevler** | Yok; görev sonucu maliyet/token taşır, model adı taşımaz (`:3231-3236`) | — |
| **Saha 2.5D** | Yok | 2.5D prosedürel karakter (canvas) |
| **Ofis 3D** | Yok | Atanmışsa GLB, yoksa prosedürel maskot (`apps/ops-floor/office3d.js:993`) |
| **Liste** | Yok | Kartta avatar/renk, ad, bölge, durum, harcama, adım; model adı yok (`apps/ops-floor/index.html:2058-2096`) |
| **Maskot paneli** | Yok | Rol başına karakter + `GLB`/`prosedürel` rozeti (`:2417-2424`) |
| **Ajan detay popup** | Yalnız `T1/T2/T3` çipi (`:2821`) | Karakter adı/türü (`:2789-2796`) |
| **Ayarlar** | Provider, model, tier alanları ve durum satırı | — |
| **Olay akışı** | `model.completed` mesajında `d.model` (`:3227`) | — |

**"Aktif model" göstergesi yanıltıcı:** `#model` öğesi HTML'de sabit `T2 · Sonnet 5.5` olarak tanımlı (`:533`); JavaScript'te bu öğeye yazan tek bir referans yok (grep: yalnız tanım satırı). Gerçek yapılandırma Google/Gemini iken panel hâlâ "Sonnet 5.5" gösteriyor.

---

## 3. Offline / yerel model seçimi arayüzde nasıl görünüyor?

### 3.1 Görünüm

- Sunucu kataloğunda iki yerel preset var:
  - `ollama` → `http://127.0.0.1:11434/v1`, `local: True` (`tools/swarm_sim.py:287`)
  - `lmstudio` → `http://127.0.0.1:1234/v1`, `local: True` (`tools/swarm_sim.py:288`)
- Arayüzde 21 çip arasında **"Ollama (yerel)"** ve **"LM Studio (yerel)"** etiketleriyle görünürler; seçilince base URL alanının **placeholder**'ı preset adrese döner (`apps/ops-floor/index.html:2947-2948`, `:2961-2970`).
- Base URL alanı boş bırakılırsa sunucu preset adresi kullanır (`tools/swarm_sim.py:320`). "Varsayılan" düğmesi alanı temizleyip preset'e döndürür (`apps/ops-floor/index.html:3657-3660`).
- `custom` / "Özel API" sağlayıcısı `needs_base: True` ile gelir; kullanıcı yerel bir OpenAI-uyumlu ucu buraya da yazabilir (`tools/swarm_sim.py:297`, `apps/ops-floor/index.html:2968-2970`).

### 3.2 Anahtar zorunlu mu?

**Evet — yerel sağlayıcılar dahil.** `call_model()` sağlayıcı çözümlemesinden **önce** anahtarı kontrol eder ve yoksa hata fırlatır (`tools/swarm_sim.py:451-453`). Bu, Ollama/LM Studio gibi anahtarsız çalışabilen uçları da kapsar.

- **[R] Doğrulama:** Geçici profilde `provider=ollama`, `model=llama3.2`, anahtar yok → `POST /api/test` yanıtı:
  `{"ok":false,"error":"API anahtarı yok — Ayarlar'dan ekleyin"}`
- Model **listeleme** ise anahtarsız çalışabilir: `/api/provider/models` yerel/OpenAI-uyumlu dalda `Authorization` başlığını yalnız anahtar varsa ekler (`tools/swarm_sim.py:725-726`). Yani "modelleri listele" çalışır, "sohbet/test" çalışmaz.

### 3.3 Arayüz eksikleri

- Ayrı bir **"Offline/yerel mod"** yok; yalnız sağlayıcı adı "(yerel)" diyor.
- `local` bayrağı sunucudan geliyor (`tools/swarm_sim.py:410-411`) ama arayüzde **hiç kullanılmıyor**; çipte base URL yalnız `title` ipucunda görünüyor (`apps/ops-floor/index.html:2947-2948`).
- Yerel model yöneticisi yok: model listeleme, indirme (`pull`), silme, bellek/bağlam bilgisi, sağlık kontrolü yok.
- Model placeholder'ı sağlayıcıdan bağımsız olarak `gpt-4o-mini` (`apps/ops-floor/index.html:806`); Ollama seçen kullanıcıya yanlış örnek gösteriyor.
- Base URL'in **placeholder** olarak gösterilmesi, değerin gerçekten boş mu yoksa preset mi olduğunu belirsizleştiriyor. Kullanıcı "kaydedilmiş adres" ile "varsayılan" arasında ayrım yapamıyor.
- **[Ç] Anahtar sızıntısı riski:** Sağlayıcı değiştirildiğinde anahtar alanı temizlenmez ve sunucuda tek bir `api_key` tutulur (`apps/ops-floor/index.html:2961-2971`, `tools/swarm_sim.py:690-695`). OpenAI anahtarı kayıtlıyken "Özel API" ile başka bir uca geçilip kaydedilirse, eski anahtar yeni uca `Bearer` olarak gönderilebilir (`tools/swarm_sim.py:495`). Bu doğrudan test edilmedi; kod akışından çıkarımdır.

---

## 4. Model listesi nereden geliyor, özel model ekleme var mı, liste kalıcı mı?

### 4.1 Kaynak: `POST /api/provider/models`

Arayüz düğmesi `#sModels` (`apps/ops-floor/index.html:810`) → `loadProviderModels()` (`:2989-3005`) → önce `saveSettings(true)` (`:2993`) → `POST /api/provider/models` (`:2995`).

Sunucu tarafı (`tools/swarm_sim.py:710-734`):

| Sağlayıcı türü | İstek | Satır | Not |
|---|---|---|---|
| Google (`kind=google`) | `GET {base}/models?key={key}` | `:716-721` | `generateContent` destekleyenler filtrelenir; anahtar URL query'sinde |
| Anthropic (`kind=anthropic`) | **Ağ isteği yok** | `:722-723` | İki model sabit: `claude-sonnet-4-20250514`, `claude-3-5-haiku-latest` |
| Diğer / OpenAI-uyumlu (Ollama, LM Studio, custom dahil) | `GET {base}/models` + varsa `Bearer` | `:724-730` | Yanıt `data` veya `models` alanından okunur; 200 modelde kesilir |
| Mock | `base=""` → `"/models"` | `:724-726` | Geçersiz URL; "Modelleri getir" hata verir (**[K]**, test edilmedi) |

Hata durumunda HTTP 200 + `{"ok": false, "error": "..."}` döner (`:731-733`); arayüz `✗ ...` gösterir (`apps/ops-floor/index.html:2997`).

### 4.2 Özel model ekleme

- **Var:** "+ Model ekle" (`apps/ops-floor/index.html:811`), handler `:3681-3690`.
- Seçili metni `localStorage["zk_models"]` dizisine ekler; en fazla 40 kayıt tutar (`:3684`).
- **Sunucuya gitmez**, sağlayıcıya bağlanmaz, sağlayıcılar arası globaldir.
- Silme arayüzü yok; yalnız tarayıcı depolaması temizlenerek kaldırılır.
- `renderModelList()` yerel özel modelleri uzak listeyle birleştirir (`:2978-2987`).

### 4.3 Liste kalıcı mı?

| Katman | Nerede saklanır | Kalıcılık | Kanıt |
|---|---|---|---|
| Uzak sağlayıcı listesi | Yalnız DOM `#modelList` datalist | **Kalıcı değil**; modal her açılışında `renderModelList()` boş `remote` ile çağrılır | `apps/ops-floor/index.html:3018`, `:2978-2987` |
| Özel modeller | `localStorage["zk_models"]` | Tarayıcıya özgü, 40 kayıt; başka tarayıcıda yok | `:2974-2976`, `:3681-3690` |
| Seçili model | `~/.zekai/config.json` → `model` | Kalıcı (sunucu) | `tools/swarm_sim.py:687-689` |
| Model kataloğu (sunucu) | — | **Yok**; sunucu model listesi saklamaz | `tools/swarm_sim.py:398-414` |

Sonuç: Sayfa yenilendiğinde uzak liste kaybolur, kullanıcı tekrar "Modelleri getir"e basmak zorundadır. Özel model listesi tarayıcı önbelleğiyle birlikte silinir.

### 4.4 Model seçimi doğrulaması

- `#sModel` serbest metindir; sağlayıcının sunduğu listeyle eşleşme kontrolü yok (`apps/ops-floor/index.html:805-808`).
- Model adı için format/allowlist doğrulaması yok; yanlış model ancak test veya çağrı sırasında hata verir.
- Model yetenekleri (bağlam penceresi, görsel desteği, fiyat) arayüzde gösterilmez; `PRICES` yalnız dört model içerir (`tools/swarm_sim.py:268-273`).

---

## 5. Anahtar girişi: maskeleme, kaydetme, test akışı, hata mesajları

### 5.1 Maskeleme

- Giriş alanı `type="password"`, `autocomplete="off"` (`apps/ops-floor/index.html:821`).
- `loadSettings()` bu alana **değer yazmaz**; kayıtlı anahtar tarayıcıya dönmez (`:3007-3031`).
- Sunucu yalnız `has_key` ve `key_hint = "••••" + son4` döndürür (`tools/swarm_sim.py:400-406`).
- Maske, ayarlar durum satırında (`apps/ops-floor/index.html:3019-3021`) ve görev konsolu başlığında (`:3026-3027`) görünür.
- "Göster/gizle" düğmesi yok; kullanıcı yazdığı anahtarı doğrulayamaz.

### 5.2 Kaydetme ve saklama

- Anahtar yalnız doluysa gövdeye eklenir (`apps/ops-floor/index.html:3041-3042`); boş bırakmak mevcut anahtarı korur.
- Sunucu `cfg["api_key"] = key` olarak **düz metin** yazar (`tools/swarm_sim.py:690-693`); dosya `~/.zekai/config.json` (`:262-263`).
- `save_cfg()` `os.chmod(CONFIG_PATH, 0o600)` dener (`:334-340`), ancak **Windows'ta bu çağrı modu değiştirmez**. Geçici dosyada ölçüm: `mode=0o666` → `chmod 600` sonrası `mode=0o666` (**[R]**, Bölüm 8.1).
- Depo dokümanı da bunu kabul ediyor: "dosyada düz metin — üretimde vault gerekir" (`docs/STATE.md:15`).
- Tek anahtar alanı vardır; sağlayıcı başına anahtar saklanmaz. Sağlayıcı değişimi eski anahtarı korur (`tools/swarm_sim.py:687-695`).

### 5.3 "Anahtarı sil" akışı — bozuk

- Arayüz yalnız `{ "clear_key": true }` gönderir (`apps/ops-floor/index.html:3691-3698`).
- Sunucu `clear_key` kontrolünü `if isinstance(data.get("api_key"), str):` bloğunun **içinde** yapar (`tools/swarm_sim.py:690-695`). Gövdede `api_key` hiç yoksa blok atlanır; `clear_key` yok sayılır.
- **[R] Doğrulama (geçici profil):**
  1. `api_key` alanına geçici bir test değeri kaydedildi → `has_key=true`, `key_hint=••••1234`.
  2. `POST {"clear_key": true}` → yanıt `has_key=true`, `key_hint=••••1234` (değişmedi).
- Sonuç: Kullanıcı anahtarın silindiğini sanır; anahtar diskte kalır. Onay dialogu da yoktur.

### 5.4 Test akışı

- `testSettings()` önce `saveSettings(true)` çağırır, sonra `POST /api/test` (`apps/ops-floor/index.html:3072-3076`).
- Sunucu `call_model([... "ping"], "T1")` çağırır (`tools/swarm_sim.py:764-771`).
- **Test, kullanıcının "Model" alanına yazdığını değil, T1 katmanını test eder.** T1 doluysa `tiers.T1`, boşsa global model kullanılır (`tools/swarm_sim.py:432-436`). Yani T1 doluysa, kullanıcı `gpt-4o` yazsa bile test `gpt-4o-mini` raporlar; T1 boşsa test global "Model" alanını doğrular.
- Başarı çıktısı: `✓ provider · model · yanıtın ilk 48 karakteri` (`apps/ops-floor/index.html:3079`).
- Hata çıktısı: `✗ d.error` veya ağ hatası (`:3081-3086`).

### 5.5 Hata mesajları ve doğrulama

| Durum | Nerede gösterilir | Kanıt |
|---|---|---|
| Ayar kaydetme hatası | `#sStatus` → `hata: ...` | `apps/ops-floor/index.html:3062-3064` |
| Test hatası | `#sTestOut` → `✗ ...` | `:3081-3086` |
| Model listesi hatası | `#sModelOut` → `✗ ...` | `:2997-3003` |
| Sunucuya ulaşılamıyor | Yalnız `#chatState` → `sunucu yok`; modal alanları sessiz kalır | `:3028-3029` |
| Anahtar yok (çağrı) | `API anahtarı yok — Ayarlar'dan ekleyin` | `tools/swarm_sim.py:451-453` |
| Günlük limit | `günlük limit aşıldı (...)` | `tools/swarm_sim.py:784-788` |

Alan bazlı doğrulama yoktur: geçersiz base URL, boş `needs_base`, yanlış model adı veya hatalı anahtar formatı kaydetme sırasında uyarılmaz. Kaydetme yalnız HTTP hatasını gösterir.

### 5.6 Test çağrıları ölçümlenmiyor

- `/api/test` `call_model()` sonucunu döndürür ama `add_usage()` çağırmaz (`tools/swarm_sim.py:764-771`).
- `/api/chat` ise maliyeti `add_usage()` ile kaydeder (`:817`).
- Sonuç: test çağrıları ne günlük tavanı kontrol eder ne de `usage.json`'a yazılır; bütçe dışında token harcanabilir.

### 5.7 Anahtarın URL'de taşınması

- Google çağrısı `.../models/{model}:generateContent?key={key}` biçiminde anahtarı **query string**'e koyar (`tools/swarm_sim.py:472`).
- Model listesi de `?key={key}` kullanır (`:717`).
- Bu, anahtarın proxy/access log'larına düşme riskini artırır; başlık (`x-goog-api-key`) kullanılmıyor.

---

## 6. Yönetim tarafı: çoklu sağlayıcı, silme/düzenleme, kullanım/maliyet

### 6.1 Çoklu sağlayıcı listesi

- Sunucuda **21 sağlayıcı** tanımlı (`tools/swarm_sim.py:276-298`); çalışan sunucudan sayıldı: `providerCount=21` (**[R]**).
- Yerel bayraklı ikisi: `ollama`, `lmstudio` (**[R]**).
- Arayüz bunları çip ızgarası + select olarak gösterir (`apps/ops-floor/index.html:2929-2959`).
- `needs_base` olanlar `*` ile işaretlenir (`:2947`); yıldızın anlamı yalnız `title` ipucunda.
- Arama/filtreleme yok; 21 çip tek ızgarada.

### 6.2 Sağlayıcı ekleme / düzenleme / silme

**Yok.**

- `PROVIDERS` Python modülünde sabit bir sözlüktür (`tools/swarm_sim.py:276-298`).
- `do_POST` yalnız `/api/settings`, `/api/provider/models`, `/api/skills`, `/api/test`, `/api/chat`, `/approve` yollarını işler (`:683`, `:710`, `:736`, `:764`, `:773`, `:823`).
- `do_DELETE` yalnız `/api/skills` siler (`:671-678`).
- Arayüzde sağlayıcı kaydı için ekle/düzenle/sil düğmesi yok; yalnız seçim ve base URL override var (`apps/ops-floor/index.html:2929-2971`).
- Sağlayıcı başına kayıt (anahtar, model, son kullanım, sağlık) tutulmaz; tek aktif `provider/model/base_url/api_key` vardır (`tools/swarm_sim.py:398-414`).
- **[Ç] Geçiş davranışı:** Sağlayıcı değiştirilince base URL temizlenir (`apps/ops-floor/index.html:2967`) ama model ve anahtar alanları korunur; kaydetmede eski anahtar yeni sağlayıcıya taşınır (`tools/swarm_sim.py:690-695`). Sağlayıcı başına "son model" hatırlanmaz.

### 6.3 Kullanım / maliyet görünümü

| Gösterge | Veri kaynağı | Kapsam | Kanıt |
|---|---|---|---|
| Üst şerit "Maliyet" / "Token" | `state.cost`, `state.tokens` | Demo olayları **hariç**; yalnız gerçek `/api/chat` yanıtları | `apps/ops-floor/index.html:531-532`, `:1758-1760`, `:2028-2031` |
| "Maliyet nabzı" grafiği | Aynı `state.cost` | Kümülatif, model/sağlayıcı kırılımı yok | `:585-593`, `:2282` |
| Ayarlar durum satırı | `/api/settings.today_cost` | Yalnız **bugünkü toplam** | `apps/ops-floor/index.html:3021`; `tools/swarm_sim.py:409` |
| `usage.json` | `{date, cost}` | Sağlayıcı/model/token kırılımı yok | `tools/swarm_sim.py:384-395` |
| `/health` | `HUB.total` (bellek içi) | Toplam; UI bu ucu kullanmıyor | `tools/swarm_sim.py:590-592` |

- Fiyat tablosu yalnız dört model içerir: `gpt-4o-mini`, `gpt-4o`, `claude-3-5-haiku-latest`, `claude-sonnet-4-20250514` (`tools/swarm_sim.py:268-273`).
- Yapılandırılmış model `gemini-3.5-flash` tabloda yok → maliyet `$0.0000` kalır (`docs/STATE.md:37`; **[R]**: `today_cost=0.0`).
- Demo olayları UI maliyetine yazılmaz (`apps/ops-floor/index.html:1758-1760`), ancak `/health` demo üreticisinin maliyetini gösterebilir; iki sayaç farklı kaynaklardır.
- Sağlayıcı/model kırılımlı kullanım paneli **yok**; `docs/ADR-011-sunum-katmani.md:189` bunu hedef olarak listeliyor ("Maliyet nabzı — model kırılımı"), yani henüz uygulanmamış.

### 6.4 Rol / yetki

- Kullanıcı kimlik doğrulaması, oturum, rol veya yetki kontrolü **yok**. Tüm `/api/*` uçları kimliksiz çalışır (`tools/swarm_sim.py:587-830`).
- Varsayılan bağlanma adresi `127.0.0.1` (`:950`), bu iyi bir varsayılan; ancak `--host` ile değiştirilebilir (`:864`, `:950`) ve CORS `*` (`:583`).
- Katman/model kısıtı istemci tarafındadır: tier değeri doğrudan `/api/chat` gövdesinden alınır (`apps/ops-floor/index.html:3220`; `tools/swarm_sim.py:799`). Sunucu tarafında "bu ajan yalnız T1 kullanabilir" gibi bir politika yok.
- "Ajan rolü" (supervisor/planner/...) bir **iş rolüdür**, kullanıcı yetkisi değildir; ikisi karıştırılmamalı.
- Denetim kaydı (audit log) yok; ayar değişikliklerinin kim tarafından yapıldığı izlenemez.

### 6.5 "Aktif model" göstergesi

- HTML'de sabit: `<b id="model">T2 · Sonnet 5.5</b>` (`apps/ops-floor/index.html:533`).
- JavaScript'te `#model` öğesine yazan bir kod yok (grep: yalnız CSS ve tanım satırı).
- Gerçek model `gemini-3.5-flash` iken panel "Sonnet 5.5" gösteriyor; bu, ayar ekranındaki gerçek durumla çelişir.

---

## 7. Eksikler

Kullanıcının saydığı başlıklar ve denetimde bulunan ek eksikler:

| # | Yetenek | Bugünkü durum | Kanıt | Etki |
|---|---|---|---|---|
| 1 | **Ajan başına model** | Yok; yalnız 6 ajan → 3 katman, görev başına tek çağrı | `apps/ops-floor/index.html:3103-3110`, `:3208-3221`; `tools/swarm_sim.py:799-806` | Ajan bazlı maliyet/kalite ayrımı yapılamaz; "her ajana farklı model" senaryosu uygulanamaz |
| 2 | **Sağlayıcı kayıt defteri** | 21 sağlayıcı kod içinde sabit; ekle/düzenle/sil yok | `tools/swarm_sim.py:276-298`, `:671-678` | Yeni uç/anahtar eklemek kod değişikliği gerektirir; sağlayıcı başına ayar yok |
| 3 | **Offline model yöneticisi** | Ollama/LM Studio presetleri var; model listeleme/indirme/silme/sağlık yok; anahtar zorunlu | `tools/swarm_sim.py:287-288`, `:451-453`; **[R]** | Anahtarsız yerel kullanım mümkün değil; model yaşam döngüsü yönetilemiyor |
| 4 | **Anahtar kasası** | Tek anahtar, `config.json` içinde düz metin; Windows'ta chmod etkisiz; silme bozuk | `tools/swarm_sim.py:334-340`, `:690-695`; **[R]** | Anahtar diskte okunabilir; yanlışlıkla silinemez; rotasyon yok |
| 5 | **Rol / yetki** | Kimlik doğrulama, kullanıcı rolü, sunucu tarafı tier policy yok | `tools/swarm_sim.py:587-830`, `:799` | Aynı makinedeki herkes ayarları değiştirebilir; model/bütçe kısıtı uygulanamaz |
| 6 | **Model kataloğu / kalıcılık** | Uzak liste yalnız datalist; özel modeller localStorage; sunucuda katalog yok | `apps/ops-floor/index.html:3018`, `:3681-3690`; `tools/swarm_sim.py:398-414` | Her açılışta yeniden çekme; tarayıcılar arası tutarsızlık |
| 7 | **Kullanım / maliyet kırılımı** | Yalnız bugünkü toplam; sağlayıcı/model/token kırılımı yok; fiyat tablosu 4 model | `tools/swarm_sim.py:384-395`, `:268-273` | Gerçek maliyet görünmez; Gemini `$0` görünür |
| 8 | **Test ölçümü** | `/api/test` maliyeti `usage.json`'a yazılmaz, tavanı kontrol etmez | `tools/swarm_sim.py:764-771`, `:817` | Bütçe dışı harcama; test sonucu gerçek modeli yansıtmayabilir |
| 9 | **Model doğrulama** | Serbest metin; allowlist/format kontrolü yok | `apps/ops-floor/index.html:805-808` | Yanlış model ancak çağrıda fark edilir |
| 10 | **UI doğruluğu** | "Aktif model" sabit "T2 · Sonnet 5.5" | `apps/ops-floor/index.html:533` | Kullanıcı yanlış model bilgisi görür |
| 11 | **Sağlayıcı başına anahtar/model** | Tek `api_key` ve tek `model`; geçişte eski değerler korunur | `tools/swarm_sim.py:690-695`, `:398-414`; **[Ç]** | Sağlayıcı değişiminde yanlış anahtar/model gönderilebilir |

---

## 8. Doğrulama

### 8.1 Çalıştırılanlar

**(1) Gerçek yapılandırmanın salt-okunur okunması**

```powershell
python tools/swarm_sim.py serve --port 8799 --speed 2
Invoke-RestMethod -Uri 'http://127.0.0.1:8799/api/settings'
```

Özet çıktı (anahtar değeri yazdırılmadı):

```
provider=google  model=gemini-3.5-flash  base_url=""  has_key=true
tiers={}  daily_cap_usd=0.0  today_cost=0.0
providerCount=21
localFlags=ollama,lmstudio
```

Yorum: T1/T2/T3 boş → tüm ajanlar global modeli kullanır; günlük tavan sınırsız; gerçek anahtar mevcut.

**(2) 3D model listesi**

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8799/api/models'
```

Çıktı: `glbCount=23`; ilk kayıtlar `astronaut.glb`, `baby_animals_statuettes.glb`, `bb8.glb`.

**(3) Geçici profilde ayar API'si davranışı**

`USERPROFILE`/`HOME` geçici bir dizine ayarlanarak sunucu 8798'de çalıştırıldı; gerçek kullanıcı yapılandırmasına dokunulmadı.

| Adım | İstek | Sonuç |
|---|---|---|
| 1 | Boş profil → `GET /api/settings` | `provider=mock`, `has_key=false` |
| 2 | `POST /api/settings` `{provider:"ollama", model:"llama3.2"}` → `POST /api/test` | `{"ok":false,"error":"API anahtarı yok — Ayarlar'dan ekleyin"}` |
| 3 | `POST /api/settings` `{provider:"openai", model:"gpt-test", "api_key": "<geçici test değeri>"}` | `has_key=true`, `key_hint=••••1234` |
| 4 | `POST /api/settings` `{"clear_key":true}` | `has_key=true`, `key_hint=••••1234` — **değişmedi** |
| 5 | `config.json` içeriği | `api_key` düz metin olarak dosyada |

**(4) Windows'ta chmod davranışı**

```powershell
python -c "import os,stat,sys; p=sys.argv[1]; print(oct(stat.S_IMODE(os.stat(p).st_mode))); os.chmod(p,0o600); print(oct(stat.S_IMODE(os.stat(p).st_mode)))" <config.json>
```

Çıktı:

```
0o666
0o666
```

Yorum: `save_cfg()` içindeki `chmod(0o600)` Windows'ta modu değiştirmiyor.

**(5) Temizlik:** 8799 ve 8798 sunucuları `taskkill /T /F` ile kapatıldı; geçici profil dizini silindi. Denetim sırasında çalışma ağacında başka bir ajanın `docs/audit-server.md` dosyası göründü; ona dokunulmadı. Bu rapor `docs/audit-ui.md` olarak eklendi.

### 8.2 Çalıştırılmayanlar / doğrulanmayanlar

| Konu | Neden |
|---|---|
| `POST /api/provider/models` canlı çağrısı | Gerçek sağlayıcıya (Google) kullanıcının anahtarını göndermemek için çalıştırılmadı; bu bölümdeki bulgular kod okumasıdır **[K]** |
| Tarayıcıda görsel/DOM/erişilebilirlik testi | Bu oturumda tarayıcı aracı yok; tüm UI etkileşim iddiaları kod okumasına dayanır |
| Otomatik test paketi | `apps/` ve `tools/` altında `*test*.py`, `*.test.js`, `*.spec.js` bulunamadı; bu arayüz için tanımlı bir test komutu yok |
| Ollama/LM Studio gerçek uç testi | Yerel sunucu çalışmıyor; anahtar kontrolü ağ isteğinden önce hata verdiği için yalnız bu davranış doğrulandı |
| Ekran okuyucu / klavye turu | Araç yok; yalnız `aria-*` nitelikleri kod üzerinden incelendi |

---

## 9. Öncelikli öneriler

| Öncelik | Öneri | Gerekçe / kanıt |
|---|---|---|
| **P0** | `clear_key` hatasını düzelt: `clear_key` kontrolünü `api_key` varlığından bağımsız yap; silme için onay ve denetim kaydı ekle | **[R]** ile kanıtlandı; `tools/swarm_sim.py:690-695` |
| **P0** | Anahtar kasası: OS keychain (`keyring`) veya şifreli dosya; sağlayıcı başına anahtar; anahtarı URL yerine başlıkta gönder | `tools/swarm_sim.py:336`, `:472`, `:717` |
| **P0** | Yerel/offline sağlayıcılar için anahtarsız mod: `local` bayrağında anahtar kontrolünü atla, UI'da "anahtar gerekmez" göster | `tools/swarm_sim.py:287-288`, `:451-453`; **[R]** |
| **P1** | Ajan başına model: ajan detayında model seçimi; sunucuda ajan→model politikası ve allowlist; etkin modeli ajan kartında göster | `apps/ops-floor/index.html:2769-2830`; `tools/swarm_sim.py:799-806` |
| **P1** | Sağlayıcı kayıt defteri: CRUD + sağlayıcı başına `{base, keyRef, model, modelsCache, lastUsed}`; geçişte anahtar/model taşımayı bırak | `tools/swarm_sim.py:276-298`, `:398-414` |
| **P1** | Model kataloğunu sunucuda TTL'li cache'le; özel modelleri sağlayıcıya bağla ve kalıcı sakla; yetenek/fiyat metadata'sı ekle | `apps/ops-floor/index.html:3018`, `:3681-3690`; `tools/swarm_sim.py:710-734` |
| **P1** | Test akışını seçili modelle yap ve `add_usage()` ile ölçümle; tavan kontrolünü test için de uygula | `tools/swarm_sim.py:764-771`, `:817` |
| **P2** | "Aktif model" göstergesini gerçek `/api/settings` verisiyle güncelle veya kaldır | `apps/ops-floor/index.html:533` |
| **P2** | Kullanım/maliyet paneli: sağlayıcı/model/token kırılımı, bilinmeyen fiyatlar için "—" gösterimi | `tools/swarm_sim.py:384-395`, `:268-273`; `docs/ADR-011-sunum-katmani.md:189` |
| **P2** | Kimlik/rol/yetki: en azından yerel oturum + yönetici/izleyici ayrımı; tier politikasını sunucuda uygula | `tools/swarm_sim.py:587-830` |
| **P2** | UI netliği: LLM modeli ile 3D modelini ayrı adlandır; sağlayıcıya uygun placeholder; base URL'i placeholder yerine açık değer olarak göster | `apps/ops-floor/index.html:767-775`, `:806`, `:816` |

---

## Ek A — Okunan dosyalar

| Dosya | Satır | Ne için |
|---|---|---|
| `apps/ops-floor/index.html` | 3827 | Ayarlar modalı, model listesi, ajan detayı, maskot paneli, olay akışı |
| `apps/ops-floor/models/README.md` | 46 | 3D model ekleme akışı ve model/LLM ayrımı |
| `docs/STATE.md` | 48 | Mevcut sağlayıcı durumu, bilinen sınırlar |
| `tools/swarm_sim.py` | 969 | Sağlayıcı kataloğu, ayar API'si, anahtar saklama, model listesi, maliyet |
| `docs/MIMARI-UYGUNLUK-ANALIZI.md` | 28, 30 | Model Gateway ve governance olgunluk değerlendirmesi |
| `docs/ADR-011-sunum-katmani.md` | 189 | Planlanan "model kırılımı" görünümü |

## Ek B — Hızlı referans: kritik satırlar

| Ne | Satır |
|---|---|
| Ayarlar modalı | `apps/ops-floor/index.html:789-845` |
| Sağlayıcı seçimi / çipler | `apps/ops-floor/index.html:796-803`, `:2929-2959` |
| Model alanı / datalist | `apps/ops-floor/index.html:805-808` |
| Base URL / anahtar / limit / tier | `apps/ops-floor/index.html:814-830` |
| Kaydet / test / sil | `apps/ops-floor/index.html:839-842`, `:3033-3089`, `:3691-3698` |
| Ajan → tier eşlemesi | `apps/ops-floor/index.html:3103-3110` |
| Görev başına tek çağrı | `apps/ops-floor/index.html:3208-3221` |
| Ajan detayı | `apps/ops-floor/index.html:2769-2830` |
| Maskot 3D modeli | `apps/ops-floor/index.html:2388`, `:2398-2425` |
| Sağlayıcı kataloğu | `tools/swarm_sim.py:276-298` |
| Anahtar zorunluluğu | `tools/swarm_sim.py:451-453` |
| Model listesi ucu | `tools/swarm_sim.py:710-734` |
| Ayar kaydetme / clear_key | `tools/swarm_sim.py:683-708` (özellikle `:690-695`) |
| Config yolu / chmod | `tools/swarm_sim.py:262-265`, `:334-340` |
| Kullanım sayacı | `tools/swarm_sim.py:384-395`, `:817` |
| Test ucu | `tools/swarm_sim.py:764-771` |
| Sohbet ucu / tier | `tools/swarm_sim.py:773-821` (özellikle `:799`) |

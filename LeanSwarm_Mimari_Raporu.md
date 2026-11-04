# LeanSwarm — Fiyat/Performans Odaklı Ajan Sürüsü Mimarisi
## İskelet mimari, modüller, eklenti sistemi, derleme/dağıtım ve uygulama planı

**Sürüm:** 1.0 · **Tarih:** 4 Kasım 2026 · **Dil:** Türkçe
**Dayanak:** Yüklenen üç rapor (`SwarmModel.md`, `AI_Swarm_Teknik_Raporu.md`, `yapay-zeka-otonom-ajan-sistemleri-raporu.md`) sentezlenmiştir.

> **Doğrulama notu (önemli).** Model adları, fiyatlar ve benchmark iddiaları yüklediğin raporlardan alınmıştır; bu oturumda yeniden doğrulanmamıştır. Fiyatlar için birincil kaynak olarak `AI_Swarm_Teknik_Raporu.md` (30 Ekim 2026, resmî fiyat sayfaları) esas alındı. `SwarmModel.md` içindeki bazı iddialar (ör. "MCP-Atlas ilk grup", $0.10–0.15 aralıkları) kaynaksız olduğundan **ikincil** sayıldı. Üretime almadan önce fiyat ve model kimliklerini sağlayıcı sayfalarından kontrol et; kesin model seçimini §11'deki kendi eval setinle yap.

---

## 0. Yönetici özeti

**LeanSwarm**, "en iyi modeli her yerde kullan" yaklaşımının tersine çalışan bir sürüdür: **her adımı yapabilecek en ucuz katmanda başlatır, ucuz ve bağımsız bir doğrulayıcıyla kontrol eder, yalnızca doğrulama başarısız olursa bir üst katmana çıkar.**

Beş temel karar:

1. **Kademeli model yönlendirme (cascade routing):** T0 (deterministik kod) → T1 (ucuz) → T2 (işçi) → T3 (planlayıcı) → T4 (nadir, pahalı).
2. **Önce tek ajan:** Sürü, yalnızca bağımsız ve paralelleştirilebilir alt görev varsa devreye girer (Swarm Gate).
3. **Küçük kadro:** 5 rol (Coordinator, Worker havuzu, Reviewer, Memory Curator, Policy Engine — sonuncusu LLM değil kod).
4. **Bütçe birinci sınıf vatandaştır:** Her görevin $ / token / süre / derinlik limiti vardır; aşıldığında otomatik düşürme veya insan onayı.
5. **Sıkı kontrol, ucuz doğrulama:** LangGraph ile akışı sen çizersin; doğrulama önce şema/test/lint (ücretsiz), en son LLM-judge (ücretli).

**Tahmini sonuç (varsayımlar §5'te):** Aynı görev setinde, tamamen frontier modelle çalışan tek ajana göre görev başı maliyet **≈ %85–90 düşük** (≈ $1,95 → ≈ $0,20–0,28), naif "herkes herkesle konuşur" sürüsüne göre ≈ %75–83 düşük. Kalite eşitliği otomatik değildir; §11'deki eval kapısıyla **ölçülerek** korunur.

---

## 1. "En iyi" ne demek? Hedefler ve ölçüt

| Hedef | Ölçüt | İlk hedef değer |
|---|---|---|
| Maliyet | Başarılı görev başı maliyet (CPST) | ≤ $0,30 (orta zorlukta görev) |
| Kalite | Doğrulayıcıyı ilk geçişte geçme oranı | ≥ %80 |
| Verim | Frontier (T4) kullanım oranı | ≤ %10 görev |
| Hız | p95 uçtan uca süre | ≤ 90 sn (basit), ≤ 8 dk (karmaşık) |
| Güvenilirlik | Kurtarılamayan hata oranı | ≤ %2 |
| Güvenlik | Onaysız L3 eylem sayısı | 0 |
| Gözlemlenebilirlik | İzlenen model çağrısı oranı | %100 |

**CPST (Cost Per Successful Task)** ana metriktir: toplam harcama ÷ doğrulanmış başarılı görev. Ucuz ama sık başarısız olan sistem iyi görünse de CPST'de kaybeder.

---

## 2. Tasarım ilkeleri

1. **Deterministik önce (T0).** Sayaç, zamanlayıcı, regex, SQL, şema doğrulama, dosya biçimlendirme, izin kontrolü → normal kod. LLM'ye gitmez.
2. **Tek ajan önce.** Basit/orta işi tek worker çözer. Sürü karmaşıklığı (iletişim, bağlam tekrarı) yalnızca kazanç kanıtlandığında eklenir.
3. **Ucuzdan pahalıya kademe.** Başarısızlık = yükselme sinyali; "zor görünüyor" tahmini tek başına yükselme sebebi değildir.
4. **Doğrulama modelden bağımsızdır.** Test, şema, lint, kaynak kontrolü önce; LLM-judge son çare ve **farklı sağlayıcıdan**.
5. **Bağlam diyeti.** Ajanlar arası transkript değil **artefakt referansı + kısa özet** taşınır (token maliyetinin ana kaynağı budur).
6. **Önbellek-dostu prompt.** Sabit önek (sistem + araç şemaları + SOP) başa; değişen kısım sona. Böylece prompt caching kazancı maksimum olur.
7. **Bütçe zorunludur.** Limitsiz döngü yoktur: `max_steps`, `max_depth`, `max_usd`, `max_wall_s`.
8. **Sağlayıcıdan bağımsız.** Tek bir model kapısı (gateway); fallback aynı yetenek sınıfında yapılır, sessizce kaliteye düşülmez.
9. **LLM yan etkiyi doğrudan üretmez.** Model tipli `ActionProposal` üretir; Policy Engine doğrular; yan etkiyi araç katmanı uygular.
10. **Ölç, sonra optimize et.** Router kuralları önce elle, sonra gerçek `model_usage` verisiyle kalibre edilir.

---

## 3. Mimari

### 3.1 Mantıksal diyagram

```text
                          ┌──────────────────────────────┐
   İstemciler ──────────▶ │  API (FastAPI) + Auth + WS   │
 (Web/CLI/Bot/REST)       └──────────────┬───────────────┘
                                         │  task.created
                                         ▼
                          ┌──────────────────────────────┐
                          │     ORKESTRATÖR (LangGraph)  │
                          │  gate → plan → dispatch →    │
                          │  work(xN) → verify → review  │
                          │  → finalize        [HITL]    │
                          └───┬─────────┬─────────┬──────┘
                              │         │         │
              ┌───────────────▼──┐  ┌───▼─────┐  ┌▼──────────────┐
              │ MODEL GATEWAY    │  │ POLICY  │  │ TOOL GATEWAY  │
              │ router+cascade   │  │ ENGINE  │  │ MCP + builtin │
              │ cache+budget     │  │ L0..L4  │  │ + SANDBOX     │
              │ LiteLLM          │  └────┬────┘  └──────┬────────┘
              └───────┬──────────┘       │              │
                      │                  │              │
        ┌─────────────▼──────────────────▼──────────────▼────────┐
        │   OLAY OMURGASI (NATS JetStream) + OUTBOX              │
        └─────────────┬──────────────────────────────┬───────────┘
                      │                              │
          ┌───────────▼───────────┐     ┌────────────▼────────────┐
          │ PostgreSQL + pgvector │     │ Redis · MinIO(S3)       │
          │ görev·olay·bellek·    │     │ cache · rate limit ·    │
          │ kullanım·denetim      │     │ artefakt deposu         │
          └───────────┬───────────┘     └─────────────────────────┘
                      │
          ┌───────────▼─────────────────────────────────────────┐
          │ GÖZLEMLENEBİLİRLİK: OTel · Langfuse · Prometheus ·  │
          │ Grafana · Cost Report · Eval Runner                 │
          └─────────────────────────────────────────────────────┘
```

### 3.2 Neden bu topoloji?

| Seçenek | Maliyet | Kontrol | Risk | Karar |
|---|---|---|---|---|
| Tek frontier ajan | Çok yüksek | Yüksek | Bağlam şişmesi | ✗ |
| Serbest ağ (herkes herkesle) | Yüksek (iletişim katlanır) | Düşük | Döngü, tutarsızlık | ✗ |
| Rol tabanlı hızlı ekip (CrewAI Crew) | Orta | Orta | Akış model elinde | Prototip için |
| **Hiyerarşik supervisor + kademeli yönlendirme (LeanSwarm)** | **Düşük** | **Yüksek** | Tasarım disiplini ister | **✓** |

### 3.3 Çerçeve kararı

- **Orkestrasyon:** LangGraph (state graph, checkpoint, interrupt, replay, paralel `Send`).
- **Neden CrewAI değil:** Rol metaforu güçlü, fakat üretimde akışı açık çizmek ve checkpoint'lemek için Flow'a yaslanmak gerekir; LangGraph bunu doğrudan verir.
- **Neden AutoGen değil:** Bakım modunda; yeni projede Microsoft Agent Framework'e bakılır.
- **.NET/Azure zorunluysa:** Aynı mimari Microsoft Agent Framework ile kurulabilir; gateway, policy, memory ve tool katmanları çerçeveden bağımsızdır (bu yüzden ayrı modüllerdir).

---

## 4. Model katmanları (Tier) ve atama

### 4.1 Katman tanımı

| Katman | Rol | Örnek modeller (aday) | Fiyat (girdi/çıktı, 1M token) |
|---|---|---|---|
| **T0** | Deterministik kod | Python/SQL/regex/kural | $0 |
| **T1 — Ucuz** | Sınıflandırma, özet, biçim, ayıklama, basit araç çağrısı, hafıza özetleme | Claude Haiku 5.5; GLM-5.3-Flash; DeepSeek V4.1 Flash; (yerel) Qwen3 32B | Haiku 5.5: $0,10'dan / $0,50'dan · diğerleri raporda $0,10–0,15 (doğrula) |
| **T2 — İşçi** | Varsayılan worker: kod, analiz, yazım, araç döngüleri, reviewer | GPT-6.1 Sol; Claude Sonnet 5.5; GLM-5.3 | $2 / $10 |
| **T3 — Planlayıcı** | Plan, zor kod, uzun ufuklu işler | Claude Opus 5.5 | $4 / $20 |
| **T4 — Nadir** | Yalnızca T3 başarısız/çok yüksek risk + bütçe onayı | GPT-6 Astra; Claude Fable 5.1; Gemini 4 Argon | $10 / $50 (Astra); Argon tanıtım $2/$10 → 1 Aralık'ta $4/$20 |
| **V — Görsel** | Ekran/arayüz/computer-use | GPT-6.1 Terra | $1 / $5 |
| **J — Bağımsız hakem** | LLM-judge (yalnızca gerekirse) | Worker'dan **farklı sağlayıcı**, T2 sınıfı | $2 / $10 |

> Gözlem: Raporlara göre Opus 5.5 ($4/$20), Astra'nın ($10/$50) çok altında; bu yüzden planlayıcı/uzun kod için **T3 = Opus 5.5**, Astra yalnızca "T3 de yetmedi" durumuna bırakıldı.
> Gemini 3.8 Flash ($0,75/$3,75 tanıtım; 31 Aralık sonrası $1,50/$7,50) T1'den pahalı, T2'den ucuz; **T1.5** olarak hacimli diyalog/ajan işleri için opsiyoneldir.

### 4.2 Rol → varsayılan katman

| Ajan / adım | Varsayılan | Yükselme yolu | Not |
|---|---|---|---|
| Swarm Gate (karmaşıklık) | T0 + T1 | — | Önce kural, belirsizse T1 |
| Coordinator | T2 | T3 | Çoğu görevde sadece dağıtım/birleştirme |
| Planner | T3 (veya T2 basit görevde) | T4 | Tek pahalı "düşünme" noktası |
| Worker (basit) | T1 | T2 | Biçim, özet, çıkarım |
| Worker (standart) | T2 | T3 | Kod/analiz |
| Worker (zor/uzun kod) | T3 | T4 | Yalnızca router "zor" derse |
| Reviewer | T0 doğrulayıcılar → gerekirse J | T3 | LLM-judge ≠ worker sağlayıcısı |
| Memory Curator | T1 | T2 | Toplu/arka plan, batch fiyatı varsa kullan |
| Policy Engine | T0 | — | **LLM yok** |
| Görsel/GUI | V | T4 | Yalnızca ekran gerektirirse |

### 4.3 Yerel/ücretsiz katman (opsiyonel T1-Local)

Tek GPU'lu makinede vLLM/Ollama üzerinde Qwen3 32B gibi bir model: özetleme, sınıflandırma, ayıklama, gizli veri içeren (dışarı çıkmaması gereken) adımlar için. Görev başı maliyet yaklaşık sıfıra iner; kalite sınırı nedeniyle **yalnızca doğrulayıcıyla** kullanılır. İç ağdaki OpenAI uyumlu bir gateway (ör. kurum içi LLM geçidi) aynı mantıkla T1/T2 olarak tanıtılabilir; LiteLLM'de yalnızca `api_base` değişir (bkz. §9.1).

---

## 5. Maliyet modeli

### 5.1 Varsayılan "standart görev"

"Orta zorlukta görev" = 10 model adımı. Tüm sayılar **varsayımdır**; kendi iş yükünle yeniden hesapla (§5.4).

**A) Tek ajan, tamamen T4 (GPT-6 Astra $10/$50):** 10 adım × (12k giriş + 1,5k çıkış) = 120k giriş + 15k çıkış
→ 120k×$10/M = $1,20 + 15k×$50/M = $0,75 = **$1,95**

**B) Tek ajan, tamamen T2 ($2/$10):** $0,24 + $0,15 = **$0,39**

**C) Naif sürü (5 ajan, her biri tam bağlamı taşır, ≈3× token, T2):** 360k giriş + 45k çıkış → $0,72 + $0,45 = **$1,17**

**D) LeanSwarm (kademeli):**

| Adım | Katman | Giriş / Çıkış | Hesap | Maliyet |
|---|---|---|---|---|
| 4× basit adım (sınıflandır/özetle/biçimle) | T1 (Haiku 5.5) | 32k / 3,2k | 32k×0,10/M + 3,2k×0,50/M | $0,0048 |
| 3× worker | T2 ($2/$10) | 36k / 4,5k | 0,072 + 0,045 | $0,1170 |
| 1× plan | T3 (Opus 5.5 $4/$20) | 15k / 2k | 0,060 + 0,040 | $0,1000 |
| 1× review (farklı sağlayıcı) | T2 | 12k / 1k | 0,024 + 0,010 | $0,0340 |
| Yükselme: görevlerin %10'unda 1× T4 | T4 (Astra) | 15k / 2k → ×0,10 | (0,150 + 0,100) × 0,10 | $0,0250 |
| **Toplam (önbelleksiz)** | | | | **≈ $0,28** |

**D′) Prompt caching ile** (T2/T3 girişinin %60'ı önbellekten, okuma fiyatı normalin ≈%10'u varsayımıyla):
T2 worker giriş 0,072→0,0331 · plan giriş 0,060→0,0276 · review giriş 0,024→0,0110 → toplam **≈ $0,20**.

### 5.2 Özet tablo (1.000 görev)

| Senaryo | Görev başı | 1.000 görev | A'ya göre tasarruf |
|---|---:|---:|---:|
| A — Tek ajan, T4 | $1,95 | $1.950 | — |
| B — Tek ajan, T2 | $0,39 | $390 | %80 |
| C — Naif sürü, T2 | $1,17 | $1.170 | %40 |
| **D — LeanSwarm** | **$0,28** | **$281** | **%86** |
| **D′ — LeanSwarm + cache** | **$0,20** | **$197** | **%90** |

### 5.3 Dikkat: tasarrufun şartları

- Kalite, **doğrulayıcı geçiş oranı** korunduğu sürece geçerlidir. İlk geçiş oranı düşerse yükselme/yeniden deneme maliyeti tasarrufu eritir.
- Sürü, bağlam taşıma disiplini olmadan (C senaryosu) B'den **daha pahalı** olabilir.
- Araç çağrısı, arama, sandbox ve altyapı maliyetleri bu tabloya dahil değildir.

### 5.4 Kendi maliyetini hesaplama (şablon)

```text
Görev maliyeti = Σ_adım [ (girdi_tok − önbellek_tok)×p_in + önbellek_tok×p_cache + çıktı_tok×p_out ] / 1e6
CPST = Σ tüm görev maliyetleri / başarılı (doğrulanmış) görev sayısı
Yükselme maliyeti = P(T_n başarısız) × maliyet(T_{n+1})
```
`model_usage` tablosu (§8) bu hesabı otomatik üretir; `cost_report` modülü haftalık özet çıkarır.

### 5.5 Maliyet düşürme kaldıraçları (etki sırasıyla)

| # | Kaldıraç | Beklenen etki | Zorluk |
|---|---|---|---|
| 1 | Kademeli yönlendirme + doğrulayıcı | Çok yüksek | Orta |
| 2 | Önce tek ajan (Swarm Gate) | Yüksek | Düşük |
| 3 | Bağlam diyeti (artefakt referansı) | Yüksek | Orta |
| 4 | Prompt caching (sabit önek) | Orta–yüksek | Düşük |
| 5 | Batch/arka plan işlerinde batch fiyatı | Orta | Düşük |
| 6 | T0'a taşıma (kodla çözülebilen adımlar) | Orta | Düşük |
| 7 | Yerel/iç gateway T1 | Orta | Orta |
| 8 | Çıktı uzunluğu sınırı + yapılandırılmış çıktı | Orta | Düşük |
| 9 | Semantik/tam eşleşme yanıt önbelleği | Değişken | Orta |
| 10 | Öğrenen router (bandit) | Orta | Yüksek |

---

## 6. Ajan kadrosu, Swarm Gate ve kademeli akış

### 6.1 Kadro (5 rol — fazlası kaliteyi kendiliğinden artırmaz)

| Rol | Görev | Katman | Yetki | Token bütçesi (öneri) |
|---|---|---|---|---|
| **Coordinator** | Görevi alır, Gate'i çalıştırır, sonuçları birleştirir | T2 | L1 (öner) | ≤ 8k giriş/çağrı |
| **Planner** | Alt görev grafiği, bağımlılık, risk etiketi | T3 (basitte T2/T0) | L1 | ≤ 15k giriş |
| **Worker (havuz)** | Alt görevi yapar; araç kullanır | T1/T2/T3 (router) | L1–L2, sandbox | ≤ 12k giriş/adım |
| **Reviewer** | Önce ücretsiz doğrulayıcılar; gerekirse bağımsız LLM-judge | T0 → J | L0 (salt okunur) | ≤ 10k giriş |
| **Memory Curator** | Doğrulanmış sonuçlardan kalıcı özet/ilişki | T1 | Sınırlı bellek yazma | Arka plan/batch |
| **Policy Engine** | Yetki, bütçe, onay, risk | **T0 (kod)** | Nihai karar | — |

Ek roller (Security Reviewer, World Director/Game Master, GUI ajanı) **eklenti** olarak gelir; çekirdek kadroya eklenmez (§10).

### 6.2 Swarm Gate — "sürü gerçekten gerekli mi?"

Gate, sürü karmaşıklığına girmeden önce çalışır. Önce T0 kuralları, belirsizse T1 sınıflandırması:

```text
1. Görev tek adımda/tek araçla çözülebilir mi?                → single
2. Tahmini adım ≤ 6 ve alt görevler birbirine bağımlı mı?     → single (sıralı worker)
3. ≥ 2 bağımsız alt görev var ve her biri ≥ ~3k token iş mi?   → swarm (paralel fan-out)
4. Yüksek riskli yan etki (L3) içeriyor mu?                    → onay kapısı etkin
5. Bütçe tahmini max_usd'nin %60'ını aşıyor mu?               → daha ucuz plan iste / insana sor
```

Paralel fan-out yalnızca kazanç kanıtlıysa açılır; çünkü her ek ajan bağlam yükleme maliyeti ve koordinasyon gecikmesi getirir. İlk sürümde **eşzamanlı worker ≤ 4**.

### 6.3 Akış (görev yaşam döngüsü)

```text
task.created
  → GATE (T0/T1)             : mode = single | swarm
  → PLAN (T3|T2|T0)          : alt görev grafiği (single'da LLM'siz tek düğüm)
  → DISPATCH                 : bağımlılığı hazır olanları Send ile paralel başlat
  → WORK  × N (cascade)      : her adım: router → model → doğrulayıcı → (yeniden dene | yüksel)
  → JOIN                     : hazır olan yeni alt görev var mı? → DISPATCH
  → VERIFY (görev düzeyi)    : şema/test/lint/kaynak/diff-boyutu
  → REVIEW (gerekirse J)     : yalnızca risk yüksekse ya da ücretsiz doğrulayıcı yetmediyse
  → HUMAN GATE (gerekirse)   : L3 eylem veya bütçe aşımı → interrupt
  → FINALIZE                 : artefakt + rapor + maliyet özeti
  → MEMORY (arka plan)       : doğrulanmışsa kalıcı özet
```

### 6.4 Kademeli yönlendirme (cascade) kuralları

1. **Başlangıç katmanı** router'dan gelir (§9.1.2); `routing.yaml` iş türüne göre taban katmanı verir.
2. **Doğrulayıcı** adım çıktısını kontrol eder (ücretsizden pahalıya).
3. Başarısızsa: aynı katmanda **geri bildirimle bir kez yeniden dene** (`retries_per_tier: 2` toplam deneme).
4. Hâlâ başarısızsa **bir üst katmana** çık. Katman atlama yok.
5. T4 yalnızca: (a) T3 başarısız **ve** (b) Coordinator onayı **ve** (c) bütçe kalmışsa.
6. Bütçenin %30'u altına düşülürse T4 kapanır, T3 → T2'ye indirilir; çıktı "düşük güven" etiketiyle insana gider.
7. Fallback (sağlayıcı kesintisi) **aynı katmanın** ikinci deployment'ına yapılır; katman sessizce düşürülmez.

### 6.5 Bağlam diyeti (ajanlar arası veri)

- Ajanlar birbirine **tam transkript** göndermez. Gönderilen: `{artifact_uri, 3–8 satır özet, açık sorular, doğrulayıcı sonucu}`.
- Büyük çıktılar (kod, rapor, veri) MinIO/S3'e yazılır; mesajda yalnızca `uri + checksum` taşınır.
- Worker bağlamı: sabit önek (cache'lenir) + alt görev tanımı + yalnızca bağımlı olduğu artefaktların özeti.
- Hafıza geri çağırma en fazla `k=5` kayıt / ≤ 1.500 token.

---

## 7. Orkestratör iskeleti (LangGraph)

> Aşağıdaki kod **iskelettir**: yapıyı ve sorumluluk sınırlarını gösterir. LangGraph sürümünü sabitle ve API ayrıntılarını (özellikle `Send`, `interrupt`, `PostgresSaver`) kurulu sürümün belgesiyle doğrula.

```python
# src/leanswarm/orchestrator/state.py
from operator import add
from typing import Annotated, Literal, TypedDict

class Budget(TypedDict):
    max_usd: float
    max_steps: int
    max_wall_s: int
    max_depth: int

class SubTask(TypedDict):
    id: str
    goal: str
    kind: str                       # classify|summarize|code_edit|analysis|plan|...
    risk: Literal["low", "med", "high"]
    deps: list[str]

class SwarmState(TypedDict, total=False):
    task_id: str
    tenant_id: str
    goal: str
    budget: Budget
    mode: Literal["single", "swarm"]
    plan: list[SubTask]
    subtask: SubTask                              # Send ile worker'a geçer
    results: Annotated[list[dict], add]           # {subtask_id, artifact_uri, summary, verdict}
    spent_usd: Annotated[float, add]
    steps: Annotated[int, add]
    replans: int
    verdict: dict
    needs_human: bool
    final: dict
```

```python
# src/leanswarm/orchestrator/graph.py
from langgraph.graph import END, START, StateGraph
from langgraph.types import Send, interrupt
from .state import SwarmState

def build_graph(deps):
    """deps: gateway, policy, tools, verifiers, memory, events, clock"""
    g = StateGraph(SwarmState)

    # ---- düğümler -------------------------------------------------------
    async def gate(state):
        mode = await deps.gate.decide(state["goal"], state["budget"])   # T0 → T1
        return {"mode": mode}

    async def plan(state):
        if state["mode"] == "single":                                    # LLM'siz tek düğüm
            sub = {"id": "t1", "goal": state["goal"], "kind": "auto", "risk": "low", "deps": []}
            return {"plan": [sub]}
        plan, cost = await deps.agents.planner(state)                    # T3 (veya T2)
        replans = state.get("replans", 0) + (1 if state.get("verdict") else 0)   # verify'dan dönüşse say
        return {"plan": plan, "spent_usd": cost, "steps": 1, "replans": replans}

    async def work(state):
        sub = state["subtask"]
        deps.policy.assert_budget(state)                                 # aşılırsa BudgetExceeded
        out = await deps.agents.worker(sub, state)                       # içeride cascade
        return {"results": [out.result], "spent_usd": out.cost, "steps": out.steps}

    async def join(state):
        return {}                                                        # paralel dalların birleşim noktası

    async def verify(state):
        verdict = await deps.verifiers.run_task_level(state)             # ücretsizden pahalıya
        return {"verdict": verdict}

    async def review(state):
        verdict = await deps.agents.reviewer(state)                      # J: farklı sağlayıcı
        return {"verdict": verdict}

    async def human_gate(state):
        decision = interrupt({                                           # checkpoint + bekle
            "reason": state.get("needs_human_reason", "approval"),
            "spent_usd": state.get("spent_usd", 0),
            "proposal": state.get("verdict"),
        })
        return {"needs_human": False, "verdict": {**state["verdict"], "human": decision}}

    async def finalize(state):
        final = await deps.agents.coordinator.finalize(state)
        await deps.events.publish("task.completed", {"task_id": state["task_id"]})
        return {"final": final}

    for name, fn in [("gate", gate), ("plan", plan), ("work", work), ("join", join),
                     ("verify", verify), ("review", review),
                     ("human_gate", human_gate), ("finalize", finalize)]:
        g.add_node(name, fn)

    # ---- kenarlar -------------------------------------------------------
    def fan_out(state):
        done = {r["subtask_id"] for r in state.get("results", [])}
        ready = [t for t in state["plan"]
                 if t["id"] not in done and all(d in done for d in t["deps"])]
        if not ready:
            return "verify"
        return [Send("work", {**state, "subtask": t}) for t in ready[: deps.cfg.max_parallel]]

    def after_verify(state):
        v = state["verdict"]
        if state.get("needs_human") or deps.policy.over_budget(state):
            return "human_gate"
        if v["ok"]:
            return "review" if v.get("needs_judge") else "finalize"
        if state.get("replans", 0) < 1:
            return "plan"                                                 # tek yeniden planlama hakkı
        return "human_gate"

    g.add_edge(START, "gate")
    g.add_edge("gate", "plan")
    g.add_conditional_edges("plan", fan_out, ["work", "verify"])
    g.add_edge("work", "join")
    g.add_conditional_edges("join", fan_out, ["work", "verify"])
    g.add_conditional_edges("verify", after_verify, ["review", "finalize", "plan", "human_gate"])
    g.add_edge("review", "finalize")
    g.add_edge("human_gate", "finalize")
    g.add_edge("finalize", END)
    return g
```

```python
# src/leanswarm/orchestrator/runtime.py
from langgraph.checkpoint.postgres import PostgresSaver

def run(task, deps, db_url):
    with PostgresSaver.from_conn_string(db_url) as cp:
        cp.setup()
        app = build_graph(deps).compile(checkpointer=cp)
        cfg = {"configurable": {"thread_id": task.id}}          # görev = thread; kaldığı yerden devam
        return app.invoke(task.initial_state(), config=cfg)
```

**Tasarım notları**

- `join` düğümü, aynı süper-adımdaki paralel `work` dallarının tamamı bitince **bir kez** çalışır; yeni hazır alt görevler yalnızca burada dağıtılır (çift dağıtımı önler).
- `human_gate`, `interrupt` ile durumu checkpoint'ler; onay geldiğinde aynı `thread_id` ile devam edilir (Command ile resume).
- Replan hakkı **1** ile sınırlıdır; sonsuz plan–doğrula döngüsünü engeller.
- `assert_budget` ve `over_budget`, kontrolün modelin kararına bırakılmadığı yerlerdir.

---

## 8. Veri modeli, olaylar ve API

### 8.1 Çekirdek şema (PostgreSQL)

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'free', status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  parent_task_id UUID REFERENCES tasks(id),
  goal TEXT NOT NULL,
  mode TEXT CHECK (mode IN ('single','swarm')),
  status TEXT NOT NULL DEFAULT 'queued',        -- queued|running|waiting_human|done|failed|cancelled
  budget JSONB NOT NULL,                        -- max_usd, max_steps, max_wall_s, max_depth
  spent_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), finished_at TIMESTAMPTZ
);

CREATE TABLE task_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id),
  subtask_id TEXT NOT NULL, role TEXT NOT NULL, kind TEXT NOT NULL,
  tier TEXT NOT NULL, attempt INT NOT NULL DEFAULT 1, escalated BOOLEAN NOT NULL DEFAULT false,
  verdict JSONB, artifact_uri TEXT, trace_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(), finished_at TIMESTAMPTZ
);

CREATE TABLE model_usage (                      -- CPST ve router kalibrasyonu buradan
  id BIGSERIAL PRIMARY KEY,
  step_id UUID REFERENCES task_steps(id), task_id UUID REFERENCES tasks(id),
  tenant_id UUID NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, tier TEXT NOT NULL,
  input_tokens INT NOT NULL, cached_tokens INT NOT NULL DEFAULT 0, output_tokens INT NOT NULL,
  cost_usd NUMERIC(12,6) NOT NULL, latency_ms INT NOT NULL,
  verified_ok BOOLEAN,                          -- doğrulayıcı sonucu (öğrenen router için)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON model_usage (tenant_id, created_at);
CREATE INDEX ON model_usage (tier, model, created_at);

CREATE TABLE tool_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), step_id UUID REFERENCES task_steps(id),
  tool_id TEXT NOT NULL, args_hash TEXT NOT NULL, side_effect TEXT NOT NULL,
  status TEXT NOT NULL, result_ref TEXT, duration_ms INT, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), task_id UUID REFERENCES tasks(id),
  action JSONB NOT NULL, level TEXT NOT NULL, approver TEXT, decision TEXT,
  expires_at TIMESTAMPTZ, decided_at TIMESTAMPTZ
);

CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, scope TEXT NOT NULL DEFAULT 'tenant',    -- private|task|tenant
  kind TEXT NOT NULL CHECK (kind IN ('episodic','semantic','procedural')),
  content TEXT NOT NULL, source_event_id UUID, confidence REAL NOT NULL DEFAULT 0.5,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(), valid_until TIMESTAMPTZ,
  embedding VECTOR(1024), tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED
);
CREATE INDEX ON memories USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON memories USING gin (tsv);

CREATE TABLE events (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, type TEXT NOT NULL, payload JSONB NOT NULL,
  schema_version INT NOT NULL DEFAULT 1, correlation_id UUID, idempotency_key TEXT UNIQUE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(), published BOOLEAN NOT NULL DEFAULT false  -- outbox
);

CREATE TABLE router_stats (                     -- bandit/kalibrasyon özeti (saatlik)
  kind TEXT, tier TEXT, model TEXT, n INT, ok INT, avg_cost NUMERIC(12,6), p95_ms INT,
  window_start TIMESTAMPTZ, PRIMARY KEY (kind, tier, model, window_start)
);

CREATE TABLE audit_logs (                       -- ekleme-yalnız; UPDATE/DELETE izni yok
  id BIGSERIAL PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT,
  policy_result TEXT, detail JSONB, at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Çok kiracılılık için tüm tablolarda `tenant_id` + PostgreSQL **Row-Level Security** politikası önerilir.

### 8.2 Olay zarfı ve konular

```json
{
  "event_id": "uuid", "tenant_id": "uuid", "type": "step.completed",
  "schema_version": 1, "occurred_at": "2026-11-04T10:00:00Z",
  "correlation_id": "task-uuid", "idempotency_key": "task-uuid:t3:attempt2",
  "payload": { "tier": "T2", "cost_usd": 0.0041, "verdict": "ok" }
}
```

Konular: `ls.task.created|completed|failed` · `ls.step.started|completed|escalated` · `ls.budget.soft_hit|hard_hit` · `ls.approval.requested|decided` · `ls.memory.write_requested`.

**Outbox deseni:** Olay önce `events` tablosuna iş verisiyle aynı transaction'da yazılır, ayrı bir yayıncı NATS'a gönderir. Tüketiciler **idempotent** olmalıdır (at-least-once teslim).

### 8.3 API (v1)

```text
POST   /api/v1/tasks                      {goal, profile?, budget?}      → 202 {task_id}
GET    /api/v1/tasks/{id}                 durum, harcama, plan, adımlar
GET    /api/v1/tasks/{id}/artifacts       artefakt listesi (imzalı URL)
POST   /api/v1/tasks/{id}/cancel
POST   /api/v1/approvals/{id}/decision    {decision: approve|reject, note}
GET    /api/v1/usage?from=&to=&group=tier|model|task   maliyet raporu
GET    /api/v1/plugins                    yüklü eklentiler ve durumları
WS     /api/v1/tasks/{id}/live            adım/maliyet/onay akışı
```

---

## 9. Modüller (derleme birimleri)

Her modül kendi paketinde, **tek sorumlulukla** ve arayüz (Protocol) üzerinden bağlanır; böylece çerçeve/sağlayıcı değişimi yerel kalır.

| # | Modül | Sorumluluk | Bağımlılık |
|---|---|---|---|
| M1 | `gateway` | Router, cascade, önbellek, bütçe, fiyatlama, LiteLLM istemcisi | LiteLLM, Redis |
| M2 | `orchestrator` | LangGraph grafı, Gate, fan-out, checkpoint | M1, M3, M4, M5 |
| M3 | `policy` | Yetki L0–L4, onay, bütçe kuralları | PostgreSQL |
| M4 | `tools` | Araç kaydı, MCP istemcisi, sandbox çalıştırıcı | M3 |
| M5 | `verify` | Doğrulayıcı zinciri (ücretsizden pahalıya) | M1 (yalnız J için) |
| M6 | `memory` | Yazma politikası, hibrit geri çağırma, sıkıştırma | PostgreSQL |
| M7 | `events` | NATS köprüsü, outbox, tüketiciler | NATS |
| M8 | `plugins` | Manifest, yükleyici, kancalar, izin | M3 |
| M9 | `obs` | OTel, Langfuse, Prometheus, maliyet raporu | — |
| M10 | `evals` | Altın set, kalite kapısı, router kalibrasyonu | M1, M5 |
| M11 | `api` | FastAPI, auth, WS | M2 |
| M12 | `web` | Yönetim paneli (React) | M11 |

### 9.1 M1 — Model Gateway

#### 9.1.1 `config/models.yaml` (katman ↔ model eşlemesi)

```yaml
# Fiyatlar USD / 1M token. Üretimden önce sağlayıcı sayfasından doğrula.
tiers:
  T1:
    - {name: t1-cheap,  provider: anthropic, model: claude-haiku-5-5,  in: 0.10, out: 0.50}
    - {name: t1-cheap,  provider: internal,  model: glm-5.3-flash,     in: 0.10, out: 0.15}   # fiyat doğrulanacak
  T2:
    - {name: t2-worker, provider: anthropic, model: claude-sonnet-5-5, in: 2.00, out: 10.00}
    - {name: t2-worker, provider: openai,    model: gpt-6.1-sol,       in: 2.00, out: 10.00}
  T3:
    - {name: t3-planner, provider: anthropic, model: claude-opus-5-5,  in: 4.00, out: 20.00}
  T4:
    - {name: t4-frontier, provider: openai,    model: gpt-6-astra,     in: 10.00, out: 50.00}
    - {name: t4-frontier, provider: anthropic, model: claude-fable-5-1, in: 0, out: 0}          # fiyatı doğrula
  V:
    - {name: v-vision,  provider: openai,    model: gpt-6.1-terra,     in: 1.00, out: 5.00}
  J:                                           # hakem: worker'ın sağlayıcısından FARKLI seçilir
    - {name: judge-a,   provider: anthropic, model: claude-sonnet-5-5, in: 2.00, out: 10.00}
    - {name: judge-b,   provider: openai,    model: gpt-6.1-sol,       in: 2.00, out: 10.00}
cache:
  read_price_ratio: 0.10        # önbellekten okunan giriş fiyatı ≈ normalin %10'u (sağlayıcıya göre doğrula)
```

> `claude-fable-5-1` satırındaki `in/out: 0` bilinçli olarak **doldurulmamıştır**: yüklenen raporlarda fiyatı yok. Fiyatı sıfır bırakmak maliyet hesabını bozar; doğrulanana kadar T4'ten çıkar veya fiyatı gir.

#### 9.1.2 `config/routing.yaml`

```yaml
base_tier:
  classify: T1
  summarize: T1
  extract: T1
  format: T1
  tool_call_simple: T1
  code_edit: T2
  analysis: T2
  write_long: T2
  plan: T3
  code_hard: T3
  vision: V
escalation:
  retries_per_tier: 2             # aynı katmanda en fazla 2 deneme, sonra yüksel
  max_tier_default: T3
  t4_requires: [coordinator_approval, budget_ok]
downgrade:
  when_remaining_budget_below: 0.30
  disable_t4: true
risk_overrides:
  high: {min_tier: T2, require_independent_review: true}
long_context:
  threshold_tokens: 100000
  min_tier: T2
```

#### 9.1.3 `config/budgets.yaml`

```yaml
default: {max_usd: 0.50, soft_ratio: 0.70, max_steps: 30, max_depth: 2, max_wall_s: 900}
profiles:
  quick: {max_usd: 0.05, max_steps: 8,  max_wall_s: 120}
  deep:  {max_usd: 3.00, max_steps: 80, max_depth: 3, max_wall_s: 3600}
```

#### 9.1.4 `config/litellm.config.yaml`

```yaml
model_list:
  - {model_name: t1-cheap,   litellm_params: {model: anthropic/claude-haiku-5-5,  api_key: os.environ/ANTHROPIC_API_KEY}}
  - {model_name: t1-cheap,   litellm_params: {model: openai/glm-5.3-flash, api_base: os.environ/INTERNAL_GATEWAY_BASE, api_key: os.environ/INTERNAL_GATEWAY_KEY}}
  - {model_name: t2-worker,  litellm_params: {model: anthropic/claude-sonnet-5-5, api_key: os.environ/ANTHROPIC_API_KEY}}
  - {model_name: t2-worker,  litellm_params: {model: openai/gpt-6.1-sol,          api_key: os.environ/OPENAI_API_KEY}}
  - {model_name: t3-planner, litellm_params: {model: anthropic/claude-opus-5-5,   api_key: os.environ/ANTHROPIC_API_KEY}}
  - {model_name: t4-frontier, litellm_params: {model: openai/gpt-6-astra,         api_key: os.environ/OPENAI_API_KEY}}
  - {model_name: v-vision,   litellm_params: {model: openai/gpt-6.1-terra,        api_key: os.environ/OPENAI_API_KEY}}
  - {model_name: judge-a,    litellm_params: {model: anthropic/claude-sonnet-5-5, api_key: os.environ/ANTHROPIC_API_KEY}}
  - {model_name: judge-b,    litellm_params: {model: openai/gpt-6.1-sol,          api_key: os.environ/OPENAI_API_KEY}}
router_settings:
  routing_strategy: latency-based-routing   # aynı model_name altındaki deployment'lar arasında
  num_retries: 2
  timeout: 60
  allowed_fails: 3
  cooldown_time: 30
  # BİLİNÇLİ OLARAK cross-tier "fallbacks" tanımlanmaz: katman yükseltme yalnızca cascade'de,
  # doğrulayıcı sonucuna göre yapılır. LiteLLM yalnızca AYNI katmandaki deployment'lar arasında dağıtır.
litellm_settings:
  drop_params: true
  cache: true
  cache_params: {type: redis}
general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/LITELLM_DB_URL
```

#### 9.1.5 Router ve cascade (çekirdek mantık)

```python
# src/leanswarm/gateway/router.py
from dataclasses import dataclass

ORDER = ["T1", "T2", "T3", "T4"]

@dataclass
class StepSpec:
    kind: str
    risk: str = "low"
    ctx_tokens: int = 0
    needs_vision: bool = False
    verifier_ids: tuple[str, ...] = ()
    max_attempts: int = 4

class Router:
    def __init__(self, cfg, bandit=None):
        self.cfg, self.bandit = cfg, bandit

    def pick(self, s: StepSpec, budget) -> str:
        if s.needs_vision:
            return "V"
        tier = self.cfg.base_tier.get(s.kind, "T2")                 # bilinmeyen tür → güvenli orta
        if s.risk == "high":
            tier = max(tier, self.cfg.risk_overrides["high"]["min_tier"], key=ORDER.index)
        if s.ctx_tokens > self.cfg.long_context.threshold_tokens:
            tier = max(tier, "T2", key=ORDER.index)
        if budget.remaining_ratio < self.cfg.downgrade.when_remaining_budget_below:
            tier = min(tier, "T2", key=ORDER.index)                 # bütçe darsa yükseltme kapanır
        return self.bandit.adjust(s.kind, tier) if self.bandit else tier
```

```python
# src/leanswarm/gateway/cascade.py
async def cascade(step, ctx, llm, router, verifiers, budget, policy):
    tier = router.pick(step, budget)
    fails, feedback = 0, None
    for attempt in range(1, step.max_attempts + 1):
        budget.check()                                              # BudgetExceeded fırlatır
        resp = await llm.complete(tier=tier, step=step, ctx=ctx, feedback=feedback)
        budget.add(resp.usage)                                      # model_usage satırı + harcama
        verdict = await verifiers.run(step.verifier_ids, resp)      # ücretsiz → ucuz → ücretli
        await llm.record_outcome(resp, ok=verdict.ok)               # router kalibrasyonu için
        if verdict.ok:
            return resp, verdict
        feedback, fails = verdict.feedback, fails + 1
        if fails >= router.cfg.escalation.retries_per_tier:
            nxt = escalate(tier, cap=ctx.max_tier)
            if nxt == "T4" and not policy.t4_allowed(ctx, budget):
                raise StepFailed("T4 izni yok / bütçe yok", last=verdict)
            tier, fails = nxt, 0
    raise StepFailed("deneme sınırı", last=verdict)

def escalate(tier, cap):
    i = min(ORDER.index(tier) + 1, ORDER.index(cap))
    return ORDER[i]
```

```python
# src/leanswarm/gateway/pricing.py
def cost_usd(u, p, cache_ratio=0.10):
    fresh = u.input_tokens - u.cached_tokens
    return (fresh * p.inp + u.cached_tokens * p.inp * cache_ratio + u.output_tokens * p.out) / 1_000_000
```

#### 9.1.6 Prompt caching düzeni

```text
[SABİT ÖNEK — cache'lenir]   sistem talimatı + rol SOP'u + araç şemaları + çıktı şeması
[YARI SABİT]                 görev tanımı + plan özeti
[DEĞİŞKEN — sonda]           alt görev, bağımlı artefakt özetleri, geri bildirim
```
Kural: Sabit önekte zaman damgası, rastgele kimlik, sıralaması değişen liste **bulunmaz** (önbelleği bozar).

#### 9.1.7 Öğrenen router (Faz 3)

`router_stats` verisiyle iş türü × model başına **başarı oranı ve maliyet** izlenir. Basit başlangıç: ε-greedy veya Thompson sampling ile "aynı katman içinde" model seçimi, ve `P(başarı) × değer − maliyet` skoruyla "T1 yeterli mi?" kararı. İlk 2–4 haftalık veri toplanmadan öğrenen router açılmaz. Alternatif: RouteLLM benzeri hazır yönlendirici, aynı `Router` arayüzüne adaptör olarak takılır (§10).

### 9.2 M3 — Policy Engine (LLM yok)

```python
# src/leanswarm/policy/engine.py
from typing import Literal
from pydantic import BaseModel

class ActionProposal(BaseModel):
    tool_id: str
    args: dict
    reason: str
    side_effect: Literal["none", "reversible", "irreversible", "external"]
    est_cost_usd: float = 0.0

LEVEL = {"none": "L0", "reversible": "L2", "irreversible": "L3", "external": "L3"}

def decide(p: ActionProposal, agent, task, tool) -> str:
    if tool.id in task.denied_tools or p.tool_id not in agent.allowed_tools:
        return "deny"
    if tool.prohibited:                                   # L4: yetki yükseltme, audit silme, sınırsız root
        return "deny"
    if p.est_cost_usd > task.budget_remaining:
        return "needs_approval"
    lvl = LEVEL[p.side_effect]
    if lvl == "L3" or tool.requires_approval:
        return "needs_approval"
    return "allow"
```

| Seviye | Anlam | Karar |
|---|---|---|
| L0 Observe | Salt okuma | Otomatik |
| L1 Propose | Yalnız öneri | Otomatik |
| L2 Reversible | Geri alınabilir sınırlı eylem | Politika izniyle otomatik |
| L3 Human-approved | Dış etkili / geri alması zor | **İnsan onayı** |
| L4 Prohibited | Yetki yükseltme, denetim silme, güvenlik kapatma | **Her zaman red** |

Onay, modelin yazdığı serbest metne değil, **tipli ve gösterilebilir `ActionProposal`** nesnesine bağlanır; onay ekranında eylem, etki, veri ve kanıt gösterilir.

### 9.3 M4 — Tool Gateway

`config/tools/*.yaml` örneği:

```yaml
id: fs.write
version: 1.2.0
description: Çalışma klasörüne dosya yaz
read_only: false
side_effect: reversible          # none|reversible|irreversible|external
idempotent: true
allowed_roles: [worker]
input_schema: {type: object, required: [path, content], properties: {path: {type: string}, content: {type: string}}}
timeout_s: 20
max_concurrency: 2
requires_approval: false
pre_check: [path_inside_workspace]
post_check: [diff_size_under_limit]
sandbox_profile: ws-rw
```

- **MCP istemcisi:** Harici araçlar (dosya sistemi, git, veritabanı, tarayıcı, arama) MCP üzerinden; yalnızca **allowlist + sürüm sabitli** sunucular.
- **Sandbox çalıştırıcı:** Kod/shell/tarayıcı işleri ayrı container'da (rootless, salt-okunur imaj, `/workspace` dışında yazma yok, varsayılan ağ kapalı, CPU/RAM/süre limiti, seccomp). Çok kiracılı/yüksek risk için gVisor veya Firecracker.
- **Genel terminal verilmez.** Araç = "ajanın isteyebileceği tipli eylem".

### 9.4 M5 — Doğrulayıcı zinciri (Reviewer'ın çekirdeği)

```python
class Verifier(Protocol):
    id: str
    cost: Literal["free", "cheap", "paid"]
    async def check(self, step, output) -> "Verdict": ...    # ok, feedback, evidence, needs_judge
```

| Sıra | Doğrulayıcı | Maliyet | Ne kontrol eder |
|---|---|---|---|
| 1 | `json_schema` | ücretsiz | Çıktı şeması / tür / zorunlu alanlar |
| 2 | `secret_scan` | ücretsiz | Sızdırılan anahtar/PII |
| 3 | `diff_size_guard` | ücretsiz | Beklenmedik büyük/yıkıcı değişiklik |
| 4 | `lint_type` | ücretsiz | ruff/mypy/eslint |
| 5 | `unit_tests` | ucuz (sandbox CPU) | pytest/jest |
| 6 | `citation_check` | ucuz | Kaynak bağlantıları ve alıntıların varlığı |
| 7 | `rule_assertions` | ücretsiz | İş kuralları (toplam tutuyor mu, tarih aralığı…) |
| 8 | `llm_judge` | **ücretli** | Yalnızca yukarıdakiler karar veremezse; **farklı sağlayıcı**, rubric'li, yapılandırılmış çıktı |

Zincir ilk kesin başarısızlıkta durur; böylece ücretli adım nadiren çalışır.

### 9.5 M6 — Memory

| Sınıf | İçerik | Yazan | Not |
|---|---|---|---|
| Çalışma | Anlık durum | LangGraph checkpoint | Postgres |
| Epizodik | "Ne oldu" | Olay günlüğü | Değiştirilemez |
| Semantik | Doğrulanmış bilgi/özet | Memory Curator | `confidence`, `source_event_id`, `valid_*` zorunlu |
| Prosedürel | SOP, beceri, araç kullanımı | Sürümlü dosya store | Gözden geçirilmiş içerik |

- **Yazma politikası:** Yalnızca `verdict.ok = true` olan görevlerden; kaynak + güven + geçerlilik olmadan kayıt yazılmaz; dış içerik talimat değil **veri** olarak işaretlenir.
- **Geri çağırma:** tenant/scope filtresi → BM25 (`tsv`) + vektör → zaman/güven ile yeniden sıralama → `k=5`, ≤1.500 token.
- **Sıkıştırma:** Eski epizodikler T1 ile haftalık özetlenir, ham kayıt arşive gider.
- Kimlik, yetki ve güvenlik talimatları **asla** semantik bellekten yüklenmez.

### 9.6 M7 — Events
NATS JetStream (`LS_EVENTS` stream, tüketici grupları: `orchestrator`, `memory`, `obs`, `notify`). Outbox yayıncısı, DLQ konusu (`ls.dlq.*`) ve yeniden oynatma komutu (`make replay TASK=<id>`).

### 9.7 M9 — Gözlemlenebilirlik
Her model çağrısı bir OTel span'idir. Zorunlu özellikler: `ls.task_id`, `ls.step_id`, `ls.role`, `ls.tier`, `ls.provider`, `ls.model`, `ls.attempt`, `ls.escalated`, `ls.input_tokens`, `ls.cached_tokens`, `ls.output_tokens`, `ls.cost_usd`, `ls.verdict`. Langfuse prompt/yanıt izi ve eval skorları; Prometheus metrikleri §15'te.

---

## 10. Eklenti (plugin) sistemi

Amaç: Çekirdeği küçük tutmak; yeni araç, doğrulayıcı, yönlendirici, bellek, kanal ve simülasyon yeteneklerini **çekirdeği değiştirmeden** eklemek.

### 10.1 Eklenti türleri ve güven katmanları

| Tür (`kind`) | Örnek | Takılma noktası |
|---|---|---|
| `tool` | GitHub, Postgres (salt okunur), Playwright, web arama | Tool Gateway (MCP veya yerleşik) |
| `verifier` | pytest, ruff, citation-check, secret-scan, LLM-judge | M5 zinciri |
| `router` | Kural yönlendirici, bandit, RouteLLM adaptörü | `Router` arayüzü |
| `memory` | pgvector, Qdrant, SOP deposu | M6 arayüzü |
| `agent` | Security Reviewer, GUI ajanı, World Director | Orkestratör düğümü |
| `channel` | REST/WS, Slack, Telegram, Teams, CLI | API / olay köprüsü |
| `obs` | Langfuse, Prometheus, maliyet raporu, uyarı | OTel / olay tüketicisi |
| `sim` | AI Town/Concordia tarzı dünya motoru (isteğe bağlı) | Ayrı servis + olay köprüsü |

| Güven katmanı | Çalışma biçimi | Örnek |
|---|---|---|
| **Çekirdek** | Aynı süreç, imzalı depo | schema, budget |
| **Birinci taraf** | Aynı süreç, imzalı, izin beyanlı | pytest, ruff |
| **Üçüncü taraf** | **Ayrı süreç/container**, MCP/gRPC/stdio, sandbox | Topluluk MCP sunucuları |

### 10.2 Manifest

```yaml
# plugins/verify-diff-guard/plugin.yaml
id: verify-diff-guard
version: 0.2.0
api_version: 1
kind: verifier
entrypoint: leanswarm_plugin_diffguard:Plugin
trust: first-party                  # core | first-party | third-party
hooks: [on_verify]
permissions:
  fs: workspace:ro
  network: none
  tools: []
  secrets: []
  can_mutate_requests: false        # true ise pre_* kancalarında istek değiştirebilir (policy yine son söz)
failure_mode: fail-closed           # obs eklentileri için fail-open
timeout_ms: 500
config_schema:
  type: object
  properties: {max_changed_lines: {type: integer, default: 400}}
integrity: {sha256: "<paket özeti>", signed_by: "<yayıncı>"}
```

### 10.3 Arayüz ve kancalar

```python
# src/leanswarm/plugins/spec.py
from typing import Protocol

class Plugin(Protocol):
    manifest: "Manifest"
    async def setup(self, ctx: "PluginContext") -> None: ...
    async def teardown(self) -> None: ...

HOOKS = (
    "on_task_start", "pre_route", "post_route",
    "pre_model_call", "post_model_call",
    "pre_tool_call", "post_tool_call",
    "on_verify", "on_escalate", "on_budget_event", "on_task_end",
)
```

```python
# plugins/verify-diff-guard/leanswarm_plugin_diffguard.py
class Plugin:
    manifest = load_manifest(__file__)
    async def setup(self, ctx): self.limit = ctx.config.get("max_changed_lines", 400)
    async def teardown(self): ...
    async def on_verify(self, step, output):
        changed = count_changed_lines(output.artifact_uri)
        if changed > self.limit:
            return Verdict(ok=False, feedback=f"{changed} satır değişti; en fazla {self.limit}. Değişikliği küçült.")
        return Verdict(ok=True)
```

### 10.4 Yaşam döngüsü

```text
keşif (entry point 'leanswarm.plugins' + plugins/ klasörü + MCP kaydı)
  → manifest doğrulama (şema, api_version)
  → bütünlük/imza + allowlist kontrolü
  → izinleri tenant politikasıyla karşılaştır (fazlası reddedilir)
  → yükle (üçüncü taraf = ayrı süreç + sandbox profili)
  → sağlık kontrolü → tenant başına etkinleştir → kancalara kaydol
```

Kurallar: Kanca hataları görevi düşürmez (obs: fail-open; güvenlik/doğrulama: fail-closed). Her kanca için zaman aşımı. Eklenti, Policy Engine kararını **geçersiz kılamaz**. Eklenti çağrıları `tool_invocations`/`audit_logs` kaydına düşer. Sürüm sabitleme ve `pip-audit`/SBOM zorunludur (tedarik zinciri riski).

### 10.5 Eklenti kataloğu (önerilen)

| Eklenti | Tür | Ne yapar | Faz | Maliyet etkisi |
|---|---|---|---|---|
| `verify-schema` | verifier | JSON şema/tür | 1 | Tasarruf (ücretsiz) |
| `verify-pytest` | verifier | Sandbox'ta test | 1 | Tasarruf |
| `verify-lint` | verifier | ruff/mypy/eslint | 1 | Tasarruf |
| `verify-secret-scan` | verifier | Sızıntı/PII | 1 | Güvenlik |
| `verify-diff-guard` | verifier | Aşırı değişiklik | 1 | Tasarruf |
| `verify-citations` | verifier | Kaynak doğrulama | 2 | Düşük |
| `verify-llm-judge` | verifier | Bağımsız hakem (J) | 2 | Ücretli, nadir |
| `tool-fs-scoped` | tool/MCP | Workspace içi dosya | 1 | — |
| `tool-git` | tool/MCP | Branch/commit/PR (L2/L3) | 2 | — |
| `tool-postgres-ro` | tool/MCP | Salt okunur SQL | 2 | — |
| `tool-browser` | tool/MCP | Playwright (sandbox) | 2 | Orta (token) |
| `tool-search-fetch` | tool/MCP | Arama + sayfa okuma | 2 | Orta |
| `tool-docs` | tool | PDF/DOCX/XLSX okuma-yazma | 2 | Düşük |
| `router-rules` | router | `routing.yaml` | 1 | Çekirdek |
| `router-bandit` | router | Öğrenen seçim | 3 | Tasarruf |
| `router-routellm` | router | Hazır yönlendirici adaptörü | 3 | Tasarruf |
| `mem-pgvector` | memory | Hibrit geri çağırma | 3 | Tasarruf (bağlam) |
| `mem-compactor` | memory | T1 ile sıkıştırma | 3 | Tasarruf |
| `chan-rest-ws` | channel | API/WS | 1 | — |
| `chan-chatops` | channel | Slack/Telegram/Teams | 3 | — |
| `obs-langfuse` | obs | Prompt/yanıt izi, eval | 1 | — |
| `obs-prometheus` | obs | Metrikler, uyarılar | 1 | — |
| `obs-cost-report` | obs | CPST/katman raporu | 1 | Görünürlük |
| `agent-security-reviewer` | agent | Tehdit/izin incelemesi | 3 | Orta |
| `agent-gui` | agent | Ekran/computer-use (V) | 4 | Orta |
| `sim-town` | sim | Yaşayan topluluk (deterministik dünya + ajan niyeti) | 4 | Ayrı bütçe |
| `ui-office` | obs/UI | 3D "ajan ofisi" izleme (boştayken sıfır token) | 4 | Yok |

> `sim-town` kasıtlı olarak eklentidir: simülasyon zamanı/konumu/çarpışması deterministik kodda kalır; LLM yalnızca niyet/diyalog üretir. Görev sürüsü çekirdeğine gömülmez.

---

## 11. Eval ve kalite kapısı

Ucuz mimarinin en büyük riski, **farkına varılmayan kalite düşüşüdür**. Bu yüzden eval, mimarinin parçasıdır.

### 11.1 Altın set
- Başlangıç: 50 görev → hedef 200. Kategoriler: kod düzenleme, analiz/rapor, veri ayıklama, çok adımlı araç kullanımı, belge üretimi, "zor/belirsiz".
- Her görev: girdi, beklenen doğrulayıcı sonuçları, kabul ölçütü, risk etiketi, zorluk (kolay/orta/zor).
- Sürümlü saklanır (`evals/golden/`); veri sızıntısına karşı yalnızca eval için ayrılır.

### 11.2 Metrikler
CPST · ilk geçiş oranı · yükselme oranı (T1→T2→T3→T4 dağılımı) · ortalama adım · token/görev · p95 süre · judge–insan uyumu · regresyon farkı.

### 11.3 Kapılar

| Kapı | Ne zaman | Koşul |
|---|---|---|
| `eval-smoke` | Her PR | 20 görev, toplam ≤ $2; ilk geçiş ≥ %80, CPST ≤ eşik, regresyon ≤ 3 puan |
| `eval-full` | Gece / sürüm öncesi | 200 görev; T4 kullanımı ≤ %10; kurtarılamayan hata ≤ %2 |
| `router-calib` | Haftalık / model değişince | Aşağıda |

### 11.4 Router kalibrasyonu ("minimum yeterli katman")
Aynı görev kümesini T1/T2/T3'te ayrı ayrı koş → doğrulayıcı sonucuyla iş türü × katman başarı matrisi çıkar → her iş türü için **başarı ≥ hedef olan en ucuz katmanı** `routing.yaml`'a yaz. Yeni model çıktığında yalnızca bu matris yeniden üretilir; mimari değişmez.

### 11.5 LLM-judge kalibrasyonu
İnsan etiketli ≥ 50 örnekle judge uyumu ölçülür (hedef ≥ %85). Judge her zaman worker'dan farklı sağlayıcıdan, sabit rubric ve yapılandırılmış çıktıyla çalışır.

---

## 12. Depo iskeleti

```text
leanswarm/
├─ pyproject.toml                  # uv + bağımlılıklar (uv.lock ile sabit)
├─ Makefile
├─ docker-compose.yml
├─ .env.example
├─ README.md
├─ config/
│  ├─ models.yaml                  # katman ↔ model, fiyat
│  ├─ routing.yaml                 # iş türü → taban katman, yükselme
│  ├─ budgets.yaml                 # profiller
│  ├─ policies.yaml                # L0–L4, izinli araçlar, onay kuralları
│  ├─ litellm.config.yaml
│  ├─ agents/                      # coordinator.yaml, planner.yaml, worker.yaml, reviewer.yaml, curator.yaml
│  ├─ tools/                       # fs.write.yaml, git.commit.yaml, ...
│  └─ prompts/                     # sürümlü sistem/rol SOP'ları (cache-dostu önek)
├─ src/leanswarm/
│  ├─ core/            config.py types.py errors.py ids.py clock.py
│  ├─ gateway/         llm_client.py router.py cascade.py pricing.py cache.py budget.py bandit.py
│  ├─ orchestrator/    state.py graph.py gate.py runtime.py fanout.py
│  ├─ agents/          base.py coordinator.py planner.py worker.py reviewer.py curator.py
│  ├─ policy/          engine.py levels.py approvals.py budget_rules.py
│  ├─ tools/           registry.py mcp_client.py sandbox_runner.py builtin/
│  ├─ verify/          base.py schema.py secrets.py difflimit.py lint.py tests.py citations.py judge.py
│  ├─ memory/          store.py retriever.py writer_policy.py compactor.py
│  ├─ events/          bus.py envelope.py outbox.py consumers/
│  ├─ plugins/         spec.py loader.py registry.py hooks.py trust.py
│  ├─ obs/             otel.py langfuse.py metrics.py cost_report.py
│  ├─ evals/           datasets.py runner.py metrics.py router_calibration.py
│  ├─ api/             main.py routes/ ws.py auth.py deps.py
│  └─ db/              models.py migrations/ (alembic)
├─ plugins/                        # yerleşik eklentiler (her biri plugin.yaml + paket)
│  ├─ verify-diff-guard/  verify-pytest/  verify-lint/  tool-fs-scoped/ ...
├─ sandbox/            Dockerfile.sandbox  seccomp.json  profiles/ (ws-ro.yaml, ws-rw.yaml)
├─ web/                            # React + TS yönetim paneli (görevler, maliyet, onaylar)
├─ evals/golden/                   # altın set (sürümlü)
├─ scripts/            bootstrap.sh  bootstrap.ps1  seed.py  replay.py
├─ tests/              unit/ integration/ e2e/
└─ .github/workflows/  ci.yml  eval-smoke.yml  release.yml
```

---

## 13. Derleme, paketleme ve dağıtım

### 13.1 `pyproject.toml` (özet)

```toml
[project]
name = "leanswarm"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi", "uvicorn[standard]", "pydantic>=2", "pydantic-settings", "pyyaml", "httpx", "tenacity",
  "langgraph", "langgraph-checkpoint-postgres", "psycopg[binary,pool]",
  "litellm", "redis", "nats-py", "sqlalchemy", "alembic",
  "mcp", "opentelemetry-sdk", "opentelemetry-exporter-otlp", "langfuse", "prometheus-client",
]
[project.optional-dependencies]
dev = ["pytest", "pytest-asyncio", "ruff", "mypy", "pip-audit", "testcontainers"]
[project.entry-points."leanswarm.plugins"]
# üçüncü taraf paketler buraya kendi eklentisini kaydeder
[tool.ruff]
line-length = 100
```
Sürümleri `uv lock` ile sabitle; LangGraph ve LiteLLM'in kurulu sürümüne göre §7 ve §9.1.4'ü doğrula.

### 13.2 `Makefile`

```make
.PHONY: up down migrate test lint eval replay cost-report build
up:           ; docker compose --profile core up -d
up-obs:       ; docker compose --profile core --profile obs up -d
down:         ; docker compose down
migrate:      ; alembic upgrade head
test:         ; pytest -q tests/unit tests/integration
lint:         ; ruff check . && mypy src
eval:         ; python -m leanswarm.evals.runner --set smoke --max-usd 2
replay:       ; python scripts/replay.py --task $(TASK)
cost-report:  ; python -m leanswarm.obs.cost_report --days 7
build:        ; docker build -t leanswarm:$(shell git rev-parse --short HEAD) .
```

### 13.3 `Dockerfile` (çok aşamalı, non-root)

```dockerfile
FROM python:3.12-slim AS build
RUN pip install uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY src ./src
COPY config ./config
COPY plugins ./plugins

FROM python:3.12-slim
RUN useradd -m -u 10001 app
WORKDIR /app
COPY --from=build /app /app
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
USER app
CMD ["uvicorn", "leanswarm.api.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### 13.4 `docker-compose.yml` (tek sunuculu pilot)

```yaml
services:
  api:
    build: .
    profiles: [core]
    env_file: .env
    ports: ["8080:8080"]
    depends_on: [postgres, redis, nats, litellm]
  worker:
    build: .
    profiles: [core]
    command: ["python", "-m", "leanswarm.orchestrator.runtime", "--worker"]
    env_file: .env
    deploy: {replicas: 2}
    depends_on: [postgres, redis, nats, litellm]
  litellm:
    image: ghcr.io/berriai/litellm:main-stable      # sürümü sabitle
    profiles: [core]
    command: ["--config", "/app/config.yaml", "--port", "4000"]
    volumes: ["./config/litellm.config.yaml:/app/config.yaml:ro"]
    env_file: .env
  postgres:
    image: pgvector/pgvector:pg17
    profiles: [core]
    environment: {POSTGRES_PASSWORD: "${PG_PASSWORD}", POSTGRES_DB: leanswarm}
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7
    profiles: [core]
  nats:
    image: nats:2
    profiles: [core]
    command: ["-js", "-sd", "/data"]
    volumes: ["natsdata:/data"]
  minio:
    image: minio/minio
    profiles: [core]
    command: server /data --console-address ":9001"
    volumes: ["miniodata:/data"]
  sandbox:                                          # ayrı, kısıtlı çalıştırıcı
    build: {context: ., dockerfile: sandbox/Dockerfile.sandbox}
    profiles: [core]
    read_only: true
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true", "seccomp=./sandbox/seccomp.json"]
    network_mode: "none"
    tmpfs: ["/workspace:size=256m"]
    mem_limit: 1g
    cpus: 1.0
  otel-collector: {image: otel/opentelemetry-collector, profiles: [obs]}
  prometheus:     {image: prom/prometheus, profiles: [obs]}
  grafana:        {image: grafana/grafana, profiles: [obs]}
  langfuse:       {image: langfuse/langfuse:3, profiles: [obs]}    # kendi bağımlılıklarıyla yapılandır
volumes: {pgdata: {}, natsdata: {}, miniodata: {}}
```
> Sandbox'a iş aktarımı için docker.sock **bağlanmaz**; iş, kuyruk üzerinden sandbox içindeki dar bir yürütücü servise gider. Compose dosyası bir başlangıç şablonudur; sürümleri ve gizli bilgileri ortamına göre sabitle.

### 13.5 `.env.example`

```bash
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
INTERNAL_GATEWAY_BASE=        # opsiyonel: kurum içi OpenAI-uyumlu LLM geçidi
INTERNAL_GATEWAY_KEY=
LITELLM_MASTER_KEY=
LITELLM_DB_URL=postgresql://postgres:${PG_PASSWORD}@postgres:5432/litellm
PG_PASSWORD=
DATABASE_URL=postgresql://postgres:${PG_PASSWORD}@postgres:5432/leanswarm
REDIS_URL=redis://redis:6379/0
NATS_URL=nats://nats:4222
S3_ENDPOINT=http://minio:9000
DEFAULT_BUDGET_PROFILE=default
MAX_PARALLEL_WORKERS=4
T4_ENABLED=false              # başlangıçta kapalı; açık onayla etkinleştir
```

### 13.6 Bootstrap (Linux/macOS ve Windows)

```bash
# scripts/bootstrap.sh
set -euo pipefail
cp -n .env.example .env
pip install uv && uv sync
docker compose --profile core up -d postgres redis nats
alembic upgrade head
python scripts/seed.py
echo "Hazır: make up"
```

```powershell
# scripts/bootstrap.ps1
$ErrorActionPreference = "Stop"
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
pip install uv; uv sync
docker compose --profile core up -d postgres redis nats
alembic upgrade head
python scripts/seed.py
Write-Host "Hazır: make up (veya docker compose --profile core up -d)"
```

### 13.7 CI/CD (`.github/workflows/ci.yml`, özet)

```yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    strategy: {matrix: {os: [ubuntu-latest, windows-latest]}}
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --all-extras
      - run: uv run ruff check . && uv run mypy src
      - run: uv run pytest -q tests/unit
      - run: uv run pip-audit
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose --profile core up -d postgres redis nats
      - run: uv sync --all-extras && uv run pytest -q tests/integration
  eval-smoke:
    if: contains(github.event.pull_request.labels.*.name, 'run-eval')
    runs-on: ubuntu-latest
    env: {ANTHROPIC_API_KEY: "${{ secrets.ANTHROPIC_API_KEY }}", OPENAI_API_KEY: "${{ secrets.OPENAI_API_KEY }}"}
    steps:
      - uses: actions/checkout@v4
      - run: uv sync --all-extras && uv run python -m leanswarm.evals.runner --set smoke --max-usd 2 --fail-under 0.80
```
Eylem sürümlerini (`@v4`, `@v5`) ve etiketleri kendi pinleme politikana göre sabitle (tercihen commit SHA).

### 13.8 Ölçekleme yolu

| Aşama | Dağıtım | Ne zaman |
|---|---|---|
| Pilot | Docker Compose, tek sunucu | < ~50 eşzamanlı görev |
| Orta | Compose + ayrı worker makineleri, yönetilen Postgres/S3 | Worker CPU/IO sınırı |
| Büyük | Kubernetes (api/worker/litellm HPA; sandbox ayrı node havuzu + gVisor/Firecracker) | Çok kiracı, SLA |
| Veri | pgvector → ölçümle gerekirse Qdrant; NATS → gerekirse Kafka | İndeks/akış baskısı |

---

## 14. Güvenlik

| Tehdit | Kontrol (LeanSwarm'da nerede) |
|---|---|
| Prompt injection / hedef ele geçirme | Dış içerik = veri; talimat kanalı ayrı; worker L1–L2'de; yan etki yalnızca Policy Engine'den geçer |
| Araç kötüye kullanımı | Tipli araç kaydı, allowlist, şema + pre/post check, read/write ayrımı |
| Aşırı yetki | Görev bazlı kısa ömürlü token, least privilege, ajan yetki seviyesini değiştiremez |
| Tedarik zinciri | Eklenti/MCP imzası + sürüm sabitleme + allowlist registry + `pip-audit`/SBOM |
| Kod çalıştırma | Sandbox: rootless, salt-okunur imaj, ağ kapalı, limitler, seccomp; yüksek riskte gVisor/Firecracker |
| Hafıza zehirleme | Yalnız doğrulanmış sonuç yazılır; kaynak+güven+geçerlilik; kimlik/politika bellekten yüklenmez |
| Ajanlar arası spoofing | İmzalı görev kimliği, A2A/servis kimlik doğrulaması, mTLS (ölçekte) |
| Zincirleme hata / maliyet patlaması | `max_steps/depth/usd/wall`, replan=1, T4 kapalı varsayılan, devre kesici |
| İnsan onayı manipülasyonu | Onay ekranında eylem+etki+kanıt; tipli `ActionProposal` |
| Rogue agent | Watchdog (bütçe/süre/anormal araç kullanımı), **kill switch** (`POST /tasks/{id}/cancel`, tenant-wide `pause`) |
| Veri sızıntısı | Gizli veri içeren adımlar T1-Local/iç gateway'e yönlendirilir; `secret_scan`; egress allowlist |

Ek: API anahtarları yalnızca gateway/ortam değişkeninde (prompt'ta asla); `audit_logs` ekleme-yalnız; PostgreSQL RLS ile tenant izolasyonu; tüm yüzeyde rate limit.

---

## 15. Gözlemlenebilirlik ve KPI

### 15.1 Metrikler (Prometheus)

| Metrik | Tür | Etiketler |
|---|---|---|
| `ls_task_cost_usd` | histogram | profile, mode |
| `ls_cpst_usd` | gauge (hesaplanan) | tenant |
| `ls_step_total` | counter | tier, kind, verdict |
| `ls_escalation_total` | counter | from_tier, to_tier |
| `ls_first_pass_ratio` | gauge | kind |
| `ls_cache_hit_tokens_ratio` | gauge | model |
| `ls_llm_latency_seconds` | histogram | provider, model |
| `ls_budget_event_total` | counter | kind=soft\|hard |
| `ls_human_approval_total` | counter | level, decision |
| `ls_plugin_hook_errors_total` | counter | plugin, hook |

### 15.2 Uyarı eşikleri (başlangıç)

| Uyarı | Koşul | Eylem |
|---|---|---|
| T4 oranı yüksek | 1 saatte > %15 | Router kurallarını/sınıflandırmayı incele |
| İlk geçiş düşük | 1 saatte < %70 | Son prompt/model değişikliğini geri al |
| Maliyet sıçraması | Görev başı maliyet 3× medyan | Devre kesici + inceleme |
| Önbellek isabeti düşük | < %40 (T2/T3) | Önek düzenini kontrol et |
| Bütçe sert limit | Art arda 5 | Profil/limit gözden geçir |
| Sağlayıcı hatası | Hata oranı > %5 | Aynı katman ikinci deployment'a kaydır |

### 15.3 Paneller
Maliyet (katman/model/iş türü kırılımı) · CPST trendi · yükselme hunisi (T1→T4) · doğrulayıcı geçiş oranı · bekleyen onaylar · görev zaman çizelgesi (adım, katman, maliyet) · eklenti sağlığı.

---

## 16. Uygulama yol haritası

| Faz | Süre (öneri) | Teslimatlar | Çıkış ölçütü |
|---|---|---|---|
| **0 — Temel** | 1 hafta | Depo iskeleti, Compose, Postgres/NATS/Redis, LiteLLM, `models/routing/budgets.yaml`, `cost_usd`, `model_usage` yazımı | Tek model çağrısı maliyetiyle kaydediliyor |
| **1 — Çekirdek sürü** | 2 hafta | LangGraph grafı, Gate, tek/swarm yolu, cascade, 5 ücretsiz doğrulayıcı, bütçe koruması, API+WS, Langfuse/OTel, `eval-smoke` | 20 görevlik sette ilk geçiş ≥ %80; CPST hedefte |
| **2 — Güvenli araçlar** | 2 hafta | Policy Engine, onay akışı (interrupt), sandbox, MCP istemcisi, git/fs/postgres-ro/browser, LLM-judge (J), plugin yükleyici | L3 eylemler onaysız çalışmıyor; sandbox kaçış testleri geçiyor |
| **3 — Optimizasyon** | 2–3 hafta | Prompt caching düzeni, bağlam diyeti, bellek (pgvector+compactor), `router-calib`, bandit router, panel | CPST ≥ %20 daha düşük (Faz 1'e göre), kalite eşit |
| **4 — Ölçek/genişleme** | Gereksinime göre | K8s, RLS tenant izolasyonu, chatops, Security Reviewer, GUI ajanı, `sim-town`, `ui-office` | SLA ve çok kiracı gereksinimleri karşılanıyor |

**İlk 7 gün (somut):** (1) iskelet + Compose + LiteLLM ayakta; (2) `models.yaml`'daki tüm fiyatları sağlayıcı sayfalarından doğrula; (3) `cost_usd` + `model_usage`; (4) 20 görevlik altın set taslağı; (5) tek-ajan baseline'ı T2'de koş → **CPST referansı** al; (6) cascade'i ekle ve aynı sette karşılaştır.

---

## 17. Riskler ve karşı önlemler

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Ucuz modelde sessiz kalite düşüşü | Orta | Yüksek | Doğrulayıcı zorunlu, eval kapısı, judge farklı sağlayıcı |
| Yükselme zinciri maliyeti şişirir | Orta | Orta | `retries_per_tier=2`, T4 onaylı, bütçe düşürme |
| Fiyat/model değişikliği (tanıtım fiyatları bitiyor) | Yüksek | Orta | Fiyatlar config'te; `router-calib` yeniden koşulur (ör. Gemini 3.8 Flash ve 4 Argon tanıtım fiyatları sona eriyor) |
| Sürü karmaşıklığı kazanç getirmiyor | Orta | Orta | Swarm Gate; ölçüm: swarm vs single CPST karşılaştırması |
| Önbellek varsayımı tutmuyor | Orta | Orta | Önek disiplini; `cache_hit_ratio` izleme; planlamada %0 cache senaryosu da hesapla |
| Router/classifier hatası | Orta | Orta | Bilinmeyen tür → T2; öğrenen router'ı verisiz açma |
| Eklenti tedarik zinciri | Düşük–Orta | Yüksek | İmza, allowlist, ayrı süreç |
| Yetersiz gözlemlenebilirlik | Düşük (baştan kurulursa) | Yüksek | Faz 0–1'de zorunlu |
| LangGraph/LiteLLM API değişimi | Orta | Düşük–Orta | Sürüm sabitleme, ince adaptör katmanı, entegrasyon testleri |
| Aşırı mühendislik | Orta | Orta | Faz kapıları; çekirdek 5 rol; eklentiler ihtiyaçla |

---

## 18. Sonuç, varsayımlar ve açık noktalar

### 18.1 Karar özeti

- **Model:** Kademeli (T0→T1→T2→T3→T4) + bağımsız hakem (J) + görsel (V); yükselme yalnızca doğrulayıcı başarısızlığında.
- **Topoloji:** Hiyerarşik supervisor + Swarm Gate + ≤4 paralel worker; serbest ağ yok.
- **Çerçeve:** LangGraph (orkestrasyon); gateway/policy/memory/tools çerçeveden bağımsız modüller.
- **Veri:** PostgreSQL + pgvector (tek kaynak), NATS JetStream (olay), Redis (cache), S3/MinIO (artefakt).
- **Güvenlik:** L0–L4, tipli `ActionProposal`, sandbox, onay, kill switch.
- **Genişleme:** Eklenti sistemi (tool/verifier/router/memory/agent/channel/obs/sim).
- **Maliyet:** Standart görevde ≈ $0,28 (≈ $0,20 cache ile), baz tek-ajan frontier ≈ $1,95.

### 18.2 Bu raporun varsayımları (doğrulanmadan kesin sayma)

1. Fiyatlar ve model adları yüklenen raporlardan alındı; yeniden doğrulanmadı. `claude-fable-5-1` ve `glm-5.3-flash` fiyatları kaynaklarda net değil.
2. %10 T4 yükselme oranı, 10 adım/görev ve token dağılımı **örnektir**; gerçek iş yüküyle değişir.
3. Önbellek okuma fiyatı (≈ %10) ve %60 isabet **varsayımdır**.
4. "Kalite eşitliği" iddiası eval ile kanıtlanana kadar hedeftir, sonuç değildir.
5. Kod parçaları iskelettir; kurulu LangGraph/LiteLLM/MCP sürümlerinin API'siyle derlenip test edilmelidir.
6. "En iyi" ifadesi burada **fiyat/performans/kontrol dengesi** anlamındadır; belirli bir iş yükünde farklı bir model yerleşimi daha iyi çıkabilir — bunu `router-calib` gösterir.

### 18.3 Açık sorular (Faz 0'da netleştir)

- Hedef iş yükü: kod ağırlıklı mı, belge/analiz ağırlıklı mı? (Katman dağılımını belirler.)
- Veri gizliliği: Dışarı çıkamayan veri var mı? (T1-Local/iç gateway kapsamını belirler.)
- Ölçek: Eşzamanlı görev ve tenant sayısı? (Compose mu, K8s mi?)
- Onay modeli: Kim onaylar, hangi kanaldan? (Panel mi, chatops mu?)
- Aylık bütçe tavanı ve CPST hedefi?

---

### Ek A — Terimler
**CPST:** Başarılı görev başı maliyet · **Cascade:** Ucuzdan pahalıya kademeli deneme · **Swarm Gate:** Sürüye ihtiyaç kararı · **Tier (T0–T4, V, J):** Model katmanları · **HITL:** İnsan onayı · **Outbox:** Olayı iş verisiyle aynı transaction'da yazıp sonra yayınlama · **MCP:** Ajan↔araç protokolü · **A2A:** Ajan↔ajan protokolü · **RLS:** Satır düzeyi güvenlik.

### Ek B — Hızlı karar kartı

```text
Görev kodla çözülebilir mi?            → T0
Tek adım/tek araç mı?                  → single, T1–T2
≥2 bağımsız, büyük alt görev mi?       → swarm (≤4 paralel)
Çıktı ucuz doğrulanabilir mi?          → ücretsiz doğrulayıcılar, LLM-judge yok
İlk deneme başarısız mı?               → aynı katmanda 1 yeniden deneme → bir üst katman
T4 gerekli mi?                         → yalnız T3 başarısız + onay + bütçe
Bütçe %70 / %100 mu?                   → uyar-düşür / durdur ve insana sor
```

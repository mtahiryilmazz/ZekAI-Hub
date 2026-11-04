# ADR-011 — Sunum Katmanı: CLI-first + Event-Driven "Ops Floor"

**Durum:** Kabul edildi (prototip doğrulandı)
**Tarih:** 4 Kasım 2026
**Kapsam:** Lean Hybrid Agent Swarm'ın kullanıcı arayüzü, gözlemlenebilirlik yüzeyi ve
3D ofis sorusu
**İlgili kararlar:** ADR-003 (Provider-agnostic), ADR-005 (Tool Gateway), ADR-008 (AI Town
ayrımı), ADR-010 (tek kurulum deneyimi)
**Prototip:** `apps/ops-floor/` + `tools/swarm_sim.py`

---

## 0. Karar özeti

**Arayüz "3D ofis **veya** CLI" değildir. Arayüz, tek bir olay (event) hattının
projeksiyonudur.**

Seçilen model:

1. **Tek gerçek kaynak:** `domain_events` (append-only olay günlüğü).
2. **CLI = kontrol düzlemi.** Görev başlatma, onay, iptal, maliyet, teşhis. İlk çalışan
   yüzey budur; olay sözleşmesini eksiksiz olmaya zorlar.
3. **Web "Ops Floor" = gözlem düzlemi.** Varsayılan görünüm **2.5D izometrik canvas**
   (bağımlılıksız, ~40 KB, GPU istemez). Aynı verinin düz liste/kart görünümü de vardır.
4. **3D ofis = vitrin.** Ayrı paket, özellik bayrağı arkasında, aynı olayları tüketen
   *salt-okunur* bir renderer. Çekirdek yürütmenin, onay akışının veya hata ayıklamanın
   içinde **değildir**. ADR-008 bunu zaten söylüyordu; bu ADR onu uygulanabilir hâle
   getiriyor.

Gerekçe tek cümlede: **Para token'da, sabır gecikmede, risk yetkide harcanıyor; 3D render
bunların hiçbirini iyileştirmiyor.** Görselleştirmenin işi "kim, neyi, kaça, hangi yetkiyle
yapıyor" sorusunu tek ekranda cevaplamaktır — bunu 2.5D izometrik sahne, varlıklı 3D'den
**10-20 kat ucuza** ve daha okunur biçimde yapar.

### 0.1 Ürün kararlarıyla uyum

Bu ADR, projenin onaylanmış çizgisiyle çelişmiyor, onu uygulanabilir hâle getiriyor:

| Onaylanmış karar | Bu ADR'deki karşılığı |
|---|---|
| Çok kullanıcılı, herkes kendi hesabı/BYOK | SSE ve olaylar tenant kapsamlı; anahtar hiçbir yüzeye gitmez |
| Local-first, ücretsiz MVP | Arayüz model çağırmaz; token maliyeti 0; CDN/GPU gerekmez |
| Tek repo, tek kurulum, tek panel | `apps/ops-floor` statik; ek servis yok; CLI aynı repoda |
| "Önce çalışan MVP, sonra 3D AI Town" | 3D, P3 kapısının arkasında; MVP kritik yolunda değil |
| Provider-agnostic | Olayda `model` alanı bilgi amaçlıdır; renderer sağlayıcı bilmez |

---

## 1. Terim netliği (kullanıcı sorusu)

| Terim | Ne demek | Bu projede yeri |
|---|---|---|
| **Ajan sürüsü / swarm** | Koordinasyon topolojisi: uzmanlaşmış ajanlar + denetleyici | Sistemin adı: *Lean Hybrid Agent Swarm* |
| **Ajan ofisi** | Aynı topolojinin **görsel metaforu**: masalar, odalar, onay kapısı | Arayüzün adı: *Ops Floor* |
| **AI Town / köy** | Sürekli tick'li sosyal **simülasyon** (Smallville, a16z AI Town) | Ayrı bounded context, MVP dışı (ADR-008) |

Karışıklığın kaynağı: "ofis" hem metafor hem simülasyon sanılıyor. Bu ADR'de **ofis =
metafor**, simülasyon değil. Ajanlar masa arasında A* ile yol bulmaz; konumları olay
günlüğünden **türetilir** (deterministik interpolasyon).

---

## 2. Neden "önce 3D ofis" yanlış sıra

| Kalem | Varlıklı 3D (GLB sahne) | Prosedürel 3D (three.js, asset yok) | 2.5D izometrik canvas |
|---|---|---|---|
| İlk yükleme | 5-20 MB sahne/model, 2-4 s (3G) | ~250-400 KB kod, <1 s | ~48 KB, <100 ms |
| GPU/bellek | 150-400 MB VRAM, ısınma, fan | 30-80 MB, entegre GPU'da rahat | ~20 MB, %2-5 |
| Mobil/ucuz dizüstü | Isınma, 30 fps altı, pil tüketimi | 60 fps, kabul edilebilir pil | 60 fps, pil dostu |
| Geliştirme (tek kişi) | 6-10 hafta (kamera, LOD, ışık, asset pipeline) | 3-4 hafta | 1-2 hafta |
| Bakım | Asset/ışık/kamera regresyonları | Kamera/etkileşim regresyonları | Tek dosya, saf fonksiyon |
| Okunabilirlik | Perspektif = sayı ve etiket kaybı | Orta (izometrik sabit açıyla iyi) | Yüksek, etiketler hep okunur |
| Erişilebilirlik | Canvas/WebGL zor | Canvas/WebGL zor | Aynı veriden DOM liste görünümü |
| Test | Görsel regresyon pahalı | Orta | Saf `state → sahne` fonksiyonu, snapshot |
| Token maliyeti | **0 etki** | **0 etki** | **0 etki** |

3D'nin tek gerçek kazancı "vitrin/etkileşim hissi". Bu bir *satış* ihtiyacıdır, *işletim*
ihtiyacı değil. Bu yüzden 3D, MVP kritik yoluna değil, P3'e (vitrin) konur.

**Önemli nüans:** 3D'nin pahalı olan kısmı three.js değil, **varlık hattı** (GLB modeller,
kaplamalar, ışık pişirme, kamera/LOD). Prosedürel, asset'siz bir izometrik sahne — referans:
*Ajan Ofisi* (Claude Code ajanlarını izleyen three.js prosedürel ofis; boştayken sıfır token) —
250-400 KB kodla ve düşük GPU ile çalışır. Yani "3D asla" demiyoruz; **varlıklı 3D**'yi
erteliyoruz. Prosedürel 3D, P3'te 2.5D'nin yerine değil, yanına opsiyonel bir görünüm olarak
eklenebilir.

Buna karşılık **sadece CLI** da eksik: onay bekleyen işlem, bütçe aşımı ve ajan çakışması
terminalde kaybolur; ekip üyesi olmayan kullanıcı için ilk 10 dakika kaybedilir.

---

## 3. Seçilen topoloji: tek hat, çoklu yüzey

```
                    ┌──────────────────────────────┐
   kullanıcı niyeti │  CLI / Web / API (intent)     │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  API + Policy + Orchestrator │  ← yetki burada
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │  domain_events (append-only) │  ← tek gerçek kaynak
                    └───────┬───────────┬──────────┘
                            │           │
              SSE / replay  │           │  aynı zarf
                    ┌───────▼──┐   ┌────▼─────────┐   ┌──────────────┐
                    │ CLI tail │   │ Ops Floor    │   │ 3D Vitrin    │
                    │ (TUI)    │   │ 2.5D canvas  │   │ (opsiyonel)  │
                    └──────────┘   └──────────────┘   └──────────────┘
```

**Değişmez kurallar**

1. Hiçbir renderer domain state yazmaz. Yalnızca **niyet** gönderir (`approve`, `cancel`,
   `retry`). Yetki kararı her zaman API/Policy tarafındadır.
2. Renderer, olay günlüğünü **tekrar oynatabilir** (replay). Aynı olay dizisi → aynı sahne.
3. Bir yüzeyin çökmesi diğerini etkilemez. 3D kapalıyken sistem tam işlevlidir.
4. UI hiçbir zaman model çağırmaz. UI'ın token maliyeti **sıfırdır**; maliyet yalnızca
   yürütmede oluşur.
5. Her olayda `task_id`, `agent_id`, `zone` ve varsa `cost_usd`/`tokens` bulunur; ekran
   bunları uydurmaz.

---

## 4. Olay sözleşmesi (v1)

Zarf (yaklaşık 220-350 bayt):

```json
{
  "v": 1,
  "id": "01J9Z6K3T9",
  "ts": "2026-11-04T15:22:31.412Z",
  "type": "agent.progress",
  "task_id": "tsk_7f21",
  "agent_id": "builder",
  "zone": "build",
  "severity": "info",
  "msg": "PR #42 diff'i doğrulanıyor",
  "tokens": { "in": 1840, "out": 420 },
  "cost_usd": 0.0031,
  "ref": { "kind": "artifact", "id": "art_9c" }
}
```

| Tip | Anlam | Arayüzde karşılığı |
|---|---|---|
| `task.created` | Görev kabul edildi | Pipeline 1. adım yanar |
| `task.planned` | Plan çıktı, N alt görev | Pipeline 2, masalara iş dağılır |
| `agent.started` | Ajan göreve başladı | Avatar masasına yürür, halka döner |
| `agent.progress` | Ara durum | Konuşma balonu, ilerleme çubuğu |
| `tool.proposed` | Riskli eylem önerisi | Sağ panelde onay kartı |
| `approval.required` | İnsan kararı bekliyor | Oda kapısı kilitlenir + modal |
| `approval.decided` | Onay/ret | Kart kapanır, iz günlüğe düşer |
| `tool.completed` | Araç çalıştı | İkon yanıp söner, süre yazılır |
| `model.completed` | Model yanıtı | Token + $ sayacı artar |
| `budget.warning` | Limit yaklaştı | Bütçe çubuğu sarıya döner |
| `review.failed` | Doğrulama reddi | Görev masaya geri döner, kırmızı çizgi |
| `task.completed` / `task.failed` | Bitiş | Pipeline son adım, özet kartı |

Kurallar: `severity ∈ {info, warn, error, critical}`; hassas içerik taşınmaz, yalnızca
`ref`; olaylar **idempotent** tüketilir (`id` ile dedupe); yayın hızı **10 Hz** ile
birleştirilir (coalescing) — 200 olay/sn üreten bir sürü bile arayüzü boğmaz.

---

## 5. Yüzey hiyerarşisi ve ana ekran

**Ana ekran Command Center'dır.** Ops Floor onun "canlı saha" görünümüdür; 3D hiçbir
zaman varsayılan ekran değildir. Referans dil: koyu lacivert zemin, tek vurgu ailesi
(indigo→camgöbeği), cam yüzeyli kartlar, 8 pt ızgara, tabular sayılar, süsleme yok.

İki referans iki farklı işi gösteriyor ve ürün ikisini **tek kabukta** birleştirmeli:

| Referans | Ne veriyor | Bizdeki karşılığı |
|---|---|---|
| *AetherOps* tarzı | Yönetici özeti: KPI, routing haritası, onay kuyruğu, maliyet nabzı, ajan sağlığı | **Overview** sekmesi (varsayılan) |
| *Claude Code Monitor* tarzı | Operatör detayı: oturumlar, akış, kart/liste, olay geçmişi | **Görevler / Ajanlar / Onaylar** sekmeleri |

### 5.1 Command Center bileşenleri

| Bileşen | İçerik | Veri kaynağı | Kural |
|---|---|---|---|
| KPI şeridi | Harcama, doğrulama geçiş oranı, onay oranı, aktif ajan | `usage_daily`, `tasks`, `agent_runs` | Her KPI'nın tek tanımı; tooltip'te yazar |
| Routing haritası | Aşamalar arası akış (Anla→Planla→Yürüt→Doğrula), yol yüzdeleri | `task_steps`, `agent_runs` | Canlı katman SSE; yüzdeler 5 dk'lık pencere |
| Onay kuyruğu | Bekleyen eylem, risk, etkilenen kaynak | `action_proposals`, `approvals` | En yüksek öncelik; tek tıkla karar |
| Maliyet nabzı | Günlük/aylık harcama, model kırılımı | `model_usage` rollup | Tahmini ≠ faturalanan ayrı gösterilir |
| Ajan sağlığı | Durum, sürüm, hata oranı, son çalışma | `agent_runs`, `audit_events` | Kırmızı eşik: 3 ardışık hata |
| Uyarılar | Bütçe, fallback artışı, sağlayıcı kesintisi | `domain_events` (warn/error) | Uyarı = eylem önerisi, sadece bildirim değil |

**Okuma modeli:** Panel, `domain_events` tablosunu taramaz. Günlük/saatlik rollup tabloları
veya materialized view kullanılır; SSE yalnızca canlı katmanı besler. Hedef: panel açılışı
< 400 ms, toplu sorgular < 150 ms.

### 5.2 "Ops Floor" — 2.5D sahnenin tasarım kuralları

**Sahne:** 18×14 ızgara, sabit izometrik açı (2:1), dört bölge: *Planlama, Saha,
İnceleme, Operasyon*. Her ajanın bir masası, her bölgenin bir rengi vardır; renk tek
başına anlam taşımaz (etiket + ikon da vardır — WCAG 1.4.1).

**Hareket:** Ajan konumu olaydan türetilir (`zone` değişimi → 600-900 ms eased yürüyüş).
Boşta duran ajan nefes alır (2 sn'lik hafif salınım). Sürekli tick, LLM çağrısı veya
yol bulma yoktur.

**Bilgi hiyerarşisi (tek ekranda):**
1. Üst şerit: görev, mod (simülasyon/canlı), aktif model katmanı, **anlık maliyet**.
2. Sahne: kim nerede, hangi bölgede tıkanma var.
3. Sağ panel: canlı olay akışı + **onay bekleyen** kart (en yüksek öncelik).
4. Alt şerit: 5 adımlı pipeline (Anla → Planla → Yürüt → Doğrula → Teslim) + bütçe.

**Maliyet görünürlüğü:** her olay satırında o adımın $'ı; üstte kümülatif; altta bütçe
çubuğu. "Sürpriz fatura" yok.

**Düşük güç modu:** `prefers-reduced-motion` → yürüyüş animasyonu kapanır, kart görünümü
önerilir; `deviceMemory < 4` veya `hardwareConcurrency < 4` → otomatik 30 fps + gölge kapalı.

---

## 6. Maliyet ve performans bütçesi

### 6.1 Altyapı (10 eşzamanlı izleyici)

| Kalem | Hesap | Aylık |
|---|---|---|
| SSE bant genişliği | 300 B × 5 olay/sn × 10 istemci ≈ 15 KB/s | ~38 GB → 0 (self-host) |
| Render | İstemci tarafı, 2.5D canvas | $0 |
| Sunucu | Mevcut FastAPI süreci, ek servis yok | $0 ek |
| Depolama | Olaylar PostgreSQL'de, 90 gün retention | ~1-2 GB |

Prosedürel 3D vitrin açılırsa: ~350 KB CDN + kullanıcı başına 30-80 MB VRAM. Sunucu maliyeti
yine $0; **kullanıcı cihazında** küçük bir maliyet var. Varlıklı 3D (GLB) seçilirse
5-20 MB indirme + 150-400 MB VRAM; VR/pixel-streaming seçilirse GPU sunucusu $0,30-1,00/saat
— bu yüzden P3'te bile önerilmez.

### 6.2 Geliştirme bütçesi (tek geliştirici)

| Aşama | İş | Süre |
|---|---|---|
| P0 | CLI + olay sözleşmesi + replay | 3-5 gün |
| P1 | 2.5D Ops Floor (bu prototip) | 1-2 hafta |
| P2 | React dashboard (görev/ajan/bütçe/onay ekranları) | 3-4 hafta |
| P3 | 3D vitrin (R3F, ayrı paket, feature flag) | 4-6 hafta |

Token tarafında tasarruf **arayüzden değil** şu üç kaldıraçtan gelir (LeanSwarm §5):
model yönlendirme (T0→T1→T2), prompt caching, yerel/ucuz fallback. Arayüz bu üçünü
**görünür** yapar, kendisi tasarruf üretmez. Bu ayrımı karıştırmamak mimarinin en kritik
noktası.

### 6.3 Kare bütçesi

| Ölçüt | Hedef |
|---|---|
| Kare süresi (masaüstü) | < 6 ms (150-250 çizim çağrısı) |
| Kare süresi (mobil) | < 12 ms |
| Olay → ekran | < 100 ms (10 Hz birleştirme + 1 kare) |
| İlk boyama | < 150 ms (statik katman offscreen cache) |
| Bellek | < 60 MB |
| Paket | < 60 KB, sıfır çalışma zamanı bağımlılığı |

Statik katman (zemin, duvar, mobilya) offscreen canvas'a bir kez çizilir; her karede
yalnızca ajanlar, balonlar ve vurgular yeniden çizilir.

---

## 7. CLI yüzeyi (kontrol düzlemi)

```
zk task run "raporu güncelle" --budget 0.50 --team lean
zk task watch tsk_7f21            # canlı olay akışı (TUI, SSE ile aynı zarf)
zk approve apr_31 --yes           # onay = niyet, yetki API'de
zk cost --today --by agent
zk doctor                         # donanım, model, DB, port, secret kontrolü
zk replay events.jsonl --speed 4  # olay günlüğünü sahneye/terminale sar
```

Kural: **CLI'da olmayan bir yetenek web'de olmamalı.** Tersi serbesttir (web, CLI'ın
görsel projeksiyonudur). Böylece her özellik otomasyona ve teste açık kalır.

---

## 8. 3D "Vitrin" modu — kapı koşulları

3D ancak şu üç koşul birlikte sağlanınca açılır:

1. P1/P2 yüzeyleri kararlı (olay sözleşmesi v2'ye kadar donmuş, replay testleri yeşil).
2. 2.5D sahne ile **aynı** olay verisinden üretiliyor (tek fark renderer).
3. Feature flag + ayrı paket (`packages/office3d`), çekirdek bağımlılığı yok; kapalıyken
   hiçbir kod yüklenmiyor (lazy import).

Teknik tercih: React Three Fiber + instanced mesh, düşük poligonlu mobilya, baked ışık,
`dpr ≤ 1.5`, 8 ajan için 60 fps hedefi. Avatar hareketi yine **olaydan türetilir**;
3D'de serbest dolaşma, çarpışma, fizik yok — bunlar simülasyon (ADR-008) kapsamına girer
ve ayrı bir ürün kararıdır.

---

## 9. Erişilebilirlik ve güvenlik

- Klavye ile tam gezinme; `Space` duraklat, `1/2/3` hız, `L` canlı mod, `K` kart görünümü.
- Sahne bir `aria-live="polite"` özet metni yayınlar ("3 ajan çalışıyor, 1 onay bekliyor").
- Renk körlüğü: durum hem renk hem ikon/etiket; kontrast ≥ 4.5:1.
- Onay kartı, etkilenen kaynağı ve risk seviyesini **metinle** yazar; "onayla" düğmesi
  yalnızca `approval.required` olayından sonra etkinleşir.
- Renderer'a gelen olay içeriği **veri**dir, talimat değildir; olay metni HTML olarak
  yorumlanmaz (`textContent`), böylece prompt-injection kaynaklı UI injection engellenir.
- Oturum/secret bilgisi hiçbir yüzeye gönderilmez; SSE yalnızca `ref` taşır.

---

## 10. Aşamalar ve kabul kriterleri

| Aşama | Çıktı | Kabul |
|---|---|---|
| **P0** | `tools/swarm_sim.py` + olay zarfı + replay | Aynı JSONL → aynı terminal çıktısı; `--check` şema doğrular |
| **P1** | `apps/ops-floor` 2.5D sahne | 60 fps, SSE canlı mod, onay akışı, kart görünümü, klavye |
| **P2** | React Command Center (KPI, routing, onay, maliyet, ajan sağlığı) + görev/ajan ekranları | Overview < 400 ms, onay tek tıkla, i18n (TR/EN), E2E |
| **P3** | 3D vitrin (prosedürel, R3F/three.js) | Feature flag, ayrı paket, 2.5D ile aynı olay kümesi, 60 fps |
| **P3+** | Varlıklı 3D sahne (GLB) | Yalnızca vitrin ihtiyacı kanıtlanırsa; 2.5D varsayılan kalır |

MVP kabul: kullanıcı tek ekranda **hangi ajanın ne yaptığını**, **ne kadar harcandığını** ve
**neyin onay beklediğini** 5 saniyede görebiliyor; onayı tek tıkla verebiliyor; tüm bunlar
CLI'dan da yapılabiliyor.

---

## 11. Riskler

| Risk | Etki | Önlem |
|---|---|---|
| "Ofis" metaforunun simülasyona kayması | Kapsam patlaması, sürekli tick maliyeti | Bu ADR + ADR-008; 3D ayrı paket, fizik yok |
| Olay fırtınası | Arayüz kilitlenmesi | 10 Hz coalescing, `id` dedupe, sanallaştırılmış liste |
| Sadece görsele güvenme | Erişilebilirlik ve test kaybı | Kart görünümü + `aria-live` + replay snapshot |
| 3D'ye erken yatırım | 6-10 hafta kayıp, bakım borcu | P3 kapısı: ancak P1/P2 kararlıysa |
| UI'ın yetki sanılması | Güvenlik açığı | Renderer yalnızca niyet gönderir; karar Policy'de |
| Maliyetin görünmemesi | Bütçe aşımı | Her olayda $, üstte kümülatif, eşikte uyarı |

---

## 12. ADR kaydı

> **ADR-011:** Sunum katmanı, `domain_events` üzerinden beslenen çoklu yüzeydir. Birincil
> kontrol yüzeyi CLI, birincil gözlem yüzeyi 2.5D izometrik Ops Floor'dur. 3D ofis,
> çekirdekten bağımsız, özellik bayraklı bir vitrin renderer'ıdır; yürütme, onay veya
> gözlemlenebilirliğin kritik yolunda yer almaz.

Bu karar ADR-008'i **genişletir**, değiştirmez: 3D dünya motoru ayrı bir bounded context
olmaya devam eder; bu ADR yalnızca onun *görselleştirme* kısmını, olay tüketen bir
renderer olarak tanımlar.

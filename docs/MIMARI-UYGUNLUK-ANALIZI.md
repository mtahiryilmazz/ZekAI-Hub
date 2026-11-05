# Mimari Uygunluk Analizi — Lean Hybrid Agent Swarm ↔ ZekAI-Hub

**Tarih:** 5 Kasım 2026
**İncelenen belge:** `LEAN_HYBRID_AGENT_SWARM_ARCHITECTURE.md` (95.560 B, 33 bölüm, 10 katman, P0–P9 aşamaları, ADR-001…010)
**Karşılaştırılan kod:** `tools/swarm_sim.py`, `apps/ops-floor/index.html`, `apps/ops-floor/office3d.js`, `installer/windows/*`, `docs/ADR-011-sunum-katmani.md`

Yöntem: belgedeki her katman ve her MVP aşaması, depodaki gerçek dosya ve davranışla eşlendi. "Var" yalnızca kodda karşılığı varsa işaretlendi; belgede tarif edilip kodda olmayan her şey "yok" sayıldı.

---

## 1. Tek cümlelik hüküm

Belge **üretim sınıfı, çok kiracılı, kalıcı** bir platform tarif ediyor (FastAPI + PostgreSQL + pgvector + React + LangGraph, 30+ tablo, RLS, Tool Gateway, Policy Engine, Secret Vault). Depo ise **tek dosyalık, stdlib Python sunucusu + tek sayfalık arayüz** ile çalışan bir **dikey prototip**: sunum katmanı, olay şeması ve sağlayıcı kataloğu belgeyle uyumlu; kalıcılık, kimlik, politika, araç yürütme ve hafıza katmanları **hiç yok**.

Bu bir "kötü uygulama" değil, **bilinçli sıra farkı**: belge P0→P9 sırasıyla altyapıyı önce kuruyor, depo ise P7 (dashboard) + P2'nin (provider) bir bölümünü öne almış. Risk, farkın yazılı olmaması: belge okunduğunda depo "yarım" görünüyor, oysa depo **farklı bir kesit**.

---

## 2. Katman katman uyum

| # | Belge katmanı (§5.1) | Depodaki karşılık | Durum |
|---|---|---|---|
| 1 | Presentation (dashboard, approval, setup) | `apps/ops-floor/index.html` — Panel, Görevler, Saha 2.5D, Ofis 3D, Liste, onay kartı, ayarlar, yetenek paneli | **Kısmi — güçlü** |
| 2 | API & Identity (REST, SSE, auth, tenant, rate limit) | `swarm_sim.py` HTTP + SSE (`/api/*`); kimlik, tenant, rate limit **yok** | **Kısmi — zayıf** |
| 3 | Application (task/agent/team/approval/usage servisleri) | Tek `Handler` sınıfı; servis ayrımı yok | **Yok** |
| 4 | Orchestration (Supervisor, Planner, DAG, checkpoint) | Kural tabanlı 3 adımlı plan; DAG/checkpoint/retry yok | **Yok (taklit)** |
| 5 | Agent Runtime (profile/run/context/tool arayüzü) | `state.agents` sabit dizi; run kaydı, context builder yok | **Yok** |
| 6 | Model Gateway (registry, capability, routing, metering) | ~21 sağlayıcı preset, model listesi, T1–T3 eşleme, 429/503 retry, maliyet tablosu | **Kısmi — orta** |
| 7 | Tool & Skill (registry, MCP, sandbox, validation) | Skill: `~/.zekai/skills.json` + `/api/skills` (sürümlü). Tool/sandbox/MCP **yok** | **Kısmi — sadece skill** |
| 8 | Governance (Policy, approval, vault, audit, budget) | Onay kartı **simülasyon**; anahtar düz metin `config.json`; audit yok; günlük tavan **var** | **Zayıf** |
| 9 | Resource & Runtime (hardware detector, Resource Manager, queue) | `doctor` disk/port/Python kontrolü; GPU/VRAM algılama, kuyruk yok | **Yok** |
| 10 | Persistence (PostgreSQL, pgvector, Redis, object storage) | JSON dosyaları (`config/skills/usage`) + tarayıcı `localStorage` (son 30 görev) | **Yok** |

---

## 3. Somut boşluklar (kanıtlı)

### 3.1 Domain modeli ve veritabanı — 0 / 30+ tablo
Belge §18'de `users, tenants, tenant_memberships, sessions, provider_connections, model_profiles, provider_usage, agent_profiles, agent_runs, teams, team_members, tasks, task_steps, tool_definitions, tool_executions, action_proposals, approvals, memories, artifacts, audit_events, domain_events, jobs` tanımlı.
Kodda **hiçbiri yok**. Olaylar bellekte (`HUB`), görev geçmişi tarayıcıda. Sunucu yeniden başlarsa geçmiş kaybolur (yalnız SSE replay belleği).

### 3.2 Kimlik ve kiracı izolasyonu — yok
§16 iki kullanıcı/iki tenant testi, RLS, session revoke istiyor. Kod tek kullanıcı varsayıyor; `tenant_id` hiçbir yerde yok. `domain_events` şemamızda `tenant_id` ve `schema_version` **eksik** (§18.6 ile uyumsuz).

### 3.3 Ajan yaşam döngüsü — durum makinesi yok
§9.3 `CREATED → VALIDATED → QUEUED → RUNNING → WAITING_FOR_APPROVAL → REVIEWING → COMPLETED` ve hata geçişleri istiyor. Kodda `status` serbest metin (`"çalışıyor"`, `"bekliyor"`), geçiş doğrulaması yok; model/UI doğrudan yazabiliyor.

### 3.4 Orkestrasyon — DAG değil, sabit şablon
§10 DAG, bağımlılık, checkpoint, idempotency, paralellik limiti istiyor. Kod tek çağrı yapıyor ve planı **gösterim amaçlı** üretiyor (`Denetçi → Planlayıcı → …`). Bu, maliyeti düşük tutmak için doğru bir tercih; ama "çok ajanlı" değil, "çok ajanlı **görünen**".

### 3.5 Model Gateway — katalog var, sözleşme yok
§11.3 `list_models, get_model_capabilities, validate_credentials, generate, stream, health_check, normalize_error, estimate_usage` istiyor. Kodda `list_models`, `test`, `chat` var; **capability, streaming, sağlık, normalize hata, tahmin** yok. §11.8 "ücretli modele sessiz geçiş yasak" — bizde fallback yok, dolayısıyla ihlal de yok, ama garanti de yok.

### 3.6 Araç yürütme — hiç yok
§14 Tool Gateway, `ActionProposal`, L0–L4 risk, sandbox. Kodda model yalnız metin üretiyor; dosya/komut/ağ erişimi yok. Bu **güvenlik açısından iyi** (saldırı yüzeyi yok), ürün açısından eksik (ajan iş yapamıyor).

### 3.7 Hafıza — yok
§13 dört tür (working/episodic/semantic/procedural) ve kaynak/güven/saklama istiyor. Kodda yalnız **procedural** karşılığı olan skill var; geçmiş görevlerden öğrenme yok.

### 3.8 Bütçe — 7 katmandan 1'i
§21.1 global/tenant/user/task/run/provider/tool katmanları; §21.2 `max_cost, max_input_tokens, max_model_calls, max_agent_runs, max_parallel_agents, max_tool_calls, max_retries, max_duration_seconds`. Kodda **yalnız global günlük tavan** var (`daily_cap_usd`), uyarı eşiği ve görev bütçesi yok.

### 3.9 Gözlemlenebilirlik — olay var, metrik yok
§23 log/metrik/trace/health/Setup Doctor istiyor. Kodda SSE olay hattı ve `doctor` var; OpenTelemetry, metrik, trace, `/health` sözleşmesi yok.

### 3.10 Kurulum ve dağıtım — PowerShell var, Compose yok
§24 Docker Compose ana yol, Windows bootstrapper ikincil. Depo tam tersi: `installer/windows/*` var, `compose.yaml` yok. §3.6 "ücretsiz bağımlılık yok" ile §6.5/§24.4 Docker Desktop lisans uyarısı **çelişiyor** (aşağıda).

---

## 4. Aşama (P0–P9) durumu

| Aşama | Belgenin kabul ölçütü | Depo |
|---|---|---|
| P0 Repository foundation | CI yeşil, health endpoint, `.env.example` | **Yok**: `.github/` yok, `compose.yaml` yok; health yerine `doctor` |
| P1 Identity/tenant | İki tenant izolasyon testi | **Yok** |
| P2 Provider Gateway | Mock ile uçtan uca, cloud fallback kapalı | **Kısmi**: mock + Google gerçek çağrı var; adapter sözleşmesi yok |
| P3 Agent Runtime | Görev oluştur → plan → tek ajan → sonuç | **Var (prototip düzeyi)**: tek çağrı, sonuç, iptal yok |
| P4 Multi-agent | En az iki uzman ajan, retry/timeout, loop engeli | **Yok**: plan gösterimi var, ikinci çağrı yok |
| P5 Tools/policy/approvals | Onaysız eylem çalışmaz | **Yok**: onay kartı tıklanabilir ama eylem yok |
| P6 Memory/artifact | Kaynaklı retrieval, silme | **Yok** |
| P7 Dashboard/SSE | Ana akış UI'dan tamamlanır | **Var — belgeden ileri** (5 görünüm, 3D, 2.5D) |
| P8 Setup Wizard | Temiz Windows'ta kurulum | **Kısmi**: `-DryRun`/`doctor` var, wizard yok |
| P9 Hardening | SBOM, imzalı artefakt, güvenlik testleri | **Yok** |

Sonuç: depo **P7'de ileri, P0/P1/P3/P5/P6'da geride**. Belge sırası ile depo sırası arasında **6 aşama** kayma var.

---

## 5. Belgenin kendi içindeki gerilimler

1. **"Ücretsiz bağımlılık yok" (§3.6) ↔ Docker Compose ana dağıtım (§6.5) ↔ Docker Desktop lisansı (§24.4).**
   Windows'ta tek tık kurulum hedefi Docker Desktop lisansına takılır. Mevcut stdlib çözümü §3.6 ile uyumlu, §6.5 ile değil. Karar gerekiyor: *Docker opsiyonel, stdlib varsayılan* mı, *Docker zorunlu* mu?
2. **"Hardware-agnostic, RX 570 minimum" (§3.3) ↔ PostgreSQL + pgvector + Redis (§6.4).**
   Postgres CPU'da çalışır ama tek kullanıcılı local-first kurulumda **işletim yükü** yaratır. Alternatif: SQLite + `sqlite-vec`, üretimde Postgres'e geçiş (port/adapter).
3. **3D/AI Town "P9 sonrası" (§27, §32) ↔ ürünün farklılaştırıcısı sunum katmanı (ADR-011).**
   Belge 3D'yi erteliyor; depo tam oraya yatırım yapmış. Bu bir çelişki değil ama **belgede yazılı olmayan bir ürün kararı**: "önce görsel ürün, sonra altyapı". ADR olarak yazılmalı.
4. **11 ekran (§20.1) ↔ 5 görünüm (kod).**
   Eksik: Agent Studio, Team Builder, Approval Center, Memory Center, Tools & Skills, Usage & Budgets, Setup Wizard. Bunların bir kısmı tek panelde birleştirilebilir; belge ekran sayısını hedef gibi sunuyor.
5. **ADR-001…010 belge içinde gömülü (§31), depoda yalnız `ADR-011` var.**
   Karar kayıtları dosya olarak ayrışmamış; `docs/adr/` boş. İzlenebilirlik için her ADR ayrı dosya olmalı.

---

## 6. Önerilen sıra (prototipi ürüne çeviren minimum çekirdek)

Belgenin P0→P9 sırasını birebir izlemek, çalışan bir görsel ürünü **aylarca** altyapıya gömer. Bunun yerine "dikey kesit" önerisi:

### Sprint A — Kalıcı çekirdek (2–3 gün)
- SQLite (tek dosya, `~/.zekai/zekai.db`) + `domain_events`, `tasks`, `task_steps`, `agent_runs`, `approvals`, `usage` tabloları.
- `tenant_id` ve `schema_version` alanlarını olay şemasına ekle (şimdi eklemek, sonra eklemekten 10× ucuz).
- Görev geçmişini `localStorage`'dan DB'ye taşı; SSE replay'i DB'den besle.
- Ajan durumu için **state machine** (izinli geçiş tablosu).

### Sprint B — Kontrollü eylem (3–5 gün)
- `ActionProposal` + `Tool Gateway` iskeleti; yalnız **L0/L1** araçlar (dosya listeleme, repo özeti — salt okunur).
- Policy: `ALLOW / DENY / REQUIRE_APPROVAL`; onay kartı gerçek bir kayda bağlansın.
- Skill'i plana bağla: planlayıcı, seçili skill'in adımlarını alt görevlere çevirsin.

### Sprint C — Kurulum ve güven (2–3 gün)
- Setup Doctor'ı wizard'a çevir (port, model, anahtar, disk, WebGL).
- Anahtarı düz metinden çıkar: Windows DPAPI veya en azından `0600` + kullanıcı bazlı dosya.
- `usage` tablosundan günlük/aylık rapor; uyarı eşiği (%80).
- Backup/restore: `zekai.db` + `config.json` (şifreli zip).

### Bilinçli olarak **yapılmayacaklar** (şimdilik)
- RLS ve çok kiracılılık (tek kullanıcı doğrulanmadan).
- Kubernetes, Redis, object storage.
- pgvector zorunluluğu (SQLite FTS5 + `sqlite-vec` yeterli).
- 3D'yi kritik yola almak (lazy yükleme doğru karar).
- MCP/plugin marketi.

---

## 7. Bu depo için ölçülebilir kabul

1. Sunucu yeniden başladıktan sonra son 100 görev ve maliyet **kaybolmuyor**.
2. Her olayda `tenant_id` + `schema_version` var; şema testi bunu doğruluyor.
3. Geçersiz durum geçişi (`completed → running`) **reddediliyor** ve testte kanıtlı.
4. Onay gerektiren bir eylem, onay olmadan **çalışmıyor**; onay sonrası audit kaydı düşüyor.
5. Günlük tavan aşımı 400 döndürüyor (mevcut) **ve** %80'de uyarı olayı üretiyor.
6. `doctor` çıktısı: Python, port, disk, model, anahtar, WebGL — altı satır, hepsi makine okunur (`--json`).

---

## 8. Not: belgede olmayan ama kodda olan

Belge, sunum katmanını §20'de 11 ekranla tarif ediyor; kodda bunun ötesinde **olay projeksiyonlu 2.5D/3D ofis, klasör metaforu, maskot kataloğu, ajan detay popup'ı** var. Bunlar belgede yok. İki seçenek:

- Belgeye **§20.4 Görsel Ofis** eklenip kod gerçekliği belgeye yazılır (önerilen), veya
- Bu özellikler "deneysel" olarak işaretlenir ve MVP dışı sayılır.

Şu anki durum — belgede yok, kodda var, ADR-011'de kısmen var — **üç ayrı gerçek** üretiyor; yeni gelen geliştirici hangisinin doğru olduğunu bilemez.

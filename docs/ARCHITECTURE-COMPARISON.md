# Mimari Karşılaştırma — Agent Swarm, Swarms, ZekAI Hub

**Tarih:** 5 Kasım 2026
**Kaynaklar:**
- `agent-swarm` — https://github.com/desplega-ai/agent-swarm (klon: `.tmp/agent-swarm`, v2.8.0)
- `swarms` — https://github.com/kyegomez/swarms (klon: `.tmp/swarms`)
- Ürün sayfası — https://www.agent-swarm.dev/ ve `/skill.md`, `/docs`

Bu belge **gözlem → çıkarım → bizde uygulama** ayrımını korur. Klonlar geçici dizindedir; repoya dahil değildir.

---

## 1. Agent Swarm (desplega) — gözlem

Hub-and-spoke: merkezi MCP API sunucusu (SQLite), **lead agent** ve Docker konteynerlerinde **worker**'lar.

- **Lead/worker:** lead görevi böler, worker'lara dağıtır; worker ilerlemeyi `store-progress` ile bildirir.
- **Skill sistemi:** tekrar kullanılabilir prosedürel bilgi; ajanlar oluşturur, paylaşır, kurar, yayımlar. Sitedeki örnek: `gtm-meeting-os` v3 — “bir düzeltme kalıcı hale gelir” (cloud signups ≠ GitHub stars).
- **Görev yaşam döngüsü:** öncelik kuyruğu, bağımlılık, duraklat/devam, **task steering** (çalışan işe bağlam ekleme).
- **Kalıcı hafıza ve kimlik:** her ajanın kişiliği/uzmanlığı oturumlar arası birikir.
- **HITL:** workflow düğümünde insan onayı; dashboard'da onay kuyruğu.
- **Bütçe:** günlük harcama tavanı; aşılırsa yeni iş duraklar (`budget-admission`, `budget-refusal-notify`).
- **Entegrasyonlar:** Slack, GitHub/GitLab, Linear/Jira, e-posta, MCP; bağlantılar (OpenAPI/GraphQL/MCP).
- **Gözlemlenebilirlik:** OpenTelemetry, oturum başına maliyet, bağlam kullanımı/compaction.
- **Dağıtım:** Docker Compose / Helm; veri ve anahtarlar kullanıcının altyapısında.

## 2. Swarms (kyegomez) — gözlem

Python çok-ajanlı orkestrasyon kütüphanesi; topoloji zenginliği öne çıkıyor (`swarms/structs`):

- **Topolojiler:** sequential, concurrent, hierarchical, hybrid hierarchical-peer, mixture-of-agents, debate + judge, LLM council, majority voting, planner-worker, router, tree, graph, auction, heavy swarm.
- **Bileşenler:** `agent.py`, `agent_router.py`, `model_router.py`, `skills_manager.py`, `tool_manager.py`, `context_compressor.py`.
- **Desen:** kartopu değil, **topoloji seçimi** — görev tipine göre akış (fan-out, hakem, oylama).
- **Risk:** her ek ajan/çağrı maliyet ve gecikme; bağlam taşıma disiplini yoksa naif sürü tek ajandan pahalı.

## 3. Bizde ne var (ZekAI Hub)

- Tek olay hattı (`domain_events`) + 2.5D/3D/panel renderer'ları.
- Kural tabanlı plan + **tek** model çağrısı; T1/T2/T3 → model eşlemesi.
- Sağlayıcı kataloğu (OpenAI/Anthropic/Google/OpenRouter/Z.ai/Kimi/… + yerel Ollama/LM Studio).
- Onay kartı, bütçe çubuğu, görev geçmişi, ajan detay popup'ı, klasör akışı.
- Eksikler: paylaşılan **skill** yok; **günlük tavan** yok; ajan hafızası yok; topoloji seçimi yok.

## 4. Bu turda uygulananlar

| Desen | Kaynak | Bizde |
|---|---|---|
| Sürümlü paylaşılan skill, göreve enjeksiyon | agent-swarm | `~/.zekai/skills.json` + `/api/skills` + “Yetenek” paneli; her kayıtta `version++` |
| Günlük harcama tavanı ve reddi | agent-swarm (`budget-admission`) | `daily_cap_usd` ayarı; `/api/chat` tavan aşılınca 400 döner, günlük kullanım `~/.zekai/usage.json` |
| Tek çağrı disiplini | swarms (maliyet uyarısı) | Plan çok adımlı görünse de **tek** model çağrısı |

## 5. Ertelenenler (bilinçli)

- **Çoklu çağrı topolojileri** (concurrent/debate/council): maliyeti katlar; “derin mod” + açık bütçe onayı olmadan açılmayacak.
- **Docker worker / harness** (Claude Code, Codex): bizim geçit HTTP sağlayıcılarıyla çalışıyor; CLI adaptörü ayrı karar.
- **Task steering / workflow DAG / HITL düğümleri:** olay sözleşmesi hazır, motor yok.
- **Ajan hafızası:** sonraki adım (özet + geri çağırma, provenance ile).

## 6. Kararlar

1. Skill'ler **kullanıcıya ait ve yerel**; sürüm artışı geri alınamaz (v2 → v1 dönüş yok, yeni kayıt).
2. Günlük tavan **sunucuda** uygulanır; istemci atlayamaz.
3. Topoloji zenginliği, maliyet nedeniyle **tek çağrı** varsayılanıyla sınırlı; çoklu çağrı ancak ölçülmüş fayda + onayla.
4. Dış entegrasyonlar (Slack/GitHub/Linear) OAuth gerektirir; bu turda **taklit edilmedi**.

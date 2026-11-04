# Lean Hybrid Agent Swarm

## Kapsamlı Sistem Mimarisi ve Teknik Tasarım Belgesi

**Belge türü:** Architecture & Technical Design Specification\
**Sürüm:** 1.0\
**Tarih:** 4 Kasım 2026\
**Durum:** Onaylanmış mimari kararlar temel alınarak hazırlanmış tasarım
belgesi\
**Ürün yaklaşımı:** Local-first, provider-agnostic, hardware-agnostic,
security-first\
**Birincil geliştirme ortamı:** Antigravity\
**Birincil hedef:** Tek geliştirici tarafından, ücretsiz araçlarla
başlanabilen; modüler, test edilebilir ve sonradan ölçeklenebilir açık
kaynak ajan platformu

------------------------------------------------------------------------

# 1. Belgenin amacı

Bu belge, Lean Hybrid Agent Swarm platformunun ürün hedeflerini, sistem
sınırlarını, mimari kararlarını, bileşenlerini, veri modellerini,
güvenlik ilkelerini, çalışma akışlarını, dağıtım yöntemlerini, test
stratejisini ve aşamalı geliştirme planını tek bir teknik referansta
birleştirir.

Bu belge: - Kodlama ajanına (öncelikle Antigravity) uygulama talimatı
vermek, - Geliştirme sırasında mimari tutarlılığı korumak, - Modüller
arasındaki sorumlulukları ve sözleşmeleri tanımlamak, - Güvenlik ve
gizlilik gereksinimlerini baştan uygulamak, - MVP ile ileri sürüm
özelliklerini birbirinden ayırmak, - Test ve kabul ölçütlerini
belirlemek, - Yeni katkıda bulunan geliştiricilere projenin nasıl
çalıştığını açıklamak

için hazırlanmıştır.

Bu belge, henüz uygulanmamış özelliklerin uygulanmış olduğu anlamına
gelmez. Her özellik, kod, test ve dokümantasyonla doğrulanmadan
tamamlanmış kabul edilmez.

## 1.1 Belgeyi okuma ve uygulama kuralları

1.  MUST / SHALL: Zorunlu gereksinim.
2.  SHOULD: Güçlü biçimde önerilen gereksinim; sapma
    gerekçelendirilmelidir.
3.  MAY: İsteğe bağlı özellik.
4.  MVP: İlk kullanılabilir sürüm için gerekli kapsam.
5.  FUTURE: MVP sonrasına bırakılacak özellik.
6.  ADR: Architecture Decision Record; mimari karar kaydı.

Bir gereksinim güvenlik, tenant izolasyonu, veri gizliliği veya
kullanıcı onayıyla ilgiliyse, kolaylık gerekçesiyle sessizce devre dışı
bırakılamaz.

------------------------------------------------------------------------

# 2. Ürün vizyonu

Lean Hybrid Agent Swarm; kullanıcının hedefini anlayan, işi uzman
ajanlara bölen, gerektiğinde farklı modelleri kullanan, sonuçları
denetleyen ve kontrollü biçimde araç çalıştırabilen modüler bir yapay
zekâ ajan platformudur.

Platformun temel deneyimi: 1. Kullanıcı bir görev tanımlar. 2. Sistem
görevi doğrular, kapsamını ve riskini belirler. 3. Planner/Supervisor
uygun görev planını çıkarır. 4. Gerekli uzman ajanlar ve araçlar
seçilir. 5. Model Gateway görev için uygun modeli belirler. 6. Ajanlar
yetkileri dahilinde çalışır. 7. Riskli eylemler Policy Engine tarafından
engellenir veya insan onayına sunulur. 8. Sonuçlar Reviewer tarafından
kontrol edilir. 9. Kullanıcıya çıktı, kaynaklar, kullanılan modeller,
maliyet ve işlem geçmişi gösterilir. 10. İzin verilen bilgiler kontrollü
biçimde hafızaya yazılır.

Platform yalnızca sohbet arayüzü değildir. Görev yürütme, ajan yaşam
döngüsü, araç yetkilendirme, model yönlendirme, hafıza, kaynak yönetimi
ve denetlenebilirlik katmanlarından oluşur.

## 2.1 Ürün hedefleri

-   Kolay kurulum ve kolay yönetim.
-   Local model ile ücretsiz/yerel başlangıç.
-   İsteğe bağlı BYOK (Bring Your Own Key) cloud sağlayıcıları.
-   Aynı görevde birden fazla uzman ajanı koordine edebilme.
-   Tek makinede başlayıp worker mimarisiyle genişleyebilme.
-   Donanım ve model sağlayıcısından bağımsız çalışma.
-   Her eylem için açık yetki sınırları.
-   Kullanıcı verilerinin ve kimlik bilgilerinin tenant bazında
    korunması.
-   Gözlemlenebilir, test edilebilir ve geri alınabilir operasyonlar.
-   Tek depo, tek yönetim paneli ve mümkün olduğunca tek kurulum
    deneyimi.

## 2.2 Ürün hedefi olmayan konular

İlk sürümde aşağıdakiler hedef değildir: - Herhangi bir LLM aboneliğini
üçüncü taraf uygulamaya taşıyan resmi olmayan kimlik doğrulama. -
Kullanıcının tarayıcı çerezlerini, CLI oturum dosyalarını veya abonelik
tokenlarını toplamak. - İnsan onayı olmadan sınırsız işletim sistemi
komutu çalıştırmak. - Her ajanı sürekli aktif tutup her saniye LLM
çağrısı yapmak. - İlk sürümde Kubernetes veya çok bölgeli dağıtık
altyapı zorunluluğu. - 3D dünya motorunu temel görev yürütme sistemine
gömmek. - Ücretli API'yi varsayılan veya zorunlu hale getirmek. - Model
çıktısını doğrulamadan gerçek dünyada eyleme dönüştürmek.

------------------------------------------------------------------------

# 3. Temel mimari ilkeler

## 3.1 Local-first

Varsayılan çalışma modu yereldir. Kullanıcı bir cloud sağlayıcı
bağlamadığı sürece görev içeriği, özel dosyalar ve hafıza harici
sağlayıcılara gönderilmez.

Local-first: - Yerel API ve dashboard, - Yerel veritabanı, - Yerel
worker, - İsteğe bağlı Ollama veya uyumlu yerel model sunucusu, - Yerel
şifreli secret storage, - Kullanıcının açıkça etkinleştirdiği dış
bağlantılar

üzerinden çalışır.

Local-first, her makinede LLM çalıştırmanın mümkün veya ücretsiz olduğu
anlamına gelmez. Model çalıştırmanın RAM, VRAM, CPU, disk, enerji ve
gecikme maliyeti vardır.

## 3.2 Provider-agnostic

Ajanlar sağlayıcı SDK'larına doğrudan bağlanmaz. Tüm model çağrıları
Model Gateway üzerinden yapılır.

Ajan kodu şu varsayımları yapmamalıdır: - Belirli bir sağlayıcının var
olduğu, - Belirli bir model adının bulunduğu, - Her modelin tool calling
desteklediği, - Her modelin aynı context window'a sahip olduğu, - Her
modelin aynı JSON/schema davranışına sahip olduğu.

## 3.3 Hardware-agnostic

Ürün tek bir GPU, CPU, RAM veya işletim sistemi profiline sabitlenmez.

Runtime donanımı algılar ve kapasite profili üretir. Donanım profili: -
Model seçimi, - Paralellik, - Worker sayısı, - Context boyutu, - Batch
büyüklüğü, - Bellek bütçesi, - Yerel model önerileri

için kullanılır.

Kullanıcının ilk geliştirme bilgisayarı yalnızca başlangıç test
ortamıdır. Ürün mimarisi bu makinenin sınırlarına göre tasarlanmaz.

## 3.4 Deployment-flexible

İlk sürüm tek makinede çalışır. Modüller arası sınırlar, ileride ayrı
worker makinelerine taşınmaya izin verir.

Başlangıç: - Tek API, - Tek dashboard, - Tek worker servisi, -
PostgreSQL, - İsteğe bağlı Redis, - İsteğe bağlı Ollama.

Gelecek: - Birden çok worker, - Remote worker registration, - Queue
broker, - Ayrı tool execution workers, - Birden fazla API instance, -
Harici object storage.

## 3.5 Security-first

-   Model çıktısı güvenilir talimat değildir.
-   Kullanıcı girdisi ve web içeriği güvenilir talimat değildir.
-   Araçlar allowlist üzerinden sunulur.
-   Her araç çağrısı Policy Engine'den geçer.
-   Riskli işlemler için insan onayı gerekir.
-   Secret değerleri frontend'e geri dönmez.
-   Tenant sınırları her veri erişiminde uygulanır.
-   Harici sağlayıcıya veri gönderimi açık politika ve kullanıcı izni
    gerektirir.
-   Varsayılan ağ erişimi kapalı veya sınırlandırılmıştır.
-   Araç çalıştırma sandbox içinde yapılır.

## 3.6 No paid dependency

MVP'nin temel işlevleri ücretli API gerektirmemelidir.

-   Local model sağlayıcısı isteğe bağlıdır.
-   Yerel model yoksa sistem model gerektirmeyen kurulum/health/config
    işlevlerini yine sunar.
-   Kullanıcı kendi cloud API anahtarını eklerse cloud model etkinleşir.
-   Otomatik ücretli fallback yapılmaz.
-   Ücret doğurabilecek sağlayıcıya geçişte kullanıcı bütçe/politika
    ayarı zorunludur.

------------------------------------------------------------------------

# 4. Kullanıcılar, kullanım senaryoları ve roller

## 4.1 Kullanıcı profilleri

1.  Tek kullanıcı / kişisel kurulum:
    -   Uygulama kendi bilgisayarında çalışır.
    -   Tek tenant veya kişisel tenant.
    -   Yerel model ve kişisel BYOK anahtarı.
2.  Küçük ekip:
    -   Birden fazla kullanıcı aynı sunucuya bağlanır.
    -   Kullanıcılar kendi provider bağlantılarını yönetir.
    -   Paylaşılan ajan şablonları olabilir.
    -   Kişisel hafıza ve görev verileri ayrıdır.
3.  Self-hosted kurumsal:
    -   Kurum kendi altyapısında barındırır.
    -   Tenant, rol, politika ve audit yönetimi gerekir.
    -   Merkezi admin politikaları kullanıcı ayarlarından daha
        kısıtlayıcı olabilir.
4.  Geliştirici:
    -   API, plugin, skill, MCP server ve custom agent geliştirir.
    -   Geliştirme modu ayrıcalıkları production moduna taşınmaz.

## 4.2 Rol modeli

-   Owner: Kurulum/tenant sahibi; tenant ayarları ve üyelik.
-   Tenant Admin: Kullanıcı, politika ve kaynak yönetimi.
-   Member: Kendi görevlerini, ajanlarını ve sağlayıcı bağlantılarını
    yönetir.
-   Operator: Görevleri izler ve onay bekleyen eylemleri değerlendirir.
-   Auditor: Salt okunur audit ve rapor erişimi.
-   Developer: Geliştirme ortamında plugin/skill oluşturur.
-   System Service: İnsan kullanıcı değildir; sınırlı servis kimliğidir.

RBAC, gerektiğinde ABAC koşullarıyla genişletilir. Rol tek başına hassas
bir eyleme izin vermemelidir; tenant, kaynak sahibi, eylem seviyesi ve
politika koşulları da değerlendirilmelidir.

## 4.3 Temel kullanım senaryoları

-   Kullanıcı bir araştırma görevi verir.

-   Sistem görevi alt görevlere böler.

-   Araştırmacı ajan kaynak toplar.

-   Analist ajan kaynakları karşılaştırır.

-   Reviewer ajan iddiaları ve kaynakları kontrol eder.

-   Kullanıcı rapor alır.

-   Kullanıcı yerel model kurar.

-   Setup Doctor donanımı algılar.

-   Model Gateway yerel sağlayıcıyı kaydeder.

-   Resource Manager kapasiteye göre eşzamanlı çağrıları sınırlar.

-   Kullanıcı kendi API anahtarını bağlar.

-   Backend anahtarı şifreli saklar.

-   Frontend yalnızca bağlantı durumu ve maskelenmiş tanımlayıcı
    gösterir.

-   Model Gateway yalnızca ilgili kullanıcının/tenant'ın yetkili
    bağlantısını kullanır.

-   Ajan bir dosya silme veya komut çalıştırma önerir.

-   Tool Gateway eylem teklifini oluşturur.

-   Policy Engine riski değerlendirir.

-   Onay gerekiyorsa işlem beklemeye alınır.

-   Kullanıcı onay verirse sandbox içinde çalıştırılır.

-   Sonuç doğrulanır ve audit kaydı oluşturulur.

------------------------------------------------------------------------

# 5. Üst düzey sistem mimarisi

## 5.1 Mantıksal katmanlar

1.  Presentation Layer
    -   Web dashboard
    -   Admin panel
    -   Setup Wizard
    -   Approval Center
    -   Monitoring views
2.  API & Identity Layer
    -   REST API
    -   WebSocket/SSE
    -   Authentication
    -   Authorization
    -   Tenant context
    -   Rate limiting
3.  Application Layer
    -   Task Service
    -   Agent Service
    -   Team Service
    -   Workflow Service
    -   Approval Service
    -   Provider Connection Service
    -   Usage/Budget Service
4.  Orchestration Layer
    -   Supervisor
    -   Planner
    -   LangGraph workflows
    -   Task decomposition
    -   Agent scheduling
    -   Retry and recovery
5.  Agent Runtime Layer
    -   Agent profiles
    -   Agent runs
    -   Context builder
    -   Prompt/template registry
    -   Tool request interface
    -   Result normalization
6.  Model Gateway Layer
    -   Provider registry
    -   Model catalog
    -   Capability normalization
    -   Routing policy
    -   Credential resolution
    -   Retry/fallback
    -   Token/cost metering
7.  Tool & Skill Layer
    -   Tool registry
    -   Skill registry
    -   MCP adapters
    -   Tool Gateway
    -   Sandbox execution
    -   Action validation
8.  Governance & Security Layer
    -   Policy Engine
    -   Approval workflow
    -   Secret Vault
    -   Tenant isolation
    -   Audit log
    -   Data classification
    -   Budget enforcement
9.  Resource & Runtime Layer
    -   Hardware detector
    -   Resource Manager
    -   Worker manager
    -   Queue
    -   Local model process discovery
    -   Health monitoring
10. Persistence Layer

-   PostgreSQL
-   pgvector
-   Redis (optional)
-   Object storage (optional)
-   Local secret store

## 5.2 Mantıksal mimari diyagramı

``` mermaid
flowchart TB
    U[User] --> UI[React Dashboard]
    UI --> API[FastAPI API]
    API --> IAM[Identity and Tenant Context]
    API --> APP[Application Services]
    APP --> ORCH[LangGraph Orchestrator]
    ORCH --> AR[Agent Runtime]
    AR --> MG[Model Gateway]
    MG --> LP[Local Providers]
    MG --> CP[Cloud Providers BYOK]
    AR --> TG[Tool Gateway]
    TG --> PE[Policy Engine]
    PE --> AP[Approval Service]
    TG --> SB[Sandbox Workers]
    APP --> MEM[Memory Service]
    APP --> RM[Resource Manager]
    APP --> DB[(PostgreSQL + pgvector)]
    APP --> VAULT[Secret Vault]
    ORCH --> Q[Queue / Worker Pool]
    Q --> ORCH
    API --> OBS[Logs Metrics Traces]
```

## 5.3 Ana veri akışı

1.  API, kullanıcının kimliğini doğrular.
2.  Tenant context oluşturulur.
3.  Request schema doğrulanır.
4.  Task Service görev kaydı oluşturur.
5.  Policy Engine görev kapsamını ve izinleri değerlendirir.
6.  Orchestrator workflow başlatır.
7.  Planner görev grafiği üretir.
8.  Scheduler ajanları ve kaynakları seçer.
9.  Agent Runtime context hazırlar.
10. Model Gateway model ve credential seçer.
11. Model yanıtı normalize edilir.
12. Araç çağrısı varsa Tool Gateway'e gider.
13. Policy Engine eylemi kontrol eder.
14. Gerekirse Approval Service bekler.
15. Sandbox Worker aracı çalıştırır.
16. Sonuç doğrulanır.
17. Hafıza politikası uygun bilgiyi kaydeder.
18. Reviewer sonucu kontrol eder.
19. Task Service tamamlanma durumunu günceller.
20. UI olayları WebSocket/SSE ile gösterir.
21. Usage, cost ve audit kayıtları tamamlanır.

------------------------------------------------------------------------

# 6. Teknoloji yığını ve seçim gerekçeleri

Teknoloji seçimleri MVP için başlangıç önerisidir. Sürüm yükseltmeleri
kontrollü yapılmalı; ana sürüm aralıkları lockfile ve CI ile
sabitlenmelidir.

## 6.1 Backend

-   Python 3.12+
-   FastAPI
-   Pydantic v2
-   SQLAlchemy 2.x
-   Alembic
-   Uvicorn
-   HTTPX
-   Structured logging
-   OpenTelemetry uyumlu instrumentation

Gerekçe: - AI/ML ekosistemiyle uyum, - Tipli API sözleşmeleri, - Hızlı
geliştirme, - Asenkron I/O, - Kolay test edilebilirlik.

## 6.2 Orchestration

-   LangGraph: stateful workflow ve checkpoint.
-   Platforma özgü orchestration adapter: LangGraph detaylarını domain
    katmanından ayırır.
-   Custom Agent Runtime: agent profile/run/context/tool contracts.

LangGraph doğrudan tüm uygulamaya yayılmamalıdır. Uygulama servisleri
platformun kendi workflow arayüzünü kullanmalı; LangGraph adapter arka
planda çalışmalıdır.

## 6.3 Frontend

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   shadcn/ui
-   TanStack Query
-   React Router
-   Zod (client-side schema validation)
-   WebSocket veya SSE event client

UI erişilebilir, responsive ve Türkçe karakterleri doğru işleyen bir
yapıda olmalıdır. Dil altyapısı i18n'e hazır tasarlanmalı; ilk dil
Türkçe ve İngilizce olabilir.

## 6.4 Veri katmanı

-   PostgreSQL: kalıcı ilişkisel veri.
-   pgvector: semantik hafıza araması.
-   Redis: yalnızca queue, cache, distributed lock veya rate-limit
    ihtiyacı oluştuğunda.
-   S3 uyumlu object storage: büyük dosya ve artifact'ler için ileriki
    aşama.

MVP'de Redis zorunlu bağımlılık yapılmamalıdır. Basit tek worker modunda
PostgreSQL tabanlı job tablosu veya uygulama içi sınırlı queue yeterli
olabilir. Ancak production worker kuyruğu için dayanıklı broker ihtiyacı
ayrıca değerlendirilmelidir.

## 6.5 Dağıtım

-   Docker Compose: ana self-hosted dağıtım.
-   Windows PowerShell bootstrapper: Windows kurulum ve yönetim.
-   Windows installer: olgunlaşınca paketlenmiş kurulum.
-   Linux: Docker Compose ve systemd yönergeleri.
-   Kubernetes: MVP dışı.

Docker Desktop lisans şartları kullanıcıya açıkça bildirilmelidir.
Ücretsiz olduğu her kullanım senaryosunda varsayılmamalıdır.

## 6.6 Model çalışma zamanı

-   Ollama: ilk yerel provider adapter.
-   OpenAI-compatible local endpoint: genel uyum katmanı.
-   llama.cpp server: ileriki yerel adapter.
-   OpenAI API, Anthropic API, Gemini API, Vertex AI: BYOK cloud
    adapter'ları.

Model sağlayıcılarına ait SDK'lar yalnızca provider adapter modüllerinde
bulunmalıdır.

------------------------------------------------------------------------

# 7. Monorepo ve proje dizin yapısı

Önerilen depo adı: `lean-hybrid-agent-swarm`. Depo oluşturulmuş kabul
edilmez; gerçek GitHub deposu oluşturulduğunda URL güncellenmelidir.

``` text
lean-hybrid-agent-swarm/
├── apps/
│   ├── api/
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── lifespan.py
│   │   │   ├── api/
│   │   │   │   ├── v1/
│   │   │   │   └── dependencies/
│   │   │   ├── middleware/
│   │   │   ├── exception_handlers/
│   │   │   └── config.py
│   │   ├── tests/
│   │   └── pyproject.toml
│   ├── worker/
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── consumers/
│   │   │   ├── executors/
│   │   │   └── health.py
│   │   ├── tests/
│   │   └── pyproject.toml
│   └── dashboard/
│       ├── src/
│       │   ├── app/
│       │   ├── pages/
│       │   ├── features/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── lib/
│       │   ├── services/
│       │   ├── types/
│       │   └── i18n/
│       ├── public/
│       └── package.json
├── core/
│   ├── domain/
│   ├── application/
│   ├── agents/
│   ├── orchestrator/
│   ├── model_gateway/
│   ├── memory/
│   ├── tools/
│   ├── skills/
│   ├── security/
│   ├── policy/
│   ├── approvals/
│   ├── resources/
│   ├── scheduling/
│   ├── usage/
│   ├── events/
│   └── observability/
├── providers/
│   ├── common/
│   ├── local/
│   │   ├── ollama/
│   │   ├── openai_compatible/
│   │   └── llamacpp/
│   └── cloud/
│       ├── openai/
│       ├── anthropic/
│       ├── gemini/
│       └── vertex/
├── integrations/
│   ├── mcp/
│   ├── external_apis/
│   └── storage/
├── database/
│   ├── models/
│   ├── migrations/
│   ├── seeds/
│   └── policies/
├── deployment/
│   ├── docker/
│   ├── windows/
│   ├── linux/
│   └── monitoring/
├── installer/
│   ├── windows/
│   ├── assets/
│   └── scripts/
├── config/
│   ├── defaults/
│   ├── schemas/
│   └── examples/
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── api/
│   ├── security/
│   ├── operations/
│   ├── development/
│   └── user-guide/
├── scripts/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/
│   ├── security/
│   ├── e2e/
│   └── performance/
├── .github/
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── .env.example
├── .gitignore
├── .gitattributes
├── .pre-commit-config.yaml
├── compose.yaml
├── pyproject.toml
├── package.json
├── AGENTS.md
├── ARCHITECTURE.md
├── SECURITY.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── README.md
└── LICENSE
```

## 7.1 Bağımlılık yönü

-   `domain` hiçbir framework veya provider SDK'sına bağımlı
    olmamalıdır.
-   `application` domain sözleşmelerine bağımlı olmalıdır.
-   `providers` domain/application portlarını uygular.
-   `apps/api` ve `apps/worker` composition root görevi görür.
-   `dashboard` yalnızca API sözleşmelerine bağımlıdır.
-   `integrations` güvenli adapter'lar üzerinden bağlanır.
-   `core/security` diğer katmanlara ortak güvenlik sözleşmeleri sunar.
-   Provider adapter'ları birbirini import etmemelidir.
-   UI doğrudan DB veya secret store erişimi yapmamalıdır.

## 7.2 Modül sınırları

Her modül: - Public interface tanımlar. - İç implementasyonunu dışarı
sızdırmaz. - Tipli request/response sözleşmeleri sunar. - Hata tiplerini
normalize eder. - Unit test içerir. - Gerekli yerlerde contract test
sağlar.

Circular import yasaktır. Ortak tipler `core/domain` veya ilgili ortak
sözleşme modülünde tutulmalıdır.

------------------------------------------------------------------------

# 8. Domain modeli ve temel kavramlar

## 8.1 Tenant

Tenant, veri ve kaynak izolasyonunun ana sınırıdır. Kişisel kurulumda
tek tenant olabilir; ekip kurulumunda çoklu tenant bulunabilir.

Tenant'a bağlı her kayıtta `tenant_id` bulunmalıdır. Tenant kapsamı
olmayan global kayıtlar açıkça `system-scoped` olarak tanımlanmalıdır.

## 8.2 User

Kimliği doğrulanmış insan kullanıcısıdır. Birden fazla tenant'a üye
olabilir. Her tenant üyeliği ayrı role sahiptir.

## 8.3 Provider Connection

Bir kullanıcının veya tenant'ın belirli model sağlayıcısına ait
bağlantısıdır. - Provider türü, - Sahip kullanıcı/tenant, - Secret
reference, - Bağlantı durumu, - İzin verilen modeller, -
Oluşturulma/değiştirilme zamanı, - Son doğrulama sonucu

tutulur.

Secret plaintext olarak Provider Connection tablosunda tutulmaz.

## 8.4 Model Profile

Belirli görev türü için model seçimi ve parametre politikasıdır. -
Provider connection, - Model identifier, - Temperature, - Max output
tokens, - Context limit, - Capability flags, - Timeout, - Retry
policy, - Cost policy, - Privacy classification.

## 8.5 Agent Profile

Bir ajanın kalıcı tanımıdır. - Name, - Description, - Role, - System
instruction reference, - Allowed tools, - Allowed skills, - Memory
policy, - Model policy, - Budget defaults, - Risk ceiling, - Version, -
Owner, - Visibility.

Agent Profile ile Agent Run aynı nesne değildir.

## 8.6 Agent Run

Bir ajanın belirli bir görev bağlamındaki çalışma örneğidir. - Agent
profile/version, - Task id, - Input context reference, - State, -
Start/end time, - Model usage, - Tool usage, - Output artifact, - Error
information.

## 8.7 Team

Bir görev için birlikte çalışan ajanların mantıksal grubudur. Team,
agent profile'ları ve çalışma politikalarını bir araya getirir.

## 8.8 Task

Kullanıcının başlattığı üst düzey iş kaydıdır. Görev; alt görevlere,
ajan run'larına, artifact'lere, approval'lara ve event'lere sahip
olabilir.

## 8.9 Action Proposal

Ajanın gerçek bir araç eylemi yapmadan önce önerdiği tipli eylem
nesnesidir. Modelin serbest metin komutu doğrudan çalıştırılmaz.

## 8.10 Artifact

Görev sonucunda üretilen dosya, rapor, veri, kod veya başka çıktıdır.
Artifact metadata'sı DB'de; büyük içerik ileride object storage'da
tutulabilir.

------------------------------------------------------------------------

# 9. Ajan sistemi

## 9.1 Ajan mimarisi

Ajan; kimlik, rol, talimat, yetki, model politikası, hafıza politikası
ve bütçe sınırlarından oluşan yapılandırılmış bir çalışma birimidir.

Ajanlar: - Doğrudan secret okuyamaz. - Doğrudan shell/OS komutu
çalıştıramaz. - Policy Engine'i atlayamaz. - Başka tenant verisini
okuyamaz. - Kendisine tanımlanmamış tool kullanamaz. - Kendi yetki
seviyesini yükseltemez. - Model çıktısını doğrulanmış gerçek kabul
edemez.

## 9.2 İlk uzman ajanlar

### Supervisor

-   Kullanıcı hedefini alır.
-   Görev durumunu takip eder.
-   Gerekirse planı yeniden düzenler.
-   Alt görevleri koordine eder.
-   Yetki veya bütçe veremez; yalnızca tanımlı policy sınırlarında
    orkestrasyon yapar.

### Planner

-   Görevi alt adımlara böler.
-   Bağımlılık grafiği çıkarır.
-   Gerekli ajan/skill/tool türlerini önerir.
-   Riskli adımları işaretler.
-   Planın uygulanabilirliğini kontrol eder.

### Researcher

-   İzin verilen kaynaklardan bilgi toplar.
-   Kaynak URL, erişim zamanı ve alıntı bağlamını kaydeder.
-   Kaynak metnini güvenilmeyen veri olarak işaretler.
-   Web sayfasındaki prompt injection metnini talimat olarak uygulamaz.

### Analyst

-   Verileri karşılaştırır.
-   Varsayım ve belirsizlikleri ayırır.
-   Kanıt-temelli çıkarım üretir.
-   Sayısal sonuçları mümkünse deterministik araçlarla doğrular.

### Executor

-   Sadece izinli araçlar için ActionProposal üretir.
-   Policy Engine ve sandbox dışına çıkamaz.
-   Eylem sonucunu ve exit status bilgisini raporlar.

### Reviewer

-   Sonucu görev gereksinimleriyle karşılaştırır.
-   Kaynak ve iddiaları kontrol eder.
-   Eksik, çelişkili veya desteksiz iddiaları işaretler.
-   Gerekirse yeniden çalışma ister.

## 9.3 Ajan yaşam döngüsü

``` text
CREATED
  -> VALIDATED
  -> QUEUED
  -> RUNNING
  -> WAITING_FOR_TOOL
  -> WAITING_FOR_APPROVAL
  -> REVIEWING
  -> COMPLETED

Hata durumları:
RUNNING -> RETRY_PENDING -> QUEUED
RUNNING -> FAILED
WAITING_FOR_APPROVAL -> REJECTED
RUNNING -> CANCELLED
RUNNING -> TIMED_OUT
```

Durum geçişleri merkezi state machine tarafından doğrulanmalıdır. UI
veya model doğrudan status alanını değiştiremez.

## 9.4 Ajan iletişimi

Ajanlar arası iletişim serbest, kontrolsüz metin yerine yapılandırılmış
mesajlar üzerinden yapılmalıdır: - `task_id` - `parent_task_id` -
`from_agent_run_id` - `to_agent_run_id` - `message_type` -
`payload_schema_version` - `payload` - `created_at` - `correlation_id`

Mesaj tipleri: - TASK_ASSIGNMENT - TASK_RESULT - FINDING - QUESTION -
REVIEW_FEEDBACK - ACTION_PROPOSAL - STATUS_UPDATE - ERROR

Her mesaj boyutu ve içerik türü sınırlandırılmalıdır. Büyük dosyalar
mesaj payload'ına gömülmemeli, artifact reference kullanılmalıdır.

## 9.5 Sonsuz ajan döngülerinin engellenmesi

-   Max agent depth.
-   Max child agents per task.
-   Max total agent runs.
-   Max iterations per run.
-   Max retries.
-   Max wall-clock duration.
-   Max tokens/cost.
-   Repeated identical tool call detection.
-   No-progress detector.
-   Cancellation propagation.

------------------------------------------------------------------------

# 10. Orchestration ve görev yönetimi

## 10.1 Workflow modeli

Orchestration katmanı görevleri DAG/state graph biçiminde yürütür.

Bir workflow: - Input schema, - Node definitions, - Edge/transition
rules, - State schema, - Retry policy, - Timeout policy, - Checkpoint
policy, - Cancellation policy, - Output schema

içermelidir.

## 10.2 Görev parçalama

Planner aşağıdaki sırayı izlemelidir: 1. Kullanıcı hedefini normalize
et. 2. Başarı ölçütlerini belirle. 3. Gerekli girdileri ve eksikleri
belirle. 4. Görevi bağımsız alt görevlere ayır. 5. Bağımlılıkları
tanımla. 6. Her alt göreve gerekli capability ve risk seviyesini ata. 7.
Bütçe tahmini oluştur. 8. Kaynak ve model uygunluğunu kontrol et. 9.
Planı Policy Engine'e sun. 10. Uygun planı başlat veya kullanıcıdan
netleştirme/onay iste.

## 10.3 Paralel çalışma

Paralellik yalnızca: - Alt görevler birbirinden bağımsızsa, - Kaynak
limiti uygunsa, - Provider rate limit uygunsa, - Tenant concurrency
limiti aşılmıyorsa, - Aynı kaynağa çakışan yazma yapılmıyorsa

kullanılmalıdır.

## 10.4 Checkpoint ve devam ettirme

Uzun görevlerde workflow checkpoint'i kaydedilir. - Checkpoint içeriği
schema version taşır. - Secret veya hassas plaintext checkpoint'e
yazılmaz. - Yeniden başlatmada state doğrulanır. - Uygulama sürümü
uyumsuzsa migration veya güvenli durdurma uygulanır. - Kullanıcı iptal
ettiği görevi yeniden başlatmak isterse yeni run veya açık resume
seçeneği sunulur.

## 10.5 İdempotency

API komutları, job dispatch ve tool execution uygun yerlerde idempotency
key kullanmalıdır. Aynı talep tekrar geldiğinde mükerrer ödeme, mükerrer
dosya işlemi veya mükerrer dış eylem oluşmamalıdır.

------------------------------------------------------------------------

# 11. Model Gateway

## 11.1 Amaç

Model Gateway, bütün model sağlayıcılarına tek bir platform arayüzü
sağlar. Agent Runtime yalnızca normalize edilmiş `ModelRequest` gönderir
ve `ModelResponse` alır.

## 11.2 Ana bileşenler

-   Provider Registry
-   Provider Adapter Interface
-   Model Catalog
-   Capability Registry
-   Credential Resolver
-   Routing Engine
-   Request Normalizer
-   Response Normalizer
-   Retry Controller
-   Rate Limit Controller
-   Usage Meter
-   Cost Calculator
-   Privacy Guard
-   Health Checker

## 11.3 Provider adapter sözleşmesi

Her adapter asgari olarak: - `list_models` - `get_model_capabilities` -
`validate_credentials` - `generate` - `stream` - `health_check` -
`normalize_error` - `estimate_usage` (mümkünse)

işlemlerini sunmalıdır.

Tool calling, JSON schema, vision, embeddings ve streaming özellikleri
capability olarak tanımlanmalıdır. Adapter desteklemediği özelliği
destekliyormuş gibi göstermemelidir.

## 11.4 ModelRequest

Önerilen alanlar: - request_id - tenant_id - user_id - task_id -
agent_run_id - purpose - messages - requested_capabilities -
response_schema - temperature - max_output_tokens - timeout -
privacy_classification - budget_context - routing_policy -
cancellation_token/reference - metadata (allowlisted)

## 11.5 ModelResponse

-   request_id
-   provider_id
-   model_id
-   output
-   finish_reason
-   input_tokens
-   output_tokens
-   cached_tokens (varsa)
-   latency_ms
-   provider_request_id (hassas değilse)
-   cost_estimate
-   warnings
-   normalized_error (başarısızsa)
-   capability_used

## 11.6 Routing politikası

Yönlendirme şu seviyelerde tanımlanabilir: 1. Global default. 2. Tenant
policy. 3. User preference. 4. Agent profile. 5. Task-specific policy.
6. Request-specific override.

Daha üst güvenlik/gizlilik politikaları alt seviyelerde gevşetilemez.
Örneğin tenant cloud kullanımını kapatmışsa agent kendi ayarıyla cloud'a
geçemez.

## 11.7 Çalışma modları

### Local-first

-   Önce yerel provider.
-   Yerel model uygun değilse görev durdurulur veya kullanıcıya seçenek
    sunulur.
-   Cloud fallback otomatik değildir.

### Hybrid

-   Görev sınıfına göre local/cloud seçim.
-   Gizlilik sınıflandırması ve kullanıcı izni uygulanır.
-   Bütçe limiti zorunludur.

### Cloud-first

-   Kullanıcının açık tercihiyle cloud provider.
-   Tenant ve user policy kontrol edilir.
-   BYOK credential gerekir.
-   Bütçe ve veri aktarım onayı uygulanır.

## 11.8 Fallback kuralları

Fallback yalnızca: - Kullanıcı/tenant politikası izin veriyorsa, - Hedef
provider bağlantısı doğrulanmışsa, - Veri gizlilik sınıfı uygun ise, -
Bütçe limiti uygunsa, - Model capability eşdeğer veya yeterliyse

yapılır.

Ücretli modele sessiz geçiş yasaktır. `fallback_requires_consent=true`
varsayılan olmalıdır.

## 11.9 Model seçimi

Model seçimi yalnızca model adına göre yapılmaz. Aşağıdaki sinyaller
kullanılır: - Capability match, - Context window, - Output limit, -
Latency, - Provider health, - Rate limit, - Local resource
availability, - Privacy policy, - Cost estimate, - User preference, -
Task complexity.

## 11.10 Sağlayıcı kimlik doğrulama ilkeleri

-   OpenAI API, ChatGPT/Codex uygulama oturumuyla aynı kimlik doğrulama
    veya faturalandırma yüzeyi olarak varsayılmaz.
-   Anthropic API Console, Claude.ai aboneliğiyle aynı ürün/erişim
    yüzeyi olarak varsayılmaz.
-   Gemini API, genel Google AI/Gemini tüketici aboneliğinin otomatik
    uzantısı olarak varsayılmaz.
-   Codex, Claude Code, Gemini CLI veya başka tüketici uygulamalarının
    oturum bilgileri izinsiz biçimde çıkarılıp üçüncü taraf uygulamaya
    aktarılmaz.
-   Browser cookie, local storage token, CLI credential file veya
    abonelik session token'ı toplanmaz.
-   Yalnızca sağlayıcının açıkça desteklediği resmi API key veya resmi
    üçüncü taraf OAuth akışı kullanılır.
-   Sağlayıcı koşulları değişebileceğinden her adapter için resmi
    dokümantasyon ve kullanım koşulları sürüm bazında kontrol
    edilmelidir.

------------------------------------------------------------------------

# 12. Yerel model ve donanım yönetimi

## 12.1 Hardware Detector

Runtime aşağıdakileri mümkün olduğu ölçüde algılar: - OS ve sürüm, - CPU
model/çekirdek/thread, - Toplam ve kullanılabilir RAM, - GPU adı, -
VRAM, - GPU runtime/driver, - Disk boş alanı, - Container runtime, -
Ollama endpoint ve model listesi, - Worker process/resource utilization.

Algılanamayan bilgi `unknown` olarak saklanır; tahmin edilmiş değer
kesin veri gibi sunulmaz.

## 12.2 Capacity Profile

Önerilen profiller: - Basic - Standard - Advanced - Professional -
Workstation - Cloud Worker

Bu profiller katı donanım gereksinimi değildir. Dinamik ölçüm ve
kullanıcı override'ı ile hesaplanan kapasite sınıflarıdır.

## 12.3 Resource Manager

Kaynaklar: - CPU concurrency, - RAM reservation, - GPU memory, - Disk
quota, - Worker slots, - Provider concurrency, - Token throughput, -
Task queue depth.

Resource Manager: - Yeni iş kabulünü sınırlar, - İş önceliği belirler, -
Model yükleme çakışmalarını önler, - Kaynak aşımında işi bekletir, -
Worker sağlık durumunu izler, - Kullanıcıya neden beklediğini açıklar.

## 12.4 Yerel model başlatma ilkeleri

-   Kullanıcı açıkça etkinleştirmeden büyük model indirilmez.
-   Model boyutu ve disk ihtiyacı önceden gösterilir.
-   Model lisansı ve kullanım koşulları gösterilir.
-   Model indirme kaynağı doğrulanır.
-   İndirilen dosya checksum/hash doğrulamasından geçirilir (kaynak
    sağlıyorsa).
-   Model process'i sandbox/izin sınırlarına uygun çalıştırılır.
-   GPU desteği varsayılmaz; gerçek runtime testi yapılır.
-   GPU başarısızsa CPU fallback yalnızca kullanıcı politikası izin
    veriyorsa yapılır.
-   Aşırı RAM/VRAM kullanımında kontrollü durdurma uygulanır.

## 12.5 Geliştirme makinesi için not

İlk test bilgisayarında RX 570 sınıfı GPU ve sınırlı VRAM bulunduğu için
Windows üzerinde ROCm desteği varsayılmamalıdır. Ollama/Vulkan veya CPU
yolu gerçek ölçümle test edilmelidir. Küçük modellerle benchmark
yapılabilir; ancak ürünün varsayılan model listesi bu tek makineye
sabitlenmemelidir.

------------------------------------------------------------------------

# 13. Hafıza mimarisi

## 13.1 Hafıza türleri

1.  Working Memory:
    -   Aktif görev bağlamı.
    -   Kısa ömürlü.
    -   Task/run kapsamlı.
2.  Episodic Memory:
    -   Geçmiş görev ve olay özetleri.
    -   Zaman damgalı.
    -   Kaynak task/run referansı içerir.
3.  Semantic Memory:
    -   Onaylı bilgi ve ilişkiler.
    -   Embedding destekli arama.
    -   Kaynak ve güven seviyesi içerir.
4.  Procedural Memory:
    -   Onaylanmış çalışma yöntemi, skill veya süreç bilgisi.
    -   Sürüm ve izin sınırları vardır.
    -   Kendi başına yetki vermez.

## 13.2 Memory record

Önerilen alanlar: - id - tenant_id - owner_user_id (gerekiyorsa) -
scope_type - scope_id - memory_type - content - embedding -
source_type - source_id - source_uri - confidence - sensitivity -
visibility - created_at - updated_at - expires_at - version -
review_status - metadata

## 13.3 Hafızaya yazma politikası

Model her söylediğini otomatik hafızaya yazamaz.

Yazma öncesi: - Bilgi türü sınıflandırılır. - Hassas veri kontrolü
yapılır. - Kaynak belirlenir. - Tekrarlanan bilgi birleştirilir. - Güven
seviyesi atanır. - Kullanıcı/tenant saklama politikası uygulanır. -
Gerekirse kullanıcı onayı alınır.

## 13.4 Hafıza erişimi

-   Tenant izolasyonu zorunludur.
-   User-private memory başka kullanıcıya gösterilmez.
-   Agent-private memory başka ajanlara varsayılan olarak açılmaz.
-   Shared memory açıkça paylaşılmalıdır.
-   Retrieval sonuçları kaynak referansı taşır.
-   Hafıza içeriği talimat önceliğini yükseltemez.
-   Hafızadan gelen prompt injection içerikleri güvenilmeyen veri olarak
    işlenir.

## 13.5 Retention ve silme

-   Kullanıcı veriyi silebilmelidir.
-   Tenant admin retention politikası tanımlayabilir.
-   Silme işlemi audit edilir; audit kaydında silinen hassas içerik
    tutulmaz.
-   Backup retention ve gerçek silme süresi kullanıcıya açıklanmalıdır.
-   Soft delete ve hard delete davranışı net dokümante edilmelidir.

------------------------------------------------------------------------

# 14. Tool, Skill, Plugin ve MCP mimarisi

## 14.1 Tool

Tool, ajanların belirli bir işlevi kontrollü şekilde kullanmasını
sağlayan tipli fonksiyondur.

Tool tanımı: - tool_id - name - version - description - input_schema -
output_schema - required_permissions - risk_level - execution_mode -
timeout - resource_limits - network_policy - idempotency_support -
owner/namespace - enabled status

## 14.2 Tool Gateway

Tüm tool çağrıları Tool Gateway üzerinden geçmelidir.

Akış: 1. Agent Runtime tool çağrısını alır. 2. Schema doğrulanır. 3.
Tool registry'de tool bulunur. 4. Agent/tool/tenant yetkileri kontrol
edilir. 5. ActionProposal üretilir. 6. Policy Engine değerlendirme
yapar. 7. Approval gerekiyorsa bekletilir. 8. Sandbox/adapter
çalıştırır. 9. Çıktı schema doğrulamasından geçer. 10. Sonuç normalize
edilir. 11. Audit ve usage kaydı oluşturulur.

## 14.3 Skill

Skill, bir görevin nasıl yapılacağını tarif eden sürümlü talimat ve
kaynak paketidir. Skill tek başına executable permission değildir.

Skill içeriği: - manifest, - açıklama, - input/output contract, -
yönerge, - örnekler, - gerekli tool listesi, - risk notları, - sürüm, -
kaynak/lisans.

Skill yönergeleri de güvenilmeyen içerik olabilir. Skill'in bir tool'u
kullanabilmesi için ayrıca policy izni gerekir.

## 14.4 Plugin

Plugin, platforma yeni entegrasyon veya işlev ekleyen paketlenmiş
modüldür.

Plugin: - Manifest imzası veya güvenilir kaynak, - Sürüm uyumluluğu, -
İzin beyanı, - Veri erişim kapsamı, - Ağ erişim beyanı, - Tool
listesi, - Güncelleme politikası

içermelidir.

Bilinmeyen plugin varsayılan olarak kapalı olmalıdır.

## 14.5 MCP

MCP entegrasyonu ayrı adapter katmanında tutulur.

-   MCP server bağlantısı açıkça tanımlanır.
-   Tool listesi allowlist ile sınırlandırılır.
-   Her tool için input/output schema doğrulanır.
-   Server kimliği ve bağlantı güvenliği doğrulanır.
-   Remote MCP endpoint'leri güvenilir kabul edilmez.
-   OAuth/token bilgileri Secret Vault'ta tutulur.
-   MCP tool çağrıları da Policy Engine ve audit'ten geçer.
-   MCP sunucusu ajanla aynı yetki seviyesinde çalışmaz.

## 14.6 Tool risk seviyeleri

Başlangıç eylem sınıfları: - L0 Observe: Salt okunur gözlem. - L1
Propose: Eylem önerisi oluşturur, yürütmez. - L2 Reversible:
Sınırlandırılmış ve geri alınabilir işlem. - L3 Human Approval: Açık
insan onayı olmadan çalışmaz. - L4 Prohibited: Platform politikası
gereği yasak.

Risk seviyesi tool adıyla değil, gerçek eylem ve parametrelerle
belirlenmelidir. Örneğin bir dosya aracının salt okunur listeleme işlemi
ile dosya silme işlemi aynı riskte değildir.

## 14.7 Sandbox

Sandbox gereksinimleri: - Rootless/non-admin execution. - Read-only root
filesystem mümkün olduğunda. - Sadece izin verilen workspace mount. -
Network disabled by default. - CPU limit. - RAM limit. - Disk quota. -
Process limit. - Wall-clock timeout. - Environment variable allowlist. -
Secret mount yok; gerekiyorsa kısa ömürlü scoped secret. -
Syscall/capability restriction. - Çalışma sonunda artifact taraması. -
Container escape riskine karşı host üzerinde minimum yetki.

Windows üzerinde container sandbox mümkün değilse ayrı düşük yetkili
process/user ve kısıtlı workspace gibi daha zayıf alternatifler açıkça
işaretlenmelidir. Güvenli sandbox varmış gibi gösterilmemelidir.

------------------------------------------------------------------------

# 15. Policy Engine ve insan onayı

## 15.1 Policy Engine sorumluluğu

Policy Engine aşağıdakileri kontrol eder: - Kullanıcı rolü, - Tenant
policy, - Agent permission, - Tool permission, - Eylem risk seviyesi, -
Kaynak sahipliği, - Veri sınıflandırması, - Network erişimi, - Bütçe, -
Zaman ve hız limitleri, - Approval gereksinimi.

Policy kararı: - ALLOW - DENY - REQUIRE_APPROVAL - ALLOW_WITH_LIMITS

olabilir.

## 15.2 Öncelik sırası

En kısıtlayıcı politika kazanır: 1. Platform security baseline. 2.
Tenant admin policy. 3. User policy. 4. Agent profile policy. 5. Task
policy. 6. Tool default policy. 7. Request-level hints.

Alt seviyedeki bir ayar üst seviyedeki yasağı kaldıramaz.

## 15.3 ActionProposal

Önerilen alanlar: - proposal_id - tenant_id - task_id - agent_run_id -
tool_id - tool_version - action_type - normalized_arguments -
affected_resources - risk_level - rationale - expected_effect -
rollback_plan - data_classification - network_requirements -
idempotency_key - expires_at

## 15.4 Approval workflow

-   Onay isteği kullanıcıya anlaşılır özet sunar.
-   Tam olarak hangi kaynakların etkileneceği gösterilir.
-   Komut/parametreler değiştirilmeden gösterilir.
-   Tahmini sonuç ve geri alma yöntemi gösterilir.
-   Onay belirli proposal hash'ine bağlanır.
-   Parametre değişirse yeni onay gerekir.
-   Onay süresi dolabilir.
-   Kullanıcı reddedebilir veya iptal edebilir.
-   Approval token kısa ömürlü ve tek kullanımlık olmalıdır.
-   Onay veren kullanıcının yetkisi yürütme anında yeniden kontrol
    edilir.

## 15.5 İnsan onayının atlanamaması

Model, ajan veya plugin kendi başına approval oluşturup kendisini
onaylayamaz. Approval endpoint'i kullanıcı kimliği ve rol kontrolü
yapar. Servis kimlikleri insan onayı yerine geçemez.

------------------------------------------------------------------------

# 16. Multi-user, tenant izolasyonu ve kimlik doğrulama

## 16.1 İzolasyon modeli

Her kullanıcı/tenant için: - Provider connections, - Secrets, -
Agents, - Agent runs, - Tasks, - Memory, - Artifacts, - Usage, -
Budgets, - Audit visibility

izole edilir.

Paylaşılan kaynaklar açıkça `shared` olarak işaretlenir ve paylaşım ACL
ile yönetilir.

## 16.2 Kimlik doğrulama

MVP seçenekleri: - Local setup sırasında oluşturulan ilk admin hesabı. -
E-posta/parola veya kurulumda seçilen güvenli auth yöntemi. - Güçlü
parola hash (Argon2id gibi). - Session cookie: HttpOnly, Secure (TLS
altında), SameSite. - CSRF koruması. - Login rate limiting. -
Brute-force gecikmesi ve güvenli hesap kilitleme politikası.

İleriki sürüm: - OIDC/SAML entegrasyonu. - MFA. - Passkeys. - Enterprise
identity providers.

## 16.3 Yetkilendirme

Her API request: - Authenticated principal, - Tenant membership, -
Role/permission, - Resource ownership, - Resource visibility, - Policy
constraints

ile kontrol edilir.

Sadece frontend'de buton gizlemek güvenlik değildir. Backend her istekte
kontrol yapmalıdır.

## 16.4 PostgreSQL RLS

Multi-tenant kurulumda PostgreSQL Row Level Security ek savunma katmanı
olarak kullanılmalıdır.

-   Tenant context DB transaction scope'unda set edilir.
-   Connection pool'da tenant context sızıntısı engellenir.
-   RLS policy test edilir.
-   Admin bypass rolü uygulama runtime'ında kullanılmaz.
-   Migration ve maintenance işlemleri ayrı servis kimliğiyle yürütülür.

RLS, application-level authorization yerine geçmez; iki katman birlikte
kullanılmalıdır.

------------------------------------------------------------------------

# 17. Secret Vault ve BYOK güvenliği

## 17.1 Temel kural

API key, OAuth refresh token veya benzeri credential: - Frontend'e
plaintext dönmez. - localStorage/sessionStorage içine yazılmaz. -
Browser bundle içine gömülmez. - Git'e commit edilmez. - Log, trace,
prompt, memory veya artifact içine yazılmaz. - Hata mesajında
görünmez. - Diğer tenant veya kullanıcıya açılmaz.

## 17.2 Local secret storage

İşletim sistemine göre: - Windows: DPAPI ve/veya Windows Credential
Manager. - macOS: Keychain. - Linux: Secret Service/libsecret; headless
sunucuda güvenli dosya veya envelope encryption. - Docker: secret mount
veya dış secret manager.

## 17.3 Shared server secret storage

-   Envelope encryption.
-   Data Encryption Key (DEK) ile secret şifreleme.
-   Key Encryption Key (KEK) ayrı güvenli konumda.
-   KEK DB ve Git deposunda tutulmaz.
-   Key rotation prosedürü.
-   Secret versioning.
-   Tenant/user scoped access.
-   Decryption yalnızca gerekli backend service context'inde.
-   Decrypted value memory'de mümkün olan en kısa süre tutulur.

## 17.4 Secret lifecycle

1.  Kullanıcı key girer.
2.  TLS üzerinden backend'e gönderilir.
3.  Format/uzunluk doğrulaması yapılır; sağlayıcı doğrulaması opsiyonel.
4.  Secret şifrelenir.
5.  Secret reference DB'ye kaydedilir.
6.  Plaintext request memory'den bırakılır.
7.  UI bağlantı durumunu gösterir.
8.  Kullanıcı isterse key'i rotate/revoke/delete eder.
9.  Audit kaydı secret değerini değil, işlemi kaydeder.

## 17.5 Secret gösterimi

UI: - Sağlayıcı adı, - Maskelenmiş kısa suffix (güvenli ise), - Son
doğrulama zamanı, - Bağlantı durumu, - Yetki kapsamı, - Sil/yenile
eylemi

gösterebilir. Tam key tekrar gösterilmez.

## 17.6 Secret sızıntı önlemleri

-   Structured log redaction.
-   Exception scrubbing.
-   HTTP debug logging production'da kapalı.
-   Pydantic secret fields repr maskeli.
-   CI secret scanning.
-   Pre-commit secret scanner.
-   GitHub Secret Scanning mümkünse etkin.
-   Test fixture'larında sahte key.
-   Support bundle oluştururken secret scrub.
-   Screenshot ve diagnostics export'unda redaction.

------------------------------------------------------------------------

# 18. Veri modeli ve veritabanı tasarımı

Aşağıdaki tablo isimleri mantıksal taslaktır. Uygulama sırasında
SQLAlchemy modelleri ve Alembic migration'larıyla kesinleştirilmelidir.

## 18.1 Kimlik ve tenant tabloları

### users

-   id (UUID, PK)
-   email (unique, normalized)
-   display_name
-   password_hash
-   status
-   created_at
-   updated_at
-   last_login_at

### tenants

-   id (UUID, PK)
-   name
-   slug
-   status
-   plan_type (local/community/custom; ücretli plan varsayımı değildir)
-   settings_json
-   created_at
-   updated_at

### tenant_memberships

-   id
-   tenant_id
-   user_id
-   role
-   status
-   joined_at
-   unique(tenant_id, user_id)

### sessions

-   id
-   user_id
-   session_hash
-   created_at
-   expires_at
-   revoked_at
-   metadata (secret içermeyen)

## 18.2 Provider tabloları

### provider_connections

-   id
-   tenant_id
-   owner_user_id nullable
-   provider_type
-   display_name
-   secret_ref
-   auth_type
-   status
-   allowed_models_json
-   privacy_policy_json
-   last_validated_at
-   created_at
-   updated_at

### model_profiles

-   id
-   tenant_id
-   owner_user_id nullable
-   name
-   provider_connection_id
-   model_id
-   capability_snapshot_json
-   parameters_json
-   routing_policy_json
-   created_at
-   updated_at

### provider_usage

-   id
-   tenant_id
-   user_id
-   task_id
-   agent_run_id
-   provider_type
-   model_id
-   input_tokens
-   output_tokens
-   estimated_cost
-   currency
-   latency_ms
-   status
-   created_at

## 18.3 Ajan ve görev tabloları

### agent_profiles

-   id
-   tenant_id
-   owner_user_id nullable
-   name
-   role
-   description
-   profile_version
-   instructions_ref
-   allowed_tools_json
-   allowed_skills_json
-   model_policy_json
-   memory_policy_json
-   budget_policy_json
-   risk_ceiling
-   visibility
-   status
-   created_at
-   updated_at

### agent_runs

-   id
-   tenant_id
-   task_id
-   agent_profile_id
-   agent_profile_version
-   parent_agent_run_id nullable
-   status
-   input_ref
-   output_ref
-   model_usage_json
-   tool_usage_json
-   started_at
-   finished_at
-   error_code
-   error_summary

### teams

-   id
-   tenant_id
-   owner_user_id
-   name
-   description
-   configuration_json
-   visibility
-   created_at
-   updated_at

### team_members

-   id
-   team_id
-   agent_profile_id
-   role_in_team
-   execution_order
-   configuration_override_json

### tasks

-   id
-   tenant_id
-   created_by_user_id
-   title
-   description
-   status
-   priority
-   privacy_classification
-   team_id nullable
-   parent_task_id nullable
-   plan_ref
-   result_ref
-   budget_policy_json
-   created_at
-   started_at
-   completed_at
-   cancelled_at

### task_steps

-   id
-   tenant_id
-   task_id
-   step_key
-   step_type
-   status
-   depends_on_json
-   input_ref
-   output_ref
-   attempt_count
-   started_at
-   finished_at

## 18.4 Tool ve approval tabloları

### tool_definitions

-   id
-   namespace
-   name
-   version
-   input_schema_json
-   output_schema_json
-   permission_manifest_json
-   risk_level
-   execution_mode
-   enabled
-   created_at

### tool_executions

-   id
-   tenant_id
-   task_id
-   agent_run_id
-   tool_definition_id
-   proposal_id
-   status
-   input_hash
-   sanitized_input_json
-   output_ref
-   exit_code
-   started_at
-   finished_at
-   error_code

### action_proposals

-   id
-   tenant_id
-   task_id
-   agent_run_id
-   tool_id
-   normalized_arguments_json
-   affected_resources_json
-   risk_level
-   rationale
-   proposal_hash
-   status
-   expires_at
-   created_at

### approvals

-   id
-   tenant_id
-   proposal_id
-   requested_by
-   decided_by nullable
-   decision
-   decision_reason
-   proposal_hash
-   created_at
-   decided_at
-   expires_at

## 18.5 Memory ve artifact tabloları

### memories

-   id
-   tenant_id
-   owner_user_id nullable
-   scope_type
-   scope_id
-   memory_type
-   content
-   embedding (vector, nullable)
-   source_type
-   source_id
-   source_uri
-   confidence
-   sensitivity
-   visibility
-   review_status
-   expires_at
-   created_at
-   updated_at

### artifacts

-   id
-   tenant_id
-   owner_user_id
-   task_id
-   artifact_type
-   filename
-   mime_type
-   storage_key
-   checksum
-   size_bytes
-   classification
-   created_at
-   expires_at

Artifact içeriği kullanıcı yetkisi kontrol edilmeden servis
edilmemelidir. Dosya adı ve MIME type tek başına güvenilir değildir.

## 18.6 Audit ve event tabloları

### audit_events

-   id
-   tenant_id
-   actor_type
-   actor_id
-   action
-   resource_type
-   resource_id
-   outcome
-   correlation_id
-   sanitized_metadata_json
-   created_at

### domain_events

-   id
-   tenant_id
-   aggregate_type
-   aggregate_id
-   event_type
-   schema_version
-   payload_json
-   created_at
-   processed_at

### jobs

-   id
-   tenant_id
-   job_type
-   payload_json
-   status
-   priority
-   attempts
-   available_at
-   locked_at
-   locked_by
-   last_error_code
-   created_at
-   updated_at

## 18.7 DB genel kuralları

-   Primary key olarak UUID tercih edilir.
-   Zamanlar UTC saklanır.
-   Tenant scoped tablolarda tenant_id zorunludur.
-   Foreign key ve unique constraints kullanılmalıdır.
-   Büyük JSON alanları sorgu ihtiyacına göre normalize edilmelidir.
-   Soft delete yalnızca iş gereksinimi varsa uygulanmalıdır.
-   Migration geriye dönük uyumluluk gözetmelidir.
-   Index'ler gerçek query pattern'lerine göre eklenmelidir.
-   Secret plaintext DB'ye yazılmamalıdır.
-   DB backup şifreli ve restore testi yapılmış olmalıdır.

------------------------------------------------------------------------

# 19. API tasarımı

## 19.1 API ilkeleri

-   REST JSON API.
-   `/api/v1` sürüm öneki.
-   OpenAPI şeması.
-   Pydantic request/response modelleri.
-   Tutarlı error envelope.
-   Pagination.
-   Idempotency key.
-   Rate limit.
-   Tenant context.
-   Request correlation ID.
-   Hassas alanların response modelinden çıkarılması.

## 19.2 Örnek endpoint grupları

### Authentication

-   `POST /api/v1/auth/login`
-   `POST /api/v1/auth/logout`
-   `POST /api/v1/auth/refresh`
-   `GET /api/v1/auth/me`

### Tenants

-   `GET /api/v1/tenants`
-   `POST /api/v1/tenants`
-   `GET /api/v1/tenants/{tenant_id}`
-   `GET /api/v1/tenants/{tenant_id}/members`
-   `POST /api/v1/tenants/{tenant_id}/members`

### Providers

-   `GET /api/v1/providers`
-   `GET /api/v1/providers/catalog`
-   `POST /api/v1/provider-connections`
-   `POST /api/v1/provider-connections/{id}/validate`
-   `GET /api/v1/provider-connections`
-   `DELETE /api/v1/provider-connections/{id}`

### Models

-   `GET /api/v1/models`
-   `GET /api/v1/model-profiles`
-   `POST /api/v1/model-profiles`
-   `PATCH /api/v1/model-profiles/{id}`

### Agents

-   `GET /api/v1/agents`
-   `POST /api/v1/agents`
-   `GET /api/v1/agents/{id}`
-   `PATCH /api/v1/agents/{id}`
-   `POST /api/v1/agents/{id}/validate`

### Teams

-   `GET /api/v1/teams`
-   `POST /api/v1/teams`
-   `GET /api/v1/teams/{id}`
-   `PATCH /api/v1/teams/{id}`

### Tasks

-   `POST /api/v1/tasks`
-   `GET /api/v1/tasks`
-   `GET /api/v1/tasks/{id}`
-   `POST /api/v1/tasks/{id}/cancel`
-   `POST /api/v1/tasks/{id}/resume`
-   `GET /api/v1/tasks/{id}/events`

### Approvals

-   `GET /api/v1/approvals`
-   `GET /api/v1/approvals/{id}`
-   `POST /api/v1/approvals/{id}/approve`
-   `POST /api/v1/approvals/{id}/reject`

### Tools

-   `GET /api/v1/tools`
-   `GET /api/v1/tools/{id}`
-   `POST /api/v1/tools/{id}/validate`

### Memory

-   `GET /api/v1/memories`
-   `POST /api/v1/memories`
-   `PATCH /api/v1/memories/{id}`
-   `DELETE /api/v1/memories/{id}`

### Usage

-   `GET /api/v1/usage/summary`
-   `GET /api/v1/usage/by-provider`
-   `GET /api/v1/budgets`
-   `PATCH /api/v1/budgets/{id}`

### System

-   `GET /api/v1/system/health`
-   `GET /api/v1/system/capabilities`
-   `GET /api/v1/system/resources`
-   `POST /api/v1/system/diagnostics`

Endpoint adları uygulama sırasında API style guide'a göre
kesinleştirilmelidir.

## 19.3 Error envelope

Örnek:

``` json
{
  "error": {
    "code": "POLICY_APPROVAL_REQUIRED",
    "message": "Bu işlem için kullanıcı onayı gerekiyor.",
    "correlation_id": "uuid",
    "details": {
      "approval_id": "uuid"
    }
  }
}
```

Hata detayları secret, stack trace, iç dosya yolu veya hassas provider
response içermemelidir.

## 19.4 API güvenliği

-   CORS allowlist.
-   CSRF koruması.
-   TLS production'da zorunlu.
-   Request body size limit.
-   Upload MIME/content validation.
-   SSRF koruması.
-   URL allow/deny policy.
-   Rate limit.
-   AuthZ her endpoint'te.
-   OpenAPI production'da erişim politikasıyla korunabilir.
-   Admin endpoint'leri ayrı permission ister.

------------------------------------------------------------------------

# 20. Frontend ve kullanıcı deneyimi

## 20.1 Ana ekranlar

1.  Dashboard:
    -   Aktif görevler,
    -   Ajan durumu,
    -   Model/provider bağlantısı,
    -   Kaynak kullanımı,
    -   Bütçe görünümü,
    -   Onay bekleyen işlemler.
2.  Task Center:
    -   Yeni görev,
    -   Görev listesi,
    -   Görev detay/timeline,
    -   Alt görevler,
    -   Çıktılar,
    -   İptal/devam ettirme.
3.  Agent Studio:
    -   Ajan oluşturma,
    -   Rol ve talimat,
    -   Model policy,
    -   Tool/skill izinleri,
    -   Hafıza kapsamı,
    -   Bütçe ve risk sınırı.
4.  Team Builder:
    -   Ajan seçimi,
    -   İş dağılımı,
    -   Workflow düzeni,
    -   Paralellik ayarı.
5.  Model & Providers:
    -   Yerel sağlayıcılar,
    -   Cloud bağlantıları,
    -   Model kataloğu,
    -   Capability,
    -   Varsayılan routing,
    -   Test bağlantısı.
6.  Approval Center:
    -   Bekleyen eylemler,
    -   Etkilenen kaynaklar,
    -   Risk açıklaması,
    -   Parametreler,
    -   Onay/reddet.
7.  Memory Center:
    -   Hafıza türleri,
    -   Kaynak,
    -   Paylaşım kapsamı,
    -   Düzenleme/silme,
    -   Retention.
8.  Tools & Skills:
    -   Kayıtlı araçlar,
    -   İzin manifestleri,
    -   Risk seviyesi,
    -   Skill sürümleri.
9.  Usage & Budgets:
    -   Model kullanımı,
    -   Token,
    -   Tahmini maliyet,
    -   Limit,
    -   Kullanıcı/tenant bazlı rapor.
10. Settings & Security:

-   Kullanıcılar,
-   Roller,
-   Tenant policy,
-   Secret connections,
-   Audit,
-   Backup.

11. Setup Wizard:

-   Sistem kontrolü,
-   Kolay/ileri kurulum,
-   Local/Hybrid/Cloud seçimi,
-   Model bağlantısı,
-   Admin oluşturma,
-   Güvenlik ayarları,
-   Tamamlama.

## 20.2 UI ilkeleri

-   Kullanıcıya teknik karmaşıklığı mümkün olduğunca göstermeden kontrol
    vermek.
-   Varsayılan ayarlar güvenli olmalı.
-   Riskli eylemler açıkça etiketlenmeli.
-   Maliyet ve veri aktarımı gizlenmemeli.
-   Hatalar anlaşılır ve çözüm odaklı olmalı.
-   Başarısız işlem başarılı gibi gösterilmemeli.
-   Uzun görevlerde canlı durum gösterilmeli.
-   Türkçe karakter desteği tam olmalı.
-   Klavye erişilebilirliği ve ekran okuyucu desteği gözetilmeli.
-   Responsive tasarım.
-   Dark/light/system tema desteği.
-   Kritik işlemlerde confirmation ve audit.

## 20.3 Gerçek zamanlı event'ler

WebSocket veya SSE ile: - task.created - task.started - task.progress -
agent.started - agent.completed - tool.proposed - approval.required -
approval.decided - tool.started - tool.completed - model.requested -
model.completed - budget.warning - task.completed - task.failed -
worker.health_changed

Event payload'ları küçük tutulmalı; hassas içerik yerine resource
reference kullanılmalıdır.

------------------------------------------------------------------------

# 21. Bütçe, kullanım ve maliyet kontrolü

## 21.1 Limit katmanları

-   Global system limit.
-   Tenant limit.
-   User limit.
-   Task limit.
-   Agent run limit.
-   Provider connection limit.
-   Tool execution limit.

## 21.2 Task budget

Her görev için: - max_cost, - max_input_tokens, - max_output_tokens, -
max_model_calls, - max_agent_runs, - max_parallel_agents, -
max_tool_calls, - max_retries, - max_duration_seconds, -
max_artifact_size

tanımlanabilmelidir.

## 21.3 Enforcement

-   Model çağrısı öncesi bütçe kontrolü.
-   Tool execution öncesi bütçe kontrolü.
-   Uzun görevde periyodik kontrol.
-   Limit yaklaşınca warning.
-   Limit aşılınca güvenli durdurma.
-   Ücretli provider'a geçiş için ayrı izin.
-   Provider fiyatı bilinmiyorsa kesin maliyet gibi gösterilmemeli;
    tahmini/unknown etiketi kullanılmalı.

## 21.4 Maliyet doğruluğu

Provider usage verisi yoksa token/cost tahmini açıkça tahmin olarak
işaretlenmelidir. Fiyatlandırma tabloları tarih ve kaynak bilgisiyle
sürümlenmelidir.

------------------------------------------------------------------------

# 22. Güvenlik tehdit modeli

## 22.1 Korunacak varlıklar

-   API keys ve OAuth credentials.
-   Kullanıcı kimlik bilgileri.
-   Tenant verileri.
-   Hafıza ve dosyalar.
-   Agent instructions ve tool permissions.
-   Approval kayıtları.
-   Model kullanım/bütçe verileri.
-   Host işletim sistemi.
-   Worker ve sandbox ortamı.

## 22.2 Tehdit aktörleri

-   Kötü niyetli kullanıcı.
-   Ele geçirilmiş kullanıcı hesabı.
-   Kötü amaçlı plugin/skill/MCP server.
-   Prompt injection içeren web sayfası/dosya.
-   Kötü amaçlı veya hatalı model çıktısı.
-   Ele geçirilmiş provider credential.
-   Ağ üzerinden saldırgan.
-   Tenant sınırını aşmaya çalışan kullanıcı.
-   Sandbox escape denemesi.

## 22.3 Başlıca riskler ve kontroller

### Prompt injection

Kontroller: - Harici içerik untrusted olarak işaretlenir. - System
policy ve tool permission model tarafından değiştirilemez. - Kaynak
içeriği ile talimatlar ayrıştırılır. - Tool çağrıları bağımsız policy
kontrolünden geçer. - Kritik eylemde insan onayı.

### Secret exfiltration

Kontroller: - Secret'lar modele gönderilmez. - Tool'lara scoped
secret. - Log redaction. - Egress allowlist. - Secret erişim audit'i. -
Secret değerleri memory'den çıkarılmaz.

### Tenant data leakage

Kontroller: - Tenant scoped repository. - RLS. - Authorization tests. -
Cache key tenant prefix. - Object storage path tenant prefix. -
WebSocket subscription authorization. - Search/vector query tenant
filter.

### Arbitrary code execution

Kontroller: - Allowlisted tools. - Sandbox. - Non-root. - Resource
limits. - Network off default. - No host mounts except scoped
workspace. - Human approval. - Output scanning.

### SSRF

Kontroller: - Private/link-local/loopback IP block (meşru local provider
istisnası kontrollü). - DNS rebinding koruması. - Redirect validation. -
Egress proxy/allowlist. - URL scheme allowlist. - Metadata endpoint
block.

### Supply chain

Kontroller: - Dependency pinning. - Lockfiles. - Vulnerability
scanning. - SBOM. - Signed releases. - Plugin provenance. - Reproducible
build hedefi.

### Denial of service

Kontroller: - Rate limits. - Max request size. - Task budgets. - Queue
limits. - Timeouts. - Concurrency caps. - Backpressure.

## 22.4 Güvenlik olayları

Olay sınıfları: - Credential exposure. - Unauthorized access. -
Cross-tenant access. - Sandbox violation. - Unexpected network egress. -
Policy bypass. - Budget abuse.

Her olay için: 1. Etki alanı belirlenir. 2. Etkilenen credential
revoke/rotate edilir. 3. İlgili worker/connection izole edilir. 4. Audit
ve log delilleri korunur. 5. Kullanıcı/tenant bilgilendirme politikası
uygulanır. 6. Kök neden analizi yapılır. 7. Düzeltici test eklenir.

------------------------------------------------------------------------

# 23. Gözlemlenebilirlik ve operasyon

## 23.1 Logging

Structured JSON log: - timestamp, - level, - service, - environment, -
correlation_id, - trace_id, - tenant_id (gerektiği kadar), - user_id
(gerektiği kadar), - task_id, - agent_run_id, - event, - error_code.

Secret, prompt içindeki hassas veri ve dosya içeriği varsayılan olarak
loglanmaz.

## 23.2 Metrics

-   API request latency.
-   API error rate.
-   Queue depth.
-   Worker availability.
-   Task duration.
-   Agent run duration.
-   Model latency.
-   Model error rate.
-   Provider rate limit.
-   Token usage.
-   Estimated cost.
-   GPU/RAM/CPU utilization.
-   Approval wait time.
-   Tool failure rate.

## 23.3 Tracing

Bir task'ın uçtan uca akışı correlation/trace ID ile izlenebilmelidir.
Trace attribute'larında secret veya prompt içeriği bulunmamalıdır.

## 23.4 Health checks

-   Liveness: process çalışıyor mu?
-   Readiness: istek almaya hazır mı?
-   Dependency health: DB, queue, provider, local model.
-   Degraded mode: cloud provider kapalı ama local kullanılabilir mi?
-   Health endpoint secret veya ayrıntılı altyapı bilgisi
    sızdırmamalıdır.

## 23.5 Setup Doctor

Setup Doctor: - Docker runtime, - Port çakışması, - DB bağlantısı, -
Migration durumu, - Worker durumu, - Model endpoint, - GPU/CPU/RAM, -
Disk boş alanı, - Secret store, - TLS/config

kontrolleri yapar.

Onarım önerileri önce plan olarak gösterilir. Sistem ayarlarını
değiştiren işlemler kullanıcı onayı ister. Setup Doctor kendi başına
yönetici yetkisiyle sınırsız komut çalıştırmaz.

------------------------------------------------------------------------

# 24. Kurulum, dağıtım ve güncelleme

## 24.1 Tek depo / tek kurulum deneyimi

Kullanıcıya mümkün olduğunca: - Tek GitHub deposu, - Tek Windows kurulum
sihirbazı, - Tek dashboard, - Tek konfigürasyon deneyimi, - Tek
güncelleme yolu

sunulmalıdır.

İç mimarinin modüler olması, kullanıcıya birden fazla uygulama
kurdurmayı gerektirmez.

## 24.2 Windows kurulumu

Kurulum aşamaları: 1. OS sürümünü kontrol et. 2. CPU/RAM/disk kontrolü.
3. Docker veya desteklenen runtime kontrolü. 4. Port uygunluğunu kontrol
et. 5. Kurulum dizinini belirle. 6. Gerekli dosyaları indir/kur. 7.
Hash/signature doğrula. 8. Environment config üret. 9. Secret encryption
key oluştur. 10. DB başlat. 11. Migration çalıştır. 12. İlk admin
hesabını oluştur. 13. API ve worker başlat. 14. Dashboard aç. 15. Setup
Doctor raporu üret.

Kurulum başarısız olursa rollback/repair yolu bulunmalıdır. Kullanıcı
dosyaları ve mevcut veritabanı izinsiz silinmemelidir.

## 24.3 Docker Compose

Örnek servisler: - api - worker - dashboard (veya reverse proxy
üzerinden static) - postgres - optional redis - optional ollama

Compose dosyası production secret'larını içine gömmemelidir.
`.env.example` yalnızca örnek değişken içerir; gerçek `.env` Git'e
eklenmez.

## 24.4 Docker lisansı ve kaynak tüketimi

Docker Desktop lisans koşulları ticari/kurumsal kullanımda farklılık
gösterebilir. Kurulum ekranı ve dokümantasyon bu konuyu açıklamalı;
kullanıcıya alternatif dağıtım yolu sunulmalıdır.

## 24.5 Güncelleme

-   SemVer.
-   Changelog.
-   DB migration.
-   Backup preflight.
-   Signature/hash validation.
-   Rollback plan.
-   Config migration.
-   API compatibility.
-   Worker version compatibility.

Otomatik güncelleme kullanıcı ayarına bağlı olmalı; kritik güvenlik
güncellemeleri açıkça bildirilmelidir.

## 24.6 Backup/restore

Backup: - PostgreSQL dump. - Artifact storage. - Configuration (secret
hariç veya şifreli). - Encryption key backup prosedürü.

Restore: - Uygulama sürüm uyumluluğu. - DB migration sırası. - Artifact
integrity. - Secret decrypt test. - Restore verification.

Encryption key kaybedilirse secret'ların geri alınamayabileceği
kullanıcıya açıkça anlatılmalıdır.

------------------------------------------------------------------------

# 25. Test stratejisi ve kalite kapıları

## 25.1 Unit tests

-   Domain logic.
-   Policy Engine.
-   Routing decisions.
-   Budget enforcement.
-   State machine.
-   Schema validation.
-   Secret redaction.
-   Tenant scoping.

## 25.2 Integration tests

-   API + DB.
-   Worker + queue.
-   Model Gateway + mock provider.
-   Tool Gateway + sandbox.
-   Approval workflow.
-   Memory retrieval.
-   Provider credential isolation.

## 25.3 Contract tests

Her provider adapter: - Normalize edilmiş request/response, - Capability
doğruluğu, - Error mapping, - Timeout, - Retry, - Streaming

testlerinden geçmelidir.

## 25.4 Security tests

Zorunlu senaryolar: - User A, User B'nin provider connection'ını
okuyamaz. - Tenant A, Tenant B task'ını okuyamaz. - Agent başka agent'ın
private memory'sine erişemez. - Model tool permission yükseltemez. -
Approval hash değişince eski approval geçersiz olur. - Secret loglarda
görünmez. - Prompt injection policy'yi atlatamaz. - Tool sandbox dışına
çıkamaz. - SSRF private endpoint'e erişemez (izinli local provider
istisnası ayrı test edilir). - Ücretli fallback izinsiz gerçekleşmez. -
Bütçe aşılınca model/tool çağrısı durur. - WebSocket tenant izolasyonu
korunur.

## 25.5 E2E tests

-   İlk kurulum.
-   Admin login.
-   Yerel provider bağlama.
-   Basit görev çalıştırma.
-   Agent team görevi.
-   Approval gerektiren eylem.
-   Görev iptali.
-   Worker restart sonrası resume.
-   Backup/restore smoke test.

## 25.6 CI kalite kapıları

Pull request: - Format/lint. - Type checking. - Unit tests. -
Integration tests. - Security tests (kritik subset). - Dependency
vulnerability scan. - Secret scan. - Build. - Migration validation.

Main branch'e doğrudan geliştirme yapılmamalıdır. Her özellik branch +
PR + test raporu ile ilerlemelidir.

------------------------------------------------------------------------

# 26. Hata yönetimi ve dayanıklılık

## 26.1 Hata sınıfları

-   VALIDATION_ERROR
-   AUTHENTICATION_ERROR
-   AUTHORIZATION_ERROR
-   TENANT_ACCESS_DENIED
-   POLICY_DENIED
-   APPROVAL_REQUIRED
-   PROVIDER_UNAVAILABLE
-   PROVIDER_RATE_LIMITED
-   MODEL_TIMEOUT
-   MODEL_CAPABILITY_UNSUPPORTED
-   BUDGET_EXCEEDED
-   RESOURCE_UNAVAILABLE
-   TOOL_EXECUTION_FAILED
-   SANDBOX_VIOLATION
-   MEMORY_RETRIEVAL_FAILED
-   DATABASE_UNAVAILABLE
-   WORKER_UNAVAILABLE
-   INTERNAL_ERROR

## 26.2 Retry

Retry yalnızca geçici hatalarda yapılmalıdır: - Network timeout, -
429/rate limit, - Geçici provider 5xx, - Worker transient failure.

Retry yapılmaması gerekenler: - Invalid input, - Policy denied, - Auth
failure, - Budget exceeded, - Approval rejected, - Sandbox violation.

Exponential backoff + jitter kullanılmalıdır. Maksimum retry sayısı ve
toplam süre sınırlandırılır.

## 26.3 Circuit breaker

Provider sürekli hata veriyorsa geçici olarak devre dışı bırakılır.
Circuit breaker durumu UI'da gösterilir. Alternatif provider'a geçiş
routing ve privacy/budget policy kontrolü olmadan yapılmaz.

## 26.4 Cancellation

Kullanıcı task iptal ettiğinde: - Yeni alt görev dispatch edilmez. -
Aktif model çağrıları mümkünse cancel edilir. - Tool execution güvenli
noktada durdurulur. - Approval bekleyen işler iptal edilir. - Worker
cleanup çalışır. - Son durum ve iptal nedeni kaydedilir.

------------------------------------------------------------------------

# 27. AI Town / 3D World Engine --- ileri aşama

3D AI Town, ana task orchestration sisteminden ayrı bir bounded context
olarak tasarlanmalıdır.

## 27.1 Ayrı tutulma gerekçesi

-   Görsel dünya simülasyonu görev yürütme için zorunlu değildir.
-   Sürekli tick ve agent simulation kaynak tüketebilir.
-   3D engine'in UI/runtime gereksinimleri farklıdır.
-   Core platformun basit ve güvenilir kalması gerekir.

## 27.2 Gelecek mimari

-   World Service
-   World State
-   Character/Agent Avatar
-   Location/Zone
-   Event Scheduler
-   Simulation Tick
-   Agent Activity Planner
-   World Memory
-   Visualization Client

## 27.3 Simülasyon ilkeleri

-   Her tick'te LLM çağrısı yapılmaz.
-   Deterministik simülasyon kuralları kullanılır.
-   LLM yalnızca anlamlı karar noktalarında çağrılır.
-   Ajanlar görev ve bütçe sınırına tabidir.
-   World state ile task state birbirinden ayrıdır.
-   3D istemci güvenlik otoritesi değildir; tüm eylemler backend'de
    doğrulanır.

## 27.4 Entegrasyon

World Engine, core platforma event/API üzerinden bağlanır. Core Agent
Runtime'a doğrudan bağımlı olmamalıdır. Bir avatarın hareketi veya
sohbeti gerçek sistem eylemi yetkisi oluşturmaz.

------------------------------------------------------------------------

# 28. Dağıtık worker ve ölçeklenme yolu

## 28.1 MVP

Tek makinede: - API process, - Worker process, - PostgreSQL, - Opsiyonel
Redis, - Local model endpoint.

## 28.2 Aşama 2

-   Birden çok worker process.
-   Queue tabanlı görev dağıtımı.
-   Worker capability labels.
-   Worker heartbeat.
-   Worker resource report.
-   Job lease ve retry.

## 28.3 Aşama 3

-   Remote worker registration.
-   Worker enrollment token.
-   mTLS veya eşdeğer güvenli kimlik doğrulama.
-   Worker allowlist.
-   Signed job payload.
-   Scoped task data.
-   Remote worker secret erişim kısıtları.
-   Worker revoke/rotate.

## 28.4 Worker capability

Örnek: - cpu - gpu - gpu_vram_mb - ram_mb - os - architecture -
installed_runtimes - local_models - tool_capabilities - network_zones -
max_concurrency

Scheduler yalnızca uygun worker'a iş atamalıdır. Bir worker'ın
capability bildirimi doğrulanmadan güvenlik kararı olarak
kullanılmamalıdır.

------------------------------------------------------------------------

# 29. Konfigürasyon yönetimi

## 29.1 Konfigürasyon kaynakları

Öncelik: 1. Güvenli platform default. 2. Environment variables / secret
mounts. 3. Config file. 4. Tenant settings. 5. User preferences. 6. Task
overrides.

Daha üst güvenlik katmanları alt ayarlarla gevşetilemez.

## 29.2 Örnek `.env.example`

``` dotenv
APP_ENV=development
APP_HOST=127.0.0.1
APP_PORT=8000
APP_SECRET_KEY=REPLACE_WITH_RANDOM_VALUE
DATABASE_URL=postgresql+psycopg://swarm:change-me@localhost:5432/swarm
REDIS_URL=
LOG_LEVEL=INFO
ALLOW_CLOUD_PROVIDERS=false
DEFAULT_MODEL_MODE=local_first
ENABLE_SANDBOX=true
SANDBOX_NETWORK_DEFAULT=disabled
MAX_TASK_DURATION_SECONDS=1800
MAX_PARALLEL_AGENTS=2
```

Bu dosyadaki değerler örnektir. Gerçek secret üretim sırasında
oluşturulmalıdır. Production'da örnek parola kullanılmamalıdır.

## 29.3 Config validation

-   Startup sırasında schema validation.
-   Unknown key warning/error.
-   Secret format checks.
-   Cross-field validation.
-   Insecure production config refusal.
-   Config changes audit.
-   Hot reload yalnızca güvenli ve desteklenen alanlarda.

------------------------------------------------------------------------

# 30. Lisans, açık kaynak ve tedarik zinciri

-   Root LICENSE seçimi proje sahibi tarafından netleştirilmelidir.
-   Her dependency'nin lisansı kontrol edilmelidir.
-   Model ağırlıkları kendi lisanslarına tabidir.
-   Plugin ve skill içerikleri lisans/provenance bilgisi taşımalıdır.
-   Üçüncü taraf marka/logoları izinsiz ürün markası gibi
    kullanılmamalıdır.
-   Docker Desktop ve diğer ticari bileşenlerin kullanım şartları
    açıklanmalıdır.
-   SBOM üretimi hedeflenmelidir.
-   Release artifact'leri checksum ve mümkünse imza taşımalıdır.

------------------------------------------------------------------------

# 31. Mimari karar kayıtları (ADR)

Aşağıdaki kararlar onaylanmış yön olarak kabul edilir; uygulama
sırasında gerekçeli ADR dosyalarına dönüştürülmelidir.

## ADR-001: Monorepo

**Karar:** Tek GitHub deposu, modüler monolit + ayrı worker uygulaması.

**Gerekçe:** Tek geliştirici için kurulum, test, sürümleme ve
koordinasyon kolaylığı.

## ADR-002: Local-first hybrid

**Karar:** Local-first varsayılan; cloud yalnızca kullanıcı BYOK
bağlantısı ve policy izniyle.

**Gerekçe:** Gizlilik, maliyet kontrolü ve ücretsiz başlangıç.

## ADR-003: Provider-agnostic Model Gateway

**Karar:** Ajanlar provider SDK'larına doğrudan bağlanmaz.

**Gerekçe:** Sağlayıcı değişimi ve capability normalization.

## ADR-004: Hardware-agnostic runtime

**Karar:** Donanım profili runtime'da algılanır.

**Gerekçe:** Farklı cihazlarda çalışabilirlik.

## ADR-005: Security-first Tool Gateway

**Karar:** Bütün tool eylemleri ActionProposal, Policy Engine ve gerekli
durumda approval üzerinden geçer.

**Gerekçe:** Model çıktısının doğrudan OS yetkisine dönüşmesini önlemek.

## ADR-006: Multi-tenant isolation

**Karar:** Kullanıcı/tenant verisi ve provider credentials ayrılır.

**Gerekçe:** Ortak sunucu kullanımında gizlilik.

## ADR-007: Official provider authentication only

**Karar:** Yalnızca resmi API key veya sağlayıcının izin verdiği OAuth
kullanılır.

**Gerekçe:** Tüketici aboneliklerinin yetkisiz şekilde yeniden
kullanılmasını ve kimlik bilgisi sızıntısını önlemek.

## ADR-008: AI Town separation

**Karar:** 3D World Engine core orchestration'dan ayrı bounded context.

**Gerekçe:** MVP karmaşıklığını ve kaynak tüketimini azaltmak.

## ADR-009: No paid dependency

**Karar:** MVP temel akışları ücretli API olmadan çalışmalıdır.

**Gerekçe:** Ücretsiz başlangıç ve kullanıcının bütçe kontrolü.

## ADR-010: One setup experience

**Karar:** Tek kurulum sihirbazı, tek dashboard ve tek yönetim deneyimi.

**Gerekçe:** Kullanıcı deneyimini basitleştirmek.

------------------------------------------------------------------------

# 32. MVP kapsamı ve geliştirme aşamaları

## P0 --- Repository foundation

Teslimatlar: - Monorepo iskeleti. - Python/Node toolchain pinning. -
Lint/format/typecheck. - CI pipeline. - AGENTS.md. - README. -
`.env.example`. - Docker Compose temel dosyası. - Health endpoint.

Kabul ölçütleri: - Temiz clone sonrası belgelenmiş komutlarla test/build
çalışır. - Secret yok. - CI yeşil. - Basit API health check başarılı.

## P1 --- Identity, tenant ve persistence

Teslimatlar: - User, Tenant, Membership. - İlk admin setup. -
Login/logout. - RBAC. - SQLAlchemy modelleri. - Alembic migration. -
Tenant scoped repository. - RLS hazırlığı/testleri.

Kabul: - İki kullanıcı ve iki tenant testi. - Cross-tenant read/write
engellenir. - Password hash güvenli. - Session revoke çalışır.

## P2 --- Provider Gateway ve local model

Teslimatlar: - Provider interface. - Model catalog. - Ollama adapter. -
OpenAI-compatible local adapter. - Capability normalization. - Model
health. - Local-first routing. - Mock provider.

Kabul: - Mock provider ile uçtan uca model isteği. - Yerel endpoint
varsa bağlantı testi. - Provider hataları normalize edilir. - Cloud
fallback kapalıyken cloud çağrısı oluşmaz.

## P3 --- Agent Runtime ve tek görev

Teslimatlar: - Agent Profile. - Agent Run. - Context builder. -
Supervisor/Planner. - Task state machine. - Basit workflow. - Task
timeline.

Kabul: - Kullanıcı görev oluşturur. - Plan üretilir. - Tek ajan
çalışır. - Sonuç kaydedilir. - İptal ve timeout çalışır.

## P4 --- Multi-agent orchestration

Teslimatlar: - Researcher, Analyst, Reviewer. - Task decomposition. -
Agent message contracts. - DAG/workflow. - Checkpoint. - Parallelism
cap.

Kabul: - Bir görev en az iki uzman ajanla tamamlanır. - Retry/timeout
davranışı test edilir. - Sonsuz loop engellenir. - Agent budget
enforcement çalışır.

## P5 --- Tools, policy ve approvals

Teslimatlar: - Tool registry. - Tool Gateway. - ActionProposal. - Policy
Engine. - Approval Center. - İlk salt okunur ve kontrollü sandbox
tool'ları. - Audit.

Kabul: - Policy denied eylem çalıştırılmaz. - Approval gereken eylem
onaysız çalışmaz. - Proposal değişirse eski approval geçersiz olur. -
Tool output schema doğrulanır.

## P6 --- Hafıza ve artifact

Teslimatlar: - Working/episodic/semantic memory. - pgvector
entegrasyonu. - Source references. - Memory review. - Artifact storage
abstraction. - Tenant/user scope.

Kabul: - Tenant memory izolasyonu. - Kaynaklı retrieval. -
Silme/retention. - Artifact authorization.

## P7 --- Dashboard ve gerçek zamanlı durum

Teslimatlar: - Dashboard. - Task Center. - Agent Studio. - Provider
settings. - Approval Center. - Usage view. - WebSocket/SSE.

Kabul: - Ana görev akışı UI'dan tamamlanır. - Gerçek zamanlı durum
doğru. - Hatalar ve bekleme nedenleri görünür. - Hassas veri UI'a
sızmaz.

## P8 --- Setup Wizard ve dağıtım

Teslimatlar: - Docker Compose kurulumu. - Windows PowerShell
bootstrapper. - Setup Doctor. - Admin setup. - Backup/restore. - Kurulum
doğrulama.

Kabul: - Temiz Windows test ortamında kurulum adımları belgelenmiş
biçimde tamamlanır. - Kurulum hatası raporlanır. - Var olan kullanıcı
verisi izinsiz silinmez. - Restore smoke test başarılı.

## P9 --- Hardening ve ilk release

Teslimatlar: - Security test suite. - Dependency scan. - SBOM. - Release
workflow. - Signed/checksummed artifacts. - User docs. - Known
limitations. - Upgrade/rollback docs.

Kabul: - Kritik güvenlik testleri geçer. - Release build
tekrarlanabilir. - Kurulum ve yükseltme dokümante. - Bilinen
sınırlamalar açıkça listelenir.

## P9 sonrası

-   Remote workers.
-   Daha fazla provider.
-   Plugin marketplace/registry.
-   MCP management.
-   A2A interoperability.
-   Advanced memory.
-   World Engine / AI Town.
-   3D visualization.
-   Enterprise identity.
-   High availability.

------------------------------------------------------------------------

# 33. Geliştirme iş akışı ve kodlama ajanı kuralları

## 33.1 Ana geliştirme ajanı

Antigravity birincil kodlama ajanıdır. Diğer AI araçları yalnızca
kullanıcı isteği veya uygun ücretsiz erişim bulunduğunda review/ikinci
görüş amacıyla kullanılabilir.

Aynı anda birden fazla ajan aynı dosyaları değiştirmemelidir. Birincil
kodlama ajanı değişiklikleri tamamlar; diğer araçlar ayrı review yapar.

## 33.2 Git iş akışı

-   `main` korumalı olmalıdır.
-   Özellik branch'i: `feature/<short-name>`.
-   Bugfix branch'i: `fix/<short-name>`.
-   Güvenlik düzeltmeleri: `security/<short-name>`.
-   Her değişiklik küçük ve anlamlı commit'lere ayrılır.
-   Force push yapılmaz.
-   Kullanıcı onayı olmadan main'e doğrudan push yapılmaz.
-   Kullanıcı onayı olmadan release/tag oluşturulmaz.
-   PR yalnızca araç ve kimlik doğrulama destekliyorsa açılır.
-   Kullanıcı dosyaları incelenmeden silinmez veya üzerine yazılmaz.

## 33.3 Kodlama ajanı davranışı

Kodlama ajanı: 1. Önce mevcut repository'yi inceler. 2. Var olan
dosyaları ve kullanıcı değişikliklerini korur. 3. Mimari belgeyle
çelişen noktaları raporlar. 4. Uygulamadan önce kısa plan çıkarır. 5.
Küçük aşamalarla uygular. 6. Testleri gerçekten çalıştırır. 7. Başarısız
testleri saklamaz. 8. Tamamlanmayan özelliği tamamlandı göstermez. 9.
Secret veya gerçek kullanıcı verisini commit etmez. 10. Her aşama
sonunda değişen dosyaları ve test sonuçlarını raporlar.

## 33.4 AGENTS.md içeriği

AGENTS.md bu belgeyi tamamlayan çalışma kurallarını içermelidir: -
Repository map. - Build/test commands. - Coding standards. - Security
invariants. - Module ownership. - Commit rules. - Definition of done. -
Forbidden operations.

## 33.5 Definition of Done

Bir iş ancak: - Kod tamamlandıysa, - İlgili testler eklendiyse, -
Testler çalıştırıldıysa, - Lint/typecheck başarılıysa, - Güvenlik etkisi
değerlendirildiyse, - Dokümantasyon güncellendiyse, - UI değişikliği
varsa erişilebilirlik kontrol edildiyse, - Hata durumları ele
alındıysa, - Bilinen sınırlamalar yazıldıysa

tamamlandı sayılır.

------------------------------------------------------------------------

# 34. Performans ve kapasite hedefleri

Kesin performans hedefleri gerçek benchmark sonrasında belirlenmelidir.
İlk sürümde ölçülmesi gereken metrikler:

-   API p50/p95 latency.
-   Task queue wait time.
-   Worker startup time.
-   Agent run duration.
-   Provider first-token latency.
-   End-to-end task completion time.
-   Memory retrieval latency.
-   Dashboard event latency.
-   CPU/RAM/VRAM usage.
-   Concurrent task throughput.

Ölçüm yapılmadan "yüksek performans", "sınırsız ölçek" veya belirli
eşzamanlı kullanıcı sayısı garanti edilmemelidir.

## 34.1 Backpressure

-   Queue maksimum uzunluğu.
-   Tenant başına aktif task limiti.
-   User başına aktif task limiti.
-   Worker concurrency.
-   Provider concurrency.
-   Model load concurrency.
-   Artifact upload limiti.

Sistem aşırı yüklendiğinde yeni iş kabulünü kontrollü şekilde
yavaşlatmalı veya reddetmeli; sessizce kaynak tüketmeye devam
etmemelidir.

------------------------------------------------------------------------

# 35. Veri gizliliği ve dış sağlayıcıya veri aktarımı

## 35.1 Veri sınıflandırması

Örnek sınıflar: - Public: Herkese açık bilgi. - Internal: Tenant içi
genel bilgi. - Confidential: Kullanıcı/kurum özel verisi. - Restricted:
Credential, hassas kişisel veri, güvenlik sırrı.

## 35.2 Cloud aktarım kararı

Cloud provider'a veri göndermeden önce: 1. Provider bağlantısı etkin mi?
2. Kullanıcı/tenant cloud kullanımına izin verdi mi? 3. Veri sınıfı
aktarım için uygun mu? 4. Görev özelinde aktarım izni var mı? 5. Bütçe
uygun mu? 6. Provider'ın data handling şartları kullanıcıya açıklanmış
mı?

Restricted veri varsayılan olarak cloud'a gönderilmez. İstisna ancak
açık, kayıtlı ve politika tarafından izinli bir akışla mümkündür.

## 35.3 Kullanıcıya açıklama

UI, görev başlamadan önce: - Hangi provider'ın kullanılacağını, - Hangi
modelin seçildiğini, - Verinin yerel mi cloud mu işleneceğini, - Tahmini
maliyeti veya maliyetin bilinmediğini, - Cloud aktarımı varsa hangi veri
sınıfının gönderileceğini

göstermelidir.

------------------------------------------------------------------------

# 36. Yedekleme, taşınabilirlik ve veri sahipliği

-   Kullanıcı kendi verisini dışa aktarabilmelidir.
-   Export tenant/user scope ile sınırlandırılır.
-   Export paketinde secret plaintext bulunmaz.
-   Hafıza ve artifact export'u ayrı seçenek olabilir.
-   Import sırasında schema/version doğrulaması yapılır.
-   Import edilen skill/plugin otomatik güvenilir sayılmaz.
-   Kullanıcı verisi platform sağlayıcısına bağımlı kapalı formatta
    tutulmamalıdır.
-   DB migration ve export formatı versiyonlanmalıdır.

------------------------------------------------------------------------

# 37. Bilinen teknik riskler ve açık kararlar

Aşağıdaki konular uygulama ve benchmark sırasında netleştirilmelidir:

1.  Queue teknolojisi: MVP'de PostgreSQL job table mı, Redis tabanlı
    broker mı? Seçim dayanıklılık ve operasyon karmaşıklığı ölçülerek
    yapılmalı.
2.  Auth yöntemi: İlk sürümde local account mı, OIDC-ready abstraction
    mı? Local account ile başlanabilir; OIDC sonraya bırakılabilir.
3.  Sandbox platformu: Docker tabanlı sandbox'ın Windows ve Linux
    davranışı ayrı test edilmelidir.
4.  Local model runtime: Ollama ilk adapter; gerçek GPU desteği
    donanım/driver bazında doğrulanmalı.
5.  Embedding modeli: Local embedding seçeneği ve cloud embedding
    gizlilik politikası belirlenmeli.
6.  Artifact storage: MVP'de local filesystem adapter; ileride
    S3-compatible adapter.
7.  Provider pricing: Dinamik fiyatlandırma kaynağı ve güncelleme süreci
    belirlenmeli.
8.  Plugin trust: İmzalı registry ve manuel local plugin kurulumunun
    güven modeli netleştirilmeli.
9.  Web research: Web erişimi varsa ayrı egress ve SSRF koruması
    uygulanmalı.
10. Windows installer teknolojisi: Paketleme aracı, imza ve güncelleme
    stratejisi prototip sonrası seçilmeli.
11. Multi-tenant production: Tek kullanıcı local kurulum ile shared
    server güvenlik testleri ayrı profillerde yürütülmeli.
12. AI Town: 3D engine ve simülasyon framework'ü MVP sonrası benchmark
    ile seçilmeli.

------------------------------------------------------------------------

# 38. İlk sürüm için kesin sınırlar

MVP'de mutlaka: - Tek repo. - Backend API. - Dashboard. - PostgreSQL. -
Tenant/user temel izolasyonu. - Model Gateway. - Mock provider. - En az
bir local provider adapter. - Basit Agent Runtime. - Supervisor/Planner
ve birkaç uzman ajan. - Task lifecycle. - Bütçe ve concurrency
sınırları. - Tool Gateway. - Policy Engine. - Approval workflow. -
Audit. - Temel memory. - Setup/health checks. - Docker Compose. -
Windows kurulum yolu. - Unit/integration/security testleri. - Türkçe ve
İngilizce dokümantasyon altyapısı.

MVP'de ertelenebilir: - Kubernetes. - Çok bölgeli deployment. - 3D AI
Town. - Marketplace. - A2A. - Gelişmiş görsel workflow editor. -
Kurumsal SSO. - Otomatik ücretli provider keşfi. - Sınırsız remote
worker.

------------------------------------------------------------------------

# 39. İlk geliştirme sırası: uygulama planı

Tek geliştirici ve ücretsiz AI araçlarıyla ilerlemek için önerilen
uygulama sırası:

1.  Repository ve CI temelini oluştur.
2.  Domain modelleri ve DB migration.
3.  Auth ve tenant context.
4.  Mock Model Gateway.
5.  Ollama adapter ve capability registry.
6.  Task API ve state machine.
7.  Tek ajan workflow.
8.  Supervisor/Planner.
9.  Multi-agent workflow.
10. Budget enforcement.
11. Tool registry ve Policy Engine.
12. Approval Center.
13. Audit.
14. Hafıza.
15. Dashboard.
16. Setup Doctor.
17. Docker Compose.
18. Windows bootstrapper/installer.
19. Güvenlik hardening.
20. İlk public release.

Her aşama küçük PR'lar halinde uygulanmalıdır. Bir aşamanın kabul
testleri geçmeden sonraki aşamanın kapsamı genişletilmemelidir.

------------------------------------------------------------------------

# 40. Son mimari özeti

Lean Hybrid Agent Swarm aşağıdaki karaktere sahip olacaktır:

-   **Local-first:** Kullanıcı verisi varsayılan olarak kendi ortamında
    kalır.
-   **Hybrid-ready:** Kullanıcı kendi sağlayıcı hesabını bağlarsa cloud
    kullanılabilir.
-   **Provider-agnostic:** Model sağlayıcısı değişince ajan mimarisi
    değişmez.
-   **Hardware-agnostic:** Donanım algılanır, kaynak kullanımı dinamik
    ayarlanır.
-   **Multi-user:** Kullanıcı ve tenant verileri ayrıdır.
-   **Security-first:** Model eylem yetkisi değildir; her araç çağrısı
    policy kontrolünden geçer.
-   **Budget-aware:** Her görev ve kullanıcı için limitler uygulanır.
-   **Modular:** Tek repo içinde net modül sınırları vardır.
-   **Deployable:** Tek makinede başlayıp worker havuzuna büyüyebilir.
-   **User-friendly:** Tek kurulum, tek dashboard, anlaşılır yönetim.
-   **Open-source friendly:** Lisans, bağımlılık ve model koşulları
    şeffaf tutulur.
-   **Incremental:** Önce güvenilir MVP, sonra ileri özellikler.

En önemli mimari kural:

> **Ajanlar karar ve öneri üretir; yetkiyi Policy Engine verir; eylemi
> Tool Gateway kontrollü ortamda yürütür; sonuç doğrulanır ve audit
> edilir.**

İkinci temel kural:

> **Hiçbir model, provider, agent, skill, plugin veya MCP server; tenant
> izolasyonunu, secret güvenliğini, bütçe sınırlarını, kullanıcı onayını
> veya platform güvenlik politikasını atlayamaz.**

Üçüncü temel kural:

> **Ürün tek bir bilgisayarın, tek bir model sağlayıcısının veya tek bir
> abonelik türünün varsayımlarına göre tasarlanmaz.**

------------------------------------------------------------------------

# Ek A --- İlk uygulama için minimum environment değişkenleri

  -----------------------------------------------------------------------------------
  Değişken                      Amaç                          Güvenlik notu
  ----------------------------- ----------------------------- -----------------------
  `APP_ENV`                     development/test/production   Production config
                                                              doğrulanmalı

  `APP_HOST`                    Bind adresi                   Varsayılan local-only

  `APP_PORT`                    API portu                     Port çakışması kontrol
                                                              edilmeli

  `APP_SECRET_KEY`              Session/crypto uygulama       Üretimde otomatik ve
                                anahtarı                      güvenli oluşturulmalı

  `DATABASE_URL`                PostgreSQL bağlantısı         Secret olarak ele
                                                              alınmalı

  `REDIS_URL`                   Opsiyonel queue/cache         Gerekmiyorsa boş

  `LOG_LEVEL`                   Log seviyesi                  Debug production'da
                                                              kapalı

  `ALLOW_CLOUD_PROVIDERS`       Cloud kullanımını             Varsayılan false
                                etkinleştirir                 

  `DEFAULT_MODEL_MODE`          Local/hybrid/cloud policy     Varsayılan local_first

  `ENABLE_SANDBOX`              Sandbox zorunluluğu           Production'da riskli
                                                              tool için true

  `MAX_TASK_DURATION_SECONDS`   Task timeout                  Üst sınır policy ile
                                                              korunmalı

  `MAX_PARALLEL_AGENTS`         Paralel ajan limiti           Kaynak yöneticisiyle
                                                              uyumlu
  -----------------------------------------------------------------------------------

# Ek B --- İlk API olay sözleşmesi örneği

``` json
{
  "event_id": "uuid",
  "event_type": "task.progress",
  "schema_version": 1,
  "occurred_at": "2026-11-04T12:00:00Z",
  "tenant_id": "uuid",
  "task_id": "uuid",
  "correlation_id": "uuid",
  "payload": {
    "step": "research",
    "status": "running",
    "progress_percent": 35
  }
}
```

Event payload'ı secret veya özel dosya içeriği taşımamalıdır.

# Ek C --- İlk ActionProposal örneği

``` json
{
  "proposal_id": "uuid",
  "task_id": "uuid",
  "tool_id": "workspace.create_file",
  "action_type": "file.create",
  "normalized_arguments": {
    "path": "reports/summary.md",
    "content_ref": "artifact://uuid"
  },
  "affected_resources": [
    {
      "type": "workspace_file",
      "path": "reports/summary.md",
      "operation": "create"
    }
  ],
  "risk_level": "L2",
  "rationale": "Görev raporunu çalışma alanına kaydetmek.",
  "expected_effect": "Yeni bir Markdown dosyası oluşturulur.",
  "rollback_plan": "Oluşturulan dosya silinebilir.",
  "expires_at": "2026-11-04T12:10:00Z"
}
```

Bu örnek yalnızca sözleşme örneğidir. Gerçek tool implementasyonu path
traversal, symlink, workspace sınırı, dosya boyutu ve overwrite
politikasını ayrıca doğrulamalıdır.

# Ek D --- Release öncesi kontrol listesi

-   [ ] Secret scan temiz.
-   [ ] Dependency scan temiz veya açıklanmış bulgular var.
-   [ ] Unit tests başarılı.
-   [ ] Integration tests başarılı.
-   [ ] Tenant isolation tests başarılı.
-   [ ] Approval bypass tests başarılı.
-   [ ] Budget enforcement tests başarılı.
-   [ ] Provider fallback tests başarılı.
-   [ ] Sandbox tests başarılı.
-   [ ] Migration upgrade testi başarılı.
-   [ ] Backup/restore testi başarılı.
-   [ ] Windows temiz kurulum testi başarılı.
-   [ ] Docker Compose temiz kurulum testi başarılı.
-   [ ] README ve kullanıcı kılavuzu güncel.
-   [ ] Bilinen sınırlamalar listelenmiş.
-   [ ] Lisanslar ve üçüncü taraf bildirimleri hazır.
-   [ ] Release artifact checksum/signature bilgileri mevcut.

------------------------------------------------------------------------

**Belge sonu --- Lean Hybrid Agent Swarm Architecture & Technical Design
Specification v1.0**

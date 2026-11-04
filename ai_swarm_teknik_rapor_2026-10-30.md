YAPAY ZEKÂ SÜRÜLERİ
ve Otonom Ajan Toplulukları
Araştırma, model seçimi, yazılım mimarisi, altyapı ve üretim yol haritası
????????????????????????????????????????????
Araştırma tarihi: 30 Ekim 2026
Rapor sürümü: 1.0
Belge türü: Teknik araştırma ve mimari tasarım
Bu rapor, AI Swarm ve AI Town sistemleri için uygulanabilir bir başlangıç mimarisi sunar. Sağlayıcı ve servis fiyatları değişebileceğinden dağıtım öncesi güncel doğrulama gerekir.


İçindekiler
* Yönetici özeti
* 1. Kapsam, varsayımlar ve araştırma sınırı
* 2. Kavramlar ve problem ayrımı
* 3. Araştırma temelleri: Smallville, AI Town ve Concordia
* 4. Ajan çerçeveleri: karşılaştırma ve seçim
* 5. En iyi model: sağlayıcı, rol ve maliyet temelli seçim
* 6. Önerilen sistem mimarisi
* 7. Hafıza ve bilgi mimarisi
* 8. Ajanlar, araçlar ve protokoller
* 9. Veri modeli ve API taslağı
* 10. Güvenlik ve yönetişim
* 11. Altyapı, servisler ve dağıtım
* 12. Yazılım deposu ve kodlama mimarisi
* 13. CI/CD, kalite ve gözlemlenebilirlik
* 14. Maliyet ve kapasite planlama
* 15. Aşamalı geliştirme yol haritası
* 16. Riskler ve mimari karar kaydı
* 17. İlk sürüm için kabul kriterleri
* 18. Son karar ve tavsiye
* 19. Kaynakça ve teknik başvuru bağlantıları


Yönetici özeti
Bu rapor iki yakın ama farklı sistemi birlikte ele alır:
1. Otonom ajan sürüsü (AI swarm): Araştırma, yazılım geliştirme, analiz, planlama veya operasyon gibi görevleri uzman ajanlara dağıtan; ortak durum, araçlar ve doğrulama süreçleri üzerinden işbirliği yapan sistem.
2. Yapay zekâ kasabası / otonom ajan topluluğu (AI town): Kalıcı kimlikleri, hedefleri, hafızaları, ilişkileri ve zaman içindeki davranışları bulunan ajanların ortak bir simülasyon dünyasında yaşadığı sistem.
İki yapı aynı model geçidini, hafıza altyapısını, kimlik/izin sistemini, olay omurgasını ve gözlemlenebilirlik katmanını paylaşabilir. Ancak simülasyon motoru ile görev orkestrasyonu ayrı tutulmalıdır. Bir LLM'nin her karede veya her zaman adımında dünyayı yönetmesi hem maliyetli hem de davranış açısından kararsızdır. Dünya kuralları, zaman, konum, hareket, çarpışma, durum geçişleri ve izinler deterministik kod tarafından yönetilmeli; LLM yalnızca anlamlandırma, niyet, diyalog ve karmaşık karar gerektiren noktalarda devreye girmelidir.
Nihai mimari önerisi
KatmanÖnerilen tercihNedenWeb istemcisiReact + TypeScript + PixiJS2D dünya, canlı durum ve yönetim arayüzüAPI ve domain servisleriPython + FastAPI + PydanticAjan/ML ekosistemi, tipli API ve hızlı servis geliştirmeAjan orkestrasyonuLangGraphAçık grafik, durum, checkpoint, dallanma, döngü ve insan onayıSimülasyon motoruAyrı deterministik Python servisiDünya kurallarını LLM'den ayırmakAna veri deposuPostgreSQLDünyalar, ajanlar, görevler, olaylar, onaylar ve denetim kaydıİlk vektör katmanıpgvectorBaşlangıçta ayrı vektör veritabanı işletme zorunluluğunu kaldırırOlay omurgasıNATS JetStreamKalıcı akışlar, tekrar oynatma, tüketici grupları ve iş dağıtımıÖnbellek / kısa ömürlü durumRedisOturum, cache, rate limit ve geçici koordinasyonModel geçidiLiteLLM Proxy veya ince bir kurum içi gatewayÇoklu sağlayıcı, kota, fallback, maliyet ve gecikme bazlı yönlendirmeAraç protokolüMCPAjanların araçlara, kaynaklara ve veri sistemlerine erişimiAjanlar arası protokolA2ABağımsız ajan servislerinin keşfi ve görev devriDosya depolamaS3 uyumlu nesne depolama / MinIOÜretilen dosyalar, raporlar ve simülasyon varlıklarıGözlemlenebilirlikOpenTelemetry + Langfuse + Prometheus/Grafanaİz, maliyet, hata, gecikme ve kalite değerlendirmesiGüvenli çalıştırmaİzole sandbox; gerektiğinde gVisor/FirecrackerAjan kaynaklı kod ve komutların ana makineden ayrılmasıİlk dağıtımDocker ComposeBasit geliştirme ve tek sunuculu pilotÖlçeklemeKubernetesYük, tenant ve işçi sayısı büyüdüğündeCI/CDGitHub ActionsLinux/Windows test matrisi, güvenli imzalama ve dağıtım
Ana karar: Genel amaçlı, üretime uygun bir sürü için LangGraph tabanlı hiyerarşik ve grafik orkestrasyonu; AI Town tarzı yaşayan topluluk için bunun yanına bağımsız bir simülasyon motoru konulmalıdır. Sosyal simülasyon araştırmaları için Concordia'nın Game Master + entity/component yaklaşımı güçlü bir referanstır. AI Town ise dünya motoru, UI ve LLM ajan katmanını ayırma bakımından iyi bir örnektir. [1][2][3][4]
1. Kapsam, varsayımlar ve araştırma sınırı
1.1 Kapsam
Bu rapor; ajan mimarileri, çoklu ajan çerçeveleri, temel modeller, model yönlendirme, hafıza, araç entegrasyonu, ajanlar arası iletişim, simülasyon, veri altyapısı, barındırma, güvenlik, izleme, test, maliyet yönetimi ve geliştirme aşamalarını kapsar.
1.2 Kaynak sınırı
Paylaşılan metinde “55 kaynak” bilgisi ve kaynakların kısa açıklamaları bulunuyor; ancak 55 kaynağın tek tek URL'leri veya dosyaları konuşmaya eklenmemiş. Bu nedenle orijinal 55 kaynağın eksiksiz denetimi yapıldığı iddia edilmemektedir. Rapor, erişilebilir birincil dokümantasyon, akademik çalışma, açık kaynak proje belgeleri, protokol belgeleri ve güncel model rehberleri üzerinden bağımsız tarama ile hazırlanmıştır. Kaynakça bölümünde kararları destekleyen temel bağlantılar listelenmiştir.
1.3 Tasarım varsayımları
* Sistem ilk aşamada küçük/orta ölçekli bir pilotla başlayacak; binlerce eşzamanlı ajan başlangıç gereksinimi kabul edilmeyecektir.
* Birden fazla model sağlayıcısı kullanılabilir; mimari tek bir sağlayıcıya kilitlenmemelidir.
* Dış dünyada yan etki oluşturan araç çağrıları, dosya yazma, kod çalıştırma, API değişikliği, mesaj gönderme ve yönetim işlemleri politika kontrolünden geçmelidir.
* Ajanların kendi kendilerine yetki yükseltmesine, güven sınırlarını değiştirmesine veya ham sistem komutu çalıştırmasına izin verilmemelidir.
* Simülasyon ile gerçek dünya otomasyonu birbirinden ayrılmalıdır. Sanal dünyadaki bir eylem, gerçek sistemde eylem yapma izni anlamına gelmez.
2. Kavramlar ve problem ayrımı
2.1 Ajan nedir?
Bir ajan, hedef veya görev alan, bağlamını değerlendiren, bir model veya deterministik karar mekanizmasıyla sonraki eylemi seçen, izin verilen araçları çağıran ve sonucunu gözlemleyerek devam eden yazılım birimidir. Ajanın yalnızca sohbet geçmişi olması yeterli değildir; en azından kimlik, görev sınırı, mevcut durum, araç izinleri ve çalışma kaydı bulunmalıdır.
2.2 Sürü nedir?
Sürü, birden fazla ajanı yalnızca aynı anda çalıştırmak değildir. İş bölümü, mesajlaşma, görev sahipliği, paylaşılan bağlam, çatışma çözümü, sonucun doğrulanması ve başarısızlık halinde toparlanma mekanizması bulunmalıdır.
2.3 AI Town nedir?
AI Town benzeri sistemlerde ajanlar, bir dünya modelinin içindeki karakterlerdir. Konumları, ilişkileri, hedefleri, geçmişleri ve çevre algıları vardır. Simülasyon zamanı ile gerçek zaman eşleştirilir. Ajan, çevresini algılar; bir niyet veya eylem önerir; simülasyon motoru bunun mümkün olup olmadığını doğrular ve dünya durumunu günceller.
2.4 Neden tek mimari yeterli değil?
ÖzellikGörev sürüsüSimülasyon kasabasıZamanGörev ve iş akışı bazlıSürekli veya tick/event bazlıAjan ömrüGörev süresince veya oturum boyuncaUzun ömürlü kimlikAna durumTask/run stateWorld/agent stateBaşarı ölçütüGörevin doğrulanmış tamamlanmasıTutarlı ve inandırıcı davranışİletişimGörev devri ve artefaktSosyal etkileşim ve dünya olaylarıHafızaGöreve/tenant'a bağlıAjanın yaşam öyküsü + dünya bilgisiHataRetry, fallback, insan incelemesiEylemi reddetme, yeniden planlama, simülasyonu koruma
3. Araştırma temelleri: Smallville, AI Town ve Concordia
3.1 Stanford Generative Agents / Smallville
Stanford'un “Generative Agents: Interactive Simulacra of Human Behavior” çalışması, ajanların deneyimlerini doğal dil biçiminde kaydetmesi, bu kayıtları zaman içinde daha üst düzey yansımalar hâline getirmesi ve ilgili anıları planlama sırasında geri çağırması üzerine kuruludur. Makale; gözlem, planlama ve yansıtma bileşenlerinin inandırıcı davranış üretimine katkısını ablation deneyleriyle inceler. [1]
Mimari ders: Ajan belleği yalnızca son mesajların birleştirilmesi olmamalıdır. Deneyim günlüğü, özet/çıkarım ve sorguya göre geri çağırma ayrı aşamalardır.
3.2 AI Town
A16z AI Town mimarisi; sunucu tarafındaki oyun/dünya mantığını, oyun motorunu, istemci UI'ını ve LLM gerektiren asenkron ajan işlemlerini ayırır. Ajanlar hem deterministik kuralları hem LLM çağrılarını kullanır. Ajanın uzun süren bir model işi yapması gerektiğinde bu iş ayrı asenkron işlem olarak başlatılır; dünya durumuna doğrudan gelişigüzel yazmak yerine tanımlı input/eylem akışı kullanılır. [2]
AI Town dokümanında mevcut motorun tasarım sınırları da açıkça belirtilir: dünya durumu her adımda belleğe alınır, motor tek iş parçacıklı tasarlanmıştır, yüksek frekanslı ve çok büyük durumlu simülasyonlar için uygun olmayabilir. Dokümanda örnek yapılandırmada yaklaşık 1,5 saniyelik girdi gecikmesi de açıklanır. Bu, AI Town'ın mimari fikrinin yararlı; mevcut motorun ise her ölçek ve gerçek zaman gereksinimi için otomatik olarak uygun olmadığını gösterir. [2]
Mimari ders: AI Town'ı birebir ölçeklemek yerine, onun domain ayrımını ve olay/tick modelini benimseyip simülasyon motorunu ihtiyaca göre yeniden kurmak daha güvenlidir.
3.3 Google DeepMind Concordia
Concordia, fiziksel, sosyal veya dijital ortamlarda üretken ajan tabanlı simülasyon kurmak için tasarlanmış bir kütüphanedir. Önemli tasarım fikri, ajanların eylem niyetlerini doğal dilde üretmesi; özel bir Game Master varlığının bu eylemleri ortam kurallarına göre gözlem ve sonuçlara dönüştürmesidir. Entity/component yapısı ile hafıza, algı ve eylem seçimi modülerleştirilir. [3]
Mimari ders: Karakterin “gitmek istiyorum” demesi ile gerçekten hareket etmesi aynı şey değildir. Ajan niyet üretir; dünya motoru fiziksel ve sosyal kurallara göre eylemi kabul eder veya reddeder.
3.4 Bu üç yaklaşımın sentezi
* Stanford: deneyim -> yansıtma -> planlama hafıza döngüsü.
* AI Town: dünya motoru -> input/event -> asenkron LLM görevi ayrımı.
* Concordia: ajan niyeti -> Game Master/world resolver -> gözlemlenebilir sonuç.
Bu rapordaki önerilen AI Town tasarımının merkezinde bu üç ilke yer alır.
4. Ajan çerçeveleri: karşılaştırma ve seçim
Çerçeve seçimi; popülerlikten çok durum yönetimi, kontrol akışı, hata toparlama, insan onayı, sağlayıcı bağımsızlığı, gözlemlenebilirlik ve geliştirme ekibinin dil becerisine göre yapılmalıdır.
ÇerçeveGüçlü yönUygun kullanımDikkat noktasıLangGraphAçık state graph, paralel düğümler, checkpoint, interrupt, replay ve kontrolKarmaşık, uzun ömürlü ve denetlenebilir ajan iş akışlarıTasarım ve durum şeması disiplin isterMicrosoft Agent FrameworkPython ve C#/.NET, ajan + workflow, oturum, middleware, telemetryMicrosoft/.NET ağırlıklı kurumsal sistemlerSürüme ve provider özellik eşitliğine dikkatCrewAIRol tabanlı ekipler, Crew ve Flow kavramlarıHızlı prototip, rol tabanlı iş dağıtımıÜretimde kontrol akışını Flow çevresinde açık kurOpenAI Agents SDKBasit ajan tanımı, handoff, guardrail, MCP ve tracingOpenAI ağırlıklı küçük/orta ajan ekipleriUygulama state ve kalıcılık tasarımı yine gerekirGoogle ADKPython/TypeScript/Go/Java, çoklu ajan, workflow ve GCP dağıtımıGemini/GCP ekosistemiProvider/hosting entegrasyonlarını doğrulaConcordiaSosyal simülasyon, Game Master ve entity/componentAI town, sosyal davranış araştırmasıGenel amaçlı iş orkestratörü olarak tasarlanmamıştırOpenAgentsİnsan + ajan işbirliği, workspace, launcher ve network SDKHazır işbirliği ortamı veya ajan ağı prototipiKendi domain motorunun yerine otomatik geçmezMetaGPTÜrün yöneticisi/mimar/geliştirici gibi SOP rolleriYazılım geliştirme ekibi benzeri akışlarKontrolsüz ajan sayısını artırmak yerine SOP'leri özelleştirAutoGenÇoklu ajan deneyleri ve geçmiş ekosistemEski projeleri anlama/migrasyonMicrosoft projesi arşivlendi; yeni üretim projesinde Microsoft Agent Framework'e bakılmalı
4.1 Önerilen birincil tercih: LangGraph
LangGraph, iş akışını state, node ve edge bileşenleriyle modelleyerek birden fazla ajanın paralel veya sıralı çalışmasını ve akışın koşullu biçimde yönlendirilmesini sağlar. Checkpoint ve interrupt, işin insan onayı veya arıza sonrasında kaldığı yerden devam etmesine yardım eder. [4]
Önerilen kullanım: LangGraph, görev sürüsünün orkestrasyon katmanı olur. Simülasyon motoru LangGraph'ın içine gömülmez; kendi olay döngüsüne sahip ayrı domain servisidir. Her NPC'nin her küçük hareketi bir LangGraph çalışması oluşturmaz.
4.2 Microsoft Agent Framework ne zaman daha iyi?
Sistem C#/.NET merkezli olacak, Azure/Microsoft Foundry entegrasyonu önemli olacak veya Windows kurumsal altyapısı ile .NET geliştirici deneyimi tercih edilecekse Microsoft Agent Framework ciddi alternatiftir. Microsoft dokümanları Agent Framework'ü AutoGen ve Semantic Kernel'in doğrudan devamı olarak tanımlar; ajanlar, workflow, harness, middleware ve entegrasyon katmanlarını birleştirir. [5]
AutoGen'in güncel proje uyarısı arşivlendiğini ve yeni projeler için Microsoft Agent Framework'e geçilmesini önerdiğini belirtir. [6]
4.3 CrewAI ve Google ADK
CrewAI; rol tabanlı ajan ekibi kurmayı kolaylaştırır. Üretim yaklaşımında tekil Crew nesneleri yerine state, kontrol akışı, dallanma, persist/resume ve gözlemlenebilirlik sağlayan Flow çevresinde ilerlemek daha uygundur. [7]
Google ADK; workflow tabanlı sıralı, paralel ve döngüsel ajanları, ayrıca dinamik ajan delegasyonunu destekleyen çoklu dil seçenekli bir geliştirme kitidir. Google Cloud/Vertex tabanlı dağıtım tercih ediliyorsa değerlendirilmelidir. [8]
4.4 OpenAI Agents SDK
OpenAI Agents SDK, uygulamanın kendi sunucusunda state, araç, MCP sunucusu ve onay kararlarını yönettiği senaryoda düşük soyutlama ile ajan döngüsü ve uzman devri sağlar. Tracing; model çağrıları, araç çağrıları, handoff ve guardrail olaylarını izlemeyi kolaylaştırır. [9]
4.5 Karar
* Genel, sağlayıcı bağımsız, stateful ajan sürüsü: LangGraph.
* C#/.NET ve Microsoft kurumsal entegrasyonu: Microsoft Agent Framework.
* Hızlı rol tabanlı prototip: CrewAI.
* Google Cloud ve Gemini ağırlıklı sistem: Google ADK.
* Sosyal dünya simülasyonu: Concordia desenlerinden yararlanan özel simülasyon motoru.
* Hazır insan-ajan ortak çalışma ortamı: OpenAgents değerlendirmeye alınabilir; ancak kendi veri/iş kuralları ve yetki modelinin yerini almamalıdır.
5. En iyi model: sağlayıcı, rol ve maliyet temelli seçim
5.1 Tek bir kazanan yok
30 Ekim 2026 itibarıyla sağlayıcıların resmi model rehberleri farklı görev sınıflarını öne çıkarıyor. OpenAI, GPT-6 Astra'yı karmaşık akıl yürütme ve kodlama; GPT-6.1 Sol'u daha düşük maliyetli karmaşık işler; GPT-6.1 Terra'yı hızlı/görece düşük maliyetli görsel akıl yürütme ve bilgisayar kullanımı için konumlandırıyor. [10]
Anthropic, Claude Opus 5.5'i uzun süreli ajan kodlama ve bilgi işleri; Claude Fable 5.1'i daha zor akıl yürütme ve uzun ufuklu ajan işleri; Sonnet 5.5'i hız/zeka dengesi; Haiku 5.5'i yüksek hacimli ve gecikmeye duyarlı işler için öneriyor. [11]
Google, Gemini 4 Argon'u en yetenekli akıl yürütme modeli; Gemini 3.8 Flash'ı uzun süreli yazılım mühendisliği, otonom ajanlar ve karmaşık iş akışlarına yönelik hızlı model olarak sunuyor. [12]
5.2 Önerilen model rol dağılımı
Ajan rolüİlk adayAlternatifNedenAna planlayıcı / zor görev yöneticisiGPT-6 AstraClaude Fable 5.1 / Gemini 4 ArgonKarmaşık karar, çok adımlı plan ve yüksek bağlamUzun süreli kodlama ajanıClaude Opus 5.5GPT-6 AstraBüyük kod tabanı, refactor, test ve düzeltme döngüsüGenel görev işçisiGPT-6.1 SolClaude Sonnet 5.5Yetenek/maliyet dengesiKasaba karakteri diyalog işçisiGemini 3.8 FlashClaude Haiku 5.5 / GPT-6.1 TerraÇok sayıda kısa karar ve diyalogSınıflandırma / özet / yönlendirmeClaude Haiku 5.5Daha küçük/yerel modelDüşük maliyet ve düşük gecikmeGörsel ekran/arayüz/masaüstü ajanıGPT-6.1 TerraGemini 4 ArgonGörsel muhakeme ve computer useBağımsız eleştirmenFarklı sağlayıcıdan Sonnet/Opus veya GPTGemini 4 ArgonAynı modelin hatalarını aynen tekrarlama riskini düşürmek
Bu tablo kesin bir benchmark sıralaması değil, başlangıç aday listesidir. Son seçim aynı görev seti, aynı araçlar, aynı token bütçesi ve aynı doğrulama kuralı altında yapılan kurum içi testlerle belirlenmelidir.
5.3 Resmî token fiyatlarına göre örnekler
Aşağıdaki fiyatlar 30 Ekim 2026 tarihinde yayımlanmış standart metin token fiyatlarından örneklenmiştir. Sağlayıcı, bölge, önbellek, batch, uzun bağlam, özel anlaşma ve araç çağrısı fiyatları toplam maliyeti değiştirebilir.
ModelGirdi / 1M tokenÇıktı / 1M tokenKonumlandırmaGPT-6 Astra$10$50En zor genel işlerGPT-6.1 Sol$2$10Genel amaçlı dengeli işçiGPT-6.1 Terra$1$5Hız/maliyet ve bilgisayar kullanımıClaude Opus 5.5$4$20Uzun süreli kodlama/knowledge workClaude Sonnet 5.5$2$10Hız ve kalite dengesiClaude Haiku 5.5$0.10'dan$0.50'danYüksek hacimli hafif işlerGemini 4 Argon$2 / $10 tanıtım fiyatı$1030 Kasım 2026'ya kadar tanıtım fiyatı; 1 Aralık'ta $4 / $20 olarak duyurulmuşGemini 3.8 Flash$0.75$3.75Google Agent Platform'da 31 Aralık 2026'ya kadar tanıtım fiyatı; sonrasında $1.50 / $7.50
Kaynak: resmî OpenAI modelleri, Anthropic model rehberi ve Google model/pricing dokümanları. [10][11][12]
5.4 Model yönlendirme (agentic routing)
Model yönlendirme, her isteği otomatik olarak en ucuz modele göndermek değildir. İstek türü, risk, doğruluk beklentisi, gecikme hedefi, bağlam büyüklüğü ve kalan bütçeye göre model seçilmelidir.
Önerilen karar akışı:
1. İstek sınıflandırıcısı: iş türü, risk seviyesi, dil, bağlam ve beklenen çıktı biçimini belirler.
2. Kural tabanlı politika: hassas eylem veya yönetici onayı gereken işler için sınır koyar.
3. Model seçici: düşük/orta/yüksek yetenek seviyesi ve sağlayıcı uygunluğu belirler.
4. Sağlık kontrolü: sağlayıcı hata oranı, rate limit, gecikme ve kota durumunu denetler.
5. Fallback: aynı yetenek sınıfında başka deployment seçer; sessizce daha düşük kaliteye düşmez.
6. Sonuç değerlendirmesi: kalite, maliyet, token, gecikme ve retry verisini kaydeder.
LiteLLM Router dokümanında ağırlıklı seçim, rate-limit aware, latency based, least busy, cost based ve fallback stratejileri açıklanır. [13]
Kural: Önce deterministik kodla çözülebilen işi LLM'ye göndermeyin. Basit hareket, sayaç, zamanlayıcı, konum ve izin kontrolleri normal kod olmalıdır.
6. Önerilen sistem mimarisi
6.1 Mantıksal mimari
CLIENTS -> React + TypeScript + PixiJS
API -> FastAPI + authentication + tenant/rate limits
CORE -> World Service + LangGraph Orchestrator + Policy Engine
EVENTS/WORKERS -> NATS JetStream + Agent Runtime + Memory + MCP/A2A
MODELS -> LiteLLM -> OpenAI / Anthropic / Google / local vLLM
DATA -> PostgreSQL/pgvector + Redis + S3-compatible object storage
OBSERVABILITY -> OpenTelemetry + Langfuse + Prometheus/Grafana
6.2 Sorumluluk sınırları
API Gateway: Kimlik doğrulama, tenant tespiti, rate limit, istek doğrulama ve dış API yüzeyi.
World Service: Saat, tick, konum, hareket, harita, sosyal mesafe, çarpışma, dünya kuralı ve eylem uygulama. LLM cevabını doğrudan dünya veritabanına yazmaz; tipli eylem önerisi alır ve kuralları doğrular.
Task Orchestrator: Kullanıcı görevlerini parçalar, uzman ajanları çağırır, koşullu akışı yönetir, checkpoint alır, onay bekler ve sonucun tamamlanmasını doğrular.
Agent Workers: Aynı runtime üzerinde kimlik/rol/izin/bellek bağlamıyla görev yapan yatay ölçeklenebilir işçilerdir. Her karakter için ayrı servis açılmaz.
Memory Service: Deneyim kayıtlarını, özetleri, ilişkileri ve beceri bilgisini ayırır. Ajan kimliği, tenant ve dünya kimliği üzerinden erişim sınırları uygular.
Tool Gateway: MCP sunucularını ve kurum içi araçları kayıt altına alır; şema doğrulama, izin kontrolü, audit ve eylem öncesi/sonrası doğrulama yapar.
Model Gateway: Sağlayıcı anahtarlarını korur; timeout, retry, fallback, kota, önbellek, maliyet ve model seçimini yönetir.
6.3 Çalışma döngüsü
1. Dünya servisi bir olay oluşturur: agent.nearby_person, schedule.wakeup, message.received, goal.deadline.
2. Olay NATS akışına yazılır ve idempotent bir tüketici tarafından alınır.
3. Ajan runtime, ajanın kimliğini, son checkpoint'ini ve gerekli belleğini yükler.
4. Kural motoru, LLM çağrısı gerekip gerekmediğine karar verir.
5. Gerekliyse model yönlendirici, görev sınıfına uygun modeli seçer.
6. Ajan tipli ActionProposal üretir; serbest metin doğrudan komut olarak çalıştırılmaz.
7. Policy Engine; kimlik, izin, parametre, bütçe ve risk kontrollerini yapar.
8. Gerekli olduğunda insan onayı beklenir.
9. World Service eylemi uygular veya reddeder.
10. Sonuç event log'a ve ilgili hafızaya kaydedilir; trace ve maliyet metrikleri eklenir.
6.4 Kontrol topolojisi
Önerilen varsayılan topoloji hiyerarşik supervisor + sınırlı uzman ajanlar + olay omurgasıdır.
* Supervisor görev sahibidir; tüm uzmanların serbestçe birbirini çağırmasına izin verilmez.
* Planner işi küçük, doğrulanabilir alt görevlere ayırır.
* Researcher/Executor görevini yapar ve kanıt/artefakt döndürür.
* Reviewer sonuçları test eder; gerekiyorsa düzeltme döngüsüne yollar.
* Policy Engine nihai güvenlik kontrolünü yapar.
* Event bus, servisleri birbirinden ayırır; tüm kararların sahibi değildir.
Ajanlar arası serbest ağ (herkes herkesle konuşur) ilk sürüm için önerilmez. Kontrolsüz mesaj sayısı, bağlam tekrarı, maliyet ve döngü riski büyür. Paralellik yalnızca birbirinden bağımsız alt görevlerde açılmalıdır.
7. Hafıza ve bilgi mimarisi
7.1 Dört hafıza sınıfı
HafızaİçerikSaklama biçimiÇalışma hafızasıO anki görev, gözlem, ara plan ve checkpointLangGraph state / PostgreSQLEpizodik hafızaNe oldu, kim vardı, ne zaman oldu, hangi sonuç çıktıDeğişmez olay/deneyim kaydıSemantik hafızaAjanın doğrulanmış bilgi, ilişki ve dünya hakkındaki özetleriPostgreSQL + pgvector veya QdrantProsedürel hafızaBeceri, SOP, araç kullanımı ve iş akışı yönergeleriSürüm kontrollü dosya/knowledge store
7.2 Hafıza yazma politikası
Her konuşma mesajını kalıcı semantik gerçek olarak yazmayın. Hafıza kayıtları kaynak, zaman, güven seviyesi, tenant, dünya, ajan, katılımcı ve geçerlilik bilgisi taşımalıdır.
Önerilen kayıt alanları:
{
  "memory_id": "uuid",
  "tenant_id": "uuid",
  "world_id": "uuid",
  "agent_id": "uuid",
  "kind": "episodic|semantic|procedural",
  "content": "...",
  "source_event_id": "uuid",
  "occurred_at": "2026-10-30T10:00:00Z",
  "confidence": 0.0,
  "valid_from": "2026-10-30T10:00:00Z",
  "valid_until": null,
  "visibility": "private|world|tenant",
  "embedding": "vector"
}
7.3 Geri çağırma
* Önce tenant/world/agent yetki filtresi uygulanır.
* Sonra anahtar kelime/BM25 ve vektör araması birlikte kullanılır.
* Sonuçlar zamansal uygunluk, güven ve kaynak kalitesiyle yeniden sıralanır.
* Küçük, görevle ilgili bir bellek paketi modele verilir.
* Gereksiz eski içerik prompt'a yüklenmez.
pgvector, PostgreSQL içerisinde HNSW ve IVFFlat gibi indeks yöntemlerini; Qdrant ise hybrid query ve tenant filtreli kullanım desenlerini destekler. İlk MVP'de pgvector ile başlamak, daha sonra ölçümler gerektirirse Qdrant'a ayrıştırmak daha az operasyon yükü oluşturur. [14][15]
7.4 Hafıza zehirlenmesine karşı koruma
* Dışarıdan gelen metni talimat değil veri olarak ele alın.
* Agent memory'ye yazma işlemi için kaynak/kanıt ve güven seviyesi isteyin.
* Kimlik, yetki, sistem politikası ve güvenlik talimatları semantik hafızadan yüklenmemelidir.
* Bir ajanın özel hafızası başka ajana otomatik açılmamalıdır.
* Silme/unutma, saklama süresi ve veri dışa aktarma politikaları tanımlanmalıdır.
8. Ajanlar, araçlar ve protokoller
8.1 Örnek görev sürüsü kadrosu
AjanSorumlulukYetki sınırıCoordinatorKullanıcı isteğini ayrıştırır ve iş akışını yönetirAraçlarda doğrudan yan etki yokPlannerAlt görevlere böler ve bağımlılıkları kurarPlan oluşturur, komut çalıştırmazResearcherKaynak toplar, iddiaları kaynakla ilişkilendirirSalt okunur web/dokümanBuilder / ExecutorKod veya içerik üretirİzole workspaceReviewerTest, tutarlılık ve kalite kontrolüÇoğunlukla salt okunurSecurity ReviewerTehdit ve izin değerlendirmesi yaparPolitika önerir; tek başına onay mercii değildirMemory CuratorKalıcı özet ve ilişki güncellerSınırlı bellek yazmaWorld Director / Game MasterSimülasyon eylemlerinin dünya kurallarına uyumunu değerlendirirWorld Service dışında doğrudan durum değiştirmez
İlk MVP için 4-6 rol yeterlidir. Rol sayısını artırmak tek başına kaliteyi artırmaz.
8.2 MCP ve A2A'nın rolü
MCP (Model Context Protocol): Ajanın araç, kaynak ve prompt gibi bağlam/entegrasyon yüzeylerine erişimini standartlaştırır. Temel kullanım alanı ajan -> araç/veri sistemi bağlantısıdır. MCP'nin 28 Temmuz 2026 sürümü stateless protocol core, çok aşamalı istekler, yönlendirme ve yetkilendirme iyileştirmeleri gibi değişiklikler içerir. [16]
A2A (Agent2Agent): Bağımsız ajan servislerinin yeteneklerini tanıtmasını, Agent Card üzerinden keşfedilmesini, görev devri yapmasını ve uzun süren görevlerin durumunu paylaşmasını sağlar. Temel kullanım ajan -> başka ajan servisidir. A2A'nın 1.0.0 sürüm tanımları Agent Card, Task, Message ve Artifact kavramlarını içerir. [17]
Kısa kural: MCP araçlara; A2A başka ajanlara bağlanır.
8.3 Araç kayıt şeması
Her araç için en az şu metadata tutulmalıdır:
* tool_id, name, version, owner, description
* JSON input/output schema
* read_only, side_effect_level, idempotent
* İzin verilen ajan rolleri ve tenant kapsamı
* Zaman aşımı, retry ve eşzamanlılık sınırı
* İnsan onayı gerektirip gerektirmediği
* Uygulama öncesi ve sonrası doğrulama
* Audit log ve hata sınıfları
Araçları “ajanın isteyebileceği eylem” olarak kaydedin; “ajanın her istediğini yapabileceği genel terminal” olarak değil.
9. Veri modeli ve API taslağı
9.1 Ana tablolar
TabloÖnemli alanlartenantsid, name, status, planworldsid, tenant_id, name, clock, ruleset_version, state_versionagentsid, world_id, tenant_id, persona_id, status, roleagent_profilesagent_id, goals, traits, allowed_tools, model_policyagent_stateagent_id, location, needs, current_goal, checkpoint_refeventsid, world_id, type, payload, version, occurred_at, idempotency_keyconversationsid, world_id, participants, started_at, statusmessagesid, conversation_id, sender_id, content, created_attasksid, tenant_id, parent_task_id, owner_agent_id, status, deadlineagent_runsid, agent_id, task_id, model, prompt_version, status, trace_idmemoriesid, agent_id, kind, content, source_event_id, embedding, visibilitytool_invocationsid, run_id, tool_id, args_hash, result_ref, statusapprovalsid, run_id, action, approver, decision, expires_atartifactsid, task_id, storage_uri, checksum, media_typeaudit_logsid, actor_id, action, target, policy_result, timestampmodel_usagerun_id, provider, model, input_tokens, output_tokens, cost, latency_ms
9.2 Olay zarfı
{
  "event_id": "uuid",
  "tenant_id": "uuid",
  "world_id": "uuid",
  "agent_id": "uuid-or-null",
  "event_type": "agent.action.proposed",
  "occurred_at": "2026-10-30T10:00:00Z",
  "schema_version": 1,
  "correlation_id": "uuid",
  "idempotency_key": "world-agent-action-unique-key",
  "payload": {}
}
Olaylar sürümlenmeli; tüketiciler aynı olayı birden fazla aldığında yan etkiyi tekrar üretmemelidir. Olayın işlenmesi tamamlandığında acknowledgment verilmelidir.
9.3 Başlangıç API uçları
POST   /api/v1/worlds
GET    /api/v1/worlds/{world_id}
POST   /api/v1/worlds/{world_id}/agents
GET    /api/v1/worlds/{world_id}/agents
POST   /api/v1/worlds/{world_id}/events
POST   /api/v1/agents/{agent_id}/runs
GET    /api/v1/runs/{run_id}
POST   /api/v1/approvals/{approval_id}/decision
GET    /api/v1/worlds/{world_id}/events
WS     /api/v1/worlds/{world_id}/live
Dış API'ye iç servislerin doğrudan veritabanı erişimi açılmamalıdır. Tenant filtresi, kimlik, yetki ve şema kontrolü her uçta uygulanmalıdır.
10. Güvenlik ve yönetişim
10.1 Temel tehdit modeli
OWASP Agentic Applications 2026 çerçevesi; hedef ele geçirme, araçların kötüye kullanımı, kimlik/yetki suistimali, ajan tedarik zinciri, beklenmeyen kod çalıştırma, hafıza zehirlenmesi, ajanlar arası güvensiz iletişim, zincirleme hata, insan-ajan güven istismarı ve kontrolden çıkan ajanları öne çıkarır. [18]
TehditÖrnekKontrolPrompt injection / hedef ele geçirmeWeb sayfası ajana sistem talimatını yok saymasını söylerHarici içerik = veri; ayrı talimat kanalı; kaynak işaretlemeAraç kötüye kullanımıOkuma aracıyla silme veya dışa aktarmaAllowlist, şema doğrulama, read/write ayrımıAşırı yetkiAjanın tüm bulut anahtarlarını kullanmasıGörev bazlı kısa ömürlü/attenuated token, least privilegeTedarik zinciriSahte MCP server veya bozuk tool packageİmzalı sürüm, sabitlenmiş bağımlılık, allowlisted registryKod çalıştırmaModel cevabının shell komutu olarak yürütülmesiSandbox, komut politikası, ağ/FS kısıtıHafıza zehirlemeYanlış bilgiyi kalıcı gerçek olarak saklamakProvenance, confidence, review ve memory write policyAjanlar arası spoofingSahte agent sonucu / kimlikA2A kimlik doğrulaması, imzalı/izlenebilir görev kimliğiZincirleme hataSonsuz delege etme ve maliyet artışıDerinlik, süre, token, çağrı ve bütçe limitleriİnsan onayını manipüle etmeYanlış güven veren çıktıOnay ekranında eylem, etki, veri ve kanıt göstermeRogue agentTalimat dışı iş ve kapsam genişletmeWatchdog, kill switch, policy engine ve audit
10.2 Yetki kademeleri
* L0 - Observe: Yalnızca okuma ve analiz.
* L1 - Propose: Eylem önerir; uygulama yapamaz.
* L2 - Reversible: Geri alınabilir, sınırlı eylemleri policy onayıyla yapar.
* L3 - Human approved: Dış sistemde etkili veya geri alınması zor eylem öncesinde insan onayı ister.
* L4 - Prohibited: Kimlik/izin yükseltme, güvenlik kontrolünü kapatma, denetim kaydını silme, sınırsız root/SYSTEM erişimi gibi eylemler.
Ajan, kendi seviyesini veya izinlerini değiştiremez. Onaylar, modelin ürettiği doğal dil metnine değil, tipli ve gösterilebilir eylem nesnesine bağlanmalıdır.
10.3 Sandbox
Kod, shell, tarayıcı otomasyonu ve dosya dönüştürme işleri ana uygulama sürecinde çalıştırılmamalıdır. Başlangıçta ayrı container, salt okunur temel imaj, kısıtlı çalışma klasörü, CPU/RAM/süre limiti ve varsayılan kapalı ağ kullanılabilir. Daha yüksek riskli çok kiracılı iş yüklerinde gVisor veya microVM tabanlı Firecracker değerlendirilmelidir. Docker rootless ve seccomp savunma katmanları ek koruma sağlar; sandbox tek başına güvenli mimarinin yerine geçmez. [19][20]
10.4 Güvenlik varsayılanları
* Ajan worker'ları non-root çalışır.
* Her tenant ve her görev için ayrı scope uygulanır.
* Ana sunucu dosya sistemi ajanlara mount edilmez.
* Provider API anahtarları prompt içine yazılmaz; gateway tarafında tutulur.
* Egress ağı izin listesiyle sınırlandırılır.
* Tool output ve web content güvenilmeyen girdi sayılır.
* Kayıtlar model yanıtından bağımsız, değiştirilemez audit deposunda korunur.
* Riskli işlemler için insan onayı ve iptal mekanizması bulunur.
* Ajan döngüsü için max iteration, wall-clock, token ve maliyet limitleri uygulanır.
11. Altyapı, servisler ve dağıtım
11.1 Başlangıç servis seti
Servisİlk tercihNe zaman ayrıştırılır?APIFastAPIAPI yükü veya domain ayrışıncaAgent runtimeLangGraph workerFarklı worker havuzu/ölçek ihtiyacı doğuncaSimulationAyrı Python serviceMVP'den itibaren ayrı tutDatabasePostgreSQLTek yazma kaynağı ve backup merkeziVector searchpgvectorVeri hacmi/indeks/tenant ihtiyacı ölçümle büyürse QdrantQueue/eventNATS JetStreamBüyük veri akışı/ekosistem ihtiyacında KafkaCacheRedisCache/session/rate limitingObject storeMinIO / S3Üretim ortamında yönetilen S3LLM gatewayLiteLLM ProxyKurumsal routing policy ihtiyacı büyürse özel gatewayTelemetryOpenTelemetryBaşlangıçtan itibarenEvaluationLangfuse + özel eval runnerOtomatik kalite kapısı gerektikçeDeploymentDocker ComposeYük/availability/çoklu ekip gerektirirse Kubernetes
11.2 PostgreSQL, pgvector ve Qdrant
PostgreSQL ilk kaynak-gerçek (source of truth) olmalıdır. Tenant, agent, event, task, approval ve audit kayıtları ilişkisel kalmalıdır. pgvector vektör aramasını aynı veritabanına taşır. HNSW hız/recall açısından yararlı; IVFFlat daha düşük bellek/yapım süresi tercihleri sunabilir. Filtrelenmiş approximate search sonuçlarında recall etkileri test edilmelidir. [14]
Qdrant, hybrid dense/sparse/BM25 aramaları ve payload filtreleri gibi ihtiyaçlar büyüdüğünde güçlü bir ayrı servis seçeneğidir. [15]
İlk aşamada PostgreSQL+pgvector ile başlamak önerilir. İki vektör veri tabanını aynı anda işletmeyin.
11.3 Olay ve kuyruk altyapısı
NATS JetStream mesajları kalıcı stream üzerinde saklar; consumer durumunu ve acknowledgment'ı yönetir, işlenmeyen mesajları yeniden teslim edebilir. Bu özellikler ajan görev kuyruğu ve simülasyon olayları için kullanışlıdır. Tüketici tarafında idempotency uygulanmalıdır; at-least-once teslim, eylemin yalnızca bir defa gerçekleşmesini otomatik garanti etmez. [21]
Redis'i kalıcı iş geçmişi olarak kullanmak yerine cache, kısa ömürlü koordinasyon, oturum ve rate limit için kullanın. Yüksek hacimli olay analitiği ve çok uzun saklama/stream processing gerektiğinde Kafka değerlendirilir.
11.4 Uzun süren işler
Bir iş saatler veya günler sürebiliyor, insan onayı bekliyor ve uygulama yeniden başlasa bile tamamlanması gerekiyorsa Temporal gibi durable execution platformu değerlendirilebilir. Temporal'ın AI dokümanları ajan döngüsü, çok aşamalı iş, retry ve insan onayı bekleme senaryolarını açıklar. [22]
İlk sürümde hem LangGraph checkpoint hem Temporal zorunlu değildir. Tek bir kalıcılık/orkestrasyon yaklaşımını seçin; Temporal ekleme kararını ölçülen gereksinime bırakın.
11.5 Model hosting
Bulut API: İlk MVP için en hızlı ve en az operasyon yüklü seçenek. Güçlü modelleri GPU altyapısı kurmadan kullanmayı sağlar.
Kendi modelini barındırma: Veri yerelliği, yüksek ve öngörülebilir token hacmi veya provider bağımsızlığı önemli olduğunda anlamlıdır. vLLM OpenAI-uyumlu HTTP servis arayüzü sağlar; böylece model gateway aynı istemci protokolünü kullanabilir. [23]
Hibrit öneri: İlk sürümde frontier işler için dış API; hafif sınıflandırma, özet ve düşük riskli ajan görevlerinde lisans/performans testinden geçmiş yerel model. Model ağırlıklarının lisansını, ticari kullanım koşullarını, donanım maliyetini ve Türkçe kalitesini ayrı doğrulayın.
11.6 Container ve Kubernetes
Geliştirme ortamında Docker Compose yeterlidir. Üretimde önce stateless API/worker ölçekleme, veritabanı backup/restore, kuyruk dayanıklılığı ve model kota sınırları doğrulanmalıdır. Kubernetes; çoklu node, otomatik ölçekleme, GPU worker, tenant izolasyonu ve yüksek erişilebilirlik gerçekten gerektiğinde eklenmelidir.
12. Yazılım deposu ve kodlama mimarisi
12.1 Önerilen monorepo
ai-swarm/
??? apps/
?   ??? web/                    # React + TypeScript + PixiJS
?   ??? admin/                  # Yönetim ve gözlemleme UI
??? services/
?   ??? api/                    # FastAPI, auth, public REST/WS
?   ??? simulation/             # tick, time, world rules, pathfinding
?   ??? agent-runtime/          # LangGraph workflows and workers
?   ??? model-gateway/          # provider routing, budget, fallback
?   ??? tool-gateway/           # MCP and internal tool adapters
?   ??? memory/                 # retrieval, summaries, memory policy
??? packages/
?   ??? contracts/              # Pydantic / JSON Schemas / events
?   ??? policies/               # permissions and action policies
?   ??? prompts/                # versioned prompts and templates
?   ??? evals/                  # golden tasks and evaluators
??? migrations/                 # database migrations
??? infra/
?   ??? compose.yaml
?   ??? docker/
?   ??? k8s/
?   ??? observability/
??? tests/
?   ??? unit/
?   ??? integration/
?   ??? simulation/
?   ??? security/
?   ??? load/
??? docs/
??? .github/workflows/
??? pyproject.toml
??? uv.lock
??? README.md
12.2 Dil tercihleri
* API, agent runtime, simulation, model orchestration: Python.
* Web ve canlı dünya istemcisi: TypeScript.
* Performansı ölçülmüş yoğun pathfinding/physics modülleri: gerektiğinde Rust/C++ eklentisi; ilk sürümde mikroservis sayısını artırmayın.
* Pydantic/JSON Schema ile tool input, output, event ve action contract'ları sürümlenmeli.
12.3 Örnek eylem sözleşmesi
from typing import Literal
from pydantic import BaseModel, Field

class ActionProposal(BaseModel):
    agent_id: str
    world_id: str
    action: Literal[
        "move_to",
        "start_conversation",
        "send_message",
        "set_goal",
        "wait",
    ]
    target_id: str | None = None
    destination: str | None = None
    message: str | None = Field(default=None, max_length=1200)
    reason: str = Field(max_length=500)
    expected_effect: str = Field(max_length=500)
Bu nesne yalnızca öneridir. World Service; ajanı, hedefi, mesafeyi, konuşma kurallarını, izinleri, rate limit'i ve dünya kurallarını kontrol ettikten sonra eylemi uygular. Modelin ürettiği serbest metin doğrudan eval, shell veya SQL olarak çalıştırılmaz.
12.4 Orkestrasyon pseudocode
async def execute_task(task_id: str):
    task = await task_repo.get(task_id)
    policy = await policy_engine.evaluate_request(task)
    if not policy.allowed:
        return await task_repo.reject(task_id, policy.reason)

    plan = await planner.create_bounded_plan(task)
    results = await asyncio.gather(*[
        worker_registry.run(step, budget=step.budget)
        for step in plan.independent_steps
    ])

    review = await reviewer.verify(task, results)
    if not review.accepted:
        return await task_repo.request_revision(task_id, review.issues)

    return await task_repo.complete(task_id, review.artifacts)
Gerçek uygulamada iş parçacığı sınırı, cancellation, timeout, tracing, retry sınıfları, budget decrement, checkpoint ve idempotency eklenmelidir. Buradaki kod mimari akış örneğidir; doğrudan üretim kodu değildir.
12.5 Prompt/skill yönetimi
* Prompt'lar Git altında sürümlenmeli.
* Her çalışmada prompt_version ve model snapshot'ı kaydedilmeli.
* Araç şemaları ile prompt örnekleri birbirinden ayrılmalı.
* Üretim prompt değişikliği eval testlerini geçmeden yayımlanmamalı.
* Ajan rolü, kimliği ve yetkisi prompt'a gömülüp tek güvenlik kontrolü olarak kullanılmamalıdır; gerçek yetki Policy Engine'de olmalıdır.
13. CI/CD, kalite ve gözlemlenebilirlik
13.1 GitHub Actions hattı
Önerilen pipeline:
1. Format/lint/type check.
2. Unit test.
3. PostgreSQL/Redis/NATS service container'larıyla integration test.
4. Migration test ve schema compatibility.
5. Simulation deterministic regression test.
6. Agent eval suite: golden task, tool correctness, citation/grounding, memory recall.
7. Security: dependency audit, secret scan, container scan, policy tests.
8. Docker image build, SBOM ve imzalama.
9. Staging deploy ve smoke test.
10. Onaylı production deploy; rollback/health gate.
GitHub Actions, matrix stratejisi ile farklı işletim sistemi ve runtime kombinasyonlarında test çalıştırabilir. Üretim erişiminde minimum GITHUB_TOKEN izinleri ve uzun ömürlü secret yerine OIDC tercih edilmelidir. Action referansları mümkün olduğunda tam commit SHA'ya sabitlenmelidir. [24][25]
13.2 Gözlemlenebilirlik
Her ajan işi için tek bir trace_id ve correlation_id üretin. İz ağacı şunları göstermelidir:
* Kullanıcı isteği ve task ID.
* Planlayıcı çağrısı ve alt görevler.
* Model/provider/model snapshot, token ve latency.
* Tool çağrısı, parametre özeti, policy kararı ve sonuç kodu.
* Ajan handoff ve checkpoint.
* Hafıza retrieval kaynakları ve skorları.
* İnsan onayı ve karar zamanı.
* Nihai sonuç, test ve artifact bağlantısı.
OpenTelemetry GenAI semantic conventions; ajan, model, tool ve retrieval işlemlerinin ortak telemetri alanlarıyla izlenmesine yönelik bir temel sağlar. Hassas prompt/tool verileri otomatik olarak log'lanmamalı; PII ve secret redaction uygulanmalıdır. [26]
13.3 Ölçülmesi gereken metrikler
AlanMetrikBaşarıGörev başarı oranı, doğrulanmış çıktı oranıKaliteReviewer geçiş oranı, hata/yeniden işleme oranıHızP50/P95 görev süresi, model latency, queue waitMaliyetGörev başı USD, token/çıktı, tool maliyetiGüvenlikEngellenen yetkisiz eylem, policy ihlali, approval oranıHafızaRecall precision, yanlış anı oranı, stale memory oranıSimülasyonGeçersiz eylem oranı, tick gecikmesi, dünya tutarlılık hatasıDayanıklılıkRetry, timeout, DLQ, provider fallback ve recovery
13.4 Eval tasarımı
Sadece temel model benchmark'ı yeterli değildir. Ölçülen sistem model + prompt + tools + memory + orchestration + data bütünüdür. Her ajan rolü için 50-100 temsilî görevle başlangıç golden set'i oluşturun. Gerçek kullanıcı hataları ve üretim olaylarıyla veri setini sürümleyerek genişletin.
AI Town için deterministik seed ile aynı senaryonun tekrar oynatılması; eylem geçerliliği, ilişki tutarlılığı, bellek geri çağırma kalitesi ve etkileşim başına token ölçümü önemlidir.
14. Maliyet ve kapasite planlama
14.1 Token bütçesi formülü
Aylık LLM maliyeti =
  ?(input_tokens / 1.000.000 × input_price)
+ ?(output_tokens / 1.000.000 × output_price)
+ embedding + tool/search/browser çağrıları
+ GPU/CPU + veritabanı + queue + object storage + egress
Her agent run için bir budget nesnesi bulunmalıdır: maksimum input/output token, model çağrısı, tool çağrısı, süre, retry sayısı ve tahmini/gerçek maliyet. Alt ajanlara verilen bütçe ana görevin kalan bütçesinden düşülmelidir.
14.2 Örnek token maliyeti
Sadece kıyaslama amacıyla 1 milyon input + 200 bin output token tüketimi varsayılırsa:
* GPT-6 Astra: yaklaşık $20.
* GPT-6.1 Sol: yaklaşık $4.
* Claude Opus 5.5: yaklaşık $8.
* Claude Sonnet 5.5: yaklaşık $4.
* GPT-6.1 Terra: yaklaşık $2.
Bu örnek; cache, bölgesel fiyat, uzun bağlam ek ücreti, tool, embedding ve altyapı giderlerini içermez. Gerçek maliyet, ajan başına ortalama token ve görev hacmi ölçülmeden kesinleştirilemez.
14.3 Maliyet düşürme sırası
1. LLM gerektirmeyen simülasyon adımlarını kodla çöz.
2. Ajan başına değil, olay başına karar çağrısı yap.
3. Model çağrılarını birleştir; gereksiz zincirleme düşünme/eleştiri döngüsü kurma.
4. Prompt caching ve uygun batch kullan.
5. Özetleme ve sınıflandırmayı düşük maliyetli modele ver.
6. Uzun vadeli hafızayı tüm konuşma dökümünden değil özet/olaylardan kur.
7. Fallback ve paralelliği token bütçesiyle sınırla.
8. Yerel modelin toplam sahip olma maliyetini ölçmeden “bedava” kabul etme.
15. Aşamalı geliştirme yol haritası
Faz 0 - Ürün ve sınırların belirlenmesi
* Önce ana kullanım senaryosunu seç: görev sürüsü mü, yaşayan AI town mı, ikisi birlikte mi?
* Kullanıcı rolleri, tenant sınırı, veri sınıfı, dış sistem etkisi ve başarı metriği tanımla.
* Simülasyon eylemi ile gerçek dünya aracı arasına açık güvenlik sınırı koy.
* 4-6 ajan rolünü aşmayan ilk kadroyu belirle.
Çıkış kriteri: Onaylı domain modeli, threat model, API contract ve ilk eval set.
Faz 1 - Çalışan dikey MVP
* FastAPI, PostgreSQL, pgvector, Redis ve NATS.
* LangGraph supervisor + 3-4 uzman rol.
* Model gateway ve temel cost meter.
* Tek tenant, tek dünya veya tek görev alanı.
* React/PixiJS canlı UI ve admin panel.
* Olay kaydı, audit, tracing ve temel insan onayı.
Çıkış kriteri: Baştan sona tamamlanan görev; restart sonrası checkpoint; başarısız tool çağrısının kontrollü toparlanması.
Faz 2 - Kalıcı hafıza ve sosyal etkileşim
* Epizodik/semantik/prosedürel hafıza ayrımı.
* Hafıza özeti ve provenance.
* Ajanlar arası konuşma, ilişki ve hedef modellemesi.
* Simülasyon saatinin hızlandırılması/yavaşlatılması.
* Deterministik replay ve seed tabanlı test.
Çıkış kriteri: Ajanların geçmiş olayları doğru hatırlaması; dünya kurallarının ihlal edilmemesi.
Faz 3 - Protokoller ve entegrasyon
* MCP tool gateway.
* Gerektiğinde A2A Agent Card ve görev devri.
* Dış servis/kurumsal veri kaynakları.
* Tenant bazlı kota, iz ve policy.
* Onay iş akışları ve iptal/kill switch.
Çıkış kriteri: Dış ajan/araç entegrasyonu; izlenebilir ve iptal edilebilir eylem.
Faz 4 - Üretim sertleştirme ve ölçek
* Load test, chaos test, provider outage denemesi.
* Postgres backup/PITR, restore tatbikatı.
* NATS persistence/replication.
* Sandbox sertleştirme.
* Kubernetes ve autoscaling ancak ölçülen ihtiyaç varsa.
* SLO, alarm ve incident runbook.
Çıkış kriteri: Belirlenen yükte SLO, maliyet bütçesi, security review ve kurtarma testi.
16. Riskler ve mimari karar kaydı
RiskOlasılıkEtkiÖnlemAjan döngüsünün kontrolsüz büyümesiOrtaYüksekMax depth, max steps, wall-clock ve bütçeLLM'nin yanlış dünya eylemi önermesiYüksekOrta/YüksekTipli eylem, deterministik resolver, eylem reddiHafızaya yanlış bilgi yazılmasıOrtaYüksekProvenance, confidence, curate ve silme politikasıPrompt injectionYüksekYüksekTalimat/veri ayrımı, tool policy, egress ve onayModel sağlayıcısının kesintisiOrtaYüksekFallback, queue, timeout ve degrade modeAPI maliyetinin beklenmedik büyümesiYüksekYüksekPer-run budget, günlük limit, dashboard ve alarmAjanlar arası mesaj fırtınasıOrtaOrtaSupervisor, fan-out sınırı ve event backpressureÇok erken mikroservis/Kubernetes karmaşıklığıOrtaOrtaModüler monolit + worker ayrımı ile başlaTenant verisinin karışmasıDüşük/OrtaÇok yüksekHer sorguda tenant filtre, DB policy ve security test
16.1 Mimari karar kayıtları (ADR)
* ADR-001: Simülasyon motoru ajan runtime'dan ayrıdır.
* ADR-002: Her LLM çıktısı tipli eylem/sonuç şemasına dönüştürülür.
* ADR-003: PostgreSQL tek kaynak-gerçek; vektör arama başlangıçta pgvector.
* ADR-004: LangGraph görev orkestrasyonu; NATS olay dağıtımı.
* ADR-005: MCP araç entegrasyonu, A2A ajan servisi entegrasyonu.
* ADR-006: Gerçek dünya yan etkileri Policy Engine ve gerektiğinde insan onayından geçer.
* ADR-007: İlk aşamada Docker Compose; K8s ancak ölçülen ihtiyaçla.
* ADR-008: Çoklu model yönlendirme; tek model sağlayıcısına kilitlenmeme.
17. İlk sürüm için kabul kriterleri
Üretim öncesi en az şu kontroller başarıyla tamamlanmalıdır:
* [ ] Bir görev supervisor tarafından alt görevlere ayrılabiliyor.
* [ ] Bağımsız alt görevler paralel, bağımlı işler sıralı çalışabiliyor.
* [ ] Worker çökünce görev checkpoint'ten devam ediyor.
* [ ] Aynı event'in yeniden teslimi çift yan etki oluşturmuyor.
* [ ] Her tool çağrısı şema, rol ve policy kontrolünden geçiyor.
* [ ] Tehlikeli eylem insan onayı olmadan yürümüyor.
* [ ] Web/araç içeriğindeki prompt injection güvenlik politikasını değiştiremiyor.
* [ ] Tenant'lar arası veri erişimi testlerle engelleniyor.
* [ ] Model/provider, token, maliyet, latency ve tool sonucu izlenebiliyor.
* [ ] Ajan bütçe/iteration limitini aşamıyor.
* [ ] Dünya simülasyonunda geçersiz eylem reddediliyor ve state tutarlı kalıyor.
* [ ] Backup'tan restore tatbikatı yapılıyor.
* [ ] Kill switch, agent suspend ve task cancel çalışıyor.
18. Son karar ve tavsiye
Bu projeyi “100 ajanı aynı anda konuşturalım” yaklaşımıyla başlatmak doğru olmaz. Önce küçük ama denetlenebilir bir ajan topluluğu kurulmalı; ajanların hafızası, eylemleri ve birbirine görev devretmesi ölçülebilir hâle getirilmelidir.
Önerilen başlangıç kombinasyonu:
* React + TypeScript + PixiJS arayüz.
* Python + FastAPI servis katmanı.
* LangGraph görev orkestrasyonu.
* AI Town/Concordia'dan esinlenen, ancak bağımsız ve deterministik bir dünya motoru.
* PostgreSQL + pgvector, NATS JetStream, Redis ve MinIO.
* LiteLLM tabanlı sağlayıcı bağımsız model geçidi.
* MCP araç katmanı ve ihtiyaç oluştuğunda A2A.
* OpenTelemetry, Langfuse ve Prometheus/Grafana.
* İzole kod/araç sandbox'ı; gVisor/Firecracker risk düzeyine göre.
* İlk dağıtım Docker Compose; Kubernetes sonraki aşama.
Model başlangıç profili: GPT-6.1 Sol veya Claude Sonnet 5.5 genel işçi; GPT-6 Astra veya Claude Fable 5.1 zor planlama; Claude Opus 5.5 uzun kodlama; Gemini 3.8 Flash ya da Claude Haiku 5.5 çok sayıda kısa/ucuz karakter işlemi. Bu profiller gerçek görev verisiyle test edilmelidir; provider liderliği veya tek benchmark kalıcı bir seçim gerekçesi değildir.
Bu mimari; araştırma ajanı, kodlama ajanı, analist, denetçi, NPC karakterleri ve ileride harici ajan ağları gibi farklı kullanım alanlarını ortak altyapı ile destekler. En kritik yatırım model seçiminden önce olay, hafıza, yetki ve doğrulama sınırlarına yapılmalıdır.
19. Kaynakça ve teknik başvuru bağlantıları
Aşağıdaki kaynaklar rapordaki temel mimari ve model kararlarını desteklemek için seçilmiştir. Canlı model ve servis fiyatları değişebileceğinden satın alma/dağıtım öncesinde resmî fiyat sayfaları yeniden doğrulanmalıdır.
1. Park et al., Generative Agents: Interactive Simulacra of Human Behavior, ACM UIST 2023. https://doi.org/10.1145/3586183.3606763
2. a16z, AI Town Architecture. https://github.com/a16z-infra/ai-town/blob/main/ARCHITECTURE.md
3. Google DeepMind, Concordia: A library for generative social simulation. https://github.com/google-deepmind/concordia
4. LangGraph, Graph API overview / multi-agent network. https://langchain-ai.github.io/langgraph/how-tos/multi-agent-network/
5. Microsoft Learn, Microsoft Agent Framework overview. https://learn.microsoft.com/en-us/agent-framework/overview
6. Microsoft AutoGen, Project status / archived notice. https://microsoft.github.io/autogen/dev/
7. CrewAI, Documentation: Agents, Crews, Flows and production concepts. https://github.com/crewAIInc/crewAI/tree/main/docs
8. Google Cloud, Agent Development Kit. https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/adk
9. OpenAI, Agents SDK. https://developers.openai.com/api/docs/guides/agents/sdk
10. OpenAI, Models. https://developers.openai.com/api/docs/models
11. Anthropic, Claude models overview. https://platform.claude.com/docs/en/models/overview
12. Google AI, Gemini API models. https://ai.google.dev/gemini-api/docs/models
13. LiteLLM, Router and load balancing. https://docs.litellm.ai/docs/routing
14. pgvector, Vector similarity search for Postgres. https://github.com/pgvector/pgvector
15. Qdrant, Hybrid queries and multitenancy. https://qdrant.tech/documentation/search/hybrid-queries/ ; https://qdrant.tech/documentation/manage-data/multitenancy/
16. Model Context Protocol, 28 July 2026 specification announcement. https://blog.modelcontextprotocol.io/posts/2026-07-28/
17. A2A Protocol, Key concepts and specification. https://a2a-protocol.org/latest/topics/key-concepts/ ; https://a2a-protocol.org/v1.0.0/specification/
18. OWASP GenAI Security Project, Top 10 for Agentic Applications 2026. https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-ai-security/
19. Docker, Rootless mode and seccomp. https://docs.docker.com/engine/security/rootless/ ; https://docs.docker.com/engine/security/seccomp/
20. gVisor, Security model. https://gvisor.dev/docs/architecture_guide/security/
21. NATS, JetStream concepts. https://docs.nats.io/concepts/jetstream
22. Temporal, Durable AI. https://docs.temporal.io/ai
23. vLLM, OpenAI-compatible server. https://docs.vllm.ai/en/latest/serving/openai_compatible_server/
24. GitHub Actions, Workflow syntax and matrix. https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
25. GitHub Actions, Security hardening deployments. https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments
26. OpenTelemetry, GenAI semantic conventions. https://github.com/open-telemetry/semantic-conventions-genai
27. Artificial Analysis, Intelligence Index v5 announcement, 27 October 2026. https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v5
28. LangChain, AI agent frameworks in 2026 comparison. https://www.langchain.com/resources/ai-agent-frameworks
29. OpenAgents, Open-source agent collaboration platform and SDK. https://openagents.org/docs/en/getting-started/overview
30. MetaGPT, Software company as multi-agent system. https://github.com/FoundationAgents/MetaGPT
31. OpenAI, Orchestration and handoffs. https://developers.openai.com/api/docs/guides/agents/orchestration
32. OpenAI, Guardrails and human review. https://developers.openai.com/api/docs/guides/agents/guardrails-approvals
33. OpenAI, Integrations and observability. https://developers.openai.com/api/docs/guides/agents/integrations-observability
34. Google, ADK workflow orchestration codelab. https://codelabs.developers.google.com/devsite/codelabs/build-agents-with-adk-orchestrating-agent-workflows
35. OpenAI, GPT-6.1 Terra model. https://developers.openai.com/api/docs/models/gpt-6.1-terra
36. Anthropic, Claude Opus 5.5 model overview. https://platform.claude.com/docs/en/models/opus-5-5/overview
37. Google AI, What's new in Gemini 4 Argon. https://ai.google.dev/gemini-api/docs/latest-model
38. Google Cloud, Agent Platform pricing. https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing
Rapor notu: Bu belge mimari araştırma ve başlangıç teknik tasarımıdır. Gerçek üretim kurulumu öncesinde seçilen sağlayıcıların sözleşmeleri, veri işleme/ikamet şartları, güncel fiyatları, lisans koşulları, güvenlik testleri ve hedef yük gereksinimleri ayrıca doğrulanmalıdır.
AI SWARM  |  TEKNİK ARAŞTIRMA RAPORU

Yapay Zekâ Sürüleri ve Otonom Ajan Toplulukları  •  1


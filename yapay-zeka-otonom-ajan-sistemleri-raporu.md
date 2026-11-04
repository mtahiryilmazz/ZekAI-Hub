# Yapay Zeka Kasabaları, Otonom Ajan Toplulukları ve Çoklu-Ajan Mimarileri Raporu

Büyük dil modellerinin (LLM) evrimi, tekil istem-yanıt etkileşimlerinden otonom, rol tabanlı ve çoklu-ajanlı (multi-agent) işbirliği sistemlerine doğru niteliksel bir sıçrama gerçekleştirmiştir. Tek bir devasa modele karmaşık görevleri tek adımda çözdürmeye çalışmak mantıksal tutarsızlıklara, halüsinasyon birikimine ve yüksek maliyetlere yol açarken; iş bölümü, standart işletim prosedürleri (SOP), dinamik model yönlendirme ve kalıcı bellek mimarilerine dayalı çoklu-ajan sistemleri yazılım mühendisliğinden sosyal simülasyon dünyalarına kadar geniş bir alanda yeni standardı belirlemektedir. Bu rapor, incelenen tüm kaynak ve araştırmalar ışığında otonom ajan ekosisteminin mimari prensiplerini, orkestrasyon çerçevelerini, maliyet-kalite optimizasyon stratejilerini ve görsel izleme altyapılarını bütüncül bir teknik çerçevede sentezlemektedir.

---

## 1. Otonom Çoklu-Ajan Sistemlerinin Evrimi ve Mimari Temelleri

Yapay zeka sistemlerindeki paradigma değişimi, dil modellerinin yalnızca metin üreten statik yapılar olmaktan çıkıp hedef odaklı, araç kullanabilen ve birbiriyle iletişim kurabilen otonom varlıklara dönüşmesini sağlamıştır. İlk nesil ajan sistemleri tek bir modelin zincirleme düşünme (Chain-of-Thought) süreçlerine dayanırken, karmaşık projelerde bu yaklaşımın çökmesi çoklu-ajan sistemlerinin (MAS) doğuşunu tetiklemiştir.

Çoklu-ajan mimarilerinin temel felsefesi, insan organizasyonlarındaki iş bölümü ve hiyerarşi prensiplerini yapay zeka ajanlarına uygulamaktır. Tekil model çözümlerinde yaşanan ana problemler ve çoklu-ajan sistemlerinin sunduğu mimari yanıtlar şu şekildedir:

* **Görev Ayrıştırma ve Rol Uzmanlaşması**: Karmaşık bir yazılım geliştirme veya analiz görevi, tek bir istemle yürütüldüğünde model bellek sınırlarını zorlar ve bağlam kaybına uğrar. Çoklu-ajan sistemleri, problemi daha küçük ve yönetilebilir alt görevlere böler. Her bir ajana belirli bir rol, arka plan hikayesi (backstory) ve sistem talimatı atanarak modelin odaklanma derinliği artırılır.
* **İletişim Protokolleri ve Sohbet Zincirleri (Chat Chains)**: Ajanlar arasındaki etkileşim, rastgele mesajlaşmalar yerine belirli yapılara oturtulmuştur. Şelale (Waterfall) modeli veya bildirimsel çizgeler (Declarative Graphs) üzerinden kurgulanan sohbet zincirleri, bilgi akışının yönünü ve aşamalarını belirler.
* **İletişimsel Halüsinasyon Engelleme (Communicative Dehallucination)**: Tekil modeller hatalı çıktılar ürettiğinde bunu kendi kendine tespit etmekte zorlanır. Çoklu-ajan sistemlerinde ise rol değiştirme (role-reversal), çapraz denetim ve kod gözden geçirme (code review) mekanizmaları sayesinde bir ajanın ürettiği halüsinasyon diğer uzman ajan tarafından tespit edilip düzeltilir.

---

## 2. Otonom Yazılım Mühendisliği Mimarileri: ChatDev, MetaGPT ve Kodlama Ajanları

Yazılım mühendisliği, çoklu-ajan sistemlerinin en somut ve ölçülebilir başarı gösterdiği alanların başında gelmektedir. Sanal yazılım şirketleri kurgulayarak fikirden çalışan koda kadar olan tüm süreçleri otomatize eden mimariler, sektörde devrim niteliğinde sonuçlar ortaya koymuştur.

### ChatDev 1.0 ve ChatDev 2.0 (DevAll) Mimarisi

Tsinghua Üniversitesi ve OpenBMB araştırmacıları tarafından geliştirilen ChatDev, şelale yazılım geliştirme yaşam döngüsünü (SDLC) çoklu-ajan sohbet zincirleriyle otomatize eden öncü bir sanal yazılım şirketidir.

ChatDev 1.0 mimarisinde sistem; İcra Kurulu Başkanı (CEO), Baş Ürün Sorumlusu (CPO), Baş Teknoloji Sorumlusu (CTO), Programcı, Gözden Geçiren (Reviewer), Test Uzmanı ve Sanat Tasarımcısı gibi uzman rollere bölünmüştür. Ajanlar Tasarım, Kodlama, Test ve Dokümantasyon olmak üzere dört ana aşamada eğitmen-asistan (instructor-assistant) diyalogları yürüterek yazılım üretir. İletişimsel halüsinasyon engelleme mekanizması, ajanların doğrudan yanıt vermeden önce detaylı gereksinim sormasını sağlayarak kodlama hatalarını minimuma indirir.

ChatDev 2.0 (DevAll) ise projeyi özel bir yazılım geliştirme aracından "Her Şeyi Geliştiren" (DevAll) kodsuz bir çoklu-ajan platformuna dönüştürmüştür. DevAll, bildirimsel yürütülebilir çizge (declarative executable graph) soyutlamasını CADET adı verilen döngü duyarlı (cycle-aware) yürütme motoru ile birleştirir. Ayrıca DevAll mimarisinde yer alan Deneyimsel Birlikte Öğrenme (Experiential Co-Learning) ve Yinelemeli Deneyim İyileştirme (Iterative Experience Refinement - IER) çerçeveleri, ajanların başarılı yürütme izlerini küresel bir deneyim deposuna kaydetmesini sağlayarak tekrarlayan hataları engeller.

Yazılım geliştirme kıyaslamalarında ChatDev'in geleneksel ve tekil yaklaşımlara karşı sergilediği performans sonuçları aşağıdaki tabloda özetlenmiştir.

Aşağıdaki tablo, ChatDev, MetaGPT ve GPT-Engineer sistemlerinin yazılım tamamlama, çalıştırılabilirlik, kod kalitesi ve kaynak tüketim benchmark verilerini karşılaştırmaktadır.

| Yöntem / Metrik | Tamamlanabilirlik (Completeness) | Çalıştırılabilirlik (Executability) | Tutarlılık (Consistency) | Kod Kalitesi (Quality) | Ortalama Süre (Saniye) | Tüketilen Token Sayısı | Üretilen Dosya / Satır |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GPT-Engineer** | 0.5022 | 0.3583 | 0.7887 | 0.1419 | 15.60 s | 7,182 token | 3.94 dosya / 70.2 satır |
| **MetaGPT** | 0.4834 | 0.4145 | 0.7601 | 0.1523 | 154.00 s | 29,278 token | 4.42 dosya / 153.3 satır |
| **ChatDev** | **0.5600** | **0.8800** | **0.8021** | **0.3953** | 148.21 s | 22,949 token | 4.39 dosya / 144.3 satır |

Tablo verilerinin de ortaya koyduğu üzere ChatDev, özellikle çalıştırılabilirlik (%88.00) ve kod kalitesi (0.3953) metriklerinde tekil aşamalı veya katı kural tabanlı sistemlere belirgin bir üstünlük sağlamaktadır.

### MetaGPT ve Standart İşletim Prosedürleri (SOP)

MetaGPT, gerçek dünyadaki insan organizasyonel yapılarını ve Standart İşletim Prosedürlerini (SOP) dil modellerinin istem dizilimlerine kodlayan bir diğer önemli platformdur. MetaGPT, ajandan ajana geçen mesaj karmaşasını önlemek için ortak bir "Mesaj Havuzu" (Message Pool) ve rol hiyerarşisi kullanır. Ürün Yöneticisi gereksinim dokümanını (PRD) hazırlar, Mimar sistem mimarisini ve UML diyagramlarını çizer, Mühendis koda dönüştürür ve QA mühendisi birim testlerini yazar. SOP kodlaması sayesinde aradaki bilgi kayıpları ve mantıksal tutarsızlıklar engellenir.

### Tekil ve Yerel Otonom Kodlama Ajanları

Sanal şirket yapılarının yanı sıra, tekil geliştiricilere doğrudan yardımcı olan otonom kodlama ajanları da hızla olgunlaşmaktadır:

* **Devika**: Yerel olarak barındırılabilen açık kaynaklı bir otonom kod asistanıdır. Kullanıcı talimatlarını yürütme planlarına böler, web araması yaparak API dokümanlarını inceler ve dahili zincirleme düşünme (internal monologue) adımlarını canlı olarak kullanıcıya sunar. Claude 3, GPT-4 ve Ollama üzerinden yerel modelleri destekler.
* **OpenDevin (OpenHands) & SWE-agent**: Karmaşık GitHub sorunlarını (issue) çözmek için izole Docker konteynerleri içinde çalışan, terminal komutları yürütebilen ve kod depolarını düzenleyebilen otonom yazılım mühendisleridir.
* **Ajan Ofisi (selmakcby)**: Claude Code ajanlarını izlemek için geliştirilmiş Three.js tabanlı prosedürel 3D izometrik kedi ofisi arayüzüdür. Ajanların durumlarını gerçek zamanlı takip eder; ajanlar boşta dururken sıfır token harcayarak çalışır.

---

## 3. Ajan Orkestrasyon Çerçeveleri Karşılaştırmalı Analizi

Otonom ajan ekosisteminde geliştiricilerin en çok karşı karşıya kaldığı karar, doğru orkestrasyon çerçevesini (framework) seçmektir. LangGraph, CrewAI, AutoGen ve OpenAgents gibi önde gelen çerçeveler, ajan yürütme mantığı konusunda farklı mimari felsefeleri benimsemektedir.

Aşağıdaki tablo, en popüler dört otonom ajan çerçevesinin teknik özelliklerini, kontrol mekanizmalarını ve kullanım senaryolarını detaylandırmaktadır.

| Karşılaştırma Kriteri | LangGraph | AutoGen (Microsoft) | CrewAI | OpenAgents |
| :--- | :--- | :--- | :--- | :--- |
| **Temel Tasarım Modeli** | Yönlü Çizge Durum Makinesi (Graph State Machine) | Olay Güdümlü Mesaj Geçirme (Actor Model) | Rol Tabanlı Görev Ekipleri (Crew & Tasks) | Ağ Tabanlı Ajan Toplulukları (A2A Network) |
| **İş Akışı Kontrolü** | Geliştirici Tanımlı Düğümler ve Kenarlar (Açık Kontrol) | Sohbet Dinamikleri ve Seçim Stratejileri | Süreç Yapılandırması (Aratışık veya Hiyerarşik) | Açık Protokoller Üzerinden Dinamik Ağ Routing |
| **Durum Yönetimi (State)** | Tiplenmiş Paylaşılan Durum (SQLite/Postgres Checkpointing) | Sohbet Geçmişi ve Aktör Durumları | Çalışma Zamanı Görev Bağlamı | Kalıcı Bellek ve Yerel SQLite/VectorDB |
| **Protokol Desteği** | LangChain Ekosistemine Bağımlı (Protokol Yok) | Sınırlı | A2A (Agent-to-Agent) Topluluk Desteği | **Yerel MCP + A2A Protokol Desteği** |
| **İzlenebilirlik (Observability)** | LangSmith İletişim İzleme (Düğüm/Kenar Seviyesi) | OpenTelemetry / Jaeger / Grafana | Görev ve Ekip Seviyesinde İzleme | Visual Studio & OpenAgents Studio |
| **Öğrenme Eğrisi & Zorluk** | Yüksek (Çizge Tasarımı Düşüncesi Gerektirir) | Orta - Yüksek (Aktör Modeli) | Düşük - Orta (Sezgisel Rol Modeli) | Orta |
| **En Uygun Kullanım Senaryosu** | Dayanıklı, İnsan Onaylı, Uzun Süreli Üretim İş Akışları | Grup Tartışmaları ve Çok Taraflı Müzakere Sistemleri | Hızlı Prototipleme ve Rol Tabanlı İş Süreçleri | Farklı Çerçevelerdeki Ajanların Birlikte Çalıştığı Ağlar |

### Orkestrasyon Çerçevelerinin Detaylı İncelemesi

* **LangGraph**: Uygulamayı düğümlerin (nodes) ajanlar olduğu, kenarların (edges) durum geçişlerini belirlediği bir çizge olarak modeller. Belirli durum noktalarında insan onayına (human-in-the-loop) imkan tanıması ve Postgres tabanlı dayanıklı durum kayıtları (checkpointing) sunması nedeniyle yüksek karmaşıklıktaki kurumsal iş akışlarında en güvenilir seçenektir.
* **AutoGen**: Microsoft Research tarafından geliştirilen çerçeve, olay güdümlü aktör modelini temel alır. Ajanlar yapılandırılmış mesajlaşmalar (iki ajanlı, grup sohbeti, sıralı sohbet) üzerinden etkileşime girer. Çok taraflı tartışma ve uzlaşma senaryolarında son derece güçlüdür.
* **CrewAI**: Ajanları bir ekibin üyeleri (araştırmacı, yazar, gözden geçiren) olarak kurgular. Geliştiriciye en hızlı prototipleme imkanını sunar. İş süreçlerini sıralı (sequential) veya bir yönetici ajanın görev dağıttığı hiyerarşik (hierarchical) modda yürütür.
* **OpenAgents**: Ajanların kapalı sistemler yerine açık standartlar üzerinden haberleşmesini hedefleri. Model Context Protocol (MCP) ve Agent-to-Agent (A2A) protokollerini yerel olarak destekleyerek farklı çerçevelerde yazılmış ajanların aynı ağda işbirliği yapmasını sağlar.

---

## 4. Dinamik Model Yönlendirme (LLM Model Routing) ve Maliyet-Kalite Optimizasyonu

Çoklu-ajan sistemlerinin yaygınlaşmasıyla birlikte karşılaşılan en büyük operasyonel engel, her bir ajan adımında en üst seviye (frontier) modellerin kullanılmasının yarattığı devasa API maliyetleridir. 2026 yılı itibarıyla model fiyatları arasındaki uçurum yaklaşık 100 katına ulaşmıştır. Örnek olarak DeepSeek V4 milyon girdi tokenı başına 0.44 dolar seviyesindeyken, GPT-5.5 veya Claude Opus sınıfı premium modeller milyon token başına 25 ile 30 dolar arasında ücretlendirilmektedir.

Üretim ortamındaki sorguların büyük çoğunluğu (%60-%80) basit selamlamalar, format dönüştürmeler veya bilgi çekme adımlarından oluşur. Dinamik model yönlendirme (model routing), gelen her isteği analiz ederek zorluk seviyesine göre en ucuz ama yeterli modele yönlendiren mimari bir katmandır.

### Yönlendirme Yaklaşımları: ML Tabanlı Yönlendiriciler ve Toplayıcılar

Model yönlendirme dünyası iki temel felsefeye ayrılmaktadır:

1. **Makine Öğrenimi Tabanlı Yönlendiriciler (ML-Learned Routers)**: Gelen istemin (prompt) zorluk seviyesini tahmin etmek için eğitilmiş küçük sınıflandırıcı modeller kullanır.
   * **RouteLLM (LMSYS)**: Chatbot Arena verileriyle eğitilmiş matris faktörizasyonu (matrix factorization) modelini temel alır. MT-Bench değerlendirmelerinde, sorguların yalnızca %14'ünü güçlü modele göndererek GPT-4 kalitesinin %95'ini korumuş ve ortalama maliyeti **%85 oranında düşürmüştür**.
   * **Not Diamond**: İstem bazında kalite-maliyet oranını optimize eden ticari bir tavsiye motorudur.
2. **Toplayıcı Yönlendiriciler (Aggregator / Gateway Routing)**:
   * **OpenRouter**: 100'den fazla modeli tek bir API endpoint'i arkasında toplar. Ters-kare fiyat ağırlıklandırma ve otomatik yedekli (fallback) yönlendirme sunar. OpenRouter yönlendirme katmanı 55 ms gecikme eklerken, Requesty gibi optimize edilmiş yönlendiriciler bu süreyi 16 ms seviyesine indirmektedir.
   * **LiteLLM / Vercel AI Gateway / Requesty**: İstek başı ek gecikmeyi minimumda tutarak maliyet, TTFT (ilk token süresi) ve oran limitlerine (rate limit) göre yük dengeleme yapmaktadır. Orq.ai Auto Router benchmark verilerine göre doğru yapılandırılmış dinamik yönlendirme, %98 kalite korumasıyla %50 maliyet tasarrufu sağlamaktadır.

Aşağıdaki tablo, farklı ucuz/öncü model kombinasyonları ve trafik dağılımları altında elde edilen maliyet tasarruf oranlarını göstermektedir.

Aşağıdaki tablo, ucuz ve öncü modeller arasındaki trafik paylaşımına göre toplam maliyet tasarrufu matrisini sergilemektedir.

| Ucuz / Öncü Trafik Paylaşımı | Haiku ($1) / Opus ($25) | Sonnet ($3) / Opus ($25) | Haiku ($1) / GPT-5.5 ($5) | DeepSeek ($0.44) / Opus ($25) |
| :--- | :--- | :--- | :--- | :--- |
| **%10 Ucuz / %90 Öncü** | %10 Tasarruf | %9 Tasarruf | %8 Tasarruf | %10 Tasarruf |
| **%30 Ucuz / %70 Öncü** | %29 Tasarruf | %26 Tasarruf | %24 Tasarruf | %29 Tasarruf |
| **%50 Ucuz / %50 Öncü** | %48 Tasarruf | %44 Tasarruf | %40 Tasarruf | %49 Tasarruf |
| **%70 Ucuz / %30 Öncü** | %67 Tasarruf | %62 Tasarruf | %56 Tasarruf | %69 Tasarruf |
| **%80 Ucuz / %20 Öncü** | **%77 Tasarruf** | **%70 Tasarruf** | **%64 Tasarruf** | **%79 Tasarruf** |

Ayrıca istem önbellekleme (prompt caching) teknolojileri ile birleştirildiğinde, Anthropic ve Gemini gibi sağlayıcılarda tekrarlanan sistem talimatları için girdi token maliyetlerinde **%90'a varan ek tasarruflar** elde edilmektedir.

---

## 5. Yapay Zeka Kasabaları, Sosyal Simülasyonlar ve Canlı Görsel İzleme Arayüzleri

Otonom ajanların bir diğer heyecan verici uygulama alanı, yüzlerce ajanın kendi hafızaları, hedefleri ve sosyal ilişkileriyle yaşadığı sanal kasaba simülasyonlarıdır.

### a16z AI Town ve Sanal Topluluklar

Andreessen Horowitz (a16z-infra) tarafından açık kaynak olarak sunulan **AI Town**, Stanford ve Google'ın ünlü "Generative Agents" makalesinden ilham alan TypeScript tabanlı bir simülasyon altyapısıdır.

* **Backend ve Simülasyon Motoru**: Reaktif veritabanı platformu **Convex** üzerinde çalışır. ACID işlemleri, paylaşılan küresel durum ve vektör arama entegrasyonu sayesinde ajanlar geçmiş deneyimlerini anlamsal (semantic memory) olarak hatırlar.
* **Görsel Web Render**: **PixiJS** 2D WebGL motoru kullanılarak retro 2D piksel-art grafiklerle ajanların hareketleri, diyalogları ve sosyal ilişkileri taranabilir.
* **Dağıtım ve Çıkarım Esnekliği**: Ajan zekası yerel olarak **Ollama (Llama 3)** üzerinde sıfır API maliyetiyle veya bulutta OpenAI/Together.ai üzerinden çalıştırılabilir.

### Ajan Arayüz Teknolojilerinin Karşılaştırması

Ajanların iç mantığını ve durumlarını görselleştirmek için kullanılan teknolojiler ciddi performans ve mimari farklar gösterir:

Aşağıdaki tablo, otonom ajan sistemlerinde kullanılan üç temel görselizasyon yaklaşımının teknik özelliklerini karşılaştırmaktadır.

| Arayüz Teknolojisi | Görselleştirme Tipi | Varlık (Asset) Yükleme Metodu | GPU ve Bellek Yükü | Ajan İzleme Kullanım Senaryosu |
| :--- | :--- | :--- | :--- | :--- |
| **Three.js (Prosedürel)** | 3D İzometrik Ofis Sahnesi | Sıfır Harici Dosya (Kodla Üretilen Meshler) | Düşük (Hafif Mod Seçeneği Var) | **Ajan Ofisi**: Yerel Geliştirici Dashboard'ları ve Performans Odaklı Canlı İzleme |
| **PixiJS / Canvas** | 2D Pixel-Art İzometrik Kasaba | Spritesheet ve Tiled JSON Haritaları | Orta - Yüksek | **AI Town**: Kalıcı Sosyal Simülasyonlar ve Oyunlaştırılmış Arayüzler |
| **Three.js WebGPU / TSL** | 3D Fotogerçekçi / Shader Sahneleri | Yüksek Poligonlu GLTF ve Kaplamalar | Yüksek | Kurumsal Ajan Komuta Merkezleri ve Geniş Ağ İzleme Sistemleri |

---

## 6. Kalıcı Ajan Belleği, Yerel Çıkarım ve Altyapı Standartları

Otonom ajanların uzun süreli görevlerde başarılı olabilmesi ve oturumlar arası bilgiyi koruyabilmesi için gelişmiş bellek ve altyapı katmanlarına ihtiyaç vardır.

### RuVector: Rust Tabanlı Kalıcı Ajan Belleği ve Vektör GNN DB

Reuven Cohen (rUv) tarafından geliştirilen **RuVector**, otonom ajanlar için yüksek performanslı ve gerçek zamanlı bir vektör ve grafik veritabanı altyapısıdır.

RuVector, ajan bellek yapısını dört temel katmanda yönetir:
1. **Çalışma Belleği (Working Memory)**: Anlık aktif diyalog bağlamı.
2. **Bölümsel Bellek (Episodic Memory)**: Geçmiş deneyimlerin ve olayların zaman dizinsel kaydı (Reflexion episode kayıtları).
3. **Anlamsal Bellek (Semantic Memory)**: Kavramlar, olgular ve ilişkisel bilgiler.
4. **Prosedürel Bellek (Procedural Memory)**: Öğrenilen beceriler, araç kullanım kalıpları ve nedensellik çizgeleri (causal edges).

AgenticDB yapısı içerisinde değiştirilemez tanık günlükleri (witness logs) barındıran RuVector, `@ruvector/typesafe` paketi üzerinden tam dil modeli çağrısı yapmadan yerel tipleştirilmiş kararlar (intent sınıflandırma, aciliyet tespiti) üretebilmektedir.

### Yerel Çıkarım ve Donanım Optimizasyonları

Ajan ekosisteminin veri gizliliği ve bağımsızlık yönündeki en büyük dayanağı yerel çıkarım teknolojileridir:

* **Ollama & LangChain Entegrasyonu**: Llama 3, Gemma ve Mistral gibi açık kaynaklı modelleri quantized GGUF formatında çalıştırarak OpenAI uyumlu REST API sağlar.
* **vLLM & PagedAttention**: Yüksek eşzamanlılıklı (high-concurrency) çoklu-ajan isteklerinde KV-cache bellek parçalanmasını önleyerek GPU verimliliğini maksimuma çıkarır.
* **Hugging Face WebGPU Kernels**: 200'den fazla makine öğrenimi operasyonunu doğrudan tarayıcı içinde yerel GPU üzerinde çalıştırarak sıfır kurulumlu web tabanlı ajan sistemlerinin önünü açmaktadır.

---

## 7. Sonuç ve Gelecek Prospektifi

Yapay Zeka Kasabaları ve Otonom Ajan Toplulukları üzerine yapılan bu kapsamlı araştırma göstermektedir ki; yapay zeka sistemlerinin geleceği tekil devasa modellerde değil, uzmanlaşmış ajanların açık protokoller (MCP ve A2A) üzerinden koordineli çalıştığı ağ yapıları üzerindedir.

Öne çıkan kritik çıkarımlar şunlardır:
* **Mimarilerde Esneklik**: Şelale sohbet zincirlerinden (ChatDev) bildirimsel döngüsel çizgelere (DevAll) geçiş, ajan sistemlerinin karmaşık görevlerdeki esnekliğini artırmıştır.
* **Maliyet Denetimi Zorunluluğu**: Dinamik model yönlendirme (RouteLLM, OpenRouter) katmanları kullanılmadan üretim ortamına alınan çoklu-ajan sistemleri finansal açıdan sürdürülebilir değildir. ML yönlendirme ile %80'e varan tasarruflar mümkündür.
* **Açık Standartlar**: Ajan sistemlerinin başarısı, sağlayıcı kilitlenmesinden (vendor lock-in) kaçınarak yerel modeller (Ollama, RuVector) ve açık iletişim standartları ile entegrate olabilmesine bağlıdır.

Bu rapor, otonom ajan dünyasındaki mevcut teknolojileri, teknik benchmarkları ve mimari tasarım kalıplarını tek bir dokümanda bir araya getirerek gelecek çalışmalara rehberlik edecek nitelikte hazırlanmıştır.

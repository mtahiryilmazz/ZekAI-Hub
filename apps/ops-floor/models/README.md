# 3D modeller (opsiyonel)

Ofis sahnesi varsayılan olarak **prosedürel** chibi karakterler kullanır: harici dosya
gerekmez, 60 fps ve düşük bellek hedefiyle uyumludur.

Kendi modelinizi (Sketchfab, Blender, vb.) eklemek için:

1. `.glb` / `.gltf` dosyanızı bu klasöre koyun (gerekirse `textures/` alt klasörüyle).
2. Arayüzde **Maskot → karakter kartına tıkla → Model URL** alanına yolu yazın:
   `/models/karakter.glb` (sunucu bu klasörü statik olarak servis eder).
3. **Güncelle** → **Sahneye uygula**. Model yüklenemezse prosedürel maskot kalır.

## Animasyon (rigged GLB)

Model iskelet (skin) ve animasyon klipleri içeriyorsa ofiste otomatik oynar.

- **Klipler:** `idle`, `walk`, `work` adlarını kullanın (Türkçe/İngilizce eşleşme: `Idle/Breath`, `Walk/Run`, `Work/Type/Sit`).
  Bulunamazsa ilk klip sürekli oynar.
- **Durum eşlemesi:** boştayken `idle`, yürürken `walk`, görevdeyken `work`; geçişler 0,22 sn fade ile.
- **İkinci kopya:** Aynı model birden fazla ajana atanırsa iskelet `SkeletonUtils.clone` ile kopyalanır; animasyonlar bağımsız oynar.
- **Ölçü:** Model 1,15 birim boya ve 0,84 birim ayak izine sığdırılır, taban zemine oturur, masa kenarından 0,26 birim uzaklaştırılır.

## Format seçimi

| Format | Web'de hız | Animasyon | Not |
|---|---|---|---|
| **GLB** | En iyi (tek dosya) | İskelet + morph | Önerilen |
| glTF | İyi (çok dosya) | Var | .bin/dokular ayrı iner |
| FBX | Yavaş (büyük, ayrı loader) | Var | DCC çıkışı için |
| USDZ | Web'de oynatılmaz | three.js'te yok | Yalnız AR Quick Look |

Hedef: **< 5 MB**, tek iskelet, doku 1K. 40 MB üzeri modeller ilk açılışı saniyelerce geciktirir;
`npx @gltf-transform/cli optimize in.glb out.glb --compress draco` ile küçültün.

## Kurallar

- **Lisans:** Modelin lisansı ve atıf koşulları size aittir. Repoya yalnızca kendi
  ürettiğiniz veya lisansı uygun (CC0/CC-BY, ticari kullanıma açık) modelleri koyun.
  Telifli karakterlerin (ör. anime/manga karakterleri) birebir modellerini herkese açık
  depoya eklemeyin.
- **Boyut:** Model başına < 8 MB hedefleyin; dokuları 1K/2K ile sınırlayın.
- **Ölçek:** Yükleyici modeli 1,4 birim boya normalize eder; zemine oturtur.
- **Performans:** Aynı anda 6 karakter yüklenir; ağır sahnelerde `?view=floor` kullanın.
- **Biyometrik veri:** Yüz taraması/gerçek kişi modeli kullanmayın.

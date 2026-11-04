# 3D modeller (opsiyonel)

Ofis sahnesi varsayılan olarak **prosedürel** chibi karakterler kullanır: harici dosya
gerekmez, 60 fps ve düşük bellek hedefiyle uyumludur.

Kendi modelinizi (Sketchfab, Blender, vb.) eklemek için:

1. `.glb` / `.gltf` dosyanızı bu klasöre koyun (gerekirse `textures/` alt klasörüyle).
2. Arayüzde **Maskot → karakter kartına tıkla → Model URL** alanına yolu yazın:
   `/models/karakter.glb` (sunucu bu klasörü statik olarak servis eder).
3. **Güncelle** → **Sahneye uygula**. Model yüklenemezse prosedürel maskot kalır.

## Kurallar

- **Lisans:** Modelin lisansı ve atıf koşulları size aittir. Repoya yalnızca kendi
  ürettiğiniz veya lisansı uygun (CC0/CC-BY, ticari kullanıma açık) modelleri koyun.
  Telifli karakterlerin (ör. anime/manga karakterleri) birebir modellerini herkese açık
  depoya eklemeyin.
- **Boyut:** Model başına < 8 MB hedefleyin; dokuları 1K/2K ile sınırlayın.
- **Ölçek:** Yükleyici modeli 1,4 birim boya normalize eder; zemine oturtur.
- **Performans:** Aynı anda 6 karakter yüklenir; ağır sahnelerde `?view=floor` kullanın.
- **Biyometrik veri:** Yüz taraması/gerçek kişi modeli kullanmayın.

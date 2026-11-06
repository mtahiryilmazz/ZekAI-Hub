# ROBOTZ → ofis maskotları

Kaynak paket: `C:\Users\BT\Downloads\ROBOTZ (source files)`
İçerik: **6 robot** (`.blend` + 120 webp render), **5 animasyon** (`Wave`, `Thumbs Up`, `Money Rain`, `Scrolling`, `Shruggle`).
Pakette **GLB yok**; three.js `.blend` okuyamaz. Bu yüzden önce Blender'da glTF export gerekir.

## Export ayarları (Blender 4.x)

1. `ROBOTZ.blend` dosyasını aç, sahnedeki robotlardan birini seç (veya koleksiyonu izole et).
2. Gereksizleri sil: kamera, ışık, zemin, webp için kurulmuş sahne öğeleri.
3. **File → Export → glTF 2.0 (.glb)**:

| Ayar | Değer |
|---|---|
| Format | `glTF Binary (.glb)` |
| Include | `Selected Objects` |
| Transform → +Y Up | **açık** |
| Data → Apply Modifiers | **açık** |
| Data → Armature → Skin | **açık** (rig varsa) |
| Animation | **açık**, `NLA Strips` veya `Actions` |
| Animation → Sampling | `1` (30 fps) |
| Compression | kapalı (önce ham export, sonra Draco) |

4. Dosyayı şu adla kaydet: `apps/ops-floor/models/robots/robot1.glb` … `robot6.glb`
5. Animasyonlu sürümler için klip adlarını şöyle ver (birebir eşleşir):

| Klip adı | Ofiste karşılığı |
|---|---|
| `Idle` | boşta nefes |
| `Walk` | yürüme |
| `Work` | görevde (varsa) |

## Animasyon klipleri nasıl eklenir

`.blend` içindeki `Animation_source_files/*.blend` dosyaları ayrı sahnelerde duruyor.
En pratik yol:

1. Robotu ana sahnede aç.
2. `File → Append` ile `Wave.blend` içindeki **Action**'ı al.
3. Action'ı NLA'ya ekle, adını `Wave` yap.
4. Export sırasında `Animation → NLA Strips` seç → tüm klipler GLB'ye girer.

Ofis yükleyici klipleri şu sırayla arar: `idle|breath|stand`, `walk|run|move`, `work|type|sit`.

## Hızlı içe aktarma

Export edilen dosyalar indirilenler klasöründeyse:

```powershell
.\tools\import-robotz.ps1 -Source "C:\Users\BT\Downloads"
```

Betik `robot*.glb` dosyalarını `apps/ops-floor/models/robots/` altına kopyalar ve listeler.
Sonra arayüzde: **Maskot → model seç → `/models/robots/robot1.glb` → Yeni ekle**.

## Boyut hedefi

- Model başına **< 5 MB**, doku 1K.
- Klasik `ROBOTZ` robotları yoğun detaylıysa Draco ile küçült:

```powershell
npx @gltf-transform/cli optimize robot1.glb robot1.min.glb --compress draco
```

## Lisans

Paketin lisansı sende; herkese açık repoya koymadan önce ticari kullanım koşullarını doğrula.

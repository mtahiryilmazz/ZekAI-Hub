# Kurulum ve Kontrol (Windows)

ZekAI Hub **Docker gerektirmez**: Python 3.10+ ve tek depo yeterli.

## Tek tık kurulum

1. `installer\windows\ZekAI-Setup.cmd` dosyasına çift tıkla.
2. Betik Python'u, dosyaları, portu ve diski kontrol eder; sorun yoksa masaüstüne
   **ZekAI Hub** kısayolunu koyar ve kontrol panelini açar.

Sessiz kurulum:

```powershell
powershell -ExecutionPolicy Bypass -File installer\windows\install.ps1 -Port 8787 -Launch
```

Yazmadan yalnızca teşhis:

```powershell
powershell -ExecutionPolicy Bypass -File installer\windows\install.ps1 -DryRun -NoShortcut
```

## Kontrol paneli (başlat / durdur)

`installer\windows\ZekAI.cmd` **veya** masaüstündeki **ZekAI Hub** kısayolu.

Panelde:

| Alan | Ne yapar |
|---|---|
| Durum rozeti | Çalışıyor / Kapalı |
| Port · PID · Süre | Canlı sunucu bilgisi |
| Sağlayıcı · Bugün | Aktif model ve günlük harcama |
| **Başlat** | Sunucuyu arka planda başlatır, paneli tarayıcıda açar |
| **Durdur** | Süreç ağacını sonlandırır, portu serbest bırakır |
| **Yeniden başlat** | Durdur + başlat |
| **Paneli aç** | `http://127.0.0.1:<port>/` |
| **Klasörü aç** | Depo kökü |
| **Teşhis** | `install.ps1 -DryRun` çıktısı |
| **Log dosyası** | `%USERPROFILE%\.zekai\server.log` |
| Açılışta başlat | Tercih `%USERPROFILE%\.zekai\gui.json` içinde saklanır |

Doğrudan çalıştırma:

```powershell
powershell -STA -ExecutionPolicy Bypass -File installer\windows\ZekAI-Kontrol.ps1 -Port 8787
```

Öz test (GUI açmadan başlat/durdur mantığını dener):

```powershell
powershell -STA -ExecutionPolicy Bypass -File installer\windows\ZekAI-Kontrol.ps1 -SelfTest
```

## Komut satırı

```powershell
.\Swarm.ps1 install     # kurulum + kısayol + kontrol paneli
.\Swarm.ps1 start       # sunucuyu başlat ve tarayıcıyı aç
.\Swarm.ps1 gui         # kontrol paneli
.\Swarm.ps1 doctor      # teşhis (yazmaz)
.\Swarm.ps1 uninstall   # kısayolları ve kurulum kaydını siler
```

## Dosyalar

| Yol | Amaç |
|---|---|
| `installer\windows\ZekAI-Setup.cmd` | Tek tık kurulum |
| `installer\windows\install.ps1` | Kontrol + kısayol + kayıt (+ `-DryRun`, `-Uninstall`) |
| `installer\windows\ZekAI.cmd` | Kontrol panelini açar |
| `installer\windows\ZekAI-Kontrol.ps1` | WinForms paneli (başlat/durdur/log/teşhis) |
| `installer\windows\start.ps1` | Konsolsuz hızlı başlatıcı (kısayollar artık panele gider) |
| `installer\windows\ZekAI-Uninstall.cmd` | Kısayolları ve kurulum kaydını kaldırır |

## Üretilen dosyalar

- `%USERPROFILE%\.zekai\config.json` — sağlayıcı, model, günlük limit
- `%USERPROFILE%\.zekai\usage.json` — bugünkü harcama
- `%USERPROFILE%\.zekai\skills.json` — paylaşılan yetenekler
- `%USERPROFILE%\.zekai\server.log` · `server.log.err` — sunucu çıktısı
- `%USERPROFILE%\.zekai\server.pid` — son başlatılan süreç

Depo dosyaları kaldırmada **silinmez**; yalnız kısayollar ve kayıt temizlenir.

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| Panel açılmıyor | `powershell -STA -File installer\windows\ZekAI-Kontrol.ps1` çıktısına bak |
| "Python bulunamadı" | Python 3.10+ kur, PATH'e ekle; `python --version` çalışmalı |
| Port kullanımda | Panelde port alanını değiştir veya `-Port 8790` ver |
| 3D açılmıyor | Tarayıcıda WebGL kapalı olabilir; **Saha** görünümü yedektir |
| Sunucu durmuyor | Panelde **Durdur**; olmazsa Görev Yöneticisi → `python.exe` |

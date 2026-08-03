# Yazı tipi

## Şu an kurulu: **Lateef** (`naskh.woff2` · 61 KB · Arapça altkümesi)

* Tasarım: **SIL International** — <https://software.sil.org/lateef/>
* Lisans: **SIL Open Font License 1.1 (OFL)** — dağıtımı serbesttir.
* Dosya Google Fonts'un Arapça altkümesinden alınmıştır (woff2).

`css/style.css` içindeki `@font-face` bu dosyayı `AtolyeNaskh` adıyla yükler.
Böylece **her cihaz (bilgisayar · Android · iPhone) harfleri BİREBİR aynı görür.**

## Neden bu yazı tipi? (tahminle değil, ÖLÇÜMLE seçildi)

Uygulama harflerin orta eksenini ve nokta yerlerini **ekrandaki gerçek yazı
tipinden** hesaplar. Yöneticinin elle çizdiği 192 yol da o günkü yazı tipine
(Windows'ta *Traditional Arabic*) göre çizilmişti. Yeni yazı tipi ona ne kadar
yakınsa çizilmiş yollar o kadar iyi oturur.

Önce 19 harfin **en-boy oranı** *Traditional Arabic* ile karşılaştırıldı; sonra
kayıtlı 192 yolun harften ne kadar saptığı gerçekten ölçüldü:

| Aday | Şekil oranı sapması (ort.) | Sınırı aşan yol | En kötü sapma |
|---|---|---|---|
| **Lateef** ✅ | **%14,2** | **5** | **%15** |
| Noto Naskh Arabic | %28,4 | — | — |
| Amiri | %31,6 | 16 | %23 |
| Scheherazade New | %33,2 | — | — |

Lateef açık ara en yakın olduğu için seçildi. Amiri kurulsaydı 16 şekil
sınırı aşacaktı.

## Neden yazı tipi dağıtmak ŞART?

Dosya olmasaydı her cihaz kendi Arapça yazı tipine düşerdi (Windows:
*Traditional Arabic*, Android: *Noto Naskh*, iOS: başkası). O zaman:

* harf şekilleri cihazdan cihaza değişir,
* elle çizilen yollar harften **kayar** — ölçüldü: `ب` için ~21 piksel,
* ت / ث noktaları bazı yazı tiplerinde birleşik çizildiği için nokta
  algılaması farklı çalışır.

`js/tracing.js` içindeki **mürekkep hizalaması** (`inkRemap`) yolun *yerini*
düzeltir ama harfin *şeklini* değiştiremez. Yazı tipi dağıtmak kalıcı çözüm,
hizalama ise onun tamamlayıcısıdır. İkisi birlikte çalışır.

## Yazı tipini değiştirmek istersen

1. OFL lisanslı bir nesih yazı tipi indir.
2. `.woff2` dosyasını bu klasöre koy, adını **`naskh.woff2`** yap.
3. Tarayıcıyı yenile.
4. **Şunu atlama:** Öğretme Atölyesi → 📊 Durum Panosu → 🔎 Denetim →
   `🔍 Sapmayı tara`. Yeni yazı tipine oturmayan yol varsa listeler; o şekli
   yeniden yazman yeterlidir.

Yazı tipi değişince kayıtlardaki **yazı tipi parmak izi** de değişir; çizim
düzenleyicisi bunu fark edip uyarır.

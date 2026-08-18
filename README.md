# Arapça Yazı Atölyesi — Adım Adım Kurs

Türkçe konuşan **yeni başlayan** (ve küçük yaştaki) öğrenciler için Arapça harf yazma
kursu. Öğrenci hiçbir zaman "şimdi ne öğrensem?" diye seçim yapmaz: uygulama onu sırayla
götürür — **öğret → çalıştır → sına**.

Harici kütüphane yok, derleme adımı yok, internet gerekmez.

## Çalıştırma

`index.html` dosyasına çift tıkla. Hepsi bu.

Yerel sunucu tercih edersen (çevrimdışı kurulum ve servis çalışanı için gerekir):

```bash
python -m http.server 5173
```

Sonra `http://127.0.0.1:5173/index.html` adresini aç.

**Testler:** `test.html` sayfasını aç — müfredat, iskelet çıkarımı, yazım denetimi ve
depolama için **1500'den fazla otomatik kontrol** çalışır ve sonucu tek ekranda gösterir.
Bir şeyi değiştirdikten sonra buraya bakmak, bir yeri kırıp kırmadığını anında söyler.

**Tablete kurmak:** sunucu üzerinden açıp tarayıcının "Ana ekrana ekle / Uygulamayı
kur" seçeneğini kullan. Çevrimdışı çalışır (servis çalışanı yalnızca `http(s)`
üzerinde devreye girer; `file://` ile açarsan uygulama yine çalışır, sadece
çevrimdışı önbelleği olmaz).

**Yazı tipi (önerilir):** `fonts/` klasörüne bir nesih yazı tipi koyarsan tüm
cihazlarda aynı harf şekilleri kullanılır — bkz. [`fonts/README-FONT.md`](fonts/README-FONT.md).
Koymazsan sistemdeki Arapça yazı tipine düşer.

## Ek uygulama: Suriye Lirası Çevirici (`currency.html`)

Bu depoda, kurstan bağımsız çalışan ikinci bir küçük uygulama daha var:
**[`currency.html`](currency.html)** — eski ve yeni Suriye lirası arasında çeviri yapar
(100 eski = 1 yeni) ve **hangi banknotları vermen gerektiğini** en az kâğıt sayısıyla
hesaplar; ayrıca para üstünü de çıkarır. Arayüz Arapça (RTL), çevrimdışı çalışır.
Ayrıntılar: [`README-CURRENCY.md`](README-CURRENCY.md). Testler: `test-currency.html`
(ya da `node js/currency-tests.js`).

## Öğretim modeli

```
Aşama  →  Ünite  →  Adım
```

* **Adım** = ekrandaki tek iş, tek büyük düğme. (**734 adım**)
* **Ünite** = 4–8 adımlık küçük ders, 2–3 dakika. (**164 ünite**)
* **Aşama** = harf ailesi + sınavı. (**7 aşama — alfabenin tamamı, 28 harf**)

**Hiçbir şey kilitli değildir** — bütün aşamalar ve dersler baştan açıktır.
Uygulama yine de sıradaki dersi **BURADASIN** rozetiyle önerir; öğrenci isterse
ileri atlayabilir, isterse önerilen sırayı izler.

### Bir harf ünitesinin akışı (örnek: Be)

| # | Faz | Adım |
|---|-----|------|
| 1 | ÖĞREN | Harfi tanıt: ses, nokta, bağlanma davranışı, **nasıl yazılır** + 🔊 |
| 2 | **İZLE** | Harf, doğru uçtan başlayıp doğru yönde **canlı olarak yazılır** |
| 3 | **TAKİP** | Öğrenci yardımlar açıkken üstünden geçer |
| 4 | **YAZ** | Yardımsız yazar — **%80 altında kabul edilmez** |
| 5-6 | KONTROL | İki çoktan seçmeli: harfi tanı + formun yeri |

Ardından ikinci bir ünite gelir: **Bağlantı Hâlleri** — başta/ortada/sonda
biçimlerinin her biri için ayrı ayrı İZLE + YAZ.

Elif gibi bağlanmayan harflerde tekrar eden formlar otomatik atlanır, bunun yerine
"kendinden sonrakine bağlanır mı?" sorusu sorulur.

## Harf Şekilleri (başvuru bölümü)

Yol haritasının en üstündeki **📖 Harf Şekilleri** kartı, derslerden bağımsız bir
başvuru bölümü açar:

* **28 harfin tamamı** — her biri için yalın / başta / ortada / sonda biçimleri
  (tekrar eden biçimler tek sekmede birleştirilir; ör. Elif'te "Yalın / Başta").
* Seçilen biçim **canlı olarak yazılır**: kalem doğru uçtan başlar, doğru yönde
  ilerler, noktalar (ve ك'deki iç işaret gibi ek parçalar) en sona bırakılır.
* **Hız denetimi**: 0.5× · 0.75× · Normal · 1.5× · 2×. Seçim kaydedilir ve
  derslerdeki İZLE adımlarında da geçerlidir.
* Her harfte yazım yönünün kaynağı belirtilir: kitapçığın ilgili sayfası ya da
  "aynı iskeleti paylaşan aile" notu.

## Öğrenci profilleri, tekrar ve ödüller

* **Profiller** — aynı cihazı birden çok öğrenci kullanabilir; her birinin ilerlemesi,
  yıldızı ve raporu ayrıdır. Üstteki isim şeridinden geçiş yapılır.
* **Bugünün tekrarı (aralıklı tekrar)** — her yazma adımı, yapıldığı tarih ve puanla
  saklanır. Aralıklar **1 → 3 → 7 → 16 → 35 gün** diye açılır; %85’in altında bir
  puan aralığı başa döndürür. Tekrar zamanı gelenler haritanın üstünde tek bir
  kartta toplanır ve normal ders akışıyla çalışılır.
* **Yıldız ve seri** — tamamlanan her ünite ortalama puanına göre 1–3 yıldız alır;
  üst üste çalışılan günler 🔥 serisi olarak sayılır.
* **📊 Rapor** — öğretmen/veli için: beceri ortalamaları (şekil, başlangıç, yön,
  nokta, büyüklük, satıra oturma), **en sık yapılan hatalar** ve en çok zorlanılan
  alıştırmalar. Yazdırılabilir.

## Ekran düzeni (telefon ve tablet)

Yazma ekranı tek ekrana sığacak şekilde düzenlendi — düğmeye basmak ya da puanı
görmek için sayfayı aşağı yukarı kaydırmak gerekmiyor:

* **Yan araç çubuğu** — göster / geri al / temizle / büyüt düğmeleri yazı alanının
  **yanında** durur; izleme adımında hız düğmeleri de oradadır.
* **⛶ Büyüt** — yazı alanını neredeyse tüm ekrana yayar (telefonda 422 px → 780 px).
  Parmakla yazan çocuk için asıl fark budur.
* **Yapışkan ana düğme** — "Kontrol Et" sayfanın altına yapışır, hep elin altındadır.
* **Küçülen başlık** — üst çubuk 54 px’e indi ve aşağı kaydırırken gizlenir,
  yukarı kaydırınca geri gelir.
* Telefonda yazı alanı ekranın **%52**’sini kaplar (önceden sabit 240 px idi).

Arap alfabesi listelerinde harfler **sağdan sola** dizilir (ا sağ üstte başlar) —
hem Harf Şekilleri ekranında hem çalışma kâğıdı seçiminde hem yönetici panelinde.

## Çalışma kâğıdı (kâğıt üstünde tekrar)

Haritadaki **🖨 Çalışma Kâğıdı** kartı, seçtiğin harfler için sayfa üretir:
her satırda önce **solmuş örnekler**, sonra boş yer.

**Sayfa artık sade.** Eskiden her satırda üç ayrı çizgi vardı (yazı çizgisi +
kesikli tepe çizgisi + her kutu arasında noktalı ayırıcılar); ikisi yazmaya
yardım etmiyor, yalnız sayfayı kalabalıklaştırıyordu. Şimdi **yalnız üstüne
yazılacak çizgi** kalır.

Kâğıt pahalıdır; her şey ayarlanır ve **kalıcı olarak saklanır**:

| Ayar | Ne yapar |
|---|---|
| **Satır** | Sayfadaki satır sayısı (1–30) |
| **Tekrar** | Aynı satırda kaç solmuş örnek olsun (0–12) |
| **Boş** | Örneklerden sonra kaç boş yer kalsın (0–20) |
| **Aralık** | Satırlar arası boşluk — küçültünce sayfaya daha çok satır sığar |
| **Harf etiketi** | Satır başındaki harf kutusu görünsün mü |

**Üst/alt yazı** (sayfa adı, okul/öğretmen adı) her basılan sayfada çıkar ve
yalnız **🔧 yönetici kilidi açıkken** düzenlenebilir — öğrenci yanlışlıkla
değiştirmesin. Yazdırma stili hazırdır: arayüz gizlenir, kenar boşlukları
daraltılır.

## Arayüz dili

Başlıktaki **ع / TR** düğmesi arayüzü Arapçaya çevirir ve sayfayı sağdan sola alır.
**Kapsam dürüstçe:** çevrilen şey arayüzdür (düğmeler, ekran başlıkları, faz adları).
**Ders içeriği Türkçe kalır** — harf adları (Elif, Be…), kelimelerin Türkçe karşılıkları
ve yazım ipuçları öğretimin kendisidir ve öğrenci Türkçe konuşmaktadır. Arapça
seçeneği, uygulamayı yöneten Arapça konuşan öğretmen içindir.

## 🎓 Öğretme Atölyesi — `studio.html`

Ayrı, hafif bir sayfadır (ders/sınav mantığı yüklenmez). Yönetici panelindeki
**Çizim Yolu** sekmesinden ya da doğrudan `studio.html` ile açılır; yönetici
PIN'i sorar.

**Sorun:** yazım yolu, harfin/kelimenin ŞEKLİNE göre saklanır — `"ب"`, `"بـ"`,
`"باب"` ayrı ayrı. Bir harfi baştan sona düzeltmek için 123 hedefi tek tek
çizmek gerekirdi.

**Çözüm:** öğretmen harfi **bir kez kendi eliyle** yazar; uygulama o yazıdan
"üslup imzası" çıkarıp diğer hedeflere taşır.

### Ne öğrenilir

| Öğrenilen | Nasıl kullanılır |
|---|---|
| Yol + hamle sırası + yön | Kalem nereden başlar, nereye gider, kaç kez kalkar |
| Nokta yerleri ve yarıçapı | Hedefin kendi nokta sayısıyla birleştirilir (ب→ت 2, ث 3) |
| Kalem kalınlığı ve oranlar | Boyanan bandın genişliği; öğretmenin harfe göre taşma payı |

Çizgiler, hedef harfin **mürekkep kutusuna göre** oransal saklanır
(`bx = (kutu.sağ − x)/kutu.genişlik`), böylece tuval boyutundan bağımsızdır ve
öğretmenin kendi oranları korunur.

### İki taşıma türü — dürüstçe ayrılır

* 🟢 **Tam kopya** — hedef, aynı iskeleti paylaşan **kardeş harf**se
  (ب ت ث · د ذ · ر ز · ص ض · ط ظ · ع غ · ف ق · س ش · ج ح خ) çizgiler **birebir**
  taşınır; yalnız noktalar hedefin kendi noktalarıdır. Yüksek sadakat —
  varsayılan olarak işaretli gelir.
* 🟡 **Üslup** — şekil gerçekten farklıysa (ب → ـبـ, ya da bir kelime) çizgiler
  kopyalanamaz. Hedefin **kendi iskeleti** yazı tipinden çıkarılır, sonra
  öğretmenin kurallarına göre yeniden düzenlenir: başlangıç ucu, yön, hamle
  bölünmesi, nokta yarıçapı, kalem kalınlığı. Varsayılan olarak **işaretsiz**
  gelir — bakıp onaylaman için.

Kelimelerde parçalar bağlı bileşenlere göre ayrılır, yani `باب` → `با` + `ب`
(2 hamle, 2 nokta) doğru çıkar.

### Harf mi, kelime mi?

Atölyede iki kip vardır: **Harf biçimi** (28 harf × 4 biçim) ve **Kelime**
(müfredattaki 94 kelime). Kelime kipinde yazdığın yol **yalnız o kelimeye**
işlenir — kelimelerin şekli birbirine benzemediği için başka kelimeye
taşınmaz; bu dürüst sınırdır, atölye bunu ekranda da söyler.

### 🎓 Kelime yazısından HARF dersi çıkarma

Bir kelimeyi elle yazarken aslında o kelimedeki **harf biçimlerini** de
yazmış olursun. Atölye bunu değerlendirir:

1. Kelime, **bitişik parçalara** ayrılır. Ayrım denklemden hesaplanır:
   bir harf kendinden sonrakine bağlanmıyorsa (`joinsForward === false`)
   parça orada biter. `باب` → `با` + `ب`.
2. Yazı tipinden çıkarılan **bağlı bileşenler** ile bu parçalar eşleştirilir
   (ikisi de sağdan sola sıralıdır). Sayılar tutmuyorsa **hiçbir şey
   uydurulmaz**, işlem sessizce atlanır.
3. **Tek harften oluşan** bir parça varsa (ör. `باب`'ın sonundaki yalın `ب`),
   senin o bölgedeki çizgin doğrudan o harf biçiminin dersidir: çizgiler o
   parçanın mürekkep kutusuna göre normalize edilir — yani harf tek başına
   yazılmış gibi olur — ve imza çıkarılır.
4. Kaydettiğinde bu dersler önizlemeli kartlar hâlinde listelenir; işaretleyip
   uygularsan harfe işlenir ve ardından **kardeş harflere taşıma** önerileri
   kendiliğinden açılır.

Çok harfli parçalar (ör. `با`) atlanır: hangi çizginin nerede bittiği
güvenilir biçimde kestirilemez. İmzaya `fromWord` alanı yazılır, böylece bir
dersin hangi kelimeden geldiği kaydın içinde durur.

### 🎓 + ✒️ — atölye temel, Çizim Yolu tamamlayıcı

İki araç tek akışta birleşiktir:

* Atölyede `✒️ İnce ayar (Çizim Yolu)` düğmesi, **aynı sayfada** düğüm
  düzenleyicisini o şekil seçili olarak açar. Panel kapanınca atölye kendini
  tazeler.
* Düzenleyicideki `🎓 Elle yaz (Atölye)` düğmesi tersini yapar: aynı şekil
  seçili olarak atölyeye döner.
* Gözden geçirme penceresinden de her iki araca doğrudan geçilir.

Sıra şudur: **önce elle yaz** (şeklin ve üslubun oradan gelir), **sonra
gerekiyorsa düğüm düğüm rötuşla**.

### 📱 Telefonda "yol harfin üstünde değil"

**Belirti:** bilgisayarda kalem harfin tam üstünden geçiyor, telefonda kayıyor.

**Sebep:** `fonts/naskh.woff2` yoksa her cihaz kendi Arapça yazı tipine düşer —
Windows'ta genelde *Traditional Arabic*, Android'de *Noto Naskh Arabic*, iOS'ta
başka bir şey. Kayıtlı yollar harfin **çizim kutusuna** (advance box) göre
saklanır; harfin **mürekkebi** ise o kutunun içinde yazı tipine göre farklı
yerde durur. Ölçüldü — aynı ekranda `ب` harfi:

| Yazı tipi | mürekkep üstü (v) | mürekkep yüksekliği |
|---|---|---|
| Traditional Arabic | −0,327 | 0,414 |
| Noto Naskh Arabic | −0,468 | 0,514 |

Yani ~0,14 font boyu dikey kayma (150 px'te **21 piksel**) ve **%24** boy farkı.

**Çözüm (uygulandı):** her kayda, çizildiği andaki **mürekkep kutusu** (`ink`)
eklenir. Çizerken o cihazın mürekkep kutusu ölçülür ve yol eskiden yeniye
doğrusal olarak taşınır; nokta yarıçapı ve kalem kalınlığı da aynı oranda
ölçeklenir. **Yazı tipi aynıysa dönüşüm birimdir** — bilgisayarda hiçbir şey
değişmez (test bunu ayrıca doğrular).

Eski kayıtlarda `ink` yoktur. Atölye → **📊 Durum Panosu → 🔎 Denetim** bölümünde
`📱 Telefonlar için hizala` düğmesi bunları tek seferde tamamlar.
⚠ Bu düğmeye **yolları çizdiğin bilgisayarda** bas — ölçü oradaki yazı
tipinden alınır. Çizimler değişmez; yalnız mürekkep ölçüsü eklenir.

> **Kalıcı ve en iyi çözüm hâlâ yazı tipini dağıtmaktır.** Hizalama yolun
> *yerini* düzeltir, harfin *şeklini* değiştiremez: Noto'daki `ب` ile
> Traditional Arabic'teki `ب` farklı eğrilerdir. `fonts/README-FONT.md`
> tek adımı anlatıyor (Amiri ya da Scheherazade New, OFL lisanslı).

### 🎓 Üslup imzaları: tarayıcı ↔ dosya

Panonun üstünde tek satırlık bir durum vardır: **kaç imza bu tarayıcıda, kaç
imza dosyada**. İkisi ayrışabilir (ör. dosya yeniden üretilirken imzalar
düşerse). Fark varsa satır sararır ve `💾 Şimdi dosyaya yaz` düğmesi çıkar —
tek tıklama, konsol açmaya gerek yok.

> Bu satır, imzaların sessizce kaybolmasını görünür kılmak için eklendi:
> boş bir yer tutucu dosyanın dolu veriyi gölgelemesi yüzünden bir kez
> 143 imza dosyadan düşmüştü. Mantık hatası düzeltildi, `projectfile.js`'e
> "dolu dosyanın üzerine boş yazma" kilidi kondu ve durum artık ekranda.

### 📊 Durum Panosu

Atölyedeki ikinci sekme, **ne kaydedildi, nasıl kaydedildi ve ne kaldı**
sorusunu tek ekranda yanıtlar:

* Üstte ilerleme çubuğu — *194 şeklin kaçı senin üslubunla kaydedildi*
  (100 harf biçimi + 94 kelime).
* Sayaçlar: ✍️ kendi elinle · 🟢 tam kopya · 🟡 üslup · ✒️ eski düzenleyiciyle
  elle çizilmiş · ⚪ otomatik (henüz öğretilmemiş).
* 28 harf × 4 biçimlik ızgara; her kutu **o şeklin nasıl kaydedildiğini** gösterir.
  Kutunun üzerine gelince kaynağı ve tarihi yazar (*"ت · tam kopya · kaynak: ب ·
  2026-08-02 14:20"*). Kutuya **dokununca o biçimi öğretmeye geçersin**.
  Soluk kutular, o biçimin yalın hâlle aynı şekil olduğunu belirtir (ör. `ا`).
* 94 kelimenin durumu.
* **"Tamamlanması için ne kaldı?"** — hiç öğretilmemiş harfler, biçimleri eksik
  olanlar ve kelimelerde bekleyenler; hepsi tıklanabilir.

### ▶ Gözden geçirme — "hepsi doğru mu?"

Panodaki bir kutuya dokunmak **hareketi oynatır**: harfin/kelimenin nasıl
yazıldığını izlersin, altında nasıl kaydedildiği ve tarihi yazar. Pencereden
`◀ ▶` ile gezinir, `⏩ Sırayla oynat` ile hepsini arka arkaya izlersin
(klavye: ← → boşluk, Esc kapatır). Yanlış gördüğün an oradan `✍️ Elle yaz`
ya da `✒️ İnce ayar` ile düzeltirsin. `▶ Hepsini sırayla izle` ve
`▶ Yalnız öğrettiklerimi izle` düğmeleri 194 şeklin tamamını tarar.

### 🔎 Denetim — gözle görülmeyen hatalar

İzlemekle fark edilmeyen iki hatayı ölçerek bulur:

1. **Yön.** Yol (u,v) ölçüsünde saklanır: `u = 0` sağ kenar, `u = 1` sol kenar.
   * **Harflerde** ölçüt harfin **kendi** başlangıç kuralıdır
     (`letterforms.startRule`): ج ح خ ص ض ع غ م gerçekten **sol üstten**
     başlar, onlar hataya sayılmaz. Yalnız **ilk hamle** denetlenir.
   * **Kelimelerde** yalnız **parça sırası** denetlenir: parçalar sağdan sola
     gitmeli. Parça *içindeki* başlangıç ucu denetlenmez — bir parça birden
     çok harf taşır (`ما` = م + ا) ve harfin kuralı parçanın köşesiyle
     karıştırılamaz. Eşik, kelime genişliğinin **%10'u**dur: hamza gibi ek
     işaretlerin yol açtığı küçük örtüşmeler hata sayılmaz.
   * **Kendi elinle yazdığın şekiller denetlenmez** — orada ölçüt sensin;
     yalnız algoritmanın ürettiği *tam kopya* ve *üslup* aktarımları denetlenir.

   `🔧 Hepsinin yönünü düzelt` yalnız gidiş yönünü çevirir (kelimelerde parça
   sırasını da düzeltir); **nokta sayısı ve sınırlayıcı kutu birebir aynı
   kalır**, yani çizdiğin şekil değişmez.

   Her satırdaki **✓** düğmesi "bu Arapçaya göre doğru, bir daha uyarma"
   demektir. Onaylar `js/custom-data.js` içindeki `auditOk` alanına yazılır —
   yani başka tarayıcıda da geçerlidir. `Onayları geri al` ile sıfırlanır.
2. **Sapma.** `🔍 Sapmayı tara` her yolun harfin mürekkebinden en fazla ne kadar
   uzaklaştığını ölçer. Kalem kalınlığı mertebesi (font boyunun %10'u) doğaldır;
   fazlası animasyonda harfin dışına taşar ve elle yeniden yazmak gerekir.
   Bu otomatik düzeltilmez — listeden `▶` ile bakıp `✒️` ile rötuşlarsın.

### 📏 Çok denemeli öğrenme + anında sapma uyarısı

Tek bir yazı, o anki **el titremesini** de taşır; ucu birkaç piksel kayar ve yol
harfin dışına taşabilir (denetimde bulunan sapmaların kaynağı buydu). İki önlem:

* **Anında uyarı.** Kaydettiğin an yolun harften ne kadar uzaklaştığı ölçülür;
  %10'u aşarsa kalem hâlâ eldeyken söylenir ve `↻ Yeniden yaz` sunulur. Günler
  sonra denetimde bulmaktan iyidir.
* **`➕ Bunu deneme olarak ekle`.** Aynı biçimi 2–3 kez yaz, sonra
  `📐 Ortalamayı kullan`. Her hamle **yay uzunluğuna göre** 40 noktaya yeniden
  örneklenir ve karşılıklı noktaların ortalaması alınır. *Ölçüldü: ±9 piksel
  titremeyle yazılan 3 denemenin ortalaması, sapmayı %26'dan %7'ye düşürdü.*
  Hamle sayıları farklıysa ortalama **alınmaz** — farklı yazım mantıklarını
  karıştırmak yanlış olurdu; atölye bunu söyler.

### 🕘 Otomatik yedekler — geri alınabilir hata

Toplu her işlemden **önce** (öneri uygulama, yön düzeltme, kelime dersleri,
"hepsini sil", yedek yükleme) deponun fotoğrafı çekilir; son **10** tutulur.
Geri yüklemeden önce **mevcut hâlin de** fotoğrafı çekilir, yani "geri almayı
geri alma" da mümkündür. Liste ve `↩ Geri yükle` düğmesi **💾 Kalıcı Kayıt**
sekmesindedir.

Ayrıca her yol kaydı artık **sürüm damgası** taşır (`v`), böylece biçim
ileride değişirse eski kayıtlar tanınıp dönüştürülebilir.

### 🔗 Doğrudan proje dosyasına yazma

Klasörü **bir kez** bağlarsan (`🔗 Proje klasörünü bağla`), **her değişiklik**
— atölyede elle yazma, öneri uygulama, Çizim Yolu düzenleyicisindeki rötuş,
kelime düzenleme — `js/custom-paths.js` ve `js/custom-data.js` dosyalarına
**kendiliğinden yazılır**. Yazma `admin.js`'teki tek noktadan (`save()`) geçer
ve ~1,2 saniye geciktirilir; böylece 32 kelimelik toplu uygulama tek yazma
olur. Geriye yalnızca GitHub'a **push** etmek kalır.

> **Veri güvenliği:** Dosya her seferinde **sıfırdan değil, birleştirilerek**
> üretilir: `allPaths()` ve `mergedStore()` önce dosyadaki (gömülü) kayıtları
> alır, üstüne tarayıcıdaki taze düzenlemeleri koyar. Bu yüzden tarayıcı verisi
> bomboş olsa bile dosyayı yeniden yazmak **hiçbir şey kaybettirmez** —
> doğrulandı: boş depodan üretilen dosya, 188 yolun ve 64 üslup imzasının
> tamamını birebir korudu.

* Klasör seçimi tarayıcının *File System Access* yeteneğini kullanır ve
  IndexedDB'de hatırlanır; tarayıcıyı kapatıp açsan da bağlı kalır (tarayıcı
  bazen izni yenilemeni ister — tek tıklama).
* Seçilen klasörde `js/custom-paths.js` yoksa uyarır: yanlış klasörü seçmiş olursun.
* **Chrome / Edge (masaüstü)** destekler. Firefox, Safari ve mobilde şerit bunu
  söyler ve eski "indir ve kopyala" yolu çalışmaya devam eder.
* Aynı düğme yönetici panelindeki **💾 Kalıcı Kayıt** sekmesinde de vardır
  (orada ayrıca *"Sesler dâhil yaz"* seçeneği bulunur).

### Akış

1. Harfi ve biçimini seç (28 harf × 4 biçim).
2. Soluk harfin üzerine **doğal biçimde yaz**. Kalemi her kaldırışın yeni bir
   hamledir; **noktalar için tek dokunuş** yeter (kısa dokunuş nokta sayılır).
3. `▶ Önizle` ile öğrencinin göreceği animasyonu kaydetmeden dene. **Yazdıkların
   silinmez** — gösteri boyunca gizlenir, bitince aynen geri gelir.
4. `💾 Kaydet ve öğren` → yazdığın harf **anında** uygulanır; diğer hedefler
   için öneriler küçük önizlemelerle listelenir.
5. İstediklerini işaretle → `✔ Seçilenlere uygula`.
6. Proje klasörü bağlıysa **dosyaya yazma kendiliğinden olur**; değilse
   **💾 Kalıcı Kayıt** sekmesinden dosyaları indirip kopyala.

Öğrenilen imzalar `js/custom-data.js` içindeki `learned` alanına, uygulanan
yollar ise `js/custom-paths.js` dosyasına yazılır.

> **Hiçbir şey sessizce değişmez.** Yalnız kendi çizdiğin harf otomatik uygulanır;
> geri kalan her hedef senin onayınla değişir. Uygulanan yol hem **animasyonda**
> hem **öğrenci denetiminde** (strokecheck) kullanılır.

## Müfredattaki yeni öğretim birimleri

Hepsi **YENİ ÜNİTE**dir — mevcut adımlara dokunmaz, öğrencinin ilerlemesi bozulmaz.

### َ Harekeler (1. aşama)

Müfredattaki 94 kelimenin hepsi harekelidir; çocuk `بَاب` görüyor ve duyuyordu
ama **hiçbir ders bu işaretleri tanıtmıyordu**. Kapatılan boşluk:

| Adım | Ne yapar |
|---|---|
| `teach-haraka` | İşaretin adı, nereye konduğu, nasıl okuttuğu + sesi |
| `haraka-write` | İşareti harfin üstüne/altına **yazdırır** |
| `haraka-pick` | Sesi duyurup **işareti seçtirir** |

Fetha · kesra · damme · sükûn · şedde. Yazma denetimi dürüsttür: işaretin
**doğru tarafta** (üst/alt) ve **makul büyüklükte** olması ölçülür; şeklin
kendisi ölçülmez — o kadar küçük bir çizimde şekil denetimi güvenilir olmaz
ve haksız "hata" verirdi.

### ⋮ Noktalar (her aşama)

Yeni başlayanın en sık hatası ب/ت/ث ya da د/ذ karıştırmaktır: gövde aynı, fark
yalnız noktadır. Bu ünite **gövdeyi verir, noktayı çocuğa koydurur**.

Gövde, yapay bir çizim değil harfin **gerçek mürekkebidir**; yalnız nokta
bölgeleri `destination-out` ile silinir — böylece her yazı tipinde doğru çalışır.
İki denemeden sonra doğru yerler turuncu halkalarla gösterilir.

### 🔗 Bağlama (her aşama)

Arapçanın en zor kısmı harfleri bağlamaktır. Biçim üniteleri her biçimi ayrı
öğretir; burada iki harf **birlikte** yazılır. Hedef, harflerin kendisidir
(`ب`+`ا` → `با`) — biçimleri elle yapıştırmak (`بـ` + `ـا`) araya çift uzatma
çizgisi koyar ve yanlış şekil üretirdi. Ek ölçüt: **tek hamlede** bağlandı mı?

### 🔁 Bugünün dersi

Eskiden yalnız *aralıklı tekrarı* gelen adımları topluyordu. Artık iki kaynaktan
derlenir ve her satır **neden listelendiğini** taşır:

1. `weak` — çocuğun **zorlandığı** adımlar (denetim kayıtlarından, en çok
   başarısız olunan önce)
2. `due` — tekrar zamanı gelenler (en çok gecikmiş önce)

### 🎯 Sebebe göre gösterim

`strokecheck` hatayı zaten bir kodla döndürüyordu (`start`, `reverse`,
`dots-missing`, `proportion`, `baseline`…) ama çocuk bunu **yazı olarak**
okuyordu. Çocuk yazıyı okumaz, hareketi görür. Artık her hataya özel bir
gösterim düğmesi çıkar:

| Kod | Gösterim |
|---|---|
| `start` | Yolun yalnız ilk **%25**'i — nereden başlanacağı |
| `reverse` | İlk **%45** — hangi yöne gidileceği |
| `dots-*` | Gövde atlanır, nokta hedefleri **yanıp söner** |
| `proportion` · `baseline` | Tam gösterim (doğru büyüklük / satıra oturma) |

Öğrencinin çizdiği **silinmez**: gösteri boyunca gizlenir, bitince geri gelir.

### 🧩 Eksik harfi tamamla

Harfin yalın hâlini bilmek yetmez; asıl beceri, harfin **kelimedeki yerine
göre şekil değiştirdiğini** bilmektir. Bu ünite kelimeden bir harf çıkarır,
hangi harf olduğunu **söyler** ve yalın hâlini gösterir; çocuk onu kelimedeki
doğru biçimiyle (başta/ortada/sonda) yazar.

Ortadaki harfler önceliklidir (en öğretici olan odur). Hayalet **kapalı**
başlar — önce kendi denesin; iki denemeden sonra kendiliğinden açılır.

### ✍️ "Bu biçimi yaz" — Harf Şekilleri sayfasından

İzlemek yetmiyordu. Artık o an bakılan biçim doğrudan yazılabilir. Bu **serbest
alıştırmadır**: ilerlemeye yazılmaz, çocuk istediği kadar tekrar eder ve
bitince Harf Şekilleri'ne döner.

### Biçim sırası sağdan sola

Arapça sağdan sola okunur; biçim sekmeleri de öyle dizilir — en sağda
**Yalın**, sonra **Başta · Ortada · Sonda** sola doğru. DOM sırası değişmez
(klavye sırası ve kod mantığı bozulmaz); yalnız akış yönü çevrilir.

### İleri aşamalarda sonuç gizli

1–2. aşamada denklem sonucu görünür (parçaların nasıl birleştiği öğrenilsin).
**3. aşamadan sonra sonuç gizlenir**: çocuk parçalara bakıp kelimeyi zihninde
birleştirir; takılırsa `؟` kutusuna dokunup açabilir.

### 🎓 Harf oturması — "geçti" değil "oturdu"

Bir adımı bir kez geçmek, harfin elde oturduğu anlamına gelmez; el yazısı ancak
**farklı günlerde** tekrarlanınca yerleşir. Ölçü artık adım değil **harf**
düzeyindedir: bir harf, o harfi içeren denemelerde **farklı 3 günde %85+**
puanla yazıldıysa "oturdu" sayılır. Rapor ekranında 28 harflik ızgarada
gösterilir (`3/3` oturdu · `1/3` yolda · boş henüz başlanmadı).

## Yönetici (öğretmen) modu

Başlıktaki **🔧** düğmesi (ya da adres sonuna `#admin` eklemek) yönetici modunu açar.
Varsayılan PIN uygulamayla birlikte gelir; **Yedek** sekmesinden istediğin zaman
değiştirebilir ya da varsayılana döndürebilirsin.

| Sekme | Ne yapar |
|---|---|
| **Kelimeler** | Her satırda **✏️ Düzenle · ✒️ Yolu çiz · 🗑 Sil**; yeni kelime ekle |
| **Harfler** | Her harf kutusunda **✏️** düğmesi — ad, ses, "nasıl yazılır", not |
| **Çizim Yolu** | **Harfin/kelimenin yazım yolunu kendin çiz** |
| **Ses Kaydı** | **Kendi sesinle telaffuz kaydet** (28 harf + 94 kelime) |
| **💾 Kalıcı Kayıt** | Tarayıcıya bağlı olan her şeyi **uygulama dosyalarına** çevirir |
| **Yedek** | JSON’u **dosyaya kaydet / dosyadan yükle**, kopyala-yapıştır, hepsini sıfırla |

### 💾 Kalıcı Kayıt — “başka tarayıcıda kayboluyor” sorununun çözümü

Yönetici panelinde yapılan her değişiklik **önce o tarayıcının hafızasına** yazılır
(`localStorage` + `IndexedDB`). Tarayıcı hafızası tarayıcıya ve cihaza özeldir:
başka bir tarayıcıda, başka bir bilgisayarda ya da öğrencinin tabletinde
**görünmez**; tarayıcı verisi temizlenirse silinir. Site GitHub Pages gibi statik
bir yerde durduğu için yazacak bir sunucu yoktur — kalıcılık ancak değişikliklerin
**projenin dosyalarına** girmesiyle olur.

**💾 Kalıcı Kayıt** sekmesi tam olarak bunu yapar. Tek tabloda ne kadar değişikliğin
kalıcı olduğunu, ne kadarının hâlâ yalnızca tarayıcıda beklediğini gösterir ve
gereken dosyaları hazır üretir:

| Üretilen dosya | İçindekiler |
|---|---|
| `js/custom-paths.js` | Elle çizilen yazım yolları |
| `js/custom-audio.js` | Mikrofonla kaydedilen sesler (base64 gömülü) |
| `js/custom-data.js` | Harf/kelime metinleri, eklenen/silinen kelimeler, ayarlar, öğrenilen üsluplar |

**En kolay yol — 🔗 proje klasörünü bağla.** Sekmenin başındaki
`🔗 Proje klasörünü bağla` düğmesiyle projenin ana klasörünü **bir kez** seçersin;
bundan sonra `💾 Şimdi dosyalara yaz` (ve Öğretme Atölyesi'ndeki her kayıt)
dosyaları **doğrudan** günceller. İndirip kopyalamak gerekmez; geriye yalnızca
GitHub'a **push** etmek kalır. Chrome/Edge masaüstünde çalışır; desteklemeyen
tarayıcıda şerit bunu söyler ve aşağıdaki yol geçerli kalır.

**Klasik yol:** **⬇ Hepsini indir (3 dosya)** → inen dosyaları projedeki `js/` klasöründe
aynı adlı dosyaların üzerine kopyala → siteye yükle (GitHub’a **push** et) →
`Ctrl + F5`. Bundan sonra değişiklikler **her tarayıcıda, her cihazda** durur ve
tarayıcı verisi silinse bile kaybolmaz.

Aynı sekmedeki **Tam yedek (.json)** dosyası siteyi güncellemeden, yalnızca başka
bir tarayıcıya taşımak içindir; **sesler bu yedeğe dâhildir** (klasik *Yedek*
sekmesindeki JSON’a dâhil değildir).

### Ses kaydı

Cihazda Arapça ses paketi olmayabilir (test makinesinde yoktu). Kendi sesini
kaydedersen 🔊 düğmesi **senin sesini** çalar; kayıt yoksa cihazın Arapça sesine
düşer.

**Masaüstünde ses çıkmıyorsa** — `js/speech.js` beş ayrı sebebi karşılar:

| Sebep | Karşılığı |
|---|---|
| Sesler **asenkron** yüklenir; ilk `getVoices()` boş döner | `voicesReady()` beklenir |
| Chrome'da `cancel()` + `speak()` **yarışı** utterance'ı sessizce düşürür | cancel'den sonra bir tık beklenir |
| Chrome motoru **duraklatır**, sonraki konuşmalar hiç başlamaz | her konuşmadan önce `resume()` + düzenli ping |
| Tarayıcı, **sayfaya dokunulmadan** ses çalmayı engeller | 1,2 sn içinde başlamazsa dürüst uyarı |
| Arapça ses paketi **yok** | eskiden susuluyordu; artık varsayılan sesle yine okur + bir kez uyarır |

Ses Kaydı sekmesinin altında **🔎 Ses tanı** kutusu vardır: kaç ses yüklü,
Arapça var mı, son hata neydi, yüklü seslerin tam listesi ve bir **test**
düğmesi. Tahmin ettirmek yerine ölçüp gösterir.

Her satırda sesin **nerede durduğu** yazar:

* 💾 **tarayıcıda** — yalnızca bu tarayıcıda, **kalıcı değil**
* 📦 **uygulamada** — `js/custom-audio.js` içine gömülmüş, her yerde çalar

Çözümleme sırası: *tarayıcıdaki taze kayıt → uygulamaya gömülü kayıt → cihazın
Arapça TTS’i.* Kalıcılaştırılmamış ses varsa sekmenin başında sarı uyarı çıkar.

### Çizim yolu düzenleyici

123 hedef seçilebilir (28 harfin tekrar etmeyen tüm biçimleri + müfredattaki kelimeler).
Seçince, o an kullanılan yol düzenlemeye açılır (kayıtlı yol yoksa yazı tipinden
hesaplanan otomatik yol gelir).

**Hamleler (birden çok başlangıç).** Bir kelimede harfler ayrı yazılır — ör. `باب`
= `با` + `ب`. Bu yüzden yol tek parça değil, **hamle listesidir**; her hamlenin
kendi başlangıcı vardır ve numarası düğümün üstünde görünür (1, 2, 3 …).
Otomatik yol da bitişik parçalara göre kendiliğinden hamlelere ayrılır.
`＋ Yeni hamle` ile istediğin kadar yeni başlangıç ekleyebilirsin; her hamle ayrı
renkte çizilir, tek tek silinebilir ve `⇄` ile yönü ters çevrilebilir.

| Araç | İş |
|---|---|
| **✥ Taşı** | düğümleri ve noktaları sürükle |
| **＋ Nokta ekle** | aktif hamlenin sonuna nokta ekle |
| **⇱ Araya ekle** | iki düğümün arasına yeni düğüm sok |
| **🗑 Nokta sil** | düğüm kaldır |
| **🟠 Harf noktası** | tıkla = varsayılan boy · **sol üstten sağ alta sürükle = alanı sen belirle** · üstüne tıkla = sil |
| **✋ Kaydır** | tuvali kaydır (büyütülmüşken) |
| **↶ Geri al / ↷ Yinele** | 60 adımlık geçmiş |
| **➕ ➖ ⤢** | %50–%600 arası büyüt/küçült — noktaları hassas koymak için |
| **Mürekkebe yapış** | konulan düğümü harfin en yakın mürekkep pikseline çeker |
| **▶ Önizle** | animasyonu kaydetmeden dene |

**Boyut denetimleri** (üç kaydırıcı):

| Kaydırıcı | Neyi değiştirir | Nerede saklanır |
|---|---|---|
| **Boyanan alan** | Animasyonda harfi açan bandın genişliği. **Varsayılan %8.** `varsayılan` kutusunun işaretini kaldırıp %8–%90 arası istediğin değeri verebilirsin. | O harfin/kelimenin kaydında (`brush`) |
| **Başlangıç halkası** | **Öğrenciye görünen** yeşil başlangıç halkasının ve turuncu nokta halkalarının boyu (%40–%220) | Genel ayar (tüm harfler) |
| **Hareket eden kalem ucu** | Yazarken yol boyunca ilerleyen yeşil topun boyu (%20–%200) | Genel ayar (tüm harfler) |
| **Tutamak boyu** | Düzenleyicideki düğüm tutamaklarının boyu (%50–%200) | Genel ayar (yalnızca yönetici görünümü) |

Boyanan alan, tuvalde **mavi saydam bir bant** olarak canlı gösterilir; kaydırıcıyı
oynattıkça daralıp genişler, böylece "çok geniş boyuyor" durumunu görerek ayarlarsın.

### ⬇ Video indir (yalnızca yönetici sayfasında)

Seçili harfin/kelimenin yazım animasyonunu **.webm video** olarak indirir —
öğrenciye WhatsApp'tan göndermek, sunuma koymak ya da tahtada oynatmak için.

* Dosya adı: `harf-ح-isolated.webm`, `kelime-باب.webm` gibi.
* 800×450, 30 kare/sn, ~3,2 sn + 1 sn bekleme; o an ekrandaki ayarlar
  (boyanan alan, kalem ucu, çok hamleli yol) videoya aynen yansır.
* Kayıt sırasında bir **önizleme penceresi** açılır. Bu şart: tarayıcılar
  görünmeyen tuvalden kare yakalamadığı için gizli kayıt boş dosya üretiyordu.
  Bu yüzden kayıt bitince dosya boyutu denetlenir; kare yakalanamamışsa bozuk
  dosya indirmek yerine "sekmeyi ön planda tutup tekrar dene" uyarısı verilir.
* Biçim WebM'dir (Chrome, Edge, Firefox oynatır). MP4 gerekiyorsa dönüştürmen gerekir.

Harf noktaları ayrı bir listede de görünür; her birinin yanındaki **✕** ile tek tek
silinir, çapı (`ø`) listede yazar.

Yeşil düğüm **başlangıç**, mor düğüm **bitiş**, oklar yazım yönüdür — yani kalemin
nereden başlayıp sona nasıl gideceğini tamamen sen belirlersin.

### 💾 Çizimlerin kalıcılığı (önemli)

Elle çizdiğin yollar **iki yerde** durabilir:

1. **Tarayıcıda** (`localStorage`) — kaydeder kaydetmez geçerli olur, ama tarayıcı
   verisi silinirse kaybolur.
2. **Uygulamanın içinde** (`js/custom-paths.js`) — `💾 Uygulamaya kaydet` düğmesi
   (ya da **💾 Kalıcı Kayıt** sekmesi) bu dosyanın yeni içeriğini üretip indirir;
   indirileni `js/` klasöründeki dosyayla değiştirdiğinde çizimlerin **projenin bir
   parçası** olur. Siteyi yayınlıyorsan dosyayı yüklemeyi (push) unutma — asıl
   “başka tarayıcıda kayboluyor” sorununu çözen adım budur.

Çözümleme sırası: *tarayıcıdaki taze düzenleme → uygulamadaki dosya → otomatik yol.*

**Kural:** `js/custom-paths.js` içeriği **senin açık onayın olmadan değiştirilmez
veya silinmez.** Müfredat/veri güncellemeleri bu yolları etkilemez; anahtarlar
harfin/kelimenin kendisidir (`"ب"`, `"باب"`), dolayısıyla ders eklenip çıkarılması
kaydını bozmaz. Çizimi silebilecek her işlem (otomatik yola dönme, kaydı silme,
yedek içe aktarma, "tümünü sil") artık **önce onay sorar** ve kaç çizimin
etkileneceğini söyler.

Doğrulandı: tarayıcı verisinin tamamı silindikten sonra bile `js/custom-paths.js`
içindeki yol birebir aynı koordinatlarla yüklendi; düzenlenmemiş harfler otomatik
yolla çalışmaya devam etti.

Kaydedilen yol **hem animasyonda hem öğrenci denetiminde** kullanılır. Doğrulandı:
ت için yol ters yönde kaydedildiğinde, harfi eski (özgün) yönde yazan öğrenci
%58 alıp reddedildi; yöneticinin tanımladığı yönde yazınca %100 aldı.

Çok hamleli yollarda animasyon da hamleler arasında **kalemi kaldırır** (aradaki
boşluğa iz bırakmaz) ve öğrenci denetimi her hamlenin başlangıcını ayrı bilir:
`باب` için 2. hamleden (soldaki harften) başlayan öğrenci %76 alıp reddedildi,
doğru sırada yazan %98 aldı.

Yollar tuval ölçüsünden bağımsız saklanır (u = sağ kenardan sola / harf genişliği,
v = satır çizgisinden aşağı / font boyu; noktalarda ayrıca yarıçap), bu yüzden
büyütme/kaydırma ya da ekran boyutu değişince bozulmaz.

> **Güvenlik notu:** PIN bir kolaylık kilididir, güvenlik değildir. Uygulama tamamen
> tarayıcıda çalıştığı için dosyalara erişebilen herkes bunu aşabilir; amaç yalnızca
> öğrencinin yanlışlıkla ayarları bozmasını önlemektir. Değişiklikler bu tarayıcının
> `localStorage`'ında durur — **her tarayıcıda kalıcı** olsun istiyorsan
> **💾 Kalıcı Kayıt** sekmesinden dosyaları üretip projeye koy.

## Yazım denetimi — "nasıl yazdı?"

Kaynak: **"كراسة خط النسخ للمبتدئين"** — منصة الخطاط, الخطاط مختار عالم
(kitapçıkta her harf, yönü oklarla ve aşamaları numaralarla gösterilen tek sürekli
kalem hareketiyle yazılır; noktalar en sona bırakılır).

Uygulama "şekil benziyor mu?" diye bakmaz; **yazım disiplinini** ölçer:

| Ölçüt | Ne denetler |
|---|---|
| **Başlangıç** | Kalemi doğru uçtan mı indirdi? (yeşil halka) |
| **Yön / Sıra** | Hareketi doğru yönde, baştan sona mı sürdürdü? |
| **Şekil** | Harfin gövdesini ne kadar doğru kapladı? |
| **Noktalar** | Kaç tane, doğru yerde mi? (turuncu halkalar) |
| **Büyüklük** | Harf, olması gereken boyutta mı? (kılavuz çizgileri dolduruyor mu) |
| **Satıra oturma** | Harf satır çizgisine oturuyor mu, yoksa kaymış mı? |

### Satır hizası düzeltmesi

Yazı tiplerinin "alphabetic" taban çizgisi, Arapça harflerin gerçekte **oturduğu**
satır değildir. Ölçüldüğünde ا د ذ ط ظ ك ف ه ت ث ب gibi düz tabanlı harfler kırmızı
satırın **~0,06 em üstünde havada** kalıyordu (160 px boyutta ~9 px). Artık uygulama
açılışta bu farkı yazı tipinden ölçüp metni o kadar aşağı kaydırıyor; ölçüm yazı
tipine göre yapıldığı için `fonts/` klasörüne başka bir yazı tipi koysan da doğru
çalışır. Otomatik test bunu sürekli denetler: **11 düz tabanlı harfte ortalama sapma
0,004 em.**

### Noktalar

Parmakla tek dokunuşta konulan nokta, çizgi hiç hareket etmediği için "uzunluk 0"
oluyordu ve nokta sayılmıyordu; gövdeye karışıp hem "nokta eksik" hem de "yanlış
yerden başladın" hatası veriyordu. Artık tek dokunuşlar da nokta olarak tanınıyor ve
nokta boyutu eşiği daha geniş.

Son iki ölçüt kitapçığın ölçü anlayışından gelir (harfler nokta ölçüsüyle tanımlanır)
ve yeni başlayanın en sık iki hatasını yakalar: harfi çok küçük yazmak ve satırdan
kaydırmak. Ölçüm, harfin dış hattına değil **takip edilen yola** göre yapılır.

Geçmek için **%80** *ve* şu üç şart: doğru başlangıç, doğru yön, eksiksiz ve yerinde
noktalar. Yani harfi **ters yönden** kusursuz çizen öğrenci **geçemez** — şekil %100
olsa bile puan ~%50'de kalır ve "TERS UÇTAN başladın" uyarısı verilir. Aynı şekilde
gövdesi mükemmel ama **noktasız** bir ب, %84 alsa da kabul edilmez.

Aynı denetim **kelimelerde de** çalışır (باب, ثبت, حجاب …). Kelime birden çok
bitişik parçadan oluşabildiği için (ör. با + ب) parçalar sağdan sola sıralanır ve
kalemin **en sağdaki harften** başlaması beklenir. Başlangıç iki ölçütle birlikte
denetlenir: doğru noktaya uzaklık **ve** yol üzerindeki konum — böylece harfin
ortasından başlayan öğrenci de yakalanır. Hata mesajı duruma göre değişir:

| Öğrenci ne yaptı | Sonuç |
|---|---|
| Doğru sırada yazdı | %100 — geçti |
| **Soldaki (son) harften** başladı | %79 — "Arapça sağdan sola yazılır" |
| Harfin **ortasından** başladı | %87 ama **reddedildi** — "ORTADAN başlamışsın" |

Kontrolden sonra tuvalde **kırmızı halka** öğrencinin gerçekte başladığı yeri,
**yeşil halka** başlaması gereken yeri gösterir; ikisi arasına kesik çizgi çekilir.
Bitirdiği yer de ayrıca işaretlenir.

İki başarısız denemeden sonra harfin soluk hâli (hayalet) otomatik açılır, üçüncüden
sonra animasyon yeniden oynatılır — öğrenci takılıp kalmaz.

### Harfin orta ekseni nereden geliyor?

Yazılış yolu elle koordinat girilerek tanımlanmadı (yazı tipi değişince bozulurdu).
`skeleton.js` ekrandaki **gerçek harften** hesaplar:

```
maske → bileşenlere ayır (gövde + noktalar) → inceltme (Zhang–Suen)
      → çıkıntıları buda → uçtan uca yürü (BFS) → sadeleştir (RDP)
```

Böylece yol harfin tam ortasından geçer, **noktaların yeri piksel piksel ölçülür**
(bazı yazı tiplerinde ت/ث noktaları birleşik çizildiği için beklenen sayıya göre
k-ortalama ile ayrılır). `letterforms.js` yalnızca kitapçıktan gelen pedagojik
bilgiyi taşır: hangi uçtan başlanır, hangi aşamalar, kaç nokta nereye.

Animasyon da bu yolu kullanır: harfin gerçek yazı tipi görüntüsü, yol boyunca
maskelenerek **açılır** — yani öğrenci gerçek harf biçimini doğru sırayla
yazılırken izler.

### Kelime ünitesinin akışı

ÖĞREN (kelime + anlamı + denklemi + 🔊) → **KUR** (sürükle-bırak) → **YAZ** (tuval).

### Aşama sınavı

* Tanıma + anlam + form yeri soruları, ardından **ezberden yazma**.
* Yazma sorularında **hayalet kapalıdır**; öğrenci sadece Türkçe karşılığı görür.
* Her soruda **2 hak**, ipucu yok, "şimdilik geç" yok.
* Geçme notu **%70**. Geçilemezse sınav sıfırlanır ve baştan alınır.
* Sınav bir ölçme aracıdır; hiçbir dersi kilitlemez (kilit yoktur).

## Müfredat — 28 harfin tamamı

Aşamalar kitapçığın **şekil ailelerini** izler; her aşamanın kelimeleri yalnızca
**o ana kadar öğretilmiş harflerden** kurulur (kümülatif iskele).

| Aşama | Harfler | Ailenin özelliği |
|---|---|---|
| 1 | ا ب ت ث | Çanak ailesi — aynı gövde, farklı nokta |
| 2 | ج ح خ | Kayık ailesi — kuyruk satırın altına iner |
| 3 | د ذ ر ز | Bağlanmayan kısa harfler |
| 4 | س ش ص ض | Dişli ve gözlü harfler |
| 5 | ط ظ ع غ | Boğaz harfleri, iki hamleli Tı |
| 6 | ف ق ك ل | Gözlü ve dik harfler |
| 7 | م ن ه و ي | Son beş harf; He’nin dört yüzü |

Toplam **94 kelime/hece alıştırması**. Türkçeye geçmiş **ortak kelimeler**
önceliklidir: تاج (Tac), تخت (Taht), بخت (Baht), بحث (Bahis), درس (Ders),
كتاب (Kitap), قلم (Kalem), عقل (Akıl), صبر (Sabır), خبر (Haber), نور (Nur),
سلام (Selam)…

Denklemler (bağlı biçimler) **elle yazılmaz**, `buildEquation()` ile bağlanma
kuralından üretilir — böylece "بـ ـا ب" gibi dizilişlerde insan hatası olmaz.
`test.html` her kelimede denklemin kelimeye eşit olduğunu ve **öğretilmemiş harf
kullanılmadığını** ayrıca doğrular.

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `index.html` | Uygulama kabuğu; **yönetici araçlarını yüklemez** (istek üzerine gelir) |
| `js/overrides.js` | Küçük katman: içerik düzenlemelerini uygular + yolları okur + admin'i istek üzerine yükler |
| `js/backup.js` | **Güvenlik ağı**: toplu işlemlerden önce otomatik anlık görüntü (IndexedDB, son 10) |
| `js/admin-audio.js` | Yönetici panelinin ses sekmesi (admin.js'ten ayrıldı) |
| `js/custom-learn.js` | **Kalıcı**: üslup imzaları — yalnız `studio.html` yükler |
| `css/style.css` | Tüm görsel katman (duyarlı tasarım dahil) |
| `studio.html` · `js/studio.js` | **🎓 Öğretme Atölyesi** — öğretmen yazar, uygulama öğrenir |
| `js/learn.js` | **Öğrenme motoru**: üslup imzası çıkarma ve hedeflere taşıma |
| `js/projectfile.js` | **Doğrudan proje dosyasına yazma** (File System Access) |
| `test.html` | **Otomatik testler** — 1500+ kontrol, tek tıkla |
| `js/data.js` | 28 harflik alfabe + 7 aşamalık **müfredat** + `buildEquation()` |
| `js/letterforms.js` | Kitapçıktan gelen **yazım kuralları**: başlangıç ucu, aşamalar, noktalar |
| `js/admin.js` | **Yönetici modu**: içerik + çizim yolu + ses kaydı + kalıcı kayıt + yedek + video |
| `js/audio.js` | Öğretmenin ses kayıtları (IndexedDB + uygulamaya gömülü katman) |
| `js/custom-paths.js` | **Kalıcı**: uygulamaya gömülmüş çizim yolları |
| `js/custom-audio.js` | **Kalıcı**: uygulamaya gömülmüş ses kayıtları |
| `js/custom-data.js` | **Kalıcı**: gömülmüş düzenlemeler + üslup imzaları (`learned`) + denetim onayları (`auditOk`) |
| `js/i18n.js` | Arayüz dili (Türkçe / Arapça) |
| `sw.js` · `manifest.webmanifest` | Çevrimdışı çalışma ve tablete kurulum |
| `js/skeleton.js` | Harfin orta eksenini ve nokta yerlerini yazı tipinden çıkarır |
| `js/strokecheck.js` | **Yazım denetimi**: başlangıç · yön · şekil · noktalar (%80) |
| `js/course.js` | Veriyi doğrusal ünite/adım dizisine çevirir, soruları üretir |
| — | *Kelime adımında yazım **önce gösterilir** (▶ düğmesi + açılışta bir kez).* |
| `js/storage.js` | İlerleme ve sınav notları (kilit yok) |
| `js/app.js` | İki ekran: yol haritası + adım oynatıcı; ders bitince **sıradaki derse otomatik geçiş** |
| `js/tracing.js` | Yazma tuvali: kılavuz çizgiler, hayalet, **kalem gösterisi (animasyon)**; noktalar **sağdan sola** sıralanır |
| `js/assembly.js` | Sürükle-bırak kelime kurma |
| `js/speech.js` | Web Speech API (`ar-SA`) telaffuz |
| `js/confetti.js` | Ödül animasyonu |

Modüller ES module değil, klasik `<script>` olarak yüklenir ve `window.AH` ad alanını
paylaşır — böylece `file://` üzerinden çift tıklayarak açılabilir.

## Öne çıkan teknik ayrıntılar

**İki ayrı denetim vardır.**

*Harflerde* (yukarıdaki "Yazım denetimi" bölümü) başlangıç, yön, şekil ve noktalar
birlikte ölçülür; geçme %80. Bu bir harf **tanıma** (OCR) sistemi değildir — kalemin
izlediği yolu referans orta eksenle karşılaştırır. Öğrencinin çizgisini yola izdüşürüp
ilerleyişin tek yönlü olup olmadığına bakar; bu yüzden "şekli doğru ama yöntemi yanlış"
durumları yakalayabilir.

*Kelimelerde* de aynı denetim çalışır; tek fark, referans yolun bitişik parçalara
bölünmesi ve başlangıcın **en sağdaki harfe** göre belirlenmesidir.

Kelime alıştırmalarında iki başarısız denemeden sonra "şimdilik geç" çıkar (öğrenci
takılmasın); **sınavda çıkmaz**.

### Sınırlar (dürüstçe)

* Yazım yönü kitapçığın **şekil ailelerinden** gelir. Diyagramı doğrudan görülen
  aileler `booklet`, aynı iskeleti paylaşan kardeş harfler (ذ↔د, ز↔ر, ش↔س, ض↔ص,
  ظ↔ط, غ↔ع, ق↔ف, ي↔ن …) `family` olarak işaretlidir; arayüzde bu belirtilir.
* Orta eksen tek sürekli bir yoldur. Gerçekte iki kalem hareketiyle yazılan
  harflerde (ör. ك) gövde tek hamlede gösterilir, ayrı duran iç işaret ise en sona
  bırakılır — sıralama doğrudur, ama "iki ayrı hamle" olduğu ayrıca vurgulanmaz.
* Denetim kalemin izlediği yolu ölçer; kalem **kaç kez kaldırıldığını** puanlamaz.

**Sürükle-bırak her cihazda aynı kod yolu.** HTML5 Drag & Drop mobilde çalışmadığı için
Pointer Events üzerine kuruldu; ayrıca *parçaya dokun → yuvaya dokun* şeklinde klavyeyle
de çalışan ikinci bir yol var.

**Telaffuz cihaza bağlıdır.** Web Speech API işletim sistemindeki Arapça ses paketini
kullanır. Yoksa uygulama bunu gizlemez: uyarır ve dinleme sorularında harfin adını
ipucu olarak yazar (Windows: Ayarlar → Saat ve Dil → Dil → Arapça konuşma paketi).

## Müfredatı genişletme

Yeni aşama eklemek için `js/data.js` içindeki `STAGES` dizisine bir nesne ekle:

```js
{
  stageId: 3,
  title: '3. Aşama',
  lettersLabel: 'د · ذ · ر · ز',
  subtitle: '…', intro: '…',
  letters: [{ char:'د', name:'Dal', sound:'D sesi',
              write:'Nasıl yazılacağının tarifi…',
              forms:{ isolated:'د', initial:'د', medial:'ـد', final:'ـد' },
              note:'…', dots:'Noktasız' }],
  exercises: {
    twoLetters: [], threeLetters: [],
    cumulative: [{ id:'s3-k-bad', equation:['بـ','ـا','د'], result:'باد',
                   vowelled:'بَاد', tr:'…', kind:'kelime', tag:'Ortak Kelime', note:'…' }]
  }
}
```

`js/course.js` bundan üniteleri, adımları ve sınav sorularını **otomatik** üretir;
yüzdeler kendiliğinden işler. Tek şart: `id` alanları benzersiz olmalı
(ilerleme anahtarı olarak kullanılırlar).

Yeni harfin **yazılışının** öğretilmesi için `js/letterforms.js` içine de bir kayıt
gerekir — sadece kural, koordinat değil:

```js
'د': { family: DAL, dots: { count: 0, side: null } }
// DAL = { isolated: { startRule:'top', phases:[…], startTip:'…', dirTip:'…' }, … }
```

`startRule` kalemin hangi uçtan başlayacağını söyler (`top`, `right`, `left`,
`topleft`, `topright`, `bottom`). Harfin orta ekseni ve nokta konumları yazı
tipinden ölçüldüğü için başka veri girmeye gerek yoktur. Kaydı olmayan harflerde
İZLE/YAZ adımları üretilmez; harf yalnızca kelime alıştırmalarında görünür.

## İlerleme verisi

`localStorage` anahtarları:

| Anahtar | İçerik |
|---|---|
| `arapca-harfler-profiles-v1` | Öğrenci listesi ve seçili öğrenci |
| `arapca-harfler-course-v3::<profil>` | O öğrencinin ilerlemesi, tekrar planı, yıldız, seri, deneme kaydı |
| `arapca-harfler-prefs-v2` | Animasyon hızı |
| `arapca-harfler-lang-v1` | Arayüz dili |
| `arapca-harfler-admin-v1` | Yönetici değişiklikleri (**↺ Sıfırla bunu silmez**) |

Ses kayıtları ayrıca **IndexedDB**’de (`arapca-harfler-audio`) durur.
Eski `arapca-harfler-course-v2` verisi ilk açılışta otomatik taşınır.

```json
{ "v":2, "steps": { "<adımId>": 0-100 }, "exams": { "<aşamaId>": 0-100 }, "last": "<üniteId>" }
```

Üst çubuktaki **↺ Sıfırla** tümünü temizler.

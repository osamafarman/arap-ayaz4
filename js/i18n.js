/* =========================================================================
   i18n.js — Arayüz dili (Türkçe / Arapça)

   KAPSAM — dürüstçe:
   Çevrilen şey ARAYÜZDÜR (düğmeler, ekran başlıkları, yönetici paneli).
   DERS İÇERİĞİ (harf adları "Elif/Be", kelimelerin Türkçe karşılıkları,
   yazım ipuçları) Türkçe kalır — çünkü öğrenci Türkçe konuşuyor ve bu
   metinler öğretimin kendisidir. Arapça seçeneği, uygulamayı yöneten
   Arapça konuşan öğretmen içindir.
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});
  const KEY = 'arapca-harfler-lang-v1';

  const AR = {
    /* kabuk */
    'Arapça Yazı Atölyesi': 'ورشة الخط العربي',
    'Adım adım: öğren · çalış · sınav ol': 'خطوة بخطوة: تعلّم · تدرّب · اختبر',
    '↺ Sıfırla': '↺ تصفير',
    'Yönetici modu (öğretmen)': 'وضع المشرف (المعلّم)',
    'Tüm ilerlemeyi sıfırla': 'تصفير كل التقدّم',

    /* harita */
    'Hoş geldin! 👋': 'أهلًا بك! 👋',
    'Kaldığın yerden devam et': 'تابع من حيث توقفت',
    'Derse Başla ➜': 'ابدأ الدرس ➜',
    'Devam Et ➜': 'تابع ➜',
    'Harf Şekilleri': 'أشكال الحروف',
    'Çalışma Kâğıdı': 'ورقة تدريب',
    'Bugünün tekrarı': 'مراجعة اليوم',
    'Başla ➜': 'ابدأ ➜',
    'Rapor': 'تقرير',
    'Öğrenciler': 'الطلاب',
    'ünite': 'وحدة',
    'BURADASIN': 'أنت هنا',

    /* oynatıcı */
    'ÖĞREN': 'تعلّم',
    'İZLE': 'شاهد',
    'TAKİP': 'تتبّع',
    'YAZ': 'اكتب',
    'KUR': 'ركّب',
    'KONTROL': 'تحقّق',
    'SINAV': 'اختبار',
    'Devam ➜': 'تابع ➜',
    'Anladım, yazalım ➜': 'فهمت، لنكتب ➜',
    'Şimdi ben deneyeyim ➜': 'الآن أجرّب بنفسي ➜',
    'Şimdi kuralım ➜': 'لنركّبها الآن ➜',
    '✔ Kontrol Et': '✔ تحقّق',
    '▶ Tekrar izle': '▶ شاهد مرة أخرى',
    '▶ Göster': '▶ اعرض',
    '↶ Geri Al': '↶ تراجع',
    '🗑 Temizle': '🗑 امسح',
    'Derslere dön': 'العودة إلى الدروس',
    'Geri': 'رجوع',
    'Ders tamamlandı!': 'اكتمل الدرس!',
    'Sıradaki ders ➜': 'الدرس التالي ➜',
    'Sırada': 'التالي',
    'saniye sonra başlıyor…': 'ثانية ويبدأ…',
    'Tüm dersleri bitirdin. 🎉': 'أنهيت كل الدروس. 🎉',
    'Hız': 'السرعة',
    'Normal': 'عادي',

    /* yönetici */
    'Yönetici Modu': 'وضع المشرف',
    'Kelimeler': 'الكلمات',
    'Harfler': 'الحروف',
    'Çizim Yolu': 'مسار الرسم',
    'Ses Kaydı': 'تسجيل الصوت',
    '💾 Kalıcı Kayıt': '💾 حفظ دائم',
    'Yedek': 'نسخة احتياطية',
    '✕ Kapat': '✕ إغلاق',
    'Kaydet': 'حفظ',
    'Vazgeç': 'إلغاء',
    'Sil': 'حذف',
    'Düzenle': 'تحرير',
    'Yolu kaydet': 'حفظ المسار',
    '⬇ Video indir': '⬇ تنزيل فيديو',
    '⬇⬇ Tüm biçimler': '⬇⬇ كل الأشكال',
    '🖨 Yazdır': '🖨 طباعة',

    /* öğretme atölyesi */
    'Öğretme Atölyesi': 'ورشة التعليم',
    'Sen yaz — uygulama üslubunu öğrensin': 'اكتب أنت — والتطبيق يتعلّم أسلوبك',
    'Uygulama': 'التطبيق',
    'Uygulamaya dön': 'العودة إلى التطبيق',
    'Bu sayfa öğretmen içindir.': 'هذه الصفحة للمعلّم.',
    'Hangi harfi öğreteceksin?': 'أي حرف تريد أن تعلّمني إياه؟',
    'Yalın': 'منفصلة',
    'Başta': 'في البداية',
    'Ortada': 'في الوسط',
    'Sonda': 'في النهاية',
    'Bu biçimi daha önce öğrettin.': 'علّمتني هذا الشكل من قبل.',
    'Öğrendiğimi unut': 'انسَ ما تعلّمته',
    'Bu biçimi henüz öğretmedin — otomatik yol kullanılıyor.':
      'لم تعلّمني هذا الشكل بعد — يُستخدم المسار التلقائي.',
    'Kendi elinle yaz': 'اكتب بخط يدك',
    ['Soluk harfin üzerinden doğal biçimde yaz. Kalemi her kaldırışın yeni bir hamledir. ' +
     'Noktaları koymak için tek dokunuş yeter — en sona bırak.']:
      'اكتب فوق الحرف الباهت بشكل طبيعي. كل رفع للقلم يبدأ حركة جديدة. ' +
      'لوضع النقاط تكفي نقرة واحدة — واتركها إلى النهاية.',
    'Yazma alanı': 'مساحة الكتابة',
    'Soluk harf': 'الحرف الباهت',
    'Önizle': 'معاينة',
    'Kalem kalınlığı': 'سماكة القلم',
    'Kaydet ve öğren': 'احفظ وتعلّم',
    'Öğretilen biçim': 'الأشكال المعلَّمة',
    'Önce harfi yaz.': 'اكتب الحرف أولاً.',
    'Yazı okunamadı — biraz daha uzun çiz.': 'لم أستطع قراءة الخط — ارسم خطاً أطول قليلاً.',
    'Kaydedilemedi.': 'تعذّر الحفظ.',
    'öğrenildi ve uygulandı.': 'تم تعلّمه وتطبيقه.',
    'Öğrendiğimi nereye uygulayayım?': 'أين أطبّق ما تعلّمته؟',
    'Hiçbiri sen onaylamadan uygulanmaz. Önizlemelere bak, istediklerini işaretle.':
      'لا يُطبّق شيء دون موافقتك. انظر إلى المعاينات وأشّر على ما تريد.',
    'Tam kopya': 'نسخ مطابق',
    'Üslup': 'نقل أسلوب',
    'aynı iskelet — çizgilerin birebir taşınır': 'نفس الهيكل — تُنقل خطوطك حرفياً',
    'şekil farklı — yalnız başlangıç, yön, hamle sayısı, nokta ve kalem taşınır':
      'الشكل مختلف — يُنقل فقط مكان البدء والاتجاه وعدد الحركات والنقاط وسماكة القلم',
    'Harf biçimleri': 'أشكال الحروف',
    /* 'Kelimeler' yukarıda (yönetici sekmeleri) zaten tanımlı */
    ['Kelimelerde şekil bütün olarak farklıdır; buradaki aktarım yalnız ÜSLUPTUR ' +
     '(başlangıç ucu, yön, kalem kalınlığı, nokta boyu).']:
      'في الكلمات يختلف الشكل كلياً؛ المنقول هنا هو الأسلوب فقط ' +
      '(مكان البدء، الاتجاه، سماكة القلم، حجم النقطة).',
    'Hepsini seç': 'اختر الكل',
    'Hiçbiri': 'لا شيء',
    'Seçilenlere uygula': 'طبّق على المحدد',
    'Seçili': 'المحدد',
    'Hiçbiri seçili değil': 'لم تحدد شيئاً',
    'Önce uygulanacakları işaretle.': 'أشّر أولاً على ما تريد تطبيقه.',
    'Seçilen': 'سيتم تغيير',
    'hedefin yazım yolu değiştirilecek. Devam edilsin mi?': 'هدفاً. هل أتابع؟',
    'Uygulanıyor': 'جارٍ التطبيق',
    'hedefe uygulandı. “Kalıcı Kayıt” ile dosyaya gömmeyi unutma.':
      'هدفاً. لا تنسَ التثبيت الدائم من تبويب «الحفظ الدائم».',
    'hesaplanamadı': 'تعذّر الحساب',
    'hesaplanıyor': 'جارٍ الحساب',

    /* atölye: sekmeler + durum panosu */
    'Öğret': 'علّمني',
    'Durum Panosu': 'لوحة التقدّم',
    'Nerede kaldık?': 'أين وصلنا؟',
    'şekil senin üslubunla kaydedildi': 'شكلاً حُفظ بأسلوبك',
    'Kendi elinle': 'بخط يدك',
    'Elle çizilmiş (eski düzenleyici)': 'مرسوم يدوياً (المحرر القديم)',
    'Otomatik (yazı tipinden)': 'تلقائي (من الخط)',
    'Harf kutusuna dokunursan o biçimi öğretmeye geçersin.':
      'المس أي مربّع حرف لتنتقل إلى تعليم ذلك الشكل.',
    'kaynak': 'المصدر',
    'bu biçim yalın hâlle aynı': 'هذا الشكل مطابق للمنفصلة',
    'Tamamlanması için ne kaldı?': 'ماذا بقي كي تكتمل العملية؟',
    'Hiç öğretilmemiş harfler': 'حروف لم تُعلَّم إطلاقاً',
    'her biri için yalın hâli yazman, kardeş harfleri de kapatır:':
      'كتابة الشكل المنفصل لكل منها تغطي حروفه الشقيقة أيضاً:',
    'Bütün harflerde en az bir biçim öğretildi.': 'كل الحروف عُلِّم منها شكل واحد على الأقل.',
    'Bazı biçimleri eksik': 'ينقصها بعض الأشكال',
    'biçim': 'شكل',
    'Kelimelerde bekleyen': 'المتبقي في الكلمات',
    'bir harfi öğrettikten sonra “Kelimeler” listesinden toplu uygulayabilirsin.':
      'بعد تعليم حرف يمكنك تطبيقه على الكلمات دفعة واحدة من قائمة «الكلمات».',
    'Bütün kelimeler kaydedildi.': 'كل الكلمات محفوظة.',

    /* atölye: proje dosyasına doğrudan yazma */
    'Bu tarayıcı doğrudan dosyaya yazmayı desteklemiyor.':
      'هذا المتصفح لا يدعم الكتابة المباشرة في الملف.',
    'Kayıtlar tarayıcıda tutulur; kalıcı yapmak için dosyayı indirip kopyalaman gerekir.':
      'تُحفظ التعديلات في المتصفح؛ ولجعلها دائمة يلزم تنزيل الملف ونسخه.',
    'Chrome veya Edge': 'كروم أو إيدج',
    'ile doğrudan yazabilirsin.': 'يمكنك الكتابة مباشرة.',
    ['Değişiklikler şu an yalnızca tarayıcıda. Proje klasörünü bağlarsan ' +
     'her kayıt doğrudan js/custom-paths.js dosyasına yazılır.']:
      'التعديلات الآن في المتصفح فقط. إذا ربطت مجلد المشروع فسيُكتب كل حفظ ' +
      'مباشرة في الملف js/custom-paths.js.',
    'Proje klasörünü bağla': 'اربط مجلد المشروع',
    'Proje klasörü hatırlanıyor ama tarayıcı izni yeniden istiyor.':
      'المجلد محفوظ لكن المتصفح يطلب الإذن من جديد.',
    'İzni yenile': 'جدّد الإذن',
    'İzin yenilendi.': 'تم تجديد الإذن.',
    'Bağlı klasör': 'المجلد المربوط',
    'kayıtlar doğrudan dosyaya yazılıyor.': 'الحفظ يُكتب مباشرة في الملف.',
    'Şimdi yaz': 'اكتب الآن',
    'Bağlantıyı kaldır': 'ألغِ الربط',
    'Bağlandı': 'تم الربط',
    'Önce proje klasörünü bağla.': 'اربط مجلد المشروع أولاً.',
    'yazılıyor': 'جارٍ الكتابة',
    'Dosyaya yazıldı': 'كُتب في الملف',
    'Dosyaya yazılamadı': 'تعذّرت الكتابة في الملف',
    'hedefe uygulandı ve proje dosyasına yazıldı.': 'هدفاً — وكُتب في ملف المشروع.',

    /* atölye: kelime kipi + gözden geçirme + çizim yolu köprüsü */
    'Neyi öğreteceksin?': 'ماذا تريد أن تعلّمني؟',
    'Harf biçimi': 'شكل حرف',
    'Kelime': 'كلمة',
    'Kelime seç': 'اختر كلمة',
    'Önceki': 'السابق',
    'Sonraki': 'التالي',
    'Sonraki kelime': 'الكلمة التالية',
    'Bunu daha önce öğrettin.': 'علّمتني هذا من قبل.',
    'İnce ayar (Çizim Yolu)': 'ضبط دقيق (مسار الرسم)',
    'Bu şekil için çizim yolu düzenleyicisi açılamadı.': 'تعذّر فتح محرر المسار لهذا الشكل.',
    'Kaydedildi': 'تم الحفظ',
    ['Kelime yazımı yalnızca bu kelimeye işlenir — ' +
     'kelimelerin şekli birbirine benzemediği için başka kelimeye taşınmaz.']:
      'كتابة الكلمة تُطبّق على هذه الكلمة وحدها — لأن أشكال الكلمات لا تتشابه فلا تُنقل إلى غيرها.',
    'Kutuya dokun → hareketi izle, oradan da düzelt.':
      'المس أي مربّع ← شاهد الحركة وصحّحها من هناك.',
    'Hepsini sırayla izle': 'شاهد الكل بالتتابع',
    'Yalnız öğrettiklerimi izle': 'شاهد ما علّمته فقط',
    'izle': 'شاهد',
    'Henüz hiçbir şey öğretmedin.': 'لم تعلّمني شيئاً بعد.',
    'Tekrar izle': 'أعد المشاهدة',
    'Sırayla oynat': 'تشغيل متتابع',
    'Elle yaz': 'اكتب بيدك',

    /* atölye: denetim */
    'Denetim — gözle görülmeyen hatalar': 'فحص — أخطاء لا تُرى بالعين',
    ['şekilde YÖN hatası var: yazım soldan başlıyor ya da hamle ters gidiyor. ' +
     'Çocuk yanlış yönü öğrenir.']:
      'شكلاً فيه خطأ اتجاه: الكتابة تبدأ من اليسار أو الحركة معكوسة. الطفل سيتعلّم الاتجاه الخطأ.',
    'Hepsinin yönünü düzelt': 'صحّح اتجاه الجميع',
    'Şeklin değişmez — yalnız gidiş yönü çevrilir.': 'شكل خطك لا يتغيّر — يُعكس الاتجاه فقط.',
    'soldan başlıyor': 'يبدأ من اليسار',
    'parça sırası ters': 'ترتيب المقاطع معكوس',
    'ilk parça ters': 'المقطع الأول معكوس',
    'hamle ters': 'حركة معكوسة',
    'kural': 'القاعدة',
    'Üslup imzaları': 'بصمات الأسلوب',
    ['yol, telefon hizalaması olmadan kaydedilmiş. Telefonda başka bir Arapça ' +
     'yazı tipi olduğu için yol harften kayar.']:
      'مسارًا محفوظ بلا محاذاة للهاتف. لاختلاف الخط العربي في الهاتف ينزاح المسار عن الحرف.',
    'Telefonlar için hizala': 'حاذِ للهواتف',
    ['Bu düğmeye, yolları ÇİZDİĞİN bilgisayarda bas — ' +
     'ölçü oradaki yazı tipinden alınır.']:
      'اضغط هذا الزر على الحاسوب الذي رسمت عليه المسارات — يُؤخذ القياس من خطّه.',
    'Bütün yollarda telefon hizalaması var.': 'كل المسارات فيها محاذاة للهاتف.',
    ['Kayıtlı yollara telefon hizalaması eklenecek. Çizimlerin ' +
     'DEĞİŞMEZ; yalnız harfin mürekkep ölçüsü kaydedilir. Devam?']:
      'ستُضاف محاذاة الهاتف إلى المسارات المحفوظة. رسومك لا تتغيّر؛ يُحفظ قياس حبر الحرف فقط. أتابع؟',
    'yol telefonlar için hizalandı.': 'مسارًا حوذي للهواتف.',
    'bu tarayıcıda': 'في هذا المتصفح',
    'dosyada': 'في الملف',
    'imza henüz dosyaya yazılmamış.': 'بصمة لم تُكتب في الملف بعد.',
    'Şimdi dosyaya yaz': 'اكتبها في الملف الآن',
    'Yazıldı': 'تمت الكتابة',
    'Sayfayı yenileyince dosyadaki sayı güncellenir.':
      'سيتحدّث العدد في الملف بعد تحديث الصفحة.',
    'Yazılamadı': 'تعذّرت الكتابة',
    'Hareketi izle': 'شاهد الحركة',
    'Arapçaya göre doğru — bir daha uyarma': 'صحيح حسب العربية — لا تنبّهني ثانية',
    'şekli "doğru" diye onaylamıştın; listelenmiyor.': 'شكلاً أقررت أنه صحيح؛ لا يُعرض.',
    'Onayları geri al': 'تراجع عن الإقرارات',
    'Bütün "doğru" onayları geri alınsın mı?': 'هل أتراجع عن كل إقرارات «صحيح»؟',

    /* atölye: kelimeden harf dersi */
    'Bu kelimeden şu harfleri de öğrendim': 'تعلّمت من هذه الكلمة هذه الحروف أيضاً',
    ['Kelimede TEK BAŞINA duran (bitişmeyen) parçalar, ' +
     'o harf biçiminin dersidir. İşaretlersen harfe ve kardeşlerine uygulanır.']:
      'المقاطع المنفصلة (غير المتّصلة) في الكلمة هي درسٌ لذلك الشكل. ' +
      'إن أشّرت عليها تُطبَّق على الحرف وعلى أشقائه.',
    'Seçilen harf derslerini uygula': 'طبّق دروس الحروف المحددة',
    'Kelimeden': 'من الكلمة',
    ['Bu kelimeden ayrı bir harf dersi çıkarılamadı — ' +
     'harfler birbirine bitişik olduğu için hangi çizginin nerede bittiği kestirilemez.']:
      'لم أستطع استخراج درس حرف مستقل من هذه الكلمة — الحروف متّصلة فلا يمكن تحديد أين ينتهي كل خط.',
    'harf biçimi senin kelime yazından öğrenilecek. Devam?':
      'شكل حرف سيُتعلَّم من كتابتك للكلمة. أتابع؟',
    'harf biçimi kelimeden öğrenildi.': 'شكل حرف تُعلِّم من الكلمة.',

    /* atölye: anında sapma uyarısı + çok denemeli öğrenme */
    'Yol harfin üstünde': 'المسار فوق الحرف',
    'Yazın harften %': 'خطّك يخرج عن الحرف بـ',
    'dışarı taşıyor': '٪',
    'sınır': 'الحد',
    'Animasyonda göze çarpar.': 'سيظهر ذلك في الحركة.',
    'Yeniden yaz': 'أعد الكتابة',
    'Tuval temizlendi — harfe daha yakın yaz.': 'مُسحت اللوحة — اكتب أقرب إلى الحرف.',
    'Bunu deneme olarak ekle': 'أضِفها كمحاولة',
    'Deneme eklendi': 'أُضيفت محاولة',
    'deneme birikti': 'محاولات مجمّعة',
    'Ortalamaları alınabilir — el titremesi sönümlenir.':
      'يمكن أخذ متوسطها — فيخفّ ارتعاش اليد.',
    'Hamle sayıları farklı': 'عدد الحركات مختلف',
    'ortalama alınamaz; aynı mantıkla yeniden yaz.':
      'لا يمكن أخذ المتوسط؛ أعد الكتابة بنفس الطريقة.',
    'Ortalamayı kullan': 'استخدم المتوسط',
    'Denemeleri sil': 'احذف المحاولات',
    'Hamle sayıları farklı — ortalama alınamadı.': 'عدد الحركات مختلف — تعذّر أخذ المتوسط.',
    'denemenin ortalaması uygulandı.': 'محاولات طُبِّق متوسطها.',
    'Yön hatası yok — hepsi sağdan sola.': 'لا خطأ في الاتجاه — الكل من اليمين إلى اليسار.',
    'Yolun harften sapması': 'انحراف المسار عن الحرف',
    ['şekilde yol harfin dışına taşıyor (sınır %10). Animasyonda göze çarpar; ' +
     'elle yeniden yazmak ya da ince ayar yapmak gerekir.']:
      'شكلاً يخرج مساره عن الحرف (الحد ١٠٪). يظهر ذلك في الحركة؛ يحتاج إعادة كتابة أو ضبطاً دقيقاً.',
    'sapma': 'انحراف',
    'Bütün yollar harfin üstünde.': 'كل المسارات فوق الحرف.',
    'Sapmayı tara': 'افحص الانحراف',
    'Yön hatası olan': 'سيتم تصحيح',
    'şekil düzeltilecek. Çizdiğin ŞEKİL değişmez, yalnız yön çevrilir. Devam?':
      'شكلاً فيه خطأ اتجاه. شكل خطك لا يتغيّر، يُعكس الاتجاه فقط. أتابع؟',
    'şeklin yönü düzeltildi.': 'شكلاً صُحّح اتجاهه.',
    'Bu biçim için öğrendiklerim silinsin mi? (Uygulanmış yollar kalır)':
      'هل أحذف ما تعلّمته لهذا الشكل؟ (المسارات المطبَّقة تبقى)',
    'Geri Al': 'تراجع',
    'Temizle': 'امسح'
  };

  let lang = (function () {
    try { return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'tr'; } catch (e) { return 'tr'; }
  })();

  function get() { return lang; }
  function isAr() { return lang === 'ar'; }

  function set(l) {
    lang = (l === 'ar') ? 'ar' : 'tr';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    applyDocument();
  }
  function toggle() { set(lang === 'ar' ? 'tr' : 'ar'); }

  /** Arayüz metnini çevirir; karşılığı yoksa aynen bırakır. */
  function t(s) {
    if (lang !== 'ar') return s;
    return Object.prototype.hasOwnProperty.call(AR, s) ? AR[s] : s;
  }

  /** Sayfa yönü ve kabuk metinleri. */
  function applyDocument() {
    const html = document.documentElement;
    html.setAttribute('lang', lang === 'ar' ? 'ar' : 'tr');
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.body.classList.toggle('lang-ar', lang === 'ar');
    /* sabit kabuk metinleri */
    const map = [
      ['.brand h1', 'Arapça Yazı Atölyesi'],
      ['.brand p', 'Adım adım: öğren · çalış · sınav ol'],
      ['#reset-btn', '↺ Sıfırla']
    ];
    map.forEach(([sel, key]) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = t(key);
    });
    const lb = document.getElementById('lang-btn');
    if (lb) lb.textContent = lang === 'ar' ? 'TR' : 'ع';
  }

  AH.i18n = { t, get, set, toggle, isAr, applyDocument, DICT: AR };
})();

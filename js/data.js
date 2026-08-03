/* =========================================================================
   data.js — Müfredat verisi (Kümülatif İskele Yöntemi)

   • ALPHABET : 28 harfin tamamı (ad, ses, yazım tarifi, nokta bilgisi, biçimler)
   • STAGES   : 7 aşama — her aşama yeni bir harf ailesi + o ana kadar
                öğrenilen TÜM harflerle kurulan kelimeler
   • buildEquation(word) : kelimenin bağlı biçimlerini KURALDAN üretir
                (elle yazılan denklemlerdeki hata riskini ortadan kaldırır)
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const FORM_LABELS = {
    isolated: 'Yalın',
    initial: 'Başta',
    medial: 'Ortada',
    final: 'Sonda'
  };

  /* Kendinden SONRAKİ harfe bağlanmayanlar */
  const NO_FORWARD = 'ادذرزوأإآ';
  const T = 'ـ';   /* tatvil / bağlantı çizgisi */

  function joinsForward(ch) { return NO_FORWARD.indexOf(ch) < 0; }

  /* ---------------------------------------------------------------------
     ALFABE — 28 harf
     [char, ad, ses, nokta sayısı, nokta yeri, nokta metni, yazım tarifi, not]
     --------------------------------------------------------------------- */
  const RAW = [
    ['ا', 'Elif', 'A / E — uzatma harfi', 0, '', 'Noktasız',
      'Yukarıdan aşağıya tek bir dik çizgi. Kalemi hiç kaldırma.',
      'Elif kendinden SONRAKİ harfe bağlanmaz.'],
    ['ب', 'Be', 'B sesi (Türkçedeki "b" ile aynı)', 1, 'altta', 'Altta 1 nokta',
      'Sağdan sola geniş bir çanak çiz, ucunu yukarı kaldır. Sonra noktayı çanağın ALTINA koy.',
      'Çanak şeklinde gövde. Nokta gövdenin ALTINDA, tek.'],
    ['ت', 'Te', 'T sesi', 2, 'üstte', 'Üstte 2 nokta',
      'Be ile aynı çanağı çiz. Sonra ÜSTÜNE yan yana iki nokta koy.',
      'Be ile aynı gövde. Nokta ÜSTTE ve iki tane.'],
    ['ث', 'Se', 'Peltek S — İngilizce "think" içindeki "th" gibi', 3, 'üstte', 'Üstte 3 nokta',
      'Yine aynı çanak. Üstüne üç noktayı üçgen şeklinde koy: ikisi altta, biri üstte.',
      'Yine aynı gövde. Nokta ÜSTTE ve üç tane.'],
    ['ج', 'Cim', 'C sesi ("cam", "cüz")', 1, 'kayığın içinde', 'İçte 1 nokta',
      'Üstte küçük bir başlık çiz, sonra satırın ALTINA inen derin bir kayık çek. Noktayı kayığın içine koy.',
      'Ortada ve başta iken üst kısmı üçgen bir başlığa dönüşür.'],
    ['ح', 'Ha', 'Boğazdan gelen nefesli H', 0, '', 'Noktasız',
      'Cim ile birebir aynı kayığı çiz — ama hiç nokta koyma.',
      'Cim ile aynı gövde; farkı noktasının olmaması.'],
    ['خ', 'Hı', 'Gırtlaktan hırıltılı H (Almanca "Bach")', 1, 'üstte', 'Üstte 1 nokta',
      'Aynı kayık. Noktayı kayığın DIŞINA, üst tarafına koy.',
      'Aynı gövde, nokta ÜSTTE ve tek.'],

    ['د', 'Dal', 'D sesi', 0, '', 'Noktasız',
      'Üst uçtan başla, aşağı-sola in; satırın üstünde kısa bir kuyrukla bitir.',
      'Kendinden SONRAKİ harfe bağlanmaz. Kuyruğu satırın altına inmez.'],
    ['ذ', 'Zel', 'Peltek Z — İngilizce "this" gibi', 1, 'üstte', 'Üstte 1 nokta',
      'Dal ile aynı gövde; sonra üstüne tek nokta koy.',
      'Dal ile aynı; tek farkı üstteki nokta. O da bağlanmaz.'],
    ['ر', 'Ra', 'Titrek R', 0, '', 'Noktasız',
      'Üstten aşağı in ve sola kıvrıl; kuyruk satırın ALTINA taşar.',
      'Dal’dan farkı: kuyruğu satırın ALTINA iner. Bağlanmaz.'],
    ['ز', 'Ze', 'Z sesi', 1, 'üstte', 'Üstte 1 nokta',
      'Ra ile aynı; sonra üstüne tek nokta koy.',
      'Ra ile aynı gövde, üstte tek nokta. Bağlanmaz.'],

    ['س', 'Sin', 'S sesi', 0, '', 'Noktasız',
      'Sağdaki ilk dişten başla, üç küçük dişi sırayla yap, sonra büyük çanağı sola çiz.',
      'Üç diş + geniş çanak. Şın ile aynı gövde.'],
    ['ش', 'Şın', 'Ş sesi', 3, 'üstte', 'Üstte 3 nokta',
      'Sin ile aynı; üç noktayı dişlerin üstüne üçgen olarak koy.',
      'Sin ile aynı gövde, üstte üç nokta.'],
    ['ص', 'Sad', 'Kalın S (tefhim)', 0, '', 'Noktasız',
      'Gözü üstten sağa çiz ve kapat, sonra satıra inip çanağı sola süpür.',
      'Kalın okunan harflerdendir. Dad ile aynı gövde.'],
    ['ض', 'Dad', 'Kalın D (tefhim)', 1, 'üstte', 'Üstte 1 nokta',
      'Sad ile aynı; gözün üstüne tek nokta koy.',
      'Sad ile aynı gövde, üstte tek nokta.'],

    ['ط', 'Tı', 'Kalın T (tefhim)', 0, '', 'Noktasız',
      'Önce yatık gövdeyi sağdan sola çiz; dik çizgiyi EN SONA, yukarıdan aşağıya çek.',
      'İki hamleli harf: önce gövde, sonra dik çizgi.'],
    ['ظ', 'Zı', 'Kalın peltek Z', 1, 'üstte', 'Üstte 1 nokta',
      'Tı ile aynı; gövdenin üstüne tek nokta koy.',
      'Tı ile aynı gövde, üstte tek nokta.'],
    ['ع', 'Ayn', 'Boğazdan gelen özel ses', 0, '', 'Noktasız',
      'Başlığın ağzı sağa bakar; sonra aşağı inip kuyruğu sola süpür.',
      'Ortada ve sonda başlığı kapanır — biçimleri çok değişir.'],
    ['غ', 'Gayn', 'Gırtlaktan Ğ/G', 1, 'üstte', 'Üstte 1 nokta',
      'Ayn ile aynı; üstüne tek nokta koy.',
      'Ayn ile aynı gövde, üstte tek nokta.'],

    ['ف', 'Fe', 'F sesi', 1, 'üstte', 'Üstte 1 nokta',
      'Yuvarlak gözü sağdan başlayıp çiz ve kapat, sonra gövdeyi satırda sola götür.',
      'Gözü küçük, gövdesi satırda yatay.'],
    ['ق', 'Kaf', 'Gırtlaktan kalın K', 2, 'üstte', 'Üstte 2 nokta',
      'Fe gibi göz çiz; ama kuyruğu satırın ALTINA inen derin bir çanaktır. Üstüne iki nokta.',
      'Fe’den farkı: derin çanak ve üstte iki nokta.'],
    ['ك', 'Kef', 'K sesi', 0, '', 'Noktasız',
      'Dik çizgiyi tepeden aşağı in, satırda sola süpür; içteki küçük işareti EN SONA koy.',
      'İçindeki küçük işaret NOKTA DEĞİLDİR, harfin parçasıdır.'],
    ['ل', 'Lam', 'L sesi', 0, '', 'Noktasız',
      'Dik çizgiyi tepeden in, satırın altında geniş bir kıvrımla sola dön.',
      'Elif’e benzer ama altta geniş bir çanağı vardır.'],

    ['م', 'Mim', 'M sesi', 0, '', 'Noktasız',
      'Küçük yuvarlak başı çiz, satıra otur, kuyruğu satırın altına indir.',
      'Yuvarlak başı küçük ve kapalıdır.'],
    ['ن', 'Nun', 'N sesi', 1, 'üstte', 'Üstte 1 nokta',
      'Sağ üstten aşağı in, derin çanağı sola çiz; üstüne tek nokta koy.',
      'Be’den farkı: çanağı daha derin ve yuvarlaktır.'],
    ['ه', 'He', 'İnce H sesi', 0, '', 'Noktasız',
      'Yuvarlağı çizip kapat.',
      'Biçimleri birbirinden ÇOK farklıdır; dört hâlini ayrı ayrı çalış.'],
    ['و', 'Vav', 'V sesi / U-Û uzatma', 0, '', 'Noktasız',
      'Yuvarlak başı çiz, sonra kuyruğu satırın altına indir.',
      'Kendinden SONRAKİ harfe bağlanmaz.'],
    ['ي', 'Ye', 'Y sesi / İ-Î uzatma', 2, 'altta', 'Altta 2 nokta',
      'Nun gibi derin çanağı çiz; iki noktayı ALTINA koy.',
      'Nokta ALTTA — Nun ve Be ile karıştırma.']
  ];

  const ALPHABET = RAW.map(([char, name, sound, dots, dotSide, dotsText, write, note]) => {
    const j = joinsForward(char);
    return {
      char, name, sound, dots, dotSide, dotsText, write, note,
      joinsForward: j,
      forms: {
        isolated: char,
        initial: j ? char + T : char,
        medial: j ? T + char + T : T + char,
        final: T + char
      }
    };
  });

  const BY_CHAR = {};
  ALPHABET.forEach((L) => { BY_CHAR[L.char] = L; });

  function getLetter(char) { return BY_CHAR[char] || null; }

  function dotsInWord(word) {
    let n = 0;
    for (const ch of String(word || '')) {
      const L = getLetter(ch === 'أ' || ch === 'إ' || ch === 'آ' ? 'ا' : ch);
      if (L) n += L.dots;
    }
    return n;
  }

  /* ---------------------------------------------------------------------
     Denklem üretici — kelimenin bağlı biçimlerini kuraldan hesaplar.
     Örn. "بحث" → ["بـ","ـحـ","ـث"] ,  "باب" → ["بـ","ـا","ب"]
     --------------------------------------------------------------------- */
  function buildEquation(word) {
    const chars = Array.from(String(word || ''));
    return chars.map((ch, i) => {
      const prev = i > 0 ? chars[i - 1] : null;
      const toPrev = !!prev && joinsForward(prev);       /* önceki bana bağlanıyor mu */
      const toNext = i < chars.length - 1 && joinsForward(ch);
      return (toPrev ? T : '') + ch + (toNext ? T : '');
    });
  }

  /* ---------------------------------------------------------------------
     Kelime tanımı kısayolu: denklem otomatik üretilir.
     --------------------------------------------------------------------- */
  function W(id, result, vowelled, tr, opts) {
    const o = opts || {};
    return {
      id, result, vowelled, tr,
      equation: buildEquation(result),
      kind: o.kind || 'kelime',
      tag: o.tag || null,
      note: o.note || ''
    };
  }

  /* ---------------------------------------------------------------------
     AŞAMALAR
     --------------------------------------------------------------------- */
  const STAGE_DEFS = [
    {
      stageId: 1,
      title: '1. Aşama',
      letters: ['ا', 'ب', 'ت', 'ث'],
      subtitle: 'Elif, Be, Te, Se — çanak biçimli harf ailesi',
      intro: 'Bu ailede ب, ت ve ث tamamen aynı gövdeye sahiptir; sadece noktaları farklıdır. ' +
             'Elif (ا) ise kendinden sonraki harfe bağlanmaz — bu kuralı en baştan hissetmen gerekir.',
      twoLetters: [
        W('s1-2-ba', 'با', 'بَا', 'Ba (uzatmalı hece)', { kind: 'hece', note: 'Be başta olduğu için kuyruğu kesilir: بـ' }),
        W('s1-2-ta', 'تا', 'تَا', 'Ta (uzatmalı hece)', { kind: 'hece', note: 'Gövde Be ile aynı, sadece iki nokta üstte.' }),
        W('s1-2-sa', 'ثا', 'ثَا', 'Sa (peltek s ile hece)', { kind: 'hece', note: 'Üç noktayı üstte üçgen şeklinde yerleştir.' }),
        W('s1-2-ab', 'أب', 'أَب', 'Baba', { tag: 'İlk Kelimen', note: 'Elif bağlanmadığı için Be YALIN formda kalır: ب' })
      ],
      threeLetters: [
        W('s1-3-bab', 'باب', 'بَاب', 'Kapı', { note: 'Elif’ten sonra gelen Be tekrar yalın yazılır.' }),
        W('s1-3-bat', 'بات', 'بَات', 'Geceledi', { note: 'باب ile aynı iskelet; son harfin noktaları değişti.' }),
        W('s1-3-tab', 'تاب', 'تَابَ', 'Tövbe etti', { tag: 'Ortak Kök', note: 'Türkçedeki "tövbe" bu köktendir.' }),
        W('s1-3-sabet', 'ثبت', 'ثَبَتَ', 'Sabit oldu', { tag: 'Ortak Kelime', note: '"Sabit", "ispat", "sebat" hep bu köktendir. Üç harf de bağlı!' }),
        W('s1-3-sab', 'ثاب', 'ثَابَ', 'Geri döndü', { tag: 'Ortak Kök', note: '"Sevap" (ثواب) kelimesinin kökü.' })
      ],
      cumulative: []
    },

    {
      stageId: 2,
      title: '2. Aşama',
      letters: ['ج', 'ح', 'خ'],
      subtitle: 'Cim, Ha, Hı — kayık biçimli harf ailesi',
      intro: 'Üçü de aynı gövdeye sahip; fark yine noktada. Bu harflerin kuyruğu satır çizgisinin ' +
             'ALTINA taşar. Artık 1. Aşama harfleriyle birleştirerek gerçek kelimeler yazacaksın.',
      twoLetters: [
        W('s2-2-ca', 'جا', 'جَا', 'Ca (hece)', { kind: 'hece', note: 'Cim başta iken kuyruğunu kaybeder: جـ' }),
        W('s2-2-ha', 'حا', 'حَا', 'Ha (hece)', { kind: 'hece', note: 'Noktasız olan tek kardeş.' }),
        W('s2-2-hi', 'خا', 'خَا', 'Hı (hece)', { kind: 'hece', note: 'Noktayı üst köşeye koy.' }),
        W('s2-2-hac', 'حج', 'حَجّ', 'Hac', { tag: 'Ortak Kelime', note: 'İki kardeş harf yan yana: gövdeler aynı, noktalar farklı.' })
      ],
      threeLetters: [
        W('s2-3-huc', 'حجج', 'حُجَج', 'Deliller (hüccetler)', { tag: 'Ortak Kök', note: 'Üç kayık peş peşe — bağlantı çalışması.' }),
        W('s2-3-hah', 'خاح', 'خَاح', 'Alıştırma birleşimi (anlamsız)', { kind: 'hece', note: 'Elif sonrası Ha yalın yazılır — kuralı pekiştiren tekrar.' })
      ],
      cumulative: [
        W('s2-k-tac', 'تاج', 'تَاج', 'Tac / Taç', { tag: 'Ortak Kelime', note: '1. Aşamadan Te + 2. Aşamadan Cim.' }),
        W('s2-k-taht', 'تخت', 'تَخْت', 'Taht', { tag: 'Ortak Kelime', note: 'Üç harf de birbirine bağlı.' }),
        W('s2-k-baht', 'بخت', 'بَخْت', 'Baht / Şans', { tag: 'Ortak Kelime', note: 'تخت ile aynı iskelet — ilk harfin noktası altta.' }),
        W('s2-k-bahs', 'بحث', 'بَحْث', 'Araştırma / Bahis', { tag: 'Ortak Kelime', note: '"Bahsetmek", "mübahase" bu köktendir.' }),
        W('s2-k-hub', 'حب', 'حُبّ', 'Sevgi', { tag: 'Ortak Kök', note: '"Muhabbet", "habib" hep bu köktendir.' }),
        W('s2-k-ah', 'أخ', 'أَخ', 'Erkek kardeş', { tag: 'Ortak Kök', note: 'Elif bağlanmaz → Hı YALIN formda kalır.' }),
        W('s2-k-uht', 'أخت', 'أُخْت', 'Kız kardeş', { note: 'Elif’ten sonra Hı BAŞTA, Te SONDA biçimini alır.' }),
        W('s2-k-hicab', 'حجاب', 'حِجَاب', 'Hicap / Örtü', { tag: 'Ustalık', note: 'Bağlan → bağlan → Elif’te kopar.' })
      ]
    },

    {
      stageId: 3,
      title: '3. Aşama',
      letters: ['د', 'ذ', 'ر', 'ز'],
      subtitle: 'Dal, Zel, Ra, Ze — bağlanmayan kısa harfler',
      intro: 'Dördü de kendinden SONRAKİ harfe bağlanmaz — tıpkı Elif gibi. Dal ile Ra’yı ' +
             'karıştırma: Dal satırın üstünde kalır, Ra’nın kuyruğu satırın altına iner.',
      twoLetters: [
        W('s3-2-da', 'دا', 'دَا', 'Da (hece)', { kind: 'hece', note: 'Dal bağlanmadığı için Elif yalın kalır.' }),
        W('s3-2-ra', 'را', 'رَا', 'Ra (hece)', { kind: 'hece', note: 'Ra’nın kuyruğu satırın altına iner.' }),
        W('s3-2-cedd', 'جد', 'جَدّ', 'Dede / ata', { tag: 'Ortak Kök', note: '"Cet", "ecdat" bu köktendir.' }),
        W('s3-2-rab', 'رب', 'رَبّ', 'Rab / sahip', { tag: 'Ortak Kelime', note: 'Ra bağlanmaz; Be yalın yazılır.' })
      ],
      threeLetters: [
        W('s3-3-dar', 'دار', 'دَار', 'Ev / yurt', { tag: 'Ortak Kelime', note: '"Diyar" bu köktendir. Üç harf de ayrı yazılır!' }),
        W('s3-3-berd', 'برد', 'بَرْد', 'Soğuk', { tag: 'Ortak Kök', note: 'Be bağlanır, Ra bağlanmaz.' }),
        W('s3-3-harace', 'خرج', 'خَرَجَ', 'Çıktı', { tag: 'Ortak Kök', note: '"Hariç", "harici" bu köktendir.' }),
        W('s3-3-hazer', 'حذر', 'حَذَر', 'Dikkat / sakınma', { tag: 'Ortak Kelime', note: '"Hazer", "tahzir" bu köktendir.' }),
        W('s3-3-ehaze', 'أخذ', 'أَخَذَ', 'Aldı', { note: 'Elif bağlanmaz → Hı yalın değil, BAŞTA biçiminde.' })
      ],
      cumulative: [
        W('s3-k-bahr', 'بحر', 'بَحْر', 'Deniz', { tag: 'Ortak Kelime', note: '"Bahriye", "bahir" bu köktendir.' }),
        W('s3-k-haber', 'خبر', 'خَبَر', 'Haber', { tag: 'Ortak Kelime', note: 'Türkçeye aynen geçmiştir.' }),
        W('s3-k-hacer', 'حجر', 'حَجَر', 'Taş', { tag: 'Ortak Kelime', note: '"Hacer" ismi bu köktendir.' }),
        W('s3-k-bedr', 'بدر', 'بَدْر', 'Dolunay', { tag: 'Ortak Kelime', note: '"Bedir" ismi bu köktendir.' }),
        W('s3-k-hubz', 'خبز', 'خُبْز', 'Ekmek', { note: 'Ze bağlanmaz ve sonda kalır.' }),
        W('s3-k-cezer', 'جزر', 'جَزَر', 'Havuç', { note: 'Cim başta, Ze ortada ama bağlanmıyor.' })
      ]
    },

    {
      stageId: 4,
      title: '4. Aşama',
      letters: ['س', 'ش', 'ص', 'ض'],
      subtitle: 'Sin, Şın, Sad, Dad — dişli ve gözlü harfler',
      intro: 'Sin ile Şın aynı gövdedir (üç diş + çanak); Sad ile Dad da aynıdır (göz + çanak). ' +
             'Sad ve Dad "kalın" okunur — ağzını doldurarak söyle.',
      twoLetters: [
        W('s4-2-sa', 'سا', 'سَا', 'Sa (hece)', { kind: 'hece', note: 'Üç dişten sonra Elif gelir.' }),
        W('s4-2-şa', 'شا', 'شَا', 'Şa (hece)', { kind: 'hece', note: 'Sin ile aynı, üstte üç nokta.' }),
        W('s4-2-sada', 'صا', 'صَا', 'Sa (kalın, hece)', { kind: 'hece', note: 'Gözü kapatmayı unutma.' }),
        W('s4-2-sedd', 'سد', 'سَدّ', 'Set / baraj', { tag: 'Ortak Kelime', note: 'Türkçedeki "sed/set" bu köktendir.' })
      ],
      threeLetters: [
        W('s4-3-ders', 'درس', 'دَرْس', 'Ders', { tag: 'Ortak Kelime', note: 'Türkçeye aynen geçmiştir. Dal ve Ra bağlanmaz!' }),
        W('s4-3-şecer', 'شجر', 'شَجَر', 'Ağaç', { tag: 'Ortak Kök', note: '"Şecere" (soy ağacı) bu köktendir.' }),
        W('s4-3-sabr', 'صبر', 'صَبْر', 'Sabır', { tag: 'Ortak Kelime', note: 'Üç harf de bağlı.' }),
        W('s4-3-seher', 'سحر', 'سَحَر', 'Seher (şafak vakti)', { tag: 'Ortak Kelime', note: 'Sin + Ha bağlanır, Ra sonda.' })
      ],
      cumulative: [
        W('s4-k-beşer', 'بشر', 'بَشَر', 'İnsan', { tag: 'Ortak Kök', note: '"Beşer", "beşeri" bu köktendir.' }),
        W('s4-k-hazır', 'حضر', 'حَضَرَ', 'Hazır oldu', { tag: 'Ortak Kök', note: '"Hazır", "huzur" bu köktendir.' }),
        W('s4-k-esed', 'أسد', 'أَسَد', 'Aslan', { tag: 'Ortak Kök', note: 'Elif bağlanmaz; Sin BAŞTA biçiminde.' }),
        W('s4-k-cisr', 'جسر', 'جِسْر', 'Köprü', { note: 'Cim + Sin bağlı, Ra sonda.' }),
        W('s4-k-sahr', 'صخر', 'صَخْر', 'Kaya', { note: 'Sad + Hı bağlı.' }),
        W('s4-k-şerh', 'شرح', 'شَرَحَ', 'Açıkladı', { tag: 'Ortak Kelime', note: '"Şerh etmek" bu köktendir. Ra bağlanmaz.' })
      ]
    },

    {
      stageId: 5,
      title: '5. Aşama',
      letters: ['ط', 'ظ', 'ع', 'غ'],
      subtitle: 'Tı, Zı, Ayn, Gayn — boğaz harfleri',
      intro: 'Tı ve Zı iki hamleyle yazılır: önce gövde, sonra dik çizgi. Ayn ve Gayn ise ' +
             'biçimden biçime en çok değişen harflerdir — dört hâlini ayrı ayrı çalış.',
      twoLetters: [
        W('s5-2-ta', 'طا', 'طَا', 'Tı (kalın, hece)', { kind: 'hece', note: 'Dik çizgiyi en sona bırak.' }),
        W('s5-2-aa', 'عا', 'عَا', 'A (ayn ile hece)', { kind: 'hece', note: 'Başlığın ağzı sağa bakar.' }),
        W('s5-2-ga', 'غا', 'غَا', 'Ğa (hece)', { kind: 'hece', note: 'Ayn ile aynı, üstte tek nokta.' }),
        W('s5-2-hazz', 'حظ', 'حَظّ', 'Şans / pay', { tag: 'Ortak Kelime', note: '"Hazz almak" bu köktendir.' })
      ],
      threeLetters: [
        W('s5-3-abd', 'عبد', 'عَبْد', 'Kul', { tag: 'Ortak Kök', note: '"Abdullah", "abd" bu köktendir.' }),
        W('s5-3-garb', 'غرب', 'غَرْب', 'Batı', { tag: 'Ortak Kelime', note: '"Garp", "gurbet" bu köktendir.' }),
        W('s5-3-asr', 'عصر', 'عَصْر', 'Asır / ikindi', { tag: 'Ortak Kelime', note: 'Ayn + Sad bağlı, Ra sonda.' }),
        W('s5-3-taba', 'طبع', 'طَبَعَ', 'Bastı / mühürledi', { tag: 'Ortak Kök', note: '"Matbaa", "tabiat" bu köktendir.' })
      ],
      cumulative: [
        W('s5-k-arab', 'عرب', 'عَرَب', 'Araplar', { tag: 'Ortak Kelime', note: 'Ayn başta, Ra bağlanmaz.' }),
        W('s5-k-sab', 'صعب', 'صَعْب', 'Zor', { tag: 'Ortak Kök', note: '"Suubet" bu köktendir.' }),
        W('s5-k-ataş', 'عطش', 'عَطَش', 'Susuzluk', { note: 'Üç harf de bağlı.' }),
        W('s5-k-bad', 'بعد', 'بَعْد', 'Sonra', { tag: 'Ortak Kelime', note: '"Bade" bu köktendir.' }),
        W('s5-k-sad', 'سعد', 'سَعْد', 'Mutluluk', { tag: 'Ortak Kök', note: '"Saadet", "Sait" bu köktendir.' }),
        W('s5-k-gubar', 'غبار', 'غُبَار', 'Toz', { tag: 'Ortak Kelime', note: '"Gubar" — dört harfli ilk kelimen.' })
      ]
    },

    {
      stageId: 6,
      title: '6. Aşama',
      letters: ['ف', 'ق', 'ك', 'ل'],
      subtitle: 'Fe, Kaf, Kef, Lam — gözlü ve dik harfler',
      intro: 'Fe ile Kaf aynı gözü paylaşır; farkı Kaf’ın derin çanağı ve iki noktasıdır. ' +
             'Kef’in içindeki küçük işaret nokta değil, harfin parçasıdır.',
      twoLetters: [
        W('s6-2-fa', 'فا', 'فَا', 'Fa (hece)', { kind: 'hece', note: 'Gözü kapat, sonra Elif.' }),
        W('s6-2-ka', 'قا', 'قَا', 'Ka (kalın, hece)', { kind: 'hece', note: 'Üstte iki nokta.' }),
        W('s6-2-ke', 'كا', 'كَا', 'Ke (hece)', { kind: 'hece', note: 'İçteki işareti en sona bırak.' }),
        W('s6-2-keff', 'كف', 'كَفّ', 'Avuç', { note: 'Kef + Fe: ikisi de bağlanır.' })
      ],
      threeLetters: [
        W('s6-3-kalb', 'قلب', 'قَلْب', 'Kalp', { tag: 'Ortak Kelime', note: 'Türkçeye aynen geçmiştir.' }),
        W('s6-3-kelb', 'كلب', 'كَلْب', 'Köpek', { note: 'قلب ile aynı iskelet — ilk harfe dikkat!' }),
        W('s6-3-fikr', 'فكر', 'فِكْر', 'Fikir', { tag: 'Ortak Kelime', note: '"Fikir", "tefekkür" bu köktendir.' }),
        W('s6-3-kufl', 'قفل', 'قُفْل', 'Kilit', { note: 'Kaf + Fe + Lam: üçü de bağlı.' })
      ],
      cumulative: [
        W('s6-k-akl', 'عقل', 'عَقْل', 'Akıl', { tag: 'Ortak Kelime', note: '"Akıl", "akıllı" bu köktendir.' }),
        W('s6-k-kitab', 'كتاب', 'كِتَاب', 'Kitap', { tag: 'Ortak Kelime', note: 'Elif’te kopar, Be yalın kalır.' }),
        W('s6-k-fakr', 'فقر', 'فَقْر', 'Fakirlik', { tag: 'Ortak Kök', note: '"Fakir" bu köktendir.' }),
        W('s6-k-kader', 'قدر', 'قَدَر', 'Kader / güç', { tag: 'Ortak Kelime', note: 'Dal bağlanmaz.' }),
        W('s6-k-kesb', 'كسب', 'كَسْب', 'Kazanç', { tag: 'Ortak Kök', note: '"Kesb etmek" bu köktendir.' }),
        W('s6-k-tıfl', 'طفل', 'طِفْل', 'Çocuk', { tag: 'Ortak Kök', note: '"Tıfıl" bu köktendir.' })
      ]
    },

    {
      stageId: 7,
      title: '7. Aşama',
      letters: ['م', 'ن', 'ه', 'و', 'ي'],
      subtitle: 'Mim, Nun, He, Vav, Ye — son beş harf',
      intro: 'Son aşama! He’nin dört biçimi birbirinden çok farklıdır, Vav bağlanmaz, ' +
             'Ye’nin noktaları ALTTADIR. Bunları bitirince alfabenin tamamını yazabiliyorsun.',
      twoLetters: [
        W('s7-2-ma', 'ما', 'مَا', 'Ne / ma (hece)', { kind: 'hece', note: 'Mim başta küçülür.' }),
        W('s7-2-na', 'نا', 'نَا', 'Na (hece)', { kind: 'hece', note: 'Nun başta Be gibi görünür — nokta üstte tek.' }),
        W('s7-2-men', 'من', 'مَنْ', 'Kim', { note: 'Mim + Nun: ikisi de bağlanır.' }),
        W('s7-2-huve', 'هو', 'هُوَ', 'O (erkek için)', { note: 'He bağlanır, Vav bağlanmaz.' })
      ],
      threeLetters: [
        W('s7-3-nur', 'نور', 'نُور', 'Nur / ışık', { tag: 'Ortak Kelime', note: 'Vav bağlanmaz, Ra sonda yalın.' }),
        W('s7-3-yevm', 'يوم', 'يَوْم', 'Gün', { tag: 'Ortak Kelime', note: '"Yevmiye" bu köktendir.' }),
        W('s7-3-hems', 'همس', 'هَمْس', 'Fısıltı', { note: 'He başta, Mim ortada.' }),
        W('s7-3-nehr', 'نهر', 'نَهْر', 'Nehir', { tag: 'Ortak Kelime', note: 'He ORTADA bambaşka görünür!' })
      ],
      cumulative: [
        W('s7-k-kalem', 'قلم', 'قَلَم', 'Kalem', { tag: 'Ortak Kelime', note: 'Türkçeye aynen geçmiştir.' }),
        W('s7-k-beyt', 'بيت', 'بَيْت', 'Ev', { tag: 'Ortak Kelime', note: '"Beyt", "beytülmal" bu köktendir.' }),
        W('s7-k-ketebe', 'كتب', 'كَتَبَ', 'Yazdı', { tag: 'Ortak Kök', note: '"Kitap", "mektup", "kâtip" hep bu köktendir.' }),
        W('s7-k-amel', 'عمل', 'عَمَل', 'İş / amel', { tag: 'Ortak Kelime', note: '"Amel", "amele" bu köktendir.' }),
        W('s7-k-müderris', 'مدرس', 'مُدَرِّس', 'Öğretmen', { tag: 'Ortak Kök', note: '"Müderris", "medrese" bu köktendir.' }),
        W('s7-k-selam', 'سلام', 'سَلَام', 'Selam / barış', { tag: 'Ustalık', note: 'Son kelimen: dört harf, ikisi bağlı ikisi kopuk.' })
      ]
    }
  ];

  /* Aşama nesnelerini kur: harfler ALPHABET’ten referansla gelir
     (böylece yönetici bir harfi düzenlerse her yerde geçerli olur). */
  const STAGES = STAGE_DEFS.map((d) => ({
    stageId: d.stageId,
    title: d.title,
    lettersLabel: d.letters.join(' · '),
    subtitle: d.subtitle,
    intro: d.intro,
    letters: d.letters.map((c) => getLetter(c)).filter(Boolean),
    exercises: {
      twoLetters: d.twoLetters || [],
      threeLetters: d.threeLetters || [],
      cumulative: d.cumulative || []
    }
  }));

  const SECTIONS = [
    { key: 'letters', label: 'Harfler', icon: '✍️' },
    { key: 'twoLetters', label: '2 Harfli', icon: '②' },
    { key: 'threeLetters', label: '3 Harfli', icon: '③' },
    { key: 'cumulative', label: 'Kümülatif', icon: '🧩' }
  ];

  /* Sürükle-bırak çeldiricileri: tüm harflerin tüm biçimleri */
  const DISTRACTOR_POOL = ALPHABET.reduce((a, L) => {
    ['isolated', 'initial', 'medial', 'final'].forEach((k) => {
      if (a.indexOf(L.forms[k]) < 0) a.push(L.forms[k]);
    });
    return a;
  }, []);

  /* ---- yardımcılar ---- */
  const TASHKEEL_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

  function stripTashkeel(text) {
    return String(text || '').replace(TASHKEEL_RE, '');
  }

  function allExercises(stage) {
    const ex = stage.exercises || {};
    return [].concat(ex.twoLetters || [], ex.threeLetters || [], ex.cumulative || []);
  }

  function getStage(stageId) {
    return STAGES.find((s) => s.stageId === Number(stageId)) || null;
  }

  function totalExerciseCount() {
    return STAGES.reduce((n, s) => n + allExercises(s).length, 0);
  }

  /* ------------------------------------------------------------------ */
  /* HAREKELER (Arapça: الحركات)                                         */
  /*                                                                     */
  /* Müfredattaki 94 kelimenin HEPSİ harekelidir (`vowelled`) ve çocuk   */
  /* bunları ekranda görüp sesini duyuyordu; ama hiçbir ders bu          */
  /* işaretlerin ne olduğunu söylemiyordu. Bu tablo o boşluğu kapatır.   */
  /*                                                                     */
  /*   mark : işaretin kendisi (birleştirici karakter)                   */
  /*   pos  : 'above' | 'below' — harfin üstüne mi altına mı konur       */
  /*   demo : örnek harf (ب) üzerinde nasıl görünür                      */
  /* ------------------------------------------------------------------ */
  const HARAKAT = [
    {
      id: 'fetha', mark: 'َ', ar: 'الفتحة', name: 'Fetha', tr: 'üstün',
      pos: 'above', sound: 'e / a',
      say: 'be', demo: 'بَ',
      what: 'Harfin ÜSTÜNE konan küçük eğik çizgi.',
      how: 'Harfi yaz, sonra üstüne sağdan sola küçük bir eğik çizgi çek.',
      read: 'Harfi “e” sesiyle okutur: بَ = be'
    },
    {
      id: 'kesra', mark: 'ِ', ar: 'الكسرة', name: 'Kesra', tr: 'esre',
      pos: 'below', sound: 'i',
      say: 'bi', demo: 'بِ',
      what: 'Harfin ALTINA konan küçük eğik çizgi.',
      how: 'Harfi yaz, sonra ALTINA küçük bir eğik çizgi çek.',
      read: 'Harfi “i” sesiyle okutur: بِ = bi'
    },
    {
      id: 'damme', mark: 'ُ', ar: 'الضمة', name: 'Damme', tr: 'ötre',
      pos: 'above', sound: 'u',
      say: 'bu', demo: 'بُ',
      what: 'Harfin ÜSTÜNE konan küçük vav (و) benzeri işaret.',
      how: 'Harfi yaz, sonra üstüne küçük bir “و” çiz.',
      read: 'Harfi “u” sesiyle okutur: بُ = bu'
    },
    {
      id: 'sukun', mark: 'ْ', ar: 'السكون', name: 'Sükûn', tr: 'cezm',
      pos: 'above', sound: '—',
      say: 'b', demo: 'بْ',
      what: 'Harfin ÜSTÜNE konan küçük daire.',
      how: 'Harfi yaz, sonra üstüne küçük bir daire çiz.',
      read: 'Harfte hareke YOKTUR; sesi kesiktir: بْ = b'
    },
    {
      id: 'sedde', mark: 'ّ', ar: 'الشدة', name: 'Şedde', tr: 'şedde',
      pos: 'above', sound: 'çift',
      say: 'bbe', demo: 'بَّ',
      what: 'Harfin ÜSTÜNE konan küçük “w” benzeri işaret.',
      how: 'Harfi yaz, üstüne küçük bir “ﻭ” başlığı gibi işaret çiz.',
      read: 'Harf ÇİFT okunur: بَّ = bbe'
    }
  ];

  function getHaraka(id) { return HARAKAT.filter((h) => h.id === id)[0] || null; }

  AH.data = {
    STAGES,
    SECTIONS,
    HARAKAT,
    getHaraka,
    FORM_LABELS,
    DISTRACTOR_POOL,
    ALPHABET,
    getLetter,
    dotsInWord,
    buildEquation,
    joinsForward,
    stripTashkeel,
    allExercises,
    getStage,
    totalExerciseCount
  };
})();

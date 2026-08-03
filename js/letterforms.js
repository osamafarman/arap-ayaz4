/* =========================================================================
   letterforms.js — Harflerin YAZILIŞ KURALLARI (28 harf)

   Kaynak: "كراسة خط النسخ للمبتدئين" — منصة الخطاط, الخطاط مختار عالم
   Kitapçık harfleri ŞEKİL AİLELERİNE göre işler; her ailede hareketin
   yönü oklarla, aşamaları numaralarla gösterilir. Noktalar EN SONA yazılır.

   Burada koordinat YOKTUR: harfin orta ekseni ekrandaki gerçek yazı
   tipinden hesaplanır (skeleton.js). Bu dosya kitapçıktaki pedagojik
   bilgiyi taşır:

     startRule : kalem hangi UÇTAN başlar (kitapçıktaki oklardan)
     phases    : hareketin numaralı aşamaları
     startTip  : "nereden başla"
     dirTip    : "hangi yöne git"
     source    : 'booklet' → diyagramı doğrudan görülen aile
                 'family'  → aynı iskeleti paylaşan kardeş harf
                             (ör. ذ, د ile aynı; sadece noktası farklı)
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  /* --------------------------------------------------------------- aileler */
  const FAMILIES = {
    /* ELİF — kitapçık s.7 */
    alif: {
      label: 'Elif',
      page: 7,
      isolated: {
        startRule: 'top',
        phases: ['Tepeden başla', 'Aşağı doğru tek çizgi'],
        startTip: 'Kalemi en TEPEDEN başlat.',
        dirTip: 'Yukarıdan aşağıya, tek hamlede in. Elif hiç kıvrılmaz.'
      },
      final: {
        startRule: 'right',
        phases: ['Satırda sağdan gel', 'Sonra yukarı kalk'],
        startTip: 'Satır çizgisinin üstünde, SAĞ uçtan başla.',
        dirTip: 'Önce sola gel, sonra dikine yukarı çık.'
      }
    },

    /* ÇANAK — ب ت ث : kitapçık s.8 */
    bowl: {
      label: 'Çanak',
      page: 8,
      isolated: {
        startRule: 'right',
        phases: ['1 · Sağ uçtaki dişten aşağı', '2 · Satır boyunca sola süpür', '3 · Sol uçta yukarı kalk'],
        startTip: 'SAĞ uçtaki küçük dişin tepesinden başla.',
        dirTip: 'Sağdan sola süpür; sol uçta kalemi yukarı kaldır.'
      },
      initial: {
        startRule: 'right',
        phases: ['1 · Sağ uçtaki dişten aşağı', '2 · Sola git, satırda düz bitir'],
        startTip: 'SAĞ üstteki dişten başla.',
        dirTip: 'Sola git ve satırda düz bitir — sonraki harf oradan devam eder.'
      },
      medial: {
        startRule: 'right',
        phases: ['1 · Sağdaki bağlantıdan gel', '2 · Küçük dişi yap', '3 · Sola bağla'],
        startTip: 'SAĞDAKİ bağlantı ucundan başla.',
        dirTip: 'Küçük bir tümsek yapıp sola devam et.'
      },
      final: {
        startRule: 'right',
        phases: ['1 · Sağdaki bağlantıdan gel', '2 · Derin çanağı çiz', '3 · Sol uçta yukarı kalk'],
        startTip: 'SAĞDAKİ bağlantı ucundan başla.',
        dirTip: 'Çanağı sola doğru derinleştir, ucunu yukarı kaldır.'
      }
    },

    /* KAYIK — ج ح خ : kitapçık s.9 */
    kayik: {
      label: 'Kayık',
      page: 9,
      isolated: {
        startRule: 'topleft',
        phases: ['1 · İnce giriş', '2 · Başlığı sağa çiz', '3 · Satırın altına sola in', '4 · Kayığı çiz, ucu sağda kalksın'],
        startTip: 'Başlığın SOL ucundan başla.',
        dirTip: 'Önce sağa (başlık), sonra sola aşağı, sonra kayıkla sağa dön.'
      },
      initial: {
        startRule: 'top',
        phases: ['1 · Başlığı sağa çiz', '2 · Satıra in', '3 · Sola bağla'],
        startTip: 'Başlığın SOL ucundan başla.',
        dirTip: 'Başlığı yap, satıra in, sola bağlantı bırak.'
      },
      medial: {
        startRule: 'right',
        phases: ['1 · Sağdaki bağlantıdan yukarı çık', '2 · Başlığı çiz', '3 · Satıra dönüp sola bağla'],
        startTip: 'SAĞDAKİ bağlantı ucundan başla.',
        dirTip: 'Yukarı çık, başlığı yap, sonra satıra dönüp sola bağla.'
      },
      final: {
        startRule: 'top',
        phases: ['1 · Bağlantıdan başlığa', '2 · Satırın altına in', '3 · Kayığı çiz, ucu sağda kalksın'],
        startTip: 'SAĞ ÜSTTEKİ bağlantı ucundan başla.',
        dirTip: 'Başlıktan sola aşağı in, sonra kayıkla sağa dön.'
      }
    },

    /* DAL — د ذ : kitapçık s.10 */
    dal: {
      label: 'Dal',
      page: 10,
      isolated: {
        startRule: 'top',
        phases: ['1 · Üst uçtan aşağı-sola in', '2 · Satır üstünde sola süpür'],
        startTip: 'ÜST uçtan başla.',
        dirTip: 'Önce aşağı-sola in, sonra satırın üstünde sola süpürerek bitir.'
      }
    },

    /* RA — ر ز : kitapçık s.11 */
    ra: {
      label: 'Ra',
      page: 11,
      isolated: {
        startRule: 'top',
        phases: ['1 · Üstten aşağı in', '2 · Satırın altında sola kıvrıl'],
        startTip: 'ÜST uçtan başla.',
        dirTip: 'Aşağı inerken sola kıvır; kuyruk satırın ALTINA taşar.'
      }
    },

    /* SİN — س ش : kitapçık s.12 */
    sin: {
      label: 'Sin',
      page: 12,
      isolated: {
        startRule: 'right',
        phases: ['1 · Sağdaki ilk diş', '2 · İkinci diş', '3 · Üçüncü diş', '4 · Büyük çanağı sola çiz'],
        startTip: 'SAĞDAKİ ilk dişten başla.',
        dirTip: 'Üç dişi sağdan sola sırayla yap, sonra büyük çanağı çiz.'
      }
    },

    /* SAD — ص ض : kitapçık s.13 */
    sad: {
      label: 'Sad',
      page: 13,
      isolated: {
        startRule: 'topleft',
        phases: ['1 · Gözü üstten sağa çiz', '2 · Sola dönüp gözü kapat', '3 · Aşağı in', '4 · Çanağı sola çiz'],
        startTip: 'Gözün SOL ÜST ucundan başla.',
        dirTip: 'Önce gözü çiz ve kapat, sonra satıra inip çanağı sola süpür.'
      }
    },

    /* TI — ط ظ : kitapçık s.14 */
    ta: {
      label: 'Tı',
      page: 14,
      isolated: {
        startRule: 'right',
        phases: ['1 · Sağdan gövdeye gir', '2 · Satırda sola süpür', '3 · Dik çizgiyi TEPEDEN aşağı çek'],
        startTip: 'Gövdenin SAĞ ucundan başla.',
        dirTip: 'Önce yatık gövde (sağdan sola), dik çizgi EN SONA ve yukarıdan aşağıya.'
      }
    },

    /* AYN — ع غ : kitapçık s.15 */
    ayn: {
      label: 'Ayn',
      page: 15,
      isolated: {
        startRule: 'topleft',
        phases: ['1 · Açık başlığı sağa çiz', '2 · Sola dön', '3 · Aşağı in', '4 · Kuyruğu sola süpür'],
        startTip: 'Başlığın SOL ucundan başla.',
        dirTip: 'Başlığın ağzı sağa bakar; sonra aşağı inip kuyruğu sola çek.'
      }
    },

    /* FE — ف ق : kitapçık s.16 */
    fa: {
      label: 'Fe',
      page: 16,
      isolated: {
        startRule: 'right',
        phases: ['1 · Gözü sağdan başlayıp çiz', '2 · Gözü kapat', '3 · Gövdeyi sola süpür'],
        startTip: 'Gözün SAĞ ucundan başla.',
        dirTip: 'Önce yuvarlak gözü çiz, sonra gövdeyi satırda sola götür.'
      }
    },

    /* KEF — ك : kitapçık s.18 */
    kaf: {
      label: 'Kef',
      page: 18,
      isolated: {
        startRule: 'top',
        phases: ['1 · Dik çizgiyi tepeden aşağı in', '2 · Satırda sola süpür', '3 · İçteki küçük işareti EN SONA koy'],
        startTip: 'Dik çizginin TEPESİNDEN başla.',
        dirTip: 'Önce dik çizgi, sonra taban; içteki küçük işaret en sonda yazılır.'
      }
    },

    /* LAM — ل */
    lam: {
      label: 'Lam',
      page: 19,
      isolated: {
        startRule: 'top',
        phases: ['1 · Dik çizgiyi tepeden aşağı in', '2 · Satırın altında sola kıvrıl'],
        startTip: 'Dik çizginin TEPESİNDEN başla.',
        dirTip: 'Aşağı in ve satırın altında geniş bir kıvrımla sola dön.'
      }
    },

    /* MİM — م : kitapçık s.20 */
    mim: {
      label: 'Mim',
      page: 20,
      isolated: {
        startRule: 'topleft',
        phases: ['1 · Küçük yuvarlak başı çiz', '2 · Satıra otur', '3 · Kuyruğu aşağı indir'],
        startTip: 'Yuvarlak başın SOL ÜST ucundan başla.',
        dirTip: 'Başı çiz, satıra otur, kuyruğu satırın altına indir.'
      }
    },

    /* NUN — ن ي : kitapçık s.21 */
    nun: {
      label: 'Nun',
      page: 21,
      isolated: {
        startRule: 'right',
        phases: ['1 · Sağ üstten aşağı in', '2 · Derin çanağı sola çiz, ucu yukarı kalksın'],
        startTip: 'SAĞ ÜST uçtan başla.',
        dirTip: 'Aşağı inip derin çanağı sola süpür; sol uçta yukarı kaldır.'
      }
    },

    /* HE — ه */
    he: {
      label: 'He',
      page: null,
      isolated: {
        startRule: 'top',
        phases: ['1 · Üstten başla', '2 · Yuvarlağı kapat'],
        startTip: 'ÜST uçtan başla.',
        dirTip: 'Yuvarlağı çizip kapat.'
      }
    },

    /* VAV — و */
    waw: {
      label: 'Vav',
      page: null,
      isolated: {
        startRule: 'topright',
        phases: ['1 · Yuvarlak başı çiz', '2 · Kuyruğu satırın altına indir'],
        startTip: 'Yuvarlak başın ÜST ucundan başla.',
        dirTip: 'Başı çiz, sonra kuyruğu satırın altına doğru indir.'
      }
    }
  };

  /* Harf → aile + nokta bilgisi. source: diyagramı görülen aile mi,
     yoksa aynı iskeleti paylaşan kardeş harf mi. */
  const LETTERS = {
    'ا': { fam: 'alif',  dots: { count: 0, side: null }, source: 'booklet' },
    'ب': { fam: 'bowl',  dots: { count: 1, side: 'ALTINDA' }, source: 'booklet' },
    'ت': { fam: 'bowl',  dots: { count: 2, side: 'ÜSTÜNDE' }, source: 'family' },
    'ث': { fam: 'bowl',  dots: { count: 3, side: 'ÜSTÜNDE' }, source: 'family' },
    'ج': { fam: 'kayik', dots: { count: 1, side: 'KAYIĞIN İÇİNDE' }, source: 'family' },
    'ح': { fam: 'kayik', dots: { count: 0, side: null }, source: 'booklet' },
    'خ': { fam: 'kayik', dots: { count: 1, side: 'ÜSTÜNDE' }, source: 'family' },
    'د': { fam: 'dal',   dots: { count: 0, side: null }, source: 'booklet' },
    'ذ': { fam: 'dal',   dots: { count: 1, side: 'ÜSTÜNDE' }, source: 'family' },
    'ر': { fam: 'ra',    dots: { count: 0, side: null }, source: 'booklet' },
    'ز': { fam: 'ra',    dots: { count: 1, side: 'ÜSTÜNDE' }, source: 'family' },
    'س': { fam: 'sin',   dots: { count: 0, side: null }, source: 'booklet' },
    'ش': { fam: 'sin',   dots: { count: 3, side: 'ÜSTÜNDE' }, source: 'family' },
    'ص': { fam: 'sad',   dots: { count: 0, side: null }, source: 'booklet' },
    'ض': { fam: 'sad',   dots: { count: 1, side: 'ÜSTÜNDE' }, source: 'family' },
    'ط': { fam: 'ta',    dots: { count: 0, side: null }, source: 'booklet' },
    'ظ': { fam: 'ta',    dots: { count: 1, side: 'ÜSTÜNDE' }, source: 'family' },
    'ع': { fam: 'ayn',   dots: { count: 0, side: null }, source: 'booklet' },
    'غ': { fam: 'ayn',   dots: { count: 1, side: 'ÜSTÜNDE' }, source: 'family' },
    'ف': { fam: 'fa',    dots: { count: 1, side: 'ÜSTÜNDE' }, source: 'booklet' },
    'ق': { fam: 'fa',    dots: { count: 2, side: 'ÜSTÜNDE' }, source: 'family' },
    /* ك'nin noktası yoktur; yalın ve sondaki biçimlerinde gövdeden ayrı
       duran küçük bir iç işaret vardır ve o da EN SONA yazılır. */
    'ك': { fam: 'kaf', dots: { count: 0, side: null }, source: 'booklet',
           extra: 'İçteki küçük işaret (nokta değildir) en sona yazılır.' },
    'ل': { fam: 'lam',   dots: { count: 0, side: null }, source: 'family' },
    'م': { fam: 'mim',   dots: { count: 0, side: null }, source: 'booklet' },
    'ن': { fam: 'nun',   dots: { count: 1, side: 'ÜSTÜNDE' }, source: 'booklet' },
    'ه': { fam: 'he',    dots: { count: 0, side: null }, source: 'family' },
    'و': { fam: 'waw',   dots: { count: 0, side: null }, source: 'family' },
    'ي': { fam: 'nun',   dots: { count: 2, side: 'ALTINDA' }, source: 'family' }
  };

  /* Elif bağlanmaz: başta = yalın, ortada = sonda */
  const ALIF_MAP = { isolated: 'isolated', initial: 'isolated', medial: 'final', final: 'final' };

  function baseChar(ch) {
    return ({ 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ة': 'ه', 'ى': 'ي' })[ch] || ch;
  }

  /**
   * @param {string} char    harf
   * @param {string} formKey isolated | initial | medial | final
   */
  function get(char, formKey) {
    const c = baseChar(char);
    const rec = LETTERS[c];
    if (!rec) return null;
    const fam = FAMILIES[rec.fam];
    let key = formKey || 'isolated';
    if (rec.fam === 'alif') key = ALIF_MAP[key] || 'isolated';
    /* Aile yalnızca 'isolated' tanımlıyorsa tüm biçimler onu kullanır:
       iskelet zaten o biçimin gerçek şeklinden çıkarılır, değişen sadece
       başlangıç ucu kuralıdır. */
    const body = fam[key] || fam.isolated;
    return {
      char: c,
      formKey: key,
      family: rec.fam,
      familyLabel: fam.label,
      page: fam.page,
      source: rec.source,
      startRule: body.startRule,
      phases: body.phases,
      startTip: body.startTip,
      dirTip: body.dirTip,
      dots: rec.dots,
      extra: rec.extra || null
    };
  }

  function has(char) { return !!LETTERS[baseChar(char)]; }
  function dotsOf(char) {
    const rec = LETTERS[baseChar(char)];
    return rec ? rec.dots.count : 0;
  }

  /**
   * Bir kelime parçasının (ör. "ثـ", "ـبـ", "ب") temel harfini ve biçimini
   * çözer — kelime yazımında başlangıç noktasını bulmak için kullanılır.
   */
  function parseFragment(frag) {
    const s = String(frag || '');
    const core = s.replace(/ـ/g, '');
    const ch = baseChar(core[0] || '');
    const leading = s.indexOf('ـ') === 0;
    const trailing = s.lastIndexOf('ـ') === s.length - 1 && s.length > 1;
    let formKey = 'isolated';
    if (leading && trailing) formKey = 'medial';
    else if (leading) formKey = 'final';
    else if (trailing) formKey = 'initial';
    return { char: ch, formKey };
  }

  AH.letterforms = { get, has, dotsOf, parseFragment, LETTERS, FAMILIES };
})();

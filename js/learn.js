/* =========================================================================
   learn.js — ÖĞRETMENDEN ÖĞRENME MOTORU (arayüz yok)

   Fikir: Öğretmen bir harfi kendi eliyle DOĞAL biçimde yazar. Bu dosya o
   yazıdan "üslup imzası" çıkarır ve aynı üslubu başka harflere/biçimlere
   taşır. Böylece 123 hedefin hepsini tek tek çizmek gerekmez.

   ÖĞRENİLEN ŞEYLER (öğretmenin seçtiği):
     • yol + hamle sırası + yön   (hangi uçtan başlar, nereye gider)
     • nokta yerleri ve zamanı    (noktalar en sona)
     • kalem kalınlığı ve oranlar

   NASIL SAKLANIR — ölçek bağımsızlığı:
     Öğretmenin çizgileri, HEDEF HARFİN mürekkep kutusuna göre normalize
     edilir:
        bx = (kutu.sağ - x) / kutu.genişlik     (0 = sağ kenar, 1 = sol)
        by = (y - kutu.üst) / kutu.yükseklik
     Öğretmen harfin dışına taşarsa bu sapma da imzada korunur — yani
     "öğretmenin oranları" aynen taşınır.

   İKİ TAŞIMA TÜRÜ (dürüstçe ayrılır):
     1) 'exact'  — TAM KOPYA. Hedef, aynı iskeleti paylaşan kardeş harfse
                   (ب → ت, ث : yalnız noktaları farklı) çizgiler birebir
                   hedefin kutusuna oturtulur. Yüksek sadakat.
     2) 'manner' — ÜSLUP TAŞIMA. Hedefin şekli gerçekten farklıysa
                   (ب → ـبـ) çizgiler kopyalanamaz. Hedefin kendi
                   iskeleti yazı tipinden çıkarılır, sonra öğretmenin
                   KURALLARINA göre yeniden düzenlenir: başlangıç ucu,
                   yön, hamle sayısı, nokta yarıçapı, kalem kalınlığı.

   Hiçbir şey sessizce uygulanmaz: öneriler listelenir, öğretmen görüp
   onaylar (bkz. studio.js).
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const FORM_KEYS = ['isolated', 'initial', 'medial', 'final'];
  const FORM_LABEL = {
    isolated: 'Yalın', initial: 'Başta', medial: 'Ortada', final: 'Sonda'
  };
  const FORM_LABEL_AR = {
    isolated: 'منفصلة', initial: 'في البداية', medial: 'في الوسط', final: 'في النهاية'
  };

  /* ------------------------------------------------------------------ */
  /* Yardımcılar                                                         */
  /* ------------------------------------------------------------------ */
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function pathLength(pts) {
    let n = 0;
    for (let i = 1; i < pts.length; i++) n += dist(pts[i - 1], pts[i]);
    return n;
  }

  /** Gürültüyü at, noktaları seyrelt (Ramer–Douglas–Peucker). */
  function simplify(pts, tol) {
    if (!AH.skeleton || !AH.skeleton.rdp || pts.length < 3) return pts;
    return AH.skeleton.rdp(pts, tol || 1.5);
  }

  /** Çok kısa çizgi = parmakla konmuş NOKTA. */
  function isDotStroke(pts, fontSize) {
    return pathLength(pts) < fontSize * 0.10;
  }

  function centroid(pts) {
    let x = 0, y = 0;
    pts.forEach((p) => { x += p.x; y += p.y; });
    return { x: x / pts.length, y: y / pts.length };
  }

  /**
   * Başlangıcın hangi UÇTA olduğu — kitapçıktaki 'startRule' diliyle.
   * Kutu içindeki oransal konuma bakar.
   */
  function cornerOf(bx, by) {
    const right = bx < 0.34, left = bx > 0.66;
    const top = by < 0.34, bottom = by > 0.66;
    if (top && left) return 'topleft';
    if (top && right) return 'topright';
    if (bottom && right) return 'bottomright';
    if (bottom && left) return 'bottomleft';
    if (top) return 'top';
    if (bottom) return 'bottom';
    if (right) return 'right';
    if (left) return 'left';
    return 'top';
  }

  /* ------------------------------------------------------------------ */
  /* 1) YAKALAMA — öğretmenin yazısından imza çıkar                      */
  /* ------------------------------------------------------------------ */
  /**
   * @param {object} pad     hedef harfin çizildiği tracing tuvali
   * @param {Array}  raw     öğretmenin çizgileri (tuval koordinatı)
   * @param {object} o       {char, formKey, glyph, brush}
   * @returns {object|null}  üslup imzası
   */
  function capture(pad, raw, o) {
    const box = pad.inkBox();
    const lay = pad.getLayout();
    if (!box || !lay || !raw || !raw.length) return null;

    const fs = lay.fontSize;
    const toBox = (p) => [
      +((box.maxx - p.x) / (box.w || 1)).toFixed(4),
      +((p.y - box.miny) / (box.h || 1)).toFixed(4)
    ];

    const strokes = [];
    const dots = [];

    raw.forEach((s) => {
      if (!s || s.length < 1) return;
      if (s.length < 2 || isDotStroke(s, fs)) {
        /* tek dokunuş → nokta (yarıçap kalem kalınlığından) */
        const c = centroid(s);
        const u = toBox(c);
        dots.push([u[0], u[1], +((o.brush || 0.08) * 0.75).toFixed(4)]);
        return;
      }
      const sp = simplify(s, Math.max(1.2, fs * 0.012));
      if (sp.length < 2) return;
      strokes.push(sp.map(toBox));
    });

    if (!strokes.length) return null;

    /* çizgilerin kendi kutusu — öğretmen harfin dışına taştı mı? */
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
    strokes.forEach((s) => s.forEach(([bx, by]) => {
      if (bx < mnx) mnx = bx; if (bx > mxx) mxx = bx;
      if (by < mny) mny = by; if (by > mxy) mxy = by;
    }));

    const first = strokes[0][0];
    const last = strokes[strokes.length - 1][strokes[strokes.length - 1].length - 1];

    return {
      v: 1,
      char: o.char || null,
      formKey: o.formKey || null,
      glyph: o.glyph,
      /* Kelimeler harf gibi genellenemez; imza yalnız kendi şekline işlenir. */
      isWord: !!o.isWord,
      family: (!o.isWord && AH.letterforms && AH.letterforms.LETTERS[o.char])
        ? AH.letterforms.LETTERS[o.char].fam : null,
      strokes,
      dots,
      brush: o.brush || null,
      /* öğrenilen KURALLAR — üslup taşımada kullanılır */
      startCorner: cornerOf(first[0], first[1]),
      endCorner: cornerOf(last[0], last[1]),
      strokeCount: strokes.length,
      /* her hamlenin toplam uzunluğa oranı — üslup taşımada bölme yeri */
      splits: (function () {
        const lens = strokes.map((s) => {
          let n = 0;
          for (let i = 1; i < s.length; i++) {
            n += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
          }
          return n;
        });
        const tot = lens.reduce((a, b) => a + b, 0) || 1;
        return lens.map((n) => +(n / tot).toFixed(4));
      })(),
      /* öğretmenin oranları (hedef harfin kutusuna göre) */
      spread: {
        w: +(mxx - mnx).toFixed(4),
        h: +(mxy - mny).toFixed(4),
        top: +mny.toFixed(4),
        bottom: +mxy.toFixed(4)
      },
      /* satır çizgisinin kutu içindeki yeri — taban hizasını korumak için */
      baseline: +((lay.textY - box.miny) / (box.h || 1)).toFixed(4),
      font: AH.tracing && AH.tracing.fontFingerprint ? AH.tracing.fontFingerprint() : null,
      at: Date.now()
    };
  }

  /* ------------------------------------------------------------------ */
  /* 1b) KELİME YAZISINDAN HARF DERSİ ÇIKARMA                            */
  /*                                                                     */
  /* Öğretmen bir kelimeyi elle yazdığında aslında o kelimedeki HARF     */
  /* BİÇİMLERİNİ de yazmış olur. Kelime, bitişik parçalara ayrılır:      */
  /* "باب" → "با" + "ب". Bir parça TEK bir harf biçiminden oluşuyorsa    */
  /* (ör. sondaki "ب"), öğretmenin o parçadaki çizgisi doğrudan o harf   */
  /* biçiminin dersidir — ondan imza çıkarılıp bütün ailesine taşınır.   */
  /*                                                                     */
  /* Çok harfli parçalar (ör. "با") atlanır: hangi çizginin nerede       */
  /* bittiği güvenilir biçimde kestirilemez; uydurmak yerine söylenir.   */
  /* ------------------------------------------------------------------ */

  /** Kelimenin denklem parçalarını BİTİŞİK gruplara böler (sağdan sola). */
  function joinGroups(ex) {
    const D = AH.data;
    const frags = (ex && ex.equation) || [];
    if (!frags.length || !AH.letterforms) return [];
    const groups = [];
    let cur = [];
    frags.forEach((f) => {
      const info = AH.letterforms.parseFragment(f);
      cur.push({ frag: f, char: info.char, formKey: info.formKey });
      const L = D && D.getLetter ? D.getLetter(info.char) : null;
      /* Bu harf kendinden sonrakine bağlanmıyorsa parça burada biter */
      if (!L || L.joinsForward === false) { groups.push(cur); cur = []; }
    });
    if (cur.length) groups.push(cur);
    return groups;
  }

  /** Maskeden gövde bileşenlerini çıkarır (noktalar elenir), sağdan sola. */
  function bodyComponents(mask, fontSize) {
    if (!AH.skeleton || !AH.skeleton.components) return [];
    const { data, w, h } = mask;
    const g = new Uint8Array(w * h);
    for (let i = 0, n = w * h; i < n; i++) g[i] = data[i * 4 + 3] > 40 ? 1 : 0;
    const comps = AH.skeleton.components(g, w, h);
    if (!comps.length) return [];
    /* nokta büyüklüğündeki lekeleri ayıkla */
    const big = comps.reduce((m, c) => Math.max(m, c.count), 0);
    const bodies = comps.filter((c) =>
      c.count > Math.max(24, big * 0.06) && c.h > fontSize * 0.12);
    bodies.sort((a, b) => b.maxx - a.maxx);         /* en sağdaki önce */
    return bodies;
  }

  /**
   * Öğretmenin kelime yazısından TEK HARFLİK parçaların derslerini çıkarır.
   * @returns [{char, formKey, glyph, sig}] — boş olabilir
   */
  function fromWord(pad, raw, o) {
    const lay = pad.getLayout();
    if (!lay || !raw || !raw.length) return [];
    const groups = joinGroups(o.ex);
    if (!groups.length) return [];

    const bodies = bodyComponents(pad.glyphMask(), lay.fontSize);
    /* Parça sayısı tutmuyorsa eşleme güvenilmez — hiçbir şey uydurulmaz. */
    if (!bodies.length || bodies.length !== groups.length) return [];

    /* Öğretmenin çizgilerini x aralığına göre parçalara dağıt */
    const mid = (s) => s.reduce((a, p) => a + p.x, 0) / s.length;
    const buckets = bodies.map(() => ({ strokes: [], dots: [] }));
    raw.forEach((s) => {
      if (!s || !s.length) return;
      const x = mid(s);
      /* en yakın bileşen (merkez uzaklığı) */
      let best = 0, bd = Infinity;
      bodies.forEach((b, i) => {
        const c = (b.minx + b.maxx) / 2;
        const d = Math.abs(x - c);
        if (d < bd) { bd = d; best = i; }
      });
      const isDot = s.length < 2 || pathLength(s) < lay.fontSize * 0.10;
      buckets[best][isDot ? 'dots' : 'strokes'].push(s);
    });

    const out = [];
    groups.forEach((grp, i) => {
      if (grp.length !== 1) return;                 /* çok harfli parça: atla */
      const b = bodies[i], bk = buckets[i];
      if (!bk.strokes.length) return;
      const g = grp[0];
      const glyph = glyphOf(g.char, g.formKey);
      if (!glyph) return;

      /* Çizgileri, bu parçanın mürekkep kutusuna göre normalize et —
         capture() ile aynı ölçü, böylece harf tek başına yazılmış gibi olur. */
      const box = { minx: b.minx, maxx: b.maxx, miny: b.miny, maxy: b.maxy,
                    w: (b.maxx - b.minx) || 1, h: (b.maxy - b.miny) || 1 };
      const toBox = (p) => [
        +((box.maxx - p.x) / box.w).toFixed(4),
        +((p.y - box.miny) / box.h).toFixed(4)
      ];
      const strokes = bk.strokes
        .map((s) => simplify(s, Math.max(1.2, lay.fontSize * 0.012)).map(toBox))
        .filter((s) => s.length > 1);
      if (!strokes.length) return;

      const dots = bk.dots.map((s) => {
        const c = centroid(s);
        const u = toBox(c);
        return [u[0], u[1], +((o.brush || 0.08) * 0.75).toFixed(4)];
      });

      const first = strokes[0][0];
      const last = strokes[strokes.length - 1][strokes[strokes.length - 1].length - 1];
      out.push({
        char: g.char, formKey: g.formKey, glyph,
        sig: {
          v: 1, char: g.char, formKey: g.formKey, glyph, isWord: false,
          family: (AH.letterforms.LETTERS[g.char] || {}).fam || null,
          strokes, dots, brush: o.brush || null,
          startCorner: cornerOf(first[0], first[1]),
          endCorner: cornerOf(last[0], last[1]),
          strokeCount: strokes.length,
          splits: strokes.map(() => +(1 / strokes.length).toFixed(4)),
          spread: null,
          baseline: +((lay.textY - box.miny) / box.h).toFixed(4),
          font: AH.tracing && AH.tracing.fontFingerprint ? AH.tracing.fontFingerprint() : null,
          at: Date.now(),
          fromWord: o.glyph
        }
      });
    });
    return out;
  }

  /** İmzadan, o harfin KENDİSİ için kayıt formatı (admin.setPath biçimi). */
  function selfRecord(sig, pad) {
    return toRecord(sig, pad, sig.strokes, sig.dots);
  }

  /** Kutu-göreli çizgileri, verilen tuvalin (u,v) kayıt biçimine çevirir. */
  function toRecord(sig, pad, strokes, dots) {
    const box = pad.inkBox();
    const lay = pad.getLayout();
    if (!box || !lay) return null;
    const fromBox = (b) => ({
      x: box.maxx - b[0] * box.w,
      y: box.miny + b[1] * box.h
    });
    return {
      strokes: strokes.map((s) => s.map((b) => pad.toNorm(fromBox(b)))),
      dots: (dots || []).map((d) => {
        const p = pad.toNorm(fromBox(d));
        p.push(d.length > 2 ? d[2] : 0.06);
        return p;
      }),
      brush: sig.brush || undefined,
      font: sig.font || undefined,
      /* Harfin O ANKİ mürekkep kutusu. Telefonda başka yazı tipi varsa
         yol bu kutuya göre yeniden hizalanır (bkz. tracing.inkRemap). */
      ink: pad.inkNorm ? pad.inkNorm() : undefined,
      learned: { from: sig.glyph, mode: 'self', at: sig.at }
    };
  }

  /* ------------------------------------------------------------------ */
  /* 2) HEDEFLER — bu ders nerelere uygulanabilir?                       */
  /* ------------------------------------------------------------------ */
  /**
   * Aynı ailedeki kardeş harfler: iskeletleri aynıdır, yalnız noktaları
   * farklıdır (ب ت ث · د ذ · ر ز · ص ض · ط ظ · ع غ · ف ق · س ش · ج ح خ).
   */
  function siblings(char) {
    const LF = AH.letterforms;
    if (!LF) return [];
    const rec = LF.LETTERS[char];
    if (!rec) return [];
    return Object.keys(LF.LETTERS).filter((c) =>
      c !== char && LF.LETTERS[c].fam === rec.fam);
  }

  /** Bir harfin belirli biçiminin gerçek şekli (ör. ب + medial → "ـبـ"). */
  function glyphOf(char, formKey) {
    const L = AH.data && AH.data.getLetter ? AH.data.getLetter(char) : null;
    if (L && L.forms && L.forms[formKey]) return L.forms[formKey];
    return char;
  }

  /**
   * Öğretilen (char, formKey) için uygulanabilir hedefler.
   * mode: 'exact'  → çizgiler birebir taşınır (kardeş harf, aynı biçim)
   *       'manner' → yalnız üslup taşınır (başka biçim / başka iskelet)
   */
  function targets(char, formKey) {
    const out = [];
    const seen = {};
    const push = (t) => {
      const k = t.glyph + '|' + t.mode;
      if (seen[k] || t.glyph === glyphOf(char, formKey)) return;
      seen[k] = 1;
      out.push(t);
    };

    /* a) kardeş harfler — AYNI biçim → tam kopya */
    siblings(char).forEach((c) => {
      push({
        kind: 'sibling', mode: 'exact',
        char: c, formKey, glyph: glyphOf(c, formKey),
        label: c + ' — ' + FORM_LABEL[formKey],
        why: 'Aynı iskelet, farklı nokta'
      });
    });

    /* b) aynı harfin diğer biçimleri → üslup taşıma */
    FORM_KEYS.filter((f) => f !== formKey).forEach((f) => {
      push({
        kind: 'form', mode: 'manner',
        char, formKey: f, glyph: glyphOf(char, f),
        label: char + ' — ' + FORM_LABEL[f],
        why: 'Aynı harf, başka biçim'
      });
    });

    /* c) kardeş harflerin diğer biçimleri → üslup taşıma */
    siblings(char).forEach((c) => {
      FORM_KEYS.filter((f) => f !== formKey).forEach((f) => {
        push({
          kind: 'sibling-form', mode: 'manner',
          char: c, formKey: f, glyph: glyphOf(c, f),
          label: c + ' — ' + FORM_LABEL[f],
          why: 'Kardeş harf, başka biçim'
        });
      });
    });

    /* d) bu harfin geçtiği kelimeler → üslup taşıma (kalem + nokta + yön) */
    wordsWith(char).forEach((w) => {
      push({
        kind: 'word', mode: 'manner',
        char, formKey: null, glyph: w.glyph, ex: w.ex,
        label: w.glyph + ' — ' + w.tr,
        why: 'Bu harfin geçtiği kelime'
      });
    });

    return out;
  }

  /** Müfredattaki, bu harfi içeren kelimeler. */
  function wordsWith(char) {
    const D = AH.data;
    if (!D || !D.STAGES) return [];
    const out = [];
    const seen = {};
    D.STAGES.forEach((st) => {
      (D.allExercises ? D.allExercises(st) : []).forEach((ex) => {
        const g = ex.result;
        if (!g || seen[g]) return;
        if (g.indexOf(char) < 0) return;
        seen[g] = 1;
        out.push({ glyph: g, tr: ex.tr || '', ex });
      });
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* 3) TAŞIMA — imzayı hedefe uygula                                    */
  /* ------------------------------------------------------------------ */
  /** TAM KOPYA: çizgileri hedefin mürekkep kutusuna oturt. */
  function transferExact(sig, pad, target) {
    const box = pad.inkBox();
    if (!box) return null;

    /* Noktalar: hedefin KENDİ nokta sayısı/yönü geçerlidir; yazı tipinden
       çıkarılan gerçek konumlar kullanılır, yarıçap öğretmenden gelir. */
    const auto = autoOf(pad, target);
    let dots = [];
    if (auto && auto.dots && auto.dots.length) {
      const r = sig.dots.length ? sig.dots[0][2] : 0.06;
      dots = auto.dots.map((d) => {
        const b = [(box.maxx - d.x) / (box.w || 1), (d.y - box.miny) / (box.h || 1)];
        return [+b[0].toFixed(4), +b[1].toFixed(4), r];
      });
    }

    const rec = toRecord(sig, pad, sig.strokes, dots);
    if (rec) rec.learned = { from: sig.glyph, mode: 'exact', at: Date.now() };
    return rec;
  }

  /** Kelime için biçim kaydı (yazıma en sağdaki parçadan başlanır). */
  function wordRule(ex, glyph) {
    const LF = AH.letterforms;
    let startRule = 'right';
    if (ex && ex.equation && ex.equation.length && LF) {
      const info = LF.parseFragment(ex.equation[0]);
      const f = LF.get(info.char, info.formKey);
      if (f) startRule = f.startRule;
    }
    const g = glyph || (ex ? ex.result : '');
    return {
      isWord: true,
      startRule,
      dots: { count: (AH.data && AH.data.dotsInWord) ? AH.data.dotsInWord(g) : 0 }
    };
  }

  /** Hedefin yazı tipinden çıkarılan OTOMATİK iskeleti. */
  function autoOf(pad, target) {
    if (!AH.skeleton) return null;
    const m = pad.glyphMask();
    const lay = pad.getLayout();
    const LF = AH.letterforms;
    const isWord = !!(target && target.kind === 'word');
    const rule = (function () {
      if (isWord) return wordRule(target.ex, target.glyph).startRule;
      if (!target || !target.char || !LF) return 'top';
      const f = LF.get(target.char, target.formKey || 'isolated');
      return f ? f.startRule : 'top';
    })();
    const input = {
      data: m.data, w: m.w, h: m.h,
      fontSize: lay.fontSize,
      expectedDots: isWord
        ? ((AH.data && AH.data.dotsInWord) ? AH.data.dotsInWord(target.glyph) : 0)
        : ((target && target.char && LF) ? LF.dotsOf(target.char) : 0)
    };
    try {
      return isWord
        ? AH.skeleton.analyzeWord(input, rule)
        : AH.skeleton.analyze(input, rule);
    } catch (e) { return null; }
  }

  /**
   * ÜSLUP TAŞIMA: hedefin kendi iskeletini al, öğretmenin kurallarına
   * göre yeniden düzenle — başlangıç ucu, yön, hamle bölünmesi, kalem.
   */
  function transferManner(sig, pad, target) {
    const auto = autoOf(pad, target);
    if (!auto) return null;
    const box = pad.inkBox();
    const lay = pad.getLayout();
    if (!box || !lay) return null;

    const toBox = (p) => [
      +((box.maxx - p.x) / (box.w || 1)).toFixed(4),
      +((p.y - box.miny) / (box.h || 1)).toFixed(4)
    ];

    const isWord = !!(target && target.kind === 'word');

    let parts = (auto.parts && auto.parts.length ? auto.parts.map((p) => p.path) : [auto.path])
      .filter((p) => p && p.length > 1);
    if (!parts.length) return null;

    /* (1) Başlangıç ucu.
       HARFLERDE: öğretmen hangi uçtan başlıyorsa parça ona göre çevrilir.
       KELİMELERDE ÇEVİRME YAPILMAZ — kelimenin kendi parçaları zaten
       kelimenin ilk (en sağdaki) harfine göre sıralanmıştır. Öğretilen
       harfin başlangıç ucu (ör. م/ع üstten-SOLDAN başlar) kelimeye
       uygulanırsa yazım SOLDAN başlar ve Arapçanın yönü tersine döner. */
    if (!isWord) {
      parts = parts.map((p) => {
        const a = toBox(p[0]), b = toBox(p[p.length - 1]);
        return cornerScore(sig.startCorner, b) > cornerScore(sig.startCorner, a)
          ? p.slice().reverse() : p;
      });
    }

    /* (2) Hamle sayısı: öğretmen tek parçayı birden çok hamlede yazıyorsa
           ve hedef tek parçaysa, aynı uzunluk oranlarında böl.
           Kelimelerde parçalar harflerin kendi sınırlarıdır — bölünmez. */
    if (!isWord && parts.length === 1 && sig.strokeCount > 1 &&
        sig.splits.length === sig.strokeCount) {
      parts = splitByRatios(parts[0], sig.splits);
    }

    /* NOT: "her hamle sağdan başlamalı" gibi bir düzeltme YAPILMAZ.
       Kitapçığa göre ج ح خ ص ض ع غ م harfleri gerçekten SOL ÜST uçtan
       başlar; böyle bir kural onları bozardı. Kelimelerde parça yönü
       zaten analyzeWord tarafından kelimenin ilk harfine göre kurulur. */

    const strokes = parts.map((p) => simplify(p, Math.max(1.2, lay.fontSize * 0.012)).map(toBox));

    /* (3) Noktalar: hedefin gerçek nokta konumları + öğretmenin yarıçapı */
    const r = sig.dots.length ? sig.dots[0][2] : 0.06;
    const dots = (auto.dots || []).map((d) => {
      const b = toBox(d);
      return [b[0], b[1], r];
    });

    const rec = toRecord(sig, pad, strokes, dots);
    if (rec) {
      rec.learned = { from: sig.glyph, mode: 'manner', at: Date.now() };
    }
    return rec;
  }

  /** Bir uç, istenen köşeye ne kadar yakın? (büyük = daha uygun) */
  function cornerScore(corner, b) {
    const bx = b[0], by = b[1];       /* bx: 0 sağ → 1 sol */
    switch (corner) {
      case 'top': return -by;
      case 'bottom': return by;
      case 'right': return -bx;
      case 'left': return bx;
      case 'topleft': return bx - by;
      case 'topright': return -bx - by;
      case 'bottomleft': return bx + by;
      case 'bottomright': return -bx + by;
      default: return -by;
    }
  }

  /** Tek yolu, verilen uzunluk oranlarında hamlelere böl. */
  function splitByRatios(path, ratios) {
    const total = pathLength(path);
    if (total <= 0) return [path];
    const out = [];
    let idx = 0, acc = 0, target = 0;
    let cur = [path[0]];
    for (let k = 0; k < ratios.length - 1; k++) {
      target += ratios[k] * total;
      while (idx < path.length - 1 && acc < target) {
        acc += dist(path[idx], path[idx + 1]);
        idx++;
        cur.push(path[idx]);
      }
      if (cur.length > 1) out.push(cur);
      cur = [path[idx]];
    }
    for (let i = idx + 1; i < path.length; i++) cur.push(path[i]);
    if (cur.length > 1) out.push(cur);
    return out.length ? out : [path];
  }

  /** Hedef için önerilen kaydı üretir (mode'a göre). */
  function proposal(sig, pad, target) {
    return target.mode === 'exact'
      ? transferExact(sig, pad, target)
      : transferManner(sig, pad, target);
  }

  /* ------------------------------------------------------------------ */
  /* 4) SAKLAMA — öğrenilen imzalar                                      */
  /* ------------------------------------------------------------------ */
  const KEY = 'arapca-harfler-learned-v1';

  function loadAll() {
    /* Önce uygulamaya gömülü (kalıcı) imzalar, üstüne tarayıcıdakiler.
       İmzalar js/custom-learn.js'e taşındı (yalnız atölye yükler); eski
       tek dosyalı kurulumlar için custom-data.learned de okunur. */
    /* ⚠ Boş nesne de "doğru"dur: sadece `||` kullanmak, BOŞ yeni dosyanın
       DOLU eski dosyayı gölgelemesine ve imzaların kaybolmasına yol açar.
       Bu yüzden ilk DOLU kaynak seçilir. */
    const a = (AH.customLearn && AH.customLearn.learned) || null;
    const b = (AH.customData && AH.customData.learned) || null;
    const baked = (a && Object.keys(a).length) ? a
                : (b && Object.keys(b).length) ? b : {};
    let local = {};
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) local = JSON.parse(raw) || {};
    } catch (e) {}
    return Object.assign({}, baked, local);
  }

  /** İmza anahtarı: harflerde "ب|isolated", kelimelerde "w|باب". */
  function sigKey(sig) {
    return sig.isWord ? 'w|' + sig.glyph : sig.char + '|' + sig.formKey;
  }

  function saveSig(sig) {
    let local = {};
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) local = JSON.parse(raw) || {};
    } catch (e) {}
    local[sigKey(sig)] = sig;
    try { localStorage.setItem(KEY, JSON.stringify(local)); } catch (e) {}
    return true;
  }

  function localOnly() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch (e) { return {}; }
  }

  function getSig(char, formKey) { return loadAll()[char + '|' + formKey] || null; }
  function getWordSig(glyph) { return loadAll()['w|' + glyph] || null; }
  function count() { return Object.keys(loadAll()).length; }
  function drop(key) {
    const local = localOnly();
    delete local[key];
    try { localStorage.setItem(KEY, JSON.stringify(local)); } catch (e) {}
  }
  function forget(char, formKey) { drop(char + '|' + formKey); }
  function forgetWord(glyph) { drop('w|' + glyph); }

  AH.learn = {
    FORM_KEYS, FORM_LABEL, FORM_LABEL_AR,
    capture, selfRecord, toRecord, fromWord, joinGroups, bodyComponents,
    targets, siblings, glyphOf, wordsWith, wordRule,
    proposal, transferExact, transferManner, autoOf, cornerScore, cornerOf,
    save: saveSig, get: getSig, getWord: getWordSig, all: loadAll, localOnly,
    count, forget, forgetWord
  };
})();

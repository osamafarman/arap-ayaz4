/* =========================================================================
   strokecheck.js — Öğrencinin harfi NASIL yazdığını denetler

   Sadece "şekil benziyor mu?" diye bakmaz; kitapçığın öğrettiği yazım
   disiplinini ölçer:

     1. BAŞLANGIÇ  — kalemi doğru uçtan mı indirdi?
     2. YÖN/SIRA   — hareketi doğru yönde ve baştan sona mı sürdürdü?
     3. ŞEKİL      — harfin gövdesini ne kadar doğru kapladı?
     4. NOKTALAR   — kaç tane, doğru yerde mi?

   Geçme notu %80'dir ve şu üç şart ayrıca sağlanmalıdır:
   doğru başlangıç, doğru yön, eksiksiz ve yerinde noktalar.
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const PASS = 80;

  function len(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function bbox(pts) {
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (const p of pts) {
      if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x;
      if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y;
    }
    return { minx, maxx, miny, maxy, w: maxx - minx, h: maxy - miny,
             cx: (minx + maxx) / 2, cy: (miny + maxy) / 2,
             diag: Math.hypot(maxx - minx, maxy - miny) };
  }

  function pathLength(pts) {
    let t = 0;
    for (let i = 1; i < pts.length; i++) t += len(pts[i - 1], pts[i]);
    return t;
  }

  /** Poligon çizgisini kümülatif uzunlukla parametrize eder. */
  function parametrize(path) {
    const cum = [0];
    for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + len(path[i - 1], path[i]));
    const total = cum[cum.length - 1] || 1;
    return { cum, total };
  }

  /** Noktayı yola izdüşürür → { s: 0..1 konum, d: uzaklık }. */
  function project(p, path, par) {
    let best = { s: 0, d: Infinity };
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const vx = b.x - a.x, vy = b.y - a.y;
      const L2 = vx * vx + vy * vy;
      let t = L2 ? ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2 : 0;
      t = Math.max(0, Math.min(1, t));
      const qx = a.x + vx * t, qy = a.y + vy * t;
      const d = Math.hypot(p.x - qx, p.y - qy);
      if (d < best.d) best = { s: (par.cum[i - 1] + t * len(a, b)) / par.total, d };
    }
    return best;
  }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  /**
   * @param {object} o
   *   strokes    : öğrencinin çizgileri [[{x,y}…]…]
   *   refPath    : harfin orta ekseni [{x,y}…]
   *   refDots    : beklenen nokta merkezleri [{x,y,r}…]
   *   shape      : pad.evaluate() sonucu {coverage, precision}
   *   fontSize   : harf boyu (px)
   *   dotsInfo   : {count, side}
   */
  function check(o) {
    const strokes = (o.strokes || []).filter((s) => s.length > 0);
    const ref = o.refPath || [];
    const refDots = o.refDots || [];
    const fs = o.fontSize || 100;
    const problems = [];

    if (!strokes.length) {
      return { empty: true, pass: false, score: 0, parts: {}, problems: [] };
    }
    if (ref.length < 2) {
      /* Referans yol yoksa (kelimeler) sadece biçim puanı */
      const sc = Math.round((o.shape.coverage * 0.62 + o.shape.precision * 0.38) * 100);
      return { pass: sc >= PASS, score: sc, parts: { shape: sc }, problems: [], noRef: true };
    }

    const refBox = bbox(ref);        /* hedef yolun kutusu — oran/satır ölçütü */

    /* --- 1) çizgileri ayır: gövde mi, nokta mı ---
       Ölçü, harfin GERÇEK nokta yarıçapından türetilir; yoksa yarım kalan
       bir gövde çizgisi yanlışlıkla "nokta" sayılabiliyordu. */
    const dotR = refDots.length
      ? refDots.reduce((a, d) => a + (d.r || 0), 0) / refDots.length
      : 0;
    const dotLimit = dotR > 1 ? Math.max(dotR * 3.2, 0.09 * fs) : 0.18 * fs;
    const bodyStrokes = [], dotStrokes = [];
    for (const s of strokes) {
      const b = bbox(s);
      const L = pathLength(s);
      /* Nokta: küçük ve "toplu" olmalı (uzun bir çizgi değil).
         ÖNEMLİ: parmakla tek dokunuşta çizgi tek noktadan oluşur; o zaman
         hem diag hem uzunluk 0'dır. Eskiden "L < diag*4" koşulu 0 < 0
         olduğu için bu dokunuşlar nokta sayılmıyor, gövdeye karışıp
         "nokta eksik" hatası veriyordu. */
      const compact = L <= Math.max(8, b.diag * 4);
      const isDot = b.diag < dotLimit && L < dotLimit * 2.2 && compact;
      (isDot ? dotStrokes : bodyStrokes).push(s);
    }
    if (!bodyStrokes.length) {
      problems.push({ code: 'no-body', msg: 'Harfin gövdesini çizmemişsin — önce gövdeyi yaz, noktaları en sona bırak.' });
      return { pass: false, score: 0, parts: {}, problems };
    }

    const body = bodyStrokes.reduce((a, s) => a.concat(s), []);
    const par = parametrize(ref);

    /* --- 2) başlangıç ---
       İki ölçüt birden: (a) doğru başlangıca uzaklık,
       (b) yol üzerindeki KONUM. (b) olmadan, harfin ortasından başlayan
       öğrenci "yakın" sayılıp geçebiliyordu. */
    const startTol = Math.max(0.14 * fs, 18);
    const dStart = len(body[0], ref[0]);
    const startS = project(body[0], ref, par).s;      /* 0 = baş, 1 = son */
    const startOK = dStart <= startTol * 1.35 && startS <= 0.15;
    const startScore = clamp01(1 - Math.max(dStart / (startTol * 2.2), startS / 0.35));

    /* Yanlış uçtan mı, ortadan mı, yoksa sonraki harften mi başladı?
       Kelime birden çok bitişik parçadan oluşuyorsa (ör. با + ب), hangi
       parçadan başladığını da söyleyebiliriz. */
    const parts = o.refParts && o.refParts.length > 1 ? o.refParts : null;
    let startPart = 0;
    if (parts) {
      let bd = Infinity;
      parts.forEach((pp, i) => {
        if (pp.length < 2) return;
        const d = project(body[0], pp, parametrize(pp)).d;
        if (d < bd) { bd = d; startPart = i; }
      });
    }

    if (!startOK) {
      let msg;
      if (parts && startPart > 0) {
        msg = 'Kelimenin SOLUNDAKİ harften başlamışsın. Arapça sağdan sola yazılır — ' +
              'en SAĞDAKİ harften, yeşil halkadan başla.';
      } else if (startS > 0.6) {
        msg = 'TERS UÇTAN başladın — sondan başlamışsın. Yeşil halkanın olduğu yerden başla.';
      } else if (startS > 0.15) {
        msg = 'ORTADAN başlamışsın. Kalemi yeşil halkanın üstüne koyup baştan başla.';
      } else {
        msg = 'Yanlış yerden başladın. Kalemi yeşil halkanın üstüne koyup oradan başla.';
      }
      problems.push({ code: 'start', msg });
    }

    /* --- 3) bitiş --- */
    const dEnd = len(body[body.length - 1], ref[ref.length - 1]);
    const endScore = clamp01(1 - dEnd / (startTol * 2.6));

    /* --- 4) yön ve süreklilik --- */
    const step = Math.max(1, Math.floor(body.length / 90));
    const proj = [];
    for (let i = 0; i < body.length; i += step) proj.push(project(body[i], ref, par));

    let forward = 0, backward = 0;
    for (let i = 1; i < proj.length; i++) {
      const d = proj[i].s - proj[i - 1].s;
      if (d > 0.002) forward++;
      else if (d < -0.002) backward++;
    }
    const moves = forward + backward;
    const dirScore = moves ? forward / moves : 0;
    const sMin = Math.min.apply(null, proj.map((p) => p.s));
    const sMax = Math.max.apply(null, proj.map((p) => p.s));
    const span = sMax - sMin;

    if (moves && dirScore < 0.35) {
      problems.push({ code: 'reverse', msg: 'Harfi TERS YÖNDE yazdın. Oku takip et: Arapça sağdan sola yazılır.' });
    } else if (dirScore < 0.65) {
      problems.push({ code: 'wander', msg: 'Kalemi ileri geri gezdirmişsin. Tek akıcı hareketle, baştan sona yaz.' });
    }
    if (span < 0.75) {
      problems.push({ code: 'short', msg: 'Harfi sonuna kadar götürmemişsin; hareketi tamamla.' });
    }

    /* --- 5) noktalar --- */
    const dotTol = Math.max(0.26 * fs, 22);
    let matched = 0;
    const usedDot = new Array(dotStrokes.length).fill(false);
    const dotCentres = dotStrokes.map((s) => { const b = bbox(s); return { x: b.cx, y: b.cy }; });
    for (const rd of refDots) {
      let bi = -1, bd = Infinity;
      for (let i = 0; i < dotCentres.length; i++) {
        if (usedDot[i]) continue;
        const d = len(rd, dotCentres[i]);
        if (d < bd) { bd = d; bi = i; }
      }
      if (bi >= 0 && bd <= dotTol) { usedDot[bi] = true; matched++; }
    }
    const expected = refDots.length;
    const extra = dotCentres.length - matched;
    let dotScore = 1;
    if (expected) {
      dotScore = clamp01(matched / expected - Math.max(0, extra) * 0.25);
      if (matched < expected) {
        const side = (o.dotsInfo && o.dotsInfo.side) || '';
        problems.push({
          code: 'dots-missing',
          msg: dotCentres.length === 0
            ? 'Noktaları koymadın! Bu harfin ' + expected + ' noktası harfin ' + side + ' olmalı.'
            : 'Noktalar eksik ya da yanlış yerde: ' + matched + '/' + expected +
              ' doğru. Turuncu halkaların içine koy.'
        });
      } else if (extra > 0) {
        problems.push({ code: 'dots-extra', msg: 'Fazladan nokta koymuşsun. Bu harfte tam ' + expected + ' nokta var.' });
      }
    } else if (dotCentres.length > 0) {
      dotScore = clamp01(1 - dotCentres.length * 0.4);
      problems.push({ code: 'dots-none', msg: 'Bu harfin HİÇ noktası yok — fazladan nokta koymuşsun.' });
    }

    /* --- 6a) ORAN: harf, olması gereken büyüklükte mi?
       Ölçüt, harfin dış hattı değil TAKİP EDİLEN YOLDUR: öğrenciden yolun
       üstünden geçmesi isteniyor, dolayısıyla kutuları böyle karşılaştırmak
       elma-elmadır (dış hat kullanılırsa kalem kalınlığı kadar sapma çıkar). */
    const userBox = bbox(body);
    const MIN_DIM = Math.max(12, 0.08 * fs);   /* elif gibi tek eksenli harfler için */
    let proportion = 1;
    const ratios = [];
    if (refBox.w > MIN_DIM) ratios.push(userBox.w / refBox.w);
    if (refBox.h > MIN_DIM) ratios.push(userBox.h / refBox.h);
    if (ratios.length) {
      const err = ratios.reduce((a, r) => a + Math.abs(Math.log(Math.max(r, 0.05))), 0) / ratios.length;
      proportion = clamp01(1 - err / 0.8);     /* ~2,2 kat büyük/küçük → 0 */
      if (proportion < 0.55) {
        const big = ratios.reduce((a, r) => a + r, 0) / ratios.length > 1;
        problems.push({
          code: 'proportion',
          msg: big ? 'Harfi ÇOK BÜYÜK yazdın; kılavuz çizgilerin arasına sığdır.'
                   : 'Harfi ÇOK KÜÇÜK yazdın; kılavuz çizgileri doldur.'
        });
      }
    }

    /* --- 6b) SATIR: harf satır çizgisine oturuyor mu? --- */
    let baseline = 1;
    if (typeof o.baselineY === 'number' && refBox.h > 4) {
      /* hedef yolun satıra göre duruşu ile öğrencininki kıyaslanır */
      const tBelow = (refBox.maxy - o.baselineY) / Math.max(1, refBox.h);
      const uBelow = (userBox.maxy - o.baselineY) / Math.max(1, userBox.h);
      const drift = Math.abs(uBelow - tBelow);
      baseline = clamp01(1 - drift / 0.6);
      if (baseline < 0.55) {
        problems.push({
          code: 'baseline',
          msg: uBelow > tBelow ? 'Harf satırın ALTINA kaymış — kırmızı çizginin üstüne otur.'
                               : 'Harf satırdan YUKARIDA kalmış — kırmızı çizgiye indir.'
        });
      }
    }

    /* --- 6c) biçim --- */
    const shapeScore = clamp01(o.shape.coverage * 0.62 + o.shape.precision * 0.38);
    if (o.shape.coverage < 0.55) {
      problems.push({ code: 'coverage', msg: 'Harfin bir kısmı boş kalmış — çizgiyi harfin tam üstünden geçir.' });
    } else if (o.shape.precision < 0.6) {
      problems.push({ code: 'precision', msg: 'Çizgin harfin dışına taşmış — daha yakından takip et.' });
    }

    /* --- 7) toplam --- */
    const W = expected
      ? { shape: 0.36, start: 0.15, dir: 0.18, dots: 0.13, prop: 0.08, base: 0.07, end: 0.03 }
      : { shape: 0.43, start: 0.17, dir: 0.21, dots: 0.00, prop: 0.09, base: 0.07, end: 0.03 };
    const score = Math.round(
      (shapeScore * W.shape + startScore * W.start + dirScore * W.dir +
       dotScore * W.dots + proportion * W.prop + baseline * W.base +
       endScore * W.end) * 100
    );

    const pass =
      score >= PASS &&
      startOK &&
      dirScore >= 0.65 &&
      span >= 0.75 &&
      proportion >= 0.45 &&
      baseline >= 0.45 &&
      matched === expected &&
      (expected > 0 || dotCentres.length === 0);

    return {
      pass, score,
      /* Öğrencinin gerçekte nereden başlayıp nerede bitirdiği —
         tuvalde işaretlenir ("sen burada başladın"). */
      trace: {
        start: body[0],
        end: body[body.length - 1],
        startOK,
        refStart: ref[0],
        refEnd: ref[ref.length - 1]
      },
      parts: {
        shape: Math.round(shapeScore * 100),
        start: Math.round(startScore * 100),
        direction: Math.round(dirScore * 100),
        dots: Math.round(dotScore * 100),
        proportion: Math.round(proportion * 100),
        baseline: Math.round(baseline * 100),
        span: Math.round(span * 100)
      },
      dotsMatched: matched,
      dotsExpected: expected,
      problems
    };
  }

  AH.strokecheck = { check, PASS };
})();

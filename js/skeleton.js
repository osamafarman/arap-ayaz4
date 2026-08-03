/* =========================================================================
   skeleton.js — Harfin GERÇEK orta eksenini yazı tipinden çıkarır

   Neden: yazılış yolunu elle koordinat girerek tanımlamak yazı tipi
   değiştiğinde bozulur. Bunun yerine ekranda görünen harfin kendisinden
   iskeletini hesaplıyoruz:

     maske → bileşenlere ayır (gövde + noktalar)
           → inceltme (Zhang–Suen)
           → çıkıntıları buda
           → uçtan uca yürü  → sıralı yol
           → sadeleştir (Ramer–Douglas–Peucker)

   Böylece:
     • yol harfin tam ortasından geçer (animasyon doğru görünür),
     • NOKTALAR ayrı bileşen olarak otomatik bulunur (yerleri kesindir),
     • kalem kalınlığı da ölçülür (animasyonun açılma genişliği).

   Yazılış YÖNÜ veriden gelir: letterforms.js her form için hangi uçtan
   başlanacağını söyler (kitapçıktaki oklara göre).
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  /* ---------------------------------------------------------------- yardımcı */
  function idx(x, y, w) { return y * w + x; }

  /** Alfa kanalından ikili ızgara. */
  function toGrid(data, w, h, threshold) {
    const g = new Uint8Array(w * h);
    const t = threshold || 60;
    for (let i = 0, n = w * h; i < n; i++) g[i] = data[i * 4 + 3] > t ? 1 : 0;
    return g;
  }

  /** 8-komşuluk bağlı bileşenler. */
  function components(g, w, h) {
    const lab = new Int32Array(w * h).fill(-1);
    const comps = [];
    const stack = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = idx(x, y, w);
        if (!g[i] || lab[i] >= 0) continue;
        const id = comps.length;
        const px = [];
        let minx = x, maxx = x, miny = y, maxy = y;
        stack.push(i);
        lab[i] = id;
        while (stack.length) {
          const c = stack.pop();
          const cy = (c / w) | 0, cx = c - cy * w;
          px.push(c);
          if (cx < minx) minx = cx; if (cx > maxx) maxx = cx;
          if (cy < miny) miny = cy; if (cy > maxy) maxy = cy;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              const nx = cx + dx, ny = cy + dy;
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              const ni = idx(nx, ny, w);
              if (g[ni] && lab[ni] < 0) { lab[ni] = id; stack.push(ni); }
            }
          }
        }
        let sx = 0, sy = 0;
        for (const p of px) { const py = (p / w) | 0; sx += p - py * w; sy += py; }
        comps.push({
          id, pixels: px, count: px.length,
          cx: sx / px.length, cy: sy / px.length,
          minx, maxx, miny, maxy,
          w: maxx - minx + 1, h: maxy - miny + 1
        });
      }
    }
    return comps;
  }

  /* ---------------------------------------------------------------- inceltme */
  /* Zhang–Suen: şekli 1 piksel kalınlığında bir iskelete indirger. */
  function thin(g0, w, h) {
    const g = Uint8Array.from(g0);
    const P = [
      [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]
    ]; /* p2..p9 saat yönünde, kuzeyden başlayarak */
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : g[idx(x, y, w)]);
    let changed = true;
    const toRemove = [];

    while (changed) {
      changed = false;
      for (let step = 0; step < 2; step++) {
        toRemove.length = 0;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            if (!g[idx(x, y, w)]) continue;
            const n = P.map(([dx, dy]) => at(x + dx, y + dy));
            let B = 0;
            for (const v of n) B += v;
            if (B < 2 || B > 6) continue;
            let A = 0;
            for (let k = 0; k < 8; k++) if (!n[k] && n[(k + 1) % 8]) A++;
            if (A !== 1) continue;
            const [p2, p3, p4, p5, p6, p7, p8] = n;
            if (step === 0) {
              if (p2 * p4 * p6) continue;
              if (p4 * p6 * p8) continue;
            } else {
              if (p2 * p4 * p8) continue;
              if (p2 * p6 * p8) continue;
            }
            toRemove.push(idx(x, y, w));
          }
        }
        if (toRemove.length) {
          changed = true;
          for (const i of toRemove) g[i] = 0;
        }
      }
    }
    return g;
  }

  /* ---------------------------------------------------------------- graf */
  function neighbours(sk, w, h, i) {
    const y = (i / w) | 0, x = i - y * w;
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = idx(nx, ny, w);
        if (sk[ni]) out.push(ni);
      }
    }
    return out;
  }

  /** Kısa çıkıntıları (tüy) budar — yürüyüşün yanlış kola sapmasını önler. */
  function prune(sk, w, h, minLen) {
    for (let pass = 0; pass < 6; pass++) {
      const ends = [];
      for (let i = 0; i < sk.length; i++) {
        if (sk[i] && neighbours(sk, w, h, i).length === 1) ends.push(i);
      }
      let removed = 0;
      for (const e of ends) {
        if (!sk[e]) continue;
        const branch = [e];
        let cur = e, prev = -1;
        while (branch.length <= minLen) {
          const nb = neighbours(sk, w, h, cur).filter((n) => n !== prev);
          if (nb.length !== 1) break;          /* uç ya da kavşak */
          prev = cur; cur = nb[0];
          if (neighbours(sk, w, h, cur).length > 2) break; /* kavşağa geldik */
          branch.push(cur);
        }
        const endNb = neighbours(sk, w, h, cur);
        if (branch.length < minLen && endNb.length > 2) {
          for (const b of branch) sk[b] = 0;
          removed++;
        }
      }
      if (!removed) break;
    }
    return sk;
  }

  /**
   * Başlangıç ucundan iskeletin EN UZAK ucuna giden yolu bulur.
   * (Açgözlü yürüyüş kavşaklarda yanlış kola sapıp yolu yarıda kesiyordu;
   *  genişlik-öncelikli arama tüm harfi güvenle kat eder.)
   */
  function geodesicPath(sk, w, h, startIdx) {
    const parent = new Int32Array(sk.length).fill(-2);
    const queue = [startIdx];
    parent[startIdx] = -1;
    let far = startIdx;
    for (let qi = 0; qi < queue.length; qi++) {
      const cur = queue[qi];
      far = cur;                        /* BFS sırası → son çıkan en uzaktır */
      for (const n of neighbours(sk, w, h, cur)) {
        if (parent[n] === -2) { parent[n] = cur; queue.push(n); }
      }
    }
    const path = [];
    for (let c = far; c !== -1; c = parent[c]) path.push(c);
    path.reverse();
    return path;
  }

  /** k-ortalama: birleşmiş nokta lekelerini beklenen sayıya böler. */
  function kmeans(points, k, iters) {
    if (k <= 1 || points.length <= k) {
      return [points.reduce((a, p) => ({ x: a.x + p.x / points.length, y: a.y + p.y / points.length }), { x: 0, y: 0 })];
    }
    /* başlangıç merkezleri: ana eksen boyunca eşit aralıklı */
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (const p of points) {
      if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x;
      if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y;
    }
    const horiz = (maxx - minx) >= (maxy - miny);
    const cent = [];
    for (let i = 0; i < k; i++) {
      const t = (i + 0.5) / k;
      cent.push(horiz
        ? { x: minx + (maxx - minx) * t, y: (miny + maxy) / 2 }
        : { x: (minx + maxx) / 2, y: miny + (maxy - miny) * t });
    }
    for (let it = 0; it < (iters || 12); it++) {
      const sum = cent.map(() => ({ x: 0, y: 0, n: 0 }));
      for (const p of points) {
        let bi = 0, bd = Infinity;
        for (let i = 0; i < k; i++) {
          const d = (p.x - cent[i].x) ** 2 + (p.y - cent[i].y) ** 2;
          if (d < bd) { bd = d; bi = i; }
        }
        sum[bi].x += p.x; sum[bi].y += p.y; sum[bi].n++;
      }
      for (let i = 0; i < k; i++) {
        if (sum[i].n) { cent[i].x = sum[i].x / sum[i].n; cent[i].y = sum[i].y / sum[i].n; }
      }
    }
    return cent;
  }

  /* ------------------------------------------------------------- sadeleştir */
  function rdp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    let maxD = -1, index = 0;
    const a = pts[0], b = pts[pts.length - 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs((pts[i].x - a.x) * dy - (pts[i].y - a.y) * dx) / len;
      if (d > maxD) { maxD = d; index = i; }
    }
    if (maxD <= eps) return [a, b];
    const left = rdp(pts.slice(0, index + 1), eps);
    const right = rdp(pts.slice(index), eps);
    return left.slice(0, -1).concat(right);
  }

  /* ---------------------------------------------------------------- ana giriş */
  /**
   * @param {ImageData-benzeri} mask  {data,w,h} — harfin çizildiği alfa maskesi
   * @param {string} startRule  'top' | 'right' | 'left' | 'topleft' | 'bottomright'
   * @returns {{path:Array<{x,y}>, dots:Array<{x,y,r}>, thickness:number}|null}
   */
  function analyze(mask, startRule) {
    /* Hız için mürekkebin çevresine kırp; sonuçlar sonunda geri ötelenir. */
    const crop = cropToInk(mask);
    if (!crop) return null;
    const out = analyzeCropped(crop, startRule);
    if (!out) return null;
    out.path.forEach((p) => { p.x += crop.ox; p.y += crop.oy; });
    out.dots.forEach((d) => { d.x += crop.ox; d.y += crop.oy; });
    return out;
  }

  function cropToInk(mask) {
    const { data, w, h } = mask;
    let minx = w, maxx = -1, miny = h, maxy = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[idx(x, y, w) * 4 + 3] > 60) {
          if (x < minx) minx = x; if (x > maxx) maxx = x;
          if (y < miny) miny = y; if (y > maxy) maxy = y;
        }
      }
    }
    if (maxx < 0) return null;
    const pad = 2;
    minx = Math.max(0, minx - pad); miny = Math.max(0, miny - pad);
    maxx = Math.min(w - 1, maxx + pad); maxy = Math.min(h - 1, maxy + pad);
    const cw = maxx - minx + 1, ch = maxy - miny + 1;
    const out = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        out[idx(x, y, cw) * 4 + 3] = data[idx(x + minx, y + miny, w) * 4 + 3];
      }
    }
    return { data: out, w: cw, h: ch, ox: minx, oy: miny, expectedDots: mask.expectedDots };
  }

  function analyzeCropped(mask, startRule) {
    const { data, w, h } = mask;
    const g = toGrid(data, w, h);
    const comps = components(g, w, h);
    if (!comps.length) return null;

    comps.sort((a, b) => b.count - a.count);
    const body = comps[0];

    /* Noktalar: gövde dışındaki küçük bileşenler.
       Bazı yazı tiplerinde ت / ث noktaları BİRLEŞİK çizilir; bu yüzden
       beklenen sayı biliniyorsa lekeler k-ortalama ile bölünür. */
    /* Gövde en büyük bileşendir; kalan her şey noktadır.
       (Küçük formlarda — تـ gibi — nokta lekesi gövdeye oranla büyük
        kalabildiği için oransal eleme yapılmaz.) */
    const blobs = comps.slice(1).filter((c) => c.count > 3);
    let dots;
    const want = mask.expectedDots;
    if (want && blobs.length && blobs.length !== want) {
      const pts = [];
      for (const c of blobs) {
        for (const p of c.pixels) {
          const y = (p / w) | 0;
          pts.push({ x: p - y * w, y });
        }
      }
      const r = Math.sqrt(pts.length / want / Math.PI);
      dots = kmeans(pts, want).map((c) => ({ x: c.x, y: c.y, r, merged: true }));
    } else {
      dots = blobs.map((c) => ({ x: c.cx, y: c.cy, r: Math.max(c.w, c.h) / 2, count: c.count }));
    }

    /* Sadece gövdeyi içeren ızgara */
    const bg = new Uint8Array(w * h);
    for (const p of body.pixels) bg[p] = 1;

    const sk = thin(bg, w, h);
    let skCount = 0;
    for (let i = 0; i < sk.length; i++) if (sk[i]) skCount++;
    if (!skCount) return null;

    /* Sadece gürültü sivrilerini temizle: gerçek uçlar (elifin tepesi,
       ح'nin başlık ucu) korunmalı, yoksa başlangıç ucu kaybolur. */
    prune(sk, w, h, 4);

    /* uçlar */
    const ends = [];
    for (let i = 0; i < sk.length; i++) {
      if (sk[i] && neighbours(sk, w, h, i).length === 1) ends.push(i);
    }
    const score = (i) => {
      const y = (i / w) | 0, x = i - y * w;
      switch (startRule) {
        case 'top': return -y;
        case 'bottom': return y;
        case 'left': return -x;
        case 'right': return x;
        case 'topleft': return -(x + y);
        case 'topright': return x - y;
        default: return x;
      }
    };
    let candidates = ends;
    if (candidates.length < 2) {
      /* uç bulunamadıysa (halka ya da aşırı budama) tüm iskeleti tara */
      candidates = [];
      for (let i = 0; i < sk.length; i++) if (sk[i]) candidates.push(i);
    }
    const startIdx = candidates.reduce((a, b) => (score(b) > score(a) ? b : a), candidates[0]);

    const raw = geodesicPath(sk, w, h, startIdx).map((i) => {
      const y = (i / w) | 0;
      return { x: i - y * w, y };
    });
    if (raw.length < 2) return null;

    const path = rdp(raw, 1.6);
    const thickness = body.count / Math.max(1, raw.length);

    return { path, dots, thickness, skeletonLength: raw.length };
  }

  /* ------------------------------------------------------------------ */
  /* KELİME analizi                                                      */
  /* Bir kelime birden çok bitişik parçadan oluşabilir (ör. با + ب).      */
  /* Parçalar SAĞDAN SOLA sıralanır: Arapça yazımın gerçek sırası budur.  */
  /* ------------------------------------------------------------------ */
  /**
   * @param {object} mask {data,w,h,fontSize,expectedDots}
   * @param {string} firstStartRule ilk (en sağdaki) parçanın başlangıç ucu
   * @returns {{parts:Array, dots:Array, path:Array, thickness:number}|null}
   */
  function analyzeWord(mask, firstStartRule) {
    const crop = cropToInk(mask);
    if (!crop) return null;
    const { data, w, h } = crop;
    const g = toGrid(data, w, h);
    const comps = components(g, w, h);
    if (!comps.length) return null;

    /* Nokta mı gövde parçası mı?
       Boyuta bakmak yetmiyordu: د ر ز و gibi KISA harfler bağlanmadıkları
       için ayrı bileşen oluyor ve nokta sanılıyorlardı. Onun yerine
       kelimenin BEKLENEN nokta sayısı kullanılır:
         • hiç nokta yoksa → her bileşen gövde parçasıdır,
         • varsa → en küçük (ve gövdeye göre belirgin küçük) bileşenler nokta. */
    const want = mask.expectedDots || 0;
    let bodies, blobs;
    if (!want) {
      bodies = comps.slice();
      blobs = [];
    } else {
      const bySize = comps.slice().sort((a, b) => a.count - b.count);
      const maxCount = bySize[bySize.length - 1].count;
      blobs = bySize.filter((c) => c.count < maxCount * 0.5).slice(0, want);
      bodies = comps.filter((c) => blobs.indexOf(c) < 0);
    }
    if (!bodies.length) { bodies = comps.slice(); blobs = []; }

    /* Yazım sırası: en sağdaki parça önce */
    bodies.sort((a, b) => b.maxx - a.maxx);

    const parts = [];
    bodies.forEach((body, i) => {
      const bg = new Uint8Array(w * h);
      for (const p of body.pixels) bg[p] = 1;
      const sk = thin(bg, w, h);
      let n = 0;
      for (let k = 0; k < sk.length; k++) if (sk[k]) n++;
      if (!n) return;
      prune(sk, w, h, 4);
      const ends = [];
      for (let k = 0; k < sk.length; k++) {
        if (sk[k] && neighbours(sk, w, h, k).length === 1) ends.push(k);
      }
      const rule = i === 0 ? (firstStartRule || 'right') : 'right';
      const score = (k) => {
        const y = (k / w) | 0, x = k - y * w;
        switch (rule) {
          case 'top': return -y;
          case 'bottom': return y;
          case 'left': return -x;
          case 'right': return x;
          case 'topleft': return -(x + y);
          case 'topright': return x - y;
          default: return x;
        }
      };
      const allPix = [];
      for (let k = 0; k < sk.length; k++) if (sk[k]) allPix.push(k);

      /* İlk parça birden çok harf içerebilir (ör. "حا" = ح + ا).
         Kalem EN SAĞDAKİ harften başlar; bu yüzden başlangıç adayları
         parçanın sağ bölgesiyle sınırlanır — yoksa 'top' kuralı, daha
         uzun olan eliften başlatırdı.
         Ayrıca ق ف م ه gibi GÖZLÜ harflerde o bölgede hiç uç bulunmayabilir;
         o durumda uçlar yerine bölgedeki tüm iskelet pikselleri kullanılır. */
      let cand;
      if (i === 0) {
        const cut = body.maxx - (body.maxx - body.minx) * 0.55;
        const inZone = (k) => (k % w) >= cut;
        const endsInZone = ends.filter(inZone);
        const pixInZone = allPix.filter(inZone);
        cand = endsInZone.length ? endsInZone
             : pixInZone.length ? pixInZone
             : (ends.length ? ends : allPix);
      } else {
        cand = ends.length >= 2 ? ends : allPix;
      }
      if (!cand.length) return;
      const startIdx = cand.reduce((a, b) => (score(b) > score(a) ? b : a), cand[0]);
      const raw = geodesicPath(sk, w, h, startIdx).map((k) => {
        const y = (k / w) | 0;
        return { x: k - y * w + crop.ox, y: y + crop.oy };
      });
      if (raw.length < 2) return;
      parts.push({ path: rdp(raw, 1.6), thickness: body.count / raw.length });
    });
    if (!parts.length) return null;

    /* noktalar (gerekirse birleşik lekeleri böl) — `want` yukarıda tanımlı */
    let dots;
    if (want && blobs.length && blobs.length !== want) {
      const pts = [];
      for (const c of blobs) {
        for (const p of c.pixels) {
          const y = (p / w) | 0;
          pts.push({ x: p - y * w, y });
        }
      }
      const r = Math.sqrt(pts.length / want / Math.PI);
      dots = kmeans(pts, want).map((c) => ({ x: c.x + crop.ox, y: c.y + crop.oy, r, merged: true }));
    } else {
      dots = blobs.map((c) => ({
        x: c.cx + crop.ox, y: c.cy + crop.oy,
        r: Math.max(c.w, c.h) / 2, count: c.count
      }));
    }

    const path = parts.reduce((a, p) => a.concat(p.path), []);
    const thickness = parts.reduce((a, p) => a + p.thickness, 0) / parts.length;
    return { parts, dots, path, thickness };
  }

  AH.skeleton = { analyze, analyzeWord, components, thin, rdp };
})();

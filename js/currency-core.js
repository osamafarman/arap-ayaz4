/* =========================================================================
   currency-core.js — منطق تحويل الليرة السورية (القديمة ⇄ الجديدة)

   • سعر التحويل ثابت رسميًا: 100 ليرة قديمة = 1 ليرة جديدة (حذف صفرين).
   • كل الحسابات تجري بوحدة داخلية واحدة = "ليرة قديمة" (عدد صحيح)،
     حتى لا تتراكم أخطاء الكسور العشرية:  1 جديدة = 100 وحدة.
   • الدالة الأهم: makeChange() — تحسب أقلّ عدد أوراق يعطيها الشخص
     لمبلغ معيّن، مع مراعاة ما يملكه فعلًا من أوراق (اختياري).

   لا اعتماد على أي مكتبة خارجية، ويعمل في المتصفح وفي Node معًا.
   ========================================================================= */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SYP = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /* 100 ليرة قديمة = 1 ليرة جديدة */
  const RATE = 100;

  /* فئات العملة. القيمة بالفئة نفسها (لا بالوحدة الداخلية).
     on: هل هي متداولة/مفعّلة افتراضيًا. */
  const DENOMS = {
    /* الأوراق الجديدة (بدأ تداولها 2026/01/01): 10 · 25 · 50 · 100 · 200 · 500 */
    new: [
      { value: 500, kind: 'note', on: true },
      { value: 200, kind: 'note', on: true },
      { value: 100, kind: 'note', on: true },
      { value: 50,  kind: 'note', on: true },
      { value: 25,  kind: 'note', on: true },
      { value: 10,  kind: 'note', on: true }
    ],
    /* الأوراق القديمة المتداولة، والقطع المعدنية القديمة مطفأة افتراضيًا
       لأنها عمليًا خرجت من الاستعمال. */
    old: [
      { value: 5000, kind: 'note', on: true },
      { value: 2000, kind: 'note', on: true },
      { value: 1000, kind: 'note', on: true },
      { value: 500,  kind: 'note', on: true },
      { value: 200,  kind: 'note', on: true },
      { value: 100,  kind: 'note', on: true },
      { value: 50,   kind: 'note', on: true },
      { value: 25,   kind: 'coin', on: false },
      { value: 10,   kind: 'coin', on: false },
      { value: 5,    kind: 'coin', on: false }
    ]
  };

  /* ---------------------------------------------------------------- أرقام */

  /* يقبل الأرقام العربية (٠١٢…) والفواصل والمسافات: "١٢٬٥٠٠" → 12500 */
  function parseAmount(str) {
    if (typeof str === 'number') return isFinite(str) ? str : null;
    if (str == null) return null;
    let s = String(str).trim();
    if (!s) return null;
    /* أرقام عربية-هندية وفارسية → لاتينية */
    s = s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
         .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
    /* فواصل الآلاف والمسافات (بما فيها المسافة غير الفاصلة) تُحذف */
    s = s.replace(/[,٬  \s'’]/g, '');
    /* الفاصلة العشرية العربية → نقطة */
    s = s.replace(/٫/g, '.');
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return null;
    const n = Number(s);
    return isFinite(n) ? n : null;
  }

  /* تقريب لأقرب عدد صحيح من الوحدات (= ليرة قديمة) */
  function toUnits(amount, cur) {
    const n = typeof amount === 'number' ? amount : parseAmount(amount);
    if (n == null) return null;
    return Math.round(cur === 'new' ? n * RATE : n);
  }

  function fromUnits(units, cur) {
    if (units == null) return null;
    return cur === 'new' ? units / RATE : units;
  }

  /* تحويل مبلغ من عملة إلى الأخرى → { old, new, units } */
  function convert(amount, from) {
    const units = toUnits(amount, from);
    if (units == null) return null;
    return { units: units, old: fromUnits(units, 'old'), new: fromUnits(units, 'new') };
  }

  /* تنسيق للعرض: فواصل آلاف، وحتى منزلتين عشريتين بلا أصفار زائدة */
  function format(amount) {
    if (amount == null || !isFinite(amount)) return '—';
    const neg = amount < 0;
    const v = Math.abs(amount);
    const rounded = Math.round(v * 100) / 100;
    const intPart = Math.floor(rounded);
    const frac = Math.round((rounded - intPart) * 100);
    let out = String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (frac) out += '.' + (frac % 10 === 0 ? String(frac / 10) : String(frac).padStart(2, '0'));
    return (neg ? '-' : '') + out;
  }

  /* ------------------------------------------------------- حلّ الفئات (DP) */

  function gcd(a, b) { while (b) { const t = a % b; a = b; b = t; } return a; }

  function emptyPlan() { return { items: [], notes: 0, total: 0 }; }

  function planTotal(items) {
    return items.reduce((s, it) => s + it.value * it.count, 0);
  }

  /* يبني قائمة الفئات الفعّالة بوحدة الحساب الداخلية.
     denoms: [{ value, count }] — value بالفئة نفسها، count عدد ما تملكه
     (null/undefined = غير محدود). */
  function activeDenoms(denoms, cur) {
    const mul = cur === 'new' ? RATE : 1;
    return denoms
      .filter((d) => d && d.value > 0 && (d.count == null || d.count > 0))
      .map((d) => ({
        face: d.value,
        value: Math.round(d.value * mul),
        count: d.count == null ? null : Math.floor(d.count)
      }))
      .sort((a, b) => b.value - a.value);
  }

  const INF = 0xffff;

  /**
   * makeChange — أقلّ عدد أوراق لدفع مبلغ.
   *
   * target : المبلغ بالوحدة الداخلية (ليرة قديمة، عدد صحيح)
   * denoms : [{ value, count }] بفئات العملة cur
   * cur    : 'old' | 'new'
   *
   * الناتج:
   *   { exact, target, best, under, over, capped }
   *   best  : الحل المضبوط (إن وُجد) — { items:[{value,count}], notes, total }
   *   under : أكبر مبلغ يمكن تكوينه ولا يتجاوز المطلوب
   *   over  : أصغر مبلغ يمكن تكوينه ويغطّي المطلوب (تُعاد منه البقية)
   * القيم في items بفئات العملة (مثلاً 500 للورقة الجديدة 500).
   */
  function makeChange(target, denoms, cur, opts) {
    opts = opts || {};
    const MAX_CELLS = opts.maxCells || 400000;
    const out = { exact: false, target: target, best: null, under: null, over: null, capped: false };

    if (!(target >= 0)) return out;
    const act = activeDenoms(denoms || [], cur);
    if (target === 0) { out.exact = true; out.best = emptyPlan(); out.under = emptyPlan(); out.over = emptyPlan(); return out; }
    if (!act.length) { out.under = emptyPlan(); return out; }

    const maxV = act[0].value;
    const unlimited = act.every((d) => d.count == null);

    /* المبالغ الكبيرة: نخصم مسبقًا أكبر فئة حتى يبقى نطاق صغير للـ DP.
       (صحيح لأن الفئات غير محدودة، وأكبر فئة تُستعمل قدر الإمكان) */
    const pre = [];
    let base = target;
    if (unlimited) {
      const windowSize = maxV * 40;
      if (base > windowSize) {
        const k = Math.floor((base - windowSize) / maxV);
        if (k > 0) { pre.push({ value: act[0].face, count: k }); base -= k * maxV; }
      }
    }

    const g = act.reduce((acc, d) => gcd(acc, d.value), 0) || 1;
    /* سقف الفهرسة: المطلوب + أكبر فئة (لنجد الحل الذي يغطّي المبلغ)،
       ومحدود أيضًا بمجموع ما يملكه المستخدم. */
    let limit = base + maxV;
    if (!unlimited) {
      const wallet = act.reduce((s, d) => s + d.value * (d.count == null ? 1e9 : d.count), 0);
      limit = Math.min(limit, wallet);
    }
    let N = Math.floor(limit / g);
    if (N > MAX_CELLS) { N = MAX_CELLS; out.capped = true; }

    const dp = new Uint16Array(N + 1).fill(INF);
    dp[0] = 0;
    const layers = [];
    for (let d = 0; d < act.length; d++) {
      const step = act[d].value / g;
      if (step > N) { layers.push(null); continue; }
      const cap = act[d].count == null ? Infinity : act[d].count;
      const used = new Uint16Array(N + 1);
      for (let i = step; i <= N; i++) {
        const prev = dp[i - step];
        if (prev !== INF && prev + 1 < dp[i] && used[i - step] < cap) {
          dp[i] = prev + 1;
          used[i] = used[i - step] + 1;
        }
      }
      layers.push({ step: step, used: used, face: act[d].face });
    }

    /* إعادة بناء الحل عند الفهرس idx */
    function build(idx) {
      const items = [];
      let i = idx;
      for (let d = layers.length - 1; d >= 0; d--) {
        const L = layers[d];
        if (!L) continue;
        const k = L.used[i];
        if (k > 0) { items.push({ value: L.face, count: k }); i -= k * L.step; }
      }
      items.sort((a, b) => b.value - a.value);
      /* نضمّ الفئات المخصومة مسبقًا */
      for (const p of pre) {
        const hit = items.find((it) => it.value === p.value);
        if (hit) hit.count += p.count; else items.push(p);
      }
      items.sort((a, b) => b.value - a.value);
      const notes = items.reduce((s, it) => s + it.count, 0);
      return { items: items, notes: notes, total: planTotal(items) * (cur === 'new' ? RATE : 1) };
    }

    const tIdx = base % g === 0 ? base / g : -1;
    if (tIdx >= 0 && tIdx <= N && dp[tIdx] !== INF) {
      out.exact = true;
      out.best = build(tIdx);
      out.under = out.best;
      out.over = out.best;
      return out;
    }

    /* أقرب مبلغ أقل أو يساوي */
    for (let i = Math.min(N, Math.floor(base / g)); i >= 0; i--) {
      if (dp[i] !== INF) { out.under = build(i); break; }
    }
    /* أقرب مبلغ يغطّي المطلوب */
    for (let i = Math.ceil(base / g); i <= N; i++) {
      if (dp[i] !== INF) { out.over = build(i); break; }
    }
    return out;
  }

  /* واجهة مختصرة: خطة الدفع لمبلغ بعملة معيّنة */
  function payPlan(amount, cur, denoms, opts) {
    const units = toUnits(amount, cur);
    if (units == null) return null;
    return makeChange(units, denoms, cur, opts);
  }

  /* الفئات الافتراضية لعملة ما (نسخة قابلة للتعديل) */
  function defaultDenoms(cur, onlyOn) {
    return DENOMS[cur]
      .filter((d) => (onlyOn === false ? true : d.on))
      .map((d) => ({ value: d.value, kind: d.kind, on: d.on, count: null }));
  }

  return {
    RATE: RATE,
    DENOMS: DENOMS,
    parseAmount: parseAmount,
    toUnits: toUnits,
    fromUnits: fromUnits,
    convert: convert,
    format: format,
    makeChange: makeChange,
    payPlan: payPlan,
    defaultDenoms: defaultDenoms,
    _gcd: gcd
  };
});

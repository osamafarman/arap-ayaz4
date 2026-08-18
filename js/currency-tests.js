/* =========================================================================
   currency-tests.js — اختبارات منطق التحويل والفئات

   تعمل في المتصفح (test-currency.html) وفي Node:
       node js/currency-tests.js
   ========================================================================= */
(function (root, factory) {
  'use strict';
  const S = (typeof module === 'object' && module.exports)
    ? require('./currency-core.js')
    : root.SYP;
  const api = factory(S);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    if (require.main === module) {
      const res = api.run();
      let pass = 0, fail = 0;
      res.groups.forEach((g) => {
        console.log('\n— ' + g.name);
        g.cases.forEach((c) => {
          if (c.ok) { pass++; console.log('  ✓ ' + c.name); }
          else { fail++; console.log('  ✗ ' + c.name + ' → ' + c.msg); }
        });
      });
      console.log('\nناجح: ' + pass + ' · فاشل: ' + fail);
      process.exit(fail ? 1 : 0);
    }
  } else {
    root.SYPTests = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (S) {
  'use strict';

  function run() {
    const groups = [];
    let group = null;
    const G = (name) => { group = { name: name, cases: [] }; groups.push(group); };
    const ok = (name, cond, msg) => group.cases.push({ name: name, ok: !!cond, msg: msg || '' });
    const eq = (name, got, want) =>
      ok(name, got === want, 'المتوقع ' + JSON.stringify(want) + ' والناتج ' + JSON.stringify(got));
    const deep = (name, got, want) =>
      ok(name, JSON.stringify(got) === JSON.stringify(want),
         'المتوقع ' + JSON.stringify(want) + ' والناتج ' + JSON.stringify(got));

    /* ----------------------------------------------------- قراءة الأرقام */
    G('قراءة المبالغ المكتوبة');
    eq('عدد بسيط', S.parseAmount('7500'), 7500);
    eq('فاصلة آلاف', S.parseAmount('12,500'), 12500);
    eq('فاصلة آلاف عربية', S.parseAmount('12٬500'), 12500);
    eq('أرقام عربية', S.parseAmount('١٢٥٠٠'), 12500);
    eq('أرقام فارسية', S.parseAmount('۱۲۵'), 125);
    eq('كسر عشري', S.parseAmount('75.5'), 75.5);
    eq('فاصلة عشرية عربية', S.parseAmount('75٫5'), 75.5);
    eq('مسافات', S.parseAmount('  1 000 '), 1000);
    eq('نص غير رقمي', S.parseAmount('مئة'), null);
    eq('فارغ', S.parseAmount('   '), null);
    eq('نقطتان', S.parseAmount('1.2.3'), null);

    /* ------------------------------------------------------- سعر التحويل */
    G('سعر التحويل: 100 قديمة = 1 جديدة');
    eq('ثابت السعر', S.RATE, 100);
    eq('5000 قديمة = 50 جديدة', S.convert(5000, 'old').new, 50);
    eq('50 جديدة = 5000 قديمة', S.convert(50, 'new').old, 5000);
    eq('1 جديدة = 100 قديمة', S.convert(1, 'new').old, 100);
    eq('7500 قديمة = 75 جديدة', S.convert(7500, 'old').new, 75);
    eq('كسر: 12.34 جديدة = 1234 قديمة', S.convert(12.34, 'new').old, 1234);
    eq('صفر', S.convert(0, 'new').old, 0);
    eq('ذهاب وإياب', S.convert(S.convert(1234, 'old').new, 'new').old, 1234);
    eq('لا خطأ عشري', S.toUnits(0.29, 'new'), 29);
    eq('تقريب القديمة لعدد صحيح', S.toUnits(10.4, 'old'), 10);

    /* -------------------------------------------------------- طريقة العرض */
    G('تنسيق العرض');
    eq('فواصل آلاف', S.format(1234567), '1,234,567');
    eq('كسر منزلة', S.format(12.5), '12.5');
    eq('كسر منزلتين', S.format(12.34), '12.34');
    eq('بلا أصفار زائدة', S.format(12.0), '12');
    eq('سالب', S.format(-1500), '-1,500');

    /* ------------------------------------------------- الأوراق: حالة مضبوطة */
    G('الأوراق التي تعطيها — الحالة المضبوطة');
    const N = S.defaultDenoms('new');
    const O = S.defaultDenoms('old');

    let r = S.payPlan(785, 'new', N);
    ok('785 جديدة قابلة للدفع', r.exact, JSON.stringify(r));
    deep('785 = 500+200+50+25+10', r.best.items,
      [{ value: 500, count: 1 }, { value: 200, count: 1 }, { value: 50, count: 1 },
       { value: 25, count: 1 }, { value: 10, count: 1 }]);
    eq('عدد الأوراق 5', r.best.notes, 5);

    r = S.payPlan(40, 'new', N);
    ok('40 جديدة مضبوطة', r.exact, JSON.stringify(r));
    deep('40 = 4×10 وليس 25+10 (الجشع يفشل هنا)', r.best.items, [{ value: 10, count: 4 }]);

    r = S.payPlan(75, 'new', N);
    ok('75 مضبوطة', r.exact, '');
    deep('75 = 50+25', r.best.items, [{ value: 50, count: 1 }, { value: 25, count: 1 }]);

    r = S.payPlan(7500, 'old', O);
    ok('7500 قديمة مضبوطة', r.exact, '');
    deep('7500 = 5000+2000+500', r.best.items,
      [{ value: 5000, count: 1 }, { value: 2000, count: 1 }, { value: 500, count: 1 }]);

    r = S.payPlan(0, 'new', N);
    ok('صفر: لا أوراق', r.exact && r.best.items.length === 0, JSON.stringify(r));

    /* المجموع يساوي المطلوب دائمًا في الحالة المضبوطة */
    let sumOk = true, sumBad = '';
    for (let a = 10; a <= 3000; a += 5) {
      const p = S.payPlan(a, 'new', N);
      if (!p.exact) continue;
      const tot = p.best.items.reduce((s, it) => s + it.value * it.count, 0);
      if (tot !== a) { sumOk = false; sumBad = 'عند ' + a + ' الناتج ' + tot; break; }
      if (p.best.items.some((it) => it.count <= 0)) { sumOk = false; sumBad = 'عدد صفري عند ' + a; break; }
    }
    ok('مجموع الأوراق = المبلغ في كل الحالات المضبوطة (10…3000)', sumOk, sumBad);

    /* أقلّ عدد أوراق: مقارنة بحلّ مرجعي بطيء */
    function bruteMinNotes(target, values) {
      const dp = new Array(target + 1).fill(Infinity);
      dp[0] = 0;
      for (let i = 1; i <= target; i++) {
        for (const v of values) if (v <= i && dp[i - v] + 1 < dp[i]) dp[i] = dp[i - v] + 1;
      }
      return dp[target];
    }
    const nv = N.map((d) => d.value);
    let minOk = true, minBad = '';
    for (let a = 5; a <= 1200; a += 5) {
      const want = bruteMinNotes(a, nv);
      const p = S.payPlan(a, 'new', N);
      const got = p.exact ? p.best.notes : Infinity;
      if (got !== want) { minOk = false; minBad = 'عند ' + a + ': المتوقع ' + want + ' والناتج ' + got; break; }
    }
    ok('أقلّ عدد أوراق مطابق للحلّ المرجعي (5…1200)', minOk, minBad);

    /* --------------------------------------------- الأوراق: حالة غير مضبوطة */
    G('المبالغ التي لا يمكن دفعها بالضبط');
    r = S.payPlan(15, 'new', N);
    ok('15 جديدة غير ممكنة', !r.exact, JSON.stringify(r));
    deep('أقرب أقل = 10', r.under.items, [{ value: 10, count: 1 }]);
    deep('أقرب أعلى = 20', r.over.items, [{ value: 10, count: 2 }]);
    eq('الأعلى يغطّي المبلغ', r.over.total >= S.toUnits(15, 'new'), true);
    eq('الأقل لا يتجاوز المبلغ', r.under.total <= S.toUnits(15, 'new'), true);

    r = S.payPlan(5, 'new', N);
    ok('5 جديدة غير ممكنة', !r.exact, '');
    eq('لا يوجد أقل من 5 سوى لا شيء', r.under.items.length, 0);
    deep('أقرب أعلى = 10', r.over.items, [{ value: 10, count: 1 }]);

    r = S.payPlan(123, 'old', O);
    ok('123 قديمة غير ممكنة (أصغر ورقة 50)', !r.exact, '');
    eq('أقرب أعلى = 150', r.over.total, 150);
    eq('أقرب أقل = 100', r.under.total, 100);

    /* القطع المعدنية القديمة تجعل 123 غير ممكنة أيضًا، لكن 125 ممكنة */
    const Ocoins = S.defaultDenoms('old', false).map((d) => ({ value: d.value, count: null }));
    r = S.payPlan(125, 'old', Ocoins);
    ok('125 قديمة ممكنة مع المعدنية', r.exact, JSON.stringify(r));

    /* ----------------------------------------------------------- المحفظة */
    G('حدود ما تملكه من أوراق');
    const wallet = [
      { value: 500, count: 1 }, { value: 100, count: 2 }, { value: 50, count: 1 },
      { value: 25, count: 2 }, { value: 10, count: 3 }
    ];
    r = S.payPlan(785, 'new', wallet);
    ok('785 ممكنة من المحفظة', r.exact, JSON.stringify(r));
    let over500 = r.best.items.find((it) => it.value === 500);
    eq('لم يستعمل أكثر من ورقة 500 واحدة', over500 ? over500.count : 0, 1);

    r = S.payPlan(830, 'new', wallet);
    ok('830 = كل المحفظة بالضبط', r.exact, JSON.stringify(r));
    eq('عدد الأوراق 9', r.best.notes, 9);

    r = S.payPlan(900, 'new', wallet);
    ok('900 أكبر من المحفظة', !r.exact && r.over === null, JSON.stringify(r));
    eq('أقصى ما يمكن دفعه 830', r.under.total, 83000);

    r = S.payPlan(600, 'new', [{ value: 500, count: 1 }, { value: 100, count: 5 }]);
    deep('600 = 500 + 100', r.best.items, [{ value: 500, count: 1 }, { value: 100, count: 1 }]);

    /* لا تتجاوز الخطة أبدًا ما هو متوفر */
    let capOk = true, capBad = '';
    for (let a = 10; a <= 830; a += 5) {
      const p = S.payPlan(a, 'new', wallet);
      const plans = [p.best, p.under, p.over].filter(Boolean);
      for (const pl of plans) {
        for (const it of pl.items) {
          const w = wallet.find((x) => x.value === it.value);
          if (!w || it.count > w.count) { capOk = false; capBad = 'عند ' + a + ' استعمل ' + it.count + '×' + it.value; }
        }
      }
      if (!capOk) break;
    }
    ok('لا تستعمل الخطة أوراقًا لا تملكها', capOk, capBad);

    /* ------------------------------------------------------ فئات مطفأة */
    G('فئات مطفأة أو مفقودة');
    const onlyBig = [{ value: 500, count: null }, { value: 100, count: null }];
    r = S.payPlan(1200, 'new', onlyBig);
    ok('1200 بفئتين فقط', r.exact, JSON.stringify(r));
    deep('1200 = 2×500 + 2×100', r.best.items, [{ value: 500, count: 2 }, { value: 100, count: 2 }]);
    r = S.payPlan(150, 'new', onlyBig);
    ok('150 غير ممكنة بفئتين فقط', !r.exact, '');
    eq('أقرب أعلى 200', r.over.total, 20000);
    r = S.payPlan(100, 'new', []);
    ok('بلا فئات: لا حل', !r.exact && r.over === null, JSON.stringify(r));

    /* ------------------------------------------------------ مبالغ كبيرة */
    G('المبالغ الكبيرة');
    r = S.payPlan(9876500, 'old', O);
    ok('9,876,500 قديمة مضبوطة', r.exact, JSON.stringify(r && r.best));
    eq('المجموع صحيح', r.best.items.reduce((s, it) => s + it.value * it.count, 0), 9876500);
    r = S.payPlan(250000, 'new', N);
    ok('250,000 جديدة مضبوطة', r.exact, '');
    eq('المجموع صحيح', r.best.items.reduce((s, it) => s + it.value * it.count, 0), 250000);
    eq('استعمل أكبر فئة أساسًا', r.best.items[0].value, 500);

    /* ------------------------------------------------- سيناريو دفع كامل */
    G('سيناريو: سعر بالقديم ودفع بالجديد');
    /* السعر 45,000 قديمة = 450 جديدة، دفع الزبون 500 جديدة */
    const priceUnits = S.toUnits(45000, 'old');
    const paidUnits = S.toUnits(500, 'new');
    eq('السعر 450 جديدة', S.fromUnits(priceUnits, 'new'), 450);
    const changeUnits = paidUnits - priceUnits;
    eq('الباقي 50 جديدة', S.fromUnits(changeUnits, 'new'), 50);
    eq('الباقي 5000 قديمة', S.fromUnits(changeUnits, 'old'), 5000);
    let ch = S.makeChange(changeUnits, S.defaultDenoms('new'), 'new');
    deep('يعيد ورقة 50 جديدة', ch.best.items, [{ value: 50, count: 1 }]);
    ch = S.makeChange(changeUnits, S.defaultDenoms('old'), 'old');
    deep('أو ورقة 5000 قديمة', ch.best.items, [{ value: 5000, count: 1 }]);

    return { groups: groups };
  }

  return { run: run };
});

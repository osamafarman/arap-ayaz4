/* =========================================================================
   currency-app.js — واجهة محوّل الليرة السورية

   كل الحساب في currency-core.js؛ هذا الملف يرسم الشاشة فقط.
   الإعدادات (الفئات المتوفرة وأعداد الأوراق) تُحفظ في localStorage.
   ========================================================================= */
(function () {
  'use strict';

  const S = window.SYP;
  const KEY = 'syp-converter-v1';

  const $ = (id) => document.getElementById(id);

  /* ألوان الفئات — لتمييز الورقة بلمحة عين */
  const COLORS = {
    new: { 500: '#7c3aed', 200: '#0369a1', 100: '#047857', 50: '#b45309', 25: '#be123c', 10: '#0f766e' },
    old: { 5000: '#7c3aed', 2000: '#0369a1', 1000: '#047857', 500: '#b45309', 200: '#be123c',
           100: '#0f766e', 50: '#4338ca', 25: '#64748b', 10: '#64748b', 5: '#64748b' }
  };
  const colorOf = (cur, v) => (COLORS[cur] && COLORS[cur][v]) || '#475569';
  const curName = (cur) => (cur === 'new' ? 'جديدة' : 'قديمة');

  /* ------------------------------------------------------------- الحالة */

  const state = {
    amountCur: 'new',
    planCur: 'new',
    paidCur: 'new',
    denoms: { new: S.defaultDenoms('new', false), old: S.defaultDenoms('old', false) }
  };

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        amountCur: state.amountCur, planCur: state.planCur, paidCur: state.paidCur,
        denoms: state.denoms
      }));
    } catch (e) { /* وضع التصفح الخاص: نتابع بلا حفظ */ }
  }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { return; }
    if (!raw) return;
    let data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (!data || typeof data !== 'object') return;
    if (data.amountCur === 'old' || data.amountCur === 'new') state.amountCur = data.amountCur;
    if (data.planCur === 'old' || data.planCur === 'new') state.planCur = data.planCur;
    if (data.paidCur === 'old' || data.paidCur === 'new') state.paidCur = data.paidCur;
    ['new', 'old'].forEach((cur) => {
      const saved = data.denoms && data.denoms[cur];
      if (!Array.isArray(saved)) return;
      state.denoms[cur].forEach((d) => {
        const hit = saved.find((x) => x && x.value === d.value);
        if (!hit) return;
        d.on = !!hit.on;
        d.count = (typeof hit.count === 'number' && hit.count > 0) ? Math.floor(hit.count) : null;
      });
    });
  }

  /* الفئات المفعّلة فقط، بالشكل الذي يفهمه المحرّك */
  function usable(cur) {
    return state.denoms[cur].filter((d) => d.on).map((d) => ({ value: d.value, count: d.count }));
  }

  /* ------------------------------------------------------------- الرسم */

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* سطر ورقة واحدة: [الفئة] × العدد ... المجموع */
  function noteRow(cur, value, count) {
    const row = el('div', 'note-row');
    const chip = el('span', 'note-chip', S.format(value));
    chip.style.background = colorOf(cur, value);
    row.appendChild(chip);
    row.appendChild(el('span', 'times', '×'));
    row.appendChild(el('span', 'cnt', String(count)));
    const sub = value * count;
    const other = cur === 'new' ? sub * S.RATE : sub / S.RATE;
    row.appendChild(el('span', 'sub',
      '= ' + S.format(sub) + ' ' + curName(cur) + '  (' + S.format(other) + ' ' + curName(cur === 'new' ? 'old' : 'new') + ')'));
    return row;
  }

  /* كتلة خطة كاملة: الأوراق + المجموع */
  function planBlock(cur, plan) {
    const box = el('div', 'notes');
    if (!plan || !plan.items.length) {
      box.appendChild(el('div', 'empty', 'لا توجد أوراق.'));
      return box;
    }
    plan.items.forEach((it) => box.appendChild(noteRow(cur, it.value, it.count)));
    const totalFace = plan.items.reduce((s, it) => s + it.value * it.count, 0);
    const line = el('div', 'total-line');
    line.appendChild(el('span', null, 'المجموع: ' + S.format(totalFace) + ' ' + curName(cur)));
    line.appendChild(el('span', null, 'عدد الأوراق: ' + plan.notes));
    box.appendChild(line);
    return box;
  }

  /* يرسم نتيجة makeChange في حاوية، مع رسائل الحالات غير المضبوطة */
  function renderResult(host, res, cur, labels) {
    host.textContent = '';
    if (!res) {
      host.appendChild(el('div', 'empty', labels.idle || 'اكتب المبلغ أولًا.'));
      return;
    }
    if (res.target === 0) {
      host.appendChild(el('div', 'empty', labels.zero || 'المبلغ صفر.'));
      return;
    }

    if (res.capped) {
      host.appendChild(el('div', 'warn',
        'المبلغ كبير جدًا بالنسبة لعدد الأوراق المتوفرة — النتيجة تقريبية.'));
    }

    if (res.exact) {
      host.appendChild(el('div', 'info-note', labels.exact));
      host.appendChild(planBlock(cur, res.best));
      return;
    }

    /* لا يمكن تكوين المبلغ بالضبط: نعرض أقرب مبلغ يغطّيه، ثم الأقل منه */
    if (res.over) {
      const extra = (res.over.total - res.target) / (cur === 'new' ? S.RATE : 1);
      host.appendChild(el('div', 'warn',
        'لا يمكن دفع المبلغ بالضبط بالفئات المتوفرة. أقرب مبلغ يغطّيه أكبر بـ ' +
        S.format(extra) + ' ' + curName(cur) + '.'));
      host.appendChild(planBlock(cur, res.over));
      if (res.under && res.under.items.length) {
        const less = (res.target - res.under.total) / (cur === 'new' ? S.RATE : 1);
        host.appendChild(el('div', 'info-note',
          'أو تدفع أقل بـ ' + S.format(less) + ' ' + curName(cur) + ': ' + itemsText(res.under, cur)));
      }
      return;
    }

    /* حتى بكل ما لديك لا يكفي */
    host.appendChild(el('div', 'warn', labels.short || 'ما لديك من أوراق لا يكفي هذا المبلغ.'));
    if (res.under && res.under.items.length) {
      host.appendChild(el('div', 'info-note', 'أقصى ما يمكن دفعه بما لديك:'));
      host.appendChild(planBlock(cur, res.under));
    }
  }

  /* وصف مختصر لخطة في سطر: "1×500 + 2×100" */
  function itemsText(plan, cur) {
    if (!plan || !plan.items.length) return 'لا شيء';
    return plan.items.map((it) => it.count + '×' + S.format(it.value)).join(' + ') +
           ' = ' + S.format(plan.total / (cur === 'new' ? S.RATE : 1)) + ' ' + curName(cur);
  }

  /* ------------------------------------------------------- إعادة الحساب */

  function currentUnits(inputId, cur, errId) {
    const raw = $(inputId).value.trim();
    const err = errId ? $(errId) : null;
    if (!raw) { if (err) err.hidden = true; return { empty: true, units: null }; }
    const n = S.parseAmount(raw);
    if (n == null || n < 0) { if (err) err.hidden = false; return { empty: false, units: null }; }
    if (err) err.hidden = true;
    return { empty: false, units: S.toUnits(n, cur) };
  }

  function refresh() {
    /* ١) التحويل */
    const amt = currentUnits('amount', state.amountCur, 'amount-err');
    const units = amt.units;
    $('out-new').textContent = units == null ? '—' : S.format(S.fromUnits(units, 'new'));
    $('out-old').textContent = units == null ? '—' : S.format(S.fromUnits(units, 'old'));

    /* ٢) الأوراق التي تعطيها */
    const denoms = usable(state.planCur);
    let res = null;
    if (units != null && units > 0) res = S.makeChange(units, denoms, state.planCur);
    renderResult($('plan-out'), res, state.planCur, {
      idle: 'اكتب المبلغ في الأعلى لتظهر الأوراق التي تعطيها.',
      exact: 'ادفع بالضبط بهذه الأوراق:',
      short: 'ما لديك من أوراق لا يكفي هذا المبلغ.'
    });

    /* ٣) الباقي */
    const paid = currentUnits('paid', state.paidCur, null);
    const host = $('change-out');
    host.textContent = '';
    if (units == null || paid.units == null) {
      host.appendChild(el('div', 'empty', 'اكتب المبلغ المدفوع ليظهر الباقي.'));
      return;
    }
    const diff = paid.units - units;
    if (diff < 0) {
      host.appendChild(el('div', 'warn',
        'المبلغ المدفوع أقل من المطلوب بـ ' + S.format(S.fromUnits(-diff, 'new')) + ' جديدة (' +
        S.format(-diff) + ' قديمة).'));
      return;
    }
    const head = el('div', 'result');
    [['new', 'n'], ['old', 'o']].forEach(([cur, cls]) => {
      const box = el('div', 'box ' + cls);
      box.appendChild(el('div', 'lbl', 'الباقي بالعملة ال' + (cur === 'new' ? 'جديدة' : 'قديمة')));
      box.appendChild(el('div', 'val', S.format(S.fromUnits(diff, cur))));
      box.appendChild(el('div', 'unit', 'ل.س ' + curName(cur)));
      head.appendChild(box);
    });
    host.appendChild(head);
    if (diff === 0) {
      host.appendChild(el('div', 'info-note', 'المبلغ مضبوط — لا يوجد باقٍ.'));
      return;
    }
    const sub = el('div');
    host.appendChild(sub);
    renderResult(sub, S.makeChange(diff, denoms, state.planCur), state.planCur, {
      exact: 'الأوراق التي تعيدها للزبون:',
      short: 'ما لديك من أوراق لا يكفي لإعادة الباقي.'
    });
  }

  /* ------------------------------------------------------------ الأزرار */

  function bindSeg(id, key) {
    const host = $(id);
    host.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-cur]');
      if (!btn) return;
      state[key] = btn.dataset.cur;
      syncSeg(id, key);
      save();
      refresh();
    });
    syncSeg(id, key);
  }

  function syncSeg(id, key) {
    $(id).querySelectorAll('button[data-cur]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.cur === state[key]));
    });
  }

  /* شبكة الفئات: تشغيل/إطفاء + عدد الأوراق المتوفرة */
  function buildDenomGrid(cur) {
    const host = $('den-' + cur);
    host.textContent = '';
    state.denoms[cur].forEach((d) => {
      const item = el('label', 'den-item');
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = d.on;
      cb.addEventListener('change', () => { d.on = cb.checked; save(); refresh(); });
      const name = el('span', 'name', S.format(d.value) + (d.kind === 'coin' ? ' (معدنية)' : ''));
      const cnt = el('input', 'count small');
      cnt.type = 'text';
      cnt.inputMode = 'numeric';
      cnt.placeholder = '∞';
      cnt.title = 'عدد الأوراق التي تملكها (فارغ = غير محدود)';
      cnt.value = d.count == null ? '' : String(d.count);
      cnt.addEventListener('input', () => {
        const n = S.parseAmount(cnt.value);
        d.count = (n == null || n <= 0) ? null : Math.floor(n);
        save();
        refresh();
      });
      item.appendChild(cb);
      item.appendChild(name);
      item.appendChild(cnt);
      host.appendChild(item);
    });
  }

  function buildRefTable() {
    const body = $('ref-body');
    const nn = S.DENOMS.new.map((d) => d.value);
    const oo = S.DENOMS.old.filter((d) => d.kind === 'note').map((d) => d.value);
    const rows = Math.max(nn.length, oo.length);
    for (let i = 0; i < rows; i++) {
      const tr = document.createElement('tr');
      const n = nn[i], o = oo[i];
      const cells = [
        [n == null ? '' : S.format(n), 'n'],
        [n == null ? '' : S.format(n * S.RATE), 'o'],
        [o == null ? '' : S.format(o), 'o'],
        [o == null ? '' : S.format(o / S.RATE), 'n']
      ];
      cells.forEach(([txt, cls]) => {
        const td = el('td', cls, txt);
        tr.appendChild(td);
      });
      body.appendChild(tr);
    }
  }

  /* ------------------------------------------------------------- الإقلاع */

  function init() {
    load();
    bindSeg('amount-cur', 'amountCur');
    bindSeg('plan-cur', 'planCur');
    bindSeg('paid-cur', 'paidCur');
    buildDenomGrid('new');
    buildDenomGrid('old');
    buildRefTable();

    $('amount').addEventListener('input', refresh);
    $('paid').addEventListener('input', refresh);

    $('reset-denoms').addEventListener('click', () => {
      state.denoms = { new: S.defaultDenoms('new', false), old: S.defaultDenoms('old', false) };
      buildDenomGrid('new'); buildDenomGrid('old'); save(); refresh();
    });
    $('clear-counts').addEventListener('click', () => {
      ['new', 'old'].forEach((c) => state.denoms[c].forEach((d) => { d.count = null; }));
      buildDenomGrid('new'); buildDenomGrid('old'); save(); refresh();
    });

    refresh();
    $('amount').focus();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

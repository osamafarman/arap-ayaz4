/* =========================================================================
   app.js — Doğrusal ders oynatıcısı
   İki ekran vardır:
     'map'  → yol haritası (nerede olduğunu görür, ileri atlayamaz)
     'unit' → ders oynatıcı (ekranda TEK adım, tek büyük düğme)
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});
  const D = AH.data;
  const C = AH.course;
  const S = AH.storage;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* Arayüz metni çevirisi (ders içeriği Türkçe kalır — bkz. js/i18n.js) */
  const t = (s) => (AH.i18n ? AH.i18n.t(s) : s);

  const ui = (AH.ui = {
    toast(msg, kind, ms) {
      const host = $('#toast-host');
      if (!host) return;
      const el = document.createElement('div');
      el.className = 'toast ' + (kind || 'info');
      el.textContent = msg;
      host.appendChild(el);
      setTimeout(() => el.classList.add('show'), 10);
      setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
      }, ms || 3200);
    }
  });

  /* Kullanıcı tercihleri (animasyon hızı vb.) */
  const PREF_KEY = 'arapca-harfler-prefs-v2';
  const prefs = (function () {
    let p = { demoSpeed: 1 };
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) p = Object.assign(p, JSON.parse(raw));
    } catch (e) {}
    return {
      get: (k) => p[k],
      set(k, v) {
        p[k] = v;
        try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (e) {}
      }
    };
  })();

  /* ------------------------------------------------------------------ */
  /* Durum                                                               */
  /* ------------------------------------------------------------------ */
  const view = {
    screen: 'map',
    unit: null,
    stepIndex: 0,
    attempts: 0,        /* aktif adımdaki deneme sayısı */
    examRun: null,      /* sınav sırasında {items:[{id, ok}]} */
    refLetter: null,    /* "Harf Şekilleri" ekranında seçili harf */
    refForm: 'isolated',
    openStages: {}      /* haritada hangi aşama açık */
  };

  let pad = null;       /* aktif tuval */

  /* --- ders bitince sıradakine otomatik geçiş --- */
  const AUTO_NEXT_SECONDS = 5;
  let autoNext = null;  /* {timer, left} */
  function cancelAutoNext() {
    if (autoNext) { clearInterval(autoNext.timer); autoNext = null; }
  }

  /* --- yazım animasyonu hızı (0.5× yavaş … 2× hızlı) --- */
  const SPEEDS = [0.5, 0.75, 1, 1.5, 2];
  const DEMO_BASE_MS = 2600;

  function demoSpeed() {
    const v = Number(prefs.get('demoSpeed'));
    return SPEEDS.indexOf(v) >= 0 ? v : 1;
  }
  function demoDuration() {
    return Math.round(DEMO_BASE_MS / demoSpeed());
  }
  function speedBarHTML() {
    const cur = demoSpeed();
    return '<div class="speed-bar"><span>' + t('Hız') + '</span>' +
      SPEEDS.map((s) =>
        '<button type="button" class="speed-btn' + (s === cur ? ' on' : '') +
        '" data-speed="' + s + '">' + (s === 1 ? t('Normal') : s + '×') + '</button>'
      ).join('') + '</div>';
  }
  /** Hız düğmelerini bağlar; değişince onChange ile animasyon yeniden oynatılır. */
  function wireSpeed(root, onChange) {
    $$('.speed-btn', root).forEach((b) =>
      b.addEventListener('click', () => {
        prefs.set('demoSpeed', Number(b.dataset.speed));
        $$('.speed-btn', root).forEach((x) => x.classList.toggle('on', x === b));
        if (onChange) onChange();
      })
    );
  }

  /* ------------------------------------------------------------------ */
  /* Ekran 1 — YOL HARİTASI                                              */
  /* ------------------------------------------------------------------ */
  /**
   * Tuvali büyütme/küçültme. Özellikle telefonda parmakla yazarken
   * alan dar kalıyordu; bu düğme yazı alanını ekranı kaplayacak
   * şekilde genişletir.
   */
  function wireExpand() {
    const btn = $('[data-act="expand"]');
    const stage = $('#write-stage');
    if (!btn || !stage) return;
    btn.addEventListener('click', () => {
      const on = stage.classList.toggle('expanded');
      document.body.classList.toggle('canvas-expanded', on);
      btn.textContent = on ? '⤡' : '⛶';
      btn.title = on ? 'Küçült' : 'Büyüt';
      /* tuval yeni ölçüsüne göre yeniden hesaplansın */
      setTimeout(() => { if (pad) pad.resize(); }, 30);
    });
  }

  /* Kompakt hız şeridi (yan araç çubuğu için) */
  function speedRailHTML() {
    const cur = demoSpeed();
    return '<div class="speed-rail">' +
      SPEEDS.map((s) =>
        '<button type="button" class="speed-btn mini' + (s === cur ? ' on' : '') +
        '" data-speed="' + s + '">' + (s === 1 ? '1×' : s + '×') + '</button>'
      ).join('') + '</div>';
  }

  /* --- öğrenci profili şeridi --- */
  function profileBarHTML() {
    const me = S.activeProfile();
    const list = S.listProfiles();
    const st = S.streak();
    const stars = S.totalStars();
    return [
      '<div class="profile-bar">',
      '  <button type="button" class="profile-chip" data-act="profiles">',
      '    <span class="pf-avatar">' + me.avatar + '</span>',
      '    <span class="pf-name">' + esc(me.name) + '</span>',
      list.length > 1 ? '<span class="pf-count">' + list.length + ' öğrenci</span>' : '',
      '  </button>',
      '  <span class="reward-chip" title="Kazanılan yıldız">⭐ ' + stars + '</span>',
      '  <span class="reward-chip' + (st.count > 0 ? ' hot' : '') + '" title="Üst üste çalışılan gün">🔥 ' +
        st.count + ' gün</span>',
      '  <button type="button" class="reward-chip link" data-act="report">📊 ' + t('Rapor') + '</button>',
      '</div>'
    ].join('');
  }

  function reviewCardHTML() {
    /* Bugünün dersi = zorlanılanlar + tekrarı gelenler */
    const list = S.todaySteps(30);
    if (!list.length) return '';
    const weak = list.filter((x) => x.why === 'weak').length;
    const due = list.length - weak;
    const why = [
      weak ? '<b class="rv-weak">' + weak + '</b> zorlandığın' : '',
      due ? '<b>' + due + '</b> tekrar zamanı gelen' : ''
    ].filter(Boolean).join(' · ');
    return [
      '<button type="button" class="review-card" data-act="review">',
      '  <span class="rv-icon">🔁</span>',
      '  <span class="rv-text"><b>Bugünün dersi</b>',
      '    <i>' + why + ' alıştırma — senin hatalarına göre seçildi</i></span>',
      '  <span class="rv-go">' + t('Başla ➜') + '</span>',
      '</button>'
    ].join('');
  }

  function renderMap() {
    const o = S.overall();
    const next = S.nextUnit();
    const started = S.hasStarted();

    const stagesHTML = C.COURSE.map((stage) => {
      const unlocked = S.isStageUnlocked(stage.stageId);
      const p = S.stageProgress(stage);
      let lastGroup = null;

      const unitsHTML = stage.units
        .map((u) => {
          const uUnlocked = S.isUnitUnlocked(u);
          const done = S.isUnitComplete(u);
          const isNext = next && u.id === next.id;
          const up = S.unitProgress(u);
          let head = '';
          if (u.group !== lastGroup) {
            lastGroup = u.group;
            head = '<li class="path-group"><span>' + esc(u.group) + '</span></li>';
          }
          return (
            head +
            '<li class="path-item' + (done ? ' done' : '') + (uUnlocked ? '' : ' locked') +
              (isNext ? ' current' : '') + '">' +
            '<button type="button" class="unit-btn" data-unit="' + u.id + '"' +
              (uUnlocked ? '' : ' aria-disabled="true"') + '>' +
            '  <span class="unit-icon' + (u.iconArabic ? ' ar' : '') + '"' +
                (u.iconArabic ? ' dir="rtl"' : '') + '>' +
                (uUnlocked ? (done ? '✓' : esc(u.icon)) : '🔒') + '</span>' +
            '  <span class="unit-text">' +
            '    <b>' + esc(u.title) + '</b>' +
            '    <i>' + esc(u.subtitle || '') + (u.tag ? ' · ' + esc(u.tag) : '') + '</i>' +
            '  </span>' +
            (done
              ? '<span class="unit-stars">' + '★'.repeat(S.unitStars(u)) +
                '<i>' + '★'.repeat(3 - S.unitStars(u)) + '</i></span>'
              : up.done > 0
                ? '<span class="unit-mini">' + up.done + '/' + up.total + '</span>'
                : '') +
            (isNext ? '<span class="unit-now">' + t('BURADASIN') + '</span>' : '') +
            '</button></li>'
          );
        })
        .join('');

      /* 7 aşama × ~25 ünite çok uzun bir liste yapıyor:
         yalnızca çalışılan aşama açık gelir, diğerleri katlanır. */
      const isOpen = view.openStages[stage.stageId] != null
        ? view.openStages[stage.stageId]
        : (next && next.stageId === stage.stageId);

      return [
        '<section class="stage-block' + (isOpen ? '' : ' collapsed') + '">',
        '  <button type="button" class="stage-block-head" data-stage="' + stage.stageId + '">',
        '    <div>',
        '      <h2>' + esc(stage.title) + ' <span dir="rtl" class="stage-letters">' + esc(stage.lettersLabel) + '</span></h2>',
        '      <p>' + esc(stage.subtitle) + '</p>',
        '    </div>',
        '    <div class="stage-block-meta">' +
          '<b>' + p.unitsDone + '/' + p.unitsTotal + '</b><span>' + t('ünite') + '</span>' +
          (p.stars ? '<span class="stage-stars">⭐ ' + p.stars + '</span>' : '') +
          '</div>',
        '    <span class="stage-caret">' + (isOpen ? '▾' : '▸') + '</span>',
        '  </button>',
        '  <div class="mini-bar stage-mini"><span style="width:' + p.pct + '%"></span></div>',
        isOpen ? '<ol class="path">' + unitsHTML + '</ol>' : '',
        '</section>'
      ].join('');
    }).join('');

    $('#app').innerHTML = [
      '<div class="map-screen">',
      profileBarHTML(),
      reviewCardHTML(),
      '  <div class="map-hero">',
      '    <div>',
      '      <h1>' + (started ? t('Kaldığın yerden devam et') : t('Hoş geldin! 👋')) + '</h1>',
      '      <p>' + (started
          ? 'Sıradaki dersin: <b>' + esc(next.title) + '</b>'
          : 'Hiç Arapça bilmiyorsan tam doğru yerdesin. Seni harf harf, adım adım götüreceğim.') + '</p>',
      '    </div>',
      '    <button type="button" class="btn btn-primary btn-xl" data-act="continue">' +
        (started ? t('Devam Et ➜') : t('Derse Başla ➜')) + '</button>',
      '  </div>',
      '  <div class="map-progress">',
      '    <div class="overall-bar"><span style="width:' + o.pct + '%"></span></div>',
      '    <span>' + o.done + ' / ' + o.total + ' adım tamamlandı · %' + o.pct + '</span>',
      '  </div>',

      /* Başvuru bölümü — derslerden bağımsız, her zaman açık */
      '  <button type="button" class="alpha-entry" data-act="alphabet">',
      '    <span class="alpha-entry-icon">📖</span>',
      '    <span class="alpha-entry-text">',
      '      <b>' + t('Harf Şekilleri') + '</b>',
      '      <i>28 harfin yazılışı — animasyonlu, hızı ayarlanabilir</i>',
      '    </span>',
      '    <span class="alpha-entry-preview" dir="rtl">ا ب ج د</span>',
      '  </button>',
      '  <button type="button" class="alpha-entry sheet" data-act="worksheet">',
      '    <span class="alpha-entry-icon">🖨</span>',
      '    <span class="alpha-entry-text">',
      '      <b>' + t('Çalışma Kâğıdı') + '</b>',
      '      <i>Kâğıda yazdır — kalemle çalışmak için kılavuzlu sayfa</i>',
      '    </span>',
      '    <span class="alpha-entry-preview">A4</span>',
      '  </button>',

      stagesHTML,
      '</div>'
    ].join('');

    $('[data-act="continue"]').addEventListener('click', () => openUnit(next));
    $('[data-act="alphabet"]').addEventListener('click', () => openAlphabet());
    $('[data-act="worksheet"]').addEventListener('click', () => openWorksheet());
    $('[data-act="profiles"]').addEventListener('click', openProfiles);
    $('[data-act="report"]').addEventListener('click', openReport);
    const rv = $('[data-act="review"]');
    if (rv) rv.addEventListener('click', startReview);

    $$('.stage-block-head').forEach((h) =>
      h.addEventListener('click', () => {
        const id = Number(h.dataset.stage);
        const cur = view.openStages[id] != null
          ? view.openStages[id]
          : (next && next.stageId === id);
        view.openStages[id] = !cur;
        renderMap();
      })
    );

    $$('.unit-btn').forEach((b) =>
      b.addEventListener('click', () => {
        const u = C.getUnit(b.dataset.unit);
        if (!S.isUnitUnlocked(u)) {
          ui.toast('🔒 Sırası gelmedi. Önce bir önceki dersi bitir.', 'warn');
          return;
        }
        openUnit(u);
      })
    );
  }

  /* ------------------------------------------------------------------ */
  /* ÇALIŞMA KÂĞIDI — kâğıt üstünde kalemle çalışmak için                */
  /* ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ */
  /* ÇALIŞMA KÂĞIDI AYARLARI                                             */
  /* Kâğıt pahalıdır: kaç tekrar, kaç boş kutu, satırlar ne kadar sık ve */
  /* sayfanın başında/sonunda ne yazacağı öğretmence belirlenir ve       */
  /* KALICI olarak saklanır (her baskıda aynı düzen).                    */
  /* ------------------------------------------------------------------ */
  const WS_KEY = 'arapca-harfler-worksheet-v1';
  const WS_DEF = {
    rows: 4, repeats: 3, empties: 6, gap: 10,
    showTag: true, header: 'Arapça Yazı Atölyesi', footer: ''
  };
  function wsGet() {
    try {
      const raw = localStorage.getItem(WS_KEY);
      return Object.assign({}, WS_DEF, raw ? JSON.parse(raw) : null);
    } catch (e) { return Object.assign({}, WS_DEF); }
  }
  function wsSet(patch) {
    const o = Object.assign(wsGet(), patch);
    try { localStorage.setItem(WS_KEY, JSON.stringify(o)); } catch (e) {}
    return o;
  }

  function openWorksheet(preset) {
    const letters = D.ALPHABET;
    const sel = view.wsSel || (preset ? [preset] : [letters[0].forms.isolated]);
    view.wsSel = sel;
    const ws = wsGet();
    const rows = ws.rows;
    /* Başlık/altlık yalnız yönetici kilidi açıkken düzenlenebilir. */
    const canEdit = !!(AH.admin && AH.admin.isUnlocked && AH.admin.isUnlocked());

    /* Bir satır: solmuş örnekler + boş kutular.
       Gereksiz çerçeve YOK — yalnız üstünde yazılacak ÇİZGİ vardır. */
    function rowHTML(glyph) {
      let cells = '';
      for (let i = 0; i < ws.repeats; i++) {
        cells += '<span class="ws-cell faded" dir="rtl">' + esc(glyph) + '</span>';
      }
      for (let i = 0; i < ws.empties; i++) cells += '<span class="ws-cell"></span>';
      return '<div class="ws-row">' +
        (ws.showTag ? '<span class="ws-tag" dir="rtl">' + esc(glyph) + '</span>' : '') +
        '<div class="ws-line">' + cells + '</div></div>';
    }

    $('#app').innerHTML = [
      '<div class="sub-screen ws-screen">',
      '  <header class="sub-head no-print">',
      '    <button type="button" class="round-btn" data-act="back">‹</button>',
      '    <div><h1>Çalışma Kâğıdı</h1><p>Seçtiğin harfleri kâğıda yazdır; ' +
      'çocuk kalemle solmuş örneklerin üstünden geçip çizgiyi doldursun.</p></div>',
      '  </header>',

      '  <div class="ws-picker no-print">',
      letters.map((L) =>
        ['isolated', 'initial', 'medial', 'final']
          .filter((k, i, arr) => arr.indexOf(arr.find((x) => L.forms[x] === L.forms[k])) === i)
          .map((k) => {
            const g = L.forms[k];
            return '<button type="button" class="ws-pick' + (sel.indexOf(g) >= 0 ? ' on' : '') +
              '" data-g="' + esc(g) + '"><span dir="rtl">' + esc(g) + '</span></button>';
          }).join('')
      ).join(''),
      '  </div>',
      '  <div class="ws-tools no-print">',
      '    <label>Satır <input type="number" id="ws-rows" min="1" max="30" value="' + ws.rows + '"></label>',
      '    <label title="Aynı satırda kaç solmuş örnek olsun">Tekrar ' +
      '<input type="number" id="ws-rep" min="0" max="12" value="' + ws.repeats + '"></label>',
      '    <label title="Örneklerden sonra kaç boş yer kalsın">Boş ' +
      '<input type="number" id="ws-emp" min="0" max="20" value="' + ws.empties + '"></label>',
      '    <label title="Satırlar arası boşluk (mm) — küçültünce sayfaya daha çok satır sığar">' +
      'Aralık <input type="number" id="ws-gap" min="0" max="30" value="' + ws.gap + '"></label>',
      '    <label class="ws-chk"><input type="checkbox" id="ws-tag"' +
      (ws.showTag ? ' checked' : '') + '> Harf etiketi</label>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="clear">Seçimi temizle</button>',
      '    <button type="button" class="btn btn-primary" data-act="print">🖨 Yazdır</button>',
      '  </div>',

      /* Başlık/altlık: yönetici belirler, her sayfada basılır */
      canEdit
        ? '<div class="ws-tools no-print ws-hf">' +
          '  <label>Üst yazı <input type="text" id="ws-header" value="' +
          esc(ws.header) + '" placeholder="ör. sayfa adı"></label>' +
          '  <label>Alt yazı <input type="text" id="ws-footer" value="' +
          esc(ws.footer) + '" placeholder="ör. okul / öğretmen adı"></label>' +
          '  <span class="st-hint">Her basılan sayfanın başında ve sonunda çıkar.</span>' +
          '</div>'
        : '<p class="ws-hf-note no-print">Üst/alt yazıyı değiştirmek için ' +
          '🔧 yönetici kilidini aç.</p>',

      '  <div class="ws-sheet" id="ws-sheet" style="--ws-gap:' + ws.gap + 'px">',
      '    <div class="ws-head">' +
      '<b>' + esc(ws.header || '') + '</b>' +
      '<span>Ad: ______________  Tarih: ____________</span></div>',
      sel.length
        ? sel.map((g) => new Array(rows).fill(0).map(() => rowHTML(g)).join('')).join('')
        : '<p class="empty">Yukarıdan en az bir harf seç.</p>',
      ws.footer
        ? '    <div class="ws-foot">' + esc(ws.footer) + '</div>'
        : '',
      '  </div>',
      '</div>'
    ].join('');

    $('[data-act="back"]').addEventListener('click', exitToMap);
    $('[data-act="print"]').addEventListener('click', () => window.print());
    $('[data-act="clear"]').addEventListener('click', () => { view.wsSel = []; openWorksheet(); });
    /* sayısal ayarlar — hepsi kalıcı, her baskıda aynı düzen */
    const num = (id, key, lo, hi) => {
      const el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', () => {
        const v = Math.max(lo, Math.min(hi, Number(el.value) || 0));
        wsSet({ [key]: v });
        openWorksheet();
      });
    };
    num('ws-rows', 'rows', 1, 30);
    num('ws-rep', 'repeats', 0, 12);
    num('ws-emp', 'empties', 0, 20);
    num('ws-gap', 'gap', 0, 30);
    const tag = $('#ws-tag');
    if (tag) tag.addEventListener('change', () => {
      wsSet({ showTag: tag.checked });
      openWorksheet();
    });
    const hd = $('#ws-header');
    if (hd) hd.addEventListener('input', () => {
      wsSet({ header: hd.value });
      const b = $('.ws-head b');
      if (b) b.textContent = hd.value;
    });
    const ft = $('#ws-footer');
    if (ft) ft.addEventListener('input', () => {
      wsSet({ footer: ft.value });
      openWorksheet();
    });
    $$('.ws-pick').forEach((b) => b.addEventListener('click', () => {
      const g = b.dataset.g;
      const i = view.wsSel.indexOf(g);
      if (i >= 0) view.wsSel.splice(i, 1); else view.wsSel.push(g);
      openWorksheet();
    }));
  }

  /* ------------------------------------------------------------------ */
  /* TEKRAR — aralıklı tekrar oturumu                                    */
  /* ------------------------------------------------------------------ */
  function startReview() {
    /* Bugünün dersi: ZORLANILANLAR + tekrarı gelenler (bkz. storage.todaySteps) */
    const list = S.todaySteps(12);
    if (!list.length) { ui.toast('Şu an tekrar edilecek bir şey yok.', 'info'); return; }
    const weak = list.filter((x) => x.why === 'weak').length;
    const due = list.length - weak;

    openUnit({
      id: 'REVIEW',
      title: 'Bugünün dersi',
      group: 'Tekrar',
      icon: '🔁',
      stageId: 1,
      index: 0,
      isReview: true,
      steps: list.map((d) => d.step)
    });
    ui.toast(
      'Bugünün dersi: ' +
      (weak ? weak + ' zorlandığın' : '') +
      (weak && due ? ' + ' : '') +
      (due ? due + ' tekrar zamanı gelen' : '') +
      ' alıştırma.', 'info', 4200);
  }

  /* ------------------------------------------------------------------ */
  /* PROFİLLER — birden çok öğrenci                                      */
  /* ------------------------------------------------------------------ */
  function openProfiles() {
    const list = S.listProfiles();
    const active = S.activeProfile();
    $('#app').innerHTML = [
      '<div class="sub-screen">',
      '  <header class="sub-head">',
      '    <button type="button" class="round-btn" data-act="back">‹</button>',
      '    <div><h1>Öğrenciler</h1><p>Aynı cihazı birden çok öğrenci kullanabilir; ' +
      'her birinin ilerlemesi ayrı tutulur.</p></div>',
      '  </header>',
      '  <div class="pf-list">',
      list.map((p) => {
        const isMe = p.id === active.id;
        return '<div class="pf-row' + (isMe ? ' on' : '') + '">' +
          '<span class="pf-avatar big">' + p.avatar + '</span>' +
          '<span class="pf-row-name">' + esc(p.name) + (isMe ? ' <i>(seçili)</i>' : '') + '</span>' +
          (isMe ? '' : '<button type="button" class="btn btn-ghost btn-sm" data-use="' + p.id + '">Seç</button>') +
          '<button type="button" class="btn btn-ghost btn-sm" data-rename="' + p.id + '">Adı değiştir</button>' +
          (list.length > 1 ? '<button type="button" class="btn btn-ghost btn-sm danger" data-del="' + p.id + '">Sil</button>' : '') +
          '</div>';
      }).join(''),
      '  </div>',
      '  <div class="admin-actions">',
      '    <button type="button" class="btn btn-primary" data-act="add">+ Yeni öğrenci</button>',
      '  </div>',
      '</div>'
    ].join('');

    $('[data-act="back"]').addEventListener('click', exitToMap);
    $('[data-act="add"]').addEventListener('click', () => {
      const n = prompt('Öğrencinin adı:');
      if (n === null) return;
      S.addProfile(n.trim() || 'Öğrenci');
      openProfiles();
    });
    $$('[data-use]').forEach((b) => b.addEventListener('click', () => {
      S.switchProfile(b.dataset.use);
      ui.toast('Öğrenci değiştirildi.', 'good');
      exitToMap();
    }));
    $$('[data-rename]').forEach((b) => b.addEventListener('click', () => {
      const p = S.listProfiles().find((x) => x.id === b.dataset.rename);
      const n = prompt('Yeni ad:', p ? p.name : '');
      if (n === null) return;
      S.renameProfile(b.dataset.rename, n.trim());
      openProfiles();
    }));
    $$('[data-del]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('Bu öğrenci ve tüm ilerlemesi silinecek. Emin misin?')) return;
      S.removeProfile(b.dataset.del);
      openProfiles();
    }));
  }

  /* ------------------------------------------------------------------ */
  /* RAPOR — öğretmen/veli için zayıf nokta özeti                        */
  /* ------------------------------------------------------------------ */
  const CODE_LABEL = {
    start: 'Yanlış yerden başlama',
    reverse: 'Ters yönde yazma',
    wander: 'Kalemi gezdirme',
    short: 'Harfi tamamlamama',
    'dots-missing': 'Nokta eksik / yanlış yerde',
    'dots-extra': 'Fazla nokta',
    'dots-none': 'Olmayan nokta koyma',
    coverage: 'Harfin bir kısmını boş bırakma',
    precision: 'Çizgiyi dışarı taşırma',
    proportion: 'Harfi çok büyük/küçük yazma',
    baseline: 'Satıra oturmama',
    'no-body': 'Gövdeyi çizmeme'
  };

  function openReport() {
    const r = S.report();
    const me = S.activeProfile();
    const o = S.overall();
    const st = S.streak();
    const metric = (label, v) => v == null ? '' :
      '<div class="mini-metric"><span>' + label + '</span>' +
      '<i class="' + (v >= 80 ? 'ok' : v >= 55 ? 'mid' : 'no') + '">' +
      '<b style="width:' + Math.max(3, v) + '%"></b></i><em>%' + v + '</em></div>';

    const codes = Object.keys(r.codes).sort((a, b) => r.codes[b] - r.codes[a]);

    $('#app').innerHTML = [
      '<div class="sub-screen">',
      '  <header class="sub-head">',
      '    <button type="button" class="round-btn" data-act="back">‹</button>',
      '    <div><h1>Rapor — ' + esc(me.name) + '</h1>',
      '    <p>Yazma denemelerinden çıkarılan özet. Öğretmen/veli içindir.</p></div>',
      '  </header>',

      '  <div class="rep-grid">',
      '    <div class="rep-card"><b>' + o.done + '/' + o.total + '</b><span>adım</span></div>',
      '    <div class="rep-card"><b>⭐ ' + S.totalStars() + '</b><span>yıldız</span></div>',
      '    <div class="rep-card"><b>🔥 ' + st.count + '</b><span>günlük seri (en iyi ' + st.best + ')</span></div>',
      '    <div class="rep-card"><b>' + r.attempts + '</b><span>yazma denemesi</span></div>',
      '    <div class="rep-card"><b>%' + r.passRate + '</b><span>ilk seferde geçme</span></div>',
      '  </div>',

      /* İNTİKAN — "geçti" değil "oturdu": farklı 3 günde %85+ */
      (function () {
        const m = S.masteryReport();
        return '<section class="rep-sec"><h2>Harf oturması ' +
          '<i class="rep-note">(farklı ' + m.needDays + ' günde %' + S.MASTERY_SCORE +
          '+ yazınca “oturdu” sayılır)</i></h2>' +
          '<p class="rep-mastery-sum"><b>' + m.mastered + '</b> / ' + m.total +
          ' harf oturdu</p>' +
          '<div class="mastery-grid">' +
          m.list.map((x) =>
            '<span class="mastery-cell' + (x.mastered ? ' done' : x.days ? ' part' : '') +
            '" title="' + esc(x.char) + ': ' + x.days + '/' + x.need + ' gün">' +
            '<b dir="rtl">' + esc(x.char) + '</b>' +
            '<i>' + x.days + '/' + x.need + '</i></span>').join('') +
          '</div></section>';
      })(),

      r.attempts
        ? '<section class="rep-sec"><h2>Beceri ortalamaları</h2><div class="write-metrics">' +
          metric('Şekil', r.avg.shape) + metric('Başlangıç', r.avg.start) +
          metric('Yön', r.avg.direction) + metric('Noktalar', r.avg.dots) +
          metric('Büyüklük', r.avg.proportion) + metric('Satıra oturma', r.avg.baseline) +
          '</div></section>'
        : '<p class="empty">Henüz yazma denemesi yok. Birkaç harf yazınca rapor dolmaya başlar.</p>',

      codes.length
        ? '<section class="rep-sec"><h2>En sık yapılan hatalar</h2><ul class="rep-list">' +
          codes.slice(0, 6).map((c) =>
            '<li><span>' + esc(CODE_LABEL[c] || c) + '</span><b>' + r.codes[c] + ' kez</b></li>').join('') +
          '</ul></section>'
        : '',

      r.weakest.length
        ? '<section class="rep-sec"><h2>En çok zorlanılan alıştırmalar</h2><ul class="rep-list">' +
          r.weakest.map((w) => {
            const stp = AH.course.allSteps().find((s) => s.id === w.id);
            const name = stp ? (stp.glyph || stp.target || stp.title) : w.id;
            return '<li><span class="ar-mini" dir="rtl">' + esc(name) + '</span>' +
              '<b>' + w.fails + '/' + w.tries + ' başarısız</b></li>';
          }).join('') + '</ul></section>'
        : '',

      '  <div class="admin-actions">',
      '    <button type="button" class="btn btn-ghost" data-act="print">🖨 Yazdır</button>',
      '  </div>',
      '</div>'
    ].join('');

    $('[data-act="back"]').addEventListener('click', exitToMap);
    $('[data-act="print"]').addEventListener('click', () => window.print());
  }

  /* ------------------------------------------------------------------ */
  /* Ekran 0 — HARF ŞEKİLLERİ (başvuru: 28 harfin yazılışı)              */
  /* ------------------------------------------------------------------ */
  /** Bir harfin tekrar etmeyen biçimlerini etiketleriyle döndürür. */
  function distinctForms(L) {
    const order = [
      ['isolated', 'Yalın'], ['initial', 'Başta'],
      ['medial', 'Ortada'], ['final', 'Sonda']
    ];
    const out = [];
    order.forEach(([key, label]) => {
      const g = L.forms[key];
      const hit = out.find((o) => o.glyph === g);
      if (hit) hit.label += ' / ' + label;
      else out.push({ key, label, glyph: g });
    });
    return out;
  }

  function openAlphabet(char) {
    if (pad) { pad.destroy(); pad = null; }
    view.screen = 'alphabet';
    view.refLetter = char || view.refLetter || D.ALPHABET[0].char;
    view.refForm = 'isolated';
    renderAlphabet();
    window.scrollTo(0, 0);
  }

  function renderAlphabet() {
    const L = D.getLetter(view.refLetter) || D.ALPHABET[0];
    const forms = distinctForms(L);
    if (!forms.some((f) => f.key === view.refForm)) view.refForm = forms[0].key;
    const active = forms.find((f) => f.key === view.refForm) || forms[0];
    const rule = AH.letterforms.get(L.char, active.key);

    $('#app').innerHTML = [
      '<div class="alpha-screen">',
      '  <header class="alpha-head">',
      '    <button type="button" class="round-btn" data-act="back" title="Derslere dön">‹</button>',
      '    <div><h1>Harf Şekilleri</h1><p>28 harfin yazılışı — nereden başlanır, nasıl çizilir</p></div>',
      '  </header>',

      '  <div class="alpha-grid">',
      D.ALPHABET.map((x) =>
        '<button type="button" class="alpha-chip' + (x.char === L.char ? ' on' : '') +
        '" data-char="' + x.char + '">' +
        '<span class="alpha-glyph" dir="rtl">' + x.char + '</span>' +
        '<span class="alpha-name">' + esc(x.name) + '</span></button>'
      ).join(''),
      '  </div>',

      '  <section class="alpha-detail">',
      '    <div class="alpha-detail-head">',
      '      <div>',
      '        <h2>' + esc(L.name) + ' <span dir="rtl">' + L.char + '</span></h2>',
      '        <p>' + esc(L.sound) + '</p>',
      '      </div>',
      '      <button type="button" class="icon-btn" data-act="say" title="Dinle">🔊</button>',
      '    </div>',

      '    <div class="form-tabs" role="tablist">',
      forms.map((f) =>
        '<button type="button" class="form-tab' + (f.key === active.key ? ' on' : '') +
        '" data-form="' + f.key + '">' +
        '<span dir="rtl">' + f.glyph + '</span><i>' + esc(f.label) + '</i></button>'
      ).join(''),
      '    </div>',

      '    <div class="canvas-frame"><canvas class="pad" aria-label="Yazım gösterimi"></canvas></div>',
      '    <div class="watch-bar">',
      '      <button type="button" class="btn btn-sound btn-lg" data-act="replay">' + t('▶ Tekrar izle') + '</button>',
      /* İzlemek yetmez — burada, o an bakılan BİÇİMİ hemen yazmaya geçilir. */
      '      <button type="button" class="btn btn-primary btn-lg" data-act="practice">✍️ ' +
      t('Bu biçimi yaz') + '</button>',
      '    </div>',
      speedBarHTML(),

      rule ? '<ol class="phase-list">' + rule.phases.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ol>' : '',
      rule ? '<p class="trace-help">🟢 ' + esc(rule.startTip) + ' ' + esc(rule.dirTip) + '</p>' : '',
      L.dots
        ? '<p class="trace-help dots-tip">🟠 ' + L.dots + ' nokta, harfin ' + esc(L.dotSide) +
          '. Noktalar EN SONA yazılır.</p>'
        : '<p class="trace-help">Bu harfin noktası yoktur.' +
          (rule && rule.extra ? ' ' + esc(rule.extra) : '') + '</p>',
      !L.joinsForward
        ? '<p class="trace-help">⛓️‍💥 Bu harf kendinden SONRAKİ harfe bağlanmaz.</p>'
        : '',
      rule && rule.source === 'family'
        ? '<p class="alpha-src">Bu harf, kitapçıkta <b>' + esc(rule.familyLabel) +
          '</b> ailesiyle aynı iskeleti paylaşır; yazım yönü o aileden alınmıştır.</p>'
        : (rule && rule.page
            ? '<p class="alpha-src">Yazım yönü: kitapçık s.' + rule.page + '</p>'
            : ''),
      '  </section>',
      '</div>'
    ].join('');

    $('[data-act="back"]').addEventListener('click', exitToMap);
    $('[data-act="say"]').addEventListener('click', () => AH.speech.speak(L.char));
    $$('.alpha-chip').forEach((b) =>
      b.addEventListener('click', () => {
        view.refLetter = b.dataset.char;
        view.refForm = 'isolated';
        renderAlphabet();
      })
    );
    $$('.form-tab').forEach((b) =>
      b.addEventListener('click', () => {
        view.refForm = b.dataset.form;
        renderAlphabet();
      })
    );

    pad = AH.tracing.create($('canvas.pad'), {});
    pad.setForm(rule);
    pad.setWord(active.glyph);
    pad.setGhost(true);
    pad.setLocked(true);

    function play() {
      pad.clear();
      pad.playDemo({ duration: demoDuration(), onDone() { pad.setShowStart(true); } });
    }
    $('[data-act="replay"]').addEventListener('click', play);

    /* "Bu biçimi yaz" — sanal tek adımlık ünite; ilerlemeye yazılmaz,
       istediği kadar tekrar edebilsin diye serbest alıştırmadır. */
    $('[data-act="practice"]').addEventListener('click', () => {
      const g = active.glyph;
      openUnit({
        id: 'PRACTICE-' + L.char + '-' + active.key,
        title: L.name + ' — ' + active.label,
        group: 'Alıştırma',
        icon: '✍️',
        stageId: 1,
        index: 0,
        isPractice: true,
        backTo: { screen: 'alphabet', char: L.char, form: active.key },
        steps: [{
          id: 'PRACTICE-' + L.char + '-' + active.key,
          type: 'letter-write',
          phase: 'YAZ',
          letter: L,
          formKey: active.key,
          glyph: g,
          guided: false,
          practice: true,
          title: L.name + ' — ' + active.label + ' biçimini yaz'
        }]
      });
    });

    wireSpeed(document, play);
    setTimeout(play, 250);
  }

  /* ------------------------------------------------------------------ */
  /* Ekran 2 — DERS OYNATICI                                             */
  /* ------------------------------------------------------------------ */
  function openUnit(unit) {
    cancelAutoNext();
    view.screen = 'unit';
    view.unit = unit;
    view.stepIndex = S.unitCursor(unit);
    view.attempts = 0;
    view.examRun = null;
    S.setLast(unit.id);
    renderStep();
  }

  function exitToMap() {
    cancelAutoNext();
    if (pad) { pad.destroy(); pad = null; }
    view.screen = 'map';
    view.unit = null;
    renderMap();
    window.scrollTo(0, 0);
  }

  function currentStep() {
    return view.unit.steps[view.stepIndex];
  }

  /** Adımı tamamla ve ilerle. */
  function completeStep(score) {
    const step = currentStep();
    /* Serbest alıştırma (Harf Şekilleri → "Bu biçimi yaz") ilerlemeye
       yazılmaz: çocuk istediği kadar tekrar edebilsin, ünite yüzdeleri
       sahte adımlarla bozulmasın. */
    if (!step.practice) S.markStep(step.id, score == null ? 100 : score);
    goNext();
  }

  function goNext() {
    if (pad) { pad.destroy(); pad = null; }
    view.attempts = 0;
    if (view.stepIndex < view.unit.steps.length - 1) {
      view.stepIndex++;
      renderStep();
      return;
    }
    /* Serbest alıştırma bitince "ders tamamlandı" ekranı gösterilmez —
       geldiği yere (Harf Şekilleri) döner. */
    const back = view.unit.backTo;
    if (back && back.screen === 'alphabet') {
      view.refLetter = back.char;
      view.refForm = back.form;
      view.unit = null;
      view.screen = 'alphabet';
      renderAlphabet();
      ui.toast('Güzel! İstersen başka bir biçimi de yaz.', 'good');
      return;
    }
    renderUnitComplete();
  }

  function goPrev() {
    if (view.stepIndex === 0) return exitToMap();
    if (pad) { pad.destroy(); pad = null; }
    view.stepIndex--;
    view.attempts = 0;
    renderStep();
  }

  /* ---- oynatıcı çerçevesi ---- */
  /* Türkçe büyük harfler (İ, Ö) küçültülünce CSS sınıfı bozulduğu için
     faz adları sabit sınıflara eşlenir. */
  const PHASE_CLASS = {
    'ÖĞREN': 'ogren', 'İZLE': 'izle', 'TAKİP': 'takip',
    'YAZ': 'yaz', 'KUR': 'kur', 'KONTROL': 'kontrol', 'SINAV': 'sinav'
  };

  function playerFrame(step, bodyHTML, footHTML) {
    const dots = view.unit.steps
      .map((st, i) => {
        const cls = i < view.stepIndex ? 'done' : i === view.stepIndex ? 'now' : '';
        return '<i class="' + cls + '"></i>';
      })
      .join('');

    $('#app').innerHTML = [
      '<div class="player">',
      '  <header class="player-bar">',
      '    <button type="button" class="round-btn" data-act="back" title="Geri">‹</button>',
      '    <div class="step-dots">' + dots + '</div>',
      '    <span class="phase-chip phase-' + (PHASE_CLASS[step.phase] || 'ogren') + '">' + t(step.phase) + '</span>',
      '    <button type="button" class="round-btn" data-act="exit" title="Derslere dön">✕</button>',
      '  </header>',
      '  <main class="step-body" id="step-body">' + bodyHTML + '</main>',
      '  <footer class="step-foot" id="step-foot">' + (footHTML || '') + '</footer>',
      '</div>'
    ].join('');

    $('[data-act="back"]').addEventListener('click', goPrev);
    $('[data-act="exit"]').addEventListener('click', exitToMap);
  }

  function ctaHTML(label, opts) {
    const o = opts || {};
    return (
      '<button type="button" class="btn btn-primary btn-xl cta"' +
      (o.disabled ? ' disabled' : '') +
      ' data-act="cta">' + label + '</button>' +
      (o.extra || '')
    );
  }

  function onCTA(fn) {
    const b = $('[data-act="cta"]');
    if (b) b.addEventListener('click', fn);
  }

  /* ------------------------------------------------------------------ */
  /* Adım tipleri                                                        */
  /* ------------------------------------------------------------------ */
  function renderStep() {
    const step = currentStep();
    window.scrollTo(0, 0);
    switch (step.type) {
      case 'teach-letter': return renderTeachLetter(step);
      case 'teach-haraka': return renderTeachHaraka(step);
      case 'haraka-write': return renderHarakaWrite(step);
      case 'haraka-pick':  return renderHarakaPick(step);
      case 'dots-place':   return renderDotsPlace(step);
      case 'join-write':   return renderJoinWrite(step);
      case 'missing-letter': return renderMissingLetter(step);
      case 'teach-forms':  return renderTeachForms(step);
      case 'teach-word':   return renderTeachWord(step);
      case 'watch':        return renderWatch(step);
      case 'letter-write': return renderLetterWrite(step);
      case 'trace':        return renderTrace(step);
      case 'assemble':     return renderAssemble(step);
      case 'quiz':         return renderQuiz(step);
      case 'exam-intro':   return renderExamIntro(step);
      case 'exam-result':  return renderExamResult(step);
      default:             return exitToMap();
    }
  }

  /* ---- ÖĞREN: harf ---- */
  function renderTeachLetter(step) {
    const L = step.letter;
    playerFrame(
      step,
      [
        '<div class="teach">',
        '  <p class="step-kicker">Yeni harf</p>',
        '  <div class="hero-glyph-card">',
        '    <div class="ruled">',
        '      <span class="hero-glyph" dir="rtl">' + esc(L.char) + '</span>',
        '    </div>',
        '    <button type="button" class="btn btn-sound btn-lg" data-act="say">🔊 Dinle</button>',
        '  </div>',
        '  <h2 class="teach-name">' + esc(L.name) + '</h2>',
        '  <p class="teach-sound">' + esc(L.sound) + '</p>',
        '  <div class="fact-row">',
        '    <div class="fact"><span>Nokta</span><b>' + esc(L.dotsText || L.dots) + '</b></div>',
        '    <div class="fact"><span>Bağlanma</span><b>' +
            (L.forms.initial === L.forms.isolated ? 'Sonrakine bağlanmaz' : 'Her iki yana bağlanır') + '</b></div>',
        '  </div>',
        '  <div class="how-to"><span class="how-to-title">✍️ Nasıl yazılır?</span><p>' + esc(L.write) + '</p></div>',
        '</div>'
      ].join(''),
      ctaHTML(t('Anladım, yazalım ➜'))
    );

    $('[data-act="say"]').addEventListener('click', () => AH.speech.speak(L.char));
    setTimeout(() => AH.speech.speak(L.char), 350);
    onCTA(() => completeStep(100));
  }

  /* ---- ÖĞREN: formlar (hepsine dokunmadan geçilemez) ---- */
  function renderTeachForms(step) {
    const L = step.letter;
    const keys = ['isolated', 'initial', 'medial', 'final'];
    const labels = D.FORM_LABELS;
    const explain = {
      isolated: 'Tek başına, komşusu yokken.',
      initial: 'Kelimenin başında — soldan devam eder.',
      medial: 'İki harfin arasında — iki yandan bağlı.',
      final: 'Kelimenin sonunda — sağdan bağlanır, kuyruğu geri gelir.'
    };

    playerFrame(
      step,
      [
        '<div class="teach">',
        '  <p class="step-kicker">Aynı harf, dört farklı yüz</p>',
        '  <h2 class="teach-name">' + esc(L.name) + ' nasıl değişir?</h2>',
        '  <p class="teach-sound">Her kutuya dokun ve şeklin nasıl değiştiğine bak.</p>',
        '  <div class="forms-row big" dir="rtl">',
        keys.map((k) =>
          '<button type="button" class="form-box" data-key="' + k + '" data-form="' + esc(L.forms[k]) + '">' +
          '<span class="form-glyph">' + esc(L.forms[k]) + '</span>' +
          '<span class="form-label">' + labels[k] + '</span></button>'
        ).join(''),
        '  </div>',
        '  <div class="form-explain" id="form-explain">Bir kutuya dokun…</div>',
        '</div>'
      ].join(''),
      ctaHTML(t('Devam ➜'), { disabled: true })
    );

    const touched = {};
    const total = keys.length;
    $$('.form-box').forEach((b) =>
      b.addEventListener('click', () => {
        const k = b.dataset.key;
        touched[k] = true;
        b.classList.add('seen');
        $$('.form-box').forEach((x) => x.classList.remove('picked'));
        b.classList.add('picked');
        $('#form-explain').innerHTML =
          '<b>' + labels[k] + ':</b> ' + explain[k] +
          ' <span class="mini-glyph" dir="rtl">' + esc(L.forms[k]) + '</span>';
        AH.speech.speak(L.char);
        if (Object.keys(touched).length === total) {
          const cta = $('[data-act="cta"]');
          cta.disabled = false;
          cta.classList.add('ready');
        }
      })
    );

    onCTA(() => completeStep(100));
  }

  /* ---- ÖĞREN: kelime ---- */
  function renderTeachWord(step) {
    const ex = step.ex;
    playerFrame(
      step,
      [
        '<div class="teach">',
        '  <p class="step-kicker">Yeni kelime</p>',
        '  <div class="hero-glyph-card">',
        '    <div class="ruled"><span class="hero-glyph word" dir="rtl">' + esc(ex.vowelled) + '</span></div>',
        '    <button type="button" class="btn btn-sound btn-lg" data-act="say">🔊 Dinle</button>',
        '  </div>',
        '  <h2 class="teach-name">' + esc(ex.tr) + '</h2>',
        ex.tag ? '<p class="teach-tag">' + esc(ex.tag) + '</p>' : '',
        /* İLERİ AŞAMALARDA SONUÇ GİZLİ:
           1–2. aşamada denklem sonucu gösterilir (çocuk parçaların nasıl
           birleştiğini görsün). 3. aşamadan sonra sonuç GİZLENİR — parçalara
           bakıp kelimeyi zihninde birleştirmesi istenir; isterse açabilir. */
        (function () {
          const hide = (step.stage ? step.stage.stageId : (step.ex && step.ex.stageId) ||
            (view.unit && view.unit.stageId) || 1) >= 3;
          return '<div class="equation" dir="rtl">' +
            ex.equation.map((f) => '<span class="eq-part">' + esc(f) + '</span>')
              .join('<span class="eq-op">+</span>') +
            '<span class="eq-op">=</span>' +
            (hide
              ? '<button type="button" class="eq-result hidden-result" data-act="reveal" ' +
                'title="Önce kendin birleştir">؟</button>'
              : '<span class="eq-result">' + esc(ex.result) + '</span>') +
            '</div>';
        })(),
        ex.note ? '<div class="how-to"><span class="how-to-title">💡 Dikkat</span><p>' + esc(ex.note) + '</p></div>' : '',
        '</div>'
      ].join(''),
      ctaHTML(t('Şimdi kuralım ➜'))
    );
    $('[data-act="say"]').addEventListener('click', () => AH.speech.speak(ex.vowelled));
    setTimeout(() => AH.speech.speak(ex.vowelled), 350);
    const rv = $('[data-act="reveal"]');
    if (rv) rv.addEventListener('click', () => {
      const s = document.createElement('span');
      s.className = 'eq-result';
      s.dir = 'rtl';
      s.textContent = ex.result;
      rv.replaceWith(s);
    });
    onCTA(() => completeStep(100));
  }

  /* ---- KUR: sürükle-bırak ---- */
  function renderAssemble(step) {
    const ex = step.ex;
    playerFrame(
      step,
      [
        '<div class="teach">',
        '  <p class="step-kicker">Parçaları yerine koy</p>',
        '  <h2 class="teach-name" dir="rtl">' + esc(ex.result) + '</h2>',
        '  <p class="teach-sound">' + esc(ex.tr) + '</p>',
        '  <div id="assembly-host"></div>',
        '</div>'
      ].join(''),
      ctaHTML(t('Devam ➜'), { disabled: true })
    );

    AH.assembly.mount($('#assembly-host'), ex, function onSolved() {
      const cta = $('[data-act="cta"]');
      cta.disabled = false;
      cta.classList.add('ready');
      AH.confetti.fire(cta, 60);
    }, false);

    onCTA(() => completeStep(100));
  }

  /* ---- İZLE: kalem gösterisi ---- */
  function renderWatch(step) {
    const L = step.letter;
    const form = AH.letterforms.get(L.char, step.formKey);
    const phases = (form && form.phases) || [];

    playerFrame(
      step,
      [
        '<div class="trace-step">',
        '  <div class="step-topline">',
        '    <h2 class="watch-title">' + esc(step.title) + '</h2>',
        '    <span class="aid-flag">Önce izle</span>',
        '  </div>',
        '  <div class="write-stage" id="write-stage">',
        '    <div class="canvas-frame"><canvas class="pad" aria-label="Yazım gösterimi"></canvas></div>',
        '    <div class="side-tools">',
        '      <button type="button" class="tool-btn primary" data-act="replay" title="Tekrar izle">▶</button>',
        '      <button type="button" class="tool-btn" data-act="say" title="Dinle">🔊</button>',
        '      <button type="button" class="tool-btn" data-act="expand" title="Büyüt / küçült">⛶</button>',
        speedRailHTML(),
        '    </div>',
        '  </div>',
        '  <ol class="phase-list">',
        phases.map((p) => '<li>' + esc(p) + '</li>').join(''),
        '  </ol>',
        form ? '<p class="trace-help">🟢 ' + esc(form.startTip) + ' ' + esc(form.dirTip) + '</p>' : '',
        form && form.dots.count
          ? '<p class="trace-help dots-tip">🟠 ' + form.dots.count + ' nokta, harfin ' +
            esc(form.dots.side) + '. Noktalar EN SONA yazılır.</p>'
          : '',
        '</div>'
      ].join(''),
      ctaHTML(t('Şimdi ben deneyeyim ➜'), { disabled: true })
    );

    pad = AH.tracing.create($('canvas.pad'), {});
    pad.setForm(form);
    pad.setWord(step.glyph);
    pad.setGhost(true);
    pad.setLocked(true);
    wireExpand();

    const cta = $('[data-act="cta"]');
    function play() {
      pad.clear();
      pad.playDemo({
        duration: demoDuration(),
        onDone() {
          cta.disabled = false;
          cta.classList.add('ready');
          pad.setShowStart(true);
        }
      });
    }
    $('[data-act="replay"]').addEventListener('click', play);
    $('[data-act="say"]').addEventListener('click', () => AH.speech.speak(L.char));
    wireSpeed(document, play);
    setTimeout(play, 260);
    onCTA(() => completeStep(100));
  }

  /* ---- TAKİP / YAZ: harfi yazma + yazım denetimi ---- */
  function renderLetterWrite(step) {
    const L = step.letter;
    const form = AH.letterforms.get(L.char, step.formKey);
    const guided = !!step.guided;

    playerFrame(
      step,
      [
        '<div class="trace-step">',
        '  <div class="step-topline">',
        '    <h2 class="watch-title">' + esc(step.title) + '</h2>',
        guided
          ? '<span class="aid-flag on">Yardımlar açık</span>'
          : '<span class="aid-flag">Yardımsız · %' + AH.strokecheck.PASS + '</span>',
        '  </div>',
        /* Tuval + YAN ARAÇ ÇUBUĞU: düğmeler yazı alanının yanında,
           sayfayı aşağı yukarı kaydırmadan ulaşılabilir. */
        '  <div class="write-stage" id="write-stage">',
        '    <div class="canvas-frame"><canvas class="pad" aria-label="Yazma tuvali"></canvas></div>',
        '    <div class="side-tools">',
        '      <button type="button" class="tool-btn" data-act="demo" title="Göster">▶</button>',
        '      <button type="button" class="tool-btn" data-act="undo" title="Geri al">↶</button>',
        '      <button type="button" class="tool-btn" data-act="clear" title="Temizle">🗑</button>',
        '      <button type="button" class="tool-btn" data-act="expand" title="Büyüt / küçült">⛶</button>',
        '    </div>',
        '  </div>',
        form
          ? '<p class="trace-help">🟢 ' + esc(form.startTip) +
            (form.dots.count ? ' · 🟠 Noktaları en sona bırak.' : '') + '</p>'
          : '',
        '  <div id="score-host" class="score-host"></div>',
        '</div>'
      ].join(''),
      ctaHTML(t('✔ Kontrol Et'))
    );

    pad = AH.tracing.create($('canvas.pad'), {});
    pad.setForm(form);
    pad.setWord(step.glyph);
    pad.setGhost(guided);
    pad.setShowStart(true);
    wireExpand();

    $('[data-act="undo"]').addEventListener('click', () => pad.undo());
    $('[data-act="clear"]').addEventListener('click', () => {
      pad.clear();
      $('#score-host').innerHTML = '';
    });
    $('[data-act="demo"]').addEventListener('click', () => {
      pad.clear();
      pad.playDemo({ duration: demoDuration(), onDone() { pad.setShowStart(true); } });
    });

    onCTA(() => {
      const shape = pad.evaluate();
      if (shape.empty) {
        ui.toast('Önce harfi tuvale yaz.', 'warn');
        return;
      }
      const res = AH.strokecheck.check({
        strokes: pad.getStrokes(),
        refPath: pad.refPath(),
        refDots: pad.refDots(),
        shape,
        targetBox: pad.inkBox(),
        baselineY: pad.getLayout().baselineY,
        fontSize: pad.getLayout().fontSize,
        dotsInfo: form ? form.dots : null
      });

      $('#score-host').innerHTML = writeScoreHTML(res);
      markWhereStudentStarted(res);
      S.logAttempt(step.id, res);     /* öğretmen raporu için kayıt */

      if (res.pass) {
        AH.confetti.fire($('[data-act="cta"]'), 130);
        $('#score-host').innerHTML += '<p class="score-msg good">🎉 Doğru yazdın! (%' + res.score + ')</p>';
        setTimeout(() => completeStep(res.score), 1000);
        return;
      }

      /* Hataya ÖZEL gösterim: çocuk yazıyı okumaz, hareketi görür. */
      $('#score-host').innerHTML += fixHintHTML(res);
      wireFixHint();
      view.attempts++;
      const list = res.problems.slice(0, 2)
        .map((p) => '<li>' + esc(p.msg) + '</li>').join('');
      $('#score-host').innerHTML +=
        '<p class="score-msg bad">%' + res.score + ' — geçmek için %' + AH.strokecheck.PASS + ' gerekiyor.</p>' +
        (list ? '<ul class="problem-list">' + list + '</ul>' : '');

      /* iki denemeden sonra yardımları aç */
      if (view.attempts >= 2 && !pad.isGhost()) {
        pad.setGhost(true);
        ui.toast('Yardım açıldı: harfin soluk hâli göründü. Üstünden geç.', 'info', 4000);
      }
      if (view.attempts >= 3) {
        pad.clear();
        pad.playDemo({ duration: demoDuration(), onDone() { pad.setShowStart(true); } });
      }
    });
  }

  /**
   * Kontrolden sonra tuvalde "sen burada başladın / burada bitirdin"
   * işaretlerini gösterir. Yanlışsa yeşil doğru başlangıca kesik çizgi çeker.
   */
  function markWhereStudentStarted(res) {
    if (!pad || !res || !res.trace) return;
    pad.setMarks({ start: res.trace.start, end: res.trace.end, ok: res.trace.startOK });
  }

  function writeScoreHTML(res) {
    const bar = (label, val) =>
      '<div class="mini-metric"><span>' + label + '</span>' +
      '<i class="' + (val >= 80 ? 'ok' : val >= 55 ? 'mid' : 'no') + '">' +
      '<b style="width:' + Math.max(3, val) + '%"></b></i><em>%' + val + '</em></div>';
    const p = res.parts || {};
    return [
      '<div class="write-score ' + (res.pass ? 'good' : 'bad') + '">',
      '  <div class="write-total">%' + res.score + '</div>',
      '  <div class="write-metrics">',
      bar('Şekil', p.shape || 0),
      bar('Başlangıç', p.start || 0),
      bar('Yön', p.direction || 0),
      res.dotsExpected ? bar('Noktalar', p.dots || 0) : '',
      typeof p.proportion === 'number' ? bar('Büyüklük', p.proportion) : '',
      typeof p.baseline === 'number' ? bar('Satıra oturma', p.baseline) : '',
      '  </div>',
      '</div>'
    ].join('');
  }

  /* ================================================================== */
  /* SEBEBE GÖRE GÖSTERİM                                                */
  /*                                                                     */
  /* strokecheck her hatayı bir KOD ile döndürüyordu (start, reverse,    */
  /* dots-missing, proportion, baseline…) ama çocuk bunu yazı olarak     */
  /* okuyordu. Çocuk yazıyı okumaz — hareketi görür. Bu bölüm, hataya    */
  /* ÖZEL küçük bir gösterim oynatır:                                    */
  /*                                                                     */
  /*   start / reverse → yolun yalnız İLK %25'i, yavaşça (nereden ve     */
  /*                     hangi yöne başlanacağı)                         */
  /*   dots-*          → gövde atlanır, nokta hedefleri yanıp söner      */
  /*   proportion      → tam gösterim (doğru büyüklüğü görsün)           */
  /*   baseline        → tam gösterim + satır çizgisi vurgulanır         */
  /* ================================================================== */
  const FIX_HINT = {
    start: { icon: '🟢', label: 'Nereden başlanır?', part: 0.25 },
    reverse: { icon: '↔️', label: 'Hangi yöne gidilir?', part: 0.45 },
    wander: { icon: '〰️', label: 'Yolu takip et', part: 1 },
    'dots-missing': { icon: '🟠', label: 'Noktalar nereye?', dots: true },
    'dots-extra': { icon: '🟠', label: 'Kaç nokta var?', dots: true },
    'dots-none': { icon: '🟠', label: 'Noktaları unutma', dots: true },
    proportion: { icon: '📏', label: 'Bu büyüklükte', part: 1 },
    baseline: { icon: '📉', label: 'Satıra otur', part: 1 },
    coverage: { icon: '✏️', label: 'Şöyle yazılır', part: 1 },
    precision: { icon: '✏️', label: 'Şöyle yazılır', part: 1 },
    short: { icon: '✏️', label: 'Sonuna kadar yaz', part: 1 }
  };

  /** Başarısız denemeden sonra "neden" düğmesi üretir. */
  function fixHintHTML(res) {
    const codes = (res.problems || []).map((p) => p.code);
    const hit = codes.filter((c) => FIX_HINT[c])[0];
    if (!hit) return '';
    const h = FIX_HINT[hit];
    return '<button type="button" class="btn btn-ghost btn-sm fix-hint" data-act="fixhint" ' +
      'data-code="' + hit + '">' + h.icon + ' ' + esc(h.label) + ' — göster</button>';
  }

  /** Gösterimi oynat. Öğrencinin çizdiği silinmez; gösteri boyunca gizlenir. */
  function playFixHint(code) {
    if (!pad || pad.isDemoRunning()) return;
    const h = FIX_HINT[code];
    if (!h) return;
    const saved = pad.getStrokes().slice();
    pad.setStrokes([]);

    if (h.dots) {
      /* Noktalar: gövdeyi atla, hedefleri yanıp söndür */
      pad.setShowDotTargets(true);
      let n = 0;
      const blink = setInterval(() => {
        n++;
        pad.setShowDotTargets(n % 2 === 1);
        if (n >= 6) {
          clearInterval(blink);
          pad.setShowDotTargets(true);
          pad.setStrokes(saved);
        }
      }, 380);
      return;
    }

    /* Yolun yalnız bir bölümünü oynat: buildDemo'nun paint(t) kancası
       kullanılır, t hedef orana kadar götürülüp orada bırakılır. */
    const frac = h.part || 1;
    if (frac >= 1) {
      pad.playDemo({
        duration: demoDuration(),
        onDone() { pad.setShowStart(true); pad.setStrokes(saved); }
      });
      return;
    }
    const demo = pad.buildDemo({ duration: demoDuration() });
    if (!demo) { pad.setStrokes(saved); return; }
    const dur = demoDuration() * frac;
    const t0 = performance.now();
    (function step() {
      const el = performance.now() - t0;
      const t = Math.min(frac, (el / dur) * frac);
      demo.paint(t);
      if (el < dur) { requestAnimationFrame(step); return; }
      /* bitişte kısa bir bekleme, sonra öğrencinin yazısı geri gelsin */
      setTimeout(() => { pad.setShowStart(true); pad.setStrokes(saved); }, 1200);
    })();
  }

  /** Skor kutusundaki "göster" düğmesini bağlar. */
  function wireFixHint() {
    const b = $('[data-act="fixhint"]');
    if (b) b.addEventListener('click', () => playFixHint(b.dataset.code));
  }

  /* ================================================================== */
  /* HAREKELER — kısa sesler                                            */
  /* Müfredattaki her kelime harekeliydi ama hiçbir ders bu işaretleri   */
  /* tanıtmıyordu. Üç adımlı akış: TANI → YAZ → SEÇ.                     */
  /* ================================================================== */
  function renderTeachHaraka(step) {
    const h = step.haraka;
    const demo = step.base + h.mark;
    playerFrame(
      step,
      [
        '<div class="teach haraka-teach">',
        '  <div class="hrk-hero"><span dir="rtl">' + esc(demo) + '</span></div>',
        '  <h2 class="teach-name">' + esc(h.name) + ' <i dir="rtl">' + esc(h.ar) + '</i></h2>',
        '  <p class="teach-sound">' + esc(h.tr) + ' · ses: <b>' + esc(h.sound) + '</b></p>',
        '  <button type="button" class="btn btn-sound btn-lg" data-act="say">🔊 ' +
        esc(step.base) + h.mark + ' — “' + esc(h.say) + '”</button>',
        '  <ul class="hrk-facts">',
        '    <li><b>Nedir?</b> ' + esc(h.what) + '</li>',
        '    <li><b>Nasıl yazılır?</b> ' + esc(h.how) + '</li>',
        '    <li><b>Nasıl okutur?</b> ' + esc(h.read) + '</li>',
        '  </ul>',
        '  <p class="hrk-where">' + (h.pos === 'above'
          ? '⬆ Harfin <b>ÜSTÜNE</b> konur.'
          : '⬇ Harfin <b>ALTINA</b> konur.') + '</p>',
        '</div>'
      ].join(''),
      ctaHTML(t('Anladım, yazalım ➜'))
    );
    const say = () => AH.speech.speak(demo);
    $('[data-act="say"]').addEventListener('click', say);
    setTimeout(say, 400);
    onCTA(() => completeStep(100));
  }

  /* Hareke YAZMA — işaret doğru TARAFA konmuş mu?
     Ölçüt basittir ve dürüsttür: harfin mürekkep kutusuna göre işaretin
     üstte mi altta mı olduğu, ve makul büyüklükte olup olmadığı. Şeklin
     kendisi (eğik çizgi / daire / vav) denetlenmez — o kadar küçük bir
     çizimde şekil denetimi güvenilir olmaz, yanlış "hata" verirdi. */
  function renderHarakaWrite(step) {
    const h = step.haraka;
    playerFrame(
      step,
      [
        '<div class="trace-step">',
        '  <div class="step-topline">',
        '    <span class="trace-glyph" dir="rtl">' + esc(step.base + h.mark) + '</span>',
        '    <span class="aid-flag">' + esc(h.name) + ' — ' +
        (h.pos === 'above' ? 'ÜSTE' : 'ALTA') + '</span>',
        '  </div>',
        '  <div class="write-stage" id="write-stage">',
        '    <div class="canvas-frame"><canvas class="pad" aria-label="Hareke yazma"></canvas></div>',
        '    <div class="side-tools">',
        '      <button type="button" class="tool-btn" data-act="say" title="Dinle">🔊</button>',
        '      <button type="button" class="tool-btn" data-act="undo" title="Geri al">↶</button>',
        '      <button type="button" class="tool-btn" data-act="clear" title="Temizle">🗑</button>',
        '    </div>',
        '  </div>',
        '  <p class="trace-help">💡 ' + esc(h.how) + '</p>',
        '  <div id="score-host" class="score-host"></div>',
        '</div>'
      ].join(''),
      ctaHTML(t('✔ Kontrol Et'))
    );

    /* Tuvale harfi ÇIPA olarak koy: çocuk yalnız işareti çizecek */
    pad = AH.tracing.create($('canvas.pad'), {});
    pad.setForm(AH.letterforms.get(step.base, 'isolated'));
    pad.setWord(step.base);
    pad.setGhost(true);
    pad.setShowStart(false);

    $('[data-act="say"]').addEventListener('click', () => AH.speech.speak(step.base + h.mark));
    $('[data-act="undo"]').addEventListener('click', () => pad.undo());
    $('[data-act="clear"]').addEventListener('click', () => {
      pad.clear();
      $('#score-host').innerHTML = '';
    });

    onCTA(() => {
      const strokes = pad.getStrokes();
      if (!strokes.length) { ui.toast('Önce işareti çiz.', 'warn'); return; }
      const box = pad.inkBox();
      const fs = pad.getLayout().fontSize;
      if (!box) { completeStep(100); return; }

      /* çocuğun çizdiği mürekkebin kutusu */
      let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
      strokes.forEach((s) => s.forEach((p) => {
        if (p.x < mnx) mnx = p.x; if (p.x > mxx) mxx = p.x;
        if (p.y < mny) mny = p.y; if (p.y > mxy) mxy = p.y;
      }));
      const cy = (mny + mxy) / 2;
      const size = Math.max(mxx - mnx, mxy - mny);

      const above = cy < box.miny;              /* harfin üstünde mi? */
      const below = cy > box.maxy;
      const sideOK = h.pos === 'above' ? above : below;
      const sizeOK = size > fs * 0.04 && size < fs * 0.45;

      const problems = [];
      if (!sideOK) {
        problems.push(h.pos === 'above'
          ? 'İşaret harfin ÜSTÜNE konur — biraz daha yukarı çiz.'
          : 'İşaret harfin ALTINA konur — biraz daha aşağı çiz.');
      }
      if (size >= fs * 0.45) problems.push('İşaret çok büyük — harften küçük olmalı.');
      if (size <= fs * 0.04) problems.push('İşaret çok küçük — biraz belirgin çiz.');

      if (sideOK && sizeOK) {
        $('#score-host').innerHTML = '<p class="score-msg good">🎉 Doğru yere koydun!</p>';
        AH.confetti.fire($('[data-act="cta"]'), 90);
        setTimeout(() => completeStep(100), 900);
        return;
      }
      $('#score-host').innerHTML = '<p class="score-msg bad">' +
        problems.map(esc).join('<br>') + '</p>';
      view.attempts++;
      if (view.attempts >= 3) {
        $('#score-host').innerHTML += '<p class="score-msg">İstersen geçebilirsin.</p>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="skip">Geç ➜</button>';
        const sk = $('[data-act="skip"]');
        if (sk) sk.addEventListener('click', () => completeStep(60));
      }
    });
  }

  /* Sesi duy → işareti seç */
  function renderHarakaPick(step) {
    const h = step.haraka;
    const all = (D.HARAKAT || []).slice();
    /* seçenekler: doğru + 3 farklı hareke, sabit sırada karıştır */
    const others = all.filter((x) => x.id !== h.id);
    const opts = [h].concat(others.slice(0, 3));
    for (let i = opts.length - 1; i > 0; i--) {
      const j = (i * 7 + step.id.length) % (i + 1);
      const tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
    }

    playerFrame(
      step,
      [
        '<div class="quiz">',
        '  <p class="step-kicker">Kontrol</p>',
        '  <h2 class="quiz-q">Duyduğun sesin harekesi hangisi?</h2>',
        '  <button type="button" class="btn btn-sound btn-xl listen" data-act="listen">' +
        '🔊 Sesi dinle</button>',
        '  <p class="quiz-fallback">İpucu: <b>' + esc(step.base) + h.mark +
        '</b> — “' + esc(h.say) + '”</p>',
        '  <div class="options glyphs">',
        opts.map((o, i) =>
          '<button type="button" class="option" data-i="' + i + '" dir="rtl">' +
          '<span>' + esc(step.base + o.mark) + '</span>' +
          '<i class="opt-name">' + esc(o.name) + '</i></button>').join(''),
        '  </div>',
        '  <div id="quiz-msg" class="quiz-msg"></div>',
        '</div>'
      ].join(''),
      ''
    );

    const play = () => AH.speech.speak(step.base + h.mark);
    $('[data-act="listen"]').addEventListener('click', play);
    setTimeout(play, 400);

    let done = false;
    $$('.option').forEach((b) => b.addEventListener('click', () => {
      if (done) return;
      const o = opts[Number(b.dataset.i)];
      if (o.id === h.id) {
        done = true;
        b.classList.add('right');
        $$('.option').forEach((x) => (x.disabled = true));
        $('#quiz-msg').innerHTML = '<span class="good">✓ ' + esc(h.name) + ' — doğru!</span>';
        AH.confetti.fire(b, 80);
        setTimeout(() => completeStep(100), 900);
      } else {
        b.classList.add('wrong');
        b.disabled = true;
        $('#quiz-msg').innerHTML = '<span class="bad">' + esc(o.name) +
          ' değil — tekrar dinle.</span>';
      }
    }));
  }

  /* ================================================================== */
  /* NOKTALAR — gövde aynı, fark yalnız nokta                            */
  /* ب/ت/ث · د/ذ · ر/ز · س/ش · ص/ض · ط/ظ · ع/غ · ف/ق                     */
  /* Harfin gövdesi gösterilir, noktaları çocuk koyar.                   */
  /* ================================================================== */
  function renderDotsPlace(step) {
    const L = step.letter;
    const need = L.dots;
    playerFrame(
      step,
      [
        '<div class="trace-step">',
        '  <div class="step-topline">',
        '    <span class="trace-prompt">' + esc(L.name) + '</span>',
        '    <span class="aid-flag">' + need + ' nokta · ' + esc(L.dotSide) + '</span>',
        '  </div>',
        '  <div class="write-stage" id="write-stage">',
        '    <div class="canvas-frame"><canvas class="pad" aria-label="Nokta yerleştirme"></canvas></div>',
        '    <div class="side-tools">',
        '      <button type="button" class="tool-btn" data-act="say" title="Dinle">🔊</button>',
        '      <button type="button" class="tool-btn" data-act="undo" title="Geri al">↶</button>',
        '      <button type="button" class="tool-btn" data-act="clear" title="Temizle">🗑</button>',
        '    </div>',
        '  </div>',
        '  <p class="trace-help">💡 Gövde hazır. <b>' + need + '</b> noktayı doğru yere ' +
        'dokunarak koy (' + esc(L.dotSide) + ').</p>',
        '  <div id="score-host" class="score-host"></div>',
        '</div>'
      ].join(''),
      ctaHTML(t('✔ Kontrol Et'))
    );

    pad = AH.tracing.create($('canvas.pad'), {});
    pad.setForm(AH.letterforms.get(L.char, 'isolated'));
    pad.setWord(step.glyph);
    pad.setGhost(true);
    pad.setShowStart(false);
    /* Gövdeyi göster, NOKTALARI GİZLE — çocuk onları koyacak. */
    pad.setHideDots(true);

    $('[data-act="say"]').addEventListener('click', () => AH.speech.speak(L.char));
    $('[data-act="undo"]').addEventListener('click', () => pad.undo());
    $('[data-act="clear"]').addEventListener('click', () => {
      pad.clear();
      $('#score-host').innerHTML = '';
    });

    onCTA(() => {
      const strokes = pad.getStrokes();
      const ref = pad.refDots();
      const fs = pad.getLayout().fontSize;
      if (!strokes.length) { ui.toast('Noktaları koymak için tuvale dokun.', 'warn'); return; }

      /* her dokunuş bir nokta sayılır (merkezi) */
      const put = strokes.map((s) => {
        let x = 0, y = 0;
        s.forEach((p) => { x += p.x; y += p.y; });
        return { x: x / s.length, y: y / s.length };
      });

      const msgs = [];
      if (put.length !== need) {
        msgs.push(put.length + ' nokta koydun; ' + L.name + ' harfinde <b>' + need +
          '</b> nokta var.');
      }
      /* konum: her beklenen noktaya en yakın dokunuş ne kadar uzakta? */
      const tol = fs * 0.28;
      let placed = 0;
      const used = {};
      ref.forEach((d) => {
        let best = -1, bd = Infinity;
        put.forEach((p, i) => {
          if (used[i]) return;
          const dist = Math.hypot(p.x - d.x, p.y - d.y);
          if (dist < bd) { bd = dist; best = i; }
        });
        if (best >= 0 && bd <= tol) { used[best] = 1; placed++; }
      });
      if (ref.length && placed < ref.length) {
        msgs.push((ref.length - placed) + ' nokta yanlış yerde — ' +
          esc(L.dotSide) + ' olmalı.');
      }

      if (!msgs.length) {
        $('#score-host').innerHTML = '<p class="score-msg good">🎉 Hepsi yerinde!</p>';
        AH.confetti.fire($('[data-act="cta"]'), 100);
        /* doğru yerleri kısaca göster */
        pad.setHideDots(false);
        setTimeout(() => completeStep(100), 1100);
        return;
      }
      $('#score-host').innerHTML = '<p class="score-msg bad">' + msgs.join('<br>') + '</p>';
      view.attempts++;
      if (view.attempts >= 2) {
        pad.setShowDotTargets(true);
        $('#score-host').innerHTML += '<p class="score-msg">Yardım: doğru yerler ' +
          'turuncu halkalarla gösterildi.</p>';
      }
    });
  }

  /* ================================================================== */
  /* BAĞLAMA — iki harf, kalem kalkmadan                                 */
  /* ================================================================== */
  function renderJoinWrite(step) {
    const A = step.pair.a, B = step.pair.b;
    playerFrame(
      step,
      [
        '<div class="trace-step">',
        '  <div class="step-topline">',
        '    <span class="join-pieces" dir="rtl">' +
        '<b>' + esc(step.pieces[0]) + '</b><i>+</i><b>' + esc(step.pieces[1]) + '</b>' +
        '<i>=</i><b class="join-result">' + esc(step.target) + '</b></span>',
        '  </div>',
        '  <div class="write-stage" id="write-stage">',
        '    <div class="canvas-frame"><canvas class="pad" aria-label="Bağlama tuvali"></canvas></div>',
        '    <div class="side-tools">',
        '      <button type="button" class="tool-btn" data-act="say" title="Dinle">🔊</button>',
        '      <button type="button" class="tool-btn" data-act="demo" title="Nasıl yazılır?">▶</button>',
        '      <button type="button" class="tool-btn on" data-act="ghost" title="Hayalet">👻</button>',
        '      <button type="button" class="tool-btn" data-act="undo" title="Geri al">↶</button>',
        '      <button type="button" class="tool-btn" data-act="clear" title="Temizle">🗑</button>',
        '    </div>',
        '  </div>',
        '  <p class="trace-help">🔗 ' + esc(A.name) + ' başta, ' + esc(B.name) + ' sonda. ' +
        esc(step.help || '') + '</p>',
        '  <div id="score-host" class="score-host"></div>',
        '</div>'
      ].join(''),
      ctaHTML(t('✔ Kontrol Et'))
    );

    const rule = AH.letterforms.get(A.char, 'initial');
    pad = AH.tracing.create($('canvas.pad'), {});
    pad.setForm({
      isWord: true,
      startRule: rule ? rule.startRule : 'right',
      dots: { count: (A.dots || 0) + (B.dots || 0) }
    });
    pad.setWord(step.target);
    pad.setGhost(true);
    pad.setShowStart(true);

    $('[data-act="say"]').addEventListener('click', () =>
      AH.speech.speak(step.target.replace(/ـ/g, '')));
    $('[data-act="undo"]').addEventListener('click', () => pad.undo());
    $('[data-act="clear"]').addEventListener('click', () => {
      pad.clear();
      $('#score-host').innerHTML = '';
    });
    const gb = $('[data-act="ghost"]');
    gb.addEventListener('click', () => {
      const on = pad.toggleGhost();
      gb.classList.toggle('on', on);
    });
    const showHow = () => {
      if (pad.isDemoRunning()) return;
      const saved = pad.getStrokes().slice();
      pad.setStrokes([]);
      pad.playDemo({
        duration: demoDuration(),
        onDone() { pad.setShowStart(true); if (saved.length) pad.setStrokes(saved); }
      });
    };
    $('[data-act="demo"]').addEventListener('click', showHow);
    setTimeout(showHow, 300);

    onCTA(() => {
      const shape = pad.evaluate();
      if (shape.empty) { ui.toast('Önce tuvale yaz.', 'warn'); return; }
      const res = AH.strokecheck.check({
        strokes: pad.getStrokes(),
        refPath: pad.refPath(),
        refParts: pad.refParts().map((p) => p.path),
        refDots: pad.refDots(),
        shape,
        targetBox: pad.inkBox(),
        baselineY: pad.getLayout().baselineY,
        fontSize: pad.getLayout().fontSize,
        dotsInfo: { count: (A.dots || 0) + (B.dots || 0) }
      });

      /* Bağlamada asıl ölçüt: TEK hamlede mi yazıldı? */
      const bodyStrokes = pad.strokeCount() - (A.dots || 0) - (B.dots || 0);
      const joined = bodyStrokes <= 1;

      $('#score-host').innerHTML = writeScoreHTML(res) +
        (joined
          ? '<p class="score-msg good">🔗 Kalemi kaldırmadan bağladın!</p>'
          : '<p class="score-msg">🔗 İkisini <b>tek hamlede</b> bağlamayı dene — ' +
            'kalemi kaldırmadan.</p>');
      markWhereStudentStarted(res);
      S.logAttempt(step.id, res);

      if (res.pass) {
        AH.confetti.fire($('[data-act="cta"]'), 110);
        setTimeout(() => completeStep(res.score), 1000);
        return;
      }
      $('#score-host').innerHTML += fixHintHTML(res);
      wireFixHint();
      view.attempts++;
      if (view.attempts >= 3) showHow();
    });
  }

  /* ================================================================== */
  /* EKSİK HARFİ TAMAMLA                                                 */
  /*                                                                     */
  /* Kelimeden bir harf çıkarılır; hangi harf olduğu SÖYLENİR ve yalın   */
  /* hâli gösterilir. Çocuk onu, kelimedeki YERİNE GÖRE doğru biçimde    */
  /* yazmalıdır — asıl beceri budur: harf, kelimede şekil değiştirir.    */
  /* ================================================================== */
  function renderMissingLetter(step) {
    const L = step.letter;
    const ex = step.ex;
    const frags = ex.equation || [];
    const formLabel = D.FORM_LABELS[step.formKey] || step.formKey;

    /* kelimeyi parça parça göster; eksik parçanın yerine boşluk */
    const shown = frags.map((f, i) =>
      i === step.index
        ? '<span class="miss-gap" dir="rtl">؟</span>'
        : '<span class="miss-part" dir="rtl">' + esc(f) + '</span>'
    ).join('');

    playerFrame(
      step,
      [
        '<div class="trace-step">',
        '  <div class="miss-head">',
        '    <p class="step-kicker">Eksik harfi tamamla</p>',
        '    <div class="miss-word" dir="rtl">' + shown + '</div>',
        '    <p class="miss-tr">' + esc(ex.tr) + '</p>',
        '  </div>',
        '  <div class="miss-target">',
        '    <div class="miss-letter"><span dir="rtl">' + esc(L.char) + '</span>' +
        '<i>' + esc(L.name) + '</i></div>',
        '    <div class="miss-arrow">➜</div>',
        '    <div class="miss-form"><span dir="rtl">' + esc(step.missingGlyph) + '</span>' +
        '<i>' + esc(formLabel) + '</i></div>',
        '  </div>',
        '  <p class="trace-help">🧩 <b>' + esc(L.name) + '</b> harfini, kelimedeki yerine ' +
        'göre <b>' + esc(formLabel) + '</b> biçiminde yaz.</p>',
        '  <div class="write-stage" id="write-stage">',
        '    <div class="canvas-frame"><canvas class="pad" aria-label="Eksik harf tuvali"></canvas></div>',
        '    <div class="side-tools">',
        '      <button type="button" class="tool-btn" data-act="say" title="Kelimeyi dinle">🔊</button>',
        '      <button type="button" class="tool-btn" data-act="demo" title="Nasıl yazılır?">▶</button>',
        '      <button type="button" class="tool-btn" data-act="ghost" title="Hayalet">👻</button>',
        '      <button type="button" class="tool-btn" data-act="undo" title="Geri al">↶</button>',
        '      <button type="button" class="tool-btn" data-act="clear" title="Temizle">🗑</button>',
        '    </div>',
        '  </div>',
        '  <div id="score-host" class="score-host"></div>',
        '</div>'
      ].join(''),
      ctaHTML(t('✔ Kontrol Et'))
    );

    /* Tuvalde YALNIZ eksik biçim yazılır — kelimenin tamamı değil. */
    pad = AH.tracing.create($('canvas.pad'), {});
    pad.setForm(AH.letterforms.get(L.char, step.formKey));
    pad.setWord(step.missingGlyph);
    pad.setGhost(false);            /* ipucu kapalı başlar: önce kendi denesin */
    pad.setShowStart(true);

    $('[data-act="say"]').addEventListener('click', () => AH.speech.speak(ex.vowelled));
    $('[data-act="undo"]').addEventListener('click', () => pad.undo());
    $('[data-act="clear"]').addEventListener('click', () => {
      pad.clear();
      $('#score-host').innerHTML = '';
    });
    const gb = $('[data-act="ghost"]');
    gb.addEventListener('click', () => {
      const on = pad.toggleGhost();
      gb.classList.toggle('on', on);
    });
    $('[data-act="demo"]').addEventListener('click', () => {
      if (pad.isDemoRunning()) return;
      const saved = pad.getStrokes().slice();
      pad.setStrokes([]);
      pad.playDemo({
        duration: demoDuration(),
        onDone() { pad.setShowStart(true); if (saved.length) pad.setStrokes(saved); }
      });
    });

    onCTA(() => {
      const shape = pad.evaluate();
      if (shape.empty) { ui.toast('Önce eksik harfi yaz.', 'warn'); return; }
      const res = AH.strokecheck.check({
        strokes: pad.getStrokes(),
        refPath: pad.refPath(),
        refParts: pad.refParts().map((p) => p.path),
        refDots: pad.refDots(),
        shape,
        targetBox: pad.inkBox(),
        baselineY: pad.getLayout().baselineY,
        fontSize: pad.getLayout().fontSize,
        dotsInfo: { count: L.dots, side: L.dotSide }
      });

      $('#score-host').innerHTML = writeScoreHTML(res);
      markWhereStudentStarted(res);
      S.logAttempt(step.id, res);

      if (res.pass) {
        AH.confetti.fire($('[data-act="cta"]'), 110);
        $('#score-host').innerHTML +=
          '<p class="score-msg good">🎉 Doğru biçim! ' + esc(ex.result) + ' tamamlandı.</p>';
        setTimeout(() => completeStep(res.score), 1100);
        return;
      }
      $('#score-host').innerHTML +=
        '<p class="score-msg bad">%' + res.score + ' — ' +
        (res.problems[0] ? esc(res.problems[0].msg) : 'Tekrar dene.') + '</p>' +
        fixHintHTML(res);
      wireFixHint();
      view.attempts++;
      if (view.attempts >= 2 && !pad.isGhost()) {
        pad.setGhost(true);
        gb.classList.add('on');
        ui.toast('Yardım açıldı: harfin soluk hâli göründü.', 'info', 4000);
      }
    });
  }

  /* ---- YAZ / SINAV: kelime tuvali ---- */
  function renderTrace(step) {
    const isExam = !!step.exam;
    playerFrame(
      step,
      [
        '<div class="trace-step">',
        '  <div class="step-topline">',
        isExam
          ? '<span class="trace-prompt">' + esc(step.prompt || '') + '</span>'
          : '<span class="trace-glyph" dir="rtl">' + esc(step.target) + '</span>',
        isExam
          ? '<span class="exam-flag">👻 Hayalet kapalı</span>'
          : '<span class="aid-flag">Şimdi sen yaz</span>',
        '  </div>',
        '  <div class="write-stage" id="write-stage">',
        '    <div class="canvas-frame"><canvas class="pad" aria-label="Yazma tuvali"></canvas></div>',
        '    <div class="side-tools">',
        '      <button type="button" class="tool-btn" data-act="say" title="Dinle">🔊</button>',
        /* Kelimeyi de önce GÖSTER: harflerde İZLE adımı var, kelimede yoktu. */
        !isExam
          ? '<button type="button" class="tool-btn" data-act="demo" title="Nasıl yazılır? Göster">▶</button>'
          : '',
        step.ghost
          ? '<button type="button" class="tool-btn on" data-act="ghost" title="Hayaleti aç/kapat">👻</button>'
          : '',
        '      <button type="button" class="tool-btn" data-act="undo" title="Geri al">↶</button>',
        '      <button type="button" class="tool-btn" data-act="clear" title="Temizle">🗑</button>',
        '      <button type="button" class="tool-btn" data-act="expand" title="Büyüt / küçült">⛶</button>',
        '    </div>',
        '  </div>',
        step.help ? '<p class="trace-help">💡 ' + esc(step.help) + '</p>' : '',
        '  <div id="score-host" class="score-host"></div>',
        '</div>'
      ].join(''),
      ctaHTML(t('✔ Kontrol Et'))
    );

    pad = AH.tracing.create($('canvas.pad'), {});
    pad.setGhost(!!step.ghost);
    /* Kelimenin yazım referansı: hangi uçtan başlanır, kaç nokta var.
       İlk (en sağdaki) harfin biçimine göre başlangıç kuralı seçilir. */
    const wordForm = wordFormOf(step);
    pad.setForm(wordForm);
    pad.setWord(step.target);
    pad.setShowStart(!isExam);       /* sınavda ipucu yok */

    $('[data-act="say"]').addEventListener('click', () =>
      AH.speech.speak(step.ex ? step.ex.vowelled : step.target.replace(/ـ/g, ''))
    );
    $('[data-act="undo"]').addEventListener('click', () => pad.undo());
    $('[data-act="clear"]').addEventListener('click', () => {
      pad.clear();
      $('#score-host').innerHTML = '';
    });
    wireExpand();
    const gb = $('[data-act="ghost"]');
    if (gb) {
      gb.addEventListener('click', () => {
        const on = pad.toggleGhost();
        gb.classList.toggle('on', on);
        gb.title = on ? 'Hayalet açık' : 'Hayalet kapalı';
      });
    }

    /* Kelime yazımını ÖNCE göster — çocuk boş tuvale bakakalmasın.
       Sınavda gösterilmez. Öğrencinin çizdiği varsa gösteri onu silmez. */
    const demoBtn = $('[data-act="demo"]');
    if (demoBtn) {
      const showHow = () => {
        if (pad.isDemoRunning()) return;
        const saved = pad.getStrokes().slice();
        pad.setStrokes([]);
        pad.playDemo({
          duration: demoDuration(),
          onDone() {
            pad.setShowStart(true);
            if (saved.length) pad.setStrokes(saved);
          }
        });
      };
      demoBtn.addEventListener('click', showHow);
      setTimeout(showHow, 300);        /* adım açılır açılmaz bir kez */
    }

    onCTA(() => {
      const shape = pad.evaluate();
      if (shape.empty) {
        ui.toast('Önce tuvale yaz, sonra kontrol et.', 'warn');
        return;
      }
      /* Kelimede de yazım denetimi: nereden başladı, hangi yöne gitti,
         noktalar yerinde mi? (Öğrenci soldan ya da son harften başlayabilir.) */
      const res = AH.strokecheck.check({
        strokes: pad.getStrokes(),
        refPath: pad.refPath(),
        refParts: pad.refParts().map((p) => p.path),
        refDots: pad.refDots(),
        shape,
        targetBox: pad.inkBox(),
        baselineY: pad.getLayout().baselineY,
        fontSize: pad.getLayout().fontSize,
        dotsInfo: wordForm.dots
      });

      $('#score-host').innerHTML = writeScoreHTML(res);
      markWhereStudentStarted(res);
      S.logAttempt(step.id, res);     /* öğretmen raporu için kayıt */

      if (res.pass) {
        AH.confetti.fire($('[data-act="cta"]'), 110);
        $('#score-host').innerHTML +=
          '<p class="score-msg good">🎉 Çok güzel! Doğru yerden başladın. (%' + res.score + ')</p>';
        if (isExam) recordExam(step.id, true);
        setTimeout(() => completeStep(res.score), 1000);
        return;
      }

      view.attempts++;
      const list = res.problems.slice(0, 2).map((p) => '<li>' + esc(p.msg) + '</li>').join('');
      const detail =
        '<p class="score-msg bad">%' + res.score + ' — geçmek için %' + AH.strokecheck.PASS + ' gerekiyor.</p>' +
        (list ? '<ul class="problem-list">' + list + '</ul>' : '') +
        (res.trace && !res.trace.startOK
          ? '<p class="mark-hint">Tuvalde <b>kırmızı</b> halka senin başladığın yeri, ' +
            '<b>yeşil</b> halka başlaman gereken yeri gösteriyor.</p>'
          : '');

      if (isExam) {
        if (view.attempts >= 2) {
          $('#score-host').innerHTML += detail +
            '<p class="score-msg bad">Bu soruda olmadı. Sınav devam ediyor.</p>';
          recordExam(step.id, false);
          const cta = $('[data-act="cta"]');
          cta.textContent = 'Devam ➜';
          cta.replaceWith(cta.cloneNode(true));   /* eski dinleyiciyi at */
          onCTA(() => completeStep(res.score));
        } else {
          $('#score-host').innerHTML += detail + '<p class="score-msg bad">1 hakkın kaldı.</p>';
        }
        return;
      }

      $('#score-host').innerHTML += detail + fixHintHTML(res) +
        (view.attempts >= 2
          ? '<button type="button" class="btn btn-ghost btn-sm" data-act="skip">Şimdilik geç ➜</button>'
          : '');
      wireFixHint();
      const sk = $('[data-act="skip"]');
      if (sk) sk.addEventListener('click', () => completeStep(res.score));
    });
  }

  /**
   * Kelimenin yazım referansını kurar.
   * Arapça sağdan sola yazıldığı için kalem EN SAĞDAKİ harften başlar;
   * o harfin biçimi (yalın/başta) başlangıç ucunu belirler.
   */
  function wordFormOf(step) {
    const word = step.target || '';
    let startRule = 'right';
    let firstTip = '';
    const eq = step.ex && step.ex.equation;
    if (eq && eq.length) {
      const info = AH.letterforms.parseFragment(eq[0]);   /* en sağdaki parça */
      const f = AH.letterforms.get(info.char, info.formKey);
      if (f) { startRule = f.startRule; firstTip = f.startTip; }
    }
    return {
      isWord: true,
      startRule,
      firstTip,
      dots: { count: D.dotsInWord(word), side: null }
    };
  }

  /* ---- KONTROL / SINAV: çoktan seçmeli ---- */
  function renderQuiz(step) {
    const isExam = !!step.exam;
    const noVoice = step.listen && !AH.speech.hasArabicVoice();

    playerFrame(
      step,
      [
        '<div class="quiz">',
        '  <p class="step-kicker">' + (isExam ? 'Sınav sorusu' : 'Kontrol') + '</p>',
        '  <h2 class="quiz-q">' + step.question + '</h2>',
        step.listen
          ? '<button type="button" class="btn btn-sound btn-xl listen" data-act="listen">🔊 Sesi dinle</button>' +
            (noVoice ? '<p class="quiz-fallback">Cihazında Arapça ses yok — ipucu: <b>' + esc(step.hint) + '</b></p>' : '')
          : '',
        '  <div class="options ' + (step.display === 'glyph' ? 'glyphs' : 'texts') + '">',
        step.options.map((op, i) =>
          '<button type="button" class="option" data-i="' + i + '"' +
          (step.display === 'glyph' ? ' dir="rtl"' : '') + '>' +
          '<span>' + esc(op.text) + '</span></button>'
        ).join(''),
        '  </div>',
        '  <div id="quiz-msg" class="quiz-msg"></div>',
        '</div>'
      ].join(''),
      ''
    );

    if (step.listen) {
      const play = () => AH.speech.speak(step.listen);
      $('[data-act="listen"]').addEventListener('click', play);
      setTimeout(play, 400);
    }

    let answered = false;
    let wrongCount = 0;

    $$('.option').forEach((b) =>
      b.addEventListener('click', () => {
        if (answered) return;
        const op = step.options[Number(b.dataset.i)];

        if (op.correct) {
          answered = true;
          b.classList.add('right');
          $$('.option').forEach((x) => (x.disabled = true));
          $('#quiz-msg').innerHTML = '<span class="good">✓ Doğru!</span>';
          AH.confetti.fire(b, 50);
          if (isExam) recordExam(step.id, wrongCount === 0);
          setTimeout(() => completeStep(wrongCount === 0 ? 100 : 70), 850);
          return;
        }

        b.classList.add('wrong');
        b.disabled = true;
        wrongCount++;

        if (isExam) {
          answered = true;
          $$('.option').forEach((x, i) => {
            x.disabled = true;
            if (step.options[i].correct) x.classList.add('right');
          });
          $('#quiz-msg').innerHTML = '<span class="bad">Doğrusu yukarıda işaretli.</span>';
          recordExam(step.id, false);
          $('#step-foot').innerHTML = ctaHTML(t('Devam ➜'));
          onCTA(() => completeStep(0));
        } else {
          $('#quiz-msg').innerHTML = '<span class="bad">Olmadı, tekrar dene.</span>';
        }
      })
    );
  }

  /* ---- SINAV çerçevesi ---- */
  function recordExam(stepId, ok) {
    if (!view.examRun) view.examRun = { items: [] };
    if (!view.examRun.items.some((x) => x.id === stepId)) {
      view.examRun.items.push({ id: stepId, ok: !!ok });
    }
  }

  function renderExamIntro(step) {
    const stage = step.stage;
    /* Sınav tek oturumda verilir; sayaç her girişte sıfırlanır. */
    view.examRun = { items: [] };

    const items = view.unit.steps.filter((s) => s.exam).length;
    playerFrame(
      step,
      [
        '<div class="teach exam-intro">',
        '  <div class="exam-seal">🎓</div>',
        '  <h2 class="teach-name">' + esc(stage.title) + ' Sınavı</h2>',
        '  <p class="teach-sound">Öğrendiklerini ölçelim. Hazırsan başlayalım.</p>',
        '  <ul class="exam-rules">',
        '    <li><b>' + items + ' soru</b> var: tanıma, anlam ve yazma.</li>',
        '    <li>Yazma sorularında <b>hayalet kapalı</b> — kelimeyi kendin yazacaksın.</li>',
        '    <li>Her soruda <b>2 hakkın</b> var, ipucu yok.</li>',
        '    <li>Geçme notu <b>%' + S.PASS + '</b>. Geçemezsen tekrar deneyebilirsin.</li>',
        '  </ul>',
        '</div>'
      ].join(''),
      ctaHTML('Sınavı Başlat ➜')
    );
    onCTA(() => completeStep(100));
  }

  function renderExamResult(step) {
    const run = view.examRun || { items: [] };
    const total = run.items.length || 1;
    const right = run.items.filter((x) => x.ok).length;
    const score = Math.round((right / total) * 100);
    const passed = score >= S.PASS;

    if (passed) S.setExamScore(step.stage.stageId, score);

    const nextStage = C.COURSE.find((s) => s.stageId === step.stage.stageId + 1);

    playerFrame(
      step,
      [
        '<div class="teach exam-result ' + (passed ? 'pass' : 'fail') + '">',
        '  <div class="exam-seal">' + (passed ? '🏅' : '💪') + '</div>',
        '  <h2 class="teach-name">' + (passed ? 'Tebrikler, geçtin!' : 'Az kaldı!') + '</h2>',
        '  <div class="exam-score">%' + score + '</div>',
        '  <p class="teach-sound">' + right + ' / ' + total + ' doğru · geçme notu %' + S.PASS + '</p>',
        passed
          ? '<p class="exam-note">' +
            (nextStage
              ? '<b>' + esc(nextStage.title) + '</b> kilidi açıldı: ' +
                '<span dir="rtl">' + esc(nextStage.lettersLabel) + '</span>'
              : 'Müfredatın sonuna geldin. Harikasın!') +
            '</p>'
          : '<p class="exam-note">Endişelenme — dersleri tekrar edip sınava yeniden girebilirsin.</p>',
        '</div>'
      ].join(''),
      ctaHTML(passed ? 'Devam ➜' : 'Tekrar dene ➜')
    );

    if (passed) AH.confetti.fire($('.exam-seal'), 200);

    onCTA(() => {
      if (passed) {
        S.markStep(step.id, score);
        renderStageComplete(step.stage, nextStage);
      } else {
        S.resetUnit(view.unit);      /* sınavı baştan alsın */
        view.examRun = null;
        exitToMap();
      }
    });
  }

  /* ---- ÜNİTE / AŞAMA bitiş ekranları ---- */
  /** Müfredat sırasına göre bu üniteden HEMEN sonraki ünite (aşama değişse de). */
  function nextInOrder(unit) {
    const all = C.allUnits();
    const i = all.findIndex((u) => u.id === unit.id);
    return (i >= 0 && i < all.length - 1) ? all[i + 1] : null;
  }

  function renderUnitComplete() {
    const unit = view.unit;
    const next = nextInOrder(unit);
    const newStage = next && next.stageId !== unit.stageId;
    const stage = next ? C.getStage(next.stageId) : null;

    $('#app').innerHTML = [
      '<div class="player">',
      '  <main class="step-body">',
      '    <div class="teach done-screen">',
      '      <div class="done-seal">✓</div>',
      '      <h2 class="teach-name">' + t('Ders tamamlandı!') + '</h2>',
      '      <p class="teach-sound">' + esc(unit.title) + '</p>',
      next
        ? '      <p class="next-up">' + t('Sırada') + ': <b>' + esc(next.title) + '</b>' +
          (newStage && stage ? ' <i>(' + esc(stage.title) + ')</i>' : '') + '</p>' +
          '      <p class="next-count" id="auto-count"></p>'
        : '      <p class="next-up">' + t('Tüm dersleri bitirdin. 🎉') + '</p>',
      '    </div>',
      '  </main>',
      '  <footer class="step-foot">',
      next
        ? '<button type="button" class="btn btn-primary btn-xl" data-act="next-unit">' +
          t('Sıradaki ders ➜') + '</button>'
        : '',
      '    <button type="button" class="btn btn-ghost btn-lg" data-act="to-map">' +
      t('Derslere dön') + '</button>',
      '  </footer>',
      '</div>'
    ].join('');

    AH.confetti.fire($('.done-seal'), 120);

    const nu = $('[data-act="next-unit"]');
    if (nu) nu.addEventListener('click', () => openUnit(next));
    $('[data-act="to-map"]').addEventListener('click', exitToMap);

    /* Sıradaki derse kendiliğinden geç — çocuk düğme aramak zorunda kalmasın.
       "Derslere dön"e basılırsa ya da ekrandan çıkılırsa sayaç iptal olur. */
    cancelAutoNext();
    if (!next) return;
    const cnt = $('#auto-count');
    let left = AUTO_NEXT_SECONDS;
    const paint = () => {
      if (cnt) cnt.textContent = left + ' ' + t('saniye sonra başlıyor…');
    };
    paint();
    autoNext = {
      left,
      timer: setInterval(() => {
        left--;
        if (left > 0) { paint(); return; }
        cancelAutoNext();
        /* ekran değişmiş olabilir — hâlâ bitiş ekranındaysak geç */
        if ($('#auto-count')) openUnit(next);
      }, 1000)
    };
  }

  function renderStageComplete(stage, nextStage) {
    $('#app').innerHTML = [
      '<div class="player">',
      '  <main class="step-body">',
      '    <div class="teach done-screen stage-done">',
      '      <div class="done-seal gold">🏆</div>',
      '      <h2 class="teach-name">' + esc(stage.title) + ' bitti!</h2>',
      '      <p class="teach-sound">' + esc(stage.lettersLabel) + ' harflerini artık yazabiliyorsun.</p>',
      nextStage
        ? '<p class="exam-note">Sırada: <b>' + esc(nextStage.title) + '</b> — <span dir="rtl">' +
          esc(nextStage.lettersLabel) + '</span></p>'
        : '<p class="exam-note">Tüm müfredatı tamamladın. 🎉</p>',
      '    </div>',
      '  </main>',
      '  <footer class="step-foot">',
      '    <button type="button" class="btn btn-primary btn-xl" data-act="to-map">Devam ➜</button>',
      '  </footer>',
      '</div>'
    ].join('');
    AH.confetti.fire($('.done-seal'), 220);
    $('[data-act="to-map"]').addEventListener('click', exitToMap);
  }

  /* ------------------------------------------------------------------ */
  /* Başlangıç                                                           */
  /* ------------------------------------------------------------------ */
  function init() {
    /* Arayüz dili (Türkçe / Arapça) — ders içeriği Türkçe kalır */
    if (AH.i18n) {
      AH.i18n.applyDocument();
      const lb = $('#lang-btn');
      if (lb) lb.addEventListener('click', () => {
        AH.i18n.toggle();
        /* Açık olan ekranı yeni dille yeniden çiz */
        if (view.screen === 'unit' && view.unit) renderStep();
        else if (view.screen === 'alphabet') renderAlphabet();
        else exitToMap();
        ui.toast(AH.i18n.isAr() ? 'واجهة عربية — محتوى الدرس يبقى بالتركية'
                                : 'Arayüz Türkçe.', 'info');
      });
    }

    /* Yönetici modu (öğretmen) */
    const ab = $('#admin-btn');
    /* Yönetici araçları istek üzerine yüklenir — öğrenci 100 KB'lık paneli
       ve proje-dosyası modülünü boş yere indirmesin. */
    if (ab) ab.addEventListener('click', () => {
      if (AH.admin) { AH.admin.requestAccess(); return; }
      ab.disabled = true;
      ab.textContent = '…';
      AH.overrides.loadTeacherTools()
        .then(() => { ab.disabled = false; ab.textContent = '🔧'; AH.admin.requestAccess(); })
        .catch((e) => {
          ab.disabled = false; ab.textContent = '🔧';
          alert('Yönetici araçları yüklenemedi: ' + e.message);
        });
    });

    $('#reset-btn').addEventListener('click', () => {
      if (confirm('Tüm ilerleme silinecek. Emin misin?')) {
        S.reset();
        exitToMap();
        ui.toast('İlerleme sıfırlandı. Baştan başlıyoruz.', 'info');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && pad) {
        e.preventDefault();
        pad.undo();
      }
      if (e.key === 'Escape' && view.screen === 'unit') exitToMap();
    });

    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (pad) pad.resize(); }, 120);
    });

    /* Başlık çubuğu: aşağı kaydırınca gizlen, yukarı kaydırınca geri gel.
       Küçük ekranda yazı alanına yer açar. */
    const header = document.querySelector('.app-header');
    if (header) {
      let lastY = 0;
      /* Sadece sınıf değiştirdiği için requestAnimationFrame'e gerek yok;
         rAF arka planda kısıtlandığında çalışmama riskini de ortadan kaldırır. */
      window.addEventListener('scroll', () => {
        const y = window.scrollY || 0;
        if (y > 70 && y > lastY + 4) header.classList.add('hide');
        else if (y < lastY - 4 || y <= 70) header.classList.remove('hide');
        lastY = y;
      }, { passive: true });
    }

    renderMap();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

/* =========================================================================
   studio.js — ÖĞRETME ATÖLYESİ (studio.html)

   Akış:
     1) Hangi harf / hangi biçim?
     2) Öğretmen harfi KENDİ ELİYLE yazar (nokta koymak için tek dokunuş)
     3) "Kaydet ve öğren" → learn.js üslup imzasını çıkarır
        · yazdığı harf ANINDA uygulanır (zaten kendi çizimi)
        · diğer hedefler için ÖNERİ üretilir
     4) Öğretmen önizlemeye bakar, istediklerini işaretler, "Uygula" der

   Hiçbir şey sessizce değişmez. Tüm kayıtlar admin deposuna yazılır;
   böylece "💾 Kalıcı Kayıt" ile custom-paths.js'e gömülüp her tarayıcıda
   kalıcı olur.
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const t = (s) => (AH.i18n ? AH.i18n.t(s) : s);
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  const FORMS = [
    ['isolated', 'Yalın'], ['initial', 'Başta'], ['medial', 'Ortada'], ['final', 'Sonda']
  ];

  const state = {
    tab: 'teach',       /* 'teach' = öğret · 'board' = durum panosu */
    mode: 'letter',     /* 'letter' = harf biçimi · 'word' = kelime */
    word: null,         /* kelime kipinde seçili kelimenin şekli */
    char: 'ب',
    formKey: 'isolated',
    brush: 0.08,
    pad: null,          /* öğretmenin yazdığı büyük tuval */
    scratch: null,      /* önerileri hesaplamak için gizli tuval */
    sig: null,          /* son çıkarılan üslup imzası */
    props: [],          /* [{target, rec, on}] */
    wordProps: [],
    busy: false
  };

  /* ------------------------------------------------------------------ */
  /* Kelime listesi (müfredattaki 94 kelime) — şekil → alıştırma eşlemesi */
  /* ------------------------------------------------------------------ */
  let WORDS = null;
  function words() {
    if (WORDS) return WORDS;
    WORDS = [];
    const seen = {};
    AH.data.STAGES.forEach((st) => {
      (AH.data.allExercises ? AH.data.allExercises(st) : []).forEach((ex) => {
        const g = ex.result;
        if (!g || seen[g]) return;
        seen[g] = 1;
        WORDS.push({ glyph: g, tr: ex.tr || '', stage: st.stageId, ex });
      });
    });
    return WORDS;
  }
  function wordOf(g) { return words().filter((w) => w.glyph === g)[0] || null; }

  function isWordMode() { return state.mode === 'word'; }

  function glyph() {
    return isWordMode()
      ? (state.word || (words()[0] && words()[0].glyph) || '')
      : AH.learn.glyphOf(state.char, state.formKey);
  }

  /** Seçili hedefin tracing biçim kaydı. */
  function currentForm() {
    if (isWordMode()) {
      const w = wordOf(glyph());
      return AH.learn.wordRule(w ? w.ex : null, glyph());
    }
    return AH.letterforms.get(state.char, state.formKey);
  }

  /** Ekranda gösterilecek ad. */
  function currentLabel() {
    if (isWordMode()) {
      const w = wordOf(glyph());
      return glyph() + (w && w.tr ? ' — ' + w.tr : '');
    }
    const f = FORMS.filter((x) => x[0] === state.formKey)[0];
    return state.char + ' — ' + t(f ? f[1] : state.formKey);
  }

  /** Hedefin ekrandaki adı — biçim adı arayüz diline çevrilir. */
  function labelOf(target) {
    if (target.kind === 'word') return target.label;
    const f = FORMS.filter((x) => x[0] === target.formKey)[0];
    return target.char + ' — ' + t(f ? f[1] : target.formKey);
  }

  function toast(msg, kind) {
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
    }, 3200);
  }

  /* ------------------------------------------------------------------ */
  /* Kabuk                                                               */
  /* ------------------------------------------------------------------ */
  function render() {
    $('#studio').innerHTML = [
      '<nav class="st-tabs">',
      '  <button type="button" class="st-tab' + (state.tab === 'teach' ? ' on' : '') +
      '" data-tab="teach">✍️ ' + t('Öğret') + '</button>',
      '  <button type="button" class="st-tab' + (state.tab === 'board' ? ' on' : '') +
      '" data-tab="board">📊 ' + t('Durum Panosu') + '</button>',
      '</nav>',
      '<div id="st-file" class="st-file"></div>',
      '<div id="st-main"></div>'
    ].join('');

    $$('.st-tab').forEach((b) => b.addEventListener('click', () => {
      state.tab = b.dataset.tab;
      render();
    }));

    renderFileStrip();
    if (state.tab === 'board') renderBoard();
    else renderTeach();
  }

  /* ------------------------------------------------------------------ */
  /* Proje dosyası şeridi — "doğrudan dosyaya yaz"                       */
  /* ------------------------------------------------------------------ */
  function renderFileStrip() {
    const host = $('#st-file');
    if (!host) return;
    const PF = AH.projectFile;
    const st = PF ? PF.status() : 'unsupported';

    const box = {
      unsupported: ['warn', '📄 ' + t('Bu tarayıcı doğrudan dosyaya yazmayı desteklemiyor.') +
        ' ' + t('Kayıtlar tarayıcıda tutulur; kalıcı yapmak için dosyayı indirip kopyalaman gerekir.') +
        ' <b>' + t('Chrome veya Edge') + '</b> ' + t('ile doğrudan yazabilirsin.'), ''],
      none: ['warn', '📄 ' + t('Değişiklikler şu an yalnızca tarayıcıda. Proje klasörünü bağlarsan ' +
        'her kayıt doğrudan js/custom-paths.js dosyasına yazılır.'),
        '<button type="button" class="btn btn-primary btn-sm" data-act="link">🔗 ' +
        t('Proje klasörünü bağla') + '</button>'],
      prompt: ['warn', '📄 ' + t('Proje klasörü hatırlanıyor ama tarayıcı izni yeniden istiyor.'),
        '<button type="button" class="btn btn-primary btn-sm" data-act="reauth">🔓 ' +
        t('İzni yenile') + '</button>'],
      linked: ['ok', '📁 ' + t('Bağlı klasör') + ': <b>' + esc(PF.folderName() || '') + '</b> — ' +
        t('kayıtlar doğrudan dosyaya yazılıyor.'),
        '<button type="button" class="btn btn-ghost btn-sm" data-act="writenow">💾 ' +
        t('Şimdi yaz') + '</button> ' +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="unlink">' +
        t('Bağlantıyı kaldır') + '</button>']
    }[st];

    host.className = 'st-file ' + box[0];
    host.innerHTML = '<span>' + box[1] + '</span><span class="st-file-act">' + box[2] +
      '</span><i id="st-file-msg"></i>';

    const on = (act, fn) => {
      const b = $('[data-act="' + act + '"]', host);
      if (b) b.addEventListener('click', fn);
    };
    on('link', () => PF.link()
      .then((name) => { toast('🔗 ' + t('Bağlandı') + ': ' + name, 'good'); renderFileStrip(); })
      .catch((e) => alert(e.message)));
    on('reauth', () => PF.reauthorize()
      .then(() => { toast('🔓 ' + t('İzin yenilendi.'), 'good'); renderFileStrip(); })
      .catch((e) => alert(e.message)));
    on('unlink', () => PF.unlink().then(() => renderFileStrip()));
    on('writenow', () => writeToProject(true));
  }

  /** Kalıcı dosyaları diske yaz (klasör bağlıysa). */
  function writeToProject(loud) {
    const PF = AH.projectFile;
    if (!PF || PF.status() !== 'linked') {
      if (loud) alert(t('Önce proje klasörünü bağla.'));
      return Promise.resolve(false);
    }
    const msg = $('#st-file-msg');
    if (msg) msg.textContent = t('yazılıyor') + '…';
    return PF.writeCore().then((files) => {
      if (msg) msg.textContent = '✅ ' + files.join(' · ');
      if (loud) toast('✅ ' + t('Dosyaya yazıldı') + ': ' + files.join(', '), 'good');
      return true;
    }).catch((e) => {
      if (msg) msg.textContent = '';
      alert(t('Dosyaya yazılamadı') + ': ' + e.message);
      renderFileStrip();
      return false;
    });
  }

  function renderTeach() {
    const learned = isWordMode()
      ? AH.learn.getWord(glyph())
      : AH.learn.get(state.char, state.formKey);
    const total = AH.learn.count();
    const cur = statusOf(glyph());

    $('#st-main').innerHTML = [
      '<section class="st-panel">',
      '  <h2 class="st-step"><i>1</i>' + t('Neyi öğreteceksin?') + '</h2>',
      '  <div class="st-mode">',
      '    <button type="button" class="st-modebtn' + (isWordMode() ? '' : ' on') +
      '" data-mode="letter">' + t('Harf biçimi') + '</button>',
      '    <button type="button" class="st-modebtn' + (isWordMode() ? ' on' : '') +
      '" data-mode="word">' + t('Kelime') + '</button>',
      '  </div>',

      isWordMode()
        ? '  <label class="admin-select st-wordpick">' + t('Kelime seç') +
          '    <select id="st-word">' +
          words().map((w) => '<option value="' + esc(w.glyph) + '"' +
            (w.glyph === glyph() ? ' selected' : '') + '>' +
            esc(w.glyph) + ' — ' + esc(w.tr) + ' (' + w.stage + '. aşama)</option>').join('') +
          '    </select></label>' +
          '  <div class="st-wnav">' +
          '<button type="button" class="mini" data-act="wprev">◀ ' + t('Önceki') + '</button>' +
          '<button type="button" class="mini" data-act="wnext">' + t('Sonraki') + ' ▶</button>' +
          '</div>'
        : '  <div class="alpha-strip">' +
          AH.data.ALPHABET.map((L) =>
            '<button type="button" class="alpha-chip' + (L.char === state.char ? ' on' : '') +
            '" data-char="' + esc(L.char) + '" title="' + esc(L.name) + '">' +
            '<span dir="rtl">' + esc(L.char) + '</span></button>').join('') +
          '  </div>' +
          '  <div class="form-tabs st-forms">' +
          FORMS.map(([k, label]) =>
            '<button type="button" class="form-tab' + (k === state.formKey ? ' on' : '') +
            '" data-form="' + k + '"><span dir="rtl">' +
            esc(AH.learn.glyphOf(state.char, k)) + '</span><i>' + t(label) + '</i></button>').join('') +
          '  </div>',

      '  <p class="st-cur">' + KIND[cur.kind].icon + ' <b>' + esc(currentLabel()) + '</b> — ' +
      t(KIND[cur.kind].label) +
      (cur.rec && cur.rec.learned && cur.rec.learned.from && cur.rec.learned.mode !== 'self'
        ? ' (' + t('kaynak') + ': ' + esc(cur.rec.learned.from) + ')' : '') +
      '</p>',
      learned
        ? '  <p class="st-learned">✅ ' + t('Bunu daha önce öğrettin.') +
          ' <button type="button" class="mini danger" data-act="forget">' +
          t('Öğrendiğimi unut') + '</button></p>'
        : '',
      '</section>',

      '<section class="st-panel">',
      '  <h2 class="st-step"><i>2</i>' + t('Kendi elinle yaz') + '</h2>',
      '  <p class="st-hint">' +
      t('Soluk harfin üzerinden doğal biçimde yaz. Kalemi her kaldırışın yeni bir hamledir. ' +
        'Noktaları koymak için tek dokunuş yeter — en sona bırak.') + '</p>',
      /* class="pad" ŞART: tuvalin CSS ölçüsü oradan gelir; olmazsa
         işaretçi koordinatları ile çizim ölçüsü birbirini tutmaz. */
      '  <div class="canvas-frame st-frame"><canvas id="st-pad" class="pad" aria-label="' +
      t('Yazma alanı') + '"></canvas></div>',
      '  <div class="st-tools">',
      '    <button type="button" class="btn btn-ghost" data-act="undo">↶ ' + t('Geri Al') + '</button>',
      '    <button type="button" class="btn btn-ghost" data-act="clear">🗑 ' + t('Temizle') + '</button>',
      '    <button type="button" class="btn btn-ghost" data-act="ghost">👁 ' + t('Soluk harf') + '</button>',
      '    <button type="button" class="btn btn-ghost" data-act="preview">▶ ' + t('Önizle') + '</button>',
      /* Atölye temel, çizim yolu tamamlayıcıdır: aynı şekli düğüm düğüm düzelt */
      '    <button type="button" class="btn btn-ghost" data-act="fine">✒️ ' +
      t('İnce ayar (Çizim Yolu)') + '</button>',
      '    <label class="st-slider">' + t('Kalem kalınlığı') +
      '      <input type="range" id="st-brush" min="3" max="18" step="1" value="' +
      Math.round(state.brush * 100) + '">',
      '      <b id="st-brush-v">' + Math.round(state.brush * 100) + '</b>',
      '    </label>',
      '  </div>',
      '  <div id="st-stray" class="st-stray"></div>',
      '  <div class="st-foot">',
      '    <button type="button" class="btn btn-primary btn-xl" data-act="save">💾 ' +
      t('Kaydet ve öğren') + '</button>',
      '    <button type="button" class="btn btn-ghost" data-act="sample">➕ ' +
      t('Bunu deneme olarak ekle') + '</button>',
      '    <span class="st-count">' + t('Öğretilen biçim') + ': <b>' + total + '</b></span>',
      '  </div>',
      '  <div id="st-samples" class="st-samples"></div>',
      '</section>',

      '<section class="st-panel" id="st-apply" hidden></section>'
    ].join('');

    wire();
    mountPad();
  }

  function wire() {
    $$('.st-modebtn').forEach((b) => b.addEventListener('click', () => {
      state.mode = b.dataset.mode;
      if (isWordMode() && !state.word) state.word = words()[0].glyph;
      resetProposals();
      renderTeach();
    }));
    $$('.alpha-chip').forEach((b) => b.addEventListener('click', () => {
      state.char = b.dataset.char;
      resetProposals();
      renderTeach();
    }));
    $$('.form-tab').forEach((b) => b.addEventListener('click', () => {
      state.formKey = b.dataset.form;
      resetProposals();
      renderTeach();
    }));

    const wsel = $('#st-word');
    if (wsel) {
      wsel.addEventListener('change', () => {
        state.word = wsel.value;
        resetProposals();
        renderTeach();
      });
      const jump = (d) => {
        const list = words();
        const i = list.findIndex((w) => w.glyph === glyph());
        const n = (i + d + list.length) % list.length;
        state.word = list[n].glyph;
        resetProposals();
        renderTeach();
      };
      $('[data-act="wprev"]').addEventListener('click', () => jump(-1));
      $('[data-act="wnext"]').addEventListener('click', () => jump(1));
    }

    /* İnce ayar: Çizim Yolu düzenleyicisini bu şekil için aç.
       Kapanınca atölye tazelenir ki yeni yol hemen görünsün. */
    $('[data-act="fine"]').addEventListener('click', () => {
      const g = glyph();
      const ok = AH.admin.openPathEditor(g, () => { renderTeach(); renderFileStrip(); });
      if (!ok) alert(t('Bu şekil için çizim yolu düzenleyicisi açılamadı.') + ' (' + g + ')');
    });
    $('[data-act="undo"]').addEventListener('click', () => state.pad.undo());
    $('[data-act="clear"]').addEventListener('click', () => state.pad.clear());
    $('[data-act="ghost"]').addEventListener('click', () => state.pad.toggleGhost());
    $('[data-act="preview"]').addEventListener('click', preview);
    $('[data-act="save"]').addEventListener('click', save);
    $('[data-act="sample"]').addEventListener('click', addSample);
    renderSamples();

    const f = $('[data-act="forget"]');
    if (f) f.addEventListener('click', () => {
      if (!confirm(t('Bu biçim için öğrendiklerim silinsin mi? (Uygulanmış yollar kalır)'))) return;
      if (isWordMode()) AH.learn.forgetWord(glyph());
      else AH.learn.forget(state.char, state.formKey);
      renderTeach();
    });

    const br = $('#st-brush');
    br.addEventListener('input', () => {
      state.brush = Number(br.value) / 100;
      $('#st-brush-v').textContent = br.value;
    });
  }

  function mountPad() {
    if (state.pad) { state.pad.destroy(); state.pad = null; }
    const cv = $('#st-pad');
    if (!cv) return;
    const pad = AH.tracing.create(cv, { penColor: '#1d4ed8', penWidth: 10 });
    pad.setForm(currentForm());
    pad.setWord(glyph());
    pad.setGhost(true);
    pad.setLocked(false);
    pad.setShowStart(false);
    state.pad = pad;

    /* Yerleşim ve yazı tipi oturduktan sonra ölçüyü tazele — yoksa harfin
       mürekkep kutusu yanlış çıkar ve öğrenilen oranlar kayar. */
    requestAnimationFrame(() => { if (state.pad === pad) pad.resize(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (state.pad === pad) pad.resize(); });
    }
  }

  function resetProposals() {
    (state.props || []).forEach((p) => { if (p.pad) p.pad.destroy(); });
    state.props = [];
    state.wordProps = [];
    state.lessons = [];
    state.sig = null;
    const ap = $('#st-apply');
    if (ap) { ap.hidden = true; ap.innerHTML = ''; }
  }

  /** Öğrencinin göreceği animasyonu, kaydetmeden önce göster. */
  function preview() {
    const pad = state.pad;
    const raw = pad.getStrokes();
    if (!raw.length) { toast(t('Önce harfi yaz.'), 'warn'); return; }
    const sig = AH.learn.capture(pad, raw, {
      char: state.char, formKey: state.formKey, glyph: glyph(), brush: state.brush
    });
    if (!sig) { toast(t('Yazı okunamadı — biraz daha uzun çiz.'), 'warn'); return; }
    const rec = AH.learn.selfRecord(sig, pad);
    const backup = AH.admin.getPath(glyph());
    AH.admin.setPath(glyph(), rec);
    pad.invalidate();

    /* Yazdıkların SİLİNMEZ: gösteri boyunca gizlenir, sonunda geri gelir. */
    const saved = pad.getStrokes().slice();
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      if (backup) AH.admin.setPath(glyph(), backup);
      else AH.admin.clearPath(glyph());
      pad.invalidate();
      pad.setStrokes(saved);
    };

    pad.setStrokes([]);
    pad.playDemo({ duration: 2600, brush: state.brush, onDone: restore });
    /* Gösteri bir şekilde bitmezse (sekme değişimi vb.) yine de geri koy */
    setTimeout(restore, 6000);
  }

  /* ------------------------------------------------------------------ */
  /* DURUM PANOSU — ne kaydedildi, nasıl kaydedildi, ne kaldı?           */
  /* ------------------------------------------------------------------ */
  /** Bir şeklin durumu: nasıl kaydedilmiş? */
  const KIND = {
    self:   { icon: '✍️', cls: 'self',   label: 'Kendi elinle' },
    exact:  { icon: '🟢', cls: 'exact',  label: 'Tam kopya' },
    manner: { icon: '🟡', cls: 'manner', label: 'Üslup' },
    manual: { icon: '✒️', cls: 'manual', label: 'Elle çizilmiş (eski düzenleyici)' },
    auto:   { icon: '⚪', cls: 'auto',   label: 'Otomatik (yazı tipinden)' }
  };

  function statusOf(g) {
    const p = AH.admin.getPath(g);
    if (!p) return { kind: 'auto', rec: null };
    const l = p.learned;
    return { kind: (l && l.mode) || 'manual', rec: p };
  }

  function whenOf(rec) {
    const at = rec && rec.learned && rec.learned.at;
    if (!at) return '';
    const d = new Date(at);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0') + ' ' +
           String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /** Tüm hedefler: 28 harf × 4 biçim (tekrar eden şekiller bir kez) + kelimeler. */
  function surveyLetters() {
    const rows = [];
    AH.data.ALPHABET.forEach((L) => {
      const seen = {};
      const cells = FORMS.map(([k]) => {
        const g = AH.learn.glyphOf(L.char, k);
        const dup = !!seen[g];
        seen[g] = 1;
        const s = statusOf(g);
        return { formKey: k, glyph: g, dup, kind: s.kind, rec: s.rec };
      });
      rows.push({ char: L.char, name: L.name, cells });
    });
    return rows;
  }

  function surveyWords() {
    const out = [];
    const seen = {};
    AH.data.STAGES.forEach((st) => {
      (AH.data.allExercises ? AH.data.allExercises(st) : []).forEach((ex) => {
        const g = ex.result;
        if (!g || seen[g]) return;
        seen[g] = 1;
        const s = statusOf(g);
        out.push({ glyph: g, tr: ex.tr || '', kind: s.kind, rec: s.rec });
      });
    });
    return out;
  }

  function renderBoard() {
    const rows = surveyLetters();
    const wordRows = surveyWords();

    /* sayım — tekrar eden şekiller bir kez sayılır */
    const tally = { self: 0, exact: 0, manner: 0, manual: 0, auto: 0 };
    let letterTotal = 0;
    rows.forEach((r) => r.cells.forEach((c) => {
      if (c.dup) return;
      letterTotal++;
      tally[c.kind]++;
    }));
    const wTally = { self: 0, exact: 0, manner: 0, manual: 0, auto: 0 };
    wordRows.forEach((w) => { wTally[w.kind]++; });

    const doneLetters = letterTotal - tally.auto;
    const doneWords = wordRows.length - wTally.auto;
    const total = letterTotal + wordRows.length;
    const done = doneLetters + doneWords;
    const pct = total ? Math.round((done / total) * 100) : 0;

    /* öğretilmemiş harfler — sırada ne var? */
    const untaught = rows.filter((r) =>
      r.cells.every((c) => c.dup || c.kind === 'auto'));
    const partial = rows.filter((r) =>
      !untaught.includes(r) && r.cells.some((c) => !c.dup && c.kind === 'auto'));

    $('#st-main').innerHTML = [
      '<section class="st-panel">',
      '  <h2 class="st-step"><i>📊</i>' + t('Nerede kaldık?') + '</h2>',
      '  <div class="st-bar"><span style="width:' + pct + '%"></span></div>',
      '  <p class="st-bigline"><b>' + done + '</b> / ' + total + ' ' +
      t('şekil senin üslubunla kaydedildi') + ' (%' + pct + ')</p>',
      '  <div class="st-tally">',
      ['self', 'exact', 'manner', 'manual'].map((k) =>
        '<span class="st-tal ' + KIND[k].cls + '">' + KIND[k].icon + ' ' + t(KIND[k].label) +
        ': <b>' + (tally[k] + wTally[k]) + '</b></span>').join(''),
      '    <span class="st-tal auto">' + KIND.auto.icon + ' ' + t(KIND.auto.label) +
      ': <b>' + (tally.auto + wTally.auto) + '</b></span>',
      '  </div>',
      /* ÜSLUP İMZALARI — tarayıcıda kaç tane var, DOSYADA kaç tane var?
         İkisi ayrışabilir (ör. dosya yeniden üretilirken imzalar düşerse).
         Konsol açtırmak yerine durum burada gösterilir ve tek düğmeyle
         düzeltilir. */
      (function () {
        const inBrowser = Object.keys(AH.learn.localOnly()).length;
        const inFile = Object.keys(
          (AH.customLearn && AH.customLearn.learned) ||
          (AH.customData && AH.customData.learned) || {}
        ).length;
        if (!inBrowser && !inFile) return '';
        const gap = inBrowser > inFile;
        return '<div class="st-sig ' + (gap ? 'warn' : 'ok') + '">' +
          '🎓 ' + t('Üslup imzaları') + ': ' +
          '<b>' + inBrowser + '</b> ' + t('bu tarayıcıda') + ' · ' +
          '<b>' + inFile + '</b> ' + t('dosyada') +
          (gap
            ? ' — <b>' + (inBrowser - inFile) + '</b> ' + t('imza henüz dosyaya yazılmamış.') +
              ' <button type="button" class="btn btn-primary btn-sm" data-act="sigwrite">💾 ' +
              t('Şimdi dosyaya yaz') + '</button>'
            : (inFile ? ' ✅' : '')) +
          '</div>';
      })(),

      '  <p class="st-hint">' + t('Kutuya dokun → hareketi izle, oradan da düzelt.') + '</p>',
      '  <div class="admin-actions">',
      '    <button type="button" class="btn btn-primary" data-rev="all">▶ ' +
      t('Hepsini sırayla izle') + '</button>',
      '    <button type="button" class="btn btn-ghost" data-rev="taught">▶ ' +
      t('Yalnız öğrettiklerimi izle') + '</button>',
      '  </div>',
      '</section>',

      '<section class="st-panel">',
      '  <h3 class="st-sub">' + t('Harf biçimleri') + ' — ' + doneLetters + '/' + letterTotal +
      ' <button type="button" class="mini" data-rev="letters">▶ ' + t('izle') + '</button></h3>',
      '  <div class="st-board-head"><span></span>' +
      FORMS.map(([, l]) => '<span>' + t(l) + '</span>').join('') + '</div>',
      '  <div class="st-board">',
      rows.map((r) =>
        '<div class="st-brow">' +
        '<span class="st-bchar" title="' + esc(r.name) + '"><b dir="rtl">' + esc(r.char) +
        '</b><i>' + esc(r.name) + '</i></span>' +
        r.cells.map((c) =>
          '<button type="button" class="st-cell ' + KIND[c.kind].cls + (c.dup ? ' dup' : '') +
          '" data-char="' + esc(r.char) + '" data-form="' + c.formKey + '"' +
          ' title="' + esc(c.glyph + ' · ' + t(KIND[c.kind].label) +
            (c.rec && c.rec.learned && c.rec.learned.from
              ? ' · ' + t('kaynak') + ': ' + c.rec.learned.from : '') +
            (whenOf(c.rec) ? ' · ' + whenOf(c.rec) : '') +
            (c.dup ? ' · ' + t('bu biçim yalın hâlle aynı') : '')) + '">' +
          '<span class="st-cell-g" dir="rtl">' + esc(c.glyph) + '</span>' +
          '<span class="st-cell-i">' + KIND[c.kind].icon + '</span>' +
          '</button>').join('') +
        '</div>').join(''),
      '  </div>',
      '</section>',

      '<section class="st-panel">',
      '  <h3 class="st-sub">' + t('Kelimeler') + ' — ' + doneWords + '/' + wordRows.length +
      ' <button type="button" class="mini" data-rev="words">▶ ' + t('izle') + '</button></h3>',
      '  <div class="st-wgrid">',
      wordRows.map((w) =>
        '<button type="button" class="st-wcell ' + KIND[w.kind].cls + '" data-wglyph="' +
        esc(w.glyph) + '" title="' +
        esc(w.tr + ' · ' + t(KIND[w.kind].label) + (whenOf(w.rec) ? ' · ' + whenOf(w.rec) : '')) +
        '">' + KIND[w.kind].icon + ' <b dir="rtl">' + esc(w.glyph) + '</b></button>').join(''),
      '  </div>',
      '</section>',

      '<section class="st-panel" id="st-audit"></section>',

      '<section class="st-panel">',
      '  <h3 class="st-sub">' + t('Tamamlanması için ne kaldı?') + '</h3>',
      untaught.length
        ? '  <p class="st-hint">' + t('Hiç öğretilmemiş harfler') + ' (<b>' + untaught.length +
          '</b>) — ' + t('her biri için yalın hâli yazman, kardeş harfleri de kapatır:') + '</p>' +
          '  <div class="st-todo">' + untaught.map((r) =>
            '<button type="button" class="st-todo-chip" data-char="' + esc(r.char) +
            '" data-form="isolated"><b dir="rtl">' + esc(r.char) + '</b>' + esc(r.name) +
            '</button>').join('') + '</div>'
        : '  <p class="admin-ok">✅ ' + t('Bütün harflerde en az bir biçim öğretildi.') + '</p>',
      partial.length
        ? '  <p class="st-hint">' + t('Bazı biçimleri eksik') + ' (<b>' + partial.length +
          '</b>):</p>' +
          '  <div class="st-todo">' + partial.map((r) =>
            '<button type="button" class="st-todo-chip half" data-char="' + esc(r.char) +
            '" data-form="' + (r.cells.filter((c) => !c.dup && c.kind === 'auto')[0] || {}).formKey +
            '"><b dir="rtl">' + esc(r.char) + '</b>' +
            r.cells.filter((c) => !c.dup && c.kind === 'auto').length + ' ' + t('biçim') +
            '</button>').join('') + '</div>'
        : '',
      wTally.auto
        ? '  <p class="st-hint">' + t('Kelimelerde bekleyen') + ': <b>' + wTally.auto + '</b> — ' +
          t('bir harfi öğrettikten sonra “Kelimeler” listesinden toplu uygulayabilirsin.') + '</p>'
        : '  <p class="admin-ok">✅ ' + t('Bütün kelimeler kaydedildi.') + '</p>',
      '</section>'
    ].join('');

    /* Harf kutusu → o şekilden başlayarak hareketleri izle */
    $$('.st-cell').forEach((b) => b.addEventListener('click', () => {
      const list = reviewList('letters', false);
      const i = list.findIndex((x) => x.glyph === AH.learn.glyphOf(b.dataset.char, b.dataset.form));
      openReview(list, i < 0 ? 0 : i);
    }));

    /* Kelime kutusu → o kelimeden başlayarak izle */
    $$('[data-wglyph]').forEach((b) => b.addEventListener('click', () => {
      const list = reviewList('words', false);
      const i = list.findIndex((x) => x.glyph === b.dataset.wglyph);
      openReview(list, i < 0 ? 0 : i);
    }));

    /* "Ne kaldı?" listesindeki harf → doğrudan öğretmeye geç */
    $$('.st-todo-chip').forEach((b) => b.addEventListener('click', () => {
      state.mode = 'letter';
      state.char = b.dataset.char;
      state.formKey = b.dataset.form || 'isolated';
      state.tab = 'teach';
      resetProposals();
      render();
      window.scrollTo(0, 0);
    }));

    /* Toplu gözden geçirme */
    const rev = (k, fn) => {
      const b = $('[data-rev="' + k + '"]');
      if (b) b.addEventListener('click', fn);
    };
    rev('all', () => openReview(reviewList('all', false), 0));
    rev('taught', () => {
      const l = reviewList('all', true);
      if (!l.length) { toast(t('Henüz hiçbir şey öğretmedin.'), 'warn'); return; }
      openReview(l, 0);
    });
    rev('letters', () => openReview(reviewList('letters', false), 0));
    rev('words', () => openReview(reviewList('words', false), 0));

    /* İmzaları dosyaya yaz — konsol gerektirmeyen tek düğmelik kurtarma */
    const sw = $('[data-act="sigwrite"]');
    if (sw) sw.addEventListener('click', () => {
      const PF = AH.projectFile;
      if (!PF || PF.status() !== 'linked') {
        alert(t('Önce proje klasörünü bağla.') + ' (🔗)');
        return;
      }
      sw.disabled = true;
      sw.textContent = t('yazılıyor') + '…';
      PF.writeCore()
        .then((files) => {
          alert('✅ ' + t('Yazıldı') + ': ' + files.join(', ') + '\n\n' +
            t('Sayfayı yenileyince dosyadaki sayı güncellenir.'));
          location.reload();
        })
        .catch((e) => {
          sw.disabled = false;
          alert(t('Yazılamadı') + ': ' + e.message);
        });
    });

    renderAudit();
  }

  /* ---- denetim paneli ---- */
  function renderAudit(strayList) {
    const host = $('#st-audit');
    if (!host) return;
    const dirAll = auditDirection();
    const dir = dirAll.filter((x) => !isOk('dir', x.glyph));
    const dirHidden = dirAll.length - dir.length;
    const strayAll = strayList;
    const stray = strayList ? strayList.filter((x) => !isOk('stray', x.glyph)) : null;
    const strayHidden = strayList ? strayList.length - stray.length : 0;

    const row = (kind, it, extra) =>
      '<div class="st-audit-row">' +
      '<span class="ar" dir="rtl">' + esc(it.glyph) + '</span>' +
      '<span class="st-audit-lbl">' + esc(it.label) + '</span>' +
      '<span class="st-audit-why">' + extra + '</span>' +
      '<button type="button" class="mini" data-au-see="' + esc(it.glyph) + '" ' +
      'title="' + t('Hareketi izle') + '">▶</button>' +
      '<button type="button" class="mini" data-au-fine="' + esc(it.glyph) + '" ' +
      'title="' + t('İnce ayar (Çizim Yolu)') + '">✒️</button>' +
      '<button type="button" class="mini ok" data-au-ok="' + kind + '|' + esc(it.glyph) + '" ' +
      'title="' + t('Arapçaya göre doğru — bir daha uyarma') + '">✓</button>' +
      '</div>';

    const noInk = inkMissing().length;

    host.innerHTML = [
      '<h3 class="st-sub">🔎 ' + t('Denetim — gözle görülmeyen hatalar') + '</h3>',

      /* TELEFON HİZALAMASI — en sık şikâyet: "telefonda yol harfin üstünde değil" */
      noInk
        ? '<div class="st-sig warn">📱 <b>' + noInk + '</b> ' +
          t('yol, telefon hizalaması olmadan kaydedilmiş. Telefonda başka bir Arapça ' +
            'yazı tipi olduğu için yol harften kayar.') +
          ' <button type="button" class="btn btn-primary btn-sm" data-au="ink">📱 ' +
          t('Telefonlar için hizala') + '</button>' +
          '<i class="st-hint" id="ink-prog"></i>' +
          '<br><i class="st-hint">' + t('Bu düğmeye, yolları ÇİZDİĞİN bilgisayarda bas — ' +
            'ölçü oradaki yazı tipinden alınır.') + '</i></div>'
        : '<div class="st-sig ok">📱 ' + t('Bütün yollarda telefon hizalaması var.') + '</div>',


      dir.length
        ? '<p class="admin-warn">⚠ <b>' + dir.length + '</b> ' +
          t('şekilde YÖN hatası var: yazım soldan başlıyor ya da hamle ters gidiyor. ' +
            'Çocuk yanlış yönü öğrenir.') + '</p>' +
          '<div class="admin-actions"><button type="button" class="btn btn-primary btn-sm" ' +
          'data-au="fixall">🔧 ' + t('Hepsinin yönünü düzelt') + '</button>' +
          '<span class="st-hint">' + t('Şeklin değişmez — yalnız gidiş yönü çevrilir.') +
          '</span></div>' +
          '<div class="st-audit">' + dir.map((it) => row('dir', it,
            it.isWord
              ? [it.unordered ? '⇄ ' + t('parça sırası ters') : '',
                 it.startsLeft ? '↤ ' + t('ilk parça ters') : ''].filter(Boolean).join(' · ') +
                ' · ' + t('kural') + ': ' + it.startRule
              : it.badStrokes + '/' + it.total + ' ' + t('hamle ters') +
                ' · ' + t('kural') + ': ' + it.startRule)).join('') + '</div>'
        : '<p class="admin-ok">✅ ' + t('Yön hatası yok — hepsi sağdan sola.') + '</p>',

      '<h4 class="st-sub2">' + t('Yolun harften sapması') + '</h4>',
      stray
        ? (stray.length
            ? '<p class="admin-warn">⚠ <b>' + stray.length + '</b> ' +
              t('şekilde yol harfin dışına taşıyor (sınır %10). Animasyonda göze çarpar; ' +
                'elle yeniden yazmak ya da ince ayar yapmak gerekir.') + '</p>' +
              '<div class="st-audit">' + stray.map((it) => row('stray', it,
                '%' + Math.round(it.stray * 100) + ' ' + t('sapma'))).join('') + '</div>'
            : '<p class="admin-ok">✅ ' + t('Bütün yollar harfin üstünde.') + '</p>')
        : '<div class="admin-actions"><button type="button" class="btn btn-ghost btn-sm" ' +
          'data-au="stray">🔍 ' + t('Sapmayı tara') + '</button>' +
          '<span class="st-hint" id="au-prog"></span></div>',

      (dirHidden + strayHidden)
        ? '<p class="st-hint">✓ ' + (dirHidden + strayHidden) + ' ' +
          t('şekli "doğru" diye onaylamıştın; listelenmiyor.') +
          ' <button type="button" class="mini" data-au="unmute">' +
          t('Onayları geri al') + '</button></p>'
        : ''
    ].join('');
    /* sapma listesi sonraki çizimde korunsun */
    host.__stray = strayAll;

    const on = (k, fn) => {
      const b = $('[data-au="' + k + '"]', host);
      if (b) b.addEventListener('click', fn);
    };
    on('fixall', () => {
      if (!dir.length) return;
      if (!confirm(t('Yön hatası olan') + ' ' + dir.length + ' ' +
          t('şekil düzeltilecek. Çizdiğin ŞEKİL değişmez, yalnız yön çevrilir. Devam?'))) return;
      if (AH.backup) AH.backup.snapshot('yön düzeltmeden önce');
      let n = 0;
      dir.forEach((it) => { if (repairDirection(it)) n++; });
      toast('🔧 ' + n + ' ' + t('şeklin yönü düzeltildi.'), 'good');
      renderBoard();
    });
    on('stray', () => {
      const p = $('#au-prog');
      auditStray(
        (bad) => renderAudit(bad),
        (i, n) => { if (p) p.textContent = i + '/' + n; }
      );
    });

    on('ink', () => {
      const b = $('[data-au="ink"]', host);
      const p = $('#ink-prog', host);
      if (!confirm(t('Kayıtlı yollara telefon hizalaması eklenecek. Çizimlerin ' +
          'DEĞİŞMEZ; yalnız harfin mürekkep ölçüsü kaydedilir. Devam?'))) return;
      b.disabled = true;
      fixInk(
        (n) => {
          toast('📱 ' + n + ' ' + t('yol telefonlar için hizalandı.'), 'good');
          writeToProject(false);
          renderBoard();
        },
        (i, total) => { if (p) p.textContent = ' ' + i + '/' + total; }
      );
    });

    on('unmute', () => {
      if (!confirm(t('Bütün "doğru" onayları geri alınsın mı?'))) return;
      try { localStorage.removeItem(OK_KEY); } catch (e) {}
      renderAudit(strayAll);
    });

    $$('[data-au-see]', host).forEach((b) => b.addEventListener('click', () => {
      const g = b.dataset.auSee;
      const list = reviewList('all', false);
      const i = list.findIndex((x) => x.glyph === g);
      openReview(list, i < 0 ? 0 : i);
    }));
    $$('[data-au-fine]', host).forEach((b) => b.addEventListener('click', () =>
      AH.admin.openPathEditor(b.dataset.auFine, () => renderBoard())));

    /* "Bu Arapçaya göre doğru" — bir daha uyarma */
    $$('[data-au-ok]', host).forEach((b) => b.addEventListener('click', () => {
      const parts = b.dataset.auOk.split('|');
      markOk(parts[0], parts.slice(1).join('|'), true);
      renderAudit(strayAll);
    }));
  }

  /* ------------------------------------------------------------------ */
  /* DENETİM — kayıtlı yollarda gözle görülmeyen hatalar                 */
  /*                                                                     */
  /*  1) YÖN: Arapça sağdan sola yazılır. Kayıtlı yol (u,v) ölçüsünde    */
  /*     saklanır; u = 0 sağ kenar, u = 1 sol kenar. Doğru bir hamle     */
  /*     küçük u'dan büyük u'ya gider. Tersse çocuk yanlış yönden        */
  /*     yazmayı öğrenir — bu gözle fark edilmez, ölçmek gerekir.        */
  /*  2) SAPMA: yol harfin mürekkebinden ne kadar uzaklaşıyor? Kalem     */
  /*     kalınlığı kadarı doğaldır; fazlası animasyonda harfin dışına    */
  /*     taşar.                                                          */
  /* ------------------------------------------------------------------ */
  const STRAY_LIMIT = 0.10;      /* font boyunun %10'u */

  /* ---- "bu doğru, bir daha uyarma" ----
     Denetim ölçüye dayanır; ama son söz öğretmenindir. Arapçaya göre doğru
     olduğunu onayladığın şekiller susturulur ve bir daha listelenmez.
     Onaylar js/custom-data.js'e de gömülür — başka tarayıcıda da geçerli. */
  const OK_KEY = 'arapca-harfler-audit-ok-v1';
  function okLocal() {
    try { return JSON.parse(localStorage.getItem(OK_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function okAll() {
    return Object.assign({}, (AH.customData && AH.customData.auditOk) || {}, okLocal());
  }
  function isOk(kind, glyph) { return !!okAll()[kind + '|' + glyph]; }
  function markOk(kind, glyph, on) {
    const m = okLocal();
    if (on) m[kind + '|' + glyph] = 1; else delete m[kind + '|' + glyph];
    try { localStorage.setItem(OK_KEY, JSON.stringify(m)); } catch (e) {}
    /* dosyaya da yazılsın */
    if (AH.admin && AH.admin.touch) AH.admin.touch();
  }
  function okCount() { return Object.keys(okAll()).length; }

  function pathOf(g) {
    const p = AH.admin.getPath(g);
    if (!p) return null;
    const s = p.strokes || (p.path ? [p.path] : null);
    return (s && s.some((x) => x && x.length > 1)) ? p : null;
  }

  /**
   * DİKKAT — "her hamle sağdan başlar" DOĞRU DEĞİLDİR.
   * Kitapçığa göre ج ح خ ص ض ع غ م harfleri SOL ÜST uçtan başlar. Bu yüzden
   * ölçüt, harfin KENDİ başlangıç kuralıdır (letterforms.startRule);
   * kelimelerde ise yazımın kelimenin SAĞ yarısından başlaması gerekir.
   */
  function normEnds(stroke) {
    let mnu = 1e9, mxu = -1e9, mnv = 1e9, mxv = -1e9;
    stroke.forEach((q) => {
      if (q[0] < mnu) mnu = q[0]; if (q[0] > mxu) mxu = q[0];
      if (q[1] < mnv) mnv = q[1]; if (q[1] > mxv) mxv = q[1];
    });
    const du = (mxu - mnu) || 1, dv = (mxv - mnv) || 1;
    const N = (q) => [(q[0] - mnu) / du, (q[1] - mnv) / dv];
    return [N(stroke[0]), N(stroke[stroke.length - 1])];
  }

  /** Bu hamle, harfin kuralına göre ters yönde mi çizilmiş? */
  function strokeAgainstRule(stroke, startRule) {
    const [a, b] = normEnds(stroke);
    const sc = AH.learn.cornerScore;
    return sc(startRule, b) > sc(startRule, a) + 0.35;
  }

  function bodyStrokes(p) {
    return (p.strokes || (p.path ? [p.path] : [])).filter((s) => s && s.length > 1);
  }

  /** Yön hatası olan şekiller — tuval gerekmez, saf hesap (hızlı). */
  function auditDirection() {
    const out = [];

    surveyLetters().forEach((r) => r.cells.forEach((c) => {
      if (c.dup) return;
      /* KENDİ ELİNLE yazdığın şekle karışılmaz — ölçüt sensin, kitapçık değil.
         Yalnız ALGORİTMANIN ürettiği aktarımlar (tam kopya / üslup) denetlenir. */
      if (c.kind === 'self' || c.kind === 'auto') return;
      const p = pathOf(c.glyph);
      if (!p) return;
      const rule = AH.letterforms.get(r.char, c.formKey);
      if (!rule) return;
      const ss = bodyStrokes(p);
      if (!ss.length) return;
      /* Başlangıç kuralı YALNIZ ilk hamle için geçerlidir. */
      if (!strokeAgainstRule(ss[0], rule.startRule)) return;
      out.push({
        glyph: c.glyph, char: r.char, formKey: c.formKey, isWord: false,
        label: r.name + ' — ' + t((FORMS.filter((f) => f[0] === c.formKey)[0] || [])[1] || ''),
        startRule: rule.startRule, kind: c.kind, badStrokes: 1, total: ss.length,
        startsLeft: false
      });
    }));

    words().forEach((w) => {
      const p = pathOf(w.glyph);
      if (!p) return;
      const ss = bodyStrokes(p);
      if (!ss.length) return;

      /* (a) Parçalar sağdan sola sıralı mı? (u: 0 sağ · 1 sol → artmalı) */
      /* Yalnız GERÇEK ters sıra bildirilir. Hamza gibi ek işaretler x
         ekseninde sıraya girmez; küçük örtüşmeleri "hata" saymak, gerçek
         hataların gözden kaçmasına yol açar. Eşik: kelime genişliğinin
         onda biri kadar belirgin bir geri gidiş. */
      const mean = (s) => s.reduce((a, q) => a + q[0], 0) / s.length;
      let unordered = false;
      for (let i = 1; i < ss.length; i++) {
        if (mean(ss[i]) < mean(ss[i - 1]) - 0.10) unordered = true;
      }
      /* Parça İÇİNDEKİ yön DENETLENMEZ: bir parça birden çok harf taşır
         (ör. "ما" = م + ا) ve harfin başlangıç kuralı parçanın köşesiyle
         karıştırılamaz. Ölçülemeyeni "hata" diye göstermek, gerçek
         hataların da göz ardı edilmesine yol açar. */
      if (!unordered) return;
      out.push({
        glyph: w.glyph, isWord: true, ex: w.ex, label: w.tr,
        startsLeft: false, unordered: true,
        startRule: AH.learn.wordRule(w.ex, w.glyph).startRule,
        badStrokes: 0, total: ss.length
      });
    });

    return out;
  }

  /**
   * Yön onarımı — ŞEKLE DOKUNMAZ, yalnız gidiş yönünü çevirir.
   * Harflerde: kurala aykırı hamleler çevrilir.
   * Kelimelerde: hamleler sağdan sola sıralanır ve gerekirse çevrilir.
   */
  function repairDirection(item) {
    const p = pathOf(item.glyph);
    if (!p) return false;
    let strokes = (p.strokes || [p.path]).slice();

    if (item.isWord) {
      /* Parçaları sağdan sola sırala (u küçük = sağda).
         Ölçüt, denetimdekiyle AYNI olmalı — ORTALAMA u; yoksa onarım
         denetimi tatmin etmez ve uyarı ekranda kalır. */
      strokes.sort((a, b) => {
        const mean = (s) => s.reduce((m, u) => m + u[0], 0) / s.length;
        return mean(a) - mean(b);
      });
      /* Parça içi yön çevrilmez — hangi harfin nerede başladığı
         parçanın kutusundan çıkarılamaz (bkz. auditDirection). */
    } else {
      /* yalnız İLK hamle — sonraki hamlelerin kendi mantığı vardır */
      const rule = AH.letterforms.get(item.char, item.formKey);
      const i0 = strokes.findIndex((s) => s && s.length > 1);
      if (i0 >= 0 && rule && strokeAgainstRule(strokes[i0], rule.startRule)) {
        strokes = strokes.slice();
        strokes[i0] = strokes[i0].slice().reverse();
      }
    }
    AH.admin.setPath(item.glyph, Object.assign({}, p, { strokes }));
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* TELEFON HİZALAMASI                                                   */
  /*                                                                     */
  /* Kayıtlı yollar harfin ÇİZİM KUTUSUNA göre saklanır; harfin MÜREKKEBİ */
  /* ise yazı tipine göre bu kutunun içinde farklı yerde durur. Telefonda */
  /* başka bir Arapça yazı tipi olduğu için yol harfin üstünden kayıyordu.*/
  /*                                                                     */
  /* Çözüm: her kayda, çizildiği andaki MÜREKKEP KUTUSU (ink) eklenir.    */
  /* tracing.js bunu görünce yolu o günkü mürekkebe yeniden oturtur.      */
  /*                                                                     */
  /* ⚠ Bu işlem, yolların ÇİZİLDİĞİ cihazda çalıştırılmalıdır — ölçü      */
  /*   oradaki yazı tipinden alınır.                                     */
  /* ------------------------------------------------------------------ */
  function inkMissing() {
    const out = [];
    const seen = {};
    const add = (glyph, item) => {
      if (seen[glyph]) return;
      const p = AH.admin.getPath(glyph);
      if (!p || (p.ink && p.ink.length === 4)) return;
      seen[glyph] = 1;
      out.push(Object.assign({ glyph }, item));
    };
    surveyLetters().forEach((r) => r.cells.forEach((c) => {
      if (c.dup) return;
      add(c.glyph, { char: r.char, formKey: c.formKey, isWord: false });
    }));
    words().forEach((w) => add(w.glyph, { isWord: true, ex: w.ex }));
    return out;
  }

  function fixInk(onDone, onTick) {
    const list = inkMissing();
    if (!list.length) { onDone(0); return; }
    if (AH.backup) AH.backup.snapshot('telefon hizalaması eklenmeden önce');
    const pad = scratchPad();
    let i = 0, n = 0;
    const BATCH = 6;
    const step = () => {
      for (let k = 0; k < BATCH && i < list.length; k++, i++) {
        const it = list[i];
        try {
          pad.setForm(it.isWord ? AH.learn.wordRule(it.ex, it.glyph)
                                : AH.letterforms.get(it.char, it.formKey));
          pad.setWord(it.glyph);
          const ink = pad.inkNorm();
          const rec = AH.admin.getPath(it.glyph);
          if (ink && rec) {
            AH.admin.setPath(it.glyph, Object.assign({}, rec, { ink }));
            n++;
          }
        } catch (e) {}
      }
      if (onTick) onTick(i, list.length);
      if (i < list.length) setTimeout(step, 0);
      else onDone(n);
    };
    step();
  }

  /** Sapma taraması — tuval gerektirir, parça parça çalışır. */
  function auditStray(onDone, onTick) {
    const pad = scratchPad();
    const list = [];
    surveyLetters().forEach((r) => r.cells.forEach((c) => {
      if (c.dup || !pathOf(c.glyph)) return;
      list.push({ glyph: c.glyph, char: r.char, formKey: c.formKey, isWord: false,
        label: r.name + ' — ' + t((FORMS.filter((f) => f[0] === c.formKey)[0] || [])[1] || '') });
    }));
    words().forEach((w) => {
      if (!pathOf(w.glyph)) return;
      list.push({ glyph: w.glyph, isWord: true, ex: w.ex, label: w.tr });
    });

    const bad = [];
    let i = 0;
    const BATCH = 6;
    const step = () => {
      for (let k = 0; k < BATCH && i < list.length; k++, i++) {
        const it = list[i];
        try {
          pad.setForm(it.isWord ? AH.learn.wordRule(it.ex, it.glyph)
                                : AH.letterforms.get(it.char, it.formKey));
          pad.setWord(it.glyph);
          const m = pad.glyphMask();
          const fs = pad.getLayout().fontSize;
          const stray = maxStray(m, pad.refPath(), fs);
          if (stray > STRAY_LIMIT) bad.push(Object.assign({ stray }, it));
        } catch (e) {}
      }
      if (onTick) onTick(i, list.length);
      if (i < list.length) setTimeout(step, 0);
      else onDone(bad);
    };
    step();
  }

  /** Yolun mürekkepten en çok ne kadar (font boyu oranı) uzaklaştığı. */
  function maxStray(m, pts, fontSize) {
    const lim = Math.round(fontSize * 0.25);
    let mx = 0;
    pts.forEach((q) => {
      const d = inkDist(m, q.x, q.y, lim);
      if (d > mx) mx = d;
    });
    return mx / fontSize;
  }
  function inkDist(m, x, y, max) {
    x = Math.round(x); y = Math.round(y);
    for (let r = 0; r <= max; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const px = x + dx, py = y + dy;
          if (px < 0 || py < 0 || px >= m.w || py >= m.h) continue;
          if (m.data[(py * m.w + px) * 4 + 3] > 40) return r;
        }
      }
    }
    return max + 1;
  }

  /* ------------------------------------------------------------------ */
  /* GÖZDEN GEÇİRME — her harfin/kelimenin hareketini izle                */
  /* "hepsi doğru mu?" sorusunu hızlıca yanıtlamak için.                 */
  /* ------------------------------------------------------------------ */
  const review = { list: [], i: 0, pad: null, auto: false, timer: null };

  function closeReview() {
    clearTimeout(review.timer);
    if (review.pad) { review.pad.stopDemo(); review.pad.destroy(); review.pad = null; }
    const el = $('#st-rev');
    if (el) el.remove();
    review.list = [];
  }

  function openReview(list, index) {
    if (!list.length) return;
    closeReview();
    review.list = list;
    review.i = Math.max(0, Math.min(list.length - 1, index || 0));
    review.auto = false;

    const el = document.createElement('div');
    el.id = 'st-rev';
    el.className = 'st-rev';
    el.innerHTML = [
      '<div class="st-rev-box" role="dialog" aria-modal="true">',
      '  <header class="st-rev-head">',
      '    <span id="rv-title"></span>',
      '    <button type="button" class="admin-close" data-rv="close">✕</button>',
      '  </header>',
      '  <div class="canvas-frame st-rev-stage"><canvas class="pad"></canvas></div>',
      '  <div class="st-rev-info" id="rv-info"></div>',
      '  <footer class="st-rev-foot">',
      '    <button type="button" class="btn btn-ghost btn-sm" data-rv="prev">◀</button>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-rv="replay">▶ ' +
      t('Tekrar izle') + '</button>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-rv="auto">⏩ ' +
      t('Sırayla oynat') + '</button>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-rv="next">▶</button>',
      '    <span class="st-rev-count" id="rv-count"></span>',
      '  </footer>',
      '  <div class="st-rev-acts">',
      '    <button type="button" class="btn btn-primary btn-sm" data-rv="teach">✍️ ' +
      t('Elle yaz') + '</button>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-rv="fine">✒️ ' +
      t('İnce ayar (Çizim Yolu)') + '</button>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(el);

    review.pad = AH.tracing.create($('canvas.pad', el), {});
    review.pad.setLocked(true);
    review.pad.setGhost(true);

    const on = (k, fn) => $('[data-rv="' + k + '"]', el).addEventListener('click', fn);
    on('close', closeReview);
    on('prev', () => step(-1));
    on('next', () => step(1));
    on('replay', () => play());
    on('auto', () => {
      review.auto = !review.auto;
      $('[data-rv="auto"]', el).classList.toggle('on', review.auto);
      if (review.auto) play();
    });
    on('teach', () => {
      const it = review.list[review.i];
      closeReview();
      goto(it.glyph);
    });
    on('fine', () => {
      const it = review.list[review.i];
      const g = it.glyph;
      closeReview();
      AH.admin.openPathEditor(g, () => { if (state.tab === 'board') renderBoard(); });
    });
    el.addEventListener('click', (e) => { if (e.target === el) closeReview(); });
    document.addEventListener('keydown', onRevKey);

    show();

    function onRevKey(e) {
      if (!$('#st-rev')) { document.removeEventListener('keydown', onRevKey); return; }
      if (e.key === 'Escape') closeReview();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === ' ') { e.preventDefault(); play(); }
    }

    function step(d) {
      clearTimeout(review.timer);
      review.i = (review.i + d + review.list.length) % review.list.length;
      show();
    }

    function show() {
      const it = review.list[review.i];
      const s = statusOf(it.glyph);
      $('#rv-title').innerHTML = '<b dir="rtl">' + esc(it.glyph) + '</b> ' + esc(it.label);
      $('#rv-count').textContent = (review.i + 1) + ' / ' + review.list.length;
      $('#rv-info').innerHTML =
        '<span class="st-tal ' + KIND[s.kind].cls + '">' + KIND[s.kind].icon + ' ' +
        t(KIND[s.kind].label) + '</span>' +
        (s.rec && s.rec.learned && s.rec.learned.from && s.rec.learned.mode !== 'self'
          ? '<span class="st-rev-from">' + t('kaynak') + ': ' + esc(s.rec.learned.from) + '</span>'
          : '') +
        (whenOf(s.rec) ? '<span class="st-rev-from">' + whenOf(s.rec) + '</span>' : '');
      review.pad.setForm(it.isWord
        ? AH.learn.wordRule(it.ex, it.glyph)
        : AH.letterforms.get(it.char, it.formKey));
      review.pad.setWord(it.glyph);
      play();
    }

    function play() {
      if (!review.pad) return;
      review.pad.stopDemo();
      review.pad.playDemo({
        duration: 2200,
        onDone() {
          review.pad.setShowStart(true);
          if (review.auto) {
            review.timer = setTimeout(() => step(1), 700);
          }
        }
      });
    }
  }

  /** Panodan gözden geçirme listesi kur. */
  function reviewList(kind, onlyTaught) {
    const out = [];
    if (kind !== 'words') {
      surveyLetters().forEach((r) => r.cells.forEach((c) => {
        if (c.dup) return;
        if (onlyTaught && c.kind === 'auto') return;
        out.push({
          glyph: c.glyph, char: r.char, formKey: c.formKey, isWord: false,
          /* şekil zaten başlıkta gösteriliyor — burada harfin ADI yazılır */
          label: r.name + ' — ' + t((FORMS.filter((f) => f[0] === c.formKey)[0] || [])[1] || '')
        });
      }));
    }
    if (kind !== 'letters') {
      words().forEach((w) => {
        const s = statusOf(w.glyph);
        if (onlyTaught && s.kind === 'auto') return;
        out.push({ glyph: w.glyph, isWord: true, ex: w.ex, label: w.tr });
      });
    }
    return out;
  }

  /** Bir şekli (harf biçimi ya da kelime) öğretmeye geç. */
  function goto(g) {
    const w = wordOf(g);
    if (w) {
      state.mode = 'word';
      state.word = g;
    } else {
      let hit = null;
      AH.data.ALPHABET.forEach((L) => {
        if (hit) return;
        FORMS.forEach(([k]) => {
          if (!hit && AH.learn.glyphOf(L.char, k) === g) hit = { char: L.char, formKey: k };
        });
      });
      if (!hit) return false;
      state.mode = 'letter';
      state.char = hit.char;
      state.formKey = hit.formKey;
    }
    state.tab = 'teach';
    resetProposals();
    render();
    window.scrollTo(0, 0);
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Kaydet ve öğren                                                     */
  /* ------------------------------------------------------------------ */
  function save() {
    const pad = state.pad;
    const raw = pad.getStrokes();
    if (!raw.length) { toast(t('Önce harfi yaz.'), 'warn'); return; }

    const sig = AH.learn.capture(pad, raw, {
      char: isWordMode() ? null : state.char,
      formKey: isWordMode() ? null : state.formKey,
      glyph: glyph(),
      isWord: isWordMode(),
      brush: state.brush
    });
    if (!sig) { toast(t('Yazı okunamadı — biraz daha uzun çiz.'), 'warn'); return; }

    /* 1) Yazdığın şekil: doğrudan uygulanır (senin kendi çizimin) */
    const rec = AH.learn.selfRecord(sig, pad);
    if (!rec) { toast(t('Kaydedilemedi.'), 'bad'); return; }
    AH.admin.setPath(glyph(), rec);
    AH.learn.save(sig);
    state.sig = sig;
    pad.invalidate();

    toast('✅ ' + glyph() + ' ' + t('öğrenildi ve uygulandı.'), 'good');

    /* HEMEN ölç: yol harften çok uzaklaştıysa şimdi söyle.
       (Denetimde günler sonra bulmaktansa, kalem hâlâ eldeyken.) */
    warnIfStray(pad);

    /* Klasör bağlıysa DOĞRUDAN proje dosyasına yaz */
    writeToProject(false);

    /* 2) Kelimeler tek başına durur — harflerde ise nereye taşınabilir? */
    if (isWordMode()) { buildWordLessons(raw); return; }
    buildProposals();
  }

  /* ------------------------------------------------------------------ */
  /* ANINDA SAPMA UYARISI                                                */
  /* Yeni kaydedilen yol, harfin mürekkebinden ne kadar uzaklaşıyor?     */
  /* Kalem kalınlığı mertebesi (%10) doğaldır; fazlası animasyonda       */
  /* harfin dışına taşar. Kalem hâlâ elindeyken söylemek, günler sonra   */
  /* denetimde bulmaktan iyidir.                                         */
  /* ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ */
  /* ÇOK DENEMELİ ÖĞRENME — el titremesini ortalama ile sönümle          */
  /*                                                                     */
  /* Tek bir yazı, o anki el titremesini de taşır; ucu birkaç piksel     */
  /* kayar ve yol harfin dışına taşabilir. Aynı biçimi 2–3 kez yazıp     */
  /* ORTALAMASINI almak bu sapmayı belirgin biçimde azaltır.             */
  /*                                                                     */
  /* Ortalama nasıl alınır: her hamle YAY UZUNLUĞUNA göre aynı sayıda    */
  /* noktaya yeniden örneklenir (resample), sonra karşılıklı noktaların  */
  /* ortalaması alınır. Hamle sayıları farklıysa ortalama ALINMAZ —      */
  /* farklı yazım mantıklarını karıştırmak yanlış olur.                  */
  /* ------------------------------------------------------------------ */
  const RESAMPLE = 40;

  function resample(stroke, n) {
    const d = [];
    let total = 0;
    for (let i = 1; i < stroke.length; i++) {
      const s = Math.hypot(stroke[i][0] - stroke[i - 1][0], stroke[i][1] - stroke[i - 1][1]);
      d.push(s);
      total += s;
    }
    if (total <= 0) return new Array(n).fill(stroke[0].slice(0, 2));
    const out = [stroke[0].slice(0, 2)];
    let seg = 0, acc = 0;
    for (let k = 1; k < n - 1; k++) {
      const want = (total * k) / (n - 1);
      while (seg < d.length - 1 && acc + d[seg] < want) { acc += d[seg]; seg++; }
      const r = d[seg] ? (want - acc) / d[seg] : 0;
      const a = stroke[seg], b = stroke[seg + 1] || a;
      out.push([a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r]);
    }
    out.push(stroke[stroke.length - 1].slice(0, 2));
    return out;
  }

  /** Aynı biçimin birden çok imzasını ortalar. Uyumsuzsa null döner. */
  function averageSignatures(sigs) {
    if (!sigs.length) return null;
    if (sigs.length === 1) return sigs[0];
    const n = sigs[0].strokes.length;
    if (!sigs.every((s) => s.strokes.length === n)) return null;

    const strokes = [];
    for (let i = 0; i < n; i++) {
      const rs = sigs.map((s) => resample(s.strokes[i], RESAMPLE));
      const avg = [];
      for (let k = 0; k < RESAMPLE; k++) {
        let x = 0, y = 0;
        rs.forEach((r) => { x += r[k][0]; y += r[k][1]; });
        avg.push([+(x / rs.length).toFixed(4), +(y / rs.length).toFixed(4)]);
      }
      strokes.push(avg);
    }

    /* noktalar: sayı tutuyorsa ortala, tutmuyorsa en son yazıdakini al */
    const dn = sigs[0].dots.length;
    let dots;
    if (sigs.every((s) => s.dots.length === dn)) {
      dots = [];
      for (let i = 0; i < dn; i++) {
        let x = 0, y = 0, r = 0;
        sigs.forEach((s) => { x += s.dots[i][0]; y += s.dots[i][1]; r += (s.dots[i][2] || 0.06); });
        dots.push([+(x / sigs.length).toFixed(4), +(y / sigs.length).toFixed(4),
                   +(r / sigs.length).toFixed(4)]);
      }
    } else {
      dots = sigs[sigs.length - 1].dots;
    }

    const out = Object.assign({}, sigs[sigs.length - 1], {
      strokes, dots, samples: sigs.length, averaged: true
    });
    return out;
  }

  /** Bu biçim için biriktirilmiş denemeler. */
  function sampleKey() {
    return isWordMode() ? 'w|' + glyph() : state.char + '|' + state.formKey;
  }
  function samplesFor() {
    state.samples = state.samples || {};
    return state.samples[sampleKey()] || [];
  }
  function addSample() {
    const pad = state.pad;
    const raw = pad.getStrokes();
    if (!raw.length) { toast(t('Önce harfi yaz.'), 'warn'); return; }
    const sig = AH.learn.capture(pad, raw, {
      char: isWordMode() ? null : state.char,
      formKey: isWordMode() ? null : state.formKey,
      glyph: glyph(), isWord: isWordMode(), brush: state.brush
    });
    if (!sig) { toast(t('Yazı okunamadı — biraz daha uzun çiz.'), 'warn'); return; }
    state.samples = state.samples || {};
    const k = sampleKey();
    state.samples[k] = (state.samples[k] || []).concat([sig]);
    pad.clear();
    renderSamples();
    toast('➕ ' + t('Deneme eklendi') + ' (' + state.samples[k].length + ')', 'good');
  }

  function renderSamples() {
    const host = $('#st-samples');
    if (!host) return;
    const list = samplesFor();
    if (!list.length) { host.innerHTML = ''; return; }
    const counts = list.map((s) => s.strokes.length);
    const same = counts.every((c) => c === counts[0]);
    host.innerHTML = [
      '<div class="st-sample-box">',
      '  <b>' + list.length + ' ' + t('deneme birikti') + '</b> ',
      same
        ? '<span class="st-hint">' + t('Ortalamaları alınabilir — el titremesi sönümlenir.') + '</span>'
        : '<span class="admin-warn">⚠ ' + t('Hamle sayıları farklı') + ' (' + counts.join('/') +
          ') — ' + t('ortalama alınamaz; aynı mantıkla yeniden yaz.') + '</span>',
      '  <div class="admin-actions">',
      same ? '<button type="button" class="btn btn-primary btn-sm" data-act="useavg">📐 ' +
             t('Ortalamayı kullan') + '</button>' : '',
      '    <button type="button" class="mini danger" data-act="clearsamples">' +
      t('Denemeleri sil') + '</button>',
      '  </div>',
      '</div>'
    ].join('');

    const avgBtn = $('[data-act="useavg"]', host);
    if (avgBtn) avgBtn.addEventListener('click', useAverage);
    $('[data-act="clearsamples"]', host).addEventListener('click', () => {
      delete state.samples[sampleKey()];
      renderSamples();
    });
  }

  function useAverage() {
    const list = samplesFor();
    const sig = averageSignatures(list);
    if (!sig) { toast(t('Hamle sayıları farklı — ortalama alınamadı.'), 'warn'); return; }
    const pad = state.pad;
    const rec = AH.learn.selfRecord(sig, pad);
    if (!rec) { toast(t('Kaydedilemedi.'), 'bad'); return; }
    if (AH.backup) AH.backup.snapshot('ortalama uygulanmadan önce');
    AH.admin.setPath(glyph(), rec);
    AH.learn.save(sig);
    state.sig = sig;
    pad.invalidate();
    toast('📐 ' + list.length + ' ' + t('denemenin ortalaması uygulandı.'), 'good');
    warnIfStray(pad);
    writeToProject(false);
    delete state.samples[sampleKey()];
    renderSamples();
    if (!isWordMode()) buildProposals();
  }

  function warnIfStray(pad) {
    let stray = 0;
    try {
      pad.invalidate();
      stray = maxStray(pad.glyphMask(), pad.refPath(), pad.getLayout().fontSize);
    } catch (e) { return; }
    const box = $('#st-stray');
    if (!box) return;
    if (stray <= STRAY_LIMIT) {
      box.className = 'st-stray ok';
      box.innerHTML = '✅ ' + t('Yol harfin üstünde') + ' (%' + Math.round(stray * 100) + ')';
      return;
    }
    box.className = 'st-stray warn';
    box.innerHTML = '⚠ ' + t('Yazın harften %') + Math.round(stray * 100) + ' ' +
      t('dışarı taşıyor') + ' (' + t('sınır') + ' %' + Math.round(STRAY_LIMIT * 100) + '). ' +
      t('Animasyonda göze çarpar.') +
      ' <button type="button" class="mini" data-act="redo">↻ ' + t('Yeniden yaz') + '</button>';
    const b = $('[data-act="redo"]', box);
    if (b) b.addEventListener('click', () => {
      state.pad.clear();
      box.className = 'st-stray';
      box.innerHTML = '';
      resetProposals();
      toast(t('Tuval temizlendi — harfe daha yakın yaz.'), 'info');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Kelime yazısından çıkan HARF DERSLERİ                               */
  /* "باب" yazarken sondaki "ب"yi de yazmış olursun — o ders alınır.     */
  /* ------------------------------------------------------------------ */
  function buildWordLessons(raw) {
    const w = wordOf(glyph());
    let lessons = [];
    try {
      lessons = AH.learn.fromWord(state.pad, raw,
        { ex: w ? w.ex : null, glyph: glyph(), brush: state.brush }) || [];
    } catch (e) { lessons = []; }

    const ap = $('#st-apply');
    ap.hidden = false;
    ap.innerHTML = [
      '<h2 class="st-step"><i>3</i>' + t('Kaydedildi') + '</h2>',
      '<p class="st-hint">' + t('Kelime yazımı yalnızca bu kelimeye işlenir — ' +
        'kelimelerin şekli birbirine benzemediği için başka kelimeye taşınmaz.') + '</p>',

      lessons.length
        ? '<h3 class="st-sub">🎓 ' + t('Bu kelimeden şu harfleri de öğrendim') + '</h3>' +
          '<p class="st-hint">' + t('Kelimede TEK BAŞINA duran (bitişmeyen) parçalar, ' +
            'o harf biçiminin dersidir. İşaretlersen harfe ve kardeşlerine uygulanır.') + '</p>' +
          '<div class="st-props" id="st-wl"></div>' +
          '<div class="admin-actions">' +
          '<button type="button" class="btn btn-primary" data-act="wl-apply">✔ ' +
          t('Seçilen harf derslerini uygula') + '</button>' +
          '<span class="st-count" id="wl-sel"></span></div>'
        : '<p class="st-hint">ℹ️ ' + t('Bu kelimeden ayrı bir harf dersi çıkarılamadı — ' +
            'harfler birbirine bitişik olduğu için hangi çizginin nerede bittiği kestirilemez.') +
          '</p>',

      '<div class="admin-actions">',
      '  <button type="button" class="btn btn-ghost" data-act="wnext2">' +
      t('Sonraki kelime') + ' ▶</button>',
      '  <button type="button" class="btn btn-ghost" data-act="fine2">✒️ ' +
      t('İnce ayar (Çizim Yolu)') + '</button>',
      '</div>'
    ].join('');

    $('[data-act="wnext2"]').addEventListener('click', () => {
      const list = words();
      const i = list.findIndex((x) => x.glyph === glyph());
      state.word = list[(i + 1) % list.length].glyph;
      resetProposals();
      renderTeach();
    });
    $('[data-act="fine2"]').addEventListener('click', () =>
      AH.admin.openPathEditor(glyph(), () => { renderTeach(); renderFileStrip(); }));

    if (!lessons.length) return;

    /* Her ders için önizleme kartı — harfin kendi tuvalinde nasıl duruyor? */
    const host = $('#st-wl');
    state.lessons = lessons.map((L) => {
      const cell = document.createElement('label');
      cell.className = 'st-prop';
      cell.innerHTML = [
        '<input type="checkbox" checked>',
        '<span class="st-prop-cv"><canvas></canvas></span>',
        '<span class="st-prop-name"><b dir="rtl">' + esc(L.glyph) + '</b>' +
        esc(L.char + ' — ' + t((FORMS.filter((f) => f[0] === L.formKey)[0] || [])[1] || '')) +
        '</span>',
        '<span class="st-badge self">✍️ ' + t('Kelimeden') + '</span>'
      ].join('');
      host.appendChild(cell);
      return { lesson: L, cell, on: true, rec: null, pad: null };
    });

    setTimeout(() => {
      const p = scratchPad();
      state.lessons.forEach((it) => {
        const L = it.lesson;
        try {
          p.setForm(AH.letterforms.get(L.char, L.formKey));
          p.setWord(L.glyph);
          it.rec = AH.learn.selfRecord(L.sig, p);
        } catch (e) { it.rec = null; }
        if (!it.rec) { it.cell.classList.add('failed'); it.on = false; return; }
        try { drawThumb({ cell: it.cell, target: { glyph: L.glyph, char: L.char,
          formKey: L.formKey, kind: 'letter' }, rec: it.rec }); } catch (e) {}
        const inp = it.cell.querySelector('input');
        inp.addEventListener('change', () => { it.on = inp.checked; wlCount(); });
      });
      wlCount();
    }, 30);

    $('[data-act="wl-apply"]').addEventListener('click', applyWordLessons);
  }

  function wlCount() {
    const el = $('#wl-sel');
    if (el) {
      const n = (state.lessons || []).filter((x) => x.on && x.rec).length;
      el.textContent = n ? t('Seçili') + ': ' + n : t('Hiçbiri seçili değil');
    }
  }

  function applyWordLessons() {
    const picked = (state.lessons || []).filter((x) => x.on && x.rec);
    if (!picked.length) { toast(t('Önce uygulanacakları işaretle.'), 'warn'); return; }
    if (!confirm(t('Seçilen') + ' ' + picked.length + ' ' +
        t('harf biçimi senin kelime yazından öğrenilecek. Devam?'))) return;

    if (AH.backup) AH.backup.snapshot('kelime dersleri uygulanmadan önce');

    let n = 0;
    picked.forEach((it) => {
      const L = it.lesson;
      AH.admin.setPath(L.glyph, it.rec);
      AH.learn.save(L.sig);
      n++;
    });
    toast('✅ ' + n + ' ' + t('harf biçimi kelimeden öğrenildi.'), 'good');
    writeToProject(false);

    /* Öğrenilen ilk biçimden kardeşlere de taşımak isteyebilir */
    const first = picked[0].lesson;
    state.sig = first.sig;
    state.mode = 'letter';
    state.char = first.char;
    state.formKey = first.formKey;
    renderTeach();
    buildProposals();
  }

  function scratchPad() {
    if (state.scratch) return state.scratch;
    let host = $('#st-scratch');
    if (!host) {
      host = document.createElement('div');
      host.id = 'st-scratch';
      host.className = 'st-scratch';
      document.body.appendChild(host);
      host.innerHTML = '<canvas></canvas>';
    }
    state.scratch = AH.tracing.create(host.querySelector('canvas'), {});
    state.scratch.setLocked(true);
    return state.scratch;
  }

  function formOf(target) {
    return target.kind === 'word'
      ? AH.learn.wordRule(target.ex, target.glyph)
      : AH.letterforms.get(target.char, target.formKey || 'isolated');
  }

  /** Bir hedef için önerilen kaydı hesapla (gizli tuvalde). */
  function computeFor(target) {
    const p = scratchPad();
    p.setForm(formOf(target));
    p.setWord(target.glyph);
    try { return AH.learn.proposal(state.sig, p, target); }
    catch (e) { return null; }
  }

  function buildProposals() {
    const all = AH.learn.targets(state.char, state.formKey);
    const letters = all.filter((x) => x.kind !== 'word');
    const words = all.filter((x) => x.kind === 'word');

    const ap = $('#st-apply');
    ap.hidden = false;
    ap.innerHTML = [
      '<h2 class="st-step"><i>3</i>' + t('Öğrendiğimi nereye uygulayayım?') + '</h2>',
      '<p class="st-hint">' + t('Hiçbiri sen onaylamadan uygulanmaz. Önizlemelere bak, ' +
        'istediklerini işaretle.') + '</p>',
      '<div class="st-legend">',
      '  <span class="st-badge exact">' + t('Tam kopya') + '</span> ' +
      t('aynı iskelet — çizgilerin birebir taşınır') + '<br>',
      '  <span class="st-badge manner">' + t('Üslup') + '</span> ' +
      t('şekil farklı — yalnız başlangıç, yön, hamle sayısı, nokta ve kalem taşınır'),
      '</div>',
      '<h3 class="st-sub">' + t('Harf biçimleri') + ' <span id="st-prog"></span></h3>',
      '<div class="st-props" id="st-letter-props"></div>',
      words.length
        ? '<h3 class="st-sub">' + t('Kelimeler') + ' (' + words.length + ')</h3>' +
          '<p class="st-hint">' + t('Kelimelerde şekil bütün olarak farklıdır; buradaki ' +
            'aktarım yalnız ÜSLUPTUR (başlangıç ucu, yön, kalem kalınlığı, nokta boyu).') + '</p>' +
          '<div class="st-actions"><button type="button" class="mini" data-act="wall">' +
          t('Hepsini seç') + '</button> <button type="button" class="mini" data-act="wnone">' +
          t('Hiçbiri') + '</button></div>' +
          '<div class="st-words" id="st-word-props"></div>'
        : '',
      '<div class="st-foot st-apply-foot">',
      '  <button type="button" class="btn btn-primary btn-xl" data-act="apply">✔ ' +
      t('Seçilenlere uygula') + '</button>',
      '  <span class="st-count" id="st-sel"></span>',
      '</div>'
    ].join('');

    /* harf biçimleri — küçük önizlemeli kartlar (parça parça hesaplanır) */
    const host = $('#st-letter-props');
    state.props = [];
    letters.forEach((target, i) => {
      const cell = document.createElement('label');
      cell.className = 'st-prop pending';
      cell.innerHTML = [
        '<input type="checkbox" data-i="' + i + '">',
        '<span class="st-prop-cv"><canvas></canvas></span>',
        '<span class="st-prop-name"><b dir="rtl">' + esc(target.glyph) + '</b>' +
        esc(labelOf(target)) + '</span>',
        '<span class="st-badge ' + target.mode + '">' +
        t(target.mode === 'exact' ? 'Tam kopya' : 'Üslup') + '</span>'
      ].join('');
      host.appendChild(cell);
      state.props.push({ target, cell, rec: null, on: false, pad: null });
    });

    /* kelimeler — hafif liste (önizleme istenirse tek tek) */
    if (words.length) {
      const wh = $('#st-word-props');
      state.wordProps = words.map((target, i) => {
        const row = document.createElement('label');
        row.className = 'st-word';
        row.innerHTML = [
          '<input type="checkbox" data-w="' + i + '">',
          '<span class="ar" dir="rtl">' + esc(target.glyph) + '</span>',
          '<span class="st-word-tr">' + esc(target.label.split('—').slice(1).join('—').trim()) + '</span>'
        ].join('');
        wh.appendChild(row);
        return { target, row, rec: null, on: false };
      });
      $('[data-act="wall"]').addEventListener('click', () => {
        state.wordProps.forEach((p) => { p.on = true; p.row.querySelector('input').checked = true; });
        updateCount();
      });
      $('[data-act="wnone"]').addEventListener('click', () => {
        state.wordProps.forEach((p) => { p.on = false; p.row.querySelector('input').checked = false; });
        updateCount();
      });
      $$('#st-word-props input').forEach((inp) => inp.addEventListener('change', () => {
        state.wordProps[Number(inp.dataset.w)].on = inp.checked;
        updateCount();
      }));
    }

    $('[data-act="apply"]').addEventListener('click', applySelected);
    ap.scrollIntoView({ behavior: 'smooth', block: 'start' });

    /* Önce panel boyansın, sonra öneriler hesaplansın.
       TEK yield kullanılır: arka plandaki sekmede tarayıcı setTimeout'u
       saniyede bire kadar kıstığı için parça parça zincir takılıp kalır. */
    $('#st-prog').textContent = t('hesaplanıyor') + '…';
    setTimeout(computeAll, 30);
  }

  function computeAll() {
    const list = state.props;
    list.forEach((item) => {
      /* Bir hedef patlarsa diğerleri etkilenmesin */
      try { item.rec = computeFor(item.target); }
      catch (e) { item.rec = null; }

      item.cell.classList.remove('pending');
      if (!item.rec) {
        item.cell.classList.add('failed');
        item.cell.querySelector('.st-prop-name').insertAdjacentHTML('beforeend',
          '<i class="st-fail">' + t('hesaplanamadı') + '</i>');
        return;
      }
      try { drawThumb(item); } catch (e) { /* önizleme çizilemedi, kayıt geçerli */ }
      const inp = item.cell.querySelector('input');
      /* tam kopyalar varsayılan olarak işaretli gelir; üslup aktarımı gelmez */
      inp.checked = item.target.mode === 'exact';
      item.on = inp.checked;
      inp.addEventListener('change', () => { item.on = inp.checked; updateCount(); });
    });
    $('#st-prog').textContent = '';
    updateCount();
  }

  /** Küçük önizleme: hedef harfin soluk şekli + önerilen yol. */
  function drawThumb(item) {
    const cv = item.cell.querySelector('canvas');
    const pad = AH.tracing.create(cv, {});
    pad.setLocked(true);
    pad.setForm(formOf(item.target));
    pad.setWord(item.target.glyph);
    pad.setGhost(true);
    item.pad = pad;

    const rec = item.rec;
    pad.setOverlay((c) => {
      c.save();
      c.lineCap = 'round';
      c.lineJoin = 'round';
      const lay = pad.getLayout();
      c.lineWidth = Math.max(2, (rec.brush || 0.08) * lay.fontSize * 0.9);
      c.strokeStyle = 'rgba(79,70,229,0.85)';
      (rec.strokes || []).forEach((s) => {
        c.beginPath();
        s.forEach((u, n) => {
          const p = pad.fromNorm(u);
          if (n === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
        });
        c.stroke();
      });
      /* başlangıç halkası */
      if (rec.strokes && rec.strokes[0] && rec.strokes[0].length) {
        const s0 = pad.fromNorm(rec.strokes[0][0]);
        c.fillStyle = '#059669';
        c.beginPath();
        c.arc(s0.x, s0.y, Math.max(3, lay.fontSize * 0.06), 0, 6.2832);
        c.fill();
      }
      c.fillStyle = 'rgba(217,119,6,0.9)';
      (rec.dots || []).forEach((d) => {
        const p = pad.fromNorm(d);
        c.beginPath();
        c.arc(p.x, p.y, Math.max(2, (d[2] || 0.06) * lay.fontSize), 0, 6.2832);
        c.fill();
      });
      c.restore();
    });
  }

  function updateCount() {
    const n = state.props.filter((p) => p.on && p.rec).length +
              state.wordProps.filter((p) => p.on).length;
    const el = $('#st-sel');
    if (el) el.textContent = n ? t('Seçili') + ': ' + n : t('Hiçbiri seçili değil');
  }

  function applySelected() {
    if (state.busy) return;
    const letters = state.props.filter((p) => p.on && p.rec);
    const words = state.wordProps.filter((p) => p.on);
    if (!letters.length && !words.length) {
      toast(t('Önce uygulanacakları işaretle.'), 'warn');
      return;
    }
    if (!confirm(t('Seçilen') + ' ' + (letters.length + words.length) + ' ' +
        t('hedefin yazım yolu değiştirilecek. Devam edilsin mi?'))) return;

    /* GÜVENLİK AĞI: toplu yazmadan önce deponun fotoğrafı */
    if (AH.backup) AH.backup.snapshot('öneri uygulanmadan önce');

    state.busy = true;
    let n = 0;
    letters.forEach((p) => { AH.admin.setPath(p.target.glyph, p.rec); n++; });

    /* Kelimeler ağırdır: DEMET hâlinde işlenir. Arka plandaki sekmede
       tarayıcı zamanlayıcıyı kıstığı için tek tek adımlama takılır. */
    const btn = $('[data-act="apply"]');
    const BATCH = 8;
    let i = 0;
    const step = () => {
      if (i >= words.length) {
        state.busy = false;
        btn.disabled = false;
        btn.textContent = '✔ ' + t('Seçilenlere uygula');
        const linked = AH.projectFile && AH.projectFile.status() === 'linked';
        toast('✅ ' + n + ' ' + (linked
          ? t('hedefe uygulandı ve proje dosyasına yazıldı.')
          : t('hedefe uygulandı. “Kalıcı Kayıt” ile dosyaya gömmeyi unutma.')), 'good');
        writeToProject(false);
        return;
      }
      btn.disabled = true;
      btn.textContent = t('Uygulanıyor') + '… ' + Math.min(i + BATCH, words.length) +
        '/' + words.length;
      for (let k = 0; k < BATCH && i < words.length; k++, i++) {
        let rec = null;
        try { rec = computeFor(words[i].target); } catch (e) { rec = null; }
        if (rec) { AH.admin.setPath(words[i].target.glyph, rec); n++; }
      }
      setTimeout(step, 20);
    };
    step();
  }

  /* ------------------------------------------------------------------ */
  /* Başlangıç                                                           */
  /* ------------------------------------------------------------------ */
  function init() {
    if (AH.i18n) {
      AH.i18n.applyDocument();
      const lb = $('#st-lang');
      if (lb) {
        lb.textContent = AH.i18n.isAr() ? 'TR' : 'ع';
        lb.addEventListener('click', () => {
          AH.i18n.toggle();
          lb.textContent = AH.i18n.isAr() ? 'TR' : 'ع';
          applyShellText();
          resetProposals();
          render();
        });
      }
    }
    applyShellText();

    /* Atölye yönetici alanıdır — öğrenci yanlışlıkla açmasın. */
    if (!AH.admin.isUnlocked() && !AH.admin.unlockWithPrompt()) {
      $('#studio').innerHTML = '<section class="st-panel"><p class="st-hint">' +
        t('Bu sayfa öğretmen içindir.') + ' <a href="index.html">' +
        t('Uygulamaya dön') + '</a></p></section>';
      return;
    }

    render();

    /* Çizim Yolu düzenleyicisinden "elle yaz" ile gelindiyse o şekli aç */
    try {
      const g = new URLSearchParams(location.search).get('g');
      if (g) goto(g);
    } catch (e) {}

    /* Daha önce bağlanmış proje klasörü varsa şerit güncellensin */
    if (AH.projectFile) AH.projectFile.restore().then(renderFileStrip).catch(() => {});

    /* admin.js her değişiklikten sonra dosyaya yazar — sonucu şeritte göster */
    document.addEventListener('ah-project-write', (e) => {
      const msg = $('#st-file-msg');
      if (!msg) return;
      const d = e.detail || {};
      msg.textContent = d.error ? '⚠ ' + d.error : '✅ ' + (d.files || []).join(' · ');
    });

    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (state.pad) state.pad.resize();
        state.props.forEach((p) => { if (p.pad) p.pad.resize(); });
      }, 140);
    });
  }

  function applyShellText() {
    const ti = $('#st-title'), su = $('#st-sub'), bk = $('#st-back');
    if (ti) ti.textContent = t('Öğretme Atölyesi');
    if (su) su.textContent = t('Sen yaz — uygulama üslubunu öğrensin');
    if (bk) bk.textContent = '← ' + t('Uygulama');
  }

  AH.studio = { init, render, state, computeFor, goto, openReview, reviewList };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();
})();

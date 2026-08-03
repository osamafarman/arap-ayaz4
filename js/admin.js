/* =========================================================================
   admin.js — YÖNETİCİ MODU

   Öğretmen/yönetici şunları değiştirebilir:
     • Kelimeler   — Arapça yazım, hareke, Türkçe karşılık, not, denklem
                     (yeni kelime ekleme ve silme dâhil)
     • Harfler     — ad, ses açıklaması, "nasıl yazılır" metni, not
     • ÇİZİM YOLU  — harfin/kelimenin nereden başlayıp nasıl ilerleyeceği
                     elle çizilir: noktalar eklenir, taşınır, sıralanır;
                     nokta (nokta işaretleri) konumları da elle konur.
     • Yedek       — tüm değişiklikleri JSON olarak dışa/içe aktarma

   Değişiklikler localStorage'da saklanır ve açılışta özgün veriye
   uygulanır (apply). Yol düzenlemeleri tuval boyutundan bağımsız,
   yazı tipi ölçüsüne göre (u,v) saklanır.

   GÜVENLİK NOTU: Bu bir kolaylık kilididir, güvenlik değildir. Uygulama
   tamamen tarayıcıda çalıştığı için dosyalara erişebilen herkes PIN'i
   aşabilir. Amaç, öğrencinin yanlışlıkla ayarları bozmasını önlemektir.
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});
  const KEY = 'arapca-harfler-admin-v1';

  /* Yönetici parolası.
     UYARI: Bu bir GÜVENLİK önlemi değildir — uygulama tamamen tarayıcıda
     çalıştığı için parola bu dosyayı açan herkesçe görülebilir. Amacı,
     öğrencinin yanlışlıkla ayarları bozmasını önlemektir.
     Yönetici panelinden (Yedek sekmesi) değiştirilebilir. */
  const DEFAULT_PIN = 'Osama1bal';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ------------------------------------------------------------------ */
  /* Depolama                                                            */
  /* ------------------------------------------------------------------ */
  function blank() {
    return {
      v: 1, pin: null, letters: {}, exercises: {}, paths: {}, added: [], deleted: [],
      /* görünüm ayarları:
         markerScale — öğrenciye gösterilen yeşil başlangıç halkasının boyu
         nodeSize    — düzenleyicideki tutamakların boyu (yalnızca yönetici)
         uiKeys      — bu tarayıcıda ELLE değiştirilen ayarların adları;
                       yalnızca bunlar js/custom-data.js'teki ayarı ezer */
      ui: { markerScale: 1, nodeSize: 1 },
      uiKeys: []
    };
  }

  let store = (function () {
    try {
      const raw = localStorage.getItem(KEY);
      const p = raw ? JSON.parse(raw) : null;
      return p && typeof p === 'object' ? Object.assign(blank(), p) : blank();
    } catch (e) { return blank(); }
  })();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); }
    catch (e) { alert('Kaydedilemedi: ' + e.message); }
    scheduleProjectWrite();
  }

  /* ------------------------------------------------------------------ */
  /* HER DEĞİŞİKLİK PROJE DOSYASINA — klasör bağlıysa                    */
  /* Öğretme Atölyesi de, Çizim Yolu düzenleyicisi de buradan geçer;     */
  /* böylece iki sayfa da doğrudan js/ dosyalarına yazar.                */
  /* ------------------------------------------------------------------ */
  let pwTimer = null;
  function scheduleProjectWrite() {
    const PF = AH.projectFile;
    if (!PF || PF.status() !== 'linked') return;
    clearTimeout(pwTimer);
    /* Toplu uygulamada (ör. 32 kelime) tek yazma yeter */
    pwTimer = setTimeout(() => {
      PF.writeCore()
        .then((files) => emitWrite(files, null))
        .catch((e) => emitWrite(null, e));
    }, 1200);
  }
  function emitWrite(files, err) {
    try {
      document.dispatchEvent(new CustomEvent('ah-project-write', {
        detail: { files: files || null, error: err ? err.message : null }
      }));
    } catch (e) {}
  }

  let unlocked = false;

  /* ------------------------------------------------------------------ */
  /* TABAN KATMAN — uygulamaya kalıcı gömülmüş yönetici değişiklikleri   */
  /* (js/custom-data.js). localStorage'daki taze düzenleme bunu ezer.    */
  /* ------------------------------------------------------------------ */
  function base() {
    const b = AH.customData || {};
    return {
      letters: b.letters || {},
      exercises: b.exercises || {},
      added: b.added || [],
      deleted: b.deleted || [],
      ui: b.ui || null,
      /* İmzalar ayrı dosyada (js/custom-learn.js); eski tek dosyalı
         kurulumda custom-data.learned içinde olabilir.
         ⚠ DİKKAT: BOŞ NESNE DE DOĞRUDUR (`{}` truthy). Sadece `||`
         kullanmak, boş yeni dosyanın dolu eski dosyayı gölgelemesine ve
         imzaların kaybolmasına yol açar. Bu yüzden İÇERİK sayılır. */
      learned: pickNonEmpty(
        AH.customLearn && AH.customLearn.learned,
        b.learned
      ),
      auditOk: b.auditOk || {}
    };
  }

  /** İlk DOLU nesneyi döndürür; hepsi boşsa {} verir. */
  function pickNonEmpty() {
    for (let i = 0; i < arguments.length; i++) {
      const o = arguments[i];
      if (o && typeof o === 'object' && Object.keys(o).length) return o;
    }
    return {};
  }

  /* Öğretme Atölyesi'nin (learn.js) tarayıcıdaki üslup imzaları.
     learn.js bu sayfada yüklü olmayabilir; bu yüzden doğrudan okunur. */
  const LEARN_KEY = 'arapca-harfler-learned-v1';
  function learnedLocal() {
    try {
      const raw = localStorage.getItem(LEARN_KEY);
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch (e) { return {}; }
  }

  /* Atölye denetiminde "bu doğru" diye onaylanan şekiller. */
  const AUDIT_OK_KEY = 'arapca-harfler-audit-ok-v1';
  function auditOkLocal() {
    try {
      const raw = localStorage.getItem(AUDIT_OK_KEY);
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch (e) { return {}; }
  }

  /** Dışarıdan (studio.js) yapılan localStorage değişikliğinden sonra
      dosyaya yazmayı tetikler — depo aynı kalsa bile. */
  function touch() { scheduleProjectWrite(); }

  /** Taban + tarayıcı birleşimi (kalıcı dosya üretirken kullanılır). */
  function mergedStore() {
    const b = base();
    const out = {
      v: 1,
      letters: Object.assign({}, b.letters, store.letters),
      exercises: Object.assign({}, b.exercises, store.exercises),
      deleted: b.deleted.concat(store.deleted.filter((id) => b.deleted.indexOf(id) < 0)),
      added: [],
      /* Öğretme Atölyesi'nde öğrenilen üslup imzaları */
      learned: Object.assign({}, b.learned, learnedLocal()),
      /* denetimde "Arapçaya göre doğru" diye onaylanan şekiller */
      auditOk: Object.assign({}, b.auditOk, auditOkLocal()),
      /* ayarlardan yalnızca elle değiştirilenler dosyadakini ezer */
      ui: (function () {
        const u = Object.assign({}, b.ui || {});
        (store.uiKeys || []).forEach((k) => {
          if (store.ui && typeof store.ui[k] === 'number') u[k] = store.ui[k];
        });
        return Object.keys(u).length ? u : null;
      })()
    };
    /* eklenen kelimeler: aynı id iki kez girmesin, tarayıcıdaki kazansın */
    const seen = {};
    store.added.concat(b.added).forEach((a) => {
      const id = a && a.ex && a.ex.id;
      if (!id || seen[id]) return;
      seen[id] = 1;
      out.added.push(a);
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Değişiklikleri veriye uygula (course.js'ten ÖNCE çalışmalı)          */
  /* ------------------------------------------------------------------ */
  function apply() {
    const D = AH.data;
    if (!D) return;

    /* Uygulamaya gömülü (kalıcı) katman önce, tarayıcıdaki taze düzenleme sonra:
       böylece yeni düzenleme her zaman üstte kalır. */
    const M = mergedStore();

    /* harfler */
    const patchLetter = (L) => {
      const o = M.letters[L.char];
      if (o) Object.keys(o).forEach((k) => { if (o[k] != null) L[k] = o[k]; });
    };
    D.STAGES.forEach((st) => st.letters.forEach(patchLetter));
    if (D.ALPHABET) D.ALPHABET.forEach(patchLetter);

    /* alıştırmalar */
    const SECTIONS = ['twoLetters', 'threeLetters', 'cumulative'];
    D.STAGES.forEach((st) => {
      SECTIONS.forEach((sec) => {
        let list = (st.exercises[sec] || []).filter((e) => M.deleted.indexOf(e.id) < 0);
        list.forEach((e) => {
          const o = M.exercises[e.id];
          if (o) Object.keys(o).forEach((k) => { if (o[k] != null) e[k] = o[k]; });
        });
        M.added
          .filter((a) => a.stageId === st.stageId && a.section === sec)
          .forEach((a) => list.push(JSON.parse(JSON.stringify(a.ex))));
        st.exercises[sec] = list;
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Yol (çizim) katmanı                                                 */
  /* ------------------------------------------------------------------ */
  /** Bu tarayıcıda elle değiştirilen ayarlar (dosyadakini ezerler). */
  function uiTouched(k) {
    return !!store.uiKeys && store.uiKeys.indexOf(k) >= 0;
  }
  function getUI(k, def) {
    if (uiTouched(k) && store.ui && typeof store.ui[k] === 'number') return store.ui[k];
    const b = base().ui;                 /* uygulamaya gömülü ayar */
    const bv = b ? b[k] : undefined;
    if (typeof bv === 'number') return bv;
    const v = store.ui ? store.ui[k] : undefined;
    return typeof v === 'number' ? v : def;
  }
  function setUI(k, v) {
    if (!store.ui) store.ui = {};
    if (!store.uiKeys) store.uiKeys = [];
    store.ui[k] = v;
    if (store.uiKeys.indexOf(k) < 0) store.uiKeys.push(k);
    save();
  }

  /* Yol çözümleme sırası:
       1) tarayıcıdaki taze düzenleme (localStorage)
       2) uygulamaya kalıcı kaydedilmiş yollar (js/custom-paths.js)
       3) yok → yazı tipinden otomatik hesaplanır */
  function builtIn(glyph) {
    return (AH.customPaths && AH.customPaths[glyph]) || null;
  }
  function getPath(glyph) {
    return store.paths[glyph] || builtIn(glyph) || null;
  }
  function isBuiltIn(glyph) {
    return !store.paths[glyph] && !!builtIn(glyph);
  }
  /* Kayıt biçimi sürümü. Biçim değişirse eski kayıtlar buradan tanınır:
       (yok) → v1  : {strokes:[[[u,v]…]], dots:[[u,v,r]], brush, font}
       v2         : + learned:{from,mode,at}  (Öğretme Atölyesi bilgisi)
     Okuma tarafı her iki sürümü de kabul eder; damga ileride gereken
     dönüşümü yapabilmek içindir. */
  const PATH_V = 2;

  function setPath(glyph, obj) {
    const rec = Object.assign({}, obj);
    if (typeof rec.v !== 'number') rec.v = PATH_V;
    store.paths[glyph] = rec;
    save();
  }
  function clearPath(glyph) { delete store.paths[glyph]; save(); }

  /** Tarayıcıdaki + uygulamaya gömülü tüm özel yollar (kaydetme için). */
  function allPaths() {
    const out = {};
    if (AH.customPaths) Object.keys(AH.customPaths).forEach((k) => { out[k] = AH.customPaths[k]; });
    Object.keys(store.paths).forEach((k) => { out[k] = store.paths[k]; });
    return out;
  }
  function customCount() { return Object.keys(allPaths()).length; }
  function pendingCount() { return Object.keys(store.paths).length; }

  /* ------------------------------------------------------------------ */
  /* Erişim                                                              */
  /* ------------------------------------------------------------------ */
  function isUnlocked() { return unlocked; }

  function requestAccess() {
    if (unlocked) { open(); return; }
    /* İlk açılışta parola önceden belirlenmiştir (DEFAULT_PIN); öğrencinin
       rastgele bir PIN icat etmesi istenmez. Yönetici dilerse Yedek
       sekmesinden (setPin) değiştirebilir. */
    const effectivePin = store.pin || DEFAULT_PIN;
    const p = prompt('Yönetici PIN:');
    if (p === null) return;
    if (p === effectivePin) { unlocked = true; open(); }
    else alert('PIN yanlış.');
  }

  /**
   * Paneli açmadan yalnızca kilidi çözer — Öğretme Atölyesi (studio.html)
   * gibi ayrı sayfalar için. Doğruysa true döner.
   */
  function unlockWithPrompt() {
    if (unlocked) return true;
    const effectivePin = store.pin || DEFAULT_PIN;
    const p = prompt('Yönetici PIN:');
    if (p === null) return false;
    if (p === effectivePin) { unlocked = true; return true; }
    alert('PIN yanlış.');
    return false;
  }

  /**
   * ÇİZİM YOLU düzenleyicisini belirli bir harf/kelime için açar.
   * Öğretme Atölyesi'nin "ince ayar" düğmesi bunu çağırır: atölye elle
   * yazmanın yeri, çizim yolu ise düğüm düğüm ince ayarın yeri.
   * @param {string} glyph  ör. "ب", "ـبـ", "باب"
   * @param {function} [onClose] panel kapanınca çağrılır (atölye tazelensin)
   */
  function openPathEditor(glyph, onClose) {
    if (!unlocked && !unlockWithPrompt()) return false;
    closeHook = onClose || null;
    tab = 'paths';
    open();
    const sel = $('#p-pick');
    if (!sel) return false;
    const items = window.__adminItems || [];
    const n = items.findIndex((i) => i.glyph === glyph);
    if (n < 0) return false;
    sel.value = String(n);
    sel.dispatchEvent(new Event('change'));
    return true;
  }

  /** Yönetici parolasını değiştirir (Yedek sekmesinden çağrılır). */
  function setPin(newPin) {
    store.pin = String(newPin || '').trim() || null;
    save();
  }
  function hasCustomPin() { return !!store.pin; }

  /* ------------------------------------------------------------------ */
  /* Arayüz                                                              */
  /* ------------------------------------------------------------------ */
  let tab = 'words';
  let editorPad = null;
  let editor = null;   /* {glyph, rule, path:[[u,v]], dots:[[u,v]], mode, sel} */

  function open() {
    let root = $('#admin-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'admin-root';
      document.body.appendChild(root);
    }
    render();
  }

  /* Panel kapanınca çağrılacak kanca (Öğretme Atölyesi kendini tazelesin). */
  let closeHook = null;

  function close() {
    if (editorPad) { editorPad.destroy(); editorPad = null; }
    editor = null;
    const root = $('#admin-root');
    if (root) root.remove();
    if (closeHook) {
      const fn = closeHook;
      closeHook = null;
      try { fn(); } catch (e) {}
    }
  }

  function render() {
    const root = $('#admin-root');
    if (!root) return;
    root.innerHTML = [
      '<div class="admin-shell">',
      '  <header class="admin-bar">',
      '    <b>🔧 Yönetici Modu</b>',
      '    <nav class="admin-tabs">',
      [['words', 'Kelimeler'], ['letters', 'Harfler'], ['paths', 'Çizim Yolu'],
       ['audio', 'Ses Kaydı'], ['persist', '💾 Kalıcı Kayıt'], ['backup', 'Yedek']]
        .map(([k, l]) => '<button type="button" class="admin-tab' + (tab === k ? ' on' : '') +
          '" data-tab="' + k + '">' + l + '</button>').join(''),
      '    </nav>',
      '    <a class="btn btn-ghost btn-sm admin-studio" href="studio.html" target="_blank" ' +
      'title="Harfi kendi elinle yaz; uygulama üslubunu öğrenip diğer harflere uygulasın">' +
      '🎓 Öğretme Atölyesi</a>',
      '    <button type="button" class="admin-close" data-act="close">✕ Kapat</button>',
      '  </header>',
      '  <div class="admin-body" id="admin-body"></div>',
      '</div>'
    ].join('');

    $$('.admin-tab', root).forEach((b) => b.addEventListener('click', () => {
      tab = b.dataset.tab;
      if (editorPad) { editorPad.destroy(); editorPad = null; }
      render();
    }));
    $('[data-act="close"]', root).addEventListener('click', close);

    if (tab === 'words') renderWords();
    else if (tab === 'letters') renderLetters();
    else if (tab === 'paths') renderPaths();
    else if (tab === 'audio') renderAudio();
    else if (tab === 'persist') renderPersist();
    else renderBackup();
  }

  function reloadNotice() {
    if (confirm('Değişiklik kaydedildi. Ders listesinin güncellenmesi için sayfa yenilensin mi?')) {
      location.reload();
    }
  }

  /* ---------------------------------------------------------- KELİMELER */
  function renderWords() {
    const D = AH.data;
    const SECTIONS = [['twoLetters', '2 Harfli'], ['threeLetters', '3 Harfli'], ['cumulative', 'Kümülatif']];
    const rows = [];
    D.STAGES.forEach((st) => {
      SECTIONS.forEach(([sec, label]) => {
        (st.exercises[sec] || []).forEach((ex) => {
          rows.push(
            '<tr data-id="' + esc(ex.id) + '">' +
            '<td class="ar">' + esc(ex.result) + '</td>' +
            '<td>' + esc(ex.tr) + '</td>' +
            '<td>' + st.stageId + ' · ' + label + '</td>' +
            '<td class="row-actions">' +
            '<button type="button" class="mini edit" data-edit="' + esc(ex.id) + '">✏️ Düzenle</button> ' +
            '<button type="button" class="mini" data-path="' + esc(ex.result) + '">✒️ Yolu çiz</button> ' +
            '<button type="button" class="mini danger" data-del="' + esc(ex.id) + '">🗑 Sil</button></td>' +
            '</tr>'
          );
        });
      });
    });

    $('#admin-body').innerHTML = [
      '<div class="admin-pane">',
      '  <div class="admin-head-row">',
      '    <p>Kelimeleri düzenle, sil veya yeni kelime ekle. Denklem parçaları harflerin ' +
      '    bağlı biçimleridir (ör. <code>بـ ـا ب</code>).</p>',
      '    <button type="button" class="btn btn-primary btn-sm" data-act="new">+ Yeni kelime</button>',
      '  </div>',
      '  <table class="admin-table"><thead><tr><th>Arapça</th><th>Türkçe</th><th>Yer</th><th></th></tr></thead>',
      '  <tbody>' + rows.join('') + '</tbody></table>',
      '  <div id="word-form"></div>',
      '</div>'
    ].join('');

    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => wordForm(b.dataset.edit)));
    /* Kelimenin çizim yolunu doğrudan aç — sekme değiştirmeye gerek kalmasın */
    $$('[data-path]').forEach((b) => b.addEventListener('click', () => {
      tab = 'paths';
      render();
      const sel = $('#p-pick');
      if (!sel) return;
      const items = window.__adminItems || [];
      const n = items.findIndex((i) => i.glyph === b.dataset.path);
      if (n >= 0) { sel.value = String(n); sel.dispatchEvent(new Event('change')); }
    }));
    $$('[data-del]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.del;
      if (!confirm('"' + id + '" silinsin mi?')) return;
      const idx = store.added.findIndex((a) => a.ex.id === id);
      if (idx >= 0) store.added.splice(idx, 1);
      else if (store.deleted.indexOf(id) < 0) store.deleted.push(id);
      save();
      reloadNotice();
    }));
    $('[data-act="new"]').addEventListener('click', () => wordForm(null));
  }

  function findExercise(id) {
    for (const st of AH.data.STAGES) {
      for (const sec of ['twoLetters', 'threeLetters', 'cumulative']) {
        const hit = (st.exercises[sec] || []).find((e) => e.id === id);
        if (hit) return { ex: hit, stageId: st.stageId, section: sec };
      }
    }
    return null;
  }

  function wordForm(id) {
    const found = id ? findExercise(id) : null;
    const ex = found ? found.ex : {
      id: 'ozel-' + Math.random().toString(36).slice(2, 8),
      equation: [], result: '', vowelled: '', tr: '', kind: 'kelime', tag: '', note: ''
    };
    const stageId = found ? found.stageId : AH.data.STAGES[0].stageId;
    const section = found ? found.section : 'threeLetters';

    $('#word-form').innerHTML = [
      '<div class="admin-form">',
      '  <h3>' + (found ? 'Kelimeyi düzenle' : 'Yeni kelime') + ' <code>' + esc(ex.id) + '</code></h3>',
      '  <label>Denklem parçaları (boşlukla ayır)<input id="f-eq" value="' + esc((ex.equation || []).join(' ')) + '"></label>',
      '  <label>Arapça (harekesiz)<input id="f-res" dir="rtl" value="' + esc(ex.result) + '"></label>',
      '  <label>Harekeli<input id="f-vow" dir="rtl" value="' + esc(ex.vowelled) + '"></label>',
      '  <label>Türkçe karşılık<input id="f-tr" value="' + esc(ex.tr) + '"></label>',
      '  <label>Rozet (isteğe bağlı)<input id="f-tag" value="' + esc(ex.tag || '') + '"></label>',
      '  <label>Not<textarea id="f-note" rows="2">' + esc(ex.note || '') + '</textarea></label>',
      '  <div class="admin-row">',
      '    <label>Tür<select id="f-kind">' +
      ['kelime', 'hece'].map((k) => '<option' + (ex.kind === k ? ' selected' : '') + '>' + k + '</option>').join('') +
      '    </select></label>',
      found ? '' :
        '<label>Aşama<select id="f-stage">' +
        AH.data.STAGES.map((s) => '<option value="' + s.stageId + '">' + esc(s.title) + '</option>').join('') +
        '</select></label>' +
        '<label>Bölüm<select id="f-sec">' +
        [['twoLetters', '2 Harfli'], ['threeLetters', '3 Harfli'], ['cumulative', 'Kümülatif']]
          .map(([k, l]) => '<option value="' + k + '"' + (k === section ? ' selected' : '') + '>' + l + '</option>').join('') +
        '</select></label>',
      '  </div>',
      '  <p class="admin-warn" id="f-warn"></p>',
      '  <div class="admin-actions">',
      '    <button type="button" class="btn btn-primary" data-act="save">Kaydet</button>',
      '    <button type="button" class="btn btn-ghost" data-act="cancel">Vazgeç</button>',
      found && store.exercises[ex.id]
        ? '<button type="button" class="btn btn-ghost" data-act="revert">Özgün hâline döndür</button>' : '',
      '  </div>',
      '</div>'
    ].join('');

    const warn = () => {
      const eq = $('#f-eq').value.trim().split(/\s+/).filter(Boolean);
      const res = $('#f-res').value.trim();
      const joined = eq.join('').replace(/ـ/g, '');
      $('#f-warn').textContent =
        (eq.length && res && joined !== res)
          ? '⚠ Parçalar birleşince "' + joined + '" çıkıyor, "' + res + '" yazdın. Yine de kaydedebilirsin.'
          : '';
    };
    ['f-eq', 'f-res'].forEach((i) => $('#' + i).addEventListener('input', warn));
    warn();

    $('[data-act="cancel"]').addEventListener('click', () => { $('#word-form').innerHTML = ''; });
    const rev = $('[data-act="revert"]');
    if (rev) rev.addEventListener('click', () => {
      delete store.exercises[ex.id];
      save();
      reloadNotice();
    });

    $('[data-act="save"]').addEventListener('click', () => {
      const rec = {
        equation: $('#f-eq').value.trim().split(/\s+/).filter(Boolean),
        result: $('#f-res').value.trim(),
        vowelled: $('#f-vow').value.trim() || $('#f-res').value.trim(),
        tr: $('#f-tr').value.trim(),
        tag: $('#f-tag').value.trim() || null,
        note: $('#f-note').value.trim(),
        kind: $('#f-kind').value
      };
      if (!rec.result || !rec.tr || !rec.equation.length) {
        alert('Arapça yazım, Türkçe karşılık ve denklem parçaları zorunludur.');
        return;
      }
      if (found) {
        store.exercises[ex.id] = rec;
      } else {
        store.added.push({
          stageId: Number($('#f-stage').value),
          section: $('#f-sec').value,
          ex: Object.assign({ id: ex.id }, rec)
        });
      }
      save();
      reloadNotice();
    });
  }

  /* ------------------------------------------------------------ HARFLER */
  function renderLetters() {
    const letters = AH.data.ALPHABET;
    $('#admin-body').innerHTML = [
      '<div class="admin-pane">',
      '  <p>Harf adlarını, ses açıklamalarını ve "nasıl yazılır" metnini düzenle.</p>',
      '  <div class="admin-letters" dir="rtl">',
      letters.map((L) =>
        '<div class="admin-letter' + (store.letters[L.char] ? ' edited' : '') + '">' +
        '<button type="button" class="al-main" data-char="' + L.char + '">' +
        '<span dir="rtl">' + L.char + '</span><i>' + esc(L.name) + '</i></button>' +
        '<button type="button" class="al-edit" data-char="' + L.char + '" ' +
        'title="' + esc(L.name) + ' harfini düzenle">✏️</button>' +
        '</div>'
      ).join(''),
      '  </div>',
      '  <div id="letter-form"></div>',
      '</div>'
    ].join('');
    $$('[data-char]').forEach((b) => b.addEventListener('click', () => {
      letterForm(b.dataset.char);
      const f = $('#letter-form');
      if (f && f.scrollIntoView) f.scrollIntoView({ block: 'nearest' });
    }));
  }

  function letterForm(char) {
    const L = AH.data.getLetter(char);
    if (!L) return;
    const cur = AH.data.STAGES.reduce((a, st) => a || st.letters.find((x) => x.char === char), null) || L;
    $('#letter-form').innerHTML = [
      '<div class="admin-form">',
      '  <h3><span dir="rtl" class="big-ar">' + esc(char) + '</span> düzenle</h3>',
      '  <label>Ad<input id="l-name" value="' + esc(cur.name) + '"></label>',
      '  <label>Ses açıklaması<input id="l-sound" value="' + esc(cur.sound) + '"></label>',
      '  <label>Nasıl yazılır<textarea id="l-write" rows="2">' + esc(cur.write || '') + '</textarea></label>',
      '  <label>Not<textarea id="l-note" rows="2">' + esc(cur.note || '') + '</textarea></label>',
      '  <div class="admin-actions">',
      '    <button type="button" class="btn btn-primary" data-act="lsave">Kaydet</button>',
      store.letters[char] ? '<button type="button" class="btn btn-ghost" data-act="lrev">Özgün hâline döndür</button>' : '',
      '  </div>',
      '</div>'
    ].join('');

    $('[data-act="lsave"]').addEventListener('click', () => {
      store.letters[char] = {
        name: $('#l-name').value.trim(),
        sound: $('#l-sound').value.trim(),
        write: $('#l-write').value.trim(),
        note: $('#l-note').value.trim()
      };
      save();
      reloadNotice();
    });
    const r = $('[data-act="lrev"]');
    if (r) r.addEventListener('click', () => { delete store.letters[char]; save(); reloadNotice(); });
  }

  /* -------------------------------------------------------- ÇİZİM YOLU */
  function glyphChoices() {
    const out = [];
    const keys = [['isolated', 'Yalın'], ['initial', 'Başta'], ['medial', 'Ortada'], ['final', 'Sonda']];
    AH.data.ALPHABET.forEach((L) => {
      const seen = {};
      keys.forEach(([k, label]) => {
        const g = L.forms[k];
        if (seen[g]) return;
        seen[g] = 1;
        out.push({ glyph: g, char: L.char, formKey: k, label: L.name + ' · ' + label, kind: 'harf' });
      });
    });
    AH.data.STAGES.forEach((st) =>
      AH.data.allExercises(st).forEach((ex) =>
        out.push({ glyph: ex.result, char: null, formKey: null, label: ex.result + ' — ' + ex.tr, kind: 'kelime', ex })
      )
    );
    return out;
  }

  function renderPaths() {
    const items = glyphChoices();
    $('#admin-body').innerHTML = [
      '<div class="admin-pane">',
      '  <p>Bir harf ya da kelime seç, sonra <b>yolu kendin çiz</b>: kalemin nereden ' +
      'başlayacağını ve sona kadar nasıl ilerleyeceğini sen belirlersin. ' +
      'Kaydedilen yol animasyonda ve öğrenci denetiminde kullanılır.</p>',
      '  <label class="admin-select">Düzenlenecek:',
      '    <select id="p-pick">',
      '      <optgroup label="Harfler">',
      items.filter((i) => i.kind === 'harf').map((i, n) =>
        '<option value="' + n + '">' + esc(i.label) + '  (' + i.glyph + ')' +
        (store.paths[i.glyph] ? '  ✎' : '') + '</option>').join(''),
      '      </optgroup>',
      '      <optgroup label="Kelimeler">',
      items.map((i, n) => ({ i, n })).filter((o) => o.i.kind === 'kelime').map((o) =>
        '<option value="' + o.n + '">' + esc(o.i.label) + (store.paths[o.i.glyph] ? '  ✎' : '') + '</option>').join(''),
      '      </optgroup>',
      '    </select>',
      '  </label>',
      '  <div id="path-editor"></div>',
      '</div>'
    ].join('');

    window.__adminItems = items;
    $('#p-pick').addEventListener('change', (e) => openEditor(items[Number(e.target.value)]));
    openEditor(items[0]);
  }

  /* Geri al / yinele geçmişi */
  function snapshot() {
    return JSON.stringify({ strokes: editor.strokes, dots: editor.dots });
  }
  function pushHistory() {
    if (!editor) return;
    editor.undo.push(snapshot());
    if (editor.undo.length > 60) editor.undo.shift();
    editor.redo.length = 0;
    refreshHistoryButtons();
  }
  function restore(json) {
    const o = JSON.parse(json);
    editor.strokes = o.strokes;
    editor.dots = o.dots;
    if (editor.active >= editor.strokes.length) editor.active = editor.strokes.length - 1;
    editor.sel = null;
    redraw();
  }
  function refreshHistoryButtons() {
    const u = $('[data-act="undo"]'), r = $('[data-act="redo"]');
    if (u) u.disabled = !editor || !editor.undo.length;
    if (r) r.disabled = !editor || !editor.redo.length;
    const s = $('#pe-strokes');
    if (s) s.innerHTML = strokeListHTML();
    bindStrokeList();
  }
  function redraw() {
    if (editorPad) editorPad.setOverlay(drawEditor);
    refreshHistoryButtons();
  }

  function strokeListHTML() {
    if (!editor) return '';
    return editor.strokes.map((s, i) =>
      '<span class="pe-stroke' + (i === editor.active ? ' on' : '') + '" data-stroke="' + i + '">' +
      '<b>' + (i + 1) + '.</b> hamle <i>(' + s.length + ' nokta)</i>' +
      '<button type="button" class="pe-x" data-delstroke="' + i + '" title="Bu hamleyi sil">✕</button>' +
      '</span>'
    ).join('');
  }
  function bindStrokeList() {
    $$('[data-stroke]').forEach((b) => b.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-delstroke')) return;
      editor.active = Number(b.dataset.stroke);
      redraw();
    }));
    $$('[data-delstroke]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (editor.strokes.length <= 1) { alert('En az bir hamle kalmalı.'); return; }
      pushHistory();
      editor.strokes.splice(Number(b.dataset.delstroke), 1);
      editor.active = Math.max(0, editor.active - 1);
      redraw();
    }));
  }

  function openEditor(item) {
    if (!item) return;
    if (editorPad) { editorPad.destroy(); editorPad = null; }

    $('#path-editor').innerHTML = [
      '<div class="path-editor">',
      '  <div class="pe-toolbar">',
      '    <span class="pe-modes">',
      [['move', '✥ Taşı'], ['add', '＋ Nokta ekle'], ['ins', '⇱ Araya ekle'],
       ['del', '🗑 Nokta sil'], ['dots', '🟠 Harf noktası'], ['pan', '✋ Kaydır']]
        .map(([k, l], i) => '<button type="button" class="pe-mode' + (i === 0 ? ' on' : '') +
          '" data-mode="' + k + '">' + l + '</button>').join(''),
      '    </span>',
      '  </div>',
      '  <div class="pe-toolbar">',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="undo">↶ Geri al</button>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="redo">↷ Yinele</button>',
      '    <span class="pe-sep"></span>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="zoomout">➖</button>',
      '    <span class="pe-zoom" id="pe-zoom">%100</span>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="zoomin">➕</button>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="zoomreset">⤢ Sığdır</button>',
      '    <span class="pe-sep"></span>',
      '    <label class="pe-check"><input type="checkbox" id="pe-snap"> Mürekkebe yapış</label>',
      '  </div>',
      '  <div class="pe-toolbar pe-sliders">',
      '    <label class="pe-range">Boyanan alan',
      '      <input type="range" id="pe-brush" min="8" max="90" step="1">',
      '      <b id="pe-brush-val"></b>',
      '      <span class="pe-check"><input type="checkbox" id="pe-brush-auto"> varsayılan</span>',
      '    </label>',
      '    <label class="pe-range">Başlangıç halkası (öğrenciye görünen)',
      '      <input type="range" id="pe-marker" min="40" max="220" step="5">',
      '      <b id="pe-marker-val"></b>',
      '    </label>',
      '    <label class="pe-range">Hareket eden kalem ucu',
      '      <input type="range" id="pe-pen" min="20" max="200" step="5">',
      '      <b id="pe-pen-val"></b>',
      '    </label>',
      '    <label class="pe-range">Tutamak boyu',
      '      <input type="range" id="pe-node" min="50" max="200" step="5">',
      '      <b id="pe-node-val"></b>',
      '    </label>',
      '  </div>',
      '  <div class="pe-toolbar">',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="newstroke">＋ Yeni hamle (yeni başlangıç)</button>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="reverse">⇄ Hamleyi ters çevir</button>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="auto">↺ Otomatik yola dön</button>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="preview">▶ Önizle</button>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="persist">💾 Uygulamaya kaydet</button>',
      /* Atölye TEMELDİR: elle yazma oradadır. Burası ince ayar yeridir. */
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="tostudio" ' +
      'title="Bu şekli kendi elinle yeniden yaz — atölye temel, burası ince ayar">' +
      '🎓 Elle yaz (Atölye)</button>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="video">⬇ Video indir</button>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="videoall">⬇⬇ Tüm biçimler</button>',
      '  </div>',
      '  <div class="pe-strokes" id="pe-strokes"></div>',
      '  <div class="canvas-frame"><canvas class="pad" aria-label="Yol düzenleyici"></canvas></div>',
      '  <p class="pe-hint">Her <b>hamle</b> ayrı bir kalem hareketidir — ayrı yazılan harfler için ' +
      '"Yeni hamle" ekle, her hamlenin kendi başlangıcı olur. Yeşil = başlangıç, mor = bitiş. ' +
      '<b>Harf noktası</b> modunda tıkla (varsayılan boy) ya da <b>sol üstten sağ alta sürükleyerek</b> ' +
      'noktanın alanını kendin belirle; var olan noktaya tıklamak onu siler.</p>',
      '  <div class="pe-dots" id="pe-dots"></div>',
      '  <div class="pe-actions">',
      '    <button type="button" class="btn btn-primary" data-act="save">Yolu kaydet</button>',
      '    <button type="button" class="btn btn-ghost" data-act="clearpath">Kaydı sil</button>',
      '    <span class="pe-status" id="pe-status"></span>',
      '  </div>',
      '</div>'
    ].join('');

    const canvas = $('#path-editor canvas.pad');
    editorPad = AH.tracing.create(canvas, {});
    const rule = item.char
      ? AH.letterforms.get(item.char, item.formKey)
      : wordRule(item.ex);
    editorPad.setForm(rule);
    editorPad.setWord(item.glyph);
    editorPad.setGhost(true);
    editorPad.setLocked(true);

    /* mevcut yolu (kayıtlı ya da otomatik) düzenlemeye al */
    const saved = getPath(item.glyph);
    let strokes;
    if (saved && saved.strokes) strokes = saved.strokes.map((s) => s.map((p) => p.slice()));
    else if (saved && saved.path) strokes = [saved.path.map((p) => p.slice())];
    else {
      /* otomatik yol: kelimelerde her bitişik parça ayrı hamledir */
      const parts = editorPad.refParts();
      strokes = parts.length
        ? parts.map((p) => p.path.map((q) => editorPad.toNorm(q)))
        : [editorPad.refPath().map((q) => editorPad.toNorm(q))];
    }
    const dots = saved && saved.dots
      ? saved.dots.map((p) => p.slice())
      : editorPad.refDots().map((q) => {
          const u = editorPad.toNorm(q);
          u.push(+(q.r / editorPad.getLayout().fontSize).toFixed(4) || 0.06);
          return u;
        });

    editor = {
      glyph: item.glyph, item,
      mode: 'move', sel: null, active: 0, snap: false,
      /* brush: boyanan bandın genişliği (font boyu oranı); null = otomatik */
      brush: saved && typeof saved.brush === 'number' ? saved.brush : null,
      strokes, dots, undo: [], redo: []
    };
    status(saved ? 'Kayıtlı özel yol düzenleniyor.' : 'Otomatik yol düzenleniyor (henüz kaydedilmedi).');

    editorPad.setOverlay(drawEditor);
    bindEditorEvents(canvas);
    refreshHistoryButtons();
    renderDotList();

    $$('.pe-mode').forEach((b) => b.addEventListener('click', () => {
      editor.mode = b.dataset.mode;
      $$('.pe-mode').forEach((x) => x.classList.toggle('on', x === b));
      redraw();
    }));
    $('#pe-snap').addEventListener('change', (e) => { editor.snap = e.target.checked; });

    /* --- boyut denetimleri --- */
    const brushEl = $('#pe-brush'), brushAuto = $('#pe-brush-auto'), brushVal = $('#pe-brush-val');
    const autoBrush = () => AH.tracing.DEFAULT_BRUSH;   /* varsayılan %8 */
    function syncBrush() {
      const isAuto = editor.brush == null;
      brushAuto.checked = isAuto;
      brushEl.disabled = isAuto;
      const v = isAuto ? autoBrush() : editor.brush;
      brushEl.value = Math.round(v * 100);
      brushVal.textContent = '%' + Math.round(v * 100) + (isAuto ? ' (varsayılan)' : '');
    }
    brushEl.addEventListener('input', () => {
      editor.brush = Number(brushEl.value) / 100;
      syncBrush();
      redraw();
    });
    brushAuto.addEventListener('change', () => {
      editor.brush = brushAuto.checked ? null : Number(brushEl.value) / 100;
      syncBrush();
      redraw();
    });
    syncBrush();

    const markerEl = $('#pe-marker'), markerVal = $('#pe-marker-val');
    markerEl.value = Math.round(getUI('markerScale', 1) * 100);
    markerVal.textContent = '%' + markerEl.value;
    markerEl.addEventListener('input', () => {
      setUI('markerScale', Number(markerEl.value) / 100);
      markerVal.textContent = '%' + markerEl.value;
      editorPad.setShowStart(true);   /* halkayı canlı göster */
      redraw();
    });

    const penEl = $('#pe-pen'), penVal = $('#pe-pen-val');
    penEl.value = Math.round(getUI('penSize', 1) * 100);
    penVal.textContent = '%' + penEl.value;
    penEl.addEventListener('input', () => {
      setUI('penSize', Number(penEl.value) / 100);
      penVal.textContent = '%' + penEl.value;
      /* canlı görmek için kısa bir önizleme karesi çiz */
      const d = editorPad.buildDemo({ brush: editor.brush });
      if (d) { editorPad.setOverlay(null); d.paint(0.55); }
    });
    penEl.addEventListener('change', () => { editorPad.invalidate(); redraw(); });

    const nodeEl = $('#pe-node'), nodeVal = $('#pe-node-val');
    nodeEl.value = Math.round(getUI('nodeSize', 1) * 100);
    nodeVal.textContent = '%' + nodeEl.value;
    nodeEl.addEventListener('input', () => {
      setUI('nodeSize', Number(nodeEl.value) / 100);
      nodeVal.textContent = '%' + nodeEl.value;
      redraw();
    });

    /* geri al / yinele */
    $('[data-act="undo"]').addEventListener('click', () => {
      if (!editor.undo.length) return;
      editor.redo.push(snapshot());
      restore(editor.undo.pop());
      status('Geri alındı.');
    });
    $('[data-act="redo"]').addEventListener('click', () => {
      if (!editor.redo.length) return;
      editor.undo.push(snapshot());
      restore(editor.redo.pop());
      status('Yinelendi.');
    });

    /* büyüt / küçült / kaydır */
    const setZoom = (z) => {
      const v = editorPad.getView();
      editorPad.setView({ zoom: z, panX: v.panX, panY: v.panY });
      $('#pe-zoom').textContent = '%' + Math.round(z * 100);
      redraw();
    };
    $('[data-act="zoomin"]').addEventListener('click', () => setZoom(Math.min(6, editorPad.getView().zoom * 1.35)));
    $('[data-act="zoomout"]').addEventListener('click', () => setZoom(Math.max(0.5, editorPad.getView().zoom / 1.35)));
    $('[data-act="zoomreset"]').addEventListener('click', () => {
      editorPad.setView({ zoom: 1, panX: 0, panY: 0 });
      $('#pe-zoom').textContent = '%100';
      redraw();
    });

    /* hamleler */
    $('[data-act="newstroke"]').addEventListener('click', () => {
      pushHistory();
      editor.strokes.push([]);
      editor.active = editor.strokes.length - 1;
      editor.mode = 'add';
      $$('.pe-mode').forEach((x) => x.classList.toggle('on', x.dataset.mode === 'add'));
      status('Yeni hamle eklendi — tuvale tıklayarak başlangıcını koy.');
      redraw();
    });
    $('[data-act="reverse"]').addEventListener('click', () => {
      pushHistory();
      editor.strokes[editor.active].reverse();
      status((editor.active + 1) + '. hamlenin yönü ters çevrildi.');
      redraw();
    });
    $('[data-act="auto"]').addEventListener('click', () => {
      if (getPath(item.glyph) &&
          !confirm('Bu harf/kelime için ÇİZDİĞİN yol silinip otomatik yola dönülecek.\n' +
                   'Emin misin?')) return;
      pushHistory();
      clearPath(item.glyph);
      editorPad.invalidate();
      const parts = editorPad.refParts();
      editor.strokes = parts.length
        ? parts.map((p) => p.path.map((q) => editorPad.toNorm(q)))
        : [editorPad.refPath().map((q) => editorPad.toNorm(q))];
      editor.dots = editorPad.refDots().map((q) => {
        const u = editorPad.toNorm(q);
        u.push(+(q.r / editorPad.getLayout().fontSize).toFixed(4) || 0.06);
        return u;
      });
      editor.active = 0;
      status('Otomatik yola dönüldü.');
      redraw();
      renderDotList();
    });
    $('[data-act="preview"]').addEventListener('click', () => {
      const backup = getPath(item.glyph);
      store.paths[item.glyph] = currentRecord();
      editorPad.invalidate();
      editorPad.setOverlay(null);
      editorPad.playDemo({
        duration: 2600,
        brush: editor.brush,
        onDone() {
          if (backup) store.paths[item.glyph] = backup; else delete store.paths[item.glyph];
          editorPad.invalidate();
          editorPad.setOverlay(drawEditor);
        }
      });
    });

    /* Çizilen yolları UYGULAMAYA kalıcı olarak kaydet:
       js/custom-paths.js dosyasının yeni içeriğini üretip indirir. */
    $('[data-act="persist"]').addEventListener('click', () => persistPaths());

    /* Atölyeye geç: aynı sayfadaysak paneli kapatıp oraya döner,
       değilsek atölyeyi bu şekil seçili olarak açar. */
    $('[data-act="tostudio"]').addEventListener('click', () => {
      if (AH.studio && AH.studio.goto) {
        close();
        AH.studio.goto(item.glyph);
        return;
      }
      window.open('studio.html?g=' + encodeURIComponent(item.glyph), '_blank');
    });

    $('[data-act="video"]').addEventListener('click', () => exportVideo(item));

    /* Bu harfin TÜM biçimlerini sırayla dışa aktar */
    $('[data-act="videoall"]').addEventListener('click', async () => {
      if (!item.char) { alert('Bu seçenek yalnızca harfler için geçerlidir.'); return; }
      const L = AH.data.getLetter(item.char);
      const seen = {}, jobs = [];
      ['isolated', 'initial', 'medial', 'final'].forEach((k) => {
        const g = L.forms[k];
        if (seen[g]) return;
        seen[g] = 1;
        jobs.push({ glyph: g, char: item.char, formKey: k, kind: 'harf' });
      });
      if (!confirm(L.name + ' harfinin ' + jobs.length + ' biçimi için video oluşturulacak. Devam?')) return;
      for (const j of jobs) {
        status('🎬 ' + j.glyph + ' kaydediliyor…');
        await exportVideo(j, true);
      }
      status('✅ ' + jobs.length + ' video indirildi.');
    });

    /* Yazı tipi değişmiş mi? Kaydedilen yol başka bir yazı tipiyle çizildiyse uyar. */
    (function () {
      const rec2 = getPath(item.glyph);
      if (rec2 && rec2.font && AH.tracing.fontFingerprint &&
          rec2.font !== AH.tracing.fontFingerprint()) {
        status('⚠ Bu yol BAŞKA bir yazı tipiyle çizilmiş — şekil kaymış olabilir. ' +
               'Bkz. fonts/README-FONT.md');
      }
    })();

    $('[data-act="save"]').addEventListener('click', () => {
      const rec = currentRecord();
      if (!rec.strokes.length) { alert('En az bir hamle, en az 2 nokta içermeli.'); return; }
      setPath(item.glyph, rec);
      editorPad.invalidate();
      editorPad.setOverlay(drawEditor);
      status('✅ Kaydedildi (' + rec.strokes.length + ' hamle, ' + rec.dots.length + ' nokta).');
    });
    $('[data-act="clearpath"]').addEventListener('click', () => {
      if (!getPath(item.glyph)) { status('Zaten kayıtlı özel yol yok.'); return; }
      if (!confirm('Bu harf/kelime için kaydettiğin yol silinecek. Emin misin?')) return;
      const wasBuiltIn = isBuiltIn(item.glyph);
      clearPath(item.glyph);
      editorPad.invalidate();
      const parts = editorPad.refParts();
      editor.strokes = parts.length
        ? parts.map((p) => p.path.map((q) => editorPad.toNorm(q)))
        : [editorPad.refPath().map((q) => editorPad.toNorm(q))];
      editor.dots = editorPad.refDots().map((q) => {
        const u = editorPad.toNorm(q);
        u.push(+(q.r / editorPad.getLayout().fontSize).toFixed(4) || 0.06);
        return u;
      });
      editor.active = 0;
      redraw(); renderDotList();
      status(wasBuiltIn
        ? 'Tarayıcı kaydı silindi; uygulamaya gömülü yol hâlâ geçerli ' +
          '(kalıcı silmek için js/custom-paths.js düzenlenmeli).'
        : 'Kayıt silindi, otomatik yola dönüldü.');
    });
  }

  /* ------------------------------------------------------------------ */
  /* YOLLARI UYGULAMAYA KALICI KAYDETME                                  */
  /* js/custom-paths.js dosyasının yeni içeriğini üretir.                */
  /* ------------------------------------------------------------------ */
  /** js/custom-paths.js dosyasının METNİ (indirme ve diske yazma ortak kullanır). */
  function pathsFileText() {
    const paths = allPaths();
    const keys = Object.keys(paths);
    if (!keys.length) return null;

    const body = keys.map((k) =>
      '    ' + JSON.stringify(k) + ': ' + JSON.stringify(paths[k])
    ).join(',\n');

    const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return [
      '/* =========================================================================',
      '   custom-paths.js — YÖNETİCİNİN ÇİZDİĞİ, UYGULAMAYA KALICI OLARAK',
      '   KAYDEDİLMİŞ YAZIM YOLLARI',
      '',
      '   Bu dosya yönetici panelindeki "💾 Uygulamaya kaydet" düğmesi ile',
      '   üretilmiştir. Elle düzenlenmesi gerekmez.',
      '',
      '   ⚠ KURAL: İçeriği, yöneticinin AÇIK ONAYI olmadan değiştirilmez.',
      '   Müfredat/veri güncellemeleri bu yolları ETKİLEMEZ.',
      '',
      '   Üretim zamanı : ' + stamp,
      '   Yol sayısı    : ' + keys.length,
      '   Yazı tipi izi : ' + (AH.tracing.fontFingerprint ? AH.tracing.fontFingerprint() : '-'),
      '   ========================================================================= */',
      "(function () {",
      "  'use strict';",
      '  const AH = (window.AH = window.AH || {});',
      '',
      '  AH.customPaths = {',
      body,
      '  };',
      '',
      '  AH.customPathsMeta = {',
      '    savedAt: ' + JSON.stringify(stamp) + ',',
      '    count: ' + keys.length,
      '  };',
      '})();',
      ''
    ].join('\n');
  }

  function persistPaths(quiet) {
    const file = pathsFileText();
    if (!file) {
      if (!quiet) alert('Kaydedilecek özel yol yok.');
      return 0;
    }
    const n = Object.keys(allPaths()).length;
    downloadText(file, 'custom-paths.js', 'text/javascript');

    if (quiet) return n;

    status('💾 ' + n + ' yol "custom-paths.js" olarak indirildi — ' +
           'dosyayı js/ klasöründeki ile değiştir.');
    alert('İndirilen "custom-paths.js" dosyasını projedeki js/custom-paths.js ile ' +
          'değiştir ve siteye yükle (GitHub’a push et).\n\nBöylece çizimlerin başka ' +
          'tarayıcıda/cihazda da görünür, tarayıcı verisi silinse bile kaybolmaz.');
    return n;
  }

  /* ------------------------------------------------------------------ */
  /* VİDEO DIŞA AKTARIMI (yalnızca yönetici sayfasında)                  */
  /* Kareler elle çizilir ve MediaRecorder ile .webm olarak kaydedilir.  */
  /* rAF'a bağlı olmadığı için sekme arka planda olsa da doğru çalışır.  */
  /* ------------------------------------------------------------------ */
  function pickMime() {
    const cands = [
      'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'
    ];
    for (const m of cands) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
    }
    return null;
  }

  function safeName(s) {
    return String(s).replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'harf';
  }

  async function exportVideo(item) {
    if (!window.MediaRecorder) {
      alert('Bu tarayıcı video kaydını desteklemiyor (MediaRecorder yok).');
      return;
    }
    const mime = pickMime();
    if (!mime) { alert('Uygun video biçimi bulunamadı.'); return; }

    const btn = $('[data-act="video"]');
    const oldLabel = btn.textContent;
    btn.disabled = true;

    /* Kayıt tuvali EKRANDA görünür olmalı: tarayıcılar görünmeyen tuvalden
       kare yakalamayabiliyor (boş video çıkıyordu). Bu yüzden kaydı bir
       önizleme penceresinde gösteriyoruz. */
    const W = 800, H = 450;
    const host = document.createElement('div');
    host.className = 'video-capture';
    host.innerHTML = '<div class="vc-box"><p class="vc-title">🎬 Video kaydediliyor…</p>' +
      '<p class="vc-note">Pencereyi kapatma ve sekmeyi arka plana alma.</p></div>';
    const cv = document.createElement('canvas');
    cv.style.cssText = 'display:block;width:' + W + 'px;height:' + H + 'px;max-width:100%;' +
      'border-radius:12px;border:1px solid #e2e8f0;background:#fff;';
    host.querySelector('.vc-box').insertBefore(cv, host.querySelector('.vc-note'));
    document.body.appendChild(host);

    const pad = AH.tracing.create(cv, {});
    const rule = item.char ? AH.letterforms.get(item.char, item.formKey) : wordRule(item.ex);
    pad.setForm(rule);
    pad.setWord(item.glyph);
    pad.setGhost(true);
    pad.setLocked(true);

    /* Düzenlenen glif ise ekrandaki (kaydedilmemiş) yolu kullan;
       toplu dışa aktarımda ise o glifin kayıtlı/otomatik yolu geçerlidir. */
    const useEditor = !!editor && editor.glyph === item.glyph;
    const backup = getPath(item.glyph);
    if (useEditor) store.paths[item.glyph] = currentRecord();
    pad.invalidate();

    const FPS = 30;
    const seconds = 3.2;
    const holdFrames = Math.round(FPS * 1.0);
    const frames = Math.round(FPS * seconds);
    let rec = null, url = null;

    try {
      const demo = pad.buildDemo({
        brush: useEditor ? editor.brush : (backup ? backup.brush : undefined)
      });
      if (!demo) throw new Error('Bu harf için çizilecek yol yok.');

      const stream = cv.captureStream(0);        /* kareleri biz tetikleriz */
      const track = stream.getVideoTracks()[0];
      const chunks = [];
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5000000 });
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

      const done = new Promise((res) => { rec.onstop = res; });
      rec.start(120);                            /* periyodik veri akışı */

      const title = host.querySelector('.vc-title');
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i <= frames; i++) {
        demo.paint(i / frames);
        if (track.requestFrame) track.requestFrame();
        else if (stream.requestFrame) stream.requestFrame();
        const pct = Math.round((i / frames) * 100);
        btn.textContent = '⏺ %' + pct;
        title.textContent = '🎬 Video kaydediliyor… %' + pct;
        await wait(1000 / FPS);
      }
      /* bitişte biraz beklet ki son hâli görünsün */
      for (let i = 0; i < holdFrames; i++) {
        demo.paint(1);
        if (track.requestFrame) track.requestFrame();
        await wait(1000 / FPS);
      }

      rec.stop();
      await done;

      const blob = new Blob(chunks, { type: mime });
      /* Tarayıcı kare yakalayamadıysa dosya birkaç yüz bayt kalır;
         bozuk dosya indirmek yerine durumu açıkça söyle. */
      if (blob.size < 2048) {
        throw new Error('Tarayıcı kare yakalayamadı (dosya boş çıktı). ' +
          'Sekmeyi ön planda tutup tekrar dene.');
      }
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (item.char ? 'harf-' + safeName(item.char) + '-' + safeName(item.formKey)
                              : 'kelime-' + safeName(item.glyph)) + '.webm';
      document.body.appendChild(a);
      a.click();
      a.remove();
      status('✅ Video indirildi: ' + a.download + ' (' + Math.round(blob.size / 1024) + ' KB)');
    } catch (e) {
      alert('Video oluşturulamadı: ' + e.message);
      status('Video oluşturulamadı.');
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 10000);
      if (useEditor) { if (backup) store.paths[item.glyph] = backup; else delete store.paths[item.glyph]; }
      pad.destroy();
      host.remove();
      btn.disabled = false;
      btn.textContent = oldLabel;
      if (editorPad) { editorPad.invalidate(); editorPad.setOverlay(drawEditor); }
    }
  }

  function currentRecord() {
    const rec = {
      strokes: editor.strokes.filter((s) => s.length > 1).map((s) => s.map((p) => p.slice())),
      dots: editor.dots.map((p) => p.slice())
    };
    if (typeof editor.brush === 'number') rec.brush = editor.brush;
    /* Yolun hangi yazı tipiyle çizildiğini sakla — sonra değişirse uyaralım */
    if (AH.tracing.fontFingerprint) rec.font = AH.tracing.fontFingerprint();
    /* Harfin O ANKİ mürekkep kutusu: telefonda başka yazı tipi varsa yol
       bu kutuya göre yeniden hizalanır (bkz. tracing.js → inkRemap). */
    if (editorPad && editorPad.inkNorm) {
      const ink = editorPad.inkNorm();
      if (ink) rec.ink = ink;
    }
    return rec;
  }

  /* Harf noktaları listesi — tek tek silinebilir */
  function renderDotList() {
    const host = $('#pe-dots');
    if (!host || !editor) return;
    host.innerHTML = editor.dots.length
      ? '<span class="pe-dots-label">Harf noktaları:</span>' + editor.dots.map((d, i) =>
          '<span class="pe-dot-item' + (editor.sel && editor.sel.type === 'dot' && editor.sel.i === i ? ' on' : '') +
          '" data-dot="' + i + '">#' + (i + 1) +
          ' <i>ø' + Math.round((d[2] || 0.06) * 100) + '</i>' +
          '<button type="button" class="pe-x" data-deldot="' + i + '" title="Bu noktayı sil">✕</button></span>'
        ).join('')
      : '<span class="pe-dots-label">Harf noktası yok.</span>';
    $$('[data-deldot]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      pushHistory();
      editor.dots.splice(Number(b.dataset.deldot), 1);
      editor.sel = null;
      redraw();
      renderDotList();
      status('Nokta silindi.');
    }));
    $$('[data-dot]').forEach((b) => b.addEventListener('click', () => {
      editor.sel = { type: 'dot', i: Number(b.dataset.dot) };
      redraw();
      renderDotList();
    }));
  }

  function wordRule(ex) {
    let startRule = 'right';
    if (ex && ex.equation && ex.equation.length) {
      const info = AH.letterforms.parseFragment(ex.equation[0]);
      const f = AH.letterforms.get(info.char, info.formKey);
      if (f) startRule = f.startRule;
    }
    return { isWord: true, startRule, dots: { count: ex ? AH.data.dotsInWord(ex.result) : 0 } };
  }

  function status(t) { const el = $('#pe-status'); if (el) el.textContent = t; }

  /* --- düzenleyici çizimi --- */
  const STROKE_COLORS = ['#4f46e5', '#0891b2', '#c026d3', '#ea580c', '#65a30d', '#be123c'];

  function drawEditor(ctx) {
    if (!editor || !editorPad) return;
    const L = editorPad.getLayout();
    const ns = getUI('nodeSize', 1);

    /* BOYANAN ALAN önizlemesi: animasyonda harfi açan bandın gerçek genişliği.
       Böylece "çok geniş boyuyor" durumunu görüp ayarlayabilirsin. */
    const brushW = (typeof editor.brush === 'number' && editor.brush > 0)
      ? editor.brush * L.fontSize
      : editorPad.refBrush();
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushW;
    editor.strokes.forEach((st) => {
      if (st.length < 2) return;
      const pts = st.map((u) => editorPad.fromNorm(u));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    });
    ctx.restore();

    editor.strokes.forEach((st, si) => {
      const pts = st.map((u) => editorPad.fromNorm(u));
      const col = STROKE_COLORS[si % STROKE_COLORS.length];
      const isActive = si === editor.active;

      if (pts.length > 1) {
        ctx.save();
        ctx.globalAlpha = isActive ? 1 : 0.45;
        ctx.strokeStyle = col;
        ctx.lineWidth = isActive ? 2.5 : 1.8;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        /* yön okları */
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          if (Math.hypot(b.x - a.x, b.y - a.y) < 14) continue;
          const ang = Math.atan2(b.y - a.y, b.x - a.x);
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(mx - Math.cos(ang - 0.45) * 9, my - Math.sin(ang - 0.45) * 9);
          ctx.lineTo(mx - Math.cos(ang + 0.45) * 9, my - Math.sin(ang + 0.45) * 9);
          ctx.closePath();
          ctx.fillStyle = col;
          ctx.fill();
        }
        ctx.restore();
      }

      pts.forEach((p, i) => {
        const first = i === 0, last = i === pts.length - 1 && pts.length > 1;
        const selected = editor.sel && editor.sel.type === 'node' &&
                         editor.sel.si === si && editor.sel.i === i;
        const rad = (selected ? 10 : first ? 9 : 6.5) * ns;
        ctx.save();
        ctx.globalAlpha = isActive ? 1 : 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = first ? '#059669' : last ? '#6366f1' : '#fff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = selected ? '#dc2626' : col;
        ctx.stroke();
        if (first) {
          /* hamle numarası = kaçıncı başlangıç */
          ctx.fillStyle = '#fff';
          ctx.font = 'bold ' + Math.round(11 * ns) + 'px "Segoe UI",sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(si + 1), p.x, p.y);
        }
        ctx.restore();
      });
    });

    /* harf noktaları — kendi yarıçapıyla */
    editor.dots.forEach((u, i) => {
      const p = editorPad.fromNorm(u);
      const r = Math.max(5, (u[2] || 0.06) * L.fontSize);
      const sel = editor.sel && editor.sel.type === 'dot' && editor.sel.i === i;
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(217,119,6,0.22)';
      ctx.fill();
      ctx.lineWidth = sel ? 3 : 2;
      ctx.strokeStyle = sel ? '#dc2626' : '#d97706';
      ctx.stroke();
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 10px "Segoe UI",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), p.x, p.y);
      ctx.restore();
    });

    /* nokta alanı sürüklenirken önizleme kutusu */
    if (editor.dotBox) {
      const b = editor.dotBox;
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1),
                     Math.abs(b.x1 - b.x0), Math.abs(b.y1 - b.y0));
      ctx.restore();
    }
  }

  function bindEditorEvents(canvas) {
    let drag = null;          /* {type:'node'|'dot'|'pan', …} */

    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    /* Mürekkebe yapış: konulan noktayı harfin en yakın mürekkep pikseline çeker */
    function snapPoint(p) {
      if (!editor.snap) return p;
      const m = editorPad.glyphMask();
      const on = (x, y) => {
        x = Math.round(x); y = Math.round(y);
        return x >= 0 && y >= 0 && x < m.w && y < m.h && m.data[(y * m.w + x) * 4 + 3] > 40;
      };
      if (on(p.x, p.y)) return p;
      for (let r = 2; r <= 40; r += 2) {
        for (let a = 0; a < 360; a += 10) {
          const nx = p.x + Math.cos(a * Math.PI / 180) * r;
          const ny = p.y + Math.sin(a * Math.PI / 180) * r;
          if (on(nx, ny)) return { x: nx, y: ny };
        }
      }
      return p;
    }

    const hitNode = (p) => {
      for (let si = 0; si < editor.strokes.length; si++) {
        const st = editor.strokes[si];
        for (let i = 0; i < st.length; i++) {
          const q = editorPad.fromNorm(st[i]);
          if (Math.hypot(q.x - p.x, q.y - p.y) <= 12) return { si, i };
        }
      }
      return null;
    };
    const hitDot = (p) => {
      const L = editorPad.getLayout();
      for (let i = 0; i < editor.dots.length; i++) {
        const u = editor.dots[i];
        const q = editorPad.fromNorm(u);
        const r = Math.max(8, (u[2] || 0.06) * L.fontSize);
        if (Math.hypot(q.x - p.x, q.y - p.y) <= r) return i;
      }
      return -1;
    };
    /* En yakın kenarı bul (araya nokta eklemek için) */
    const hitSegment = (p) => {
      let best = null, bd = 14;
      editor.strokes.forEach((st, si) => {
        for (let i = 1; i < st.length; i++) {
          const a = editorPad.fromNorm(st[i - 1]), b = editorPad.fromNorm(st[i]);
          const vx = b.x - a.x, vy = b.y - a.y;
          const L2 = vx * vx + vy * vy || 1;
          let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2;
          t = Math.max(0, Math.min(1, t));
          const d = Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
          if (d < bd) { bd = d; best = { si, i }; }
        }
      });
      return best;
    };

    canvas.addEventListener('pointerdown', (e) => {
      if (!editor) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      const p = pos(e);

      if (editor.mode === 'pan') {
        const v = editorPad.getView();
        drag = { type: 'pan', x0: e.clientX, y0: e.clientY, px: v.panX, py: v.panY };
        return;
      }

      if (editor.mode === 'dots') {
        const d = hitDot(p);
        if (d >= 0) {                       /* var olan noktaya tıklama → sil */
          pushHistory();
          editor.dots.splice(d, 1);
          editor.sel = null;
          redraw(); renderDotList();
          status('Nokta silindi.');
          return;
        }
        drag = { type: 'dotbox', x0: p.x, y0: p.y };
        editor.dotBox = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
        redraw();
        return;
      }

      const n = hitNode(p);

      if (editor.mode === 'del') {
        if (n) {
          pushHistory();
          editor.strokes[n.si].splice(n.i, 1);
          if (!editor.strokes[n.si].length && editor.strokes.length > 1) {
            editor.strokes.splice(n.si, 1);
            editor.active = Math.max(0, editor.active - 1);
          }
          editor.sel = null;
          redraw();
        }
        return;
      }

      if (editor.mode === 'ins') {
        const s = hitSegment(p);
        if (s) {
          pushHistory();
          editor.strokes[s.si].splice(s.i, 0, editorPad.toNorm(snapPoint(p)));
          editor.active = s.si;
          editor.sel = { type: 'node', si: s.si, i: s.i };
          redraw();
          status('Araya nokta eklendi.');
        } else {
          status('Araya eklemek için bir çizgi parçasının üstüne tıkla.');
        }
        return;
      }

      if (editor.mode === 'add') {
        if (n) { drag = { type: 'node', si: n.si, i: n.i }; editor.sel = { type: 'node', si: n.si, i: n.i }; }
        else {
          pushHistory();
          const st = editor.strokes[editor.active] || (editor.strokes[editor.active] = []);
          st.push(editorPad.toNorm(snapPoint(p)));
          editor.sel = { type: 'node', si: editor.active, i: st.length - 1 };
        }
        redraw();
        return;
      }

      /* move */
      if (n) {
        drag = { type: 'node', si: n.si, i: n.i };
        editor.active = n.si;
        editor.sel = { type: 'node', si: n.si, i: n.i };
        pushHistory();
        redraw();
        return;
      }
      const d = hitDot(p);
      if (d >= 0) {
        drag = { type: 'dot', i: d };
        editor.sel = { type: 'dot', i: d };
        pushHistory();
        redraw(); renderDotList();
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!drag || !editor) return;
      e.preventDefault();
      const p = pos(e);
      if (drag.type === 'pan') {
        editorPad.setView({
          zoom: editorPad.getView().zoom,
          panX: drag.px + (e.clientX - drag.x0),
          panY: drag.py + (e.clientY - drag.y0)
        });
        redraw();
        return;
      }
      if (drag.type === 'dotbox') {
        editor.dotBox.x1 = p.x;
        editor.dotBox.y1 = p.y;
        redraw();
        return;
      }
      if (drag.type === 'node') {
        editor.strokes[drag.si][drag.i] = editorPad.toNorm(snapPoint(p));
        redraw();
        return;
      }
      if (drag.type === 'dot') {
        const keep = editor.dots[drag.i][2];
        const u = editorPad.toNorm(p);
        u.push(keep);
        editor.dots[drag.i] = u;
        redraw();
      }
    });

    const stop = () => {
      if (drag && drag.type === 'dotbox' && editor.dotBox) {
        const b = editor.dotBox;
        const w = Math.abs(b.x1 - b.x0), h = Math.abs(b.y1 - b.y0);
        const L = editorPad.getLayout();
        pushHistory();
        if (w < 6 && h < 6) {
          /* tıklama: varsayılan boy */
          const u = editorPad.toNorm({ x: b.x0, y: b.y0 });
          u.push(0.06);
          editor.dots.push(u);
        } else {
          /* sol üstten sağ alta sürükleme: alanı sen belirledin */
          const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
          const u = editorPad.toNorm({ x: cx, y: cy });
          u.push(+Math.max(0.02, Math.min(w, h) / 2 / L.fontSize).toFixed(4));
          editor.dots.push(u);
        }
        editor.dotBox = null;
        redraw(); renderDotList();
        status('Nokta eklendi.');
      }
      drag = null;
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('pointerleave', () => { if (drag && drag.type !== 'dotbox') drag = null; });
  }

  /* SES KAYDI sekmesi js/admin-audio.js dosyasına taşındı.
     Buradaki köprüler, panelin ve dosya üreticisinin onu görmesini sağlar. */
  function renderAudio() {
    if (AH.adminAudio) return AH.adminAudio.render();
    $('#admin-body').innerHTML = '<div class="admin-pane"><p>Ses modülü ' +
      '(js/admin-audio.js) yüklenmemiş.</p></div>';
  }
  function audioFileText() {
    return AH.adminAudio ? AH.adminAudio.fileText() : Promise.resolve(null);
  }
  function persistAudio() {
    return AH.adminAudio ? AH.adminAudio.persist() : Promise.resolve(0);
  }
  /* ------------------------------------------------------------------ */
  /* İÇERİK DEĞİŞİKLİKLERİNİ UYGULAMAYA GÖMME                            */
  /* js/custom-data.js dosyasının yeni içeriğini üretir.                 */
  /* ------------------------------------------------------------------ */
  /** js/custom-data.js dosyasının METNİ. */
  function dataFileText() {
    const M = mergedStore();
    const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return [
      '/* =========================================================================',
      '   custom-data.js — YÖNETİCİNİN YAPTIĞI, UYGULAMAYA KALICI OLARAK',
      '   GÖMÜLMÜŞ İÇERİK DEĞİŞİKLİKLERİ',
      '',
      '   Bu dosya yönetici panelindeki "İçerik değişikliklerini göm" düğmesi ile',
      '   üretilmiştir. Elle düzenlenmesi gerekmez.',
      '',
      '   ⚠ KURAL: İçeriği, yöneticinin AÇIK ONAYI olmadan değiştirilmez.',
      '',
      '   Üretim zamanı    : ' + stamp,
      '   Düzenlenen harf  : ' + Object.keys(M.letters).length,
      '   Düzenlenen kelime: ' + Object.keys(M.exercises).length,
      '   Eklenen kelime   : ' + M.added.length,
      '   Silinen kelime   : ' + M.deleted.length,
      '   (Üslup imzaları ayrı dosyadadır: js/custom-learn.js)',
      '   ========================================================================= */',
      '(function () {',
      "  'use strict';",
      '  const AH = (window.AH = window.AH || {});',
      '',
      '  AH.customData = {',
      '    letters: ' + JSON.stringify(M.letters) + ',',
      '    exercises: ' + JSON.stringify(M.exercises) + ',',
      '    added: ' + JSON.stringify(M.added) + ',',
      '    deleted: ' + JSON.stringify(M.deleted) + ',',
      '    ui: ' + JSON.stringify(M.ui) + ',',
      '    auditOk: ' + JSON.stringify(M.auditOk || {}) + '',
      '  };',
      '',
      '  AH.customDataMeta = {',
      '    savedAt: ' + JSON.stringify(stamp),
      '  };',
      '})();',
      ''
    ].join('\n');
  }

  function persistData() {
    downloadText(dataFileText(), 'custom-data.js', 'text/javascript');
    return true;
  }

  /**
   * js/custom-learn.js — Öğretme Atölyesi'nin ÜSLUP İMZALARI.
   * Ayrı dosyadır: öğrenci sayfası bunu yüklemez (~85 KB kazanç).
   */
  function learnFileText() {
    const M = mergedStore();
    const keys = Object.keys(M.learned || {});
    const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const body = keys.map((k) =>
      '    ' + JSON.stringify(k) + ': ' + JSON.stringify(M.learned[k])
    ).join(',\n');
    return [
      '/* =========================================================================',
      '   custom-learn.js — ÖĞRETME ATÖLYESİNDE ÖĞRENİLEN ÜSLUP İMZALARI',
      '',
      '   Öğretmenin el yazısından çıkarılan kurallar (başlangıç ucu, yön,',
      '   hamle bölünmesi, nokta ve kalem ölçüsü). Yeni harf öğretilirken',
      '   yeniden kullanılır.',
      '',
      '   ⚠ Bu dosyayı YALNIZ studio.html yükler — öğrenci sayfasına girmez.',
      '   ⚠ İçeriği, yöneticinin AÇIK ONAYI olmadan değiştirilmez.',
      '',
      '   Üretim zamanı : ' + stamp,
      '   İmza sayısı   : ' + keys.length,
      '   ========================================================================= */',
      '(function () {',
      "  'use strict';",
      '  const AH = (window.AH = window.AH || {});',
      '',
      '  AH.customLearn = {',
      '    savedAt: ' + JSON.stringify(stamp) + ',',
      '    learned: {',
      body,
      '    }',
      '  };',
      '})();',
      ''
    ].join('\n');
  }

  function persistLearn() {
    downloadText(learnFileText(), 'custom-learn.js', 'text/javascript');
    return true;
  }

  function downloadText(text, name, mime) {
    const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }

  /* ------------------------------------------------------------------ */
  /* 💾 KALICI KAYIT SEKMESİ                                             */
  /* Tarayıcıya bağlı olan her şeyi uygulama dosyalarına çevirir.        */
  /* ------------------------------------------------------------------ */
  function renderPersist() {
    const au = (AH.audio && AH.audio.supported)
      ? AH.audio.stats()
      : { local: 0, app: 0, onlyLocal: 0 };
    const pend = pendingCount();                       /* tarayıcıdaki yollar */
    const embedded = AH.customPaths ? Object.keys(AH.customPaths).length : 0;
    const dataPend = Object.keys(store.letters).length + Object.keys(store.exercises).length +
      store.added.length + store.deleted.length;
    const waiting = pend + au.onlyLocal + dataPend;

    const pathsAt = (AH.customPathsMeta && AH.customPathsMeta.savedAt) || '—';
    const audioAt = (AH.customAudioMeta && AH.customAudioMeta.savedAt) || '—';
    const dataAt = (AH.customDataMeta && AH.customDataMeta.savedAt) || '—';

    $('#admin-body').innerHTML = [
      '<div class="admin-pane">',
      '  <h3>Neden gerekli?</h3>',
      '  <p>Yönetici panelinde yaptığın her değişiklik önce <b>bu tarayıcının hafızasına</b> ' +
      'yazılır. Tarayıcı hafızası kişiye ve tarayıcıya özeldir: başka bir tarayıcıda, başka ' +
      'bir bilgisayarda ya da öğrencinin tabletinde <b>görünmez</b>; tarayıcı verisi ' +
      'temizlenirse de silinir.</p>',
      '  <p>Kalıcı olması için değişikliklerin <b>uygulamanın dosyalarına</b> yazılması gerekir. ' +
      'Aşağıdaki düğmeler tam olarak bunu yapar: hazır dosyaları üretip indirir, sen de ' +
      'bunları projedeki <code>js/</code> klasörüne kopyalayıp siteye yüklersin.</p>',

      waiting
        ? '  <p class="admin-warn">⚠ Şu an <b>' + waiting + '</b> değişiklik yalnızca bu ' +
          'tarayıcıda duruyor ve kalıcı değil.</p>'
        : '  <p class="admin-ok">✅ Bekleyen değişiklik yok — her şey uygulamaya gömülü.</p>',

      '  <table class="admin-table persist-table">',
      '    <thead><tr><th>Ne</th><th>📦 Uygulamada</th><th>💾 Tarayıcıda (kalıcı değil)</th>' +
      '<th>Son gömme</th></tr></thead>',
      '    <tbody>',
      '      <tr><td>Çizim yolları</td><td>' + embedded + '</td><td>' + pend + '</td><td>' +
      esc(pathsAt) + '</td></tr>',
      '      <tr><td>Sesler</td><td>' + au.app + '</td><td>' + au.onlyLocal + '</td><td>' +
      esc(audioAt) + '</td></tr>',
      '      <tr><td>İçerik (harf/kelime)</td><td>' +
      (Object.keys(base().letters).length + Object.keys(base().exercises).length +
       base().added.length + base().deleted.length) +
      '</td><td>' + dataPend + '</td><td>' + esc(dataAt) + '</td></tr>',
      '      <tr><td>Öğrenilen üslup 🎓</td><td>' + Object.keys(base().learned).length +
      '</td><td>' + Math.max(0, Object.keys(learnedLocal()).length -
        Object.keys(base().learned).length) + '</td><td>' + esc(dataAt) + '</td></tr>',
      '    </tbody>',
      '  </table>',

      '  <h3>🕘 Güvenlik ağı — otomatik yedekler</h3>',
      '  <p>Toplu her işlemden <b>önce</b> deponun fotoğrafı çekilir (son ' +
      (AH.backup ? AH.backup.KEEP : 10) + '). Yanlış bir "hepsine uygula" ' +
      'geri alınabilir. Geri yüklemeden önce mevcut hâlin de fotoğrafı çekilir.</p>',
      '  <div class="admin-actions">',
      '    <button type="button" class="btn btn-ghost btn-sm" data-bk="now">📸 ' +
      'Şimdi yedek al</button>',
      '  </div>',
      '  <div id="bk-list" class="bk-list"></div>',

      '  <h3>🔗 En kolay yol: proje klasörünü bağla</h3>',
      '  <p>Klasörü bir kez seçersen değişiklikler <b>doğrudan js/ klasöründeki ' +
      'dosyalara yazılır</b> — indirip elle kopyalamana gerek kalmaz. Geriye yalnızca ' +
      'GitHub’a <b>push</b> etmek kalır. (Chrome/Edge masaüstü)</p>',
      '  <div class="admin-actions" id="pf-box"></div>',
      '  <p id="pf-msg" class="admin-status"></p>',

      '  <h3>1) Dosyaları üret</h3>',
      '  <div class="admin-actions">',
      '    <button type="button" class="btn btn-primary" data-act="all">⬇ Hepsini indir ' +
      '(4 dosya)</button>',
      '    <button type="button" class="btn btn-ghost" data-act="p-paths">✒️ Yalnız çizim ' +
      'yolları</button>',
      '    <button type="button" class="btn btn-ghost" data-act="p-audio">🔊 Yalnız ' +
      'sesler</button>',
      '    <button type="button" class="btn btn-ghost" data-act="p-data">📝 Yalnız ' +
      'içerik</button>',
      '  </div>',
      '  <p id="p-status" class="admin-status"></p>',

      '  <h3>2) İndirilen dosyaları yerine koy</h3>',
      '  <ol class="persist-steps">',
      '    <li>İnen <code>custom-paths.js</code>, <code>custom-audio.js</code> ve ' +
      '<code>custom-data.js</code> dosyalarını projedeki <code>js/</code> klasöründe ' +
      '<b>aynı adlı dosyaların üzerine</b> kopyala.</li>',
      '    <li>Siteyi yayınladığın yere yükle (GitHub Pages kullanıyorsan bu üç dosyayı ' +
      'commit edip <b>push</b> et).</li>',
      '    <li>Yayın güncellendikten sonra sayfayı <b>Ctrl + F5</b> ile yenile.</li>',
      '    <li>Artık değişiklikler her tarayıcıda, her cihazda ve tarayıcı verisi silinse ' +
      'bile durur.</li>',
      '  </ol>',
      '  <p class="admin-note">GitHub’da dosyayı açıp kalem (✏️) simgesine basarak içeriği ' +
      'yapıştırmak da olur; ama sesler çok uzun olduğu için <b>dosyayı sürükleyip yüklemek</b> ' +
      '(Add file → Upload files) daha kolaydır.</p>',

      '  <h3>Cihazlar arası hızlı aktarım (site güncellemeden)</h3>',
      '  <p>Sadece başka bir tarayıcıda denemek istiyorsan, her şeyi tek bir yedek dosyasına ' +
      'alıp orada geri yükleyebilirsin. <b>Sesler dâhildir.</b></p>',
      '  <div class="admin-actions">',
      '    <button type="button" class="btn btn-ghost" data-act="full-out">⬇ Tam yedek ' +
      '(.json, sesler dâhil)</button>',
      '    <label class="btn btn-ghost file-btn">⬆ Tam yedeği yükle' +
      '      <input type="file" id="full-in" accept="application/json,.json" hidden></label>',
      '  </div>',
      '</div>'
    ].join('');

    const st = (msg) => { $('#p-status').textContent = msg; };

    /* ---- otomatik yedekler ---- */
    function renderBackups() {
      const host = $('#bk-list');
      if (!host || !AH.backup) return;
      AH.backup.list().then((all) => {
        if (!all.length) {
          host.innerHTML = '<p class="admin-note">Henüz yedek yok — ilk toplu ' +
            'işlemde kendiliğinden alınır.</p>';
          return;
        }
        host.innerHTML = all.map((b) =>
          '<div class="bk-row">' +
          '<span class="bk-when">' + esc(AH.backup.when(b.at)) + '</span>' +
          '<span class="bk-why">' + esc(b.reason) + '</span>' +
          '<span class="bk-counts">' + b.counts.paths + ' yol · ' +
          b.counts.learned + ' üslup</span>' +
          '<button type="button" class="mini" data-bk-restore="' + b.id + '">↩ Geri yükle</button>' +
          '<button type="button" class="mini danger" data-bk-del="' + b.id + '">✕</button>' +
          '</div>').join('');
        $$('[data-bk-restore]', host).forEach((btn) => btn.addEventListener('click', () => {
          const b = all.filter((x) => String(x.id) === btn.dataset.bkRestore)[0];
          if (!confirm('“' + AH.backup.when(b.at) + ' · ' + b.reason + '” yedeğine ' +
              'dönülecek (' + b.counts.paths + ' yol). Şu anki hâlin de yedeklenir. Devam?')) return;
          AH.backup.restore(b.id)
            .then(() => { alert('Geri yüklendi. Sayfa yenilenecek.'); location.reload(); })
            .catch((e) => alert('Geri yüklenemedi: ' + e.message));
        }));
        $$('[data-bk-del]', host).forEach((btn) => btn.addEventListener('click', () => {
          if (!confirm('Bu yedek silinsin mi?')) return;
          AH.backup.remove(btn.dataset.bkDel).then(renderBackups);
        }));
      });
    }
    const bkNow = $('[data-bk="now"]');
    if (bkNow) bkNow.addEventListener('click', () => {
      AH.backup.snapshot('elle alındı').then((r) => {
        if (!r) { alert('Yedeklenecek bir değişiklik yok.'); return; }
        renderBackups();
      });
    });
    renderBackups();

    /* ---- proje klasörü (doğrudan dosyaya yazma) ---- */
    function renderPF() {
      const box = $('#pf-box');
      const msg = $('#pf-msg');
      if (!box) return;
      const PF = AH.projectFile;
      const s = PF ? PF.status() : 'unsupported';
      if (s === 'unsupported') {
        box.innerHTML = '';
        msg.textContent = 'Bu tarayıcı doğrudan dosyaya yazmayı desteklemiyor — ' +
          'aşağıdaki "indir ve kopyala" yolunu kullan. (Chrome/Edge destekler.)';
        return;
      }
      if (s === 'linked') {
        box.innerHTML =
          '<button type="button" class="btn btn-primary" data-pf="write">💾 Şimdi dosyalara yaz</button>' +
          '<button type="button" class="btn btn-ghost" data-pf="writeall">💾 Sesler dâhil yaz</button>' +
          '<button type="button" class="btn btn-ghost" data-pf="unlink">Bağlantıyı kaldır</button>';
        msg.textContent = '📁 Bağlı klasör: ' + (PF.folderName() || '');
      } else if (s === 'prompt') {
        box.innerHTML = '<button type="button" class="btn btn-primary" data-pf="reauth">' +
          '🔓 İzni yenile</button>';
        msg.textContent = 'Klasör hatırlanıyor ama tarayıcı izni yeniden istiyor.';
      } else {
        box.innerHTML = '<button type="button" class="btn btn-primary" data-pf="link">' +
          '🔗 Proje klasörünü bağla</button>';
        msg.textContent = 'index.html’in bulunduğu ANA klasörü seç.';
      }
      const on = (k, fn) => {
        const b = $('[data-pf="' + k + '"]', box);
        if (b) b.addEventListener('click', fn);
      };
      on('link', () => PF.link().then((n) => { msg.textContent = '✅ Bağlandı: ' + n; renderPF(); })
        .catch((e) => alert(e.message)));
      on('reauth', () => PF.reauthorize().then(() => renderPF()).catch((e) => alert(e.message)));
      on('unlink', () => PF.unlink().then(renderPF));
      on('write', () => {
        msg.textContent = 'yazılıyor…';
        PF.writeCore().then((f) => { msg.textContent = '✅ Yazıldı: ' + f.join(' · '); renderPersist(); })
          .catch((e) => { msg.textContent = ''; alert('Yazılamadı: ' + e.message); });
      });
      on('writeall', () => {
        msg.textContent = 'sesler dâhil yazılıyor…';
        PF.writeAll().then((f) => { msg.textContent = '✅ Yazıldı: ' + f.join(' · '); renderPersist(); })
          .catch((e) => { msg.textContent = ''; alert('Yazılamadı: ' + e.message); });
      });
    }
    renderPF();
    if (AH.projectFile) AH.projectFile.restore().then(renderPF).catch(() => {});

    $('[data-act="p-paths"]').addEventListener('click', () => {
      persistPaths(true);
      st('✒️ custom-paths.js indirildi.');
    });
    $('[data-act="p-data"]').addEventListener('click', () => {
      persistData();
      st('📝 custom-data.js indirildi.');
    });
    $('[data-act="p-audio"]').addEventListener('click', () => {
      st('🔊 Sesler paketleniyor…');
      persistAudio().then((n) => st(n ? '🔊 custom-audio.js indirildi (' + n + ' ses).' : ''));
    });

    $('[data-act="all"]').addEventListener('click', () => {
      st('Dosyalar hazırlanıyor…');
      persistPaths(true);
      /* tarayıcı arka arkaya inen dosyaları engellemesin diye araya boşluk koy */
      setTimeout(() => {
        persistData();
        persistLearn();
        setTimeout(() => {
          persistAudio().then(() => {
            st('✅ Dosyalar indirildi. Şimdi js/ klasöründeki eşlerinin üzerine kopyala.');
            renderPersist();
          });
        }, 400);
      }, 400);
    });

    /* ---- tam yedek (sesler dâhil) ---- */
    $('[data-act="full-out"]').addEventListener('click', () => {
      st('Tam yedek hazırlanıyor…');
      const done = (audio) => {
        const pack = {
          kind: 'arapca-atolye-full-backup',
          v: 1,
          savedAt: new Date().toISOString(),
          admin: mergedStore(),
          paths: allPaths(),
          audio: audio || {}
        };
        const d = new Date();
        downloadText(JSON.stringify(pack), 'arapca-atolye-TAM-yedek-' + d.getFullYear() +
          String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') +
          '.json', 'application/json');
        st('✅ Tam yedek indirildi.');
      };
      if (AH.audio && AH.audio.supported) AH.audio.exportAll().then(done).catch(() => done(null));
      else done(null);
    });

    $('#full-in').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        let p;
        try { p = JSON.parse(String(fr.result)); }
        catch (err) { alert('Dosya okunamadı: ' + err.message); return; }
        if (!p || p.kind !== 'arapca-atolye-full-backup') {
          alert('Bu bir “tam yedek” dosyası değil. Yedek sekmesinden yüklemeyi dene.');
          return;
        }
        if (!confirm('Bu yedek, tarayıcıdaki yönetici değişikliklerinin ve seslerin ' +
            'üzerine yazacak. Devam edilsin mi?')) return;
        if (AH.backup) AH.backup.snapshot('tam yedek yüklenmeden önce');
        store = Object.assign(blank(), p.admin || {});
        store.paths = Object.assign({}, p.paths || {});
        save();
        const finish = () => reloadNotice();
        if (p.audio && AH.audio && AH.audio.supported) {
          st('Sesler geri yükleniyor…');
          AH.audio.importAll(p.audio).then(finish).catch(finish);
        } else finish();
      };
      fr.readAsText(f);
    });
  }

  /* -------------------------------------------------------------- YEDEK */
  function renderBackup() {
    const json = JSON.stringify(store, null, 2);
    $('#admin-body').innerHTML = [
      '<div class="admin-pane">',
      '  <p>Tüm yönetici değişiklikleri (kelimeler, harfler, çizim yolları) aşağıdadır. ' +
      'Kopyalayıp saklayabilir, başka bir cihaza yapıştırıp içe aktarabilirsin. ' +
      '<b>Sesler bu yedeğe dâhil değildir</b> — sesler için ' +
      '<b>💾 Kalıcı Kayıt</b> sekmesindeki “Tam yedek”i kullan.</p>',
      '  <p class="admin-warn">⚠ Bu yedek yalnızca bir DOSYADIR; yüklediğin tarayıcıda ' +
      'geçerlidir. Değişikliklerin her tarayıcıda kalıcı olması için ' +
      '<b>💾 Kalıcı Kayıt</b> sekmesini kullan.</p>',
      '  <div class="admin-stats">Özel yol: <b>' + customCount() + '</b> · ' +
      'Düzenlenen kelime: <b>' + Object.keys(store.exercises).length + '</b> · ' +
      'Eklenen kelime: <b>' + store.added.length + '</b> · ' +
      'Silinen: <b>' + store.deleted.length + '</b> · ' +
      'Düzenlenen harf: <b>' + Object.keys(store.letters).length + '</b></div>',
      '  <textarea id="bk" rows="14" spellcheck="false">' + esc(json) + '</textarea>',
      '  <div class="admin-actions">',
      '    <button type="button" class="btn btn-primary" data-act="download">⬇ Dosyaya kaydet (.json)</button>',
      '    <label class="btn btn-ghost file-btn">⬆ Dosyadan yükle' +
      '      <input type="file" id="bk-file" accept="application/json,.json" hidden></label>',
      '    <button type="button" class="btn btn-ghost" data-act="copy">Kopyala</button>',
      '    <button type="button" class="btn btn-ghost" data-act="import">Yapıştırdığını uygula</button>',
      '    <button type="button" class="btn btn-ghost danger" data-act="wipe">Tüm değişiklikleri sil</button>',
      '  </div>',
      '  <p class="admin-warn">PIN de bu yedeğin içindedir. Bu bir güvenlik kilidi değil, ' +
      'yalnızca öğrencinin yanlışlıkla değiştirmesini önleyen bir engeldir.</p>',

      '  <div class="admin-form">',
      '    <h3>Yönetici PIN’i</h3>',
      '    <p>' + (hasCustomPin()
          ? 'Şu an özel bir PIN belirlenmiş.'
          : 'Şu an varsayılan PIN kullanılıyor.') + '</p>',
      '    <div class="admin-actions">',
      '      <button type="button" class="btn btn-ghost" data-act="changepin">PIN’i değiştir</button>',
      hasCustomPin()
        ? '<button type="button" class="btn btn-ghost" data-act="resetpin">Varsayılana döndür</button>'
        : '',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    $('[data-act="download"]').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const d = new Date();
      a.href = url;
      a.download = 'arapca-atolye-yedek-' + d.getFullYear() +
        String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 8000);
    });

    $('#bk-file').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const p = JSON.parse(String(fr.result));
          if (!p || typeof p !== 'object') throw new Error('Geçersiz JSON');
          const n = pendingCount();
          if (n && !confirm('Bu dosya, tarayıcıdaki ' + n + ' özel çizim yolunun ' +
              'üzerine yazacak. Devam edilsin mi?')) return;
          if (AH.backup) AH.backup.snapshot('yedek yüklenmeden önce');
          store = Object.assign(blank(), p);
          save();
          reloadNotice();
        } catch (err) { alert('Dosya okunamadı: ' + err.message); }
      };
      fr.readAsText(f);
    });

    $('[data-act="copy"]').addEventListener('click', () => {
      $('#bk').select();
      try { document.execCommand('copy'); alert('Kopyalandı.'); }
      catch (e) { alert('Kopyalanamadı, elle seçip kopyala.'); }
    });
    $('[data-act="import"]').addEventListener('click', () => {
      try {
        const p = JSON.parse($('#bk').value);
        if (!p || typeof p !== 'object') throw new Error('Geçersiz JSON');
        store = Object.assign(blank(), p);
        save();
        reloadNotice();
      } catch (e) { alert('İçe aktarılamadı: ' + e.message); }
    });
    $('[data-act="changepin"]').addEventListener('click', () => {
      const a = prompt('Yeni yönetici PIN’i (boş bırakırsan iptal edilir):');
      if (a === null) return;
      const v = a.trim();
      if (!v) { alert('PIN değiştirilmedi.'); return; }
      setPin(v);
      alert('PIN güncellendi.');
      renderBackup();
    });
    const rp = $('[data-act="resetpin"]');
    if (rp) rp.addEventListener('click', () => {
      if (!confirm('Varsayılan PIN’e dönülsün mü?')) return;
      setPin(null);
      alert('Varsayılan PIN’e dönüldü.');
      renderBackup();
    });

    $('[data-act="wipe"]').addEventListener('click', () => {
      const n = pendingCount();
      if (n && !confirm('DİKKAT: Tarayıcıda kayıtlı ' + n + ' özel çizim yolu da silinecek.\n\n' +
          'Önce "💾 Uygulamaya kaydet" ile kalıcı hâle getirmek ister misin?\n' +
          'Yine de silmek için Tamam’a bas.')) return;
      if (!confirm('TÜM yönetici değişiklikleri silinecek. Emin misin?')) return;
      const go = () => { store = blank(); save(); reloadNotice(); };
      if (AH.backup) AH.backup.snapshot('her şeyi silmeden önce').then(go); else go();
    });
  }

  /* ------------------------------------------------------------------ */
  AH.admin = {
    apply, getPath, setPath, clearPath, customCount, pendingCount,
    allPaths, isBuiltIn, getUI, setUI,
    isUnlocked, requestAccess, unlockWithPrompt, open, close, openPathEditor,
    setPin, hasCustomPin, PATH_V,
    /* Kalıcı dosyaların METNİ — hem indirme hem doğrudan diske yazma kullanır */
    files: { paths: pathsFileText, data: dataFileText, learn: learnFileText,
             audio: audioFileText },
    /* admin-audio.js gibi ayrılan bölümler bunu kullanır */
    downloadText,
    mergedStore, touch,
    hasChanges() {
      return customCount() > 0 || Object.keys(store.exercises).length > 0 ||
        store.added.length > 0 || store.deleted.length > 0 ||
        Object.keys(store.letters).length > 0;
    }
  };

  /* İçerik düzenlemelerini müfredata uygulamak artık overrides.js'in
     işidir (o her zaman yüklüdür ve course.js'ten ÖNCE çalışır). Burada
     apply() ÇAĞRILMAZ: admin.js istek üzerine, müfredat kurulduktan sonra
     yüklenebilir; ikinci kez uygulamak eklenen kelimeleri çiftlerdi.
     İçerik değiştiğinde reloadNotice() sayfayı yenilemeyi önerir. */

  /* Okuma işlevlerini CANLI depoya bağla — panelde yapılan düzenleme
     tuvalde anında görünsün (overrides.js'teki kopya bayat kalabilir). */
  if (AH.paths) {
    AH.paths.get = getPath;
    AH.paths.ui = getUI;
  }

  /* Adres çubuğunda #admin varsa yönetici modunu aç. */
  document.addEventListener('DOMContentLoaded', () => {
    if (location.hash === '#admin') requestAccess();
  });
})();

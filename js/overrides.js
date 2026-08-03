/* =========================================================================
   overrides.js — ÖĞRENCİ TARAFININ İHTİYACI OLAN KÜÇÜK KATMAN

   Neden ayrı bir dosya: Yönetici paneli (admin.js ~94 KB) ve proje dosyası
   yazma (projectfile.js) ÖĞRENCİ için hiç gerekmez; ama uygulamanın açılışta
   iki şeye ihtiyacı vardır:

     1) Yönetici içerik düzenlemelerini müfredata UYGULAMAK
        (course.js müfredatı kurmadan ÖNCE olmalı)
     2) Çizim yollarını ve görünüm ayarlarını OKUMAK (tracing.js kullanır)

   Bu dosya yalnız bunları yapar. Yönetici paneli açıldığında admin.js
   yüklenir ve okuma işlevlerini kendi CANLI deposuna bağlar (aşağıdaki
   AH.paths üzerine yazar), böylece düzenleme anında görünür.

   Okuma sırası — hem burada hem admin.js'te aynıdır:
     1) tarayıcıdaki taze düzenleme (localStorage)
     2) uygulamaya gömülü dosya (js/custom-paths.js · js/custom-data.js)
     3) yok → yazı tipinden otomatik
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const KEY = 'arapca-harfler-admin-v1';

  const store = (function () {
    try {
      const raw = localStorage.getItem(KEY);
      const p = raw ? JSON.parse(raw) : null;
      return (p && typeof p === 'object') ? p : {};
    } catch (e) { return {}; }
  })();

  function base() {
    const b = AH.customData || {};
    return {
      letters: b.letters || {},
      exercises: b.exercises || {},
      added: b.added || [],
      deleted: b.deleted || [],
      ui: b.ui || null
    };
  }

  /* ------------------------------------------------------------------ */
  /* 1) İçerik düzenlemelerini müfredata uygula                          */
  /* ------------------------------------------------------------------ */
  function apply() {
    const D = AH.data;
    if (!D) return;
    const b = base();

    const letters = Object.assign({}, b.letters, store.letters || {});
    const exercises = Object.assign({}, b.exercises, store.exercises || {});
    const sDeleted = store.deleted || [];
    const deleted = b.deleted.concat(sDeleted.filter((id) => b.deleted.indexOf(id) < 0));

    /* eklenen kelimeler: aynı id iki kez girmesin, tarayıcıdaki kazansın */
    const added = [];
    const seen = {};
    (store.added || []).concat(b.added).forEach((a) => {
      const id = a && a.ex && a.ex.id;
      if (!id || seen[id]) return;
      seen[id] = 1;
      added.push(a);
    });

    const patchLetter = (L) => {
      const o = letters[L.char];
      if (o) Object.keys(o).forEach((k) => { if (o[k] != null) L[k] = o[k]; });
    };
    D.STAGES.forEach((st) => st.letters.forEach(patchLetter));
    if (D.ALPHABET) D.ALPHABET.forEach(patchLetter);

    const SECTIONS = ['twoLetters', 'threeLetters', 'cumulative'];
    D.STAGES.forEach((st) => {
      SECTIONS.forEach((sec) => {
        let list = (st.exercises[sec] || []).filter((e) => deleted.indexOf(e.id) < 0);
        list.forEach((e) => {
          const o = exercises[e.id];
          if (o) Object.keys(o).forEach((k) => { if (o[k] != null) e[k] = o[k]; });
        });
        added
          .filter((a) => a.stageId === st.stageId && a.section === sec)
          .forEach((a) => list.push(JSON.parse(JSON.stringify(a.ex))));
        st.exercises[sec] = list;
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2) Yol ve ayar okuma (tracing.js kullanır)                          */
  /* ------------------------------------------------------------------ */
  function getPath(glyph) {
    const local = (store.paths || {})[glyph];
    if (local) return local;
    return (AH.customPaths && AH.customPaths[glyph]) || null;
  }

  function getUI(k, def) {
    const touched = store.uiKeys || [];
    if (touched.indexOf(k) >= 0 && store.ui && typeof store.ui[k] === 'number') {
      return store.ui[k];
    }
    const b = base().ui;
    const bv = b ? b[k] : undefined;
    if (typeof bv === 'number') return bv;
    const v = store.ui ? store.ui[k] : undefined;
    return typeof v === 'number' ? v : def;
  }

  /* admin.js yüklendiğinde bu ikisini kendi canlı deposuna bağlar. */
  AH.paths = { get: getPath, ui: getUI };

  /* ------------------------------------------------------------------ */
  /* 3) Yönetici panelini İSTEK ÜZERİNE yükle                            */
  /* ------------------------------------------------------------------ */
  const TEACHER_FILES = [
    'js/backup.js', 'js/admin.js', 'js/admin-audio.js', 'js/projectfile.js'
  ];
  let loading = null;

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => res(src);
      s.onerror = () => rej(new Error(src + ' yüklenemedi'));
      document.head.appendChild(s);
    });
  }

  /** Yönetici araçlarını yükler (bir kez). */
  function loadTeacherTools() {
    if (AH.admin) return Promise.resolve(true);
    if (loading) return loading;
    /* sırayla: admin.js, backup.js'i varsayarak çalışır */
    loading = TEACHER_FILES.reduce(
      (chain, f) => chain.then(() => loadScript(f)),
      Promise.resolve()
    ).then(() => true);
    return loading;
  }

  AH.overrides = { apply, loadTeacherTools };

  /* Veriye HEMEN uygula — course.js bundan sonra yüklenir. */
  apply();
})();

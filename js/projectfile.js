/* =========================================================================
   projectfile.js — DEĞİŞİKLİKLERİ DOĞRUDAN PROJE DOSYASINA YAZMA

   Sorun: uygulama statik bir sitedir (GitHub Pages); yazacak bir sunucu
   yoktur. Bu yüzden şimdiye kadar "Kalıcı Kayıt" dosyayı İNDİRİYOR, sen de
   elle js/ klasörüne kopyalıyordun.

   Çözüm: tarayıcının "File System Access" yeteneği. Proje klasörünü BİR KEZ
   seçersin, izin verirsin; bundan sonra her kayıt js/custom-paths.js ve
   js/custom-data.js dosyalarına DOĞRUDAN yazılır. Geriye yalnızca GitHub'a
   push etmek kalır.

   Klasör tutamacı (handle) IndexedDB'de saklanır; tarayıcıyı kapatıp açsan
   da hatırlanır. Tarayıcı güvenlik gereği yeniden izin isteyebilir — bu
   yalnızca bir tıklamadır.

   DESTEK: Chrome / Edge / Opera (masaüstü). Firefox ve Safari desteklemez;
   orada eski "indir ve kopyala" yolu çalışmaya devam eder.
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const DB = 'arapca-harfler-project';
  const STORE = 'handles';
  const KEY = 'root';

  const supported = !!(window.showDirectoryPicker && window.indexedDB);

  let handle = null;          /* FileSystemDirectoryHandle (proje kökü) */
  let jsDir = null;           /* js/ klasörü */
  let ready = false;

  /* ------------------------------------------------------------------ */
  /* Tutamacı sakla / oku                                                */
  /* ------------------------------------------------------------------ */
  function open() {
    return new Promise((res, rej) => {
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => {
        const d = rq.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
  }

  function idbPut(v) {
    return open().then((d) => new Promise((res, rej) => {
      const r = d.transaction(STORE, 'readwrite').objectStore(STORE).put(v, KEY);
      r.onsuccess = () => res(true);
      r.onerror = () => rej(r.error);
    }));
  }

  function idbGet() {
    return open().then((d) => new Promise((res, rej) => {
      const r = d.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => rej(r.error);
    }));
  }

  function idbDel() {
    return open().then((d) => new Promise((res) => {
      const r = d.transaction(STORE, 'readwrite').objectStore(STORE).delete(KEY);
      r.onsuccess = r.onerror = () => res(true);
    }));
  }

  /* ------------------------------------------------------------------ */
  /* İzin                                                                */
  /* ------------------------------------------------------------------ */
  function permission(h, ask) {
    if (!h || !h.queryPermission) return Promise.resolve('granted');
    const o = { mode: 'readwrite' };
    return h.queryPermission(o).then((p) => {
      if (p === 'granted') return p;
      if (!ask) return p;
      return h.requestPermission(o);
    });
  }

  /** Seçilen klasörün gerçekten bu proje olduğunu doğrula. */
  function verify(h) {
    return h.getDirectoryHandle('js', { create: false })
      .then((d) => d.getFileHandle('custom-paths.js', { create: false }).then(() => d))
      .catch(() => {
        throw new Error('Seçtiğin klasörde js/custom-paths.js yok. ' +
          'Lütfen projenin ANA klasörünü seç (index.html’in bulunduğu yer).');
      });
  }

  /* ------------------------------------------------------------------ */
  /* Genel API                                                           */
  /* ------------------------------------------------------------------ */
  /** Sayfa açılışında: daha önce seçilmiş klasör var mı? (izin İSTEMEZ) */
  function restore() {
    if (!supported) { ready = true; return Promise.resolve(null); }
    return idbGet().then((h) => {
      if (!h) { ready = true; return null; }
      handle = h;
      return permission(h, false).then((p) => {
        ready = true;
        if (p !== 'granted') return 'prompt';
        return verify(h).then((d) => { jsDir = d; return 'granted'; })
          .catch(() => { jsDir = null; return 'granted'; });
      });
    }).catch(() => { ready = true; return null; });
  }

  /** Klasör seç (kullanıcı hareketi gerektirir). */
  function link() {
    if (!supported) {
      return Promise.reject(new Error('Bu tarayıcı doğrudan dosyaya yazmayı desteklemiyor. ' +
        'Chrome veya Edge kullan; ya da "indir ve kopyala" yolunu sürdür.'));
    }
    return window.showDirectoryPicker({ mode: 'readwrite', id: 'arapca-atolye' })
      .then((h) => permission(h, true).then((p) => {
        if (p !== 'granted') throw new Error('Yazma izni verilmedi.');
        return verify(h);
      }).then((d) => {
        handle = h;
        jsDir = d;
        return idbPut(h).then(() => h.name);
      }));
  }

  /** Kayıtlı izni yenile (tarayıcı yeniden açıldığında gerekebilir). */
  function reauthorize() {
    if (!handle) return link();
    return permission(handle, true).then((p) => {
      if (p !== 'granted') throw new Error('Yazma izni verilmedi.');
      return verify(handle).then((d) => { jsDir = d; return handle.name; });
    });
  }

  function unlink() {
    handle = null;
    jsDir = null;
    return idbDel();
  }

  function status() {
    if (!supported) return 'unsupported';
    if (!handle) return 'none';
    if (!jsDir) return 'prompt';
    return 'linked';
  }
  function folderName() { return handle ? handle.name : null; }
  function isReady() { return ready; }

  /** js/<name> dosyasının içeriğini DEĞİŞTİR. */
  function write(name, text) {
    if (!jsDir) return Promise.reject(new Error('Proje klasörü bağlı değil.'));
    return jsDir.getFileHandle(name, { create: true })
      .then((fh) => fh.createWritable())
      .then((w) => w.write(new Blob([text], { type: 'text/javascript;charset=utf-8' }))
        .then(() => w.close()))
      .then(() => name);
  }

  /**
   * Yol + içerik dosyalarını birlikte yaz (atölyeden sonra çağrılır).
   * @returns Promise<string[]> yazılan dosya adları
   */
  /**
   * GÜVENLİK KİLİDİ — dolu bir dosyanın üzerine BOŞ içerik yazılamaz.
   *
   * Neden var: bir kez, boş bir yer tutucu dosyanın dolu veriyi
   * gölgelemesi yüzünden 143 üslup imzası dosyadan silindi. Mantık
   * hatası düzeltildi; bu kilit ise aynı sınıftan HER hatayı yakalar:
   * diskteki dosyada N kayıt varken yeni içerikte 0 kayıt varsa yazma
   * iptal edilir ve sebep söylenir.
   */
  function countRecords(text) {
    if (!text) return 0;
    /* üretilen dosyalarda kayıtlar `"anahtar": {` biçimindedir */
    const m = text.match(/"[^"]+"\s*:\s*[[{]/g);
    return m ? m.length : 0;
  }

  function safeWrite(name, text) {
    if (!jsDir) return Promise.reject(new Error('Proje klasörü bağlı değil.'));
    return jsDir.getFileHandle(name, { create: true })
      .then((fh) => fh.getFile().then((f) => f.text()).catch(() => ''))
      .then((old) => {
        const before = countRecords(old);
        const after = countRecords(text);
        if (before > 0 && after === 0) {
          throw new Error(name + ': diskte ' + before + ' kayıt var, yenisi BOŞ — ' +
            'yazma iptal edildi. (Veri kaybını önleyen kilit.)');
        }
        return write(name, text);
      });
  }

  function writeCore() {
    if (!AH.admin || !AH.admin.files) return Promise.reject(new Error('admin.js yüklü değil.'));
    const jobs = [];
    const paths = AH.admin.files.paths();
    if (paths) jobs.push(safeWrite('custom-paths.js', paths));
    jobs.push(safeWrite('custom-data.js', AH.admin.files.data()));
    /* üslup imzaları ayrı dosyada — öğrenci sayfası yüklemez */
    if (AH.admin.files.learn) jobs.push(safeWrite('custom-learn.js', AH.admin.files.learn()));
    return Promise.all(jobs);
  }

  /** Sesler dâhil hepsi. */
  function writeAll() {
    return writeCore().then((done) =>
      AH.admin.files.audio().then((a) => {
        if (!a) return done;
        return write('custom-audio.js', a.text).then((n) => done.concat(n));
      }).catch(() => done)
    );
  }

  restore();

  AH.projectFile = {
    supported, link, reauthorize, unlink, restore, status, folderName, isReady,
    write, writeCore, writeAll
  };
})();

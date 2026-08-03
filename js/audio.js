/* =========================================================================
   audio.js — Öğretmenin kendi sesiyle kaydettiği telaffuzlar

   Neden: Web Speech API cihazda Arapça ses paketi yoksa hiç çalışmıyor ya da
   yanlış okuyor. Öğretmen kendi sesini kaydederse doğru telaffuz garanti olur
   ve çocuk tanıdığı bir sesi duyar.

   Ses dosyaları IndexedDB'de saklanır (localStorage'a sığmazlar).
   Anahtar = okunacak metin (ör. "ب", "بَاب").

   İKİ KATMAN VARDIR:
     1) IndexedDB  — bu tarayıcıda yeni kaydedilen sesler (geçici!)
     2) js/custom-audio.js — uygulamaya GÖMÜLMÜŞ sesler (kalıcı)
   IndexedDB tarayıcıya bağlıdır: başka tarayıcı/cihazda görünmez ve
   tarayıcı verisi temizlenince silinir. Kalıcı olması için yönetici
   panelindeki "💾 Kalıcı Kayıt" sekmesinden custom-audio.js üretilip
   projeye konmalıdır.
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const DB = 'arapca-harfler-audio';
  const STORE = 'clips';
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error('IndexedDB yok')); return; }
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => {
        const d = rq.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    return dbp;
  }

  function tx(mode) {
    return open().then((d) => d.transaction(STORE, mode).objectStore(STORE));
  }

  function put(key, blob) {
    return tx('readwrite').then((s) => new Promise((res, rej) => {
      const r = s.put(blob, key);
      r.onsuccess = () => res(true);
      r.onerror = () => rej(r.error);
    })).then(() => { cache[key] = true; return true; });
  }

  function get(key) {
    return tx('readonly').then((s) => new Promise((res, rej) => {
      const r = s.get(key);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => rej(r.error);
    }));
  }

  function del(key) {
    return tx('readwrite').then((s) => new Promise((res, rej) => {
      const r = s.delete(key);
      r.onsuccess = () => res(true);
      r.onerror = () => rej(r.error);
    })).then(() => { delete cache[key]; return true; });
  }

  function keys() {
    return tx('readonly').then((s) => new Promise((res, rej) => {
      const r = s.getAllKeys();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    }));
  }

  /* ------------------------------------------------------------------ */
  /* Uygulamaya gömülü (kalıcı) ses katmanı — js/custom-audio.js         */
  /* ------------------------------------------------------------------ */
  function builtIn(key) {
    return (AH.customAudio && AH.customAudio[key]) || null;
  }
  function builtInKeys() {
    return AH.customAudio ? Object.keys(AH.customAudio) : [];
  }

  /* Hangi metinlerin kaydı var? — arayüzde işaret göstermek için önbellek */
  const cache = {};
  let ready = false;
  function warm() {
    return keys().then((ks) => {
      ks.forEach((k) => { cache[k] = true; });
      ready = true;
      return ks;
    }).catch(() => { ready = true; return []; });
  }
  /** Bu metin için (tarayıcıda VEYA uygulamada) ses var mı? */
  function has(key) { return !!cache[key] || !!builtIn(key); }
  /** Ses nereden geliyor: 'local' = yalnız bu tarayıcıda, 'app' = kalıcı, null = yok */
  function source(key) {
    if (cache[key]) return 'local';
    if (builtIn(key)) return 'app';
    return null;
  }
  function isReady() { return ready; }

  function playURL(url, revoke) {
    return new Promise((res) => {
      const a = new Audio(url);
      a.onended = a.onerror = () => { if (revoke) setTimeout(() => URL.revokeObjectURL(url), 500); };
      a.play().then(() => res(true)).catch(() => res(false));
    });
  }

  function playBuiltIn(key) {
    const d = builtIn(key);
    if (!d) return Promise.resolve(false);
    return playURL(d, false);
  }

  /** Kayıtlı ses varsa çalar; yoksa false döner (çağıran TTS'e düşer).
      Önce tarayıcıdaki taze kayıt, sonra uygulamaya gömülü kayıt. */
  function play(key) {
    if (!cache[key]) return playBuiltIn(key);
    return get(key).then((blob) => {
      if (!blob) return playBuiltIn(key);
      return playURL(URL.createObjectURL(blob), true);
    }).catch(() => playBuiltIn(key));
  }

  /* --- kayıt --- */
  function mimeType() {
    const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    for (const m of cands) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
    }
    return null;
  }

  /**
   * Mikrofondan kayıt başlatır. Döndürdüğü nesnenin stop() metodu
   * kaydı bitirip Blob döndürür.
   */
  function record() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error('Bu tarayıcı mikrofon erişimini desteklemiyor.'));
    }
    const mime = mimeType();
    if (!mime) return Promise.reject(new Error('Uygun ses biçimi bulunamadı.'));
    return navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      const stopped = new Promise((res) => { rec.onstop = res; });
      rec.start();
      return {
        stop() {
          rec.stop();
          return stopped.then(() => {
            stream.getTracks().forEach((t) => t.stop());
            return new Blob(chunks, { type: mime });
          });
        },
        cancel() {
          try { rec.stop(); } catch (e) {}
          stream.getTracks().forEach((t) => t.stop());
        }
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Dışa/içe aktarma — kalıcı dosya üretmek ve yedeklemek için          */
  /* ------------------------------------------------------------------ */
  /** Blob → "data:audio/webm;base64,…" */
  function toDataURL(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => rej(fr.error || new Error('Ses okunamadı'));
      fr.readAsDataURL(blob);
    });
  }

  /** "data:audio/webm;base64,…" → Blob */
  function fromDataURL(url) {
    const s = String(url);
    const i = s.indexOf(',');
    if (i < 0) throw new Error('Geçersiz ses verisi');
    const head = s.slice(0, i);
    const mime = (head.match(/^data:([^;]+)/) || [, 'audio/webm'])[1];
    const bin = atob(s.slice(i + 1));
    const buf = new Uint8Array(bin.length);
    for (let n = 0; n < bin.length; n++) buf[n] = bin.charCodeAt(n);
    return new Blob([buf], { type: mime });
  }

  /**
   * Tüm sesler { anahtar: dataURL } olarak.
   * Uygulamaya gömülü kayıtlar tabandır; tarayıcıdaki taze kayıt onu ezer.
   * Böylece dosya yeniden üretilirken eski sesler KAYBOLMAZ.
   */
  function exportAll() {
    const out = {};
    builtInKeys().forEach((k) => { out[k] = AH.customAudio[k]; });
    const local = Object.keys(cache);
    return local.reduce(
      (chain, k) => chain.then(() =>
        get(k).then((blob) => (blob ? toDataURL(blob).then((d) => { out[k] = d; }) : null))
              .catch(() => null)),
      Promise.resolve()
    ).then(() => out);
  }

  /** { anahtar: dataURL } → tarayıcıya (IndexedDB) yaz. Yedekten geri yükleme. */
  function importAll(map) {
    const ks = Object.keys(map || {});
    return ks.reduce(
      (chain, k) => chain.then(() => {
        try { return put(k, fromDataURL(map[k])); } catch (e) { return null; }
      }),
      Promise.resolve()
    ).then(() => ks.length);
  }

  /** Kaç ses nerede? */
  function stats() {
    const local = Object.keys(cache);
    const app = builtInKeys();
    const onlyLocal = local.filter((k) => app.indexOf(k) < 0);
    return { local: local.length, app: app.length, onlyLocal: onlyLocal.length, onlyLocalKeys: onlyLocal };
  }

  warm();

  AH.audio = {
    put, get, del, keys, has, source, play, record, warm, isReady,
    toDataURL, fromDataURL, exportAll, importAll, stats, builtInKeys,
    supported: !!window.indexedDB
  };
})();

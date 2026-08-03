/* =========================================================================
   backup.js — OTOMATİK GÜVENLİK AĞI

   Neden: Öğretmen yüzlerce yolu elle çizerek saatler harcıyor. Tek bir
   yanlış "hepsine uygula" ya da "hepsinin yönünü düzelt" bu emeği geri
   dönülmez biçimde bozabilir. Bu modül, TOPLU her işlemden ÖNCE deponun
   fotoğrafını çeker.

   • Saklama : IndexedDB (localStorage'a sığmaz — yollar büyük)
   • Kapasite: son 10 anlık görüntü, en eskisi düşer
   • Kapsam  : çizim yolları + öğrenilen üsluplar + denetim onayları
               (yani elle üretilen HER ŞEY; müfredat verisi zaten dosyada)

   Geri yükleme ÜZERİNE YAZMAZ: geri yüklemeden önce mevcut hâlin de
   fotoğrafı çekilir, böylece "geri almayı geri alma" da mümkündür.
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const DB = 'arapca-harfler-backup';
  const STORE = 'snapshots';
  const KEEP = 10;

  const ADMIN_KEY = 'arapca-harfler-admin-v1';
  const LEARN_KEY = 'arapca-harfler-learned-v1';
  const OK_KEY = 'arapca-harfler-audit-ok-v1';

  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error('IndexedDB yok')); return; }
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => {
        const d = rq.result;
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    return dbp;
  }
  function tx(mode) {
    return open().then((d) => d.transaction(STORE, mode).objectStore(STORE));
  }

  function readLS(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /** Şu anki elle üretilmiş verinin tamamı. */
  function currentState() {
    const admin = readLS(ADMIN_KEY) || {};
    return {
      admin,
      learned: readLS(LEARN_KEY) || {},
      auditOk: readLS(OK_KEY) || {},
      counts: {
        paths: Object.keys(admin.paths || {}).length,
        learned: Object.keys(readLS(LEARN_KEY) || {}).length,
        letters: Object.keys(admin.letters || {}).length,
        exercises: Object.keys(admin.exercises || {}).length
      }
    };
  }

  /**
   * Anlık görüntü al.
   * @param {string} reason  ne yapılmadan önce alındı (ekranda gösterilir)
   * @returns Promise<{id, at, reason, counts}>
   */
  function snapshot(reason) {
    const st = currentState();
    /* Boş depo yedeklenmez — yeni tarayıcıda gereksiz kayıt oluşmasın */
    if (!st.counts.paths && !st.counts.learned &&
        !st.counts.letters && !st.counts.exercises) {
      return Promise.resolve(null);
    }
    const rec = {
      at: Date.now(),
      reason: String(reason || 'elle'),
      counts: st.counts,
      data: { admin: st.admin, learned: st.learned, auditOk: st.auditOk }
    };
    return tx('readwrite').then((s) => new Promise((res, rej) => {
      const r = s.add(rec);
      r.onsuccess = () => res(Object.assign({ id: r.result }, rec, { data: undefined }));
      r.onerror = () => rej(r.error);
    })).then((out) => prune().then(() => out))
      .catch(() => null);      /* yedek alınamazsa iş durmasın */
  }

  /** En eski kayıtları at (KEEP kadar tut). */
  function prune() {
    return list().then((all) => {
      if (all.length <= KEEP) return 0;
      const drop = all.slice(KEEP);          /* list() yeniden eskiye sıralı */
      return tx('readwrite').then((s) => {
        drop.forEach((x) => s.delete(x.id));
        return drop.length;
      });
    }).catch(() => 0);
  }

  /** Kayıtlar — yeniden eskiye. (veri gövdesi olmadan, hafif) */
  function list() {
    return tx('readonly').then((s) => new Promise((res, rej) => {
      const r = s.getAll();
      r.onsuccess = () => {
        const out = (r.result || []).map((x) => ({
          id: x.id, at: x.at, reason: x.reason, counts: x.counts
        }));
        out.sort((a, b) => b.at - a.at);
        res(out);
      };
      r.onerror = () => rej(r.error);
    })).catch(() => []);
  }

  function get(id) {
    return tx('readonly').then((s) => new Promise((res, rej) => {
      const r = s.get(Number(id));
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => rej(r.error);
    }));
  }

  /**
   * Geri yükle. Önce MEVCUT hâlin fotoğrafı çekilir (geri almayı geri almak
   * için), sonra kayıt yazılır.
   */
  function restore(id) {
    return get(id).then((rec) => {
      if (!rec) throw new Error('Yedek bulunamadı.');
      return snapshot('geri yüklemeden önce').then(() => {
        const d = rec.data || {};
        try {
          localStorage.setItem(ADMIN_KEY, JSON.stringify(d.admin || {}));
          localStorage.setItem(LEARN_KEY, JSON.stringify(d.learned || {}));
          localStorage.setItem(OK_KEY, JSON.stringify(d.auditOk || {}));
        } catch (e) { throw new Error('Yazılamadı: ' + e.message); }
        return rec;
      });
    });
  }

  function remove(id) {
    return tx('readwrite').then((s) => new Promise((res) => {
      const r = s.delete(Number(id));
      r.onsuccess = r.onerror = () => res(true);
    }));
  }

  function when(at) {
    const d = new Date(at);
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  AH.backup = {
    snapshot, list, get, restore, remove, when, currentState,
    KEEP, supported: !!window.indexedDB
  };
})();

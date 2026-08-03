/* =========================================================================
   storage.js — İlerleme, öğrenci profilleri, tekrar planı, ödüller

   • Profiller : birden çok öğrenci aynı cihazı kullanabilir
   • Adımlar   : { score, at, rep }  → puan, son çalışma zamanı, tekrar sayısı
   • Tekrar    : aralıklı tekrar (spaced repetition) — unutmadan önce hatırlat
   • Ödüller   : ünite başına yıldız (1–3) ve günlük seri (streak)

   Kilit YOKTUR: bütün aşamalar ve dersler baştan açıktır.
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const PROFILE_KEY = 'arapca-harfler-profiles-v1';
  const DATA_PREFIX = 'arapca-harfler-course-v3::';
  const LEGACY_KEY = 'arapca-harfler-course-v2';
  const PASS = 70;                 /* sınav geçme notu */
  const REVIEW_PASS = 85;          /* bu puanın altı → tekrar başa döner */
  const INTERVALS = [1, 3, 7, 16, 35];   /* gün */
  const AVATARS = ['🦊', '🐼', '🦁', '🐧', '🐢', '🦉', '🐝', '🐬'];

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
           '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }

  /* ------------------------------------------------------------------ */
  /* Profiller                                                           */
  /* ------------------------------------------------------------------ */
  function blankProfiles() {
    return { active: 'p1', list: [{ id: 'p1', name: 'Öğrenci', avatar: AVATARS[0] }] };
  }

  let profiles = (function () {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      const p = raw ? JSON.parse(raw) : null;
      if (p && p.list && p.list.length) return p;
    } catch (e) {}
    return blankProfiles();
  })();

  function saveProfiles() {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles)); } catch (e) {}
  }

  function listProfiles() { return profiles.list.slice(); }
  function activeProfile() {
    return profiles.list.find((p) => p.id === profiles.active) || profiles.list[0];
  }
  function switchProfile(id) {
    if (!profiles.list.some((p) => p.id === id)) return false;
    profiles.active = id;
    saveProfiles();
    state = null;                 /* yeni profilin verisi yüklensin */
    return true;
  }
  function addProfile(name) {
    const id = 'p' + Date.now().toString(36);
    profiles.list.push({
      id,
      name: String(name || 'Öğrenci').slice(0, 24),
      avatar: AVATARS[profiles.list.length % AVATARS.length]
    });
    profiles.active = id;
    saveProfiles();
    state = null;
    return id;
  }
  function renameProfile(id, name) {
    const p = profiles.list.find((x) => x.id === id);
    if (p) { p.name = String(name || p.name).slice(0, 24); saveProfiles(); }
  }
  function removeProfile(id) {
    if (profiles.list.length <= 1) return false;
    profiles.list = profiles.list.filter((p) => p.id !== id);
    try { localStorage.removeItem(DATA_PREFIX + id); } catch (e) {}
    if (profiles.active === id) profiles.active = profiles.list[0].id;
    saveProfiles();
    state = null;
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Aktif profilin verisi                                               */
  /* ------------------------------------------------------------------ */
  function blank() {
    return { v: 3, steps: {}, exams: {}, last: null, streak: { day: null, count: 0, best: 0 }, stars: {} };
  }

  let state = null;

  function key() { return DATA_PREFIX + activeProfile().id; }

  function load() {
    if (state) return state;
    try {
      const raw = localStorage.getItem(key());
      if (raw) {
        const p = JSON.parse(raw);
        state = Object.assign(blank(), p);
        return state;
      }
      /* eski tek profilli veriyi bir kereliğine taşı */
      const old = localStorage.getItem(LEGACY_KEY);
      if (old && activeProfile().id === 'p1') {
        const p = JSON.parse(old);
        state = blank();
        Object.keys(p.steps || {}).forEach((k) => {
          state.steps[k] = { score: p.steps[k], at: Date.now(), rep: 1 };
        });
        state.exams = p.exams || {};
        state.last = p.last || null;
        save();
        return state;
      }
    } catch (e) {
      console.warn('İlerleme okunamadı.', e);
    }
    state = blank();
    return state;
  }

  function save() {
    try { localStorage.setItem(key(), JSON.stringify(load())); } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /* Adımlar                                                             */
  /* ------------------------------------------------------------------ */
  function rec(id) { return load().steps[id] || null; }
  function isStepDone(id) { return !!rec(id); }
  function stepScore(id) { const r = rec(id); return r ? r.score : 0; }

  function markStep(id, score) {
    const s = load();
    const v = Math.max(0, Math.min(100, Math.round(score == null ? 100 : score)));
    const old = s.steps[id];
    const good = v >= REVIEW_PASS;
    s.steps[id] = {
      score: old ? Math.max(old.score, v) : v,
      last: v,
      at: Date.now(),
      /* iyi yapıldıysa tekrar aralığı uzar, kötüyse başa döner */
      rep: good ? Math.min((old && old.rep ? old.rep : 0) + 1, INTERVALS.length) : 1
    };
    touchStreak();
    save();
  }

  function clearStep(id) { delete load().steps[id]; save(); }

  /* ------------------------------------------------------------------ */
  /* Aralıklı tekrar                                                     */
  /* ------------------------------------------------------------------ */
  /** Bir adımın tekrar zamanı geldi mi? */
  function dueAt(id) {
    const r = rec(id);
    if (!r) return null;
    const days = INTERVALS[Math.max(0, Math.min(INTERVALS.length - 1, (r.rep || 1) - 1))];
    return r.at + days * 86400000;
  }

  /** Tekrarı gelen YAZMA adımları (harf/kelime), en çok gecikmiş önce. */
  function dueSteps(limit) {
    const now = Date.now();
    const out = [];
    AH.course.allSteps().forEach((st) => {
      if (st.type !== 'letter-write' && st.type !== 'trace') return;
      if (st.exam) return;
      const d = dueAt(st.id);
      if (d != null && d <= now) out.push({ step: st, due: d, over: now - d, score: stepScore(st.id) });
    });
    out.sort((a, b) => b.over - a.over);
    return limit ? out.slice(0, limit) : out;
  }

  /**
   * BUGÜNÜN DERSİ — iki kaynaktan derlenir:
   *   1) Tekrarı gelen adımlar (aralıklı tekrar — unutmadan önce)
   *   2) ÇOCUĞUN ZORLANDIĞI adımlar (denetim kayıtlarından; en çok
   *      başarısız olunanlar önce)
   * İkisi birleştirilir, tekrarlar ayıklanır ve neden listelendiği
   * ('due' / 'weak') her satırda taşınır — öğretmen sebebi görsün.
   */
  function todaySteps(limit) {
    const out = [];
    const seen = {};
    const push = (step, why, weight) => {
      if (!step || seen[step.id]) return;
      seen[step.id] = 1;
      out.push({ step, why, weight });
    };

    /* 1) zorlanılanlar — rapordaki en çok hata yapılan adımlar */
    const rep = report();
    const byId = {};
    AH.course.allSteps().forEach((st) => { byId[st.id] = st; });
    (rep.weakest || []).forEach((w) => {
      const st = byId[w.id];
      if (!st || st.exam) return;
      push(st, 'weak', 1000 + w.fails * 10);
    });

    /* 2) tekrarı gelenler — en çok gecikmiş önce */
    dueSteps().forEach((d) => push(d.step, 'due', Math.min(999, d.over / 86400000)));

    out.sort((a, b) => b.weight - a.weight);
    return limit ? out.slice(0, limit) : out;
  }

  /* ------------------------------------------------------------------ */
  /* Üniteler / aşamalar                                                 */
  /* ------------------------------------------------------------------ */
  function unitProgress(unit) {
    const done = unit.steps.filter((st) => isStepDone(st.id)).length;
    return {
      done, total: unit.steps.length,
      pct: unit.steps.length ? Math.round((done / unit.steps.length) * 100) : 0,
      complete: done === unit.steps.length
    };
  }
  function isUnitComplete(unit) { return unitProgress(unit).complete; }
  function isUnitUnlocked() { return true; }     /* kilit yok */
  function isStageUnlocked() { return true; }    /* kilit yok */

  function unitCursor(unit) {
    const i = unit.steps.findIndex((st) => !isStepDone(st.id));
    return i < 0 ? 0 : i;
  }

  /** Ünitenin yıldızı: puan ortalamasına göre 1–3. */
  function unitStars(unit) {
    if (!isUnitComplete(unit)) return 0;
    const scored = unit.steps.map((st) => rec(st.id)).filter((r) => r && r.score > 0);
    if (!scored.length) return 1;
    const avg = scored.reduce((a, r) => a + r.score, 0) / scored.length;
    return avg >= 95 ? 3 : avg >= 85 ? 2 : 1;
  }

  function stageProgress(stage) {
    const total = stage.units.reduce((n, u) => n + u.steps.length, 0);
    const done = stage.units.reduce((n, u) => n + unitProgress(u).done, 0);
    return {
      done, total,
      pct: total ? Math.round((done / total) * 100) : 0,
      unitsDone: stage.units.filter(isUnitComplete).length,
      unitsTotal: stage.units.length,
      stars: stage.units.reduce((n, u) => n + unitStars(u), 0),
      complete: total > 0 && done === total
    };
  }

  function overall() {
    const all = AH.course.allSteps();
    const done = all.filter((st) => isStepDone(st.id)).length;
    return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
  }

  function totalStars() {
    return AH.course.allUnits().reduce((n, u) => n + unitStars(u), 0);
  }

  function nextUnit() {
    const units = AH.course.allUnits();
    for (const u of units) if (!isUnitComplete(u)) return u;
    return units[units.length - 1];
  }

  /* ------------------------------------------------------------------ */
  /* Sınav                                                               */
  /* ------------------------------------------------------------------ */
  function examScore(stageId) { return load().exams[stageId] || 0; }
  function isExamPassed(stageId) { return examScore(stageId) >= PASS; }
  function setExamScore(stageId, score) {
    const s = load();
    s.exams[stageId] = Math.max(s.exams[stageId] || 0, Math.round(score));
    save();
  }

  /* ------------------------------------------------------------------ */
  /* Günlük seri (streak)                                                */
  /* ------------------------------------------------------------------ */
  function touchStreak() {
    const s = load();
    const t = today();
    if (s.streak.day === t) return;
    const gap = s.streak.day ? daysBetween(s.streak.day, t) : null;
    s.streak.count = (gap === 1) ? s.streak.count + 1 : 1;
    s.streak.day = t;
    s.streak.best = Math.max(s.streak.best || 0, s.streak.count);
  }
  function streak() {
    const s = load().streak;
    /* dün ya da bugün çalışılmadıysa seri kopmuştur */
    if (s.day && daysBetween(s.day, today()) > 1) return { count: 0, best: s.best || 0, day: s.day };
    return { count: s.count || 0, best: s.best || 0, day: s.day };
  }

  /* ------------------------------------------------------------------ */
  /* İNTİKAN — "geçti" değil, "oturdu"                                   */
  /*                                                                     */
  /* Bir adımı bir kez geçmek, harfin ELDE OTURDUĞU anlamına gelmez;     */
  /* el yazısı ancak FARKLI GÜNLERDE tekrarlanınca yerleşir. Bu yüzden   */
  /* ölçü adım değil HARF düzeyindedir:                                  */
  /*                                                                     */
  /*   bir harf, o harfi içeren yazma denemelerinde %85+ puanla          */
  /*   FARKLI ÜÇ GÜN başarılıysa "oturdu" sayılır.                       */
  /*                                                                     */
  /* Veri zaten var: logAttempt her denemeyi tarih ve puanla kaydediyor. */
  /* ------------------------------------------------------------------ */
  const MASTERY_DAYS = 3;
  const MASTERY_SCORE = 85;

  function dayOf(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
           '-' + String(d.getDate()).padStart(2, '0');
  }

  /** Adım hangi harfleri çalıştırıyor? (harf adımı ya da kelime adımı) */
  function lettersOfStep(st) {
    if (!st) return [];
    if (st.letter && st.letter.char) return [st.letter.char];
    if (st.pair) return [st.pair.a.char, st.pair.b.char];
    const src = st.target || st.glyph || '';
    const base = AH.data && AH.data.stripTashkeel ? AH.data.stripTashkeel(src) : src;
    const seen = {};
    return String(base).replace(/ـ/g, '').split('').filter((c) => {
      if (seen[c] || !AH.letterforms || !AH.letterforms.has(c)) return false;
      seen[c] = 1;
      return true;
    });
  }

  /** Harf → { days, mastered, lastScore } */
  function letterMastery(char) {
    const log = load().log || [];
    const byId = {};
    AH.course.allSteps().forEach((st) => { byId[st.id] = st; });
    const days = {};
    let last = 0;
    log.forEach((x) => {
      if (x.score < MASTERY_SCORE) return;
      const st = byId[x.id];
      if (!st || lettersOfStep(st).indexOf(char) < 0) return;
      days[dayOf(x.at)] = 1;
      if (x.at > last) last = x.at;
    });
    const n = Object.keys(days).length;
    return {
      char, days: n, need: MASTERY_DAYS,
      mastered: n >= MASTERY_DAYS,
      lastAt: last || null
    };
  }

  /** Bütün alfabenin oturma durumu. */
  function masteryReport() {
    const out = [];
    (AH.data.ALPHABET || []).forEach((L) => out.push(letterMastery(L.char)));
    return {
      list: out,
      mastered: out.filter((x) => x.mastered).length,
      total: out.length,
      needDays: MASTERY_DAYS
    };
  }

  /* ------------------------------------------------------------------ */
  /* Zayıf nokta raporu (öğretmen/veli için)                             */
  /* ------------------------------------------------------------------ */
  /**
   * Son yazma denemelerinden zayıf konuları çıkarır.
   * app.js her denetimden sonra kaydeder (kayıt: parts + problems).
   */
  function logAttempt(stepId, res) {
    const s = load();
    if (!s.log) s.log = [];
    s.log.push({
      id: stepId, at: Date.now(), score: res.score, pass: !!res.pass,
      p: res.parts || {}, codes: (res.problems || []).map((x) => x.code)
    });
    if (s.log.length > 400) s.log = s.log.slice(-400);
    save();
  }

  function report() {
    const log = load().log || [];
    const out = {
      attempts: log.length,
      passRate: log.length ? Math.round(log.filter((x) => x.pass).length / log.length * 100) : 0,
      avg: { shape: 0, start: 0, direction: 0, dots: 0, proportion: 0, baseline: 0 },
      codes: {},
      weakest: []
    };
    if (!log.length) return out;
    const keys = Object.keys(out.avg);
    keys.forEach((k) => {
      const vals = log.map((x) => x.p[k]).filter((v) => typeof v === 'number');
      out.avg[k] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    });
    log.forEach((x) => (x.codes || []).forEach((c) => { out.codes[c] = (out.codes[c] || 0) + 1; }));
    /* en çok zorlanılan adımlar */
    const byStep = {};
    log.forEach((x) => {
      if (!byStep[x.id]) byStep[x.id] = { id: x.id, tries: 0, fails: 0, last: 0 };
      byStep[x.id].tries++;
      if (!x.pass) byStep[x.id].fails++;
      byStep[x.id].last = x.score;
    });
    out.weakest = Object.values(byStep)
      .filter((x) => x.fails > 0)
      .sort((a, b) => b.fails - a.fails)
      .slice(0, 8);
    return out;
  }

  /* ------------------------------------------------------------------ */
  function setLast(unitId) { load().last = unitId; save(); }
  function getLast() { return load().last; }
  function hasStarted() { return Object.keys(load().steps).length > 0; }
  function reset() { state = blank(); save(); }
  function resetUnit(unit) {
    const s = load();
    unit.steps.forEach((st) => delete s.steps[st.id]);
    save();
  }

  /** Profilin tüm verisi (yedekleme için). */
  function exportProfile() {
    return { profile: activeProfile(), data: load() };
  }
  function importProfile(obj) {
    if (!obj || !obj.data) return false;
    state = Object.assign(blank(), obj.data);
    save();
    return true;
  }

  AH.storage = {
    PASS, REVIEW_PASS, AVATARS,
    /* profiller */
    listProfiles, activeProfile, switchProfile, addProfile, renameProfile, removeProfile,
    /* adımlar */
    isStepDone, stepScore, markStep, clearStep, rec,
    /* tekrar */
    dueAt, dueSteps, todaySteps,
    /* üniteler */
    unitProgress, isUnitComplete, isUnitUnlocked, unitCursor, unitStars,
    isStageUnlocked, stageProgress, overall, totalStars, nextUnit,
    /* sınav */
    examScore, isExamPassed, setExamScore,
    /* ödül */
    streak,
    /* rapor */
    logAttempt, report,
    /* intikan (harf düzeyi) */
    letterMastery, masteryReport, MASTERY_DAYS, MASTERY_SCORE,
    /* genel */
    setLast, getLast, hasStarted, reset, resetUnit, exportProfile, importProfile
  };
})();

/* =========================================================================
   course.js — Müfredatı DOĞRUSAL bir derse çevirir.
   Öğrenci hiçbir zaman "ne öğreneyim?" diye seçim yapmaz; sıradaki adım
   kendisine verilir.

   Hiyerarşi:  Aşama  →  Ünite  →  Adım
   Ünite = 3–6 adımlık küçük bir ders (2–3 dakika).
   Adım tipleri:
     teach-letter   ÖĞREN  — harfi tanıt (ses, şekil, yazım yönü)
     trace          YAZ    — tuvalde çalış (hayalet açık)
     teach-forms    ÖĞREN  — 4 formu tanıt (hepsine dokunmadan geçilemez)
     teach-word     ÖĞREN  — kelime, anlamı, denklemi
     assemble       KUR    — sürükle-bırak
     quiz           KONTROL— tek soruluk çoktan seçmeli
     exam-intro / exam-result — aşama sınavı çerçevesi
   Sınav adımlarında ipucu/hayalet YOKTUR ve "yine de geç" çıkmaz.
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});
  const D = AH.data;

  const FORM_ORDER = [
    ['initial', 'Başta'],
    ['medial', 'Ortada'],
    ['final', 'Sonda']
  ];

  function allLetters() {
    return D.STAGES.reduce((a, s) => a.concat(s.letters), []);
  }

  /* Sabit (deterministik) karıştırma: aynı soru her açılışta aynı sırada
     gelsin ki öğrenci "şıkkın yeri değişti" diye kafası karışmasın. */
  function rotate(arr, n) {
    const a = arr.slice();
    const k = ((n % a.length) + a.length) % a.length;
    return a.slice(k).concat(a.slice(0, k));
  }

  function otherLetters(letter, count, seed) {
    const pool = allLetters().filter((L) => L.char !== letter.char);
    return rotate(pool, seed).slice(0, count);
  }

  /* ------------------------------------------------- harf ünitesi (yalın hâl)
     Akış: ÖĞREN → İZLE (canlı yazım animasyonu) → TAKİP ET → YAZ → KONTROL
     "İZLE" adımı harfin nereden başlayıp nasıl çizildiğini gösterir;
     "TAKİP ET" yardımlar açıkken, "YAZ" yardımsız yazdırır (geçme %80). */
  function letterUnit(stage, L, index) {
    const uid = 'S' + stage.stageId + '-L' + index;
    const steps = [];
    const glyph = L.forms.isolated;

    steps.push({
      id: uid + '-teach',
      type: 'teach-letter',
      phase: 'ÖĞREN',
      letter: L,
      title: L.name + ' harfini tanıyalım'
    });

    steps.push({
      id: uid + '-watch',
      type: 'watch',
      phase: 'İZLE',
      letter: L,
      formKey: 'isolated',
      glyph,
      title: L.name + ' nasıl yazılır?'
    });

    steps.push({
      id: uid + '-guided',
      type: 'letter-write',
      phase: 'TAKİP',
      letter: L,
      formKey: 'isolated',
      glyph,
      guided: true,
      title: L.name + ' — birlikte yazalım'
    });

    steps.push({
      id: uid + '-write',
      type: 'letter-write',
      phase: 'YAZ',
      letter: L,
      formKey: 'isolated',
      glyph,
      guided: false,
      title: L.name + ' — şimdi tek başına yaz'
    });

    /* KONTROL 1 — harfi şekilden tanı */
    const wrongs = otherLetters(L, 3, index + stage.stageId);
    steps.push({
      id: uid + '-quiz-1',
      type: 'quiz',
      phase: 'KONTROL',
      title: 'Küçük kontrol',
      question: 'Hangisi <b>' + L.name + '</b> harfi?',
      display: 'glyph',
      options: rotate(
        [{ text: L.char, correct: true }].concat(wrongs.map((w) => ({ text: w.char }))),
        index + 1
      )
    });

    /* KONTROL 2 — bağlanma davranışı ya da form yeri */
    if (L.forms.initial === L.forms.isolated) {
      steps.push({
        id: uid + '-quiz-2',
        type: 'quiz',
        phase: 'KONTROL',
        title: 'Küçük kontrol',
        question: '<b>' + L.name + '</b> kendinden SONRAKİ harfe bağlanır mı?',
        display: 'text',
        options: [
          { text: 'Hayır, bağlanmaz', correct: true },
          { text: 'Evet, bağlanır' }
        ]
      });
    } else {
      steps.push({
        id: uid + '-quiz-2',
        type: 'quiz',
        phase: 'KONTROL',
        title: 'Küçük kontrol',
        question:
          'Bu hâl kelimenin neresinde kullanılır?<br><span class="q-glyph" dir="rtl">' +
          L.forms.medial + '</span>',
        display: 'text',
        options: rotate(
          [
            { text: 'Ortada', correct: true },
            { text: 'Başta' },
            { text: 'Sonda' },
            { text: 'Yalın (tek başına)' }
          ],
          index
        )
      });
    }

    return {
      id: uid,
      group: 'Harfler',
      icon: L.char,
      title: L.name,
      subtitle: L.sound,
      steps
    };
  }

  /* --------------------------------------------- bağlantı hâlleri ünitesi
     Harfin başta/ortada/sonda biçimleri: her biri için İZLE + YAZ. */
  function formsUnit(stage, L, index) {
    const uid = 'S' + stage.stageId + '-F' + index;
    const steps = [{
      id: uid + '-forms',
      type: 'teach-forms',
      phase: 'ÖĞREN',
      letter: L,
      title: L.name + ' — dört hâli'
    }];

    const seen = { [L.forms.isolated]: true };
    FORM_ORDER.forEach(([key, label]) => {
      const g = L.forms[key];
      if (seen[g]) return;        /* Elif gibi bağlanmayanlarda tekrar yok */
      seen[g] = true;
      steps.push({
        id: uid + '-watch-' + key,
        type: 'watch',
        phase: 'İZLE',
        letter: L,
        formKey: key,
        glyph: g,
        formLabel: label,
        title: label + ' hâli nasıl yazılır?'
      });
      steps.push({
        id: uid + '-write-' + key,
        type: 'letter-write',
        phase: 'YAZ',
        letter: L,
        formKey: key,
        glyph: g,
        formLabel: label,
        guided: false,
        title: L.name + ' — ' + label.toLowerCase() + ' hâlini yaz'
      });
    });

    steps.push({
      id: uid + '-quiz',
      type: 'quiz',
      phase: 'KONTROL',
      title: 'Küçük kontrol',
      question: 'Bağlantı çizgisi (ـ) ne işe yarar?',
      display: 'text',
      options: rotate([
        { text: 'Harfi komşusuna bağlar', correct: true },
        { text: 'Harfin sesini değiştirir' },
        { text: 'Noktaların yerini gösterir' }
      ], index)
    });

    return {
      id: uid,
      group: 'Harfler',
      icon: L.forms.medial,
      iconArabic: true,
      title: L.name + ' — Bağlantı Hâlleri',
      subtitle: 'Başta · Ortada · Sonda',
      steps
    };
  }

  /* ---------------------------------------------------------------- tekrar ünitesi */
  function reviewUnit(stage) {
    const uid = 'S' + stage.stageId + '-REV';
    const steps = [];
    const L = stage.letters;

    L.forEach((letter, i) => {
      const wrongs = otherLetters(letter, Math.min(2, L.length - 1), i + 2);
      steps.push({
        id: uid + '-hear-' + i,
        type: 'quiz',
        phase: 'KONTROL',
        title: 'Dinle ve seç',
        question: 'Sesi dinle, doğru harfi seç.',
        listen: letter.char,
        hint: letter.name + ' — ' + letter.sound,
        display: 'glyph',
        options: rotate(
          [{ text: letter.char, correct: true }].concat(wrongs.map((w) => ({ text: w.char }))),
          i
        )
      });
    });

    /* Nokta ayrımı: bu ailenin can alıcı noktası
       (dots artık SAYI; okunur metin dotsText alanında) */
    const dotted = L.filter((x) => x.dots > 0);
    if (dotted.length >= 2) {
      const target = dotted[0];
      steps.push({
        id: uid + '-dots',
        type: 'quiz',
        phase: 'KONTROL',
        title: 'Noktalara dikkat',
        question: 'Hangi harfin noktası <b>' + String(target.dotsText).toLowerCase() + '</b>?',
        display: 'glyph',
        options: rotate(
          L.map((x) => ({ text: x.char, correct: x.char === target.char })),
          1
        )
      });
    }

    return {
      id: uid,
      group: 'Tekrar',
      icon: '🔁',
      title: 'Harf Tekrarı',
      subtitle: stage.letters.map((x) => x.name).join(', '),
      steps
    };
  }

  /* ---------------------------------------------------------------- kelime ünitesi */
  const GROUP_LABEL = {
    twoLetters: '2 Harfli',
    threeLetters: '3 Harfli',
    cumulative: 'Kümülatif'
  };

  function wordUnit(stage, ex, groupKey) {
    return {
      id: 'S' + stage.stageId + '-W-' + ex.id,
      group: GROUP_LABEL[groupKey],
      icon: ex.result,
      iconArabic: true,
      title: ex.tr,
      subtitle: ex.kind === 'kelime' ? 'Kelime' : 'Hece',
      tag: ex.tag || null,
      steps: [
        {
          id: ex.id + '-teach',
          type: 'teach-word',
          phase: 'ÖĞREN',
          ex,
          title: ex.result + ' — ne demek?'
        },
        {
          id: ex.id + '-assemble',
          type: 'assemble',
          phase: 'KUR',
          ex,
          title: 'Parçaları birleştir'
        },
        {
          id: ex.id,                    /* eski ilerleme anahtarıyla uyumlu */
          type: 'trace',
          phase: 'YAZ',
          target: ex.result,
          ghost: true,
          ex,
          title: ex.result + ' kelimesini yaz',
          help: 'Harfleri kaleminden kaldırmadan bağla.'
        }
      ]
    };
  }

  /* ---------------------------------------------------------------- sınav ünitesi */
  function examUnit(stage) {
    const uid = 'S' + stage.stageId + '-EXAM';
    const steps = [{ id: uid + '-intro', type: 'exam-intro', phase: 'SINAV', stage, title: 'Aşama Sınavı' }];

    const words = D.allExercises(stage).filter((e) => e.kind === 'kelime');
    const letters = stage.letters;

    /* 1 — harf tanıma */
    const L0 = letters[letters.length - 1];
    steps.push({
      id: uid + '-q1',
      type: 'quiz',
      phase: 'SINAV',
      exam: true,
      title: 'Soru 1',
      question: 'Hangisi <b>' + L0.name + '</b> harfi?',
      display: 'glyph',
      options: rotate(
        [{ text: L0.char, correct: true }].concat(otherLetters(L0, 3, 5).map((w) => ({ text: w.char }))),
        2
      )
    });

    /* 2 — anlam */
    if (words.length) {
      const w = words[Math.min(1, words.length - 1)];
      const others = words.filter((x) => x.id !== w.id).slice(0, 3);
      steps.push({
        id: uid + '-q2',
        type: 'quiz',
        phase: 'SINAV',
        exam: true,
        title: 'Soru 2',
        question:
          'Bu kelime ne demek?<br><span class="q-glyph" dir="rtl">' + w.result + '</span>',
        display: 'text',
        options: rotate(
          [{ text: w.tr, correct: true }].concat(others.map((o) => ({ text: o.tr }))),
          1
        )
      });
    }

    /* 3 — form yeri */
    const L1 = letters[letters.length - 1];
    steps.push({
      id: uid + '-q3',
      type: 'quiz',
      phase: 'SINAV',
      exam: true,
      title: 'Soru 3',
      question:
        'Bu hâl kelimenin neresinde kullanılır?<br><span class="q-glyph" dir="rtl">' +
        L1.forms.final + '</span>',
      display: 'text',
      options: rotate(
        [
          { text: 'Sonda', correct: true },
          { text: 'Başta' },
          { text: 'Ortada' },
          { text: 'Yalın (tek başına)' }
        ],
        3
      )
    });

    /* 4–5 — EZBERDEN YAZMA: hayalet kapalı, ipucu yok */
    const writeWords = words.slice(-2);
    writeWords.forEach((w, i) => {
      steps.push({
        id: uid + '-w' + i,
        type: 'trace',
        phase: 'SINAV',
        exam: true,
        target: w.result,
        ghost: false,
        ex: w,
        title: 'Yazma ' + (i + 1),
        prompt: w.tr,
        help: 'Hayalet kapalı. Türkçe karşılığına bakarak kelimeyi kendin yaz.'
      });
    });

    steps.push({ id: uid + '-result', type: 'exam-result', phase: 'SINAV', stage, title: 'Sınav Sonucu' });

    return {
      id: uid,
      group: 'Sınav',
      icon: '🎓',
      title: 'Aşama Sınavı',
      subtitle: 'Geçme notu %70',
      isExam: true,
      steps
    };
  }

  /* --------------------------------------------------------- HAREKELER
     Müfredattaki her kelime harekelidir ve çocuk bu işaretleri ekranda
     görüyordu; ama hiçbir ders ne olduklarını söylemiyordu. Bu ünite o
     boşluğu kapatır: TANI → SEÇ → YAZ.
     Yalnız 1. aşamada, harfler öğrenildikten sonra gelir. */
  function harakatUnit(stage) {
    const uid = 'S' + stage.stageId + '-HRK';
    const H = D.HARAKAT || [];
    if (!H.length) return null;
    /* örnek harf: bu aşamada öğrenilen ilk harf */
    const base = (stage.letters[1] || stage.letters[0]).char;
    const steps = [];

    H.forEach((h, i) => {
      steps.push({
        id: uid + '-t' + i,
        type: 'teach-haraka',
        phase: 'ÖĞREN',
        haraka: h,
        base,
        title: h.name + ' (' + h.ar + ')'
      });
      steps.push({
        id: uid + '-w' + i,
        type: 'haraka-write',
        phase: 'YAZ',
        haraka: h,
        base,
        title: h.name + ' işaretini yaz'
      });
    });

    /* karışık tanıma: sesi duy, işareti seç */
    H.forEach((h, i) => {
      steps.push({
        id: uid + '-q' + i,
        type: 'haraka-pick',
        phase: 'KONTROL',
        haraka: h,
        base,
        title: 'Hangi hareke?'
      });
    });

    return {
      id: uid, group: 'Harekeler', icon: 'َ',
      title: 'Harekeler — kısa sesler',
      subtitle: 'üstün · esre · ötre · cezm · şedde',
      steps
    };
  }

  /* ------------------------------------------------------------ NOKTALAR
     Yeni başlayanın en sık hatası: ب/ت/ث ya da د/ذ karıştırmak. Gövde
     aynı, fark YALNIZ noktadır. Bu ünite gövdeyi verir, noktayı çocuğa
     koydurur. Aile bilgisi letterforms.js'te zaten tanımlıdır. */
  function dotsUnit(stage) {
    const uid = 'S' + stage.stageId + '-DOT';
    const dotted = stage.letters.filter((L) => L.dots > 0);
    if (!dotted.length) return null;
    const steps = dotted.map((L, i) => ({
      id: uid + '-' + i,
      type: 'dots-place',
      phase: 'KONTROL',
      letter: L,
      glyph: L.forms.isolated,
      title: L.name + ' — noktaları sen koy'
    }));
    return {
      id: uid, group: 'Noktalar', icon: '⋮',
      title: 'Noktalar nereye?',
      subtitle: dotted.map((L) => L.char).join(' · '),
      steps
    };
  }

  /* --------------------------------------------------------------- VASIL
     Arapçanın en zor kısmı harfleri BAĞLAMAKTIR. Biçim üniteleri her
     biçimi ayrı ayrı öğretir; burada iki harf BİRLİKTE yazılır. */
  function joinUnit(stage) {
    const uid = 'S' + stage.stageId + '-JOIN';
    /* bağlanabilen harfleri, aşamanın kendi harfleriyle eşle */
    const joiners = stage.letters.filter((L) => L.joinsForward);
    if (!joiners.length) return null;
    const pairs = [];
    joiners.forEach((A) => {
      stage.letters.forEach((B) => {
        if (pairs.length >= 6) return;
        if (A.char === B.char) return;
        pairs.push({ a: A, b: B });
      });
    });
    if (!pairs.length) return null;

    const steps = pairs.slice(0, 6).map((p, i) => ({
      id: uid + '-' + i,
      type: 'join-write',
      phase: 'YAZ',
      pair: p,
      /* Hedef, harflerin KENDİLERİDİR: yazı tipi onları kendiliğinden
         bağlar ("ب"+"ا" → "با"). Biçimleri elle yapıştırmak (بـ + ـا)
         araya çift uzatma çizgisi koyar ve yanlış şekil üretir. */
      target: p.a.char + p.b.char,
      /* ekranda parçaları göstermek için (yalnız görsel) */
      pieces: [p.a.forms.initial, p.b.forms.final],
      title: p.a.name + ' + ' + p.b.name,
      help: 'Kalemi kaldırmadan ikisini birleştir.'
    }));

    return {
      id: uid, group: 'Bağlama', icon: '🔗',
      title: 'Harfleri bağlayalım',
      subtitle: 'iki harf, tek hamle',
      steps
    };
  }

  /* ------------------------------------------------------- EKSİK HARF
     "Kelimeyi tamamla": kelimeden BİR harf çıkarılır, hangi harf olduğu
     söylenir ve yalın hâli gösterilir. Çocuk o harfi, kelimedeki DOĞRU
     BİÇİMİYLE (başta/ortada/sonda) yazmak zorundadır.

     Neden değerli: harfin yalın hâlini bilmek yetmez; asıl beceri
     harfin kelimedeki yerine göre şekil değiştirdiğini bilmektir. */
  function missingUnit(stage) {
    const uid = 'S' + stage.stageId + '-MISS';
    const words = [];
    ['twoLetters', 'threeLetters', 'cumulative'].forEach((key) => {
      (stage.exercises[key] || []).forEach((ex) => words.push(ex));
    });
    if (!words.length) return null;

    const stageChars = stage.letters.map((L) => L.char);
    const steps = [];

    words.forEach((ex) => {
      if (steps.length >= 6) return;
      const frags = ex.equation || [];
      if (frags.length < 2) return;
      /* bu aşamada öğrenilen harflerden birini seç — ortadakiler öncelikli */
      let pick = -1;
      for (let i = 1; i < frags.length - 1; i++) {
        const info = AH.letterforms.parseFragment(frags[i]);
        if (stageChars.indexOf(info.char) >= 0) { pick = i; break; }
      }
      if (pick < 0) {
        for (let i = 0; i < frags.length; i++) {
          const info = AH.letterforms.parseFragment(frags[i]);
          if (stageChars.indexOf(info.char) >= 0) { pick = i; break; }
        }
      }
      if (pick < 0) return;

      const info = AH.letterforms.parseFragment(frags[pick]);
      const L = D.getLetter(info.char);
      if (!L) return;

      steps.push({
        id: uid + '-' + steps.length,
        type: 'missing-letter',
        phase: 'YAZ',
        ex,
        target: ex.result,
        letter: L,
        formKey: info.formKey,
        /* eksik parçanın yerindeki doğru şekil */
        missingGlyph: L.forms[info.formKey] || info.char,
        index: pick,
        title: ex.result + ' — eksik harfi tamamla'
      });
    });

    if (!steps.length) return null;
    return {
      id: uid, group: 'Tamamla', icon: '🧩',
      title: 'Eksik harfi tamamla',
      subtitle: 'harf kelimede nasıl görünür?',
      steps
    };
  }

  /* ---------------------------------------------------------------- derleme */
  function build() {
    return D.STAGES.map((stage) => {
      const units = [];
      stage.letters.forEach((L, i) => {
        units.push(letterUnit(stage, L, i));
        units.push(formsUnit(stage, L, i));
      });
      /* Harfler bilindikten sonra: noktalar → bağlama → (1. aşamada) harekeler.
         Hepsi YENİ ünitedir; mevcut adımlara dokunmaz, ilerleme bozulmaz. */
      const dots = dotsUnit(stage);
      if (dots) units.push(dots);
      const join = joinUnit(stage);
      if (join) units.push(join);
      if (stage.stageId === 1) {
        const hrk = harakatUnit(stage);
        if (hrk) units.push(hrk);
      }
      units.push(reviewUnit(stage));
      ['twoLetters', 'threeLetters', 'cumulative'].forEach((key) => {
        (stage.exercises[key] || []).forEach((ex) => units.push(wordUnit(stage, ex, key)));
      });
      /* Kelimeler yazıldıktan SONRA: harfi kelimenin içinde tanıma */
      const miss = missingUnit(stage);
      if (miss) units.push(miss);
      units.push(examUnit(stage));
      units.forEach((u, i) => {
        u.index = i;
        u.stageId = stage.stageId;
      });
      return {
        stageId: stage.stageId,
        title: stage.title,
        lettersLabel: stage.lettersLabel,
        subtitle: stage.subtitle,
        intro: stage.intro,
        units
      };
    });
  }

  const COURSE = build();

  function getStage(stageId) {
    return COURSE.find((s) => s.stageId === Number(stageId)) || null;
  }
  function getUnit(unitId) {
    for (const s of COURSE) {
      const u = s.units.find((x) => x.id === unitId);
      if (u) return u;
    }
    return null;
  }
  function allUnits() {
    return COURSE.reduce((a, s) => a.concat(s.units), []);
  }
  function allSteps() {
    return allUnits().reduce((a, u) => a.concat(u.steps), []);
  }

  AH.course = { COURSE, getStage, getUnit, allUnits, allSteps };
})();

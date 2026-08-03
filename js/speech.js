/* =========================================================================
   speech.js — Telaffuz: önce ÖĞRETMENİN kaydı, yoksa cihazın sesi

   MASAÜSTÜNDE SESİN ÇIKMAMA SEBEPLERİ (hepsi burada karşılanır):

   1) Sesler ASENKRON yüklenir. Chrome'da sayfa açılır açılmaz
      getVoices() boş dizi döner; ses listesi biraz sonra gelir.
      → voicesReady() beklenir.

   2) cancel() + speak() YARIŞI. Chrome'da cancel'in hemen ardından
      speak çağrılırsa utterance sessizce düşer.
      → cancel'den sonra bir tık beklenir.

   3) Chrome MOTORU DURAKLATIR. Uzun/arka planda kalan sentez askıda
      kalır ve sonraki konuşmalar hiç başlamaz.
      → her konuşmadan önce resume() atılır.

   4) KULLANICI HAREKETİ. Tarayıcı, sayfaya dokunulmadan ses çıkarmayı
      engelleyebilir.
      → ilk hata net bir mesajla bildirilir, sessizce yutulmaz.

   5) ARAPÇA SES PAKETİ YOK. Eskiden lang='ar-SA' verilip susuluyordu.
      → varsayılan sesle yine okunur (yanlış aksanla da olsa duyulur)
        ve bir kez dürüst uyarı gösterilir.
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const supported = typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance !== 'undefined';

  let voices = [];
  let warnedNoVoice = false;
  let warnedSilent = false;
  let lastError = null;

  function refreshVoices() {
    if (!supported) return voices;
    try { voices = window.speechSynthesis.getVoices() || []; }
    catch (e) { voices = []; }
    return voices;
  }

  /* Sesler gelene kadar bekle (en fazla ~1,2 sn). */
  let readyP = null;
  function voicesReady() {
    if (!supported) return Promise.resolve([]);
    if (voices.length) return Promise.resolve(voices);
    if (readyP) return readyP;
    readyP = new Promise((res) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        res(refreshVoices());
      };
      refreshVoices();
      if (voices.length) { finish(); return; }
      try { window.speechSynthesis.onvoiceschanged = finish; } catch (e) {}
      /* bazı tarayıcılarda onvoiceschanged hiç tetiklenmez */
      let n = 0;
      const poll = setInterval(() => {
        n++;
        refreshVoices();
        if (voices.length || n > 12) { clearInterval(poll); finish(); }
      }, 100);
    });
    return readyP;
  }

  if (supported) {
    refreshVoices();
    try { window.speechSynthesis.onvoiceschanged = refreshVoices; } catch (e) {}
  }

  function arabicVoice() {
    if (!voices.length) refreshVoices();
    const low = (v) => (v.lang || '').toLowerCase().replace('_', '-');
    return voices.filter((v) => low(v) === 'ar-sa')[0] ||
           voices.filter((v) => low(v).indexOf('ar') === 0)[0] ||
           null;
  }
  function hasArabicVoice() { return !!arabicVoice(); }

  /** Tanı için: cihazda hangi sesler var? */
  function voiceList() {
    refreshVoices();
    return voices.map((v) => ({ name: v.name, lang: v.lang, def: !!v.default }));
  }

  /** Son durum — yönetici panelindeki tanı kutusu okur. */
  function diagnose() {
    refreshVoices();
    return {
      supported,
      voices: voices.length,
      arabic: hasArabicVoice() ? arabicVoice().name + ' (' + arabicVoice().lang + ')' : null,
      lastError,
      recordings: AH.audio && AH.audio.stats ? AH.audio.stats() : null
    };
  }

  /**
   * Metni seslendirir.
   * 1) Öğretmenin kendi kaydı varsa ONU çalar (en doğru telaffuz).
   * 2) Yoksa cihazın sesine düşer.
   */
  function speak(text, rate) {
    const clean = String(text || '').trim();
    if (!clean) return;

    if (AH.audio && AH.audio.has(clean)) {
      AH.audio.play(clean).then((ok) => { if (!ok) tts(clean, rate); });
      return;
    }
    tts(clean, rate);
  }

  function tts(clean, rate) {
    if (!supported) {
      lastError = 'Tarayıcı sesli okumayı desteklemiyor.';
      AH.ui && AH.ui.toast('Bu tarayıcı sesli okumayı desteklemiyor.', 'warn');
      return;
    }

    voicesReady().then(() => {
      const synth = window.speechSynthesis;
      try {
        /* (3) motor askıda kalmış olabilir */
        synth.resume();
        synth.cancel();
      } catch (e) {}

      /* (2) cancel'den sonra bir tık bekle — yoksa utterance düşer */
      setTimeout(() => {
        let u;
        try { u = new SpeechSynthesisUtterance(clean); }
        catch (e) { lastError = String(e.message || e); return; }

        const v = arabicVoice();
        if (v) {
          u.voice = v;
          u.lang = v.lang;
        } else {
          /* (5) Arapça yoksa SUSMA — varsayılan sesle yine oku */
          u.lang = 'ar-SA';
          if (!warnedNoVoice) {
            warnedNoVoice = true;
            AH.ui && AH.ui.toast(
              'Cihazında Arapça ses paketi yok; telaffuz yanlış duyulabilir. ' +
              'Windows: Ayarlar → Saat ve Dil → Konuşma → Ses ekle → Arapça. ' +
              'En iyi çözüm: yönetici panelinden KENDİ sesini kaydet.',
              'warn', 7000);
          }
        }
        u.rate = typeof rate === 'number' ? rate : 0.8;
        u.pitch = 1;
        u.volume = 1;

        let started = false;
        u.onstart = () => { started = true; lastError = null; };
        u.onerror = (e) => {
          lastError = 'speechSynthesis: ' + (e && e.error ? e.error : 'bilinmeyen hata');
          if (!warnedSilent) {
            warnedSilent = true;
            AH.ui && AH.ui.toast('Ses çıkmadı (' + lastError + '). Sayfaya bir kez ' +
              'dokunup tekrar dene; sürerse kendi sesini kaydet.', 'warn', 6000);
          }
        };

        try { synth.speak(u); } catch (e) { lastError = String(e.message || e); return; }

        /* (4) hiç başlamadıysa bir kez dürüstçe söyle */
        setTimeout(() => {
          if (started) return;
          lastError = lastError || 'Motor konuşmayı başlatmadı.';
          if (!warnedSilent) {
            warnedSilent = true;
            AH.ui && AH.ui.toast('Ses çıkmadı. Tarayıcı, sayfaya dokunulmadan ses ' +
              'çalmayı engelliyor olabilir; bir yere dokunup tekrar dene.', 'warn', 6000);
          }
        }, 1200);
      }, 60);
    });
  }

  /* Chrome, uzun süren sentezi askıya alır; düzenli resume bunu önler. */
  if (supported) {
    setInterval(() => {
      try {
        const s = window.speechSynthesis;
        if (s.speaking && s.paused) s.resume();
      } catch (e) {}
    }, 4000);
  }

  AH.speech = {
    supported, speak, hasArabicVoice, refreshVoices,
    voicesReady, voiceList, diagnose
  };
})();

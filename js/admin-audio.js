/* =========================================================================
   admin-audio.js — YÖNETİCİ PANELİ: SES KAYDI SEKMESİ

   admin.js'ten ayrıldı (o dosya 2400 satıra çıkmıştı ve altı ayrı iş
   yapıyordu). Bu bölüm bağımsızdır: paneldeki ortak durumla (çizim
   düzenleyicisi, depo) hiç konuşmaz; yalnız AH.audio ile çalışır ve
   dosya indirmek için admin.js'ten downloadText'i alır.

   Dışa verdiği:
     AH.adminAudio.render()     — sekmeyi #admin-body içine çizer
     AH.adminAudio.fileText()   — js/custom-audio.js metni → Promise
     AH.adminAudio.persist()    — dosyayı indirir → Promise<adet>
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  /* admin.js yüklüyse onun indiricisini kullan; değilse yerel yedek. */
  function downloadText(text, name, mime) {
    if (AH.admin && AH.admin.downloadText) return AH.admin.downloadText(text, name, mime);
    const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }

  /* ---------------------------------------------------------- SES KAYDI */
  function audioTargets() {
    const out = [];
    AH.data.ALPHABET.forEach((L) =>
      out.push({ key: L.char, label: L.name, kind: 'Harf' }));
    AH.data.STAGES.forEach((st) =>
      AH.data.allExercises(st).forEach((ex) =>
        out.push({ key: ex.vowelled || ex.result, label: ex.tr, kind: 'Kelime' })));
    return out;
  }

  let recState = null;   /* {key, rec, startedAt} */

  function renderAudio() {
    if (!AH.audio || !AH.audio.supported) {
      $('#admin-body').innerHTML = '<div class="admin-pane"><p>Bu tarayıcı ses kaydını ' +
        'desteklemiyor (IndexedDB yok).</p></div>';
      return;
    }
    const items = audioTargets();
    const rec = items.filter((i) => AH.audio.has(i.key)).length;
    const st = AH.audio.stats();

    /* Kaynak rozeti: ses nereden geliyor? */
    const badge = (key) => {
      const s = AH.audio.source(key);
      if (s === 'local') return '<span class="au-src local" title="Yalnızca bu tarayıcıda — ' +
        'kalıcı değil! 💾 Kalıcı Kayıt sekmesinden uygulamaya göm.">💾 tarayıcıda</span>';
      if (s === 'app') return '<span class="au-src app" title="Uygulamaya gömülü — ' +
        'her tarayıcıda ve her cihazda çalışır.">📦 uygulamada</span>';
      return '<span class="au-src none">—</span>';
    };

    $('#admin-body').innerHTML = [
      '<div class="admin-pane">',
      '  <p>Kendi sesinle telaffuz kaydet. Kayıt varsa uygulama 🔊 düğmesinde ' +
      '<b>senin sesini</b> çalar; yoksa cihazın Arapça sesine düşer.</p>',
      st.onlyLocal
        ? '  <p class="admin-warn">⚠ <b>' + st.onlyLocal + '</b> ses yalnızca BU tarayıcıda ' +
          'duruyor. Başka tarayıcıda/cihazda duyulmaz ve tarayıcı verisi silinince kaybolur. ' +
          'Kalıcı yapmak için: <b>💾 Kalıcı Kayıt</b> sekmesi → “Sesleri uygulamaya göm”.</p>'
        : '  <p class="admin-ok">✅ Tarayıcıda bekleyen kalıcılaştırılmamış ses yok.</p>',
      '  <div class="admin-stats">Kayıtlı: <b>' + rec + '</b> / ' + items.length +
      ' · 📦 uygulamada: <b>' + st.app + '</b> · 💾 yalnız bu tarayıcıda: <b>' + st.onlyLocal + '</b></div>',
      '  <div class="admin-actions">',
      '    <button type="button" class="btn btn-primary btn-sm" data-act="persist-audio">' +
      '💾 Sesleri uygulamaya göm</button>',
      '  </div>',
      '  <div class="au-list">',
      items.map((it, n) =>
        '<div class="au-row' + (AH.audio.has(it.key) ? ' has' : '') + '" data-i="' + n + '">' +
        '<span class="au-key ar" dir="rtl">' + esc(it.key) + '</span>' +
        '<span class="au-label">' + esc(it.label) + ' <i>' + it.kind + '</i></span>' +
        badge(it.key) +
        '<button type="button" class="mini" data-rec="' + n + '">⏺ Kaydet</button>' +
        '<button type="button" class="mini" data-play="' + n + '"' +
          (AH.audio.has(it.key) ? '' : ' disabled') + '>▶</button>' +
        '<button type="button" class="mini danger" data-drop="' + n + '"' +
          (AH.audio.source(it.key) === 'local' ? '' : ' disabled') + '>✕</button>' +
        '</div>').join(''),
      '  </div>',
      '</div>'
    ].join('');

    $('[data-act="persist-audio"]').addEventListener('click', () => persistAudio());

    /* --- SES TANI KUTUSU ---
       "Bilgisayarda sesler çalışmıyor" şikâyeti çoğu zaman eksik Arapça
       ses paketindendir. Tahmin ettirmek yerine ölçüp gösterelim. */
    (function () {
      if (!AH.speech || !AH.speech.diagnose) return;
      const host = document.createElement('div');
      host.className = 'admin-pane sp-diag';
      host.id = 'sp-diag';
      $('#admin-body').appendChild(host);

      function draw() {
        const d = AH.speech.diagnose();
        const list = AH.speech.voiceList();
        const ar = list.filter((v) => (v.lang || '').toLowerCase().indexOf('ar') === 0);
        host.innerHTML = [
          '<h3>🔎 Ses tanı</h3>',
          '<div class="admin-stats">',
          'Tarayıcı desteği: <b>' + (d.supported ? 'var' : 'YOK') + '</b> · ',
          'Yüklü ses: <b>' + d.voices + '</b> · ',
          'Arapça ses: <b>' + (d.arabic || 'YOK') + '</b>',
          '</div>',
          d.lastError ? '<p class="admin-warn">Son hata: ' + esc(d.lastError) + '</p>' : '',
          !d.supported
            ? '<p class="admin-warn">Bu tarayıcı sesli okumayı desteklemiyor.</p>'
            : (!ar.length
                ? '<p class="admin-warn">⚠ Cihazda <b>Arapça ses paketi yok</b>. ' +
                  'Windows: Ayarlar → Saat ve Dil → Konuşma → Ses ekle → Arabic. ' +
                  'Kalıcı ve en doğru çözüm: yukarıdan <b>kendi sesini kaydet</b> — ' +
                  'kayıt varsa cihaz sesi hiç kullanılmaz.</p>'
                : '<p class="admin-ok">✅ Arapça ses bulundu: ' +
                  ar.map((v) => esc(v.name)).join(', ') + '</p>'),
          '<div class="admin-actions">',
          '  <button type="button" class="btn btn-ghost btn-sm" data-sp="test">🔊 Testi çal (ب)</button>',
          '  <button type="button" class="btn btn-ghost btn-sm" data-sp="refresh">↻ Yenile</button>',
          '</div>',
          list.length
            ? '<details class="sp-voices"><summary>Yüklü sesler (' + list.length + ')</summary>' +
              '<ul>' + list.map((v) => '<li>' + esc(v.name) + ' — <code>' +
              esc(v.lang) + '</code></li>').join('') + '</ul></details>'
            : ''
        ].join('');
        $('[data-sp="test"]', host).addEventListener('click', () => AH.speech.speak('ب'));
        $('[data-sp="refresh"]', host).addEventListener('click', () => {
          AH.speech.refreshVoices();
          draw();
        });
      }
      draw();
      /* sesler geç yüklenirse kutuyu tazele */
      AH.speech.voicesReady().then(() => { if (document.getElementById('sp-diag')) draw(); });
    })();

    window.__auItems = items;

    $$('[data-rec]').forEach((b) => b.addEventListener('click', () => {
      const it = items[Number(b.dataset.rec)];
      if (recState) {                       /* kaydı bitir */
        const cur = recState; recState = null;
        b.textContent = '⏺ Kaydet';
        cur.rec.stop().then((blob) => AH.audio.put(cur.key, blob))
          .then(() => { renderAudio(); })
          .catch((e) => alert('Kayıt hatası: ' + e.message));
        return;
      }
      AH.audio.record().then((r) => {
        recState = { key: it.key, rec: r };
        b.textContent = '⏹ Bitir';
        b.classList.add('recording');
      }).catch((e) => alert('Mikrofon açılamadı: ' + e.message));
    }));

    $$('[data-play]').forEach((b) => b.addEventListener('click', () =>
      AH.audio.play(items[Number(b.dataset.play)].key)));

    $$('[data-drop]').forEach((b) => b.addEventListener('click', () => {
      const it = items[Number(b.dataset.drop)];
      const alsoInApp = AH.audio.builtInKeys().indexOf(it.key) >= 0;
      if (!confirm('"' + it.label + '" kaydı bu tarayıcıdan silinsin mi?' +
          (alsoInApp ? '\n\nNot: Uygulamaya gömülü eski kayıt kalır ve o çalınır. ' +
            'Tamamen silmek için sesi sildikten sonra “Sesleri uygulamaya göm” ile ' +
            'custom-audio.js dosyasını yeniden üret.' : ''))) return;
      AH.audio.del(it.key).then(renderAudio);
    }));
  }

  /* ------------------------------------------------------------------ */
  /* SESLERİ UYGULAMAYA KALICI GÖMME                                     */
  /* js/custom-audio.js dosyasının yeni içeriğini üretir.                */
  /* ------------------------------------------------------------------ */
  /** js/custom-audio.js dosyasının METNİ → Promise<{text, count}|null> */
  function audioFileText() {
    if (!AH.audio || !AH.audio.supported) return Promise.resolve(null);
    return AH.audio.exportAll().then((map) => {
      const keys = Object.keys(map);
      if (!keys.length) return null;
      const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const body = keys.map((k) =>
        '    ' + JSON.stringify(k) + ': ' + JSON.stringify(map[k])
      ).join(',\n');
      return {
        count: keys.length,
        text: [
          '/* =========================================================================',
          '   custom-audio.js — ÖĞRETMENİN KENDİ SESİYLE KAYDETTİĞİ, UYGULAMAYA',
          '   KALICI OLARAK GÖMÜLMÜŞ TELAFFUZLAR',
          '',
          '   Bu dosya yönetici panelindeki "Sesleri uygulamaya göm" düğmesi ile',
          '   üretilmiştir. Elle düzenlenmesi gerekmez.',
          '',
          '   ⚠ KURAL: İçeriği, yöneticinin AÇIK ONAYI olmadan değiştirilmez.',
          '',
          '   Üretim zamanı : ' + stamp,
          '   Ses sayısı    : ' + keys.length,
          '   ========================================================================= */',
          '(function () {',
          "  'use strict';",
          '  const AH = (window.AH = window.AH || {});',
          '',
          '  AH.customAudio = {',
          body,
          '  };',
          '',
          '  AH.customAudioMeta = {',
          '    savedAt: ' + JSON.stringify(stamp) + ',',
          '    count: ' + keys.length,
          '  };',
          '})();',
          ''
        ].join('\n')
      };
    });
  }

  function persistAudio() {
    if (!AH.audio || !AH.audio.supported) {
      alert('Bu tarayıcıda ses desteği yok.');
      return Promise.resolve(0);
    }
    return AH.audio.exportAll().then((map) => {
      const keys = Object.keys(map);
      if (!keys.length) {
        alert('Kaydedilecek ses yok. Önce “Ses Kaydı” sekmesinde mikrofonla kayıt yap.');
        return 0;
      }

      const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const body = keys.map((k) =>
        '    ' + JSON.stringify(k) + ': ' + JSON.stringify(map[k])
      ).join(',\n');

      const file = [
        '/* =========================================================================',
        '   custom-audio.js — ÖĞRETMENİN KENDİ SESİYLE KAYDETTİĞİ, UYGULAMAYA',
        '   KALICI OLARAK GÖMÜLMÜŞ TELAFFUZLAR',
        '',
        '   Bu dosya yönetici panelindeki "Sesleri uygulamaya göm" düğmesi ile',
        '   üretilmiştir. Elle düzenlenmesi gerekmez.',
        '',
        '   ⚠ KURAL: İçeriği, yöneticinin AÇIK ONAYI olmadan değiştirilmez.',
        '',
        '   Üretim zamanı : ' + stamp,
        '   Ses sayısı    : ' + keys.length,
        '   ========================================================================= */',
        '(function () {',
        "  'use strict';",
        '  const AH = (window.AH = window.AH || {});',
        '',
        '  AH.customAudio = {',
        body,
        '  };',
        '',
        '  AH.customAudioMeta = {',
        '    savedAt: ' + JSON.stringify(stamp) + ',',
        '    count: ' + keys.length,
        '  };',
        '})();',
        ''
      ].join('\n');

      downloadText(file, 'custom-audio.js', 'text/javascript');
      const mb = (file.length / 1048576).toFixed(2);
      alert('✅ ' + keys.length + ' ses "custom-audio.js" olarak indirildi (' + mb + ' MB).\n\n' +
        'Bu dosyayı projedeki js/custom-audio.js ile DEĞİŞTİR ve siteye yükle ' +
        '(GitHub’a push et).\n\nBundan sonra sesler her tarayıcıda ve her cihazda çalar.' +
        (file.length > 8388608
          ? '\n\n⚠ Dosya büyük (>8 MB). Sayfa açılışını yavaşlatabilir; ' +
            'kayıtları kısa tutmakta fayda var.'
          : ''));
      return keys.length;
    }).catch((e) => { alert('Sesler dışa aktarılamadı: ' + e.message); return 0; });
  }


  AH.adminAudio = {
    render: renderAudio,
    fileText: audioFileText,
    persist: persistAudio,
    targets: audioTargets
  };
})();

/* =========================================================================
   custom-audio.js — ÖĞRETMENİN KENDİ SESİYLE KAYDETTİĞİ, UYGULAMAYA
   KALICI OLARAK GÖMÜLMÜŞ TELAFFUZLAR

   Bu dosya, yönetici panelinde mikrofonla kaydedilen seslerin
   tarayıcıdan bağımsız, uygulamanın kendi içinde saklanan kopyasıdır.
   Tarayıcı verisi silinse, başka bir tarayıcı ya da başka bir cihaz
   kullanılsa bile buradaki sesler kaybolmaz.

   ⚠ KURAL: Bu dosyanın içeriği, yöneticinin AÇIK ONAYI olmadan
   değiştirilmez veya silinmez. Müfredat/veri güncellemeleri bu sesleri
   ETKİLEMEZ — anahtarlar okunacak metnin kendisidir (ör. "ب", "بَاب").

   Nasıl güncellenir:
     Yönetici paneli → 💾 Kalıcı Kayıt → "Sesleri uygulamaya göm"
     düğmesi bu dosyanın yeni içeriğini üretip indirir; indirilen dosyayı
     js/custom-audio.js ile değiştirip siteye yüklemek (GitHub'a push
     etmek) yeterlidir.

   Öncelik sırası (audio.js):
     1) tarayıcıda taze kaydedilmiş ses (IndexedDB)
     2) BU DOSYA
     3) cihazın Arapça konuşma sentezi (TTS)
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  /* Biçim:
     "<harf ya da kelime>": "data:audio/webm;base64,…"
  */
  AH.customAudio = {
    /* Henüz uygulamaya gömülmüş ses yok.
       Yönetici panelinden "Sesleri uygulamaya göm" ile doldurulur. */
  };

  AH.customAudioMeta = {
    savedAt: null,
    count: 0
  };
})();

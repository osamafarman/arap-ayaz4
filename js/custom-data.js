/* =========================================================================
   custom-data.js — YÖNETİCİNİN YAPTIĞI, UYGULAMAYA KALICI OLARAK
   GÖMÜLMÜŞ İÇERİK DEĞİŞİKLİKLERİ

   Bu dosya yönetici panelindeki "İçerik değişikliklerini göm" düğmesi ile
   üretilmiştir. Elle düzenlenmesi gerekmez.

   ⚠ KURAL: İçeriği, yöneticinin AÇIK ONAYI olmadan değiştirilmez.

   Üretim zamanı    : 2026-08-03 07:14:55
   Düzenlenen harf  : 0
   Düzenlenen kelime: 0
   Eklenen kelime   : 0
   Silinen kelime   : 0
   (Üslup imzaları ayrı dosyadadır: js/custom-learn.js)
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  AH.customData = {
    letters: {},
    exercises: {},
    added: [],
    deleted: [],
    ui: null,
    auditOk: {"dir|ـح":1,"dir|ـخ":1,"dir|ص":1,"dir|صـ":1,"dir|ـغـ":1}
  };

  AH.customDataMeta = {
    savedAt: "2026-08-03 07:14:55"
  };
})();

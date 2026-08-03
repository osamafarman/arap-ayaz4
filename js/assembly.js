/* =========================================================================
   assembly.js — "Kelime Kurma" mini oyunu (sürükle-bırak)
   Tuval kilidini açmadan önce öğrenci, harfin doğru FORMUNU (başta/ortada/sonda)
   doğru yuvaya yerleştirmek zorundadır.

   Etkileşim: Pointer Events ile gerçek sürükleme (fare + dokunmatik)
              + dokun/tıkla-seç → yuvaya dokun/tıkla (erişilebilir yedek yol)
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Doğru parçalara benzeyen ama yanlış olan çeldiriciler üretir. */
  function buildDistractors(equation, count) {
    const used = new Set(equation);
    const pool = AH.data.DISTRACTOR_POOL.filter((f) => !used.has(f));
    // Aynı harfin farklı formlarını öne al (asıl öğretici çeldirici bunlar)
    const bareOf = (f) => f.replace(/ـ/g, '');
    const bares = new Set(equation.map(bareOf));
    const near = pool.filter((f) => bares.has(bareOf(f)));
    const far = pool.filter((f) => !bares.has(bareOf(f)));
    return shuffle(near).slice(0, count).concat(
      shuffle(far).slice(0, Math.max(0, count - Math.min(count, near.length)))
    ).slice(0, count);
  }

  /**
   * @param {HTMLElement} host
   * @param {object} exercise
   * @param {function} onSolved
   * @param {boolean} alreadySolved  daha önce çözülmüşse doğrudan tamamlanmış göster
   */
  function mount(host, exercise, onSolved, alreadySolved) {
    const equation = exercise.equation.slice();
    const distractors = buildDistractors(equation, equation.length >= 4 ? 2 : 3);
    const chips = shuffle(equation.concat(distractors));

    host.innerHTML = [
      '<div class="assembly">',
      '  <div class="assembly-head">',
      '    <span class="assembly-title">🧩 Önce kelimeyi kur</span>',
      '    <span class="assembly-hint-text">Parçaları doğru yuvalara sürükle (veya parçaya sonra yuvaya dokun).</span>',
      '  </div>',
      '  <div class="slots" role="list">',
      equation
        .map(
          (f, i) =>
            '<div class="slot" role="listitem" tabindex="0" data-index="' +
            i +
            '" aria-label="' + (i + 1) + '. yuva"></div>' +
            (i < equation.length - 1 ? '<span class="plus">+</span>' : '')
        )
        .join(''), /* görsel sıra CSS "direction: rtl" ile sağdan sola akar */
      '    <span class="equals">=</span>',
      '    <span class="slot-result" aria-live="polite">؟</span>',
      '  </div>',
      '  <div class="tray" role="list">',
      chips
        .map(
          (f) =>
            '<button type="button" class="chip" role="listitem" data-frag="' +
            f +
            '"><span>' + f + '</span></button>'
        )
        .join(''),
      '  </div>',
      '  <div class="assembly-actions">',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="hint">💡 İpucu</button>',
      '    <button type="button" class="btn btn-ghost btn-sm" data-act="reset">↺ Baştan</button>',
      '    <span class="assembly-status" aria-live="polite"></span>',
      '  </div>',
      '</div>'
    ].join('');

    const slotEls = Array.prototype.slice.call(host.querySelectorAll('.slot'));
    const trayEl = host.querySelector('.tray');
    const statusEl = host.querySelector('.assembly-status');
    const resultEl = host.querySelector('.slot-result');
    const filled = new Array(equation.length).fill(null);
    let selected = null;
    let solved = false;

    function updateResult() {
      const done = filled.filter(Boolean).length;
      resultEl.textContent = done ? filled.map((f) => f || '').join('').replace(/ـ/g, '') : '؟';
      if (done === equation.length) resultEl.textContent = exercise.result;
    }

    function select(chip) {
      if (selected === chip) {
        selected.classList.remove('selected');
        selected = null;
        return;
      }
      if (selected) selected.classList.remove('selected');
      selected = chip;
      if (chip) chip.classList.add('selected');
    }

    function reject(slotEl, msg) {
      slotEl.classList.add('bad');
      statusEl.textContent = msg || 'Bu form buraya uymuyor — bağlantı yönüne bak.';
      statusEl.className = 'assembly-status bad';
      setTimeout(() => slotEl.classList.remove('bad'), 500);
    }

    function place(chip, slotEl) {
      if (solved || !chip || !slotEl) return false;
      const idx = Number(slotEl.dataset.index);
      if (filled[idx]) return false;
      const frag = chip.dataset.frag;
      if (frag !== equation[idx]) {
        reject(slotEl);
        return false;
      }
      filled[idx] = frag;
      slotEl.textContent = frag;
      slotEl.classList.add('filled');
      slotEl.dataset.chipFrag = frag;
      chip.classList.add('used');
      chip.disabled = true;
      if (selected === chip) select(null);
      statusEl.textContent = '';
      statusEl.className = 'assembly-status';
      updateResult();

      if (filled.every(Boolean)) {
        solved = true;
        statusEl.textContent = '✅ Doğru! Kelimeyi kurdun.';
        statusEl.className = 'assembly-status good';
        host.querySelector('.assembly').classList.add('solved');
        if (typeof onSolved === 'function') onSolved();
      }
      return true;
    }

    /* --------- gerçek sürükleme (fare + dokunmatik tek yol) --------- */
    let dragChip = null, ghostEl = null, startX = 0, startY = 0, moved = false;

    function onChipDown(e) {
      const chip = e.currentTarget;
      if (chip.disabled || solved) return;
      e.preventDefault();
      dragChip = chip;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      try { chip.setPointerCapture(e.pointerId); } catch (_) {}
    }

    function onChipMove(e) {
      if (!dragChip) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 8) return;
      if (!moved) {
        moved = true;
        ghostEl = document.createElement('div');
        ghostEl.className = 'chip drag-ghost';
        ghostEl.innerHTML = '<span>' + dragChip.dataset.frag + '</span>';
        document.body.appendChild(ghostEl);
        dragChip.classList.add('dragging');
      }
      ghostEl.style.left = e.clientX + 'px';
      ghostEl.style.top = e.clientY + 'px';

      const over = slotUnder(e.clientX, e.clientY);
      slotEls.forEach((s) => s.classList.toggle('hover', s === over));
    }

    function slotUnder(x, y) {
      if (ghostEl) ghostEl.style.display = 'none';
      const el = document.elementFromPoint(x, y);
      if (ghostEl) ghostEl.style.display = '';
      const direct = el && el.closest ? el.closest('.slot') : null;
      if (direct) return direct;
      /* Yedek: geometrik isabet testi. Yapışkan başlık gibi bir katman
         araya girdiğinde elementFromPoint yuvayı bulamaz. */
      return (
        slotEls.find((s) => {
          const r = s.getBoundingClientRect();
          return x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8;
        }) || null
      );
    }

    function onChipUp(e) {
      if (!dragChip) return;
      const chip = dragChip;
      const wasMoved = moved;
      const target = wasMoved ? slotUnder(e.clientX, e.clientY) : null;
      cleanupDrag();
      if (wasMoved) {
        if (target) place(chip, target);
      } else {
        select(chip); // hareket yoksa: seçim modu
      }
    }

    function cleanupDrag() {
      if (ghostEl && ghostEl.parentNode) ghostEl.parentNode.removeChild(ghostEl);
      ghostEl = null;
      if (dragChip) dragChip.classList.remove('dragging');
      dragChip = null;
      moved = false;
      slotEls.forEach((s) => s.classList.remove('hover'));
    }

    Array.prototype.forEach.call(host.querySelectorAll('.chip'), (chip) => {
      chip.style.touchAction = 'none';
      chip.addEventListener('pointerdown', onChipDown);
      chip.addEventListener('pointermove', onChipMove);
      chip.addEventListener('pointerup', onChipUp);
      chip.addEventListener('pointercancel', cleanupDrag);
      chip.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          select(chip);
        }
      });
    });

    /* --------- yuvaya tıkla/dokun (seçili parçayı yerleştir) --------- */
    slotEls.forEach((slotEl) => {
      const act = () => {
        const idx = Number(slotEl.dataset.index);
        if (filled[idx]) {
          // dolu yuvaya dokunma → parçayı geri al
          if (solved) return;
          const frag = slotEl.dataset.chipFrag;
          const chip = host.querySelector('.chip.used[data-frag="' + frag + '"]');
          if (chip) { chip.classList.remove('used'); chip.disabled = false; }
          filled[idx] = null;
          slotEl.textContent = '';
          slotEl.classList.remove('filled');
          delete slotEl.dataset.chipFrag;
          updateResult();
          return;
        }
        if (selected) place(selected, slotEl);
        else {
          statusEl.textContent = 'Önce aşağıdan bir parça seç.';
          statusEl.className = 'assembly-status';
        }
      };
      slotEl.addEventListener('click', act);
      slotEl.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); act(); }
      });
    });

    /* --------- ipucu / sıfırla --------- */
    host.querySelector('[data-act="hint"]').addEventListener('click', () => {
      const idx = filled.findIndex((f) => !f);
      if (idx < 0) return;
      const chip = host.querySelector('.chip:not(.used)[data-frag="' + equation[idx] + '"]');
      const slotEl = slotEls.find((s) => Number(s.dataset.index) === idx);
      if (chip && slotEl) {
        slotEl.classList.add('hover');
        setTimeout(() => slotEl.classList.remove('hover'), 900);
        place(chip, slotEl);
      }
    });

    host.querySelector('[data-act="reset"]').addEventListener('click', () => {
      if (solved) return;
      filled.fill(null);
      slotEls.forEach((s) => {
        s.textContent = '';
        s.classList.remove('filled');
        delete s.dataset.chipFrag;
      });
      Array.prototype.forEach.call(host.querySelectorAll('.chip'), (c) => {
        c.classList.remove('used');
        c.disabled = false;
      });
      select(null);
      statusEl.textContent = '';
      updateResult();
    });

    updateResult();

    if (alreadySolved) {
      // Daha önce tamamlanmışsa oyunu otomatik çöz, öğrenci doğrudan yazabilsin
      equation.forEach((frag, i) => {
        const chip = host.querySelector('.chip:not(.used)[data-frag="' + frag + '"]');
        const slotEl = slotEls.find((s) => Number(s.dataset.index) === i);
        if (chip && slotEl) place(chip, slotEl);
      });
    }

    return {
      isSolved: () => solved,
      destroy: cleanupDrag
    };
  }

  AH.assembly = { mount };
})();

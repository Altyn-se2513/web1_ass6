(function () {
  const KEY_SHELF   = 'bc_shelf';
  const KEY_READING = 'bc_reading';
  const KEY_DAYS    = 'bc_readDays';

  const getShelf   = () => JSON.parse(localStorage.getItem(KEY_SHELF) || '[]');
  const setShelf   = (a) => localStorage.setItem(KEY_SHELF, JSON.stringify(a));
  const getReading = () => JSON.parse(localStorage.getItem(KEY_READING) || '[]');
  const setReading = (a) => localStorage.setItem(KEY_READING, JSON.stringify(a));
  const getDays    = () => JSON.parse(localStorage.getItem(KEY_DAYS) || '[]');
  const setDays    = (a) => localStorage.setItem(KEY_DAYS, JSON.stringify(a));

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g,
    (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const localDate = (dt = new Date()) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  window.renderShelf = function () {
    const grid = document.getElementById('my-shelf');
    if (!grid) return;
    const shelf = getShelf();
    if (!shelf.length) {
      grid.innerHTML = '<p class="empty-msg p-3">No books yet. <a href="3product.html">Add some from the catalog</a>.</p>';
      return;
    }
    grid.innerHTML = shelf.map((b) => `
      <div class="shelf-item p-2">
        <img src="${escapeHtml(b.cover || 'imgs/logo.png')}" alt="${escapeHtml(b.title)} cover">
        <div class="shelf-item-info">
          <h4>${escapeHtml(b.title)}</h4>
          <p>${escapeHtml(b.author || '')}</p>
        </div>
        <button class="btn btn-sm btn-outline-danger shelf-remove" data-id="${b.id}" aria-label="Remove from shelf">✕</button>
      </div>
    `).join('');

    grid.querySelectorAll('.shelf-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        setShelf(getShelf().filter((x) => x.id !== btn.dataset.id));
        window.renderShelf();
        if (window.Sound) window.Sound.playBeep(400, 0.08);
      });
    });
  };

  window.renderReadingProgress = function () {
    const box = document.getElementById('my-books');
    if (!box) return;
    const books = getReading();
    if (!books.length) {
      box.innerHTML = '<p class="empty-msg p-3">No books in progress. Add one below.</p>';
      return;
    }
    box.innerHTML = books.map((b) => {
      const pct = b.total > 0 ? Math.min(100, Math.round((b.current / b.total) * 100)) : 0;
      return `
        <div class="book-item p-3">
          <div class="book-item-info">
            <h4 class="mb-1">${escapeHtml(b.title)}</h4>
            <p class="book-item-author mb-1">${escapeHtml(b.author || 'Unknown')}</p>
            <p class="book-item-progress mb-1">Page ${b.current} of ${b.total || '?'} — ${pct}%</p>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="book-item-actions">
            <button class="btn btn-sm btn-outline-primary" data-inc="${b.id}">+10</button>
            <button class="btn btn-sm btn-outline-secondary" data-dec="${b.id}">−10</button>
            <button class="btn btn-sm btn-outline-danger" data-del="${b.id}" aria-label="Remove">✕</button>
          </div>
        </div>`;
    }).join('');

    box.querySelectorAll('[data-inc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const books = getReading();
        const b = books.find((x) => x.id === btn.dataset.inc);
        if (b) {
          b.current = Math.min(b.total || (b.current + 10), b.current + 10);
          setReading(books);
          window.renderReadingProgress();
          if (window.Sound) window.Sound.playBeep(700, 0.06);
        }
      });
    });
    box.querySelectorAll('[data-dec]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const books = getReading();
        const b = books.find((x) => x.id === btn.dataset.dec);
        if (b) {
          b.current = Math.max(0, b.current - 10);
          setReading(books);
          window.renderReadingProgress();
        }
      });
    });
    box.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setReading(getReading().filter((x) => x.id !== btn.dataset.del));
        window.renderReadingProgress();
      });
    });
  };

  window.updateStreakUI = function () {
    const days = getDays();
    const set = new Set(days);

    let current = 0;
    let d = new Date();
    if (!set.has(localDate(d))) d.setDate(d.getDate() - 1);
    while (set.has(localDate(d))) {
      current++;
      d.setDate(d.getDate() - 1);
    }

    const sorted = [...set].sort();
    let best = 0, cur = 0, prev = null;
    for (const s of sorted) {
      const date = new Date(s + 'T00:00:00');
      if (prev && (date - prev) / 86400000 === 1) cur++;
      else cur = 1;
      if (cur > best) best = cur;
      prev = date;
    }

    const total = set.size;

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('streak-count', current);
    setText('stat-current', current);
    setText('stat-current-2', current);
    setText('stat-best', best);
    setText('stat-best-2', best);
    setText('stat-total', total);
    setText('stat-total-2', total);
    setText('hero-streak', current);

    const msgEl = document.getElementById('streak-message');
    if (msgEl) {
      if (current === 0) msgEl.textContent = 'Log your first 20-min session today.';
      else if (current === 1) msgEl.textContent = 'Great start! Come back tomorrow.';
      else if (current < 7) msgEl.textContent = `${current} days in a row! Keep going.`;
      else msgEl.textContent = `${current}-day streak! You're on fire!`;
    }

    const cal = document.getElementById('streak-calendar');
    if (cal) {
      cal.innerHTML = '';
      const today = new Date();
      for (let i = 27; i >= 0; i--) {
        const dt = new Date(today);
        dt.setDate(dt.getDate() - i);
        const iso = localDate(dt);
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        if (set.has(iso)) cell.classList.add('active');
        if (i === 0) cell.classList.add('today');
        cell.textContent = dt.getDate();
        cell.title = iso;
        cal.appendChild(cell);
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('streak-toggle');
    const panel = document.getElementById('streak-panel');
    if (toggle && panel) {
      toggle.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
        toggle.setAttribute('aria-expanded', String(!panel.hidden));
        if (window.Sound) window.Sound.playBeep(700, 0.05);
      });
    }

    const logBtn = document.getElementById('log-read-btn');
    if (logBtn) {
      logBtn.addEventListener('click', () => {
        const today = localDate();
        const days = getDays();
        if (days.includes(today)) {
          alert('Already logged for today — come back tomorrow!');
          return;
        }
        days.push(today);
        setDays(days);
        window.updateStreakUI();
        if (window.Sound) window.Sound.playBeep(1100, 0.15);
      });
    }

    const addForm = document.getElementById('add-book-form');
    if (addForm) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('book-title').value.trim();
        const author = document.getElementById('book-author').value.trim();
        const total = parseInt(document.getElementById('book-total').value, 10) || 0;
        const current = parseInt(document.getElementById('book-current').value, 10) || 0;

        if (!title) { alert('Book title is required.'); return; }

        const books = getReading();
        books.push({ id: 'book_' + Date.now(), title, author, total, current, updatedAt: Date.now() });
        setReading(books);
        addForm.reset();
        window.renderReadingProgress();
        if (window.Sound) window.Sound.playBeep(800, 0.1);
      });
    }

    window.updateStreakUI();
    window.renderShelf();
    window.renderReadingProgress();
  });
})();
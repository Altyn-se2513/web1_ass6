(function () {
  const localDate = (dt = new Date()) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  try {
    const days = JSON.parse(localStorage.getItem('bc_readDays') || '[]');
    const set = new Set(days);
    let current = 0;
    let d = new Date();
    if (!set.has(localDate(d))) d.setDate(d.getDate() - 1);
    while (set.has(localDate(d))) {
      current++;
      d.setDate(d.getDate() - 1);
    }
    const el = document.getElementById('hero-streak-preview');
    if (el) el.textContent = current;
  } catch (e) {  }

  const nf = document.getElementById('newsletter-form');
  if (nf) {
    nf.addEventListener('submit', (e) => {
      e.preventDefault();
      if (window.Sound) window.Sound.playBeep(900, 0.1);
      alert('Demo form — subscription was not created.');
      nf.reset();
    });
  }
})();
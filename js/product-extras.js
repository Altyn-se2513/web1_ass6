/* Product page extras (shelf + hash navigation) */
(function () {
  const KEY_SHELF = 'bc_shelf';
  const getShelf = () => JSON.parse(localStorage.getItem(KEY_SHELF) || '[]');
  const setShelf = (a) => localStorage.setItem(KEY_SHELF, JSON.stringify(a));

  function updateButtons() {
    const shelf = getShelf();
    document.querySelectorAll('.add-to-shelf').forEach((btn) => {
      const onShelf = shelf.some((b) => b.id === btn.dataset.id);
      btn.classList.toggle('on-shelf', onShelf);
      btn.innerHTML = onShelf ? 'On your shelf' : 'Add to Shelf';
    });
  }

  document.querySelectorAll('.add-to-shelf').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const shelf = getShelf();
      const idx = shelf.findIndex((b) => b.id === id);
      if (idx > -1) {
        shelf.splice(idx, 1);
      } else {
        shelf.push({
          id,
          title: btn.dataset.title,
          author: btn.dataset.author,
          cover: btn.dataset.cover,
          addedAt: Date.now()
        });
      }
      setShelf(shelf);
      updateButtons();
      if (window.Sound) window.Sound.playBeep(800, 0.1);
      btn.style.transform = 'scale(0.9)';
      setTimeout(() => (btn.style.transform = 'scale(1)'), 150);
    });
  });

  updateButtons();

  function openBookFromHash() {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (target && target.tagName === 'DETAILS') {
      target.open = true;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  window.addEventListener('DOMContentLoaded', openBookFromHash);
  window.addEventListener('hashchange', openBookFromHash);
})();

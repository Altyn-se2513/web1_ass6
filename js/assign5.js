/* Small shared helper: makes text safe before putting it into innerHTML
   (protects the page from HTML/JS injection from external data). */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
 
/*  1. Theme Toggle (Day / Night)
    The saved theme is applied in <head> by js/theme-init.js;
    here we only handle the button click.  */
(function () {
  const key = 'bc_theme';
  const root = document.documentElement;
  const button = document.getElementById('theme-toggle');
 
  function updateButton() {
    if (!button) return;
    const isDark = root.getAttribute('data-theme') === 'dark';
    button.textContent = isDark ? '☀' : '☾';
    button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  updateButton();
 
  if (button) {
    button.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem(key, next);
      root.style.removeProperty('--bg-page'); // drop custom background from "Change Background"
      updateButton();
      if (window.Sound) window.Sound.playBeep(500, 0.06);
    });
  }
})();
 
/*  2. Sound Effects Utility (Web Audio API)
    One AudioContext for the whole page. Before a new beep starts,
    the previous one is stopped, so sounds never overlap
    (evaluation criterion: "Audio does not overlap").  */
window.Sound = (function () {
  let audioCtx = null;
  let currentOsc = null; // the beep that is playing right now
 
  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Browsers may "suspend" audio until the user interacts with the page
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
 
  function playBeep(freq = 800, duration = 0.1, type = 'sine') {
    try {
      const ctx = getCtx();
 
      // Stop the previous beep -> no overlapping sounds
      if (currentOsc) {
        try { currentOsc.stop(); } catch (e) { /* already stopped */ }
      }
 
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
 
      currentOsc = osc;
      // Free audio nodes when the beep ends (no memory build-up)
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        if (currentOsc === osc) currentOsc = null;
      };
    } catch (e) { /* audio not supported — the site still works */ }
  }
 
  return { playBeep };
})();
 
/*  3. Quote Library (Object with properties + methods)  */
window.QuoteLibrary = {
  quotes: [
    { text: "So we beat on, boats against the current, borne back ceaselessly into the past.", author: "F. Scott Fitzgerald, The Great Gatsby" },
    { text: "Big Brother is watching you.", author: "George Orwell, 1984" },
    { text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", author: "Jane Austen, Pride and Prejudice" },
    { text: "In a hole in the ground there lived a hobbit.", author: "J.R.R. Tolkien, The Hobbit" },
    { text: "A man can be destroyed but not defeated.", author: "Ernest Hemingway, The Old Man and the Sea" },
    { text: "When you want something, all the universe conspires in helping you to achieve it.", author: "Paulo Coelho, The Alchemist" },
    { text: "Pain and suffering are always inevitable for a large intelligence and a deep heart.", author: "Fyodor Dostoevsky, Crime and Punishment" },
    { text: "It was a pleasure to burn.", author: "Ray Bradbury, Fahrenheit 451" }
  ],
  lastIndex: -1,
 
  // Returns a random quote, never the same one twice in a row
  getRandom() {
    let i;
    do {
      i = Math.floor(Math.random() * this.quotes.length);
    } while (i === this.lastIndex && this.quotes.length > 1);
    this.lastIndex = i;
    return this.quotes[i];
  },
 
  // Puts a quote into an element with a fade + slide animation
  renderTo(el) {
    if (!el) return;
    const q = this.getRandom();
    el.innerHTML = `"${escapeHtml(q.text)}"<br><small class="text-muted">— ${escapeHtml(q.author)}</small>`;
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => {
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 50);
  }
};
 
/*  4. Random Quote Generator (uses QuoteLibrary)  */
(function () {
  const btn = document.getElementById('random-quote-btn');
  const display = document.getElementById('random-quote-display');
  if (!btn || !display) return;
 
  btn.addEventListener('click', () => {
    Sound.playBeep(600, 0.08);
    QuoteLibrary.renderTo(display);
  });
})();
 
/*  5. Contact Form (async submit with fetch + callbacks)  */
(function () {
  const form = document.getElementById('contact-form');
  const errBox = document.getElementById('contact-error');
  const successBox = document.getElementById('contact-success');
  if (!form || !errBox) return;
 
  form.addEventListener('submit', function (e) {
    e.preventDefault(); // no page reload
    if (successBox) successBox.hidden = true;
 
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    const genreEl = document.getElementById('genre');
    const genre = genreEl ? genreEl.value : '';
    const methodEl = form.querySelector('input[name="contact-method"]:checked');
    const contactMethod = methodEl ? methodEl.value : 'email';
    const subscribeEl = document.getElementById('subscribe');
    const subscribe = subscribeEl ? subscribeEl.checked : false;
 
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errors = [];
 
    if (!name) errors.push('Name is required.');
    if (!email) errors.push('Email is required.');
    else if (!emailRegex.test(email)) errors.push('Please enter a valid email address.');
    if (!message) errors.push('Message is required.');
    else if (message.length < 10) errors.push('Message must be at least 10 characters.');
 
    if (errors.length) {
      errBox.innerHTML = errors.map((m) => '• ' + escapeHtml(m)).join('<br>');
      errBox.hidden = false;
      errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (window.Sound) Sound.playBeep(250, 0.12, 'square'); // low "error" sound
      return;
    }
 
    errBox.hidden = true;
 
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
 
    // fetch POST + callbacks (.then / .catch / .finally)
    fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message, genre, contactMethod, subscribe })
    })
      .then((response) => {
        if (!response.ok) throw new Error('Server responded with ' + response.status);
        return response.json();
      })
      .then((data) => {
        if (successBox) {
          successBox.textContent = `Thank you, ${name}! Your message has been sent (id ${data.id}). We will respond within 24 hours.`;
          successBox.hidden = false;
          successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (window.Sound) Sound.playBeep(1000, 0.12);
        form.reset();
      })
      .catch((err) => {
        errBox.textContent = 'Could not send message: ' + err.message;
        errBox.hidden = false;
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      });
  });
 
  // Reset also hides the feedback boxes
  form.addEventListener('reset', () => {
    errBox.hidden = true;
    if (successBox) successBox.hidden = true;
  });
})();
 
/*  6. FAQ Accordion (only one item open at a time)  */
(function () {
  const headers = document.querySelectorAll('.accordion-header');
  if (!headers.length) return;
 
  function closeItem(item) {
    item.classList.remove('active');
    const content = item.querySelector('.accordion-content');
    const header = item.querySelector('.accordion-header');
    if (content) content.style.maxHeight = null;
    if (header) header.setAttribute('aria-expanded', 'false');
  }
 
  headers.forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const content = btn.nextElementSibling;
      const isOpen = item.classList.contains('active');
 
      // close all other open items
      document.querySelectorAll('.accordion-item-custom.active').forEach((other) => {
        if (other !== item) closeItem(other);
      });
 
      if (isOpen) {
        closeItem(item);
      } else {
        item.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px'; // animated by CSS transition
        btn.setAttribute('aria-expanded', 'true');
      }
      if (window.Sound) Sound.playBeep(600, 0.04);
    });
  });
})();
 
/*  7. Popup Subscription Form (Home page)  */
(function () {
  const popup = document.getElementById('popup-overlay');
  const openBtn = document.getElementById('open-popup');
  const closeBtn = document.getElementById('close-popup');
  const popupForm = document.getElementById('popup-subscribe-form');
  const popupError = document.getElementById('popup-error');
  const popupEmail = document.getElementById('popup-email');
 
  function openPopup() {
    if (!popup) return;
    popup.hidden = false;
    document.body.style.overflow = 'hidden'; // lock page scroll behind popup
    if (popupEmail) popupEmail.focus();
  }
  function closePopup() {
    if (!popup) return;
    popup.hidden = true;
    document.body.style.overflow = '';
    if (popupError) popupError.hidden = true;
  }
 
  if (openBtn) openBtn.addEventListener('click', openPopup);
  if (closeBtn) closeBtn.addEventListener('click', closePopup);
 
  if (popup) {
    popup.addEventListener('click', (e) => { if (e.target === popup) closePopup(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !popup.hidden) closePopup();
    });
  }
 
  if (popupForm) {
    popupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = popupEmail ? popupEmail.value.trim() : '';
 
      // Validation: earlier the form "subscribed" even with an empty email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (popupError) {
          popupError.textContent = 'Please enter a valid email address.';
          popupError.hidden = false;
        }
        if (window.Sound) Sound.playBeep(250, 0.12, 'square');
        return;
      }
 
      if (window.Sound) Sound.playBeep(900, 0.1);
      alert('Demo — subscription was not actually created.');
      popupForm.reset();
      closePopup();
    });
  }
})();
 
/*  8. Background Color Changer (style via CSS variable)  */
(function () {
  const lightPalette = ['#eef5fc', '#c11a1a', '#ee7c11', '#eee311', '#00ff04', '#1267e6', '#f8059b'];
  const darkPalette  = ['#0a1a2e', '#651616', '#82500b', '#a69f10', '#0a3f15', '#09274e', '#6c0a43'];
  let idx = 0;
  const btn = document.getElementById('bg-color-btn');
  if (!btn) return;
 
  btn.addEventListener('click', () => {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const colors = theme === 'dark' ? darkPalette : lightPalette;
    idx = (idx + 1) % colors.length; // loop through the array
    document.documentElement.style.setProperty('--bg-page', colors[idx]);
    if (window.Sound) Sound.playBeep(450, 0.05);
  });
})();
 
/*  8b. Theme Accent Color Picker (Contact page)
    The saved accent is applied on ALL pages by js/theme-init.js.
    Here we only sync the picker and save new values.  */
(function () {
  const picker = document.getElementById('theme-color');
  if (!picker) return;
 
  const saved = localStorage.getItem('bc_accent');
  if (saved) picker.value = saved;
 
  picker.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--primary', e.target.value);
    localStorage.setItem('bc_accent', e.target.value);
  });
 
  picker.addEventListener('change', () => {
    if (window.Sound) Sound.playBeep(650, 0.06);
  });
})();
 
/*  9. Live Date & Time (footer clock, updates every second)  */
(function () {
  const el = document.getElementById('datetime');
  if (!el) return;
 
  function update() {
    const now = new Date();
    const options = {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    };
    el.textContent = now.toLocaleString('en-US', options);
  }
  update();
  setInterval(update, 1000);
})();
 
/*  10. Keyboard Navigation for Navbar (keydown + switch on e.key)
    ←/→ for the horizontal menu, ↑/↓ for the collapsed (vertical) menu,
    Home/End jump to the first/last item. The menu wraps around.  */
(function () {
  const nav = document.querySelector('.navbar-nav');
  if (!nav) return;
  const links = nav.querySelectorAll('.nav-link');
  if (!links.length) return;
 
  links.forEach((link, index) => {
    link.addEventListener('keydown', (e) => {
      let next = null;
 
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          next = (index + 1) % links.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          next = (index - 1 + links.length) % links.length;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = links.length - 1;
          break;
        default:
          return; // any other key works as usual
      }
 
      e.preventDefault();
      links[next].focus();
    });
  });
})();
 
/*  11. Time of day helper (switch statement)
    Used by BOTH greetings below — earlier the same switch was copied twice.
    Math.floor(hour / 6) turns 0–23 into 0,1,2,3 (four 6-hour parts of the day).  */
function getDayPart(hour) {
  switch (Math.floor(hour / 6)) {
    case 1:  return 'morning';    // 06:00–11:59
    case 2:  return 'afternoon';  // 12:00–17:59
    case 3:  return 'evening';    // 18:00–23:59
    default: return 'night';      // 00:00–05:59
  }
}
 
/*  11a. Time-based Greeting (Home page)  */
(function () {
  const el = document.getElementById('greeting-message');
  if (!el) return;
 
  // Object as a lookup table: day part -> message
  const messages = {
    morning:   'Good morning! Start your day with a great book.',
    afternoon: 'Good afternoon! Take a reading break.',
    evening:   'Good evening! Time to relax with a story.',
    night:     'Good night! Read a few pages before sleep.'
  };
  el.textContent = messages[getDayPart(new Date().getHours())];
})();
 
/*  12. Personal Greeting from input (getElementById + textContent)  */
(function () {
  const btn = document.getElementById('greet-btn');
  const input = document.getElementById('greet-name');
  const out = document.getElementById('personal-greeting');
  if (!btn || !input || !out) return;
 
  function greet() {
    const name = input.value.trim();
    if (!name) {
      out.textContent = 'Please enter your name first.';
      return;
    }
    const part = getDayPart(new Date().getHours());
    out.textContent = `Good ${part}, ${name}! Ready for your next book?`;
 
    // fade-in animation
    out.style.transition = 'none';
    out.style.opacity = '0';
    setTimeout(() => { out.style.transition = 'opacity .3s'; out.style.opacity = '1'; }, 30);
 
    if (window.Sound) Sound.playBeep(700, 0.08);
    localStorage.setItem('bc_userName', name);
  }
 
  // Restore the name from a previous visit
  const saved = localStorage.getItem('bc_userName');
  if (saved) input.value = saved;
 
  btn.addEventListener('click', greet);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); greet(); }
  });
})();
 
/*  13. Image Gallery (Thumbnail → Main Image, changes the src attribute)  */
(function () {
  const mainImg = document.getElementById('gallery-main-img');
  const thumbs = document.querySelectorAll('.gallery-thumb');
  if (!mainImg || !thumbs.length) return;
 
  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const newSrc = thumb.getAttribute('data-src');
      if (!newSrc) return;
 
      mainImg.setAttribute('src', newSrc);
      const img = thumb.querySelector('img');
      if (img && img.alt) mainImg.setAttribute('alt', img.alt);
 
      thumbs.forEach((t) => t.classList.remove('active-thumb'));
      thumb.classList.add('active-thumb');
      if (window.Sound) Sound.playBeep(500, 0.05);
    });
  });
})();
 
/*  14. Product Filtering (Catalog page, switch statement)  */
(function () {
  const filterBtns = document.querySelectorAll('.filter-btn');
  if (!filterBtns.length) return;
 
  // Array of genre ids -> array of objects { id, h2, row }
  const ids = ['classics', 'scifi', 'fantasy', 'romance', 'history'];
  const sections = ids
    .map((id) => {
      const h2 = document.getElementById(id);
      return h2 ? { id, h2, row: h2.nextElementSibling } : null;
    })
    .filter(Boolean);
 
  // Decides which genre sections are visible for the chosen filter
  function getVisibleIds(filter) {
    switch (filter) {
      case 'all':
        return ids;
      case 'classics':
      case 'scifi':
      case 'fantasy':
      case 'romance':
      case 'history':
        return [filter];
      default:
        return ids; // unknown value -> show everything
    }
  }
 
  function applyFilter(filter) {
    const visible = getVisibleIds(filter);
    sections.forEach(({ id, h2, row }) => {
      const show = visible.includes(id);
      h2.style.display = show ? '' : 'none';
      if (row) {
        row.style.display = show ? '' : 'none';
        // restart the fade-in animation for visible rows
        row.classList.remove('fade-in-up');
        if (show) {
          void row.offsetWidth; // forces reflow so the animation plays again
          row.classList.add('fade-in-up');
        }
      }
    });
  }
 
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.filter);
      if (window.Sound) Sound.playBeep(700, 0.05);
    });
  });
})();
 
/*  15. Rating Stars (Book Details page)
    querySelectorAll selects the stars; click sets the rating and recolors them.  */
(function () {
  // Create an empty rating container above every "Add to Shelf" button
  document.querySelectorAll('.add-to-shelf').forEach((btn) => {
    const bookId = btn.dataset.id;
    if (!bookId) return;
    if (btn.parentElement.querySelector('.book-rating')) return;
    const container = document.createElement('div');
    container.className = 'book-rating my-3';
    container.dataset.bookId = bookId;
    btn.parentElement.insertBefore(container, btn);
  });
 
  const ratingContainers = document.querySelectorAll('.book-rating');
  if (!ratingContainers.length) return;
 
  const STORAGE_KEY = 'bc_ratings';
  const COLOR_ON = '#f5b301';
  const COLOR_OFF = '#ccc';
 
  function getRatings() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function setRatings(r) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  }
 
  // Colors the first `value` stars yellow, the rest grey
  function paintStars(container, value) {
    container.querySelectorAll('.rating-star').forEach((s, idx) => {
      s.style.color = (idx + 1) <= value ? COLOR_ON : COLOR_OFF;
    });
  }
 
  ratingContainers.forEach((container) => {
    const bookId = container.dataset.bookId;
    if (!bookId) return;
 
    const savedRating = getRatings()[bookId] || 0;
    container.innerHTML = '';
 
    // for-loop creates 5 star elements
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.classList.add('rating-star');
      star.dataset.value = i;
      star.textContent = '★';
      star.style.cursor = 'pointer';
      star.style.fontSize = '1.4rem';
      star.style.marginRight = '2px';
      star.setAttribute('role', 'button');
      star.setAttribute('aria-label', `Rate ${i} star${i > 1 ? 's' : ''}`);
      star.setAttribute('tabindex', '0');
 
      star.addEventListener('click', () => {
        const newRating = parseInt(star.dataset.value, 10);
        const ratings = getRatings(); // read fresh data every time
        ratings[bookId] = newRating;
        setRatings(ratings);
        paintStars(container, newRating);
        if (window.Sound) Sound.playBeep(900, 0.1);
        // small "pop" animation
        star.style.transform = 'scale(1.3)';
        setTimeout(() => (star.style.transform = 'scale(1)'), 200);
      });
 
      // keyboard access: Enter / Space works like a click
      star.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          star.click();
        }
      });
 
      container.appendChild(star);
    }
    paintStars(container, savedRating);
  });
})();
 
/*  16. "Read More" Toggle (About page, changes style.display)  */
(function () {
  const btn = document.getElementById('read-more-btn');
  const moreContent = document.getElementById('read-more-content');
  if (!btn || !moreContent) return;
 
  moreContent.style.display = 'none';
  btn.setAttribute('aria-expanded', 'false');
 
  btn.addEventListener('click', () => {
    const isHidden = moreContent.style.display === 'none';
    if (isHidden) {
      moreContent.style.display = 'block';
      btn.textContent = 'Read Less';
      // fade + slide down
      moreContent.style.transition = 'none';
      moreContent.style.opacity = '0';
      moreContent.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        moreContent.style.transition = 'opacity 0.3s, transform 0.3s';
        moreContent.style.opacity = '1';
        moreContent.style.transform = 'translateY(0)';
      }, 50);
    } else {
      moreContent.style.display = 'none';
      btn.textContent = 'Read More';
    }
    btn.setAttribute('aria-expanded', String(isHidden));
    if (window.Sound) Sound.playBeep(400, 0.05);
  });
})();
 
/*  17. Load more content via fetch (Catalog page)  */
(function () {
  const btn = document.getElementById('load-more-btn');
  const box = document.getElementById('reviews-container');
  if (!btn || !box) return;
 
  const PAGE_SIZE = 3;
  let page = 0; // how many pages were loaded successfully
 
  // Builds the HTML for one review card. Data comes from an external API,
  // so every value is escaped before it goes into innerHTML.
  function reviewCard(c) {
    return `
      <div class="col-12 col-md-4 fade-in-up">
        <div class="info-card h-100 p-3">
          <h4 class="mb-1">${escapeHtml(c.name)}</h4>
          <p class="text-small mb-1">${escapeHtml(c.email)}</p>
          <p class="mb-0">"${escapeHtml(c.body.slice(0, 120))}…"</p>
        </div>
      </div>`;
  }
 
  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.textContent = 'Loading...';
 
    fetch(`https://jsonplaceholder.typicode.com/comments?_limit=${PAGE_SIZE}&_start=${page * PAGE_SIZE}`)
      .then((r) => {
        if (!r.ok) throw new Error('Network error ' + r.status);
        return r.json();
      })
      .then((comments) => {
        if (!comments.length) {
          btn.textContent = 'No more reviews';
          return; // button stays disabled
        }
        page++; // count the page only after it really loaded
        box.insertAdjacentHTML('beforeend', comments.map(reviewCard).join(''));
        btn.disabled = false;
        btn.textContent = 'Load more reviews';
        if (window.Sound) Sound.playBeep(900, 0.1);
      })
      .catch((err) => {
        btn.disabled = false;
        btn.textContent = 'Retry';
        console.error('Fetch failed:', err);
      });
  });
})();
 
/*  18. Pricing: Monthly / Yearly switch (Pricing page)
    Array of plan objects + switch on the selected billing period.  */
(function () {
  const radios = document.querySelectorAll('input[name="billing"]');
  const priceEls = document.querySelectorAll('.price[data-monthly]');
  const note = document.getElementById('billing-note');
  if (!radios.length || !priceEls.length) return;
 
  const YEARLY_DISCOUNT = 0.2; // 20%
 
  // Build an array of objects from the page: { el, monthly }
  const plans = Array.from(priceEls).map((el) => ({
    el,
    monthly: parseFloat(el.dataset.monthly)
  }));
 
  // Returns the price text and suffix for one plan
  function formatPrice(monthly, period) {
    let amount, suffix;
    switch (period) {
      case 'yearly':
        amount = monthly * 12 * (1 - YEARLY_DISCOUNT);
        suffix = ' / year';
        break;
      case 'monthly':
      default:
        amount = monthly;
        suffix = ' / month';
    }
    const text = amount === 0 ? '$0' : '$' + amount.toFixed(2);
    return { text, suffix };
  }
 
  function render(period) {
    plans.forEach(({ el, monthly }) => {
      const { text, suffix } = formatPrice(monthly, period);
      el.classList.add('price-updating'); // fade out
      setTimeout(() => {
        el.innerHTML = `${text}<small>${suffix}</small>`;
        el.classList.remove('price-updating'); // fade in
      }, 200);
    });
    if (note) {
      note.textContent = period === 'yearly'
        ? 'Billed once a year — you save 20%.'
        : 'Prices shown per month.';
    }
  }
 
  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      render(radio.value);
      if (window.Sound) Sound.playBeep(650, 0.06);
    });
  });
})();

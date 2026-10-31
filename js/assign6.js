/* Assignment 6 — jQuery features
   Loaded on every page AFTER assign5.js.
   Task 0: console.log("jQuery is ready!") verifies jQuery loaded. */

$(document).ready(function () {
  'use strict';

  console.log('jQuery is ready!');

  /* =========================================================
     TASK 4: Stylized Scroll Progress Bar
     ========================================================= */
  (function scrollProgress() {
    if (!$('#scroll-progress').length) {
      $('body').prepend('<div id="scroll-progress" aria-hidden="true"></div>');
    }
    var $bar = $('#scroll-progress');
    function update() {
      var docH = $(document).height() - $(window).height();
      var pct = docH > 0 ? ($(window).scrollTop() / docH) * 100 : 0;
      $bar.css('width', pct + '%');
    }
    $(window).on('scroll resize', update);
    update();
  })();

  /* =========================================================
     TASK 7: Toast Notification System
     window.showToast(message, type) — success | info | error
     ========================================================= */
  window.showToast = function (message, type) {
    type = type || 'success';
    var $toast = $('<div>', {
      'class': 'toast-notification toast-' + type,
      role: 'status',
      text: message
    }).appendTo('body');
    setTimeout(function () { $toast.addClass('toast-visible'); }, 10);
    setTimeout(function () {
      $toast.removeClass('toast-visible').addClass('toast-hide');
      setTimeout(function () { $toast.remove(); }, 400);
    }, 2800);
  };

  /* =========================================================
     TASK 1 + TASK 2: Real-time search + autocomplete
     (2catalog.html)
     ========================================================= */
  (function catalogSearch() {
    var $input = $('#catalog-search');
    var $list = $('#search-suggestions');
    if (!$input.length || !$list.length) return;

    var books = [];
    $('#classics, #scifi, #fantasy, #romance, #history').each(function () {
      var $row = $(this).next('.row');
      $row.find('.card').each(function () {
        var $card = $(this);
        var title = $.trim($card.find('.card-title').text());
        var meta = $.trim($card.find('.card-text').text());
        if (title) books.push({ title: title, meta: meta, $card: $card });
      });
    });

    function filterCatalog(q) {
      var needle = q.toLowerCase();
      $('#classics, #scifi, #fantasy, #romance, #history').each(function () {
        var $h2 = $(this);
        var $row = $h2.next('.row');
        var anyVisible = false;
        $row.find('.col-12').each(function () {
          var matches = !needle || $(this).text().toLowerCase().indexOf(needle) > -1;
          $(this).toggle(matches);
          if (matches) anyVisible = true;
        });
        $h2.toggle(anyVisible);
        $row.toggle(anyVisible);
      });
    }

    function showSuggestions(q) {
      $list.empty();
      if (!q) { $list.hide(); return; }
      var needle = q.toLowerCase();
      var matches = books.filter(function (b) {
        return b.title.toLowerCase().indexOf(needle) > -1 ||
               b.meta.toLowerCase().indexOf(needle) > -1;
      }).slice(0, 8);

      if (!matches.length) { $list.hide(); return; }

      matches.forEach(function (b) {
        $('<li>', {
          'class': 'list-group-item list-group-item-action',
          text: b.title + ' — ' + b.meta.split(' · ')[0]
        }).on('click', function () {
          $input.val(b.title);
          $list.hide();
          filterCatalog(b.title);
          $('html, body').animate({ scrollTop: b.$card.offset().top - 110 }, 350);
        }).appendTo($list);
      });
      $list.show();
    }

    $input.on('input', function () {
      var q = $.trim($(this).val());
      filterCatalog(q);
      showSuggestions(q);
    });

    $(document).on('click', function (e) {
      if (!$(e.target).closest('#catalog-search, #search-suggestions').length) {
        $list.hide();
      }
    });
  })();

  /* =========================================================
     TASK 3: Search Highlighting (3product.html)
     Uses TreeWalker so we only touch TEXT nodes — never break HTML tags.
     ========================================================= */
  (function searchHighlight() {
    var $input = $('#highlight-search');
    if (!$input.length) return;

    function clearMarks($scope) {
      $scope.find('mark.search-hl').each(function () {
        $(this).replaceWith(document.createTextNode($(this).text()));
      });
      var root = $scope.get(0);
      if (root && root.normalize) root.normalize();
    }

    function highlight(term) {
      var $scope = $('.book-list');
      clearMarks($scope);
      term = $.trim(term);
      if (!term) return;

      var safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Two regexes: one WITHOUT 'g' for safe .test(), one WITH 'g' for exec()
      var testRe = new RegExp(safe, 'i');
      var execRe = new RegExp('(' + safe + ')', 'gi');

      var walker = document.createTreeWalker(
        $scope.get(0),
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (node) {
            if (!node.parentElement) return NodeFilter.FILTER_REJECT;
            if (node.parentElement.closest('script, style, mark')) return NodeFilter.FILTER_REJECT;
            return testRe.test(node.nodeValue)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
        }
      );

      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      nodes.forEach(function (node) {
        var text = node.nodeValue;
        var frag = document.createDocumentFragment();
        var last = 0;
        var m;
        execRe.lastIndex = 0;
        while ((m = execRe.exec(text)) !== null) {
          if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
          var markEl = document.createElement('mark');
          markEl.className = 'search-hl';
          markEl.textContent = m[0];
          frag.appendChild(markEl);
          last = m.index + m[0].length;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      });
    }

    $input.on('input', function () { highlight($(this).val()); });
  })();

  /* =========================================================
     TASK 5: Animated Number Counter
     Counts up .big-number values when they scroll into view.
     Skips composites like "4.7/5".
     ========================================================= */
  (function numberCounter() {
    var $nums = $('.info-card .big-number');
    if (!$nums.length) return;

    function isSimpleInt(str) { return /^\d+$/.test(str); }

    function animateEl($el) {
      if ($el.data('counted')) return;
      var target = parseInt($el.text(), 10);
      if (isNaN(target) || target === 0) {
        $el.data('counted', true);
        return;
      }
      $el.data('counted', true);
      var current = 0;
      var step = Math.max(1, Math.ceil(target / 40));
      var timer = setInterval(function () {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        $el.text(current);
      }, 30);
    }

    function checkVisible() {
      var winBottom = $(window).scrollTop() + $(window).height();
      $nums.each(function () {
        var $el = $(this);
        if ($el.data('counted')) return;
        var raw = $.trim($el.text());
        if (!isSimpleInt(raw)) return;
        if ($el.offset().top < winBottom - 40) {
          animateEl($el);
        }
      });
    }

    $(window).on('scroll resize', checkVisible);
    setTimeout(checkVisible, 300);
  })();

  /* =========================================================
     TASK 6: Loading Spinner on Submit (6contact.html)
     Hooks into the vanilla submit handler already in assign5.js.
     ========================================================= */
  (function spinnerOnSubmit() {
    var $form = $('#contact-form');
    if (!$form.length) return;

    $form.on('submit', function () {
      var $btn = $form.find('button[type="submit"]');
      if ($btn.prop('disabled')) return;

      setTimeout(function () {
        // If vanilla handler re-enabled the button (validation error) → skip
        if (!$btn.prop('disabled') && $btn.text().trim().indexOf('Sending') === -1) return;

        var original = $btn.data('original-html') || $btn.html();
        $btn.data('original-html', original);
        $btn.prop('disabled', true).html(
          '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Please wait...'
        );

        setTimeout(function () {
          if ($btn.prop('disabled')) {
            $btn.prop('disabled', false).html(original);
            $btn.removeData('original-html');
          }
        }, 4000);
      }, 50);
    });

    $form.on('reset', function () {
      var $btn = $form.find('button[type="submit"]');
      $btn.removeData('original-html');
    });
  })();

  /* =========================================================
     TASK 8: Copy to Clipboard Button (3product.html)
     Adds 📋 Copy next to every quote inside a book card.
     ========================================================= */
  (function copyButtons() {
    $('.book-details blockquote').each(function () {
      var $bq = $(this);
      if ($bq.data('copy-attached')) return;
      $bq.data('copy-attached', true);

      var $btn = $('<button>', {
        type: 'button',
        'class': 'btn btn-sm btn-outline-secondary ms-2 copy-quote-btn',
        'aria-label': 'Copy quote to clipboard'
      }).html('📋 Copy');

      $btn.on('click', function () {
        var text = $.trim($bq.clone().children().remove().end().text())
          .replace(/^["“]|["”]$/g, '')
          .trim();
        copyToClipboard(text, $btn);
      });

      $bq.append($btn);
    });

    function copyToClipboard(text, $btn) {
      function success() {
        var orig = $btn.html();
        $btn.html('✓ Copied!')
            .removeClass('btn-outline-secondary')
            .addClass('btn-success');
        if (window.showToast) window.showToast('Copied to clipboard!', 'success');
        setTimeout(function () {
          $btn.html(orig).removeClass('btn-success').addClass('btn-outline-secondary');
        }, 2000);
      }
      function fail() {
        if (window.showToast) window.showToast('Copy failed', 'error');
      }
      function fallback() {
        var $ta = $('<textarea>').val(text).css({ position: 'fixed', top: '-1000px' }).appendTo('body');
        $ta[0].select();
        try {
          document.execCommand('copy');
          success();
        } catch (e) { fail(); }
        $ta.remove();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(success).catch(fallback);
      } else {
        fallback();
      }
    }
  })();

  /* =========================================================
     TASK 9: Image Lazy Loading (2catalog.html + index.html)
     Images load only when they come near the viewport.
     ========================================================= */
  (function lazyLoadImages() {
    var $imgs = $('.main-content .card-img-top, .main-content .custom-card img');
    if (!$imgs.length) return;

    var PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E';

    $imgs.each(function () {
      var $img = $(this);
      var real = $img.attr('src');
      if (!real || real.indexOf('data:') === 0) return;
      $img.attr('data-src', real).attr('src', PLACEHOLDER).addClass('lazy-img');
    });

    function loadVisible() {
      var winBottom = $(window).scrollTop() + $(window).height() + 150;
      $('.lazy-img').each(function () {
        var $img = $(this);
        if ($img.offset().top < winBottom) {
          $img.attr('src', $img.attr('data-src'))
              .removeAttr('data-src')
              .removeClass('lazy-img')
              .css('opacity', 0)
              .animate({ opacity: 1 }, 250);
        }
      });
    }

    $(window).on('scroll resize', loadVisible);
    setTimeout(loadVisible, 200);
  })();

  /* =========================================================
     EXTRA: hook existing actions into toasts
     ========================================================= */
  (function toastHooks() {
    $(document).on('click', '.add-to-shelf', function () {
      var $btn = $(this);
      var title = $btn.data('title') || 'Book';
      setTimeout(function () {
        if ($btn.hasClass('on-shelf')) {
          window.showToast('"' + title + '" added to shelf', 'success');
        } else {
          window.showToast('"' + title + '" removed from shelf', 'info');
        }
      }, 20);
    });

    $(document).on('click', '#random-quote-btn', function () {
      window.showToast('New quote loaded', 'info');
    });

    $(document).on('click', '#theme-toggle', function () {
      setTimeout(function () {
        var dark = $('html').attr('data-theme') === 'dark';
        window.showToast(dark ? '🌙 Dark theme enabled' : '☀ Light theme enabled', 'info');
      }, 20);
    });

    var successEl = document.getElementById('contact-success');
    var errorEl = document.getElementById('contact-error');
    if (successEl && window.MutationObserver) {
      new MutationObserver(function () {
        if (!successEl.hidden && successEl.textContent.trim()) {
          window.showToast('✓ Message sent successfully!', 'success');
        }
      }).observe(successEl, { attributes: true, childList: true, subtree: true });
    }
    if (errorEl && window.MutationObserver) {
      new MutationObserver(function () {
        if (!errorEl.hidden && errorEl.textContent.trim()) {
          window.showToast('⚠ ' + errorEl.textContent.trim().split('\n')[0], 'error');
        }
      }).observe(errorEl, { attributes: true, childList: true, subtree: true });
    }
  })();

  /* Smooth in-page anchor scroll */
  $(document).on('click', 'a[href^="#"]:not([href="#"])', function (e) {
    var href = $(this).attr('href');
    var $target = $(href);
    if (!$target.length) return;
    e.preventDefault();
    $('html, body').animate({ scrollTop: $target.offset().top - 90 }, 400);
  });

});

/* Madar internal browser helper: runs inside pages served by /api/madar-browse.
 * Keeps links, forms and pop-ups inside the Madar browser, and remembers the real address. */
(function () {
  var M = window.__MADAR_PROXY; if (!M) return;
  function abs(h) { try { return new URL(h, document.baseURI).href; } catch (e) { return null; } }
  function go(u) { if (u && /^https?:/i.test(u)) location.href = M.proxy + encodeURIComponent(u); }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button > 0) return;
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (!h || h.charAt(0) === '#' || /^(javascript|mailto|tel):/i.test(h)) return;
    e.preventDefault(); go(abs(h));
  }, false);
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f || f.tagName !== 'FORM') return;
    var action = abs(f.getAttribute('action') || M.url);
    if ((f.method || 'get').toLowerCase() === 'get') {
      e.preventDefault();
      var u = new URL(action), fd = new FormData(f);
      u.search = new URLSearchParams(fd).toString();
      go(u.href);
    } else {
      f.setAttribute('action', M.proxy + encodeURIComponent(action));
    }
  }, true);
  window.open = function (u) { go(abs(u || '')); return null; };
  // Sites that change the address themselves (single-page apps): keep working, remember the address.
  ['pushState', 'replaceState'].forEach(function (k) {
    var orig = history[k];
    history[k] = function (s, t, u) {
      if (u != null) { var a = abs(u); if (a) M.url = a; }
      try { return orig.call(history, s, t, null); } catch (e) { }
    };
  });
})();

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

  // ---- Videos inside the page (live TV, series, matches). The page is served from Madar's address, so its player
  // asking the stream's server directly is refused (other site / hotlink protection) and the video stays black.
  // Its stream requests go through Madar's server instead, sent as if from the page itself.
  var ME = location.origin, NO = /(^|\.)(youtube\.com|youtube-nocookie\.com|googlevideo\.com|google\.com|gstatic\.com|googleapis\.com|doubleclick\.net|googlesyndication\.com|facebook\.com|twitter\.com|x\.com)$/i;
  var MEDIA = /\.(m3u8?|ts|m4s|mp4|m4a|m4v|aac|mp3|webm|key|mpd|vtt)(\?|$)|\/(hls|live|stream|playlist|manifest|chunklist|segment)/i;
  function via(u, ref) {
    var a = abs(u); if (!a || !/^https?:/i.test(a)) return null;
    var h; try { h = new URL(a); } catch (e) { return null; }
    if (h.origin === ME || NO.test(h.hostname)) return null;
    return M.proxy + encodeURIComponent(a) + '&ref=' + encodeURIComponent(ref || M.url);
  }
  // XHR (hls.js, most players): stream addresses through Madar; other calls stay direct
  var XO = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) {
    var a = arguments, p = typeof u === 'string' && MEDIA.test(u) ? via(u) : null;
    if (p) { a = [].slice.call(arguments); a[1] = p; }
    return XO.apply(this, a);
  };
  // fetch: streams through Madar; anything else is tried directly first, and through Madar if the site refuses
  var F = window.fetch;
  if (F) window.fetch = function (input, init) {
    var u = typeof input === 'string' ? input : input && input.url;
    var p = u ? via(u) : null;
    if (p && MEDIA.test(u)) return F.call(this, p, init);
    var self = this;
    return F.call(this, input, init).catch(function (e) { if (p) return F.call(self, p, init); throw e; });
  };
  // <video src="…m3u8 / mp4"> (the iPhone plays HLS by itself): through Madar as well
  try {
    var D = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    Object.defineProperty(HTMLMediaElement.prototype, 'src', { configurable: true, get: D.get, set: function (v) { var p = typeof v === 'string' && MEDIA.test(v) ? via(v) : null; D.set.call(this, p || v); } });
    var SA = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (k, v) {
      if (k === 'src' && typeof v === 'string' && (this.tagName === 'VIDEO' || this.tagName === 'SOURCE' || this.tagName === 'AUDIO') && MEDIA.test(v)) { var p = via(v); if (p) v = p; }
      return SA.call(this, k, v);
    };
  } catch (e) { }
  // a player in a frame from another site: opened through Madar too, so the same rules reach it
  function frameFix(f) {
    var s = f.getAttribute('src') || ''; if (!s || s.indexOf(M.proxy) === 0 || /^(about|data|blob|javascript):/i.test(s)) return;
    var a = abs(s); if (!a) return; var h; try { h = new URL(a); } catch (e) { return; }
    if (h.origin === ME || NO.test(h.hostname)) return;
    f.setAttribute('src', M.proxy + encodeURIComponent(a));
  }
  function scan(root) { [].forEach.call((root || document).querySelectorAll ? (root || document).querySelectorAll('iframe[src]') : [], frameFix); }
  new MutationObserver(function (ms) { ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.tagName === 'IFRAME') frameFix(n); else if (n.querySelectorAll) scan(n); }); if (m.type === 'attributes' && m.target.tagName === 'IFRAME') frameFix(m.target); }); })
    .observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  document.addEventListener('DOMContentLoaded', function () { scan(document); });

  // Sites that change the address themselves (single-page apps): keep working, remember the address.
  ['pushState', 'replaceState'].forEach(function (k) {
    var orig = history[k];
    history[k] = function (s, t, u) {
      if (u != null) { var a = abs(u); if (a) M.url = a; }
      try { return orig.call(history, s, t, null); } catch (e) { }
    };
  });
})();

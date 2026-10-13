/*
 * Madar bridge — lets the Madar mixed-reality app (mazendevloper.github.io) drive this page
 * with hand gestures when cplay2 is shown inside a Madar window. Inert everywhere else:
 * it only reacts to messages from the Madar origin while the page runs inside a frame.
 * Also registers a service worker so cplay2 keeps opening without internet.
 */
(function () {
  var MADAR = 'https://mazendevloper.github.io';

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/cplay2-sw.js').catch(function () {}); });
  }

  if (window.parent === window) return;

  function canScroll(el, dx, dy) {
    var s = getComputedStyle(el);
    var y = /(auto|scroll|overlay)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
    var x = /(auto|scroll|overlay)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1;
    return (dy && y) || (dx && x);
  }
  function scroller(el, dx, dy) {
    for (var n = el; n && n !== document.documentElement; n = n.parentElement) if (canScroll(n, dx, dy)) return n;
    return document.scrollingElement || document.documentElement;
  }
  function fire(el, type, x, y, Ctor) {
    var opts = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, view: window, button: 0, buttons: type.indexOf('down') > 0 ? 1 : 0, pointerId: 1, pointerType: 'touch', isPrimary: true };
    try { el.dispatchEvent(new (Ctor || MouseEvent)(type, opts)); } catch (e) {}
  }
  function tap(x, y) {
    var el = document.elementFromPoint(x, y);
    if (!el) return;
    fire(el, 'pointerdown', x, y, window.PointerEvent);
    fire(el, 'mousedown', x, y);
    fire(el, 'pointerup', x, y, window.PointerEvent);
    fire(el, 'mouseup', x, y);
    var target = el.closest('a,button,input,select,textarea,[role=button],[role=tab],[onclick],[data-nav-id]') || el;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) target.focus();
    if (typeof target.click === 'function') target.click(); else fire(target, 'click', x, y);
  }
  function post(msg) { msg.madar = 1; try { window.parent.postMessage(msg, MADAR); } catch (e) {} }

  var lastPath = '';
  setInterval(function () { if (location.pathname !== lastPath) { lastPath = location.pathname; post({ type: 'path', path: lastPath }); } }, 500);

  window.addEventListener('message', function (e) {
    if (e.origin !== MADAR) return;
    var d = e.data; if (!d || d.madar !== 1) return;
    if (d.type === 'hello') post({ type: 'ready', path: location.pathname });
    else if (d.type === 'tap') tap(d.x, d.y);
    else if (d.type === 'scroll') {
      var el = document.elementFromPoint(d.x, d.y) || document.body;
      scroller(el, d.dx, d.dy).scrollBy({ left: d.dx || 0, top: d.dy || 0, behavior: 'auto' });
    }
    else if (d.type === 'nav') {
      var a = document.querySelector('a[href="' + d.path + '"]');
      if (a) a.click(); else location.assign(d.path);
    }
    else if (d.type === 'back') history.back();
  });
  post({ type: 'ready', path: location.pathname });
})();

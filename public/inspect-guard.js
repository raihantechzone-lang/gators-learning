(function () {
  if (window.__gatorsInspectGuard) return;
  window.__gatorsInspectGuard = true;
  function exempt() {
    return /^\/(admin|teacher|moderator|panel)/.test(location.pathname);
  }
  function editable(t) {
    return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }
  document.addEventListener('contextmenu', function (e) {
    if (exempt() || editable(e.target)) return;
    e.preventDefault();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (exempt()) return;
    var k = (e.key || '').toUpperCase();
    var mod = e.ctrlKey || e.metaKey;
    var blocked = k === 'F12' ||
      (mod && (e.shiftKey || e.altKey) && (k === 'I' || k === 'J' || k === 'C')) ||
      (mod && (k === 'U' || k === 'S'));
    if (blocked) { e.preventDefault(); e.stopPropagation(); }
  }, true);
})();

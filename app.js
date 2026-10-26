/* Quota — site behaviour: menu, theme, languages, cursor light, calculator, copy buttons. */
(function(){
  var LANG = 'ru';
  var nav = document.getElementById('nav'), burger = document.getElementById('burger');
  function closeMenu(){ nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', function(){
    var open = !nav.classList.contains('open');
    nav.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', function(e){ if (e.target.closest('a')) closeMenu(); });

  // Calculator
  var $ = function(id){ return document.getElementById(id); };
  var ids = ['q-leads', 'q-conv', 'q-check', 'q-up'];
  var sum = function(n){ var s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, LANG === 'en' ? ',' : ' '); return LANG === 'en' ? 'UZS ' + s : s + (LANG === 'uz' ? ' soʻm' : ' сум'); };
  function calc(){
    var leads = +$('q-leads').value, conv = +$('q-conv').value, check = +$('q-check').value, up = +$('q-up').value;
    var now = leads * conv / 100 * check, delta = now * up / 100;
    $('v-leads').textContent = leads.toString().replace(/\B(?=(\d{3})+(?!\d))/g, LANG === 'en' ? ',' : ' ');
    $('v-conv').textContent = (LANG === 'en' ? String(conv) : String(conv).replace('.', ',')) + '%';
    $('v-check').textContent = sum(check);
    $('v-up').textContent = '+' + up + '%';
    $('o-month').textContent = sum(delta);
    $('o-year').textContent = sum(delta * 12);
    $('o-now').textContent = sum(now);
    $('o-aft').textContent = sum(now + delta);
    $('b-now').style.width = (100 / (1 + up / 100)).toFixed(1) + '%';
  }
  if ($('q-leads')) { ids.forEach(function(id){ $(id).addEventListener('input', calc); }); calc(); document.addEventListener('quota:lang', calc); }

  // Theme toggle (explicit choice overrides the system setting)
  var root = document.documentElement;
  function systemDark(){ return !(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches); }
  try { var saved = localStorage.getItem('quota-theme'); if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved); } catch (err) {}
  $('theme').addEventListener('click', function(){
    var cur = root.getAttribute('data-theme') || (systemDark() ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('quota-theme', next); } catch (err) {}
  });

  // Soft light that follows the cursor
  var spot = $('spot');
  if (spot) {
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var tx = innerWidth / 2, ty = innerHeight / 3, sx = tx, sy = ty, raf = 0, hideT = 0;
    function place(){ spot.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0)'; }
    function draw(){
      sx += (tx - sx) * 0.16; sy += (ty - sy) * 0.16; place();
      raf = (Math.abs(tx - sx) + Math.abs(ty - sy) > 0.5) ? requestAnimationFrame(draw) : 0;
    }
    function aim(x, y, jump){
      tx = x; ty = y; spot.classList.add('on');
      if (still || jump) { sx = tx; sy = ty; place(); return; }
      if (!raf) raf = requestAnimationFrame(draw);
    }
    // mouse / pen
    window.addEventListener('pointermove', function(e){ if (e.pointerType !== 'touch') aim(e.clientX, e.clientY); }, {passive:true});
    document.documentElement.addEventListener('pointerleave', function(){ spot.classList.remove('on'); });
    // finger: the light follows the touch while scrolling, then fades out
    function touch(e, jump){
      var t = e.touches && e.touches[0]; if (!t) return;
      clearTimeout(hideT); aim(t.clientX, t.clientY, jump);
    }
    window.addEventListener('touchstart', function(e){ touch(e, true); }, {passive:true});
    window.addEventListener('touchmove', function(e){ touch(e, false); }, {passive:true});
    window.addEventListener('touchend', function(){ clearTimeout(hideT); hideT = setTimeout(function(){ spot.classList.remove('on'); }, 450); }, {passive:true});
    window.addEventListener('touchcancel', function(){ spot.classList.remove('on'); }, {passive:true});
  }

  // Languages: Russian is in the HTML; Uzbek and English come from i18n.js (Russian text -> [uz, en])
  var DICT = window.QUOTA_I18N || {}, IDX = {uz:0, en:1}, ATTRS = ['aria-label', 'title', 'data-label'];
  var orig = new WeakMap();
  function norm(s){ return s.replace(/\s+/g, ' ').trim(); }
  function tr(ru){
    var k = norm(ru);
    if (LANG === 'ru' || !k) return ru;
    var v = DICT[k];
    if (!v || !v[IDX[LANG]]) return ru;
    return ru.match(/^\s*/)[0] + v[IDX[LANG]] + ru.match(/\s*$/)[0];
  }
  function L(ru){ return tr(ru); }
  function applyLang(){
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {acceptNode:function(n){
      var p = n.parentNode && n.parentNode.nodeName; return (p === 'SCRIPT' || p === 'STYLE') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }});
    var n;
    while ((n = w.nextNode())) { if (!orig.has(n)) orig.set(n, n.nodeValue); n.nodeValue = tr(orig.get(n)); }
    document.querySelectorAll('[aria-label],[title],[data-label]').forEach(function(el){
      ATTRS.forEach(function(a){
        if (!el.hasAttribute(a)) return;
        var key = 'data-ru-' + a;
        if (!el.hasAttribute(key)) el.setAttribute(key, el.getAttribute(a));
        el.setAttribute(a, tr(el.getAttribute(key)));
      });
    });
    var md = document.querySelector('meta[name="description"]');
    if (md) { if (!md.hasAttribute('data-ru')) md.setAttribute('data-ru', md.content); md.content = tr(md.getAttribute('data-ru')); }
    if (!document.documentElement.hasAttribute('data-ru-title')) document.documentElement.setAttribute('data-ru-title', document.title);
    document.title = tr(document.documentElement.getAttribute('data-ru-title'));
    document.documentElement.lang = LANG;
    var code = document.querySelector('.lang-code'); if (code) code.textContent = LANG.toUpperCase();
    document.querySelectorAll('[data-lang]').forEach(function(b){ b.setAttribute('aria-current', String(b.getAttribute('data-lang') === LANG)); });
    try { document.dispatchEvent(new Event('quota:lang')); } catch (err) {}
  }
  try {
    var savedLang = localStorage.getItem('quota_lang');
    if (savedLang === 'ru' || savedLang === 'uz' || savedLang === 'en') LANG = savedLang;
  } catch (err) {}
  if (LANG !== 'ru') applyLang(); else { var cd = document.querySelector('.lang-code'); if (cd) cd.textContent = 'RU'; document.querySelectorAll('[data-lang]').forEach(function(b){ b.setAttribute('aria-current', String(b.getAttribute('data-lang') === 'ru')); }); }

  // Language menu
  var lang = $('lang'), langBtn = $('lang-btn');
  function setLang(open){ lang.classList.toggle('open', open); langBtn.setAttribute('aria-expanded', String(open)); }
  langBtn.addEventListener('click', function(e){ e.stopPropagation(); setLang(!lang.classList.contains('open')); });
  lang.querySelectorAll('[data-lang]').forEach(function(b){
    b.addEventListener('click', function(){
      LANG = b.getAttribute('data-lang');
      try { localStorage.setItem('quota_lang', LANG); } catch (err) {}
      applyLang(); setLang(false);
    });
  });
  document.addEventListener('click', function(e){ if (!lang.contains(e.target)) setLang(false); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && lang.classList.contains('open')) { setLang(false); langBtn.focus(); } });

  // Copy buttons
  document.querySelectorAll('[data-copy]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var el = $(btn.getAttribute('data-copy')), text = el.textContent.trim();
      function done(){ btn.textContent = L('Скопировано'); setTimeout(function(){ btn.textContent = L('Копировать'); }, 1600); }
      function select(){ var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = L('Выделено'); setTimeout(function(){ btn.textContent = L('Копировать'); }, 1600); }
      try { navigator.clipboard.writeText(text).then(done, select); } catch (err) { select(); }
    });
  });
})();

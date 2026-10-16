(function(){
var CONTACT = {
  telegram: "https://t.me/quota_uz", telegramName: "@quota_uz",
  instagram: "https://www.instagram.com/quota.uz", instagramName: "@quota.uz",
  phoneHref: "tel:+998935546575", phone: "+998 93 554 65 75",
  email: "info@quota.uz"
};
var PAGE = window.PAGE || "home";
var NAV = [["home","/","nav_home"],["services","/services","nav_services"],["calc","/calculator","nav_calc"],["about","/about","nav_about"],["contacts","/contacts","nav_contacts"]];
var lang = "ru";
try {
  var saved = localStorage.getItem("quota_lang");
  if (saved && T[saved]) lang = saved;
  else { var nl = (navigator.language || "").slice(0,2).toLowerCase(); if (T[nl]) lang = nl; }
} catch (e) {}

function t(k){ var d = T[lang]; return d[k] !== undefined ? d[k] : (T.ru[k] !== undefined ? T.ru[k] : k); }

var LOGO = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent2)"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#lg)"/><rect x="7" y="17" width="4.5" height="8" rx="1.5" fill="var(--accent-ink)"/><rect x="13.75" y="12" width="4.5" height="13" rx="1.5" fill="var(--accent-ink)"/><rect x="20.5" y="7" width="4.5" height="18" rx="1.5" fill="var(--accent-ink)"/></svg>';

function buildLayout(){
  var h = document.getElementById("site-header");
  if (h){
    var links = NAV.map(function(n){
      return '<a href="' + n[1] + '"' + (n[0] === PAGE ? ' aria-current="page"' : '') + ' data-i18n="' + n[2] + '"></a>';
    }).join("");
    h.innerHTML =
      '<header class="top"><div class="wrap bar">' +
      '<a class="logo" href="/" aria-label="Quota">' + LOGO + 'Quota</a>' +
      '<nav class="links" id="links" aria-label="Main">' + links + '</nav>' +
      '<div class="right">' +
      '<div class="lang" role="group" aria-label="Language"><button type="button" data-lang="ru">RU</button><button type="button" data-lang="uz">UZ</button><button type="button" data-lang="en">EN</button></div>' +
      '<a class="btn sm hide-s" data-tg href="/contacts" data-i18n="nav_cta"></a>' +
      '<button class="burger" id="burger" type="button" aria-expanded="false" aria-controls="links" data-i18n-aria="menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
      '</div></div></header>';
  }
  var f = document.getElementById("site-footer");
  if (f){
    var fl = NAV.map(function(n){ return '<li><a href="' + n[1] + '" data-i18n="' + n[2] + '"></a></li>'; }).join("");
    f.innerHTML =
      '<footer class="bottom"><div class="wrap"><div class="fgrid">' +
      '<div><a class="logo" href="/" aria-label="Quota" style="color:var(--fg)">' + LOGO.replace('id="lg"','id="lg2"').replace('url(#lg)','url(#lg2)') + 'Quota</a><p style="margin-top:12px;max-width:40ch" data-i18n="foot_tag"></p></div>' +
      '<div><h4 data-i18n="foot_nav"></h4><ul>' + fl + '</ul></div>' +
      '<div><h4 data-i18n="foot_contact"></h4><ul>' +
      '<li><a href="' + CONTACT.telegram + '" target="_blank" rel="noopener">Telegram</a></li>' +
      '<li><a href="' + CONTACT.instagram + '" target="_blank" rel="noopener">Instagram</a></li>' +
      '<li>' + CONTACT.phone + '</li>' +
      '<li><a href="mailto:' + CONTACT.email + '">' + CONTACT.email + '</a></li></ul></div></div>' +
      '<div class="fcopy">© 2026 Quota</div></div></footer>';
  }
  var burger = document.getElementById("burger");
  var ln = document.getElementById("links");
  if (burger && ln){
    burger.addEventListener("click", function(){
      var o = ln.classList.toggle("open");
      burger.setAttribute("aria-expanded", o ? "true" : "false");
    });
    ln.addEventListener("click", function(e){ if (e.target.tagName === "A") { ln.classList.remove("open"); burger.setAttribute("aria-expanded","false"); } });
  }
  document.querySelectorAll(".lang button").forEach(function(b){
    b.addEventListener("click", function(){
      lang = b.dataset.lang;
      try { localStorage.setItem("quota_lang", lang); } catch (e) {}
      applyLang();
    });
  });
  document.querySelectorAll("[data-tg]").forEach(function(a){
    if (a.getAttribute("href") === "#" || a.hasAttribute("data-ext")) { a.href = CONTACT.telegram; a.target = "_blank"; a.rel = "noopener"; }
  });
  document.querySelectorAll("[data-ig]").forEach(function(a){ a.href = CONTACT.instagram; a.target = "_blank"; a.rel = "noopener"; });
}

function fmt(n){ return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === "en" ? "," : " "); }
function money(n){ return lang === "en" ? "UZS " + fmt(n) : fmt(n) + " " + t("cur"); }

function buildContacts(){
  var cl = document.getElementById("cl");
  if (!cl) return;
  cl.textContent = "";
  function row(label, node, copyText){
    var d = document.createElement("div");
    var s = document.createElement("span"); s.textContent = label; d.appendChild(s);
    d.appendChild(node);
    if (copyText){
      var b = document.createElement("button"); b.type = "button"; b.className = "copy"; b.textContent = t("copy");
      b.addEventListener("click", function(){
        function ok(){ b.textContent = t("copied"); setTimeout(function(){ b.textContent = t("copy"); }, 1400); }
        function pick(){ var r = document.createRange(); r.selectNodeContents(node); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
        try { navigator.clipboard.writeText(copyText).then(ok, pick); } catch (e) { pick(); }
      });
      d.appendChild(b);
    }
    cl.appendChild(d);
  }
  var a1 = document.createElement("a"); a1.href = CONTACT.telegram; a1.target = "_blank"; a1.rel = "noopener"; a1.textContent = CONTACT.telegramName; row("Telegram", a1);
  var a2 = document.createElement("a"); a2.href = CONTACT.instagram; a2.target = "_blank"; a2.rel = "noopener"; a2.textContent = CONTACT.instagramName; row("Instagram", a2);
  var a3 = document.createElement("a"); a3.href = CONTACT.phoneHref; a3.textContent = CONTACT.phone; row(t("l_phone"), a3, CONTACT.phone);
  var a5 = document.createElement("a"); a5.href = "mailto:" + CONTACT.email; a5.textContent = CONTACT.email; row("Email", a5, CONTACT.email);
  var b4 = document.createElement("b"); b4.textContent = t("city"); row(t("l_city"), b4);
}

function calc(){
  var el = document.getElementById("leads");
  if (!el) return;
  var leads = parseFloat(el.value) || 0;
  var conv = parseFloat(document.getElementById("conv").value) || 0;
  var check = parseFloat(document.getElementById("check").value) || 0;
  var up = parseFloat(document.getElementById("uplift").value) || 0;
  document.getElementById("upv").textContent = up + "%";
  var now = leads * conv / 100 * check, aft = now * (1 + up / 100), delta = aft - now;
  document.getElementById("o-month").textContent = "+" + money(delta);
  document.getElementById("o-year").textContent = "+" + money(delta * 12);
  document.getElementById("o-now").textContent = money(now);
  document.getElementById("o-aft").textContent = money(aft);
  document.getElementById("b-aft").style.width = aft > 0 ? "100%" : "0";
  document.getElementById("b-now").style.width = aft > 0 ? (now / aft * 100) + "%" : "0";
}

function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(function(el){ el.textContent = t(el.getAttribute("data-i18n")); });
  document.querySelectorAll("[data-i18n-aria]").forEach(function(el){ el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
  document.querySelectorAll("[data-i18n-list]").forEach(function(el){
    var arr = t(el.getAttribute("data-i18n-list"));
    el.textContent = "";
    (Array.isArray(arr) ? arr : []).forEach(function(s){ var li = document.createElement("li"); li.textContent = s; el.appendChild(li); });
  });
  document.querySelectorAll(".cur").forEach(function(el){ el.textContent = t("cur"); });
  document.querySelectorAll(".lang button").forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.lang === lang ? "true" : "false"); });
  document.title = PAGE === "home" ? t("pt_home") : t("pt_" + PAGE) + " · Quota";
  buildContacts();
  calc();
}

buildLayout();
["leads","conv","check","uplift"].forEach(function(id){ var e = document.getElementById(id); if (e) e.addEventListener("input", calc); });
applyLang();
})();

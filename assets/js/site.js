/* Šiviljstvo Mitra — drawer + gallery lightbox. No dependencies. */
(function () {
  "use strict";

  /* ── mobile drawer ─────────────────────────────────────────────────── */
  var toggle = document.getElementById("nav-toggle");
  var side = document.getElementById("side");
  var scrim = document.getElementById("scrim");
  var lb = document.getElementById("lb");

  function isLbOpen() { return !!(lb && !lb.hidden); }

  function setNav(open) {
    side.dataset.open = open ? "1" : "0";
    scrim.dataset.open = open ? "1" : "0";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("lock", open || isLbOpen());
    if (open) side.querySelector("a").focus();
    else toggle.focus();
  }
  function navOpen() { return side.dataset.open === "1"; }

  if (toggle) {
    toggle.addEventListener("click", function () { setNav(!navOpen()); });
    scrim.addEventListener("click", function () { setNav(false); });
  }

  /* ── hero slider: dots + 7s autoplay + swipe ───────────────────────── */
  var heroImg = document.getElementById("hero-img");
  if (heroImg) {
    var dots = document.querySelectorAll(".hero-dot");
    var heroIdx = 0;
    var heroTimer = null;
    var HERO_MS = 7000;

    var heroShow = function (n) {
      heroIdx = ((n % dots.length) + dots.length) % dots.length;
      var d = dots[heroIdx];
      heroImg.src = d.dataset.src;
      heroImg.alt = d.dataset.alt;
      dots.forEach(function (o) { o.setAttribute("aria-current", o === d ? "true" : "false"); });
    };

    /* autoplay; a manual change restarts the countdown so the image the
       visitor just picked doesn't get swapped away early */
    var heroAuto = dots.length > 1 &&
      !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    var heroRestart = function () {
      if (heroTimer) clearInterval(heroTimer);
      heroTimer = null;
      if (heroAuto && !document.hidden) {
        heroTimer = setInterval(function () { heroShow(heroIdx + 1); }, HERO_MS);
      }
    };

    dots.forEach(function (d, i) {
      d.addEventListener("click", function () { heroShow(i); heroRestart(); });
    });

    /* swipe left/right on the hero image */
    var frame = heroImg.closest(".hero-frame") || heroImg;
    var hx = null, hy = null;
    frame.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { hx = null; return; }
      hx = e.touches[0].clientX; hy = e.touches[0].clientY;
    }, { passive: true });
    frame.addEventListener("touchend", function (e) {
      if (hx === null) return;
      var dx = e.changedTouches[0].clientX - hx;
      var dy = e.changedTouches[0].clientY - hy;
      hx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        heroShow(heroIdx + (dx < 0 ? 1 : -1));
        heroRestart();
      }
    }, { passive: true });

    document.addEventListener("visibilitychange", heroRestart);
    heroRestart();

    // warm the other montages after load so swaps are instant
    window.addEventListener("load", function () {
      dots.forEach(function (d) {
        if (new URL(d.dataset.src, location.href).href !== heroImg.src) (new Image()).src = d.dataset.src;
      });
    });
  }

  /* ── lightbox ──────────────────────────────────────────────────────── */
  var CATALOG = window.CATALOG || null;
  if (!lb || !CATALOG) {
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle && navOpen()) setNav(false);
    });
    return;
  }

  var el = {
    title: document.getElementById("lb-title"),
    img: document.getElementById("lb-img"),
    ref: document.getElementById("lb-ref"),
    counter: document.getElementById("lb-counter"),
    strip: document.getElementById("lb-strip"),
    close: document.getElementById("lb-close"),
    prev: document.getElementById("lb-prev"),
    next: document.getElementById("lb-next")
  };

  var cur = null;   // { slug, name, count }
  var idx = 1;      // 1-based photo number
  var opener = null;
  var BASE = window.ASSET_BASE || "";
  var STR = window.LB_STRINGS || { photoAlt: "{name} – {n}" };

  /* everything behind the dialog goes inert so focus and screen readers
     can't wander into the page while the gallery is open */
  var pageRoots = [document.querySelector(".skip"), document.querySelector(".bar"),
    side, document.getElementById("main")];
  function setPageInert(on) {
    pageRoots.forEach(function (r) { if (r) r.inert = on; });
  }

  function pad(n) { return String(n).padStart(3, "0"); }
  /* n is the 1-based position; the file stem comes from CATALOG so photos
     can have arbitrary names and an explicit order */
  function url(slug, n, size) {
    return BASE + "assets/images/gallery/" + slug + "/" + CATALOG[slug].f[n - 1] + "-" + size + ".webp";
  }
  function refCode(slug, n) { return slug.toUpperCase() + "-" + pad(n); }
  function photoAlt(name, n) {
    return STR.photoAlt.replace("{name}", name).replace("{n}", pad(n));
  }

  function show(n) {
    idx = ((n - 1 + cur.count) % cur.count) + 1;
    el.img.src = url(cur.slug, idx, 640);
    el.img.alt = photoAlt(cur.name, idx);
    el.ref.textContent = refCode(cur.slug, idx);
    el.counter.textContent = idx + " / " + cur.count;
    var ths = el.strip.children;
    for (var i = 0; i < ths.length; i++) {
      ths[i].setAttribute("aria-current", i === idx - 1 ? "true" : "false");
    }
    if (ths[idx - 1] && ths[idx - 1].scrollIntoView) {
      ths[idx - 1].scrollIntoView({ block: "nearest", inline: "center" });
    }
    // warm the neighbours so paging feels instant
    (new Image()).src = url(cur.slug, (idx % cur.count) + 1, 640);
    (new Image()).src = url(cur.slug, ((idx - 2 + cur.count) % cur.count) + 1, 640);
  }

  function open(slug, fromEl) {
    var c = CATALOG[slug];
    if (!c) return;
    cur = { slug: slug, name: c.n, count: c.f.length };
    opener = fromEl || null;
    el.title.textContent = c.n;

    el.strip.innerHTML = "";
    for (var i = 1; i <= cur.count; i++) {
      var b = document.createElement("button");
      b.className = "lb-th";
      b.type = "button";
      b.setAttribute("aria-label", photoAlt(c.n, i));
      var box = document.createElement("span");
      var im = document.createElement("img");
      im.loading = "lazy";
      im.alt = "";
      im.src = url(slug, i, 160);
      box.appendChild(im);
      var lab = document.createElement("span");
      lab.className = "lb-th-label";
      lab.textContent = pad(i);
      b.appendChild(box);
      b.appendChild(lab);
      b.addEventListener("click", (function (n) { return function () { show(n); }; })(i));
      el.strip.appendChild(b);
    }

    lb.hidden = false;
    setPageInert(true);
    document.body.classList.add("lock");
    show(c.s || 1);
    if (history.replaceState) history.replaceState(null, "", "#" + slug);
    el.close.focus();
  }

  function close() {
    lb.hidden = true;
    setPageInert(false);
    document.body.classList.toggle("lock", navOpen());
    el.img.src = "";
    el.strip.innerHTML = "";
    cur = null;
    if (history.replaceState) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    if (opener) { opener.focus(); opener = null; }
  }

  el.close.addEventListener("click", close);
  el.prev.addEventListener("click", function () { show(idx - 1); });
  el.next.addEventListener("click", function () { show(idx + 1); });

  document.querySelectorAll(".tile[data-slug]").forEach(function (t) {
    t.addEventListener("click", function () { open(t.dataset.slug, t); });
  });

  /* keyboard: Escape closes (drawer first if open), arrows page, Tab is trapped */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (navOpen()) { setNav(false); return; }
      if (isLbOpen()) close();
      return;
    }
    if (!isLbOpen()) return;
    if (e.key === "ArrowRight") show(idx + 1);
    else if (e.key === "ArrowLeft") show(idx - 1);
    else if (e.key === "Tab") {
      var focusables = lb.querySelectorAll("button");
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });

  /* swipe */
  var tx = null, ty = null;
  lb.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { tx = null; return; }
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    tx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* deep link: ponudba.html#masnibel opens that gallery */
  var hash = location.hash.replace("#", "");
  if (hash && CATALOG[hash]) {
    var tile = document.querySelector('.tile[data-slug="' + hash + '"]');
    open(hash, tile);
  }
})();

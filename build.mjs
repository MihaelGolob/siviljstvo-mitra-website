#!/usr/bin/env node
/**
 * Šiviljstvo Mitra — static site build.
 *
 * Reads   content/gallery/<slug>.json (CMS-edited — ordered photos + cover per category)
 *         content/hero.json      (CMS-edited — ordered hero slider images)
 *         content/site.json      (authored — language-independent config)
 *         content/i18n/<loc>.json (authored — all strings per locale)
 * Emits   {,de/,en/}{index,ponudba,kontakt}.html, sitemap.xml, robots.txt
 *         assets/images/derived/**  (WebP/JPEG/PNG derivatives via sharp, incremental)
 *
 * The build fails loudly: unresolved template tokens, missing assets, or leaked
 * prototype/2013 text are errors, not warnings.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));
function write(p, s) {
  fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, p), s);
}

const site = JSON.parse(read("content/site.json"));
const biz = site.business;
const LOCALES = site.locales; // first entry is the default and lives at the root
const i18n = Object.fromEntries(LOCALES.map((l) => [l, JSON.parse(read(`content/i18n/${l}.json`))]));

/* ── category model (names are per-locale; photos/covers shared) ───────── */
/* content/gallery/<slug>.json is CMS-edited, so tolerate path-ish values:
   image entries reduce to basenames, covers to paths relative to sources/. */
const baseName = (p) => path.posix.basename(String(p));
const stem = (f) => f.replace(/\.[^.]+$/, "");
const normCover = (slug, c) => {
  c = String(c).replace(/^\/?sources\//, "").replace(/^\//, "");
  return c.includes("/") ? c : `gallery/${slug}/${c}`;
};

const cats = {};
for (const f of fs.readdirSync(path.join(ROOT, "content/gallery")).filter((n) => n.endsWith(".json")).sort()) {
  const slug = f.slice(0, -".json".length);
  const g = JSON.parse(read(`content/gallery/${f}`));
  const files = g.images.map(baseName);
  const cover = normCover(slug, g.cover || files[0]);
  const start = files.indexOf(baseName(cover)) + 1; // 0 → cover is a dedicated file
  cats[slug] = { slug, files, count: files.length, cover, start: start || 1 };
}
const hero = { images: JSON.parse(read("content/hero.json")).images.map(baseName) };
{
  const grouped = site.groups.flat();
  const missing = Object.keys(cats).filter((s) => !grouped.includes(s));
  const unknown = grouped.filter((s) => !cats[s]);
  if (missing.length || unknown.length)
    throw new Error(`groups out of sync — ungrouped: [${missing}], unknown: [${unknown}]`);
  for (const l of LOCALES)
    for (const s of grouped)
      if (!i18n[l].names[s]) throw new Error(`i18n/${l}.json missing name for "${s}"`);
}

/* ── all referenced sources must exist before any work starts ──────────── */
{
  const missing = [];
  for (const c of Object.values(cats)) {
    if (!exists(`sources/${c.cover}`)) missing.push(`${c.slug}: cover sources/${c.cover}`);
    for (const f of c.files)
      if (!exists(`sources/gallery/${c.slug}/${f}`)) missing.push(`${c.slug}: sources/gallery/${c.slug}/${f}`);
  }
  for (const f of hero.images)
    if (!exists(`sources/slider/${f}`)) missing.push(`hero: sources/slider/${f}`);
  if (missing.length)
    throw new Error(`missing source image(s):\n  ${missing.join("\n  ")}`);
}

/* ── image derivatives (incremental, locale-independent) ───────────────── */
const jobs = [];
function job(src, out, fn) {
  const s = path.join(ROOT, src), o = path.join(ROOT, out);
  if (fs.existsSync(o) && fs.statSync(o).mtimeMs > fs.statSync(s).mtimeMs) return;
  fs.mkdirSync(path.dirname(o), { recursive: true });
  jobs.push(async () => fn(sharp(s)).toFile(o));
}

for (const c of Object.values(cats)) {
  const src = `sources/${c.cover}`;
  for (const w of [320, 640]) {
    // tiles show the whole piece (object-fit:contain) — no square crop
    const box = (i) => i.resize(w, Math.round((w * 4) / 3), { fit: "inside", withoutEnlargement: true });
    job(src, `assets/images/covers/${c.slug}-${w}.webp`,
      (i) => box(i).webp({ quality: 78 }));
    job(src, `assets/images/covers/${c.slug}-${w}.jpg`,
      (i) => box(i).jpeg({ quality: 78, progressive: true }));
  }
  for (const f of c.files) {
    const g = `sources/gallery/${c.slug}/${f}`;
    const base = `assets/images/gallery/${c.slug}/${stem(f)}`;
    job(g, `${base}-640.webp`, (i) =>
      i.resize(640, 640, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }));
    job(g, `${base}-160.webp`, (i) => i.resize(160, 160, { fit: "cover" }).webp({ quality: 70 }));
  }
}
for (const f of hero.images) {
  job(`sources/slider/${f}`, `assets/images/hero/${stem(f)}-640.webp`,
    (i) => i.resize({ width: 640 }).webp({ quality: 82 }));
}
for (const b of ["siviljstvo", "mitra", "logo", "betka"]) {
  job(`sources/brand/${b}.png`, `assets/images/brand/${b}-400.webp`,
    (i) => i.resize({ width: 400 }).webp({ quality: 90 })); // alpha preserved
}
job("sources/brand/logo.png", "apple-touch-icon.png", (i) =>
  i.flatten({ background: "#0f3a57" })
    .resize(180, 180, { fit: "contain", background: "#0f3a57" }).png());

async function runJobs(pool = 8) {
  let done = 0;
  const queue = [...jobs];
  await Promise.all(Array.from({ length: pool }, async () => {
    for (let j; (j = queue.shift()); ) { await j(); done++; }
  }));
  return done;
}

/* ── helpers ───────────────────────────────────────────────────────────── */
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));

/* Slovenian has a 4-form declension (1 / 2 / 3–4 / 5+); de and en use 2 forms. */
function countLabel(forms, n) {
  if (forms.length === 4) {
    const m = n % 100;
    return `${n} ${m === 1 ? forms[0] : m === 2 ? forms[1] : m === 3 || m === 4 ? forms[2] : forms[3]}`;
  }
  return `${n} ${n === 1 ? forms[0] : forms[1]}`;
}

function render(tpl, tokens) {
  const out = tpl.replace(/\{\{([A-Z_]+|P)\}\}/g, (_, k) => {
    if (!(k in tokens)) throw new Error(`unresolved template token {{${k}}}`);
    return tokens[k];
  });
  const leftover = out.match(/\{\{[A-Z_]+\}\}/);
  if (leftover) throw new Error(`token survived render: ${leftover[0]}`);
  return out;
}

const dirOf = (locale) => (locale === LOCALES[0] ? "" : `${locale}/`);
const pageUrl = (locale, file) =>
  `${site.siteUrl}/${dirOf(locale)}${file === "index.html" ? "" : file}`;

/* ── page fragments, per locale ────────────────────────────────────────── */
function fragments(locale) {
  const t = i18n[locale];
  const P = dirOf(locale) ? "../" : "";
  const name = (slug) => t.names[slug];
  const photosLabel = (n) => countLabel(t.plurals.photos, n);

  const tilePicture = (slug) => {
    const d = `${P}assets/images/covers/${slug}`;
    return `<span class="plate"><picture>
<source type="image/webp" srcset="${d}-320.webp 320w, ${d}-640.webp 640w" sizes="(max-width:360px) 88vw, (max-width:640px) 45vw, 200px">
<img src="${d}-320.jpg" srcset="${d}-320.jpg 320w, ${d}-640.jpg 640w" sizes="(max-width:360px) 88vw, (max-width:640px) 45vw, 200px" alt="${esc(name(slug))} – Šiviljstvo Mitra" width="320" height="427" loading="lazy">
</picture></span>`;
  };

  const tileButton = (slug) => `<button type="button" class="tile" data-slug="${slug}" id="${slug}">
${tilePicture(slug)}
<span class="tile-name">${esc(name(slug))}</span>
<span class="tile-count">${photosLabel(cats[slug].count)}</span>
</button>`;

  const tileLink = (slug) => `<a class="tile" href="ponudba.html#${slug}">
${tilePicture(slug)}
<span class="tile-name">${esc(name(slug))}</span>
</a>`;

  /* hero images are decorative (alt="") — dots get a numeric localized label */
  const heroSrc = (f) => `${P}assets/images/hero/${stem(f)}-640.webp`;
  const heroDots = hero.images.length > 1
    ? `      <div class="hero-dots">
${hero.images.map((f, i) => `        <button type="button" class="hero-dot" data-src="${heroSrc(f)}" data-alt="" aria-label="${esc(fmt(t.hero.dotLabel, { n: i + 1 }))}"${i === 0 ? ' aria-current="true"' : ""}><span></span></button>`).join("\n")}
      </div>`
    : "";
  const heroArt = `      <div class="hero-frame">
        <img id="hero-img" src="${heroSrc(hero.images[0])}" alt="" width="640" height="373" fetchpriority="high">
      </div>
${heroDots}`;

  const pillars = t.pillars.map((p) =>
    `    <div class="pillar"><h2>${esc(p.title)}</h2><p>${esc(p.text)}</p></div>`).join("\n");

  const groupsHtml = site.groups.map((slugs, gi) => `    <section class="group">
      <div class="group-head"><h2>${esc(t.groupTitles[gi])}</h2><span class="group-count">${countLabel(t.plurals.groups, slugs.length)}</span></div>
      <div class="tiles">
${slugs.map(tileButton).join("\n")}
      </div>
    </section>`).join("\n\n");

  const lightbox = `<div class="lb" id="lb" hidden role="dialog" aria-modal="true" aria-label="${esc(t.ui.lbAria)}">
  <div class="lb-head">
    <div class="lb-titles"><span class="lb-kicker">${esc(t.ui.lbKicker)}</span><span class="lb-title" id="lb-title"></span></div>
    <button type="button" class="lb-close" id="lb-close" aria-label="${esc(t.ui.lbClose)}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg></button>
  </div>
  <div class="lb-stage">
    <button type="button" class="lb-arrow" id="lb-prev" aria-label="${esc(t.ui.lbPrev)}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 5 8 12 15 19"/></svg></button>
    <figure class="lb-fig">
      <img id="lb-img" alt="">
      <figcaption class="lb-cap">
        <span class="lb-ref"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--sky)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4 12 22H2v-10l8.6-8.6a2 2 0 0 1 2.8 0l7.2 7.2a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="16.5" r="1.2"/></svg><span id="lb-ref"></span></span>
        <span class="lb-counter" id="lb-counter" aria-live="polite"></span>
      </figcaption>
    </figure>
    <button type="button" class="lb-arrow" id="lb-next" aria-label="${esc(t.ui.lbNext)}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
  </div>
  <div class="lb-foot">
    <div class="lb-strip" id="lb-strip"></div>
  </div>
</div>
<script>
window.ASSET_BASE=${JSON.stringify(P)};
window.CATALOG=${JSON.stringify(Object.fromEntries(Object.values(cats).map((c) => [c.slug, { n: name(c.slug), f: c.files.map(stem), s: c.start }])))};
window.LB_STRINGS=${JSON.stringify({ photoAlt: t.ui.photoAlt })};
</script>`;

  const reviews = site.googlePlaceId ? `
    <section class="reviews">
      <div class="reviews-head"><h2>${esc(t.ui.reviewsTitle)}</h2><span class="kicker">Google</span></div>
      <div class="rate-card">
        <p>${esc(t.ui.reviewsInvite)}</p>
        <a class="btn btn-primary" href="https://search.google.com/local/writereview?placeid=${esc(site.googlePlaceId)}" target="_blank" rel="noopener">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8Z"/></svg>
          ${esc(t.ui.reviewsButton)}
        </a>
      </div>
    </section>` : "";

  return { t, P, tileLink, heroArt, pillars, groupsHtml, lightbox, reviews };
}

/* ── layout tokens shared per (locale, page) ───────────────────────────── */
const LANG_NAMES = { sl: "Slovensko", de: "Deutsch", en: "English" };

/* Inline SVG flags, 3:2, flat style. The Slovenian flag carries a simplified
   coat of arms — without it the tricolour is indistinguishable from Russia's. */
const FLAGS = {
  sl: `<svg viewBox="0 0 24 16" width="27" height="18" aria-hidden="true"><rect width="24" height="16" fill="#fff"/><rect y="5.33" width="24" height="10.67" fill="#005DA4"/><rect y="10.67" width="24" height="5.33" fill="#DD0B31"/><g transform="translate(3.6,1.1)"><path d="M0 0h5v4.1c0 1.5-1.2 2.6-2.5 3.1C1.2 6.7 0 5.6 0 4.1Z" fill="#005DA4"/><path d="M.6 4.4 1.7 2.6l.8 1 .8-1.4 1.1 2.2c-.4 1-1 1.6-1.9 1.9-.9-.3-1.5-.9-1.9-1.9Z" fill="#fff"/></g></svg>`,
  de: `<svg viewBox="0 0 24 16" width="27" height="18" aria-hidden="true"><rect width="24" height="5.33" fill="#000"/><rect y="5.33" width="24" height="5.34" fill="#DD0000"/><rect y="10.67" width="24" height="5.33" fill="#FFCE00"/></svg>`,
  en: `<svg viewBox="0 0 24 16" width="27" height="18" aria-hidden="true"><rect width="24" height="16" fill="#012169"/><path d="M0 0 24 16M24 0 0 16" stroke="#fff" stroke-width="3.2"/><path d="M0 0 24 16M24 0 0 16" stroke="#C8102E" stroke-width="1.4"/><path d="M12 0v16M0 8h24" stroke="#fff" stroke-width="5.4"/><path d="M12 0v16M0 8h24" stroke="#C8102E" stroke-width="3.2"/></svg>`
};

function switcher(locale, file) {
  return LOCALES.map((l) => {
    if (l === locale)
      return `    <span role="img" aria-current="true" aria-label="${LANG_NAMES[l]}" title="${LANG_NAMES[l]}">${FLAGS[l]}</span>`;
    const back = dirOf(locale) ? "../" : "";
    return `    <a href="${back}${dirOf(l)}${file}" lang="${i18n[l].htmlLang}" aria-label="${LANG_NAMES[l]}" title="${LANG_NAMES[l]}">${FLAGS[l]}</a>`;
  }).join("\n");
}

function hreflangs(file) {
  const lines = LOCALES.map((l) =>
    `<link rel="alternate" hreflang="${i18n[l].htmlLang}" href="${pageUrl(l, file)}">`);
  lines.push(`<link rel="alternate" hreflang="x-default" href="${pageUrl(LOCALES[0], file)}">`);
  return lines.join("\n") + "\n";
}

const year = new Date().getFullYear();
const layout = read("src/templates/layout.html");
const ogImage = `${site.siteUrl}/assets/images/covers/${site.highlights[0]}-640.jpg`;

function page(locale, file, { pageKey, content, overlays = "", current }) {
  const f = fragments(locale);
  const t = f.t;
  const jsonld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: biz.name,
    description: t.pages.home.description,
    url: site.siteUrl,
    email: biz.email,
    telephone: biz.phone.tel,
    address: {
      "@type": "PostalAddress",
      streetAddress: biz.street,
      addressLocality: biz.locality,
      postalCode: biz.postal.split(" ")[0],
      addressCountry: "SI"
    },
    geo: { "@type": "GeoCoordinates", latitude: biz.coords.lat, longitude: biz.coords.lon }
  }).replace(/</g, "\\u003c"); // no </script> breakout from embedded JSON
  const html = render(layout, {
    LANG: t.htmlLang,
    TITLE: esc(t.pages[pageKey].title),
    DESCRIPTION: esc(t.pages[pageKey].description),
    CANONICAL: pageUrl(locale, file),
    HREFLANGS: hreflangs(file),
    OG_IMAGE: ogImage,
    OG_LOCALE: t.ogLocale,
    HEAD_EXTRA: site.searchConsoleToken
      ? `<meta name="google-site-verification" content="${esc(site.searchConsoleToken)}">\n` : "",
    JSONLD: jsonld,
    P: f.P,
    SKIP_LABEL: esc(t.ui.skipToContent),
    MENU_ARIA: esc(t.ui.menuAria),
    MAIN_NAV_ARIA: esc(t.ui.mainNavAria),
    LANG_ARIA: esc(t.ui.langAria),
    NAV_HOME: esc(t.ui.navHome),
    NAV_PONUDBA: esc(t.ui.navCatalogue),
    NAV_KONTAKT: esc(t.ui.navContact),
    CUR_HOME: current === "home" ? ' aria-current="page"' : "",
    CUR_PONUDBA: current === "ponudba" ? ' aria-current="page"' : "",
    CUR_KONTAKT: current === "kontakt" ? ' aria-current="page"' : "",
    SWITCHER: switcher(locale, file),
    MOBILE_TEL: biz.mobile.tel, MOBILE_LABEL: esc(t.ui.mobileDisplay), EMAIL: biz.email,
    CONTENT: content,
    COPYRIGHT: esc(fmt(t.ui.copyright, { year })),
    CREDIT: esc(t.ui.credit),
    OVERLAYS: overlays
  });
  write(`${dirOf(locale)}${file}`, html);
}

/* ── emit all locales ──────────────────────────────────────────────────── */
const totalPhotos = Object.values(cats).reduce((a, c) => a + c.count, 0);

for (const locale of LOCALES) {
  const f = fragments(locale);
  const t = f.t;

  page(locale, "index.html", {
    pageKey: "home",
    current: "home",
    content: render(read("src/templates/home.html"), {
      HERO_KICKER: esc(t.hero.kicker),
      HERO_TITLE: esc(t.hero.title),
      HERO_ART: f.heroArt,
      BROWSE_LABEL: esc(t.ui.browseCatalogue),
      CONTACT_LABEL: esc(t.ui.contact),
      FROM_CATALOGUE: esc(t.ui.fromCatalogue),
      ALL_GROUPS: esc(fmt(t.ui.allGroups, { n: Object.keys(cats).length })),
      PILLARS: f.pillars,
      HIGHLIGHT_TILES: site.highlights.map(f.tileLink).join("\n")
    })
  });

  page(locale, "ponudba.html", {
    pageKey: "ponudba",
    current: "ponudba",
    overlays: f.lightbox,
    content: render(read("src/templates/ponudba.html"), {
      CAT_KICKER: esc(t.ui.catKicker),
      CAT_TITLE: esc(t.ui.catTitle),
      GROUPS: f.groupsHtml
    })
  });

  page(locale, "kontakt.html", {
    pageKey: "kontakt",
    current: "kontakt",
    content: render(read("src/templates/kontakt.html"), {
      OWNER: esc(biz.owner), NAME: esc(biz.name),
      STREET: esc(biz.street), LOCALITY: esc(biz.locality),
      POSTAL: esc(biz.postal), COUNTRY: esc(t.ui.country),
      ADDRESS_TITLE: esc(t.ui.addressTitle),
      REACH_US_TITLE: esc(t.ui.reachUsTitle),
      PHONE_LABEL_UI: esc(t.ui.phoneLabel),
      MOBILE_LABEL_UI: esc(t.ui.mobileLabel),
      PHONE_TEL: biz.phone.tel, PHONE_LABEL: esc(t.ui.phoneDisplay),
      MOBILE_TEL: biz.mobile.tel, MOBILE_LABEL: esc(t.ui.mobileDisplay), EMAIL: biz.email,
      WHERE_TITLE: esc(t.ui.whereTitle),
      MAP_IFRAME_TITLE: esc(t.ui.mapIframeTitle),
      MAPS_EMBED: biz.mapsEmbed, MAPS_LINK: biz.mapsLink,
      MAP_OPEN: esc(t.ui.mapOpen),
      NAV_KONTAKT: esc(t.ui.navContact),
      REVIEWS: f.reviews
    })
  });
}

/* ── sitemap + robots ──────────────────────────────────────────────────── */
const FILES = ["index.html", "ponudba.html", "kontakt.html"];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${LOCALES.flatMap((l) => FILES.map((p) => `  <url><loc>${pageUrl(l, p)}</loc></url>`)).join("\n")}
</urlset>
`);

write("robots.txt", `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /sources/
Disallow: /src/
Disallow: /node_modules/

Sitemap: ${site.siteUrl}/sitemap.xml
`);

/* ── prune derivatives whose source is gone or no longer listed ────────── */
function pruneDir(dir, keepStems, rel) {
  const removed = [];
  if (!fs.existsSync(dir)) return removed;
  for (const e of fs.readdirSync(dir)) {
    const m = e.match(/^(.+)-(?:640|320|160)\.(?:webp|jpg)$/);
    if (m && keepStems.has(m[1])) continue;
    fs.rmSync(path.join(dir, e), { recursive: true });
    removed.push(`${rel}/${e}`);
  }
  return removed;
}
const pruned = [];
{
  const galleryRoot = path.join(ROOT, "assets/images/gallery");
  for (const d of fs.existsSync(galleryRoot) ? fs.readdirSync(galleryRoot) : []) {
    if (d === ".DS_Store") continue;
    const keep = cats[d] ? new Set(cats[d].files.map(stem)) : new Set();
    pruned.push(...pruneDir(path.join(galleryRoot, d), keep, `assets/images/gallery/${d}`));
    if (!cats[d]) fs.rmSync(path.join(galleryRoot, d), { recursive: true, force: true });
  }
  pruned.push(...pruneDir(path.join(ROOT, "assets/images/hero"),
    new Set(hero.images.map(stem)), "assets/images/hero"));
}

/* ── orphaned sources (uploaded but not listed) — warn, don't fail ─────── */
const warnings = [];
{
  const img = (f) => /\.(jpe?g|png|webp)$/i.test(f);
  for (const c of Object.values(cats)) {
    const listed = new Set(c.files);
    for (const f of fs.readdirSync(path.join(ROOT, `sources/gallery/${c.slug}`)).filter(img))
      if (!listed.has(f)) warnings.push(`sources/gallery/${c.slug}/${f} is not listed in content/gallery/${c.slug}.json — not published`);
  }
  const listed = new Set(hero.images);
  for (const f of fs.readdirSync(path.join(ROOT, "sources/slider")).filter(img))
    if (!listed.has(f)) warnings.push(`sources/slider/${f} is not listed in content/hero.json — not published`);
}

/* ── verification ──────────────────────────────────────────────────────── */
const generated = await runJobs();

const errors = [];
const LEAKS = ["prototip", "PLACE_ID", "javen od leta 2013", "Župnija Sv. Marjete",
  "Anton K.", "Marija P.", "nadomestna besedila", "sc-if", "sc-for", "style-hover",
  "Weiß kaseln", "folkstickerei", "aushangfahne", "segenvelen", "{{"];

for (const locale of LOCALES) {
  for (const file of FILES) {
    const rel = `${dirOf(locale)}${file}`;
    const html = read(rel);
    for (const leak of LEAKS) if (html.includes(leak)) errors.push(`${rel}: leaked "${leak}"`);
    if (!html.includes(`<html lang="${i18n[locale].htmlLang}"`)) errors.push(`${rel}: wrong <html lang>`);
    const hrefl = (html.match(/hreflang=/g) || []).length;
    if (hrefl !== LOCALES.length + 1) errors.push(`${rel}: expected ${LOCALES.length + 1} hreflang links, found ${hrefl}`);
    for (const m of html.matchAll(/(?:src|href|srcset)="([^"]+)"/g)) {
      for (let ref of m[1].split(",")) {
        ref = ref.trim().split(" ")[0];
        if (/^(https?:|mailto:|tel:|#|data:)/.test(ref) || ref === "") continue;
        const resolved = path.join(dirOf(locale), ref.split("#")[0]);
        if (!exists(resolved)) errors.push(`${rel}: missing ${ref}`);
      }
    }
  }
}
for (const c of Object.values(cats)) {
  for (const f of c.files) {
    const p = `assets/images/gallery/${c.slug}/${stem(f)}`;
    if (!exists(`${p}-640.webp`)) errors.push(`missing derivative ${p}-640.webp`);
    if (!exists(`${p}-160.webp`)) errors.push(`missing derivative ${p}-160.webp`);
  }
}
for (const f of hero.images)
  if (!exists(`assets/images/hero/${stem(f)}-640.webp`))
    errors.push(`missing derivative assets/images/hero/${stem(f)}-640.webp`);

if (errors.length) {
  console.error(`BUILD FAILED — ${errors.length} problem(s):`);
  for (const e of errors.slice(0, 20)) console.error("  " + e);
  process.exit(1);
}
/* ── dist/ — the exact upload artefact, assembled only after checks pass ── */
const DIST = path.join(ROOT, "dist");
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST);
const SHIP = ["index.html", "ponudba.html", "kontakt.html", "de", "en", "admin",
  "assets", "favicon.ico", "apple-touch-icon.png", "robots.txt", "sitemap.xml"];
for (const entry of SHIP) fs.cpSync(path.join(ROOT, entry), path.join(DIST, entry), { recursive: true });
const sum = (d) => fs.readdirSync(d, { withFileTypes: true })
  .reduce((a, e) => a + (e.isDirectory() ? sum(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
const distBytes = sum(DIST);

for (const w of warnings) console.warn(`warning: ${w}`);
if (pruned.length) console.log(`pruned ${pruned.length} stale derivative(s):\n  ${pruned.join("\n  ")}`);
console.log(`ok: ${LOCALES.length * FILES.length} pages (${LOCALES.join(", ")}), sitemap, robots; ${generated} derivative(s) generated`);
console.log(`    categories: ${Object.keys(cats).length}, photos: ${totalPhotos}`);
console.log(`    dist/ ready to upload: ${(distBytes / 1e6).toFixed(1)} MB`);

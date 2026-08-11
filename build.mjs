#!/usr/bin/env node
/**
 * Šiviljstvo Mitra — static site build.
 *
 * Reads   content/catalog.json  (generated — counts, cover paths; never hand-edited)
 *         content/site.json     (authored — copy, names, groups, contact)
 * Emits   index.html, ponudba.html, kontakt.html, sitemap.xml, robots.txt
 *         assets/images/derived/**  (WebP/JPEG/PNG derivatives via sharp, incremental)
 *
 * The build fails loudly: unresolved template tokens, missing assets, or leaked
 * prototype text are errors, not warnings.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const write = (p, s) => fs.writeFileSync(path.join(ROOT, p), s);
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const catalog = JSON.parse(read("content/catalog.json"));
const site = JSON.parse(read("content/site.json"));
const biz = site.business;

/* ── merged category model ─────────────────────────────────────────────── */
const bySlug = {};
for (const c of catalog.categories) {
  const name = site.names[c.slug];
  if (!name) throw new Error(`site.json has no display name for "${c.slug}"`);
  // open the gallery at the cover photo when the cover is one of the numbered photos
  const m = c.cover.match(new RegExp(`^gallery/${c.slug}/(\\d+)\\.`));
  bySlug[c.slug] = { slug: c.slug, name, count: c.count, cover: c.cover, start: m ? parseInt(m[1], 10) : 1 };
}
const groupedSlugs = site.groups.flatMap((g) => g.slugs);
{
  const missing = Object.keys(bySlug).filter((s) => !groupedSlugs.includes(s));
  const unknown = groupedSlugs.filter((s) => !bySlug[s]);
  if (missing.length || unknown.length)
    throw new Error(`groups out of sync — ungrouped: [${missing}], unknown: [${unknown}]`);
}

/* ── image derivatives (incremental) ───────────────────────────────────── */
const jobs = [];
function job(src, out, fn) {
  const s = path.join(ROOT, src), o = path.join(ROOT, out);
  if (fs.existsSync(o) && fs.statSync(o).mtimeMs > fs.statSync(s).mtimeMs) return;
  fs.mkdirSync(path.dirname(o), { recursive: true });
  jobs.push(async () => fn(sharp(s)).toFile(o));
}

for (const c of Object.values(bySlug)) {
  const src = `assets/images/${c.cover}`;
  for (const w of [320, 640]) {
    job(src, `assets/images/derived/covers/${c.slug}-${w}.webp`,
      (i) => i.resize(w, w, { fit: "cover" }).webp({ quality: 78 }));
    job(src, `assets/images/derived/covers/${c.slug}-${w}.jpg`,
      (i) => i.resize(w, w, { fit: "cover" }).jpeg({ quality: 78, progressive: true }));
  }
  for (let n = 1; n <= c.count; n++) {
    const g = `assets/images/gallery/${c.slug}/${String(n).padStart(3, "0")}.jpg`;
    const base = `assets/images/derived/gallery/${c.slug}/${String(n).padStart(3, "0")}`;
    job(g, `${base}-640.webp`, (i) =>
      i.resize(640, 640, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }));
    job(g, `${base}-160.webp`, (i) => i.resize(160, 160, { fit: "cover" }).webp({ quality: 70 }));
  }
}
for (const id of site.hero.images) {
  const src = `assets/images/slider/${id}.png`;
  job(src, `assets/images/derived/hero/${id}-640.webp`,
    (i) => i.resize({ width: 640 }).webp({ quality: 82 }));
  job(src, `assets/images/derived/hero/${id}-640.png`,
    (i) => i.resize({ width: 640 }).png({ compressionLevel: 9 }));
}
job("assets/images/brand/siviljstvo.png", "assets/images/derived/brand/siviljstvo-300.png",
  (i) => i.resize({ width: 300 }).png({ compressionLevel: 9 }));
job("assets/images/brand/mitra.png", "assets/images/derived/brand/mitra-240.png",
  (i) => i.resize({ width: 240 }).png({ compressionLevel: 9 }));
job("assets/images/brand/logo.png", "assets/images/derived/brand/logo-176.png",
  (i) => i.resize({ width: 176 }).png({ compressionLevel: 9 }));

async function runJobs(pool = 8) {
  let done = 0;
  const queue = [...jobs];
  await Promise.all(Array.from({ length: pool }, async () => {
    for (let j; (j = queue.shift()); ) { await j(); done++; }
  }));
  return done;
}

/* ── HTML helpers ──────────────────────────────────────────────────────── */
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Slovenian declension: [1, 2, 3–4, 5+] e.g. sl(2,"fotografija","fotografiji","fotografije","fotografij") */
function sl(n, ena, dve, tri, pet) {
  const m = n % 100;
  return `${n} ${m === 1 ? ena : m === 2 ? dve : m === 3 || m === 4 ? tri : pet}`;
}
const slFoto = (n) => sl(n, "fotografija", "fotografiji", "fotografije", "fotografij");
const slSkupin = (n) => sl(n, "skupina", "skupini", "skupine", "skupin");

function render(tpl, tokens) {
  const out = tpl.replace(/\{\{([A-Z_]+)\}\}/g, (_, k) => {
    if (!(k in tokens)) throw new Error(`unresolved template token {{${k}}}`);
    return tokens[k];
  });
  const leftover = out.match(/\{\{[A-Z_]+\}\}/);
  if (leftover) throw new Error(`token survived render: ${leftover[0]}`);
  return out;
}

function tilePicture(c, { lazy }) {
  const d = `assets/images/derived/covers/${c.slug}`;
  const attrs = lazy ? ' loading="lazy"' : "";
  return `<span class="plate"><picture>
<source type="image/webp" srcset="${d}-320.webp 320w, ${d}-640.webp 640w" sizes="(max-width:640px) 45vw, 200px">
<img src="${d}-320.jpg" srcset="${d}-320.jpg 320w, ${d}-640.jpg 640w" sizes="(max-width:640px) 45vw, 200px" alt="${esc(c.name)} – Šiviljstvo Mitra" width="320" height="320"${attrs}>
</picture></span>`;
}

function tileButton(c) {
  return `<button type="button" class="tile" data-slug="${c.slug}" id="${c.slug}">
${tilePicture(c, { lazy: true })}
<span class="tile-name">${esc(c.name)}</span>
<span class="tile-count">${slFoto(c.count)}</span>
</button>`;
}

function tileLink(c) {
  return `<a class="tile" href="ponudba.html#${c.slug}">
${tilePicture(c, { lazy: true })}
<span class="tile-name">${esc(c.name)}</span>
</a>`;
}

const heroImages = site.hero.images.map((id, i) => {
  const alt = site.hero.alts[id] || "";
  const eager = i === 0
    ? ' fetchpriority="high"'
    : ' loading="lazy"'; // display:none on mobile → never fetched there
  return `      <picture>
<source type="image/webp" srcset="assets/images/derived/hero/${id}-640.webp">
<img src="assets/images/derived/hero/${id}-640.png" alt="${esc(alt)}" width="640" height="373"${eager}>
</picture>`;
}).join("\n");

const pillars = site.pillars.map((p) =>
  `    <div class="pillar"><h2>${esc(p.title)}</h2><p>${esc(p.text)}</p></div>`).join("\n");

const groupsHtml = site.groups.map((g) => `    <section class="group">
      <div class="group-head"><h2>${esc(g.title)}</h2><span class="group-count">${slSkupin(g.slugs.length)}</span></div>
      <div class="tiles">
${g.slugs.map((s) => tileButton(bySlug[s])).join("\n")}
      </div>
    </section>`).join("\n\n");

const lightbox = `<div class="lb" id="lb" hidden role="dialog" aria-modal="true" aria-label="Galerija">
  <div class="lb-head">
    <div class="lb-titles"><span class="lb-kicker">Galerija</span><span class="lb-title" id="lb-title"></span></div>
    <button type="button" class="lb-close" id="lb-close" aria-label="Zapri galerijo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg></button>
  </div>
  <div class="lb-stage">
    <button type="button" class="lb-arrow" id="lb-prev" aria-label="Prejšnja fotografija"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 5 8 12 15 19"/></svg></button>
    <figure class="lb-fig">
      <img id="lb-img" alt="">
      <figcaption class="lb-cap">
        <span class="lb-ref"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--sky)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4 12 22H2v-10l8.6-8.6a2 2 0 0 1 2.8 0l7.2 7.2a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="16.5" r="1.2"/></svg><span id="lb-ref"></span></span>
        <span class="lb-counter" id="lb-counter"></span>
      </figcaption>
    </figure>
    <button type="button" class="lb-arrow" id="lb-next" aria-label="Naslednja fotografija"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
  </div>
  <div class="lb-foot">
    <p class="lb-hint" id="lb-hint"></p>
    <div class="lb-strip" id="lb-strip"></div>
  </div>
</div>
<script>
window.CATALOG=${JSON.stringify(Object.fromEntries(Object.values(bySlug).map((c) => [c.slug, { n: c.name, c: c.count, s: c.start }])))};
window.LB_HINT=${JSON.stringify(site.lightboxHint)};
</script>`;

const reviewsHtml = site.googlePlaceId ? `
    <section class="reviews">
      <div class="reviews-head"><h2>Mnenja naročnikov</h2><span class="kicker">Google</span></div>
      <div class="rate-card">
        <p>Če ste pri nas naročili parament ali vezenino, nam bo vaše mnenje v veliko pomoč — in drugim župnijam pri odločitvi.</p>
        <a class="btn btn-primary" href="https://search.google.com/local/writereview?placeid=${esc(site.googlePlaceId)}" target="_blank" rel="noopener">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8Z"/></svg>
          Ocenite nas
        </a>
      </div>
    </section>` : "";

const jsonld = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: biz.name,
  description: site.pages.home.description,
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
  geo: { "@type": "GeoCoordinates", latitude: biz.coords.lat, longitude: biz.coords.lon },
  sameAs: [biz.facebook, biz.twitter]
});

/* ── page assembly ─────────────────────────────────────────────────────── */
const layout = read("src/templates/layout.html");
const year = new Date().getFullYear();
const ogImage = `${site.siteUrl}/assets/images/derived/covers/${site.highlights[0]}-640.jpg`;

function page(file, { title, description, content, overlays = "", current }) {
  const html = render(layout, {
    TITLE: esc(title),
    DESCRIPTION: esc(description),
    CANONICAL: `${site.siteUrl}/${file === "index.html" ? "" : file}`,
    OG_IMAGE: ogImage,
    HEAD_EXTRA: site.searchConsoleToken
      ? `<meta name="google-site-verification" content="${esc(site.searchConsoleToken)}">\n` : "",
    JSONLD: jsonld,
    CUR_HOME: current === "home" ? ' aria-current="page"' : "",
    CUR_PONUDBA: current === "ponudba" ? ' aria-current="page"' : "",
    CUR_KONTAKT: current === "kontakt" ? ' aria-current="page"' : "",
    MOBILE_TEL: biz.mobile.tel, MOBILE_LABEL: biz.mobile.label, EMAIL: biz.email,
    CONTENT: content,
    COPYRIGHT: esc(site.footer.copyright.replace("{year}", String(year))),
    CREDIT: esc(site.footer.credit),
    FACEBOOK: biz.facebook, TWITTER: biz.twitter,
    OVERLAYS: overlays
  });
  write(file, html);
}

page("index.html", {
  title: site.pages.home.title,
  description: site.pages.home.description,
  current: "home",
  content: render(read("src/templates/home.html"), {
    HERO_SINGLE: site.hero.images.length > 1 ? "" : " hero-single",
    HERO_KICKER: esc(site.hero.kicker),
    HERO_TITLE: esc(site.hero.title),
    HERO_LEAD: esc(site.hero.lead),
    HERO_IMAGES: heroImages,
    PILLARS: pillars,
    CAT_COUNT: String(catalog.categories.length),
    HIGHLIGHT_TILES: site.highlights.map((s) => tileLink(bySlug[s])).join("\n")
  })
});

page("ponudba.html", {
  title: site.pages.ponudba.title,
  description: site.pages.ponudba.description,
  current: "ponudba",
  overlays: lightbox,
  content: render(read("src/templates/ponudba.html"), {
    GROUP_COUNT: String(catalog.categories.length),
    PHOTO_TOTAL: String(catalog.categories.reduce((a, c) => a + c.count, 0)),
    GROUPS: groupsHtml
  })
});

page("kontakt.html", {
  title: site.pages.kontakt.title,
  description: site.pages.kontakt.description,
  current: "kontakt",
  content: render(read("src/templates/kontakt.html"), {
    OWNER: esc(biz.owner), NAME: esc(biz.name),
    STREET: esc(biz.street), LOCALITY: esc(biz.locality),
    POSTAL: esc(biz.postal), COUNTRY: esc(biz.country),
    PHONE_TEL: biz.phone.tel, PHONE_LABEL: biz.phone.label,
    MOBILE_TEL: biz.mobile.tel, MOBILE_LABEL: biz.mobile.label, EMAIL: biz.email,
    LAT: String(biz.coords.lat), LON: String(biz.coords.lon),
    REVIEWS: reviewsHtml
  })
});

write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${["", "ponudba.html", "kontakt.html"].map((p) => `  <url><loc>${site.siteUrl}/${p}</loc></url>`).join("\n")}
</urlset>
`);

write("robots.txt", `User-agent: *
Allow: /
Disallow: /archive/
Disallow: /legacy/
Disallow: /src/
Disallow: /node_modules/

Sitemap: ${site.siteUrl}/sitemap.xml
`);

/* ── verification ──────────────────────────────────────────────────────── */
const generated = await runJobs();

const errors = [];
const LEAKS = ["prototip", "PLACE_ID", "javen od leta 2013", "Župnija Sv. Marjete",
  "Anton K.", "Marija P.", "nadomestna besedila", "sc-if", "sc-for", "style-hover", "{{"];

for (const file of ["index.html", "ponudba.html", "kontakt.html"]) {
  const html = read(file);
  for (const leak of LEAKS) if (html.includes(leak)) errors.push(`${file}: leaked "${leak}"`);
  for (const m of html.matchAll(/(?:src|href|srcset)="([^"]+)"/g)) {
    for (let ref of m[1].split(",")) {
      ref = ref.trim().split(" ")[0];
      if (/^(https?:|mailto:|tel:|#|data:)/.test(ref) || ref === "") continue;
      if (!exists(ref.split("#")[0])) errors.push(`${file}: missing ${ref}`);
    }
  }
}
// every lightbox image the JS can request must exist, and counts must match catalog
for (const c of Object.values(bySlug)) {
  for (let n = 1; n <= c.count; n++) {
    const p = `assets/images/derived/gallery/${c.slug}/${String(n).padStart(3, "0")}`;
    if (!exists(`${p}-640.webp`)) errors.push(`missing derivative ${p}-640.webp`);
    if (!exists(`${p}-160.webp`)) errors.push(`missing derivative ${p}-160.webp`);
  }
  if (exists(`assets/images/derived/gallery/${c.slug}/${String(c.count + 1).padStart(3, "0")}-640.webp`))
    errors.push(`${c.slug}: derivative beyond catalog count ${c.count}`);
}

if (errors.length) {
  console.error(`BUILD FAILED — ${errors.length} problem(s):`);
  for (const e of errors.slice(0, 20)) console.error("  " + e);
  process.exit(1);
}
console.log(`ok: 3 pages, sitemap, robots; ${generated} derivative(s) generated (fresh ones skipped)`);
console.log(`    categories: ${catalog.categories.length}, photos: ${catalog.categories.reduce((a, c) => a + c.count, 0)}`);

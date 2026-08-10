# Legacy site (2013) — reference only, not deployed

The site that this repo is replacing, kept verbatim so its copy and structure stay readable during the
rewrite. **Its image paths are intentionally broken** — the assets it referenced were reorganised into
`assets/images/` during cleanup. Opening these files in a browser will show missing images; that is
expected and is not worth fixing. Read them as text.

Its only remaining job is to answer "what did the old site say?" Everything durable has already been
extracted to `content/notes-legacy.md` and `content/catalog.json` — check there first.

## Files

| File | What it holds |
|---|---|
| `index.html` / `index-nem.html` | Homepage, SL / DE. Note the two were never in sync: SL featured Easter doilies, cassocks and sweaters; DE showed only `bandera` photos under a `Neu:` heading. |
| `ponudba.html` / `ponudba-nem.html` | Catalogue. Source of the 26 category names in both languages, and of the hardcoded `pokazi(slug, count)` calls whose counts had drifted out of sync with the filesystem in 7 categories. |
| `kontakt.html` / `kontakt-nem.html` | Contact details and the Google Maps embed. Contains a hardcoded Maps browser API key that has been public since 2013 and **must be rotated and referrer-restricted** — see `content/notes-legacy.md`. The embed uses the removed legacy loader (`sensor=false`, `addDomListener`), so the map has likely not rendered for years. |
| `style.css` | 350 lines. Fixed 250 px sidebar with `margin-left: -250px` counter-hacks throughout, one `max-width: 500px` breakpoint, and dead rules (`.ime`, `.a`, `.b`, `.flex-novo`, IE-only `scrollbar-*`). |
| `javascript.js` | Homepage slider plus the lightbox gallery. The gallery derived image URLs by string-concatenating a hardcoded count, which is why counts drifted; it also assumed every file was `.JPG`, so a single lowercase `18.jpg` in `razno` was permanently unreachable. |

## Known problems — do not carry these forward

- `<meta name="viewport">` was present on `index.html` only, so the catalogue and contact pages were
  unusable on phones
- no `lang` attribute on any page, no `<meta name="description">`, and zero `alt` attributes across
  831 images
- three blocking Google Fonts `<link>` tags per page, one of which (`Sacramento`) was never used
- dead Google+ link in every footer (service shut down 2019)

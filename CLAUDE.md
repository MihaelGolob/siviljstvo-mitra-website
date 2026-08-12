# Šiviljstvo Mitra — static site

Trilingual (sl/en/de) static site built by `build.mjs` (Node, sharp for images).

## Architecture

- `src/templates/` + `content/` are the sources. Edit these.
- `index.html`, `ponudba.html`, `kontakt.html`, `en/`, `de/`, `sitemap.xml`, `robots.txt` are **generated output** — never hand-edit them; changes get overwritten by the next build.
- `content/site.json` — language-independent config (authored).
- `content/i18n/<locale>.json` — all user-facing strings per locale (authored). Any text change must be made in every locale file.
- `content/gallery/<slug>.json` — one per category: ordered `images` list (basenames in `sources/gallery/<slug>/`) + `cover`. Edited via Sveltia CMS at `/admin/`; safe to hand-edit too.
- `content/hero.json` — ordered hero slider images (basenames in `sources/slider/`). Also CMS-edited.
- `admin/` — Sveltia CMS (`index.html` + `config.yml`); shipped to `dist/` as-is.
- List order is display order; the build names derivatives after the source file stem, so reordering regenerates nothing. Files present on disk but not listed are warned about and not published; their stale derivatives are pruned.
- First locale in `site.locales` is the default and lives at the site root.

## Workflow

- Build: `npm run build`. The build fails loudly on unresolved template tokens or missing assets — a passing build is the baseline check.
- Always test what you do: after any change, run the build and verify the relevant generated HTML actually contains the change (all affected locales).
- Never `git push` without asking first — pushing to master auto-deploys via GitHub Actions.

## Code style

- Keep comments minimal. Only comment what the code can't say itself; no narration.
- Plain modern JS (ESM), no framework — keep it that way.

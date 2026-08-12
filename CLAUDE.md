# Šiviljstvo Mitra — static site

Trilingual (sl/en/de) static site built by `build.mjs` (Node, sharp for images).

## Architecture

- `src/templates/` + `content/` are the sources. Edit these.
- `index.html`, `ponudba.html`, `kontakt.html`, `en/`, `de/`, `sitemap.xml`, `robots.txt` are **generated output** — never hand-edit them; changes get overwritten by the next build.
- `content/site.json` — language-independent config (authored).
- `content/i18n/<locale>.json` — all user-facing strings per locale (authored). Any text change must be made in every locale file.
- `content/catalog.json` — generated (counts, cover paths); never hand-edit.
- First locale in `site.locales` is the default and lives at the site root.

## Workflow

- Build: `npm run build`. The build fails loudly on unresolved template tokens or missing assets — a passing build is the baseline check.
- Always test what you do: after any change, run the build and verify the relevant generated HTML actually contains the change (all affected locales).
- Never `git push` without asking first — pushing to master auto-deploys via GitHub Actions.

## Code style

- Keep comments minimal. Only comment what the code can't say itself; no narration.
- Plain modern JS (ESM), no framework — keep it that way.

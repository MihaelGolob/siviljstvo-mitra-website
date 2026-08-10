# Salvaged content from the 2013 site

Everything here was extracted before the old files were deleted or moved to `legacy/` / `archive/`
during the pre-overhaul cleanup. It exists so the new build doesn't have to re-derive copy, contact
details, or SEO metadata from deleted markup.

Recover any original file with `git show 70c9dff:<path>`.

---

## SEO metadata (from the pre-2013 site, dropped by the 2013 rewrite)

Found in `ponudba/albe.html~` and `ponudba/masni.html~`. The 2013 site has **no**
`<meta name="description">` on any page, so this copy is the only version that ever existed:

- **Description (SL):** `Izdelava cerkvenih paramentov in narodnih vezenin`
- **Keywords (SL):** Šiviljstvo mitra, alba, ministrantska obleka, prvoobhajilna obleka, baldahin,
  bandera, duhovniška srajca, mitre, mašni plašč, oltarni prt, pluvial, prtiček za maševanje, štola,
  velum, božični prtički, velikonočni prtički, narodne vezenine, rišelje vezenine, krstni prtički,
  zastavice, predpasniki, namizne zastavice, prapori

  (Two typos in the original are corrected above: `prvoobhaliljna` → `prvoobhajilna`,
  `rišlje` → `rišelje`.)

- **Google Search Console verification token:**
  `9Lgaf-r_2YqvPqW6zxn2qtFcSPEyUa2zbGyQElZTzNI`
  Check whether the Search Console property is still owned before dropping this — re-adding the same
  meta tag preserves verification and any historical search data.

- **Old author meta:** `Domen Golob` (the 2013 footer credits `Mihael Golob`).

- **Retired Google Analytics property:** `UA-45414321-1` for `siviljstvo-mitra.si`. Universal
  Analytics was shut down in 2023 — do **not** migrate this; set up fresh analytics if wanted.

## Contact details

Identical on `kontakt.html` and `kontakt-nem.html`:

- Betka Golob s. p. — Šiviljstvo Mitra
- Slovenija, Preserje pri Radomljah, Kamniška cesta 43
- 1235 Radomlje
- Telefon: 01 72 27 804
- GSM: 041 941 611
- E-pošta: siviljstvo.mitra@siol.net
- Map coordinates used by the old embed: **46.170070, 14.593872**

German label variants used: `Telefonnummer`, `Email`.

## Social links (verify before reusing)

- Facebook: https://www.facebook.com/people/%C5%A0iviljstvo-Mitra/100009433814975
- Twitter: https://twitter.com/SiviljstvoMitra
- ~~Google+: https://plus.google.com/u/2/108047242406110429831/about~~ — service shut down in 2019,
  link is dead on all six pages.

## Footer copy

- SL: `Šiviljstvo Mitra © 2013 - <year>  Vse pravice pridržane.`
- DE: `Diese Seite und ihr gesamter Inhalt unterliegen dem Urheberrecht von Šiviljstvo Mitra © 2013 - <year>`
- Credit line (SL pages only): `Izdelava spletne strani: Mihael Golob`

## Navigation labels

| | SL | DE |
|---|---|---|
| Home | Domov | Startseite |
| Catalogue | Ponudba | Sortiment |
| Contact | Kontakt | Kontakt |

Homepage section headings (SL): `Velikonočni prtički:`, `Talarji:`, `Pleteni puloverji:` —
note these three product types (Easter doilies, cassocks, knitted sweaters) appear **only** on the
homepage and have no gallery category. The German homepage instead showed a single `Neu:` section with
the `bandera` photos. The two homepages were never kept in sync.

## Category names

The full SL + DE mapping now lives in `content/catalog.json`, generated from the filesystem. Notes on
the German set, which was machine-translated and never reviewed:

- inconsistent capitalisation and un-agreeing adjectives: `Weiß kaseln`, `Rot kaseln`, `Grün stolen`
  should be `Weiße Kaseln`, `Rote Kaseln`, `Grüne Stolen`; `einzigartige kaseln`, `folkstickerei`,
  `chormantel`, `aushangfahne`, `segenvelen` all need capitalisation
- `risvez` was never translated — the DE page repeats the Slovenian `Rišelje vezenine`
- `Restaurierung das tabernakel` is ungrammatical (→ `Restaurierung des Tabernakels`)
- **A native-German review is required before this copy goes live.** English strings do not exist
  anywhere yet and must be written from scratch.

## Why the gallery counts were untrustworthy

`ponudba.html~` (an intermediate saved edit) carries a *different* set of hardcoded counts from the
shipped `ponudba.html`, and omits the `stolecrne` category entirely:

| category | `ponudba.html~` | shipped `ponudba.html` | actual files |
|---|---|---|---|
| `albe` | 18 | 19 | 19 |
| `dalmatika` | 9 | 8 | 7 |
| `masnibel` | 77 | 76 | 76 |
| `prtnarodni` | 52 | 50 | 50 (+1 duplicate) |
| `stolebel` | 62 | 56 | 56 |
| `stolevijola` | 40 | 38 | 38 |
| `stoleunikat` | 20 | 22 | 22 |
| `razno` | 24 | 19 | 18 |
| `stolecrne` | — absent — | 2 | 2 |

Three generations of hand-maintained counts, no two agreeing. `content/catalog.json` is generated from
the filesystem so this cannot recur.

# Šiviljstvo Mitra — website

Church vestments and folk embroidery, made by Betka Golob s. p. in Preserje pri Radomljah, Slovenia.

The 2013 site has been retired and this repo is being rebuilt. What's here now is the cleaned-up
asset and content base for that rebuild — no site code yet.

## Layout

| Path | Deployed | What it is |
|---|---|---|
| `assets/images/gallery/<slug>/001.jpg…` | yes | 738 product photos across 27 categories, contiguously numbered |
| `assets/images/covers/` | yes | The 3 category covers that aren't also gallery photos |
| `assets/images/slider/` | yes | 10 homepage rotation images |
| `assets/images/featured/` | yes | 11 homepage feature photos (cassocks, sweaters, Easter doilies, banners) |
| `assets/images/brand/` | yes | Logo, wordmarks, language flags |
| `content/catalog.json` | — | Generated catalogue manifest (see below) |
| `content/notes-legacy.md` | — | Copy, contact details, and SEO metadata salvaged from the old site |
| `archive/` | **no** | High-res photo originals and logo source. Not regenerable — see `archive/README.md` |
| `legacy/` | **no** | The 2013 site, verbatim, as copy reference — see `legacy/README.md` |

Exclude `archive/` and `legacy/` from any build or deploy step.

## `content/catalog.json`

The single source of truth for what's in the catalogue. **Generated from the filesystem — never
hand-edit counts or paths.** All paths are relative to `assets/images/`.

```json
{
  "categories": [
    { "slug": "albe",
      "name": { "sl": "Albe - roket(koretelj)", "de": "Alben", "en": null },
      "count": 19,
      "cover": "gallery/albe/018.jpg" }
  ],
  "slider":   ["slider/01.png", "..."],
  "featured": ["featured/talar1.jpg", "..."],
  "crossListed": [["gallery/prtoltarni/043.jpg", "gallery/risvez/003.jpg"]]
}
```

- `count` is the number of files in `gallery/<slug>/`, which are always `001.jpg` … `NNN.jpg` with no
  gaps. The old site hardcoded these counts in HTML and **8 of 27 had drifted out of sync**, so the
  gallery walked into 404s. Deriving `count` from disk is the fix; keep it that way.
- `name.en` is `null` everywhere — English copy has never existed and must be written.
- `name.de` came from the old site's machine translation and **needs a native-German review** before
  going live. See `content/notes-legacy.md` for the specific problems.
- `crossListed` records photos that legitimately appear in two categories (a Richelieu-embroidered
  altar cloth belongs under both the technique and the object). Both copies are intentional; dedupe on
  these pairs if you ever build a single combined "all products" view.

## Known constraints for the rebuild

**Product photos are small and cannot be improved.** 493 of the 738 gallery images are under 400 px
wide; the median is roughly 275×640. No higher-resolution source exists for them. The design must not
use full-bleed or large hero imagery for products — plan constrained tiles and typography-led layout.
The only material that can carry a large hero is `archive/photos-highres/`.

Also worth handling early:

- `assets/images/featured/pulover.png` is a 5.5 MB PNG of a photograph, and `velikonocni1/2.png` are
  0.5–0.6 MB each. Converting these to JPEG/WebP is an easy large win.
- The old contact page's Google Maps browser API key has been public since 2013 and must be rotated
  and referrer-restricted, or the map replaced outright. Details in `content/notes-legacy.md`.
- The old site had no `alt` text on any of 831 images, no `lang` attribute, no meta description, and a
  viewport tag on only one of six pages. Start these right rather than porting the gaps.

Recover anything deleted during cleanup with `git show 70c9dff:<path>`.

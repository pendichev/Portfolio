# Andon Pendichev — Portfolio

Personal portfolio of Andon Pendichev, cybersecurity student (BUT Networks & Telecommunications, Université Sorbonne Paris Nord).

**Live site:** https://pendichev.github.io/Portfolio/ (`?lang=fr` opens it in French)

A static, dependency-free site: plain HTML, CSS and JavaScript, no build step. It is bilingual (English / French), has a light and a dark theme, works on phones, and makes no third-party requests (fonts are self-hosted, no trackers).

## Structure

```
index.html                  The whole page (English text lives here)
404.html                    "Page not found" page served by GitHub Pages
assets/
  css/main.css              All styles (design tokens at the top)
  js/boot.js                Picks theme + language before the page is painted
  js/i18n.js                French translations
  js/main.js                Interactions (menu, filters, video dialog, etc.)
  fonts/                    Geist & Geist Mono (SIL Open Font License)
  img/                      Portrait, favicon, social preview image
  img/projects/             Project thumbnails (800 × 500 WebP)
documents/                  CVs (EN / FR)
documents/projects/         Project reports (PDF)
media/                      Videos
projects/sae15/             SAÉ 1.05 data-visualisation page
```

## Editing content

- **English text:** edit it directly in `index.html`.
- **French text:** every translatable element has a `data-i18n="key"` attribute. Change the French string with the same key in `assets/js/i18n.js`. Attributes (image `alt`, `aria-label`…) use `data-i18n-attr="attribute:key"`.
- **CVs:** replace `documents/CV_Andon_PENDICHEV_EN.pdf` and `documents/CV_Andon_PENDICHEV_FR.pdf` (keep the file names and the links keep working).

### Adding a project

1. Put the report in `documents/projects/` (lower-case, no spaces in the file name).
2. Add a 800 × 500 thumbnail in `assets/img/projects/` (WebP or JPEG).
3. In `index.html`, copy one `<li class="project">` block inside `#project-grid`, and set:
   - `data-category` to `cyber`, `network`, `telecom` or `dev` (this drives the filters),
   - the image, title, text, tags and links,
   - new `data-i18n` keys for the title and text.
4. Add the French strings for those keys in `assets/js/i18n.js`.
5. Update the counts shown on the filter buttons.

## Preview locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

GitHub Pages → *Settings → Pages → Deploy from a branch* → `main`, folder `/ (root)`. The empty `.nojekyll` file tells Pages to serve the files as they are.

## Credits

- Fonts: [Geist and Geist Mono](https://github.com/vercel/geist-font), SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).
- Icons: [Lucide](https://lucide.dev), ISC License.

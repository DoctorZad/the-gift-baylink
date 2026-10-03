# The Gift — author site for David J. Baylink, MD

A static author website for *The Gift*, the first novel by David J. Baylink, MD, Distinguished
Professor of Medicine at Loma Linda University.

No build step, no dependencies, no framework. Four HTML files, one stylesheet, one script.
Open `index.html` and it works.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Home: hero, the scroll-driven book, synopsis, chapter one excerpt, lines from the book, the author, the science, press, newsletter |
| `the-gift.html` | The novel: synopsis, the author's note in full, all twenty-six chapters, the science behind the story |
| `about.html` | Biography, photographs, the publication record |
| `contact.html` | Enquiries, events, rights and permissions |

## Previewing locally

Any static server works. One is included for Windows:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8123
```

Then open <http://localhost:8123/>.

Opening `index.html` straight from the file system also works.

## Deploy on Vercel

The site is static — Vercel does not need a build command.

1. Create a free account at [vercel.com](https://vercel.com/signup).
2. From the dashboard, click **Add New… → Project**, then upload the `the-gift-baylink` folder.
3. Leave Framework Preset as **Other**. Deploy.
4. When it is live, open **Settings → Domains**, add `davidbaylink.com` and `www.davidbaylink.com`.
5. In Namecheap, open the domain → **Advanced DNS** and set:

   | Type  | Host | Value                  | TTL       |
   | ----- | ---- | ---------------------- | --------- |
   | A     | `@`  | `76.76.21.21`          | Automatic |
   | CNAME | `www`| `cname.vercel-dns.com.` | Automatic |

   Remove any Namecheap parking, URL-redirect, or old A records for `@` and `www`. DNS can take a few minutes to a few hours.

## The book that opens as you scroll

`.bookscroll` on the home page is a 460vh tall track containing a sticky, full-height stage. As the
track passes through the viewport, scroll position becomes a single progress value `p` between 0
and 1 that drives overlapping phases:

1. **0.00 – 0.15** the closed book rises out of the dark and squares up to the reader
2. **0.15 – 0.50** the front cover swings open on the spine
3. **0.44 – 0.88** three front-matter leaves bend and turn one after another
4. **0.78 – 1.00** the camera settles over the open spread on chapter one
5. **0.86 – 1.00** the closing line fades up beneath it

The book is a real 3D model rendered with Three.js (`assets/vendor/three.module.min.js`, r170) by
`assets/js/book3d.js`: hard boards wrapped in `assets/img/cover.jpg`, a thick page block whose top
curves down into the gutter, bending paper leaves, soft shadows, and a red rim light taken from the
cover's doorway. The page text is drawn into canvas textures with the site's web fonts, so it stays
sharp and needs no extra image files. It only re-renders when the scroll position changes.

`assets/js/site.js` handles the captions, progress bar and closing line. If WebGL is unavailable the
stage gets `.is-fallback` and simply shows the flat cover image. Under `prefers-reduced-motion` the
track collapses to 120vh.

## Replacing the cover

Drop new art in as `assets/img/cover.jpg` (992 × 1585, or the same 5:8 ratio). The 3D book, the
synopsis cover and the social preview image on `the-gift.html` all read that one file.
## Content sources

Everything quoted on the site is taken verbatim from the manuscript or from published interviews.
The author's note on `the-gift.html` is reproduced in full and unaltered. The press links point to
Business Insider, the Adventist Review, and the Loma Linda University faculty profile.

## Things to fill in before launch

- The contact address on `contact.html` is a placeholder (`hello@example.com`).
- The newsletter and contact forms are front-end only. Point them at a form service — Formspree,
  Buttondown, Mailchimp — by giving each `<form>` an `action` and removing the handlers in
  `assets/js/site.js`.
- Add retailer links once the book is listed.

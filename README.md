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
track passes through the viewport, `assets/js/site.js` turns scroll position into a single progress
value `p` between 0 and 1 and drives five overlapping phases from it:

1. **0.00 – 0.15** the closed book rises out of the dark and squares up to the reader
2. **0.15 – 0.52** the front cover swings open on the spine
3. **0.44 – 0.90** the front-matter leaves turn one after another
4. **0.78 – 1.00** the open spread tips toward the reader and settles on chapter one
5. **0.86 – 1.00** the closing line fades up beneath it

It is built from CSS 3D transforms rather than a video file, which means it is sharp at any screen
size, costs nothing to download, scrubs perfectly under the reader's own scrolling, and works on iOS
Safari — where scrubbing a real `<video>` frame by frame does not.

Two details in the code are load-bearing and easy to break:

- **The open cover stops at −179°, not −166°.** It has to end up parallel to the page plane. Any
  further from flat and its outer edge lifts in front of the pages lying on top of it.
- **Each leaf changes depth at its halfway point.** A turning leaf is edge-on at 90°, which is the
  one moment it can be moved from the right-hand stack to the top of the left-hand pile without the
  jump being visible.

On screens under 700px wide the script hides all but two leaves to keep the compositing cheap.
Under `prefers-reduced-motion` the track collapses to 120vh and all transitions are disabled.

## Replacing the cover

`assets/img/cover.svg` is a typographic cover drawn in SVG — deep slate boards, gold foil title, and
a faint bone-trabecula lattice behind the type. When the real cover art exists, drop it in as
`assets/img/cover.jpg` and update the four references to `cover.svg`.

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

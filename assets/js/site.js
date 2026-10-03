/* ==========================================================================
   The Gift — David J. Baylink
   ========================================================================== */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

  /** Normalised progress of `value` across the [from, to] window. */
  const phase = (value, from, to) => clamp01((value - from) / (to - from));

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  if (!reduceMotion) document.documentElement.classList.add("js-motion");

  /** Set once smooth scrolling has loaded; null on touch devices and under reduced motion. */
  let lenis = null;
  const holdScroll = (hold) => {
    if (lenis) hold ? lenis.stop() : lenis.start();
  };

  /* ------------------------------------------------------------- header -- */

  const header = document.querySelector(".site-header");
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.textContent = open ? "Close" : "Menu";
      document.body.style.overflow = open ? "hidden" : "";
      holdScroll(open);
    });
    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A" && nav.classList.contains("is-open")) navToggle.click();
    });
  }

  /* ---------------------------------------------------------- headlines -- */

  /* Each word gets its own masked span so headlines can rise into place
     word by word. Inline markup (em, br) inside the heading is preserved. */
  if (!reduceMotion) {
    document
      .querySelectorAll(
        ".hero__title, [data-reveal] .section-title, .section-title[data-reveal], " +
          ".page-hero__title[data-reveal], .pullquote blockquote[data-reveal]"
      )
      .forEach((heading) => {
        let i = 0;
        const walk = (node) => {
          Array.from(node.childNodes).forEach((child) => {
            if (child.nodeType === 1) return void (child.tagName !== "BR" && walk(child));
            if (child.nodeType !== 3) return;
            const frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) return void frag.appendChild(document.createTextNode(part));
              const mask = document.createElement("span");
              const word = document.createElement("span");
              mask.className = "w";
              word.textContent = part;
              word.style.setProperty("--i", i++);
              mask.appendChild(word);
              frag.appendChild(mask);
            });
            node.replaceChild(frag, child);
          });
        };
        walk(heading);
        heading.classList.add("is-split");
      });
  }

  const heroInner = document.querySelector(".hero__inner");
  if (heroInner) setTimeout(() => heroInner.classList.add("is-in"), 80);

  /* ------------------------------------------------------------ reveals -- */

  const revealables = document.querySelectorAll("[data-reveal]");
  if (revealables.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealables.forEach((el) => el.classList.add("is-in"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
      );
      revealables.forEach((el) => io.observe(el));
    }
  }

  /* ------------------------------------------------- expandable excerpt -- */

  document.querySelectorAll("[data-expand]").forEach((btn) => {
    const target = document.querySelector(btn.getAttribute("data-expand"));
    if (!target) return;
    btn.addEventListener("click", () => {
      const open = target.classList.toggle("is-open");
      btn.textContent = open ? btn.dataset.less || "Show less" : btn.dataset.more || "Keep reading";
    });
  });

  /* ============================================ scroll-driven book scene == */

  /* The book itself is drawn by book3d.js; this only drives the text around it. */
  const scene = document.querySelector(".bookscroll");
  const captions = scene ? Array.from(scene.querySelectorAll("[data-caption]")) : [];

  function drawScene(p) {
    scene.style.setProperty("--p", p.toFixed(4));
    scene.style.setProperty("--reveal", easeOut(phase(p, 0.86, 1)).toFixed(3));

    /* captions cross-fade across the scene */
    if (captions.length) {
      const idx = Math.min(captions.length - 1, Math.floor(p * captions.length * 0.999));
      captions.forEach((c, i) => {
        c.style.opacity = i === idx ? "1" : "0";
        c.style.transform = i === idx ? "none" : "translateY(0.9rem)";
      });
    }
  }

  /* ------------------------------------------------------- scroll driver -- */

  let ticking = false;
  const heroImg = document.querySelector(".hero__media img");
  const drifting = reduceMotion ? [] : Array.from(document.querySelectorAll(".framed img, .gallery img"));
  const quotes = reduceMotion ? [] : Array.from(document.querySelectorAll(".pullquote"));

  /** Where an element sits in the viewport: -1 entering at the bottom, 0 centred, 1 leaving at the top. */
  function viewOffset(rect, vh) {
    return (vh / 2 - (rect.top + rect.height / 2)) / (vh / 2 + rect.height / 2);
  }

  function frame() {
    ticking = false;
    const y = window.scrollY || window.pageYOffset;
    const vh = window.innerHeight;

    if (header) header.classList.toggle("is-stuck", y > 40);

    if (heroImg && !reduceMotion && y < vh * 1.2) {
      heroImg.style.transform = `scale(1.06) translate3d(0, ${(y * 0.14).toFixed(1)}px, 0)`;
      if (heroInner) {
        const t = clamp01(y / (vh * 0.75));
        heroInner.style.translate = `0 ${(y * -0.18).toFixed(1)}px`;
        heroInner.style.opacity = (1 - t * t).toFixed(3);
      }
    }

    /* photos drift a little against the page; the frame clips the overscan */
    drifting.forEach((img) => {
      const rect = img.parentElement.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > vh + 80) return;
      img.style.translate = `0 ${(viewOffset(rect, vh) * rect.height * 0.035).toFixed(1)}px`;
    });

    quotes.forEach((q) => {
      const rect = q.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > vh + 80) return;
      q.style.setProperty("--drift", viewOffset(rect, vh).toFixed(3));
    });

    if (scene) {
      const rect = scene.getBoundingClientRect();
      const total = scene.offsetHeight - window.innerHeight;
      const p = total > 0 ? clamp01(-rect.top / total) : 0;
      drawScene(p);
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  frame();

  window.addEventListener("scroll", onScroll, { passive: true });
  /* A page opened at an #anchor starts mid-document, so re-read after the
     browser has done its jump and after images settle the layout. */
  window.addEventListener("load", onScroll);
  window.addEventListener("hashchange", onScroll);
  window.addEventListener("resize", onScroll, { passive: true });

  /* ------------------------------------------------------ smooth scroll -- */

  /* Wheel and trackpad scrolling eases to a stop instead of stepping. Touch
     screens keep their native scrolling, which already has momentum. */
  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const script = document.createElement("script");
    script.src = "assets/vendor/lenis.min.js";
    script.onload = () => {
      if (!window.Lenis) return;
      lenis = new window.Lenis({ autoRaf: true, lerp: 0.09, wheelMultiplier: 0.95, anchors: true });
    };
    document.head.appendChild(script);
  }

  /* --------------------------------------------------- section blending -- */

  /* Where a dark section meets a light one, feather the seam: each side fades
     halfway toward the other so the colours cross over instead of cutting. */
  const parseRgb = (css) => {
    const m = css.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return a === 1 ? [r, g, b] : a === 0 ? "clear" : null;
  };
  const pageRgb = parseRgb(getComputedStyle(document.body).backgroundColor);
  const surface = (el) => {
    const rgb = parseRgb(getComputedStyle(el).backgroundColor);
    return rgb === "clear" ? pageRgb : rgb;
  };
  const luma = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const smooth = (t) => t * t * (3 - 2 * t);

  function blendLayer(rgb, from, to, edge) {
    const stops = [];
    for (let k = 0; k <= 8; k++) {
      const t = from + ((to - from) * k) / 8;
      const alpha = edge === "bottom" ? smooth(t) : 1 - smooth(t);
      stops.push(`rgba(${rgb.join(",")},${alpha.toFixed(3)}) ${((k / 8) * 100).toFixed(1)}%`);
    }
    const layer = document.createElement("div");
    layer.className = `blend blend--${edge}`;
    layer.setAttribute("aria-hidden", "true");
    layer.style.background = `linear-gradient(to bottom, ${stops.join(", ")})`;
    return layer;
  }

  const blocks = Array.from(document.querySelectorAll("main > section, body > .site-footer"));
  blocks.forEach((block, n) => {
    const prev = blocks[n - 1];
    if (!prev || prev.classList.contains("hero")) return;
    const a = surface(prev);
    const b = surface(block);
    if (!Array.isArray(a) || !Array.isArray(b) || Math.abs(luma(a) - luma(b)) < 0.3) return;

    for (const el of [prev, block]) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
    }
    block.prepend(blendLayer(a, 0.5, 1, "top"));
    if (!prev.classList.contains("bookscroll")) prev.append(blendLayer(b, 0, 0.5, "bottom"));
  });

  /* ------------------------------------------------------ newsletter UX -- */

  /* The form posts to Buttondown in a named popup so the page never navigates
     away; we only swap the field row for an acknowledgement. */
  document.querySelectorAll("[data-signup]").forEach((form) => {
    form.addEventListener("submit", () => {
      const input = form.querySelector("input[type=email]");
      if (!input || !input.checkValidity()) return;

      window.open(
        "https://buttondown.com/davidbaylink",
        "buttondown",
        "width=560,height=640,scrollbars=yes"
      );

      window.setTimeout(() => {
        const row = form.querySelector(".field-row");
        const note = form.querySelector(".form-note");
        if (row) {
          row.innerHTML =
            '<p class="lede" style="margin:0">Thank you \u2014 you\u2019re on the list. ' +
            "Word of the book will find you first.</p>";
        }
        if (note) note.remove();
      }, 400);
    });
  });

  /* ------------------------------------------------------- contact form -- */

  /* No backend to post to, so compose the message in the reader's own mail
     client. Nothing is lost if they close the tab mid-way. */
  document.querySelectorAll("[data-mailto]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) return form.reportValidity();

      const value = (name) => (form.querySelector(`[name=${name}]`) || {}).value || "";
      const body = `${value("message")}\n\n—\n${value("name")}\n${value("email")}`;

      window.location.href =
        "mailto:info@davidbaylink.com" +
        "?subject=" + encodeURIComponent(value("subject")) +
        "&body=" + encodeURIComponent(body);

      const note = form.querySelector(".form-note");
      if (note) {
        note.textContent =
          "Your email program should be opening. If nothing happens, write to info@davidbaylink.com.";
      }
    });
  });

  /* ----------------------------------------------------------- lightbox -- */

  const lightbox = document.querySelector(".lightbox");
  if (lightbox && typeof lightbox.showModal === "function") {
    const lightboxImg = lightbox.querySelector("img");
    document.querySelectorAll("[data-lightbox]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const thumb = link.querySelector("img");
        lightboxImg.src = link.href;
        lightboxImg.alt = thumb ? thumb.alt : "";
        lightbox.showModal();
        holdScroll(true);
      });
    });
    lightbox.addEventListener("close", () => holdScroll(false));
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) lightbox.close();
    });
  }

  /* --------------------------------------------------------- active nav -- */

  const sections = Array.from(document.querySelectorAll("main section[id]"));
  const navLinks = new Map();
  document.querySelectorAll('.nav a[href^="#"]').forEach((a) => {
    navLinks.set(a.getAttribute("href").slice(1), a);
  });

  if (sections.length && navLinks.size && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const link = navLinks.get(entry.target.id);
          if (link && entry.isIntersecting) {
            navLinks.forEach((l) => l.removeAttribute("aria-current"));
            link.setAttribute("aria-current", "page");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }
})();

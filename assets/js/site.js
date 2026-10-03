/* ==========================================================================
   The Gift — David J. Baylink
   ========================================================================== */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

  /** Normalised progress of `value` across the [from, to] window. */
  const phase = (value, from, to) => clamp01((value - from) / (to - from));

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;

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
    });
    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A" && nav.classList.contains("is-open")) navToggle.click();
    });
  }

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

  const scene = document.querySelector(".bookscroll");
  const book = scene && scene.querySelector(".book");
  const leaves = book ? Array.from(book.querySelectorAll(".leaf")) : [];
  const captions = scene ? Array.from(scene.querySelectorAll("[data-caption]")) : [];

  const probe = book && book.querySelector(".book__probe");

  let bookWidth = 0;
  let spine = 0; /* half the block thickness, in px — where the covers sit */

  const measure = () => {
    if (!book) return;
    bookWidth = book.offsetWidth;
    spine = probe ? probe.offsetWidth / 2 : 16;
  };

  function drawBook(p) {
    if (!book) return;

    scene.style.setProperty("--p", p.toFixed(4));

    /* 1. approach — the book swings up out of the dark and squares itself */
    const approach = easeOut(phase(p, 0, 0.15));

    /* 2. the cover swings open on the spine */
    const opening = easeInOut(phase(p, 0.15, 0.52));

    /* 3. settle — the open spread tips toward the reader */
    const settle = easeInOut(phase(p, 0.78, 1));

    /* Stop a whisker short of 180deg: the open board has to end up parallel to
       the page plane, or its outer edge lifts in front of the pages lying on it. */
    const cover = lerp(0, -179, opening);
    const tiltx = lerp(lerp(42, 14, approach), 6, settle);
    const tiltz = lerp(-12, 0, approach);
    const tilty = lerp(lerp(-32, -4, approach), 0, settle);
    const zoom = lerp(lerp(0.68, 1, approach), 1.08, settle);
    const lift = lerp(60, 0, approach);
    /* The spine sits on the book's left edge, so the spread grows leftward;
       nudge right by half a page to keep the open book centred. */
    const shift = (bookWidth / 2) * opening;

    book.style.setProperty("--cover", cover.toFixed(2) + "deg");
    book.style.setProperty("--tiltx", tiltx.toFixed(2) + "deg");
    book.style.setProperty("--tiltz", tiltz.toFixed(2) + "deg");
    book.style.setProperty("--tilty", tilty.toFixed(2) + "deg");
    book.style.setProperty("--zoom", zoom.toFixed(3));
    book.style.setProperty("--lift", lift.toFixed(1) + "px");
    book.style.setProperty("--shift", shift.toFixed(1) + "px");
    book.style.setProperty("--gutter-o", opening.toFixed(3));

    /* The left-hand page has nothing to sit on until the cover clears vertical,
       so it surfaces out from under the cover rather than being there all along. */
    book.style.setProperty("--leftpage", phase(opening, 0.5, 0.66).toFixed(3));

    /* 4. pages turn, one after another, as the reader keeps scrolling.
       A leaf is edge-on at the halfway point, which is where it can be moved
       from the right-hand stack to the top of the left-hand pile unseen. */
    const first = 0.44;
    const last = 0.9;
    const span = last - first;
    const visible = leaves.filter((l) => l.style.display !== "none");
    const stagger = visible.length > 1 ? span / (visible.length + 1.6) : span;

    visible.forEach((leaf, i) => {
      const start = first + stagger * i;
      const t = easeInOut(phase(p, start, start + stagger * 1.9));
      const depth = t < 0.5 ? -(i * 0.9) - 1 : spine + 12 + i * 1.2;
      leaf.style.transform = `translateZ(${depth.toFixed(1)}px) rotateY(${(-172 * t).toFixed(2)}deg)`;
    });

    /* 5. the line that closes the scene */
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

  function frame() {
    ticking = false;
    const y = window.scrollY || window.pageYOffset;

    if (header) header.classList.toggle("is-stuck", y > 40);

    if (heroImg && !reduceMotion && y < window.innerHeight * 1.2) {
      heroImg.style.transform = `scale(1.06) translate3d(0, ${(y * 0.14).toFixed(1)}px, 0)`;
    }

    if (scene) {
      const rect = scene.getBoundingClientRect();
      const total = scene.offsetHeight - window.innerHeight;
      const p = total > 0 ? clamp01(-rect.top / total) : 0;
      drawBook(p);
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  /* Trim the choreography on small screens: fewer leaves, less GPU work. */
  function prune() {
    if (!book) return;
    const small = window.innerWidth < 700;
    leaves.forEach((leaf, i) => {
      leaf.style.display = small && i > 1 ? "none" : "";
    });
  }

  measure();
  prune();
  frame();

  window.addEventListener("scroll", onScroll, { passive: true });
  /* A page opened at an #anchor starts mid-document, so re-read after the
     browser has done its jump and after images settle the layout. */
  window.addEventListener("load", onScroll);
  window.addEventListener("hashchange", onScroll);
  window.addEventListener(
    "resize",
    () => {
      measure();
      prune();
      onScroll();
    },
    { passive: true }
  );

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
      });
    });
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

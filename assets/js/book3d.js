/* ==========================================================================
   The Gift — the book that opens as you scroll, in WebGL.

   World units: the page is 1 wide. The book lies on the table (y = 0) with
   its spine on the z axis, the head of the book toward -z and the reader at +z.
   ========================================================================== */

import * as THREE from "../vendor/three.module.min.js";

const scene = document.querySelector(".bookscroll");
const host = scene && scene.querySelector(".book3d");

function fail(err) {
  console.warn("3D book unavailable:", err);
  scene.classList.add("is-fallback");
}

/* ------------------------------------------------------------- helpers -- */

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
const phase = (v, a, b) => clamp01((v - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t) => t * t * (3 - 2 * t);

/* ---------------------------------------------------------- dimensions -- */

const W = 1;                     // page width
const H = W * (1585 / 992);      // page height, from the cover art
const T = 0.2;                   // thickness of the page block
const CT = 0.022;                // board thickness
const OV = 0.03;                 // board overhang beyond the pages
const BY = CT;                   // pages rest on the boards
const GUTTER = 0.86;             // how far the pages dip into the binding when open
const LEFT_SHARE = 0.42;         // share of the block that ends up on the left
const EPS = 0.0016;              // separation between stacked sheets
const SEG = 48;

/* Height of the page block's top surface at distance u (0 spine … 1 fore-edge). */
function topY(u, t, g) {
  const rise = Math.sin(Math.min(u / 0.24, 1) * Math.PI * 0.5);
  const dome = g * 0.05 * Math.sin(Math.min(u / 0.9, 1) * Math.PI);
  const fall = 1 - g * 0.05 * u;
  return BY + t * ((1 - g + g * rise) * fall + dome);
}

/* ------------------------------------------------------ paper textures -- */

const PX = 1024;
const PY = Math.round(PX * (H / W));
const PAPER = "#f3eee3";
const INK = "#2a2620";
const RED = "#b8312f";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/* Cream page with a soft gutter shadow on the binding side. */
function paper(ctx, gutterLeft) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PX, PY);
  const g = ctx.createLinearGradient(gutterLeft ? 0 : PX, 0, gutterLeft ? PX * 0.22 : PX * 0.78, 0);
  g.addColorStop(0, "rgba(70, 58, 40, 0.30)");
  g.addColorStop(1, "rgba(70, 58, 40, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PX, PY);
  const e = ctx.createLinearGradient(gutterLeft ? PX : 0, 0, gutterLeft ? PX * 0.9 : PX * 0.1, 0);
  e.addColorStop(0, "rgba(150, 128, 90, 0.16)");
  e.addColorStop(1, "rgba(150, 128, 90, 0)");
  ctx.fillStyle = e;
  ctx.fillRect(0, 0, PX, PY);
}

function centered(ctx, text, y, font, color, spacing = 0) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.letterSpacing = spacing + "px";
  ctx.fillText(text, PX / 2, y);
  ctx.letterSpacing = "0px";
}

/* Justified paragraph; returns the y after the last line. */
function paragraph(ctx, text, x, y, width, size, lead, { indent = 0, dropCap = false } = {}) {
  ctx.font = `${size}px "EB Garamond", Georgia, serif`;
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  let words = text.split(/\s+/);
  let capLines = 0;
  let capWidth = 0;

  if (dropCap) {
    const cap = words[0][0];
    words[0] = words[0].slice(1);
    ctx.font = `${size * 3.3}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillStyle = RED;
    ctx.fillText(cap, x, y + size * 2.15);
    capWidth = ctx.measureText(cap).width + size * 0.35;
    capLines = 3;
    ctx.font = `${size}px "EB Garamond", Georgia, serif`;
    ctx.fillStyle = INK;
  }

  const space = ctx.measureText(" ").width;
  let line = [];
  let lineNo = 0;
  const avail = () => width - (lineNo < capLines ? capWidth : 0) - (lineNo === 0 && !dropCap ? indent : 0);
  const flush = (last) => {
    const offset = (lineNo < capLines ? capWidth : 0) + (lineNo === 0 && !dropCap ? indent : 0);
    const widths = line.map((w) => ctx.measureText(w).width);
    const used = widths.reduce((a, b) => a + b, 0);
    const gap = !last && line.length > 1 ? (avail() - used) / (line.length - 1) : space;
    let cx = x + offset;
    line.forEach((w, i) => {
      ctx.fillText(w, cx, y + size);
      cx += widths[i] + gap;
    });
    y += lead;
    lineNo++;
    line = [];
  };
  for (const w of words) {
    const test = [...line, w].join(" ");
    if (line.length && ctx.measureText(test).width > avail()) flush(false);
    line.push(w);
  }
  if (line.length) flush(true);
  return y;
}

function folio(ctx, text) {
  centered(ctx, text, PY - 70, `26px "EB Garamond", Georgia, serif`, "rgba(42, 38, 32, 0.5)");
}

const pages = {
  chapter(ctx) {
    paper(ctx, true);
    centered(ctx, "CHAPTER ONE", 210, `500 24px Jost, sans-serif`, RED, 9);
    centered(ctx, "The Needle\u2019s Eye", 300, `500 70px "Cormorant Garamond", Georgia, serif`, INK);
    let y = paragraph(ctx,
      "There is a kind of cold the valley keeps for the tail of winter, a thin and borrowed cold that knows its days are numbered, and it lay over San Timoteo that morning late in March like a hand laid lightly on the land before the long heat of the year came up to take it away. It was six o\u2019clock. The sky held no sun yet and no color either, only a pale and even light, and against that paleness the mountains stood up in the north still wearing the dark.",
      120, 400, PX - 240, 33, 52, { dropCap: true });
    paragraph(ctx,
      "A man\u2019s life, if he is honest about it, is mostly the mornings he does not remember. This was not going to be one of those. I did not know that yet. We never do. The day comes up the same gray color as all the others, and gives no sign of what it is carrying, and a man locks his door and goes out to meet it as though it owed him nothing.",
      120, y + 10, PX - 240, 33, 52, { indent: 50 });
    folio(ctx, "1");
  },
  halfTitle(ctx) {
    paper(ctx, true);
    centered(ctx, "THE GIFT", PY * 0.36, `500 64px "Cormorant Garamond", Georgia, serif`, INK, 14);
  },
  copyright(ctx) {
    paper(ctx, false);
    ctx.textAlign = "left";
    const lines = [
      "Copyright \u00a9 2026 David J. Baylink",
      "All rights reserved.",
      "",
      "This is a work of fiction. The research it",
      "describes is real; the people around it are",
      "reshaped, combined, or imagined.",
      "",
      "ISBN 979-8-1702-9449-8",
      "First edition",
    ];
    ctx.font = `25px "EB Garamond", Georgia, serif`;
    ctx.fillStyle = "rgba(42, 38, 32, 0.72)";
    lines.forEach((l, i) => ctx.fillText(l, 120, PY * 0.66 + i * 40));
  },
  title(ctx) {
    paper(ctx, true);
    centered(ctx, "THE GIFT", PY * 0.3, `600 104px "Cormorant Garamond", Georgia, serif`, INK, 18);
    ctx.fillStyle = RED;
    ctx.fillRect(PX / 2 - 40, PY * 0.3 + 50, 80, 3);
    centered(ctx, "A NOVEL", PY * 0.3 + 130, `400 26px Jost, sans-serif`, "rgba(42, 38, 32, 0.75)", 12);
    centered(ctx, "DAVID J. BAYLINK", PY * 0.78, `500 32px Jost, sans-serif`, INK, 10);
  },
  blank(ctx) {
    paper(ctx, false);
  },
  dedication(ctx) {
    paper(ctx, true);
    centered(ctx, "For Reinhold and Marie,", PY * 0.34, `italic 400 46px "EB Garamond", Georgia, serif`, INK);
    centered(ctx, "and for Jo and Carroll", PY * 0.34 + 66, `italic 400 46px "EB Garamond", Georgia, serif`, INK);
  },
  authorsNote(ctx) {
    paper(ctx, false);
    centered(ctx, "AUTHOR\u2019S NOTE", 210, `500 24px Jost, sans-serif`, RED, 9);
    let y = paragraph(ctx,
      "I have spent most of my life at the bench and the bedside, chasing questions that science asks but rarely answers cleanly. This book grew out of that life \u2014 the research on sepsis and calcium endocrine investigations described here is real, drawn from work I have pursued for decades, much of it still ongoing.",
      120, 300, PX - 240, 33, 52, { indent: 0 });
    paragraph(ctx,
      "What is invented is everything around it. The people, the relationships, and the events surrounding the science have been reshaped, combined, or imagined outright. Some of what happens to the character carrying my name did not happen to me.",
      120, y + 10, PX - 240, 33, 52, { indent: 50 });
    folio(ctx, "ix");
  },
  flyleaf(ctx) {
    paper(ctx, true);
  },
};

function endpaper(ctx) {
  const g = ctx.createLinearGradient(0, 0, PX, PY);
  g.addColorStop(0, "#14222e");
  g.addColorStop(1, "#0b141c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PX, PY);
  ctx.strokeStyle = "rgba(160, 190, 215, 0.06)";
  ctx.lineWidth = 2;
  for (let i = -PY; i < PX; i += 34) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + PY, PY);
    ctx.stroke();
  }
  centered(ctx, "ALSO BY THIS AUTHOR", PY * 0.44, `500 22px Jost, sans-serif`, "rgba(232, 87, 75, 0.75)", 10);
  centered(ctx, "Six hundred papers", PY * 0.44 + 70, `italic 400 40px "EB Garamond", Georgia, serif`, "rgba(225, 233, 240, 0.7)");
  centered(ctx, "and counting", PY * 0.44 + 122, `italic 400 40px "EB Garamond", Georgia, serif`, "rgba(225, 233, 240, 0.7)");
}

function spineArt(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0d1821");
  g.addColorStop(0.5, "#1f3344");
  g.addColorStop(1, "#0d1821");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#eef2f5";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `600 ${h * 0.42}px Jost, sans-serif`;
  ctx.letterSpacing = h * 0.08 + "px";
  ctx.fillText("THE GIFT", w * 0.08, h * 0.54);
  ctx.textAlign = "right";
  ctx.font = `500 ${h * 0.2}px Jost, sans-serif`;
  ctx.letterSpacing = h * 0.05 + "px";
  ctx.fillText("DAVID J BAYLINK", w * 0.93, h * 0.54);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#c8322f";
  ctx.fillRect(w * 0.55, h * 0.47, w * 0.06, h * 0.06);
}

function edgeArt(ctx, w, h) {
  for (let y = 0; y < h; y++) {
    const k = 222 + Math.round(Math.random() * 22);
    ctx.fillStyle = `rgb(${k}, ${k - 6}, ${k - 20})`;
    ctx.fillRect(0, y, w, 1);
  }
}

/* -------------------------------------------------------------- init -- */

async function init() {
  const probe = document.createElement("canvas");
  if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) throw new Error("no WebGL");

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);

  /* --- light: cool lab light from above, red glow from the doorway behind --- */
  world.add(new THREE.HemisphereLight(0xdfe7ee, 0x0a0f14, 0.85));

  const key = new THREE.DirectionalLight(0xfff3e6, 2.4);
  key.position.set(-1.6, 3.4, 1.9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -2;
  key.shadow.camera.right = 2;
  key.shadow.camera.top = 2;
  key.shadow.camera.bottom = -2;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 8;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.015;
  key.shadow.radius = 6;
  world.add(key);

  const fill = new THREE.DirectionalLight(0x7f9fc0, 0.7);
  fill.position.set(2.5, 1.4, 1.2);
  world.add(fill);

  const rim = new THREE.DirectionalLight(0xff3a2e, 1.1);
  rim.position.set(0.3, 0.35, -3);
  world.add(rim);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.5 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  /* --- textures --- */
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const canvasTexture = (draw, w = PX, h = PY) => {
    const c = canvas(w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    tex.redraw = () => {
      const ctx = c.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h);
      tex.needsUpdate = true;
    };
    tex.redraw();
    return tex;
  };

  const tex = {};
  for (const name of Object.keys(pages)) tex[name] = canvasTexture(pages[name]);
  tex.endpaper = canvasTexture(endpaper);
  tex.endpaper.center.set(0.5, 0.5);
  tex.endpaper.rotation = Math.PI;
  tex.spine = canvasTexture(spineArt, 1024, 128);
  tex.edge = canvasTexture(edgeArt, 16, 512);

  const coverTex = await new THREE.TextureLoader().loadAsync(host.dataset.cover);
  coverTex.colorSpace = THREE.SRGBColorSpace;
  coverTex.anisotropy = maxAniso;

  const paperMat = (map, side = THREE.DoubleSide) =>
    new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0, side });
  const boardEdge = new THREE.MeshStandardMaterial({ color: 0x0e1922, roughness: 0.6 });
  const coverMat = new THREE.MeshPhysicalMaterial({
    map: coverTex, roughness: 0.55, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.6,
  });
  const endMat = new THREE.MeshStandardMaterial({ map: tex.endpaper, roughness: 0.8 });
  const backOuter = new THREE.MeshPhysicalMaterial({ color: 0x0f1c27, roughness: 0.5, clearcoat: 0.5 });
  const edgeMat = paperMat(tex.edge);

  const book = new THREE.Group();
  world.add(book);

  const shadowy = (m) => { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; return m; };

  /* --- back board, fixed under the right-hand pages --- */
  const boardGeo = new THREE.BoxGeometry(W + OV, CT, H + OV * 2);
  const backBoard = shadowy(new THREE.Mesh(boardGeo, [boardEdge, boardEdge, endMat, backOuter, boardEdge, boardEdge]));
  backBoard.position.set((W + OV) / 2, CT / 2, 0);
  book.add(backBoard);

  /* --- front board, hinged on the spine --- */
  const hinge = new THREE.Group();
  const frontBoard = shadowy(new THREE.Mesh(boardGeo, [boardEdge, boardEdge, coverMat, endMat, boardEdge, boardEdge]));
  frontBoard.position.set((W + OV) / 2, CT / 2, 0);
  hinge.add(frontBoard);
  book.add(hinge);

  /* --- page blocks: a curved top surface plus three page-edge walls --- */
  function makeBlock(side, topMap) {
    const n = SEG + 1;
    const count = n * 2 + n * 2 * 2 + 4;
    const pos = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    const idxTop = [];
    const idxEdge = [];
    const tops = 0;
    const head = n * 2;
    const tail = n * 4;
    const fore = n * 6;

    for (let i = 0; i < SEG; i++) {
      const a = tops + i * 2, b = a + 1, c = a + 2, d = a + 3;
      idxTop.push(a, b, c, c, b, d);
      for (const base of [head, tail]) {
        const e = base + i * 2, f = e + 1, g = e + 2, h = e + 3;
        idxEdge.push(e, g, f, f, g, h);
      }
    }
    idxEdge.push(fore, fore + 1, fore + 2, fore + 2, fore + 1, fore + 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setIndex([...idxTop, ...idxEdge]);
    geo.addGroup(0, idxTop.length, 0);
    geo.addGroup(idxTop.length, idxEdge.length, 1);

    const mesh = shadowy(new THREE.Mesh(geo, [paperMat(topMap), edgeMat]));
    book.add(mesh);

    const set = (k, x, y, z, u, v) => {
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      uv[k * 2] = u; uv[k * 2 + 1] = v;
    };

    function update(t, g) {
      mesh.visible = t > 0.002;
      if (!mesh.visible) return;
      for (let i = 0; i <= SEG; i++) {
        const u = i / SEG;
        const x = side * u * W;
        const y = topY(u, t, g);
        const tu = side > 0 ? u : 1 - u;
        set(tops + i * 2, x, y, -H / 2, tu, 1);
        set(tops + i * 2 + 1, x, y, H / 2, tu, 0);
        const ev = (y - BY) / T;
        set(head + i * 2, x, BY, -H / 2, u, 0);
        set(head + i * 2 + 1, x, y, -H / 2, u, ev);
        set(tail + i * 2, x, BY, H / 2, u, 0);
        set(tail + i * 2 + 1, x, y, H / 2, u, ev);
      }
      const yf = topY(1, t, g);
      const ef = (yf - BY) / T;
      set(fore, side * W, BY, -H / 2, 0, 0);
      set(fore + 1, side * W, yf, -H / 2, 0, ef);
      set(fore + 2, side * W, BY, H / 2, 1, 0);
      set(fore + 3, side * W, yf, H / 2, 1, ef);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.uv.needsUpdate = true;
      geo.computeVertexNormals();
    }
    return { update };
  }

  const rightBlock = makeBlock(1, tex.chapter);
  const leftBlock = makeBlock(-1, tex.flyleaf);

  /* --- turning leaves: one sheet, printed both sides --- */
  function makeLeaf(front, back) {
    const n = SEG + 1;
    const pos = new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3);
    const uvF = new Float32Array(n * 2 * 2);
    const uvB = new Float32Array(n * 2 * 2);
    const idx = [];
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      uvF.set([u, 1, u, 0], i * 4);
      uvB.set([1 - u, 1, 1 - u, 0], i * 4);
      if (i < SEG) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.push(a, b, c, c, b, d);
      }
    }
    const geoF = new THREE.BufferGeometry();
    geoF.setAttribute("position", pos);
    geoF.setAttribute("uv", new THREE.BufferAttribute(uvF, 2));
    geoF.setIndex(idx);
    const geoB = new THREE.BufferGeometry();
    geoB.setAttribute("position", pos);
    geoB.setAttribute("uv", new THREE.BufferAttribute(uvB, 2));
    geoB.setIndex(idx);

    const meshF = shadowy(new THREE.Mesh(geoF, paperMat(front, THREE.FrontSide)));
    const meshB = shadowy(new THREE.Mesh(geoB, paperMat(back, THREE.BackSide)));
    book.add(meshF, meshB);

    /* theta: 0 lying on the right, PI lying on the left. The free edge lags
       behind the spine edge, so the sheet bows as it turns. */
    function update(theta, yRight, yLeft) {
      const lag = Math.sin(theta) * 0.55;
      const k = theta / Math.PI;
      const arr = pos.array;
      for (let i = 0; i <= SEG; i++) {
        const u = i / SEG;
        const r = u * W;
        const phi = theta - lag * u;
        const base = lerp(yRight(u), yLeft(u), smooth(k));
        const x = r * Math.cos(phi);
        const y = base + r * Math.sin(phi);
        arr.set([x, y, -H / 2, x, y, H / 2], i * 6);
      }
      pos.needsUpdate = true;
      geoF.computeVertexNormals();
      geoB.attributes.normal = geoF.attributes.normal;
    }
    return { update };
  }

  const leaves = [
    makeLeaf(tex.halfTitle, tex.copyright),
    makeLeaf(tex.title, tex.blank),
    makeLeaf(tex.dedication, tex.authorsNote),
  ];

  /* --- the spine: a rounded strip from the back board's hinge to the front board's --- */
  const spineSeg = 16;
  const spinePos = new THREE.BufferAttribute(new Float32Array((spineSeg + 1) * 2 * 3), 3);
  const spineUv = new Float32Array((spineSeg + 1) * 2 * 2);
  const spineIdx = [];
  for (let i = 0; i <= spineSeg; i++) {
    const t = i / spineSeg;
    spineUv.set([0, t, 1, t], i * 4);
    if (i < spineSeg) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      spineIdx.push(a, c, b, b, c, d);
    }
  }
  const spineGeo = new THREE.BufferGeometry();
  spineGeo.setAttribute("position", spinePos);
  spineGeo.setAttribute("uv", new THREE.BufferAttribute(spineUv, 2));
  spineGeo.setIndex(spineIdx);
  const spine = shadowy(new THREE.Mesh(spineGeo,
    new THREE.MeshPhysicalMaterial({ map: tex.spine, roughness: 0.45, clearcoat: 0.5, side: THREE.DoubleSide })));
  book.add(spine);

  function updateSpine(hx, hy) {
    const ax = 0, ay = 0;
    const bx = hx, by = hy + CT;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const bulge = 0.03 * Math.min(1, len / (T + CT * 2));
    const arr = spinePos.array;
    for (let i = 0; i <= spineSeg; i++) {
      const t = i / spineSeg;
      const s = Math.sin(Math.PI * t) * bulge;
      const x = lerp(ax, bx, t) + nx * s;
      const y = lerp(ay, by, t) + ny * s;
      arr.set([x, y, -H / 2 - OV, x, y, H / 2 + OV], i * 6);
    }
    spinePos.needsUpdate = true;
    spineGeo.computeVertexNormals();
    spine.visible = len > CT * 1.5;
  }

  /* ----------------------------------------------------------- pose -- */

  let progress = -1;
  let fit = 1;

  function pose(p) {
    const approach = easeOut(phase(p, 0, 0.15));
    const opening = easeInOut(phase(p, 0.15, 0.5));
    const settle = easeInOut(phase(p, 0.78, 1));

    const first = 0.44, last = 0.88;
    const stagger = (last - first) / (leaves.length + 1.4);
    const turns = leaves.map((_, i) => {
      const start = first + stagger * i;
      return easeInOut(phase(p, start, start + stagger * 2.2));
    });
    const turned = turns.reduce((a, b) => a + b, 0) / leaves.length;

    const g = GUTTER * smooth(phase(opening, 0.15, 0.9));
    const tl = T * LEFT_SHARE * turned;
    const tr = T - tl;

    rightBlock.update(tr, g);
    leftBlock.update(tl, g);

    const rightTop = (u) => topY(u, tr, g);
    const leftTop = (u) => (tl > 0.002 ? topY(u, tl, g) : BY);
    leaves.forEach((leaf, i) => {
      const above = leaves.length - i;
      const below = i + 1;
      leaf.update(
        turns[i] * Math.PI,
        (u) => rightTop(u) + EPS * above,
        (u) => leftTop(u) + EPS * below
      );
    });

    const theta = opening * Math.PI;
    const closedY = BY + T + EPS * (leaves.length + 1);
    const hy = lerp(closedY, 0, smooth(phase(opening, 0.35, 1)));
    hinge.position.set(0, hy, 0);
    hinge.rotation.z = theta;
    updateSpine(0, hy);

    book.position.x = lerp(-W / 2, 0, opening);
    book.position.y = lerp(-0.35, 0, approach);
    book.rotation.y = lerp(lerp(-0.7, -0.18, approach), 0, opening);

    const from = new THREE.Vector3(-1.3, 1.5, 6.2);
    const closed = new THREE.Vector3(-1.0, 3.75, 3.1);
    const open = new THREE.Vector3(0, 4.45, 3.1);
    const near = new THREE.Vector3(0, 4.95, 2.1);
    const cam = from.clone().lerp(closed, approach).lerp(open, opening).lerp(near, settle);
    const target = new THREE.Vector3(0, 0.05, lerp(-0.4, 0.04, opening));
    camera.position.copy(target).add(cam.sub(target).multiplyScalar(fit));
    camera.lookAt(target);
  }

  /* ---------------------------------------------------------- frame -- */

  let dirty = true;

  function readProgress() {
    const rect = scene.getBoundingClientRect();
    const total = scene.offsetHeight - window.innerHeight;
    return total > 0 ? clamp01(-rect.top / total) : 0;
  }

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    fit = Math.max(1, 0.78 / camera.aspect);
    camera.updateProjectionMatrix();
    dirty = true;
  }

  function frame() {
    const p = readProgress();
    if (p !== progress) {
      progress = p;
      dirty = true;
    }
    if (dirty) {
      pose(progress);
      renderer.render(world, camera);
      dirty = false;
    }
    requestAnimationFrame(frame);
  }

  new ResizeObserver(resize).observe(host);
  resize();

  /* Page type is drawn on canvases; redraw once the web fonts arrive. */
  const faces = [
    '500 70px "Cormorant Garamond"', '600 104px "Cormorant Garamond"',
    '33px "EB Garamond"', 'italic 46px "EB Garamond"', "500 24px Jost", "600 40px Jost",
  ];
  Promise.all(faces.map((f) => document.fonts.load(f))).then(() => {
    Object.values(tex).forEach((t) => t.redraw && t.redraw());
    dirty = true;
  });

  scene.classList.add("is-3d");
  requestAnimationFrame(frame);
}

if (scene && host) init().catch(fail);

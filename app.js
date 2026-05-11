/* ─────────────────────────────────────────────────────────────
   AUGURIA · app.js
   Daily, seed-stable lottery cifras + numerología (spanish)
   ───────────────────────────────────────────────────────────── */

// ── SEEDED PRNG ──────────────────────────────────────────────
// cyrb128 string hash → mulberry32 PRNG. Same date+game ⇒ same numbers.
function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return (h1 ^ h2 ^ h3 ^ h4) >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Civil date in Valencia (Europe/Madrid) — handles CET/CEST automatically.
const TZ = "Europe/Madrid";
function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${m.year}-${m.month}-${m.day}`;
}
const rngFor = (date, game) => mulberry32(cyrb128(`${date}::${game}`));

// pick `count` unique integers in [1..max] using `rng`
function pickUnique(rng, count, max) {
  const pool = Array.from({ length: max }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}
function pickOne(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// ── DOM helpers (safer than innerHTML) ───────────────────────
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("data-")) node.setAttribute(k, v);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}
// parse a trusted static SVG string into a real <svg> node
const svgParser = new DOMParser();
function svgNode(markup) {
  const doc = svgParser.parseFromString(markup, "image/svg+xml");
  return doc.documentElement;
}

// ── GAME DEFINITIONS ─────────────────────────────────────────
const GAMES = [
  {
    id: "primitiva",
    name: "La Primitiva",
    eyebrow: "El sorteo primordial",
    tag: "Seis estrellas guían tu camino.",
    sigil: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 2 L17.5 14 L29 16 L17.5 18 L16 30 L14.5 18 L3 16 L14.5 14 Z"/><path d="M16 6 L17 15 L26 16 L17 17 L16 26 L15 17 L6 16 L15 15 Z" opacity="0.6"/><circle cx="16" cy="16" r="1.2" fill="currentColor"/></g></svg>`,
    generate(rng) {
      const main = pickUnique(rng, 6, 49);
      const remaining = [];
      for (let i = 1; i <= 49; i++) if (!main.includes(i)) remaining.push(i);
      const complementario = remaining[Math.floor(rng() * remaining.length)];
      const reintegro = pickOne(rng, 0, 9);
      return [
        { label: "Combinación", numbers: main },
        { label: "Complementario · Reintegro", numbers: [complementario, reintegro], variants: ["special","special"] },
      ];
    },
  },
  {
    id: "gordo",
    name: "El Gordo de la Primitiva",
    eyebrow: "La estrella mayor",
    tag: "Cinco soles y una llave.",
    sigil: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><circle cx="16" cy="16" r="5"/><circle cx="16" cy="16" r="2.4" fill="currentColor"/><g><line x1="16" y1="2" x2="16" y2="6"/><line x1="16" y1="26" x2="16" y2="30"/><line x1="2" y1="16" x2="6" y2="16"/><line x1="26" y1="16" x2="30" y2="16"/><line x1="6" y1="6" x2="9" y2="9"/><line x1="23" y1="23" x2="26" y2="26"/><line x1="26" y1="6" x2="23" y2="9"/><line x1="9" y1="23" x2="6" y2="26"/></g></g></svg>`,
    generate(rng) {
      const main = pickUnique(rng, 5, 54);
      const clave = pickOne(rng, 0, 9);
      return [
        { label: "Combinación", numbers: main },
        { label: "Número clave", numbers: [clave], variants: ["special"] },
      ];
    },
  },
  {
    id: "bonoloto",
    name: "Bonoloto",
    eyebrow: "Murmullo cotidiano",
    tag: "La fortuna habla cada día.",
    sigil: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M22 6 A12 12 0 1 0 22 26 A10 10 0 1 1 22 6 Z"/><circle cx="11" cy="13" r="0.9" fill="currentColor"/><circle cx="9" cy="19" r="0.6" fill="currentColor"/><circle cx="14" cy="22" r="0.5" fill="currentColor"/></g></svg>`,
    generate(rng) {
      const main = pickUnique(rng, 6, 49);
      const reintegro = pickOne(rng, 0, 9);
      return [
        { label: "Combinación", numbers: main },
        { label: "Reintegro", numbers: [reintegro], variants: ["special"] },
      ];
    },
  },
  {
    id: "euromillones",
    name: "Euromillones",
    eyebrow: "Cometa de los siete reinos",
    tag: "Cinco cifras y dos estrellas.",
    sigil: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 L25 7 M24 13 L28 11 M23 16 L27 16"/><path d="M22 10 L18 16 L12 20 L6 26"/><path d="M22 10 L20 14 L18 16 L16 18 L12 20 L9 23 L6 26 L8 24 L10 21 L14 18 L18 14 Z" fill="currentColor" fill-opacity="0.15"/><circle cx="22" cy="10" r="3"/><circle cx="22" cy="10" r="1" fill="currentColor"/></g></svg>`,
    generate(rng) {
      const main = pickUnique(rng, 5, 50);
      const stars = pickUnique(rng, 2, 12);
      return [
        { label: "Combinación", numbers: main },
        { label: "Estrellas", numbers: stars, variants: ["star","star"] },
      ];
    },
  },
  {
    id: "eurodreams",
    name: "EuroDreams",
    eyebrow: "El sueño de las seis lunas",
    tag: "Seis lunas y un sueño.",
    sigil: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M6 16 Q16 4 26 16 Q16 28 6 16 Z"/><circle cx="16" cy="16" r="3.5"/><circle cx="16" cy="16" r="1.4" fill="currentColor"/><path d="M16 12.5 L16 19.5 M12.5 16 L19.5 16" opacity="0.5"/></g></svg>`,
    generate(rng) {
      const main = pickUnique(rng, 6, 40);
      const dream = pickOne(rng, 1, 5);
      return [
        { label: "Combinación", numbers: main },
        { label: "Número Dream", numbers: [dream], variants: ["special"] },
      ];
    },
  },
];

// ── NUMEROLOGÍA ──────────────────────────────────────────────
function reduceNumber(n) {
  if (n === 0) return 0;
  if (n === 11 || n === 22 || n === 33) return n;
  while (n > 9) {
    if (n === 11 || n === 22 || n === 33) return n;
    n = String(n).split("").reduce((s, d) => s + (+d), 0);
  }
  return n;
}

const NUMEROLOGY = {
  0: {
    title: "El Vacío",
    keywords: "Potencial · Origen · Misterio",
    body: "Antes del primer aliento, el cero. Es el lienzo en blanco, lo que aún no ha sido pronunciado: posibilidad pura, semilla a la espera de germinar.",
  },
  1: {
    title: "El Iniciador",
    keywords: "Liderazgo · Voluntad · Comienzo",
    body: "El 1 enciende la chispa primera. Trae independencia, coraje y la convicción de quien camina solo hacia el horizonte. Un día para empezar lo que llevabas tiempo pensando.",
  },
  2: {
    title: "La Confidente",
    keywords: "Dualidad · Diplomacia · Sensibilidad",
    body: "El 2 es el espejo y el reflejo, la pareja y el acuerdo. Pide escucha, paciencia y la sabiduría de tejer puentes donde otros levantan muros.",
  },
  3: {
    title: "La Musa",
    keywords: "Creatividad · Expresión · Alegría",
    body: "El 3 canta. Es la palabra que florece, el arte que se desborda, la risa que ilumina la mesa. Cifra de quien crea por placer y comparte por ofrenda.",
  },
  4: {
    title: "El Cimiento",
    keywords: "Estructura · Trabajo · Lealtad",
    body: "Cuatro paredes, cuatro estaciones. El 4 construye sin prisa pero sin pausa, levantando con honestidad lo que perdurará. Disciplina y arraigo.",
  },
  5: {
    title: "El Viajero",
    keywords: "Libertad · Cambio · Aventura",
    body: "El 5 abre caminos. Inquieto, curioso, alérgico a las cadenas, invita a probar lo nuevo, a mover el cuerpo y a confiar en lo imprevisto.",
  },
  6: {
    title: "El Corazón",
    keywords: "Amor · Hogar · Responsabilidad",
    body: "El 6 abraza. Es la cifra de la familia, del cuidado y de la belleza compartida. Día propicio para reparar lazos y celebrar a los tuyos.",
  },
  7: {
    title: "El Místico",
    keywords: "Sabiduría · Introspección · Misterio",
    body: "El 7 se retira al silencio para escuchar mejor. Es estudio, contemplación, intuición que se afila en soledad. Un día para mirar hacia dentro.",
  },
  8: {
    title: "La Soberana",
    keywords: "Poder · Abundancia · Justicia",
    body: "El 8 traza el infinito en su silueta. Habla de ambición sana, de equilibrio entre dar y recibir, de la cosecha que llega tras la siembra paciente.",
  },
  9: {
    title: "El Peregrino",
    keywords: "Compasión · Cierre · Humanidad",
    body: "El 9 contiene a los demás. Es el viajero que regresa con la sabiduría de todos los caminos. Cifra de despedidas necesarias y de bondad sin medida.",
  },
  11: {
    title: "El Faro · Maestro",
    keywords: "Intuición · Visión · Iluminación",
    body: "Número maestro. El 11 ilumina como faro en la noche; su intuición ve más allá de lo evidente. Inspira a otros aún sin proponérselo.",
  },
  22: {
    title: "El Arquitecto · Maestro",
    keywords: "Manifestación · Edificación · Legado",
    body: "Número maestro. El 22 convierte los sueños en planos y los planos en piedra. Sólo construye lo que cree que servirá a generaciones.",
  },
  33: {
    title: "El Sanador · Maestro",
    keywords: "Compasión total · Servicio · Maestría",
    body: "Número maestro. El 33 ama sin condición. Su vida entera se ofrece como medicina para los que sufren; es la cifra de los mentores y los curadores.",
  },
};

// ── DATE LINE ────────────────────────────────────────────────
function spanishDateLine() {
  const parts = new Intl.DateTimeFormat("es-ES", {
    timeZone: TZ,
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).formatToParts(new Date());
  const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const weekday = m.weekday.charAt(0).toUpperCase() + m.weekday.slice(1);
  return `${weekday} · ${m.day} de ${m.month} de ${m.year}`;
}

// Short inline name for a number — strips the "· Maestro" suffix on masters.
function cellName(n) {
  const entry = NUMEROLOGY[reduceNumber(n)] ?? NUMEROLOGY[0];
  return entry.title.split("·")[0].trim();
}

// ── RENDER ───────────────────────────────────────────────────
function buildCard(game, date) {
  const rng = rngFor(date, game.id);
  const groups = game.generate(rng);

  const article = el("article", { class: "card", "data-game": game.id });

  const sigil = el("div", { class: "card__sigil" });
  sigil.appendChild(svgNode(game.sigil));
  article.append(sigil);

  article.append(
    el("div", { class: "card__head" },
      el("p", { class: "card__eyebrow", text: game.eyebrow }),
      el("h2", { class: "card__name", text: game.name }),
      el("p", { class: "card__tag", text: game.tag }),
    )
  );

  groups.forEach((g, idx) => {
    if (idx > 0) {
      article.append(
        el("div", { class: "card__divider" },
          el("span", { text: g.label })
        )
      );
    }
    // tag long combinations so CSS can pivot to a 3×N grid on small screens
    const ulClass = "numbers" + (g.numbers.length >= 6 ? " numbers--six" : "");
    const ul = el("ul", { class: ulClass, "aria-label": g.label });
    g.numbers.forEach((n, i) => {
      const variant = g.variants?.[i];
      const cls = ["num"];
      if (variant === "special") cls.push("num--special");
      if (variant === "star")    cls.push("num--star");
      const btn = el("button", {
        type: "button",
        class: cls.join(" "),
        "data-number": String(n),
        "aria-label": `Número ${n} · ${cellName(n)}`,
        text: String(n).padStart(2, "0"),
      });
      const name = el("span", { class: "num-name", text: cellName(n) });
      ul.append(el("li", { class: "num-cell" }, btn, name));
    });
    article.append(ul);
  });

  article.append(el("p", { class: "card__hint", text: "Toca un número para la lectura completa." }));
  return article;
}

function renderGames() {
  const main = document.getElementById("games");
  const date = todayKey();
  const frag = document.createDocumentFragment();
  for (const game of GAMES) frag.append(buildCard(game, date));
  main.replaceChildren(frag);
}

// ── NUMEROLOGY DIALOG ────────────────────────────────────────
const dialog   = document.getElementById("numero-dialog");
const dlgTitle = document.getElementById("numero-title");
const dlgRed   = document.getElementById("numero-reduction");
const dlgKeys  = document.getElementById("numero-keywords");
const dlgBody  = document.getElementById("numero-body");
const dlgSigil = document.getElementById("numero-sigil");

function openNumero(n) {
  const reduced = reduceNumber(n);
  const entry = NUMEROLOGY[reduced] ?? NUMEROLOGY[0];
  const isMaster = (reduced === 11 || reduced === 22 || reduced === 33);

  dlgSigil.textContent = String(n);
  dlgTitle.textContent = entry.title;

  dlgRed.replaceChildren();
  if (n === reduced) {
    dlgRed.append("Cifra raíz");
  } else {
    dlgRed.append(
      "Reduce a ",
      el("span", { class: "numero__reduction-num", text: String(reduced) }),
      isMaster ? " · número maestro" : "",
    );
  }
  dlgKeys.textContent = entry.keywords;
  dlgBody.textContent = entry.body;

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

document.addEventListener("click", (ev) => {
  const btn = ev.target.closest(".num");
  if (btn) { openNumero(Number(btn.dataset.number)); return; }
  if (ev.target.closest("[data-close]")) { dialog.close(); return; }
  if (ev.target === dialog) dialog.close();
});

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && dialog.open) dialog.close();
});

// ── BOOT ─────────────────────────────────────────────────────
document.getElementById("dateline").textContent = spanishDateLine();
renderGames();

// ── PWA ──────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

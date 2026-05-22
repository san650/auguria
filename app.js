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
function madridKey(d) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${m.year}-${m.month}-${m.day}`;
}
function todayKey() { return madridKey(new Date()); }
// The day Auguria is currently contemplating. Defaults to today;
// changed via the Rueda Efeméride.
let _selectedDate = todayKey();
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
      const play = () => ({
        main: pickUnique(rng, 6, 49),
        reintegro: pickOne(rng, 0, 9),
      });
      const a = play();
      const b = play();
      return [
        { label: "Combinación", numbers: a.main },
        { label: "Reintegro", numbers: [a.reintegro], variants: ["special"] },
        { label: "Apuesta 2 · Combinación", numbers: b.main },
        { label: "Reintegro", numbers: [b.reintegro], variants: ["special"] },
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

// ── CHINESE NUMEROLOGY ───────────────────────────────────────
// Cultural reading: each entry maps a numeric code to its colloquial
// meaning and a valoración (positivo · neutral · negativo). The keys
// are integers so any number-shaped string can be looked up.
const NUMEROLOGY_CHINA = {
  2:    { valor: "positivo", body: "Representa unión, pareja, equilibrio y buenos deseos, especialmente en contextos como bodas y Año Nuevo chino." },
  8:    { valor: "positivo", body: "Asociado con riqueza, prosperidad, éxito económico y buena fortuna material." },
  9:    { valor: "positivo", body: "Representa longevidad, eternidad, duración y amor duradero. Se usa en gestos románticos como 99 rosas o fechas con 9." },
  4:    { valor: "negativo", body: "Considerado el número más desafortunado; se evita en pisos de edificios, direcciones, matrículas y teléfonos." },
  5:    { valor: "negativo", body: "Se asocia con tristeza, llanto o mala fortuna." },
  7:    { valor: "neutral",  body: "Lectura ambigua: puede ser favorable para relaciones y energía vital, pero también se vincula con el Festival de los Fantasmas y con la idea de engaño." },
  250:  { valor: "negativo", body: "Expresión insultante: «tonto», «estúpido» o «no muy cuerdo»." },
  520:  { valor: "positivo", body: "Expresión romántica para decir «te amo». El 20 de mayo (5/20) se asocia con un San Valentín chino moderno." },
  748:  { valor: "negativo", body: "Expresión agresiva equivalente a «vete al diablo» o «piérdete»." },
  555:  { valor: "negativo", body: "Se usa en internet para expresar tristeza, pena o llanto." },
  88:   { valor: "neutral",  body: "Forma informal de despedirse en internet o en mensajes." },
  1314: { valor: "positivo", body: "Significa «para siempre», «por el resto de mi vida», amor duradero." },
  7456: { valor: "negativo", body: "Expresa enojo: «me estás haciendo enojar» o «me muero de rabia»." },
  995:  { valor: "negativo", body: "Pedido de ayuda: «¡sálvame!» o «ayúdame»." },
};

const CHINA_VALOR_LABEL = {
  positivo: "Positivo",
  neutral:  "Neutral",
  negativo: "Negativo",
};

// Sorted by valoración (positivos primero, luego neutrales, luego negativos)
// and within each group by numerical value — so the ledger reads like a
// fortune scroll: bendiciones first, ambigüedades en el medio, infortunios al final.
const CHINA_ORDER = { positivo: 0, neutral: 1, negativo: 2 };
function chinaEntries() {
  return Object.entries(NUMEROLOGY_CHINA)
    .map(([k, v]) => ({ num: Number(k), ...v }))
    .sort((a, b) => {
      const d = CHINA_ORDER[a.valor] - CHINA_ORDER[b.valor];
      return d !== 0 ? d : a.num - b.num;
    });
}

// ── ARCANOS · the 12 Major Arcana the vision deck draws from ─
// numKey % 12 selects the card index, matching the icons/tarot/N.svg
// art and the names rendered on those cards.
const TAROT = {
  0:  { name: "El Loco",         keywords: "Inicio · Inocencia · Salto",
        body: "Al borde del precipicio sin mirar atrás. Cifra del comienzo puro, del viaje sin equipaje. Confía en lo desconocido y acepta el riesgo como parte de la fortuna." },
  1:  { name: "El Mago",         keywords: "Voluntad · Manifestación · Acción",
        body: "Los cuatro elementos sobre la mesa, dispuestos a obedecer. Día para encarnar lo que hasta ahora era sólo deseo: la voluntad cristaliza en gesto." },
  2:  { name: "La Sacerdotisa",  keywords: "Intuición · Misterio · Sabiduría",
        body: "Vela el umbral entre lo visible y lo oculto. Sabe sin haber preguntado. Escucha tu intuición: las respuestas ya están dentro, esperando el silencio que las revele." },
  3:  { name: "La Emperatriz",   keywords: "Abundancia · Creación · Cuidado",
        body: "Madre, jardín y cosecha. Símbolo de fertilidad y de creación que florece sin esfuerzo. Atiende el cuerpo, los afectos y aquello que pides cultivar." },
  4:  { name: "El Emperador",    keywords: "Autoridad · Estructura · Disciplina",
        body: "Trono firme y palabra dada. Orden, autoridad serena, ley justa. Día para tomar las riendas y construir con disciplina lo que ha de perdurar." },
  5:  { name: "El Hierofante",   keywords: "Tradición · Enseñanza · Guía",
        body: "El que custodia lo aprendido y lo transmite. Busca al maestro, o conviértete en uno. Habla del valor de los ritos, de la pertenencia y de la palabra heredada." },
  6:  { name: "Los Enamorados",  keywords: "Amor · Elección · Unión",
        body: "Encrucijada del corazón. Toda elección verdadera implica una renuncia. El amor no es destino: es una decisión que se renueva cada día." },
  7:  { name: "El Carro",        keywords: "Determinación · Triunfo · Dirección",
        body: "Avance arrollador, dirección clara, riendas en las manos justas. Vence el caos con voluntad templada. La victoria se gana saliendo, no esperando." },
  8:  { name: "La Fuerza",       keywords: "Coraje · Paciencia · Templanza",
        body: "No la del músculo, la del temple. Doma la fiera con caricia, no con golpe. Paciencia y compasión son sus armas; el coraje verdadero rara vez alza la voz." },
  9:  { name: "El Ermitaño",     keywords: "Introspección · Sabiduría · Soledad",
        body: "Lámpara en la noche, soledad fértil. Quien se retira para mirar mejor. Hoy, escucha tu propio silencio: ahí brilla la luz que buscas afuera." },
  10: { name: "La Fortuna",      keywords: "Destino · Cambio · Ciclo",
        body: "La rueda gira y nadie la detiene. Lo de arriba baja, lo de abajo sube. Acepta el ciclo, suelta lo que ya cumplió su parte y deja venir lo nuevo." },
  11: { name: "La Justicia",     keywords: "Verdad · Equilibrio · Consecuencia",
        body: "Espada y balanza, sin amor ni odio. Toda acción tiene su eco, todo gesto su peso. Día para saldar cuentas con honestidad y restituir lo que corresponde." },
};

// ── VISIÓN · daily omen number + composition ─────────────────
function pickVisionNumber(date) {
  const rng = rngFor(date, "vision");
  const n = Math.floor(rng() * 100);
  return String(n).padStart(2, "0"); // "00".."99"
}

function getVisionData(numKey /* "00".."99" */) {
  const n = Number(numKey);
  const reduced = reduceNumber(n);
  const numerology = NUMEROLOGY[reduced] ?? NUMEROLOGY[0];
  const dream = SUENOS_TWO.find(([num]) => num === numKey);
  const cardIndex = n % 12;
  const tarot = TAROT[cardIndex] ?? TAROT[0];
  return {
    numKey,
    reduced,
    isMaster: reduced === 11 || reduced === 22 || reduced === 33,
    dreamName: dream?.[1] ?? "",
    dreamIconKey: dream?.[2] ?? "",
    numerologyTitle: numerology.title,
    numerologyKeywords: numerology.keywords,
    numerologyBody: numerology.body,
    tarotName: tarot.name,
    tarotKeywords: tarot.keywords,
    tarotBody: tarot.body,
  };
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function playVisionAnimation() {
  const stage = document.querySelector(".vision__stage");
  if (!stage) return;

  const numKey = pickVisionNumber(_selectedDate);
  const data = getVisionData(numKey);

  setText("vision-number",           data.numKey);
  setText("vision-dream",            data.dreamName);
  setText("vision-tarot-name",       data.tarotName);
  setText("vision-tarot-keywords",   data.tarotKeywords);
  setText("vision-tarot-body",       data.tarotBody);
  setText("vision-numerology-title", data.numerologyTitle);
  setText("vision-reduction",
    Number(data.numKey) === data.reduced
      ? "Cifra raíz"
      : `Reduce a ${data.reduced}${data.isMaster ? " · número maestro" : ""}`);
  setText("vision-keywords",         data.numerologyKeywords);
  setText("vision-body",             data.numerologyBody);

  stage.dataset.card = String(Number(data.numKey) % 12);

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stage.dataset.state = "settled";
    return;
  }

  // Reset, force reflow so re-entries re-trigger the keyframes, then
  // advance through the choreography:
  //   dormant → back (card-back full bleed)
  //          → face (flip to front, still full bleed)
  //          → background (card zooms out to fill the viewport, dims to backdrop)
  //          → number     (eyebrow + number panel cascades in over the backdrop)
  //          → dream      (dream panel cascades in)
  //          → numerology (numerology panel cascades in)
  //          → settled    (tarot panel cascades in — the closing reveal)
  stage.dataset.state = "dormant";
  void stage.offsetWidth;
  if (_visionTimers) _visionTimers.forEach(clearTimeout);
  _visionTimers = [];
  const at = (ms, state) =>
    _visionTimers.push(setTimeout(() => { stage.dataset.state = state; }, ms));
  requestAnimationFrame(() => { stage.dataset.state = "back"; });
  at(1000, "face");        // flip starts (1.1s CSS rotation)
  at(3400, "background");  // zoom out to backdrop (1.7s transition) — face lingers ~2.4s
  at(5300, "number");      // number panel cascades in (zoom-out lands ~5100ms)
  at(5950, "dream");       // dream panel
  at(6600, "numerology");  // numerology panel
  at(7250, "settled");     // tarot panel — the closing reveal
}

let _visionTimers = [];

// ── DATE LINE ────────────────────────────────────────────────
// Treat a civil-date key as midday UTC so DST seams don't pull the
// weekday across a boundary when we feed it back through Intl.
function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }

function spanishDateLine(key = _selectedDate) {
  const parts = new Intl.DateTimeFormat("es-ES", {
    timeZone: TZ,
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).formatToParts(dateFromKey(key));
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
  const frag = document.createDocumentFragment();
  // Jugada leads — when the user has picks, "Mi jugada" sits above the
  // daily lottery cards so it's the first thing they see on home.
  frag.append(buildJugadaCard());
  for (const game of GAMES) frag.append(buildCard(game, _selectedDate));
  main.replaceChildren(frag);
}

// The jugada card lives in #games as a sibling of the lottery cards,
// so it inherits all of .card's styling (padding, sigil, brackets).
function buildJugadaCard() {
  const card = el("article", {
    class: "card jugada-card",
    "data-sequence-target": "",
    "aria-label": "Mi jugada",
    hidden: true,
  });

  const sigil = el("div", { class: "card__sigil" });
  sigil.appendChild(svgNode(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="16" r="3"/><circle cx="16" cy="16" r="3"/><circle cx="24" cy="16" r="3"/><path d="M11 16 L13 16 M19 16 L21 16" opacity="0.6"/><circle cx="8"  cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/><circle cx="24" cy="16" r="1" fill="currentColor"/></g></svg>`));
  card.append(sigil);

  const clearBtn = el("button", {
    type: "button",
    class: "sequence__clear jugada-card__clear",
    "aria-label": "Borrar mi jugada",
    text: "Borrar",
  });
  card.append(clearBtn);

  const head = el("div", { class: "card__head" },
    el("p", { class: "card__eyebrow", text: "Mi jugada" }),
    el("h2", { class: "card__name", text: "La Combinación" }),
    el("p", { class: "card__tag" }, el("span", { class: "sequence__count" })),
  );
  card.append(head);

  card.append(el("ol", { class: "sequence__list" }));

  card.append(el("p", {
    class: "card__hint",
    text: "Pulsa una cifra del oráculo o de los sueños para agregarla.",
  }));

  return card;
}

// ── NUMEROLOGY DIALOG ────────────────────────────────────────
const dialog       = document.getElementById("numero-dialog");
const dlgTitle     = document.getElementById("numero-title");
const dlgRed       = document.getElementById("numero-reduction");
const dlgKeys      = document.getElementById("numero-keywords");
const dlgBody      = document.getElementById("numero-body");
const dlgSigil     = document.getElementById("numero-sigil");
const dlgDream     = document.getElementById("numero-dream");
const dlgDreamName = document.getElementById("numero-dream-name");
const dlgChina     = document.getElementById("numero-china");
const dlgChinaTag  = document.getElementById("numero-china-tag");
const dlgChinaBody = document.getElementById("numero-china-body");
const dlgAdd       = document.getElementById("numero-add");

function openNumero(n) {
  const reduced = reduceNumber(n);
  const entry = NUMEROLOGY[reduced] ?? NUMEROLOGY[0];
  const isMaster = (reduced === 11 || reduced === 22 || reduced === 33);

  dlgSigil.textContent = String(n);
  dlgSigil.dataset.len = String(String(n).length);
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

  // Associated quiniela dream — check the table that matches the number's range.
  let dream;
  if (n >= 0 && n <= 99) {
    dream = SUENOS_TWO.find(([num]) => num === String(n).padStart(2, "0"))?.[1];
  } else if (n >= 100 && n <= 999) {
    dream = SUENOS_THREE.find(([num]) => num === String(n).padStart(3, "0"))?.[1];
  }
  if (dream) {
    dlgDreamName.textContent = dream;
    dlgDream.hidden = false;
  } else {
    dlgDreamName.textContent = "";
    dlgDream.hidden = true;
  }

  // Chinese reading — only when the number has a colloquial code in the table.
  const china = NUMEROLOGY_CHINA[n];
  if (china) {
    dlgChinaTag.textContent = CHINA_VALOR_LABEL[china.valor];
    dlgChinaTag.className = `china-tag china-tag--${china.valor}`;
    dlgChinaBody.textContent = china.body;
    dlgChina.dataset.valor = china.valor;
    dlgChina.hidden = false;
  } else {
    dlgChinaBody.textContent = "";
    dlgChinaTag.textContent = "";
    dlgChinaTag.className = "china-tag";
    delete dlgChina.dataset.valor;
    dlgChina.hidden = true;
  }

  // Action button reflects whether this number is already in the sequence.
  dlgAdd.dataset.number = formatNumKey(n);
  refreshDlgAdd();

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

document.addEventListener("click", (ev) => {
  // Toggle the drawer (dreams view)
  if (ev.target.closest(".seq-drawer__toggle")) { toggleDrawer(); return; }

  // Remove a single chip — confirms first
  const chipX = ev.target.closest(".seq-chip__remove");
  if (chipX) { confirmedRemoveFromSequence(chipX.dataset.removeNumber); return; }

  // Clear the whole jugada — confirms first
  if (ev.target.closest(".sequence__clear")) { confirmedClearSequence(); return; }

  // Add / remove via the dialog action button
  if (ev.target.closest(".numero__add") && !dlgAdd.disabled) {
    const numKey = dlgAdd.dataset.number;
    if (!numKey) return;
    if (dlgAdd.dataset.action === "remove") {
      // Quitar via the dialog also asks for confirmation. Close numerology
      // first so the confirm stacks cleanly.
      dialog.close();
      confirmedRemoveFromSequence(numKey);
    } else {
      addToSequence(numKey);
      // Close the numerology dialog automatically — the drawer's pop-up
      // animation already gives the user feedback that the pick landed.
      dialog.close();
    }
    return;
  }

  // Open numerology (lottery medallions, sueño cells, sueño rows, chips,
  // root/master cards, china rows)
  const btn = ev.target.closest(".num, .sueno__face, .sueno-row__btn, .seq-chip__num, .numero-cell__btn, .china-row__btn");
  if (btn) { openNumero(Number(btn.dataset.number)); return; }

  if (ev.target.closest("[data-close]")) { dialog.close(); return; }
  if (ev.target === dialog) dialog.close();
});

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    if (confirmDlg?.open) { settleConfirm(false); return; }
    if (dialog.open) { dialog.close(); return; }
  }
});

// ── SUEÑOS · Tabla de los sueños (Quiniela, two-digit) ───────
// Each entry: [number, name, iconKey]. iconKey references ICONS below.
// 'rosette' is the placeholder ornament for entries whose bespoke
// line-art icon has not been drawn yet.
const SUENOS_TWO = [
  ["00", "Los huevos",         "huevos"],
  ["01", "El agua",            "agua"],
  ["02", "El niño",            "nino"],
  ["03", "San Cono",           "sancono"],
  ["04", "La cama",            "cama"],
  ["05", "El gato",            "gato"],
  ["06", "El perro",           "perro"],
  ["07", "El revólver",        "revolver"],
  ["08", "El incendio",        "fuego"],
  ["09", "El arroyo",          "arroyo"],
  ["10", "El león",            "leon"],
  ["11", "El elefante",        "elefante"],
  ["12", "El soldado",         "soldado"],
  ["13", "La yeta",            "yeta"],
  ["14", "El borracho",        "copa"],
  ["15", "La niña bonita",     "rosa"],
  ["16", "El anillo",          "anillo"],
  ["17", "La desgracia",       "rosette"],
  ["18", "La sangre",          "sangre"],
  ["19", "El pescado",         "pez"],
  ["20", "La fiesta",          "fiesta"],
  ["21", "La mujer",           "mujer"],
  ["22", "El loco",            "loco"],
  ["23", "El cocinero",        "cocinero"],
  ["24", "El caballo",         "caballo"],
  ["25", "El gallo",           "gallo"],
  ["26", "La misa",            "misa"],
  ["27", "El peine",           "peine"],
  ["28", "El cerro",           "cerro"],
  ["29", "San Pedro",          "llaves"],
  ["30", "Santa Rosa",         "rosa"],
  ["31", "El barco",           "barco"],
  ["32", "El dinero",          "moneda"],
  ["33", "Cristo",             "cruz"],
  ["34", "La cabeza",          "cabeza"],
  ["35", "El pajarito",        "pajaro"],
  ["36", "La manteca",         "manteca"],
  ["37", "El dentista",        "diente"],
  ["38", "La piedra",          "piedra"],
  ["39", "La lluvia",          "lluvia"],
  ["40", "El cura",            "rosette"],
  ["41", "El cuchillo",        "cuchillo"],
  ["42", "El zapato",          "zapato"],
  ["43", "El balcón",          "rosette"],
  ["44", "La cárcel",          "rosette"],
  ["45", "El vino",            "copa"],
  ["46", "Los tomates",        "tomate"],
  ["47", "El muerto que habla","calavera"],
  ["48", "El muerto",          "tumba"],
  ["49", "La carne",           "rosette"],
  ["50", "El pan",             "pan"],
  ["51", "El serrucho",        "rosette"],
  ["52", "La madre",           "rosette"],
  ["53", "El buque",           "barco"],
  ["54", "La vaca",            "vaca"],
  ["55", "La música",          "nota"],
  ["56", "La caída",           "caida"],
  ["57", "El jorobado",        "jorobado"],
  ["58", "El ahogado",         "agua"],
  ["59", "La rueda",           "rueda"],
  ["60", "La virgen",          "virgen"],
  ["61", "La escopeta",        "rosette"],
  ["62", "La inundación",      "agua"],
  ["63", "El casamiento",      "anillo"],
  ["64", "El llanto",          "rosette"],
  ["65", "El cazador",         "arco"],
  ["66", "La lombriz",         "lombriz"],
  ["67", "El mordisco",        "rosette"],
  ["68", "Los sobrinos",       "rosette"],
  ["69", "Los vicios",         "dados"],
  ["70", "El muerto",          "tumba"],
  ["71", "El excremento",      "rosette"],
  ["72", "El asombro",         "rosette"],
  ["73", "El hospital",        "cruz"],
  ["74", "La gente negra",     "rosette"],
  ["75", "Los pescados",       "pez"],
  ["76", "Las llamas",         "fuego"],
  ["77", "Las piernas",        "rosette"],
  ["78", "La ramera",          "rosa"],
  ["79", "El ladrón",          "rosette"],
  ["80", "La bocha",           "rosette"],
  ["81", "Las flores",         "rosa"],
  ["82", "La riña",            "cuchillo"],
  ["83", "El mal tiempo",      "lluvia"],
  ["84", "La iglesia",         "iglesia"],
  ["85", "La linterna",        "lampara"],
  ["86", "El humo",            "rosette"],
  ["87", "Los piojos",         "rosette"],
  ["88", "El papel",           "rosette"],
  ["89", "La medida",          "rosette"],
  ["90", "El abuelo",          "rosette"],
  ["91", "El sapo",            "sapo"],
  ["92", "El médico",          "cruz"],
  ["93", "El enamorado",       "enamorado"],
  ["94", "El plumero",         "plumero"],
  ["95", "El anillo de bodas", "anillo"],
  ["96", "El marido",          "sombrero"],
  ["97", "La mesa",            "mesa"],
  ["98", "La cárcel",          "rosette"],
  ["99", "El hermano",         "rosette"],
];

// Inline SVG icon library. 32×32 viewBox, currentColor strokes.
const ICONS = {
  huevos:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"><ellipse cx="12" cy="18" rx="6" ry="8"/><ellipse cx="21" cy="14" rx="5.5" ry="7.5"/><path d="M12 12 Q14 14 12 16" opacity="0.5"/></g></svg>`,
  agua:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"><path d="M3 11 Q8 7 13 11 T23 11 T29 11"/><path d="M3 17 Q8 13 13 17 T23 17 T29 17"/><path d="M3 23 Q8 19 13 23 T23 23 T29 23"/></g></svg>`,
  nino:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="9" r="3.5"/><path d="M16 13 L16 22 M16 16 L11 20 M16 16 L21 20 M16 22 L13 28 M16 22 L19 28"/></g></svg>`,
  sancono:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4 L23 14 Q23 22 16 27 Q9 22 9 14 Z"/><path d="M16 10 L16 22 M12 14 L20 14"/></g></svg>`,
  cama:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"><path d="M4 22 H28 M4 22 V14 H12 V19 H28 V22 M28 22 V14"/><path d="M4 25 V28 M28 25 V28"/><circle cx="9" cy="16" r="1.4"/></g></svg>`,
  gato:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 11 L10 5 L14 9 H18 L22 5 L24 11"/><ellipse cx="16" cy="18" rx="9" ry="8"/><circle cx="13" cy="17" r="0.7" fill="currentColor"/><circle cx="19" cy="17" r="0.7" fill="currentColor"/><path d="M14 21 Q16 23 18 21"/><path d="M10 19 L7 19 M22 19 L25 19" opacity="0.6"/></g></svg>`,
  perro:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9 L9 16 L7 22 L11 23 L13 18 H19 L21 23 L25 22 L23 16 L25 9 L22 12 L19 11 H13 L10 12 Z"/><circle cx="14" cy="16" r="0.6" fill="currentColor"/><circle cx="20" cy="16" r="0.6" fill="currentColor"/></g></svg>`,
  revolver: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14 H22 L22 11 L28 11 L28 16 L22 16 L22 18 L16 18 L14 23 L10 23 L11 18 L4 18 Z"/><circle cx="11" cy="16" r="2.5"/></g></svg>`,
  fuego:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4 Q20 10 21 14 Q26 18 22 25 Q19 29 16 28 Q13 29 10 25 Q6 18 11 14 Q14 11 16 4 Z"/><path d="M16 14 Q19 18 17 23 Q15 25 13 22 Q12 18 16 14 Z" fill="currentColor" fill-opacity="0.18"/></g></svg>`,
  arroyo:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"><path d="M5 7 Q10 14 7 19 Q4 24 9 28"/><path d="M14 5 Q19 12 16 17 Q13 22 18 27" opacity="0.75"/><path d="M23 7 Q28 14 25 19 Q22 24 27 28" opacity="0.5"/></g></svg>`,
  leon:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="16" r="6"/><g stroke-width="0.8"><line x1="16" y1="3" x2="16" y2="7"/><line x1="16" y1="25" x2="16" y2="29"/><line x1="3" y1="16" x2="7" y2="16"/><line x1="25" y1="16" x2="29" y2="16"/><line x1="7" y1="7" x2="10" y2="10"/><line x1="22" y1="22" x2="25" y2="25"/><line x1="25" y1="7" x2="22" y2="10"/><line x1="10" y1="22" x2="7" y2="25"/></g><circle cx="13.5" cy="15" r="0.7" fill="currentColor"/><circle cx="18.5" cy="15" r="0.7" fill="currentColor"/><path d="M13 19 Q16 21 19 19"/></g></svg>`,
  elefante: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18 Q5 10 13 9 Q21 9 23 14 L26 14 Q28 14 28 17 Q27 19 24 19 L24 24 H21 V21 H14 V24 H11 V21 Q7 22 5 18 Z"/><path d="M20 14 Q23 17 21 22 Q19 24 19 21"/><circle cx="11" cy="14" r="0.7" fill="currentColor"/></g></svg>`,
  soldado:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 18 Q8 8 16 8 Q24 8 24 18 L24 21 H8 Z"/><path d="M16 6 V8 M14 21 V25 H18 V21"/><line x1="8" y1="18" x2="24" y2="18"/></g></svg>`,
  yeta:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8 Q8 22 16 26 Q24 22 24 8 L20 8 L20 20 Q17 22 16 22 Q15 22 12 20 L12 8 Z"/><circle cx="10" cy="10" r="0.6" fill="currentColor"/><circle cx="22" cy="10" r="0.6" fill="currentColor"/><circle cx="14" cy="11" r="0.5" fill="currentColor"/><circle cx="18" cy="11" r="0.5" fill="currentColor"/></g></svg>`,
  rosa:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="13" r="6"/><path d="M16 9 Q19 11 18 14 Q16 16 14 14 Q13 11 16 9 Z" fill="currentColor" fill-opacity="0.16"/><path d="M12 17 Q10 22 14 25 M20 17 Q22 22 18 25 M16 19 V28"/></g></svg>`,
  anillo:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="19" r="7"/><path d="M12 12 L16 6 L20 12 Z"/><circle cx="16" cy="9" r="0.8" fill="currentColor"/></g></svg>`,
  sangre:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4 Q23 14 23 20 Q23 27 16 27 Q9 27 9 20 Q9 14 16 4 Z"/><path d="M13 19 Q12 22 14 24" opacity="0.6"/></g></svg>`,
  pez:      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16 Q11 8 20 12 Q26 14 27 16 Q26 18 20 20 Q11 24 5 16 Z M27 16 L31 12 M27 16 L31 20"/><circle cx="22" cy="15" r="0.8" fill="currentColor"/><path d="M11 14 Q12 16 11 18" opacity="0.6"/></g></svg>`,
  fiesta:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4 L7 26 L25 26 Z"/><circle cx="16" cy="4" r="1.4" fill="currentColor"/><circle cx="12" cy="14" r="0.7" fill="currentColor"/><circle cx="20" cy="18" r="0.7" fill="currentColor"/><circle cx="16" cy="22" r="0.7" fill="currentColor"/></g></svg>`,
  mujer:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="8" r="3.5"/><path d="M16 11.5 L16 17 M10 17 H22 L19 27 H13 Z M16 17 L16 22"/></g></svg>`,
  loco:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 Q8 7 11 5 L13 11 L16 4 L19 11 L21 5 Q24 7 23 14 Z"/><circle cx="11" cy="5" r="1" fill="currentColor"/><circle cx="16" cy="4" r="1" fill="currentColor"/><circle cx="21" cy="5" r="1" fill="currentColor"/><circle cx="16" cy="20" r="5"/><circle cx="14" cy="19" r="0.6" fill="currentColor"/><circle cx="18" cy="19" r="0.6" fill="currentColor"/><path d="M14 22 Q16 23 18 22"/></g></svg>`,
  cocinero: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 16 Q4 16 5 11 Q4 6 10 7 Q10 4 16 4 Q22 4 22 7 Q28 6 27 11 Q28 16 23 16 L22 22 H10 Z"/><line x1="10" y1="22" x2="22" y2="22"/><line x1="14" y1="22" x2="14" y2="26"/><line x1="18" y1="22" x2="18" y2="26"/></g></svg>`,
  caballo:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 26 Q5 18 10 14 Q12 11 11 8 Q14 9 14 11 Q18 8 22 9 Q26 11 26 17 Q26 23 24 26"/><path d="M14 11 L13 7 L17 9"/><circle cx="20" cy="14" r="0.7" fill="currentColor"/></g></svg>`,
  gallo:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 7 L17 4 L15 7 L13 4 L13 9 Q9 11 9 17 Q9 23 14 24 L15 28 H18 L18 24 Q23 23 22 17 L25 16 L21 13"/><circle cx="13" cy="15" r="0.6" fill="currentColor"/><path d="M22 17 L26 18" opacity="0.6"/></g></svg>`,
  misa:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6 H22 Q22 14 16 16 Q10 14 10 6 Z"/><line x1="16" y1="16" x2="16" y2="24"/><line x1="11" y1="24" x2="21" y2="24"/><path d="M10 6 L9 4 M22 6 L23 4" opacity="0.6"/></g></svg>`,
  peine:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"><rect x="5" y="9" width="22" height="6" rx="0.5"/><line x1="8" y1="15" x2="8" y2="23"/><line x1="12" y1="15" x2="12" y2="23"/><line x1="16" y1="15" x2="16" y2="23"/><line x1="20" y1="15" x2="20" y2="23"/><line x1="24" y1="15" x2="24" y2="23"/></g></svg>`,
  cerro:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 25 L11 13 L17 20 L21 15 L29 25 Z"/><circle cx="22" cy="8" r="2.5"/><line x1="11" y1="13" x2="13" y2="16" opacity="0.5"/></g></svg>`,
  llaves:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="10" r="4"/><path d="M12 12 L24 24 M20 20 L23 17 M22 22 L25 19"/><circle cx="9" cy="10" r="1.4" fill="currentColor"/></g></svg>`,
  barco:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22 L29 22 L26 27 L6 27 Z"/><path d="M16 22 L16 4 L25 18 L16 18"/><path d="M16 8 L10 18 L16 18"/></g></svg>`,
  moneda:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="16" r="9"/><circle cx="13" cy="16" r="6" opacity="0.5"/><path d="M13 12 V20 M11 14 H15 M11 18 H15"/><circle cx="22" cy="11" r="5" opacity="0.4"/></g></svg>`,
  cruz:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4 L16 28 M8 11 L24 11"/><circle cx="16" cy="11" r="4" opacity="0.4"/></g></svg>`,
  cabeza:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 6 Q11 6 11 16 L8 19 L11 21 L11 24 Q11 27 14 27 L18 27"/><circle cx="15" cy="16" r="0.7" fill="currentColor"/><path d="M18 18 Q19 19 18 20" opacity="0.7"/></g></svg>`,
  pajaro:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18 Q8 12 14 12 L18 8 L18 12 Q24 13 26 18 L24 22 L20 22 L18 26 L16 22 L11 22 L8 25 Z"/><circle cx="20" cy="14" r="0.6" fill="currentColor"/></g></svg>`,
  manteca:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22 L27 22 L24 12 L8 12 Z"/><path d="M8 12 L12 8 L20 8 L24 12"/><line x1="11" y1="22" x2="13" y2="12" opacity="0.5"/><line x1="21" y1="22" x2="19" y2="12" opacity="0.5"/></g></svg>`,
  diente:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6 Q8 14 11 22 Q12 27 14 27 Q15 22 16 22 Q17 22 18 27 Q20 27 21 22 Q24 14 22 6 Q19 4 16 6 Q13 4 10 6 Z"/></g></svg>`,
  piedra:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 23 L10 9 L18 7 L25 12 L27 22 L19 27 L9 26 Z"/><path d="M10 9 L18 14 L25 12 M18 14 L19 27" opacity="0.5"/></g></svg>`,
  lluvia:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12 Q5 18 11 18 H21 Q27 18 25 12 Q24 8 19 9 Q17 5 12 7 Q7 8 7 12 Z"/><line x1="10" y1="22" x2="9" y2="26"/><line x1="16" y1="22" x2="15" y2="27"/><line x1="22" y1="22" x2="21" y2="26"/></g></svg>`,
  cuchillo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22 L22 8 L26 11 L24 13 L7 26 Z"/><path d="M22 8 L24 6 L26 8 L26 11" opacity="0.6"/></g></svg>`,
  zapato:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22 Q4 14 8 14 L14 14 L18 10 L23 12 L27 18 L27 22 L24 24 L4 24 Z"/><line x1="9" y1="14" x2="9" y2="20" opacity="0.6"/><line x1="14" y1="14" x2="15" y2="20" opacity="0.6"/></g></svg>`,
  copa:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5 L23 5 L21 14 Q21 20 16 20 Q11 20 11 14 Z"/><line x1="16" y1="20" x2="16" y2="26"/><line x1="11" y1="26" x2="21" y2="26"/><path d="M11 12 H21" opacity="0.5"/></g></svg>`,
  tomate:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="18" r="9"/><path d="M16 9 L13 5 M16 9 L19 5 M16 9 L16 5 M12 11 Q16 13 20 11"/></g></svg>`,
  calavera: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14 Q7 5 16 5 Q25 5 25 14 L25 19 L21 21 L21 24 H11 L11 21 L7 19 Z"/><circle cx="12.5" cy="15" r="1.6" fill="currentColor" fill-opacity="0.2"/><circle cx="19.5" cy="15" r="1.6" fill="currentColor" fill-opacity="0.2"/><path d="M14 20 L15 18 L17 18 L18 20"/></g></svg>`,
  tumba:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 26 V14 Q9 8 16 8 Q23 8 23 14 V26 Z"/><line x1="5" y1="26" x2="27" y2="26"/><path d="M16 14 V20 M13 17 H19"/></g></svg>`,
  pan:      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16 Q5 9 13 9 Q14 7 17 7 Q20 7 21 9 Q27 9 27 16 Q27 22 22 22 L10 22 Q5 22 5 16 Z"/><path d="M9 15 L11 19 M14 13 L15 19 M19 13 L19 19 M23 15 L22 19" opacity="0.5"/></g></svg>`,
  vaca:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16 Q5 9 9 8 L11 11 H21 L23 8 Q27 9 26 16 Q26 22 16 23 Q6 22 6 16 Z"/><circle cx="13" cy="15" r="0.7" fill="currentColor"/><circle cx="19" cy="15" r="0.7" fill="currentColor"/><path d="M15 19 L17 19" opacity="0.7"/><circle cx="22" cy="6" r="0.8"/><circle cx="10" cy="6" r="0.8"/></g></svg>`,
  nota:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="23" r="3.5"/><circle cx="22" cy="20" r="3.5"/><path d="M14.5 23 L14.5 7 L25.5 5 L25.5 20"/><path d="M14.5 11 L25.5 9" opacity="0.5"/></g></svg>`,
  caida:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M9 11 L11 17 L16 19 L20 24 L26 22 M11 17 L7 22"/><path d="M14 5 L18 7 L16 11" opacity="0.6"/></g></svg>`,
  jorobado: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="7" r="3"/><path d="M11 10 Q9 14 14 16 Q12 22 9 28 M14 16 L20 14 L18 22 L24 28 M14 16 Q18 12 23 15"/></g></svg>`,
  rueda:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="2.2"/><line x1="16" y1="5" x2="16" y2="27"/><line x1="5" y1="16" x2="27" y2="16"/><line x1="8" y1="8" x2="24" y2="24" opacity="0.6"/><line x1="24" y1="8" x2="8" y2="24" opacity="0.6"/></g></svg>`,
  virgen:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="7" r="2.8"/><circle cx="16" cy="7" r="5.5" opacity="0.5"/><path d="M10 11 Q10 18 11 25 H21 Q22 18 22 11 Q19 9 16 9 Q13 9 10 11 Z"/><path d="M14 16 L18 16" opacity="0.6"/></g></svg>`,
  arco:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5 Q26 16 6 27"/><path d="M6 5 Q4 16 6 27" opacity="0.5"/><line x1="8" y1="16" x2="28" y2="16"/><path d="M28 16 L24 13 M28 16 L24 19"/></g></svg>`,
  lombriz:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22 Q9 18 13 22 Q17 26 21 22 Q25 18 29 22"/><path d="M5 16 Q9 12 13 16 Q17 20 21 16 Q25 12 29 16" opacity="0.7"/><path d="M5 10 Q9 6 13 10 Q17 14 21 10 Q25 6 29 10" opacity="0.4"/></g></svg>`,
  dados:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="13" width="13" height="13" rx="1.5"/><rect x="15" y="6" width="13" height="13" rx="1.5"/><circle cx="8" cy="17" r="1" fill="currentColor"/><circle cx="13" cy="22" r="1" fill="currentColor"/><circle cx="19" cy="10" r="1" fill="currentColor"/><circle cx="24" cy="10" r="1" fill="currentColor"/><circle cx="19" cy="15" r="1" fill="currentColor"/><circle cx="24" cy="15" r="1" fill="currentColor"/></g></svg>`,
  iglesia:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3 V8 M14 5 H18"/><path d="M16 8 L8 16 L8 26 L24 26 L24 16 Z"/><path d="M13 26 V20 H19 V26"/><circle cx="16" cy="16" r="2" opacity="0.6"/></g></svg>`,
  lampara:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4 L16 7 M13 7 L19 7 L21 12 L23 12 L23 22 L21 22 L19 27 L13 27 L11 22 L9 22 L9 12 L11 12 Z"/><path d="M14 14 L18 14 L18 20 L14 20 Z" fill="currentColor" fill-opacity="0.2"/></g></svg>`,
  sapo:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18 Q3 10 10 9 Q11 5 16 5 Q21 5 22 9 Q29 10 27 18 Q27 24 21 25 H11 Q5 24 5 18 Z"/><circle cx="11" cy="12" r="2"/><circle cx="21" cy="12" r="2"/><circle cx="11" cy="12" r="0.7" fill="currentColor"/><circle cx="21" cy="12" r="0.7" fill="currentColor"/><path d="M12 19 Q16 22 20 19"/></g></svg>`,
  enamorado:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 26 Q5 18 5 12 Q5 7 10 7 Q14 7 16 11 Q18 7 22 7 Q27 7 27 12 Q27 18 16 26 Z"/><path d="M3 6 L29 22" opacity="0.5"/><path d="M3 6 L7 5 L6 9 M29 22 L25 23 L26 19" opacity="0.6"/></g></svg>`,
  plumero:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4 L8 22"/><path d="M22 4 Q26 6 26 11 Q24 12 21 12 M22 4 Q19 4 18 8 Q21 9 24 9 M22 4 Q24 8 28 9 Q28 6 26 4"/><line x1="8" y1="22" x2="5" y2="28"/></g></svg>`,
  sombrero: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 23 H29 M7 23 V14 H25 V23"/><path d="M9 14 V8 H23 V14" opacity="0.85"/><line x1="9" y1="11" x2="23" y2="11" opacity="0.5"/></g></svg>`,
  mesa:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12 H28 L26 16 L6 16 Z"/><line x1="8" y1="16" x2="8" y2="26"/><line x1="24" y1="16" x2="24" y2="26"/><line x1="12" y1="14" x2="14" y2="14" opacity="0.5"/></g></svg>`,
  rosette:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"><circle cx="16" cy="16" r="8"/><circle cx="16" cy="16" r="4" opacity="0.6"/><path d="M16 4 L17 12 L24 13 L17 14 L16 28 L15 14 L8 13 L15 12 Z"/><circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none"/></g></svg>`,
  // Small ornaments used to break visual monotony along the 1000-row table.
  star6:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 5 L19 13 L27 13 L20.5 18 L23 26 L16 21 L9 26 L11.5 18 L5 13 L13 13 Z"/></g></svg>`,
  circleDot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9"><circle cx="16" cy="16" r="9"/><circle cx="16" cy="16" r="2" fill="currentColor"/></g></svg>`,
  sun:       `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"><circle cx="16" cy="16" r="5"/><g><line x1="16" y1="3" x2="16" y2="7"/><line x1="16" y1="25" x2="16" y2="29"/><line x1="3" y1="16" x2="7" y2="16"/><line x1="25" y1="16" x2="29" y2="16"/><line x1="7" y1="7" x2="10" y2="10"/><line x1="22" y1="22" x2="25" y2="25"/><line x1="25" y1="7" x2="22" y2="10"/><line x1="10" y1="22" x2="7" y2="25"/></g></g></svg>`,
  diamond:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linejoin="round"><path d="M16 4 L26 16 L16 28 L6 16 Z"/><path d="M16 4 L19 10 L26 16 L19 22 L16 28 L13 22 L6 16 L13 10 Z" opacity="0.5"/></g></svg>`,
  eye:       `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16 Q10 7 16 7 Q22 7 29 16 Q22 25 16 25 Q10 25 3 16 Z"/><circle cx="16" cy="16" r="3.5"/><circle cx="16" cy="16" r="1.2" fill="currentColor"/></g></svg>`,
  key:       `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"><circle cx="9" cy="16" r="4"/><circle cx="9" cy="16" r="1.4" fill="currentColor"/><path d="M13 16 H26 M22 16 V20 M26 16 V19"/></g></svg>`,
};

// Rotating ornaments for the three-digit table.
const TABLE_GLYPHS = ["star6", "circleDot", "diamond", "sun", "eye", "key"];

// Three-digit quiniela dream table (Lotería del Uruguay).
// Sparse — only the ~192 numbers that the canonical table assigns to a sueño.
const SUENOS_THREE = [
  ["001", "Tigre"],            ["004", "La cama"],          ["007", "Revólver"],
  ["009", "Arroyo"],           ["026", "Mojarra"],          ["035", "Pajarito"],
  ["056", "La caída"],         ["061", "Escopeta"],         ["065", "Cazador"],
  ["073", "Hospital"],         ["080", "Apereá"],           ["098", "Araña"],
  ["112", "Cucaracha"],        ["122", "Mariposa"],         ["130", "Ganso"],
  ["139", "Lluvias"],          ["141", "Ratón"],            ["150", "Chinche"],
  ["160", "Hipopótamo"],       ["170", "Langosta"],         ["175", "Sapo"],
  ["190", "Chivo"],            ["202", "Niño"],             ["210", "Hormiga"],
  ["214", "Borracho"],         ["215", "Rana"],             ["216", "Anguila"],
  ["223", "Zorro"],            ["232", "Nutria"],           ["233", "Cristo"],
  ["235", "Tordo"],            ["236", "Castaña"],          ["243", "Balcón"],
  ["244", "Carnero"],          ["249", "La carne"],         ["252", "Corvina"],
  ["255", "Murciélago"],       ["257", "Conejo"],           ["259", "Las plantas"],
  ["260", "La Virgen"],        ["274", "Aguila"],           ["278", "Ramera"],
  ["285", "Linterna"],         ["288", "Polilla"],          ["292", "Picaflor"],
  ["294", "Cocodrilo"],        ["296", "Marido"],           ["297", "Mesa"],
  ["301", "Agua"],             ["314", "Garrapata"],        ["317", "Cuervo"],
  ["327", "Ciervo"],           ["332", "Dinero"],           ["338", "Piedras"],
  ["339", "Gallineta"],        ["347", "Gorila"],           ["350", "El Pan"],
  ["352", "Madre e hijo"],     ["356", "Carpincho"],        ["362", "Chingolo"],
  ["367", "Tararira"],         ["374", "Gente negra"],      ["376", "Las llamas"],
  ["379", "Ladrón"],           ["400", "Huevos"],           ["412", "Soldado"],
  ["413", "Avestruz"],         ["418", "Víbora"],           ["422", "Loco"],
  ["424", "Caballo"],          ["425", "Gallina"],          ["437", "Eucaliptus"],
  ["438", "Gorrión"],          ["442", "Hornero"],          ["449", "Cerdo"],
  ["465", "Mulita"],           ["467", "Mordida"],          ["476", "Golondrina"],
  ["483", "Cigüeña"],          ["492", "Médico"],           ["504", "Lagarto"],
  ["508", "Incendio"],         ["517", "Desgracia"],        ["523", "Cocinero"],
  ["527", "El peine"],         ["537", "Oveja"],            ["541", "El cuchillo"],
  ["546", "Lechuza"],          ["551", "Serrucho"],         ["564", "Tábano"],
  ["566", "Lombriz"],          ["570", "Muerto sueña"],     ["572", "Cordero"],
  ["579", "Cardenal"],         ["580", "La bocha"],         ["587", "Piojo"],
  ["591", "Excusado"],         ["594", "Cementerio"],       ["598", "Lavandera"],
  ["599", "Isoca-Vaquilla"],   ["607", "Pavo"],             ["611", "Minero"],
  ["615", "Niña bonita"],      ["616", "Anillo"],           ["619", "Benteveo"],
  ["629", "Pato"],             ["631", "Mosquito"],         ["634", "Tiburón"],
  ["643", "Mosca"],            ["645", "El vino"],          ["648", "Muerto habla"],
  ["658", "Ahogado"],          ["663", "Cangrejo"],         ["668", "Sobrinos"],
  ["675", "Besos"],            ["681", "Jirafa"],           ["682", "La pelea"],
  ["683", "Mal tiempo"],       ["684", "Chajá"],            ["686", "El humo"],
  ["688", "El Papa"],          ["693", "Gallo"],            ["703", "La cruz"],
  ["705", "Gato"],             ["709", "Camaleon"],         ["713", "La yeta"],
  ["718", "Sangre"],           ["719", "Pescado"],          ["720", "Vaquillona"],
  ["728", "Canario"],          ["733", "Ballena"],          ["740", "El cura"],
  ["753", "El barco"],         ["755", "La música"],        ["757", "Jorobado"],
  ["758", "Pulga"],            ["768", "Avispas"],          ["771", "Excremento"],
  ["773", "Paloma"],           ["777", "Elefante"],         ["781", "Las flores"],
  ["782", "Toro"],             ["784", "La iglesia"],       ["789", "Rata"],
  ["793", "Enamorados"],       ["795", "Gusano"],           ["802", "Abeja"],
  ["806", "Perro"],            ["810", "Cañón"],            ["821", "Mujer"],
  ["826", "La misa"],          ["829", "San Pedro"],        ["830", "Santa Rosa"],
  ["831", "La luz"],           ["848", "Liebre"],           ["853", "Burro"],
  ["861", "Mono"],             ["869", "Vicios"],           ["872", "Sorpresa"],
  ["885", "Oso"],              ["890", "El miedo"],         ["895", "Anteojos"],
  ["896", "Tortuga"],          ["900", "Teru - teru"],      ["903", "Cotorra"],
  ["908", "Caracol"],          ["911", "Perdiz"],           ["920", "La fiesta"],
  ["921", "Buey"],             ["928", "El cerro"],         ["934", "La cabeza"],
  ["936", "Grillo"],           ["940", "Novillo"],          ["942", "Zapatillas"],
  ["944", "La cárcel"],        ["945", "Camello"],          ["946", "Tomates"],
  ["947", "Muerto"],           ["951", "Lagartija"],        ["954", "Vaca"],
  ["959", "Carancho"],         ["962", "Inundación"],       ["963", "Casamiento"],
  ["964", "El llanto"],        ["969", "León"],             ["971", "Zorrillo"],
  ["977", "Piernas mujer"],    ["978", "Comadreja"],        ["986", "Bagre"],
  ["991", "Lobo"],             ["997", "Halcón"],           ["999", "Hermanos"],
];

// Parse once per icon, then clone — keeps 1000-row render fast.
const _iconCache = Object.create(null);
function iconNode(key) {
  if (!_iconCache[key]) _iconCache[key] = svgNode(ICONS[key] || ICONS.rosette);
  return _iconCache[key].cloneNode(true);
}

function renderSuenosTwo() {
  const grid = document.getElementById("suenos-grid");
  if (!grid) return;
  const frag = document.createDocumentFragment();
  for (const [num, name, iconKey] of SUENOS_TWO) {
    const li = el("li", { class: "sueno", "data-search": `${num} ${name}`.toLowerCase() });

    const btn = el("button", {
      type: "button",
      class: "sueno__face",
      "aria-label": `Sueño ${num} · ${name}`,
      "data-number": num,
    });

    const iconWrap = el("span", { class: "sueno__icon" });
    iconWrap.appendChild(iconNode(iconKey));

    const numEl = el("span", { class: "sueno__num", text: num });
    btn.append(iconWrap, numEl);

    const nameEl = el("p", { class: "sueno__name", text: name });
    li.append(btn, nameEl);
    frag.append(li);
  }
  grid.replaceChildren(frag);
}

function renderSuenosThree() {
  const table = document.getElementById("suenos-table");
  if (!table) return;
  const frag = document.createDocumentFragment();
  SUENOS_THREE.forEach(([num, name], i) => {
    const glyphKey = TABLE_GLYPHS[i % TABLE_GLYPHS.length];

    const li = el("li", { class: "sueno-row", "data-search": `${num} ${name}`.toLowerCase() });
    const btn = el("button", {
      type: "button",
      class: "sueno-row__btn",
      "aria-label": `Sueño ${num} · ${name}`,
      "data-number": num,
    });

    const glyph = el("span", { class: "sueno-row__glyph" });
    glyph.appendChild(iconNode(glyphKey));

    const numEl  = el("span", { class: "sueno-row__num",  text: num });
    const nameEl = el("span", { class: "sueno-row__name", text: name });

    btn.append(glyph, numEl, nameEl);
    li.append(btn);
    frag.append(li);
  });
  table.replaceChildren(frag);
}

// Strip accents so "leon" finds "El león".
function stripAccents(s) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function wireSuenosFilter() {
  const grid    = document.getElementById("suenos-grid");
  const table   = document.getElementById("suenos-table");
  const input   = document.getElementById("suenos-q");
  const clear   = document.querySelector(".suenos__clear");
  const empty   = document.getElementById("suenos-empty");
  const secTwo  = document.getElementById("suenos-section-two");
  const secThree = document.getElementById("suenos-section-three");
  if (!grid || !table || !input || !clear || !empty || !secTwo || !secThree) return;

  function filterList(container, q) {
    let matched = 0;
    for (const li of container.children) {
      const hit = q === "" || stripAccents(li.dataset.search).includes(q);
      li.style.display = hit ? "" : "none";
      if (hit) matched++;
    }
    return matched;
  }

  function apply(raw) {
    const q = stripAccents(raw.trim());
    clear.hidden = raw.length === 0;
    const matchedTwo   = filterList(grid, q);
    const matchedThree = filterList(table, q);
    secTwo.classList.toggle("is-empty", matchedTwo === 0 && q !== "");
    secThree.classList.toggle("is-empty", matchedThree === 0 && q !== "");
    empty.hidden = !(matchedTwo === 0 && matchedThree === 0 && q !== "");
  }

  input.addEventListener("input", e => apply(e.target.value));
  clear.addEventListener("click", () => {
    input.value = "";
    apply("");
    input.focus();
  });
}

// ── NUMEROLOGÍA VIEW ─────────────────────────────────────────
// Render the catalogue of root numbers (0–9) and master numbers (11/22/33)
// as a grid of cards. Each card opens the existing numero dialog on tap,
// so the dialog stays the single source of truth for a number's reading.
function renderNumeroList() {
  const roots = document.getElementById("numero-list-roots");
  const masters = document.getElementById("numero-list-masters");
  if (!roots || !masters) return;

  const make = (n) => {
    const entry = NUMEROLOGY[n];
    const isMaster = (n === 11 || n === 22 || n === 33);

    const li = el("li", { class: "numero-cell" + (isMaster ? " numero-cell--master" : "") });
    const btn = el("button", {
      type: "button",
      class: "numero-cell__btn",
      "data-number": String(n),
      "aria-label": `Número ${n} · ${entry.title}`,
    });

    const sigil = el("span", { class: "numero-cell__sigil", text: String(n) });
    const head = el("div", { class: "numero-cell__head" },
      el("p", { class: "numero-cell__eyebrow",
        text: isMaster ? "Número maestro" : "Cifra raíz" }),
      el("h3", { class: "numero-cell__title",
        text: entry.title.replace(/\s*·\s*Maestro$/, "") }),
    );
    const keys = el("p", { class: "numero-cell__keywords", text: entry.keywords });
    const body = el("p", { class: "numero-cell__body", text: entry.body });

    btn.append(sigil, head, keys, body);
    li.append(btn);
    return li;
  };

  const rootsFrag = document.createDocumentFragment();
  for (let n = 0; n <= 9; n++) rootsFrag.append(make(n));
  roots.replaceChildren(rootsFrag);

  const mastersFrag = document.createDocumentFragment();
  for (const n of [11, 22, 33]) mastersFrag.append(make(n));
  masters.replaceChildren(mastersFrag);
}

// ── REDUCTOR · live numerology reduction ─────────────────────
// As the user types, walk the digit sum until we hit a root or a
// master. The chain is rendered verbatim ("1985 → 1+9+8+5 = 23 →
// 2+3 = 5") so the operation is its own teacher.
function digitSum(n) {
  return String(n).split("").reduce((s, d) => s + (+d), 0);
}
function reductionSteps(n) {
  if (!Number.isFinite(n) || n < 0) return null;
  const chain = [n];
  let cur = n;
  while (cur > 9) {
    if (cur === 11 || cur === 22 || cur === 33) break;
    cur = digitSum(cur);
    chain.push(cur);
  }
  return { chain, final: cur, isMaster: cur === 11 || cur === 22 || cur === 33 };
}

function wireReductor() {
  const input    = document.getElementById("reductor-input");
  const result   = document.getElementById("reductor-result");
  const chainEl  = document.getElementById("reductor-chain");
  const sigil    = document.getElementById("reductor-sigil");
  const nameEl   = document.getElementById("reductor-name");
  const keysEl   = document.getElementById("reductor-keywords");
  const bodyEl   = document.getElementById("reductor-body");
  const openBtn  = document.getElementById("reductor-open");
  if (!input || !result) return;

  function update() {
    // Strip everything that isn't a digit, then bound the typed length
    // so paste of an absurd integer doesn't blow up the chain.
    const raw = input.value.replace(/\D+/g, "").slice(0, 9);
    if (raw !== input.value) input.value = raw;

    if (!raw) { result.hidden = true; openBtn.dataset.number = ""; return; }

    const n = Number(raw);
    const r = reductionSteps(n);
    if (!r) { result.hidden = true; return; }

    // Build the chain "1985 → 1+9+8+5 = 23 → 2+3 = 5"
    const parts = [String(r.chain[0])];
    for (let i = 0; i < r.chain.length - 1; i++) {
      const v = r.chain[i];
      const next = r.chain[i + 1];
      const sumExpr = String(v).split("").join(" + ");
      parts.push(`${sumExpr} = ${next}`);
    }
    chainEl.textContent = parts.join("  →  ");

    const entry = NUMEROLOGY[r.final] ?? NUMEROLOGY[0];
    sigil.textContent = String(r.final);
    nameEl.textContent = entry.title;
    keysEl.textContent = entry.keywords;
    bodyEl.textContent = entry.body;
    result.hidden = false;
    result.dataset.master = r.isMaster ? "true" : "false";
    openBtn.dataset.number = String(r.final);
  }

  input.addEventListener("input", update);
  // Open the existing numero dialog for the reduced number — keeps the
  // dialog as the source of truth, including the jugada-add affordance.
  openBtn.addEventListener("click", () => {
    const n = Number(openBtn.dataset.number);
    if (Number.isFinite(n)) openNumero(n);
  });
}

// ── CHINESE NUMEROLOGY VIEW ──────────────────────────────────
function renderChinaList() {
  const root = document.getElementById("china-list");
  if (!root) return;
  const frag = document.createDocumentFragment();

  let lastValor = null;
  for (const entry of chinaEntries()) {
    if (entry.valor !== lastValor) {
      // Group header — separates positivo / neutral / negativo
      const header = el("li", { class: "china-divider", "aria-hidden": "true" },
        el("span", { class: `china-tag china-tag--${entry.valor}`,
          text: CHINA_VALOR_LABEL[entry.valor] }),
      );
      frag.append(header);
      lastValor = entry.valor;
    }

    const li = el("li", { class: "china-row", "data-valor": entry.valor });
    const btn = el("button", {
      type: "button",
      class: "china-row__btn",
      "data-number": String(entry.num),
      "aria-label": `Número ${entry.num} · ${CHINA_VALOR_LABEL[entry.valor]}`,
    });
    btn.append(
      el("span", { class: "china-row__num", text: String(entry.num) }),
      el("p",    { class: "china-row__body", text: entry.body }),
      el("span", { class: "china-row__chev", "aria-hidden": "true", text: "›" }),
    );
    li.append(btn);
    frag.append(li);
  }
  root.replaceChildren(frag);
}

// ── SEQUENCE · user's picked numbers, persisted in localStorage ──
const SEQUENCE_KEY = "auguria:sequence";
const MAX_SEQUENCE = 12;

// Numbers are stored as zero-padded strings ("05", "777") so the chip
// always renders the same width the user originally tapped.
function formatNumKey(n) {
  return n < 100 ? String(n).padStart(2, "0") : String(n);
}

function loadSequence() {
  try {
    const raw = localStorage.getItem(SEQUENCE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(s => typeof s === "string").slice(0, MAX_SEQUENCE);
  } catch { return []; }
}
function saveSequence() {
  try { localStorage.setItem(SEQUENCE_KEY, JSON.stringify(_sequence)); }
  catch { /* private mode / quota — best-effort */ }
}

let _sequence = loadSequence();

function addToSequence(numKey) {
  if (!numKey) return;
  if (_sequence.includes(numKey)) return;
  if (_sequence.length >= MAX_SEQUENCE) return;
  _sequence.push(numKey);
  saveSequence();
  renderSequence();
  // Auto-open the drawer so the user sees the pick land.
  setDrawerState("expanded");
}
function removeFromSequence(numKey) {
  const i = _sequence.indexOf(numKey);
  if (i < 0) return;
  _sequence.splice(i, 1);
  saveSequence();
  renderSequence();
}
function clearSequence() {
  if (_sequence.length === 0) return;
  _sequence = [];
  saveSequence();
  renderSequence();
}

// ── Confirmation dialog ──────────────────────────────────────
const confirmDlg    = document.getElementById("confirm-dialog");
const confirmTitle  = document.getElementById("confirm-title");
const confirmBody   = document.getElementById("confirm-body");
const confirmAccept = confirmDlg?.querySelector("[data-confirm-accept]");
const confirmCancel = confirmDlg?.querySelector("[data-confirm-cancel]");

let _confirmResolver = null;
function askConfirm({ title, body, confirmLabel = "Borrar" }) {
  return new Promise(resolve => {
    if (!confirmDlg) { resolve(true); return; }
    confirmTitle.textContent = title;
    confirmBody.textContent = body || "";
    confirmBody.hidden = !body;
    confirmAccept.textContent = confirmLabel;
    _confirmResolver = resolve;
    if (typeof confirmDlg.showModal === "function") confirmDlg.showModal();
    else confirmDlg.setAttribute("open", "");
  });
}
function settleConfirm(value) {
  if (_confirmResolver) { _confirmResolver(value); _confirmResolver = null; }
  if (confirmDlg.open) confirmDlg.close();
}
confirmAccept?.addEventListener("click", () => settleConfirm(true));
confirmCancel?.addEventListener("click", () => settleConfirm(false));
confirmDlg?.addEventListener("close", () => { if (_confirmResolver) { _confirmResolver(false); _confirmResolver = null; } });
confirmDlg?.addEventListener("click", (ev) => { if (ev.target === confirmDlg) settleConfirm(false); });

// Confirmation wrappers — user-facing destructive actions go through these.
async function confirmedClearSequence() {
  if (_sequence.length === 0) return;
  const n = _sequence.length;
  const ok = await askConfirm({
    title: "¿Borrar mi jugada?",
    body: n === 1
      ? "La cifra elegida se perderá."
      : `Las ${n} cifras elegidas se perderán.`,
    confirmLabel: "Borrar",
  });
  if (ok) clearSequence();
}
async function confirmedRemoveFromSequence(numKey) {
  if (!_sequence.includes(numKey)) return;
  const ok = await askConfirm({
    title: `¿Quitar ${numKey} de mi jugada?`,
    body: "Puedes volver a agregarla cuando quieras.",
    confirmLabel: "Quitar",
  });
  if (ok) removeFromSequence(numKey);
}

const chipXMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2 L10 10 M10 2 L2 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

// Roman numerals for the chip ordinals (sequence positions I–XII).
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function renderSequence() {
  const has = _sequence.length > 0;
  document.body.toggleAttribute("data-has-sequence", has);

  const targets = document.querySelectorAll("[data-sequence-target]");
  for (const target of targets) {
    const isDrawer = target.classList.contains("seq-drawer");

    // The drawer stays in the DOM at all times (sticky); other targets
    // (the home jugada card) only show when there is at least one pick.
    target.hidden = !has && !isDrawer;

    const countEls = target.querySelectorAll(".sequence__count");
    countEls.forEach(el => {
      el.textContent = has ? `${_sequence.length} de ${MAX_SEQUENCE}` : "vacía";
    });

    const listEl = target.querySelector(".sequence__list");
    if (listEl) {
      const frag = document.createDocumentFragment();
      _sequence.forEach((num, i) => {
        const li = el("li", { class: "seq-chip" });

        const ordinal = el("span", {
          class: "seq-chip__ordinal",
          "aria-hidden": "true",
          text: ROMAN[i + 1] || String(i + 1),
        });

        const numBtn = el("button", {
          type: "button",
          class: "seq-chip__num",
          "data-number": num,
          "data-len": String(num.length),
          "aria-label": `Cifra ${num} · ver lectura`,
          text: num,
        });

        const xBtn = el("button", {
          type: "button",
          class: "seq-chip__remove",
          "data-remove-number": num,
          "aria-label": `Quitar ${num} de mi jugada`,
        });
        xBtn.appendChild(svgNode(chipXMarkup));

        li.append(ordinal, numBtn, xBtn);
        frag.append(li);
      });
      listEl.replaceChildren(frag);
    }
  }

  // When the jugada empties out, collapse the drawer to give the dreams
  // table back its full screen space.
  if (!has) setDrawerState("collapsed");

  refreshDlgAdd();
}

// Sync the dialog's action button to the current number + jugada state.
function refreshDlgAdd() {
  if (!dlgAdd) return;
  const numKey = dlgAdd.dataset.number;
  if (!numKey) {
    dlgAdd.hidden = true;
    return;
  }
  dlgAdd.hidden = false;
  if (_sequence.includes(numKey)) {
    dlgAdd.textContent = "Quitar de mi jugada";
    dlgAdd.dataset.action = "remove";
    dlgAdd.disabled = false;
  } else if (_sequence.length >= MAX_SEQUENCE) {
    dlgAdd.textContent = `Jugada completa · ${MAX_SEQUENCE}`;
    dlgAdd.dataset.action = "";
    dlgAdd.disabled = true;
  } else {
    dlgAdd.textContent = "Agregar a mi jugada";
    dlgAdd.dataset.action = "add";
    dlgAdd.disabled = false;
  }
}

// ── DRAWER state (dreams view) ───────────────────────────────
function setDrawerState(state /* "expanded" | "collapsed" */) {
  const drawer = document.querySelector(".seq-drawer");
  if (!drawer) return;
  drawer.dataset.state = state;
  drawer.querySelector(".seq-drawer__toggle")?.setAttribute(
    "aria-expanded", state === "expanded" ? "true" : "false"
  );
  document.body.dataset.drawerState = state;
}
function toggleDrawer() {
  const drawer = document.querySelector(".seq-drawer");
  if (!drawer) return;
  setDrawerState(drawer.dataset.state === "expanded" ? "collapsed" : "expanded");
}

// ── HASH ROUTER ──────────────────────────────────────────────
// Set to true after the initial syncRoute() during boot, so that the
// view-entrance animation only runs on actual navigation — never on
// first paint (which has its own masthead/card choreography) and never
// on in-view actions like adding or removing a number.
let _routeBooted = false;
function syncRoute() {
  let view = "home";
  if      (location.hash === "#/dreams")       view = "dreams";
  else if (location.hash === "#/vision")       view = "vision";
  else if (location.hash === "#/numerologia")  view = "numerologia";
  else if (location.hash === "#/china")        view = "china";
  document.body.dataset.activeView = view;
  // Reset scroll when switching views — the views are independently long.
  window.scrollTo({ top: 0, behavior: "instant" });

  if (_routeBooted) {
    const activeEl = document.querySelector(`[data-view="${view}"]`);
    if (activeEl) {
      // Re-trigger the entrance animation: drop class, force a reflow,
      // re-add. Required because CSS animations don't restart on class
      // re-addition without a layout pass between.
      activeEl.classList.remove("is-entering");
      void activeEl.offsetWidth;
      activeEl.classList.add("is-entering");
    }
  }
  _routeBooted = true;

  if (view === "vision") playVisionAnimation();
}
window.addEventListener("hashchange", syncRoute);

// ── ALMANAQUE · date list + ribbon ──────────────────────────
// A modal listing 7 days (2 back · today · 4 forward). Tapping
// a day commits + closes.
const CALENDAR_WEEKDAY_LONG = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

function calendarWeekdayIndex(key) {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "short",
  }).format(dateFromKey(key));
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(wd);
}

// Build the 7-day window anchored on today: 2 days back, 4 days forward.
function buildCalendarDates() {
  const base = dateFromKey(todayKey());
  const out = [];
  for (let offset = -2; offset <= 4; offset++) {
    const d = new Date(base.getTime() + offset * 86400000);
    const key = madridKey(d);
    const [, mo, da] = key.split("-").map(Number);
    out.push({
      key, day: da, month: mo, offset,
      weekday: calendarWeekdayIndex(key),
    });
  }
  return out;
}

const calendarDialog   = document.getElementById("calendar-dialog");
const calendarList     = document.getElementById("calendar-list");
const calendarCloseBtn = calendarDialog?.querySelector("[data-close]");
const dateBadge     = document.getElementById("dateline");
const dateBadgeText = document.getElementById("dateline-text");
const dateRibbon    = document.getElementById("date-ribbon");
const dateRibbonDate= document.getElementById("date-ribbon-date");
const dateRibbonReturn = document.getElementById("date-ribbon-return");

const _calendarDayNodes = new Map(); // key → row button

function buildCalendar() {
  if (!calendarList) return;
  const dates = buildCalendarDates();
  const tKey = todayKey();

  _calendarDayNodes.clear();
  const frag = document.createDocumentFragment();

  for (const d of dates) {
    const isToday    = d.key === tKey;
    const isSelected = d.key === _selectedDate;

    const li = el("li", {
      class: "calendar-row"
        + (isToday    ? " calendar-row--today"    : "")
        + (isSelected ? " calendar-row--selected" : ""),
      role: "option",
      "aria-selected": isSelected ? "true" : "false",
    });

    const btn = el("button", {
      type: "button",
      class: "calendar-row__btn",
      "data-key": d.key,
      "aria-label": isToday
        ? `${CALENDAR_WEEKDAY_LONG[d.weekday]} ${d.day} (hoy)`
        : `${CALENDAR_WEEKDAY_LONG[d.weekday]} ${d.day}`,
    });

    btn.append(
      el("span", { class: "calendar-row__num",  text: String(d.day) }),
      el("span", { class: "calendar-row__name" },
        CALENDAR_WEEKDAY_LONG[d.weekday],
        isToday ? el("span", { class: "calendar-row__today", text: "(hoy)" }) : null,
      ),
    );

    btn.addEventListener("click", () => commitSelectedDate(d.key));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); calendarNudge(+1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); calendarNudge(-1); }
    });

    li.append(btn);
    frag.append(li);
    _calendarDayNodes.set(d.key, btn);
  }

  calendarList.replaceChildren(frag);
}

function calendarNudge(delta) {
  const dates = buildCalendarDates();
  const focused = document.activeElement?.closest?.(".calendar-row__btn")?.dataset?.key;
  const anchor = focused || _selectedDate;
  const idx = dates.findIndex(d => d.key === anchor);
  const next = dates[Math.max(0, Math.min(dates.length - 1, idx + delta))];
  _calendarDayNodes.get(next?.key)?.focus();
}

function commitSelectedDate(key) {
  _selectedDate = key;
  const t = todayKey();
  const offDay = key !== t;

  // Refresh date badge label.
  if (dateBadgeText) dateBadgeText.textContent = spanishDateLine(key);

  // Toggle ribbon + body flag.
  document.body.toggleAttribute("data-off-day", offDay);
  if (dateRibbon) dateRibbon.dataset.visible = offDay ? "true" : "false";
  if (dateRibbonDate) dateRibbonDate.textContent = offDay ? spanishDateLine(key) : "";

  // Re-render the lottery cards with the new seed.
  renderGames();
  // renderGames() rebuilds the jugada card hidden; restore its visibility.
  renderSequence();

  // Close the modal if it's open.
  if (calendarDialog?.open) calendarDialog.close();
}

function openCalendar() {
  if (!calendarDialog) return;
  buildCalendar();
  if (typeof calendarDialog.showModal === "function") calendarDialog.showModal();
  else calendarDialog.setAttribute("open", "");
  // Focus the currently selected day so arrow keys feel natural.
  requestAnimationFrame(() => _calendarDayNodes.get(_selectedDate)?.focus());
}

dateBadge?.addEventListener("click", openCalendar);
calendarCloseBtn?.addEventListener("click", () => calendarDialog.close());
calendarDialog?.addEventListener("click", (e) => {
  // Click on the backdrop (the dialog element itself) closes.
  if (e.target === calendarDialog) calendarDialog.close();
});
dateRibbonReturn?.addEventListener("click", () => commitSelectedDate(todayKey()));

function enterVision() {
  if (location.hash !== "#/vision") {
    location.hash = "#/vision";
  } else {
    playVisionAnimation();
  }
}

// ── EASTER-EGG · masthead triple-tap → vision ────────────────
const MASTHEAD_TAP_WINDOW = 500; // ms
let _mastheadTaps = 0;
let _mastheadTimer = null;
document.querySelector(".masthead__title")?.addEventListener("click", () => {
  _mastheadTaps += 1;
  if (_mastheadTimer) clearTimeout(_mastheadTimer);
  _mastheadTimer = setTimeout(() => { _mastheadTaps = 0; }, MASTHEAD_TAP_WINDOW);
  if (_mastheadTaps >= 3) {
    _mastheadTaps = 0;
    clearTimeout(_mastheadTimer);
    enterVision();
  }
});

// ── BOOT ─────────────────────────────────────────────────────
document.getElementById("dateline-text").textContent = spanishDateLine();
renderGames();
renderSuenosTwo();
renderSuenosThree();
wireSuenosFilter();
renderNumeroList();
wireReductor();
renderChinaList();
renderSequence();
// Sync the body's drawer-state attribute to the drawer's HTML default so
// the bottom-clearance CSS variable resolves correctly on first paint.
document.body.dataset.drawerState =
  document.querySelector(".seq-drawer")?.dataset.state || "expanded";
syncRoute();

// ── COSMOS AMBIENT MOTION ────────────────────────────────────
// Shooting star — a single .cosmos__comet element gets nudged around
// the viewport and re-triggered at random intervals.
(function wireCosmos() {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const comet = document.querySelector(".cosmos__comet");
  if (!comet) return;

  // Comets enter from somewhere off the top of the viewport and travel
  // diagonally toward the opposite lower quadrant. Randomising the
  // entry side and slope keeps each one feeling unrepeated.
  function spawnComet() {
    if (reduceMotion.matches) return;
    if (document.hidden) return;

    const w = innerWidth, h = innerHeight;
    const fromRight = Math.random() < 0.5;
    let fromX, fromY, toX, toY;
    if (fromRight) {
      fromX = w * (0.55 + Math.random() * 0.45) + 80;
      fromY = -80;
      toX   = w * (Math.random() * 0.4) - 60;
      toY   = h * (0.35 + Math.random() * 0.45);
    } else {
      fromX = -80;
      fromY = h * (Math.random() * 0.25);
      toX   = w * (0.55 + Math.random() * 0.45);
      toY   = h * (0.4  + Math.random() * 0.45);
    }
    const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;

    comet.style.setProperty("--comet-from-x", `${fromX}px`);
    comet.style.setProperty("--comet-from-y", `${fromY}px`);
    comet.style.setProperty("--comet-to-x",   `${toX}px`);
    comet.style.setProperty("--comet-to-y",   `${toY}px`);
    comet.style.setProperty("--comet-angle",  `${angle}deg`);

    // Re-trigger the animation: pull the class, force a reflow, re-add.
    comet.classList.remove("is-streaking");
    void comet.offsetWidth;
    comet.classList.add("is-streaking");
  }

  function scheduleNextComet() {
    // 30–90s between streaks; rare enough that it always feels like
    // an omen, never wallpaper.
    const delay = 30000 + Math.random() * 60000;
    setTimeout(() => { spawnComet(); scheduleNextComet(); }, delay);
  }
  // First streak fires sooner so the user might catch one early.
  setTimeout(() => { spawnComet(); scheduleNextComet(); }, 8000 + Math.random() * 12000);
})();

// ── PWA ──────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// ── BUILD STAMP ──────────────────────────────────────────────
// Tiny version label in the bottom-right corner so we can identify
// which build is running inside an installed PWA. Source-of-truth is
// the SW's VERSION constant; we postMessage to ask, and fall back to
// parsing sw.js as text if there's no active SW yet (first install).
(async function showAppVersion() {
  const node = document.getElementById("app-version");
  if (!node) return;

  let version = null;
  try {
    const reg = await navigator.serviceWorker?.ready;
    const sw = reg?.active;
    if (sw) {
      version = await new Promise((resolve) => {
        const channel = new MessageChannel();
        const timeout = setTimeout(() => resolve(null), 1000);
        channel.port1.onmessage = (ev) => {
          clearTimeout(timeout);
          resolve(ev.data?.version ?? null);
        };
        sw.postMessage({ type: "GET_VERSION" }, [channel.port2]);
      });
    }
  } catch { /* fall through to fetch fallback */ }

  if (!version) {
    try {
      const res = await fetch("sw.js");
      const text = await res.text();
      version = text.match(/VERSION\s*=\s*["']([^"']+)["']/)?.[1] ?? null;
    } catch { /* nothing more we can do */ }
  }

  if (version) node.textContent = version;
})();

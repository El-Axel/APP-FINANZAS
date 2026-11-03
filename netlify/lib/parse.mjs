// Utilidades compartidas entre la app (public/index.html) y la función de WhatsApp.
//
// El bloque entre PARSER:START y PARSER:END es el MISMO código que lleva index.html
// (se copia con tools/inject-parser.mjs). Si lo cambias aquí, vuelve a inyectarlo.

// PARSER:START
const CATEGORY_WORDS = {
  Comida: ['almuerzo','cena','desayuno','comida','mercado','restaurante','pizza','hamburguesa','cafe','domicilio','rappi','snack','postre','helado','empanada','pan','panaderia','jugo','fruta','verdura','carne','pollo','super','supermercado','exito','d1','tienda','galleta','onces','mecato','gaseosa','arepa','sopa','corrientazo','menu','bandeja','tinto'],
  Transporte: ['taxi','uber','didi','cabify','indrive','bus','buseta','metro','transmilenio','mio','gasolina','tanqueo','peaje','parqueadero','pasaje','moto','cicla','combustible','soat'],
  Ocio: ['cine','netflix','spotify','fiesta','trago','cerveza','licor','bar','concierto','juego','videojuego','salida','parque','viaje','paseo','boleta','discoteca','karaoke'],
  Salud: ['farmacia','droga','drogueria','medicina','medicamento','doctor','medico','cita','odontologo','dentista','examen','laboratorio','gimnasio','gym','terapia','psicologo','vitamina','optica','gafas'],
  Hogar: ['aseo','ferreteria','mueble','arreglo','plomero','luz','agua','gas','lavanderia','detergente','cocina','bombillo','casa','hogar','reparacion','electrodomestico','decoracion']
};
const FILLER_WORDS = ['gaste','pague','compre','pago','fueron','fue','me','costo','cuesta','en','de','por','un','una','el','la','los','las','mi','mis','hoy'];

function stripAccents(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function detectCategory(desc) {
  const tokens = stripAccents(String(desc).toLowerCase()).split(/[^a-z0-9]+/).filter(Boolean);
  let best = 'Otro';
  let bestHits = 0;
  for (const [cat, words] of Object.entries(CATEGORY_WORDS)) {
    let hits = 0;
    for (const t of tokens) {
      const forms = [t, t.replace(/s$/, ''), t.replace(/es$/, '')];
      if (forms.some((f) => words.includes(f))) hits++;
    }
    if (hits > bestHits) { bestHits = hits; best = cat; }
  }
  return best;
}

// Entiende cosas como: "almuerzo 25000", "uber 18k", "gasté 45 mil en mercado",
// "arriendo 1.500.000", "pagué 1,5 millones", "2 cafés 8000".
function parseExpense(text) {
  const src = String(text || '').replace(/\s+/g, ' ').trim();
  if (!src) return { ok: false, reason: 'empty' };

  const re = /(\$\s*)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)(?:\s*(k|mil|lucas?|palos?|mill[oó]n(?:es)?)\b)?/gi;
  let best = null;
  let m;
  while ((m = re.exec(src))) {
    const raw = m[2];
    const suffix = (m[3] || '').toLowerCase();
    let n = /^\d{1,3}(?:[.,]\d{3})+$/.test(raw)
      ? parseFloat(raw.replace(/[.,]/g, ''))
      : parseFloat(raw.replace(',', '.'));
    // Ojo con el orden: "mil" es prefijo de "millones", así que los millones se revisan primero.
    if (/^(palo|mill)/.test(suffix)) n *= 1000000;
    else if (/^(k|mil|luca)/.test(suffix)) n *= 1000;
    if (!isFinite(n) || n <= 0) continue;
    // Si hay varios números ("2 cafés 8000") nos quedamos con el más grande.
    if (!best || n > best.n) best = { n: Math.round(n), start: m.index, end: m.index + m[0].length };
  }
  if (!best) return { ok: false, reason: 'no-amount' };

  let desc = (src.slice(0, best.start) + ' ' + src.slice(best.end))
    .replace(/\b(cop|pesos?)\b/gi, ' ')
    .replace(/\$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = desc.split(' ').filter(Boolean);
  while (words.length && FILLER_WORDS.includes(stripAccents(words[0].toLowerCase()).replace(/[^a-z]/g, ''))) words.shift();
  while (words.length && /^(en|de|por|y|con)$/i.test(words[words.length - 1])) words.pop();
  desc = words.join(' ').replace(/^[\s,.\-:;]+|[\s,.\-:;]+$/g, '');
  if (!desc) desc = 'Gasto';
  desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  if (desc.length > 80) desc = desc.slice(0, 80).trim();

  return { ok: true, desc, amount: best.n, cat: detectCategory(desc) };
}
// PARSER:END

export { parseExpense, detectCategory };

export function formatCOP(n) {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '−' : '') + '$' + new Intl.NumberFormat('es-CO', { useGrouping: 'always' }).format(Math.abs(v));
}

// Clave de mes (YYYY-MM) según la hora de Colombia, sin depender de la zona del servidor.
export function monthKeyBogota(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(0, 7);
}

export function summarizeMonth(data, key) {
  const sum = (a) => (a || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const m =
    (data && data.months && data.months[key]) ||
    { income: [], fixed: ((data && data.fixedTemplate) || []).map((f) => ({ ...f, paid: false })), variable: [], savings: [] };
  const pending = [...(m.fixed || []), ...(m.variable || []), ...(m.savings || [])].filter((x) => !x.paid);
  const income = sum(m.income);
  const fixed = sum(m.fixed);
  const variable = sum(m.variable);
  const savings = sum(m.savings);
  return {
    income, fixed, variable, savings,
    remaining: income - fixed - variable - savings,
    pendingCount: pending.length,
    pendingTotal: sum(pending)
  };
}

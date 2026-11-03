// Recibe los mensajes de WhatsApp (Cloud API de Meta), entiende "almuerzo 25000"
// y lo deja en la bandeja de tu cuenta. La app lo pasa a "Gastos variables" como pagado.
//
// Variables de entorno (Netlify → Site configuration → Environment variables):
//   WHATSAPP_VERIFY_TOKEN     frase que tú inventas; la pegas también en Meta al registrar el webhook
//   WHATSAPP_APP_SECRET       "App secret" de tu app en Meta (para comprobar que el mensaje viene de Meta)
//   WHATSAPP_TOKEN            token de acceso (permanente) de la API de WhatsApp
//   WHATSAPP_PHONE_ID         "Phone number ID" del número de WhatsApp Business
//   ALLOWED_PHONE             tu número personal, solo dígitos con indicativo (ej. 573001234567)
//   OWNER_UID                 tu UID de Firebase (Authentication → Users)
//   FIREBASE_SERVICE_ACCOUNT  el JSON completo de la cuenta de servicio de Firebase
//   WHATSAPP_GRAPH_VERSION    (opcional) versión de la API de Meta; por defecto v23.0

import crypto from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { parseExpense, formatCOP, monthKeyBogota, summarizeMonth } from '../lib/parse.mjs';

const env = process.env;
const GRAPH = env.WHATSAPP_GRAPH_VERSION || 'v23.0';

function db() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  return getFirestore();
}

// Comprueba la firma que Meta pone en cada mensaje. Si no hay secreto configurado, se rechaza todo (falla cerrado).
function validSignature(raw, header) {
  if (!env.WHATSAPP_APP_SECRET || !header || !header.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', env.WHATSAPP_APP_SECRET).update(raw).digest('hex');
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function reply(to, body) {
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH}/${env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, text: { body } })
    });
    if (!res.ok) console.error('No se pudo responder', res.status, await res.text());
  } catch (e) {
    console.error('Error al responder', e);
  }
}

const HELP =
  'Escríbeme lo que gastaste y lo anoto como pagado:\n' +
  '• almuerzo 25000\n• uber 18k\n• mercado 85 mil\n• farmacia 23.500\n\n' +
  'Otros comandos: *resumen* (cuánto te queda este mes).';

async function handleMessage(msg, contacts) {
  // Meta a veces no manda 'from' (números con usuario de WhatsApp); probamos con el wa_id del contacto.
  const c0 = (contacts && contacts[0]) || {};
  if (!msg.from) msg.from = String(c0.wa_id || '');
  if (!msg.from) console.warn('Mensaje sin from. Campos del mensaje: ' + Object.keys(msg).join(',') + ' | campos del contacto: ' + Object.keys(c0).join(','));
  // Solo atendemos TU número. Cualquier otro se ignora en silencio.
  if (!env.ALLOWED_PHONE || msg.from !== env.ALLOWED_PHONE) {
    console.warn('Mensaje ignorado: el número no coincide con ALLOWED_PHONE. Llegó desde ...' + String(msg.from || '').slice(-4) + ' (largo ' + String(msg.from || '').length + '), ALLOWED_PHONE tiene largo ' + String(env.ALLOWED_PHONE || '').length);
    return;
  }
  if (msg.type !== 'text' || !msg.text || !msg.text.body) {
    await reply(msg.from, 'Por ahora solo entiendo mensajes de texto. Escribe, por ejemplo: almuerzo 25000');
    return;
  }

  const text = msg.text.body.trim();
  const word = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z?]/g, '');

  if (['ayuda', 'help', '?', 'hola', 'menu'].includes(word)) {
    await reply(msg.from, HELP);
    return;
  }

  if (['resumen', 'saldo', 'cuantomequeda'].includes(word)) {
    const snap = await db().collection('users').doc(env.OWNER_UID).collection('state').doc('main').get();
    let data = {};
    try { data = snap.exists ? JSON.parse(snap.data().json) : {}; } catch (e) { /* vacío */ }
    const key = monthKeyBogota();
    const s = summarizeMonth(data, key);
    await reply(
      msg.from,
      `Resumen de ${key}\n` +
        `Ingresos: ${formatCOP(s.income)}\n` +
        `Fijos: ${formatCOP(s.fixed)}\n` +
        `Variables: ${formatCOP(s.variable)}\n` +
        `Ahorro: ${formatCOP(s.savings)}\n` +
        `*Te quedan: ${formatCOP(s.remaining)}*\n` +
        (s.pendingCount ? `Por pagar: ${formatCOP(s.pendingTotal)} (${s.pendingCount})` : 'Todo al día ✅')
    );
    return;
  }

  const r = parseExpense(text);
  if (!r.ok) {
    await reply(msg.from, 'No encontré el monto 🤔 Escríbelo así: almuerzo 25000');
    return;
  }

  // El id del mensaje de WhatsApp sirve de id del gasto: si Meta reintenta el envío, no se duplica.
  await db()
    .collection('users').doc(env.OWNER_UID).collection('inbox').doc(msg.id)
    .set({
      desc: r.desc,
      amount: r.amount,
      cat: r.cat,
      monthKey: monthKeyBogota(),
      paid: true,
      source: 'whatsapp',
      raw: text.slice(0, 200),
      createdAt: FieldValue.serverTimestamp()
    });

  await reply(msg.from, `✅ Anotado: ${r.desc} · ${formatCOP(r.amount)} · ${r.cat} (pagado)`);
}

export default async (req) => {
  const url = new URL(req.url);

  // Meta llama con GET una sola vez para comprobar que el webhook es tuyo.
  if (req.method === 'GET') {
    const ok =
      env.WHATSAPP_VERIFY_TOKEN &&
      url.searchParams.get('hub.mode') === 'subscribe' &&
      url.searchParams.get('hub.verify_token') === env.WHATSAPP_VERIFY_TOKEN;
    return ok ? new Response(url.searchParams.get('hub.challenge'), { status: 200 }) : new Response('Forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-hub-signature-256'))) {
    console.warn('Firma inválida: revisa que WHATSAPP_APP_SECRET sea el App secret actual de Meta. Secreto configurado: ' + (env.WHATSAPP_APP_SECRET ? 'sí' : 'NO'));
    return new Response('Bad signature', { status: 401 });
  }

  let body;
  try { body = JSON.parse(raw); } catch (e) { return new Response('Bad request', { status: 400 }); }

  const values = (body.entry || []).flatMap((e) => (e.changes || []).map((c) => c.value || {}));
  const total = values.reduce((n, v) => n + (v.messages || []).length, 0);
  console.log('Webhook recibido con ' + total + ' mensaje(s)');
  for (const v of values) {
    for (const msg of v.messages || []) {
      try { await handleMessage(msg, v.contacts); } catch (e) { console.error('Error con un mensaje', e); }
    }
  }
  return new Response('ok', { status: 200 });
};

export const config = { path: '/api/whatsapp' };

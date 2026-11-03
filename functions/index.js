// PrefabrikTeklif sunucu tarafı (Firebase Cloud Functions v2)
// Uç noktalar Hosting üzerinden /api/** ile çağrılır (firebase.json rewrites). İş kuralları app.js'te.
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';
import { createApp, teklifOzetleri, fiyatKontrolu } from './app.js';

initializeApp();
const db = getFirestore();
const REGION = 'europe-west1';

const SMTP_PASS = defineSecret('SMTP_PASS');
const PLACES_API_KEY = defineSecret('PLACES_API_KEY');
const SMTP_HOST = defineString('SMTP_HOST', { default: 'oden.veridyen.com' });
const SMTP_PORT = defineString('SMTP_PORT', { default: '465' });
const SMTP_USER = defineString('SMTP_USER', { default: '' });
const MAIL_FROM = defineString('MAIL_FROM', { default: '' });
const ADMIN_EMAIL = defineString('ADMIN_EMAIL', { default: 'prefabrikteklif@gmail.com' });
const YONETICILER = defineString('YONETICILER', { default: 'prefabrikteklif@gmail.com,info@mitraajans.com,yusuf4461@gmail.com' });
const SITE_URL = defineString('SITE_URL', { default: 'https://www.prefabrikteklif.com.tr' });

const FIRMS = JSON.parse(readFileSync(new URL('./firms.json', import.meta.url), 'utf8'));
const MODELS = JSON.parse(readFileSync(new URL('./models.json', import.meta.url), 'utf8'));

let _tx;
// HTML'den düz metin sürümü (spam filtreleri yalnızca HTML içeren e-postaları sevmez)
const duzMetin = (html) => html.replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, '$2 ($1)').replace(/<\/(p|h2|tr|div)>/g, '\n').replace(/<br\s*\/?>/g, '\n').replace(/<td[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
async function mail(to, subject, html, o = {}) {
  const pass = SMTP_PASS.value() || '';
  if (!to || !SMTP_USER.value() || pass.length < 2) { console.warn('E-posta ayarı eksik, gönderilmedi:', subject); return; }
  if (!_tx) _tx = nodemailer.createTransport({ host: SMTP_HOST.value(), port: Number(SMTP_PORT.value()), secure: Number(SMTP_PORT.value()) === 465, auth: { user: SMTP_USER.value(), pass } });
  // E-posta bildirim amaçlıdır: gönderilemezse ziyaretçinin işlemi asla hata vermez; kayıt yönetim panelinde görünür.
  try {
    const from = MAIL_FROM.value() || SMTP_USER.value();
    const yanit = ADMIN_EMAIL.value() || SMTP_USER.value();
    const headers = { 'X-Entity-Ref-ID': `pt-${Date.now()}` };
    if (o.iptal || o.tur === 'davet') headers['List-Unsubscribe'] = `<mailto:${yanit}?subject=bildirim-iptal>${o.iptal ? `, <${o.iptal}>` : ''}`;
    await _tx.sendMail({ from, to, subject: String(subject).replace(/[\r\n]+/g, ' ').slice(0, 200), html, text: duzMetin(html), replyTo: yanit, headers });
    db.collection('sistem').doc('eposta').set({ sonBasari: FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
  } catch (e) {
    console.error('E-posta gönderilemedi:', subject, e?.code || '', e?.message || e);
    if (e?.code === 'EAUTH') _tx = undefined;
    await db.collection('epostaHatalari').add({ to: String(to).slice(0, 200), konu: String(subject).slice(0, 200), hata: String(e?.response || e?.message || e).slice(0, 300), kod: e?.code || '', zaman: FieldValue.serverTimestamp() }).catch(() => {});
  }
}
const ayar = () => ({
  site: SITE_URL.value(), admin: ADMIN_EMAIL.value(), placesKey: PLACES_API_KEY.value() || '',
  yoneticiler: [...new Set([...YONETICILER.value().split(','), ADMIN_EMAIL.value()].map((s) => s.trim().toLowerCase()).filter(Boolean))],
});
const ortak = { db, mail, ayar, FieldValue, Timestamp, FIRMS, MODELS };
let _app;
const app = () => (_app ||= createApp({ ...ortak, auth: getAuth() }));

export const api = onRequest({ region: REGION, secrets: [SMTP_PASS, PLACES_API_KEY], memory: '512MiB', minInstances: 1, maxInstances: 10, concurrency: 40, timeoutSeconds: 120 }, (req, res) => app().handle(req, res));

export const teklifOzeti = onSchedule({ schedule: 'every 30 minutes', region: REGION, timeZone: 'Europe/Istanbul', secrets: [SMTP_PASS] }, async () => {
  await teklifOzetleri(ortak);
});

// Her ayın 1'i saat 17.00 (İstanbul): firma sitelerindeki fiyatları kontrol et, değişenleri onaya düşür
export const fiyatKontrol = onSchedule({ schedule: '0 17 1 * *', region: REGION, timeZone: 'Europe/Istanbul', secrets: [SMTP_PASS], timeoutSeconds: 540, memory: '1GiB' }, async () => {
  const r = await fiyatKontrolu(ortak);
  console.log('Fiyat kontrolü', r);
});

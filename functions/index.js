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
// Firmaların/müşterilerin "yanıtla" dediğinde gideceği adres (boşsa ADMIN_EMAIL)
const MAIL_REPLY = defineString('MAIL_REPLY', { default: '' });
const ADMIN_EMAIL = defineString('ADMIN_EMAIL', { default: 'prefabrikteklif@gmail.com' });
const YONETICILER = defineString('YONETICILER', { default: 'prefabrikteklif@gmail.com,info@mitraajans.com,yusuf4461@gmail.com' });
const SITE_URL = defineString('SITE_URL', { default: 'https://www.prefabrikteklif.com.tr' });
// iyzico: anahtarlar functions/.env dosyasında (GUNCELLE, ~/.prefabrik-iyzico dosyasından ekler). Boşsa kartlı ödeme kapalı kalır.
const IYZICO_API_KEY = defineString('IYZICO_API_KEY', { default: '' });
const IYZICO_SECRET_KEY = defineString('IYZICO_SECRET_KEY', { default: '' });
const IYZICO_BASE = defineString('IYZICO_BASE', { default: 'https://api.iyzipay.com' });
const IYZICO_PLAN = defineString('IYZICO_PLAN', { default: '' });
// SMS (telefonla giriş): İleti Merkezi; bilgiler functions/.env dosyasında (GUNCELLE, ~/.prefabrik-sms dosyasından ekler). Boşsa Firebase SMS kullanılır.
const ILETIMERKEZI_KEY = defineString('ILETIMERKEZI_KEY', { default: '' });
const ILETIMERKEZI_HASH = defineString('ILETIMERKEZI_HASH', { default: '' });
const ILETIMERKEZI_BASLIK = defineString('ILETIMERKEZI_BASLIK', { default: '' });
// Yedek: Netgsm OTP SMS (telefonla giriş): bilgiler functions/.env dosyasında (GUNCELLE, ~/.prefabrik-netgsm dosyasından ekler). Boşsa Firebase SMS kullanılır.
const NETGSM_KULLANICI = defineString('NETGSM_KULLANICI', { default: '' });
const NETGSM_SIFRE = defineString('NETGSM_SIFRE', { default: '' });
const NETGSM_BASLIK = defineString('NETGSM_BASLIK', { default: '' });
const NETGSM_APPKEY = defineString('NETGSM_APPKEY', { default: '' });

const FIRMS = JSON.parse(readFileSync(new URL('./firms.json', import.meta.url), 'utf8'));
const MODELS = JSON.parse(readFileSync(new URL('./models.json', import.meta.url), 'utf8'));

let _tx;
// HTML'den düz metin sürümü (spam filtreleri yalnızca HTML içeren e-postaları sevmez)
const duzMetin = (html) => html.replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, '$2 ($1)').replace(/<\/(p|h2|tr|div)>/g, '\n').replace(/<br\s*\/?>/g, '\n').replace(/<td[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
async function mail(to, subject, html, o = {}) {
  const pass = SMTP_PASS.value() || '';
  if (!to || !SMTP_USER.value() || pass.length < 2) { console.warn('E-posta ayarı eksik, gönderilmedi:', subject); return; }
  // Havuz: aynı anda en fazla 3 SMTP bağlantısı (Gmail çok sayıda eş zamanlı bağlantıda 421 4.3.0 ile geri çeviriyor)
  if (!_tx) _tx = nodemailer.createTransport({ host: SMTP_HOST.value(), port: Number(SMTP_PORT.value()), secure: Number(SMTP_PORT.value()) === 465, auth: { user: SMTP_USER.value(), pass }, pool: true, maxConnections: 3, maxMessages: 50 });
  // E-posta bildirim amaçlıdır: gönderilemezse ziyaretçinin işlemi asla hata vermez; kayıt yönetim panelinde görünür.
  try {
    const from = MAIL_FROM.value() || SMTP_USER.value();
    const yanit = MAIL_REPLY.value() || ADMIN_EMAIL.value() || SMTP_USER.value();
    const headers = { 'X-Entity-Ref-ID': `pt-${Date.now()}` };
    if (o.iptal || o.tur === 'davet') headers['List-Unsubscribe'] = `<mailto:${yanit}?subject=bildirim-iptal>${o.iptal ? `, <${o.iptal}>` : ''}`;
    const ileti = { from, to, subject: String(subject).replace(/[\r\n]+/g, ' ').slice(0, 200), html, text: duzMetin(html), replyTo: yanit, headers };
    // Geçici hatalarda (421/45x, bağlantı kopması) 3 kez daha dene: 3 sn, 10 sn, 25 sn bekleyerek
    for (let deneme = 0; ; deneme++) {
      try { await _tx.sendMail(ileti); break; } catch (e) {
        const gecici = (e?.responseCode >= 421 && e?.responseCode < 460) || ['ECONNECTION', 'ETIMEDOUT', 'ESOCKET'].includes(e?.code);
        if (!gecici || deneme >= 3) throw e;
        await new Promise((r) => setTimeout(r, [3000, 10000, 25000][deneme]));
      }
    }
    db.collection('sistem').doc('eposta').set({ sonBasari: FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
  } catch (e) {
    console.error('E-posta gönderilemedi:', subject, e?.code || '', e?.message || e);
    if (e?.code === 'EAUTH') _tx = undefined;
    await db.collection('epostaHatalari').add({ to: String(to).slice(0, 200), konu: String(subject).slice(0, 200), hata: String(e?.response || e?.message || e).slice(0, 300), kod: e?.code || '', zaman: FieldValue.serverTimestamp() }).catch(() => {});
  }
}
const ayar = () => ({
  site: SITE_URL.value(), admin: ADMIN_EMAIL.value(), placesKey: PLACES_API_KEY.value() || '',
  iyzico: { apiKey: IYZICO_API_KEY.value(), secretKey: IYZICO_SECRET_KEY.value(), base: IYZICO_BASE.value(), planKodu: IYZICO_PLAN.value() },
  iletimerkezi: { key: ILETIMERKEZI_KEY.value(), hash: ILETIMERKEZI_HASH.value(), baslik: ILETIMERKEZI_BASLIK.value() },
  netgsm: { kullanici: NETGSM_KULLANICI.value(), sifre: NETGSM_SIFRE.value(), baslik: NETGSM_BASLIK.value(), appkey: NETGSM_APPKEY.value() },
  yoneticiler: [...new Set([...YONETICILER.value().split(','), ADMIN_EMAIL.value()].map((s) => s.trim().toLowerCase()).filter(Boolean))],
});
const ortak = { db, mail, ayar, FieldValue, Timestamp, FIRMS, MODELS };
let _app;
const app = () => (_app ||= createApp({ ...ortak, auth: getAuth() }));

export const api = onRequest({ region: REGION, secrets: [SMTP_PASS, PLACES_API_KEY], memory: '512MiB', minInstances: 1, maxInstances: 10, concurrency: 40, timeoutSeconds: 120 }, (req, res) => app().handle(req, res));

export const teklifOzeti = onSchedule({ schedule: 'every 30 minutes', region: REGION, timeZone: 'Europe/Istanbul', secrets: [SMTP_PASS] }, async () => {
  await teklifOzetleri(ortak);
});

// Her gün 10.00 (İstanbul): yönetimden açıldıysa firmalara tanıtım e-postası (günlük kota) + ödemesi gecikenlere hatırlatma
export const firmaTanitim = onSchedule({ schedule: '0 10 * * *', region: REGION, timeZone: 'Europe/Istanbul', secrets: [SMTP_PASS], timeoutSeconds: 540 }, async () => {
  const k = await app().uyelikSureKontrol();
  const h = await app().abonelikHatirlat();
  const n = await app().zamanliTanitim();
  console.log('Tanıtım e-postası', n, 'ödeme hatırlatması', h, 'üyelik süre kontrolü', k);
});

// Her ayın 1'i saat 17.00 (İstanbul): firma sitelerindeki fiyatları kontrol et, değişenleri onaya düşür
export const fiyatKontrol = onSchedule({ schedule: '0 17 1 * *', region: REGION, timeZone: 'Europe/Istanbul', secrets: [SMTP_PASS], timeoutSeconds: 540, memory: '1GiB' }, async () => {
  const r = await fiyatKontrolu(ortak);
  console.log('Fiyat kontrolü', r);
});

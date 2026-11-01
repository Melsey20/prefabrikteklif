// PrefabrikTeklif sunucu tarafı (Firebase Cloud Functions v2)
// Uç noktalar Hosting üzerinden /api/** ile çağrılır (firebase.json rewrites).
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

initializeApp();
const db = getFirestore();
const REGION = 'europe-west1';

// ---- Ayarlar (firebase functions:secrets:set ... / .env ile) ----
const SMTP_PASS = defineSecret('SMTP_PASS');
const PLACES_API_KEY = defineSecret('PLACES_API_KEY');
const SMTP_HOST = defineString('SMTP_HOST', { default: 'smtp.hostinger.com' });
const SMTP_PORT = defineString('SMTP_PORT', { default: '465' });
const SMTP_USER = defineString('SMTP_USER', { default: '' });
const MAIL_FROM = defineString('MAIL_FROM', { default: '' });
const ADMIN_EMAIL = defineString('ADMIN_EMAIL', { default: '' });
const SITE_URL = defineString('SITE_URL', { default: 'https://www.prefabrikteklif.com.tr' });
const MAKS_FIRMA = 5;
const SURE_SAAT = 24;

// Statik firma listesi (scripts/build_data.py üretir)
const FIRMS = JSON.parse(readFileSync(new URL('./firms.json', import.meta.url), 'utf8'));
const firmAd = (slug) => FIRMS.find((f) => f.slug === slug)?.kisaAd || slug;
const TIP_AD = { prefabrik: 'Prefabrik ev', celik: 'Çelik ev', konteyner: 'Konteyner ev', 'tiny house': 'Tiny house', ahsap: 'Ahşap ev', bungalov: 'Bungalov / bağ evi' };
const ARAZI_AD = { imarli: 'İmarlı arsa', koy: 'Köy yerleşik alanı', tarla: 'Tarla / bağ-bahçe', yok: 'Henüz arazi yok' };
const KAPSAM_AD = { 'anahtar-teslim': 'Anahtar teslim', 'nakliye-montaj': 'Nakliye ve montaj', 'zemin-betonu': 'Zemin betonu', 'ruhsat-proje': 'Ruhsat ve proje' };
const DAHIL_AD = { nakliye: 'Nakliye', montaj: 'Montaj', vinc: 'Vinç', zemin: 'Zemin betonu', 'ic-bitis': 'İç bitiş', 'mutfak-vitrifiye': 'Mutfak ve vitrifiye', ruhsat: 'Ruhsat ve proje' };

// ---- Yardımcılar ----
const str = (v, n = 200) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const arr = (v, n = 10) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.slice(0, 60)).slice(0, n) : []);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const token = () => crypto.randomBytes(18).toString('base64url');
const tl = (n) => new Intl.NumberFormat('tr-TR').format(n) + ' TL';
const tarihYazi = (d) => d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const json = (res, code, body) => res.status(code).set('Cache-Control', 'no-store').json(body);

let _tx;
function mailer() {
  if (!_tx) {
    _tx = nodemailer.createTransport({
      host: SMTP_HOST.value(), port: Number(SMTP_PORT.value()), secure: Number(SMTP_PORT.value()) === 465,
      auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
    });
  }
  return _tx;
}
async function mail(to, subject, html) {
  if (!to || !SMTP_USER.value() || (SMTP_PASS.value() || '').length < 2) { console.warn('E-posta ayarı eksik, gönderilmedi:', subject); return; }
  await mailer().sendMail({ from: MAIL_FROM.value() || SMTP_USER.value(), to, subject, html });
}
const kart = (rows) => `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows.filter((r) => r[1]).map((r) => `<tr><td style="padding:4px 12px 4px 0;color:#4a5751"><b>${esc(r[0])}</b></td><td style="padding:4px 0">${esc(r[1])}</td></tr>`).join('')}</table>`;
const sablon = (baslik, icerik) => `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#15201b"><h2 style="color:#17663f">${esc(baslik)}</h2>${icerik}<p style="color:#4a5751;font-size:12px;margin-top:24px">PrefabrikTeklif · prefabrikteklif.com.tr</p></div>`;

async function rateLimit(req, key, max) {
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
  const id = crypto.createHash('sha256').update(`${key}:${ip}`).digest('hex').slice(0, 32);
  const ref = db.collection('_rate').doc(id);
  const saat = Math.floor(Date.now() / 3600000);
  return db.runTransaction(async (t) => {
    const s = await t.get(ref);
    const d = s.exists && s.data().saat === saat ? s.data() : { saat, n: 0 };
    if (d.n >= max) return false;
    t.set(ref, { saat, n: d.n + 1, exp: Timestamp.fromMillis(Date.now() + 2 * 3600000) });
    return true;
  });
}

// Kayıtlı ve aktif firmalar (Firestore: firmalar/{slug} {aktif, eposta, tipler[], iller[] | ['*']})
async function kayitliFirmalar(tip) {
  const q = await db.collection('firmalar').where('aktif', '==', true).where('tipler', 'array-contains', tip).get();
  return q.docs.map((d) => ({ slug: d.id, ...d.data() }));
}

// ---- POST /api/teklif ----
async function teklif(req, res) {
  const b = req.body || {};
  if (str(b.website)) return json(res, 200, { ok: true, firmaSayisi: 0 }); // bot
  const d = {
    tip: TIP_AD[b.tip] ? b.tip : 'prefabrik', oda: str(b.oda, 10), m2: Number(b.m2) > 0 ? Math.min(Number(b.m2), 2000) : null,
    arazi: ARAZI_AD[b.arazi] ? b.arazi : '', il: str(b.il, 40), ilce: str(b.ilce, 60), butce: str(b.butce, 60), zaman: str(b.zaman, 60),
    kapsam: arr(b.kapsam).filter((k) => KAPSAM_AD[k]), not: str(b.not, 1000),
    ad: str(b.ad, 80), eposta: str(b.eposta, 120).toLowerCase(), telefon: str(b.telefon, 20),
    pazarlama: !!b.pazarlama,
  };
  if (!d.ad || !/^\S+@\S+\.\S+$/.test(d.eposta) || d.telefon.replace(/\D/g, '').length < 10 || !d.il) return json(res, 400, { hata: 'Lütfen zorunlu alanları doldurun.' });
  if (!b.riza) return json(res, 400, { hata: 'Firmalara aktarım onayı gerekli.' });
  if (!(await rateLimit(req, 'teklif', 5))) return json(res, 429, { hata: 'Çok fazla talep gönderildi, bir saat sonra tekrar deneyin.' });

  const secilen = arr(b.firmalar, MAKS_FIRMA).filter((s) => FIRMS.some((f) => f.slug === s));
  const kayitli = await kayitliFirmalar(d.tip);
  const ildeki = kayitli.filter((f) => !f.iller?.length || f.iller.includes('*') || f.iller.includes(d.il));
  const hedef = [...secilen];
  for (const f of ildeki) { if (hedef.length >= MAKS_FIRMA) break; if (!hedef.includes(f.slug)) hedef.push(f.slug); }

  const now = Date.now();
  const ref = db.collection('talepler').doc();
  const tkn = token();
  await ref.set({ ...d, token: tkn, firmalar: hedef, secilen, durum: 'acik', riza: true, rizaZamani: FieldValue.serverTimestamp(), olusturma: FieldValue.serverTimestamp(), sonTarih: Timestamp.fromMillis(now + SURE_SAAT * 3600000) });

  const davetler = [];
  for (const slug of hedef) {
    const f = kayitli.find((x) => x.slug === slug);
    if (!f?.eposta) continue;
    const kod = token();
    await ref.collection('davetler').doc(slug).set({ kod, eposta: f.eposta, gonderim: FieldValue.serverTimestamp() });
    davetler.push({ slug, eposta: f.eposta, link: `${SITE_URL.value()}/teklif-ver/?t=${ref.id}.${tkn}&f=${slug}.${kod}` });
  }
  const ozet = kart([['Ev tipi', TIP_AD[d.tip]], ['Oda', d.oda], ['m²', d.m2], ['Yer', [d.il, d.ilce].filter(Boolean).join(' / ')], ['Arazi', ARAZI_AD[d.arazi]], ['Bütçe', d.butce], ['Zaman', d.zaman], ['İstenen kapsam', d.kapsam.map((k) => KAPSAM_AD[k]).join(', ')], ['Not', d.not]]);
  const son = tarihYazi(new Date(now + SURE_SAAT * 3600000));
  await Promise.allSettled([
    ...davetler.map((v) => mail(v.eposta, `Yeni teklif talebi: ${TIP_AD[d.tip]}${d.oda ? ` ${d.oda}` : ''}, ${d.il}`, sablon('Yeni teklif talebi', `${ozet}${kart([['Müşteri', d.ad], ['Telefon', d.telefon]])}<p>Teklifinizi <b>${esc(son)}</b> tarihine kadar girin. Teklifler bu saatte müşteriye tek tabloda iletilecek.</p><p><a href="${v.link}" style="background:#17663f;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Teklif ver</a></p>`))),
    mail(d.eposta, 'Teklif talebin alındı', sablon('Talebin alındı', `<p>Merhaba ${esc(d.ad)},</p><p>Talebin ${hedef.length || 'uygun'} firmaya iletildi. Gelen teklifler <b>${esc(son)}</b> civarında aynı kapsam başlıklarıyla tek e-postada sana gelecek.</p>${ozet}`)),
    mail(ADMIN_EMAIL.value(), `Yeni talep: ${TIP_AD[d.tip]} ${d.il} (${hedef.length} firma)`, sablon('Yeni talep', `${ozet}${kart([['Müşteri', d.ad], ['E-posta', d.eposta], ['Telefon', d.telefon], ['Seçilen firmalar', secilen.map(firmAd).join(', ')], ['E-posta ile davet edilen', davetler.map((v) => firmAd(v.slug)).join(', ') || 'Yok'], ['Elle aranması gereken', hedef.filter((s) => !davetler.some((v) => v.slug === s)).map(firmAd).join(', ')]])}<p>Talep no: ${ref.id}</p>`)),
  ]);
  return json(res, 200, { ok: true, firmaSayisi: hedef.length });
}

// Talep + davet doğrulama
async function davetBul(t, f) {
  const [id, tkn] = String(t || '').split('.');
  const [slug, kod] = String(f || '').split('.');
  if (!id || !tkn || !slug || !kod) return null;
  const ref = db.collection('talepler').doc(id);
  const [s, dv] = await Promise.all([ref.get(), ref.collection('davetler').doc(slug).get()]);
  if (!s.exists || s.data().token !== tkn || !dv.exists || dv.data().kod !== kod) return null;
  return { ref, talep: s.data(), slug };
}

// ---- GET /api/talep ----
async function talep(req, res) {
  const v = await davetBul(req.query.t, req.query.f);
  if (!v) return json(res, 404, { hata: 'Talep bulunamadı veya bağlantı geçersiz.' });
  const d = v.talep;
  const verildi = (await v.ref.collection('teklifler').doc(v.slug).get()).exists;
  return json(res, 200, {
    tipAd: TIP_AD[d.tip], oda: d.oda, m2: d.m2, il: d.il, ilce: d.ilce, araziAd: ARAZI_AD[d.arazi], butce: d.butce, zaman: d.zaman,
    kapsam: (d.kapsam || []).map((k) => KAPSAM_AD[k]), not: d.not, sonTarih: tarihYazi(d.sonTarih.toDate()), verildi, kapali: d.durum !== 'acik',
  });
}

// ---- POST /api/teklif-ver ----
async function teklifVer(req, res) {
  const b = req.body || {};
  const v = await davetBul(b.t, b.f);
  if (!v) return json(res, 404, { hata: 'Bağlantı geçersiz.' });
  if (v.talep.durum !== 'acik') return json(res, 409, { hata: 'Bu talebin süresi doldu.' });
  const fiyat = Math.round(Number(b.fiyat));
  if (!(fiyat >= 1000 && fiyat < 1e9)) return json(res, 400, { hata: 'Geçerli bir fiyat yazın.' });
  await v.ref.collection('teklifler').doc(v.slug).set({
    firma: v.slug, fiyat, kdvDahil: !!b.kdvDahil, dahil: arr(b.dahil).filter((k) => DAHIL_AD[k]),
    teslimGun: Number(b.teslimGun) > 0 ? Math.min(Number(b.teslimGun), 365) : null,
    garantiYil: Number(b.garantiYil) >= 0 ? Math.min(Number(b.garantiYil), 50) : null,
    not: str(b.not, 1500), zaman: FieldValue.serverTimestamp(),
  });
  return json(res, 200, { ok: true });
}

// ---- POST /api/firma-basvuru ----
async function firmaBasvuru(req, res) {
  const b = req.body || {};
  if (str(b.website)) return json(res, 200, { ok: true });
  const d = {
    unvan: str(b.unvan, 160), marka: str(b.marka, 80), vergiNo: str(b.vergiNo, 11), mevcut: str(b.mevcut, 80), adres: str(b.adres, 240),
    web: str(b.web, 160), yetkili: str(b.yetkili, 80), telefon: str(b.telefon, 20), eposta: str(b.eposta, 120).toLowerCase(),
    tipler: arr(b.tipler).filter((t) => TIP_AD[t]), iller: str(b.iller, 400), belgeler: str(b.belgeler, 300), not: str(b.not, 1000),
  };
  if (!d.unvan || !/^\d{10,11}$/.test(d.vergiNo) || !d.yetkili || !/^\S+@\S+\.\S+$/.test(d.eposta) || !d.tipler.length) return json(res, 400, { hata: 'Lütfen zorunlu alanları doldurun.' });
  if (!(await rateLimit(req, 'basvuru', 3))) return json(res, 429, { hata: 'Çok fazla deneme, sonra tekrar deneyin.' });
  const ref = await db.collection('firmaBasvurulari').add({ ...d, durum: 'bekliyor', zaman: FieldValue.serverTimestamp() });
  await Promise.allSettled([
    mail(ADMIN_EMAIL.value(), `Firma başvurusu: ${d.marka || d.unvan}`, sablon('Yeni firma başvurusu', kart(Object.entries({ Unvan: d.unvan, Marka: d.marka, 'Vergi no': d.vergiNo, 'Listedeki kaydı': d.mevcut, Adres: d.adres, Web: d.web, Yetkili: d.yetkili, Telefon: d.telefon, 'E-posta': d.eposta, Tipler: d.tipler.map((t) => TIP_AD[t]).join(', '), İller: d.iller, Belgeler: d.belgeler, Not: d.not })) + `<p>Başvuru no: ${ref.id}</p>`)),
    mail(d.eposta, 'Başvurunuz alındı', sablon('Başvurunuz alındı', `<p>Sayın ${esc(d.yetkili)},</p><p>PrefabrikTeklif firma başvurunuz alındı. Vergi levhası, Ticaret Sicil Gazetesi ve imza sirkülerinizi bu e-postaya yanıt olarak gönderebilirsiniz. 2 iş günü içinde sizinle iletişime geçeceğiz.</p>`)),
  ]);
  return json(res, 200, { ok: true });
}

// ---- GET /api/google-puan?firma=slug ----
// Google kuralları: sadece place_id saklanır; puan her istekte canlı alınır ve atıfla gösterilir.
async function googlePuan(req, res) {
  const slug = str(req.query.firma, 80);
  const f = FIRMS.find((x) => x.slug === slug);
  const key = PLACES_API_KEY.value();
  if (!f || !key || key.length < 20) return json(res, 404, {});
  const pref = db.collection('placeIds').doc(slug);
  let pid = (await pref.get()).data()?.id;
  if (!pid) {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id' },
      body: JSON.stringify({ textQuery: `${f.kisaAd} ${f.il || ''} prefabrik`, languageCode: 'tr', regionCode: 'TR' }),
    });
    pid = (await r.json()).places?.[0]?.id;
    if (!pid) return json(res, 404, {});
    await pref.set({ id: pid });
  }
  const r = await fetch(`https://places.googleapis.com/v1/places/${pid}?languageCode=tr`, { headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri' } });
  if (!r.ok) return json(res, 404, {});
  const p = await r.json();
  return json(res, 200, { rating: p.rating ?? null, count: p.userRatingCount ?? null, url: p.googleMapsUri ?? null });
}

// ---- GET /api/yorumlar?firma=slug ----
async function yorumlar(req, res) {
  const slug = str(req.query.firma, 80);
  const q = await db.collection('yorumlar').where('firma', '==', slug).where('durum', '==', 'onayli').orderBy('zaman', 'desc').limit(20).get();
  res.set('Cache-Control', 'public, max-age=300');
  return res.json({ yorumlar: q.docs.map((d) => { const y = d.data(); return { ad: y.adGoster, puan: y.puan, metin: y.metin, cevap: y.cevap || '' }; }) });
}

// ---- POST /api/yorum ---- (24 saatlik e-postadaki bağlantıdan; onay için 'bekliyor' kaydedilir)
async function yorum(req, res) {
  const b = req.body || {};
  const [id, tkn] = String(b.t || '').split('.');
  if (!id || !tkn) return json(res, 400, { hata: 'Bağlantı geçersiz.' });
  const s = await db.collection('talepler').doc(id).get();
  if (!s.exists || s.data().token !== tkn) return json(res, 404, { hata: 'Bağlantı geçersiz.' });
  const firma = str(b.firma, 80);
  if (!s.data().firmalar.includes(firma)) return json(res, 400, { hata: 'Bu firma talebinizde yok.' });
  const puanlar = Object.fromEntries(['fiyat', 'teslim', 'iscilik', 'satisSonrasi'].map((k) => [k, Math.max(1, Math.min(5, Number(b[k]) || 0))]));
  const puan = Math.round((Object.values(puanlar).reduce((a, c) => a + c, 0) / 4) * 10) / 10;
  const metin = str(b.metin, 2000);
  if (metin.length < 30) return json(res, 400, { hata: 'Yorum en az 30 karakter olmalı.' });
  await db.collection('yorumlar').add({ firma, talep: id, puanlar, puan, metin, asama: b.asama === 'teslim' ? 'teslim' : 'sozlesme', adGoster: `${s.data().ad.split(' ')[0]} ${(s.data().ad.split(' ')[1] || '').slice(0, 1)}.`.trim(), durum: 'bekliyor', belgeNotu: str(b.belge, 300), zaman: FieldValue.serverTimestamp() });
  await mail(ADMIN_EMAIL.value(), `Onay bekleyen yorum: ${firmAd(firma)}`, sablon('Yeni yorum', kart([['Firma', firmAd(firma)], ['Puan', puan], ['Yorum', metin], ['Belge', str(b.belge, 300)]]) + '<p>Firestore’da yorumlar koleksiyonunda durum alanını "onayli" yaparak yayınlayın; sözleşme belgesini müşteriden e-postayla isteyin.</p>'));
  return json(res, 200, { ok: true });
}

// ---- Router ----
const ROUTES = { 'POST /api/teklif': teklif, 'GET /api/talep': talep, 'POST /api/teklif-ver': teklifVer, 'POST /api/firma-basvuru': firmaBasvuru, 'GET /api/google-puan': googlePuan, 'GET /api/yorumlar': yorumlar, 'POST /api/yorum': yorum };
export const api = onRequest({ region: REGION, secrets: [SMTP_PASS, PLACES_API_KEY], memory: '256MiB', maxInstances: 10 }, async (req, res) => {
  const fn = ROUTES[`${req.method} ${req.path.replace(/\/$/, '')}`];
  if (!fn) return json(res, 404, { hata: 'Bulunamadı' });
  try { await fn(req, res); } catch (e) { console.error(e); json(res, 500, { hata: 'Sunucu hatası.' }); }
});

// ---- Her 30 dakikada: süresi dolan talepleri tek e-postada müşteriye gönder ----
export const teklifOzeti = onSchedule({ schedule: 'every 30 minutes', region: REGION, timeZone: 'Europe/Istanbul', secrets: [SMTP_PASS] }, async () => {
  const q = await db.collection('talepler').where('durum', '==', 'acik').where('sonTarih', '<=', Timestamp.now()).limit(50).get();
  for (const doc of q.docs) {
    const d = doc.data();
    const tk = (await doc.ref.collection('teklifler').get()).docs.map((x) => x.data()).sort((a, b) => a.fiyat - b.fiyat);
    const kol = ['Nakliye', 'Montaj', 'Zemin betonu', 'İç bitiş', 'Ruhsat ve proje'];
    const keys = ['nakliye', 'montaj', 'zemin', 'ic-bitis', 'ruhsat'];
    const satir = tk.map((t) => `<tr><td style="padding:8px;border-bottom:1px solid #eee"><b>${esc(firmAd(t.firma))}</b>${t.not ? `<br><span style="color:#4a5751;font-size:12px">${esc(t.not.slice(0, 160))}</span>` : ''}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap"><b>${tl(t.fiyat)}</b><br><span style="font-size:12px">${t.kdvDahil ? 'KDV dahil' : 'KDV hariç'}</span></td>${keys.map((k) => `<td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${t.dahil.includes(k) ? '✓' : '–'}</td>`).join('')}<td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${t.teslimGun ? `${t.teslimGun} gün` : ''}</td></tr>`).join('');
    const tablo = tk.length
      ? `<p>${tk.length} firmadan teklif geldi. ✓ = fiyata dahil.</p><div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:13px;min-width:560px"><tr style="background:#f3f5f4"><th style="padding:8px;text-align:left">Firma</th><th style="padding:8px">Fiyat</th>${kol.map((k) => `<th style="padding:8px">${k}</th>`).join('')}<th style="padding:8px">Teslim</th></tr>${satir}</table></div><p>Firmalarla doğrudan görüşüp sözleşme yapabilirsin. Sözleşme yaparsan, deneyimini <a href="${SITE_URL.value()}/yorum-yaz/?t=${doc.id}.${d.token}">buradan</a> doğrulanmış yorum olarak paylaşabilirsin.</p>`
      : '<p>Bu süre içinde sisteme teklif girilmedi. Talebin firmalara iletildi; firmalar seni telefonla arayabilir. Ekibimiz de talebini takip ediyor.</p>';
    await Promise.allSettled([
      mail(d.eposta, tk.length ? `${tk.length} teklif geldi: ${TIP_AD[d.tip]}` : 'Teklif talebin hakkında', sablon(tk.length ? 'Teklifler yan yana' : 'Talebin hakkında', `<p>Merhaba ${esc(d.ad)},</p>${tablo}`)),
      mail(ADMIN_EMAIL.value(), `Özet gönderildi: ${doc.id} (${tk.length} teklif)`, sablon('Özet gönderildi', `<p>${esc(d.ad)} · ${esc(d.il)} · ${tk.length} teklif</p>`)),
    ]);
    await doc.ref.update({ durum: 'gonderildi', ozetZamani: FieldValue.serverTimestamp(), teklifSayisi: tk.length });
  }
});

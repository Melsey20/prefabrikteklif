// Kasım 2026 eklemeleri: onay kayıtları, sayaçlar, mesajlaşma, firma durum/sil, kullanıcılar, telefonla giriş, tanıtım e-postası
import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeDb, FieldValue, Timestamp, zaman, res } from './fakeDb.js';
import { createApp } from '../app.js';

const FIRMS = [
  { slug: 'kardesler', kisaAd: 'Kardeşler', il: 'Malatya', tipler: ['prefabrik'], eposta: 'info@kardesler.example' },
  { slug: 'pramo', kisaAd: 'Pramo', il: 'Kocaeli', tipler: ['prefabrik'], eposta: 'info@pramo.example' },
  { slug: 'evo', kisaAd: 'Evo', il: 'Ankara', tipler: ['celik'], eposta: 'satis@evo.example' },
];
const K = {
  'tok-admin': { uid: 'a1', email: 'info@mitraajans.com', email_verified: true },
  'tok-firma': { uid: 'f1', email: 'satis@kardesler.com', email_verified: true },
  'tok-user': { uid: 'u1', email: 'ali@ornek.com', email_verified: true, name: 'Ali Veli' },
  'tok-tel': { uid: 'p1', phone_number: '+905321112233' },
  'tok-yabanci': { uid: 'x1', email: 'baska@ornek.com', email_verified: true },
};
function kur() {
  const db = new FakeDb(); const mails = [];
  const app = createApp({
    db, FieldValue, Timestamp, FIRMS, MODELS: [], saat: 48, simdi: zaman.simdi,
    auth: { verifyIdToken: async (t) => { if (!K[t]) throw new Error('bad'); return K[t]; } },
    mail: async (to, subject, html, o) => { mails.push({ to, subject, html, o }); },
    ayar: () => ({ site: 'https://www.prefabrikteklif.com.tr', admin: 'info@mitraajans.com', yoneticiler: ['info@mitraajans.com'], placesKey: '' }),
  });
  const call = async (method, path, { body, query, tok } = {}) => { const r = res(); await app.handle({ method, path, body, query: query || {}, headers: { 'x-forwarded-for': '5.6.7.' + Math.floor(Math.random() * 250), 'user-agent': 'test', ...(tok ? { authorization: 'Bearer ' + tok } : {}) } }, r); return r; };
  return { db, mails, call, app };
}
const TALEP = { tip: 'prefabrik', oda: '2+1', m2: 80, arazi: 'imarli', il: 'Malatya', butce: '500000-1000000', teslim: 'anahtar', ad: 'Ali Veli', eposta: 'ali@ornek.com', telefon: '0532 111 22 33', riza: true };
const aktifFirma = (db) => db.collection('firmalar').doc('kardesler').set({ aktif: true, eposta: 'satis@kardesler.com', panelEpostalari: ['satis@kardesler.com'], telefon: '0422 000 00 00', tipler: ['prefabrik'], iller: ['*'], abonelik: { durum: 'aktif' } });

test('talep: onay kaydı, sayaçlar, müşteriye "teklif geldi", mesajlaşma ve istatistik', async () => {
  const { db, mails, call } = kur();
  await aktifFirma(db);
  const r = await call('POST', '/api/teklif', { body: { ...TALEP, pazarlama: true } });
  assert.equal(r.statusCode, 200, JSON.stringify(r.body));
  const onay = db.dump('onaylar/').map(([, v]) => v);
  assert.equal(onay.length, 1); assert.equal(onay[0].tur, 'teklif-talebi');
  assert.deepEqual(onay[0].belgeler.map((b) => b.kod).sort(), ['kullanici', 'kvkk', 'pazarlama', 'riza']);
  assert.ok(onay[0].belgeler.every((b) => b.surum) && onay[0].ipOzet && onay[0].tarayici === 'test', 'sürüm, IP özeti ve tarayıcı saklanır');
  assert.equal((await db.collection('firmalar').doc('kardesler').get()).data().istTalep, 1);
  // Firma panelden fiyat verir
  const oz = await call('GET', '/api/firma/ozet', { tok: 'tok-firma' });
  const tid = oz.body.talepler[0].id;
  assert.equal(oz.body.istatistik.talep, 1);
  // fiyat vermeden mesaj yazılamaz
  assert.equal((await call('POST', '/api/mesaj', { tok: 'tok-user', body: { talep: tid, firma: 'kardesler', metin: 'Merhaba' } })).statusCode, 409);
  const f = await call('POST', '/api/firma/teklif', { tok: 'tok-firma', body: { talep: tid, fiyat: 750000, kdvDahil: true, teslimGun: 45, not: 'Nakliye dahil' } });
  assert.equal(f.statusCode, 200, JSON.stringify(f.body));
  const bildirim = mails.find((m) => m.to === 'ali@ornek.com' && m.subject.startsWith('İlk teklifiniz geldi'));
  assert.ok(bildirim && bildirim.html.includes('/hesabim/#teklifler') && bildirim.html.includes('750.000'), 'müşteriye teklif bildirimi ve fiyat');
  const fd = (await db.collection('firmalar').doc('kardesler').get()).data();
  assert.equal(fd.istTeklif, 1);
  assert.equal((await db.collection('sistem').doc('sayac').get()).data().teklif, 1);
  // Müşteri hesabında teklif + firma iletişim bilgisi
  const h = await call('GET', '/api/hesap', { tok: 'tok-user' });
  const tk = h.body.talepler[0].teklifler[0];
  assert.equal(tk.iletisim.telefon, '0422 000 00 00'); assert.equal(tk.iletisim.eposta, 'satis@kardesler.com');
  // Mesajlaşma: müşteri → firma → müşteri
  assert.equal((await call('POST', '/api/mesaj', { tok: 'tok-user', body: { talep: tid, firma: 'kardesler', metin: 'Zemin betonu dahil mi?' } })).statusCode, 200);
  assert.ok(mails.some((m) => m.to === 'satis@kardesler.com' && m.html.includes('Zemin betonu dahil mi?')), 'firmaya mesaj e-postası');
  assert.equal((await call('POST', '/api/mesaj', { tok: 'tok-yabanci', body: { talep: tid, firma: 'kardesler', metin: 'sızma' } })).statusCode, 404, 'başkasının talebine mesaj yazılamaz');
  assert.equal((await call('POST', '/api/firma/mesaj', { tok: 'tok-firma', body: { talep: tid, metin: 'Evet, dahil.' } })).statusCode, 200);
  assert.ok(mails.some((m) => m.to === 'ali@ornek.com' && m.html.includes('Evet, dahil.')), 'müşteriye yanıt e-postası');
  const h2 = await call('GET', '/api/hesap', { tok: 'tok-user' });
  assert.deepEqual(h2.body.talepler[0].teklifler[0].mesajlar.map((m) => m.kim), ['musteri', 'firma']);
  const oz2 = await call('GET', '/api/firma/ozet', { tok: 'tok-firma' });
  assert.equal(oz2.body.talepler[0].mesajlar.length, 2); assert.equal(oz2.body.istatistik.teklif, 1); assert.equal(oz2.body.istatistik.oran, 100);
  // Telefonla giriş yapan kullanıcı aynı talebi görür
  const ht = await call('GET', '/api/hesap', { tok: 'tok-tel' });
  assert.equal(ht.statusCode, 200); assert.equal(ht.body.talepler.length, 1, 'telefonla girişte talepler numarayla eşleşir');
  // Yönetim: kullanıcı ve istatistikler
  await call('GET', '/api/ben', { tok: 'tok-user' });
  const y = await call('GET', '/api/yonetim/ozet', { tok: 'tok-admin' });
  assert.equal(y.statusCode, 200, JSON.stringify(y.body));
  assert.equal(y.body.istatistik.talep, 1); assert.equal(y.body.istatistik.teklif, 1);
  const ali = y.body.kullanicilar.find((k) => k.eposta === 'ali@ornek.com');
  assert.ok(ali && ali.talep === 1 && ali.teklif === 1, 'kullanıcının talep ve teklif sayısı');
  assert.ok(y.body.onaylar.length >= 1 && y.body.onaylar[0].ip === undefined, 'onaylar listelenir, açık IP gösterilmez');
  // İstatistikleri yeniden hesapla
  const ist = await call('POST', '/api/yonetim/istatistik', { tok: 'tok-admin' });
  assert.equal(ist.body.talep, 1); assert.equal(ist.body.teklif, 1);
});

test('hesap onayı kaydedilir; telefonla girişte kullanıcı oluşur', async () => {
  const { db, call } = kur();
  const b = await call('GET', '/api/ben', { tok: 'tok-tel' });
  assert.equal(b.body.telefon, '+905321112233'); assert.equal(b.body.dogrulandi, true);
  assert.equal((await call('POST', '/api/onay', { tok: 'tok-tel', body: { belgeler: ['kullanici', 'kvkk', 'gizlilik', 'uydurma'], tur: 'kayit' } })).statusCode, 200);
  const o = db.dump('onaylar/').map(([, v]) => v)[0];
  assert.deepEqual(o.belgeler.map((x) => x.kod), ['kullanici', 'kvkk', 'gizlilik']); assert.equal(o.telefon, '+905321112233');
  assert.equal((await db.collection('kullanicilar').doc('p1').get()).data().onaylar.kullanici, '2026-11');
  assert.equal((await call('POST', '/api/onay', { body: { belgeler: ['kvkk'] } })).statusCode, 401);
});

test('yönetim: firmayı pasife/aktife al ve sil', async () => {
  const { db, call } = kur();
  await aktifFirma(db);
  assert.equal((await call('POST', '/api/yonetim/firma-durum', { tok: 'tok-firma', body: { slug: 'kardesler', islem: 'pasif' } })).statusCode, 403);
  assert.equal((await call('POST', '/api/yonetim/firma-durum', { tok: 'tok-admin', body: { slug: 'kardesler', islem: 'pasif' } })).statusCode, 200);
  assert.equal((await db.collection('firmalar').doc('kardesler').get()).data().aktif, false);
  assert.equal((await call('POST', '/api/teklif', { body: TALEP })).body.firmaSayisi >= 0, true);
  assert.equal(db.dump('talepler/').filter(([k]) => k.endsWith('/davetler/kardesler')).length, 0, 'pasif firmaya talep gitmez');
  assert.equal((await call('POST', '/api/yonetim/firma-durum', { tok: 'tok-admin', body: { slug: 'kardesler', islem: 'aktif' } })).statusCode, 200);
  assert.equal((await call('POST', '/api/yonetim/firma-durum', { tok: 'tok-admin', body: { slug: 'kardesler', islem: 'sil', onay: 'yanlis' } })).statusCode, 400);
  assert.equal((await call('POST', '/api/yonetim/firma-durum', { tok: 'tok-admin', body: { slug: 'kardesler', islem: 'sil', onay: 'kardesler' } })).statusCode, 200);
  assert.equal((await db.collection('firmalar').doc('kardesler').get()).exists, false);
  assert.equal(db.dump('silinenFirmalar/').length, 1, 'silinen firma yedeklenir');
  assert.equal((await call('GET', '/api/firma/ozet', { tok: 'tok-firma' })).statusCode, 403, 'silinen firmanın panel erişimi kalkar');
});

test('tanıtım e-postası: günlük kota, kayıtlı ve ret edenler atlanır, ret bağlantısı çalışır', async () => {
  const { db, mails, call, app } = kur();
  await aktifFirma(db); // kardesler kayıtlı: atlanır
  assert.equal(await app.zamanliTanitim(), 0, 'kapalıyken gönderilmez');
  assert.equal((await call('POST', '/api/yonetim/tanitim', { tok: 'tok-admin', body: { ekle: 'yeni@firma.example; Yeni Firma\ngecersiz\ninfo@pramo.example' } })).body.eklendi, 2);
  const on = await call('POST', '/api/yonetim/tanitim', { tok: 'tok-admin', body: { onizleme: true } });
  assert.equal(on.body.gonderildi, 'info@mitraajans.com');
  await call('POST', '/api/yonetim/tanitim', { tok: 'tok-admin', body: { aktif: true, gunluk: 2 } });
  const once = mails.length;
  assert.equal(await app.zamanliTanitim(), 2, 'günlük kota');
  const giden = mails.slice(once);
  assert.ok(!giden.some((m) => m.to === 'info@kardesler.example'), 'kayıtlı firmaya gitmez');
  assert.ok(giden.every((m) => m.o?.iptal && m.html.includes('bildirim-iptal')), 'her e-postada ret bağlantısı');
  const iptal = decodeURIComponent(giden[0].html.match(/bildirim-iptal\/\?f=([^"&]+)/)[1]);
  assert.equal((await call('POST', '/api/bildirim-iptal', { body: { f: iptal } })).statusCode, 200);
  assert.equal(await app.zamanliTanitim(), 1, 'kalan tek aday');
  const son = mails.at(-1).to;
  assert.ok(![giden[0].to, giden[1].to].includes(son), 'aynı adrese 30 gün içinde ikinci kez gitmez');
  zaman.ileri(31 * 24 * 3600000);
  const n = await app.zamanliTanitim();
  assert.ok(n <= 2 && !mails.slice(-n).some((m) => m.to === giden[0].to), 'ret eden bir daha almaz');
  const y = await call('GET', '/api/yonetim/ozet', { tok: 'tok-admin' });
  assert.equal(y.body.tanitim.aktif, true); assert.equal(y.body.tanitim.iptal, 1);
});

test('iyzico abonelik: kart formu, dönüş, başarısız ödeme, kart güncelleme ve hatırlatma', async () => {
  const db = new FakeDb(); const mails = []; const istekler = [];
  let durum = 'ACTIVE';
  const fetch = async (url, o) => {
    istekler.push({ url, o });
    assert.match(o.headers.Authorization, /^IYZWSv2 /);
    const dec = Buffer.from(o.headers.Authorization.slice(8), 'base64').toString();
    assert.match(dec, /^apiKey:ak&randomKey:\d+[a-f0-9]+&signature:[a-f0-9]{64}$/);
    const yol = new URL(url).pathname;
    const j = (x) => ({ status: 200, json: async () => ({ status: 'success', ...x }) });
    if (yol === '/v2/subscription/checkoutform/initialize') return j({ token: 'tk1', checkoutFormContent: '<script>iyzico</script>' });
    if (yol === '/v2/subscription/checkoutform/tk1') return j({ data: { referenceCode: 'SUB-1', customerReferenceCode: 'C-1', subscriptionStatus: 'ACTIVE' } });
    if (yol === '/v2/subscription/subscriptions/SUB-1') return j({ data: { subscriptionStatus: durum } });
    if (yol === '/v2/subscription/card-update/checkoutform/initialize') return j({ token: 'tk2', checkoutFormContent: '<script>kart</script>' });
    if (yol === '/v2/subscription/operation/retry') return j({});
    return { status: 404, json: async () => ({ status: 'failure', errorMessage: 'yok' }) };
  };
  const app = createApp({
    db, FieldValue, Timestamp, FIRMS, MODELS: [], saat: 48, simdi: zaman.simdi, fetch,
    auth: { verifyIdToken: async (t) => { if (!K[t]) throw new Error('bad'); return K[t]; } },
    mail: async (to, subject, html) => { mails.push({ to, subject, html }); },
    ayar: () => ({ site: 'https://www.prefabrikteklif.com.tr', admin: 'info@mitraajans.com', yoneticiler: ['info@mitraajans.com'], placesKey: '', iyzico: { apiKey: 'ak', secretKey: 'sk', base: 'https://sandbox-api.iyzipay.com', planKodu: 'PLAN-1' } }),
  });
  const call = async (method, path, { body, query, tok } = {}) => { const r = res(); r.redirect = (c, u) => { r.statusCode = c; r.h.location = u; return r; }; await app.handle({ method, path, body, query: query || {}, headers: { 'x-forwarded-for': '9.8.7.6', ...(tok ? { authorization: 'Bearer ' + tok } : {}) } }, r); return r; };
  await db.collection('firmalar').doc('kardesler').set({ aktif: true, eposta: 'satis@kardesler.com', panelEpostalari: ['satis@kardesler.com'], tipler: ['prefabrik'], iller: ['*'], abonelik: { durum: 'odeme-bekliyor' } });
  const oz = await call('GET', '/api/firma/ozet', { tok: 'tok-firma' });
  assert.deepEqual(oz.body.kartliOdeme, { acik: true, aktif: false });
  assert.equal((await call('POST', '/api/firma/abonelik-baslat', { tok: 'tok-firma', body: { ad: 'Ali', soyad: 'Kardeş', telefon: '0532 000 00 00', il: 'Malatya', adres: 'OSB 3. Cadde No:12 Yeşilyurt', onay: false } })).statusCode, 400, 'koşul onayı zorunlu');
  const b = await call('POST', '/api/firma/abonelik-baslat', { tok: 'tok-firma', body: { ad: 'Ali', soyad: 'Kardeş', telefon: '0532 000 00 00', il: 'Malatya', adres: 'OSB 3. Cadde No:12 Yeşilyurt', onay: true } });
  assert.equal(b.statusCode, 200, JSON.stringify(b.body)); assert.equal(b.body.icerik, '<script>iyzico</script>');
  const gov = JSON.parse(istekler[0].o.body);
  assert.equal(gov.pricingPlanReferenceCode, 'PLAN-1'); assert.equal(gov.customer.gsmNumber, '+905320000000'); assert.match(gov.callbackUrl, /\/api\/iyzico\/donus\?f=kardesler&k=/);
  assert.ok(db.dump('onaylar/').some(([, v]) => v.tur === 'abonelik-baslatma'), 'abonelik onayı kaydedilir');
  // sahte dönüş (yanlış kod) reddedilir
  const sahte = await call('POST', '/api/iyzico/donus', { query: { f: 'kardesler', k: 'yanlis' }, body: { token: 'tk1' } });
  assert.equal(sahte.statusCode, 302); assert.match(sahte.h.location, /odeme=hata/);
  const k = new URL(gov.callbackUrl).searchParams.get('k');
  const d = await call('POST', '/api/iyzico/donus', { query: { f: 'kardesler', k }, body: { token: 'tk1' } });
  assert.equal(d.statusCode, 302); assert.match(d.h.location, /odeme=basarili/);
  let fd = (await db.collection('firmalar').doc('kardesler').get()).data();
  assert.equal(fd.abonelik.durum, 'aktif'); assert.equal(fd.iyzicoAbonelik, 'SUB-1'); assert.ok(fd.abonelik.sonrakiOdeme);
  assert.ok(mails.some((m) => m.to === 'satis@kardesler.com' && m.subject.startsWith('Üyeliğiniz başladı')));
  // başarısız aylık ödeme → talepler durur, e-posta gider
  durum = 'UNPAID';
  assert.equal((await call('POST', '/api/iyzico/bildirim', { body: { subscriptionReferenceCode: 'SUB-1', orderReferenceCode: 'O-9', iyziEventType: 'subscription.order.failure' } })).statusCode, 200);
  fd = (await db.collection('firmalar').doc('kardesler').get()).data();
  assert.equal(fd.abonelik.durum, 'gecikti');
  assert.ok(mails.some((m) => m.to === 'satis@kardesler.com' && m.subject.includes('alınamadı')));
  assert.equal((await call('POST', '/api/teklif', { body: TALEP })).statusCode, 200);
  assert.ok(!mails.some((m) => m.to === 'satis@kardesler.com' && m.subject.startsWith('Yeni talep:')), 'gecikmiş firmaya "yeni talep" gitmez');
  // sahte "başarılı" bildirim: iyzico'da durum aktif değilse yok sayılır
  await call('POST', '/api/iyzico/bildirim', { body: { subscriptionReferenceCode: 'SUB-1', iyziEventType: 'subscription.order.success' } });
  assert.equal((await db.collection('firmalar').doc('kardesler').get()).data().abonelik.durum, 'gecikti');
  // kart güncelleme → ödeme yeniden denenir
  const kg = await call('POST', '/api/firma/kart-guncelle', { tok: 'tok-firma' });
  assert.equal(kg.body.icerik, '<script>kart</script>');
  const k2 = new URL(JSON.parse(istekler.at(-1).o.body).callbackUrl).searchParams.get('k');
  const kd = await call('POST', '/api/iyzico/kart-donus', { query: { f: 'kardesler', k: k2 } });
  assert.match(kd.h.location, /odeme=kart/);
  assert.ok(istekler.some((x) => x.url.endsWith('/v2/subscription/operation/retry') && JSON.parse(x.o.body).referenceCode === 'O-9'));
  durum = 'ACTIVE';
  await call('POST', '/api/iyzico/bildirim', { body: { subscriptionReferenceCode: 'SUB-1', iyziEventType: 'subscription.order.success' } });
  assert.equal((await db.collection('firmalar').doc('kardesler').get()).data().abonelik.durum, 'aktif');
  // hatırlatma: gecikmiş firmaya 3 günde bir
  durum = 'UNPAID';
  await call('POST', '/api/iyzico/bildirim', { body: { subscriptionReferenceCode: 'SUB-1', iyziEventType: 'subscription.order.failure' } });
  assert.equal(await app.abonelikHatirlat(), 0);
  zaman.ileri(3 * 24 * 3600000 + 1000);
  assert.equal(await app.abonelikHatirlat(), 1);
});

test('tanıtım: açık talebi olan ya da son 3 günde davet alan firmaya tanıtım e-postası gitmez', async () => {
  const { FakeDb, FieldValue, Timestamp, zaman } = await import('./fakeDb.js');
  const { createApp } = await import('../app.js');
  const db = new FakeDb(); const giden = [];
  const FIRMS = [{ slug: 'a', kisaAd: 'A', eposta: 'a@a.com', tipler: ['celik'] }, { slug: 'b', kisaAd: 'B', eposta: 'b@b.com', tipler: ['celik'] }, { slug: 'c', kisaAd: 'C', eposta: 'c@c.com', tipler: ['celik'] }];
  await db.collection('talepler').doc('t1').set({ durum: 'acik', firmalar: ['a'] });
  await db.collection('davetKayit').doc('b').set({ sonDavet: zaman.simdi() - 3600000 });
  const app = createApp({ db, auth: { verifyIdToken: async () => { throw new Error('x'); } }, FieldValue, Timestamp, FIRMS, MODELS: [], simdi: zaman.simdi, mail: async (to) => { giden.push(to); }, ayar: () => ({ site: 'https://x', admin: 'y@y.com', yoneticiler: [] }) });
  await db.collection('sistem').doc('tanitim').set({ aktif: true, gunluk: 20 });
  await app.zamanliTanitim();
  assert.deepEqual(giden, ['c@c.com']);
});

test('geri dönen adres: geçersiz işaretlenen adrese tanıtım ve talep daveti gitmez', async () => {
  const { FakeDb, FieldValue, Timestamp, zaman } = await import('./fakeDb.js');
  const { createApp } = await import('../app.js');
  const db = new FakeDb(); const giden = [];
  const FIRMS = [{ slug: 'a', kisaAd: 'A', eposta: 'a@a.com', tipler: ['celik'] }, { slug: 'b', kisaAd: 'B', eposta: 'b@b.com', tipler: ['celik'] }];
  const app = createApp({ db, auth: { verifyIdToken: async () => ({ uid: 'y', email: 'y@y.com', email_verified: true }) }, FieldValue, Timestamp, FIRMS, MODELS: [], simdi: zaman.simdi, mail: async (to) => { giden.push(to); }, ayar: () => ({ site: 'https://x', admin: 'y@y.com', yoneticiler: ['y@y.com'] }) });
  const r = await app.routes['POST /api/yonetim/tanitim']({ headers: { authorization: 'Bearer x' }, body: { gecersiz: 'A@a.com\nbozuk' } });
  assert.equal(r.isaretlendi, 1);
  assert.equal((await db.collection('davetKayit').doc('a').get()).data().gecersiz, true);
  await db.collection('sistem').doc('tanitim').set({ aktif: true, gunluk: 20 });
  await app.zamanliTanitim();
  assert.deepEqual(giden, ['b@b.com']);
});

test('kampanya duyurusu: kampanyadan önce e-posta alan firmalara bir kez gider; ayrılan, geçersiz ve kayıtlı firmalar atlanır', async () => {
  const { FakeDb, FieldValue, Timestamp, zaman } = await import('./fakeDb.js');
  const { createApp, KAMPANYA_BASLANGIC } = await import('../app.js');
  const db = new FakeDb(); const giden = [];
  const FIRMS = ['a', 'b', 'c', 'd', 'e'].map((s) => ({ slug: s, kisaAd: s.toUpperCase(), eposta: `${s}@${s}.com`, tipler: ['celik'] }));
  const once = KAMPANYA_BASLANGIC - 86400000;
  await db.collection('davetKayit').doc('a').set({ sonDavet: once, eposta: 'a@a.com' });
  await db.collection('davetKayit').doc('b').set({ sonDavet: once, eposta: 'b@b.com', iptal: true });
  await db.collection('davetKayit').doc('c').set({ sonDavet: once, eposta: 'c@c.com', gecersiz: true });
  await db.collection('davetKayit').doc('d').set({ sonDavet: KAMPANYA_BASLANGIC + 1000, eposta: 'd@d.com' });
  await db.collection('firmalar').doc('e').set({ aktif: true, eposta: 'e@e.com' });
  await db.collection('davetKayit').doc('e').set({ sonDavet: once, eposta: 'e@e.com' });
  await db.collection('tanitimKayit').doc('x1').set({ eposta: 'yeni@firma.com', ad: 'Yeni', son: Timestamp.fromMillis(once), sayi: 1 });
  await db.collection('talepler').doc('t1').set({ durum: 'acik', firmalar: ['a'], il: 'Yalova', tip: 'celik', token: 'tok' });
  await db.collection('talepler').doc('t1').collection('davetler').doc('a').set({ kod: 'k1' });
  const app = createApp({ db, auth: { verifyIdToken: async () => ({ uid: 'y', email: 'y@y.com', email_verified: true }) }, FieldValue, Timestamp, FIRMS, MODELS: [], simdi: zaman.simdi, mail: async (to, s, html) => { giden.push({ to, s, html }); }, ayar: () => ({ site: 'https://x', admin: 'y@y.com', yoneticiler: ['y@y.com'] }) });
  const r = (body) => app.routes['POST /api/yonetim/duyuru']({ headers: { authorization: 'Bearer x' }, body });
  const say = await r({}); assert.equal(say.aday, 2); assert.equal(say.acikTalep, 1);
  const g = await r({ gonder: true });
  assert.equal(g.gonderilen, 2);
  assert.deepEqual(giden.map((x) => x.to).sort(), ['a@a.com', 'yeni@firma.com']);
  const a = giden.find((x) => x.to === 'a@a.com');
  assert.equal(a.s, 'Fiyat Bekleyen 1 Müşteri Var: Üyelik İlk Ay Ücretsiz'); assert.ok(a.html.includes('fiyat bekleyen 1 müşteri'));
  assert.ok(a.html.includes('Yalova') && a.html.includes('/teklif-ver/?t=t1.tok&amp;f=a.k1') && a.html.includes('bildirim-iptal'), 'açık talep bağlantısı ve ayrılma bağlantısı');
  assert.equal((await r({ gonder: true })).gonderilen, 0, 'ikinci kez gitmez');
});

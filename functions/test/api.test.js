import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeDb, FieldValue, Timestamp, zaman, res } from './fakeDb.js';
import { createApp, teklifOzetleri, fiyatKontrolu, fiyatAdaylari, sayfaMetni, katalogId } from '../app.js';

const FIRMS = [{ slug: 'kardesler', kisaAd: 'Kardeşler', il: 'Malatya', tipler: ['prefabrik'] }, { slug: 'pramo', kisaAd: 'Pramo', il: 'Kocaeli', tipler: ['prefabrik'] }];
const MODELS = [
  { id: 'kardesler/k82', firma: 'kardesler', ad: '82 m² 2+1', tip: 'prefabrik', m2: 82, oda: '2+1', fiyat: 600000, fiyatTuru: 'model', kdv: '', teslim: 'Anahtar teslim', kapsam: '', kaynak: 'https://k.example/82' },
  { id: 'pramo/p78', firma: 'pramo', ad: '78 m²', tip: 'prefabrik', m2: 78, oda: '2+1', fiyat: 528143, fiyatTuru: 'model', kdv: '', teslim: '', kapsam: '', kaynak: 'https://p.example/78' },
  { id: 'pramo/p95', firma: 'pramo', ad: '95 m²', tip: 'prefabrik', m2: 95, oda: '3+1', fiyat: 636998, fiyatTuru: 'model', kdv: '', teslim: '', kapsam: '', kaynak: 'https://p.example/err' },
];
const KULLANICI = { 'tok-admin': { uid: 'a1', email: 'info@mitraajans.com', email_verified: true }, 'tok-firma': { uid: 'f1', email: 'satis@kardesler.com', email_verified: true }, 'tok-user': { uid: 'u1', email: 'ali@ornek.com', email_verified: true }, 'tok-dogrulanmamis': { uid: 'u2', email: 'satis@kardesler.com', email_verified: false } };
function kur() {
  const db = new FakeDb(); const mails = [];
  const app = createApp({
    db, FieldValue, Timestamp, FIRMS, MODELS, saat: 48, simdi: zaman.simdi,
    auth: { verifyIdToken: async (t) => { if (!KULLANICI[t]) throw new Error('bad'); return KULLANICI[t]; } },
    mail: async (to, subject, html) => { mails.push({ to, subject, html }); },
    ayar: () => ({ site: 'https://www.prefabrikteklif.com.tr', admin: 'info@mitraajans.com', yoneticiler: ['info@mitraajans.com'], placesKey: '' }),
  });
  const call = async (method, path, { body, query, tok } = {}) => { const r = res(); await app.handle({ method, path, body, query: query || {}, headers: { 'x-forwarded-for': '1.2.3.' + Math.floor(Math.random() * 250), ...(tok ? { authorization: 'Bearer ' + tok } : {}) } }, r); return r; };
  return { db, mails, call, app };
}

// Evrak yükleme yardımcısı (PDF içerikli küçük dosya, isteğe bağlı çok parçalı)
async function evrakYukle(call, tur, boyut = 2000, ad = 'belge.pdf', bas = '%PDF-1.7\n') {
  const buf = Buffer.alloc(boyut, 65); Buffer.from(bas, 'latin1').copy(buf);
  const b = await call('POST', '/api/belge', { body: { islem: 'baslat', ad, tur, boyut } });
  if (b.statusCode !== 200) return b;
  const { id, anahtar, parcaBoyut } = b.body;
  for (let i = 0; i * parcaBoyut < boyut; i++) {
    const r = await call('POST', '/api/belge', { body: { islem: 'parca', id, anahtar, i, veri: buf.subarray(i * parcaBoyut, (i + 1) * parcaBoyut).toString('base64') } });
    if (r.statusCode !== 200) return r;
  }
  const s = await call('POST', '/api/belge', { body: { islem: 'bitir', id, anahtar } });
  return s.statusCode === 200 ? { statusCode: 200, body: { id, anahtar } } : s;
}
const TAM = { vergiDairesi: 'Malatya VD', adres: 'Organize Sanayi Bölgesi 3. Cadde No:12', merkezIl: 'Malatya', telefon: '05320000000' };
const TALEP = { tip: 'prefabrik', oda: '2+1', m2: 80, arazi: 'imarli', il: 'Malatya', butce: '500000-1000000', teslim: 'anahtar', ad: 'Ali Veli', eposta: 'ali@ornek.com', telefon: '0532 111 22 33', riza: true, kapsam: ['anahtar-teslim'] };

test('teklif: talep isimsiz gider, fiyat veren firmaya müşteri bilgisi açılır', async () => {
  const { db, mails, call } = kur();
  await db.collection('firmalar').doc('kardesler').set({ aktif: true, eposta: 'satis@kardesler.com', tipler: ['prefabrik'], iller: ['*'], panelEpostalari: ['satis@kardesler.com'], abonelik: { durum: 'aktif' } });
  await db.collection('firmalar').doc('pramo').set({ aktif: true, eposta: 'info@pramo.com', tipler: ['prefabrik'], iller: ['Kocaeli'], abonelik: { durum: 'aktif' } });
  const r = await call('POST', '/api/teklif', { body: TALEP });
  assert.equal(r.statusCode, 200, JSON.stringify(r.body));
  assert.equal(r.body.firmaSayisi, 1, 'il filtresi: sadece tüm Türkiye\'ye hizmet veren firma');
  const firmaMail = mails.find((m) => m.to === 'satis@kardesler.com');
  assert.ok(firmaMail, 'firmaya e-posta gitmeli');
  assert.ok(!firmaMail.html.includes('0532') && !firmaMail.html.includes('Ali Veli') && !firmaMail.html.includes('ali@ornek.com'), 'firma e-postasında müşteri bilgisi olmamalı');
  assert.ok(mails.some((m) => m.to === 'ali@ornek.com'), 'müşteriye onay e-postası');
  const link = firmaMail.html.match(/teklif-ver\/\?t=([^&"]+)&amp;f=([^"&]+)/) || firmaMail.html.match(/teklif-ver\/\?t=([^&"]+)&f=([^"&]+)/);
  assert.ok(link, 'bağlantı bulunmalı');
  const [t, f] = [link[1], link[2]];
  const g = await call('GET', '/api/talep', { query: { t, f } });
  assert.equal(g.statusCode, 200); assert.equal(g.body.musteri, undefined); assert.equal(g.body.il, 'Malatya'); assert.equal(g.body.ad, undefined);
  const k = await call('POST', '/api/teklif-ver', { body: { t, f, fiyat: '590000', dahil: ['nakliye', 'kotu'] } });
  assert.equal(k.statusCode, 200, JSON.stringify(k.body));
  assert.equal(k.body.musteri.telefon, '0532 111 22 33');
  assert.ok(mails.some((m) => m.to === 'satis@kardesler.com' && m.html.includes('0532 111 22 33')), 'firmaya müşteri bilgisi gitmeli');
  assert.ok(mails.some((m) => m.to === 'ali@ornek.com' && m.subject.includes('Kardeşler')), 'müşteriye yeni teklif bildirimi');
  const g2 = await call('GET', '/api/talep', { query: { t, f } });
  assert.equal(g2.body.verildi, true); assert.equal(g2.body.musteri.ad, 'Ali Veli');
  const kotu = await call('GET', '/api/talep', { query: { t: t.split('.')[0] + '.yanlis', f } });
  assert.equal(kotu.statusCode, 404);
  // Firma paneli aynı talebi görür
  const p = await call('GET', '/api/firma/ozet', { tok: 'tok-firma' });
  assert.equal(p.statusCode, 200, JSON.stringify(p.body));
  assert.equal(p.body.talepler.length, 1); assert.equal(p.body.talepler[0].teklif.fiyat, 590000); assert.equal(p.body.talepler[0].musteri.telefon, '0532 111 22 33');
  // Kullanıcı hesabında teklif görünür (doğrulanmış e-posta ile eşleşme)
  const h = await call('GET', '/api/hesap', { tok: 'tok-user' });
  assert.equal(h.body.talepler.length, 1); assert.equal(h.body.talepler[0].teklifler[0].fiyat, 590000);
  assert.deepEqual(h.body.talepler[0].teklifler[0].dahil, ['Nakliye']);
  // Süre dolunca özet
  zaman.ileri(49 * 3600000);
  const n = await teklifOzetleri({ db, mail: async (to, s, html) => mails.push({ to, subject: s, html }), ayar: () => ({ site: 'https://x', admin: 'info@mitraajans.com' }), FieldValue, Timestamp, FIRMS });
  assert.equal(n, 1);
  assert.ok(mails.some((m) => m.to === 'ali@ornek.com' && m.subject.startsWith('1 teklif geldi')));
  const k2 = await call('POST', '/api/teklif-ver', { body: { t, f, fiyat: '580000' } });
  assert.equal(k2.statusCode, 409, 'süresi dolan talebe teklif verilemez');
});

test('teklif: zorunlu alanlar, rıza ve bot tuzağı', async () => {
  const { call, db } = kur();
  assert.equal((await call('POST', '/api/teklif', { body: { ...TALEP, telefon: '12' } })).statusCode, 400);
  assert.equal((await call('POST', '/api/teklif', { body: { ...TALEP, riza: false } })).statusCode, 400);
  const bot = await call('POST', '/api/teklif', { body: { ...TALEP, website: 'x' } });
  assert.equal(bot.statusCode, 200); assert.equal(db.dump('talepler/').length, 0);
});

test('firma talebi reddedebilir, sonra fiyat veremez', async () => {
  const { db, mails, call } = kur();
  await db.collection('firmalar').doc('kardesler').set({ aktif: true, eposta: 'satis@kardesler.com', tipler: ['prefabrik'], iller: ['Malatya'], abonelik: { durum: 'aktif' } });
  await call('POST', '/api/teklif', { body: TALEP });
  const m = mails.find((x) => x.to === 'satis@kardesler.com'); const l = m.html.match(/t=([^&"]+)&(?:amp;)?f=([^"&]+)/);
  assert.equal((await call('POST', '/api/teklif-red', { body: { t: l[1], f: l[2] } })).statusCode, 200);
  assert.equal((await call('POST', '/api/teklif-ver', { body: { t: l[1], f: l[2], fiyat: 500000 } })).statusCode, 409);
});

test('süreç yönetimi talebi sipariş açar, yönetim aşama günceller, kullanıcı görür', async () => {
  const { db, mails, call } = kur();
  const r = await call('POST', '/api/teklif', { body: { ...TALEP, mod: 'surec', model: 'kardesler/k82' }, tok: 'tok-user' });
  assert.equal(r.statusCode, 200, JSON.stringify(r.body)); assert.ok(r.body.siparis);
  assert.ok(mails.some((x) => x.subject.startsWith('Süreç yönetimi talebi')));
  const y = await call('POST', '/api/yonetim/siparis', { tok: 'tok-admin', body: { id: r.body.siparis, asama: 3, firma: 'kardesler', not: 'Üretime başlandı', belgeUrl: 'https://drive.example/sozlesme.pdf', belgeAd: 'Sözleşme' } });
  assert.equal(y.statusCode, 200, JSON.stringify(y.body));
  assert.ok(mails.some((x) => x.to === 'ali@ornek.com' && x.subject.includes('Üretim')));
  const h = await call('GET', '/api/hesap', { tok: 'tok-user' });
  assert.equal(h.body.siparisler.length, 1); assert.equal(h.body.siparisler[0].asama, 3); assert.equal(h.body.siparisler[0].firma, 'Kardeşler');
  assert.equal(h.body.siparisler[0].belgeler[0].ad, 'Sözleşme'); assert.equal(h.body.talepler.length, 0);
  const mm = await call('POST', '/api/siparis-mesaj', { tok: 'tok-user', body: { siparis: r.body.siparis, metin: 'Montaj ne zaman?' } });
  assert.equal(mm.statusCode, 200);
  assert.equal((await call('POST', '/api/yonetim/siparis', { tok: 'tok-user', body: { id: r.body.siparis, asama: 6 } })).statusCode, 403);
});

test('roller: yönetici, firma, doğrulanmamış e-posta', async () => {
  const { db, call } = kur();
  await db.collection('firmalar').doc('kardesler').set({ aktif: true, panelEpostalari: ['satis@kardesler.com'], tipler: ['prefabrik'] });
  assert.equal((await call('GET', '/api/ben')).statusCode, 401);
  assert.equal((await call('GET', '/api/ben', { tok: 'yanlis' })).statusCode, 401);
  assert.equal((await call('GET', '/api/ben', { tok: 'tok-admin' })).body.rol, 'admin');
  const f = await call('GET', '/api/ben', { tok: 'tok-firma' }); assert.equal(f.body.rol, 'firma'); assert.equal(f.body.firma, 'kardesler');
  assert.equal((await call('GET', '/api/ben', { tok: 'tok-dogrulanmamis' })).body.rol, 'kullanici');
  assert.equal((await call('GET', '/api/firma/ozet', { tok: 'tok-dogrulanmamis' })).statusCode, 403);
  assert.equal((await call('GET', '/api/yonetim/ozet', { tok: 'tok-firma' })).statusCode, 403);
  const y = await call('GET', '/api/yonetim/ozet', { tok: 'tok-admin' }); assert.equal(y.statusCode, 200, JSON.stringify(y.body));
});

test('firma ürün değişikliği onaydan sonra katalogda; başka firmanın modeline dokunamaz', async () => {
  const { db, mails, call } = kur();
  await db.collection('firmalar').doc('kardesler').set({ aktif: true, panelEpostalari: ['satis@kardesler.com'], tipler: ['prefabrik'], eposta: 'satis@kardesler.com' });
  assert.equal((await call('POST', '/api/firma/urun', { tok: 'tok-firma', body: { tur: 'guncelle', modelId: 'pramo/p78', veri: { fiyat: 1 } } })).statusCode, 404);
  const u = await call('POST', '/api/firma/urun', { tok: 'tok-firma', body: { tur: 'guncelle', modelId: 'kardesler/k82', veri: { fiyat: 650000, gorseller: ['https://k.example/a.jpg', 'javascript:alert(1)', 'http://k.example/b.jpg'] } } });
  assert.equal(u.statusCode, 200, JSON.stringify(u.body));
  assert.equal((await call('GET', '/api/katalog')).body.kayitlar.filter((x) => !x.uye).length, 0, 'onaysız yayına girmez');
  const o = await call('POST', '/api/yonetim/degisiklik', { tok: 'tok-admin', body: { id: u.body.id, karar: 'onay' } });
  assert.equal(o.statusCode, 200, JSON.stringify(o.body));
  const k = (await call('GET', '/api/katalog')).body.kayitlar.filter((x) => !x.uye);
  assert.equal(k.length, 1); assert.equal(k[0].fiyat, 650000); assert.deepEqual(k[0].gorseller, ['https://k.example/a.jpg']);
  assert.ok(mails.some((m) => m.to === 'satis@kardesler.com' && m.subject === 'Değişikliğiniz yayında'));
  assert.equal((await call('POST', '/api/yonetim/degisiklik', { tok: 'tok-admin', body: { id: u.body.id, karar: 'onay' } })).statusCode, 409);
  assert.equal((await call('POST', '/api/firma/urun', { tok: 'tok-firma', body: { tur: 'yeni', veri: { ad: 'Fotoğrafsız', tip: 'prefabrik' } } })).statusCode, 400, 'yeni üründe fotoğraf zorunlu');
  const yeni = await call('POST', '/api/firma/urun', { tok: 'tok-firma', body: { tur: 'yeni', veri: { ad: 'Yeni 120 m²', tip: 'prefabrik', m2: 120, kat: 2, nakliye: 'dahil', aciklama: 'Çift katlı, 4+1', fiyat: 900000, gorseller: ['https://k.example/y.jpg'] } } });
  await call('POST', '/api/yonetim/degisiklik', { tok: 'tok-admin', body: { id: yeni.body.id, karar: 'onay' } });
  const k2 = (await call('GET', '/api/katalog')).body.kayitlar;
  assert.ok(k2.some((x) => x.yeni && x.ad === 'Yeni 120 m²' && x.id.startsWith('kardesler/') && x.kat === 2 && x.nakliye === 'dahil' && x.aciklama === 'Çift katlı, 4+1'));
  const oz = await call('GET', '/api/firma/ozet', { tok: 'tok-firma' });
  assert.equal(oz.body.modeller.find((m) => m.id === 'kardesler/k82').fiyat, 650000);
  assert.ok(oz.body.modeller.some((m) => m.ad === 'Yeni 120 m²'));
});

test('firma geri bildirimi ve yönetim yanıtı', async () => {
  const { db, mails, call } = kur();
  await db.collection('firmalar').doc('kardesler').set({ aktif: true, panelEpostalari: ['satis@kardesler.com'], tipler: ['prefabrik'] });
  assert.equal((await call('POST', '/api/firma/geri-bildirim', { tok: 'tok-firma', body: { tur: 'hata', konu: '', mesaj: 'x' } })).statusCode, 400);
  const g = await call('POST', '/api/firma/geri-bildirim', { tok: 'tok-firma', body: { tur: 'hata', konu: 'Fotoğraf yüklenmiyor', mesaj: 'Panelde <b>hata</b> alıyorum' } });
  assert.equal(g.statusCode, 200);
  const adm = mails.find((m) => m.subject.includes('Firma geri bildirimi'));
  assert.ok(adm && adm.html.includes('&lt;b&gt;hata'), 'HTML kaçışı yapılmalı');
  await call('POST', '/api/yonetim/geri-bildirim', { tok: 'tok-admin', body: { id: g.body.id, metin: 'Düzelttik, tekrar dener misiniz?' } });
  const oz = await call('GET', '/api/firma/ozet', { tok: 'tok-firma' });
  assert.equal(oz.body.geriBildirimler[0].durum, 'cevaplandi'); assert.equal(oz.body.geriBildirimler[0].cevaplar[0].kim, 'yonetim');
  assert.ok(mails.some((m) => m.to === 'satis@kardesler.com' && m.subject.startsWith('Geri bildiriminize yanıt')));
  await call('POST', '/api/firma/geri-bildirim-yanit', { tok: 'tok-firma', body: { id: g.body.id, metin: 'Oldu, teşekkürler' } });
  const oz2 = await call('GET', '/api/firma/ozet', { tok: 'tok-firma' });
  assert.equal(oz2.body.geriBildirimler[0].cevaplar.length, 2);
});

test('firma başvurusu onayı firma hesabını açar', async () => {
  const { call, mails } = kur();
  const temel = { unvan: 'Örnek Yapı A.Ş.', marka: 'Örnek Prefabrik', vergiNo: '1234567890', yetkili: 'Ayşe', telefon: '05320000000', eposta: 'satis@kardesler.com', tipler: ['prefabrik'], iller: 'Malatya, Elazığ' };
  const refsiz = await call('POST', '/api/firma-basvuru', { body: { ...temel, sozlesmeOnay: true, abonelikOnay: true } });
  assert.equal(refsiz.statusCode, 400, 'referanssız kayıt alınmaz');
  const onaysiz = await call('POST', '/api/firma-basvuru', { body: { ...temel, referanslar: 'Malatya Yeşilyurt 2025, 90 m² ev, Mehmet Bey 0532...' } });
  assert.equal(onaysiz.statusCode, 400, 'sözleşme ve 499 TL üyelik onayı zorunlu');
  const evraksiz = await call('POST', '/api/firma-basvuru', { body: { ...temel, ...TAM, referanslar: 'Malatya Yeşilyurt 2025, 90 m² ev, Mehmet Bey 0532...', sozlesmeOnay: true, abonelikOnay: true } });
  assert.equal(evraksiz.statusCode, 400, 'evraksız başvuru alınmaz'); assert.match(evraksiz.body.hata, /Vergi levha/);
  const v = await evrakYukle(call, 'vergi-levhasi'); const f = await evrakYukle(call, 'sicil-gazetesi', 2_000_000, 'gazete.pdf');
  assert.equal(v.statusCode, 200, JSON.stringify(v.body)); assert.equal(f.statusCode, 200, JSON.stringify(f.body));
  const b = await call('POST', '/api/firma-basvuru', { body: { ...temel, ...TAM, evrak: [v.body, f.body], referanslar: 'Malatya Yeşilyurt 2025, 90 m² ev, Mehmet Bey 0532...', sozlesmeOnay: true, abonelikOnay: true } });
  assert.equal(b.statusCode, 200, JSON.stringify(b.body));
  // Aynı evrak ikinci başvuruda kullanılamaz
  assert.equal((await call('POST', '/api/firma-basvuru', { body: { ...temel, ...TAM, evrak: [v.body, f.body], referanslar: 'Malatya Yeşilyurt 2025, 90 m² ev, Mehmet Bey 0532...', sozlesmeOnay: true, abonelikOnay: true } })).statusCode, 400);
  assert.ok(mails.some((m) => m.subject === 'Başvurunuz alındı' && m.html.includes('499 TL')));
  const oz = await call('GET', '/api/yonetim/ozet', { tok: 'tok-admin' });
  const id = oz.body.basvurular[0].id;
  assert.equal(oz.body.basvurular[0].sozlesme.abonelikTl, 499);
  assert.equal((await call('POST', '/api/yonetim/basvuru', { tok: 'tok-admin', body: { id, karar: 'onay', odemeLinki: 'http://kotu' } })).statusCode, 400);
  const o = await call('POST', '/api/yonetim/basvuru', { tok: 'tok-admin', body: { id, karar: 'onay', odemeLinki: 'https://odeme.example/abc' } });
  assert.equal(o.body.slug, 'ornek-prefabrik');
  const ben = await call('GET', '/api/ben', { tok: 'tok-firma' });
  assert.equal(ben.body.firma, 'ornek-prefabrik');
  assert.ok(mails.some((m) => m.subject === 'Firma hesabınız açıldı' && m.html.includes('https://odeme.example/abc')), 'onay e-postasında ödeme bağlantısı');
  const fp = await call('GET', '/api/firma/ozet', { tok: 'tok-firma' });
  assert.equal(fp.body.abonelik.durum, 'odeme-bekliyor'); assert.equal(fp.body.abonelik.odemeLinki, 'https://odeme.example/abc'); assert.equal(fp.body.abonelik.tutar, 499);
  // Yönetim ödemeyi işler, bağlantıyı yeniden gönderir
  const a = await call('POST', '/api/yonetim/firma', { tok: 'tok-admin', body: { slug: 'ornek-prefabrik', sadeceAbonelik: true, abonelik: { durum: 'aktif', sonOdeme: '2026-11-02', sonrakiOdeme: '2026-12-02', odemeLinki: 'https://odeme.example/dec', linkGonder: true } } });
  assert.equal(a.statusCode, 200, JSON.stringify(a.body));
  const fp2 = await call('GET', '/api/firma/ozet', { tok: 'tok-firma' });
  assert.equal(fp2.body.abonelik.durum, 'aktif'); assert.equal(fp2.body.abonelik.sonrakiOdeme, '2026-12-02');
  assert.equal(fp2.body.firma.aktif, true, 'sadece üyelik güncellemesi diğer alanlara dokunmaz');
  assert.ok(mails.some((m) => m.to === 'satis@kardesler.com' && m.html.includes('https://odeme.example/dec')));
});

test('banner doğrulaması ve yayın', async () => {
  const { call } = kur();
  assert.equal((await call('POST', '/api/yonetim/banner', { tok: 'tok-admin', body: { baslik: 'X', gorsel: 'http://kotu', link: '/' } })).statusCode, 400);
  assert.equal((await call('POST', '/api/yonetim/banner', { tok: 'tok-admin', body: { baslik: 'Kış kampanyası', gorsel: 'https://cdn.example/b.jpg', link: 'javascript:alert(1)' } })).statusCode, 400);
  assert.equal((await call('POST', '/api/yonetim/banner', { tok: 'tok-admin', body: { baslik: 'Kış kampanyası', metin: '%10 indirim', gorsel: 'https://cdn.example/b.jpg', link: '/firma/kardesler/' } })).statusCode, 200);
  const b = await call('GET', '/api/bannerlar'); assert.equal(b.body.bannerlar.length, 1); assert.equal(b.getHeader('Cache-Control'), 'public, max-age=300, s-maxage=600');
  assert.equal(b.body.bannerlar[0].konum, 'ana');
});

test('reklam alanları: ana ve yan en fazla 6, öne çıkan listeleme model ister', async () => {
  const { call } = kur();
  const ekle = (konum, i, ek = {}) => call('POST', '/api/yonetim/banner', { tok: 'tok-admin', body: { konum, baslik: `${konum} ${i}`, gorsel: 'https://cdn.example/b.jpg', link: '/', ...ek } });
  for (let i = 0; i < 6; i++) assert.equal((await ekle('ana', i)).statusCode, 200);
  assert.equal((await ekle('ana', 7)).statusCode, 409, '7. ana banner reddedilir');
  assert.equal((await ekle('ana', 8, { aktif: false })).statusCode, 200, 'pasif kayıt sınırı aşmaz');
  for (let i = 0; i < 6; i++) assert.equal((await ekle('yan', i)).statusCode, 200);
  assert.equal((await ekle('yan', 7)).statusCode, 409);
  assert.equal((await ekle('ana', 9, { bitis: '2020-01-01' })).statusCode, 409, 'süresi geçmiş kayıt sayılmaz ama yeni kayıt da sınırı aşamaz');
  assert.equal((await call('POST', '/api/yonetim/banner', { tok: 'tok-admin', body: { konum: 'liste', modelId: 'yok/yok' } })).statusCode, 400);
  assert.equal((await call('POST', '/api/yonetim/banner', { tok: 'tok-admin', body: { konum: 'liste', modelId: 'kardesler/k82' } })).statusCode, 200);
  const b = (await call('GET', '/api/bannerlar')).body.bannerlar;
  assert.equal(b.filter((x) => x.konum === 'ana').length, 6); assert.equal(b.filter((x) => x.konum === 'yan').length, 6);
  assert.deepEqual(b.filter((x) => x.konum === 'liste').map((x) => x.modelId), ['kardesler/k82']);
});

test('firma reklam talebi, ödeme bağlantısı ve sözleşmeye aykırılıkta yayından kaldırma', async () => {
  const { db, mails, call } = kur();
  await db.collection('firmalar').doc('kardesler').set({ aktif: true, panelEpostalari: ['satis@kardesler.com'], tipler: ['prefabrik'], eposta: 'satis@kardesler.com', iller: ['*'] });
  assert.equal((await call('POST', '/api/firma/reklam', { tok: 'tok-firma', body: { paket: 'bedava' } })).statusCode, 400);
  assert.equal((await call('POST', '/api/firma/reklam', { tok: 'tok-firma', body: { paket: 'liste', modelId: 'pramo/p78' } })).statusCode, 400, 'başka firmanın modeli öne çıkarılamaz');
  const r = await call('POST', '/api/firma/reklam', { tok: 'tok-firma', body: { paket: 'ikisi', not: 'Kasım kampanyası' } });
  assert.equal(r.statusCode, 200, JSON.stringify(r.body));
  assert.ok(mails.some((m) => m.to === 'info@mitraajans.com' && m.html.includes('45.000 TL')));
  const oz = await call('GET', '/api/yonetim/ozet', { tok: 'tok-admin' });
  assert.equal(oz.body.reklamTalepleri[0].fiyat, 45000);
  await call('POST', '/api/yonetim/reklam-talep', { tok: 'tok-admin', body: { id: r.body.id, durum: 'odeme-bekliyor', odemeLinki: 'https://odeme.example/r1', linkGonder: true } });
  assert.ok(mails.some((m) => m.to === 'satis@kardesler.com' && m.html.includes('https://odeme.example/r1')));
  const fp = await call('GET', '/api/firma/ozet', { tok: 'tok-firma' });
  assert.equal(fp.body.reklamlar[0].durum, 'odeme-bekliyor'); assert.equal(fp.body.reklamlar[0].odemeLinki, 'https://odeme.example/r1');
  // Müşteri mağduriyeti: firma yayından kaldırılır, talep almaz
  await call('POST', '/api/yonetim/firma', { tok: 'tok-admin', body: { slug: 'kardesler', sadeceAbonelik: true, yayindanKaldir: true, neden: 'Müşteri şikâyeti' } });
  const k = (await call('GET', '/api/katalog')).body.kayitlar;
  assert.ok(k.some((x) => x.id === 'firma:kardesler' && x.gizli));
  assert.ok(!k.some((x) => x.id === 'uye:kardesler'), 'kaldırılan firma üye sayılmaz');
  const t = await call('POST', '/api/teklif', { body: TALEP });
  assert.equal(t.body.firmaSayisi, 0, 'kaldırılan firmaya talep gitmez');
});

test('favoriler hesaba birleşerek kaydedilir', async () => {
  const { call } = kur();
  await call('POST', '/api/favoriler', { tok: 'tok-user', body: { favoriler: ['a/b', 'c/d'] } });
  const r = await call('POST', '/api/favoriler', { tok: 'tok-user', body: { favoriler: ['c/d', 'e/f'] } });
  assert.deepEqual(r.body.favoriler, ['a/b', 'c/d', 'e/f']);
  const s = await call('POST', '/api/favoriler', { tok: 'tok-user', body: { favoriler: ['e/f'], degistir: true } });
  assert.deepEqual(s.body.favoriler, ['e/f']);
});

test('aylık fiyat kontrolü: aynı, değişmiş, ulaşılamayan', async () => {
  const { db, mails } = kur();
  const sayfalar = { 'https://k.example/82': '<p>Fiyat: 600.000 TL</p>', 'https://p.example/78': '<div>78 m² ev <b>549.900 ₺</b> KDV dahil, 95 m² 636.998 TL</div>' };
  const fetch = async (u) => { if (!sayfalar[u]) throw new Error('ağ'); return { ok: true, text: async () => sayfalar[u] }; };
  const r = await fiyatKontrolu({ db, mail: async (to, s, h) => mails.push({ to, subject: s, html: h }), ayar: () => ({ site: 'https://x', admin: 'info@mitraajans.com' }), FieldValue, MODELS, fetch });
  assert.deepEqual(r, { toplam: 3, ayni: 1, degismis: 1, erisilemedi: 1 });
  const d = db.dump('urunDegisiklikleri/');
  assert.equal(d.length, 1); assert.equal(d[0][1].veri.fiyat, 549900, 'en yakın aday önerilmeli');
  assert.ok(mails.some((m) => m.subject.startsWith('Aylık fiyat kontrolü')));
});

test('yardımcılar', () => {
  assert.deepEqual(fiyatAdaylari(sayfaMetni('<span>Fiyat</span> <b>1.250.000</b> TL; telefon 0532 123 45 67; 2026 yılı')), [1250000]);
  assert.equal(katalogId('a/b'), 'a__b');
});


test('üye olmayan firmalar davet alır, ödeme yapmayan fiyat veremez, panelden fiyat + not', async () => {
  const { db, mails, call } = kur();
  // FIRMS'e e-posta ekle (sitelerinden alınmış adres)
  const F2 = [{ slug: 'kardesler', kisaAd: 'Kardeşler', il: 'Malatya', tipler: ['prefabrik'] }, { slug: 'pramo', kisaAd: 'Pramo', il: 'Kocaeli', tipler: ['prefabrik'], eposta: 'info@pramo.example' }];
  const { FakeDb: FD } = await import('./fakeDb.js');
  const db2 = new FD(); const mails2 = [];
  const app2 = createApp({ db: db2, FieldValue, Timestamp, FIRMS: F2, MODELS, saat: 48, simdi: zaman.simdi,
    auth: { verifyIdToken: async (t) => { if (!KULLANICI[t]) throw new Error('bad'); return KULLANICI[t]; } },
    mail: async (to, subject, html, o) => { mails2.push({ to, subject, html, o }); },
    ayar: () => ({ site: 'https://www.prefabrikteklif.com.tr', admin: 'info@mitraajans.com', yoneticiler: ['info@mitraajans.com'], placesKey: '' }) });
  const call2 = async (method, path, { body, query, tok } = {}) => { const r = res(); await app2.handle({ method, path, body, query: query || {}, headers: { 'x-forwarded-for': '9.9.9.' + Math.floor(Math.random() * 250), ...(tok ? { authorization: 'Bearer ' + tok } : {}) } }, r); return r; };
  // Kardeşler kayıtlı ama ödeme yapmamış; Pramo yalnızca listelenmiş
  await db2.collection('firmalar').doc('kardesler').set({ aktif: true, eposta: 'satis@kardesler.com', panelEpostalari: ['satis@kardesler.com'], tipler: ['prefabrik'], iller: ['*'], abonelik: { durum: 'odeme-bekliyor', odemeLinki: 'https://odeme.example/1' } });
  const r = await call2('POST', '/api/teklif', { body: TALEP });
  assert.equal(r.statusCode, 200, JSON.stringify(r.body)); assert.equal(r.body.firmaSayisi, 2);
  const davet = mails2.find((m) => m.to === 'info@pramo.example');
  assert.ok(davet && davet.html.includes('/firma-kayit/?firma=pramo&amp;davet=') && davet.o?.iptal, 'listelenmiş firmaya kayıt daveti ve bildirim iptali');
  assert.ok(!davet.html.includes('Ali Veli') && !davet.html.includes('0532'), 'davette müşteri bilgisi yok');
  const odeme = mails2.find((m) => m.to === 'satis@kardesler.com');
  assert.ok(odeme && odeme.html.includes('https://odeme.example/1'), 'ödeme bekleyen firmaya ödeme bağlantısı');
  // Ödeme yapmayan firma panelden fiyat veremez
  const oz = await call2('GET', '/api/firma/ozet', { tok: 'tok-firma' });
  assert.equal(oz.body.uye, false); assert.equal(oz.body.talepler.length, 1);
  const tid = oz.body.talepler[0].id;
  assert.equal((await call2('POST', '/api/firma/teklif', { tok: 'tok-firma', body: { talep: tid, fiyat: 600000 } })).statusCode, 402);
  // Yönetim üyeliği aktif yapınca firma e-posta alır ve fiyat + not verir
  assert.equal((await call2('POST', '/api/yonetim/firma', { tok: 'tok-admin', body: { slug: 'kardesler', sadeceAbonelik: true, abonelik: { durum: 'aktif' } } })).statusCode, 200);
  assert.ok(mails2.some((m) => m.to === 'satis@kardesler.com' && m.subject.startsWith('Üyeliğiniz aktif')));
  const t = await call2('POST', '/api/firma/teklif', { tok: 'tok-firma', body: { talep: tid, fiyat: 600000, not: 'Arsa eğimliyse zemin betonu +40.000 TL' } });
  assert.equal(t.statusCode, 200, JSON.stringify(t.body)); assert.equal(t.body.musteri.telefon, '0532 111 22 33');
  // Doğrulanmış firma katalogda işaretlenir
  assert.ok((await call2('GET', '/api/katalog')).body.kayitlar.some((x) => x.id === 'uye:kardesler'));
  // Davet bağlantısıyla başvuru, sonra bildirim iptali; ikinci talepte davet gitmez
  const kod = decodeURIComponent(davet.html.match(/davet=([^"&]+)/)[1]);
  const ev1 = await evrakYukle(call2, 'vergi-levhasi'); const ev2 = await evrakYukle(call2, 'faaliyet', 3000, 'faaliyet.jpg', '\xff\xd8\xff\xe0');
  const bas = await call2('POST', '/api/firma-basvuru', { body: { ...TAM, evrak: [ev1.body, ev2.body], unvan: 'Pramo A.Ş.', vergiNo: '1234567890', yetkili: 'Ayşe', eposta: 'info@pramo.example', tipler: ['prefabrik'], iller: 'Tüm Türkiye', referanslar: 'Bursa 2025 teslim: Mehmet Bey 0555', sozlesmeOnay: true, abonelikOnay: true, mevcut: 'pramo', davet: kod } });
  assert.equal(bas.statusCode, 200, JSON.stringify(bas.body));
  const iptal = decodeURIComponent(davet.html.match(/bildirim-iptal\/\?f=([^"&]+)/)[1]);
  assert.equal((await call2('POST', '/api/bildirim-iptal', { body: { f: 'pramo.yanlis' } })).statusCode, 404);
  assert.equal((await call2('POST', '/api/bildirim-iptal', { body: { f: iptal } })).statusCode, 200);
  mails2.length = 0;
  await call2('POST', '/api/teklif', { body: { ...TALEP, eposta: 'b@ornek.com' } });
  assert.ok(!mails2.some((m) => m.to === 'info@pramo.example'), 'iptal eden firmaya davet gitmez');
});

test('üye kullanıcı yorumu: satın aldı/almadı, onay, belge', async () => {
  const { db, call } = kur();
  assert.equal((await call('POST', '/api/yorum', { body: { firma: 'pramo', puan: 4, metin: 'x'.repeat(40) } })).statusCode, 401);
  assert.equal((await call('POST', '/api/yorum', { tok: 'tok-user', body: { firma: 'pramo', puan: 4, metin: 'kısa' } })).statusCode, 400);
  const y = await call('POST', '/api/yorum', { tok: 'tok-user', body: { firma: 'pramo', puan: 4, satinAldi: 'evet', fiyat: 5, teslim: 3, metin: 'Teslim biraz gecikti ama ev beklediğimiz gibi çıktı, memnunuz.' } });
  assert.equal(y.statusCode, 200, JSON.stringify(y.body));
  await call('POST', '/api/yorum', { tok: 'tok-user', body: { firma: 'kardesler', puan: 3, satinAldi: 'hayir', metin: 'Teklif aldım, iletişim hızlıydı ama fiyat bütçemi aştı.' } });
  assert.equal((await call('GET', '/api/yorumlar', { query: { firma: 'pramo' } })).body.yorumlar.length, 0, 'onaysız görünmez');
  const oz = await call('GET', '/api/yonetim/ozet', { tok: 'tok-admin' });
  const yp = oz.body.yorumlar.find((x) => x.firma === 'pramo');
  assert.equal((await call('POST', '/api/yonetim/yorum', { tok: 'tok-admin', body: { id: yp.id, karar: 'onay', belge: true } })).statusCode, 200);
  const yk = oz.body.yorumlar.find((x) => x.firma === 'kardesler');
  await call('POST', '/api/yonetim/yorum', { tok: 'tok-admin', body: { id: yk.id, karar: 'onay' } });
  const lp = (await call('GET', '/api/yorumlar', { query: { firma: 'pramo' } })).body.yorumlar;
  assert.equal(lp.length, 1); assert.equal(lp[0].satinAldi, true); assert.equal(lp[0].belgeli, true); assert.equal(lp[0].puan, 4);
  const lk = (await call('GET', '/api/yorumlar', { query: { firma: 'kardesler' } })).body.yorumlar;
  assert.equal(lk[0].satinAldi, false);
  // Firma kendi firmasına yorum yazamaz
  await db.collection('firmalar').doc('kardesler').set({ aktif: true, panelEpostalari: ['satis@kardesler.com'], tipler: ['prefabrik'] });
  assert.equal((await call('POST', '/api/yorum', { tok: 'tok-firma', body: { firma: 'kardesler', puan: 5, metin: 'x'.repeat(40) } })).statusCode, 403);
});

test('firma fotoğraf yükler, sitemizden sunulur', async () => {
  const { db, call } = kur();
  await db.collection('firmalar').doc('kardesler').set({ aktif: true, panelEpostalari: ['satis@kardesler.com'], tipler: ['prefabrik'] });
  assert.equal((await call('POST', '/api/firma/gorsel', { tok: 'tok-firma', body: { veri: 'data:text/html;base64,PGI+' } })).statusCode, 400);
  const g = await call('POST', '/api/firma/gorsel', { tok: 'tok-firma', body: { veri: 'data:image/webp;base64,' + Buffer.from('RIFFxxxxWEBP').toString('base64') } });
  assert.equal(g.statusCode, 200, JSON.stringify(g.body)); assert.ok(g.body.url.startsWith('https://www.prefabrikteklif.com.tr/api/gorsel/'));
  const id = g.body.url.split('/').pop();
  const r = res(); r.send = function (b) { this.body = b; return this; };
  const { app } = kur();
  // aynı veritabanı üzerinden okunur
  const r2 = await call('GET', '/api/gorsel/' + id);
  assert.equal(r2.statusCode, 200); assert.equal(r2.h['content-type'], 'image/webp'); assert.match(r2.h['cache-control'], /immutable/);
});


test('evrak yükleme: tür, boyut, içerik denetimi ve yönetimden indirme', async () => {
  const { call, db } = kur();
  assert.equal((await call('POST', '/api/belge', { body: { islem: 'baslat', ad: 'virus.exe', tur: 'vergi-levhasi', boyut: 100 } })).statusCode, 415);
  assert.equal((await call('POST', '/api/belge', { body: { islem: 'baslat', ad: 'buyuk.pdf', tur: 'vergi-levhasi', boyut: 11 * 1024 * 1024 } })).statusCode, 413);
  assert.equal((await call('POST', '/api/belge', { body: { islem: 'baslat', ad: 'a.pdf', tur: 'yok', boyut: 100 } })).statusCode, 400);
  const sahte = await evrakYukle(call, 'vergi-levhasi', 500, 'sahte.pdf', '<html><script>');
  assert.equal(sahte.statusCode, 415, 'uzantısı pdf ama içeriği değilse reddedilir');
  const heic = await evrakYukle(call, 'faaliyet', 1500, 'foto.heic', '\0\0\0\x18ftypheic');
  assert.equal(heic.statusCode, 200, JSON.stringify(heic.body));
  const b = await call('POST', '/api/belge', { body: { islem: 'baslat', ad: 'x.pdf', tur: 'diger', boyut: 1000 } });
  assert.equal((await call('POST', '/api/belge', { body: { islem: 'parca', id: b.body.id, anahtar: 'yanlis', i: 0, veri: 'AAAA' } })).statusCode, 404, 'anahtarsız parça eklenemez');
  assert.equal((await call('POST', '/api/belge', { body: { islem: 'bitir', id: b.body.id, anahtar: b.body.anahtar } })).statusCode, 400, 'eksik dosya tamamlanamaz');
  const pdf = await evrakYukle(call, 'vergi-levhasi', 2_500_000);
  assert.equal(pdf.statusCode, 200);
  assert.equal((await call('GET', '/api/yonetim/belge', { query: { id: pdf.body.id }, tok: 'tok-user' })).statusCode, 403, 'yalnızca yönetici indirir');
  const ind = await call('GET', '/api/yonetim/belge', { query: { id: pdf.body.id }, tok: 'tok-admin' });
  assert.equal(ind.statusCode, 200); assert.equal(ind.body.boyut, 2_500_000); assert.equal(ind.body.mime, 'application/pdf');
});

test('hiçbir uç bozuk girdide 500 vermez (boş/garip kimlik, eksik gövde)', async () => {
  const { call, app } = kur();
  const kotu = ['', '/', 'a/b', '..', ' ', 'x'.repeat(500), '__x__'];
  const sorunlu = [];
  for (const anahtar of Object.keys(app.routes)) {
    const [method, path] = anahtar.split(' ');
    for (const v of kotu) {
      const govde = { id: v, talep: v, firma: v, slug: v, t: v, kod: v, islem: v, anahtar: v, ad: v, eposta: v };
      for (const tok of [undefined, 'tok-user', 'tok-firma', 'tok-admin']) {
        const r = await call(method, path, { body: method === 'GET' ? undefined : govde, query: method === 'GET' ? govde : {}, tok });
        if (r.statusCode >= 500) sorunlu.push(`${anahtar} [${JSON.stringify(v).slice(0, 12)}] ${tok || '-'} → ${r.statusCode}`);
      }
    }
  }
  assert.deepEqual(sorunlu, []);
});

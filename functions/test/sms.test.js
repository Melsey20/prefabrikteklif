// Telefonla giriş: Netgsm OTP SMS + Firebase özel oturum anahtarı
import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeDb, FieldValue, Timestamp, zaman, res } from './fakeDb.js';
import { createApp } from '../app.js';
import { netgsmIstemci } from '../netgsm.js';
import { iletiMerkeziIstemci } from '../iletimerkezi.js';

function kur({ netgsm = { kullanici: 'u', sifre: 's', baslik: 'PREFABTKLF' }, iletimerkezi = {}, cevap = '<xml><main><code>0</code><jobID>123</jobID></main></xml>' } = {}) {
  const db = new FakeDb(); const giden = []; const kullanicilar = new Map(); const tokenlar = [];
  const fetch = async (url, o) => { giden.push({ url, govde: o.body }); const c = typeof cevap === 'function' ? cevap() : cevap; return { ok: true, status: 200, text: async () => (typeof c === 'string' ? c : JSON.stringify(c)), json: async () => (typeof c === 'string' ? JSON.parse(c) : c) }; };
  const auth = {
    verifyIdToken: async () => { throw new Error('bad'); },
    getUserByPhoneNumber: async (p) => { const u = [...kullanicilar.values()].find((x) => x.phoneNumber === p); if (!u) throw Object.assign(new Error('yok'), { code: 'auth/user-not-found' }); return u; },
    createUser: async ({ phoneNumber }) => { const u = { uid: 'yeni' + kullanicilar.size, phoneNumber, disabled: false }; kullanicilar.set(u.uid, u); return u; },
    createCustomToken: async (uid, c) => { tokenlar.push({ uid, c }); return 'ozel-' + uid; },
  };
  const app = createApp({ db, auth, FieldValue, Timestamp, FIRMS: [], MODELS: [], simdi: zaman.simdi, fetch, mail: async () => {}, ayar: () => ({ site: 'https://www.prefabrikteklif.com.tr', admin: 'a@b.c', yoneticiler: [], netgsm, iletimerkezi }) });
  let ip = 1;
  const call = async (path, body, sabitIp) => { const r = res(); await app.handle({ method: 'POST', path, body, query: {}, headers: { 'x-forwarded-for': sabitIp || '9.9.9.' + (ip++ % 250) } }, r); return r; };
  const kodu = () => /giris kodunuz: (\d{6})/.exec(giden.at(-1).govde)[1];
  return { db, giden, kullanicilar, tokenlar, call, kodu };
}

test('sms: SMS ayarı yoksa Firebase SMS’e yönlendirir', async () => {
  const { call, giden } = kur({ netgsm: {} });
  const r = await call('/api/sms/kod', { telefon: '0532 111 22 33' });
  assert.equal(r.statusCode, 200); assert.equal(r.body.kanal, 'firebase'); assert.equal(giden.length, 0);
});

test('sms: kod gönderilir, doğru kodla yeni kullanıcı açılır ve oturum anahtarı döner', async () => {
  const { call, giden, kodu, tokenlar, kullanicilar, db } = kur();
  assert.equal((await call('/api/sms/kod', { telefon: '12345' })).statusCode, 400);
  assert.equal((await call('/api/sms/kod', { telefon: '0212 111 22 33' })).statusCode, 400, 'sabit hat kabul edilmez');
  const r = await call('/api/sms/kod', { telefon: '+90 532 111 22 33' });
  assert.equal(r.statusCode, 200, JSON.stringify(r.body)); assert.equal(r.body.kanal, 'sunucu');
  assert.equal(giden[0].url, 'https://api.netgsm.com.tr/sms/send/otp');
  assert.match(giden[0].govde, /<no>5321112233<\/no>/); assert.match(giden[0].govde, /<msgheader>PREFABTKLF<\/msgheader>/);
  assert.match(giden[0].govde, /@www\.prefabrikteklif\.com\.tr #\d{6}/, 'otomatik doldurma satırı');
  assert.doesNotMatch(giden[0].govde.split('<msg>')[1], /[çğıöşüÇĞİÖŞÜ]/, 'OTP metninde Türkçe karakter yok');
  const k = kodu();
  const kayit = db.dump('smsKodlari/')[0][1];
  assert.ok(!JSON.stringify(kayit).includes(k), 'kod veritabanında açık saklanmaz');
  const yanlis = await call('/api/sms/dogrula', { telefon: '05321112233', kod: k === '000000' ? '111111' : '000000' });
  assert.equal(yanlis.statusCode, 400); assert.match(yanlis.body.hata, /4 deneme/);
  const ok = await call('/api/sms/dogrula', { telefon: '05321112233', kod: k });
  assert.equal(ok.statusCode, 200, JSON.stringify(ok.body)); assert.equal(ok.body.token, 'ozel-yeni0');
  assert.equal(kullanicilar.get('yeni0').phoneNumber, '+905321112233');
  assert.equal(tokenlar[0].c.girisYontemi, 'sms');
  const tekrar = await call('/api/sms/dogrula', { telefon: '05321112233', kod: k });
  assert.equal(tekrar.statusCode, 400, 'kod ikinci kez kullanılamaz');
});

test('sms: mevcut telefon hesabı aynı kullanıcıyla açılır, kapalı hesap giremez', async () => {
  const { call, kodu, kullanicilar } = kur();
  kullanicilar.set('eski', { uid: 'eski', phoneNumber: '+905321112233', disabled: false });
  await call('/api/sms/kod', { telefon: '05321112233' });
  assert.equal((await call('/api/sms/dogrula', { telefon: '05321112233', kod: kodu() })).body.token, 'ozel-eski');
  kullanicilar.get('eski').disabled = true;
  zaman.ileri(61000);
  await call('/api/sms/kod', { telefon: '05321112233' });
  assert.equal((await call('/api/sms/dogrula', { telefon: '05321112233', kod: kodu() })).statusCode, 403);
});

test('sms: 60 sn bekleme, saatlik sınır, süre dolumu ve 5 yanlış deneme', async () => {
  const { call, kodu, giden } = kur();
  assert.equal((await call('/api/sms/kod', { telefon: '05051234567' })).statusCode, 200);
  const b = await call('/api/sms/kod', { telefon: '05051234567' });
  assert.equal(b.statusCode, 429); assert.match(b.body.hata, /saniye bekleyin/);
  for (let i = 0; i < 4; i++) { zaman.ileri(61000); assert.equal((await call('/api/sms/kod', { telefon: '05051234567' })).statusCode, 200); }
  zaman.ileri(61000);
  assert.equal((await call('/api/sms/kod', { telefon: '05051234567' })).statusCode, 429, 'saatte en fazla 5 kod');
  assert.equal(giden.length, 5);
  zaman.ileri(3600000);
  await call('/api/sms/kod', { telefon: '05051234567' });
  const k = kodu();
  zaman.ileri(5 * 60 * 1000 + 1000);
  assert.match((await call('/api/sms/dogrula', { telefon: '05051234567', kod: k })).body.hata, /süresi doldu/);
  zaman.ileri(61000);
  await call('/api/sms/kod', { telefon: '05051234567' });
  const dogru = kodu(); const yanlis = dogru === '123456' ? '654321' : '123456';
  for (let i = 0; i < 5; i++) await call('/api/sms/dogrula', { telefon: '05051234567', kod: yanlis });
  const s = await call('/api/sms/dogrula', { telefon: '05051234567', kod: dogru });
  assert.equal(s.statusCode, 429, '5 yanlıştan sonra doğru kod da kabul edilmez');
});

test('sms: aynı bağlantıdan çok istek sınırlanır', async () => {
  const { call } = kur();
  let son;
  for (let i = 0; i < 11; i++) son = await call('/api/sms/kod', { telefon: `0532000${String(i).padStart(4, '0')}` }, '7.7.7.7');
  assert.equal(son.statusCode, 429); assert.match(son.body.hata, /bağlantıdan/);
});

test('sms: Netgsm hata verirse Firebase’e düşer ve hata kaydedilir', async () => {
  const { call, db } = kur({ cevap: '<xml><main><code>30</code></main></xml>' });
  const r = await call('/api/sms/kod', { telefon: '05321112233' });
  assert.equal(r.statusCode, 200); assert.equal(r.body.kanal, 'firebase');
  assert.match((await db.collection('sistem').doc('sms').get()).data().sonHata, /^30 /);
  assert.equal((await call('/api/sms/dogrula', { telefon: '05321112233', kod: '123456' })).statusCode, 400, 'gönderilemeyen kod doğrulanamaz');
  const r2 = await call('/api/sms/kod', { telefon: '05321112233' });
  assert.equal(r2.body.kanal, 'firebase', 'bekleme süresine takılmadan yine Firebase’e düşer');
});

test('netgsm istemcisi: XML kaçışı ve dönüş kodları', async () => {
  let govde;
  const n = netgsmIstemci({ kullanici: 'a&b', sifre: 'x<y', baslik: 'B', fetch: async (u, o) => { govde = o.body; return { ok: true, status: 200, text: async () => '00 1234' }; } });
  assert.deepEqual((await n.otp('5321112233', 'kod')).ok, true);
  assert.match(govde, /<usercode>a&amp;b<\/usercode><password>x&lt;y<\/password>/);
  const h = netgsmIstemci({ kullanici: 'a', sifre: 'b', baslik: 'c', fetch: async () => ({ ok: true, status: 200, text: async () => '<xml><main><code>40</code></main></xml>' }) });
  const r = await h.otp('5321112233', 'kod'); assert.equal(r.ok, false); assert.equal(r.kod, '40'); assert.match(r.aciklama, /başlığı/);
  assert.equal(netgsmIstemci({}).hazir, false);
});

test('sms: İleti Merkezi tanımlıysa önce o kullanılır (JSON, iys=0, 90 ile numara)', async () => {
  const { call, giden, kodu } = kur({ iletimerkezi: { key: 'k', hash: 'h', baslik: 'PREFABTKLF' }, cevap: { response: { status: { code: 200, message: 'İşlem başarılı' }, order: { id: '1' } } } });
  const r = await call('/api/sms/kod', { telefon: '05321112233' });
  assert.equal(r.body.kanal, 'sunucu');
  assert.equal(giden[0].url, 'https://api.iletimerkezi.com/v1/send-sms/json');
  const g = JSON.parse(giden[0].govde).request;
  assert.deepEqual(g.authentication, { key: 'k', hash: 'h' });
  assert.equal(g.order.sender, 'PREFABTKLF'); assert.equal(g.order.iys, '0');
  assert.deepEqual(g.order.message.receipents.number, ['905321112233']);
  assert.ok(kodu());
  const ok = await call('/api/sms/dogrula', { telefon: '05321112233', kod: kodu() });
  assert.equal(ok.statusCode, 200);
});

test('sms: İleti Merkezi hata verirse Firebase’e düşer', async () => {
  const { call, db } = kur({ netgsm: {}, iletimerkezi: { key: 'k', hash: 'h', baslik: 'B' }, cevap: { response: { status: { code: 402, message: 'Bakiye yetersiz' } } } });
  const r = await call('/api/sms/kod', { telefon: '05321112233' });
  assert.equal(r.body.kanal, 'firebase');
  const s = (await db.collection('sistem').doc('sms').get()).data();
  assert.match(s.sonHata, /^402 Bakiye/); assert.equal(s.saglayici, 'iletimerkezi');
  assert.equal(iletiMerkeziIstemci({}).hazir, false);
});

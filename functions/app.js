// PrefabrikTeklif API: tüm iş kuralları burada. index.js gerçek Firebase bağlantılarıyla çağırır,
// testler sahte veritabanıyla çağırır (functions/test/).
import crypto from 'node:crypto';
import { iyzicoIstemci } from './iyzico.js';
import { netgsmIstemci } from './netgsm.js';
import { iletiMerkeziIstemci } from './iletimerkezi.js';

export const TIP_AD = { prefabrik: 'Prefabrik ev', celik: 'Çelik ev', konteyner: 'Konteyner ev', 'tiny house': 'Tiny house', ahsap: 'Ahşap ev', bungalov: 'Bungalov / bağ evi' };
export const ARAZI_AD = { imarli: 'İmarlı arsa', koy: 'Köy yerleşik alanı', tarla: 'Tarla / tarım arazisi', bag: 'Bağ – bahçe', yok: 'Henüz arazi yok' };
export const KAPSAM_AD = { 'anahtar-teslim': 'Anahtar teslim', 'nakliye-montaj': 'Nakliye ve montaj', 'zemin-betonu': 'Zemin betonu', 'ruhsat-proje': 'Ruhsat ve proje' };
export const DAHIL_AD = { nakliye: 'Nakliye', montaj: 'Montaj', vinc: 'Vinç', zemin: 'Zemin betonu', 'ic-bitis': 'İç bitiş', 'mutfak-vitrifiye': 'Mutfak ve vitrifiye', ruhsat: 'Ruhsat ve proje' };
export const BUTCE_AD = { '0-500000': '500 bin TL altı', '500000-1000000': '500 bin – 1 milyon TL', '1000000-2000000': '1 – 2 milyon TL', '2000000-999999999': '2 milyon TL üstü' };
export const TESLIM_AD = { anahtar: 'Anahtar teslim', kaba: 'Kaba / ileri kaba' };
export const ASAMALAR = ['Ön görüşme', 'Keşif', 'Sözleşme', 'Üretim', 'Nakliye', 'Montaj', 'Teslim'];
export const ABONELIK_TL = 499;
export const KURUCU_KONTENJAN = 50; // açılış kampanyası: ilk 50 onaylı firmaya 1 ay ücretsiz (kalan sayı dışarıya gösterilmez)
export const KAMPANYA_BASLANGIC = Date.parse('2026-11-09T13:45:00+03:00'); // bu andan önce e-posta almış firmalara bir kez kampanya duyurusu gider
export const ARAMA_METNI = 'Türkiye’de Google’da her ay 150 binden fazla “prefabrik ev” ve “prefabrik ev fiyatları” araması yapılıyor (Semrush, Kasım 2026); çelik ev, konteyner ev ve tiny house aramalarıyla bu sayı daha da büyüyor.';
export const KOMISYON = 5;
export const REKLAM_PAKET = { ana: { ad: 'Ana banner', fiyat: 25000 }, yan: { ad: 'Yan banner (kaydırmalı)', fiyat: 25000 }, ikisi: { ad: 'Ana + yan banner', fiyat: 45000 }, ara: { ad: 'Ana sayfa ara banner', fiyat: 25000 }, liste: { ad: 'Ana sayfada öne çıkan listeleme', fiyat: 15000 } };
export const KONUM_SINIRI = { ana: 6, yan: 6, ara: 6, liste: 10 };
// Üye olmayan (yalnızca listelenmiş) firmalara bir talepte en fazla kaç davet gider ve aynı firmaya en sık ne kadar arayla
export const DAVET_SINIRI = 30;
export const TANITIM_UST = 150; // günlük tanıtım e-postası üst sınırı (alan adı ısındıkça kademeli artırılır) // üye firma azken talep başına davet edilen (üye olmayan) firma sayısı
export const DAVET_ARALIK_SAAT = 72;
export const DAVET_ALT_SINIR = 15; // bir talebe en az bu kadar listelenmiş firma davet edilir (uygun firma varsa)
// Doğrulanmış (üyeliği aktif) firma: taleplere fiyat verebilir
export const uyeAktif = (fd) => !!fd && fd.aktif !== false && !fd.kaldirildi && fd.abonelik?.durum === 'aktif';
export const ABONELIK_DURUM = { 'odeme-bekliyor': 'Ödeme bekleniyor', aktif: 'Aktif', gecikti: 'Ödeme gecikti', iptal: 'İptal' };
// Firma doğrulama evrakı: yalnızca PDF, PNG, JPEG, HEIC; dosya başına en fazla 10 MB; 900 KB'lık parçalarla yüklenir
export const EVRAK_TUR = { 'vergi-levhasi': 'Vergi levhası', faaliyet: 'Faaliyet belgesi', 'sicil-gazetesi': 'Ticaret Sicil Gazetesi', 'imza-sirkuleri': 'İmza sirküleri', diger: 'Diğer belge' };
export const EVRAK_MAKS = 10 * 1024 * 1024;
export const EVRAK_PARCA = 900 * 1024;
export const dosyaTuru = (b) => {
  if (!b || b.length < 12) return '';
  if (b.slice(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
  if (b[0] === 0x89 && b.slice(1, 4).toString('latin1') === 'PNG') return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  const ftyp = b.slice(4, 12).toString('latin1');
  if (/^ftyp(heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(ftyp)) return 'image/heic';
  return '';
};
export const GB_TUR = { istek: 'İstek / öneri', hata: 'Hata bildirimi', sorun: 'Sorun / şikâyet', diger: 'Diğer' };

export const str = (v, n = 200) => (typeof v === 'string' ? v.trim().slice(0, n) : typeof v === 'number' ? String(v).slice(0, n) : '');
export const arr = (v, n = 10, len = 60) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.trim().slice(0, len)).filter(Boolean).slice(0, n) : []);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const token = () => crypto.randomBytes(18).toString('base64url');
export const tl = (n) => new Intl.NumberFormat('tr-TR').format(n) + ' TL';
export const epostaMi = (e) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(e);
export const httpsUrl = (u) => { const s = str(u, 500); try { const x = new URL(s); return x.protocol === 'https:' ? x.href : ''; } catch { return ''; } };
export const katalogId = (id) => String(id).replace(/\//g, '__');
const tarihYazi = (d) => d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const sayi = (v, min, max) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? n : null; };

// ---- E-posta şablonu (tablo tabanlı; Gmail, Outlook ve mobil uygulamalarda aynı görünür) ----
const YESIL = '#17663f';
export const kart = (rows) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e3e8e1;border-radius:12px;background:#f8faf7;margin:16px 0">${rows.filter((r) => r[1] !== undefined && r[1] !== null && r[1] !== '').map((r, i) => `<tr><td style="padding:10px 16px;${i ? 'border-top:1px solid #e3e8e1;' : ''}color:#5b6760;font-size:13px;width:38%;vertical-align:top">${esc(r[0])}</td><td style="padding:10px 16px;${i ? 'border-top:1px solid #e3e8e1;' : ''}color:#13201a;font-size:14px;font-weight:bold">${esc(r[1])}</td></tr>`).join('')}</table>`;
export const buton = (url, yazi, ikincil = false) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 6px"><tr><td style="border-radius:10px;background:${ikincil ? '#ffffff' : YESIL};${ikincil ? `border:1.5px solid ${YESIL};` : ''}"><a href="${esc(url)}" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:${ikincil ? YESIL : '#ffffff'};text-decoration:none;border-radius:10px">${esc(yazi)}</a></td></tr></table>`;
// ust: başlığın üstündeki küçük etiket; alt: kartın altındaki bilgi notu (neden aldınız / iptal)
export const sablon = (baslik, icerik, o = {}) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${esc(baslik)}</title></head><body style="margin:0;padding:0;background:#eef2ec">${o.onizleme ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.onizleme)}</div>` : ''}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ec"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="padding:0 4px 16px"><a href="https://www.prefabrikteklif.com.tr/" style="text-decoration:none"><img src="https://www.prefabrikteklif.com.tr/logo-eposta.png" width="210" height="59" alt="Prefabrik Teklif" style="display:block;border:0;border-radius:16px;background:#ffffff"></a></td></tr>
<tr><td style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 2px 10px rgba(19,32,26,.06)">
<div style="height:6px;background:${YESIL};background:linear-gradient(90deg,${YESIL},#3fae6c)"></div>
<div style="padding:30px 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#13201a">
${o.ust ? `<p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;color:${YESIL}">${esc(o.ust)}</p>` : ''}<h1 style="margin:0 0 16px;font-size:23px;line-height:1.3;color:#13201a">${esc(baslik)}</h1>${icerik}
</div></td></tr>
<tr><td style="padding:20px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b766f;text-align:center">
<b style="color:#3e4a43">Prefabrik Teklif</b> · Türkiye’nin prefabrik ve tiny house karşılaştırma platformu<br><a href="https://www.prefabrikteklif.com.tr/" style="color:${YESIL};text-decoration:none">prefabrikteklif.com.tr</a> · <a href="https://www.instagram.com/prefabrik.teklif/" style="color:${YESIL};text-decoration:none">Instagram</a> · <a href="https://www.prefabrikteklif.com.tr/kvkk-aydinlatma-metni/" style="color:#6b766f">KVKK</a>${o.alt ? `<br><span style="color:#8a948d">${o.alt}</span>` : ''}
</td></tr></table></td></tr></table></body></html>`;

// Yasal metinlerin sürümleri: kullanıcı/firma onayları bu sürümlerle kaydedilir (metin değişince sürüm artırılır)
export const SOZLESME = {
  kvkk: { ad: 'KVKK Aydınlatma Metni', yol: '/kvkk-aydinlatma-metni/', surum: '2026-11' },
  riza: { ad: 'Açık rıza (talep bilgilerinin fiyat veren firmayla paylaşılması)', yol: '/kvkk-aydinlatma-metni/', surum: '2026-11' },
  kullanici: { ad: 'Kullanıcı Sözleşmesi', yol: '/kullanici-sozlesmesi/', surum: '2026-11' },
  gizlilik: { ad: 'Gizlilik ve Veri Koruma Politikası', yol: '/gizlilik-politikasi/', surum: '2026-11' },
  cerez: { ad: 'Çerez Politikası', yol: '/cerez-politikasi/', surum: '2026-11' },
  firma: { ad: 'Firma Üyelik Sözleşmesi', yol: '/firma-uyelik-sozlesmesi/', surum: '2026-11' },
  abonelik: { ad: 'Abonelik, Ödeme ve İptal Koşulları', yol: '/abonelik-ve-iptal-kosullari/', surum: '2026-11' },
  hizmet: { ad: 'Süreç Yönetimi Hizmet Sözleşmesi ve Ön Bilgilendirme', yol: '/surec-yonetimi-hizmet-sozlesmesi/', surum: '2026-11' },
  pazarlama: { ad: 'Ticari elektronik ileti onayı', yol: '/kvkk-aydinlatma-metni/', surum: '2026-11' },
};
export const telNorm = (t) => String(t || '').replace(/\D/g, '').slice(-10);

export class HttpHata extends Error { constructor(kod, mesaj) { super(mesaj); this.kod = kod; } }
const hata = (kod, mesaj) => { throw new HttpHata(kod, mesaj); };

/**
 * @param {object} o
 * @param {import('firebase-admin/firestore').Firestore} o.db
 * @param {{ verifyIdToken: (t: string) => Promise<any> }} o.auth
 * @param {(to: string, subject: string, html: string) => Promise<void>} o.mail
 * @param {() => {site: string, admin: string, yoneticiler: string[], placesKey: string}} o.ayar
 * @param {{ serverTimestamp: () => any, arrayUnion: (...a: any[]) => any }} o.FieldValue
 * @param {{ now: () => any, fromMillis: (n: number) => any }} o.Timestamp
 * @param {any[]} o.FIRMS
 * @param {any[]} o.MODELS
 * @param {typeof fetch} [o.fetch]
 */
export function createApp({ db, auth, mail, ayar, FieldValue, Timestamp, FIRMS, MODELS, fetch: fetchFn = globalThis.fetch, saat = 48, maksFirma = 40, simdi = Date.now }) {
  const firmAd = (slug) => FIRMS.find((f) => f.slug === slug)?.kisaAd || slug;
  const modelBul = (id) => MODELS.find((m) => m.id === id);
  const now = simdi;

  async function rateLimit(req, key, max) {
    const ip = String(req.headers?.['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const id = crypto.createHash('sha256').update(`${key}:${ip}`).digest('hex').slice(0, 32);
    const ref = db.collection('_rate').doc(id);
    const s = Math.floor(now() / 3600000);
    return db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      const d = snap.exists && snap.data().saat === s ? snap.data() : { saat: s, n: 0 };
      if (d.n >= max) return false;
      t.set(ref, { saat: s, n: d.n + 1, exp: Timestamp.fromMillis(now() + 2 * 3600000) });
      return true;
    });
  }

  // ---- Onay kayıtları: kim, hangi metnin hangi sürümünü, ne zaman, hangi bağlantıdan onayladı (ispat için saklanır) ----
  async function onayKaydet(req, o) {
    const ip = String(req.headers?.['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const belgeler = (o.belgeler || []).filter((k) => SOZLESME[k]).map((k) => ({ kod: k, ad: SOZLESME[k].ad, surum: SOZLESME[k].surum }));
    if (!belgeler.length) return;
    await db.collection('onaylar').add({
      tur: o.tur, uid: o.uid || null, eposta: o.eposta || '', telefon: o.telefon || '', firma: o.firma || '', ad: o.ad || '', kayit: o.kayit || '',
      belgeler, ip: ip.slice(0, 64), ipOzet: crypto.createHash('sha256').update(`onay:${ip}`).digest('hex').slice(0, 24),
      tarayici: str(req.headers?.['user-agent'], 300), zaman: FieldValue.serverTimestamp(), zamanMs: now(),
    }).catch((e) => console.error('Onay kaydedilemedi', e?.message));
  }
  const sayac = (alanlar) => db.collection('sistem').doc('sayac').set(Object.fromEntries(Object.entries(alanlar).map(([k, v]) => [k, FieldValue.increment(v)])), { merge: true }).catch(() => {});
  const firmaSayac = (slug, alanlar) => db.collection('firmalar').doc(slug).set(Object.fromEntries(Object.entries(alanlar).map(([k, v]) => [k, FieldValue.increment(v)])), { merge: true }).catch(() => {});

  // ---- Kimlik ----
  async function kim(req, zorunlu = true) {
    const h = String(req.headers?.authorization || '');
    const t = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!t) { if (zorunlu) hata(401, 'Giriş yapmanız gerekiyor.'); return null; }
    let u;
    try { u = await auth.verifyIdToken(t); } catch { if (zorunlu) hata(401, 'Oturumunuz sona erdi, tekrar giriş yapın.'); return null; }
    const eposta = String(u.email || '').toLowerCase();
    const telefon = String(u.phone_number || '');
    // Telefonla girişte numara SMS ile doğrulanmıştır
    const dogrulandi = !!u.email_verified || (!eposta && !!telefon);
    const a = ayar();
    let rol = 'kullanici'; let firma = null;
    if (dogrulandi && a.yoneticiler.includes(eposta)) rol = 'admin';
    if (dogrulandi && eposta) {
      const q = await db.collection('firmalar').where('panelEpostalari', 'array-contains', eposta).limit(1).get();
      if (!q.empty) { firma = q.docs[0].id; if (rol !== 'admin') rol = 'firma'; }
    }
    return { uid: u.uid, eposta, telefon, dogrulandi, ad: u.name || '', rol, firma };
  }
  const yonetici = async (req) => { const u = await kim(req); if (u.rol !== 'admin') hata(403, 'Bu işlem için yönetici yetkisi gerekiyor.'); return u; };
  const firmaKim = async (req) => {
    const u = await kim(req);
    if (!u.firma) {
      if (u.rol === 'admin' && str(req.query?.firma, 80)) return { ...u, firma: str(req.query.firma, 80) };
      hata(403, u.dogrulandi ? 'Bu e-posta bir firma hesabına bağlı değil. Firma başvurusu yapın veya bizimle iletişime geçin.' : 'Önce e-posta adresinizi doğrulayın.');
    }
    return u;
  };

  async function kayitliFirmalar(tip) {
    const q = await db.collection('firmalar').where('aktif', '==', true).where('tipler', 'array-contains', tip).get();
    return q.docs.map((d) => ({ slug: d.id, ...d.data() }));
  }
  const talepOzeti = (d) => [['Ev tipi', TIP_AD[d.tip]], ['Oda', d.oda], ['m²', d.m2], ['Yer', [d.il, d.ilce].filter(Boolean).join(' / ')], ['Arazi', ARAZI_AD[d.arazi]], ['Bütçe', BUTCE_AD[d.butce] || d.butce], ['Teslim', TESLIM_AD[d.teslim]], ['Zaman', d.zaman], ['İstenen kapsam', (d.kapsam || []).map((k) => KAPSAM_AD[k]).join(', ')], ['İlgilendiği model', d.model ? (modelBul(d.model)?.ad || d.model) : ''], ['Not', d.not]];

  // ---- POST /api/teklif ----
  async function teklif(req, res) {
    const b = req.body || {};
    if (str(b.website)) return { ok: true, firmaSayisi: 0 };
    const u = await kim(req, false);
    const mod = b.mod === 'surec' ? 'surec' : 'teklif';
    const d = {
      mod, tip: TIP_AD[b.tip] ? b.tip : 'prefabrik', oda: str(b.oda, 10), m2: sayi(b.m2, 5, 2000),
      arazi: ARAZI_AD[b.arazi] ? b.arazi : '', il: str(b.il, 40), ilce: str(b.ilce, 60), butce: BUTCE_AD[b.butce] ? b.butce : '', teslim: TESLIM_AD[b.teslim] ? b.teslim : '',
      zaman: str(b.zaman, 60), kapsam: arr(b.kapsam).filter((k) => KAPSAM_AD[k]), not: str(b.not, 1000), model: modelBul(str(b.model, 160)) ? str(b.model, 160) : '',
      ad: str(b.ad, 80), eposta: str(b.eposta, 120).toLowerCase(), telefon: str(b.telefon, 20), pazarlama: !!b.pazarlama,
    };
    if (!d.ad || !epostaMi(d.eposta) || d.telefon.replace(/\D/g, '').length < 10 || !d.il) hata(400, 'Lütfen zorunlu alanları doldurun.');
    if (!b.riza) hata(400, 'Devam etmek için açık rıza gerekli.');
    // Test talebi: yalnızca yönetici gönderebilir; yalnızca üyeliği aktif firmalara gider, listelenmiş firmalara davet gitmez
    const test = !!b.test && u?.rol === 'admin';
    if (test) d.test = true;
    if (!(await rateLimit(req, 'teklif', 5))) hata(429, 'Çok fazla talep gönderildi, bir saat sonra tekrar deneyin.');

    const a = ayar();
    const t0 = now();
    const ref = db.collection('talepler').doc();
    const tkn = token();
    const ortak = { ...d, telefonNorm: telNorm(d.telefon), uid: u?.uid || null, token: tkn, riza: true, rizaZamani: FieldValue.serverTimestamp(), olusturma: FieldValue.serverTimestamp() };
    await onayKaydet(req, { tur: mod === 'surec' ? 'surec-talebi' : 'teklif-talebi', kayit: ref.id, uid: u?.uid, eposta: d.eposta, telefon: d.telefon, ad: d.ad, belgeler: ['kvkk', 'riza', 'kullanici', ...(mod === 'surec' ? ['hizmet'] : []), ...(d.pazarlama ? ['pazarlama'] : [])] });
    if (!test) sayac({ talep: 1, ...(mod === 'surec' ? { surec: 1 } : {}) });

    if (mod === 'surec') {
      const sref = db.collection('siparisler').doc();
      await ref.set({ ...ortak, firmalar: [], secilen: arr(b.firmalar, 5).filter((s) => FIRMS.some((f) => f.slug === s)), durum: 'surec', siparis: sref.id });
      await sref.set({ talep: ref.id, uid: u?.uid || null, eposta: d.eposta, ad: d.ad, telefon: d.telefon, il: d.il, ilce: d.ilce, tip: d.tip, m2: d.m2, oda: d.oda, model: d.model, firma: '', asama: 0, notlar: [], belgeler: [], mesajlar: [], aktif: true, olusturma: FieldValue.serverTimestamp(), guncelleme: FieldValue.serverTimestamp() });
      await Promise.allSettled([
        mail(a.admin, `Süreç yönetimi talebi: ${TIP_AD[d.tip]} ${d.il}`, sablon('Yeni süreç yönetimi talebi', kart([...talepOzeti(d), ['Müşteri', d.ad], ['E-posta', d.eposta], ['Telefon', d.telefon], ['Öncelikli firmalar', arr(b.firmalar, 5).map(firmAd).join(', ')]]) + buton(`${a.site}/yonetim/#siparisler`, 'Yönetim panelinde aç'))),
        mail(d.eposta, 'Ön görüşme talebiniz alındı', sablon('Talebiniz alındı', `<p>Merhaba ${esc(d.ad)},</p><p>Süreç yönetimi talebiniz ekibimize ulaştı. En geç 1 iş günü içinde sizi arayıp ihtiyacınızı dinleyeceğiz. Süreç başladığında her adımı hesabınızdan takip edebilirsiniz.</p><p>Hizmet bedelimiz yalnızca ev bedelinin <b>%${KOMISYON}</b>’idir; tutarı sözleşmeden önce yazılı olarak bildiririz, gizli ücret yoktur.</p>${kart(talepOzeti(d))}${buton(`${a.site}/hesabim/`, 'Hesabım')}`)),
      ]);
      return { ok: true, firmaSayisi: 0, siparis: sref.id };
    }

    const secilen = arr(b.firmalar, 5).filter((s) => FIRMS.some((f) => f.slug === s));
    // Firmalar üç gruba ayrılır: üyeliği aktif (fiyat verebilir), kayıtlı ama ödeme bekleyen, yalnızca listelenmiş (üye değil)
    const fdocs = new Map((await db.collection('firmalar').get()).docs.map((x) => [x.id, x.data()]));
    const ilUyar = (f) => !f.iller?.length || f.iller.includes('*') || f.iller.includes(d.il);
    const tipUyar = (slug, f) => (f?.tipler?.length ? f.tipler : FIRMS.find((x) => x.slug === slug)?.tipler || []).includes(d.tip);
    const grup = (slug) => { const f = fdocs.get(slug); if (f?.kaldirildi) return 'kaldirildi'; if (f && f.aktif === false) return 'pasif'; if (uyeAktif(f)) return 'uye'; if (f && f.aktif !== false && (f.eposta || f.panelEpostalari?.length)) return 'odeme'; return 'liste'; };
    const kayitlar = new Map((await Promise.all(FIRMS.map(async (f) => [f.slug, (await db.collection('davetKayit').doc(f.slug).get()).data() || null]))));
    const donenler = new Set((await db.collection('tanitimKayit').where('gecersiz', '==', true).get()).docs.map((x) => String(x.data().eposta || '').toLowerCase()));
    const davetEdilebilir = (slug, secildi) => {
      const st = FIRMS.find((x) => x.slug === slug); const k = kayitlar.get(slug);
      if (!st?.eposta || k?.iptal || gecersizMi(k, st.eposta) || donenler.has(String(st.eposta).toLowerCase())) return false;
      return secildi || !k?.sonDavet || t0 - k.sonDavet > DAVET_ARALIK_SAAT * 3600000;
    };
    const hedef = [];
    const ekle = (slug) => { if (hedef.length < maksFirma && !hedef.includes(slug)) hedef.push(slug); };
    // Test talebinde yalnızca yönetici e-postalarıyla kayıtlı (test) firmalar hedeflenir; gerçek üyelere hiçbir şey gitmez
    const yonEp = [ayar().admin, ...(ayar().yoneticiler || [])].filter(Boolean).map((x) => String(x).toLowerCase());
    const testFirma = (slug) => { const f = fdocs.get(slug) || {}; return [f.eposta, ...(f.panelEpostalari || [])].some((e) => e && yonEp.includes(String(e).toLowerCase())); };
    for (const slug of secilen) { const g = grup(slug); if (test !== testFirma(slug)) continue; if (g === 'uye' || (!test && (g === 'odeme' || (g === 'liste' && davetEdilebilir(slug, true))))) ekle(slug); }
    for (const [slug, f] of fdocs) if (grup(slug) === 'uye' && test === testFirma(slug) && tipUyar(slug, f) && ilUyar(f)) ekle(slug);
    if (!test) for (const [slug, f] of fdocs) if (grup(slug) === 'odeme' && !testFirma(slug) && tipUyar(slug, f) && ilUyar(f)) ekle(slug);
    const listeAday = test ? [] : FIRMS.filter((f) => grup(f.slug) === 'liste' && f.tipler?.includes(d.tip) && davetEdilebilir(f.slug, false))
      .sort((x, y) => (y.il === d.il) - (x.il === d.il) || (y.modelSayisi || 0) - (x.modelSayisi || 0));
    let listeSay = hedef.filter((x) => grup(x) === 'liste').length;
    for (const f of listeAday) { if (listeSay >= DAVET_SINIRI) break; if (!hedef.includes(f.slug)) { ekle(f.slug); listeSay++; } }
    // Aynı gün art arda gelen talepler aynı firmaları tüketmesin: 72 saat kuralı yüzünden davet sayısı DAVET_ALT_SINIR'ın altında
    // kalırsa, yakın zamanda davet almış (ama ayrılmamış, adresi geri dönmemiş) firmalarla tamamlanır — her talep ayrı bir müşteridir.
    if (!test && listeSay < DAVET_ALT_SINIR) {
      const ek = FIRMS.filter((f) => grup(f.slug) === 'liste' && f.tipler?.includes(d.tip) && !hedef.includes(f.slug) && davetEdilebilir(f.slug, true))
        .sort((x, y) => (y.il === d.il) - (x.il === d.il) || (y.modelSayisi || 0) - (x.modelSayisi || 0));
      for (const f of ek) { if (listeSay >= DAVET_ALT_SINIR) break; ekle(f.slug); listeSay++; }
    }
    await ref.set({ ...ortak, firmalar: hedef, secilen, durum: 'acik', sonTarih: Timestamp.fromMillis(t0 + saat * 3600000) });

    const davetler = [];
    for (const slug of hedef) {
      const tur = grup(slug); const f = fdocs.get(slug) || {};
      const eposta = tur === 'liste' ? FIRMS.find((x) => x.slug === slug)?.eposta : (f.eposta || f.panelEpostalari?.[0]);
      if (!eposta) continue;
      const kod = token();
      await ref.collection('davetler').doc(slug).set({ kod, eposta, tur, durum: 'bekliyor', gonderim: FieldValue.serverTimestamp() });
      let iptalKod = '';
      if (tur === 'liste') {
        const k = kayitlar.get(slug) || {}; iptalKod = k.kod || token();
        await db.collection('davetKayit').doc(slug).set({ kod: iptalKod, sonDavet: t0, sayi: (k.sayi || 0) + 1, eposta }, { merge: true });
      }
      if (tur === 'uye' || tur === 'odeme') firmaSayac(slug, { istTalep: 1 });
      davetler.push({ slug, eposta, tur, kod, iptalKod, link: `${a.site}/teklif-ver/?t=${ref.id}.${tkn}&f=${slug}.${kod}`, odemeLinki: f.abonelik?.odemeLinki || '' });
    }
    const ozet = kart(talepOzeti(d));
    const kurucuK = davetler.some((v) => v.tur !== 'uye') ? await kurucuKalan() : 0;
    const son = tarihYazi(new Date(t0 + saat * 3600000));
    const baslikEk = `${test ? '[TEST] ' : ''}${TIP_AD[d.tip]}${d.oda ? ` ${d.oda}` : ''}${d.m2 ? `, ${d.m2} m²` : ''}, ${d.il}`;
    const davetMail = (v) => {
      if (v.tur === 'uye') return mail(v.eposta, `Yeni talep: ${baslikEk}`, sablon('Size uygun yeni bir müşteri talebi var', `<p>Merhaba,</p><p>Kriterlerinize uyan bir müşteri ev arıyor. <b>48 saat içinde</b> firma panelinize giriş yapıp fiyatınızı girin; süre dolunca müşteriye yalnızca zamanında gelen teklifler tek tabloda iletilir.</p>${ozet}<p style="margin:0">Son teklif zamanı: <b>${esc(son)}</b></p>${buton(`${a.site}/firma-paneli/#talepler`, 'Panele giriş yap ve teklif ver')}<p style="font-size:13px;color:#5b6760;margin:14px 0 0">Müşterinin adı, telefonu ve e-postası gizlidir; fiyatınızı girdiğiniz anda panelinizde açılır ve müşteriye “yeni teklif” bildirimi gider. Panele bu e-postanın geldiği adresle girersiniz.</p>`, { ust: 'Yeni talep · 48 saat', onizleme: `${d.il} ilinde ${TIP_AD[d.tip].toLocaleLowerCase('tr')} için teklif bekleniyor` }), { tur: 'davet' });
      if (v.tur === 'odeme') return mail(v.eposta, `Size uygun bir talep var: ${baslikEk}`, sablon('Size uygun bir talep var', `<p>Merhaba,</p><p>PrefabrikTeklif’te firmanıza uyan bir müşteri talebi var. Bu talebe ve sonraki taleplere fiyat verebilmek için <b>aylık ${ABONELIK_TL} TL üyelik ödemenizi</b> tamamlamanız yeterli; ödeme onaylandığında talep panelinizde fiyat vermeye açılır.</p>${kurucuK > 0 ? `<p>${kurucuMetni(kurucuK)} Kampanyadan yararlanmak için bu e-postayı yanıtlamanız yeterli.</p>` : ''}${ozet}${v.odemeLinki ? buton(v.odemeLinki, 'Üyelik ödemesini yap') : ''}${buton(`${a.site}/firma-paneli/#talepler`, 'Firma panelime git')}<p style="font-size:13px;color:#4a5751">Talep süresi: ${esc(son)}.</p>`), { tur: 'davet' });
      const st = FIRMS.find((x) => x.slug === v.slug) || {};
      return mail(v.eposta, `${d.il} ilinde ${TIP_AD[d.tip].toLocaleLowerCase('tr')} arayan bir müşteri var`, sablon(`${d.il} ilinde ${TIP_AD[d.tip].toLocaleLowerCase('tr')} arayan bir müşteri var`, `<p>Merhaba ${esc(st.kisaAd || '')} yetkilisi,</p><p>PrefabrikTeklif.com.tr’de bir müşteri şu özelliklerde ev arıyor ve firmanızdan fiyat almak istiyor olabilir:</p>${ozet}<p>Bu talebe teklif verebilmek için firmanızı PrefabrikTeklif’e kaydetmeniz gerekiyor. Kayıt birkaç dakika sürer; ${kurucuK > 0 ? 'başvurunuz onaylanınca <b>1 ay ücretsiz</b> üyelikle bu talebi ve size uyan yeni talepleri panelinizden görüp fiyat verebilirsiniz' : 'üyeliğiniz onaylanıp aylık üyelik ödemesi yapıldığında bu talebi ve size uyan yeni talepleri panelinizden görüp fiyat verebilirsiniz'}. Müşterinin iletişim bilgileri, fiyat verdiğinizde açılır.</p>${kurucuK > 0 ? `<p style="background:#e7f3ec;border-radius:8px;padding:10px 12px;font-size:14px">${kurucuMetni(kurucuK)}</p>` : ''}${buton(`${a.site}/firma-kayit/?firma=${encodeURIComponent(v.slug)}&davet=${encodeURIComponent(`${ref.id}.${v.kod}`)}`, 'Firmamı kaydet, teklif ver')}<p style="font-size:13px;color:#4a5751">Talep süresi: ${esc(son)}. Sorularınız için bu e-postayı yanıtlayabilirsiniz.</p><p style="font-size:12px;color:#7a857f">Firmanız, kendi web sitenizde herkese açık yayınladığınız bilgilerle sitemizde listelendiği için bu e-postayı web sitenizdeki adrese gönderdik. Talep bildirimi almak istemiyorsanız: <a href="${esc(a.site)}/bildirim-iptal/?f=${encodeURIComponent(`${v.slug}.${v.iptalKod}`)}">bildirimleri durdur</a>.</p>`), { tur: 'davet', iptal: `${a.site}/bildirim-iptal/?f=${encodeURIComponent(`${v.slug}.${v.iptalKod}`)}` });
    };
    const uyeSay = davetler.filter((v) => v.tur === 'uye').length;
    const elle = secilen.filter((s) => !davetler.some((v) => v.slug === s));
    await Promise.allSettled([
      ...davetler.map(davetMail),
      mail(d.eposta, 'Teklif talebiniz alındı', sablon('Talebiniz alındı', `<p>Merhaba ${esc(d.ad)},</p><p>Talebiniz ${davetler.length ? `${davetler.length} firmaya` : 'uygun firmalara'} <b>isimsiz</b> olarak iletildi. Bilgileriniz yalnızca fiyat veren firmalarla paylaşılır. Gelen teklifler <b>${esc(son)}</b> civarında tek tabloda e-postanıza gelecek.</p>${ozet}${buton(`${a.site}/hesabim/`, 'Talebimi takip et')}`)),
      mail(a.admin, `Yeni talep: ${test ? '[TEST] ' : ''}${TIP_AD[d.tip]} ${d.il} (${uyeSay} üye, ${davetler.length - uyeSay} davet)`, sablon('Yeni talep', `${ozet}${kart([['Müşteri', d.ad], ['E-posta', d.eposta], ['Telefon', d.telefon], ['Öncelikli firmalar', secilen.map(firmAd).join(', ')], ['Fiyat verebilecek üyeler', davetler.filter((v) => v.tur === 'uye').map((v) => firmAd(v.slug)).join(', ') || 'Yok'], ['Ödeme bekleyen kayıtlı firmalar', davetler.filter((v) => v.tur === 'odeme').map((v) => firmAd(v.slug)).join(', ') || 'Yok'], ['Üye olmaya davet edilenler', davetler.filter((v) => v.tur === 'liste').map((v) => firmAd(v.slug)).join(', ') || 'Yok'], ['E-postası olmayan seçili firmalar (elle iletin)', elle.map(firmAd).join(', ')]])}${buton(`${a.site}/yonetim/#talepler`, 'Yönetim panelinde aç')}<p>Talep no: ${ref.id}</p>`)),
    ]);
    return { ok: true, firmaSayisi: davetler.length };
  }

  // ---- Davet doğrulama (e-postadaki bağlantı) ----
  async function davetBul(t, f) {
    const [id, tkn] = String(t || '').split('.');
    const [slug, kod] = String(f || '').split('.');
    if (!id || !tkn || !slug || !kod) return null;
    const ref = db.collection('talepler').doc(id);
    const [s, dv] = await Promise.all([ref.get(), ref.collection('davetler').doc(slug).get()]);
    if (!s.exists || s.data().token !== tkn || !dv.exists || dv.data().kod !== kod) return null;
    return { ref, talep: s.data(), slug, davet: dv.data(), davetRef: ref.collection('davetler').doc(slug) };
  }
  const anonim = (d) => ({
    tip: d.tip, tipAd: TIP_AD[d.tip], oda: d.oda, m2: d.m2, il: d.il, ilce: d.ilce, araziAd: ARAZI_AD[d.arazi], butce: BUTCE_AD[d.butce] || d.butce, teslim: TESLIM_AD[d.teslim] || '',
    zaman: d.zaman, kapsam: (d.kapsam || []).map((k) => KAPSAM_AD[k]), not: d.not, model: d.model ? (modelBul(d.model)?.ad || '') : '',
    sonTarih: d.sonTarih?.toDate ? tarihYazi(d.sonTarih.toDate()) : '', kapali: d.durum !== 'acik',
  });
  const musteri = (d) => ({ ad: d.ad, telefon: d.telefon, eposta: d.eposta });

  async function teklifKaydet(v, b, firmaSlug) {
    if (v.talep.durum !== 'acik') hata(409, 'Bu talebin süresi doldu.');
    const fd = (await db.collection('firmalar').doc(firmaSlug).get()).data();
    if (!uyeAktif(fd)) hata(402, fd ? `Fiyat verebilmek için aylık ${ABONELIK_TL} TL üyelik ödemenizin tamamlanması gerekiyor. Ödeme onaylandığında bu talebe panelinizden fiyat verebilirsiniz.` : 'Fiyat verebilmek için önce firmanızı kaydedin; üyeliğiniz onaylanınca bu talebe fiyat verebilirsiniz.');
    if (v.davet?.durum === 'red') hata(409, 'Bu talebi daha önce reddettiniz.');
    const fiyat = Math.round(Number(b.fiyat));
    if (!(fiyat >= 1000 && fiyat < 1e9)) hata(400, 'Geçerli bir fiyat yazın.');
    const ilk = !(await v.ref.collection('teklifler').doc(firmaSlug).get()).exists;
    await v.ref.collection('teklifler').doc(firmaSlug).set({
      firma: firmaSlug, fiyat, kdvDahil: !!b.kdvDahil, dahil: arr(b.dahil).filter((k) => DAHIL_AD[k]),
      teslimGun: sayi(b.teslimGun, 1, 365), garantiYil: sayi(b.garantiYil, 0, 50), not: str(b.not, 2000), zaman: FieldValue.serverTimestamp(),
    });
    await v.davetRef.set({ durum: 'kabul', kabulZamani: FieldValue.serverTimestamp() }, { merge: true });
    const a = ayar(); const d = v.talep;
    if (ilk) {
      if (!d.test) { firmaSayac(firmaSlug, { istTeklif: 1 }); sayac({ teklif: 1 }); }
      await v.ref.set({ teklifSayisi: FieldValue.increment(1), sonTeklif: FieldValue.serverTimestamp() }, { merge: true });
      const kac = (await v.ref.collection('teklifler').get()).size;
      const fa = firmAd(firmaSlug);
      await Promise.allSettled([
        v.davet?.eposta ? mail(v.davet.eposta, `Müşteri bilgileri: ${TIP_AD[d.tip]}, ${d.il}`, sablon('Teklifiniz müşteriye iletildi', `<p>Fiyatınız kaydedildi ve müşteriye bildirildi. Müşterinin iletişim bilgileri aşağıda; teklifinizi netleştirmek için arayabilir ya da panelinizden mesaj yazabilirsiniz. Lütfen bu bilgileri yalnızca bu talep için kullanın.</p>${kart([['Ad soyad', d.ad], ['Telefon', d.telefon], ['E-posta', d.eposta], ['Teklifiniz', tl(fiyat)]])}${buton(`${a.site}/firma-paneli/#talepler`, 'Panelde aç')}`, { ust: 'Teklif gönderildi' })) : null,
        mail(d.eposta, `${kac === 1 ? 'İlk teklifiniz geldi' : `${kac}. teklif geldi`}: ${fa}`, sablon(`${fa} projenize teklif verdi`, `<p>Merhaba ${esc(d.ad)},</p><p><b>${esc(fa)}</b> ${esc(TIP_AD[d.tip].toLocaleLowerCase('tr'))} talebinize fiyat verdi. Şu ana kadar <b>${kac} firma</b> teklif verdi.</p>${kart([['Firma', fa], ['Toplam fiyat', `${tl(fiyat)}${b.kdvDahil ? ' (KDV dahil)' : ''}`], ['Teslim süresi', b.teslimGun ? `${sayi(b.teslimGun, 1, 365)} gün` : ''], ['Garanti', b.garantiYil ? `${sayi(b.garantiYil, 0, 50)} yıl` : '']])}<p>Teklifin ayrıntılarını görmek, firmayı aramak, e-posta göndermek ya da site üzerinden soru sormak için hesabınıza girin. Talepte yazdığınız e-posta ya da telefonla giriş yapmanız yeterli.</p>${buton(`${a.site}/hesabim/#teklifler`, 'Teklifleri gör')}<p style="font-size:13px;color:#5b6760;margin:12px 0 0">Süre dolunca tüm teklifler karşılaştırma tablosu olarak e-postanıza da gelecek.</p>`, { ust: `${kac}. teklif`, onizleme: `${fa}: ${tl(fiyat)}` })),
      ]);
    }
    return { ok: true, musteri: musteri(d) };
  }

  // ---- GET /api/talep ----
  async function talep(req) {
    const v = await davetBul(req.query.t, req.query.f);
    if (!v) hata(404, 'Talep bulunamadı veya bağlantı geçersiz.');
    const verildi = (await v.ref.collection('teklifler').doc(v.slug).get()).exists;
    const fd = (await db.collection('firmalar').doc(v.slug).get()).data();
    const uyeDurum = uyeAktif(fd) ? 'aktif' : fd && fd.aktif !== false ? 'odeme' : 'yok';
    return { ...anonim(v.talep), firmaAd: firmAd(v.slug), verildi, red: v.davet.durum === 'red', uyeDurum, kampanya: uyeDurum !== 'aktif' && (await kurucuKalan()) > 0, odemeLinki: uyeDurum === 'odeme' ? fd?.abonelik?.odemeLinki || '' : '', kayitLink: `/firma-kayit/?firma=${encodeURIComponent(v.slug)}&davet=${encodeURIComponent(`${v.ref.id}.${v.davet.kod}`)}`, ...(verildi ? { musteri: musteri(v.talep) } : {}) };
  }
  async function teklifVer(req) {
    const b = req.body || {};
    const v = await davetBul(b.t, b.f);
    if (!v) hata(404, 'Bağlantı geçersiz.');
    return teklifKaydet(v, b, v.slug);
  }
  async function teklifRed(req) {
    const b = req.body || {};
    const v = await davetBul(b.t, b.f);
    if (!v) hata(404, 'Bağlantı geçersiz.');
    if ((await v.ref.collection('teklifler').doc(v.slug).get()).exists) hata(409, 'Bu talebe zaten fiyat verdiniz.');
    await v.davetRef.set({ durum: 'red', redZamani: FieldValue.serverTimestamp(), redNeden: str(b.neden, 200) }, { merge: true });
    if (!v.talep.test && v.davet?.durum !== 'red') firmaSayac(v.slug, { istRed: 1 });
    return { ok: true };
  }

  // ---- POST /api/belge: firma doğrulama evrakı (başlat / parça / bitir) ----
  async function belge(req) {
    const b = req.body || {};
    const islem = str(b.islem, 10);
    if (islem === 'baslat') {
      const ad = str(b.ad, 120).replace(/[^\p{L}\p{N} ._()-]/gu, '_');
      const boyut = Math.floor(Number(b.boyut));
      if (!EVRAK_TUR[b.tur]) hata(400, 'Belge türü seçin.');
      if (!/\.(pdf|png|jpe?g|heic|heif)$/i.test(ad)) hata(415, 'Yalnızca PDF, PNG, JPEG ya da HEIC dosyası yükleyebilirsiniz.');
      if (!(boyut > 0)) hata(400, 'Dosya boş.');
      if (boyut > EVRAK_MAKS) hata(413, 'Dosya en fazla 10 MB olabilir.');
      if (!(await rateLimit(req, 'belge', 30))) hata(429, 'Çok fazla dosya yüklendi, biraz sonra tekrar deneyin.');
      const ref = db.collection('belgeler').doc();
      const anahtar = token();
      await ref.set({ tur: b.tur, ad, boyut, parca: Math.ceil(boyut / EVRAK_PARCA), anahtar, durum: 'yukleniyor', mime: '', zaman: FieldValue.serverTimestamp(), olusturma: now() });
      return { id: ref.id, anahtar, parcaBoyut: EVRAK_PARCA };
    }
    if (islem !== 'parca' && islem !== 'bitir') hata(400, 'Geçersiz işlem.');
    const bid = str(b.id, 40);
    if (!/^[A-Za-z0-9]{10,40}$/.test(bid)) hata(404, 'Yükleme bulunamadı.');
    const ref = db.collection('belgeler').doc(bid); const sn = await ref.get();
    if (!sn.exists || sn.data().anahtar !== str(b.anahtar, 40)) hata(404, 'Yükleme bulunamadı.');
    const d = sn.data();
    if (d.durum !== 'yukleniyor') hata(409, 'Bu yükleme tamamlandı.');
    if (now() - (d.olusturma || 0) > 3600000) hata(410, 'Yükleme süresi doldu, dosyayı yeniden seçin.');
    if (islem === 'parca') {
      const i = Math.floor(Number(b.i));
      if (!(i >= 0 && i < d.parca)) hata(400, 'Geçersiz parça.');
      if (!/^[A-Za-z0-9+/=]+$/.test(String(b.veri || ''))) hata(400, 'Geçersiz veri.');
      const buf = Buffer.from(String(b.veri), 'base64');
      const beklenen = i < d.parca - 1 ? EVRAK_PARCA : d.boyut - EVRAK_PARCA * (d.parca - 1);
      if (buf.length !== beklenen) hata(400, 'Parça boyutu hatalı.');
      if (i === 0) {
        const mime = dosyaTuru(buf);
        if (!mime) { await ref.set({ durum: 'red' }, { merge: true }); hata(415, 'Dosya içeriği PDF, PNG, JPEG ya da HEIC değil.'); }
        await ref.set({ mime }, { merge: true });
      }
      await ref.collection('parcalar').doc(String(i).padStart(3, '0')).set({ i, veri: buf });
      return { ok: true };
    }
    if (islem === 'bitir') {
      const ps = await ref.collection('parcalar').get();
      const toplam = ps.docs.reduce((a, x) => a + (x.data().veri?.length || 0), 0);
      if (ps.size !== d.parca || toplam !== d.boyut || !d.mime) hata(400, 'Dosya eksik yüklendi, yeniden deneyin.');
      await ref.set({ durum: 'gecici' }, { merge: true });
      return { ok: true, id: ref.id };
    }
    hata(400, 'Geçersiz işlem.');
  }

  // ---- POST /api/firma-basvuru ----
  async function firmaBasvuru(req) {
    const b = req.body || {};
    if (str(b.website)) return { ok: true };
    const d = {
      unvan: str(b.unvan, 160), marka: str(b.marka, 80), vergiDairesi: str(b.vergiDairesi, 80), vergiNo: str(b.vergiNo, 11), mevcut: str(b.mevcut, 80), adres: str(b.adres, 240), merkezIl: str(b.merkezIl, 40), yetkiliUnvan: str(b.yetkiliUnvan, 60),
      web: str(b.web, 160), yetkili: str(b.yetkili, 80), telefon: str(b.telefon, 20), eposta: str(b.eposta, 120).toLowerCase(),
      tipler: arr(b.tipler).filter((t) => TIP_AD[t]), iller: str(b.iller, 1500), belgeler: str(b.belgeler, 300), referanslar: str(b.referanslar, 1500), not: str(b.not, 1000),
      davet: /^[A-Za-z0-9_-]{6,40}\.[A-Za-z0-9_-]{10,40}$/.test(str(b.davet, 90)) ? str(b.davet, 90) : '',
    };
    // İsteğe bağlı: "Firmanız daha ön planda dursun mu?" — seçilen reklam paketleri (ana+yan birlikte seçildiyse indirimli "ikisi" paketi)
    let rk = [...new Set(arr(b.reklam).map((x) => str(x, 10)).filter((x) => REKLAM_PAKET[x]))];
    if (rk.includes('ikisi') || (rk.includes('ana') && rk.includes('yan'))) rk = ['ikisi', ...rk.filter((x) => !['ana', 'yan', 'ikisi'].includes(x))];
    d.reklam = rk.slice(0, 4);
    if (d.mevcut && !FIRMS.some((f) => f.slug === d.mevcut)) d.mevcut = '';
    if (!d.unvan || !/^\d{10,11}$/.test(d.vergiNo) || !d.yetkili || !epostaMi(d.eposta) || !d.tipler.length || !d.iller) hata(400, 'Lütfen zorunlu alanları doldurun (hizmet verdiğiniz iller dahil).');
    if (!d.vergiDairesi || d.adres.length < 10 || !d.merkezIl || d.telefon.replace(/\D/g, '').length < 10) hata(400, 'Vergi dairesi, açık adres, firmanın bulunduğu il ve telefon zorunlu.');
    // Doğrulama evrakı: vergi levhası + (faaliyet belgesi ya da Ticaret Sicil Gazetesi)
    const evrakGiris = (Array.isArray(b.evrak) ? b.evrak : []).slice(0, 8).map((x) => ({ id: str(x?.id, 40), anahtar: str(x?.anahtar, 40) })).filter((x) => x.id && x.anahtar);
    const evrak = [];
    for (const x of evrakGiris) {
      const sn = await db.collection('belgeler').doc(x.id).get();
      if (sn.exists && sn.data().anahtar === x.anahtar && sn.data().durum === 'gecici') evrak.push({ id: x.id, tur: sn.data().tur, ad: sn.data().ad, boyut: sn.data().boyut, mime: sn.data().mime });
    }
    if (!evrak.some((e) => e.tur === 'vergi-levhasi')) hata(400, 'Vergi levhanızı yükleyin.');
    if (!evrak.some((e) => e.tur === 'faaliyet' || e.tur === 'sicil-gazetesi')) hata(400, 'Faaliyet belgenizi ya da Ticaret Sicil Gazetesini yükleyin.');
    d.evrak = evrak;
    if (d.referanslar.length < 10) hata(400, 'En az bir referans (teslim ettiğiniz bir proje ve iletişim bilgisi) yazın; referanssız kayıt almıyoruz.');
    if (b.sozlesmeOnay !== true || b.abonelikOnay !== true) hata(400, `Firma üyelik sözleşmesini ve aylık ${ABONELIK_TL} TL üyelik bedelini onaylayın.`);
    d.sozlesme = { surum: SOZLESME.firma.surum, abonelikSurum: SOZLESME.abonelik.surum, abonelikTl: ABONELIK_TL, onayZamani: now() };
    if (!(await rateLimit(req, 'basvuru', 3))) hata(429, 'Çok fazla deneme, sonra tekrar deneyin.');
    const ref = await db.collection('firmaBasvurulari').add({ ...d, durum: 'bekliyor', zaman: FieldValue.serverTimestamp() });
    await onayKaydet(req, { tur: 'firma-basvurusu', kayit: ref.id, eposta: d.eposta, telefon: d.telefon, ad: `${d.yetkili} (${d.unvan})`, firma: d.mevcut || '', belgeler: ['firma', 'abonelik', 'kvkk', 'kullanici', 'gizlilik'] });
    for (const e of evrak) await db.collection('belgeler').doc(e.id).set({ durum: 'basvuru', basvuru: ref.id }, { merge: true });
    const a = ayar();
    const kampanyaAcik = (await kurucuKalan()) > 0;
    await Promise.allSettled([
      mail(a.admin, `Firma başvurusu: ${d.marka || d.unvan}${kampanyaAcik ? ' (1 ay ücretsiz kampanya)' : ''}`, sablon('Yeni firma başvurusu', kart(Object.entries({ Unvan: d.unvan, Marka: d.marka, 'Vergi dairesi': d.vergiDairesi, 'Vergi no': d.vergiNo, 'Merkez il': d.merkezIl, Evrak: evrak.map((e) => `${EVRAK_TUR[e.tur]} (${e.ad})`).join(', '), 'Listedeki kaydı': d.mevcut, 'Talep davetinden': d.davet ? 'Evet' : '', 'Reklam isteği': d.reklam.length ? `${d.reklam.map((k) => REKLAM_PAKET[k].ad).join(', ')} (aylık ${tl(d.reklam.reduce((t, k) => t + REKLAM_PAKET[k].fiyat, 0))}, üyeliğe ek)` : '', Adres: d.adres, Web: d.web, Yetkili: d.yetkili, Telefon: d.telefon, 'E-posta': d.eposta, Tipler: d.tipler.map((t) => TIP_AD[t]).join(', '), İller: d.iller, Belgeler: d.belgeler, Referanslar: d.referanslar, Not: d.not, Üyelik: `Aylık ${ABONELIK_TL} TL ve üyelik sözleşmesi onaylandı` })) + buton(`${a.site}/yonetim/#onaylar`, 'Onaylamak için yönetim paneli') + `<p>Başvuru no: ${ref.id}</p>`)),
      mail(d.eposta, 'Başvurunuz alındı', sablon('Başvurunuz alındı', `<p>Sayın ${esc(d.yetkili)},</p><p>PrefabrikTeklif firma başvurunuz ve yüklediğiniz belgeler (${evrak.map((e) => esc(EVRAK_TUR[e.tur])).join(', ')}) alındı. Belgelerinizi ve referanslarınızı kontrol edeceğiz.</p><p>${kampanyaAcik ? `Açılış kampanyası kapsamında başvurunuz onaylanınca üyeliğiniz <b>1 ay ücretsiz</b> açılır; ödeme yapmadan size gelen taleplere hemen fiyat verebilirsiniz. Sonrasında devam ederseniz aylık ${ABONELIK_TL} TL ödersiniz.` : `Başvurunuz onaylandığında aylık <b>${ABONELIK_TL} TL</b> üyelik bedeli için ödeme bağlantısını e-postayla ileteceğiz. Ödeme sonrası firmanız “Üye firma” rozetiyle görünür ve size gelen taleplere fiyat verebilirsiniz.`}${d.davet ? ' Sizi davet eden talep de panelinizde olacak.' : ''}${d.reklam.length ? ` Seçtiğiniz reklam alanları (${esc(d.reklam.map((k) => REKLAM_PAKET[k].ad).join(', '))}) için uygunluğu kontrol edip ayrıca dönüş yapacağız.` : ''} Ardından <b>${esc(d.eposta)}</b> adresiyle <a href="${esc(a.site)}/firma-paneli/">firma paneline</a> giriş yapıp ürün ve fiyatlarınızı yönetebileceksiniz.</p><p style="font-size:12px;color:#4a5751">Onayladığınız sözleşme: <a href="${esc(a.site)}/firma-uyelik-sozlesmesi/">Firma üyelik sözleşmesi</a></p>`)),
    ]);
    return { ok: true };
  }

  // ---- POST /api/iletisim (sitenin alt kısmındaki "Bize yazın" formu) ----
  const ILETISIM_KONU = { oneri: 'Öneri', soru: 'Soru', sikayet: 'Şikâyet', isbirligi: 'İş birliği', reklam: 'Reklam', diger: 'Diğer' };
  async function iletisim(req) {
    const b = req.body || {};
    if (str(b.website)) return { ok: true };
    const d = { ad: str(b.ad, 80), eposta: str(b.eposta, 120).toLowerCase(), konu: ILETISIM_KONU[b.konu] ? b.konu : 'diger', mesaj: str(b.mesaj, 3000), sayfa: str(b.sayfa, 200) };
    if (!d.ad || !epostaMi(d.eposta) || d.mesaj.length < 5) hata(400, 'Adınızı, e-postanızı ve mesajınızı yazın.');
    if (!(await rateLimit(req, 'iletisim', 5))) hata(429, 'Çok fazla mesaj gönderildi, biraz sonra tekrar deneyin.');
    await db.collection('iletisimMesajlari').add({ ...d, durum: 'yeni', zaman: FieldValue.serverTimestamp() });
    await mail(ayar().admin, `Siteden mesaj (${ILETISIM_KONU[d.konu]}): ${d.ad}`, sablon('Siteden yeni mesaj', kart([['Ad', d.ad], ['E-posta', d.eposta], ['Konu', ILETISIM_KONU[d.konu]], ['Mesaj', d.mesaj], ['Sayfa', d.sayfa]])));
    return { ok: true };
  }

  // ---- Google puanı ----
  async function googlePuan(req, res) {
    const slug = str(req.query.firma, 80);
    const f = FIRMS.find((x) => x.slug === slug);
    const key = ayar().placesKey;
    if (!f || !key || key.length < 20) hata(404, '');
    const pref = db.collection('placeIds').doc(slug);
    let pid = (await pref.get()).data()?.id;
    if (!pid) {
      const r = await fetchFn('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id' },
        body: JSON.stringify({ textQuery: `${f.kisaAd} ${f.il || ''} prefabrik`, languageCode: 'tr', regionCode: 'TR' }),
      });
      pid = (await r.json()).places?.[0]?.id;
      if (!pid) hata(404, '');
      await pref.set({ id: pid });
    }
    const r = await fetchFn(`https://places.googleapis.com/v1/places/${pid}?languageCode=tr`, { headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri' } });
    if (!r.ok) hata(404, '');
    const p = await r.json();
    return { rating: p.rating ?? null, count: p.userRatingCount ?? null, url: p.googleMapsUri ?? null };
  }
  async function yorumlar(req, res) {
    const slug = str(req.query.firma, 80);
    const q = await db.collection('yorumlar').where('firma', '==', slug).where('durum', '==', 'onayli').orderBy('zaman', 'desc').limit(30).get();
    res.set?.('Cache-Control', 'public, max-age=300');
    return { yorumlar: q.docs.map((d) => { const y = d.data(); const z = y.zaman?.toMillis?.() || 0; return { ad: y.adGoster, puan: y.puan, metin: y.metin, cevap: y.cevap || '', satinAldi: y.satinAldi !== false, belgeli: !!y.belgeDogrulandi, asama: y.asama || '', tarih: z ? new Date(z).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }) : '' }; }) };
  }
  const PUAN_K = ['fiyat', 'teslim', 'iscilik', 'satisSonrasi'];
  async function yorum(req) {
    const b = req.body || {};
    // Eski yöntem: teklif özeti e-postasındaki bağlantı (talep sahibi)
    if (b.t) {
      const [id, tkn] = String(b.t || '').split('.');
      if (!id || !tkn) hata(400, 'Bağlantı geçersiz.');
      const s = await db.collection('talepler').doc(id).get();
      if (!s.exists || s.data().token !== tkn) hata(404, 'Bağlantı geçersiz.');
      const firma = str(b.firma, 80);
      if (!(s.data().firmalar || []).includes(firma)) hata(400, 'Bu firma talebinizde yok.');
      const puanlar = Object.fromEntries(PUAN_K.map((k) => [k, Math.max(1, Math.min(5, Number(b[k]) || 0))]));
      const puan = Math.round((Object.values(puanlar).reduce((a, c) => a + c, 0) / 4) * 10) / 10;
      const metin = str(b.metin, 2000);
      if (metin.length < 30) hata(400, 'Yorum en az 30 karakter olmalı.');
      const ad = String(s.data().ad || '').split(' ');
      await db.collection('yorumlar').add({ firma, talep: id, puanlar, puan, metin, satinAldi: true, asama: b.asama === 'teslim' ? 'teslim' : 'sozlesme', adGoster: `${ad[0] || ''} ${(ad[1] || '').slice(0, 1)}.`.trim(), durum: 'bekliyor', belgeNotu: str(b.belge, 300), zaman: FieldValue.serverTimestamp() });
      await mail(ayar().admin, `Onay bekleyen yorum: ${firmAd(firma)}`, sablon('Yeni yorum', kart([['Firma', firmAd(firma)], ['Puan', puan], ['Yorum', metin], ['Belge', str(b.belge, 300)]]) + buton(`${ayar().site}/yonetim/#onaylar`, 'Yönetim panelinde onayla')));
      return { ok: true };
    }
    // Üye kullanıcı yorumu: satın alıp almadığı yorumda gösterilir
    const u = await kim(req);
    if (!u.dogrulandi) hata(403, 'Yorum yazmak için önce e-posta adresinizi doğrulayın.');
    const firma = str(b.firma, 80);
    if (!FIRMS.some((f) => f.slug === firma)) hata(400, 'Yorum yapacağınız firmayı seçin.');
    if (u.firma === firma) hata(403, 'Kendi firmanız hakkında yorum yazamazsınız.');
    const satinAldi = b.satinAldi === true || b.satinAldi === 'evet';
    const puan = sayi(Math.round(Number(b.puan)), 1, 5);
    if (!puan) hata(400, 'Genel puanınızı seçin.');
    const puanlar = satinAldi ? Object.fromEntries(PUAN_K.filter((k) => sayi(Number(b[k]), 1, 5)).map((k) => [k, Math.round(Number(b[k]))])) : {};
    const metin = str(b.metin, 2000);
    if (metin.length < 30) hata(400, 'Yorum en az 30 karakter olmalı.');
    if (!(await rateLimit(req, 'yorum', 5))) hata(429, 'Çok fazla yorum gönderildi, biraz sonra tekrar deneyin.');
    const adP = String(str(b.ad, 60) || u.ad || u.eposta.split('@')[0]).split(/\s+/);
    const adGoster = `${adP[0] || ''}${adP[1] ? ` ${adP[1].slice(0, 1)}.` : ''}`.trim();
    const ref = db.collection('yorumlar').doc(`${u.uid}__${firma}`);
    await ref.set({ firma, uid: u.uid, eposta: u.eposta, puan, puanlar, metin, satinAldi, asama: satinAldi ? (b.asama === 'teslim' ? 'teslim' : 'sozlesme') : 'gorusme', adGoster, belgeNotu: str(b.belge, 300), belgeDogrulandi: false, durum: 'bekliyor', zaman: FieldValue.serverTimestamp() });
    await mail(ayar().admin, `Onay bekleyen yorum: ${firmAd(firma)}`, sablon('Yeni yorum', kart([['Firma', firmAd(firma)], ['Yazan', `${adGoster} (${u.eposta})`], ['Satın aldı mı?', satinAldi ? 'Evet' : 'Hayır'], ['Puan', puan], ['Yorum', metin], ['Belge', str(b.belge, 300)]]) + buton(`${ayar().site}/yonetim/#onaylar`, 'Yönetim panelinde onayla')));
    return { ok: true };
  }

  // ---- Listelenmiş firmanın talep bildirimlerini durdurması ----
  async function bildirimIptal(req) {
    const [slug, kod] = String(req.body?.f || '').split('.');
    if (/^t-[a-f0-9]{24}$/.test(slug || '')) {
      const tr = db.collection('tanitimKayit').doc(slug.slice(2)); const ts = await tr.get();
      if (!kod || !ts.exists || ts.data().kod !== kod) hata(404, 'Bağlantı geçersiz.');
      await tr.set({ iptal: true, iptalZamani: now() }, { merge: true });
      if (ts.data().slug) await db.collection('davetKayit').doc(ts.data().slug).set({ iptal: true, iptalZamani: now() }, { merge: true });
      return { ok: true, firmaAd: ts.data().ad || '' };
    }
    const ref = db.collection('davetKayit').doc(str(slug, 80)); const s = await ref.get();
    if (!slug || !kod || !s.exists || s.data().kod !== kod) hata(404, 'Bağlantı geçersiz.');
    await ref.set({ iptal: true, iptalZamani: now() }, { merge: true });
    return { ok: true, firmaAd: firmAd(slug) };
  }

  // ---- Herkese açık katalog ve bannerlar ----
  async function katalog(req, res) {
    const [q, fq] = await Promise.all([db.collection('katalog').get(), db.collection('firmalar').where('kaldirildi', '==', true).get()]);
    res.set?.('Cache-Control', 'public, max-age=300, s-maxage=600');
    const kayitlar = q.docs.map((d) => d.data()).map((x) => (x.gizli ? { id: x.id, gizli: true } : x));
    for (const f of fq.docs) kayitlar.push({ id: `firma:${f.id}`, gizli: true });
    // Üye firmalar: firma sayfasındaki "bilgi amaçlı listelendi" uyarısı bunlarda gizlenir
    const uq = await db.collection('firmalar').where('aktif', '==', true).get();
    for (const f of uq.docs) if (uyeAktif(f.data())) kayitlar.push({ id: `uye:${f.id}`, uye: true });
    return { kayitlar, kampanya: (await kurucuKalan()) > 0 };
  }
  async function bannerlar(req, res) {
    const q = await db.collection('bannerlar').where('aktif', '==', true).get();
    const t = now();
    res.set?.('Cache-Control', 'public, max-age=300, s-maxage=600');
    const say = {};
    const liste = q.docs.map((d) => d.data()).filter((b) => !b.bitis || Date.parse(b.bitis) > t).sort((a, b) => (a.sira || 0) - (b.sira || 0))
      .filter((b) => { const k = KONUM_SINIRI[b.konum] ? b.konum : 'ana'; say[k] = (say[k] || 0) + 1; return say[k] <= KONUM_SINIRI[k]; });
    return { bannerlar: liste.map((b) => ({ konum: KONUM_SINIRI[b.konum] ? b.konum : 'ana', baslik: b.baslik, metin: b.metin, gorsel: b.gorsel, link: b.link, ...(b.modelId ? { modelId: b.modelId } : {}) })) };
  }

  // ---- Telefonla giriş: kodu biz üretir, SMS firmasıyla (İleti Merkezi; yedek olarak Netgsm) göndeririz, doğrulanınca Firebase özel oturum anahtarı veririz ----
  // SMS ayarı yoksa ya da gönderim başarısızsa { kanal: 'firebase' } döner; tarayıcı Firebase'in kendi SMS'ine geçer.
  const SMS_SURE = 5 * 60 * 1000; const SMS_ARA = 60 * 1000; const SMS_SAAT = 5; const SMS_DENEME = 5; const SMS_GUNLUK = 600;
  const smsRef = (tel) => db.collection('smsKodlari').doc(crypto.createHash('sha256').update(`sms:${tel}`).digest('hex').slice(0, 40));
  const kodOzet = (tel, kod, tuz) => crypto.createHmac('sha256', tuz).update(`${tel}:${kod}`).digest('hex');
  const telAl = (v) => { const d = String(v || '').replace(/\D/g, ''); const s = d.startsWith('90') && d.length === 12 ? d.slice(2) : d.startsWith('0') && d.length === 11 ? d.slice(1) : d; return /^5\d{9}$/.test(s) ? s : ''; };
  const smsIstemci = () => {
    const a = ayar();
    const im = iletiMerkeziIstemci({ ...(a.iletimerkezi || {}), fetch: fetchFn });
    return im.hazir ? im : netgsmIstemci({ ...(a.netgsm || {}), fetch: fetchFn });
  };
  async function smsKod(req) {
    const tel = telAl(req.body?.telefon);
    if (!tel) hata(400, 'Telefon numarasını 05xx xxx xx xx biçiminde yazın.');
    const n = smsIstemci();
    if (!n.hazir) return { kanal: 'firebase' };
    if (!(await rateLimit(req, 'sms-kod', 10))) hata(429, 'Bu bağlantıdan çok fazla kod istendi. Bir saat sonra tekrar deneyin ya da e-postayla girin.');
    const t = now(); const gun = new Date(t + 3 * 3600000).toISOString().slice(0, 10);
    const gunRef = db.collection('sistem').doc('sms');
    const ref = smsRef(tel);
    const kod = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const tuz = crypto.randomBytes(16).toString('hex');
    const sonuc = await db.runTransaction(async (tx) => {
      const [s, g] = [await tx.get(ref), await tx.get(gunRef)];
      const d = s.exists ? s.data() : {};
      const gecmis = (d.gonderimler || []).filter((x) => x > t - 3600000);
      if (d.son && t - d.son < SMS_ARA) return { bekle: Math.ceil((SMS_ARA - (t - d.son)) / 1000) };
      if (gecmis.length >= SMS_SAAT) return { cok: true };
      const gd = g.exists && g.data().gun === gun ? g.data() : { gun, n: 0 };
      if (gd.n >= SMS_GUNLUK) return { kota: true };
      tx.set(ref, { ozet: kodOzet(tel, kod, tuz), tuz, son: t, bitis: t + SMS_SURE, deneme: 0, kullanildi: false, gonderimler: [...gecmis, t], exp: Timestamp.fromMillis(t + 24 * 3600000) });
      tx.set(gunRef, { ...gd, gun, n: gd.n + 1 });
      return { ok: true };
    });
    if (sonuc.bekle) hata(429, `Yeni kod için ${sonuc.bekle} saniye bekleyin.`);
    if (sonuc.cok) hata(429, 'Bu numaraya çok fazla kod gönderildi. Bir saat sonra tekrar deneyin ya da e-postayla girin.');
    if (sonuc.kota) return { kanal: 'firebase' };
    // OTP SMS'te Türkçe karakter kullanılmaz. Son satır Android/iOS'un kodu otomatik doldurması içindir (WebOTP biçimi).
    const alan = String(ayar().site || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const g = await n.otp(tel, `Prefabrik Teklif giris kodunuz: ${kod}\nKodu kimseyle paylasmayin.\n\n@${alan} #${kod}`);
    if (!g.ok) {
      console.error('SMS gönderilemedi', n.ad || 'netgsm', g.kod, g.aciklama || '');
      await ref.set({ ozet: '', kullanildi: true, son: 0, gonderimler: [], exp: Timestamp.fromMillis(t + 3600000) }).catch(() => {});
      db.collection('sistem').doc('sms').set({ sonHata: `${g.kod} ${g.aciklama || ''}`.trim(), saglayici: n.ad || 'netgsm', sonHataZamani: FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
      return { kanal: 'firebase' };
    }
    sayac({ smsKod: 1 });
    return { ok: true, kanal: 'sunucu', sure: SMS_SURE / 1000, ara: SMS_ARA / 1000 };
  }
  async function smsDogrula(req) {
    const tel = telAl(req.body?.telefon); const kod = String(req.body?.kod || '').replace(/\D/g, '');
    if (!tel) hata(400, 'Telefon numarasını 05xx xxx xx xx biçiminde yazın.');
    if (kod.length !== 6) hata(400, 'SMS’teki 6 haneli kodu yazın.');
    if (!(await rateLimit(req, 'sms-dogrula', 30))) hata(429, 'Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.');
    const ref = smsRef(tel); const t = now();
    const r = await db.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      const d = s.exists ? s.data() : null;
      if (!d || d.kullanildi || !d.ozet) return { yok: true };
      if (t > d.bitis) return { sure: true };
      if (d.deneme >= SMS_DENEME) return { cok: true };
      const a = Buffer.from(kodOzet(tel, kod, d.tuz), 'hex'); const b = Buffer.from(d.ozet, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { tx.update(ref, { deneme: (d.deneme || 0) + 1 }); return { yanlis: SMS_DENEME - (d.deneme || 0) - 1 }; }
      tx.update(ref, { kullanildi: true, ozet: '', dogrulama: t });
      return { ok: true };
    });
    if (r.yok) hata(400, 'Önce kod isteyin.');
    if (r.sure) hata(400, 'Kodun süresi doldu, yeniden kod isteyin.');
    if (r.cok) hata(429, 'Çok fazla yanlış kod girildi. Yeniden kod isteyin.');
    if (r.yanlis !== undefined) hata(400, r.yanlis > 0 ? `Kod hatalı. ${r.yanlis} deneme hakkınız kaldı.` : 'Kod hatalı. Yeniden kod isteyin.');
    const e164 = `+90${tel}`;
    let kullanici;
    try { kullanici = await auth.getUserByPhoneNumber(e164); } catch (e) {
      if (e?.code !== 'auth/user-not-found') throw e;
      kullanici = await auth.createUser({ phoneNumber: e164 });
    }
    if (kullanici.disabled) hata(403, 'Bu hesap kullanıma kapatılmış. Bize yazın.');
    return { token: await auth.createCustomToken(kullanici.uid, { girisYontemi: 'sms' }) };
  }

  // ---- Kullanıcı ----
  async function ben(req) {
    const u = await kim(req);
    const ref = db.collection('kullanicilar').doc(u.uid);
    const s = await ref.get();
    const yeni = !s.exists || !s.data().ilkGiris;
    await ref.set({ eposta: u.eposta, telefon: u.telefon, ad: u.ad || s.data()?.ad || '', rol: u.rol, firma: u.firma || '', sonGiris: FieldValue.serverTimestamp(), ...(yeni ? { ilkGiris: FieldValue.serverTimestamp() } : {}) }, { merge: true });
    if (yeni) sayac({ kullanici: 1 });
    return { ...u, onaylar: s.data()?.onaylar || {} };
  }
  // Kayıt/giriş sırasında kullanıcı sözleşmesi, KVKK ve gizlilik onayı
  async function onay(req) {
    const u = await kim(req);
    const b = req.body || {};
    const belgeler = arr(b.belgeler, 10, 20).filter((k) => ['kullanici', 'kvkk', 'gizlilik', 'cerez', 'pazarlama', 'firma', 'abonelik'].includes(k));
    if (!belgeler.length) hata(400, 'Onaylanacak metin yok.');
    await onayKaydet(req, { tur: str(b.tur, 30) || 'hesap', uid: u.uid, eposta: u.eposta, telefon: u.telefon, ad: u.ad, firma: u.firma || '', belgeler });
    await db.collection('kullanicilar').doc(u.uid).set({ onaylar: Object.fromEntries(belgeler.map((k) => [k, SOZLESME[k].surum])), ...(belgeler.includes('pazarlama') ? { pazarlama: true } : {}) }, { merge: true });
    return { ok: true };
  }
  async function hesap(req) {
    const u = await kim(req);
    const qs = [db.collection('talepler').where('uid', '==', u.uid).limit(50).get()];
    if (u.dogrulandi && u.eposta) qs.push(db.collection('talepler').where('eposta', '==', u.eposta).limit(50).get());
    if (u.telefon) qs.push(db.collection('talepler').where('telefonNorm', '==', telNorm(u.telefon)).limit(50).get());
    const docs = new Map();
    for (const q of await Promise.all(qs)) for (const d of q.docs) docs.set(d.id, d);
    const talepler = [];
    const fCache = new Map();
    const firmaIletisim = async (slug) => {
      if (!fCache.has(slug)) fCache.set(slug, db.collection('firmalar').doc(slug).get().then((x) => x.data() || {}));
      const f = await fCache.get(slug); const st = FIRMS.find((x) => x.slug === slug) || {};
      return { telefon: f.telefon || '', eposta: f.eposta || '', web: st.web || '', sayfa: st.slug ? `/firma/${st.slug}/` : '' };
    };
    const tkler = new Map(await Promise.all([...docs.values()].filter((d) => d.data().mod !== 'surec').map(async (d) => [d.id, await d.ref.collection('teklifler').get()])));
    for (const d of docs.values()) {
      const t = d.data();
      if (t.mod === 'surec') continue;
      const ms = new Map((await d.ref.collection('mesajlar').get()).docs.map((x) => [x.id, (x.data().mesajlar || []).slice(-100)]));
      const tk = (await Promise.all(tkler.get(d.id).docs.map(async (x) => { const y = x.data(); return { firma: firmAd(y.firma), firmaSlug: y.firma, fiyat: y.fiyat, kdvDahil: y.kdvDahil, dahil: (y.dahil || []).map((k) => DAHIL_AD[k]), teslimGun: y.teslimGun, garantiYil: y.garantiYil, not: y.not, zaman: y.zaman?.toMillis?.() || 0, iletisim: await firmaIletisim(y.firma), mesajlar: ms.get(y.firma) || [] }; }))).sort((a, b) => a.fiyat - b.fiyat);
      talepler.push({ id: d.id, ...anonim(t), durum: t.durum, olusturma: t.olusturma?.toMillis?.() || 0, sonTarihMs: t.sonTarih?.toMillis?.() || 0, teklifler: tk });
    }
    talepler.sort((a, b) => b.olusturma - a.olusturma);
    const sq = [db.collection('siparisler').where('uid', '==', u.uid).limit(20).get()];
    if (u.dogrulandi && u.eposta) sq.push(db.collection('siparisler').where('eposta', '==', u.eposta).limit(20).get());
    const sm = new Map();
    for (const q of await Promise.all(sq)) for (const d of q.docs) sm.set(d.id, d);
    const siparisler = [...sm.values()].map((d) => { const s = d.data(); return { id: d.id, tip: s.tip, tipAd: TIP_AD[s.tip], m2: s.m2, oda: s.oda, il: s.il, model: s.model ? (modelBul(s.model)?.ad || '') : '', modelId: s.model || '', firma: s.firma ? firmAd(s.firma) : '', asama: s.asama, asamalar: ASAMALAR, notlar: (s.notlar || []).map((n) => ({ asama: n.asama, metin: n.metin })), belgeler: (s.belgeler || []).filter((x) => httpsUrl(x.url)), mesajlar: (s.mesajlar || []).slice(-20), aktif: s.aktif !== false }; });
    const k = await db.collection('kullanicilar').doc(u.uid).get();
    return { ben: u, talepler, siparisler, favoriler: k.exists ? (k.data().favoriler || []) : [] };
  }
  async function favoriler(req) {
    const u = await kim(req);
    const yeni = arr(req.body?.favoriler, 200, 160);
    const ref = db.collection('kullanicilar').doc(u.uid);
    const s = await ref.get();
    const eski = s.exists ? (s.data().favoriler || []) : [];
    const birlesik = req.body?.degistir ? yeni : [...new Set([...eski, ...yeni])].slice(0, 200);
    await ref.set({ favoriler: birlesik, eposta: u.eposta, guncelleme: FieldValue.serverTimestamp() }, { merge: true });
    return { favoriler: birlesik };
  }
  async function siparisMesaj(req) {
    const u = await kim(req);
    const id = str(req.body?.siparis, 60); const metin = str(req.body?.metin, 1500);
    if (!id || metin.length < 2) hata(400, 'Mesaj yazın.');
    const ref = db.collection('siparisler').doc(id); const s = await ref.get();
    if (!s.exists || !(s.data().uid === u.uid || (u.dogrulandi && s.data().eposta === u.eposta))) hata(404, 'Sipariş bulunamadı.');
    await ref.update({ mesajlar: FieldValue.arrayUnion({ kim: 'musteri', metin, zaman: now() }), guncelleme: FieldValue.serverTimestamp() });
    await mail(ayar().admin, `Sipariş mesajı: ${s.data().ad}`, sablon('Müşteriden mesaj', kart([['Müşteri', s.data().ad], ['Telefon', s.data().telefon], ['Mesaj', metin]]) + buton(`${ayar().site}/yonetim/#siparisler`, 'Yönetim panelinde aç')));
    return { ok: true };
  }

  // ---- Müşteri ↔ firma mesajlaşması (yalnızca fiyat vermiş firmayla) ----
  async function mesajYaz(req, kimden) {
    const b = req.body || {};
    const metin = str(b.metin, 2000);
    if (metin.length < 2) hata(400, 'Mesajınızı yazın.');
    const ref = db.collection('talepler').doc(str(b.talep, 60)); const s = await ref.get();
    if (!s.exists) hata(404, 'Talep bulunamadı.');
    const t = s.data(); let firma; let u;
    if (kimden === 'musteri') {
      u = await kim(req);
      const sahip = t.uid === u.uid || (u.dogrulandi && u.eposta && t.eposta === u.eposta) || (u.telefon && t.telefonNorm === telNorm(u.telefon));
      if (!sahip) hata(404, 'Talep bulunamadı.');
      firma = str(b.firma, 80);
    } else { u = await firmaKim(req); firma = u.firma; }
    if (!(await ref.collection('teklifler').doc(firma).get()).exists) hata(409, 'Mesajlaşma, firma fiyat verdikten sonra açılır.');
    if (!(await rateLimit(req, `mesaj:${u.uid}`, 40))) hata(429, 'Çok fazla mesaj gönderildi, biraz sonra tekrar deneyin.');
    await ref.collection('mesajlar').doc(firma).set({ firma, mesajlar: FieldValue.arrayUnion({ kim: kimden, metin, zaman: now() }), son: FieldValue.serverTimestamp(), [`okunmadi_${kimden === 'musteri' ? 'firma' : 'musteri'}`]: true }, { merge: true });
    const a = ayar(); const fa = firmAd(firma);
    if (kimden === 'musteri') {
      const f = (await db.collection('firmalar').doc(firma).get()).data() || {};
      const to = f.eposta || f.panelEpostalari?.[0];
      if (to) await mail(to, `Müşteriden mesaj: ${TIP_AD[t.tip]}, ${t.il}`, sablon('Müşteriniz size yazdı', `<p><b>${esc(t.ad)}</b> fiyat verdiğiniz talep için mesaj gönderdi:</p><blockquote style="margin:14px 0;padding:12px 16px;border-left:4px solid #17663f;background:#f8faf7;border-radius:8px">${esc(metin)}</blockquote>${buton(`${a.site}/firma-paneli/#talepler`, 'Panelden yanıtla')}`, { ust: 'Yeni mesaj' }));
    } else if (t.eposta) {
      await mail(t.eposta, `${fa} size yazdı`, sablon(`${fa} size yazdı`, `<p>Merhaba ${esc(t.ad)},</p><p><b>${esc(fa)}</b> talebinizle ilgili mesaj gönderdi:</p><blockquote style="margin:14px 0;padding:12px 16px;border-left:4px solid #17663f;background:#f8faf7;border-radius:8px">${esc(metin)}</blockquote>${buton(`${a.site}/hesabim/#teklifler`, 'Yanıtla')}`, { ust: 'Yeni mesaj' }));
    }
    return { ok: true };
  }
  const musteriMesaj = (req) => mesajYaz(req, 'musteri');
  const firmaMesaj = (req) => mesajYaz(req, 'firma');

  // ---- Firma paneli ----
  async function firmaOzet(req) {
    const u = await firmaKim(req);
    const slug = u.firma;
    const fs = await db.collection('firmalar').doc(slug).get();
    const fd = fs.exists ? fs.data() : {};
    const kq = await db.collection('katalog').where('firma', '==', slug).get();
    const kat = Object.fromEntries(kq.docs.map((d) => [d.data().id, d.data()]));
    const modeller = MODELS.filter((m) => m.firma === slug).map((m) => ({ ...m, ...(kat[m.id] ? { fiyat: kat[m.id].fiyat ?? m.fiyat, kdv: kat[m.id].kdv ?? m.kdv, gorseller: kat[m.id].gorseller || [], gizli: !!kat[m.id].gizli } : { gorseller: [] }) }));
    for (const x of Object.values(kat)) if (x.yeni) modeller.push({ ...x, fiyatTuru: x.fiyat ? 'model' : 'yok' });
    const dq = await db.collection('urunDegisiklikleri').where('firma', '==', slug).where('durum', '==', 'bekliyor').get();
    const bekleyen = dq.docs.map((d) => ({ id: d.id, ...d.data(), zaman: d.data().zaman?.toMillis?.() || 0 }));
    const tq = await db.collection('talepler').where('firmalar', 'array-contains', slug).limit(60).get();
    const talepler = [];
    const ekler = await Promise.all(tq.docs.map((d) => Promise.all([d.ref.collection('davetler').doc(slug).get(), d.ref.collection('teklifler').doc(slug).get(), d.ref.collection('mesajlar').doc(slug).get()])));
    for (const [n, d] of tq.docs.entries()) {
      const t = d.data();
      const [dv, tk, mj] = ekler[n];
      talepler.push({ id: d.id, test: !!t.test, mesajlar: mj.exists ? (mj.data().mesajlar || []).slice(-100) : [], ...anonim(t), davetTur: dv.exists ? dv.data().tur || '' : '', olusturma: t.olusturma?.toMillis?.() || 0, sonTarihMs: t.sonTarih?.toMillis?.() || 0, davet: dv.exists ? dv.data().durum : 'yok', teklif: tk.exists ? { fiyat: tk.data().fiyat, kdvDahil: tk.data().kdvDahil } : null, ...(tk.exists ? { musteri: musteri(t) } : {}) });
    }
    talepler.sort((a, b) => b.olusturma - a.olusturma);
    const gq = await db.collection('geriBildirimler').where('firma', '==', slug).limit(50).get();
    const geri = gq.docs.map((d) => ({ id: d.id, ...d.data(), zaman: d.data().zaman?.toMillis?.() || 0 })).sort((a, b) => b.zaman - a.zaman);
    const st = FIRMS.find((f) => f.slug === slug) || {};
    const rq = await db.collection('reklamTalepleri').where('firma', '==', slug).limit(30).get();
    const reklamlar = rq.docs.map((d) => { const r = d.data(); return { id: d.id, paket: r.paket, paketAd: REKLAM_PAKET[r.paket]?.ad || r.paket, fiyat: r.fiyat, durum: r.durum, odemeLinki: r.odemeLinki || '', modelId: r.modelId || '', zaman: r.zaman?.toMillis?.() || 0 }; }).sort((a, b) => b.zaman - a.zaman);
    const ab = fd.abonelik || {};
    // İstatistik: sayaçlar (kalıcı) + son 60 talepten hesaplanan değerler (sayaç yoksa)
    const gercek = talepler.filter((t) => !t.test && (t.davetTur === 'uye' || t.davetTur === 'odeme'));
    const ist = {
      talep: Math.max(fd.istTalep || 0, gercek.length), teklif: Math.max(fd.istTeklif || 0, gercek.filter((t) => t.teklif).length), red: Math.max(fd.istRed || 0, gercek.filter((t) => t.davet === 'red').length),
    };
    ist.oran = ist.talep ? Math.round((ist.teklif / ist.talep) * 100) : 0;
    return {
      uye: uyeAktif(fd), istatistik: ist, kartliOdeme: { acik: iyz().hazir && !!(await iyzicoPlan()), aktif: !!fd.iyzicoAbonelik },
      ben: u, firma: { slug, ad: st.kisaAd || fd.ad || slug, il: st.il || '', tipler: fd.tipler || st.tipler || [], iller: fd.iller || [], eposta: fd.eposta || '', telefon: fd.telefon || '', web: fd.web || st.web || '', adres: fd.adres || '', aktif: !!fd.aktif },
      abonelik: { tutar: ab.tutar || ABONELIK_TL, durum: ab.durum || 'odeme-bekliyor', durumAd: ABONELIK_DURUM[ab.durum || 'odeme-bekliyor'], odemeLinki: ab.odemeLinki || '', sonOdeme: ab.sonOdeme || '', sonrakiOdeme: ab.sonrakiOdeme || '', kurucu: !!ab.kurucu, ucretsizBitis: ab.ucretsizBitis || '' },
      reklamPaketleri: REKLAM_PAKET, reklamlar, modeller, bekleyen, talepler, geriBildirimler: geri,
    };
  }
  async function firmaUrun(req) {
    const u = await firmaKim(req);
    const b = req.body || {};
    const tur = ['guncelle', 'yeni', 'kaldir'].includes(b.tur) ? b.tur : 'guncelle';
    const modelId = str(b.modelId, 160);
    if (tur !== 'yeni') {
      const m = modelBul(modelId) || (await db.collection('katalog').doc(katalogId(modelId)).get()).data();
      if (!m || m.firma !== u.firma) hata(404, 'Model bulunamadı.');
    }
    const v = b.veri || {};
    const kalem = (x) => (['dahil', 'haric', ''].includes(x) ? x : '');
    const veri = {
      ad: str(v.ad, 140), tip: TIP_AD[v.tip] ? v.tip : '', m2: sayi(v.m2, 5, 2000), oda: str(v.oda, 10), kat: [1, 1.5, 2, 3].includes(Number(v.kat)) ? Number(v.kat) : null,
      fiyat: sayi(v.fiyat, 1000, 1e9), kdv: kalem(v.kdv), nakliye: kalem(v.nakliye), montaj: kalem(v.montaj), zemin: kalem(v.zemin),
      teslim: str(v.teslim, 60), kapsam: str(v.kapsam, 800), aciklama: str(v.aciklama, 2000),
      gorseller: arr(v.gorseller, 12, 500).map(httpsUrl).filter(Boolean), not: str(v.not, 500),
    };
    if (tur === 'yeni' && (!veri.ad || !veri.tip)) hata(400, 'Model adı ve tipi zorunlu.');
    if (tur === 'yeni' && !veri.gorseller.length) hata(400, 'En az bir fotoğraf ekleyin.');
    if (tur === 'guncelle' && !['ad', 'tip', 'm2', 'oda', 'kat', 'fiyat', 'kdv', 'nakliye', 'montaj', 'zemin', 'teslim', 'kapsam', 'aciklama'].some((k) => veri[k]) && !veri.gorseller.length) hata(400, 'Değiştirmek istediğiniz bir alan girin.');
    if (!(await rateLimit(req, `urun:${u.firma}`, 40))) hata(429, 'Çok fazla değişiklik gönderildi, biraz sonra tekrar deneyin.');
    const ref = await db.collection('urunDegisiklikleri').add({ firma: u.firma, modelId: tur === 'yeni' ? '' : modelId, tur, veri, durum: 'bekliyor', uid: u.uid, eposta: u.eposta, zaman: FieldValue.serverTimestamp() });
    await mail(ayar().admin, `Onay bekleyen ürün değişikliği: ${firmAd(u.firma)}`, sablon('Ürün değişikliği', kart([['Firma', firmAd(u.firma)], ['İşlem', tur], ['Model', tur === 'yeni' ? veri.ad : (modelBul(modelId)?.ad || modelId)], ['Yeni fiyat', veri.fiyat ? tl(veri.fiyat) : ''], ['Fotoğraf', veri.gorseller.length ? `${veri.gorseller.length} adet` : '']]) + buton(`${ayar().site}/yonetim/#onaylar`, 'Onaylamak için yönetim paneli')));
    return { ok: true, id: ref.id };
  }
  // Firma paneli fotoğraf yükleme: tarayıcıda küçültülmüş WebP/JPEG, sitemizden sunulur
  async function firmaGorsel(req) {
    const u = await firmaKim(req);
    const m = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.veri || ''));
    if (!m) hata(400, 'Geçersiz görsel. JPG, PNG ya da WebP yükleyin.');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 900 * 1024) hata(413, 'Görsel çok büyük; daha küçük bir fotoğraf seçin.');
    if (!(await rateLimit(req, `gorsel:${u.firma}`, 80))) hata(429, 'Çok fazla fotoğraf yüklendi, biraz sonra tekrar deneyin.');
    const ref = db.collection('gorseller').doc();
    await ref.set({ firma: u.firma, tur: m[1], veri: buf, boyut: buf.length, uid: u.uid, zaman: FieldValue.serverTimestamp() });
    return { ok: true, url: `${ayar().site}/api/gorsel/${ref.id}` };
  }
  async function firmaTeklif(req) {
    const u = await firmaKim(req);
    const id = str(req.body?.talep, 60);
    const ref = db.collection('talepler').doc(id); const s = await ref.get();
    if (!s.exists || !(s.data().firmalar || []).includes(u.firma)) hata(404, 'Talep bulunamadı.');
    const dvRef = ref.collection('davetler').doc(u.firma); const dv = await dvRef.get();
    return teklifKaydet({ ref, talep: s.data(), davet: dv.exists ? dv.data() : { eposta: u.eposta }, davetRef: dvRef }, req.body || {}, u.firma);
  }
  async function firmaRed(req) {
    const u = await firmaKim(req);
    const id = str(req.body?.talep, 60);
    const ref = db.collection('talepler').doc(id); const s = await ref.get();
    if (!s.exists || !(s.data().firmalar || []).includes(u.firma)) hata(404, 'Talep bulunamadı.');
    if ((await ref.collection('teklifler').doc(u.firma).get()).exists) hata(409, 'Bu talebe zaten fiyat verdiniz.');
    await ref.collection('davetler').doc(u.firma).set({ durum: 'red', redZamani: FieldValue.serverTimestamp() }, { merge: true });
    if (!s.data().test) firmaSayac(u.firma, { istRed: 1 });
    return { ok: true };
  }
  async function firmaGeriBildirim(req) {
    const u = await firmaKim(req);
    const b = req.body || {};
    const tur = GB_TUR[b.tur] ? b.tur : 'diger';
    const konu = str(b.konu, 140); const mesaj = str(b.mesaj, 3000);
    if (!konu || mesaj.length < 5) hata(400, 'Konu ve mesaj yazın.');
    if (!(await rateLimit(req, `gb:${u.firma}`, 15))) hata(429, 'Çok fazla mesaj gönderildi, biraz sonra tekrar deneyin.');
    const ref = await db.collection('geriBildirimler').add({ firma: u.firma, uid: u.uid, eposta: u.eposta, tur, konu, mesaj, sayfa: str(b.sayfa, 200), durum: 'acik', cevaplar: [], zaman: FieldValue.serverTimestamp() });
    await mail(ayar().admin, `Firma geri bildirimi (${GB_TUR[tur]}): ${firmAd(u.firma)}`, sablon('Firmadan geri bildirim', kart([['Firma', firmAd(u.firma)], ['Gönderen', u.eposta], ['Tür', GB_TUR[tur]], ['Konu', konu], ['Mesaj', mesaj]]) + buton(`${ayar().site}/yonetim/#geri-bildirim`, 'Yanıtla')));
    return { ok: true, id: ref.id };
  }
  async function firmaGeriBildirimYanit(req) {
    const u = await firmaKim(req);
    const id = str(req.body?.id, 60); const metin = str(req.body?.metin, 3000);
    const ref = db.collection('geriBildirimler').doc(id); const s = await ref.get();
    if (!s.exists || s.data().firma !== u.firma) hata(404, 'Kayıt bulunamadı.');
    if (metin.length < 2) hata(400, 'Mesaj yazın.');
    await ref.update({ cevaplar: FieldValue.arrayUnion({ kim: 'firma', metin, zaman: now() }), durum: 'acik' });
    await mail(ayar().admin, `Geri bildirime yanıt: ${firmAd(u.firma)}`, sablon('Firmadan yanıt', kart([['Konu', s.data().konu], ['Mesaj', metin]])));
    return { ok: true };
  }
  async function firmaReklam(req) {
    const u = await firmaKim(req);
    const b = req.body || {};
    const paket = REKLAM_PAKET[b.paket] ? b.paket : '';
    if (!paket) hata(400, 'Bir reklam paketi seçin.');
    const modelId = str(b.modelId, 160);
    if (paket === 'liste' && modelId) { const m = modelBul(modelId) || (await db.collection('katalog').doc(katalogId(modelId)).get()).data(); if (!m || m.firma !== u.firma) hata(400, 'Model bulunamadı.'); }
    if (!(await rateLimit(req, `reklam:${u.firma}`, 10))) hata(429, 'Çok fazla talep gönderildi, biraz sonra tekrar deneyin.');
    const fiyat = REKLAM_PAKET[paket].fiyat;
    const ref = await db.collection('reklamTalepleri').add({ firma: u.firma, uid: u.uid, eposta: u.eposta, paket, fiyat, modelId, not: str(b.not, 1000), durum: 'bekliyor', zaman: FieldValue.serverTimestamp() });
    await Promise.allSettled([
      mail(ayar().admin, `Reklam talebi: ${firmAd(u.firma)} · ${REKLAM_PAKET[paket].ad}`, sablon('Yeni reklam talebi', kart([['Firma', firmAd(u.firma)], ['Paket', REKLAM_PAKET[paket].ad], ['Aylık bedel', tl(fiyat)], ['Model', modelId ? (modelBul(modelId)?.ad || modelId) : ''], ['Gönderen', u.eposta], ['Not', str(b.not, 1000)]]) + buton(`${ayar().site}/yonetim/#banner`, 'Yönetim panelinde görüntüle'))),
      mail(u.eposta, 'Reklam talebiniz alındı', sablon('Reklam talebiniz alındı', `<p>${esc(REKLAM_PAKET[paket].ad)} için aylık <b>${tl(fiyat)}</b> tutarındaki talebinizi aldık. Bu bedel aylık ${ABONELIK_TL} TL üyeliğinize ektir. Alan uygunluğunu kontrol edip ödeme bağlantısını size e-postayla ileteceğiz; ödeme sonrası reklamınız yayına alınır.</p><p style="font-size:12px;color:#4a5751">Her banner alanında aynı anda en fazla ${KONUM_SINIRI.ana} reklam yayınlanır. Ödenen bedeller iade edilmez: <a href="${esc(ayar().site)}/firma-uyelik-sozlesmesi/">üyelik sözleşmesi</a>.</p>`)),
    ]);
    return { ok: true, id: ref.id };
  }
  async function firmaProfil(req) {
    const u = await firmaKim(req);
    const b = req.body || {};
    const eposta = str(b.eposta, 120).toLowerCase();
    if (eposta && !epostaMi(eposta)) hata(400, 'Geçerli bir e-posta yazın.');
    const iller = arr(b.iller, 81, 40);
    const tipler = arr(b.tipler).filter((t) => TIP_AD[t]);
    await db.collection('firmalar').doc(u.firma).set({ ...(eposta ? { eposta, panelEpostalari: FieldValue.arrayUnion(eposta) } : {}), telefon: str(b.telefon, 20), ...(b.web !== undefined ? { web: httpsUrl(b.web) || '' } : {}), ...(b.adres !== undefined ? { adres: str(b.adres, 240) } : {}), iller: iller.length ? iller : ['*'], ...(tipler.length ? { tipler } : {}), guncelleme: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
  }

  // ---- iyzico aylık abonelik ----
  const iyz = () => iyzicoIstemci({ ...(ayar().iyzico || {}), fetch: fetchFn });
  const ayEkle = (ms, n = 1) => { const t = new Date(ms); t.setMonth(t.getMonth() + n); return t.toISOString().slice(0, 10); };
  const bugun = () => new Date(now()).toISOString().slice(0, 10);
  // Geri dönen adres işareti yalnızca o adresi engeller; firmanın kataloğdaki adresi değişince yeniden yazılabilir
  const gecersizMi = (k, eposta) => !!k?.gecersiz && String(k.gecersizEposta || '').toLowerCase() === String(eposta || '').toLowerCase();
  // ---- Açılış kampanyası (içeride “kurucu”): ilk KURUCU_KONTENJAN onaylı firmaya 1 ay ücretsiz üyelik ----
  async function kurucuKalan() {
    const q = await db.collection('firmalar').get();
    return Math.max(0, KURUCU_KONTENJAN - q.docs.filter((d) => d.data().abonelik?.kurucu).length);
  }
  const kurucuMetni = (kalan) => (kalan > 0 ? `<b>Açılış kampanyası: 1 ay ücretsiz üyelik.</b> İlk ${KURUCU_KONTENJAN} firmaya özel, kart bilgisi istemiyoruz. Sonrasında aylık ${ABONELIK_TL} TL; komisyon ve taahhüt yok, devam etmezseniz hiçbir şey ödemezsiniz.` : '');
  const kurucuAbonelik = (once = {}) => ({ ...once, tutar: ABONELIK_TL, durum: 'aktif', kurucu: true, ucretsizBitis: ayEkle(now()), sonrakiOdeme: ayEkle(now()), baslangic: once.baslangic || now() });
  const kurucuHosgeldin = (ad, bitis) => sablon('Üyeliğiniz aktif: 1 ay ücretsiz', `<p>Sayın ${esc(ad || 'yetkili')},</p><p>PrefabrikTeklif’e hoş geldiniz. Başvurunuz onaylandı ve açılış kampanyası kapsamında üyeliğiniz <b>1 ay ücretsiz</b> açıldı: <b>${esc(bitis)}</b> tarihine kadar size uyan taleplere hiçbir ücret ödemeden fiyat verebilirsiniz.</p><p>Her talepte müşterinin ilini, ev tipini, metrekare ve oda sayısını, bütçesini, arsa durumunu ve ne zaman başlamak istediğini görürsünüz; fiyat verdiğiniz anda adı, telefonu ve e-postası da açılır.</p><p>Firma paneline bu e-postanın geldiği adresle giriş yaparsınız; ilk kez giriyorsanız “Kayıt ol” ile şifre belirleyin ya da Google ile girin. Panelden ürünlerinizi, fiyatlarınızı ve fotoğraflarınızı da güncelleyebilirsiniz. Firma sayfanızda artık “Üye firma” rozeti görünür.</p><p>Ücretsiz dönem bitmeden size hatırlatma göndereceğiz; devam etmek isterseniz aylık ${ABONELIK_TL} TL ödersiniz, istemezseniz hiçbir şey yapmanız gerekmez, üyeliğiniz kendiliğinden durur.</p>${buton(`${ayar().site}/firma-paneli/#talepler`, 'Teklif bekleyen talepleri gör')}<p style="font-size:12px;color:#4a5751">Ayrıntılar: <a href="${esc(ayar().site)}/firma-uyelik-sozlesmesi/">firma üyelik sözleşmesi</a> · <a href="${esc(ayar().site)}/abonelik-ve-iptal-kosullari/">abonelik koşulları</a></p>`, { ust: 'Üyelik aktif', onizleme: '1 ay ücretsiz: taleplere hemen fiyat verebilirsiniz' });
  // Manuel ödemeli (iyzico dışı) üyelikler: ödeme gününden 3 gün önce hatırlatma, ödeme günü + 3 gün geçince askıya alma
  async function uyelikSureKontrol() {
    const q = await db.collection('firmalar').get(); const gun = 24 * 3600000; let n = 0;
    for (const d of q.docs) {
      const f = d.data(); const ab = f.abonelik || {};
      if (ab.durum !== 'aktif' || ab.yontem === 'iyzico' || !/^\d{4}-\d{2}-\d{2}$/.test(ab.sonrakiOdeme || '')) continue;
      const odemeT = Date.parse(`${ab.sonrakiOdeme}T00:00:00+03:00`); const to = f.eposta || f.panelEpostalari?.[0];
      if (now() > odemeT + 3 * gun) {
        await d.ref.set({ abonelik: { ...ab, durum: 'gecikti', hatirlatma: now(), askiZamani: now() } }, { merge: true }); n++;
        if (to) await mail(to, 'Üyeliğiniz durduruldu', sablon('Üyeliğiniz durduruldu', `<p>${ab.kurucu && ab.ucretsizBitis === ab.sonrakiOdeme ? '1 aylık ücretsiz üyeliğiniz sona erdi' : 'Bu ayki üyelik ödemeniz bize ulaşmadı'}; bu yüzden üyeliğinizi durdurduk. Yeni talepler size gelmiyor ve taleplere fiyat veremiyorsunuz.</p><p>Devam etmek isterseniz aylık ${ABONELIK_TL} TL ödemeyi yapmanız yeterli; ödeme onaylanınca üyeliğiniz kaldığı yerden açılır.</p>${ab.odemeLinki ? buton(ab.odemeLinki, 'Ödemeyi yap') : '<p>Ödeme bağlantısı için bu e-postayı yanıtlamanız yeterli.</p>'}`, { ust: 'Üyelik durdu' }));
        await mail(ayar().admin, `Üyelik durdu: ${f.ad || d.id}`, sablon('Üyelik durduruldu', kart([['Firma', f.ad || d.id], ['Ödeme günü', ab.sonrakiOdeme], ['Açılış kampanyası (1 ay ücretsiz)', ab.kurucu ? 'Evet' : 'Hayır']]) + buton(`${ayar().site}/yonetim/#firmalar`, 'Yönetim panelinde aç')));
      } else if (now() > odemeT - 3 * gun && ab.hatirlatmaOdeme !== ab.sonrakiOdeme) {
        await d.ref.set({ abonelik: { ...ab, hatirlatmaOdeme: ab.sonrakiOdeme } }, { merge: true }); n++;
        if (to) await mail(to, ab.kurucu && ab.ucretsizBitis === ab.sonrakiOdeme ? 'Ücretsiz ayınız bitiyor' : 'Üyelik ödeme gününüz yaklaşıyor', sablon(ab.kurucu && ab.ucretsizBitis === ab.sonrakiOdeme ? 'Ücretsiz üyelik ayınız bitiyor' : 'Ödeme gününüz yaklaşıyor', `<p>Üyeliğinizin ${ab.kurucu && ab.ucretsizBitis === ab.sonrakiOdeme ? 'ücretsiz dönemi' : 'bu ayki dönemi'} <b>${esc(ab.sonrakiOdeme)}</b> tarihinde bitiyor. Talepleri almaya ve fiyat vermeye devam etmek için aylık <b>${ABONELIK_TL} TL</b> üyelik ödemesini yapın.</p>${ab.odemeLinki ? buton(ab.odemeLinki, 'Ödemeyi yap') : '<p>Ödeme bağlantınızı birkaç gün içinde e-postayla ileteceğiz.</p>'}<p style="font-size:12px;color:#4a5751">Devam etmek istemiyorsanız bir şey yapmanız gerekmez; ödeme yapılmazsa üyelik ${esc(ab.sonrakiOdeme)} tarihinden 3 gün sonra kendiliğinden durur, ücret çıkmaz.</p>`, { ust: 'Hatırlatma' }));
        if (!ab.odemeLinki) await mail(ayar().admin, `Ödeme bağlantısı gönderin: ${f.ad || d.id}`, sablon('Ödeme bağlantısı gerekiyor', `<p>${esc(f.ad || d.id)} firmasının ${ab.kurucu && ab.ucretsizBitis === ab.sonrakiOdeme ? 'ücretsiz üyelik ayı' : 'üyelik dönemi'} ${esc(ab.sonrakiOdeme)} tarihinde bitiyor ve kayıtlı ödeme bağlantısı yok. Yönetim panelinden ödeme bağlantısını gönderin.</p>${buton(`${ayar().site}/yonetim/#firmalar`, 'Yönetim panelinde aç')}`));
      }
    }
    return n;
  }
  async function iyzicoPlan() { const d = (await db.collection('sistem').doc('iyzico').get()).data() || {}; return ayar().iyzico?.planKodu || d.planKodu || ''; }
  async function firmaAbonelikBaslat(req) {
    const u = await firmaKim(req);
    const c = iyz(); if (!c.hazir) hata(409, 'Kartla otomatik ödeme henüz açılmadı. Ödeme bağlantısıyla ödeyebilir ya da bizimle iletişime geçebilirsiniz.');
    const plan = await iyzicoPlan(); if (!plan) hata(409, 'Abonelik planı henüz tanımlanmadı.');
    const b = req.body || {};
    const ad = str(b.ad, 60); const soyad = str(b.soyad, 60); const adres = str(b.adres, 240); const il = str(b.il, 40);
    const gsm = String(b.telefon || '').replace(/\D/g, '').slice(-10);
    const tc = /^\d{11}$/.test(String(b.tc || '')) ? String(b.tc) : '11111111111';
    if (!ad || !soyad || adres.length < 10 || !il || gsm.length !== 10) hata(400, 'Ad, soyad, telefon, il ve fatura adresini eksiksiz yazın.');
    if (b.onay !== true) hata(400, 'Abonelik, ödeme ve iptal koşullarını onaylayın.');
    const ref = db.collection('firmalar').doc(u.firma); const fd = (await ref.get()).data() || {};
    const kod = token();
    await ref.set({ iyzicoDonusKod: kod }, { merge: true });
    await onayKaydet(req, { tur: 'abonelik-baslatma', uid: u.uid, eposta: u.eposta, firma: u.firma, ad: `${ad} ${soyad}`, belgeler: ['abonelik', 'firma'] });
    const a = ayar();
    const r = await c.formBaslat({ conversationId: u.firma, planKodu: plan, callbackUrl: `${a.site}/api/iyzico/donus?f=${encodeURIComponent(u.firma)}&k=${kod}`,
      musteri: { name: ad, surname: soyad, email: fd.eposta || u.eposta, gsmNumber: `+90${gsm}`, identityNumber: tc, billingAddress: { contactName: `${ad} ${soyad}`, city: il, country: 'Turkey', address: adres }, shippingAddress: { contactName: `${ad} ${soyad}`, city: il, country: 'Turkey', address: adres } } });
    return { icerik: r.checkoutFormContent, token: r.token };
  }
  async function iyzicoDonus(req) {
    const slug = str(req.query?.f, 80); const kod = str(req.query?.k, 60); const tkn = str(req.body?.token || req.query?.token, 200);
    const ref = db.collection('firmalar').doc(slug); const fd = slug ? (await ref.get()).data() : null;
    const geri = (durum) => ({ __yonlendir: `/firma-paneli/?odeme=${durum}#uyelik` });
    if (!fd || !kod || fd.iyzicoDonusKod !== kod || !tkn) return geri('hata');
    let r; try { r = await iyz().formSonuc(tkn); } catch (e) { console.error('iyzico dönüş', e?.message); return geri('hata'); }
    const x = r.data || {};
    if (x.subscriptionStatus !== 'ACTIVE' || !x.referenceCode) return geri('hata');
    const ab = { ...(fd.abonelik || {}), tutar: ABONELIK_TL, durum: 'aktif', yontem: 'iyzico', iyzico: { abonelikKodu: x.referenceCode, musteriKodu: x.customerReferenceCode || '' }, sonOdeme: bugun(), sonrakiOdeme: ayEkle(now()) };
    await ref.set({ abonelik: ab, iyzicoAbonelik: x.referenceCode, iyzicoDonusKod: '' }, { merge: true });
    const a = ayar(); const to = fd.eposta || fd.panelEpostalari?.[0];
    await Promise.allSettled([
      to ? mail(to, 'Üyeliğiniz başladı: artık teklif verebilirsiniz', sablon('Üyeliğiniz başladı', `<p>Kartınız kaydedildi ve ilk aylık ödemeniz alındı. Üyelik ücreti (${tl(ABONELIK_TL)}) her ay aynı gün kartınızdan otomatik çekilir; dilediğiniz zaman panelinizden iptal edebilirsiniz.</p>${kart([['Sonraki ödeme', ab.sonrakiOdeme], ['Tutar', `${tl(ABONELIK_TL)} / ay`]])}${buton(`${a.site}/firma-paneli/#talepler`, 'Taleplere git')}`, { ust: 'Üyelik aktif' })) : null,
      mail(a.admin, `Abonelik başladı: ${firmAd(slug)}`, sablon('Yeni kartlı abonelik', kart([['Firma', firmAd(slug)], ['iyzico abonelik kodu', x.referenceCode]]))),
    ]);
    return geri('basarili');
  }
  // iyzico abonelik bildirimi: içerik doğrudan güvenilmez, durum iyzico'dan sorgulanarak doğrulanır
  async function iyzicoBildirim(req) {
    const b = req.body || {};
    const kodAb = str(b.subscriptionReferenceCode, 100);
    if (!kodAb) return { ok: true };
    const q = await db.collection('firmalar').where('iyzicoAbonelik', '==', kodAb).limit(1).get();
    if (q.empty) return { ok: true };
    const ref = q.docs[0].ref; const fd = q.docs[0].data(); const slug = q.docs[0].id;
    let durum = '';
    try { durum = (await iyz().abonelik(kodAb)).data?.subscriptionStatus || ''; } catch (e) { console.error('iyzico sorgu', e?.message); hata(409, 'Doğrulanamadı'); }
    const a = ayar(); const to = fd.eposta || fd.panelEpostalari?.[0];
    const ab = { ...(fd.abonelik || {}) };
    if (b.iyziEventType === 'subscription.order.success' && durum === 'ACTIVE') {
      const yeni = ab.durum !== 'aktif';
      Object.assign(ab, { durum: 'aktif', sonOdeme: bugun(), sonrakiOdeme: ayEkle(now()), hataSiparis: '', hataZamani: 0 });
      await ref.set({ abonelik: ab }, { merge: true });
      if (yeni && to) await mail(to, 'Ödemeniz alındı, üyeliğiniz yeniden aktif', sablon('Üyeliğiniz yeniden aktif', `<p>Aylık üyelik ödemeniz alındı. Size uyan talepler yeniden panelinize gelecek.</p>${buton(`${a.site}/firma-paneli/#talepler`, 'Panele git')}`, { ust: 'Ödeme alındı' }));
    } else if (b.iyziEventType === 'subscription.order.failure') {
      Object.assign(ab, { durum: 'gecikti', hataSiparis: str(b.orderReferenceCode, 100), hataZamani: now(), hatirlatma: now() });
      await ref.set({ abonelik: ab }, { merge: true });
      await Promise.allSettled([
        to ? mail(to, 'Üyelik ödemeniz alınamadı: talepler durduruldu', odemeHataHtml()) : null,
        mail(a.admin, `Abonelik ödemesi alınamadı: ${firmAd(slug)}`, sablon('Ödeme alınamadı', kart([['Firma', firmAd(slug)], ['iyzico durumu', durum]]))),
      ]);
    }
    return { ok: true };
  }
  const odemeHataHtml = () => sablon('Üyelik ödemeniz alınamadı', `<p>Bu ayki ${tl(ABONELIK_TL)} üyelik ödemeniz kayıtlı kartınızdan çekilemedi. <b>Ödeme alınana kadar yeni müşteri talepleri size gelmez</b> ve bekleyen taleplere fiyat veremezsiniz.</p><p>Kartınızı panelinizden güncellediğinizde ödeme hemen yeniden denenir ve üyeliğiniz kaldığı yerden devam eder.</p>${buton(`${ayar().site}/firma-paneli/#uyelik`, 'Kartımı güncelle')}`, { ust: 'Ödeme alınamadı', onizleme: 'Kartınızı güncelleyin, talepler yeniden gelsin' });
  async function firmaKartGuncelle(req) {
    const u = await firmaKim(req);
    const ref = db.collection('firmalar').doc(u.firma); const fd = (await ref.get()).data() || {};
    if (!fd.iyzicoAbonelik) hata(400, 'Kartlı aboneliğiniz yok.');
    const kod = token(); await ref.set({ iyzicoDonusKod: kod }, { merge: true });
    const r = await iyz().kartGuncelleBaslat({ abonelikKodu: fd.iyzicoAbonelik, callbackUrl: `${ayar().site}/api/iyzico/kart-donus?f=${encodeURIComponent(u.firma)}&k=${kod}` });
    return { icerik: r.checkoutFormContent, token: r.token };
  }
  async function iyzicoKartDonus(req) {
    const slug = str(req.query?.f, 80); const kod = str(req.query?.k, 60);
    const ref = db.collection('firmalar').doc(slug); const fd = slug ? (await ref.get()).data() : null;
    if (!fd || !kod || fd.iyzicoDonusKod !== kod) return { __yonlendir: '/firma-paneli/?odeme=hata#uyelik' };
    await ref.set({ iyzicoDonusKod: '' }, { merge: true });
    if (fd.abonelik?.durum === 'gecikti' && fd.abonelik?.hataSiparis) { try { await iyz().odemeTekrarla(fd.abonelik.hataSiparis); } catch (e) { console.error('iyzico yeniden deneme', e?.message); } }
    return { __yonlendir: '/firma-paneli/?odeme=kart#uyelik' };
  }
  async function firmaAbonelikIptal(req) {
    const u = await firmaKim(req);
    const ref = db.collection('firmalar').doc(u.firma); const fd = (await ref.get()).data() || {};
    if (!fd.iyzicoAbonelik) hata(400, 'Kartlı aboneliğiniz yok.');
    await iyz().iptal(fd.iyzicoAbonelik);
    await ref.set({ abonelik: { ...(fd.abonelik || {}), durum: 'iptal', iptalZamani: now() } }, { merge: true });
    await mail(ayar().admin, `Abonelik iptal edildi: ${firmAd(u.firma)}`, sablon('Firma aboneliğini iptal etti', kart([['Firma', firmAd(u.firma)], ['İptal eden', u.eposta]])));
    return { ok: true };
  }
  async function yonetimIyzicoPlan(req) {
    await yonetici(req);
    const c = iyz(); if (!c.hazir) hata(409, 'iyzico anahtarları tanımlı değil.');
    const ur = await c.urunOlustur('PrefabrikTeklif Firma Üyeliği', `Aylık ${ABONELIK_TL} TL firma üyeliği`);
    const pl = await c.planOlustur(ur.data.referenceCode, `Aylık ${ABONELIK_TL} TL`, ABONELIK_TL);
    await db.collection('sistem').doc('iyzico').set({ urunKodu: ur.data.referenceCode, planKodu: pl.data.referenceCode, zaman: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, planKodu: pl.data.referenceCode };
  }
  // Ödemesi gecikmiş firmalara 3 günde bir hatırlatma
  async function abonelikHatirlat() {
    const q = await db.collection('firmalar').get(); let n = 0;
    for (const d of q.docs) {
      const ab = d.data().abonelik || {};
      if (ab.durum !== 'gecikti' || now() - (ab.hatirlatma || 0) < 3 * 24 * 3600000) continue;
      const to = d.data().eposta || d.data().panelEpostalari?.[0]; if (!to) continue;
      await mail(to, 'Üyeliğinizi yenileyin: yeni talepler size ulaşmıyor', ab.yontem === 'iyzico' ? odemeHataHtml() : sablon('Üyeliğinizi yenileyin', `<p>Üyeliğiniz ödeme bekliyor. <b>Ödeme alınana kadar yeni müşteri talepleri size gelmez</b> ve bekleyen taleplere fiyat veremezsiniz.</p>${ab.odemeLinki ? buton(ab.odemeLinki, `${ABONELIK_TL} TL ödemeyi yap`) : '<p>Ödeme bağlantısı için bu e-postayı yanıtlamanız yeterli.</p>'}`, { ust: 'Ödeme bekleniyor' }));
      await d.ref.set({ abonelik: { ...ab, hatirlatma: now() } }, { merge: true }); n++;
    }
    return n;
  }

  // ---- Yönetim ----
  async function yonetimOzet(req) {
    await yonetici(req);
    const al = async (q, dön = (d) => ({ id: d.id, ...d.data() })) => (await q.get()).docs.map(dön);
    const ms = (x) => x?.toMillis?.() || 0;
    const [degisiklik, basvuru, yorumB, geri, talep, siparis, firma, banner, kontrol, reklamT, iletisimM, epostaH, epostaDurum] = await Promise.all([
      al(db.collection('urunDegisiklikleri').where('durum', '==', 'bekliyor').limit(100)),
      al(db.collection('firmaBasvurulari').where('durum', '==', 'bekliyor').limit(50)),
      al(db.collection('yorumlar').where('durum', '==', 'bekliyor').limit(50)),
      al(db.collection('geriBildirimler').limit(100)),
      al(db.collection('talepler').orderBy('olusturma', 'desc').limit(60)),
      al(db.collection('siparisler').where('aktif', '==', true).limit(100)),
      al(db.collection('firmalar')),
      al(db.collection('bannerlar')),
      al(db.collection('fiyatKontrol').orderBy('zaman', 'desc').limit(1)),
      al(db.collection('reklamTalepleri').limit(100)),
      al(db.collection('iletisimMesajlari').orderBy('zaman', 'desc').limit(50)),
      al(db.collection('epostaHatalari').orderBy('zaman', 'desc').limit(20)),
      db.collection('sistem').doc('eposta').get().then((d) => d.data() || {}).catch(() => ({})),
    ]);
    const [kullaniciQ, sayacD, onayQ, tanitimD, tanitimQ, tumTalepQ] = await Promise.all([
      al(db.collection('kullanicilar').limit(1000)),
      db.collection('sistem').doc('sayac').get().then((d) => d.data() || {}).catch(() => ({})),
      al(db.collection('onaylar').orderBy('zaman', 'desc').limit(100)).catch(() => []),
      db.collection('sistem').doc('tanitim').get().then((d) => d.data() || {}).catch(() => ({})),
      al(db.collection('tanitimKayit').limit(2000)).catch(() => []),
      al(db.collection('talepler').limit(2000), (d) => { const x = d.data(); return { eposta: x.eposta, telefonNorm: x.telefonNorm || telNorm(x.telefon), uid: x.uid, test: !!x.test, mod: x.mod, teklifSayisi: x.teklifSayisi || 0 }; }),
    ]);
    const z = (x) => ({ ...x, zaman: ms(x.zaman), olusturma: ms(x.olusturma), guncelleme: ms(x.guncelleme), sonTarih: ms(x.sonTarih), rizaZamani: undefined });
    await Promise.all(talep.map(async (t) => {
      const ref = db.collection('talepler').doc(t.id);
      const [dv, tk] = await Promise.all([ref.collection('davetler').get(), ref.collection('teklifler').get()]);
      t.davetler = dv.docs.map((d) => ({ firma: d.id, durum: d.data().durum }));
      t.teklifSayisi = tk.size; delete t.token;
    }));
    // Kullanıcılar: hesap açanlar + hesabı olmadan talep gönderenler; her biri için talep ve gelen teklif sayısı
    const gercekT = tumTalepQ.filter((t) => !t.test);
    const kisiler = kullaniciQ.filter((k) => k.rol !== 'firma').map((k) => {
      const tl2 = gercekT.filter((t) => t.uid === k.id || (k.eposta && t.eposta === k.eposta) || (k.telefon && t.telefonNorm === telNorm(k.telefon)));
      return { uid: k.id, ad: k.ad || '', eposta: k.eposta || '', telefon: k.telefon || '', rol: k.rol || 'kullanici', ilkGiris: ms(k.ilkGiris), sonGiris: ms(k.sonGiris), talep: tl2.length, teklif: tl2.reduce((n, t) => n + t.teklifSayisi, 0), favori: (k.favoriler || []).length, pazarlama: !!k.pazarlama };
    }).sort((a, b) => b.sonGiris - a.sonGiris);
    const hesapsiz = new Map();
    for (const t of gercekT) if (t.eposta && !kullaniciQ.some((k) => k.eposta === t.eposta)) { const x = hesapsiz.get(t.eposta) || { eposta: t.eposta, talep: 0, teklif: 0 }; x.talep++; x.teklif += t.teklifSayisi; hesapsiz.set(t.eposta, x); }
    const istatistik = {
      kullanici: kisiler.length, firmaHesabi: kullaniciQ.filter((k) => k.rol === 'firma').length, hesapsizMusteri: hesapsiz.size,
      talep: gercekT.filter((t) => t.mod !== 'surec').length, surec: gercekT.filter((t) => t.mod === 'surec').length,
      teklif: gercekT.reduce((n, t) => n + t.teklifSayisi, 0), teklifAlanTalep: gercekT.filter((t) => t.teklifSayisi > 0).length,
      uyeFirma: firma.filter((f) => f.aktif !== false && !f.kaldirildi && f.abonelik?.durum === 'aktif').length, kayitliFirma: firma.length,
      sayac: sayacD,
    };
    const tanitim = { aktif: !!tanitimD.aktif, gunluk: tanitimD.gunluk || 20, saat: tanitimD.saat || 10, sonCalisma: ms(tanitimD.sonCalisma), gonderilen: tanitimQ.filter((x) => x.sayi).length, iptal: tanitimQ.filter((x) => x.iptal).length, aday: 0, son: tanitimQ.filter((x) => x.son).sort((a, b) => ms(b.son) - ms(a.son)).slice(0, 30).map((x) => ({ ad: x.ad || x.id, eposta: x.eposta, son: ms(x.son), sayi: x.sayi || 0, iptal: !!x.iptal })) };
    tanitim.aday = (await tanitimAdaylari()).length;
    return {
      iyzico: { hazir: iyz().hazir, planKodu: await iyzicoPlan() },
      istatistik, kullanicilar: kisiler.slice(0, 500), hesapsizMusteriler: [...hesapsiz.values()].slice(0, 300), onaylar: onayQ.map((o) => ({ ...o, zaman: ms(o.zaman), ip: undefined })), tanitim,
      degisiklikler: degisiklik.map((d) => ({ ...z(d), firmaAd: firmAd(d.firma), model: d.modelId ? (modelBul(d.modelId) || null) : null })),
      basvurular: basvuru.map(z), yorumlar: yorumB.map((y) => ({ ...z(y), firmaAd: firmAd(y.firma) })),
      geriBildirimler: geri.map((g) => ({ ...z(g), firmaAd: firmAd(g.firma) })).sort((a, b) => (a.durum === 'kapandi') - (b.durum === 'kapandi') || b.zaman - a.zaman),
      talepler: talep.map(z), siparisler: siparis.map((s) => ({ ...z(s), firmaAd: s.firma ? firmAd(s.firma) : '', modelAd: s.model ? (modelBul(s.model)?.ad || s.model) : '' })),
      firmalar: firma.map((f) => ({ ...z(f), ad: firmAd(f.id) })), bannerlar: banner.map(z), sonKontrol: kontrol[0] ? z(kontrol[0]) : null,
      asamalar: ASAMALAR, statikFirmalar: FIRMS.map((f) => ({ slug: f.slug, ad: f.kisaAd, ...(f.eposta ? { eposta: f.eposta } : {}) })).sort((x, y) => x.ad.localeCompare(y.ad, 'tr')),
      reklamTalepleri: reklamT.map((r) => ({ ...z(r), firmaAd: firmAd(r.firma), paketAd: REKLAM_PAKET[r.paket]?.ad || r.paket, modelAd: r.modelId ? (modelBul(r.modelId)?.ad || r.modelId) : '' })).sort((a, b) => (a.durum === 'bitti' || a.durum === 'red') - (b.durum === 'bitti' || b.durum === 'red') || b.zaman - a.zaman),
      iletisim: iletisimM.map((m) => ({ ...z(m), konuAd: ILETISIM_KONU[m.konu] || m.konu })),
      epostaHatalari: epostaH.map(z), epostaSonBasari: ms(epostaDurum.sonBasari) || 0,
      abonelik: ABONELIK_TL, kurucuKalan: await kurucuKalan(), kurucuToplam: KURUCU_KONTENJAN, reklamPaketleri: REKLAM_PAKET, konumSiniri: KONUM_SINIRI, abonelikDurumlari: ABONELIK_DURUM,
    };
  }
  async function yonetimDegisiklik(req) {
    const u = await yonetici(req);
    const id = str(req.body?.id, 60); const karar = req.body?.karar === 'onay' ? 'onay' : 'red';
    const ref = db.collection('urunDegisiklikleri').doc(id); const s = await ref.get();
    if (!s.exists) hata(404, 'Kayıt bulunamadı.');
    const d = s.data();
    if (d.durum !== 'bekliyor') hata(409, 'Bu kayıt zaten işlendi.');
    let kid = d.modelId;
    if (karar === 'onay') {
      const duz = req.body?.fiyat ? sayi(req.body.fiyat, 1000, 1e9) : null; // yönetici fiyatı düzeltebilir
      const v = { ...d.veri, ...(duz ? { fiyat: duz } : {}) };
      if (d.tur === 'yeni') {
        kid = `${d.firma}/yeni-${id.slice(0, 8).toLowerCase()}`;
        await db.collection('katalog').doc(katalogId(kid)).set({ id: kid, firma: d.firma, firmaAd: firmAd(d.firma), yeni: true, ad: v.ad, tip: v.tip, m2: v.m2, oda: v.oda, kat: v.kat ?? null, fiyat: v.fiyat, kdv: v.kdv, nakliye: v.nakliye || '', montaj: v.montaj || '', zemin: v.zemin || '', teslim: v.teslim, kapsam: v.kapsam, aciklama: v.aciklama || '', gorseller: v.gorseller || [], guncelleme: FieldValue.serverTimestamp() });
      } else if (d.tur === 'kaldir') {
        await db.collection('katalog').doc(katalogId(kid)).set({ id: kid, firma: d.firma, gizli: true, guncelleme: FieldValue.serverTimestamp() }, { merge: true });
      } else {
        const p = { id: kid, firma: d.firma, guncelleme: FieldValue.serverTimestamp() };
        for (const k of ['ad', 'tip', 'm2', 'oda', 'kat', 'fiyat', 'kdv', 'nakliye', 'montaj', 'zemin', 'teslim', 'kapsam', 'aciklama']) if (v[k]) p[k] = v[k];
        if (v.gorseller?.length) p.gorseller = v.gorseller;
        await db.collection('katalog').doc(katalogId(kid)).set(p, { merge: true });
      }
    }
    await ref.update({ durum: karar === 'onay' ? 'onayli' : 'red', karar: { uid: u.uid, not: str(req.body?.not, 500), zaman: now() }, katalogId: kid || '' });
    const fs = await db.collection('firmalar').doc(d.firma).get();
    const to = d.eposta || fs.data()?.eposta;
    if (to && d.tur !== 'fiyat-kontrol') await mail(to, karar === 'onay' ? 'Değişikliğiniz yayında' : 'Değişikliğiniz onaylanmadı', sablon(karar === 'onay' ? 'Değişikliğiniz yayına alındı' : 'Değişikliğiniz onaylanmadı', kart([['Model', d.veri?.ad || modelBul(d.modelId)?.ad || d.modelId], ['Not', str(req.body?.not, 500)]]) + buton(`${ayar().site}/firma-paneli/`, 'Firma paneli')));
    return { ok: true };
  }
  async function yonetimBasvuru(req) {
    await yonetici(req);
    const id = str(req.body?.id, 60); const karar = req.body?.karar === 'onay' ? 'onay' : 'red';
    const ref = db.collection('firmaBasvurulari').doc(id); const s = await ref.get();
    if (!s.exists) hata(404, 'Başvuru bulunamadı.');
    const d = s.data();
    let slug = str(req.body?.slug, 80) || d.mevcut;
    const odemeLinki = httpsUrl(req.body?.odemeLinki);
    if (req.body?.odemeLinki && !odemeLinki) hata(400, 'Ödeme bağlantısı https:// ile başlamalı.');
    if (karar === 'onay') {
      if (!slug) slug = (d.marka || d.unvan).toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      const iller = d.iller && !/tüm|hepsi|türkiye/i.test(d.iller) ? d.iller.split(/[,;]/).map((x) => x.trim()).filter(Boolean).slice(0, 81) : ['*'];
      const onceF = (await db.collection('firmalar').doc(slug).get()).data() || {};
      const kurucu = req.body?.kurucu !== false && !uyeAktif(onceF) && (onceF.abonelik?.kurucu || (await kurucuKalan()) > 0);
      const abonelik = kurucu ? kurucuAbonelik({ odemeLinki }) : { tutar: ABONELIK_TL, durum: 'odeme-bekliyor', odemeLinki, baslangic: now() };
      await db.collection('firmalar').doc(slug).set({ aktif: true, ad: d.marka || d.unvan, eposta: d.eposta, panelEpostalari: FieldValue.arrayUnion(d.eposta), tipler: d.tipler, iller, telefon: d.telefon, basvuru: id, abonelik, guncelleme: FieldValue.serverTimestamp() }, { merge: true });
      if (kurucu) await mail(d.eposta, 'Üyeliğiniz aktif: 1 ay ücretsiz', kurucuHosgeldin(d.yetkili, abonelik.ucretsizBitis, odemeLinki));
      else await mail(d.eposta, 'Firma hesabınız açıldı', sablon('Hoş geldiniz', `<p>Sayın ${esc(d.yetkili)},</p><p>Başvurunuz onaylandı. <b>${esc(d.eposta)}</b> adresiyle firma paneline giriş yaparak (ilk kez giriyorsanız “Kayıt ol” ile şifre belirleyin ya da Google ile girin) ürünlerinizi, fiyatlarınızı ve fotoğraflarınızı yönetebilir, size uygun talepleri görebilirsiniz.</p><p>Aylık üyelik bedeli <b>${ABONELIK_TL} TL</b>’dir. ${odemeLinki ? 'Ödemeyi aşağıdaki bağlantıdan yapabilirsiniz; bağlantı firma panelinizde de durur.' : 'Ödeme bağlantısını ayrıca ileteceğiz.'}</p>${odemeLinki ? buton(odemeLinki, `${ABONELIK_TL} TL üyelik ödemesini yap`) : ''}${buton(`${ayar().site}/firma-paneli/`, 'Firma paneline git')}<p style="font-size:12px;color:#4a5751">Ödenen üyelik bedelleri iade edilmez. Ayrıntılar: <a href="${esc(ayar().site)}/firma-uyelik-sozlesmesi/">firma üyelik sözleşmesi</a>.</p>`));
    }
    if (karar === 'onay') for (const paket of (d.reklam || []).filter((k) => REKLAM_PAKET[k])) await db.collection('reklamTalepleri').add({ firma: slug, uid: '', eposta: d.eposta, paket, fiyat: REKLAM_PAKET[paket].fiyat, modelId: '', not: 'Firma başvurusunda seçildi', durum: 'bekliyor', kaynak: 'basvuru', zaman: FieldValue.serverTimestamp() });
    await ref.update({ durum: karar === 'onay' ? 'onayli' : 'red', slug: slug || '', kararZamani: FieldValue.serverTimestamp() });
    return { ok: true, slug };
  }
  async function yonetimBelge(req, res) {
    await yonetici(req);
    const ref = db.collection('belgeler').doc(str(req.query?.id, 40)); const sn = await ref.get();
    if (!sn.exists || sn.data().durum === 'yukleniyor') hata(404, 'Belge bulunamadı.');
    const d = sn.data();
    const ps = (await ref.collection('parcalar').get()).docs.map((x) => x.data()).sort((a, b) => a.i - b.i);
    const buf = Buffer.concat(ps.map((x) => Buffer.from(x.veri)));
    res.set?.('Content-Type', d.mime); res.set?.('Content-Disposition', `inline; filename="${encodeURIComponent(d.ad)}"`); res.set?.('Cache-Control', 'private, no-store'); res.set?.('X-Content-Type-Options', 'nosniff');
    res.status(200);
    if (res.send) { res.send(buf); return undefined; }
    return { boyut: buf.length, mime: d.mime };
  }
  async function yonetimFirmaDurum(req) {
    await yonetici(req);
    const b = req.body || {};
    const slug = str(b.slug, 80);
    const ref = db.collection('firmalar').doc(slug);
    if (!/^[a-z0-9-]{2,80}$/.test(slug) || !(await ref.get()).exists) hata(404, 'Firma bulunamadı.');
    if (b.islem === 'sil') {
      if (b.onay !== slug) hata(400, 'Silmeyi onaylamak için firma kodunu yazın.');
      const eski = (await ref.get()).data();
      await db.collection('silinenFirmalar').add({ slug, veri: JSON.parse(JSON.stringify(eski, (k, v) => (v && v.toMillis ? v.toMillis() : v))), zaman: FieldValue.serverTimestamp() });
      await ref.delete();
      return { ok: true, silindi: true };
    }
    if (b.islem !== 'aktif' && b.islem !== 'pasif') hata(400, 'Geçersiz işlem.');
    await ref.set({ aktif: b.islem === 'aktif', guncelleme: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
  }
  // Sayaçları talep geçmişinden yeniden hesapla (tek seferlik düzeltme)
  async function yonetimIstatistik(req) {
    await yonetici(req);
    const q = await db.collection('talepler').limit(3000).get();
    const f = {}; const top = { talep: 0, teklif: 0, surec: 0 };
    for (const d of q.docs) {
      const t = d.data(); if (t.test) continue;
      if (t.mod === 'surec') { top.surec++; continue; }
      top.talep++;
      const [dv, tk] = await Promise.all([d.ref.collection('davetler').get(), d.ref.collection('teklifler').get()]);
      if ((t.teklifSayisi || 0) !== tk.size) await d.ref.set({ teklifSayisi: tk.size }, { merge: true });
      top.teklif += tk.size;
      for (const x of dv.docs) { const v = x.data(); if (v.tur !== 'uye' && v.tur !== 'odeme') continue; const o = (f[x.id] ||= { istTalep: 0, istTeklif: 0, istRed: 0 }); o.istTalep++; if (v.durum === 'red') o.istRed++; }
      for (const x of tk.docs) { const o = (f[x.id] ||= { istTalep: 0, istTeklif: 0, istRed: 0 }); o.istTeklif++; }
    }
    const fq = await db.collection('firmalar').get();
    for (const d of fq.docs) await d.ref.set(f[d.id] || { istTalep: 0, istTeklif: 0, istRed: 0 }, { merge: true });
    const kq = await db.collection('kullanicilar').get();
    await db.collection('sistem').doc('sayac').set({ ...top, kullanici: kq.docs.filter((d) => d.data().rol !== 'firma').length }, { merge: true });
    return { ok: true, ...top };
  }

  // ---- Firmalara tanıtım e-postası (günlük kota; tacir/esnafa onaysız gönderilebilir, ret hakkı her e-postada) ----
  const tanitimId = (eposta) => crypto.createHash('sha256').update(`tanitim:${eposta}`).digest('hex').slice(0, 24);
  async function tanitimAdaylari() {
    const [kayitQ, firmaQ, listeQ, davetQ] = await Promise.all([db.collection('tanitimKayit').get(), db.collection('firmalar').get(), db.collection('tanitimListesi').get(), db.collection('davetKayit').get()]);
    const acikQ = await db.collection('talepler').where('durum', '==', 'acik').get();
    const kayit = new Map(kayitQ.docs.map((d) => [d.id, d.data()]));
    const kayitli = new Set(); for (const d of firmaQ.docs) { const x = d.data(); kayitli.add(d.id); for (const e of [x.eposta, ...(x.panelEpostalari || [])]) if (e) kayitli.add(String(e).toLowerCase()); }
    const iptalSlug = new Set(davetQ.docs.filter((d) => d.data().iptal || gecersizMi(d.data(), FIRMS.find((f) => f.slug === d.id)?.eposta)).map((d) => d.id));
    // Son 3 günde talep daveti almış firmaya aynı anda bir de tanıtım e-postası gitmesin
    const yeniDavet = new Set(davetQ.docs.filter((d) => d.data().sonDavet && now() - d.data().sonDavet < 3 * 24 * 3600000).map((d) => d.id));
    for (const t of acikQ.docs) for (const sl of t.data().firmalar || []) yeniDavet.add(sl);
    const adaylar = [];
    const ekle = (eposta, ad, slug) => {
      eposta = String(eposta || '').toLowerCase().trim();
      if (!epostaMi(eposta) || kayitli.has(eposta) || (slug && (kayitli.has(slug) || iptalSlug.has(slug) || yeniDavet.has(slug)))) return;
      const id = tanitimId(eposta); const k = kayit.get(id) || {};
      if (k.iptal || k.gecersiz || (k.sayi || 0) >= 2 || adaylar.some((x) => x.id === id)) return;
      if (k.son && now() - (k.son.toMillis?.() || k.son) < 30 * 24 * 3600000) return; // aynı adrese en az 30 gün arayla, en fazla 2 kez
      adaylar.push({ id, eposta, ad: ad || '', slug: slug || '', sayi: k.sayi || 0 });
    };
    for (const f of FIRMS) ekle(f.eposta, f.kisaAd, f.slug);
    for (const d of listeQ.docs) ekle(d.data().eposta, d.data().ad, '');
    return adaylar.sort((x, y) => x.sayi - y.sayi);
  }
  const tanitimHtml = (ad, iptalUrl, kurucuK = 0) => {
    const a = ayar();
    const madde = [['Müşteri tüm detaylarıyla panelinizde', 'Her talepte ili, ev tipi, metrekare ve oda sayısı, bütçesi, arsa durumu ve ne zaman başlamak istediği yazar. Fiyat verdiğiniz anda adı, telefonu ve e-postası açılır.'], ['Sadece size uyan talepler', 'Hizmet verdiğiniz illere ve ürettiğiniz ev tiplerine göre gelir; boşa vakit harcamazsınız.'], ['Komisyon yok', 'Satışınızdan pay almıyoruz; müşteriyle doğrudan siz anlaşırsınız.'], kurucuK > 0 ? ['1 ay ücretsiz', `Açılış kampanyası: ilk ${KURUCU_KONTENJAN} firmaya, kart bilgisi istemeden. Sonra aylık ${ABONELIK_TL} TL; taahhüt yok, devam etmezseniz hiçbir şey ödemezsiniz.`] : [`Aylık ${ABONELIK_TL} TL`, 'Sözleşme süresi yok; dilediğiniz ay bırakırsınız.']];
    return sablon('Prefabrik ev arayan müşteriler, teklifinizi bekliyor', `<p>Merhaba${ad ? ` ${esc(ad)} yetkilisi` : ''},</p><p>${ARAMA_METNI} <b>PrefabrikTeklif</b> bu kişilerin fiyatları karşılaştırıp teklif istediği yer: ev arayan kişi ne istediğini yazıyor, talep doğrudan o bölgeye ve ev tipine hizmet veren üye firmalara gidiyor.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0">${madde.map(([b, t]) => `<tr><td style="padding:8px 0;vertical-align:top;width:30px"><div style="width:22px;height:22px;border-radius:50%;background:#e7f3ec;color:#17663f;font-weight:bold;text-align:center;line-height:22px;font-size:13px">✓</div></td><td style="padding:8px 0;font-size:14px"><b>${b}</b><br><span style="color:#5b6760">${t}</span></td></tr>`).join('')}</table>
<p>Firmanız sitemizde bilgi amaçlı listeleniyor olabilir. Üye olduğunuzda ürün ve fiyatlarınızı kendiniz güncellersiniz, sayfanızda “Üye firma” rozeti görünür ve size uyan talepler hem panelinize hem e-postanıza düşer.</p>${buton(`${a.site}/firma-kayit/`, kurucuK > 0 ? '1 ay ücretsiz başlayın' : 'Firmamı kaydet')}${buton(`${a.site}/nasil-calisir/`, 'Nasıl çalışıyor?', true)}<p style="font-size:13px;color:#5b6760;margin:16px 0 0">Sorunuz varsa bu e-postayı yanıtlamanız yeterli.</p>`, { ust: 'Firmalar için', onizleme: kurucuK > 0 ? 'Prefabrik ev arayan müşterilere ulaşın: 1 ay ücretsiz' : 'Prefabrik ev arayan müşterilerden doğrudan teklif talebi alın', alt: `Bu e-posta, firmanızın internet sitesinde herkese açık yayımlanan kurumsal adrese, tacir ve esnafa yönelik bilgilendirme olarak gönderilmiştir. Almak istemiyorsanız <a href="${esc(iptalUrl)}" style="color:#6b766f">buradan</a> tek tıkla ayrılabilirsiniz; bir daha gönderilmez.` });
  };
  async function tanitimGonder(adet) {
    const a = ayar();
    const adaylar = (await tanitimAdaylari()).slice(0, adet);
    const kurucuK = adaylar.length ? await kurucuKalan() : 0;
    let n = 0;
    for (const x of adaylar) {
      const ref = db.collection('tanitimKayit').doc(x.id); const k = (await ref.get()).data() || {};
      const kod = k.kod || token();
      const iptalUrl = `${a.site}/bildirim-iptal/?f=${encodeURIComponent(`t-${x.id}.${kod}`)}`;
      await mail(x.eposta, kurucuK > 0 ? 'Prefabrik ev arayan müşterilere ulaşın: 1 ay ücretsiz' : 'Prefabrik ev arayan müşterilerden teklif talebi alın', tanitimHtml(x.ad, iptalUrl, kurucuK), { iptal: iptalUrl, tur: 'davet' });
      await ref.set({ eposta: x.eposta, ad: x.ad, slug: x.slug, kod, sayi: (k.sayi || 0) + 1, son: FieldValue.serverTimestamp() }, { merge: true });
      n++;
    }
    await db.collection('sistem').doc('tanitim').set({ sonCalisma: FieldValue.serverTimestamp(), sonAdet: n }, { merge: true });
    return n;
  }
  async function yonetimTanitim(req) {
    const u = await yonetici(req);
    const b = req.body || {};
    if (b.onizleme) { await mail(ayar().admin, '[Önizleme] Prefabrik ev arayan müşterilerden teklif talebi alın', tanitimHtml('Örnek Firma', `${ayar().site}/bildirim-iptal/`, await kurucuKalan())); return { ok: true, gonderildi: ayar().admin }; }
    if (typeof b.ekle === 'string') {
      let n = 0;
      for (const satir of b.ekle.split(/\n/).slice(0, 500)) {
        const [e, ...ad] = satir.split(/[;,\t]/).map((x) => x.trim());
        if (!epostaMi(String(e || '').toLowerCase())) continue;
        await db.collection('tanitimListesi').doc(tanitimId(e.toLowerCase())).set({ eposta: e.toLowerCase(), ad: ad.join(' ').slice(0, 120), ekleyen: u.eposta, zaman: FieldValue.serverTimestamp() }, { merge: true });
        n++;
      }
      return { ok: true, eklendi: n };
    }
    // Geri dönen (adres bulunamadı / engellendi) e-postalar: bu adreslere bir daha ne tanıtım ne talep daveti gider
    if (typeof b.gecersiz === 'string') {
      let n = 0; let firma = 0;
      for (const satir of b.gecersiz.split(/[\n,;\s]+/).slice(0, 500)) {
        const e = String(satir || '').trim().toLowerCase();
        if (!epostaMi(e)) continue;
        await db.collection('tanitimKayit').doc(tanitimId(e)).set({ eposta: e, gecersiz: true, gecersizZaman: now() }, { merge: true });
        for (const f of FIRMS.filter((x) => String(x.eposta || '').toLowerCase() === e)) { await db.collection('davetKayit').doc(f.slug).set({ gecersiz: true, gecersizEposta: e, gecersizZaman: now() }, { merge: true }); firma++; }
        n++;
      }
      return { ok: true, isaretlendi: n, firma };
    }
    if (b.simdiGonder) return { ok: true, gonderilen: await tanitimGonder(Math.min(sayi(b.adet, 1, TANITIM_UST) || 20, TANITIM_UST)) };
    await db.collection('sistem').doc('tanitim').set({ aktif: !!b.aktif, gunluk: Math.min(sayi(b.gunluk, 1, TANITIM_UST) || 20, TANITIM_UST) }, { merge: true });
    return { ok: true };
  }
  // ---- Açılış kampanyası duyurusu: kampanyadan önce talep daveti ya da tanıtım e-postası almış firmalara, bir kez ----
  async function duyuruAdaylari() {
    const [dk, tk, fq, ok, acikQ] = await Promise.all([db.collection('davetKayit').get(), db.collection('tanitimKayit').get(), db.collection('firmalar').get(), db.collection('duyuruKayit').get(), db.collection('talepler').where('durum', '==', 'acik').get()]);
    const kayitli = new Set(); for (const d of fq.docs) { const x = d.data(); kayitli.add(d.id); for (const e of [x.eposta, ...(x.panelEpostalari || [])]) if (e) kayitli.add(String(e).toLowerCase()); }
    const gonderildi = new Set(ok.docs.map((d) => d.id));
    const engel = new Set(); const ms = (v) => v?.toMillis?.() || (typeof v === 'number' ? v : 0);
    for (const d of dk.docs) { if (d.data().iptal) { engel.add(d.id); if (d.data().eposta) engel.add(String(d.data().eposta).toLowerCase()); } if (d.data().gecersizEposta) engel.add(String(d.data().gecersizEposta).toLowerCase()); }
    for (const d of tk.docs) { if (d.data().iptal && d.data().slug) engel.add(d.data().slug); if ((d.data().iptal || d.data().gecersiz) && d.data().eposta) engel.add(String(d.data().eposta).toLowerCase()); }
    const acik = acikQ.docs.map((t) => ({ id: t.id, ...t.data() }));
    const adaylar = new Map();
    const ekle = (eposta, slug, ad, zaman) => {
      eposta = String(eposta || '').toLowerCase().trim();
      if (!epostaMi(eposta) || !zaman || zaman >= KAMPANYA_BASLANGIC || engel.has(eposta) || (slug && engel.has(slug)) || kayitli.has(eposta) || (slug && kayitli.has(slug))) return;
      const id = tanitimId(eposta); if (gonderildi.has(id) || adaylar.has(id)) return;
      adaylar.set(id, { id, eposta, slug: slug || '', ad: ad || (slug ? firmAd(slug) : ''), talep: slug ? acik.find((t) => (t.firmalar || []).includes(slug)) : null });
    };
    for (const d of dk.docs) ekle(d.data().eposta || FIRMS.find((f) => f.slug === d.id)?.eposta, d.id, '', ms(d.data().sonDavet));
    for (const d of tk.docs) ekle(d.data().eposta, d.data().slug, d.data().ad, ms(d.data().son));
    return [...adaylar.values()];
  }
  const duyuruBaslik = (n) => (n > 0 ? `Fiyat Bekleyen ${n} Müşteri Var: Üyelik İlk Ay Ücretsiz` : 'Güncelleme: Üyelik İlk Ay Ücretsiz');
  const duyuruHtml = (x, iptalUrl, talepLink, n = 0) => sablon(duyuruBaslik(n), `<p>Merhaba${x.ad ? ` ${esc(x.ad)} yetkilisi` : ''},</p>${n > 0 ? `<p style="font-size:16px">Şu an sitemizde <b>fiyat bekleyen ${n} müşteri</b> var. Hemen kaydolun, ilk ay ücretsiz teklif verin.</p>` : ''}<p>Geçtiğimiz günlerde size PrefabrikTeklif’ten bir e-posta göndermiştik. Kısa bir güncelleme: <b>açılış kampanyası kapsamında ilk ${KURUCU_KONTENJAN} firmaya üyelik 1 ay ücretsiz</b>; kart bilgisi istemiyoruz.</p><p>Başvurunuz onaylanınca size uyan taleplere hemen fiyat verirsiniz. Her talepte müşterinin ilini, ev tipini, metrekaresini, bütçesini ve arsa durumunu görürsünüz; fiyat verdiğiniz anda adı, telefonu ve e-postası açılır. Komisyon yok; ay sonunda devam etmezseniz hiçbir şey ödemezsiniz.</p>${x.talep && talepLink ? `<p style="background:#e7f3ec;border-radius:8px;padding:10px 12px;font-size:14px">Size ilettiğimiz <b>${esc(x.talep.il)}</b> ilindeki ${esc(TIP_AD[x.talep.tip]?.toLocaleLowerCase('tr') || '')} talebi hâlâ açık. Kaydınız onaylanınca bu talebe de fiyat verebilirsiniz.</p>` : ''}${buton(`${ayar().site}/firma-kayit/${x.slug ? `?firma=${encodeURIComponent(x.slug)}` : ''}`, n > 0 ? 'Hemen Kaydolun, Teklif Verin' : '1 Ay Ücretsiz Başlayın')}${talepLink ? buton(talepLink, 'Açık Talebi Gör', true) : ''}<p style="font-size:13px;color:#5b6760;margin:16px 0 0">Sorunuz varsa bu e-postayı yanıtlamanız yeterli.</p>`, { ust: 'Firmalar için', onizleme: 'Açılış kampanyası: ilk 50 firmaya 1 ay ücretsiz, kart bilgisi istemeden', alt: `Bu e-posta, firmanızın internet sitesinde herkese açık yayımlanan kurumsal adrese, tacir ve esnafa yönelik bilgilendirme olarak gönderilmiştir. Almak istemiyorsanız <a href="${esc(iptalUrl)}" style="color:#6b766f">buradan</a> tek tıkla ayrılabilirsiniz; bir daha gönderilmez.` });
  async function yonetimDuyuru(req) {
    await yonetici(req);
    const b = req.body || {};
    if ((await kurucuKalan()) <= 0) hata(409, 'Açılış kampanyası kontenjanı dolu; duyuru gönderilmez.');
    const adaylar = await duyuruAdaylari();
    // Fiyat bekleyen müşteri sayısı: gönderim anında süresi dolmamış, test olmayan açık talepler (gerçek sayı)
    const acikN = (await db.collection('talepler').where('durum', '==', 'acik').get()).docs.filter((d) => !d.data().test && (!d.data().sonTarih || (d.data().sonTarih.toMillis?.() || 0) > now())).length;
    if (b.onizleme) { const x = adaylar.find((y) => y.talep) || adaylar[0] || { ad: 'Örnek Firma', slug: '' }; await mail(ayar().admin, `[Önizleme] ${duyuruBaslik(acikN)}`, duyuruHtml(x, `${ayar().site}/bildirim-iptal/`, x.talep ? `${ayar().site}/teklif-ver/` : '', acikN)); return { ok: true, gonderildi: ayar().admin, aday: adaylar.length, acikTalep: acikN }; }
    if (!b.gonder) return { ok: true, aday: adaylar.length, acikTalep: acikN, firmalar: adaylar.map((x) => x.ad || x.eposta) };
    let n = 0;
    for (const x of adaylar.slice(0, Math.min(sayi(b.adet, 1, 150) || 150, 150))) {
      const tr = db.collection('tanitimKayit').doc(x.id); const k = (await tr.get()).data() || {};
      const kod = k.kod || token();
      await tr.set({ eposta: x.eposta, ...(x.slug ? { slug: x.slug } : {}), ...(k.ad || !x.ad ? {} : { ad: x.ad }), kod }, { merge: true });
      const iptalUrl = `${ayar().site}/bildirim-iptal/?f=${encodeURIComponent(`t-${x.id}.${kod}`)}`;
      let talepLink = '';
      if (x.talep && x.slug) { const dv = (await db.collection('talepler').doc(x.talep.id).collection('davetler').doc(x.slug).get()).data(); if (dv?.kod) talepLink = `${ayar().site}/teklif-ver/?t=${x.talep.id}.${x.talep.token}&f=${x.slug}.${dv.kod}`; }
      await mail(x.eposta, duyuruBaslik(acikN), duyuruHtml(x, iptalUrl, talepLink, acikN), { iptal: iptalUrl, tur: 'davet' });
      await db.collection('duyuruKayit').doc(x.id).set({ eposta: x.eposta, slug: x.slug, zaman: now(), talep: x.talep?.id || '' });
      n++;
    }
    return { ok: true, gonderilen: n, kalan: adaylar.length - n };
  }
  async function zamanliTanitim() {
    const d = (await db.collection('sistem').doc('tanitim').get()).data() || {};
    if (!d.aktif) return 0;
    return tanitimGonder(Math.min(d.gunluk || 20, TANITIM_UST));
  }

  async function yonetimFirma(req) {
    await yonetici(req);
    const b = req.body || {};
    const slug = str(b.slug, 80);
    if (!/^[a-z0-9-]{2,80}$/.test(slug)) hata(400, 'Geçersiz firma kodu.');
    const panel = arr(b.panelEpostalari, 10, 120).map((e) => e.toLowerCase()).filter(epostaMi);
    const eposta = str(b.eposta, 120).toLowerCase();
    if (eposta && !epostaMi(eposta)) hata(400, 'Geçersiz e-posta.');
    const iller = arr(b.iller, 81, 40);
    const ref = db.collection('firmalar').doc(slug);
    const once = (await ref.get()).data() || {};
    const p = { guncelleme: FieldValue.serverTimestamp() };
    if (!b.sadeceAbonelik) Object.assign(p, { aktif: b.aktif !== false, ...(eposta ? { eposta } : {}), panelEpostalari: panel, tipler: arr(b.tipler).filter((t) => TIP_AD[t]), iller: iller.length ? iller : ['*'], ad: once.ad || firmAd(slug) });
    // Üyelik (aylık 499 TL): durum, ödeme bağlantısı, son ödeme tarihi
    const tarih = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(str(v, 10)) ? str(v, 10) : '');
    if (b.abonelik && typeof b.abonelik === 'object') {
      const a = b.abonelik; const ab = { ...(once.abonelik || { tutar: ABONELIK_TL }) };
      const oncekiDurum = ab.durum;
      if (ABONELIK_DURUM[a.durum]) ab.durum = a.durum;
      const kurucuYeni = a.kurucu === true && oncekiDurum !== 'aktif' && !ab.kurucu;
      if (kurucuYeni) {
        if ((await kurucuKalan()) <= 0) hata(409, `Açılış kampanyası kontenjanı (${KURUCU_KONTENJAN} firma) doldu.`);
        Object.assign(ab, kurucuAbonelik(ab));
        const to0 = eposta || once.eposta; if (to0) await mail(to0, 'Üyeliğiniz aktif: 1 ay ücretsiz', kurucuHosgeldin(once.ad || firmAd(slug), ab.ucretsizBitis, ab.odemeLinki));
      } else if (ab.durum === 'aktif' && oncekiDurum !== 'aktif') { const to0 = eposta || once.eposta; if (to0) await mail(to0, 'Üyeliğiniz aktif: artık fiyat verebilirsiniz', sablon('Üyeliğiniz aktif', `<p>Ödemeniz alındı, teşekkür ederiz. Firmanız sitemizde artık <b>“Üye firma”</b> rozetiyle görünüyor.</p><p>Size uyan talepler firma panelinizdeki “Teklif bekleyenler” bölümünde; her talebe fiyat ve not ekleyerek teklif verebilirsiniz. Fiyat verdiğiniz müşterinin iletişim bilgileri size açılır.</p>${buton(`${ayar().site}/firma-paneli/#talepler`, 'Teklif bekleyenleri gör')}`)); }
      if (typeof a.odemeLinki === 'string') { const u = httpsUrl(a.odemeLinki); if (a.odemeLinki && !u) hata(400, 'Ödeme bağlantısı https:// ile başlamalı.'); ab.odemeLinki = u; }
      if (a.sonOdeme !== undefined && (a.sonOdeme || !kurucuYeni)) ab.sonOdeme = tarih(a.sonOdeme);
      if (a.sonrakiOdeme !== undefined && (a.sonrakiOdeme || !kurucuYeni)) ab.sonrakiOdeme = tarih(a.sonrakiOdeme);
      p.abonelik = ab;
      const to = eposta || once.eposta;
      if (a.linkGonder && ab.odemeLinki && to) await mail(to, `PrefabrikTeklif üyelik ödemesi (${ABONELIK_TL} TL)`, sablon('Üyelik ödemeniz', `<p>Aylık <b>${ABONELIK_TL} TL</b> üyelik bedelinizi aşağıdaki bağlantıdan ödeyebilirsiniz.${ab.sonrakiOdeme ? ` Son ödeme günü: <b>${esc(ab.sonrakiOdeme)}</b>.` : ''}</p>${buton(ab.odemeLinki, 'Ödemeyi yap')}<p style="font-size:12px;color:#4a5751">Ödemesi yapılmayan üyelikler askıya alınır; ödenen bedeller iade edilmez.</p>`));
    }
    // Sözleşmeye aykırılık: firmanın tüm ilanları yayından kaldırılır, yeni talep gönderilmez
    if (b.yayindanKaldir === true) { p.kaldirildi = true; p.aktif = false; p.kaldirmaNedeni = str(b.neden, 500); p.kaldirmaZamani = now(); }
    if (b.yayinaAl === true) { p.kaldirildi = false; }
    await ref.set(p, { merge: true });
    return { ok: true };
  }
  async function yonetimYorum(req) {
    await yonetici(req);
    const ref = db.collection('yorumlar').doc(str(req.body?.id, 60)); const s = await ref.get();
    if (!s.exists) hata(404, 'Yorum bulunamadı.');
    await ref.update({ durum: req.body?.karar === 'onay' ? 'onayli' : 'red', ...(typeof req.body?.belge === 'boolean' ? { belgeDogrulandi: req.body.belge } : {}) });
    return { ok: true };
  }
  async function yonetimGeriBildirim(req) {
    await yonetici(req);
    const ref = db.collection('geriBildirimler').doc(str(req.body?.id, 60)); const s = await ref.get();
    if (!s.exists) hata(404, 'Kayıt bulunamadı.');
    const metin = str(req.body?.metin, 3000);
    const durum = ['acik', 'cevaplandi', 'kapandi'].includes(req.body?.durum) ? req.body.durum : (metin ? 'cevaplandi' : s.data().durum);
    await ref.update({ ...(metin ? { cevaplar: FieldValue.arrayUnion({ kim: 'yonetim', metin, zaman: now() }) } : {}), durum });
    if (metin && s.data().eposta) await mail(s.data().eposta, `Geri bildiriminize yanıt: ${s.data().konu}`, sablon('Geri bildiriminize yanıt verdik', `<p>${esc(metin).replace(/\n/g, '<br>')}</p>${buton(`${ayar().site}/firma-paneli/#geri-bildirim`, 'Panelde görüntüle')}`));
    return { ok: true };
  }
  async function yonetimSiparis(req) {
    await yonetici(req);
    const b = req.body || {};
    const ref = db.collection('siparisler').doc(str(b.id, 60)); const s = await ref.get();
    if (!s.exists) hata(404, 'Sipariş bulunamadı.');
    const d = s.data();
    const p = { guncelleme: FieldValue.serverTimestamp() };
    const asama = sayi(b.asama, 0, ASAMALAR.length - 1);
    if (asama !== null) p.asama = asama;
    if (typeof b.firma === 'string') p.firma = FIRMS.some((f) => f.slug === b.firma) || b.firma === '' ? b.firma : d.firma;
    if (typeof b.aktif === 'boolean') p.aktif = b.aktif;
    const not = str(b.not, 1500);
    if (not) p.notlar = FieldValue.arrayUnion({ asama: asama ?? d.asama, metin: not, zaman: now() });
    const bu = httpsUrl(b.belgeUrl); const ba = str(b.belgeAd, 100);
    if (bu && ba) p.belgeler = FieldValue.arrayUnion({ ad: ba, url: bu });
    const mesaj = str(b.mesaj, 1500);
    if (mesaj) p.mesajlar = FieldValue.arrayUnion({ kim: 'yonetim', metin: mesaj, zaman: now() });
    await ref.update(p);
    const degisti = asama !== null && asama !== d.asama;
    if ((degisti || mesaj) && d.eposta) await mail(d.eposta, degisti ? `Evinizde yeni aşama: ${ASAMALAR[asama]}` : 'Proje sorumlunuzdan mesaj', sablon(degisti ? `Yeni aşama: ${ASAMALAR[asama]}` : 'Yeni mesaj', `<p>Merhaba ${esc(d.ad)},</p>${not ? `<p>${esc(not)}</p>` : ''}${mesaj ? `<p>${esc(mesaj)}</p>` : ''}${buton(`${ayar().site}/hesabim/`, 'Süreci takip et')}`));
    return { ok: true };
  }
  async function yonetimBanner(req) {
    await yonetici(req);
    const b = req.body || {};
    const id = str(b.id, 60);
    if (b.sil && id) { await db.collection('bannerlar').doc(id).delete(); return { ok: true }; }
    const konum = KONUM_SINIRI[b.konum] ? b.konum : 'ana';
    const gorsel = httpsUrl(b.gorsel);
    const link = str(b.link, 500);
    const modelId = str(b.modelId, 160);
    if (konum === 'liste') {
      const m = modelBul(modelId) || (modelId ? (await db.collection('katalog').doc(katalogId(modelId)).get()).data() : null);
      if (!m) hata(400, 'Öne çıkan listeleme için geçerli bir model kodu yazın.');
    } else if (!str(b.baslik, 120) || !gorsel || !(link.startsWith('/') || httpsUrl(link))) hata(400, 'Başlık, https görsel adresi ve bağlantı zorunlu.');
    const aktif = b.aktif !== false;
    if (aktif) {
      const t = now();
      const q = await db.collection('bannerlar').where('aktif', '==', true).get();
      const dolu = q.docs.filter((d) => d.id !== id && (KONUM_SINIRI[d.data().konum] ? d.data().konum : 'ana') === konum && (!d.data().bitis || Date.parse(d.data().bitis) > t)).length;
      if (dolu >= KONUM_SINIRI[konum]) hata(409, `Bu alanda en fazla ${KONUM_SINIRI[konum]} reklam yayınlanabilir; önce birini pasif yapın.`);
    }
    const ref = id ? db.collection('bannerlar').doc(id) : db.collection('bannerlar').doc();
    await ref.set({ konum, baslik: str(b.baslik, 120), metin: str(b.metin, 240), gorsel, link, modelId: konum === 'liste' ? modelId : '', aktif, sira: sayi(b.sira, 0, 99) ?? 0, bitis: str(b.bitis, 10), firma: str(b.firma, 80), guncelleme: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, id: ref.id };
  }
  async function yonetimReklamTalep(req) {
    await yonetici(req);
    const b = req.body || {};
    const ref = db.collection('reklamTalepleri').doc(str(b.id, 60)); const s = await ref.get();
    if (!s.exists) hata(404, 'Talep bulunamadı.');
    const d = s.data();
    const durum = ['bekliyor', 'odeme-bekliyor', 'yayinda', 'bitti', 'red'].includes(b.durum) ? b.durum : d.durum;
    const odemeLinki = b.odemeLinki === undefined ? d.odemeLinki || '' : httpsUrl(b.odemeLinki);
    if (b.odemeLinki && !odemeLinki) hata(400, 'Ödeme bağlantısı https:// ile başlamalı.');
    await ref.update({ durum, odemeLinki, guncelleme: FieldValue.serverTimestamp() });
    const p = REKLAM_PAKET[d.paket] || { ad: d.paket, fiyat: d.fiyat };
    if (b.linkGonder && odemeLinki && d.eposta) await mail(d.eposta, `Reklam ödemesi: ${p.ad}`, sablon('Reklam alanınız hazır', `<p>${esc(p.ad)} için aylık <b>${tl(d.fiyat || p.fiyat)}</b> tutarındaki ödemeyi aşağıdaki bağlantıdan yapabilirsiniz. Ödeme sonrası reklamınız yayına alınır.</p>${buton(odemeLinki, 'Ödemeyi yap')}<p style="font-size:12px;color:#4a5751">Reklam bedeli aylık ${ABONELIK_TL} TL üyeliğe ektir; ödenen bedeller iade edilmez.</p>`));
    else if (b.durum === 'red' && d.durum !== 'red' && d.eposta) await mail(d.eposta, `Reklam talebi: ${p.ad}`, sablon('Reklam talebiniz', `<p>${esc(p.ad)} alanında şu an boş yer bulunmuyor. Yer açıldığında size haber vereceğiz.</p>`));
    return { ok: true };
  }
  // Yönetim: açık talebin son teklif zamanını değiştir (en fazla 7 gün sonrası; müşteriye bildirim gitmez)
  async function yonetimTalepSure(req) {
    await yonetici(req);
    const b = req.body || {};
    const ref = db.collection('talepler').doc(str(b.talep, 60)); const s = await ref.get();
    if (!s.exists) hata(404, 'Talep bulunamadı.');
    // Süresi dolup özeti gönderilmiş talep de yeniden açılabilir (müşteriye e-posta gitmez; yeni süre dolunca gelen tekliflerle yeni özet gider)
    const durum = s.data().durum;
    if (durum !== 'acik' && durum !== 'gonderildi') hata(409, 'Bu talebin süresi değiştirilemez.');
    const t = typeof b.sonTarih === 'number' ? b.sonTarih : Date.parse(str(b.sonTarih, 40));
    if (!Number.isFinite(t) || t <= now()) hata(400, 'Yeni süre şu andan sonraki bir tarih olmalı.');
    await ref.update({ sonTarih: Timestamp.fromMillis(t), ...(durum === 'gonderildi' ? { durum: 'acik', yenidenAcildi: now() } : {}),
      sureUzatma: FieldValue.arrayUnion({ eski: s.data().sonTarih?.toMillis?.() || 0, yeni: t, zaman: now(), ...(durum === 'gonderildi' ? { yenidenAcildi: true } : {}) }) });
    return { ok: true, sonTarih: t, yenidenAcildi: durum === 'gonderildi' };
  }
  async function yonetimTalepIlet(req) {
    await yonetici(req);
    const b = req.body || {};
    const ref = db.collection('talepler').doc(str(b.talep, 60)); const s = await ref.get();
    if (!s.exists) hata(404, 'Talep bulunamadı.');
    const slug = str(b.firma, 80); const eposta = str(b.eposta, 120).toLowerCase();
    if (!FIRMS.some((f) => f.slug === slug) || !epostaMi(eposta)) hata(400, 'Firma ve e-posta gerekli.');
    const d = s.data();
    if (d.durum !== 'acik') hata(409, 'Talebin süresi dolmuş.');
    const dk = (await db.collection('davetKayit').doc(slug).get()).data() || {};
    if (dk.iptal) hata(409, 'Bu firma bizden e-posta almak istemediğini bildirdi.');
    if (gecersizMi(dk, eposta) || (await db.collection('tanitimKayit').doc(tanitimId(eposta)).get()).data()?.gecersiz) hata(409, 'Bu e-posta adresi daha önce geri döndü (geçersiz).');
    const kod = token();
    await ref.collection('davetler').doc(slug).set({ kod, eposta, durum: 'bekliyor', gonderim: FieldValue.serverTimestamp(), elle: true });
    await ref.update({ firmalar: FieldValue.arrayUnion(slug) });
    await db.collection('davetKayit').doc(slug).set({ sonDavet: now(), eposta }, { merge: true });
    const link = `${ayar().site}/teklif-ver/?t=${ref.id}.${d.token}&f=${slug}.${kod}`;
    const kurucuK = await kurucuKalan();
    await mail(eposta, `Yeni talep: ${TIP_AD[d.tip]}, ${d.il}`, sablon('Sitemizde size uygun bir talep var', `<p>PrefabrikTeklif’te ürünlerinize uyan bir müşteri talebi var. <b>Müşteri bilgileri gizlidir;</b> fiyat verdiğinizde sizinle paylaşılır. ${kurucuK > 0 ? 'Fiyat verebilmek için firmanızı kaydetmeniz yeterli: başvurunuz onaylanınca <b>1 ay ücretsiz</b> üyelikle bu talebe ve size uyan yeni taleplere panelinizden fiyat verirsiniz.' : `Fiyat verebilmek için firma üyeliği gerekir: firmanızı kaydedin, e-postanıza gelen bağlantıdan aylık ${ABONELIK_TL} TL üyelik ödemesini yapın; üyeliğiniz aktif olunca bu talebe ve size uyan yeni taleplere panelinizden fiyat verirsiniz.`}</p>${kurucuK > 0 ? `<p style="background:#e7f3ec;border-radius:8px;padding:10px 12px;font-size:14px">${kurucuMetni(kurucuK)}</p>` : ''}${kart(talepOzeti(d))}${buton(link, 'Talebi gör')}<p style="font-size:12px;color:#4a5751">Firmanız sitemizde, kendi sitenizde herkese açık yayınladığınız bilgilerle bilgi amaçlı listelenmiştir. Firma üyeliği başlatılmazsa sayfanız ay sonunda sitemizden kaldırılır. Üye olarak (aylık ${ABONELIK_TL} TL) tüm talepleri panelden görebilir, bilgilerinizi kendiniz güncelleyebilirsiniz: ${esc(ayar().site)}/firma-kayit/</p>`));
    return { ok: true };
  }

  return {
    rateLimit, kim,
    zamanliTanitim, abonelikHatirlat, uyelikSureKontrol,
    routes: {
      'POST /api/teklif': teklif, 'GET /api/talep': talep, 'POST /api/teklif-ver': teklifVer, 'POST /api/teklif-red': teklifRed,
      'POST /api/firma-basvuru': firmaBasvuru, 'POST /api/belge': belge, 'GET /api/yonetim/belge': yonetimBelge, 'POST /api/bildirim-iptal': bildirimIptal, 'POST /api/firma/gorsel': firmaGorsel, 'POST /api/iletisim': iletisim, 'GET /api/google-puan': googlePuan, 'GET /api/yorumlar': yorumlar, 'POST /api/yorum': yorum,
      'GET /api/katalog': katalog, 'GET /api/bannerlar': bannerlar,
      'POST /api/firma/abonelik-baslat': firmaAbonelikBaslat, 'POST /api/firma/kart-guncelle': firmaKartGuncelle, 'POST /api/firma/abonelik-iptal': firmaAbonelikIptal, 'POST /api/iyzico/donus': iyzicoDonus, 'POST /api/iyzico/kart-donus': iyzicoKartDonus, 'POST /api/iyzico/bildirim': iyzicoBildirim, 'POST /api/yonetim/iyzico-plan': yonetimIyzicoPlan,
      'POST /api/sms/kod': smsKod, 'POST /api/sms/dogrula': smsDogrula, 'GET /api/ben': ben, 'POST /api/onay': onay, 'POST /api/mesaj': musteriMesaj, 'POST /api/firma/mesaj': firmaMesaj, 'POST /api/yonetim/firma-durum': yonetimFirmaDurum, 'POST /api/yonetim/istatistik': yonetimIstatistik, 'POST /api/yonetim/tanitim': yonetimTanitim, 'POST /api/yonetim/duyuru': yonetimDuyuru,
      'GET /api/hesap': hesap, 'POST /api/favoriler': favoriler, 'POST /api/siparis-mesaj': siparisMesaj,
      'GET /api/firma/ozet': firmaOzet, 'POST /api/firma/urun': firmaUrun, 'POST /api/firma/teklif': firmaTeklif, 'POST /api/firma/red': firmaRed,
      'POST /api/firma/geri-bildirim': firmaGeriBildirim, 'POST /api/firma/geri-bildirim-yanit': firmaGeriBildirimYanit, 'POST /api/firma/profil': firmaProfil, 'POST /api/firma/reklam': firmaReklam,
      'GET /api/yonetim/ozet': yonetimOzet, 'POST /api/yonetim/degisiklik': yonetimDegisiklik, 'POST /api/yonetim/basvuru': yonetimBasvuru,
      'POST /api/yonetim/firma': yonetimFirma, 'POST /api/yonetim/yorum': yonetimYorum, 'POST /api/yonetim/geri-bildirim': yonetimGeriBildirim,
      'POST /api/yonetim/siparis': yonetimSiparis, 'POST /api/yonetim/banner': yonetimBanner, 'POST /api/yonetim/reklam-talep': yonetimReklamTalep, 'POST /api/yonetim/talep-ilet': yonetimTalepIlet, 'POST /api/yonetim/talep-sure': yonetimTalepSure,
    },
    async handle(req, res) {
      const gm = /^\/api\/gorsel\/([A-Za-z0-9]{10,40})\/?$/.exec(String(req.path || ''));
      if (req.method === 'GET' && gm) {
        const g = await db.collection('gorseller').doc(gm[1]).get();
        if (!g.exists) { res.status(404); return res.send?.('') ?? res.json({}); }
        const d = g.data();
        res.set?.('Content-Type', `image/${d.tur}`); res.set?.('Cache-Control', 'public, max-age=31536000, immutable'); res.status(200);
        return res.send ? res.send(Buffer.from(d.veri)) : res.json({ boyut: d.boyut });
      }
      const fn = this.routes[`${req.method} ${String(req.path || '').replace(/\/$/, '')}`];
      const send = (code, body) => { res.status(code); if (!res.getHeader?.('Cache-Control')) res.set?.('Cache-Control', 'no-store'); return res.json(body); };
      if (!fn) return send(404, { hata: 'Bulunamadı' });
      try {
        const out = await fn(req, res); if (fn === yonetimBelge && out === undefined) return undefined;
        if (out && out.__yonlendir) { if (res.redirect) return res.redirect(302, out.__yonlendir); res.status(302); res.set?.('Location', out.__yonlendir); return res.json({}); }
        return send(200, out);
      } catch (e) {
        if (e instanceof HttpHata) return send(e.kod, { hata: e.message });
        if (/documentPath|resource path|document path|collectionPath/i.test(String(e?.message || ''))) return send(404, { hata: 'Kayıt bulunamadı veya bağlantı geçersiz.' });
        console.error(e); return send(500, { hata: 'İşleminizi şu an tamamlayamadık. Lütfen birkaç dakika sonra tekrar deneyin.' });
      }
    },
  };
}

// ---- Süresi dolan talepleri tek e-postada müşteriye gönder ----
export async function teklifOzetleri({ db, mail, ayar, FieldValue, Timestamp, FIRMS }) {
  const firmAd = (slug) => FIRMS.find((f) => f.slug === slug)?.kisaAd || slug;
  const q = await db.collection('talepler').where('durum', '==', 'acik').where('sonTarih', '<=', Timestamp.now()).limit(50).get();
  let n = 0;
  for (const doc of q.docs) {
    const d = doc.data();
    const tk = (await doc.ref.collection('teklifler').get()).docs.map((x) => x.data()).sort((a, b) => a.fiyat - b.fiyat);
    const kol = ['Nakliye', 'Montaj', 'Zemin betonu', 'İç bitiş', 'Ruhsat ve proje'];
    const keys = ['nakliye', 'montaj', 'zemin', 'ic-bitis', 'ruhsat'];
    const satir = tk.map((t) => `<tr><td style="padding:8px;border-bottom:1px solid #eee"><b>${esc(firmAd(t.firma))}</b>${t.not ? `<br><span style="color:#4a5751;font-size:12px">${esc(t.not.slice(0, 160))}</span>` : ''}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap"><b>${tl(t.fiyat)}</b><br><span style="font-size:12px">${t.kdvDahil ? 'KDV dahil' : 'KDV hariç'}</span></td>${keys.map((k) => `<td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${(t.dahil || []).includes(k) ? '✓' : '–'}</td>`).join('')}<td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${t.teslimGun ? `${t.teslimGun} gün` : ''}</td></tr>`).join('');
    const site = ayar().site;
    const tablo = tk.length
      ? `<p>${tk.length} firmadan teklif geldi. ✓ = fiyata dahil.</p><div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:13px;min-width:560px"><tr style="background:#f3f5f4"><th style="padding:8px;text-align:left">Firma</th><th style="padding:8px">Fiyat</th>${kol.map((k) => `<th style="padding:8px">${k}</th>`).join('')}<th style="padding:8px">Teslim</th></tr>${satir}</table></div><p>Fiyat veren firmalar sizi arayabilir. İsterseniz “süreci siz yönetin” deyin; firmayı birlikte seçip sözleşmeden teslime kadar takip edelim: <a href="${site}/teklif-al/?mod=surec&tip=${encodeURIComponent(d.tip)}">süreç yönetimi</a>.</p><p>Bir firmayla sözleşme yaparsanız deneyiminizi <a href="${site}/yorum-yaz/?t=${doc.id}.${d.token}">buradan</a> doğrulanmış yorum olarak paylaşabilirsiniz.</p>`
      : '<p>Bu süre içinde sisteme teklif girilmedi. Ekibimiz talebinizi takip ediyor ve uygun firmalarla sizin adınıza iletişime geçecek.</p>';
    await Promise.allSettled([
      mail(d.eposta, tk.length ? `${tk.length} teklif geldi: ${TIP_AD[d.tip]}` : 'Teklif talebiniz hakkında', sablon(tk.length ? 'Teklifler yan yana' : 'Talebiniz hakkında', `<p>Merhaba ${esc(d.ad)},</p>${tablo}`)),
      mail(ayar().admin, `Özet gönderildi: ${doc.id} (${tk.length} teklif)`, sablon('Özet gönderildi', `<p>${esc(d.ad)} · ${esc(d.il)} · ${tk.length} teklif</p>`)),
    ]);
    await doc.ref.update({ durum: 'gonderildi', ozetZamani: FieldValue.serverTimestamp(), teklifSayisi: tk.length });
    n++;
  }
  return n;
}

// ---- Aylık fiyat kontrolü: firma sayfalarındaki fiyat hâlâ aynı mı? ----
export const fiyatBicimleri = (n) => {
  const s = String(n);
  const nok = new Intl.NumberFormat('tr-TR').format(n); // 600.000
  return [nok, nok.replace(/\./g, ','), nok.replace(/\./g, ' '), s];
};
export function sayfaMetni(html) {
  return String(html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&#8378;|&#x20ba;/gi, '₺').replace(/\s+/g, ' ');
}
export function fiyatAdaylari(metin) {
  const out = new Set();
  const re = /(?:₺\s*)?(\d{1,3}(?:[.,\s]\d{3})+|\d{5,8})(?:[.,]\d{2})?\s*(?:₺|TL|tl|\+\s*KDV)?/g;
  let m;
  while ((m = re.exec(metin))) {
    const ctx = metin.slice(Math.max(0, m.index - 12), m.index + m[0].length + 12);
    if (!/₺|TL|tl|fiyat|KDV/i.test(ctx)) continue;
    const n = Number(m[1].replace(/[.,\s]/g, ''));
    if (n >= 20000 && n < 50000000) out.add(n);
  }
  return [...out];
}
export async function fiyatKontrolu({ db, mail, ayar, FieldValue, MODELS, fetch: fetchFn = globalThis.fetch, eszamanli = 6, zamanAsimi = 15000 }) {
  const fiyatli = MODELS.filter((m) => m.fiyatTuru === 'model' && m.fiyat && /^https?:\/\//.test(m.kaynak || ''));
  const kq = await db.collection('katalog').get();
  const kat = Object.fromEntries(kq.docs.map((d) => [d.data().id, d.data()]));
  const urller = [...new Set(fiyatli.map((m) => m.kaynak))];
  const sayfa = new Map();
  let i = 0;
  async function isci() {
    while (i < urller.length) {
      const u = urller[i++];
      try {
        const ac = new AbortController(); const t = setTimeout(() => ac.abort(), zamanAsimi);
        const r = await fetchFn(u, { signal: ac.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrefabrikTeklifFiyatKontrol/1.0; +https://www.prefabrikteklif.com.tr/siralama-nasil-yapilir/)', 'Accept-Language': 'tr-TR,tr;q=0.9' } });
        clearTimeout(t);
        sayfa.set(u, r.ok ? sayfaMetni(await r.text()) : null);
      } catch { sayfa.set(u, null); }
    }
  }
  await Promise.all(Array.from({ length: eszamanli }, isci));
  const sonuc = { ayni: 0, degismis: [], erisilemedi: [] };
  for (const m of fiyatli) {
    const metin = sayfa.get(m.kaynak);
    const guncel = kat[m.id]?.fiyat || m.fiyat;
    if (metin == null) { sonuc.erisilemedi.push({ id: m.id, url: m.kaynak }); continue; }
    if (fiyatBicimleri(guncel).some((b) => metin.includes(b))) { sonuc.ayni++; continue; }
    const aday = fiyatAdaylari(metin).sort((a, b) => Math.abs(a - guncel) - Math.abs(b - guncel)).slice(0, 5);
    sonuc.degismis.push({ id: m.id, firma: m.firma, ad: m.ad, url: m.kaynak, eski: guncel, adaylar: aday });
  }
  const ref = db.collection('fiyatKontrol').doc();
  await ref.set({ zaman: FieldValue.serverTimestamp(), toplam: fiyatli.length, ayni: sonuc.ayni, degismisSayi: sonuc.degismis.length, erisilemediSayi: sonuc.erisilemedi.length, degismis: sonuc.degismis.slice(0, 300), erisilemedi: sonuc.erisilemedi.slice(0, 300) });
  for (const x of sonuc.degismis) {
    await db.collection('urunDegisiklikleri').add({ firma: x.firma, modelId: x.id, tur: 'fiyat-kontrol', veri: { ad: x.ad, fiyat: x.adaylar[0] || null, adaylar: x.adaylar, eski: x.eski, kaynak: x.url }, durum: 'bekliyor', uid: 'sistem', eposta: '', kontrol: ref.id, zaman: FieldValue.serverTimestamp() });
  }
  await mail(ayar().admin, `Aylık fiyat kontrolü: ${sonuc.degismis.length} değişiklik şüphesi`, sablon('Aylık fiyat kontrolü tamamlandı', kart([['Kontrol edilen model', fiyatli.length], ['Fiyatı aynı', sonuc.ayni], ['Değişmiş olabilir', sonuc.degismis.length], ['Sayfaya ulaşılamadı', sonuc.erisilemedi.length]]) + buton(`${ayar().site}/yonetim/#onaylar`, 'Değişiklikleri incele')));
  return { toplam: fiyatli.length, ayni: sonuc.ayni, degismis: sonuc.degismis.length, erisilemedi: sonuc.erisilemedi.length };
}

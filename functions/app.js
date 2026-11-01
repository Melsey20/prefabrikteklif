// PrefabrikTeklif API: tüm iş kuralları burada. index.js gerçek Firebase bağlantılarıyla çağırır,
// testler sahte veritabanıyla çağırır (functions/test/).
import crypto from 'node:crypto';

export const TIP_AD = { prefabrik: 'Prefabrik ev', celik: 'Çelik ev', konteyner: 'Konteyner ev', 'tiny house': 'Tiny house', ahsap: 'Ahşap ev', bungalov: 'Bungalov / bağ evi' };
export const ARAZI_AD = { imarli: 'İmarlı arsa', koy: 'Köy yerleşik alanı', tarla: 'Tarla / tarım arazisi', bag: 'Bağ – bahçe', yok: 'Henüz arazi yok' };
export const KAPSAM_AD = { 'anahtar-teslim': 'Anahtar teslim', 'nakliye-montaj': 'Nakliye ve montaj', 'zemin-betonu': 'Zemin betonu', 'ruhsat-proje': 'Ruhsat ve proje' };
export const DAHIL_AD = { nakliye: 'Nakliye', montaj: 'Montaj', vinc: 'Vinç', zemin: 'Zemin betonu', 'ic-bitis': 'İç bitiş', 'mutfak-vitrifiye': 'Mutfak ve vitrifiye', ruhsat: 'Ruhsat ve proje' };
export const BUTCE_AD = { '0-500000': '500 bin TL altı', '500000-1000000': '500 bin – 1 milyon TL', '1000000-2000000': '1 – 2 milyon TL', '2000000-999999999': '2 milyon TL üstü' };
export const TESLIM_AD = { anahtar: 'Anahtar teslim', kaba: 'Kaba / ileri kaba' };
export const ASAMALAR = ['Ön görüşme', 'Keşif', 'Sözleşme', 'Üretim', 'Nakliye', 'Montaj', 'Teslim'];
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

export const kart = (rows) => `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows.filter((r) => r[1] !== undefined && r[1] !== null && r[1] !== '').map((r) => `<tr><td style="padding:4px 12px 4px 0;color:#4a5751;vertical-align:top"><b>${esc(r[0])}</b></td><td style="padding:4px 0">${esc(r[1])}</td></tr>`).join('')}</table>`;
export const buton = (url, yazi) => `<p><a href="${esc(url)}" style="background:#17663f;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">${esc(yazi)}</a></p>`;
export const sablon = (baslik, icerik) => `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#15201b"><h2 style="color:#17663f">${esc(baslik)}</h2>${icerik}<p style="color:#4a5751;font-size:12px;margin-top:24px">PrefabrikTeklif · prefabrikteklif.com.tr</p></div>`;

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
export function createApp({ db, auth, mail, ayar, FieldValue, Timestamp, FIRMS, MODELS, fetch: fetchFn = globalThis.fetch, saat = 48, maksFirma = 20, simdi = Date.now }) {
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

  // ---- Kimlik ----
  async function kim(req, zorunlu = true) {
    const h = String(req.headers?.authorization || '');
    const t = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!t) { if (zorunlu) hata(401, 'Giriş yapmanız gerekiyor.'); return null; }
    let u;
    try { u = await auth.verifyIdToken(t); } catch { if (zorunlu) hata(401, 'Oturumunuz sona erdi, tekrar giriş yapın.'); return null; }
    const eposta = String(u.email || '').toLowerCase();
    const dogrulandi = !!u.email_verified;
    const a = ayar();
    let rol = 'kullanici'; let firma = null;
    if (dogrulandi && a.yoneticiler.includes(eposta)) rol = 'admin';
    if (dogrulandi && eposta) {
      const q = await db.collection('firmalar').where('panelEpostalari', 'array-contains', eposta).limit(1).get();
      if (!q.empty) { firma = q.docs[0].id; if (rol !== 'admin') rol = 'firma'; }
    }
    return { uid: u.uid, eposta, dogrulandi, ad: u.name || '', rol, firma };
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
    if (!(await rateLimit(req, 'teklif', 5))) hata(429, 'Çok fazla talep gönderildi, bir saat sonra tekrar deneyin.');

    const a = ayar();
    const t0 = now();
    const ref = db.collection('talepler').doc();
    const tkn = token();
    const ortak = { ...d, uid: u?.uid || null, token: tkn, riza: true, rizaZamani: FieldValue.serverTimestamp(), olusturma: FieldValue.serverTimestamp() };

    if (mod === 'surec') {
      const sref = db.collection('siparisler').doc();
      await ref.set({ ...ortak, firmalar: [], secilen: arr(b.firmalar, 5).filter((s) => FIRMS.some((f) => f.slug === s)), durum: 'surec', siparis: sref.id });
      await sref.set({ talep: ref.id, uid: u?.uid || null, eposta: d.eposta, ad: d.ad, telefon: d.telefon, il: d.il, ilce: d.ilce, tip: d.tip, m2: d.m2, oda: d.oda, model: d.model, firma: '', asama: 0, notlar: [], belgeler: [], mesajlar: [], aktif: true, olusturma: FieldValue.serverTimestamp(), guncelleme: FieldValue.serverTimestamp() });
      await Promise.allSettled([
        mail(a.admin, `Süreç yönetimi talebi: ${TIP_AD[d.tip]} ${d.il}`, sablon('Yeni süreç yönetimi talebi', kart([...talepOzeti(d), ['Müşteri', d.ad], ['E-posta', d.eposta], ['Telefon', d.telefon], ['Öncelikli firmalar', arr(b.firmalar, 5).map(firmAd).join(', ')]]) + buton(`${a.site}/yonetim/#siparisler`, 'Yönetim panelinde aç'))),
        mail(d.eposta, 'Ön görüşme talebiniz alındı', sablon('Talebiniz alındı', `<p>Merhaba ${esc(d.ad)},</p><p>Süreç yönetimi talebiniz ekibimize ulaştı. En geç 1 iş günü içinde sizi arayıp ihtiyacınızı dinleyeceğiz. Süreç başladığında her adımı hesabınızdan takip edebilirsiniz.</p>${kart(talepOzeti(d))}${buton(`${a.site}/hesabim/`, 'Hesabım')}`)),
      ]);
      return { ok: true, firmaSayisi: 0, siparis: sref.id };
    }

    const secilen = arr(b.firmalar, 5).filter((s) => FIRMS.some((f) => f.slug === s));
    const kayitli = await kayitliFirmalar(d.tip);
    const uygun = kayitli.filter((f) => !f.iller?.length || f.iller.includes('*') || f.iller.includes(d.il));
    const hedef = [...secilen.filter((s) => uygun.some((f) => f.slug === s) || kayitli.some((f) => f.slug === s))];
    for (const f of uygun) { if (hedef.length >= maksFirma) break; if (!hedef.includes(f.slug)) hedef.push(f.slug); }
    await ref.set({ ...ortak, firmalar: hedef, secilen, durum: 'acik', sonTarih: Timestamp.fromMillis(t0 + saat * 3600000) });

    const davetler = [];
    for (const slug of hedef) {
      const f = kayitli.find((x) => x.slug === slug);
      if (!f?.eposta) continue;
      const kod = token();
      await ref.collection('davetler').doc(slug).set({ kod, eposta: f.eposta, durum: 'bekliyor', gonderim: FieldValue.serverTimestamp() });
      davetler.push({ slug, eposta: f.eposta, link: `${a.site}/teklif-ver/?t=${ref.id}.${tkn}&f=${slug}.${kod}` });
    }
    const ozet = kart(talepOzeti(d));
    const son = tarihYazi(new Date(t0 + saat * 3600000));
    const elle = secilen.filter((s) => !davetler.some((v) => v.slug === s));
    await Promise.allSettled([
      ...davetler.map((v) => mail(v.eposta, `Yeni talep: ${TIP_AD[d.tip]}${d.oda ? ` ${d.oda}` : ''}, ${d.il}`, sablon('Sitemizde size uygun bir talep var', `<p>PrefabrikTeklif’te kriterlerinize uyan bir müşteri talebi var. <b>Müşteri bilgileri gizlidir;</b> fiyat vermeyi kabul ederseniz ad, telefon ve e-posta sizinle paylaşılır.</p>${ozet}<p>Fiyatınızı <b>${esc(son)}</b> tarihine kadar girin. Süre dolunca tüm teklifler müşteriye tek tabloda iletilir.</p>${buton(v.link, 'Fiyat ver')}<p style="font-size:12px;color:#4a5751">İlgilenmiyorsanız aynı bağlantıdan “İlgilenmiyorum” diyebilirsiniz. Tüm taleplerinizi <a href="${esc(a.site)}/firma-paneli/">firma panelinden</a> de görebilirsiniz.</p>`))),
      mail(d.eposta, 'Teklif talebiniz alındı', sablon('Talebiniz alındı', `<p>Merhaba ${esc(d.ad)},</p><p>Talebiniz ${davetler.length ? `${davetler.length} firmaya` : 'uygun firmalara'} <b>isimsiz</b> olarak iletildi. Bilgileriniz yalnızca fiyat vermeyi kabul eden firmalarla paylaşılır. Gelen teklifler <b>${esc(son)}</b> civarında tek tabloda e-postanıza gelecek.</p>${ozet}${buton(`${a.site}/hesabim/`, 'Talebimi takip et')}`)),
      mail(a.admin, `Yeni talep: ${TIP_AD[d.tip]} ${d.il} (${davetler.length} firmaya e-posta)`, sablon('Yeni talep', `${ozet}${kart([['Müşteri', d.ad], ['E-posta', d.eposta], ['Telefon', d.telefon], ['Öncelikli firmalar', secilen.map(firmAd).join(', ')], ['E-postayla davet edilen', davetler.map((v) => firmAd(v.slug)).join(', ') || 'Yok'], ['Kayıtlı olmayan seçili firmalar (elle iletin)', elle.map(firmAd).join(', ')]])}${buton(`${a.site}/yonetim/#talepler`, 'Yönetim panelinde aç')}<p>Talep no: ${ref.id}</p>`)),
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
    tipAd: TIP_AD[d.tip], oda: d.oda, m2: d.m2, il: d.il, ilce: d.ilce, araziAd: ARAZI_AD[d.arazi], butce: BUTCE_AD[d.butce] || d.butce, teslim: TESLIM_AD[d.teslim] || '',
    zaman: d.zaman, kapsam: (d.kapsam || []).map((k) => KAPSAM_AD[k]), not: d.not, model: d.model ? (modelBul(d.model)?.ad || '') : '',
    sonTarih: d.sonTarih?.toDate ? tarihYazi(d.sonTarih.toDate()) : '', kapali: d.durum !== 'acik',
  });
  const musteri = (d) => ({ ad: d.ad, telefon: d.telefon, eposta: d.eposta });

  async function teklifKaydet(v, b, firmaSlug) {
    if (v.talep.durum !== 'acik') hata(409, 'Bu talebin süresi doldu.');
    if (v.davet?.durum === 'red') hata(409, 'Bu talebi daha önce reddettiniz.');
    const fiyat = Math.round(Number(b.fiyat));
    if (!(fiyat >= 1000 && fiyat < 1e9)) hata(400, 'Geçerli bir fiyat yazın.');
    const ilk = !(await v.ref.collection('teklifler').doc(firmaSlug).get()).exists;
    await v.ref.collection('teklifler').doc(firmaSlug).set({
      firma: firmaSlug, fiyat, kdvDahil: !!b.kdvDahil, dahil: arr(b.dahil).filter((k) => DAHIL_AD[k]),
      teslimGun: sayi(b.teslimGun, 1, 365), garantiYil: sayi(b.garantiYil, 0, 50), not: str(b.not, 1500), zaman: FieldValue.serverTimestamp(),
    });
    await v.davetRef.set({ durum: 'kabul', kabulZamani: FieldValue.serverTimestamp() }, { merge: true });
    const a = ayar(); const d = v.talep;
    if (ilk) {
      await Promise.allSettled([
        v.davet?.eposta ? mail(v.davet.eposta, `Müşteri bilgileri: ${TIP_AD[d.tip]}, ${d.il}`, sablon('Teklifiniz alındı, müşteri bilgileri', `<p>Fiyatınız kaydedildi. Müşterinin iletişim bilgileri aşağıda; teklifinizi netleştirmek için arayabilirsiniz. Lütfen bu bilgileri yalnızca bu talep için kullanın.</p>${kart([['Ad soyad', d.ad], ['Telefon', d.telefon], ['E-posta', d.eposta], ['Teklifiniz', tl(fiyat)]])}`)) : null,
        mail(d.eposta, `Yeni teklif: ${firmAd(firmaSlug)}`, sablon('Talebinize yeni teklif geldi', `<p>Merhaba ${esc(d.ad)},</p><p><b>${esc(firmAd(firmaSlug))}</b> talebinize fiyat verdi ve iletişim bilgileriniz bu firmayla paylaşıldı. Süre dolunca tüm teklifler tek tabloda e-postanıza gelecek.</p>${buton(`${a.site}/hesabim/`, 'Teklifleri gör')}`)),
      ]);
    }
    return { ok: true, musteri: musteri(d) };
  }

  // ---- GET /api/talep ----
  async function talep(req) {
    const v = await davetBul(req.query.t, req.query.f);
    if (!v) hata(404, 'Talep bulunamadı veya bağlantı geçersiz.');
    const verildi = (await v.ref.collection('teklifler').doc(v.slug).get()).exists;
    return { ...anonim(v.talep), firmaAd: firmAd(v.slug), verildi, red: v.davet.durum === 'red', ...(verildi ? { musteri: musteri(v.talep) } : {}) };
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
    return { ok: true };
  }

  // ---- POST /api/firma-basvuru ----
  async function firmaBasvuru(req) {
    const b = req.body || {};
    if (str(b.website)) return { ok: true };
    const d = {
      unvan: str(b.unvan, 160), marka: str(b.marka, 80), vergiNo: str(b.vergiNo, 11), mevcut: str(b.mevcut, 80), adres: str(b.adres, 240),
      web: str(b.web, 160), yetkili: str(b.yetkili, 80), telefon: str(b.telefon, 20), eposta: str(b.eposta, 120).toLowerCase(),
      tipler: arr(b.tipler).filter((t) => TIP_AD[t]), iller: str(b.iller, 400), belgeler: str(b.belgeler, 300), not: str(b.not, 1000),
    };
    if (!d.unvan || !/^\d{10,11}$/.test(d.vergiNo) || !d.yetkili || !epostaMi(d.eposta) || !d.tipler.length) hata(400, 'Lütfen zorunlu alanları doldurun.');
    if (!(await rateLimit(req, 'basvuru', 3))) hata(429, 'Çok fazla deneme, sonra tekrar deneyin.');
    const ref = await db.collection('firmaBasvurulari').add({ ...d, durum: 'bekliyor', zaman: FieldValue.serverTimestamp() });
    const a = ayar();
    await Promise.allSettled([
      mail(a.admin, `Firma başvurusu: ${d.marka || d.unvan}`, sablon('Yeni firma başvurusu', kart(Object.entries({ Unvan: d.unvan, Marka: d.marka, 'Vergi no': d.vergiNo, 'Listedeki kaydı': d.mevcut, Adres: d.adres, Web: d.web, Yetkili: d.yetkili, Telefon: d.telefon, 'E-posta': d.eposta, Tipler: d.tipler.map((t) => TIP_AD[t]).join(', '), İller: d.iller, Belgeler: d.belgeler, Not: d.not })) + buton(`${a.site}/yonetim/#onaylar`, 'Onaylamak için yönetim paneli') + `<p>Başvuru no: ${ref.id}</p>`)),
      mail(d.eposta, 'Başvurunuz alındı', sablon('Başvurunuz alındı', `<p>Sayın ${esc(d.yetkili)},</p><p>PrefabrikTeklif firma başvurunuz alındı. Vergi levhası, Ticaret Sicil Gazetesi ve imza sirkülerinizi bu e-postaya yanıt olarak gönderebilirsiniz. Onaylandığında <b>${esc(d.eposta)}</b> adresiyle <a href="${esc(a.site)}/firma-paneli/">firma paneline</a> giriş yapıp ürün ve fiyatlarınızı yönetebileceksiniz.</p>`)),
    ]);
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
    const q = await db.collection('yorumlar').where('firma', '==', slug).where('durum', '==', 'onayli').orderBy('zaman', 'desc').limit(20).get();
    res.set?.('Cache-Control', 'public, max-age=300');
    return { yorumlar: q.docs.map((d) => { const y = d.data(); return { ad: y.adGoster, puan: y.puan, metin: y.metin, cevap: y.cevap || '' }; }) };
  }
  async function yorum(req) {
    const b = req.body || {};
    const [id, tkn] = String(b.t || '').split('.');
    if (!id || !tkn) hata(400, 'Bağlantı geçersiz.');
    const s = await db.collection('talepler').doc(id).get();
    if (!s.exists || s.data().token !== tkn) hata(404, 'Bağlantı geçersiz.');
    const firma = str(b.firma, 80);
    if (!(s.data().firmalar || []).includes(firma)) hata(400, 'Bu firma talebinizde yok.');
    const puanlar = Object.fromEntries(['fiyat', 'teslim', 'iscilik', 'satisSonrasi'].map((k) => [k, Math.max(1, Math.min(5, Number(b[k]) || 0))]));
    const puan = Math.round((Object.values(puanlar).reduce((a, c) => a + c, 0) / 4) * 10) / 10;
    const metin = str(b.metin, 2000);
    if (metin.length < 30) hata(400, 'Yorum en az 30 karakter olmalı.');
    const ad = String(s.data().ad || '').split(' ');
    await db.collection('yorumlar').add({ firma, talep: id, puanlar, puan, metin, asama: b.asama === 'teslim' ? 'teslim' : 'sozlesme', adGoster: `${ad[0] || ''} ${(ad[1] || '').slice(0, 1)}.`.trim(), durum: 'bekliyor', belgeNotu: str(b.belge, 300), zaman: FieldValue.serverTimestamp() });
    await mail(ayar().admin, `Onay bekleyen yorum: ${firmAd(firma)}`, sablon('Yeni yorum', kart([['Firma', firmAd(firma)], ['Puan', puan], ['Yorum', metin], ['Belge', str(b.belge, 300)]]) + buton(`${ayar().site}/yonetim/#onaylar`, 'Yönetim panelinde onayla')));
    return { ok: true };
  }

  // ---- Herkese açık katalog ve bannerlar ----
  async function katalog(req, res) {
    const q = await db.collection('katalog').get();
    res.set?.('Cache-Control', 'public, max-age=300, s-maxage=600');
    return { kayitlar: q.docs.map((d) => d.data()).filter((x) => !x.gizli) };
  }
  async function bannerlar(req, res) {
    const q = await db.collection('bannerlar').where('aktif', '==', true).get();
    const t = now();
    res.set?.('Cache-Control', 'public, max-age=300, s-maxage=600');
    return { bannerlar: q.docs.map((d) => d.data()).filter((b) => !b.bitis || Date.parse(b.bitis) > t).sort((a, b) => (a.sira || 0) - (b.sira || 0)).map((b) => ({ baslik: b.baslik, metin: b.metin, gorsel: b.gorsel, link: b.link })) };
  }

  // ---- Kullanıcı ----
  async function ben(req) { const u = await kim(req); return u; }
  async function hesap(req) {
    const u = await kim(req);
    const qs = [db.collection('talepler').where('uid', '==', u.uid).limit(50).get()];
    if (u.dogrulandi && u.eposta) qs.push(db.collection('talepler').where('eposta', '==', u.eposta).limit(50).get());
    const docs = new Map();
    for (const q of await Promise.all(qs)) for (const d of q.docs) docs.set(d.id, d);
    const talepler = [];
    for (const d of docs.values()) {
      const t = d.data();
      if (t.mod === 'surec') continue;
      const tk = (await d.ref.collection('teklifler').get()).docs.map((x) => { const y = x.data(); return { firma: firmAd(y.firma), firmaSlug: y.firma, fiyat: y.fiyat, kdvDahil: y.kdvDahil, dahil: (y.dahil || []).map((k) => DAHIL_AD[k]), teslimGun: y.teslimGun, garantiYil: y.garantiYil, not: y.not }; }).sort((a, b) => a.fiyat - b.fiyat);
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
    for (const d of tq.docs) {
      const t = d.data();
      const [dv, tk] = await Promise.all([d.ref.collection('davetler').doc(slug).get(), d.ref.collection('teklifler').doc(slug).get()]);
      talepler.push({ id: d.id, ...anonim(t), olusturma: t.olusturma?.toMillis?.() || 0, sonTarihMs: t.sonTarih?.toMillis?.() || 0, davet: dv.exists ? dv.data().durum : 'yok', teklif: tk.exists ? { fiyat: tk.data().fiyat, kdvDahil: tk.data().kdvDahil } : null, ...(tk.exists ? { musteri: musteri(t) } : {}) });
    }
    talepler.sort((a, b) => b.olusturma - a.olusturma);
    const gq = await db.collection('geriBildirimler').where('firma', '==', slug).limit(50).get();
    const geri = gq.docs.map((d) => ({ id: d.id, ...d.data(), zaman: d.data().zaman?.toMillis?.() || 0 })).sort((a, b) => b.zaman - a.zaman);
    const st = FIRMS.find((f) => f.slug === slug) || {};
    return { ben: u, firma: { slug, ad: st.kisaAd || fd.ad || slug, il: st.il || '', tipler: fd.tipler || st.tipler || [], iller: fd.iller || [], eposta: fd.eposta || '', telefon: fd.telefon || '', aktif: !!fd.aktif }, modeller, bekleyen, talepler, geriBildirimler: geri };
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
    const veri = {
      ad: str(v.ad, 140), tip: TIP_AD[v.tip] ? v.tip : '', m2: sayi(v.m2, 5, 2000), oda: str(v.oda, 10), fiyat: sayi(v.fiyat, 1000, 1e9),
      kdv: ['dahil', 'haric', ''].includes(v.kdv) ? v.kdv : '', teslim: str(v.teslim, 60), kapsam: str(v.kapsam, 800),
      gorseller: arr(v.gorseller, 8, 500).map(httpsUrl).filter(Boolean), not: str(v.not, 500),
    };
    if (tur === 'yeni' && (!veri.ad || !veri.tip)) hata(400, 'Model adı ve tipi zorunlu.');
    if (tur === 'guncelle' && !veri.fiyat && !veri.gorseller.length && !veri.kapsam && !veri.teslim && !veri.kdv) hata(400, 'Değiştirmek istediğiniz bir alan girin.');
    if (!(await rateLimit(req, `urun:${u.firma}`, 40))) hata(429, 'Çok fazla değişiklik gönderildi, biraz sonra tekrar deneyin.');
    const ref = await db.collection('urunDegisiklikleri').add({ firma: u.firma, modelId: tur === 'yeni' ? '' : modelId, tur, veri, durum: 'bekliyor', uid: u.uid, eposta: u.eposta, zaman: FieldValue.serverTimestamp() });
    await mail(ayar().admin, `Onay bekleyen ürün değişikliği: ${firmAd(u.firma)}`, sablon('Ürün değişikliği', kart([['Firma', firmAd(u.firma)], ['İşlem', tur], ['Model', tur === 'yeni' ? veri.ad : (modelBul(modelId)?.ad || modelId)], ['Yeni fiyat', veri.fiyat ? tl(veri.fiyat) : ''], ['Fotoğraf', veri.gorseller.length ? `${veri.gorseller.length} adet` : '']]) + buton(`${ayar().site}/yonetim/#onaylar`, 'Onaylamak için yönetim paneli')));
    return { ok: true, id: ref.id };
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
  async function firmaProfil(req) {
    const u = await firmaKim(req);
    const b = req.body || {};
    const eposta = str(b.eposta, 120).toLowerCase();
    if (eposta && !epostaMi(eposta)) hata(400, 'Geçerli bir e-posta yazın.');
    const iller = arr(b.iller, 81, 40);
    const tipler = arr(b.tipler).filter((t) => TIP_AD[t]);
    await db.collection('firmalar').doc(u.firma).set({ ...(eposta ? { eposta } : {}), telefon: str(b.telefon, 20), iller: iller.length ? iller : ['*'], ...(tipler.length ? { tipler } : {}), guncelleme: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
  }

  // ---- Yönetim ----
  async function yonetimOzet(req) {
    await yonetici(req);
    const al = async (q, dön = (d) => ({ id: d.id, ...d.data() })) => (await q.get()).docs.map(dön);
    const ms = (x) => x?.toMillis?.() || 0;
    const [degisiklik, basvuru, yorumB, geri, talep, siparis, firma, banner, kontrol] = await Promise.all([
      al(db.collection('urunDegisiklikleri').where('durum', '==', 'bekliyor').limit(100)),
      al(db.collection('firmaBasvurulari').where('durum', '==', 'bekliyor').limit(50)),
      al(db.collection('yorumlar').where('durum', '==', 'bekliyor').limit(50)),
      al(db.collection('geriBildirimler').limit(100)),
      al(db.collection('talepler').orderBy('olusturma', 'desc').limit(60)),
      al(db.collection('siparisler').where('aktif', '==', true).limit(100)),
      al(db.collection('firmalar')),
      al(db.collection('bannerlar')),
      al(db.collection('fiyatKontrol').orderBy('zaman', 'desc').limit(1)),
    ]);
    const z = (x) => ({ ...x, zaman: ms(x.zaman), olusturma: ms(x.olusturma), guncelleme: ms(x.guncelleme), sonTarih: ms(x.sonTarih), rizaZamani: undefined });
    for (const t of talep) {
      const ref = db.collection('talepler').doc(t.id);
      const [dv, tk] = await Promise.all([ref.collection('davetler').get(), ref.collection('teklifler').get()]);
      t.davetler = dv.docs.map((d) => ({ firma: d.id, durum: d.data().durum }));
      t.teklifSayisi = tk.size; delete t.token;
    }
    return {
      degisiklikler: degisiklik.map((d) => ({ ...z(d), firmaAd: firmAd(d.firma), model: d.modelId ? (modelBul(d.modelId) || null) : null })),
      basvurular: basvuru.map(z), yorumlar: yorumB.map((y) => ({ ...z(y), firmaAd: firmAd(y.firma) })),
      geriBildirimler: geri.map((g) => ({ ...z(g), firmaAd: firmAd(g.firma) })).sort((a, b) => (a.durum === 'kapandi') - (b.durum === 'kapandi') || b.zaman - a.zaman),
      talepler: talep.map(z), siparisler: siparis.map((s) => ({ ...z(s), firmaAd: s.firma ? firmAd(s.firma) : '', modelAd: s.model ? (modelBul(s.model)?.ad || s.model) : '' })),
      firmalar: firma.map((f) => ({ ...z(f), ad: firmAd(f.id) })), bannerlar: banner.map(z), sonKontrol: kontrol[0] ? z(kontrol[0]) : null,
      asamalar: ASAMALAR, statikFirmalar: FIRMS.map((f) => ({ slug: f.slug, ad: f.kisaAd })),
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
        await db.collection('katalog').doc(katalogId(kid)).set({ id: kid, firma: d.firma, firmaAd: firmAd(d.firma), yeni: true, ad: v.ad, tip: v.tip, m2: v.m2, oda: v.oda, fiyat: v.fiyat, kdv: v.kdv, teslim: v.teslim, kapsam: v.kapsam, gorseller: v.gorseller || [], guncelleme: FieldValue.serverTimestamp() });
      } else if (d.tur === 'kaldir') {
        await db.collection('katalog').doc(katalogId(kid)).set({ id: kid, firma: d.firma, gizli: true, guncelleme: FieldValue.serverTimestamp() }, { merge: true });
      } else {
        const p = { id: kid, firma: d.firma, guncelleme: FieldValue.serverTimestamp() };
        for (const k of ['fiyat', 'kdv', 'teslim', 'kapsam']) if (v[k]) p[k] = v[k];
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
    if (karar === 'onay') {
      if (!slug) slug = (d.marka || d.unvan).toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      const iller = d.iller && !/tüm|hepsi|türkiye/i.test(d.iller) ? d.iller.split(/[,;]/).map((x) => x.trim()).filter(Boolean).slice(0, 81) : ['*'];
      await db.collection('firmalar').doc(slug).set({ aktif: true, ad: d.marka || d.unvan, eposta: d.eposta, panelEpostalari: FieldValue.arrayUnion(d.eposta), tipler: d.tipler, iller, telefon: d.telefon, basvuru: id, guncelleme: FieldValue.serverTimestamp() }, { merge: true });
      await mail(d.eposta, 'Firma hesabınız açıldı', sablon('Hoş geldiniz', `<p>Sayın ${esc(d.yetkili)},</p><p>Başvurunuz onaylandı. <b>${esc(d.eposta)}</b> adresiyle firma paneline giriş yaparak (ilk kez giriyorsanız “Kayıt ol” ile şifre belirleyin ya da Google ile girin) ürünlerinizi, fiyatlarınızı ve fotoğraflarınızı yönetebilir, size uygun talepleri görebilirsiniz.</p>${buton(`${ayar().site}/firma-paneli/`, 'Firma paneline git')}`));
    }
    await ref.update({ durum: karar === 'onay' ? 'onayli' : 'red', slug: slug || '', kararZamani: FieldValue.serverTimestamp() });
    return { ok: true, slug };
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
    await db.collection('firmalar').doc(slug).set({ aktif: b.aktif !== false, ...(eposta ? { eposta } : {}), panelEpostalari: panel, tipler: arr(b.tipler).filter((t) => TIP_AD[t]), iller: iller.length ? iller : ['*'], ad: firmAd(slug), guncelleme: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
  }
  async function yonetimYorum(req) {
    await yonetici(req);
    const ref = db.collection('yorumlar').doc(str(req.body?.id, 60)); const s = await ref.get();
    if (!s.exists) hata(404, 'Yorum bulunamadı.');
    await ref.update({ durum: req.body?.karar === 'onay' ? 'onayli' : 'red' });
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
    const gorsel = httpsUrl(b.gorsel);
    const link = str(b.link, 500);
    if (!str(b.baslik, 120) || !gorsel || !(link.startsWith('/') || httpsUrl(link))) hata(400, 'Başlık, https görsel adresi ve bağlantı zorunlu.');
    const ref = id ? db.collection('bannerlar').doc(id) : db.collection('bannerlar').doc();
    await ref.set({ baslik: str(b.baslik, 120), metin: str(b.metin, 240), gorsel, link, aktif: b.aktif !== false, sira: sayi(b.sira, 0, 99) ?? 0, bitis: str(b.bitis, 10), firma: str(b.firma, 80), guncelleme: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, id: ref.id };
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
    const kod = token();
    await ref.collection('davetler').doc(slug).set({ kod, eposta, durum: 'bekliyor', gonderim: FieldValue.serverTimestamp(), elle: true });
    await ref.update({ firmalar: FieldValue.arrayUnion(slug) });
    const link = `${ayar().site}/teklif-ver/?t=${ref.id}.${d.token}&f=${slug}.${kod}`;
    await mail(eposta, `Yeni talep: ${TIP_AD[d.tip]}, ${d.il}`, sablon('Sitemizde size uygun bir talep var', `<p>PrefabrikTeklif’te ürünlerinize uyan bir müşteri talebi var. <b>Müşteri bilgileri gizlidir;</b> fiyat vermeyi kabul ederseniz sizinle paylaşılır.</p>${kart(talepOzeti(d))}${buton(link, 'Fiyat ver')}<p style="font-size:12px;color:#4a5751">Firmanızı ücretsiz kaydederek tüm talepleri panelden görebilirsiniz: ${esc(ayar().site)}/firma-kayit/</p>`));
    return { ok: true };
  }

  return {
    rateLimit, kim,
    routes: {
      'POST /api/teklif': teklif, 'GET /api/talep': talep, 'POST /api/teklif-ver': teklifVer, 'POST /api/teklif-red': teklifRed,
      'POST /api/firma-basvuru': firmaBasvuru, 'GET /api/google-puan': googlePuan, 'GET /api/yorumlar': yorumlar, 'POST /api/yorum': yorum,
      'GET /api/katalog': katalog, 'GET /api/bannerlar': bannerlar,
      'GET /api/ben': ben, 'GET /api/hesap': hesap, 'POST /api/favoriler': favoriler, 'POST /api/siparis-mesaj': siparisMesaj,
      'GET /api/firma/ozet': firmaOzet, 'POST /api/firma/urun': firmaUrun, 'POST /api/firma/teklif': firmaTeklif, 'POST /api/firma/red': firmaRed,
      'POST /api/firma/geri-bildirim': firmaGeriBildirim, 'POST /api/firma/geri-bildirim-yanit': firmaGeriBildirimYanit, 'POST /api/firma/profil': firmaProfil,
      'GET /api/yonetim/ozet': yonetimOzet, 'POST /api/yonetim/degisiklik': yonetimDegisiklik, 'POST /api/yonetim/basvuru': yonetimBasvuru,
      'POST /api/yonetim/firma': yonetimFirma, 'POST /api/yonetim/yorum': yonetimYorum, 'POST /api/yonetim/geri-bildirim': yonetimGeriBildirim,
      'POST /api/yonetim/siparis': yonetimSiparis, 'POST /api/yonetim/banner': yonetimBanner, 'POST /api/yonetim/talep-ilet': yonetimTalepIlet,
    },
    async handle(req, res) {
      const fn = this.routes[`${req.method} ${String(req.path || '').replace(/\/$/, '')}`];
      const send = (code, body) => { res.status(code); if (!res.getHeader?.('Cache-Control')) res.set?.('Cache-Control', 'no-store'); return res.json(body); };
      if (!fn) return send(404, { hata: 'Bulunamadı' });
      try { const out = await fn(req, res); return send(200, out); } catch (e) {
        if (e instanceof HttpHata) return send(e.kod, { hata: e.message });
        console.error(e); return send(500, { hata: 'Sunucu hatası.' });
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

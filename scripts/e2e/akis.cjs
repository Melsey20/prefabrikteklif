// Uçtan uca testler: yerel sunucu (sunucu.mjs) açıkken çalıştırın.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const B = 'http://localhost:4400';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (u) => { const t = Math.floor(Date.now() / 1000); return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iss: 'https://securetoken.google.com/prefabrikteklif', aud: 'prefabrikteklif', auth_time: t, user_id: u.uid, sub: u.uid, iat: t, exp: t + 3600, email: u.email, email_verified: true, name: u.ad, firebase: { identities: { email: [u.email] }, sign_in_provider: 'password' } })}.imza`; };
const KUL = { 'satis@kardesler.com': { uid: 'f1', ad: 'Kardeşler Satış' }, 'info@mitraajans.com': { uid: 'a1', ad: 'Yusuf' }, 'ali@ornek.com': { uid: 'u1', ad: 'Ali Veli' } };
async function sahteAuth(ctx) {
  await ctx.route('**/identitytoolkit.googleapis.com/**', async (r) => {
    const url = r.request().url(); const body = r.request().postDataJSON() || {};
    if (url.includes('signInWithPassword')) { const u = KUL[body.email]; if (!u || body.password !== 'sifre123') return r.fulfill({ status: 400, json: { error: { code: 400, message: 'INVALID_LOGIN_CREDENTIALS' } } }); return r.fulfill({ json: { kind: 'identitytoolkit#VerifyPasswordResponse', localId: u.uid, email: body.email, displayName: u.ad, idToken: jwt({ ...u, email: body.email }), registered: true, refreshToken: 'rt-' + u.uid, expiresIn: '3600' } }); }
    if (url.includes('accounts:lookup')) { const p = JSON.parse(Buffer.from(body.idToken.split('.')[1], 'base64url')); return r.fulfill({ json: { users: [{ localId: p.user_id, email: p.email, emailVerified: true, displayName: p.name, providerUserInfo: [{ providerId: 'password', email: p.email, federatedId: p.email, rawId: p.email }], validSince: '1', lastLoginAt: String(Date.now()), createdAt: String(Date.now()) }] } }); }
    return r.fulfill({ json: {} });
  });
  await ctx.route('**/securetoken.googleapis.com/**', (r) => r.fulfill({ json: {} }));
}
async function giris(p, eposta, hedef) {
  await p.goto(B + '/giris/?geri=' + encodeURIComponent(hedef));
  await p.fill('input[name=eposta]', eposta); await p.fill('input[name=sifre]', 'sifre123');
  await Promise.all([p.waitForURL(B + hedef + '**', { timeout: 15000 }), p.click('#g-btn')]);
}
(async () => {
  const br = await chromium.launch();
  const hatalar = [];
  const yeniSayfa = async (w = 390) => { const ctx = await br.newContext({ viewport: { width: w, height: 844 } }); await sahteAuth(ctx); const p = await ctx.newPage(); p.on('pageerror', (e) => hatalar.push(`${p.url()}: ${e}`)); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|net::ERR|google-puan|yorumlar|Failed to load resource/.test(m.text())) hatalar.push(`${p.url()}: ${m.text()}`); }); return { ctx, p }; };
  const adim = (s) => console.log('✓', s);

  // 1) Ana sayfa, menü, çerez
  let { ctx, p } = await yeniSayfa(1440);
  await p.goto(B + '/');
  assert.equal(await p.locator('h1').first().textContent(), 'Hayalindeki evi 1 dakikada bul');
  await p.click('#mm > button'); assert.ok(await p.locator('#mm-panel').isVisible()); await p.keyboard.press('Escape');
  await p.click('[data-consent="0"]'); assert.ok(await p.locator('#consent').isHidden());
  adim('Ana sayfa, mega menü, çerez bandı');
  // hızlı arama formu
  await p.selectOption('form.qsearch select[name=tip]', 'prefabrik'); await p.selectOption('form.qsearch select[name=oda]', '2+1');
  await p.click('form.qsearch button[type=submit]');
  await p.waitForSelector('#sn-liste .mcard');
  const n1 = await p.locator('#sn-liste .mcard').count(); assert.ok(n1 > 5, 'hızlı arama sonuç vermeli');
  adim(`Hızlı arama → ${n1} sonuç`);
  await ctx.close();

  // 2) Sihirbaz (mobil), favori, karşılaştırma
  ({ ctx, p } = await yeniSayfa(390));
  await p.goto(B + '/');
  await p.click('[data-drawer-open]'); assert.ok(await p.locator('#drawer').isVisible()); await p.click('[data-drawer-close]');
  await p.goto(B + '/evini-bul/');
  await p.click('#wz-opts button[data-v="prefabrik"]'); await p.waitForTimeout(350);
  await p.click('#wz-opts button[data-v="70-100"]'); await p.waitForTimeout(350);
  await p.click('#wz-opts button[data-v="2+1"]'); await p.waitForTimeout(350);
  await p.click('#wz-opts button[data-v="tarla"]'); assert.ok(await p.locator('#wz-not').isVisible(), 'tarla uyarısı'); await p.click('#wz-ileri');
  await p.click('#wz-atla'); // bütçe fark etmez
  await p.click('#wz-opts button[data-v="anahtar"]'); await p.waitForTimeout(350);
  await p.selectOption('#wz-ilsec', 'Malatya'); await p.click('#wz-ileri');
  await p.waitForSelector('#sn-liste .mcard');
  const n2 = await p.locator('#sn-liste .mcard').count(); assert.ok(n2 > 0);
  assert.ok((await p.locator('#sn-teklif').getAttribute('href')).includes('il=Malatya'));
  adim(`Sihirbaz 7 adım → ${n2} sonuç, teklif bağlantısı kriterli`);
  await p.locator('#sn-liste .mcard button.fav').first().click();
  assert.equal(await p.locator('.hicon [data-cnt=fav]').textContent(), '1');
  const cmp = p.locator('#sn-liste input[data-cmp]');
  await cmp.nth(0).check(); await cmp.nth(1).check();
  assert.ok(await p.locator('#cbar').isVisible());
  await p.goto(B + '/karsilastir/');
  await p.waitForSelector('#k-alan table');
  assert.equal(await p.locator('#k-alan thead th').count(), 3);
  await p.goto(B + '/favorilerim/'); await p.waitForSelector('#f-liste .mcard');
  adim('Favori, karşılaştırma tablosu, favorilerim');

  // 3) Teklif formu (isimsiz akış)
  await p.goto(B + '/teklif-al/?tip=prefabrik&oda=2%2B1&m2=82&il=Malatya&firmalar=kardesler-celik-yapi&model=kardesler-celik-yapi%2Ftek-katli-prefabrik-2-1-82-m2-k-c-01');
  assert.ok(await p.locator('#secili-firmalar').isVisible());
  await p.fill('input[name=ad]', 'Ali Veli'); await p.fill('input[name=telefon]', '05321112233'); await p.fill('input[name=eposta]', 'ali@ornek.com');
  await p.click('#gonder'); assert.ok(await p.locator('#hata').isVisible(), 'rıza olmadan gönderilmemeli');
  await p.check('label[data-mfield=teklif] input[name=riza]');
  await Promise.all([p.waitForURL('**/teklif-alindi/**'), p.click('#gonder')]);
  assert.ok((await p.locator('#n').textContent()).includes('1 firmaya'));
  const mails = await (await fetch(B + '/__mails')).json();
  const fm = mails.find((m) => m.to === 'satis@kardesler.com');
  assert.ok(fm && !fm.html.includes('05321112233') && !fm.html.includes('Ali Veli'), 'firma e-postası isimsiz');
  adim('Teklif formu → firmaya isimsiz e-posta');
  const link = fm.html.match(/href="(http:\/\/localhost:4400\/teklif-ver\/[^"]+)"/)[1].replace(/&amp;/g, '&');
  await p.goto(link); await p.waitForSelector('#f:not([hidden])');
  assert.ok(!(await p.content()).includes('05321112233'));
  await p.fill('#f input[name=fiyat]', '595000'); await p.check('#f input[value=nakliye]');
  await p.click('#f button[type=submit]'); await p.waitForSelector('#musteri:not([hidden])');
  assert.ok((await p.locator('#musteri').textContent()).includes('05321112233'));
  adim('E-postadaki bağlantıyla fiyat verildi → müşteri bilgisi açıldı');
  // Süreç yönetimi talebi
  await p.goto(B + '/teklif-al/?mod=surec&tip=prefabrik');
  await p.fill('input[name=ad]', 'Ali Veli'); await p.fill('input[name=telefon]', '05321112233'); await p.fill('input[name=eposta]', 'ali@ornek.com'); await p.selectOption('select[name=il]', 'Malatya');
  await p.check('label[data-mfield=surec] input[name=rizaSurec]');
  await Promise.all([p.waitForURL('**/teklif-alindi/?mod=surec**'), p.click('#gonder')]);
  adim('Süreç yönetimi talebi');
  await ctx.close();

  // 4) Firma paneli
  ({ ctx, p } = await yeniSayfa(1280));
  await giris(p, 'satis@kardesler.com', '/firma-paneli/');
  await p.waitForSelector('#fp-app:not([hidden])');
  assert.ok((await p.locator('#p-urunler tbody tr').count()) >= 6);
  await p.locator('#p-urunler tbody tr').first().getByRole('button', { name: 'Düzenle' }).click();
  await p.fill('.dlg input[name=fiyat]', '615000'); await p.fill('.dlg textarea[name=gorseller]', 'https://ornek.com/foto1.jpg');
  await p.click('.dlg button[type=submit]'); await p.waitForSelector('.dlg', { state: 'detached' });
  await p.waitForSelector('#p-urunler .st-b.a');
  await p.click('[data-sekme="talepler"]'); await p.waitForSelector('#p-talepler .item');
  assert.ok((await p.locator('#p-talepler').textContent()).includes('05321112233'), 'fiyat verilen talepte müşteri görünür');
  await p.click('[data-sekme="geri-bildirim"]');
  await p.selectOption('#gb-form select[name=tur]', 'hata'); await p.fill('#gb-form input[name=konu]', 'Fotoğraf yükleme'); await p.fill('#gb-form textarea[name=mesaj]', 'Telefondan fotoğraf eklemek istiyoruz.');
  await p.click('#gb-form button[type=submit]'); await p.waitForSelector('#p-gb .item');
  adim('Firma paneli: ürün güncelleme onaya gitti, talepte müşteri görünür, geri bildirim gönderildi');
  await ctx.close();

  // 5) Yönetim paneli
  ({ ctx, p } = await yeniSayfa(1280));
  await giris(p, 'info@mitraajans.com', '/yonetim/');
  await p.waitForSelector('#y-app:not([hidden])');
  await p.waitForSelector('#p-onaylar .item');
  await p.locator('#p-onaylar .item').first().getByRole('button', { name: 'Onayla ve yayınla' }).click();
  await p.waitForFunction(() => !document.querySelector('#p-onaylar .item button'));
  const kat = await (await fetch(B + '/api/katalog')).json();
  assert.equal(kat.kayitlar[0].fiyat, 615000);
  await p.click('[data-sekme="geri-bildirim"]'); await p.fill('#p-gb textarea', 'Yakında ekliyoruz, teşekkürler.'); await p.locator('#p-gb').getByRole('button', { name: 'Gönder / kaydet' }).click();
  await p.waitForSelector('#p-gb .box.mint');
  await p.click('[data-sekme="siparisler"]'); await p.waitForSelector('#p-siparisler .item');
  await p.locator('#p-siparisler select').first().selectOption('2');
  await p.locator('#p-siparisler textarea').first().fill('Sözleşme hazırlandı');
  await p.locator('#p-siparisler').getByRole('button', { name: 'Kaydet' }).click();
  await p.waitForSelector('#p-kanban > div:nth-child(3) .k');
  adim('Yönetim: değişiklik onaylandı (katalogda 615.000), geri bildirim yanıtlandı, sipariş aşaması güncellendi');
  // Model sayfası onaylı fiyatı gösterir
  await p.goto(B + '/firma/kardesler-celik-yapi/');
  await p.waitForFunction(() => [...document.querySelectorAll('[data-fiyat-yazi]')].some((e) => e.textContent.includes('615.000')));
  adim('Onaylanan fiyat firma sayfasında canlı göründü');
  await ctx.close();

  // 6) Kullanıcı hesabı
  ({ ctx, p } = await yeniSayfa(390));
  await giris(p, 'ali@ornek.com', '/hesabim/');
  await p.waitForSelector('#p-siparis article');
  assert.ok((await p.locator('#p-siparis').textContent()).includes('Sözleşme hazırlandı'));
  await p.click('[data-sekme="talepler"]'); await p.waitForSelector('#p-talepler table');
  assert.ok((await p.locator('#p-talepler').textContent()).includes('595.000'));
  adim('Kullanıcı hesabı: sipariş aşaması ve gelen teklif görünüyor');
  await ctx.close();

  // 7) Firma başvurusu (499 TL üyelik + referans), onay ve ödeme bağlantısı; reklam talebi; reklam alanları ana sayfada
  ({ ctx, p } = await yeniSayfa(390));
  await p.goto(B + '/firma-kayit/');
  assert.ok((await p.locator('main, body').first().textContent()).includes('499 TL'));
  const fk = p.locator('#kayit');
  await fk.locator('[name=unvan]').fill('Deneme Yapı Ltd.'); await fk.locator('[name=marka]').fill('Deneme Prefabrik'); await fk.locator('[name=vergiNo]').fill('1234567890');
  await fk.locator('[name=adres]').fill('Malatya OSB'); await fk.locator('[name=yetkili]').fill('Ayşe Yılmaz'); await fk.locator('[name=telefon]').fill('05321112233'); await fk.locator('[name=eposta]').fill('yeni@deneme.com');
  await fk.locator('[name=tipler][value=prefabrik]').check(); await fk.locator('[name=kosul]').check();
  await fk.locator('[name=kapsam][value=secili]').check(); await p.click('#gonder');
  assert.ok((await p.locator('#hata').textContent()).includes('il'), 'belirli il seçilip hiç il işaretlenmezse uyarı');
  await p.fill('#il-ara', 'malat'); await fk.locator('[name=il][value=Malatya]').check(); await fk.locator('[name=il][value=Elazığ]').check({ force: true }).catch(() => {});
  await p.click('#gonder'); assert.ok((await p.locator('#hata').textContent()).includes('referans'), 'referanssız gönderilemez');
  await fk.locator('[name=referanslar]').fill('Malatya 2025 · 90 m² 2+1 · Mehmet Bey 0532 000 00 00');
  await p.click('#gonder'); assert.ok((await p.locator('#hata').textContent()).includes('üyelik'), 'üyelik onayı zorunlu');
  await fk.locator('[name=abonelik]').check(); await fk.locator('[name=sozlesme]').check();
  await p.click('#gonder'); await p.waitForSelector('#tamam:not([hidden])');
  adim('Firma başvurusu: referans ve 499 TL üyelik onayı zorunlu, başvuru alındı');
  await ctx.close();
  ({ ctx, p } = await yeniSayfa(1280));
  await giris(p, 'info@mitraajans.com', '/yonetim/');
  await p.waitForSelector('#p-onaylar .item');
  const bas = p.locator('#p-onaylar .item', { hasText: 'Deneme Prefabrik' });
  assert.ok((await bas.textContent()).includes('Mehmet Bey'));
  await bas.locator('input[name=odeme]').fill('https://odeme.example/deneme');
  await bas.getByRole('button', { name: 'Onayla, hesabı aç' }).click();
  await p.waitForFunction(() => !document.querySelector('#p-onaylar')?.textContent?.includes('Deneme Prefabrik'));
  const mailler = await (await p.request.get(B + '/__mails')).json();
  assert.ok(mailler.some((m) => m.to === 'yeni@deneme.com' && m.html.includes('https://odeme.example/deneme')), 'onay e-postasında ödeme bağlantısı');
  adim('Yönetim başvuruyu onayladı, ödeme bağlantısı firmaya gitti');
  await p.click('[data-sekme="bannerlar"]');
  const reklamEkle = async (konum, alanlar) => {
    await p.click('#banner-ekle'); const d = p.locator('.dlg');
    await d.locator('select').first().selectOption(konum);
    for (const [ad, v] of Object.entries(alanlar)) await d.locator(`input[name=${ad}]`).fill(v);
    await d.getByRole('button', { name: 'Kaydet' }).click(); await p.waitForSelector('.dlg', { state: 'detached', timeout: 5000 }).catch(async (e) => { console.log('TOAST', await p.locator('.toast').allTextContents(), await d.locator('form').evaluate((f) => [...f.elements].filter((x) => !x.checkValidity()).map((x) => x.name + ':' + x.validationMessage))); throw e; });
  };
  await reklamEkle('ana', { baslik: 'Kış kampanyası', metin: '%10 indirim', gorsel: 'https://cdn.example/a.jpg', link: '/firma/kardesler-celik-yapi/' });
  await reklamEkle('yan', { baslik: 'Yan reklam', gorsel: 'https://cdn.example/y.jpg', link: '/firma/kardesler-celik-yapi/' });
  await reklamEkle('liste', { model: 'kardesler-celik-yapi/tek-katli-prefabrik-2-1-82-m2-k-c-01' });
  await p.waitForFunction(() => document.querySelector('#p-doluluk')?.textContent?.includes('1 / 6'));
  adim('Yönetim: ana, yan ve öne çıkan reklam eklendi (doluluk 1/6)');
  await ctx.close();
  ({ ctx, p } = await yeniSayfa(1440));
  await p.goto(B + '/');
  await p.waitForSelector('[data-banner-slot] .slide .tag:text("Reklam")');
  await p.waitForSelector('.side-slider.fotolu .side-ad');
  await p.waitForSelector('[data-one-cikan]:not([hidden]) .mcard .sp');
  assert.equal(await p.locator('[data-banner-slot] .slide.cream').count(), 0);
  assert.ok(await p.locator('.site-note').textContent().then((t) => t.includes('teyit')));
  assert.ok((await p.locator('.hscroll').nth(1).locator('.mcard').count()) <= 10);
  await p.screenshot({ path: '/tmp/e2e-reklamli-ana.png' });
  adim('Ana sayfa: sponsorlu ana banner, kaydırmalı yan banner, öne çıkan listeleme ve alt bilgi notu');
  await ctx.close();
  ({ ctx, p } = await yeniSayfa(390));
  await giris(p, 'satis@kardesler.com', '/firma-paneli/');
  await p.click('[data-sekme="reklam"]'); await p.waitForSelector('#p-paketler > div');
  assert.ok((await p.locator('#p-paketler').textContent()).includes('45.000 TL'));
  await p.locator('#p-paketler > div', { hasText: 'Ana + yan' }).getByRole('button', { name: 'Talep et' }).click();
  await p.getByRole('button', { name: 'Evet' }).click();
  await p.waitForSelector('#p-reklamlar .item');
  await p.screenshot({ path: '/tmp/e2e-firma-reklam.png', fullPage: true });
  adim('Firma paneli: üyelik kartı ve reklam talebi (45.000 TL)');
  await ctx.close();
  // 8) Alt bilgideki "Bize yazın" formu
  ({ ctx, p } = await yeniSayfa(390));
  await p.goto(B + '/rehber/');
  const bf = p.locator('#by-form');
  await bf.locator('[name=ad]').fill('Deniz'); await bf.locator('[name=eposta]').fill('deniz@ornek.com'); await bf.locator('[name=mesaj]').fill('Bungalov için Rize taraflarında firma var mı?');
  await bf.locator('button[type=submit]').click(); await p.waitForSelector('#by-durum:not([hidden])');
  assert.ok((await p.locator('#by-durum').textContent()).includes('Teşekkürler'));
  const m2 = await (await p.request.get(B + '/__mails')).json();
  assert.ok(m2.some((m) => m.subject.startsWith('Siteden mesaj') && m.html.includes('Rize')));
  adim('Alt bilgi: Bize yazın formu yönetime ulaştı');
  await ctx.close();

  await br.close();
  if (hatalar.length) { console.log('Konsol hataları:\n' + hatalar.join('\n')); process.exit(1); }
  console.log('Tüm uçtan uca testler geçti.');
})().catch((e) => { console.error('✗', e); process.exit(1); });

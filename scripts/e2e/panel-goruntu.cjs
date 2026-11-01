const { chromium } = require('playwright');
const B = 'http://localhost:4400';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (u) => { const t = Math.floor(Date.now() / 1000); return `${b64({ alg: 'none' })}.${b64({ auth_time: t, user_id: u.uid, sub: u.uid, iat: t, exp: t + 3600, email: u.email, email_verified: true, name: u.ad, firebase: { sign_in_provider: 'password' } })}.x`; };
(async () => {
  const br = await chromium.launch();
  for (const [email, uid, hedef, w] of [['satis@kardesler.com', 'f1', '/firma-paneli/#talepler', 1280], ['info@mitraajans.com', 'a1', '/yonetim/#siparisler', 1280], ['ali@ornek.com', 'u1', '/hesabim/', 390]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: 900 } });
    await ctx.route('**/identitytoolkit.googleapis.com/**', async (r) => { const url = r.request().url(); const b = r.request().postDataJSON() || {};
      if (url.includes('signInWithPassword')) return r.fulfill({ json: { localId: uid, email, displayName: 'Test', idToken: jwt({ uid, email, ad: 'Ali Veli' }), registered: true, refreshToken: 'x', expiresIn: '3600' } });
      return r.fulfill({ json: { users: [{ localId: uid, email, emailVerified: true, displayName: 'Ali Veli', providerUserInfo: [] }] } }); });
    const p = await ctx.newPage();
    await p.goto(B + '/giris/?geri=' + encodeURIComponent(hedef.split('#')[0]));
    await p.fill('input[name=eposta]', email); await p.fill('input[name=sifre]', 'sifre123');
    await Promise.all([p.waitForURL('**' + hedef.split('#')[0] + '**'), p.click('#g-btn')]);
    if (hedef.includes('#')) { await p.waitForTimeout(800); await p.click(`[data-sekme="${hedef.split('#')[1]}"]`); }
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `/tmp/panel-${uid}.jpg`, type: 'jpeg', quality: 65, fullPage: true });
    await ctx.close();
  }
  await br.close();
})();

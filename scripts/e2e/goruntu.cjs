const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const sayfalar = process.argv.slice(2);
  for (const [ad, w, h] of [['m', 390, 844], ['d', 1440, 900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const hatalar = [];
    p.on('pageerror', (e) => hatalar.push(String(e)));
    p.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
    for (const s of sayfalar) {
      await p.goto('http://localhost:4400' + s, { waitUntil: 'networkidle' });
      await p.waitForTimeout(400);
      const dosya = `/tmp/ss-${ad}-${s.replace(/[^a-z0-9]+/gi, '_')}.jpg`;
      await p.screenshot({ path: dosya, fullPage: true, type: 'jpeg', quality: 60 });
      console.log(dosya, hatalar.splice(0).join(' | '));
    }
    await ctx.close();
  }
  await b.close();
})();

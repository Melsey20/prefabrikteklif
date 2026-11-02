// Tasarım: node cek.cjs tasarim <jobs.json>      → her kartı JPEG olarak kaydeder
// Reels:   node cek.cjs reels <reels.html> <kare_klasörü> <süre_sn>  → 30 fps kareler
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [, , mod, a, b, c] = process.argv;
  const br = await chromium.launch();
  if (mod === 'tasarim') {
    for (const j of JSON.parse(fs.readFileSync(a, 'utf8'))) {
      const p = await br.newPage({ viewport: { width: j.w, height: j.h } });
      await p.setContent(j.html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
      await p.screenshot({ path: j.out, type: 'jpeg', quality: 92 }); await p.close();
    }
  } else {
    const p = await br.newPage({ viewport: { width: 1080, height: 1920 } });
    await p.goto('file://' + require('path').resolve(a)); await p.evaluate(() => document.fonts.ready);
    const n = Math.ceil(30 * Number(c));
    for (let f = 0; f < n; f++) {
      await p.evaluate((t) => window.setT(t), f / 30);
      await p.screenshot({ path: `${b}/f${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 });
    }
  }
  await br.close();
})();

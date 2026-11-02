import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';

// lastmod: fiyat sayfaları için son fiyat kontrolü, rehber yazıları için yazı tarihi
const meta = JSON.parse(fs.readFileSync('./src/data/meta.json', 'utf8'));
const yaziTarih = Object.fromEntries(fs.readdirSync('./src/content/rehber').filter((f) => f.endsWith('.md')).map((f) => [f.replace(/\.md$/, ''), (fs.readFileSync(`./src/content/rehber/${f}`, 'utf8').match(/^tarih:\s*"?(\d{4}-\d{2}-\d{2})/m) || [])[1]]));

export default defineConfig({
  site: 'https://www.prefabrikteklif.com.tr',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
  integrations: [
    sitemap({
      filter: (page) => !/\/(teklif-alindi|teklif-ver|yorum-yaz|404|hesabim|firma-paneli|yonetim|giris|model|karsilastir|favorilerim)\//.test(page),
      changefreq: 'weekly',
      serialize(item) {
        const m = item.url.match(/\/rehber\/([^/]+)\/$/);
        const t = (m && yaziTarih[m[1]]) || meta.sonKontrol;
        if (t) item.lastmod = new Date(t).toISOString();
        if (item.url === 'https://www.prefabrikteklif.com.tr/') item.priority = 1;
        return item;
      },
      i18n: { defaultLocale: 'tr', locales: { tr: 'tr-TR' } },
    }),
  ],
});

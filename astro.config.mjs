import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.prefabrikteklif.com.tr',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
  integrations: [
    sitemap({
      filter: (page) => !/\/(teklif-alindi|teklif-ver|yorum-yaz|404|hesabim|firma-paneli|yonetim|giris|model|karsilastir|favorilerim)\//.test(page),
      changefreq: 'weekly',
      i18n: { defaultLocale: 'tr', locales: { tr: 'tr-TR' } },
    }),
  ],
});

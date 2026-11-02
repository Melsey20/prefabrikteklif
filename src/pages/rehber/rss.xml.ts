import { SITE } from '../../site.config';
import { yazilar } from '../../lib/rehber';
// Rehber yazıları için RSS akışı (haber okuyucular, Bing ve yapay zekâ tarayıcıları yeni yazıları buradan da bulur)
const x = (s: string) => String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
export function GET() {
  const items = [...yazilar].sort((a, b) => String(b.tarih).localeCompare(String(a.tarih))).slice(0, 50).map((y) => {
    const u = new URL(y.url, SITE.url).href;
    const d = new Date(y.tarih || Date.now());
    return `<item><title>${x(y.baslik)}</title><link>${u}</link><guid isPermaLink="true">${u}</guid><pubDate>${(isNaN(+d) ? new Date() : d).toUTCString()}</pubDate><category>${x(y.kategori)}</category><description>${x(y.aciklama)}</description></item>`;
  }).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${x(SITE.ad)} Rehber</title><link>${SITE.url}/rehber/</link><atom:link href="${SITE.url}/rehber/rss.xml" rel="self" type="application/rss+xml"/><description>Prefabrik ev, tiny house ve modüler ev alırken bilmeniz gerekenler: fiyat, ruhsat, arsa ve kurulum rehberleri.</description><language>tr-TR</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}

// Rehber yazılarının listesi: src/content/rehber/*.md + eski .astro yazıları
export interface Yazi { slug: string; url: string; baslik: string; aciklama: string; kategori: string; tarih: string; gorsel: string; sure: number }
const md = import.meta.glob<{ frontmatter: Record<string, any>; rawContent: () => string }>('../content/rehber/*.md', { eager: true });
const kelime = (s: string) => s.split(/\s+/).filter(Boolean).length;
export const KATEGORILER = ['Fiyatlar', 'Ruhsat ve mevzuat', 'Tiny house', 'Arsa ve zemin', 'Karşılaştırma', 'Yaşam ve tasarım'];
import metaRaw from '../data/meta.json';
const eski: Yazi[] = [
  { slug: 'prefabrik-ev-fiyatlari-2026', baslik: `Prefabrik ev fiyatları ${(metaRaw as any).ay}: m² maliyeti ve güncel fiyat aralıkları`, aciklama: 'Firmaların yayınladığı fiyatlardan derlenen ortanca fiyatlar, metrekareye göre fiyat tablosu ve fiyata neyin dahil olduğu.', kategori: 'Fiyatlar', tarih: (metaRaw as any).sonKontrol, gorsel: 'prefabrik', sure: 4 },
  { slug: 'prefabrik-ev-fiyatina-neler-dahil', baslik: 'Prefabrik ev fiyatına neler dahil?', aciklama: 'KDV, nakliye, montaj, zemin betonu ve iç bitiş: teklifleri karşılaştırmadan önce sorulacak kalemler.', kategori: 'Fiyatlar', tarih: '2026-10-28', gorsel: 'montaj', sure: 6 },
  { slug: 'tarlaya-prefabrik-ev-yapilir-mi', baslik: 'Tarlaya prefabrik ev yapılır mı?', aciklama: 'Tarım arazisi, köy yerleşik alanı ve imarlı arsada kurallar; 2026 düzenlemeleri.', kategori: 'Ruhsat ve mevzuat', tarih: '2026-10-28', gorsel: 'prefabrik', sure: 6 },
  { slug: 'tiny-house-ruhsat-o2-belgesi', baslik: 'Tiny house için ruhsat ve O2 belgesi', aciklama: 'Tekerlekli ve sabit tiny house arasındaki fark, O2 tip onay, plaka ve tescil.', kategori: 'Tiny house', tarih: '2026-10-28', gorsel: 'tiny-house', sure: 5 },
  { slug: 'prefabrik-mi-celik-ev-mi', baslik: 'Prefabrik mi, çelik ev mi?', aciklama: 'Yapı sistemi, m² fiyatı ve kullanım amacına göre hangisi size uygun.', kategori: 'Karşılaştırma', tarih: '2026-10-28', gorsel: 'celik', sure: 5 },
].map((y) => ({ ...y, url: `/rehber/${y.slug}/` }));
const yeni: Yazi[] = Object.entries(md).map(([p, m]) => {
  const slug = p.split('/').pop()!.replace(/\.md$/, '');
  const f = m.frontmatter;
  return { slug, url: `/rehber/${slug}/`, baslik: f.baslik, aciklama: f.aciklama, kategori: f.kategori, tarih: f.tarih, gorsel: f.gorsel || 'prefabrik', sure: Math.max(3, Math.round(kelime(m.rawContent()) / 200)) };
});
export const yazilar: Yazi[] = [...yeni, ...eski].sort((a, b) => b.tarih.localeCompare(a.tarih) || a.baslik.localeCompare(b.baslik, 'tr'));

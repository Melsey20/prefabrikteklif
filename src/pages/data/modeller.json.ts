import { models, firmBySlug, modelUrl, modelId } from '../../lib/data';
// Sihirbaz, karşılaştırma ve favoriler için hafif model listesi
export function GET() {
  const rows = models.map((m) => ({
    id: modelId(m), f: m.firma, fa: m.firmaAd, il: firmBySlug(m.firma)?.il || '', ad: m.ad, t: m.tip, m2: m.m2, o: m.oda, k: m.kat,
    p: m.fiyatTuru === 'model' ? m.fiyat : null, pt: m.fiyatTuru, pm: m.fiyatTuru === 'm2' ? m.fiyat : null, m2f: m.m2Fiyat,
    kdv: m.kdv, n: m.nakliye, mo: m.montaj, z: m.zemin, ts: m.teslim, u: m.uyari ? 1 : 0, url: modelUrl(m),
  }));
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

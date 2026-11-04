// Prefabrik Ev Fiyat Endeksi: sitedeki güncel model fiyatlarından aylık özet (her derlemede yeniden hesaplanır)
import { models, meta, TIPLER, type Model } from './data';

const q = (a: number[], p: number) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * p; const lo = Math.floor(i); return Math.round(s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo)); };
export const fiyatli = models.filter((m) => m.fiyatTuru === 'model' && m.fiyat);
const ozet = (l: Model[]) => {
  const f = l.map((m) => m.fiyat!); const m2 = l.filter((m) => m.m2Fiyat).map((m) => m.m2Fiyat!);
  return { n: l.length, firma: new Set(l.map((m) => m.firma)).size, min: q(f, 0), q1: q(f, 0.25), med: q(f, 0.5), q3: q(f, 0.75), max: q(f, 1), m2: q(m2, 0.5) };
};
export const tipler = Object.keys(TIPLER).map((t) => ({ tip: t, ad: TIPLER[t].ad, ...ozet(fiyatli.filter((m) => m.tip === t)) })).filter((x) => x.n >= 5).sort((a, b) => (a.m2 ?? 0) - (b.m2 ?? 0));
export const genel = ozet(fiyatli);
export const BANT = [[0, 50, '50 m² altı'], [50, 80, '50–79 m²'], [80, 110, '80–109 m²'], [110, 150, '110–149 m²'], [150, 9999, '150 m² ve üzeri']] as const;
export const buyukluk = ['prefabrik', 'celik'].map((t) => ({ tip: t, ad: TIPLER[t]?.ad || t, bantlar: BANT.map(([a, b, ad]) => { const l = fiyatli.filter((m) => m.tip === t && m.m2 && m.m2 >= a && m.m2 < b); return { ad, n: l.length, med: q(l.map((m) => m.fiyat!), 0.5) }; }) }));
export const odalar = ['1+1', '2+1', '3+1', '4+1'].map((o) => { const l = fiyatli.filter((m) => m.tip === 'prefabrik' && (m.oda || '').startsWith(o)); return { oda: o, n: l.length, med: q(l.map((m) => m.fiyat!), 0.5), m2: q(l.filter((m) => m.m2).map((m) => m.m2!), 0.5) }; });
export const kdv = { dahil: fiyatli.filter((m) => m.kdv === 'dahil').length, haric: fiyatli.filter((m) => m.kdv === 'haric').length, belirsiz: fiyatli.filter((m) => !m.kdv).length };
export const donem = meta.ay; // "Kasım 2026"
export const donemKod = meta.sonKontrol.slice(0, 7); // 2026-11

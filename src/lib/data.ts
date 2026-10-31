import firmsRaw from '../data/firms.json';
import modelsRaw from '../data/models.json';
import metaRaw from '../data/meta.json';

export type Kalem = 'dahil' | 'haric' | '';
export interface Firm {
  ad: string; kisaAd: string; slug: string; web: string; sehir: string; il: string; telefon: string;
  sertifikalar: string[]; sertifikaNotu: string; urunTipleri: string[]; kaynak: string[]; seviye: string;
  modelSayisi: number; enDusuk: number | null; tipler: string[]; fiyatYayinliyor: boolean;
}
export interface Model {
  firma: string; firmaAd: string; ad: string; slug: string; tip: string; m2: number | null; oda: string;
  kat: number | null; katRaw: string; fiyat: number | null; fiyatTuru: 'model' | 'm2' | 'yok'; m2Fiyat: number | null;
  kapsam: string; kdv: Kalem; nakliye: Kalem; montaj: Kalem; zemin: Kalem; teslim: string; uyari: string;
  kaynak: string; kontrol: string;
}
export interface TipInfo { ad: string; slug: string; baslik: string; kisa: string }

export const firms = firmsRaw as Firm[];
export const models = modelsRaw as Model[];
export const meta = metaRaw as {
  firmaSayisi: number; modelSayisi: number; fiyatliModel: number; sonKontrol: string; sonKontrolYazi: string; ay: string;
  tipler: Record<string, TipInfo>;
  istatistik: Record<string, { model: number; fiyatli: number; firma: number; min: number | null; max: number | null; medyan: number | null; m2Medyan: number | null }>;
};
export const TIPLER = meta.tipler;
export const TIP_KEYS = Object.keys(TIPLER);

export const firmBySlug = (s: string) => firms.find((f) => f.slug === s);
export const tipBySlug = (s: string) => TIP_KEYS.find((k) => TIPLER[k].slug === s);

const nf = new Intl.NumberFormat('tr-TR');
export const sayi = (n: number) => nf.format(n);
export const tl = (n: number | null | undefined) => (n == null ? '' : `${nf.format(n)} TL`);
export const kisaTl = (n: number | null | undefined) => {
  if (n == null) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} milyon TL`;
  if (n >= 1000) return `${Math.round(n / 1000).toLocaleString('tr-TR')} bin TL`;
  return tl(n);
};

export const odaSlug = (o: string) => o.replace('+', '-');
export const odaFromSlug = (s: string) => (/^\d-\d$/.test(s) ? s.replace('-', '+') : '');

export const modelUrl = (m: Model) => `/firma/${m.firma}/${m.slug}/`;
export const firmUrl = (f: { slug: string }) => `/firma/${f.slug}/`;
export const tipUrl = (tip: string) => `/${TIPLER[tip].slug}/`;

export function fiyatYazi(m: Model): string {
  if (m.fiyatTuru === 'm2' && m.fiyat) return `${tl(m.fiyat)} / m²`;
  if (m.fiyat) return tl(m.fiyat) + (m.kdv === 'haric' ? ' + KDV' : '');
  const eur = m.kapsam.match(/€\s?[\d.]+(?:\s?-\s?€?\s?[\d.]+)?|[\d.]+\s?€/);
  return eur ? `${eur[0].replace(/\s+/g, ' ')} (euro)` : 'Fiyat için teklif alın';
}

export function istatistik(list: Model[]) {
  const ps = list.filter((m) => m.fiyatTuru === 'model' && m.fiyat).map((m) => m.fiyat!) .sort((a, b) => a - b);
  const m2 = list.filter((m) => m.m2Fiyat).map((m) => m.m2Fiyat!).sort((a, b) => a - b);
  const med = (a: number[]) => (a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : Math.round((a[a.length / 2 - 1] + a[a.length / 2]) / 2)) : null);
  return {
    model: list.length, fiyatli: ps.length, firma: new Set(list.map((m) => m.firma)).size,
    min: ps[0] ?? null, max: ps.at(-1) ?? null, medyan: med(ps), m2Medyan: med(m2),
  };
}

export const sirala = (list: Model[]) =>
  [...list].sort((a, b) => {
    const pa = a.fiyatTuru === 'model' && a.fiyat ? a.fiyat : Number.MAX_SAFE_INTEGER;
    const pb = b.fiyatTuru === 'model' && b.fiyat ? b.fiyat : Number.MAX_SAFE_INTEGER;
    // Güncelliği şüpheli fiyatlar (uyarılı) listenin sonuna
    return (a.uyari ? 1 : 0) - (b.uyari ? 1 : 0) || pa - pb || (a.m2 ?? 0) - (b.m2 ?? 0);
  });

export const tipModelleri = (tip: string) => sirala(models.filter((m) => m.tip === tip));

// Oda sayfaları: en az 3 model olan oda tipleri
export function odaSayfalari(tip: string) {
  const c: Record<string, number> = {};
  for (const m of models) if (m.tip === tip && m.oda) c[m.oda] = (c[m.oda] || 0) + 1;
  return Object.entries(c).filter(([, n]) => n >= 3).map(([o]) => o).sort();
}

// m² sayfaları: hedef metrekareye ±%12 yakın en az 3 fiyatlı model
export const M2_HEDEFLER = [30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200];
export const m2Aralik = (h: number) => [Math.round(h * 0.88), Math.round(h * 1.12)] as const;
export function m2Modelleri(tip: string, h: number) {
  const [a, b] = m2Aralik(h);
  return sirala(models.filter((m) => m.tip === tip && m.m2 && m.m2 >= a && m.m2 <= b));
}
export function m2Sayfalari(tip: string) {
  return M2_HEDEFLER.filter((h) => m2Modelleri(tip, h).filter((m) => m.fiyatTuru === 'model' && m.fiyat).length >= 3);
}

export function benzerler(m: Model, n = 6) {
  return sirala(
    models.filter((x) => x !== m && x.tip === m.tip && x.firma !== m.firma && x.fiyatTuru === 'model' && x.fiyat &&
      (!m.m2 || !x.m2 || Math.abs(x.m2 - m.m2) <= Math.max(10, m.m2 * 0.2))),
  ).slice(0, n);
}

export const kalemYazi: Record<string, string> = { kdv: 'KDV', nakliye: 'Nakliye', montaj: 'Montaj', zemin: 'Zemin betonu' };

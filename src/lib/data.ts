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

// ---- Görseller ----
export const TIP_IMG: Record<string, string> = { prefabrik: 'prefabrik', celik: 'celik', konteyner: 'konteyner', 'tiny house': 'tiny-house', ahsap: 'ahsap', bungalov: 'bungalov' };
export const img = (k: string, w: 480 | 960 | 1344 | 'kare' = 960) => `/img/${k}-${w}.webp`;
export const tipImg = (tip: string, w: 480 | 960 | 'kare' = 960) => img(TIP_IMG[tip] || 'prefabrik', w);
// Aynı tipteki kartlarda görsel çeşitliliği: model kimliğine göre 3 varyanttan biri
export const varyant = (id: string) => ['', '-b', '-c'][[...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 3];
export const modelImg = (m: { tip: string; firma: string; slug: string }, w: 480 | 960) => `/img/${TIP_IMG[m.tip] || 'prefabrik'}${varyant(`${m.firma}/${m.slug}`)}-${w}.webp`;
export const TIP_ACIKLAMA: Record<string, string> = { prefabrik: 'En geniş seçenek', celik: 'Dayanıklı, villa tipi', konteyner: 'Hızlı ve ekonomik', 'tiny house': 'Tekerlekli, O2 belgeli', ahsap: 'Doğal ve sıcak', bungalov: 'Bağ ve tatil evi' };
export const TIP_SIRA = ['tiny house', 'prefabrik', 'ahsap', 'bungalov', 'celik', 'konteyner'];
export const modelId = (m: Model) => `${m.firma}/${m.slug}`;
export const monogram = (s: string) => s.split(/\s+/).filter((w) => /^[\p{L}\d]/u.test(w)).slice(0, 2).map((w) => w[0]).join('').toLocaleUpperCase('tr');
export function etiketler(m: Model) {
  const t: { c: 'd' | 'h' | 'b'; ad: string }[] = [];
  if (m.teslim) t.push({ c: /anahtar/i.test(m.teslim) ? 'd' : 'b', ad: m.teslim });
  for (const k of ['nakliye', 'montaj', 'zemin'] as const) {
    if (m[k] === 'dahil') t.push({ c: 'd', ad: `${kalemYazi[k]} dahil` });
    if (m[k] === 'haric') t.push({ c: 'h', ad: `${kalemYazi[k]} hariç` });
  }
  if (m.kdv === 'dahil') t.push({ c: 'd', ad: 'KDV dahil' });
  else if (m.kdv === 'haric') t.push({ c: 'h', ad: 'KDV hariç' });
  else t.push({ c: 'b', ad: 'KDV belirtilmemiş' });
  return t.slice(0, 4);
}
export const katYazi = (m: Model) => (m.kat === 2 ? 'Dubleks' : m.katRaw === 'loft' || m.kat === 1.5 ? 'Loftlu' : m.kat === 1 ? 'Tek kat' : '');
export const tarihYazi = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
export const ILLER = ['Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara','Antalya','Ardahan','Artvin','Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Iğdır','Isparta','İstanbul','İzmir','Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri','Kilis','Kırıkkale','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş','Nevşehir','Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun','Şanlıurfa','Siirt','Sinop','Sivas','Şırnak','Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat','Zonguldak'];
export const M2_ARALIK = [
  { k: '0-40', ad: '40 m² altı', alt: 'Tiny house, bağ evi', a: 0, b: 40 },
  { k: '40-70', ad: '40–70 m²', alt: '1+1 veya küçük 2+1', a: 40, b: 70 },
  { k: '70-100', ad: '70–100 m²', alt: 'Aile için 2+1 / 3+1', a: 70, b: 100 },
  { k: '100-150', ad: '100–150 m²', alt: 'Geniş 3+1, 4+1', a: 100, b: 150 },
  { k: '150-9999', ad: '150 m² üstü', alt: 'Villa, çift katlı', a: 150, b: 9999 },
];
export const ODA_SEC = [
  { k: '1+0', ad: '1+0 / Stüdyo', alt: 'Tek açık alan' }, { k: '1+1', ad: '1+1', alt: '1 yatak odası' }, { k: '2+1', ad: '2+1', alt: 'En çok tercih edilen' },
  { k: '3+1', ad: '3+1', alt: 'Kalabalık aile' }, { k: '4+1', ad: '4+1 ve üstü', alt: 'Villa tipi' },
];

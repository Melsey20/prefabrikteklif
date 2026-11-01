// Firmaların panelden güncellediği ve yönetimin onayladığı fiyat/fotoğrafları statik sayfalara canlı uygular.
export interface KatalogKayit { id: string; fiyat?: number | null; kdv?: string; gorseller?: string[]; ad?: string; firma?: string; firmaAd?: string; tip?: string; m2?: number | null; oda?: string; slug?: string; yeni?: boolean; teslim?: string; kapsam?: string }
let _k: Promise<Record<string, KatalogKayit>> | null = null;
export function katalog() {
  if (!_k) _k = fetch('/api/katalog').then((r) => (r.ok ? r.json() : { kayitlar: [] })).then((j) => Object.fromEntries((j.kayitlar || []).map((x: KatalogKayit) => [x.id, x]))).catch(() => ({}));
  return _k;
}
const tl = (n: number) => new Intl.NumberFormat('tr-TR').format(n) + ' TL';
const guvenli = (u: string) => /^https:\/\/[^\s"'<>]+$/i.test(u);
export async function katalogUygula(root: ParentNode = document) {
  const k = await katalog();
  root.querySelectorAll<HTMLElement>('[data-id]').forEach((el) => {
    if (el.tagName === 'BUTTON') return;
    const x = k[el.dataset.id!]; if (!x) return;
    if (x.fiyat) { const p = el.querySelector('[data-fiyat-yazi]'); if (p) p.textContent = tl(x.fiyat) + (x.kdv === 'haric' ? ' + KDV' : ''); el.dataset.fiyat = String(x.fiyat); }
    const g = x.gorseller?.find(guvenli);
    if (g) { const im = el.querySelector<HTMLImageElement>('[data-foto]'); if (im) { im.removeAttribute('srcset'); im.src = g; } el.querySelector('[data-tm]')?.remove(); }
  });
}

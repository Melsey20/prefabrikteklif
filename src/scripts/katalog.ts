// Firmaların panelden güncellediği ve yönetimin onayladığı fiyat/fotoğrafları statik sayfalara canlı uygular.
export interface KatalogKayit { id: string; gizli?: boolean; fiyat?: number | null; kdv?: string; gorseller?: string[]; ad?: string; firma?: string; firmaAd?: string; tip?: string; m2?: number | null; oda?: string; slug?: string; yeni?: boolean; teslim?: string; kapsam?: string }
let _k: Promise<Record<string, KatalogKayit>> | null = null;
let _j: Promise<any> | null = null;
const ham = () => (_j ||= fetch('/api/katalog').then((r) => (r.ok ? r.json() : { kayitlar: [] })).catch(() => ({ kayitlar: [] })));
export function katalog() {
  if (!_k) _k = ham().then((j) => Object.fromEntries((j.kayitlar || []).map((x: KatalogKayit) => [x.id, x])));
  return _k;
}
// Kurucu üye kampanyası: { toplam, kalan } (kampanya bittiyse kalan 0)
export async function kurucuBilgi(): Promise<{ toplam: number; kalan: number } | null> { return (await ham()).kurucu || null; }
// Üye firmalara rozet: [data-uye-rozet="slug"] öğeleri, firma üyeyse “Üye” ya da “Kurucu üye” yazısıyla görünür olur
export async function uyeRozetleri(root: ParentNode = document) {
  const k = await katalog() as Record<string, any>;
  root.querySelectorAll<HTMLElement>('[data-uye-rozet]').forEach((el) => { const u = k['uye:' + el.dataset.uyeRozet]; if (!u) return; el.textContent = u.kurucu ? '★ Kurucu üye' : '✓ Üye firma'; el.title = u.kurucu ? 'PrefabrikTeklif kurucu üyesi: belgeleri kontrol edilmiş firma' : 'Belgeleri kontrol edilmiş üye firma'; el.hidden = false; });
}
// Kampanya metni: [data-kurucu-yazi] öğelerine kalan kontenjanla yazılır, kampanya bittiyse gizlenir
export async function kurucuYazilari(root: ParentNode = document) {
  const b = await kurucuBilgi();
  root.querySelectorAll<HTMLElement>('[data-kurucu-yazi]').forEach((el) => { if (!b || b.kalan <= 0) { el.hidden = true; return; } el.textContent = `Kurucu üye kampanyası: ilk ${b.toplam} firmaya ilk ay ücretsiz. Kalan kontenjan: ${b.kalan}.`; el.hidden = false; });
}
const tl = (n: number) => new Intl.NumberFormat('tr-TR').format(n) + ' TL';
const guvenli = (u: string) => /^https:\/\/[^\s"'<>]+$/i.test(u);
export async function katalogUygula(root: ParentNode = document) {
  const k = await katalog();
  root.querySelectorAll<HTMLElement>('[data-id]').forEach((el) => {
    if (el.tagName === 'BUTTON') return;
    const id = el.dataset.id!;
    // Yayından kaldırılan model ya da firma (ör. üyelik sözleşmesine aykırılık): kartı gizle
    if (k[id]?.gizli || k['firma:' + id.split('/')[0]]?.gizli) { if (el.classList.contains('mcard') || el.tagName === 'TR' || el.tagName === 'LI') el.hidden = true; return; }
    const x = k[id]; if (!x) return;
    if (x.fiyat) { const p = el.querySelector('[data-fiyat-yazi]'); if (p) p.textContent = tl(x.fiyat) + (x.kdv === 'haric' ? ' + KDV' : ''); el.dataset.fiyat = String(x.fiyat); }
    const g = x.gorseller?.find(guvenli);
    if (g) { const im = el.querySelector<HTMLImageElement>('[data-foto]'); if (im) { im.removeAttribute('srcset'); im.src = g; } el.querySelector('[data-tm]')?.remove(); }
  });
}

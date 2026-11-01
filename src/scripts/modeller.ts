// İstemci tarafı model verisi ve kart çizimi (sihirbaz, karşılaştırma, favoriler)
import { katalog } from './katalog';
export interface M { id: string; f: string; fa: string; il: string; ad: string; t: string; m2: number | null; o: string; k: number | null; p: number | null; pt: string; pm: number | null; m2f: number | null; kdv: string; n: string; mo: string; z: string; ts: string; u: number; url: string; foto?: string }
let _m: Promise<M[]> | null = null;
export function modeller(): Promise<M[]> {
  if (!_m) _m = Promise.all([fetch('/data/modeller.json').then((r) => r.json()), katalog()]).then(([rows, k]: [M[], Record<string, any>]) => {
    const out = rows.map((m) => { const x = k[m.id]; if (!x) return m; return { ...m, p: x.fiyat ?? m.p, kdv: x.kdv ?? m.kdv, foto: (x.gorseller || []).find((u: string) => /^https:\/\//.test(u)) }; });
    for (const x of Object.values(k)) if (x.yeni) out.push({ id: x.id, f: x.firma, fa: x.firmaAd || x.firma, il: '', ad: x.ad, t: x.tip, m2: x.m2 ?? null, o: x.oda || '', k: null, p: x.fiyat ?? null, pt: x.fiyat ? 'model' : 'yok', pm: null, m2f: x.fiyat && x.m2 ? Math.round(x.fiyat / x.m2) : null, kdv: x.kdv || '', n: '', mo: '', z: '', ts: x.teslim || '', u: 0, url: `/model/?id=${encodeURIComponent(x.id)}`, foto: (x.gorseller || []).find((u: string) => /^https:\/\//.test(u)) });
    return out;
  });
  return _m;
}
export const TIP_IMG: Record<string, string> = { prefabrik: 'prefabrik', celik: 'celik', konteyner: 'konteyner', 'tiny house': 'tiny-house', ahsap: 'ahsap', bungalov: 'bungalov' };
export const TIP_AD: Record<string, string> = { prefabrik: 'Prefabrik ev', celik: 'Hafif çelik ev', konteyner: 'Konteyner ev', 'tiny house': 'Tiny house', ahsap: 'Ahşap ev', bungalov: 'Bungalov / bağ evi' };
const nf = new Intl.NumberFormat('tr-TR');
export const tl = (n: number) => nf.format(n) + ' TL';
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function fiyatYazi(m: M) {
  if (m.p) return tl(m.p) + (m.kdv === 'haric' ? ' + KDV' : '');
  if (m.pm) return tl(m.pm) + ' / m²';
  return 'Fiyat için teklif alın';
}
export function etiket(m: M) {
  const t: [string, string][] = [];
  if (m.ts) t.push([/anahtar/i.test(m.ts) ? 'd' : 'b', m.ts]);
  ([['n', 'Nakliye'], ['mo', 'Montaj'], ['z', 'Zemin']] as const).forEach(([k, ad]) => { const v = (m as any)[k]; if (v === 'dahil') t.push(['d', `${ad} dahil`]); if (v === 'haric') t.push(['h', `${ad} hariç`]); });
  t.push(m.kdv === 'dahil' ? ['d', 'KDV dahil'] : m.kdv === 'haric' ? ['h', 'KDV hariç'] : ['b', 'KDV belirtilmemiş']);
  return t.slice(0, 4);
}
export const varyant = (id: string) => ['', '-b', '-c'][[...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 3];
export function kart(m: M) {
  const im = (TIP_IMG[m.t] || 'prefabrik') + varyant(m.id);
  const foto = m.foto ? `<img src="${esc(m.foto)}" alt="" loading="lazy" decoding="async">` : `<img src="/img/${im}-480.webp" srcset="/img/${im}-480.webp 480w, /img/${im}-960.webp 960w" sizes="(max-width: 700px) 92vw, 320px" alt="" width="480" height="300" loading="lazy" decoding="async"><span class="tm">Temsili görsel</span>`;
  const spec = [m.m2 ? `${nf.format(m.m2)} m²` : '', m.o, m.k === 2 ? 'Dubleks' : m.k === 1 ? 'Tek kat' : ''].filter(Boolean).map((s) => `<span>${esc(s)}</span>`).join('');
  return `<article class="mcard" data-id="${esc(m.id)}"><div class="ph">${foto}<button class="fav" type="button" data-id="${esc(m.id)}" aria-label="Favorilere ekle" aria-pressed="false"><svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button></div>
<div class="bd"><span class="fr">${esc(m.fa)}${m.il ? ' · ' + esc(m.il) : ''}</span><h3><a href="${esc(m.url)}">${esc(m.ad)}</a></h3><div class="spec">${spec}</div>
<ul class="tags">${etiket(m).map(([c, a]) => `<li class="${c}">${esc(a)}</li>`).join('')}</ul>${m.u ? '<p class="warn">Fiyatın güncelliği şüpheli</p>' : ''}
<div class="pr"><span><strong>${esc(fiyatYazi(m))}</strong>${m.m2f ? `<span class="m2">${nf.format(m.m2f)} TL / m²</span>` : ''}</span><label class="cmp"><input type="checkbox" data-cmp="${esc(m.id)}"> Karşılaştır</label></div></div></article>`;
}

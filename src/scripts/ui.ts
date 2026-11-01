// Panellerde kullanılan küçük DOM yardımcıları (innerHTML yerine güvenli oluşturma)
type Kid = Node | string | number | null | undefined | false | Kid[];
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, at: Record<string, any> = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(at)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'class') el.className = v;
    else if (k in el && typeof v !== 'string') (el as any)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  const ekle = (c: Kid) => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(ekle); else el.append(c instanceof Node ? c : String(c)); };
  kids.forEach(ekle);
  return el;
}
export const tl = (n: number | null | undefined) => (n == null ? '' : new Intl.NumberFormat('tr-TR').format(n) + ' TL');
export const tarih = (ms: number) => (ms ? new Date(ms).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
export const kalan = (ms: number) => { const s = Math.round((ms - Date.now()) / 3600000); return s > 0 ? `${s} saat kaldı` : 'Süre doldu'; };
export function toast(msg: string) { const t = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(t); setTimeout(() => t.remove(), 2800); }
export function modal(baslik: string, govde: Node, { kapat }: { kapat?: () => void } = {}) {
  const k = () => { d.remove(); document.body.style.overflow = ''; kapat?.(); };
  const d = h('div', { class: 'dlg', onclick: (e: Event) => { if (e.target === d) k(); } },
    h('div', { class: 'in', role: 'dialog', 'aria-modal': 'true', 'aria-label': baslik },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' } }, h('h2', { style: { margin: 0, fontSize: '1.2rem' } }, baslik), h('button', { class: 'hicon', type: 'button', 'aria-label': 'Kapat', onclick: k }, '✕')),
      govde));
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { k(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);
  document.body.append(d); document.body.style.overflow = 'hidden';
  (d.querySelector('input,select,textarea,button') as HTMLElement)?.focus();
  return k;
}
export const alan = (etiket: string, input: HTMLElement) => h('label', { class: 'f' }, etiket, input);
export function sekmeler(kok: HTMLElement, onSec: (id: string) => void) {
  const btns = [...kok.querySelectorAll<HTMLButtonElement>('[data-sekme]')];
  const sec = (id: string) => { btns.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.sekme === id))); document.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== id)); history.replaceState(null, '', '#' + id); onSec(id); };
  btns.forEach((b) => b.addEventListener('click', () => sec(b.dataset.sekme!)));
  const ilk = location.hash.slice(1); sec(btns.some((b) => b.dataset.sekme === ilk) ? ilk : btns[0].dataset.sekme!);
  return sec;
}
export function hataGoster(kutu: HTMLElement, e: any) { kutu.replaceChildren(h('div', { class: 'empty' }, e?.message || 'Bir hata oluştu.')); }

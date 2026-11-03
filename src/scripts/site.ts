// Tüm sayfalarda çalışan küçük betik: menü, favoriler, karşılaştırma, slider, çerez onayı ve Analytics.
const LS = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yok */ } },
};
export const MAKS_KIYAS = 5;
const ev = (n: string, d?: unknown) => window.dispatchEvent(new CustomEvent(n, { detail: d }));

export function toast(msg: string) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}

// ---- Favoriler & karşılaştırma (localStorage; giriş yapan kullanıcıda hesap sayfası senkronlar) ----
export const favs = () => LS.get<string[]>('pt_fav', []);
export const cmps = () => LS.get<string[]>('pt_cmp', []);
export function setFavs(v: string[]) { LS.set('pt_fav', [...new Set(v)].slice(0, 200)); LS.set('pt_fav_t', Date.now()); draw(); ev('pt:fav'); }
export function setCmps(v: string[]) { LS.set('pt_cmp', [...new Set(v)].slice(0, MAKS_KIYAS)); draw(); ev('pt:cmp'); }

function draw() {
  const f = favs(), c = cmps();
  document.querySelectorAll<HTMLElement>('[data-cnt=fav]').forEach((e) => (e.textContent = f.length ? String(f.length) : ''));
  document.querySelectorAll<HTMLElement>('[data-cnt=cmp]').forEach((e) => (e.textContent = c.length ? String(c.length) : (e.closest('.cbar') ? '0' : '')));
  document.querySelectorAll<HTMLButtonElement>('button.fav[data-id]').forEach((b) => {
    const on = f.includes(b.dataset.id!);
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Favorilerden çıkar' : 'Favorilere ekle');
  });
  document.querySelectorAll<HTMLInputElement>('input[data-cmp]').forEach((i) => (i.checked = c.includes(i.dataset.cmp!)));
  const bar = document.getElementById('cbar');
  if (bar) bar.classList.toggle('on', c.length > 0 && !document.body.classList.contains('no-cbar'));
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const fb = t.closest<HTMLButtonElement>('button.fav[data-id]');
  if (fb) {
    e.preventDefault();
    const id = fb.dataset.id!, f = favs(), on = f.includes(id);
    setFavs(on ? f.filter((x) => x !== id) : [...f, id]);
    toast(on ? 'Favorilerden çıkarıldı' : 'Favorilere eklendi');
    window.gtag?.('event', on ? 'favori_cikar' : 'favori_ekle', { model: id });
    return;
  }
  if (t.closest('[data-drawer-open]')) { const d = document.getElementById('drawer')!; d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; d.querySelector<HTMLElement>('[data-drawer-close]')?.focus(); return; }
  if (t.closest('[data-drawer-close]') || t.id === 'drawer') { const d = document.getElementById('drawer')!; d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; return; }
  const mmb = t.closest<HTMLButtonElement>('#mm > button');
  const mm = document.getElementById('mm');
  if (mmb && mm) { const o = !mm.classList.contains('open'); mm.classList.toggle('open', o); mmb.setAttribute('aria-expanded', String(o)); return; }
  if (mm?.classList.contains('open') && !t.closest('#mm')) { mm.classList.remove('open'); mm.querySelector('button')?.setAttribute('aria-expanded', 'false'); }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const mm = document.getElementById('mm'); if (mm?.classList.contains('open')) { mm.classList.remove('open'); mm.querySelector('button')?.focus(); }
  const d = document.getElementById('drawer'); if (d?.classList.contains('open')) (d.querySelector('[data-drawer-close]') as HTMLElement)?.click();
});
document.addEventListener('change', (e) => {
  const i = e.target as HTMLInputElement;
  if (!i.dataset?.cmp) return;
  const c = cmps(), id = i.dataset.cmp;
  if (i.checked && !c.includes(id)) {
    if (c.length >= MAKS_KIYAS) { i.checked = false; toast(`En fazla ${MAKS_KIYAS} ev karşılaştırabilirsiniz`); return; }
    setCmps([...c, id]);
  } else if (!i.checked) setCmps(c.filter((x) => x !== id));
});
window.addEventListener('storage', (e) => { if (e.key === 'pt_fav' || e.key === 'pt_cmp') draw(); });

// ---- Hesap düğmesi ----
const u = LS.get<{ ad?: string; rol?: string } | null>('pt_user', null);
document.querySelectorAll<HTMLAnchorElement>('[data-hesap]').forEach((a) => {
  if (!u) return;
  a.href = u.rol === 'firma' ? '/firma-paneli/' : u.rol === 'admin' ? '/yonetim/' : '/hesabim/';
  const l = a.querySelector('.lbl'); if (l) l.textContent = u.rol === 'firma' ? 'Firma paneli' : u.rol === 'admin' ? 'Yönetim' : 'Hesabım';
  a.setAttribute('aria-label', 'Hesabım');
});

// ---- Slider ----
// Slaytlar sonradan eklenebilir (sponsorlu bannerlar): elemana 'pt:yenile' olayı gönderilince noktalar yeniden kurulur.
document.querySelectorAll<HTMLElement>('[data-slider]').forEach((s) => {
  const track = s.querySelector<HTMLElement>('.slides')!; const dotBox = s.querySelector<HTMLElement>('.dots');
  let dots: HTMLButtonElement[] = []; let n = 0; let i = 0; let timer: number | undefined; let durdu = false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isaretle = (k: number) => dots.forEach((d, j) => { d.classList.toggle('on', j === k); d.setAttribute('aria-current', String(j === k)); });
  const go = (k: number) => { if (!n) return; i = (k + n) % n; track.scrollTo({ left: track.clientWidth * i, behavior: 'smooth' }); };
  const stop = () => { durdu = true; if (timer) clearInterval(timer); timer = undefined; };
  const kur = () => {
    const sl = [...track.children] as HTMLElement[]; n = sl.length;
    sl.forEach((x, k) => x.setAttribute('aria-label', `${k + 1} / ${n}`));
    if (dotBox) {
      dotBox.replaceChildren(...sl.map((_, k) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', `${k + 1}. slayt`); b.addEventListener('click', () => { go(k); stop(); }); return b; }));
      dotBox.hidden = n < 2; dots = [...dotBox.querySelectorAll('button')];
    }
    i = Math.min(i, n - 1); isaretle(i);
    if (timer) clearInterval(timer); timer = undefined;
    if (!reduce && !durdu && n > 1) timer = window.setInterval(() => { if (!document.hidden) go(i + 1); }, Number(s.dataset.sure) || 6500);
  };
  track.addEventListener('scroll', () => { const k = Math.round(track.scrollLeft / track.clientWidth); isaretle(k); i = k; }, { passive: true });
  s.addEventListener('pointerdown', stop); s.addEventListener('focusin', stop);
  s.addEventListener('pt:yenile', kur);
  kur();
});

// ---- Çerez onayı + Google Analytics 4 (ölçüm kimliği Firebase'den gelir) ----
declare global { interface Window { dataLayer: unknown[]; gtag?: (...a: unknown[]) => void } }
async function gaYukle() {
  try {
    const cfg = await (await fetch('/__/firebase/init.json')).json();
    const id = cfg.measurementId; if (!id) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
    window.gtag('config', id, { anonymize_ip: true });
    const sc = document.createElement('script'); sc.async = true; sc.src = `https://www.googletagmanager.com/gtag/js?id=${id}`; document.head.appendChild(sc);
  } catch { /* yerel geliştirme */ }
}
const onay = LS.get<string | null>('pt_consent', null);
const cb = document.getElementById('consent');
if (onay === '1') gaYukle();
else if (onay === null && cb) cb.hidden = false;
cb?.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-consent]'); if (!b) return;
  LS.set('pt_consent', b.dataset.consent); cb.hidden = true; if (b.dataset.consent === '1') gaYukle();
});
document.addEventListener('submit', (e) => { const f = e.target as HTMLFormElement; if (f.dataset.ga) window.gtag?.('event', f.dataset.ga); });

window.addEventListener('pt:draw', draw);
draw();

// ---- Alt bilgideki "Bize yazın" formu ----
document.getElementById('by-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target as HTMLFormElement; const durum = document.getElementById('by-durum')!;
  const d = Object.fromEntries(new FormData(f)) as Record<string, string>;
  const goster = (m: string, ok = false) => { durum.textContent = m; durum.hidden = false; durum.style.color = ok ? 'var(--green-d)' : 'var(--red)'; };
  if (!d.ad?.trim() || !/^\S+@\S+\.\S+$/.test(d.eposta || '') || (d.mesaj || '').trim().length < 5) return goster('Adınızı, e-postanızı ve mesajınızı yazın.');
  const btn = f.querySelector('button')!; btn.disabled = true;
  try {
    const r = await fetch('/api/iletisim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...d, sayfa: location.pathname }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.hata || 'Gönderilemedi, lütfen tekrar deneyin.');
    f.reset(); goster('Teşekkürler, mesajınız ekibimize ulaştı.', true);
  } catch (err: any) { goster(err.message); } finally { btn.disabled = false; }
});

// ---- Yatay kaydırmalı sıralar: sağ/sol oklar ve yavaş otomatik kayma ----
(() => {
  const azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll<HTMLElement>('.hscroll').forEach((sc) => {
    if (sc.dataset.oklu || sc.children.length < 2) return;
    sc.dataset.oklu = '1';
    const kap = document.createElement('div'); kap.className = 'hs-kap';
    sc.parentNode!.insertBefore(kap, sc); kap.append(sc);
    let bekle = 0;
    const dur = (ms: number) => { bekle = Date.now() + ms; };
    const ok = (yon: -1 | 1) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'hs-ok ' + (yon < 0 ? 'sol' : 'sag');
      b.setAttribute('aria-label', yon < 0 ? 'Önceki' : 'Sonraki');
      b.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="${yon < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}"/></svg>`;
      b.addEventListener('click', () => { kaydir(yon); dur(8000); });
      kap.append(b); return b;
    };
    const adim = () => { const c = sc.children[0] as HTMLElement; return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(sc).columnGap || '16') : sc.clientWidth; };
    const sonda = () => sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 8;
    const kaydir = (yon: number) => {
      if (yon > 0 && sonda()) sc.scrollTo({ left: 0, behavior: 'smooth' });
      else if (yon < 0 && sc.scrollLeft <= 4) sc.scrollTo({ left: sc.scrollWidth, behavior: 'smooth' });
      else sc.scrollBy({ left: yon * adim(), behavior: 'smooth' });
    };
    const sol = ok(-1), sag = ok(1);
    const guncelle = () => { const tasar = sc.scrollWidth > sc.clientWidth + 8; sol.hidden = sag.hidden = !tasar; };
    guncelle(); addEventListener('resize', guncelle);
    // Otomatik kayma: görünürken, fare/odak/dokunma yokken birer kart ilerler
    if (azHareket) return;
    let gorunur = false, t: number | undefined;
    ['pointerenter', 'focusin', 'touchstart'].forEach((e) => kap.addEventListener(e, () => dur(1e9), { passive: true }));
    ['pointerleave', 'focusout', 'touchend'].forEach((e) => kap.addEventListener(e, () => dur(4000), { passive: true }));
    new IntersectionObserver((g) => { gorunur = g[0].isIntersecting; }, { threshold: 0.4 }).observe(sc);
    t = window.setInterval(() => { if (gorunur && !document.hidden && Date.now() > bekle && sc.scrollWidth > sc.clientWidth + 8) kaydir(1); }, 4500);
    void t;
  });
})();

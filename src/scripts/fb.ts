// Firebase istemcisi: yapılandırma Hosting'in /__/firebase/init.json adresinden gelir.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile, signOut, type User, type Auth } from 'firebase/auth';

let _app: Promise<FirebaseApp> | null = null;
let _auth: Auth | null = null;
async function fbApp() {
  if (!_app) _app = fetch('/__/firebase/init.json').then((r) => { if (!r.ok) throw new Error('Yapılandırma alınamadı'); return r.json(); }).then((c) => {
    // Giriş penceresi sitenin kendi alan adından açılsın (Safari/iOS ve üçüncü taraf çerez engelinde Google girişi böyle sorunsuz çalışır)
    if (/(^|\.)prefabrikteklif\.com\.tr$/.test(location.hostname)) c.authDomain = location.hostname;
    return initializeApp(c);
  });
  return _app;
}
export async function auth() { if (!_auth) { _auth = getAuth(await fbApp()); _auth.languageCode = 'tr'; } return _auth; }
export async function kullanici(): Promise<User | null> {
  const a = await auth();
  return new Promise((ok) => { const un = onAuthStateChanged(a, (u) => { un(); ok(u); }); });
}
export async function token(zorla = false) { const u = await kullanici(); return u ? u.getIdToken(zorla) : null; }

export class ApiHata extends Error { constructor(public kod: number, m: string) { super(m); } }
export async function api<T = any>(yol: string, body?: unknown, method?: string): Promise<T> {
  const t = await token();
  const r = await fetch(yol, { method: method || (body ? 'POST' : 'GET'), headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiHata(r.status, j.hata || 'Bir hata oluştu.');
  return j as T;
}

const HATALAR: Record<string, string> = {
  'auth/invalid-credential': 'E-posta veya şifre hatalı.', 'auth/wrong-password': 'E-posta veya şifre hatalı.', 'auth/user-not-found': 'Bu e-postayla kayıt bulunamadı.',
  'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı. Giriş yapın ya da şifrenizi sıfırlayın.', 'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
  'auth/invalid-email': 'Geçerli bir e-posta yazın.', 'auth/too-many-requests': 'Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.',
  'auth/popup-closed-by-user': 'Giriş penceresi kapatıldı.', 'auth/network-request-failed': 'İnternet bağlantınızı kontrol edin.',
  'auth/operation-not-allowed': 'Bu giriş yöntemi henüz açılmadı.', 'auth/unauthorized-domain': 'Bu alan adı giriş için yetkilendirilmemiş.',
};
export const hataYazi = (e: any) => HATALAR[e?.code] || e?.message || 'Bir hata oluştu.';

export async function googleGiris() {
  const a = await auth(); const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  try { return (await signInWithPopup(a, p)).user; } catch (e: any) { if (e?.code === 'auth/popup-blocked') { await signInWithRedirect(a, p); return null; } throw e; }
}
// Yönlendirmeli girişten dönüşte sonucu/hatayı al
export async function yonlendirmeSonucu() { try { return (await getRedirectResult(await auth()))?.user ?? null; } catch (e) { throw e; } }
export async function epostaGiris(e: string, s: string) { return (await signInWithEmailAndPassword(await auth(), e, s)).user; }
export async function kayitOl(e: string, s: string, ad: string) {
  const u = (await createUserWithEmailAndPassword(await auth(), e, s)).user;
  if (ad) await updateProfile(u, { displayName: ad });
  await sendEmailVerification(u, { url: location.origin + '/giris/?dogrulandi=1' });
  return u;
}
export async function dogrulamaGonder() { const u = await kullanici(); if (u) await sendEmailVerification(u, { url: location.origin + '/giris/?dogrulandi=1' }); }
export async function sifreSifirla(e: string) { await sendPasswordResetEmail(await auth(), e, { url: location.origin + '/giris/' }); }
export async function cikis() { await signOut(await auth()); try { localStorage.removeItem('pt_user'); } catch { /* */ } }

export interface Ben { uid: string; eposta: string; dogrulandi: boolean; ad: string; rol: 'kullanici' | 'firma' | 'admin'; firma: string | null }
// Girişten sonra: rolü al, favorileri hesapla birleştir
export async function oturumAc(): Promise<Ben | null> {
  const u = await kullanici(); if (!u) return null;
  const ben = await api<Ben>('/api/ben');
  try { localStorage.setItem('pt_user', JSON.stringify({ ad: u.displayName || ben.ad || '', eposta: ben.eposta, rol: ben.rol })); } catch { /* */ }
  try {
    const yerel = JSON.parse(localStorage.getItem('pt_fav') || '[]');
    const r = await api<{ favoriler: string[] }>('/api/favoriler', { favoriler: yerel });
    localStorage.setItem('pt_fav', JSON.stringify(r.favoriler)); window.dispatchEvent(new Event('pt:draw'));
  } catch { /* */ }
  return ben;
}
export const hedefSayfa = (b: Ben) => (b.rol === 'admin' ? '/yonetim/' : b.rol === 'firma' ? '/firma-paneli/' : '/hesabim/');

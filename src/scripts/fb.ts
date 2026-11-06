// Firebase istemcisi: yapılandırma Hosting'in /__/firebase/init.json adresinden gelir.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile, signOut, RecaptchaVerifier, signInWithPhoneNumber, signInWithCustomToken, type ConfirmationResult, type User, type Auth } from 'firebase/auth';

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
let _tazelendi: Promise<void> | null = null;
// E-posta başka sekmede/telefonda doğrulandıysa oturumdaki bilgi eski kalır: sayfa başına bir kez yenile, doğrulandıysa token'ı da tazele
async function dogrulamaTazele(u: User) {
  if (u.emailVerified) return;
  if (!_tazelendi) _tazelendi = u.reload().then(async () => { if (u.emailVerified) await u.getIdToken(true); }).catch(() => {});
  await _tazelendi;
}
export async function kullanici(): Promise<User | null> {
  const a = await auth();
  const u = await new Promise<User | null>((ok) => { const un = onAuthStateChanged(a, (x) => { un(); ok(x); }); });
  if (u) await dogrulamaTazele(u);
  return u;
}
export async function dogrulamaKontrol() { const u = await kullanici(); if (!u) return false; _tazelendi = null; await dogrulamaTazele(u); return u.emailVerified; }
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
  'auth/operation-not-allowed': 'Bu giriş yöntemi henüz açılmadı.', 'auth/invalid-phone-number': 'Telefon numarasını 05xx xxx xx xx biçiminde yazın.', 'auth/invalid-verification-code': 'Kod hatalı. SMS’teki 6 haneli kodu yazın.', 'auth/code-expired': 'Kodun süresi doldu, yeniden kod isteyin.', 'auth/quota-exceeded': 'Şu an SMS gönderilemiyor, biraz sonra tekrar deneyin ya da e-postayla girin.', 'auth/captcha-check-failed': 'Güvenlik doğrulaması başarısız oldu, sayfayı yenileyip tekrar deneyin.', 'auth/missing-phone-number': 'Telefon numaranızı yazın.', 'auth/unauthorized-domain': 'Bu alan adı giriş için yetkilendirilmemiş.',
};
export const hataYazi = (e: any) => HATALAR[e?.code] || e?.message || 'Bir hata oluştu.';

export async function googleGiris() {
  const a = await auth(); const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  try { return (await signInWithPopup(a, p)).user; } catch (e: any) { if (e?.code === 'auth/popup-blocked') { await signInWithRedirect(a, p); return null; } throw e; }
}
// Yönlendirmeli girişten dönüşte sonucu/hatayı al
export async function yonlendirmeSonucu() { try { return (await getRedirectResult(await auth()))?.user ?? null; } catch (e) { throw e; } }
// ---- Telefonla giriş (SMS kodu) ----
let _onay: ConfirmationResult | null = null; let _rc: RecaptchaVerifier | null = null;
export const telefonE164 = (t: string) => { const d = t.replace(/\D/g, ''); const s = d.startsWith('90') ? d.slice(2) : d.startsWith('0') ? d.slice(1) : d; return s.length === 10 && s.startsWith('5') ? '+90' + s : ''; };
// Önce kendi SMS servisimiz (İleti Merkezi) denenir; hazır değilse ya da gönderemezse Firebase'in SMS'i kullanılır.
let _kanal: 'sunucu' | 'firebase' = 'firebase'; let _tel = '';
export async function telefonKodGonder(numara: string, butonId: string): Promise<{ kanal: 'sunucu' | 'firebase'; ara: number }> {
  const n = telefonE164(numara); if (!n) throw Object.assign(new Error('Telefon numarasını 05xx xxx xx xx biçiminde yazın.'), { code: 'auth/invalid-phone-number' });
  let r: any = null;
  try { r = await api('/api/sms/kod', { telefon: n }); } catch (e) { if (e instanceof ApiHata && (e.kod === 400 || e.kod === 429)) throw e; /* diğer durumlarda (sunucu eski sürüm, ağ) Firebase SMS */ }
  if (r?.kanal === 'sunucu') { _kanal = 'sunucu'; _tel = n; return { kanal: 'sunucu', ara: r.ara || 60 }; }
  const a = await auth();
  if (!_rc) _rc = new RecaptchaVerifier(a, butonId, { size: 'invisible' });
  try { _onay = await signInWithPhoneNumber(a, n, _rc); } catch (e) { try { _rc.clear(); } catch { /* */ } _rc = null; throw e; }
  _kanal = 'firebase'; return { kanal: 'firebase', ara: 60 };
}
export async function telefonKodDogrula(kod: string) {
  const k = kod.replace(/\D/g, '');
  if (_kanal === 'sunucu') {
    const r = await api<{ token: string }>('/api/sms/dogrula', { telefon: _tel, kod: k });
    return (await signInWithCustomToken(await auth(), r.token)).user;
  }
  if (!_onay) throw new Error('Önce kod isteyin.'); return (await _onay.confirm(k)).user;
}

export async function epostaGiris(e: string, s: string) { return (await signInWithEmailAndPassword(await auth(), e, s)).user; }
export async function kayitOl(e: string, s: string, ad: string) {
  const u = (await createUserWithEmailAndPassword(await auth(), e, s)).user;
  if (ad) await updateProfile(u, { displayName: ad });
  await sendEmailVerification(u, { url: location.origin + '/giris/?dogrulandi=1' });
  return u;
}
export async function adGuncelle(ad: string) { const u = await kullanici(); if (u) { await updateProfile(u, { displayName: ad }); await u.getIdToken(true); } }
export async function dogrulamaGonder() { const u = await kullanici(); if (u) await sendEmailVerification(u, { url: location.origin + '/giris/?dogrulandi=1' }); }
export async function sifreSifirla(e: string) { await sendPasswordResetEmail(await auth(), e, { url: location.origin + '/giris/' }); }
export async function cikis() { await signOut(await auth()); try { localStorage.removeItem('pt_user'); Object.keys(localStorage).filter((k) => k.startsWith('pt_hesap_')).forEach((k) => localStorage.removeItem(k)); } catch { /* */ } }

export interface Ben { uid: string; eposta: string; telefon?: string; dogrulandi: boolean; ad: string; rol: 'kullanici' | 'firma' | 'admin'; firma: string | null; onaylar?: Record<string, string> }
// Yasal metin sürümü (functions/app.js SOZLESME ile aynı tutulur). Sürüm değişince kullanıcıdan yeniden onay istenir.
export const SOZLESME_SURUM = '2026-11';
export const eksikOnaylar = (b: Ben) => (b.rol === 'firma' ? ['kullanici', 'kvkk', 'gizlilik', 'firma', 'abonelik'] : ['kullanici', 'kvkk', 'gizlilik']).filter((k) => b.onaylar?.[k] !== SOZLESME_SURUM);
export async function onayVer(belgeler: string[], tur = 'hesap', pazarlama = false) { await api('/api/onay', { belgeler: [...belgeler, ...(pazarlama ? ['pazarlama'] : [])], tur }); }
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

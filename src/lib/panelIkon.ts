// Yönetim ve firma paneli menü ikonları (24×24, çizgi)
const P: Record<string, string> = {
  onay: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  talep: '<path d="M4 13h4l2 3h4l2-3h4"/><path d="M5.5 5h13l1.5 8v6H4v-6z"/>',
  siparis: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/>',
  firma: '<path d="M3 21h18"/><path d="M5 21V5l8-2v18"/><path d="M13 9h6v12"/><path d="M8.5 8h1M8.5 12h1M8.5 16h1M16 13h.5M16 17h.5"/>',
  mesaj: '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l.9-4.4A8 8 0 1 1 20 12z"/>',
  reklam: '<path d="M4 10v4h3l6 4V6l-6 4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 6.5a8 8 0 0 1 0 11"/>',
  fiyat: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  urun: '<path d="M3 11 12 4l9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  uyelik: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z"/>',
  profil: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  ozet: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  kullanici: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  davet: '<path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/>',
};
export const ik = (ad: keyof typeof P | string) => `<svg class="pik" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[ad] || ''}</svg>`;

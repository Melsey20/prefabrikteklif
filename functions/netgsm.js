// Netgsm OTP SMS istemcisi (tek kullanımlık kod gönderimi).
// Kimlik bilgileri functions/.env dosyasında (GUNCELLE, ~/.prefabrik-netgsm dosyasından ekler). Boşsa telefonla girişte Firebase SMS kullanılır.
// Belge: https://www.netgsm.com.tr/dokuman/  (OTP SMS: POST https://api.netgsm.com.tr/sms/send/otp, XML)

const xmlKacis = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

// Netgsm OTP dönüş kodları
export const NETGSM_HATA = {
  20: 'Mesaj metni hatalı ya da çok uzun',
  30: 'Kullanıcı adı/şifre hatalı ya da API yetkisi veya IP izni yok',
  40: 'Mesaj başlığı (gönderici adı) tanımlı değil',
  41: 'Mesaj başlığı OTP için tanımlı değil',
  50: 'Abonelik OTP gönderimine kapalı',
  51: 'Abonelikte OTP SMS paketi yok',
  52: 'Numara hatalı',
  60: 'OTP SMS paketi tanımlı değil',
  70: 'Hatalı parametre',
  80: 'Gönderim sınırı aşıldı',
  100: 'Netgsm sistem hatası',
};

export function netgsmIstemci({ kullanici = '', sifre = '', baslik = '', appkey = '', fetch: fetchFn = globalThis.fetch, adres = 'https://api.netgsm.com.tr/sms/send/otp', zamanAsimi = 10000 } = {}) {
  const hazir = !!(kullanici && sifre && baslik);
  // no10: 5xxxxxxxxx biçiminde 10 hane. Dönüş: { ok, kod, is? }
  async function otp(no10, mesaj) {
    if (!hazir) return { ok: false, kod: 'ayar-yok' };
    const govde = `<?xml version="1.0" encoding="UTF-8"?><mainbody><header><usercode>${xmlKacis(kullanici)}</usercode><password>${xmlKacis(sifre)}</password><msgheader>${xmlKacis(baslik)}</msgheader>${appkey ? `<appkey>${xmlKacis(appkey)}</appkey>` : ''}</header><body><msg><![CDATA[${String(mesaj).replace(/]]>/g, '')}]]></msg><no>${xmlKacis(no10)}</no></body></mainbody>`;
    const ac = new AbortController(); const zt = setTimeout(() => ac.abort(), zamanAsimi);
    try {
      const r = await fetchFn(adres, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=UTF-8' }, body: govde, signal: ac.signal });
      const metin = await r.text();
      const kod = (/<code>\s*(\d+)\s*<\/code>/i.exec(metin) || [])[1] ?? (/^\s*(\d+)/.exec(metin) || [])[1] ?? '';
      const is = (/<jobID>\s*([^<\s]+)\s*<\/jobID>/i.exec(metin) || [])[1] || '';
      if (r.ok && Number(kod) === 0 && kod !== '') return { ok: true, kod: '0', is };
      return { ok: false, kod: kod || `http-${r.status}`, aciklama: NETGSM_HATA[Number(kod)] || '' };
    } catch (e) {
      return { ok: false, kod: e?.name === 'AbortError' ? 'zaman-asimi' : 'ag-hatasi' };
    } finally { clearTimeout(zt); }
  }
  return { hazir, otp, ad: 'netgsm' };
}

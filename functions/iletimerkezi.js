// İleti Merkezi SMS istemcisi (tek kullanımlık giriş kodu ve bilgilendirme SMS'i).
// Bilgiler functions/.env dosyasında (GUNCELLE, ~/.prefabrik-sms dosyasından ekler). Boşsa telefonla girişte Firebase SMS kullanılır.
// Belge: https://www.iletimerkezi.com/en/docs/api/send-sms  (POST https://api.iletimerkezi.com/v1/send-sms/json)

export const ILETIMERKEZI_HATA = {
  400: 'İstek hatalı',
  401: 'API anahtarı/hash hatalı, API erişimi kapalı ya da IP izni yok',
  402: 'Bakiye yetersiz',
  450: 'Gönderici adı (başlık) onaylı değil',
  451: 'Tekrar eden sipariş',
  452: 'Mesaj alıcıları hatalı',
  453: 'Mesaj metni hatalı ya da çok uzun',
  466: 'Hatalı numara',
};

export function iletiMerkeziIstemci({ key = '', hash = '', baslik = '', fetch: fetchFn = globalThis.fetch, adres = 'https://api.iletimerkezi.com/v1/send-sms/json', zamanAsimi = 10000 } = {}) {
  const hazir = !!(key && hash && baslik);
  // no10: 5xxxxxxxxx biçiminde 10 hane. Dönüş: { ok, kod, is? }
  async function otp(no10, mesaj) {
    if (!hazir) return { ok: false, kod: 'ayar-yok' };
    // iys "0": giriş kodu bilgilendirme iletisidir, İYS onayı gerekmez
    const govde = { request: { authentication: { key, hash }, order: { sender: baslik, iys: '0', message: { text: String(mesaj), receipents: { number: [`90${no10}`] } } } } };
    const ac = new AbortController(); const zt = setTimeout(() => ac.abort(), zamanAsimi);
    try {
      const r = await fetchFn(adres, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(govde), signal: ac.signal });
      const j = await r.json().catch(() => ({}));
      const kod = Number(j?.response?.status?.code) || r.status;
      if (kod === 200) return { ok: true, kod: '200', is: String(j?.response?.order?.id || '') };
      return { ok: false, kod: String(kod), aciklama: ILETIMERKEZI_HATA[kod] || String(j?.response?.status?.message || '').slice(0, 120) };
    } catch (e) {
      return { ok: false, kod: e?.name === 'AbortError' ? 'zaman-asimi' : 'ag-hatasi' };
    } finally { clearTimeout(zt); }
  }
  return { hazir, otp, ad: 'iletimerkezi' };
}

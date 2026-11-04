// iyzico Abonelik API istemcisi (aylık firma üyeliği; kart bir kez kaydedilir, her ay otomatik çekilir)
// Belgeler: https://docs.iyzico.com — kimlik doğrulama IYZWSv2 (HMACSHA256)
import crypto from 'node:crypto';

export function iyzicoIstemci({ apiKey, secretKey, base, fetch: fetchFn = globalThis.fetch }) {
  const hazir = !!(apiKey && secretKey);
  async function istek(method, yol, govde) {
    if (!hazir) throw new Error('iyzico anahtarları tanımlı değil');
    const rnd = `${Date.now()}${crypto.randomBytes(6).toString('hex')}`;
    const body = govde ? JSON.stringify(govde) : '';
    const imza = crypto.createHmac('sha256', secretKey).update(rnd + yol.split('?')[0] + body).digest('hex');
    const yetki = Buffer.from(`apiKey:${apiKey}&randomKey:${rnd}&signature:${imza}`, 'utf8').toString('base64');
    const r = await fetchFn(`${base}${yol}`, { method, headers: { Authorization: `IYZWSv2 ${yetki}`, 'x-iyzi-rnd': rnd, 'Content-Type': 'application/json', Accept: 'application/json' }, body: body || undefined });
    const j = await r.json().catch(() => ({}));
    if (j.status !== 'success') { const e = new Error(j.errorMessage || `iyzico hatası (${r.status})`); e.kod = j.errorCode; throw e; }
    return j;
  }
  return {
    hazir,
    urunOlustur: (ad, aciklama) => istek('POST', '/v2/subscription/products', { locale: 'tr', name: ad, description: aciklama }),
    planOlustur: (urunKodu, ad, fiyat) => istek('POST', `/v2/subscription/products/${urunKodu}/pricing-plans`, { locale: 'tr', name: ad, price: fiyat, currencyCode: 'TRY', paymentInterval: 'MONTHLY', paymentIntervalCount: 1, planPaymentType: 'RECURRING' }),
    formBaslat: (o) => istek('POST', '/v2/subscription/checkoutform/initialize', { locale: 'tr', conversationId: o.conversationId, callbackUrl: o.callbackUrl, pricingPlanReferenceCode: o.planKodu, subscriptionInitialStatus: 'ACTIVE', customer: o.musteri }),
    formSonuc: (token) => istek('GET', `/v2/subscription/checkoutform/${encodeURIComponent(token)}`),
    abonelik: (kod) => istek('GET', `/v2/subscription/subscriptions/${encodeURIComponent(kod)}`),
    iptal: (kod) => istek('POST', `/v2/subscription/subscriptions/${encodeURIComponent(kod)}/cancel`, {}),
    kartGuncelleBaslat: (o) => istek('POST', '/v2/subscription/card-update/checkoutform/initialize', { locale: 'tr', callbackUrl: o.callbackUrl, subscriptionReferenceCode: o.abonelikKodu }),
    odemeTekrarla: (siparisKodu) => istek('POST', '/v2/subscription/operation/retry', { referenceCode: siparisKodu }),
  };
}

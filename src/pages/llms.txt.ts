import { SITE } from '../site.config';
import { meta, TIPLER, TIP_SIRA, kisaTl, sayi, firms } from '../lib/data';
import { yazilar } from '../lib/rehber';
// Yapay zekâ asistanları için site özeti (llmstxt.org biçimi)
export function GET() {
  const u = (p: string) => new URL(p, SITE.url).href;
  const tip = TIP_SIRA.filter((k) => meta.istatistik[k]).map((k) => { const s = meta.istatistik[k]; return `- [${TIPLER[k].baslik}](${u(`/${TIPLER[k].slug}/`)}): ${s.firma} firma, ${s.model} model; en düşük ${kisaTl(s.min)}, ortanca ${kisaTl(s.medyan)}${s.m2Medyan ? `, ortanca m² fiyatı ${sayi(s.m2Medyan)} TL` : ''}.`; }).join('\n');
  const txt = `# ${SITE.ad}

> ${SITE.ad} (${SITE.alanAdi}), Türkiye'deki prefabrik ev, tiny house, hafif çelik ev, konteyner ev, ahşap ev ve bungalov / bağ evi üreticilerinin fiyatlarını tek yerde karşılaştıran ve kullanıcıya ${SITE.teklifSaat} saat içinde birden çok firmadan ücretsiz teklif toplayan bağımsız bir platformdur. ${meta.firmaSayisi} üreticinin ${meta.modelSayisi} modeli listelenir; fiyatlar firmaların kendi sitelerinden alınır, her ay kontrol edilir (son kontrol: ${meta.sonKontrolYazi}).

Önemli bilgiler:
- Fiyat kıyaslama ve teklif alma kullanıcılar için ücretsizdir. Teklif talepleri firmalara isimsiz gider; kullanıcının iletişim bilgileri yalnızca fiyat vermeyi kabul eden firmayla paylaşılır.
- "Süreci siz yönetin" hizmetinde ${SITE.ad} ekibi firmayı kullanıcıyla birlikte seçer; keşif, sözleşme, üretim, nakliye, montaj ve teslim aşamalarını kullanıcı adına şeffaf şekilde takip eder. Bu hizmetin bedeli yalnızca ev bedelinin %${SITE.komisyon}'idir ve baştan yazılı bildirilir.
- Firmalar resmi evrakları (vergi levhası, ticaret sicil, imza sirküleri) ve referanslarıyla kabul edilir; referansı olmayan firma kaydedilmez. Müşteriyi mağdur eden firmanın kaydı silinir. Satış ve teslim sorumluluğu üretici firmadadır; kullanıcıların firmayı sözleşmeden önce teyit etmesi önerilir.
- Firmalar için aylık ${SITE.abonelik} TL üyelik vardır${SITE.kampanya.aktif ? ` (açılış kampanyası: ilk ${SITE.kampanya.kontenjan} firmaya 1 ay ücretsiz)` : ''}; komisyon alınmaz; reklam paketleri: ${SITE.reklam.map((p) => `${p.ad} ${p.fiyat.toLocaleString('tr-TR')} TL/ay`).join(', ')}.
- Listeler fiyata göre sıralanır; firmalar sıralama için ücret ödemez. Reklam alanları "Reklam" olarak işaretlenir.
- Her model sayfasında fiyata KDV, nakliye, montaj ve zemin betonunun dahil olup olmadığı ve fiyatın kaynağı yazar.
- Yorumlar yalnızca satın alma belgesiyle doğrulanan alıcılardan yayınlanır.
- İşleten: ${SITE.sirketUnvani}. İletişim: ${SITE.eposta}

## Fiyat sayfaları (${meta.ay})
${tip}

## Araçlar
- [Hangi evi arıyorsunuz? (sihirbaz)](${u('/evini-bul/')}): tip, m², oda, arsa durumu ve bütçeye göre uygun modelleri listeler.
- [Teklif al](${u('/teklif-al/')}): kriterlere uyan firmalardan ${SITE.teklifSaat} saatte teklif toplar.
- [Arazim uygun mu?](${u('/arazim-uygun-mu/')}): arsa durumuna göre uygun ev tipi ve izin yolu.
- [Firmalar](${u('/firmalar/')}): ${firms.length} üreticinin profili, ili ve model sayısı.

## Rehber
${yazilar.map((y) => `- [${y.baslik}](${u(y.url)}): ${y.aciklama}`).join('\n')}

## Hakkında
- [Nasıl çalışır?](${u('/nasil-calisir/')})
- [Sıralama nasıl yapılır?](${u('/siralama-nasil-yapilir/')})
- [Firma başvurusu](${u('/firma-kayit/')})
- [Reklam ver](${u('/reklam-ver/')})
- [Firma üyelik sözleşmesi](${u('/firma-uyelik-sozlesmesi/')})
- [Kullanım koşulları](${u('/kullanim-kosullari/')})
`;
  return new Response(txt, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

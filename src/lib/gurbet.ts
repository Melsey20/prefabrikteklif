// Yurt dışında yaşayan Türkler (gurbetçiler) için ülke sayfaları.
// Hedef kelimeler Semrush (Kasım 2026) ülke veritabanlarından: gurbetçiler ülke adı yazmadan Türkçe arıyor
// ("prefabrik evler", "prefabrik ev fiyatları", "köy evi modelleri"); ülke adı yalnızca sayfa adında ve metinde kullanılır.
import { models, sirala, type Model } from './data';

export interface Ulke {
  slug: string;
  ulke: string; // Almanya
  den: string; // Almanya'dan
  da: string; // Almanya'da
  hreflang: string; // tr-DE
  para: string; // Euro
  title: string;
  h1: string;
  desc: string;
  tip: string; // görsel
  vurgu: (m: Model) => boolean; // öne çıkan modeller
  vurguBaslik: string;
  giris: string;
  ozel: { b: string; t: string }[]; // ülkeye özel bilgi kutuları
  sss: { s: string; c: string }[];
}

const tekKat = (m: Model) => m.tip === 'prefabrik' && (m.kat ?? 1) === 1 && !!m.fiyat && (m.m2 ?? 0) >= 60 && (m.m2 ?? 0) <= 130;
const ORTAK_SSS = (u: { ulke: string; da: string; para: string }) => [
  { s: `${u.da} yaşarken Türkiye’de prefabrik ev yaptırabilir miyim?`, c: `Evet. Arsanızın tapusu ve imar durumu uygunsa ev Türkiye’de üretilir ve arsanıza kurulur; siz ${u.da} yaşamaya devam edersiniz. Ruhsat başvurusu, belediye ve elektrik-su abonelikleri için Türkiye’de bir yakınınıza ya da avukata vekaletname vermeniz yeterli. “Süreci biz yönetelim” seçeneğinde firma seçimi, sözleşme kontrolü, üretim ve montaj takibini ekibimiz yapar, her adımı hesabınızdan fotoğraflarla izlersiniz.` },
  { s: 'Ödemeyi nasıl yaparım?', c: `Ödemeyi doğrudan firmanın Türkiye’deki banka hesabına, ${u.para} hesabınızdan havale/SWIFT ile yaparsınız; ${'PrefabrikTeklif'} ev bedelini tahsil etmez. Ödemeyi tek seferde değil, sözleşmede üretim başlangıcı, nakliye, montaj ve teslim aşamalarına bölmenizi öneririz. Fiyatlar TL’dir; sözleşmede kurun hangi tarihe göre sabitleneceğini yazdırın.` },
  { s: 'Evi görmeden sipariş vermek güvenli mi?', c: 'Sitemizdeki üye firmaları vergi levhasıyla doğruluyor, gerektiğinde ek belge ve referans istiyoruz. Yine de firmanın Türkiye’deki fabrikasını veya teslim ettiği bir evi izin döneminizde görmenizi, olmuyorsa görüntülü görüşmeyle üretim alanını göstermesini isteyin. Süreç yönetiminde firmayı sizin adınıza biz ziyaret ederiz.' },
  { s: 'Ev ne kadar sürede biter?', c: 'Prefabrik ve çelik evlerde üretim ve montaj çoğunlukla 30-90 gün sürer; ruhsat ve zemin betonu süresi buna eklenir. İzin döneminizde anahtarı almak istiyorsanız siparişi en az 4-6 ay önce vermeniz ve ruhsat başvurusunu erkenden başlatmanız gerekir.' },
  { s: 'Köy evi veya tarla için prefabrik ev olur mu?', c: 'Köy yerleşik alanında ve imarlı arsada ruhsat alınarak yapılabilir. Tarım arazisinde (tarla) kalıcı ev için ruhsat ve elektrik-su aboneliği verilmez; tekerlekli, O2 belgeli tiny house farklı değerlendirilir. Arsanızın durumunu “Arazim uygun mu?” sayfasından kontrol edin.' },
];

export const ULKELER: Ulke[] = [
  {
    slug: 'almanyadan-turkiyeye-prefabrik-ev', ulke: 'Almanya', den: 'Almanya’dan', da: 'Almanya’da', hreflang: 'tr-DE', para: 'Euro',
    title: 'Almanya’dan Türkiye’ye Prefabrik Ev Fiyatları', h1: 'Almanya’dan Türkiye’ye prefabrik ev: fiyatları karşılaştırın, süreci biz yönetelim',
    desc: 'Almanya’dasınız, eviniz Türkiye’de olsun. Prefabrik, çelik ve konteyner ev fiyatlarını karşılaştırın, firmalardan teklif alın; süreci %5 hizmet bedeliyle biz yönetelim.',
    tip: 'prefabrik', vurgu: tekKat, vurguBaslik: 'Köy evi ve memleket evi için uygun tek katlı modeller',
    giris: 'Almanya’daki Türklerin en çok aradığı şey memlekette, kendi arsasına, izin döneminde hazır olacak bir ev. Prefabrik ve çelik evler bunun için en hızlı yol: ev fabrikada üretilir, arsaya birkaç haftada kurulur. Aşağıda Türkiye’deki üreticilerin güncel fiyatlarını karşılaştırabilir, tek formla teklif alabilir ya da tüm süreci uzaktan bize bırakabilirsiniz.',
    ozel: [
      { b: 'Uzaktan karar verin', t: 'Modelleri fiyat, m², oda sayısı ve neyin dahil olduğuna göre buradan karşılaştırın; teklifler 48 saat içinde e-postanıza ve hesabınıza gelir.' },
      { b: 'Ödeme aşamalara bölünsün', t: 'Euro hesabınızdan firmaya doğrudan ödersiniz. Üretim, nakliye, montaj ve teslime bölünmüş ödeme planını sözleşmeye yazdırın.' },
      { b: 'İzin dönemini kaçırmayın', t: 'Yaz izninde anahtarı almak için siparişi kış aylarında verin; ruhsat ve zemin betonu süresini hesaba katın.' },
    ],
    sss: [
      ...ORTAK_SSS({ ulke: 'Almanya', da: 'Almanya’da', para: 'Euro' }),
      { s: 'Almanya’dan vekaletnameyi nasıl veririm?', c: 'Bulunduğunuz bölgedeki Türk başkonsolosluğunda noter işlemleri yapılır. Ruhsat, abonelik ve tapu işlemleri için vekaletnamede bu yetkilerin açıkça yazmasına dikkat edin.' },
    ],
  },
  {
    slug: 'fransadan-turkiyeye-prefabrik-ev', ulke: 'Fransa', den: 'Fransa’dan', da: 'Fransa’da', hreflang: 'tr-FR', para: 'Euro',
    title: 'Fransa’dan Türkiye’ye Prefabrik Ev | Fiyat ve Teklif', h1: 'Fransa’dan Türkiye’ye prefabrik ev: görmeden güvenle alın',
    desc: 'Fransa’dan Türkiye’deki arsanıza prefabrik veya çelik ev mi? Firmaları tek formda karşılaştırın, 48 saatte teklif alın; kurulumu ekibimiz takip etsin.',
    tip: 'celik', vurgu: (m) => (m.tip === 'celik' || m.tip === 'konteyner') && !!m.fiyat, vurguBaslik: 'Çelik ve konteyner evlerde öne çıkan modeller',
    giris: 'Fransa’da yaşayıp Türkiye’de ev yaptırmak isteyenlerin en büyük kaygısı, evi görmeden para göndermek. Bu yüzden sitemizde her fiyatın kaynağı ve kontrol tarihi yazar, üye firmalar vergi levhasıyla doğrulanır. Çelik ve konteyner evler deprem dayanımı ve hızlı kurulumu nedeniyle yurt dışından sipariş verenlerin sık seçtiği tipler.',
    ozel: [
      { b: 'Deprem dayanımı', t: 'Çelik evler hafif ve esnek yapısıyla depreme dayanıklıdır; teklif alırken statik proje ve kullanılan profil kalınlığını sorun.' },
      { b: 'Kalem kalem karşılaştırma', t: 'Nakliye, montaj, zemin betonu ve iç bitiş dahil mi? Gelen teklifler aynı başlıklarla tek tabloda yan yana gelir.' },
      { b: 'Süreç takibi', t: 'Süreç yönetiminde her aşamanın fotoğrafı hesabınıza yüklenir; Fransa’dan adım adım izlersiniz.' },
    ],
    sss: [
      ...ORTAK_SSS({ ulke: 'Fransa', da: 'Fransa’da', para: 'Euro' }),
      { s: 'Konteyner ev kalıcı konut olarak kullanılabilir mi?', c: 'Yalıtımı ve tesisatı yapılmış konteyner ev, ruhsatı alınarak imarlı arsada kalıcı konut olabilir. Kış koşullarına göre yalıtım kalınlığını ve pencere tipini teklifte yazılı olarak isteyin.' },
    ],
  },
  {
    slug: 'avusturyadan-turkiyeye-prefabrik-ev', ulke: 'Avusturya', den: 'Avusturya’dan', da: 'Avusturya’da', hreflang: 'tr-AT', para: 'Euro',
    title: 'Avusturya’dan Türkiye’ye Prefabrik Ev ve Köy Evi', h1: 'Avusturya’dan Türkiye’ye prefabrik ve köy evi',
    desc: 'Avusturya’dan köyünüze ev yaptırmak artık kolay. Prefabrik ve çelik ev fiyatlarını karşılaştırın, teklif alın; süreci yerinde biz yönetelim.',
    tip: 'prefabrik', vurgu: (m) => tekKat(m) && /3\+1|2\+1/.test(m.oda || ''), vurguBaslik: 'Köy evi modelleri: tek katlı 2+1 ve 3+1',
    giris: 'Avusturya’daki gurbetçilerin aramalarında “köy evi modelleri” öne çıkıyor: köydeki arsaya, yazın kalınacak, kışın kapatılabilecek, bakımı kolay bir ev. Tek katlı 2+1 ve 3+1 prefabrik evler bu ihtiyaca en uygun ve en ekonomik çözüm. Aşağıda Türkiye’deki üreticilerin bu ölçülerdeki güncel fiyatları var.',
    ozel: [
      { b: 'Köy yerleşik alanı', t: 'Köy yerleşik alanında ruhsat süreci şehirdekinden farklıdır; önce köy muhtarlığından ve il özel idaresinden arsanın durumunu öğrenin.' },
      { b: 'Kışa hazırlık', t: 'Evde uzun süre yoksanız tesisatın donmaya karşı boşaltılabilmesini ve dış cephe yalıtımını teklifte isteyin.' },
      { b: 'Tek ziyaret yeter', t: 'İzninizde firmayı ve arsayı birlikte görün; sözleşme, üretim ve montajı biz takip edelim.' },
    ],
    sss: [
      ...ORTAK_SSS({ ulke: 'Avusturya', da: 'Avusturya’da', para: 'Euro' }),
      { s: 'Köy evi için en uygun tip hangisi?', c: 'Bütçe önceliğiniz varsa tek katlı prefabrik, deprem bölgesindeyseniz çelik ev, doğal görünüm istiyorsanız ahşap ev öne çıkar. Hepsinin fiyatlarını ilgili tip sayfalarında karşılaştırabilirsiniz.' },
    ],
  },
  {
    slug: 'hollandadan-turkiyeye-prefabrik-ev', ulke: 'Hollanda', den: 'Hollanda’dan', da: 'Hollanda’da', hreflang: 'tr-NL', para: 'Euro',
    title: 'Hollanda’dan Türkiye’ye Prefabrik Ev ve Villa Fiyatları', h1: 'Hollanda’dan Türkiye’ye prefabrik ev ve villa',
    desc: 'Hollanda’dan Türkiye’de ev sahibi olun. Prefabrik ev ve villa modellerini fiyatlarıyla karşılaştırın; tüm süreci %5 bedelle ekibimiz yönetsin.',
    tip: 'prefabrik', vurgu: (m) => !!m.fiyat && ((m.kat ?? 1) >= 2 || (m.m2 ?? 0) >= 120) && ['prefabrik', 'celik'].includes(m.tip), vurguBaslik: 'Dubleks ve villa tipi geniş modeller',
    giris: 'Hollanda’dan Türkiye’de ev yaptıranlar çoğunlukla emeklilik ya da yaz evi için geniş, dubleks veya villa tipi evler arıyor. Hazır villa almak yerine kendi arsanıza prefabrik veya çelik villa kurdurmak çoğu bölgede belirgin şekilde daha ekonomik. Aşağıda geniş modellerin güncel fiyatlarını görebilir, birden çok firmadan teklif alabilirsiniz.',
    ozel: [
      { b: 'Hazır villa mı, kendi arsanız mı?', t: 'Arsanız varsa prefabrik veya çelik villa, aynı büyüklükteki hazır villaya göre çoğunlukla daha düşük maliyetlidir; fark, teklifler gelince netleşir.' },
      { b: 'Anahtar teslim kapsam', t: 'Villa tekliflerinde mutfak, banyo, zemin kaplaması ve dış cephe dahil mi? Kapsamı yazılı isteyin.' },
      { b: 'Emeklilik planı', t: 'Taşınmayı düşünüyorsanız kalıcı konut ruhsatı ve doğalgaz/ısıtma çözümünü baştan planlayın.' },
    ],
    sss: [
      ...ORTAK_SSS({ ulke: 'Hollanda', da: 'Hollanda’da', para: 'Euro' }),
      { s: 'Prefabrik villa ne kadar dayanır?', c: 'Doğru zemin, yalıtım ve bakım ile prefabrik ve çelik evler onlarca yıl kullanılır. Firmalardan taşıyıcı sistem garantisini ve kullanılan malzemelerin belgelerini isteyin.' },
    ],
  },
  {
    slug: 'isvicreden-turkiyeye-prefabrik-ev', ulke: 'İsviçre', den: 'İsviçre’den', da: 'İsviçre’de', hreflang: 'tr-CH', para: 'İsviçre frangı veya Euro',
    title: 'İsviçre’den Türkiye’ye Prefabrik Ev Modelleri', h1: 'İsviçre’den Türkiye’ye prefabrik ev: modeller ve fiyatlar',
    desc: 'İsviçre’den Türkiye’ye prefabrik ev modelleri ve fiyatları tek sayfada. Firmalardan teklif alın, sözleşmeden teslime süreci biz yönetelim.',
    tip: 'ahsap', vurgu: (m) => !!m.fiyat && ['prefabrik', 'ahsap', 'celik'].includes(m.tip) && (m.m2 ?? 0) >= 70, vurguBaslik: 'Öne çıkan prefabrik, çelik ve ahşap ev modelleri',
    giris: 'İsviçre’den aramalarda “prefabrik ev modelleri” öne çıkıyor: kalite beklentisi yüksek, karar vermeden önce çok sayıda modeli görmek isteyen bir kitle. Bu sayfada Türkiye’deki üreticilerin modellerini m², oda sayısı ve neyin dahil olduğuyla birlikte karşılaştırabilirsiniz; her fiyatın yanında kaynağı ve kontrol tarihi yazar.',
    ozel: [
      { b: 'Malzeme ve işçilik', t: 'Yalıtım kalınlığı, pencere profili ve çatı malzemesini teklifte yazılı isteyin; aynı m²’deki iki fiyat bu kalemler yüzünden çok farklı olabilir.' },
      { b: 'Ahşap ev seçeneği', t: 'Doğal görünüm istiyorsanız ahşap evler de Türkiye’de üretiliyor; bakım gereksinimlerini firmayla konuşun.' },
      { b: 'Şeffaf süreç', t: 'Süreç yönetiminde firmadan sizin adınıza gizli komisyon almayız; bedelimiz yalnızca %5’tir ve sözleşmeden önce yazılı bildirilir.' },
    ],
    sss: [
      ...ORTAK_SSS({ ulke: 'İsviçre', da: 'İsviçre’de', para: 'İsviçre frangı veya Euro' }),
      { s: 'Prefabrik ev ile çelik ev arasındaki fark nedir?', c: 'Prefabrik evlerde duvarlar fabrikada panel olarak üretilir, çelik evlerde taşıyıcı sistem hafif çelik profildir. Çelik evler daha esnek planlanır ve depreme dayanıklılığıyla öne çıkar; prefabrik evler genellikle daha ekonomiktir.' },
    ],
  },
];
export const ulkeBul = (slug: string) => ULKELER.find((u) => u.slug === slug)!;
export const ulkeModelleri = (u: Ulke) => sirala(models.filter(u.vurgu)).slice(0, 12);

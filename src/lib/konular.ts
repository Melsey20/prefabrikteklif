// Arama hacmi yüksek, tip sayfalarının karşılamadığı sorgular için konu sayfaları.
// Kaynak: Google Ads Anahtar Kelime Planlayıcı (Türkiye, Türkçe, Kasım 2026). Tüm rakamlar sitedeki gerçek model verisinden hesaplanır.
import { models, firms, sirala, istatistik, kisaTl, sayi, TIPLER, type Model } from './data';

type S = ReturnType<typeof istatistik>;
export interface Konu {
  slug: string;
  baslik: string; // H1 (ay eklenir)
  kisa: string; // cümle içi ad
  tip: string; // görsel ve teklif formu için varsayılan tip
  filtre: (m: Model) => boolean;
  giris: (s: S, list: Model[]) => string;
  sss: (s: S, list: Model[]) => { s: string; c: string }[];
  ilgili: { ad: string; url: string }[];
  sira?: 'fiyat'; // listeyi fiyata göre artan sırala
  sehir?: string; // şehir sayfası (alt bilgideki “Çok arananlar” listesinde gösterilmez)
}

const tipSay = (list: Model[]) => {
  const c: Record<string, number> = {};
  for (const m of list) c[m.tip] = (c[m.tip] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${n} ${TIPLER[t]?.kisa ?? t}`).join(', ');
};
const aralik = (s: S) => (s.min && s.max ? `${kisaTl(s.min)} ile ${kisaTl(s.max)} arasında` : '');
const RUHSAT = { s: 'Ruhsat gerekir mi?', c: 'Zemine sabitlenen ve sürekli oturulan her ev yapı sayılır; imarlı arsa, onaylı proje ve yapı ruhsatı gerekir. Tarım arazisinde ve hobi bahçesinde yapılaşma ayrıca izne tabidir. Kurulumdan önce belediyenize ya da il müdürlüğüne danışın.' };
const DAHIL = { s: 'Liste fiyatına neler dahil?', c: 'Firmaya göre değişir. Çoğu fiyat bina ve montajı kapsar; zemin betonu, nakliye, vinç, ruhsat ve iç bitişler çoğunlukla ayrıdır. Her kartta dahil/hariç kalemler ayrıca işaretlenir; teklif alırken bunları yazılı isteyin.' };


const metin = (m: Model) => `${m.ad} ${m.kapsam}`.toLocaleLowerCase('tr');
const FIRMA_IL = new Map(firms.map((f) => [f.slug, f.il]));
function sehirKonu(il: string, slug: string): Konu {
  return {
    slug, sehir: il,
    baslik: `${il} Prefabrik Ev Fiyatları ve Firmaları`,
    kisa: `${il} prefabrik ev`,
    tip: 'prefabrik',
    filtre: (m) => FIRMA_IL.get(m.firma) === il,
    giris: (s, l) => `Merkezi ${il}’de bulunan ${s.firma} üreticinin ${s.model} modeli bu sayfada (${tipSay(l)}); fiyatlar ${aralik(s)}, ortanca fiyat ${kisaTl(s.medyan)}. Prefabrik ev üreticilerinin çoğu Türkiye’nin her yerine teslim ve montaj yapar; bu yüzden ${il} dışındaki firmaları da kıyaslamanızı öneririz. Teklif formunda kurulum ilini seçtiğinizde talebiniz o ile hizmet veren firmalara gider.`,
    sss: (s) => [
      { s: `${il} prefabrik ev fiyatları ne kadar?`, c: `Merkezi ${il}’de olan firmaların listemizdeki modellerinde fiyatlar ${aralik(s)}; ortanca fiyat ${kisaTl(s.medyan)}${s.m2Medyan ? `, ortanca m² fiyatı ${sayi(s.m2Medyan)} TL` : ''}. Nakliye mesafesi kısaldıkça nakliye ve montaj maliyeti genellikle düşer.` },
      { s: `${il} dışındaki bir firmadan ev alabilir miyim?`, c: 'Evet. Firmaların çoğu Türkiye geneline teslim yapar; nakliye ve montaj fiyata dahil mi, ayrı mı, teklifte mutlaka yazılı olsun. Aynı kapsamla birkaç firmadan fiyat alıp kıyaslayın.' },
      DAHIL, RUHSAT,
    ],
    ilgili: [{ ad: 'Tüm prefabrik ev fiyatları', url: '/prefabrik-ev-fiyatlari/' }, { ad: 'Prefabrik ev firmaları', url: '/firmalar/' }, { ad: 'Prefabrik ev ruhsatı nasıl alınır?', url: '/rehber/prefabrik-ev-ruhsati-nasil-alinir/' }, { ad: 'Arazim uygun mu?', url: '/arazim-uygun-mu/' }],
  };
}

export const KONULAR: Konu[] = [
  {
    slug: 'tek-katli-prefabrik-ev-fiyatlari',
    baslik: 'Tek Katlı Prefabrik Ev Fiyatları',
    kisa: 'tek katlı prefabrik ev',
    tip: 'prefabrik',
    filtre: (m) => m.kat === 1 && (m.tip === 'prefabrik' || m.tip === 'celik'),
    giris: (s, l) => `Tek katlı prefabrik ve çelik evler merdivensiz plan, kolay montaj ve daha düşük temel maliyeti nedeniyle en çok aranan model grubu. Listede ${s.firma} firmanın ${s.model} tek katlı modeli var (${tipSay(l)}); fiyatlar ${aralik(s)}, ortanca fiyat ${kisaTl(s.medyan)}. Aynı metrekarede bile kapsam farkı büyük olduğu için her fiyatın yanında neyin dahil olduğu gösteriliyor.`,
    sss: (s) => [
      { s: 'Tek katlı prefabrik ev fiyatları ne kadar?', c: `Listemizdeki tek katlı modellerde fiyatlar ${aralik(s)}; ortanca fiyat ${kisaTl(s.medyan)}${s.m2Medyan ? `, ortanca m² fiyatı ${sayi(s.m2Medyan)} TL` : ''}. Kesin fiyat; metrekare, iç bitiş ve nakliye mesafesine göre değişir.` },
      { s: 'Tek katlı mı dubleks mi daha ucuz?', c: 'Aynı kullanım alanında tek katlı ev daha geniş bir zemin betonu ve çatı ister; dubleks ise merdiven ve ara kat döşemesi ister. Küçük ve orta metrekarelerde tek katlı genellikle daha ekonomiktir; arsa dar ise dubleks avantajlı olabilir.' },
      DAHIL, RUHSAT,
    ],
    ilgili: [{ ad: 'Dubleks prefabrik ev', url: '/dubleks-prefabrik-ev-fiyatlari/' }, { ad: 'Anahtar teslim prefabrik ev', url: '/anahtar-teslim-prefabrik-ev-fiyatlari/' }, { ad: '2+1 prefabrik ev', url: '/prefabrik-ev-fiyatlari/2-1/' }, { ad: '3+1 prefabrik ev', url: '/prefabrik-ev-fiyatlari/3-1/' }],
  },
  {
    slug: 'dubleks-prefabrik-ev-fiyatlari',
    baslik: 'Dubleks (2 Katlı) Prefabrik Ev Fiyatları',
    kisa: 'dubleks prefabrik ev',
    tip: 'prefabrik',
    filtre: (m) => m.kat === 2,
    giris: (s, l) => `İki katlı (dubleks) prefabrik, çelik ve ahşap evler dar arsada geniş yaşam alanı sağlar; yatak odaları üst katta, yaşam alanı alt katta toplanır. Listede ${s.firma} firmanın ${s.model} dubleks modeli var (${tipSay(l)}); fiyatlar ${aralik(s)}, ortanca fiyat ${kisaTl(s.medyan)}.`,
    sss: (s) => [
      { s: 'Dubleks prefabrik ev fiyatları ne kadar?', c: `Listemizdeki iki katlı modellerde fiyatlar ${aralik(s)}; ortanca fiyat ${kisaTl(s.medyan)}${s.m2Medyan ? `, ortanca m² fiyatı ${sayi(s.m2Medyan)} TL` : ''}.` },
      { s: 'İki katlı prefabrik ev depreme dayanıklı mı?', c: 'Dayanıklılık, taşıyıcı sistemin statik hesabına ve zemin etüdüne bağlıdır. Türkiye Bina Deprem Yönetmeliği’ne göre hazırlanmış statik proje ve zemin etüdü raporunu firmadan yazılı isteyin; ruhsat aşamasında bu belgeler zaten zorunludur.' },
      DAHIL, RUHSAT,
    ],
    ilgili: [{ ad: 'Tek katlı prefabrik ev', url: '/tek-katli-prefabrik-ev-fiyatlari/' }, { ad: 'Prefabrik villa', url: '/prefabrik-villa-fiyatlari/' }, { ad: 'Çelik ev fiyatları', url: '/celik-ev-fiyatlari/' }, { ad: 'Prefabrik mi, çelik ev mi?', url: '/rehber/prefabrik-mi-celik-ev-mi/' }],
  },
  {
    slug: 'anahtar-teslim-prefabrik-ev-fiyatlari',
    baslik: 'Anahtar Teslim Prefabrik Ev Fiyatları',
    kisa: 'anahtar teslim prefabrik ev',
    tip: 'prefabrik',
    filtre: (m) => /anahtar/i.test(m.teslim || ''),
    giris: (s, l) => `Anahtar teslim evde firma; montaj, elektrik-su tesisatı, ıslak hacimler ve iç bitişleri tamamlayıp evi oturulmaya hazır teslim eder. Bu sayfada yalnızca firmanın kendi sitesinde “anahtar teslim” olarak sunduğu ${s.model} model var (${s.firma} firma; ${tipSay(l)}). Fiyatlar ${aralik(s)}, ortanca fiyat ${kisaTl(s.medyan)}.`,
    sss: (s) => [
      { s: 'Anahtar teslim prefabrik ev fiyatları ne kadar?', c: `Listemizdeki anahtar teslim modellerde fiyatlar ${aralik(s)}; ortanca fiyat ${kisaTl(s.medyan)}.` },
      { s: 'Anahtar teslime zemin betonu ve nakliye dahil mi?', c: '“Anahtar teslim” her firmada aynı kapsamı ifade etmez. Zemin betonu, nakliye, vinç, ruhsat ve altyapı bağlantıları çoğu zaman yine ayrıdır. Teklifte kalem kalem neyin dahil olduğunu yazılı isteyin.' },
      { s: 'Kaba teslim ile anahtar teslim farkı nedir?', c: 'Kaba (ya da ileri kaba) teslimde bina ayakta ve kapalıdır ama iç bitişler (parke, fayans, mutfak, vitrifiye, boya) alıcıya kalır. Anahtar teslimde bunlar firmaya aittir; fiyat farkı genellikle buradan gelir.' },
      RUHSAT,
    ],
    ilgili: [{ ad: 'Prefabrik ev fiyatına neler dahil?', url: '/rehber/prefabrik-ev-fiyatina-neler-dahil/' }, { ad: 'Tek katlı prefabrik ev', url: '/tek-katli-prefabrik-ev-fiyatlari/' }, { ad: 'Prefabrik ev m² fiyatları', url: '/prefabrik-ev-metrekare-fiyatlari/' }],
  },
  {
    slug: 'prefabrik-villa-fiyatlari',
    baslik: 'Prefabrik ve Çelik Villa Fiyatları',
    kisa: 'prefabrik villa',
    tip: 'celik',
    filtre: (m) => (m.tip === 'prefabrik' || m.tip === 'celik' || m.tip === 'ahsap') && (m.m2 ?? 0) >= 150,
    giris: (s, l) => `150 m² ve üstü prefabrik, çelik ve ahşap evler villa sınıfına girer; çoğu dubleks plana, geniş salona ve 4+1 ya da daha fazla odaya sahiptir. Listede ${s.firma} firmanın ${s.model} villa modeli var (${tipSay(l)}); fiyatlar ${aralik(s)}, ortanca fiyat ${kisaTl(s.medyan)}.`,
    sss: (s) => [
      { s: 'Prefabrik villa fiyatları ne kadar?', c: `Listemizdeki 150 m² ve üstü modellerde fiyatlar ${aralik(s)}; ortanca fiyat ${kisaTl(s.medyan)}${s.m2Medyan ? `, ortanca m² fiyatı ${sayi(s.m2Medyan)} TL` : ''}.` },
      { s: 'Villa için prefabrik mi çelik mi?', c: 'Büyük metrekare ve özel mimari istendiğinde hafif çelik (LGS) sistem plan esnekliği sağlar; panel prefabrik ise genellikle daha hızlı ve m² başına daha ekonomiktir. İki sistemi aynı kapsamla kıyaslamak için teklif alın.' },
      DAHIL, RUHSAT,
    ],
    ilgili: [{ ad: 'Çelik ev fiyatları', url: '/celik-ev-fiyatlari/' }, { ad: 'Dubleks prefabrik ev', url: '/dubleks-prefabrik-ev-fiyatlari/' }, { ad: '150 m² prefabrik ev', url: '/prefabrik-ev-fiyatlari/150-m2/' }],
  },
  {
    slug: 'bahce-evi-fiyatlari',
    baslik: 'Bahçe Evi ve Bağ Evi Fiyatları',
    kisa: 'bahçe evi',
    tip: 'bungalov',
    filtre: (m) => !!m.m2 && m.m2 <= 35 && m.tip !== 'celik',
    giris: (s, l) => `35 m²’ye kadar küçük evler bahçe evi, bağ evi ve hafta sonu evi olarak tercih ediliyor. Listede ${s.firma} firmanın ${s.model} modeli var (${tipSay(l)}); fiyatlar ${aralik(s)}, ortanca fiyat ${kisaTl(s.medyan)}. Konteyner en ekonomik seçenek; tiny house tekerlekli ve taşınabilir, ahşap ve bungalov modeller ise daha sıcak bir görünüm sunuyor.`,
    sss: (s) => [
      { s: 'Bahçe evi fiyatları ne kadar?', c: `Listemizdeki 35 m²’ye kadar modellerde fiyatlar ${aralik(s)}; ortanca fiyat ${kisaTl(s.medyan)}.` },
      { s: 'Hobi bahçesine ev konulabilir mi?', c: 'Hobi bahçesi ve tarım arazileri imar planında konut alanı değildir; buraya sabit ya da sürekli kullanılan ev koymak izne tabidir ve izinsiz yapılara elektrik, su abonesi verilmeyebilir. Arazinizin durumunu “Arazim uygun mu?” aracıyla ön kontrol edin ve belediyenize danışın.' },
      { s: 'Tiny house ile bahçe evi arasındaki fark nedir?', c: 'Tiny house şasi üzerinde, tekerlekli ve taşınabilir üretilir; O2 römork belgesiyle yola çıkabilir. Bahçe evi, bungalov ya da konteyner ise genellikle zemine sabitlenir.' },
    ],
    ilgili: [{ ad: 'Tiny house fiyatları', url: '/tiny-house-fiyatlari/' }, { ad: 'Bungalov fiyatları', url: '/bungalov-fiyatlari/' }, { ad: 'Konteyner ev fiyatları', url: '/konteyner-ev-fiyatlari/' }, { ad: 'Arazim uygun mu?', url: '/arazim-uygun-mu/' }, { ad: 'Tarlaya prefabrik ev yapılır mı?', url: '/rehber/tarlaya-prefabrik-ev-yapilir-mi/' }],
  },
  {
    slug: 'hazir-ev-fiyatlari',
    baslik: 'Hazır Ev Fiyatları',
    kisa: 'hazır ev',
    tip: 'prefabrik',
    filtre: () => true,
    giris: (s) => `“Hazır ev”, fabrikada üretilip arsada kısa sürede kurulan evlerin genel adı: prefabrik ev, çelik ev, konteyner ev, tiny house, ahşap ev ve bungalov. Bu sayfada ${s.firma} üreticinin ${s.model} hazır ev modeli var; fiyatlar ${aralik(s)}. Aşağıdaki tabloda her tipin başlangıç ve ortanca fiyatını görüp doğrudan o tipin sayfasına geçebilirsiniz.`,
    sss: (s) => [
      { s: 'Hazır ev fiyatları ne kadar?', c: `Listemizdeki hazır evlerde fiyatlar ${aralik(s)}. En ekonomik seçenek konteyner ev, en yüksek fiyatlar ise büyük metrekareli çelik ve ahşap villalarda.` },
      { s: 'En ucuz hazır ev hangisi?', c: 'Metrekare başına en düşük fiyatlar konteyner ve panel prefabrik evlerde görülüyor. Ancak kapsam (iç bitiş, tesisat, nakliye) farkı büyük olduğu için toplam maliyeti teklif üzerinden kıyaslayın.' },
      DAHIL, RUHSAT,
    ],
    ilgili: [{ ad: 'Prefabrik ev m² fiyatları', url: '/prefabrik-ev-metrekare-fiyatlari/' }, { ad: 'Hangi evi arıyorsunuz?', url: '/evini-bul/' }, { ad: 'Prefabrik ev fiyatları 2026', url: '/rehber/prefabrik-ev-fiyatlari-2026/' }],
  },
  {
    slug: 'prefabrik-ev-metrekare-fiyatlari',
    baslik: 'Prefabrik Ev Metrekare Fiyatları',
    kisa: 'prefabrik ev m² fiyatı',
    tip: 'prefabrik',
    filtre: (m) => !!m.m2Fiyat,
    giris: (s) => `Farklı büyüklükteki evleri kıyaslamanın en pratik yolu m² fiyatı. Bu sayfada ${s.firma} firmanın m² fiyatı hesaplanabilen ${s.model} modeli var; tüm tiplerde ortanca m² fiyatı ${s.m2Medyan ? `${sayi(s.m2Medyan)} TL` : '-'}. Aşağıdaki tablo her tipin m² fiyat aralığını ve bu fiyatla 50–150 m² bir evin yaklaşık bina maliyetini gösteriyor.`,
    sss: (s) => [
      { s: 'Prefabrik ev m² fiyatı ne kadar?', c: `Listemizdeki prefabrik evlerde ortanca m² fiyatı tablodaki gibidir; tüm hazır ev tiplerinde ortanca ${s.m2Medyan ? `${sayi(s.m2Medyan)} TL` : '-'}. Küçük evlerde m² fiyatı daha yüksek çıkar, çünkü mutfak ve banyo gibi sabit maliyetler daha az alana bölünür.` },
      { s: '100 m² prefabrik ev kaça mal olur?', c: 'Tablodaki ortanca m² fiyatıyla 100 m² için yaklaşık bina maliyetini görebilirsiniz. Zemin betonu, nakliye, ruhsat ve altyapı bağlantıları buna eklenir; kesin rakam için firmalardan teklif alın.' },
      DAHIL,
    ],
    ilgili: [{ ad: 'Maliyet hesaplama aracı', url: '/prefabrik-ev-maliyet-hesaplama/' }, { ad: '100 m² prefabrik ev', url: '/prefabrik-ev-fiyatlari/100-m2/' }, { ad: '80 m² prefabrik ev', url: '/prefabrik-ev-fiyatlari/80-m2/' }, { ad: 'Hazır ev fiyatları', url: '/hazir-ev-fiyatlari/' }, { ad: 'Prefabrik ev fiyatına neler dahil?', url: '/rehber/prefabrik-ev-fiyatina-neler-dahil/' }],
  },
  {
    slug: 'celik-konstruksiyon-ev-fiyatlari',
    baslik: 'Çelik Konstrüksiyon (Hafif Çelik) Ev Fiyatları',
    kisa: 'çelik konstrüksiyon ev',
    tip: 'celik',
    filtre: (m) => m.tip === 'celik' && /hafif çelik|konstrüksiyon|lgs|galvaniz/.test(metin(m)),
    giris: (s, l) => `Çelik konstrüksiyon evlerde taşıyıcı sistem çelik profillerden oluşur. Konutlarda en yaygın olanı galvanizli ince profillerle kurulan hafif çelik (LGS), büyük açıklıklı yapılarda ise ağır çelik kullanılır. Listede ${s.firma} firmanın ${s.model} hafif çelik / çelik konstrüksiyon modeli var; fiyatlar ${aralik(s)}, ortanca fiyat ${kisaTl(s.medyan)}${s.m2Medyan ? `, ortanca m² fiyatı ${sayi(s.m2Medyan)} TL` : ''}.`,
    sss: (s) => [
      { s: 'Çelik konstrüksiyon ev fiyatları ne kadar?', c: `Listemizdeki hafif çelik ve çelik konstrüksiyon modellerde fiyatlar ${aralik(s)}; ortanca fiyat ${kisaTl(s.medyan)}${s.m2Medyan ? `, ortanca m² fiyatı ${sayi(s.m2Medyan)} TL` : ''}. Fiyat; metrekare, kat sayısı, dış cephe ve iç bitiş seviyesine göre değişir.` },
      { s: 'Hafif çelik ile ağır çelik ev arasındaki fark nedir?', c: 'Hafif çelik (LGS) 1–3 mm kalınlıkta galvanizli soğuk şekillendirilmiş profillerle kurulur; hafif, hızlı ve konutlarda yaygındır. Ağır çelik ise sıcak haddelenmiş kalın profillerle (I, H kesitler) yapılır; büyük açıklıklar ve çok katlı yapılar için tercih edilir, maliyeti genellikle daha yüksektir.' },
      { s: 'Çelik ev depreme dayanıklı mı?', c: 'Çelik sünek bir malzemedir ve hafif yapı ağırlığı deprem yükünü azaltır. Yine de dayanıklılık statik projeye, bağlantı detaylarına ve zemine bağlıdır; firmadan Türkiye Bina Deprem Yönetmeliği’ne uygun statik projeyi isteyin.' },
      DAHIL, RUHSAT,
    ],
    ilgili: [{ ad: 'Çelik ev fiyatları', url: '/celik-ev-fiyatlari/' }, { ad: 'Prefabrik villa fiyatları', url: '/prefabrik-villa-fiyatlari/' }, { ad: 'Prefabrik mi, çelik ev mi?', url: '/rehber/prefabrik-mi-celik-ev-mi/' }, { ad: 'Prefabrik ev depreme dayanıklı mı?', url: '/rehber/prefabrik-ev-depreme-dayanikli-mi/' }],
  },
  {
    slug: 'kutuk-ev-fiyatlari',
    baslik: 'Kütük Ev Fiyatları',
    kisa: 'kütük ev',
    tip: 'ahsap',
    filtre: (m) => /kütük/.test(metin(m)),
    giris: (s, l) => `Kütük evler, yuvarlak ya da kare kesitli masif ağaç kütüklerin üst üste geçmeli olarak dizilmesiyle yapılır; masif duvar doğal yalıtım sağlar ve sıcak bir görünüm sunar. Listede ${s.firma} firmanın ${s.model} kütük ev modeli var; fiyatlar ${aralik(s)}. Daha fazla seçenek için ahşap ev ve bungalov modellerine de bakın.`,
    sss: (s) => [
      { s: 'Kütük ev fiyatları ne kadar?', c: `Listemizdeki kütük ev modellerinde fiyatlar ${aralik(s)}; ortanca fiyat ${kisaTl(s.medyan)}. Fiyat kütük çapına, ağaç türüne (çam, ladin, sedir), metrekareye ve iç bitişe göre büyük ölçüde değişir.` },
      { s: 'Kütük ev ile ahşap prefabrik ev arasındaki fark nedir?', c: 'Kütük evde duvarın kendisi masif ağaçtır. Ahşap prefabrik evde ise ahşap karkasın arasına yalıtım konur ve iki yüzü kaplanır. Kütük ev daha masif ve doğal; ahşap prefabrik ev ise genellikle daha hafif, hızlı ve ekonomiktir.' },
      { s: 'Kütük evin bakımı nasıl yapılır?', c: 'Dış yüzeyde nem ve UV koruması için ahşap koruyucu ve vernik birkaç yılda bir yenilenir; kütükler zamanla oturduğu için ilk yıllarda derz ve kapı-pencere ayarı kontrol edilir.' },
      DAHIL, RUHSAT,
    ],
    ilgili: [{ ad: 'Ahşap ev fiyatları', url: '/ahsap-ev-fiyatlari/' }, { ad: 'Bungalov ev fiyatları', url: '/bungalov-fiyatlari/' }, { ad: 'Bahçe evi ve bağ evi', url: '/bahce-evi-fiyatlari/' }],
  },
  {
    slug: 'tekerlekli-tiny-house-fiyatlari',
    baslik: 'Tekerlekli Tiny House Fiyatları',
    kisa: 'tekerlekli tiny house',
    tip: 'tiny house',
    filtre: (m) => m.tip === 'tiny house' && /tekerlek|römork|plaka|o2|şasi/.test(metin(m)),
    giris: (s, l) => `Tekerlekli tiny house, şasi üzerine kurulan ve römork olarak çekilebilen küçük evdir; O2 tip onay belgesi ve plakayla trafiğe çıkabilir. Listede ${s.firma} firmanın ${s.model} tekerlekli/şasili modeli var; fiyatlar ${aralik(s)}, ortanca fiyat ${kisaTl(s.medyan)}.`,
    sss: (s) => [
      { s: 'Tekerlekli tiny house fiyatları ne kadar?', c: `Listemizdeki tekerlekli ve şasili modellerde fiyatlar ${aralik(s)}; ortanca fiyat ${kisaTl(s.medyan)}. Uzunluk, çatı katı (loft), banyo-mutfak donanımı ve şasi kalitesi fiyatı belirler.` },
      { s: 'Tekerlekli tiny house için ruhsat gerekir mi?', c: 'O2 tip onaylı ve plakalı tiny house araç sayılır; yapı ruhsatı gerekmez. Ancak bir arazide sürekli konaklama, sabitleme ve altyapı bağlantısı yerel kurallara tabidir. Ayrıntılar “Tiny house için ruhsat ve O2 belgesi” yazımızda.' },
      { s: 'Tiny house çekmek için hangi ehliyet gerekir?', c: 'Römorkun azami yüklü ağırlığına göre değişir; ağır tiny house’lar için çoğunlukla BE sınıfı ehliyet gerekir. Firmadan aracın ağırlık bilgisini ve ruhsat belgesini isteyin.' },
      DAHIL,
    ],
    ilgili: [{ ad: 'Tiny house fiyatları', url: '/tiny-house-fiyatlari/' }, { ad: 'Tiny house ruhsat ve O2 belgesi', url: '/rehber/tiny-house-ruhsat-o2-belgesi/' }, { ad: 'Tiny house nedir?', url: '/rehber/tiny-house-nedir/' }, { ad: '2+1 tiny house', url: '/tiny-house-fiyatlari/2-1/' }],
  },
  {
    slug: 'deprem-konteyneri-fiyatlari',
    baslik: 'Deprem Konteyneri ve Küçük Konteyner Ev Fiyatları',
    kisa: 'deprem konteyneri',
    tip: 'konteyner',
    filtre: (m) => m.tip === 'konteyner' && !!m.m2 && m.m2 <= 30,
    giris: (s, l) => `Deprem konteyneri olarak da bilinen 30 m²’ye kadar konteynerler hızlı kurulumu, düşük maliyeti ve taşınabilirliği nedeniyle geçici barınma, şantiye, bahçe ve depo amaçlı tercih ediliyor. Listede ${s.firma} firmanın ${s.model} küçük konteyner modeli var; fiyatlar ${aralik(s)}, ortanca fiyat ${kisaTl(s.medyan)}.`,
    sss: (s) => [
      { s: 'Deprem konteyneri fiyatları ne kadar?', c: `Listemizdeki 30 m²’ye kadar konteynerlerde fiyatlar ${aralik(s)}; ortanca fiyat ${kisaTl(s.medyan)}. WC-duş, mutfak tezgâhı, elektrik tesisatı ve yalıtım kalınlığı fiyatı değiştirir.` },
      { s: 'Deprem konteynerinde sürekli yaşanır mı?', c: 'Yalıtımlı, ıslak hacimli modeller kısa ve orta süreli yaşam için uygundur. Uzun süreli kullanımda yalıtım kalınlığına, yoğuşma önlemine ve havalandırmaya dikkat edin; sürekli konut olarak kullanmak ruhsat kurallarına tabidir.' },
      DAHIL, RUHSAT,
    ],
    ilgili: [{ ad: 'Konteyner ev fiyatları', url: '/konteyner-ev-fiyatlari/' }, { ad: '1+0 konteyner ev', url: '/konteyner-ev-fiyatlari/1-0/' }, { ad: 'Konteyner ev mi prefabrik ev mi?', url: '/rehber/konteyner-ev-mi-prefabrik-ev-mi/' }],
  },
  {
    slug: 'tasinabilir-ev-fiyatlari',
    baslik: 'Taşınabilir Ev Fiyatları',
    kisa: 'taşınabilir ev',
    tip: 'tiny house',
    filtre: (m) => m.tip === 'tiny house' || m.tip === 'konteyner' || /tek parça|taşınabilir/.test(metin(m)),
    giris: (s, l) => `Taşınabilir evler fabrikada tek parça halinde üretilip tır ya da römorkla arsaya getirilir; gerekirse sökülmeden başka bir yere taşınabilir. Tiny house’lar şasi üzerinde ve tekerlekli, konteyner evler ve tek parça prefabrik evler ise vinçle indirilir. Listede ${s.firma} firmanın ${s.model} taşınabilir modeli var (${tipSay(l)}); fiyatlar ${aralik(s)}, ortanca fiyat ${kisaTl(s.medyan)}.`,
    sss: (s) => [
      { s: 'Taşınabilir ev fiyatları ne kadar?', c: `Listemizdeki taşınabilir modellerde fiyatlar ${aralik(s)}; ortanca fiyat ${kisaTl(s.medyan)}. Konteyner evler genellikle en ekonomik, tekerlekli tiny house’lar ise donanıma göre daha pahalı olabilir.` },
      { s: 'Taşınabilir ev için ruhsat gerekir mi?', c: 'O2 belgeli, plakalı tiny house araç sayılır ve yapı ruhsatı gerekmez. Zemine sabitlenen ve sürekli kullanılan konteyner ya da prefabrik ev ise yapı sayılır ve izne tabidir. Arazinizin durumunu “Arazim uygun mu?” aracıyla kontrol edin.' },
      { s: 'Taşınabilir ev nasıl taşınır?', c: 'Tek parça evler tırla taşınır ve vinçle indirilir; arsaya giden yolun tır geçişine uygun olması gerekir. Tekerlekli tiny house ise uygun ehliyet ve araçla römork olarak çekilebilir. Nakliyenin fiyata dahil olup olmadığını teklifte sorun.' },
      DAHIL,
    ],
    ilgili: [{ ad: 'Tekerlekli tiny house', url: '/tekerlekli-tiny-house-fiyatlari/' }, { ad: 'Konteyner ev fiyatları', url: '/konteyner-ev-fiyatlari/' }, { ad: 'Tiny house fiyatları', url: '/tiny-house-fiyatlari/' }, { ad: 'Arazim uygun mu?', url: '/arazim-uygun-mu/' }],
  },
  {
    slug: 'anahtar-teslim-celik-ev-fiyatlari',
    baslik: 'Anahtar Teslim Çelik Ev Fiyatları',
    kisa: 'anahtar teslim çelik ev',
    tip: 'celik',
    filtre: (m) => m.tip === 'celik' && /anahtar/i.test(m.teslim || ''),
    giris: (s, l) => `Anahtar teslim çelik evde taşıyıcı çelik karkasın yanında iç-dış kaplama, doğrama, tesisat ve genellikle mutfak-banyo da fiyata dahildir. Ancak “anahtar teslim” her firmada aynı kalemleri kapsamaz; zemin betonu, nakliye ve ruhsat çoğunlukla ayrıdır. Listede ${s.firma} firmanın ${s.model} anahtar teslim çelik ev modeli var; fiyatlar ${aralik(s)}, ortanca fiyat ${kisaTl(s.medyan)}.`,
    sss: (s) => [
      { s: 'Anahtar teslim çelik ev fiyatları ne kadar?', c: `Listemizdeki anahtar teslim çelik evlerde fiyatlar ${aralik(s)}; ortanca fiyat ${kisaTl(s.medyan)}${s.m2Medyan ? `, ortanca m² fiyatı ${sayi(s.m2Medyan)} TL` : ''}.` },
      { s: 'Anahtar teslime neler dahildir?', c: 'Firmaya göre değişir. Teklifte iç bitiş (zemin, boya), mutfak dolabı ve tezgâh, banyo vitrifiyesi, elektrik-su tesisatı, iç kapılar, nakliye, montaj ve zemin betonunun dahil olup olmadığını tek tek yazılı isteyin.' },
      RUHSAT,
    ],
    ilgili: [{ ad: 'Çelik ev fiyatları', url: '/celik-ev-fiyatlari/' }, { ad: 'Çelik konstrüksiyon ev', url: '/celik-konstruksiyon-ev-fiyatlari/' }, { ad: 'Anahtar teslim prefabrik ev', url: '/anahtar-teslim-prefabrik-ev-fiyatlari/' }, { ad: 'Çelik evin avantajları ve dezavantajları', url: '/rehber/celik-ev-avantajlari-dezavantajlari/' }],
  },
  {
    slug: 'en-ucuz-prefabrik-ev-fiyatlari', sira: 'fiyat',
    baslik: 'En Ucuz Prefabrik Ev Fiyatları (600 Bin TL Altı)',
    kisa: 'ucuz prefabrik ev',
    tip: 'prefabrik',
    filtre: (m) => m.tip === 'prefabrik' && m.fiyatTuru === 'model' && !!m.fiyat && m.fiyat <= 600000,
    giris: (s, l) => `Bütçeniz sınırlıysa bu sayfada 600.000 TL ve altındaki prefabrik ev modellerini topladık: ${s.firma} firmanın ${s.model} modeli, fiyatlar ${aralik(s)}. Ucuz modellerin çoğu 1+1 ve küçük 2+1 planlardır. Düşük fiyatın nedeni çoğu zaman kapsamdır: iç bitiş, nakliye ve montajın fiyata dahil olup olmadığına her kartta bakın.`,
    sss: (s) => [
      { s: 'En ucuz prefabrik ev ne kadar?', c: `Listemizdeki 600.000 TL altı prefabrik evlerde fiyatlar ${aralik(s)} arasında. En düşük fiyatlar genellikle 20–35 m² modellerde görülür.` },
      { s: 'Ucuz prefabrik ev alırken nelere dikkat etmeli?', c: 'Panel kalınlığı ve yalıtım, pencerelerin çift cam olup olmadığı, ıslak hacim malzemeleri ve garanti şartlarını sorun. Fiyata dahil olmayan kalemleri (nakliye, montaj, zemin betonu) ekleyerek toplam maliyeti kıyaslayın.' },
      DAHIL, RUHSAT,
    ],
    ilgili: [{ ad: '1+1 prefabrik ev', url: '/prefabrik-ev-fiyatlari/1-1/' }, { ad: 'Bahçe evi ve bağ evi', url: '/bahce-evi-fiyatlari/' }, { ad: 'Maliyet hesaplama', url: '/prefabrik-ev-maliyet-hesaplama/' }, { ad: 'Prefabrik evin dezavantajları', url: '/rehber/prefabrik-ev-dezavantajlari/' }],
  },
  sehirKonu('İstanbul', 'istanbul-prefabrik-ev-fiyatlari'),
  sehirKonu('İzmir', 'izmir-prefabrik-ev-fiyatlari'),
  sehirKonu('Kocaeli', 'kocaeli-prefabrik-ev-fiyatlari'),
  sehirKonu('Ankara', 'ankara-prefabrik-ev-fiyatlari'),
  sehirKonu('Malatya', 'malatya-prefabrik-ev-fiyatlari'),
];

export const konuBul = (slug: string) => KONULAR.find((k) => k.slug === slug)!;
export const konuModelleri = (k: Konu) => (k.sira === 'fiyat' ? models.filter(k.filtre).sort((a, b) => (a.fiyat ?? 9e15) - (b.fiyat ?? 9e15)) : sirala(models.filter(k.filtre)));

// Tip bazında özet (hazır ev ve m² sayfalarındaki tablolar)
export function tipOzet(list: Model[]) {
  const tipler = [...new Set(list.map((m) => m.tip))];
  return tipler.map((t) => {
    const l = list.filter((m) => m.tip === t);
    const m2 = l.filter((m) => m.m2Fiyat).map((m) => m.m2Fiyat!).sort((a, b) => a - b);
    return { tip: t, s: istatistik(l), m2Min: m2[0] ?? null, m2Max: m2.at(-1) ?? null };
  }).sort((a, b) => b.s.model - a.s.model);
}

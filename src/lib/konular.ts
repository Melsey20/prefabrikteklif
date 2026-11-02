// Arama hacmi yüksek, tip sayfalarının karşılamadığı sorgular için konu sayfaları.
// Kaynak: Google Ads Anahtar Kelime Planlayıcı (Türkiye, Türkçe, Kasım 2026). Tüm rakamlar sitedeki gerçek model verisinden hesaplanır.
import { models, sirala, istatistik, kisaTl, sayi, TIPLER, type Model } from './data';

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
}

const tipSay = (list: Model[]) => {
  const c: Record<string, number> = {};
  for (const m of list) c[m.tip] = (c[m.tip] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${n} ${TIPLER[t]?.kisa ?? t}`).join(', ');
};
const aralik = (s: S) => (s.min && s.max ? `${kisaTl(s.min)} ile ${kisaTl(s.max)} arasında` : '');
const RUHSAT = { s: 'Ruhsat gerekir mi?', c: 'Zemine sabitlenen ve sürekli oturulan her ev yapı sayılır; imarlı arsa, onaylı proje ve yapı ruhsatı gerekir. Tarım arazisinde ve hobi bahçesinde yapılaşma ayrıca izne tabidir. Kurulumdan önce belediyenize ya da il müdürlüğüne danışın.' };
const DAHIL = { s: 'Liste fiyatına neler dahil?', c: 'Firmaya göre değişir. Çoğu fiyat bina ve montajı kapsar; zemin betonu, nakliye, vinç, ruhsat ve iç bitişler çoğunlukla ayrıdır. Her kartta dahil/hariç kalemler ayrıca işaretlenir; teklif alırken bunları yazılı isteyin.' };

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
    ilgili: [{ ad: '100 m² prefabrik ev', url: '/prefabrik-ev-fiyatlari/100-m2/' }, { ad: '80 m² prefabrik ev', url: '/prefabrik-ev-fiyatlari/80-m2/' }, { ad: 'Hazır ev fiyatları', url: '/hazir-ev-fiyatlari/' }, { ad: 'Prefabrik ev fiyatına neler dahil?', url: '/rehber/prefabrik-ev-fiyatina-neler-dahil/' }],
  },
];

export const konuBul = (slug: string) => KONULAR.find((k) => k.slug === slug)!;
export const konuModelleri = (k: Konu) => sirala(models.filter(k.filtre));

// Tip bazında özet (hazır ev ve m² sayfalarındaki tablolar)
export function tipOzet(list: Model[]) {
  const tipler = [...new Set(list.map((m) => m.tip))];
  return tipler.map((t) => {
    const l = list.filter((m) => m.tip === t);
    const m2 = l.filter((m) => m.m2Fiyat).map((m) => m.m2Fiyat!).sort((a, b) => a - b);
    return { tip: t, s: istatistik(l), m2Min: m2[0] ?? null, m2Max: m2.at(-1) ?? null };
  }).sort((a, b) => b.s.model - a.s.model);
}

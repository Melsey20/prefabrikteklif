// Kategori sayfalarındaki sabit metinler ve SSS
export const TIP_ICERIK: Record<string, { giris: string; sss: { s: string; c: string }[]; rehber: { ad: string; url: string }[] }> = {
  prefabrik: {
    giris: 'Prefabrik ev, duvar ve çatı panellerinin fabrikada üretilip arsada birleştirildiği hazır evdir. Aynı metrekarede bile fiyatlar firmadan firmaya çok değişir; çünkü bazı firmalar sadece bina fiyatını, bazıları montaj ve tesisat dahil fiyatı yazar. Aşağıdaki listede her fiyatın yanında neyin dahil olduğu ayrıca gösteriliyor.',
    sss: [
      { s: 'Prefabrik ev fiyatına neler dahildir?', c: 'Firmaya göre değişir. Çoğu liste fiyatı sadece bina ve montajı kapsar; zemin betonu, nakliye, vinç, ruhsat ve iç bitişler (parke, fayans, mutfak) genellikle ayrıca fiyatlandırılır. Teklif alırken bu kalemleri tek tek sorun.' },
      { s: 'Prefabrik ev fiyatlarına KDV dahil mi?', c: 'Firmaların çoğu sitesinde KDV durumunu yazmıyor. KDV hariç yazan firmalarda konutlarda genellikle %10 veya %20 KDV eklenir. Bu sitede KDV hariç fiyatlar “+ KDV” olarak işaretlenir.' },
      { s: 'Prefabrik ev için ruhsat gerekir mi?', c: 'Evet. Zemine sabitlenen prefabrik ev bir yapıdır ve İmar Kanunu’na göre yapı ruhsatı gerekir. Tarım arazilerinde yapılaşma ayrıca izne tabidir. Ayrıntılar için “Tarlaya prefabrik ev yapılır mı?” rehberine bakın.' },
      { s: 'Prefabrik ev kaç günde kurulur?', c: 'Firmalar üretim için genellikle birkaç hafta, arsada montaj için birkaç gün süre veriyor. Kesin teslim süresini teklif aşamasında yazılı olarak isteyin.' },
    ],
    rehber: [
      { ad: 'Prefabrik ev fiyatına neler dahil?', url: '/rehber/prefabrik-ev-fiyatina-neler-dahil/' },
      { ad: 'Tarlaya prefabrik ev yapılır mı?', url: '/rehber/tarlaya-prefabrik-ev-yapilir-mi/' },
      { ad: 'Prefabrik mi, çelik ev mi?', url: '/rehber/prefabrik-mi-celik-ev-mi/' },
    ],
  },
  celik: {
    giris: 'Çelik ev, taşıyıcı sistemi hafif çelik profillerden (LGS) oluşan, dış cephesi ve iç bitişi farklı malzemelerle kaplanan evdir. Prefabrik eve göre m² fiyatı genellikle daha yüksektir; buna karşılık plan ve cephe seçenekleri daha esnektir. Listede firma fiyatlarını kapsamlarıyla birlikte görebilirsiniz.',
    sss: [
      { s: 'Çelik ev ile prefabrik ev arasındaki fark nedir?', c: 'Prefabrik evde duvarlar hazır panellerden oluşur; çelik evde taşıyıcı iskelet hafif çeliktir ve duvarlar üzerine kurulur. Çelik ev daha esnek plan sunar, m² fiyatı genellikle daha yüksektir.' },
      { s: 'Çelik ev fiyatına neler dahil?', c: 'Firmalar genellikle çelik karkas, dış cephe, çatı, kapı-pencere ve tesisatı fiyata dahil eder; zemin betonu, nakliye, ruhsat ve iç kaplamalar çoğunlukla ayrıdır. Kartlardaki dahil/hariç etiketlerine bakın.' },
      { s: 'Çelik ev için ruhsat gerekir mi?', c: 'Evet, çelik ev de bir yapıdır ve yapı ruhsatı gerekir; ruhsat için imarlı arsa ve onaylı proje istenir.' },
    ],
    rehber: [
      { ad: 'Prefabrik mi, çelik ev mi?', url: '/rehber/prefabrik-mi-celik-ev-mi/' },
      { ad: 'Fiyata neler dahil?', url: '/rehber/prefabrik-ev-fiyatina-neler-dahil/' },
    ],
  },
  konteyner: {
    giris: 'Konteyner ev, fabrikada tek parça veya modüller halinde üretilip arsaya vinçle bırakılan küçük evdir. Şantiye, bahçe ve geçici barınma için de tercih edilir. Fiyatlar boş gövde ile tam donanımlı (mutfak, banyo, tesisat dahil) modeller arasında çok değişir.',
    sss: [
      { s: 'Konteyner ev fiyatına neler dahildir?', c: 'Boş konteynerde sadece gövde vardır; “yaşam konteyneri” modellerinde mutfak, WC-duş ve elektrik-su tesisatı bulunur. Nakliye ve vinç çoğu firmada ayrıca ücretlendirilir.' },
      { s: 'Konteyner ev için ruhsat gerekir mi?', c: 'Zemine sabitlenen ve sürekli kullanılan konteyner yapı sayılabilir. Tarım arazilerine izinsiz yerleştirilen konteynerlere 2026’daki düzenlemeyle elektrik, su ve doğal gaz aboneliği verilmiyor. Kurulumdan önce belediyeye danışın.' },
      { s: 'Konteyner ev kaç yıl dayanır?', c: 'Malzeme, yalıtım ve bakıma bağlıdır. Firmalardan çelik kalınlığı, yalıtım tipi ve garanti süresini yazılı isteyin.' },
    ],
    rehber: [
      { ad: 'Tarlaya prefabrik ev yapılır mı?', url: '/rehber/tarlaya-prefabrik-ev-yapilir-mi/' },
      { ad: 'Fiyata neler dahil?', url: '/rehber/prefabrik-ev-fiyatina-neler-dahil/' },
    ],
  },
  'tiny house': {
    giris: 'Tiny house, genellikle 15–35 m² arası, römork şasi üzerine kurulan küçük evdir. Tekerlekli ve O2 tip onay belgeli modeller trafik mevzuatında çekme karavan sayılır; sabit modeller ise yapı ruhsatı ister. Bazı üreticiler fiyatı euro olarak veriyor; bunlar listede ayrıca işaretlidir.',
    sss: [
      { s: 'Tiny house için ruhsat gerekir mi?', c: 'Tekerlekli, O2 tip onay belgeli ve plakalı tiny house çekme karavan statüsündedir ve kural olarak yapı ruhsatı aranmaz. Zemine sabitlenen tiny house ise yapı sayılabilir ve ruhsat gerekir. Ayrıntılar “Tiny house ve O2 belgesi” rehberinde.' },
      { s: 'O2 belgesi nedir?', c: '750–3.500 kg arasındaki römorkların trafiğe çıkabilmesi için gereken tip onay belgesidir. Belgeyi üretici alır; alıcı noterden tescil ve plaka işlemini yapar.' },
      { s: 'Tiny house tarlaya konulabilir mi?', c: 'Tekerlekli ve plakalı modeller için yapı ruhsatı aranmasa da tarım arazilerine izinsiz yerleşime yönelik yaptırımlar 2026’da sertleşti; izinsiz yapılara elektrik, su ve doğal gaz aboneliği verilmiyor. Kurulum yerini önceden belediyeyle netleştirin.' },
    ],
    rehber: [
      { ad: 'Tiny house ve O2 belgesi', url: '/rehber/tiny-house-ruhsat-o2-belgesi/' },
      { ad: 'Tarlaya ev yapılır mı?', url: '/rehber/tarlaya-prefabrik-ev-yapilir-mi/' },
    ],
  },
  ahsap: {
    giris: 'Ahşap ev, taşıyıcısı ve kaplaması ahşap olan, doğal görünümüyle bağ evi ve yazlık olarak tercih edilen evdir. Bazı firmalar ev fiyatı yerine m² birim fiyatı veriyor; bu fiyatlar listede “/ m²” olarak ayrı işaretlenir ve toplam fiyat istatistiklerine katılmaz.',
    sss: [
      { s: 'Ahşap ev m² fiyatı ne kadar?', c: 'Listedeki firmaların m² fiyatları ve toplam model fiyatları yukarıda. m² fiyatı veren firmalarda nakliye, temel ve vitrifiye çoğunlukla ayrıdır.' },
      { s: 'Ahşap ev için ruhsat gerekir mi?', c: 'Zemine kurulan ahşap ev bir yapıdır ve ruhsat gerekir. Tarım arazisinde bağ evi yapılması ayrıca izne ve şartlara bağlıdır.' },
    ],
    rehber: [
      { ad: 'Tarlaya ev yapılır mı?', url: '/rehber/tarlaya-prefabrik-ev-yapilir-mi/' },
      { ad: 'Fiyata neler dahil?', url: '/rehber/prefabrik-ev-fiyatina-neler-dahil/' },
    ],
  },
  bungalov: {
    giris: 'Bungalov ve bağ evleri, genellikle tek katlı, küçük metrekareli ve çoğunlukla ahşap ya da hafif çelik evlerdir. Bahçe, bağ ve turizm tesisleri için tercih edilir. Tarım arazisinde bağ evi yapımı 2026 yönetmeliğiyle sıkı şartlara bağlandı.',
    sss: [
      { s: 'Bağ evi yapmak için ne gerekir?', c: 'Tarım arazisinde bağ evi için kurul izni gerekir; 4 Nisan 2026 tarihli yönetmelikle ilgili haberlerde en az 5 dönüm arazi ve en fazla 30 m² yapı şartından söz ediliyor. Başvurudan önce il tarım müdürlüğüne ve belediyeye danışın.' },
      { s: 'Bungalov fiyatına neler dahil?', c: 'Firmaya göre değişir; m² fiyatı veren firmalarda nakliye, temel ve vitrifiye genellikle ayrıdır. Kartlardaki etiketlere bakın.' },
    ],
    rehber: [
      { ad: 'Tarlaya ev yapılır mı?', url: '/rehber/tarlaya-prefabrik-ev-yapilir-mi/' },
      { ad: 'Arazim uygun mu?', url: '/arazim-uygun-mu/' },
    ],
  },
};

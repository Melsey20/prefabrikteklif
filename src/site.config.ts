// Sitenin genel ayarları. Boş bırakılan alanlar sitede hiç gösterilmez.
export const SITE = {
  ad: 'PrefabrikTeklif',
  alanAdi: 'prefabrikteklif.com.tr',
  url: 'https://www.prefabrikteklif.com.tr',
  slogan: 'Prefabrik, tiny house ve modüler ev fiyatlarını kıyasla, 48 saatte teklif al',
  // Aşağıdakileri doldurun (KVKK ve iletişim sayfalarında kullanılır):
  sirketUnvani: 'Mitra Grup',
  adres: 'Karakavak Mah. Güngör Cad. No:27K, Yeşilyurt / Malatya',
  eposta: 'prefabrikteklif@gmail.com',
  telefon: '',
  whatsapp: '', // Ör: "905xxxxxxxxx"
  instagram: 'prefabrik.teklif',
  // Teklif talebi kriterlere uyan tüm kayıtlı firmalara gider (güvenlik sınırı)
  maksFirma: 20,
  // Kullanıcının elle seçebileceği en fazla firma / karşılaştırılabilecek en fazla ev
  maksSecim: 5,
  teklifSaat: 48,
  // "Süreci biz yönetelim" hizmet bedeli (ev bedelinin yüzdesi)
  komisyon: 5,
  // Firma üyeliği (aylık, TL) ve reklam paketleri (aylık, TL; üyeliğe ektir)
  abonelik: 499,
  reklam: [
    { k: 'ana', ad: 'Ana banner', fiyat: 25000, aciklama: 'Ana sayfanın en üstündeki büyük, kaydırmalı alanda tam genişlik görsel.' },
    { k: 'yan', ad: 'Yan banner', fiyat: 25000, aciklama: 'Ana sayfada büyük bannerın yanındaki kaydırmalı alan (mobilde hemen altında).' },
    { k: 'ikisi', ad: 'Ana + yan banner', fiyat: 45000, aciklama: 'İki alanda birden; ayrı ayrı almaktan 5.000 TL daha uygun.' },
    { k: 'ara', ad: 'Ana sayfa ara banner', fiyat: 25000, aciklama: 'Ana sayfada “Uygun fiyatlı 2+1 evler” ile “Nasıl çalışır?” arasındaki tam genişlik banner.' },
    { k: 'liste', ad: 'Ana sayfada öne çıkan listeleme', fiyat: 15000, aciklama: 'Modeliniz ana sayfadaki “Öne çıkan evler” sırasında, “Reklam” etiketiyle.' },
  ],
  // Ana ve yan banner alanlarının her birinde aynı anda en fazla kaç reklam yayınlanır
  bannerSiniri: 6,
  // Ana sayfadaki model sıralarında en fazla kaç ev gösterilir
  anasayfaModel: 10,
  // Google Search Console doğrulama kodu (meta etiketi içeriği)
  googleDogrulama: '',
  // Bing Webmaster Tools doğrulama kodu (ChatGPT arama sonuçları Bing dizinini kullanır)
  bingDogrulama: '',
  // IndexNow anahtarı (public/<anahtar>.txt ile aynı)
  indexNow: 'c7f4e2a91b6d4f0e8a3b5d2c1e9f7a64',
};

# PrefabrikTeklif.com.tr

Prefabrik, çelik, konteyner, tiny house, ahşap ev ve bungalov fiyatlarını kıyaslayan ve kullanıcıya 48 saatte birden çok firmadan isimsiz teklif toplayan, istenirse satın alma sürecini baştan sona yöneten platform.

- **Ön yüz:** Astro (statik, sıfıra yakın JavaScript). Lighthouse mobil: 98–100 performans, 94–100 erişilebilirlik, 100 SEO.
- **Sunucu:** Firebase Cloud Functions (Node 22, `europe-west1`), Firestore.
- **Veri:** `data/raw/*.csv` → `scripts/build_data.py` → `src/data/*.json` (62 firma, 422 model, 1 Kasım 2026).

## Sürüm 2 (Kasım 2026) — yenilikler

- **Yeni tasarım:** fotoğraflı kategori şeridi, kayan banner (yönetimden sponsorlu banner eklenebilir), “Hangi evi arıyorsunuz?” sihirbazı (`/evini-bul/`), favoriler, 5 eve kadar karşılaştırma (`/karsilastir/`).
- **Gizli teklif akışı:** talep firmalara isimsiz gider; müşteri bilgisi yalnızca fiyat veren firmaya açılır. Süre 48 saat.
- **Süreci siz yönetin:** `/teklif-al/?mod=surec` → yönetim panelinde sipariş açılır; Ön görüşme → Keşif → Sözleşme → Üretim → Nakliye → Montaj → Teslim aşamaları kullanıcının hesabında görünür.
- **Hesaplar (Firebase Authentication):** `/giris/` (e-posta/şifre veya Google). `/hesabim/` talepler, gelen teklifler, sipariş takibi, favoriler.
- **Firma paneli** (`/firma-paneli/`): ürün ekleme/düzenleme/kaldırma, fiyat ve fotoğraf (https adresi) güncelleme — yönetim onayıyla yayına girer; talepler (fiyat ver / ilgilenmiyorum); **geri bildirim** (istek, hata, sorun) ve yanıtlar; profil (iller, tipler, bildirim e-postası).
- **Yönetim paneli** (`/yonetim/`): onaylar (ürün değişiklikleri, aylık fiyat kontrolü bulguları, firma başvuruları, yorumlar), talepler (kayıtlı olmayan firmaya e-postayla iletme), siparişler (aşama, firma, not, belge, mesaj), firmalar (panel e-postaları), geri bildirimler, bannerlar, fiyat kontrol raporu. Yöneticiler: `functions/.env` → `YONETICILER`.
- **Aylık fiyat kontrolü:** her ayın 1’i saat 17.00 (İstanbul) firma sayfaları taranır, değişen fiyatlar onaya düşer, özet e-postayla gelir.
- **SEO / yapay zekâ:** 10 yeni rehber yazısı, `llms.txt`, yapay zekâ botlarına açık `robots.txt`, IndexNow anahtarı, yapısal veri (Organization, WebSite+SearchAction, Product/Offer, FAQPage, Article, BreadcrumbList, ItemList, CollectionPage).
- **Analytics:** Firebase projesinde Google Analytics bağlanınca ölçüm kimliği otomatik alınır; yalnızca çerez onayı verilirse yüklenir.
- **Testler:** `cd functions && npm test` (API, sahte veritabanı ile 12 senaryo). Uçtan uca: `node scripts/e2e/sunucu.mjs` + `node scripts/e2e/akis.cjs`.

### Firma hesabı nasıl açılır?
1. Firma `/firma-kayit/` üzerinden başvurur → yönetim panelinde **Onaylar** → “Onayla, hesabı aç”. Ya da **Firmalar** → “Firma hesabı aç” ile firmanın e-postasını panel e-postası olarak ekleyin.
2. Firma aynı e-postayla `/giris/` üzerinden kayıt olur (e-postayı doğrular) veya Google ile girer → `/firma-paneli/`.

## Sürüm 2.1 — üyelik, reklam ve sorumluluk

- **Süreci biz yönetelim:** ev bedelinin %5'i hizmet bedeli (`src/site.config.ts` → `komisyon`). Teklif alma kullanıcıya ücretsiz.
- **Firma üyeliği:** aylık 499 TL (`abonelik`). Başvuruda referans, üyelik bedeli ve [firma üyelik sözleşmesi](/firma-uyelik-sozlesmesi/) onayı zorunlu. Yönetim → Onaylar'da başvuruyu onaylarken ödeme bağlantısını (iyzico/PayTR/banka linki) yapıştırın; onay e-postasıyla firmaya gider ve firma panelinde durur. Yönetim → Firmalar → **Üyelik** ile durum (Ödeme bekleniyor / Aktif / Gecikti / İptal), son ve sonraki ödeme tarihi girilir, bağlantı tekrar gönderilir.
- **Reklam paketleri (aylık, üyeliğe ek):** ana banner 25.000 TL, yan banner 25.000 TL, ikisi 45.000 TL, ana sayfada öne çıkan listeleme 15.000 TL. Firmalar panelde **Üyelik ve reklam** sekmesinden talep eder; Yönetim → **Reklam alanları**'nda ödeme bağlantısı gönderilir, ödeme sonrası reklam eklenir. Ana ve yan alanlarda en fazla 6, öne çıkan listelemede en fazla 10 aktif reklam (API zorlar).
- **Ana sayfa model sıraları** en fazla 10 ev (`anasayfaModel`).
- **Yayından kaldırma:** Yönetim → Firmalar → **Yayından kaldır**: firmanın tüm kartları sitede gizlenir, talep almaz. Statik firma sayfasının tamamen silinmesi için firmayı `src/data/firms.json`'dan çıkarıp yeniden yayınlayın.
- Alt bilgide "Lütfen hizmet aldığınız firmayı teyit ediniz" notu; kullanım koşullarında sorumluluk ve %5 maddesi.

> Sözleşme ve koşul metinleri taslaktır; yayından önce bir avukata okutun.

## Sayfalar

| Sayfa | Adres |
| --- | --- |
| Kategori | `/prefabrik-ev-fiyatlari/`, `/celik-ev-fiyatlari/`, `/konteyner-ev-fiyatlari/`, `/tiny-house-fiyatlari/`, `/ahsap-ev-fiyatlari/`, `/bungalov-fiyatlari/` |
| Oda / m² | `/prefabrik-ev-fiyatlari/2-1/`, `/prefabrik-ev-fiyatlari/100-m2/` … (en az 3 model olanlar otomatik açılır) |
| Firma | `/firmalar/`, `/firma/{firma}/` |
| Model | `/firma/{firma}/{model}/` |
| Formlar | `/teklif-al/`, `/firma-kayit/`, `/teklif-ver/` (firmalar için, e-postadaki bağlantıyla), `/yorum-yaz/` |
| Rehber | `/rehber/…` (4 yazı), `/arazim-uygun-mu/` (araç) |
| Yasal | `/kvkk-aydinlatma-metni/`, `/kullanim-kosullari/`, `/cerez-politikasi/`, `/siralama-nasil-yapilir/` |

SEO: her sayfada başlık/açıklama, canonical, Open Graph, `sitemap-index.xml`, `robots.txt`; JSON-LD ile Organization, WebSite, BreadcrumbList, ItemList + Product/Offer, FAQPage, Article.

## 1. Yayına almadan önce doldurun

`src/site.config.ts`: şirket unvanı (Mitra Grup) ve e-posta (info@mitraajans.com) dolduruldu; adres, telefon, WhatsApp, Instagram, Search Console doğrulama kodu. Boş bırakılan alanlar sitede hiç görünmez. KVKK metninde veri sorumlusu olarak şirket unvanı kullanılır, bu yüzden en azından **sirketUnvani** ve **eposta** dolu olmalı. Yasal metinleri bir avukata kontrol ettirin.

## 2. Kurulum

```bash
npm install
npm run build        # veriyi JSON'a çevirir ve dist/ klasörünü üretir
npm run preview      # http://localhost:4321
```

## 3. Firebase

**Kısa yol (macOS):** `KURULUM.command` dosyasına çift tıklayın (açılmazsa sağ tık → Aç). Giriş, proje seçimi, Firestore, e-posta ayarları, şifreler ve yayın adım adım yapılır. Elle yapmak isterseniz:

1. console.firebase.google.com → yeni proje (ör. `prefabrikteklif`). Cloud Functions ve zamanlanmış görev için **Blaze (kullandıkça öde)** planı gerekir; bu trafikte maliyet çok düşüktür.
2. Firestore'u açın (konum: `europe-west1` veya `eur3`).
3. Bilgisayarınızda:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add            # projeyi seçin
   cd functions && npm install && cd ..
   ```
4. E-posta ve ayarlar. `functions/.env` dosyası oluşturun:
   ```
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=465
   SMTP_USER=info@prefabrikteklif.com.tr
   MAIL_FROM=PrefabrikTeklif <info@prefabrikteklif.com.tr>
   ADMIN_EMAIL=sizin@epostaniz.com
   SITE_URL=https://www.prefabrikteklif.com.tr
   ```
   Gizli anahtarlar:
   ```bash
   firebase functions:secrets:set SMTP_PASS        # e-posta kutusunun şifresi
   firebase functions:secrets:set PLACES_API_KEY   # Google Places API (New) anahtarı
   ```
   Places anahtarını Google Cloud Console'da sadece "Places API (New)" ile sınırlayın. Google puanı kullanıcı "Google puanını göster" butonuna basınca çekilir; Google kuralları gereği sadece place_id saklanır.
5. Yayın:
   ```bash
   npm run build
   firebase deploy
   ```

## 4. Alan adı (METUnic)

Firebase Console → Hosting → **Özel alan adı ekle** → `www.prefabrikteklif.com.tr` (ana) ve `prefabrikteklif.com.tr` (www'ya yönlendir). Firebase'in verdiği TXT ve A kayıtlarını METUnic DNS yönetimine girin. SSL otomatik gelir (birkaç saat sürebilir).

## 5. Google Search Console

Search Console → Mülk ekle → doğrulama kodunu `site.config.ts` içine yazın, yeniden yayınlayın → Site haritaları: `https://www.prefabrikteklif.com.tr/sitemap-index.xml`.

## 6. Teklif akışı nasıl çalışır?

1. Kullanıcı `/teklif-al/` formunu doldurur → `talepler` koleksiyonuna kaydedilir, size (ADMIN_EMAIL) ve kullanıcıya e-posta gider.
2. Seçilen ve **kayıtlı** firmalara (Firestore `firmalar`) özel "Teklif ver" bağlantısı gönderilir. Kayıtlı olmayan seçili firmalar size gelen e-postada "Elle aranması gereken" olarak listelenir; ilk dönemde bu firmaları arayıp kayıt teklif edin.
3. Her 30 dakikada çalışan görev, 24 saati dolan talepler için gelen teklifleri tek tabloda kullanıcıya e-postalar.

**Firma aktif etmek:** Firestore → `firmalar` → belge kimliği firmanın slug'ı (ör. `karmod`):

```json
{ "aktif": true, "eposta": "satis@firma.com", "tipler": ["prefabrik", "celik"], "iller": ["*"] }
```

`iller` için `["*"]` tüm Türkiye; ya da `["Malatya", "Elazığ"]`. Firma başvuruları `firmaBasvurulari` koleksiyonuna düşer.

**Yorum onayı:** `yorumlar` koleksiyonunda `durum: "bekliyor"` → sözleşme belgesini kontrol edip `"onayli"` yapın. Firma cevabı için `cevap` alanı ekleyin.

## 7. Fiyat güncelleme

CSV'leri `data/raw/` içine koyun (sütunlar: `firma,model_adi,tip,m2,oda,kat,fiyat_tl,fiyat_kapsami,kaynak_url,kontrol_tarihi`), sonra `npm run build && firebase deploy`. İstatistikler, sayfa başlıklarındaki ay ve oda/m² sayfaları otomatik güncellenir. Listeye alınmayan firmalar ve hatalı fiyatlar `scripts/build_data.py` içindeki `HARIC_FIRMALAR` ve `HARIC_MODELLER` ile yönetilir.

## Veri notları (1 Kasım 2026)

- Fiyatlar firmaların sitelerinden alındı; kaynaklar her modelde. Çoğu firma KDV durumunu yazmıyor, bunlar "belirtilmemiş" olarak işaretli.
- Elenenler: Kartal Prefabrik ve Çelik Evler (Karmod'un sitesi), Prefabriko (Nova ile aynı adres), Mopre (site kapalı), Demo Prefabrik ve Prefabrika (site açılmıyor), Kardeşler'in iki hatalı fiyatı.
- Uyarıyla gösterilenler: Asia (kampanya tarihi geçmiş), Villa Prefabrik ve Esse (eski liste), Mira (m² başına sabit oranlı fiyatlar), Lider (sosyal medya ilanı). Bu modeller listede sona alınır.
- 25 firma fiyat yayınlamıyor ya da sadece euro/m² fiyatı veriyor; bunlar firma listesinde var.

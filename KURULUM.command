#!/bin/bash
# PrefabrikTeklif — Firebase kurulum ve yayın (macOS)
# Çift tıklayın. Açılmazsa: sağ tık → Aç.
set -e
cd "$(dirname "$0")"
YESIL='\033[1;32m'; KIRMIZI='\033[1;31m'; NORMAL='\033[0m'
adim() { echo; echo -e "${YESIL}▶ $1${NORMAL}"; }
hata() { echo -e "${KIRMIZI}✖ $1${NORMAL}"; echo; read -r -p "Kapatmak için Enter'a basın (başka bir şey yazmayın)..." _; exit 1; }

echo "=============================================="
echo "  PrefabrikTeklif kurulumu"
echo "=============================================="

adim "1/7 Node.js kontrol ediliyor"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js yüklü değil. https://nodejs.org adresinden 'LTS' sürümünü indirip kurun,"
  echo "sonra bu dosyaya tekrar çift tıklayın."
  open "https://nodejs.org/tr/download" 2>/dev/null || true
  hata "Node.js gerekli."
fi
echo "Node.js $(node -v) bulundu."
FB="npx -y firebase-tools@latest"

adim "2/7 Google hesabıyla giriş (tarayıcı açılacak, yusuf4461@gmail.com ile onaylayın)"
$FB login || hata "Giriş yapılamadı."

adim "3/7 Firebase projesi seçiliyor"
LISTE=$($FB projects:list --json 2>/dev/null || true)
PROJE=$(node -e '
  let d={}; try{d=JSON.parse(process.argv[1]||"{}")}catch(e){}
  const r=(d.result||[]).find(p=>/prefabrik/i.test((p.displayName||"")+" "+p.projectId));
  console.log(r?r.projectId:"")' "$LISTE")
if [ -z "$PROJE" ]; then
  $FB projects:list || true
  read -r -p "Yukarıdaki listeden 'Project ID' değerini yazın: " PROJE
fi
[ -z "$PROJE" ] && hata "Proje seçilmedi."
echo "Proje: $PROJE"
echo "{ \"projects\": { \"default\": \"$PROJE\" } }" > .firebaserc

echo
echo "ÖNEMLİ: Cloud Functions için projenin Blaze (kullandıkça öde) planında olması gerekir."
echo "Henüz yükseltmediyseniz şu sayfa açılacak: Upgrade → Blaze → kartınızı ekleyin."
open "https://console.firebase.google.com/project/$PROJE/usage/details" 2>/dev/null || true
read -r -p "Blaze planına geçtiyseniz Enter'a basın (şifre DEĞİL, sadece Enter)..." _

adim "4/7 Firestore veritabanı"
if $FB firestore:databases:list --project "$PROJE" 2>/dev/null | grep -q "(default)"; then
  echo "Veritabanı mevcut, devam."
elif $FB firestore:databases:create "(default)" --location=eur3 --project "$PROJE"; then
  echo "Veritabanı oluşturuldu."
else
  echo
  echo "Veritabanını konsoldan oluşturmanız gerekiyor. Açılacak sayfada:"
  echo "  'Create database' → konum: eur3 (Europe) → 'Start in production mode' → Create"
  open "https://console.firebase.google.com/project/$PROJE/firestore" 2>/dev/null || true
  read -r -p "Veritabanı oluşunca Enter'a basın..." _
fi

adim "5/7 E-posta ayarları"
read -r -p "Bildirimlerin gönderileceği e-posta [info@mitraajans.com]: " SMTPUSER; SMTPUSER=${SMTPUSER:-info@mitraajans.com}
read -r -p "SMTP sunucusu [smtp.hostinger.com]: " SMTPHOST; SMTPHOST=${SMTPHOST:-smtp.hostinger.com}
read -r -p "SMTP portu [465]: " SMTPPORT; SMTPPORT=${SMTPPORT:-465}
read -r -p "Yeni taleplerin geleceği yönetici e-postası [info@mitraajans.com]: " ADMIN; ADMIN=${ADMIN:-info@mitraajans.com}
cat > functions/.env <<EOF
SMTP_HOST=$SMTPHOST
SMTP_PORT=$SMTPPORT
SMTP_USER=$SMTPUSER
MAIL_FROM=PrefabrikTeklif <$SMTPUSER>
ADMIN_EMAIL=$ADMIN
SITE_URL=https://www.prefabrikteklif.com.tr
EOF
echo
echo "Şimdi $SMTPUSER e-posta kutusunun ŞİFRESİ istenecek."
echo "'Enter a value for SMTP_PASS' yazısını görünce şifreyi yazın; ekranda hiçbir şey görünmez, bu normal."
$FB functions:secrets:set SMTP_PASS --project "$PROJE" || hata "Şifre kaydedilemedi. Faturalandırma birkaç dakikada aktif olur; 5 dakika sonra bu dosyayı tekrar çalıştırın."
echo
echo "Google puanı için Places API anahtarı (yoksa sadece - yazıp Enter'a basın, sonra eklenebilir):"
$FB functions:secrets:set PLACES_API_KEY --project "$PROJE" || hata "Anahtar kaydedilemedi."

adim "6/7 Sunucu paketleri kuruluyor"
(cd functions && npm install --no-audit --no-fund) || hata "Paketler kurulamadı."

adim "7/7 Site ve sunucu yayınlanıyor (birkaç dakika sürer)"
$FB deploy --only hosting,functions,firestore --project "$PROJE" --force || hata "Yayın sırasında hata oluştu. Yukarıdaki mesajı Claude'a gönderin."

echo
echo -e "${YESIL}✔ Kurulum tamam!${NORMAL}"
echo "Geçici adres: https://$PROJE.web.app"
echo
echo "Son adım: alan adını bağlamak. Açılacak sayfada 'Özel alan adı ekle' ile"
echo "  www.prefabrikteklif.com.tr  ve  prefabrikteklif.com.tr  ekleyin;"
echo "verilen kayıtları METUnic DNS yönetimine girin."
open "https://console.firebase.google.com/project/$PROJE/hosting/sites" 2>/dev/null || true
read -r -p "Kapatmak için Enter'a basın..." _

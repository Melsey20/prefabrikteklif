#!/bin/bash
# PrefabrikTeklif — site e-postalarını Google Workspace kurumsal adresinden (…@prefabrikteklif.com.tr) göndermeye geçirir (macOS).
# Önce GUNCELLE-OTOMATIK en az bir kez çalışmış olmalı. Çalıştırma: bash ~/Downloads/EPOSTA-KURUMSAL.command
set -e
YESIL='\033[1;32m'; KIRMIZI='\033[1;31m'; NORMAL='\033[0m'
adim() { echo; echo -e "${YESIL}▶ $1${NORMAL}"; }
hata() { echo -e "${KIRMIZI}✖ $1${NORMAL}"; read -r -p "Kapatmak için Enter'a basın..." _; exit 1; }
CALISMA="$HOME/PrefabrikTeklif-yayin"
[ -f "$CALISMA/functions/.env" ] || hata "Önce GUNCELLE-OTOMATIK.command dosyasını çalıştırın."
cd "$CALISMA"; FB="npx -y firebase-tools@latest"

adim "1/4 Kurumsal adres ve uygulama şifresi"
read -r -p "Gönderen kurumsal adres [info@prefabrikteklif.com.tr]: " HESAP
HESAP="${HESAP:-info@prefabrikteklif.com.tr}"
case "$HESAP" in *@prefabrikteklif.com.tr) ;; *) hata "Adres @prefabrikteklif.com.tr ile bitmeli." ;; esac
echo "Açılacak sayfada $HESAP hesabıyla giriş yapın (hesapta 2 adımlı doğrulama açık olmalı)."
echo "Uygulama adı olarak 'PrefabrikTeklif' yazıp 'Oluştur'a basın; çıkan 16 harfli şifreyi kopyalayın."
open "https://myaccount.google.com/apppasswords" 2>/dev/null || true
read -r -s -p "Şifreyi buraya yapıştırıp Enter'a basın (ekranda görünmez): " PW; echo
PW="$(printf '%s' "$PW" | tr -d ' ')"
[ ${#PW} -eq 16 ] || hata "Şifre 16 harf olmalı. Tekrar deneyin."

adim "2/4 Bağlantı deneniyor"
(cd functions && [ -d node_modules/nodemailer ] || npm install --no-audit --no-fund >/dev/null)
SMTP_PW="$PW" HESAP="$HESAP" node -e '
const nm=require("./functions/node_modules/nodemailer");
nm.createTransport({host:"smtp.gmail.com",port:465,secure:true,auth:{user:process.env.HESAP,pass:process.env.SMTP_PW}}).verify()
.then(()=>console.log("Bağlantı başarılı.")).catch(e=>{console.error("Bağlantı kurulamadı:",e.message);process.exit(1)})' || hata "Google şifreyi kabul etmedi. Uygulama şifresini yeniden oluşturup tekrar deneyin."

adim "3/4 Sunucu ayarları güncelleniyor"
ayarla() { grep -v "^$1=" functions/.env > functions/.env.tmp; mv functions/.env.tmp functions/.env; printf '%s=%s\n' "$1" "$2" >> functions/.env; }
ayarla SMTP_HOST smtp.gmail.com
ayarla SMTP_PORT 465
ayarla SMTP_USER "$HESAP"
ayarla MAIL_FROM "\"Prefabrik Teklif <$HESAP>\""
ayarla MAIL_REPLY "$HESAP"
GECICI="$(mktemp)"; chmod 600 "$GECICI"; printf '%s' "$PW" > "$GECICI"
$FB functions:secrets:set SMTP_PASS --data-file "$GECICI" --force || { rm -f "$GECICI"; hata "Şifre kaydedilemedi."; }
rm -f "$GECICI"; unset PW

adim "4/4 Sunucu yeniden yayınlanıyor (birkaç dakika)"
$FB deploy --only functions --force || hata "Yayın sırasında hata oluştu. Bu pencerenin ekran görüntüsünü Claude'a gönderin."
echo
echo -e "${YESIL}✔ Site e-postaları artık $HESAP adresinden gidiyor. Yönetici bildirimleri yine prefabrikteklif@gmail.com'a gelir.${NORMAL}"
read -r -p "Kapatmak için Enter'a basın..." _

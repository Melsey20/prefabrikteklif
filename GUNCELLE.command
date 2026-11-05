#!/bin/bash
# PrefabrikTeklif — yeni sürümü yayınla (macOS). Çift tıklayın; açılmazsa sağ tık → Aç.
# İlk kurulumu (KURULUM.command) daha önce yaptıysanız bunu kullanın: şifre sormaz.
set -e
# Dosya adında OTOMATIK geçiyorsa hiçbir soru sormadan çalışır (varsayılan cevaplarla)
case "$(basename "$0")" in *OTOMATIK*) OTO=1;; *) OTO=;; esac
YESIL='\033[1;32m'; KIRMIZI='\033[1;31m'; NORMAL='\033[0m'
adim() { echo; echo -e "${YESIL}▶ $1${NORMAL}"; }
hata() { echo -e "${KIRMIZI}✖ $1${NORMAL}"; echo; [ -n "$OTO" ] || read -r -p "Kapatmak için Enter'a basın..." _; exit 1; }
echo "=============================================="
echo "  PrefabrikTeklif — yeni sürüm yayını"
echo "=============================================="
# Her çalıştırmada en güncel kod GitHub'dan indirilir ve her zaman aynı klasörden yayınlanır.
# (Eski bir zip/klasörden yanlışlıkla eski sürüm yayınlanmasın.)
CALISMA="$HOME/PrefabrikTeklif-yayin"
ENV_YEDEK="$(mktemp)"; rm -f "$ENV_YEDEK"
for d in "$CALISMA" "$(dirname "$0")" "$(dirname "$0")/site" "$HOME/Downloads/prefabrikteklif-v2.1/site" "$HOME/Downloads/prefabrikteklif-v2/site" "$HOME/Downloads/site" "$HOME/Desktop/prefabrikteklif-v2/site" "$HOME/Desktop/site"; do
  if [ -f "$d/functions/.env" ]; then cp "$d/functions/.env" "$ENV_YEDEK"; echo "Sunucu ayarları bulundu: $d/functions/.env"; break; fi
done
adim "En güncel sürüm GitHub'dan indiriliyor"
GECICI="$(mktemp -d)"
curl -fsSL "https://codeload.github.com/Melsey20/prefabrikteklif/tar.gz/refs/heads/main" | tar -xz -C "$GECICI" || hata "GitHub'dan indirilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin."
YENI="$(find "$GECICI" -maxdepth 1 -mindepth 1 -type d | head -1)"
[ -f "$YENI/firebase.json" ] && [ -d "$YENI/functions" ] || hata "İndirilen kod eksik."
rm -rf "$CALISMA"; mv "$YENI" "$CALISMA"; rm -rf "$GECICI"
cd "$CALISMA"
[ -f "$ENV_YEDEK" ] && cp "$ENV_YEDEK" functions/.env && rm -f "$ENV_YEDEK"
SURUM=$(curl -fsSL "https://api.github.com/repos/Melsey20/prefabrikteklif/commits/main" 2>/dev/null | grep -m1 '"message"' | cut -d'"' -f4 | head -c 90)
echo "Sürüm: ${SURUM:-en güncel}"
echo "Klasör: $(pwd)"
command -v node >/dev/null 2>&1 || { open "https://nodejs.org/tr/download"; hata "Node.js gerekli."; }
FB="npx -y firebase-tools@latest"

adim "1/6 Firebase oturumu"
$FB login || hata "Giriş yapılamadı."
LISTE=$($FB projects:list --json 2>/dev/null || true)
PROJE=$(node -e 'let d={};try{d=JSON.parse(process.argv[1]||"{}")}catch(e){};const r=(d.result||[]).find(p=>/prefabrik/i.test((p.displayName||"")+" "+p.projectId));console.log(r?r.projectId:"")' "$LISTE")
[ -z "$PROJE" ] && read -r -p "Firebase 'Project ID' değerini yazın: " PROJE
[ -z "$PROJE" ] && hata "Proje seçilmedi."
echo "{ \"projects\": { \"default\": \"$PROJE\" } }" > .firebaserc
echo "Proje: $PROJE"

adim "2/6 Web uygulaması kaydı (giriş sistemi için)"
APPS=$($FB apps:list WEB --project "$PROJE" --json 2>/dev/null || true)
ADET=$(node -e 'let d={};try{d=JSON.parse(process.argv[1]||"{}")}catch(e){};console.log((d.result||[]).length)' "$APPS")
if [ "$ADET" != "0" ] && [ -n "$ADET" ]; then echo "Web uygulaması mevcut."; else $FB apps:create WEB "PrefabrikTeklif" --project "$PROJE" || hata "Web uygulaması oluşturulamadı."; fi

adim "3/6 Sunucu ayarları"
if [ ! -f functions/.env ]; then
cat > functions/.env <<ENV
SMTP_HOST=oden.veridyen.com
SMTP_PORT=465
SMTP_USER=info@mitraajans.com
MAIL_FROM=PrefabrikTeklif <info@mitraajans.com>
ADMIN_EMAIL=prefabrikteklif@gmail.com
YONETICILER=prefabrikteklif@gmail.com,info@mitraajans.com,yusuf4461@gmail.com
SITE_URL=https://www.prefabrikteklif.com.tr
ENV
fi
# mitraajans.com e-postaları Veridyen sunucusunda (MX: oden.veridyen.com); eski Hostinger ayarını düzelt
if grep -q "SMTP_HOST=smtp.hostinger.com" functions/.env; then sed -i '' 's/SMTP_HOST=smtp.hostinger.com/SMTP_HOST=oden.veridyen.com/' functions/.env; echo "E-posta sunucusu oden.veridyen.com olarak düzeltildi."; fi
grep -q YONETICILER functions/.env || echo "YONETICILER=info@mitraajans.com,yusuf4461@gmail.com" >> functions/.env
# Bildirimler ve yönetici girişi: prefabrikteklif@gmail.com
if grep -q "^ADMIN_EMAIL=" functions/.env; then sed -i '' 's/^ADMIN_EMAIL=.*/ADMIN_EMAIL=prefabrikteklif@gmail.com/' functions/.env; else echo "ADMIN_EMAIL=prefabrikteklif@gmail.com" >> functions/.env; fi
grep "^YONETICILER=" functions/.env | grep -q "prefabrikteklif@gmail.com" || sed -i '' 's/^YONETICILER=/YONETICILER=prefabrikteklif@gmail.com,/' functions/.env
# iyzico (kartlı abonelik): anahtarlar ~/.prefabrik-iyzico dosyasından alınır (IYZICO_API_KEY=..., IYZICO_SECRET_KEY=..., isteğe bağlı IYZICO_BASE=https://sandbox-api.iyzipay.com)
if [ -f "$HOME/.prefabrik-iyzico" ]; then
  for k in IYZICO_API_KEY IYZICO_SECRET_KEY IYZICO_BASE IYZICO_PLAN; do
    v=$(grep "^$k=" "$HOME/.prefabrik-iyzico" | head -1 | cut -d= -f2- | tr -d '\r"' | xargs)
    [ -z "$v" ] && continue
    if grep -q "^$k=" functions/.env; then sed -i '' "s|^$k=.*|$k=$v|" functions/.env; else echo "$k=$v" >> functions/.env; fi
  done
  echo "iyzico anahtarları eklendi (kartlı abonelik açık)."
else
  echo "iyzico anahtar dosyası yok (~/.prefabrik-iyzico); kartlı abonelik kapalı kalır."
fi
# Tanımsız iyzico ayarları için yayında soru sorulmasın (boş = kartlı ödeme kapalı)
for k in IYZICO_API_KEY IYZICO_SECRET_KEY IYZICO_PLAN; do grep -q "^$k=" functions/.env || echo "$k=" >> functions/.env; done
grep -q "^IYZICO_BASE=" functions/.env || echo "IYZICO_BASE=https://api.iyzipay.com" >> functions/.env
echo "Bildirimlerin geleceği adres: $(grep ^ADMIN_EMAIL functions/.env | cut -d= -f2)"
echo "Yönetici e-postaları: $(grep YONETICILER functions/.env | cut -d= -f2)"
echo
echo "Sitenin e-posta gönderdiği hesap: $(grep SMTP_USER functions/.env | cut -d= -f2)"
if [ -n "$OTO" ]; then SIFRE_YENI=h; else read -r -p "Bu e-posta hesabının şifresi değişti mi / güncellemek ister misiniz? (e/h): " SIFRE_YENI; fi
if [ "$SIFRE_YENI" = "e" ] || [ "$SIFRE_YENI" = "E" ]; then
  echo "Şimdi e-posta şifresini yazın (yazarken görünmez), Enter'a basın:"
  $FB functions:secrets:set SMTP_PASS --project "$PROJE" --force || hata "Şifre kaydedilemedi."
fi
(cd functions && npm install --no-audit --no-fund) || hata "Paketler kurulamadı."

adim "4/6 Giriş yöntemlerini açın (bir kez)"
echo "Açılacak sayfada: 'Get started' (varsa) → Sign-in method sekmesi:"
echo "  • Email/Password → Enable → Save"
echo "  • Google → Enable → destek e-postası seçin → Save"
echo "  • Settings → Authorized domains: prefabrikteklif.com.tr ve www.prefabrikteklif.com.tr ekli değilse 'Add domain' ile ekleyin"
if [ -z "$OTO" ]; then open "https://console.firebase.google.com/project/$PROJE/authentication/providers" 2>/dev/null || true; read -r -p "Bitince Enter'a basın (sadece Enter)..." _; else echo "(Otomatik mod: atlandı, giriş yöntemleri zaten açık.)"; fi

adim "5/6 Sunucu ve veritabanı kuralları yayınlanıyor (birkaç dakika)"
# Site (hosting) GitHub Actions ile otomatik yayınlanır; burada eski bir dist yüklenmesin diye yalnızca sunucu tarafı yayınlanır.
$FB deploy --only functions,firestore --project "$PROJE" --force || hata "Yayın sırasında hata oluştu. Bu pencerenin ekran görüntüsünü Claude'a gönderin."

adim "6/6 Arama motorlarına bildirim (IndexNow: Bing, Yandex vb.)"
[ -d dist ] && node -e '
const fs=require("fs");const x=fs.readdirSync("dist").filter(f=>/^sitemap-\d+\.xml$/.test(f)).map(f=>fs.readFileSync("dist/"+f,"utf8")).join("");
const urls=[...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]).slice(0,10000);
fetch("https://api.indexnow.org/indexnow",{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify({host:"www.prefabrikteklif.com.tr",key:"c7f4e2a91b6d4f0e8a3b5d2c1e9f7a64",keyLocation:"https://www.prefabrikteklif.com.tr/c7f4e2a91b6d4f0e8a3b5d2c1e9f7a64.txt",urlList:urls})})
.then(r=>console.log("IndexNow:",r.status,urls.length+" adres")).catch(e=>console.log("IndexNow atlandı:",e.message));' || true

adim "Kontrol: canlı sunucu yeni sürümde mi?"
sleep 5
KOD=$(curl -s -o /dev/null -w '%{http_code}' "https://www.prefabrikteklif.com.tr/api/ben" || true)
if [ "$KOD" = "404" ]; then hata "Sunucu hâlâ eski sürümde görünüyor (kod $KOD). Bu pencerenin ekran görüntüsünü Claude'a gönderin."; fi
echo "Sunucu yanıtı: $KOD (yeni sürüm)"
echo
echo -e "${YESIL}✔ Yeni sürüm yayında!${NORMAL}"
echo "Adres: https://$PROJE.web.app  (alan adı bağlıysa https://www.prefabrikteklif.com.tr)"
echo "Yönetim paneli: /yonetim/   Firma paneli: /firma-paneli/"
[ -n "$OTO" ] || read -r -p "Kapatmak için Enter'a basın..." _

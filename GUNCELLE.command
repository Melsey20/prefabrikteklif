#!/bin/bash
# PrefabrikTeklif — yeni sürümü yayınla (macOS). Çift tıklayın; açılmazsa sağ tık → Aç.
# İlk kurulumu (KURULUM.command) daha önce yaptıysanız bunu kullanın: şifre sormaz.
set -e
cd "$(dirname "$0")"
if [ ! -d functions ] || [ ! -f firebase.json ]; then
  for d in "./site" "$HOME/Downloads/prefabrikteklif-v2.1/site" "$HOME/Downloads/prefabrikteklif-v2/site" "$HOME/Downloads/site" "$HOME/Desktop/prefabrikteklif-v2/site"; do
    if [ -d "$d/functions" ] && [ -f "$d/firebase.json" ]; then cd "$d"; break; fi
  done
fi
YESIL='\033[1;32m'; KIRMIZI='\033[1;31m'; NORMAL='\033[0m'
adim() { echo; echo -e "${YESIL}▶ $1${NORMAL}"; }
hata() { echo -e "${KIRMIZI}✖ $1${NORMAL}"; echo; read -r -p "Kapatmak için Enter'a basın..." _; exit 1; }
echo "=============================================="
echo "  PrefabrikTeklif — yeni sürüm yayını"
echo "=============================================="
[ -d functions ] && [ -f firebase.json ] || { echo "Site klasörü bulunamadı. Zip'i İndirilenler'de açın."; read -r -p "Enter..." _; exit 1; }
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
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=info@mitraajans.com
MAIL_FROM=PrefabrikTeklif <info@mitraajans.com>
ADMIN_EMAIL=info@mitraajans.com
YONETICILER=info@mitraajans.com,yusuf4461@gmail.com
SITE_URL=https://www.prefabrikteklif.com.tr
ENV
fi
grep -q YONETICILER functions/.env || echo "YONETICILER=info@mitraajans.com,yusuf4461@gmail.com" >> functions/.env
echo "Yönetici e-postaları: $(grep YONETICILER functions/.env | cut -d= -f2)"
(cd functions && npm install --no-audit --no-fund) || hata "Paketler kurulamadı."

adim "4/6 Giriş yöntemlerini açın (bir kez)"
echo "Açılacak sayfada: 'Get started' (varsa) → Sign-in method sekmesi:"
echo "  • Email/Password → Enable → Save"
echo "  • Google → Enable → destek e-postası seçin → Save"
echo "  • Settings → Authorized domains: prefabrikteklif.com.tr ve www.prefabrikteklif.com.tr ekli değilse 'Add domain' ile ekleyin"
open "https://console.firebase.google.com/project/$PROJE/authentication/providers" 2>/dev/null || true
read -r -p "Bitince Enter'a basın (sadece Enter)..." _

adim "5/6 Site, sunucu ve veritabanı kuralları yayınlanıyor (birkaç dakika)"
$FB deploy --only hosting,functions,firestore --project "$PROJE" --force || hata "Yayın sırasında hata oluştu. Bu pencerenin ekran görüntüsünü Claude'a gönderin."

adim "6/6 Arama motorlarına bildirim (IndexNow: Bing, Yandex vb.)"
node -e '
const fs=require("fs");const x=fs.readdirSync("dist").filter(f=>/^sitemap-\d+\.xml$/.test(f)).map(f=>fs.readFileSync("dist/"+f,"utf8")).join("");
const urls=[...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]).slice(0,10000);
fetch("https://api.indexnow.org/indexnow",{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify({host:"www.prefabrikteklif.com.tr",key:"c7f4e2a91b6d4f0e8a3b5d2c1e9f7a64",keyLocation:"https://www.prefabrikteklif.com.tr/c7f4e2a91b6d4f0e8a3b5d2c1e9f7a64.txt",urlList:urls})})
.then(r=>console.log("IndexNow:",r.status,urls.length+" adres")).catch(e=>console.log("IndexNow atlandı:",e.message));' || true

echo
echo -e "${YESIL}✔ Yeni sürüm yayında!${NORMAL}"
echo "Adres: https://$PROJE.web.app  (alan adı bağlıysa https://www.prefabrikteklif.com.tr)"
echo "Yönetim paneli: /yonetim/   Firma paneli: /firma-paneli/"
read -r -p "Kapatmak için Enter'a basın..." _

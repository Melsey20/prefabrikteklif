#!/bin/bash
# GitHub → Firebase otomatik yayın bağlantısı (bir kez). Çift tıklayın; açılmazsa sağ tık → Aç.
# Ne yapar: Firebase'de yayın yetkili bir hizmet hesabı oluşturur ve anahtarını GitHub deposuna gizli olarak ekler.
cd "$(dirname "$0")"
for d in "." "./site" "$HOME/Downloads/prefabrikteklif-v2.1/site" "$HOME/Downloads/prefabrikteklif-v2/site"; do [ -f "$d/firebase.json" ] && cd "$d" && break; done
echo "=============================================="
echo "  GitHub otomatik yayın bağlantısı"
echo "=============================================="
echo "Sorulara şu cevapları verin:"
echo "  • GitHub repository:  Melsey20/prefabrikteklif"
echo "  • Set up the workflow to run a build script...?  → n"
echo "  • Set up automatic deployment ... when a PR is merged?  → n"
echo "  • Dosya üzerine yazma soruları çıkarsa → n"
echo "(GitHub giriş penceresi açılırsa izin verin.)"
echo
for deneme in 1 2 3; do
  if npx -y firebase-tools@latest init hosting:github --project prefabrikteklif; then
    echo; echo "✔ Bitti. Claude'a 'GitHub bağlandı' yazabilirsiniz."; break
  fi
  echo; echo "✗ Google yeni hizmet hesabını henüz tanımadı ($deneme/3). 60 saniye sonra yeniden denenecek..."; sleep 60
done
read -r -p "Kapatmak için Enter'a basın..." _

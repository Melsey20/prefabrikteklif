#!/bin/bash
# Netgsm OTP SMS bilgilerini bu bilgisayarda gizli bir dosyaya kaydeder (~/.prefabrik-netgsm) ve sunucuyu günceller.
# Bilgiler sohbete, depoya ya da başka bir yere gönderilmez; yalnızca sunucu ayarına (functions/.env) eklenir.
set -e
echo "=== Prefabrik Teklif · Netgsm SMS ayarı ==="
echo "Netgsm portalındaki API alt kullanıcısının bilgilerini yazın."
read -r -p "Kullanıcı adı / abone no (ör. 850xxxxxxx): " K
echo "Şifre (yazarken görünmez):"; read -r -s S; echo
read -r -p "Onaylı SMS başlığı (ör. PREFABTKLF): " B
read -r -p "Uygulama anahtarı (appkey, yoksa boş bırakın): " A
if [ -z "$K" ] || [ -z "$S" ] || [ -z "$B" ]; then echo "Kullanıcı adı, şifre ve başlık gerekli. Hiçbir şey kaydedilmedi."; exit 1; fi
umask 077
printf 'NETGSM_KULLANICI=%s\nNETGSM_SIFRE=%s\nNETGSM_BASLIK=%s\nNETGSM_APPKEY=%s\n' "$K" "$S" "$B" "$A" > "$HOME/.prefabrik-netgsm"
chmod 600 "$HOME/.prefabrik-netgsm"
echo "Kaydedildi: ~/.prefabrik-netgsm (yalnızca sizin kullanıcınız okuyabilir)."
echo "Şimdi sunucu güncelleniyor..."
curl -fsSL https://raw.githubusercontent.com/Melsey20/prefabrikteklif/main/GUNCELLE.command -o "$HOME/Downloads/GUNCELLE-OTOMATIK.command"
bash "$HOME/Downloads/GUNCELLE-OTOMATIK.command"

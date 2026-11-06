#!/bin/bash
# İleti Merkezi SMS bilgilerini bu bilgisayarda gizli bir dosyaya kaydeder (~/.prefabrik-sms) ve sunucuyu günceller.
# Bilgiler sohbete, depoya ya da başka bir yere gönderilmez; yalnızca sunucu ayarına (functions/.env) eklenir.
set -e
echo "=== Prefabrik Teklif · SMS (İleti Merkezi) ayarı ==="
echo "İleti Merkezi panelinde: Ayarlar → Güvenlik → API Erişimi bölümündeki bilgileri yazın."
read -r -p "API Key: " K
echo "API Hash (yazarken görünmez):"; read -r -s H; echo
read -r -p "Onaylı SMS başlığı (ör. PREFABTKLF): " B
if [ -z "$K" ] || [ -z "$H" ] || [ -z "$B" ]; then echo "Key, hash ve başlık gerekli. Hiçbir şey kaydedilmedi."; exit 1; fi
umask 077
printf 'ILETIMERKEZI_KEY=%s\nILETIMERKEZI_HASH=%s\nILETIMERKEZI_BASLIK=%s\n' "$K" "$H" "$B" > "$HOME/.prefabrik-sms"
chmod 600 "$HOME/.prefabrik-sms"
echo "Kaydedildi: ~/.prefabrik-sms (yalnızca sizin kullanıcınız okuyabilir)."
echo "Şimdi sunucu güncelleniyor..."
curl -fsSL https://raw.githubusercontent.com/Melsey20/prefabrikteklif/main/GUNCELLE.command -o "$HOME/Downloads/GUNCELLE-OTOMATIK.command"
bash "$HOME/Downloads/GUNCELLE-OTOMATIK.command"

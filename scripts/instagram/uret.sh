#!/usr/bin/env bash
# Tek slot üretimi (Higgsfield sandbox): kartlar + hikâye görselleri + seslendirmeli Reels.
# Kullanım (depo kökünden): bash scripts/instagram/uret.sh scripts/instagram/icerik/2026-11-04-aksam.json ~/cikti
# Çıktı: A-1.jpg … (kartlar), story-A.jpg (her tasarımın ilk kartı, 1080×1920), reels-1.mp4, reels-2.mp4 …
# Gerekenler: FONT_DIR ve NODE_PATH ortam değişkenleri; JSON'daki her reels için ses_url.
set -euo pipefail
J="$1"; O="$2"; T="$O/tmp"
rm -rf "$O"; mkdir -p "$O" "$T"
python3 scripts/instagram/ig.py tasarim "$J" "$O"
node scripts/instagram/cek.cjs tasarim "$O/jobs.json"
for f in "$O"/*-1.jpg; do
  ad=$(basename "$f" -1.jpg)
  convert "$f" -resize 984x1230 \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "roundrectangle 0,0,983,1229,36,36" \) -alpha off -compose CopyOpacity -composite "$T/r$ad.png"
  convert -size 1080x1920 xc:'#0B0D0E' "$T/r$ad.png" -geometry +48+345 -compose over -composite -quality 92 "$O/story-$ad.jpg"
done
python3 scripts/instagram/ig.py reels "$J" "$T"
N=$(python3 -c "import json,sys;r=json.load(open(sys.argv[1]))['reels'];print(1 if isinstance(r,dict) else len(r))" "$J")
for k in $(seq 1 "$N"); do
  H="$T/reels-$k.html"; [ -f "$H" ] || H="$T/reels.html"
  read -r SURE URL < <(python3 -c "import json,sys;r=json.load(open(sys.argv[1]))['reels'];r=r if isinstance(r,dict) else r[int(sys.argv[2])-1];print(r['sure'],r['ses_url'])" "$J" "$k")
  K="$T/kare$k"; mkdir -p "$K"
  node scripts/instagram/cek.cjs reels "$H" "$K" "$SURE"
  ffmpeg -y -loglevel error -framerate 30 -i "$K/f%04d.jpg" -c:v libx264 -crf 19 -pix_fmt yuv420p "$T/sessiz$k.mp4"
  curl -sfo "$T/vo$k.mp3" "$URL"
  bash scripts/instagram/mix.sh "$T/sessiz$k.mp4" "$T/vo$k.mp3" "$O/reels-$k.mp4" 1.1
done
echo URET_OK

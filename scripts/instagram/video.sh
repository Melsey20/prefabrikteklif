#!/usr/bin/env bash
# Gerçek videolu Reels (Higgsfield sandbox: ffmpeg, faster-whisper, Playwright kurulu).
# Ham klipleri 1080×1920 / 30 fps'e kırpar, uç uca ekler, üstüne ig.py'nin saydam başlık katmanını
# (sahne türü "video") ve kelime kelime altyazıyı bindirir, sona koyu logo kapanışını ("son" sahnesi) koyar.
#
# Kullanım (depo kökünden): bash scripts/instagram/video.sh <içerik.json> <reels sırası (1'den)> <çıkış.mp4>
#
# JSON'daki Reels öğesi:
#   "video": {
#     "klipler": [ {"kaynak": "drive:<dosya id>" | "https://…", "bas": 0, "bit": 6.5}, … ],
#     "ses": "orijinal"        → videodaki konuşma kullanılır (kamera karşısında anlatım)
#          | "seslendirme"     → ses_url'deki ElevenLabs seslendirmesi, videonun kendi sesi %12'de altta kalır
#   },
#   "altyazi": "otomatik",     → konuşmadan whisper ile üretilir (sessiz izleyenler için; önerilir)
#   "sahneler": [ {"t":0,"tur":"video","h":"…<em>…</em>"}, …, {"t":…,"tur":"son","h":"…"} ],
#   "sure": 21.5
# Drive dosyaları "Bağlantıya sahip herkes görüntüleyebilir" olarak paylaşılmış olmalı (gdown ile indirilir).
set -euo pipefail
J="$1"; K="$2"; OUT="$3"
W="$(dirname "$OUT")/vtmp$K"; rm -rf "$W"; mkdir -p "$W/klip" "$W/kare"
py() { python3 -c "$@"; }

# 1) Klipleri indir, kırp, 9:16'ya getir
N=$(py "import json,sys;print(len(json.load(open(sys.argv[1]))['reels'][int(sys.argv[2])-1]['video']['klipler']))" "$J" "$K")
: > "$W/liste.txt"
for i in $(seq 0 $((N-1))); do
  read -r SRC BAS BIT < <(py "import json,sys;c=json.load(open(sys.argv[1]))['reels'][int(sys.argv[2])-1]['video']['klipler'][int(sys.argv[3])];print(c['kaynak'],c.get('bas',0),c.get('bit',''))" "$J" "$K" "$i")
  HAM="$W/ham$i"
  if [[ "$SRC" == drive:* ]]; then
    python3 -m gdown --version >/dev/null 2>&1 || pip install -q gdown >/dev/null 2>&1 || pip install -q --break-system-packages gdown >/dev/null
    python3 -m gdown -q --id "${SRC#drive:}" -O "$HAM"
  else
    curl -sfL -o "$HAM" "$SRC"
  fi
  SURE_ARG=(); [ -n "$BIT" ] && SURE_ARG=(-t "$(py "print(float('$BIT')-float('$BAS'))")")
  ffmpeg -y -loglevel error -ss "$BAS" "${SURE_ARG[@]}" -i "$HAM" -f lavfi -i anullsrc=r=44100:cl=stereo \
    -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p[v];[0:a]aresample=44100,aformat=channel_layouts=stereo[a0];[a0][1:a]amix=inputs=2:duration=first:normalize=0[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset veryfast -c:a aac -b:a 160k -shortest "$W/klip/$i.mp4" 2>/dev/null \
  || ffmpeg -y -loglevel error -ss "$BAS" "${SURE_ARG[@]}" -i "$HAM" -f lavfi -i anullsrc=r=44100:cl=stereo \
    -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p[v]" \
    -map "[v]" -map 1:a -c:v libx264 -crf 18 -preset veryfast -c:a aac -b:a 160k -shortest "$W/klip/$i.mp4"   # sessiz klip
  echo "file '$W/klip/$i.mp4'" >> "$W/liste.txt"
done
ffmpeg -y -loglevel error -f concat -safe 0 -i "$W/liste.txt" -c copy "$W/taban.mp4"

# 2) Ses kaynağı ve süre
SES=$(py "import json,sys;r=json.load(open(sys.argv[1]))['reels'][int(sys.argv[2])-1];print(r['video'].get('ses','seslendirme'))" "$J" "$K")
if [ "$SES" = "seslendirme" ]; then
  URL=$(py "import json,sys;print(json.load(open(sys.argv[1]))['reels'][int(sys.argv[2])-1]['ses_url'])" "$J" "$K")
  curl -sfo "$W/vo.mp3" "$URL"; KONUSMA="$W/vo.mp3"
else
  ffmpeg -y -loglevel error -i "$W/taban.mp4" -vn -ac 1 -ar 16000 "$W/orj.wav"; KONUSMA="$W/orj.wav"
fi

# 3) Altyazı (whisper, 2-4 kelimelik gruplar) → geçici JSON
python3 - "$J" "$K" "$KONUSMA" "$W/r.json" <<'PY'
import json, sys
J, K, ses, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
d = json.load(open(J)); r = d['reels'][K - 1]
if r.get('altyazi') == 'otomatik':
    from faster_whisper import WhisperModel
    m = WhisperModel('small', compute_type='int8')
    seg, _ = m.transcribe(ses, language='tr', word_timestamps=True)
    W = [w for s in seg for w in s.words]
    son = next((s['t'] for s in r['sahneler'] if s['tur'] == 'son'), r['sure'])
    gr, cur = [], []
    for w in W:
        cur.append(w)
        if len(cur) >= 4 or w.word.strip()[-1:] in '.?!,' or (cur and w.end - cur[0].start > 1.6):
            gr.append(cur); cur = []
    if cur: gr.append(cur)
    ay = []
    for g in gr:
        a, b = round(g[0].start, 2), round(g[-1].end + 0.12, 2)
        if a >= son: break
        ay.append([a, min(b, son), ' '.join(x.word.strip() for x in g)])
    r['altyazi'] = ay
d['reels'] = [r]
json.dump(d, open(out, 'w'), ensure_ascii=False)
PY

# 4) Saydam başlık + altyazı katmanı (ig.py okunurluk denetimini de yapar)
python3 scripts/instagram/ig.py reels "$W/r.json" "$W"
SURE=$(py "import json;print(json.load(open('$W/r.json'))['reels'][0]['sure'])")
node scripts/instagram/cek.cjs reels-png "$W/reels-1.html" "$W/kare" "$SURE"

# 5) Birleştir: video (kısa kalırsa son kare uzatılır) + katman + ses
ffmpeg -y -loglevel error -i "$W/taban.mp4" -framerate 30 -i "$W/kare/f%04d.png" -filter_complex \
  "[0:v]tpad=stop_mode=clone:stop_duration=30,trim=0:${SURE},setpts=PTS-STARTPTS[b];[b][1:v]overlay=0:0:shortest=1,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -crf 19 -preset medium -r 30 "$W/goruntu.mp4"
if [ "$SES" = "seslendirme" ]; then
  ffmpeg -y -loglevel error -i "$W/goruntu.mp4" -i "$W/vo.mp3" -i "$W/taban.mp4" -filter_complex \
    "[1:a]acompressor=threshold=-18dB:ratio=3:attack=5:release=80,loudnorm=I=-15:TP=-1.5:LRA=7,adelay=150|150[v];[2:a]volume=0.12,apad[o];[v][o]amix=inputs=2:duration=first:normalize=0,apad,atrim=0:${SURE}[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -t "$SURE" -movflags +faststart "$OUT"
else
  ffmpeg -y -loglevel error -i "$W/goruntu.mp4" -i "$W/taban.mp4" -filter_complex \
    "[1:a]highpass=f=80,acompressor=threshold=-20dB:ratio=3,loudnorm=I=-15:TP=-1.5:LRA=7,apad,atrim=0:${SURE},afade=t=out:st=$(py "print(max(0,$SURE-0.6))"):d=0.6[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -t "$SURE" -movflags +faststart "$OUT"
fi
cp "$W/r.json" "${OUT%.mp4}.altyazi.json"
echo "ok $OUT"

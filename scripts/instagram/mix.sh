#!/usr/bin/env bash
# Seslendirme + yumuşak fon müziği + video birleştirme (Higgsfield sandbox: ffmpeg + sox kurulu).
# Kullanım: mix.sh <sessiz_video.mp4> <seslendirme.mp3> <cikis.mp4> [tempo=1.1]
set -euo pipefail
V="$1"; VO="$2"; OUT="$3"; TEMPO="${4:-1.1}"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
W=$(mktemp -d)
# Fon müziği: Cmaj9 → Am9 → Fmaj7 → G6 yumuşak pad (telifsiz, sox ile üretilir)
i=0
for ch in "C3 E3 G3 B3 D4" "A2 C3 E3 G3 B3" "F2 A2 C3 E3 G3" "G2 B2 D3 E3 A3"; do
  args=(); for n in $ch; do args+=(sine "$n"); done
  sox -n -r 44100 -c 2 "$W/c$i.wav" synth 4 "${args[@]}" fade q 0.8 4 0.9 tremolo 3 15 gain -18
  i=$((i+1))
done
sox "$W/c0.wav" "$W/c1.wav" "$W/c2.wav" "$W/c3.wav" "$W/c0.wav" "$W/pad.wav" reverb 60 50 90 gain -n -26
# Seslendirme: tempo + hafif sıkıştırma; müziği konuşmanın altında tut
ffmpeg -y -loglevel error -i "$VO" -af "atempo=${TEMPO},acompressor=threshold=-18dB:ratio=3:attack=5:release=80,loudnorm=I=-15:TP=-1.5:LRA=7" -ar 44100 -ac 2 "$W/vo.wav"
ffmpeg -y -loglevel error -i "$V" -i "$W/vo.wav" -i "$W/pad.wav" -filter_complex \
 "[2:a]atrim=0:${D},afade=t=in:d=0.6,afade=t=out:st=$(python3 -c "print(max(0,$D-1.2))"):d=1.2,volume=0.55[m];[1:a]adelay=150|150[v];[v][m]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,atrim=0:${D}[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$OUT"
rm -rf "$W"
echo "ok $OUT"

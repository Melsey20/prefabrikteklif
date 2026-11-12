#!/usr/bin/env python3
"""Reels seslendirmeleri — ElevenLabs (Yusuf Bey'in hesabı). GitHub Actions'ta çalışır (seslendirme.yml).

Ne yapar: scripts/instagram/icerik/*.json içinde "seslendirme" metni olup henüz "ses_url"si olmayan her
Reels için ElevenLabs Text-to-Speech ile MP3 üretir, scripts/instagram/ses/<dosya>-<k>.mp3 olarak kaydeder
ve JSON'a ses_url (raw.githubusercontent adresi) + ses.kaynak = "elevenlabs" yazar.
Gerekenler: ELEVENLABS_API_KEY sırrı (Text to Speech izni). Ses: ELEVENLABS_VOICE_ID değişkeni
(yoksa VARSAYILAN_SES). Model: eleven_multilingual_v2 (Türkçe).
Kullanım: python3 scripts/instagram/seslendir.py [--sesler]   (--sesler: hesaptaki sesleri listeler)
"""
import datetime, glob, json, os, pathlib, sys, time, urllib.error, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
ICERIK = ROOT / 'scripts' / 'instagram' / 'icerik'
SES = ROOT / 'scripts' / 'instagram' / 'ses'
RAW = 'https://raw.githubusercontent.com/Melsey20/prefabrikteklif/main/scripts/instagram/ses/'
VARSAYILAN_SES = 'Hvrobr8BhLPfiaSv2cHi'  # ElevenLabs Voice Library "Gamze Özdemir" (Türkçe, İstanbul, kadın anlatıcı) — 12 Kasım 2026'da seçildi
MODEL = os.environ.get('ELEVENLABS_MODEL', '').strip() or 'eleven_multilingual_v2'
KEY = os.environ.get('ELEVENLABS_API_KEY', '').strip()
VOICE = os.environ.get('ELEVENLABS_VOICE_ID', '').strip() or VARSAYILAN_SES


def istek(yol, govde=None):
    req = urllib.request.Request('https://api.elevenlabs.io' + yol, method='POST' if govde else 'GET',
                                 data=json.dumps(govde).encode() if govde else None,
                                 headers={'xi-api-key': KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg, application/json'})
    for deneme in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            mesaj = e.read().decode(errors='replace')[:300]
            if e.code in (429, 500, 502, 503) and deneme < 2:
                time.sleep(10 * (deneme + 1)); continue
            sys.exit(f'ElevenLabs HTTP {e.code}: {mesaj}')


def sesler():
    for v in json.loads(istek('/v1/voices'))['voices']:
        print(v['voice_id'], '|', v['name'], '|', v.get('category', ''), '|', (v.get('labels') or {}))


ORNEK_METIN = ('Kırk metrekare bungalov kaça mal olur? Listemizde bungalov yüz altmış iki bin liradan başlıyor. '
               'Teklifleri tek tabloda karşılaştırın; bağlantı profilde.')


def kutuphane():
    """Voice Library'de ara: KUTUPHANE_ARA="language=tr&gender=female" gibi sorgu (birden çoğu ';' ile)."""
    for q in os.environ.get('KUTUPHANE_ARA', 'language=tr&gender=female').split(';'):
        print('==', q)
        try:
            veri = json.loads(istek(f'/v1/shared-voices?page_size=60&{q}'))
        except SystemExit as e:
            print('HATA', e); continue
        for v in veri.get('voices', []):
            print(v.get('voice_id'), '|', v.get('name'), '|', v.get('public_owner_id'), '|', v.get('language'), v.get('accent'),
                  v.get('gender'), v.get('age'), '|', v.get('use_case'), '|', v.get('cloned_by_count'), '|',
                  (v.get('description') or '')[:90].replace('\n', ' '), '|', v.get('preview_url'))


def ornek():
    """Ses seçimi için örnek: ORNEK_SESLER="ad:voice_id,ad:voice_id" → ses/ornek/<ad>.mp3"""
    (SES / 'ornek').mkdir(parents=True, exist_ok=True)
    metinler = [m.strip() for m in os.environ.get('ORNEK_METINLER', '').split('|') if m.strip()] or [ORNEK_METIN]
    for parca in os.environ.get('ORNEK_SESLER', '').split(','):
        if ':' not in parca:
            continue
        ad, vid = [x.strip() for x in parca.split(':', 1)]
        for i, metin in enumerate(metinler, 1):
            mp3 = istek(f'/v1/text-to-speech/{vid}?output_format=mp3_44100_128', {
                'text': metin, 'model_id': MODEL, 'language_code': 'tr',
                'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.15, 'use_speaker_boost': True}})
            dosya = f'{ad}.mp3' if len(metinler) == 1 else f'{ad}-{i}.mp3'
            (SES / 'ornek' / dosya).write_bytes(mp3)
            print('ornek:', dosya, vid, len(mp3), 'bayt', '|', metin)


def main():
    if not KEY:
        sys.exit('ELEVENLABS_API_KEY sırrı tanımlı değil (GitHub → Settings → Secrets → Actions).')
    if '--sesler' in sys.argv:
        return sesler()
    if '--ornek' in sys.argv:
        return ornek()
    if '--kutuphane' in sys.argv:
        return kutuphane()
    SES.mkdir(parents=True, exist_ok=True)
    uretilen = 0
    bugun = (datetime.datetime.utcnow() + datetime.timedelta(hours=3)).strftime('%Y-%m-%d')  # İstanbul
    for f in sorted(glob.glob(str(ICERIK / '*.json'))):
        p = pathlib.Path(f); d = json.loads(p.read_text())
        if str(d.get('tarih', '')) < bugun:  # eski içerikler için ses üretme (kredi harcamasın)
            continue
        R = d.get('reels') or []
        liste = [R] if isinstance(R, dict) else R
        degisti = False
        for k, r in enumerate(liste, 1):
            metin = (r.get('seslendirme') or '').strip()
            if not metin or r.get('ses_url'):
                continue
            ad = f'{p.stem}-{k}.mp3'
            mp3 = istek(f'/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128', {
                'text': metin, 'model_id': MODEL, 'language_code': 'tr',
                'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.15, 'use_speaker_boost': True}})
            if not mp3 or len(mp3) < 2000:
                sys.exit(f'{ad}: ElevenLabs boş ses döndürdü')
            (SES / ad).write_bytes(mp3)
            r['ses_url'] = RAW + ad
            r['ses'] = {'kaynak': 'elevenlabs', 'model': MODEL, 'voice_id': VOICE}
            degisti = True; uretilen += 1
            print('ses:', ad, len(mp3), 'bayt')
        if degisti:
            p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    print(f'SESLENDIRME_OK {uretilen}')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Instagram paylaşımcısı (Meta Graph API, Supermetrics'in yerine).

İçerik dosyaları: scripts/instagram/icerik/YYYY-MM-DD-{sabah,aksam}.json
Bir dosya şu durumda sıraya girer: yayin.medya dolu (tasarim[], story, reels[]) ve
yayin.durum “zamanlandı (Supermetrics…” değil (eski, Supermetrics'in yayınladıkları).

Plan (dosyadaki saat'e göre, İstanbul saati):
  +0 dk  tasarım (birden çok görsel → karusel, tek görsel → gönderi)   açıklama: tasarimlar[0].aciklama
  +20 dk Reels 1, +40 dk Reels 2                                         açıklama: reels[k].aciklama
  +45 dk hikâye (story görseli), +50 / +55 dk Reels 1 ve 2 hikâye olarak
Her çalışmada en fazla 1 öğe yayınlanır (öğeler arasında aralık kalsın diye). Zamanı gelmiş ama
GEC_SAAT'ten daha eski öğeler atlanır (birikmiş içerik bir anda akmasın). Yayınlanan öğe
yayin.yayinlanan altına kaydedilir; aynı öğe iki kez yayınlanmaz.

Kullanım:  META_TOKEN=… python3 scripts/instagram/yayinla.py [--kuru]
  --kuru   hiçbir şey yayınlamaz, sıradaki öğeyi ve planı yazar.
"""
import datetime as dt
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

G = 'https://graph.facebook.com/v21.0'
TZ = ZoneInfo('Europe/Istanbul')
ICERIK = pathlib.Path(__file__).resolve().parent / 'icerik'
GEC_SAAT = float(os.environ.get('GEC_SAAT', '6'))
IG_VARSAYILAN = '17841474767654199'  # @prefabrik.teklif


class GraphHata(Exception):
    pass


def api(yontem, yol, **p):
    """Graph API çağrısı. Jeton gövdede/parametrede gider; hata mesajında adres yazdırılmaz."""
    p['access_token'] = os.environ['META_TOKEN']
    veri = urllib.parse.urlencode({k: (json.dumps(v) if isinstance(v, (list, dict)) else v) for k, v in p.items()}).encode()
    if yontem == 'GET':
        istek = urllib.request.Request(f'{G}/{yol}?{veri.decode()}')
    else:
        istek = urllib.request.Request(f'{G}/{yol}', data=veri, method='POST')
    try:
        with urllib.request.urlopen(istek, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            m = json.loads(e.read()).get('error', {})
            raise GraphHata(f"{m.get('message', 'bilinmeyen hata')} (kod {m.get('code')}/{m.get('error_subcode', '-')})") from None
        except (ValueError, AttributeError):
            raise GraphHata(f'HTTP {e.code}') from None


def bekle(kap, sure=420):
    """Konteyner hazır olana kadar bekler (video işleme birkaç dakika sürebilir)."""
    son = time.time() + sure
    while time.time() < son:
        d = api('GET', kap, fields='status_code,status')
        if d.get('status_code') == 'FINISHED':
            return
        if d.get('status_code') in ('ERROR', 'EXPIRED'):
            raise GraphHata(f"medya işlenemedi: {d.get('status', d.get('status_code'))}")
        time.sleep(10)
    raise GraphHata('medya işleme zaman aşımı')


def yayinla_ogesi(ig, oge):
    t = oge['tur']
    if t == 'tasarim':
        gorseller = oge['medya']
        if len(gorseller) == 1:
            ek = {'alt_text': oge['alt']} if oge.get('alt') else {}
            kap = api('POST', f'{ig}/media', image_url=gorseller[0], caption=oge['aciklama'], **ek)['id']
        else:
            cocuk = [api('POST', f'{ig}/media', image_url=u, is_carousel_item='true')['id'] for u in gorseller[:10]]
            for c in cocuk:
                bekle(c)
            kap = api('POST', f'{ig}/media', media_type='CAROUSEL', children=','.join(cocuk), caption=oge['aciklama'])['id']
    elif t == 'reels':
        kap = api('POST', f'{ig}/media', media_type='REELS', video_url=oge['medya'], caption=oge['aciklama'], share_to_feed='true')['id']
    elif t == 'story':
        alan = 'video_url' if oge['medya'].lower().endswith('.mp4') else 'image_url'
        kap = api('POST', f'{ig}/media', media_type='STORIES', **{alan: oge['medya']})['id']
    else:
        raise GraphHata(f'bilinmeyen tür {t}')
    bekle(kap)
    return api('POST', f'{ig}/media_publish', creation_id=kap)['id']


def plan(d):
    """Bir içerik dosyasındaki öğeleri (anahtar, zaman, tür, medya, açıklama) sırasıyla döndürür."""
    y = d.get('yayin') or {}
    m = y.get('medya') or {}
    if not m or str(y.get('durum', '')).startswith('zamanlandı'):
        return []
    t0 = dt.datetime.fromisoformat(f"{d['tarih']}T{d.get('saat', '10:00')}").replace(tzinfo=TZ)
    reels = d.get('reels') or []
    reels = [reels] if isinstance(reels, dict) else reels
    ogeler = []
    if m.get('tasarim'):
        t = (d.get('tasarimlar') or [{}])[0]
        ogeler.append(dict(anahtar='tasarim', dk=0, tur='tasarim', medya=m['tasarim'], aciklama=t.get('aciklama', ''), alt=t.get('alt_text', '')))
    for k, u in enumerate(m.get('reels') or []):
        ogeler.append(dict(anahtar=f'reels-{k + 1}', dk=20 * (k + 1), tur='reels', medya=u, aciklama=(reels[k] if k < len(reels) else {}).get('aciklama', '')))
    if m.get('story'):
        ogeler.append(dict(anahtar='story', dk=45, tur='story', medya=m['story'], aciklama=''))
    for k, u in enumerate(m.get('reels') or []):
        ogeler.append(dict(anahtar=f'story-reels-{k + 1}', dk=50 + 5 * k, tur='story', medya=u, aciklama=''))
    for o in ogeler:
        o['zaman'] = t0 + dt.timedelta(minutes=o['dk'])
    return ogeler


def sirada(simdi=None):
    """Zamanı gelmiş, yayınlanmamış ve çok gecikmemiş ilk öğe: (dosya, veri, öğe) ya da None."""
    simdi = simdi or dt.datetime.now(TZ)
    adaylar = []
    for f in sorted(ICERIK.glob('*.json')):
        d = json.loads(f.read_text())
        bitti = (d.get('yayin') or {}).get('yayinlanan') or {}
        hata = (d.get('yayin') or {}).get('hatalar') or {}
        for o in plan(d):
            if (hata.get(o['anahtar']) or {}).get('deneme', 0) >= 3:  # 3 kez başarısız olan öğe atlanır
                continue
            if o['anahtar'] in bitti or o['zaman'] > simdi or simdi - o['zaman'] > dt.timedelta(hours=GEC_SAAT):
                continue
            adaylar.append((o['zaman'], f, d, o))
    adaylar.sort(key=lambda x: x[0])
    return adaylar[0][1:] if adaylar else None


def main():
    kuru = '--kuru' in sys.argv
    simdi = dt.datetime.now(TZ)
    s = sirada(simdi)
    if kuru:
        for f in sorted(ICERIK.glob('*.json'))[-4:]:
            d = json.loads(f.read_text())
            bitti = (d.get('yayin') or {}).get('yayinlanan') or {}
            for o in plan(d):
                print(f"{f.name:28} {o['zaman']:%d.%m %H:%M} {o['anahtar']:15} {'yayınlandı' if o['anahtar'] in bitti else ('zamanı geldi' if o['zaman'] <= simdi else 'bekliyor')}")
        print('Sıradaki:', f"{s[0].name} {s[2]['anahtar']}" if s else 'yok')
        return
    if not s:
        print('Yayınlanacak öğe yok.')
        return
    f, d, o = s
    ig = (d.get('yayin') or {}).get('hesap') or os.environ.get('IG_USER_ID') or IG_VARSAYILAN
    print(f"Yayınlanıyor: {f.name} · {o['anahtar']} (plan {o['zaman']:%H:%M})")
    y = d.setdefault('yayin', {})
    try:
        mid = yayinla_ogesi(ig, o)
    except GraphHata as e:
        h = y.setdefault('hatalar', {}).get(o['anahtar']) or {}
        y['hatalar'][o['anahtar']] = {'mesaj': str(e), 'zaman': f'{simdi:%Y-%m-%d %H:%M}', 'deneme': h.get('deneme', 0) + 1}
        f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
        print('HATA:', e)
        sys.exit(1)
    y.setdefault('yayinlanan', {})[o['anahtar']] = {'id': mid, 'zaman': dt.datetime.now(TZ).strftime('%Y-%m-%d %H:%M')}
    y.get('hatalar', {}).pop(o['anahtar'], None)
    if not y.get('hatalar'):
        y.pop('hatalar', None)
    toplam = len(plan(d))
    y['durum'] = f"yayında (Meta Graph API): {len(y['yayinlanan'])}/{toplam} öğe yayınlandı"
    f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    print(f"Yayınlandı: {o['anahtar']} → medya {mid}")


if __name__ == '__main__':
    main()

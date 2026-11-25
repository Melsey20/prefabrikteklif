#!/usr/bin/env python3
"""Instagram istatistik raporu (Meta Graph API, yayinla.py ile aynı META_TOKEN).

Her gönderinin erişimini, izlenmesini, Reels izlenme süresini, kaydetme / paylaşım / beğeni / yorum
sayılarını ve hesabın günlük erişimini çeker; gönderileri icerik/*.json dosyalarıyla (yayin.yayinlanan.id)
eşleştirip hook başlığını yanına yazar.

Çıktı (depoya işlenir, günlük içerik görevi konu seçmeden önce okur):
  scripts/instagram/istatistik/rapor.md          — okunur özet: en iyiler, en kötüler, tür ortalamaları, tüm tablo
  scripts/instagram/istatistik/YYYY-MM-DD.json   — ham veri (gönderi başına metrikler + hesap)

Kullanım:  META_TOKEN=… python3 scripts/instagram/istatistik.py [--gun 30]
Jetonda instagram_manage_insights izni yoksa metrikler boş gelir; rapor bunu "İZİN YOK" diye yazar.
"""
import datetime as dt
import json
import os
import pathlib
import re
import statistics
import sys
import urllib.error
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

SURUM = os.environ.get('GRAPH_SURUM', 'v23.0')
G = f'https://graph.facebook.com/{SURUM}'
TZ = ZoneInfo('Europe/Istanbul')
KOK = pathlib.Path(__file__).resolve().parent
ICERIK = KOK / 'icerik'
CIKTI = KOK / 'istatistik'
IG = os.environ.get('IG_USER_ID', '17841474767654199')  # @prefabrik.teklif

METRIK = {
    'REELS': ['reach', 'views', 'saved', 'shares', 'likes', 'comments', 'total_interactions',
              'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time'],
    'FEED': ['reach', 'views', 'saved', 'shares', 'likes', 'comments', 'total_interactions', 'profile_visits', 'follows'],
}
HATALAR = []


def api(yol, **p):
    p['access_token'] = os.environ['META_TOKEN']
    url = f'{G}/{yol}?{urllib.parse.urlencode(p)}'
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            m = json.loads(e.read()).get('error', {})
            raise RuntimeError(f"{m.get('message', 'bilinmeyen hata')} (kod {m.get('code')})") from None
        except ValueError:
            raise RuntimeError(f'HTTP {e.code}') from None


def medya_listesi(gun):
    sinir = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=gun)
    out, sayfa = [], api(f'{IG}/media', fields='id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count', limit=50)
    while True:
        for m in sayfa.get('data', []):
            if dt.datetime.fromisoformat(m['timestamp'].replace('+0000', '+00:00')) < sinir:
                return out
            out.append(m)
        sonraki = (sayfa.get('paging') or {}).get('cursors', {}).get('after')
        if not sonraki or not (sayfa.get('paging') or {}).get('next'):
            return out
        sayfa = api(f'{IG}/media', fields='id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count', limit=50, after=sonraki)


def medya_metrik(m):
    tur = 'REELS' if m.get('media_product_type') == 'REELS' else 'FEED'
    d = {}
    for k in METRIK[tur]:  # tek tek iste: desteklenmeyen bir metrik diğerlerini düşürmesin
        try:
            r = api(f"{m['id']}/insights", metric=k)
            v = r['data'][0]
            d[k] = v.get('values', [{}])[0].get('value') if 'values' in v else (v.get('total_value') or {}).get('value')
        except Exception as e:  # noqa: BLE001
            HATALAR.append(f"{k}: {e}")
    return d


def hesap(gun):
    h = {}
    try:
        h.update(api(IG, fields='username,followers_count,follows_count,media_count'))
    except Exception as e:  # noqa: BLE001
        HATALAR.append(f'hesap: {e}')
    bugun = dt.datetime.now(TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    bas = bugun - dt.timedelta(days=min(gun, 28))
    try:
        r = api(f'{IG}/insights', metric='reach', period='day', since=int(bas.timestamp()), until=int(bugun.timestamp()))
        h['gunluk_erisim'] = {v['end_time'][:10]: v['value'] for v in r['data'][0]['values']}
    except Exception as e:  # noqa: BLE001
        HATALAR.append(f'hesap erişimi: {e}')
    for k in ('views', 'accounts_engaged', 'total_interactions', 'profile_views', 'website_clicks', 'follows_and_unfollows'):
        try:
            r = api(f'{IG}/insights', metric=k, period='day', metric_type='total_value',
                    since=int((bugun - dt.timedelta(days=7)).timestamp()), until=int(bugun.timestamp()))
            h[f'son7_{k}'] = (r['data'][0].get('total_value') or {}).get('value')
        except Exception as e:  # noqa: BLE001
            HATALAR.append(f'hesap {k}: {e}')
    return h


def eslesme():
    """Instagram medya id → (içerik dosyası, öğe, hook başlığı, ana görsel)."""
    es = {}
    for f in sorted(ICERIK.glob('*.json')):
        d = json.loads(f.read_text())
        reels = d.get('reels') or []
        reels = [reels] if isinstance(reels, dict) else reels
        for anahtar, v in ((d.get('yayin') or {}).get('yayinlanan') or {}).items():
            if anahtar.startswith('story'):
                continue
            if anahtar == 'tasarim':
                t = (d.get('tasarimlar') or [{}])[0]
                k = (t.get('kartlar') or [t])[0]
                bas, aciklama = k.get('h') or k.get('baslik') or '', t.get('aciklama', '')
            else:
                r = reels[int(anahtar.split('-')[1]) - 1] if anahtar.split('-')[1].isdigit() and int(anahtar.split('-')[1]) <= len(reels) else {}
                bas, aciklama = ((r.get('sahneler') or [{}])[0]).get('h', ''), r.get('aciklama', '')
            bas = re.sub(r'<[^>]+>', ' ', bas).replace('  ', ' ').strip()
            firma = 'firmalar-icin' in aciklama
            es[str(v.get('id'))] = dict(dosya=f.name, oge=anahtar, baslik=bas, hedef='firma' if firma else 'ev arayan',
                                       kart=len(((d.get('tasarimlar') or [{}])[0]).get('kartlar') or []) if anahtar == 'tasarim' else None)
    return es


def sayi(x):
    return '—' if x is None else (f'{x:,.0f}'.replace(',', '.') if isinstance(x, (int, float)) else str(x))


def rapor(medya, h, gun):
    satirlar = []
    for m in medya:
        mt = m.get('metrik') or {}
        tur = 'Reels' if m.get('media_product_type') == 'REELS' else ('Karusel' if m.get('media_type') == 'CAROUSEL_ALBUM' else 'Tekli')
        izl = mt.get('ig_reels_avg_watch_time')
        satirlar.append(dict(
            tarih=dt.datetime.fromisoformat(m['timestamp'].replace('+0000', '+00:00')).astimezone(TZ).strftime('%d.%m %H:%M'),
            tur=tur, hedef=(m.get('eslesme') or {}).get('hedef', '?'),
            baslik=(m.get('eslesme') or {}).get('baslik') or (m.get('caption') or '').split('\n')[0][:60],
            erisim=mt.get('reach'), izlenme=mt.get('views'), sure=round(izl / 1000, 1) if isinstance(izl, (int, float)) else None,
            kaydet=mt.get('saved'), paylas=mt.get('shares'), begeni=mt.get('likes', m.get('like_count')),
            yorum=mt.get('comments', m.get('comments_count')), profil=mt.get('profile_visits'), takip=mt.get('follows'),
            link=m.get('permalink', '')))
    izin_yok = all(s['erisim'] is None for s in satirlar) and satirlar
    simdi = dt.datetime.now(TZ)
    L = [f'# Instagram istatistik raporu — {simdi:%d.%m.%Y %H:%M}', '',
         f"Hesap: @{h.get('username', 'prefabrik.teklif')} · takipçi **{sayi(h.get('followers_count'))}** · gönderi {sayi(h.get('media_count'))} · "
         f'son {gun} günün {len(satirlar)} gönderisi.', '']
    if izin_yok:
        L += ['> **İZİN YOK:** gönderi metrikleri okunamadı. META_TOKEN jetonuna `instagram_manage_insights` izni verilmeli '
              '(Meta Business Suite → İşletme ayarları → Sistem kullanıcıları → jeton oluştururken izinler).', '']
    if h.get('gunluk_erisim'):
        ge = h['gunluk_erisim']
        L += ['## Hesap', '',
              f"Son 7 gün: erişilen hesap (günlük toplam) {sayi(sum(list(ge.values())[-7:]))} · görüntülenme {sayi(h.get('son7_views'))} · "
              f"etkileşen hesap {sayi(h.get('son7_accounts_engaged'))} · profil ziyareti {sayi(h.get('son7_profile_views'))} · "
              f"web sitesi tıklaması {sayi(h.get('son7_website_clicks'))}", '',
              'Günlük erişim: ' + ' · '.join(f'{k[8:10]}.{k[5:7]} {v}' for k, v in list(ge.items())[-14:]), '']
    dolu = [s for s in satirlar if isinstance(s['erisim'], (int, float))]
    if dolu:
        L += ['## Türlere göre ortalama', '', '| Tür | Hedef | Adet | Erişim | İzlenme | Ort. izlenme sn | Kaydet | Paylaş | Yorum |', '|---|---|---|---|---|---|---|---|---|']
        for tur in ('Reels', 'Karusel', 'Tekli'):
            for hedef in ('ev arayan', 'firma'):
                g = [s for s in dolu if s['tur'] == tur and s['hedef'] == hedef]
                if not g:
                    continue
                ort = lambda k: statistics.mean([s[k] for s in g if isinstance(s[k], (int, float))] or [0])  # noqa: E731
                L.append(f"| {tur} | {hedef} | {len(g)} | {ort('erisim'):.0f} | {ort('izlenme'):.0f} | "
                         f"{ort('sure'):.1f} | {ort('kaydet'):.1f} | {ort('paylas'):.1f} | {ort('yorum'):.1f} |")
        L.append('')
        puan = lambda s: (s['erisim'] or 0) + 10 * ((s['kaydet'] or 0) + (s['paylas'] or 0) + (s['yorum'] or 0))  # noqa: E731
        en = sorted(dolu, key=puan, reverse=True)
        L += ['## En iyi 5 (erişim + 10 × kaydet/paylaş/yorum)', ''] + \
             [f"{i + 1}. {s['tarih']} · {s['tur']} · **{s['baslik']}** — erişim {sayi(s['erisim'])}, kaydet {sayi(s['kaydet'])}, paylaş {sayi(s['paylas'])}"
              + (f", ort. izlenme {s['sure']} sn" if s['sure'] is not None else '') for i, s in enumerate(en[:5])] + ['']
        L += ['## En zayıf 5', ''] + \
             [f"{i + 1}. {s['tarih']} · {s['tur']} · {s['baslik']} — erişim {sayi(s['erisim'])}" for i, s in enumerate(en[::-1][:5])] + ['']
    L += ['## Tüm gönderiler', '', '| Tarih | Tür | Hedef | Başlık | Erişim | İzlenme | Ort. sn | Kaydet | Paylaş | Beğeni | Yorum | Profil | Takip |',
          '|---|---|---|---|---|---|---|---|---|---|---|---|---|']
    for s in satirlar:
        L.append(f"| {s['tarih']} | {s['tur']} | {s['hedef']} | [{s['baslik']}]({s['link']}) | {sayi(s['erisim'])} | {sayi(s['izlenme'])} | "
                 f"{sayi(s['sure'])} | {sayi(s['kaydet'])} | {sayi(s['paylas'])} | {sayi(s['begeni'])} | {sayi(s['yorum'])} | {sayi(s['profil'])} | {sayi(s['takip'])} |")
    if HATALAR:
        ozet = sorted(set(re.sub(r'^\S+: ', '', x) for x in HATALAR))[:6]
        L += ['', '<details><summary>Okunamayan metrikler</summary>', ''] + [f'- {x}' for x in ozet] + ['', '</details>']
    return '\n'.join(L) + '\n'


def main():
    gun = int(sys.argv[sys.argv.index('--gun') + 1]) if '--gun' in sys.argv else 30
    es = eslesme()
    medya = medya_listesi(gun)
    for m in medya:
        m['metrik'] = medya_metrik(m)
        m['eslesme'] = es.get(m['id'])
    h = hesap(gun)
    CIKTI.mkdir(exist_ok=True)
    bugun = dt.datetime.now(TZ).strftime('%Y-%m-%d')
    (CIKTI / f'{bugun}.json').write_text(json.dumps(dict(zaman=dt.datetime.now(TZ).isoformat(), hesap=h, medya=medya,
                                                        hatalar=sorted(set(HATALAR))), ensure_ascii=False, indent=1))
    (CIKTI / 'rapor.md').write_text(rapor(medya, h, gun))
    print((CIKTI / 'rapor.md').read_text()[:3000])


if __name__ == '__main__':
    main()

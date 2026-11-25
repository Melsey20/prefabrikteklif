#!/usr/bin/env python3
"""@prefabrik.teklif gönderi performansı — "Mitra Veri Merkezi" Google tablosundan (IG_Gonderiler, IG_Gunluk).

META_TOKEN'da istatistik izni olmasa da çalışır: ajansın Veri Merkezi her sabah 05:00–07:00 arası
gönderi başına erişim / görüntülenme / beğeni / kaydetme / paylaşım ve hesabın günlük takipçi ve erişimini yazar.

Kullanım (günlük içerik görevi):
  1) Google Drive download_file_content: fileId 1y-VoXwtM6DQ4PZsdTEj68Xn8VnZsd7aX_w-krF7mHDE,
     exportMimeType application/vnd.openxmlformats-officedocument.spreadsheetml.sheet → .xlsx dosyası
  2) python3 scripts/instagram/performans.py <dosya.xlsx>
Çıktı: scripts/instagram/istatistik/performans.md — konu seçmeden önce okunur.
Not: Son 1-2 günün gönderileri henüz erişim toplamaktadır; sıralamada en az 48 saatlik gönderiler kullanılır.
"""
import datetime as dt
import json
import pathlib
import re
import sys

import pandas as pd

IG = '17841474767654199'
KOK = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(KOK))
from istatistik import eslesme  # noqa: E402  (medya id → içerik dosyası, hook başlığı)


def sayi(x):
    return pd.to_numeric(x, errors='coerce')


def main(xlsx):
    x = pd.read_excel(xlsx, sheet_name=['IG_Gonderiler', 'IG_Gunluk'], dtype=str)
    g = x['IG_Gonderiler']; g = g[g['IG ID'] == IG].copy()
    for c in ('Beğeni', 'Yorum', 'Erişim', 'Görüntülenme', 'Kaydetme', 'Paylaşım', 'Toplam etkileşim'):
        g[c] = sayi(g[c]).fillna(0)
    es = eslesme()
    g['tarih'] = pd.to_datetime(g['Paylaşım tarihi'], errors='coerce')
    g['baslik'] = [((es.get(str(i)) or {}).get('baslik') or (a or '').split('\n')[0])[:70] for i, a in zip(g['Gönderi ID'], g['Açıklama'])]
    g['hedef'] = [(es.get(str(i)) or {}).get('hedef', '?') for i in g['Gönderi ID']]
    g['puan'] = g['Erişim'] + 20 * (g['Kaydetme'] + g['Paylaşım'] + g['Yorum'])
    bugun = pd.Timestamp(dt.date.today())
    olgun = g[g['tarih'] <= bugun - pd.Timedelta(days=2)]
    son14 = olgun[olgun['tarih'] >= bugun - pd.Timedelta(days=16)]

    d = x['IG_Gunluk']; d = d[d['IG ID'] == IG].copy()
    d['Tarih'] = pd.to_datetime(d['Tarih'], errors='coerce'); d = d.sort_values('Tarih')
    L = [f'# @prefabrik.teklif performans — {dt.datetime.now():%d.%m.%Y}', '',
         'Kaynak: Mitra Veri Merkezi (IG_Gonderiler, IG_Gunluk). Erişim = gönderiyi gören tekil hesap. '
         'Sıralamalar en az 48 saatlik gönderilerle yapılır.', '']
    if len(d):
        s = d.tail(14)
        L += ['## Hesap (son 14 gün)', '',
              'Tarih | Takipçi | Yeni takipçi | Erişim | Görüntülenme | Etkileşim', '---|---|---|---|---|---'] + \
             [f"{r.Tarih:%d.%m} | {r.Takipçi} | {r['Yeni takipçi']} | {r.Erişim} | {r.Görüntülenme} | {r['Toplam etkileşim']}" for _, r in s.iterrows()] + ['']
    if len(son14):
        L += ['## Türlere göre ortalama (son 14 gün, olgun gönderiler)', '',
              'Tür | Hedef | Adet | Erişim (ort.) | Erişim (medyan) | Kaydetme | Paylaşım | Beğeni', '---|---|---|---|---|---|---|---']
        for (tur, hedef), k in son14.groupby(['Tür', 'hedef']):
            L.append(f"{tur} | {hedef} | {len(k)} | {k['Erişim'].mean():.0f} | {k['Erişim'].median():.0f} | "
                     f"{k['Kaydetme'].mean():.1f} | {k['Paylaşım'].mean():.1f} | {k['Beğeni'].mean():.1f}")
        L.append('')
    med = olgun['Erişim'].median() if len(olgun) else 0
    L += [f'## En iyi 8 (tüm zamanlar; puan = erişim + 20 × (kaydet + paylaş + yorum)) — erişim medyanı {med:.0f}', '']
    for _, r in olgun.sort_values('puan', ascending=False).head(8).iterrows():
        kat = r['Erişim'] / med if med else 0
        L.append(f"- {r['tarih']:%d.%m} · {r['Tür']} · **{r['baslik']}** — erişim {r['Erişim']:.0f} ({kat:.1f}× medyan), "
                 f"kaydet {r['Kaydetme']:.0f}, paylaş {r['Paylaşım']:.0f}, beğeni {r['Beğeni']:.0f}")
    L += ['', '## En zayıf 5 (son 14 gün)', '']
    for _, r in son14.sort_values('puan').head(5).iterrows():
        L.append(f"- {r['tarih']:%d.%m} · {r['Tür']} · {r['baslik']} — erişim {r['Erişim']:.0f}")
    L += ['', '## Son 7 günün tüm gönderileri', '', 'Tarih | Tür | Başlık | Erişim | Görüntülenme | Kaydet | Paylaş | Beğeni | Yorum',
          '---|---|---|---|---|---|---|---|---']
    for _, r in g[g['tarih'] >= bugun - pd.Timedelta(days=7)].sort_values('tarih', ascending=False).iterrows():
        L.append(f"{r['tarih']:%d.%m} | {r['Tür']} | [{r['baslik']}]({r['Link']}) | {r['Erişim']:.0f} | {r['Görüntülenme']:.0f} | "
                 f"{r['Kaydetme']:.0f} | {r['Paylaşım']:.0f} | {r['Beğeni']:.0f} | {r['Yorum']:.0f}")
    out = KOK / 'istatistik' / 'performans.md'
    out.parent.mkdir(exist_ok=True)
    out.write_text('\n'.join(L) + '\n')
    print(out.read_text())


if __name__ == '__main__':
    main(sys.argv[1])

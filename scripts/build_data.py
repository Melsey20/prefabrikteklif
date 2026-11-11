#!/usr/bin/env python3
"""CSV fiyat verisini site için JSON'a çevirir.

Girdi: data/raw/firms_*.csv, data/raw/models_*.csv
Çıktı: src/data/firms.json, src/data/models.json, src/data/meta.json
"""
import csv, glob, json, os, re, statistics, datetime, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'data', 'raw')
OUT = os.path.join(ROOT, 'src', 'data')
os.makedirs(OUT, exist_ok=True)

ILLER = ['Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara','Antalya','Ardahan','Artvin','Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Iğdır','Isparta','İstanbul','İzmir','Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri','Kilis','Kırıkkale','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş','Nevşehir','Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun','Şanlıurfa','Siirt','Sinop','Sivas','Şırnak','Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat','Zonguldak']
ILCE_IL = {'Gebze': 'Kocaeli', 'Tuzla': 'İstanbul', 'Pendik': 'İstanbul', 'Çatalca': 'İstanbul', 'Avcılar': 'İstanbul', 'Menderes': 'İzmir', 'Mamak': 'Ankara', 'Kepez': 'Antalya', 'Sapanca': 'Sakarya'}

TIP = {
    'prefabrik': {'ad': 'Prefabrik ev', 'slug': 'prefabrik-ev-fiyatlari', 'baslik': 'Prefabrik Ev Fiyatları', 'kisa': 'prefabrik ev'},
    'celik': {'ad': 'Çelik ev', 'slug': 'celik-ev-fiyatlari', 'baslik': 'Çelik Ev Fiyatları', 'kisa': 'çelik ev'},
    'konteyner': {'ad': 'Konteyner ev', 'slug': 'konteyner-ev-fiyatlari', 'baslik': 'Konteyner Ev Fiyatları', 'kisa': 'konteyner ev'},
    'tiny house': {'ad': 'Tiny house', 'slug': 'tiny-house-fiyatlari', 'baslik': 'Tiny House Fiyatları', 'kisa': 'tiny house'},
    'ahsap': {'ad': 'Ahşap ev', 'slug': 'ahsap-ev-fiyatlari', 'baslik': 'Ahşap Ev Fiyatları', 'kisa': 'ahşap ev'},
    'bungalov': {'ad': 'Bungalov / bağ evi', 'slug': 'bungalov-fiyatlari', 'baslik': 'Bungalov Ev Fiyatları', 'kisa': 'bungalov'},
}
TIP_KEY = {'prefabrik': 'prefabrik', 'celik': 'celik', 'çelik': 'celik', 'konteyner': 'konteyner', 'tiny house': 'tiny house', 'tiny': 'tiny house', 'ahsap': 'ahsap', 'ahşap': 'ahsap', 'bungalov': 'bungalov', 'bağ evi': 'bungalov'}

# Görünen kısa firma adları
KISA = {
    'Karmod Prefabrik Yapı Teknolojileri': 'Karmod',
    'İdeal Ev Prefabrik (Prefabrik Evim / IDEALMOD)': 'Prefabrik Evim (İdeal Ev)',
    'Villa Prefabrik Yapı (prefabrikevfiyatlari.com)': 'Villa Prefabrik Yapı',
    'Limit Prefabrik - Çelik Yapı Sistemleri': 'Limit Prefabrik',
    'Oska Çelik Ev A.Ş. (Oska Grup)': 'Oska Çelik Ev',
    'Aktaş Grup İnşaat': 'Aktaş Grup İnşaat',
    'Asia Prefabrik A.Ş.': 'Asia Prefabrik',
    'Roysal Yapı (Roysal Konteyner)': 'Roysal Yapı',
    'Azra Ahşap Ev (Sisneli Ahşap Yapılar)': 'Azra Ahşap Ev',
}
ALIAS = {'Karmod': 'Karmod Prefabrik Yapı Teknolojileri'}
# Listeye alınmayanlar: başka firmanın sitesi / aynı adres / site açılmıyor
HARIC_FIRMALAR = {'Kartal Prefabrik', 'Çelik Evler', 'Prefabriko', 'Demo Prefabrik', 'AYD Prefabrik'}  # AYD Prefabrik 10 Kasım 2026'da yazılı olarak listeden çıkarılmasını istedi; yeniden eklenmez
# Prefabrika ve Mopre 8 Kasım 2026'da yeniden kontrol edildi: siteleri açık, firms_F'de
# Sayfadaki yazım hatası olduğu belli fiyatlar (firma, fiyat)
HARIC_MODELLER = {('Kardeşler Çelik Yapı', '160000'), ('Kardeşler Çelik Yapı', '13500')}
# Elle eklenen uyarılar (firma adı -> model uyarısı)
FIRMA_UYARI = {
    'Mira Prefabrik': 'Firma fiyatları m² başına sabit oranla hesaplanmış görünüyor; teklifte teyit edin.',
    'Lider Prefabrik': 'Fiyat firmanın sosyal medya kampanya ilanından; teklifte teyit edin.',
}

TR = str.maketrans({'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u', '²': '2', '+': '-'})


def slugify(s):
    s = s.translate(TR).lower()
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return re.sub(r'-+', '-', s)[:80].strip('-')


def il_bul(sehir):
    if not sehir:
        return ''
    low = sehir.translate(TR).lower()
    best = None
    for il in ILLER:
        i = low.find(il.translate(TR).lower())
        if i != -1 and (best is None or i < best[0]):
            best = (i, il)
    for ilce, il in ILCE_IL.items():
        i = low.find(ilce.translate(TR).lower())
        if i != -1 and (best is None or i < best[0]):
            best = (i, il)
    return best[1] if best else ''


def num(x):
    try:
        x = str(x).replace(',', '.').strip()
        return float(x) if x else None
    except ValueError:
        return None


def fiyat_turu(r):
    if not r['fiyat_tl']:
        return 'yok'
    a, k = r['model_adi'], r['fiyat_kapsami']
    if 'm² birim' in a or 'm2 birim' in a.lower() or a.endswith('m² fiyatı') or k.lower().startswith('m² fiyatı') or k.lower().startswith('m2 fiyatı'):
        return 'm2'
    return 'model'


def kalem(text, *keys):
    """Kapsam notundan 'dahil' / 'haric' / '' çıkarır (emin değilse boş). Cümle/parça bazlı."""
    parts = re.split(r'[;.]\s+|\s*;\s*', text.lower())
    for p in parts:
        if not any(k in p for k in keys):
            continue
        if 'belirtilmemiş' in p or 'belirtilmemis' in p:
            return ''
        HARIC = r'hariç|haric|dahil değil|dahil degil|müşteriye ait|musteriye ait|müşteri\)|alıcıya ait|ayrıca|ekstra'
        hm = re.search(HARIC, p)
        if hm:
            # "Dahil: A, B. Hariç: C" gibi karışık parçada anahtarın hangi tarafta olduğuna bak
            hi = hm.start()
            di = re.search(r'dahil(?! değil| degil)', p)
            ki = min(p.find(k) for k in keys if k in p)
            if di and di.start() < hi and ki < hi and p.startswith('dahil'):
                return 'dahil'
            return 'haric'
        if re.search(r'dahil(?! değil| degil)', p):
            return 'dahil'
    return ''


def kdv(text):
    t = text.lower()
    if re.search(r'kdv (belirtilmemiş|durumu belirtilmemiş)|kdv/', t) and not re.search(r'kdv hariç|\+ ?kdv|kdv dahil değil', t):
        return ''
    if re.search(r'kdv hariç|\+ ?kdv|kdv dahil değil|kdv dahil degil|%20 kdv', t):
        return 'haric'
    if re.search(r'kdv dahil', t):
        return 'dahil'
    return ''


def teslim(text):
    t = text.lower()
    if 'anahtar teslim değil' in t:
        return 'İleri kaba teslim' if 'ileri kaba' in t else ''
    if 'ileri kaba' in t:
        return 'İleri kaba teslim'
    if 'fabrika teslim' in t:
        return 'Fabrika teslim'
    if 'anahtar teslim' in t:
        return 'Anahtar teslim'
    return ''


def uyari(text):
    t = text.lower()
    if re.search(r'güncel olmayabilir|geçmiş\)|tarihi geçmiş|ocak 2025|2025 listesi|kampanya notu 15 eylül 2026', t):
        return 'Fiyat güncel olmayabilir; teklifte teyit edin.'
    if 'tahmini' in t or 'ortalama fiyat aralığı' in t:
        return 'Firma bu fiyatı tahmini aralık olarak veriyor.'
    return ''


def oda_norm(o):
    o = (o or '').strip().replace(' ', '')
    m = re.match(r'^(\d)\+(\d)$', o)
    return o if m else ''


def kat_norm(k):
    k = (k or '').strip().lower()
    if k in ('2', '2 kat', 'iki kat', 'dubleks'):
        return 2
    if k in ('1', 'tek kat', '1 kat'):
        return 1
    if 'loft' in k or '1,5' in k:
        return 1.5
    return None


firms, seen = [], {}
for f in sorted(glob.glob(os.path.join(RAW, 'firms_*.csv'))):
    for r in csv.DictReader(open(f, encoding='utf-8')):
        name = ALIAS.get(r['firma'].strip(), r['firma'].strip())
        if name in HARIC_FIRMALAR:
            continue
        if name in seen:
            # birleştir: ürün tiplerini ekle
            old = seen[name]
            for t in (r.get('urun_tipleri') or '').split(';'):
                t = t.strip()
                if t and t not in old['urunTipleri']:
                    old['urunTipleri'].append(t)
            continue
        kisa = KISA.get(name) or re.split(r' \(| - ', name)[0].strip()
        rec = {
            'ad': name, 'kisaAd': kisa, 'slug': slugify(kisa),
            'web': (r.get('web') or '').strip(), 'sehir': (r.get('sehir') or '').strip(), 'il': il_bul(r.get('sehir')),
            'telefon': (r.get('telefon') or '').strip(),
            'sertifikalar': [s.strip() for s in re.split(r';', r.get('sertifikalar') or '') if s.strip() and len(s.strip()) < 80 and not s.lower().startswith('belirli sertifika')],
            'sertifikaNotu': (r.get('sertifikalar') or '').strip(),
            'urunTipleri': [t.strip() for t in (r.get('urun_tipleri') or '').split(';') if t.strip()],
            'kaynak': [u.strip() for u in (r.get('kaynak_url') or '').split(';') if u.strip().startswith('http')],
            'seviye': 'listelenmis',
            # firms_F (Kasım 2026): modeli bulunamayan firmalar için "henüz eklenmedi" notu
            'modelBekliyor': os.path.basename(f) == 'firms_F.csv',
        }
        seen[name] = rec
        firms.append(rec)

# slug çakışmalarını çöz
used = {}
for f in firms:
    s = f['slug']
    if s in used:
        used[s] += 1
        f['slug'] = f'{s}-{used[s]}'
    else:
        used[s] = 1

byname = {f['ad']: f for f in firms}
models = []
for f in sorted(glob.glob(os.path.join(RAW, 'models_*.csv'))):
    for r in csv.DictReader(open(f, encoding='utf-8')):
        name = ALIAS.get(r['firma'].strip(), r['firma'].strip())
        firm = byname.get(name)
        if not firm or (name, (r['fiyat_tl'] or '').strip()) in HARIC_MODELLER:
            continue
        tip = TIP_KEY.get((r['tip'] or '').strip().lower())
        if not tip:
            continue
        k = (r.get('fiyat_kapsami') or '').strip()
        ft = fiyat_turu(r)
        m2 = num(r.get('m2'))
        fiyat = int(float(r['fiyat_tl'])) if r['fiyat_tl'] else None
        ad = r['model_adi'].strip()
        models.append({
            'firma': firm['slug'], 'firmaAd': firm['kisaAd'], 'ad': ad, 'tip': tip,
            'm2': m2, 'oda': oda_norm(r.get('oda')), 'kat': kat_norm(r.get('kat')), 'katRaw': (r.get('kat') or '').strip(),
            'fiyat': fiyat, 'fiyatTuru': ft,
            'm2Fiyat': round(fiyat / m2) if (fiyat and m2 and ft == 'model') else None,
            'kapsam': k,
            'kdv': kdv(k), 'nakliye': kalem(k, 'nakliye', 'sevk'), 'montaj': kalem(k, 'montaj', 'kurulum'),
            'zemin': kalem(k, 'zemin betonu', 'temel betonu', 'zemin', 'temel'),
            'teslim': teslim(k), 'uyari': uyari(k) or FIRMA_UYARI.get(name, ''),
            'kaynak': (r.get('kaynak_url') or '').split(' ')[0].strip(),
            'kontrol': (r.get('kontrol_tarihi') or '').strip(),
        })

# model slugları (firma içinde benzersiz)
for firm in firms:
    ms = [m for m in models if m['firma'] == firm['slug']]
    seen_s = {}
    for m in ms:
        base = slugify(re.sub(r'\(.*?\)', '', m['ad'])) or 'model'
        s = base
        n = 1
        while s in seen_s:
            n += 1
            s = f'{base}-{n}'
        seen_s[s] = 1
        m['slug'] = s
    priced = [m['fiyat'] for m in ms if m['fiyatTuru'] == 'model' and m['fiyat']]
    firm['modelSayisi'] = len(ms)
    if ms: firm['modelBekliyor'] = False
    firm['enDusuk'] = min(priced) if priced else None
    firm['tipler'] = sorted({m['tip'] for m in ms})
    if not firm['tipler']:  # modeli henüz listelenmemiş firma: ürün tiplerini firmanın kendi beyanından al
        firm['tipler'] = sorted({TIP_KEY[k] for t in firm['urunTipleri'] for k in TIP_KEY if k in t.lower() and not ('ağır çelik' in t.lower() and k in ('çelik', 'celik'))})
    # Ağır çelik yapı (fabrika, depo, hangar): katalog tipi değil, firma etiketi; talepler bu firmalara gider
    if any('ağır çelik' in t.lower() or 'agir celik' in t.lower() for t in firm['urunTipleri']):
        firm['tipler'] = [t for t in firm['tipler'] if t != 'agir-celik'] + ['agir-celik']
    firm['fiyatYayinliyor'] = bool(priced) or any(m['fiyat'] for m in ms)

models.sort(key=lambda m: (m['tip'], m['fiyat'] or 10**12))

stats = {}
for tip in TIP:
    ps = [m['fiyat'] for m in models if m['tip'] == tip and m['fiyatTuru'] == 'model' and m['fiyat']]
    m2p = [m['m2Fiyat'] for m in models if m['tip'] == tip and m['m2Fiyat']]
    stats[tip] = {
        'model': len([m for m in models if m['tip'] == tip]),
        'fiyatli': len(ps),
        'firma': len({m['firma'] for m in models if m['tip'] == tip}),
        'min': min(ps) if ps else None, 'max': max(ps) if ps else None,
        'medyan': int(statistics.median(ps)) if ps else None,
        'm2Medyan': int(statistics.median(m2p)) if m2p else None,
    }

AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
kontroller = sorted({m['kontrol'] for m in models if m['kontrol']})
son = kontroller[-1] if kontroller else datetime.date.today().isoformat()
d = datetime.date.fromisoformat(son)
meta = {
    'firmaSayisi': len(firms), 'modelSayisi': len(models),
    'fiyatliModel': len([m for m in models if m['fiyat']]),
    'sonKontrol': son, 'sonKontrolYazi': f'{d.day} {AYLAR[d.month - 1]} {d.year}', 'ay': f'{AYLAR[d.month - 1]} {d.year}',
    'tipler': TIP, 'istatistik': stats,
}
# Firma iletişim e-postaları (firmaların kendi sitelerinden) ve logolar (public/img/firma/<slug>.png)
ILETISIM = {}
_il = os.path.join(ROOT, 'data', 'raw', 'firma_iletisim.json')
if os.path.exists(_il):
    ILETISIM = {x['slug']: x for x in json.load(open(_il, encoding='utf-8'))}
LOGO_DIR = os.path.join(ROOT, 'public', 'img', 'firma')
for f in firms:
    lg = os.path.join(LOGO_DIR, f"{f['slug']}.png")
    f['logo'] = f"/img/firma/{f['slug']}.png" if os.path.exists(lg) else ''
    f['logoAcik'] = bool(ILETISIM.get(f['slug'], {}).get('acik')) if f['logo'] else False
json.dump(firms, open(os.path.join(OUT, 'firms.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# İzin veren firmaların kendi sitelerinden alınan ürün fotoğrafları (scripts/urun_gorsel.py)
_ug = os.path.join(ROOT, 'data', 'raw', 'urun_gorsel.json')
URUN_GORSEL = json.load(open(_ug, encoding='utf-8')) if os.path.exists(_ug) else {}
for m in models:
    g = URUN_GORSEL.get(f"{m['firma']}/{m['slug']}")
    if g: m['gorsel'] = g['yol']
json.dump(models, open(os.path.join(OUT, 'models.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# Cloud Functions için küçük firma listesi
FN = os.path.join(ROOT, 'functions')
if os.path.isdir(FN):
    json.dump([{'slug': f['slug'], 'kisaAd': f['kisaAd'], 'il': f['il'], 'tipler': f['tipler'], 'modelSayisi': f['modelSayisi'],
                **({'eposta': ILETISIM[f['slug']]['eposta']} if ILETISIM.get(f['slug'], {}).get('eposta') else {})} for f in firms],
              open(os.path.join(FN, 'firms.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    # Firma paneli ve aylık fiyat kontrolü için model listesi
    json.dump([{'id': f"{m['firma']}/{m['slug']}", 'firma': m['firma'], 'ad': m['ad'], 'tip': m['tip'], 'm2': m['m2'], 'oda': m['oda'],
                'fiyat': m['fiyat'], 'fiyatTuru': m['fiyatTuru'], 'kdv': m['kdv'], 'teslim': m['teslim'], 'kapsam': m['kapsam'], 'kaynak': m['kaynak']} for m in models],
              open(os.path.join(FN, 'models.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(f"{len(firms)} firma, {len(models)} model -> src/data")

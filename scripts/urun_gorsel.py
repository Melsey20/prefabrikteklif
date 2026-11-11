#!/usr/bin/env python3
"""Görsel izni veren firmaların ürün fotoğraflarını kendi sitelerinden alır.

Yalnızca data/raw/gorsel_izin.json'daki firmalar (firma panelinde / kayıtta / yazılı olarak izin verenler) işlenir.
Her modelin kaynak sayfasındaki og:image (yoksa twitter:image) indirilir, 480 ve 960 px webp'ye çevrilir:
  public/img/urun/<firma>/<model-slug>-480.webp / -960.webp
Eşleşme data/raw/urun_gorsel.json'a yazılır (build_data.py bunu modelin 'gorsel' alanına çevirir).
GitHub Actions'ta çalışır (Ürün görselleri iş akışı); izin listesi değişince kendiliğinden tetiklenir.
"""
import io, json, os, re, sys, time, urllib.request, urllib.parse
from PIL import Image

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IZIN = os.path.join(KOK, 'data/raw/gorsel_izin.json')
CIKTI = os.path.join(KOK, 'data/raw/urun_gorsel.json')
UA = 'Mozilla/5.0 (compatible; PrefabrikTeklifBot/1.0; +https://www.prefabrikteklif.com.tr)'

def getir(url, limit=8_000_000):
    r = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'}), timeout=25)
    return r.read(limit), r.headers.get('Content-Type', '')

def gorsel_url(sayfa_url):
    html, _ = getir(sayfa_url, 2_000_000)
    h = html.decode('utf-8', 'ignore')
    for ad in ('og:image', 'og:image:url', 'twitter:image'):
        m = re.search(r'<meta[^>]+(?:property|name)=["\']' + re.escape(ad) + r'["\'][^>]*content=["\']([^"\']+)', h, re.I) \
            or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']' + re.escape(ad) + r'["\']', h, re.I)
        if m:
            return urllib.parse.urljoin(sayfa_url, m.group(1).strip())
    return None

def main():
    izin = set(json.load(open(IZIN, encoding='utf-8'))) if os.path.exists(IZIN) else set()
    models = json.load(open(os.path.join(KOK, 'src/data/models.json'), encoding='utf-8'))
    eski = json.load(open(CIKTI, encoding='utf-8')) if os.path.exists(CIKTI) else {}
    yeni = {k: v for k, v in eski.items() if k.split('/')[0] in izin}  # izni geri çekilenler düşer
    for m in models:
        if m['firma'] not in izin or not m.get('kaynak'):
            continue
        anahtar = f"{m['firma']}/{m['slug']}"
        if anahtar in yeni and os.path.exists(os.path.join(KOK, 'public', yeni[anahtar]['yol'].lstrip('/') + '-480.webp')):
            continue
        try:
            u = gorsel_url(m['kaynak'])
            if not u:
                print('görsel yok:', anahtar); continue
            veri, tur = getir(u)
            im = Image.open(io.BytesIO(veri)).convert('RGB')
            if im.width < 400:
                print('küçük:', anahtar, im.size); continue
            d = os.path.join(KOK, 'public/img/urun', m['firma']); os.makedirs(d, exist_ok=True)
            for w in (480, 960):
                k = im.copy(); k.thumbnail((w, w * 3 // 4 if im.width >= im.height else w))
                k.save(os.path.join(d, f"{m['slug']}-{w}.webp"), 'WEBP', quality=78, method=6)
            yeni[anahtar] = {'yol': f"/img/urun/{m['firma']}/{m['slug']}", 'kaynak': u}
            print('ok:', anahtar)
            time.sleep(1)  # firmanın sitesini yormadan
        except Exception as e:
            print('hata:', anahtar, str(e)[:120])
    # İzni kalkan firmaların dosyalarını sil
    ud = os.path.join(KOK, 'public/img/urun')
    if os.path.isdir(ud):
        for f in os.listdir(ud):
            if f not in izin:
                import shutil; shutil.rmtree(os.path.join(ud, f), ignore_errors=True)
    json.dump(dict(sorted(yeni.items())), open(CIKTI, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(yeni), 'görsel')

if __name__ == '__main__':
    sys.exit(main())

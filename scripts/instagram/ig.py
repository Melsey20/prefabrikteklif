#!/usr/bin/env python3
"""PrefabrikTeklif Instagram üretim hattı — "premium" tasarım sistemi (Inter, iki tonlu başlık; tam sayfa fotoğraf / koyu spot / açık gri).

Kullanım (depo kökünden):
  python3 scripts/instagram/ig.py tasarim scripts/instagram/icerik/2026-11-02.json  çıktı_klasörü
  python3 scripts/instagram/ig.py reels   scripts/instagram/icerik/2026-11-02.json  çıktı_klasörü
Fontlar: scripts/instagram/marka/fonts (Inter, OFL lisanslı) — kurulum gerekmez.
Görseller: public/img. Logo: scripts/instagram/marka.
Tasarımlar PNG (1080×1350), reels için kare kare HTML (reels.cjs ile çekilir).
Reels sahne türleri: foto (img), grid (imgs), sayi (n, birim), liste (maddeler ≤4, ikon: ✓/✕/?), son.
Okunurluk: her sahne en az 3 sn (p'li ya da liste sahnesi 3,5 sn), başlık en fazla 8 kelime — aksi hâlde üretim durur.
Günde 2 dosya: icerik/YYYY-MM-DD-sabah.json ve -aksam.json; her birinde 1 tasarım + "reels": [2 reels].
"""
import base64, json, os, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
IMG = ROOT / 'public' / 'img'
MARKA = pathlib.Path(__file__).resolve().parent / 'marka'
FONTS = MARKA / 'fonts'  # Inter (OFL) depoda; ayrıca kurulum gerekmez
C = dict(ink='#121614', ink2='#5B625E', muted='#8E9590', line='#DDE1DE', bg='#F4F5F4', dark='#0B0D0E',
         green='#1D5C3C', forest='#103A28', sage='#9FD4B2')
LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,U+FEFF,U+FFFD'
EXT = 'U+0100-0130,U+0132-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1E00-1E9F,U+1EF2-1EFF,U+20A0-20AB,U+20AD-20C0'

def b64(p):
    p = pathlib.Path(p)
    mime = {'.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml'}[p.suffix]
    return f'data:{mime};base64,' + base64.b64encode(p.read_bytes()).decode()

def fonts():
    css = ''
    for w in (400, 500, 600, 700):
        for sub, rng in (('latin', LAT), ('latin-ext', EXT)):
            css += f"@font-face{{font-family:I;font-style:normal;font-weight:{w};src:url({b64(FONTS / f'inter-{sub}-{w}-normal.woff2')}) format('woff2');unicode-range:{rng}}}"
    return css

def logo(dark=False, w=330):
    s = (MARKA / ('prefabrikteklif-logo-koyu-zemin.svg' if dark else 'prefabrikteklif-logo.svg')).read_text()
    return re.sub(r'width="\d+" height="\d+"', f'width="{w}" height="{round(w * 168.7 / 825.7)}"', s, count=1)

def img(name):
    return b64(IMG / name)

def gok(name):
    """Fotoğrafın üst şeridinin ortalama rengi → başlığın oturduğu gökyüzü degradesi (beyaz yazı okunur kalsın diye koyulaştırılır)."""
    try:
        from PIL import Image
        im = Image.open(IMG / name).convert('RGB'); w, h = im.size
        r, g, b = im.crop((0, 0, w, max(4, h // 16))).resize((1, 1)).getpixel((0, 0))
    except Exception:
        r, g, b = 77, 146, 218
    k = lambda f: '#%02x%02x%02x' % tuple(round(x * f) for x in (r, g, b))
    l = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return k(0.55 if l > 0.55 else 0.72), k(0.8 if l > 0.72 else 1)

# Tasarım dili: Inter, sıkı ve iki tonlu başlık (<em> = soluk ikinci ton), tam sayfa fotoğraf / koyu spot ışık / açık gri zemin,
# üstte ortada küçük etiket, altta solda logo, sağda ince çizgili kısa bilgi.
BASE = f"""*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:I,sans-serif;-webkit-font-smoothing:antialiased;color:{C['ink']};font-feature-settings:'cv11','ss01'}}
.cv{{position:relative;overflow:hidden;background:linear-gradient(180deg,#F7F8F7,#EEF0EF);color:{C['ink']}}}
.cv.dk{{background:radial-gradient(ellipse 620px 520px at 50% -40px,rgba(255,255,255,.22),rgba(255,255,255,.05) 55%,transparent 75%),{C['dark']};color:#fff}}
.cv.gk{{color:#fff}}
.ust{{position:absolute;top:58px;left:0;right:0;text-align:center;font:600 17px I;letter-spacing:.42em;text-transform:uppercase;color:{C['muted']};z-index:3}}
.dk .ust{{color:rgba(255,255,255,.55)}} .gk .ust{{color:rgba(255,255,255,.78)}}
.hh{{font-weight:600;letter-spacing:-.035em;line-height:1.03}}
.hh em{{font-style:normal;opacity:.42}} .dk .hh em,.gk .hh em{{opacity:.55}}
.body{{font:500 30px/1.4 I;color:{C['ink2']}}} .dk .body{{color:rgba(255,255,255,.72)}} .gk .body{{color:rgba(255,255,255,.92)}}
.alt{{position:absolute;left:72px;right:72px;bottom:58px;display:flex;justify-content:space-between;align-items:flex-end;z-index:3}}
.meta{{text-align:right;font:500 19px/1.45 I;color:{C['ink2']}}} .meta b{{display:block;font-weight:600;font-size:21px}}
.meta i{{display:block;width:160px;height:1.5px;margin:11px 0 9px auto;background:{C['line']}}}
.dk .meta,.gk .meta{{color:rgba(255,255,255,.85)}} .dk .meta i,.gk .meta i{{background:rgba(255,255,255,.4)}}
.foto{{position:absolute;left:0;right:0;bottom:0;background-position:center bottom;background-size:cover;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 160px)}}
.golge{{position:absolute;left:0;right:0;bottom:0;height:380px;background:linear-gradient(180deg,transparent,rgba(6,16,11,.62));z-index:2}}
.tm{{position:absolute;right:72px;font:600 15px I;letter-spacing:.05em;padding:6px 12px;border-radius:999px;background:rgba(0,0,0,.28);color:rgba(255,255,255,.88);z-index:3}}
.cip{{display:inline-flex;font:600 22px I;padding:11px 20px;border-radius:999px;background:#fff;color:{C['ink']};box-shadow:0 10px 30px -18px rgba(0,0,0,.35)}}
.dk .cip,.gk .cip{{background:rgba(255,255,255,.16);color:#fff;border:1.5px solid rgba(255,255,255,.28)}}
.kutu{{border-radius:32px;background:#fff;box-shadow:0 1px 0 rgba(0,0,0,.04),0 24px 60px -30px rgba(20,40,30,.28)}}
.dk .kutu{{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.12);box-shadow:none}}
.ph{{border-radius:30px;overflow:hidden;background:#dfe3e0}} .ph img{{width:100%;height:100%;object-fit:cover;display:block}}
"""
_F = None
def page(body, css='', w=1080, h=1350):
    global _F
    if _F is None: _F = fonts()
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{_F}{BASE}html,body{{width:{w}px;height:{h}px;overflow:hidden}}.cv{{width:{w}px;height:{h}px}}{css}</style></head><body>{body}</body></html>'

def frame(inner, tema='', label='', foot_left='prefabrikteklif.com.tr', foot_right='', stil=''):
    """tema: '' açık · 'dk' koyu spot · 'gk' fotoğraflı gökyüzü"""
    meta = (f'<b>{foot_right}</b><i></i>' if foot_right else '') + foot_left
    return (f'<div class="cv {tema}" style="{stil}"><div class="ust">{label}</div>{inner}'
            f'<div class="alt">{logo(tema in ("dk", "gk"))}<div class="meta">{meta}</div></div></div>')

def gokyuzu(name, ust):
    a, b = gok(name)
    return (f'background:linear-gradient(180deg,{a} 0%,{b} {ust}px)',
            f'<div class="foto" style="top:{ust - 150}px;background-image:url({img(name)})"></div><div class="golge"></div>')

def sayisal(d):  # "Yaklaşık 1.566.000 TL" gibi kısa değer → sağa yaslı büyük rakam
    return len(d) <= 26 and any(ch.isdigit() for ch in d)

def _p(s, stil=''):
    return f'<p class="body" style="{stil}">{s["p"]}</p>' if s.get('p') else ''

# ---------------- Tasarım şablonları ----------------
def t_kapak(s):  # büyük başlık; fotoğraf varsa gökyüzünde başlık, ev altta
    bas = (f'<div style="position:absolute;top:150px;left:72px;right:72px;z-index:3">'
           f'<h1 class="hh" style="font-size:{s.get("boy", 96) + 6}px">{s["h"]}</h1>{_p(s, "margin-top:26px;max-width:860px")}</div>')
    alt = (s.get('alt_sol', 'prefabrikteklif.com.tr'), s.get('alt_sag', 'Kaydırın'))
    if not s.get('img'):
        return frame(bas, 'dk', s.get('etiket', ''), *alt)
    stil, foto = gokyuzu(s['img'], 640)
    return frame(foto + bas + '<span class="tm" style="top:660px">Temsili görsel</span>', 'gk', s.get('etiket', ''), *alt, stil)

def t_liste(s):  # maddeler: kısa rakamlı değerler sağda büyük, uzun açıklamalar başlığın altında
    koyu = s.get('koyu', False); rr = ''
    for t, d in s['maddeler']:
        if sayisal(d):
            rr += (f'<div class="kutu" style="display:flex;justify-content:space-between;align-items:center;gap:24px;padding:34px 42px">'
                   f'<span style="font:600 36px I;letter-spacing:-.02em">{t}</span>'
                   f'<b style="font:600 44px I;letter-spacing:-.035em;color:{"#fff" if koyu else C["green"]};text-align:right">{d.rstrip(".")}</b></div>')
        else:
            rr += (f'<div class="kutu" style="padding:32px 42px;display:flex;flex-direction:column;gap:8px">'
                   f'<b style="font:600 36px I;letter-spacing:-.02em">{t}</b><span class="body" style="font-size:28px">{d}</span></div>')
    gap = 22 if len(s['maddeler']) <= 4 else 16
    return frame(f'<div style="position:absolute;top:150px;left:72px;right:72px;bottom:190px;display:flex;flex-direction:column;justify-content:center">'
                 f'<h2 class="hh" style="font-size:{s.get("boy", 88)}px">{s["h"]}</h2>{_p(s, "margin-top:22px")}'
                 f'<div style="display:flex;flex-direction:column;gap:{gap}px;margin-top:56px">{rr}</div></div>',
                 'dk' if koyu else '', s.get('etiket', ''), s.get('alt_sol', 'prefabrikteklif.com.tr'), s.get('alt_sag', ''))

def t_kontrol(s):  # onay işaretli ızgara (+ isteğe bağlı fotoğraf), koyu spot ışık
    gi = ''.join(f'<div class="kutu" style="display:flex;align-items:center;gap:18px;padding:28px 26px;font:600 32px I;letter-spacing:-.015em">'
                 f'<span style="width:42px;height:42px;flex:none;border-radius:50%;background:#fff;color:{C["dark"]};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700">✓</span>{t}</div>'
                 for t in s['maddeler'])
    ph = f'<div class="ph" style="flex:1;margin-top:30px;min-height:200px"><img src="{img(s["img"])}"></div>' if s.get('img') else ''
    return frame(f'<div style="position:absolute;top:150px;left:72px;right:72px;bottom:190px;display:flex;flex-direction:column">'
                 f'<h2 class="hh" style="font-size:{s.get("boy", 84)}px">{s["h"]}</h2>{_p(s, "margin-top:20px")}'
                 f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:40px">{gi}</div>{ph}</div>',
                 'dk' if s.get('koyu', True) else '', s.get('etiket', ''), s.get('alt_sol', 'prefabrikteklif.com.tr'), s.get('alt_sag', ''))

def t_cta(s):  # gökyüzünde ortalı başlık, ev altta, beyaz adres düğmesi + cam çipler
    chips = ''.join(f'<span class="cip">{c}</span>' for c in s.get('cipler', []))
    bas = (f'<div style="position:absolute;top:150px;left:72px;right:72px;text-align:center;z-index:3">'
           f'<h2 class="hh" style="font-size:{s.get("boy", 86)}px">{s["h"]}</h2>{_p(s, "margin:24px auto 0;max-width:820px")}</div>')
    alt = (f'<div style="position:absolute;left:72px;right:72px;bottom:170px;display:flex;flex-direction:column;align-items:center;gap:24px;z-index:3">'
           f'<span style="display:inline-flex;gap:14px;background:#fff;color:#0f2a1c;font:600 34px I;letter-spacing:-.015em;padding:26px 46px;border-radius:999px">prefabrikteklif.com.tr <span style="font-weight:500">↗</span></span>'
           f'<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">{chips}</div></div>')
    meta = (s.get('alt_sol', 'prefabrikteklif.com.tr'), s.get('alt_sag', 'Bağlantı profilde'))
    if not s.get('img'):
        return frame(bas + alt, 'dk', s.get('etiket', ''), *meta)
    stil, foto = gokyuzu(s['img'], 600)
    return frame(foto + bas + alt + '<span class="tm" style="top:620px">Temsili görsel</span>', 'gk', s.get('etiket', ''), *meta, stil)

def t_ucfoto(s):  # başlık + 3'lü fotoğraf şeridi + çipler, koyu spot ışık
    chips = ''.join(f'<span class="cip">{c}</span>' for c in s.get('cipler', []))
    ims = ''.join(f'<div class="ph"><img src="{img(x)}"></div>' for x in s['imgs'][:3])
    return frame(f'<div style="position:absolute;top:150px;left:72px;right:72px;bottom:190px;display:flex;flex-direction:column">'
                 f'<h1 class="hh" style="font-size:{s.get("boy", 90)}px">{s["h"]}</h1>{_p(s, "margin-top:22px;max-width:900px")}'
                 f'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin:36px 0 28px;flex:1">{ims}</div>'
                 f'<div style="display:flex;gap:12px;flex-wrap:wrap">{chips}</div></div>',
                 'dk' if s.get('koyu', True) else '', s.get('etiket', ''), s.get('alt_sol', 'prefabrikteklif.com.tr'), s.get('alt_sag', ''))

def t_alinti(s):  # büyük tek cümle / soru + kısa açıklama, açık zemin
    return frame(f'<div style="position:absolute;top:150px;left:72px;right:72px;bottom:190px;display:flex;flex-direction:column;justify-content:center;gap:34px">'
                 f'<h1 class="hh" style="font-size:{s.get("boy", 100) + 4}px">{s["h"]}</h1>{_p(s, "max-width:860px")}</div>',
                 'dk' if s.get('koyu') else '', s.get('etiket', ''), s.get('alt_sol', 'prefabrikteklif.com.tr'), s.get('alt_sag', ''))

SABLON = dict(kapak=t_kapak, liste=t_liste, kontrol=t_kontrol, cta=t_cta, ucfoto=t_ucfoto, alinti=t_alinti)

# ---------------- Reels (1080×1920) ----------------
# Sahne zeminleri: foto → gökyüzü + tam genişlik fotoğraf, sayi/son → koyu spot ışık, liste/grid → açık gri.
SPOT = f"radial-gradient(ellipse 760px 700px at 50% -60px,rgba(255,255,255,.24),rgba(255,255,255,.05) 55%,transparent 75%),{C['dark']}"
RCSS = f""".sc{{position:absolute;inset:0;opacity:0;overflow:hidden;background:linear-gradient(180deg,#F7F8F7,#EBEEEC);color:{C['ink']}}}
.sc.dk{{background:{SPOT};color:#fff}} .sc.gk{{color:#fff}}
.lg{{position:absolute;left:0;right:0;top:150px;display:flex;justify-content:center;z-index:5}}
.hd{{position:absolute;left:84px;right:84px;top:300px;z-index:4}}
.hd h1{{font-weight:600;font-size:118px;line-height:1.03;letter-spacing:-.04em}}
.hd h1 em{{font-style:normal;opacity:.45}} .dk .hd h1 em,.gk .hd h1 em{{opacity:.55}}
.hd p{{margin-top:30px;font:500 42px/1.35 I;color:{C['ink2']}}} .dk .hd p{{color:rgba(255,255,255,.72)}} .gk .hd p{{color:rgba(255,255,255,.92)}}
.w{{display:inline-block;opacity:0}}
.rph{{position:absolute;left:72px;right:72px;top:900px;height:680px;border-radius:44px;overflow:hidden;opacity:0;z-index:3}}
.rph img{{width:100%;height:100%;object-fit:cover}}
.rph.tam{{left:0;right:0;top:820px;bottom:0;height:auto;border-radius:0;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 220px)}}
.golge{{position:absolute;left:0;right:0;bottom:0;height:520px;background:linear-gradient(180deg,transparent,rgba(6,16,11,.55));z-index:3}}
.grid{{position:absolute;left:72px;right:72px;top:900px;height:680px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:16px;z-index:3}}
.grid div{{border-radius:30px;overflow:hidden;opacity:0}} .grid img{{width:100%;height:100%;object-fit:cover}}
.chips{{position:absolute;left:72px;right:72px;top:1620px;display:flex;gap:14px;flex-wrap:wrap;justify-content:center;z-index:5}}
.rchip{{font:600 32px I;padding:15px 26px;border-radius:999px;background:#fff;color:{C['ink']};opacity:0;box-shadow:0 12px 30px -18px rgba(0,0,0,.4)}}
.gk .rchip,.dk .rchip{{background:rgba(255,255,255,.16);color:#fff;border:1.5px solid rgba(255,255,255,.3)}}
.big{{font-weight:600;font-size:250px;line-height:.9;letter-spacing:-.06em;color:#fff}}
.son{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:52px;text-align:center;padding:0 80px}}
.son h1{{font-weight:600;font-size:104px;line-height:1.04;letter-spacing:-.04em}} .son h1 em{{font-style:normal;opacity:.55}}
.url{{font:600 46px I;letter-spacing:-.015em;background:#fff;color:#0f2a1c;padding:26px 48px;border-radius:999px}}
.son p{{font:500 36px I;color:rgba(255,255,255,.7)}}
.rl{{display:flex;flex-direction:column;justify-content:center;gap:20px;border-radius:0;overflow:visible}}
.rmd{{display:flex;align-items:center;gap:26px;font:600 48px/1.2 I;letter-spacing:-.025em;padding:30px 36px;border-radius:34px;background:#fff;opacity:0;box-shadow:0 24px 60px -32px rgba(20,40,30,.35)}}
.rmd i{{font-style:normal;width:70px;height:70px;flex:none;border-radius:50%;background:{C['ink']};color:#fff;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:700}}"""
RJS = '''const cl=x=>Math.min(Math.max(x,0),1); const e=x=>1-Math.pow(1-cl(x),3);
window.setT=(t)=>{ const n=T.length-1;
 for(let i=0;i<n;i++){ const s=document.getElementById('s'+i); const a=T[i], b=T[i+1], l=t-a, d=b-a;
  let o=0; if(t>=a && t<b+0.25){ o = i===0 ? 1 : e(l/0.25); if(i<n-1 && t>=b) o=1-e((t-b)/0.25); }
  s.style.opacity=o; s.style.zIndex = t>=a?2:1; if(!o) continue;
  s.querySelectorAll('.w').forEach((w,k)=>{ const x=e((l-0.06*k)/0.35); w.style.opacity=x; w.style.transform=`translateY(${(1-x)*36}px)`; });
  const p=s.querySelector('.hd p'); if(p) p.style.opacity=e((l-0.45)/0.35);
  const ph=s.querySelector('.rph'); if(ph){ const x=e((l-0.1)/0.5); ph.style.transform=`translateY(${(1-x)*70}px) scale(${0.96+0.04*x})`; ph.style.opacity=x; const im=ph.querySelector('img'); if(im) im.style.transform=`scale(${1.03+0.08*cl(l/d)})`; }
  s.querySelectorAll('.grid div').forEach((g,k)=>{ const x=e((l-0.08*k)/0.3); g.style.opacity=x; g.style.transform=`scale(${0.9+0.1*x})`; });
  s.querySelectorAll('.rmd').forEach((c,k)=>{ const x=e((l-0.35-0.22*k)/0.3); c.style.opacity=x; c.style.transform=`translateX(${(1-x)*40}px)`; });
  s.querySelectorAll('.rchip').forEach((c,k)=>{ const x=e((l-0.5-0.15*k)/0.3); c.style.opacity=x; c.style.transform=`translateY(${(1-x)*20}px)`; });
  const big=s.querySelector('.big'); if(big) big.textContent=Math.round(big.dataset.n*e((l-0.2)/1.2)).toLocaleString('tr-TR');
  const u=s.querySelector('.url'); if(u){ const x=e((l-0.5)/0.4); u.style.opacity=x; u.style.transform=`scale(${0.9+0.1*x})`; }
  const sp=s.querySelector('.son p'); if(sp) sp.style.opacity=e((l-0.8)/0.4);
 } };'''

def kelimeler(h):
    out = []
    for part in h.replace('<br>', ' <br> ').replace('<em>', ' <em> ').replace('</em>', ' </em> ').split():
        out.append(part if part in ('<em>', '</em>', '<br>') else f'<span class="w">{part}</span>')
    return ' '.join(out).replace('<em> ', '<em>').replace(' </em>', '</em>').replace(' <br> ', '<br>')

MIN_SAHNE = 3.0   # sn — ekrandaki yazı rahatça okunsun (Yusuf Bey, 11 Kasım: "okuyamadan geçiyor")
MAX_KELIME = 8    # sahne başlığında en fazla kelime (son sahne hariç)

def okunurluk(r):
    """Hızlı geçen sahne ya da uzun başlık varsa üretimi durdurur; içerik görevi JSON'u düzeltir."""
    S = r['sahneler']; T = [s['t'] for s in S] + [r['sure']]; sorun = []
    for i, s in enumerate(S):
        d = T[i + 1] - T[i]; kel = len(re.sub(r'<[^>]+>', ' ', s['h']).split())
        en_az = MIN_SAHNE + (0.5 if s.get('p') or s['tur'] == 'liste' else 0)
        if d < en_az: sorun.append(f"sahne {i + 1} ({s['tur']}) {d:.1f} sn — en az {en_az:.1f} sn olmalı")
        if s['tur'] != 'son' and kel > MAX_KELIME: sorun.append(f"sahne {i + 1} başlığı {kel} kelime — en fazla {MAX_KELIME}")
        if s['tur'] == 'liste' and len(s.get('maddeler', [])) > 4: sorun.append(f"sahne {i + 1} listesinde {len(s['maddeler'])} madde — en fazla 4")
    if sorun:
        sys.exit('OKUNURLUK: ' + '; '.join(sorun) + '. Sahne sayısını azaltın, seslendirmeyi uzatın ya da başlığı kısaltın.')

def reels_html(r):
    okunurluk(r)
    S = r['sahneler']; html = '<div class="cv">'
    for i, s in enumerate(S):
        if s['tur'] == 'son':
            html += (f'<div class="sc dk" id="s{i}"><div class="son">{logo(True, 560)}<h1>{kelimeler(s["h"])}</h1>'
                     f'<span class="url">prefabrikteklif.com.tr</span><p>{s.get("p", "")}</p></div></div>')
            continue
        tema, stil, vis = '', '', ''
        if s['tur'] == 'foto':
            a, b = gok(s['img']); tema = 'gk'; stil = f'background:linear-gradient(180deg,{a} 0%,{b} 900px)'
            vis = f'<div class="rph tam"><img src="{img(s["img"])}"></div><div class="golge"></div>'
        elif s['tur'] == 'grid':
            vis = '<div class="grid">' + ''.join(f'<div><img src="{img(x)}"></div>' for x in s['imgs'][:4]) + '</div>'
        elif s['tur'] == 'sayi':
            tema = 'dk'
            vis = (f'<div class="rph" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px">'
                   f'<span class="big" data-n="{s["n"]}">0</span><span style="font:500 42px I;color:rgba(255,255,255,.65)">{s.get("birim", "")}</span></div>')
        elif s['tur'] == 'liste':
            vis = '<div class="rph rl">' + ''.join(f'<div class="rmd"><i>{s.get("ikon", "✓")}</i>{m}</div>' for m in s['maddeler'][:5]) + '</div>'
        chips = ''.join(f'<span class="rchip">{c}</span>' for c in s.get('cipler', []))
        p = f'<p>{s["p"]}</p>' if s.get('p') else ''
        html += (f'<div class="sc {tema}" id="s{i}" style="{stil}"><div class="lg">{logo(tema in ("dk", "gk"), 400)}</div>'
                 f'<div class="hd"><h1>{kelimeler(s["h"])}</h1>{p}</div>{vis}<div class="chips">{chips}</div></div>')
    T = [s['t'] for s in S] + [r['sure']]
    return page(html + f'</div><script>const T={json.dumps(T)};{RJS}</script>', RCSS, 1080, 1920)

META = json.loads((ROOT / 'src' / 'data' / 'meta.json').read_text())

def guncel(x, anahtar=''):
    """Firma/model sayıları her zaman src/data/meta.json'dan gelir.
    Metinde {firmaSayisi} / {modelSayisi} yazın. 'cipler' içindeki "N firma" / "N model" meta.json'daki
    genel ya da tip bazındaki bir sayıyla eşleşmezse (eski sayı) üretim hata verip durur."""
    if isinstance(x, dict): return {k: guncel(v, k) for k, v in x.items()}
    if isinstance(x, list): return [guncel(v, anahtar) for v in x]
    if isinstance(x, str):
        x = x.replace('{firmaSayisi}', str(META['firmaSayisi'])).replace('{modelSayisi}', str(META['modelSayisi']))
        m = re.fullmatch(r'(\d+) (firma|model)', x) if anahtar == 'cipler' else None
        if m:
            ist = META['istatistik'].values()
            gecerli = {META['firmaSayisi']} | {t['firma'] for t in ist} if m[2] == 'firma' else {META['modelSayisi']} | {t['model'] for t in ist}
            if int(m[1]) not in gecerli:
                sys.exit(f"ESKİ SAYI: çip '{x}' meta.json ile uyuşmuyor (güncel: {META['firmaSayisi']} firma, {META['modelSayisi']} model). "
                         "JSON'da {firmaSayisi} firma / {modelSayisi} model yazın.")
    return x

if __name__ == '__main__':
    mod, spec, out = sys.argv[1], guncel(json.load(open(sys.argv[2]))), pathlib.Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    if mod == 'tasarim':
        jobs = []
        for g in spec['tasarimlar']:
            for k, sl in enumerate(g['kartlar']):
                jobs.append(dict(w=1080, h=1350, out=str(out / f'{g["ad"]}-{k + 1}.jpg'), html=page(SABLON[sl['sablon']](sl))))
        (out / 'jobs.json').write_text(json.dumps(jobs))
    elif mod == 'reels':  # "reels" tek nesne (reels.html) ya da liste (reels-1.html, reels-2.html …)
        R = spec['reels']
        if isinstance(R, dict): (out / 'reels.html').write_text(reels_html(R))
        else:
            for k, r in enumerate(R): (out / f'reels-{k + 1}.html').write_text(reels_html(r))

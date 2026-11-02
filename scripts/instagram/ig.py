#!/usr/bin/env python3
"""PrefabrikTeklif Instagram üretim hattı — "soft premium" tasarım sistemi.

Kullanım (depo kökünden):
  python3 scripts/instagram/ig.py tasarim scripts/instagram/icerik/2026-11-02.json  çıktı_klasörü
  python3 scripts/instagram/ig.py reels   scripts/instagram/icerik/2026-11-02.json  çıktı_klasörü
Fontlar: node_modules/@fontsource/{manrope,playfair-display} (yoksa FONT_DIR ortam değişkeni).
Görseller: public/img. Logo: scripts/instagram/marka.
Tasarımlar PNG (1080×1350), reels için kare kare HTML (reels.cjs ile çekilir).
"""
import base64, json, os, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
IMG = ROOT / 'public' / 'img'
MARKA = pathlib.Path(__file__).resolve().parent / 'marka'
NM = pathlib.Path(os.environ.get('FONT_DIR', ROOT / 'node_modules' / '@fontsource'))
C = dict(ivory='#F3EFE7', sand='#E9E2D4', line='#D8D0BF', ink='#15211B', ink2='#46524B', muted='#7A847D',
         forest='#103A28', green='#1C6243', sage='#DCE7DE', sage2='#B9CFBF', clay='#B98A5E')
LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'

def b64(p):
    p = pathlib.Path(p)
    mime = {'.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml'}[p.suffix]
    return f'data:{mime};base64,' + base64.b64encode(p.read_bytes()).decode()

def fonts():
    css = ''
    for fam, name, weights, styles in (('S', 'playfair-display', (500, 600), ('normal', 'italic')), ('M', 'manrope', (500, 600, 700, 800), ('normal',))):
        for w in weights:
            for st in styles:
                for sub, rng in (('latin', LAT), ('latin-ext', EXT)):
                    f = NM / name / 'files' / f'{name}-{sub}-{w}-{st}.woff2'
                    css += f"@font-face{{font-family:{fam};font-style:{st};font-weight:{w};src:url({b64(f)}) format('woff2');unicode-range:{rng}}}"
    return css

def logo(dark=False, w=410):
    s = (MARKA / ('prefabrikteklif-logo-koyu-zemin.svg' if dark else 'prefabrikteklif-logo.svg')).read_text()
    return re.sub(r'width="\d+" height="\d+"', f'width="{w}" height="{round(w * 168.7 / 825.7)}"', s, count=1)

def img(name):
    return b64(IMG / name)

GRAIN = ("url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'>"
         "<feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .06 0'/>"
         "</filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")")
BASE = f'''*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:M,sans-serif;-webkit-font-smoothing:antialiased;color:{C['ink']};font-variant-ligatures:none;font-feature-settings:'liga' 0,'dlig' 0}}
.cv{{position:relative;overflow:hidden;background:{C['ivory']}}}
.cv::after{{content:'';position:absolute;inset:0;background-image:{GRAIN};pointer-events:none;mix-blend-mode:multiply}}
.cv.dk{{background:{C['forest']};color:{C['ivory']}}} .cv.dk::after{{opacity:.6;mix-blend-mode:screen}}
.fr{{position:absolute;inset:0;padding:68px 72px 64px;display:flex;flex-direction:column}}
.top{{display:flex;justify-content:space-between;align-items:center;flex:none}}
.lbl{{font:700 20px M;letter-spacing:.22em;text-transform:uppercase;color:{C['muted']}}} .dk .lbl{{color:{C['sage2']}}}
.ser{{font-family:S;font-weight:600;letter-spacing:-.015em;line-height:1.06}}
.ser em{{font-style:italic;font-weight:500;color:{C['green']}}} .dk .ser em{{color:{C['sage2']}}}
.body{{font:500 32px/1.42 M;color:{C['ink2']}}} .dk .body{{color:#D9E2DB}}
.ph{{border-radius:34px;overflow:hidden;position:relative;background:{C['sand']}}} .ph img{{width:100%;height:100%;object-fit:cover;display:block}}
.chip{{display:inline-flex;align-items:center;gap:10px;border-radius:999px;padding:12px 22px;font:700 24px M;background:{C['sage']};color:{C['forest']}}}
.dk .chip{{background:rgba(255,255,255,.08);color:{C['ivory']};border:1.5px solid rgba(255,255,255,.18)}}
.foot{{flex:none;margin-top:auto;padding-top:22px;border-top:1.5px solid {C['line']};display:flex;justify-content:space-between;align-items:center;font:700 22px M;color:{C['ink2']};letter-spacing:.02em}}
.dk .foot{{border-color:rgba(255,255,255,.18);color:#D9E2DB}}
.num{{font-family:S;font-weight:600;font-size:30px;color:{C['clay']}}}
'''
_F = None
def page(body, css='', w=1080, h=1350):
    global _F
    if _F is None: _F = fonts()
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{_F}{BASE}html,body{{width:{w}px;height:{h}px;overflow:hidden}}.cv{{width:{w}px;height:{h}px}}{css}</style></head><body>{body}</body></html>'

def frame(inner, dark=False, label='', foot_left='prefabrikteklif.com.tr', foot_right=''):
    return (f'<div class="cv{" dk" if dark else ""}"><div class="fr"><div class="top">{logo(dark)}<span class="lbl">{label}</span></div>'
            f'{inner}<div class="foot"><span>{foot_left}</span><span>{foot_right}</span></div></div></div>')

# ---------------- Tasarım şablonları ----------------
def t_kapak(s):  # büyük başlık + fotoğraf
    return frame(f'''<div style="margin-top:58px;display:flex;flex-direction:column;gap:26px"><h1 class="ser" style="font-size:{s.get("boy",94)}px">{s["h"]}</h1>
{f'<p class="body" style="max-width:880px">{s["p"]}</p>' if s.get("p") else ""}</div><div class="ph" style="margin:40px 0 36px;flex:1"><img src="{img(s["img"])}"></div>''',
                 s.get('koyu', False), s.get('etiket', ''), s.get('alt_sol', 'prefabrikteklif.com.tr'), s.get('alt_sag', 'Kaydırın →'))

def t_liste(s):  # numaralı maddeler
    rr = ''.join(f'<div style="display:flex;gap:30px;padding:40px 0;border-top:1.5px solid {C["line"] if not s.get("koyu") else "rgba(255,255,255,.18)"}"><span class="num">{i+1:02d}</span>'
                 f'<div style="display:flex;flex-direction:column;gap:10px"><b style="font:700 42px M;letter-spacing:-.01em">{t}</b><span class="body" style="font-size:33px">{d}</span></div></div>'
                 for i, (t, d) in enumerate(s['maddeler']))
    return frame(f'<h2 class="ser" style="font-size:{s.get("boy",92)}px;margin:70px 0 40px">{s["h"]}</h2><div style="flex:1;display:flex;flex-direction:column;justify-content:center">{rr}</div>',
                 s.get('koyu', False), s.get('etiket', ''), s.get('alt_sol', 'prefabrikteklif.com.tr'), s.get('alt_sag', ''))

def t_kontrol(s):  # onay kutulu ızgara (+ isteğe bağlı fotoğraf)
    gi = ''.join(f'<div style="display:flex;align-items:center;gap:18px;padding:30px 28px;border-radius:26px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.14);font:700 34px M">'
                 f'<span style="width:44px;height:44px;flex:none;border-radius:50%;background:{C["sage2"]};color:{C["forest"]};display:flex;align-items:center;justify-content:center;font-size:24px">✓</span>{t}</div>'
                 for t in s['maddeler'])
    ph = f'<div class="ph" style="flex:1;margin:34px 0 32px"><img src="{img(s["img"])}"></div>' if s.get('img') else ''
    return frame(f'''<h2 class="ser" style="font-size:{s.get("boy",84)}px;margin:64px 0 18px">{s["h"]}</h2>{f'<p class="body" style="margin-bottom:44px">{s["p"]}</p>' if s.get("p") else ""}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">{gi}</div>{ph}''', s.get('koyu', True), s.get('etiket', ''), s.get('alt_sol', 'prefabrikteklif.com.tr'), s.get('alt_sag', ''))

def t_cta(s):  # fotoğraf üstte, başlık + çipler
    chips = ''.join(f'<span class="chip">{c}</span>' for c in s.get('cipler', []))
    return frame(f'''<div class="ph" style="margin-top:60px;height:{s.get("foto_boy",420)}px;flex:none"><img src="{img(s["img"])}"></div>
<h2 class="ser" style="font-size:{s.get("boy",86)}px;margin:46px 0 22px">{s["h"]}</h2>{f'<p class="body">{s["p"]}</p>' if s.get("p") else ""}
<div style="display:flex;gap:14px;margin-top:30px;flex-wrap:wrap">{chips}</div>''', s.get('koyu', False), s.get('etiket', ''), s.get('alt_sol', 'prefabrikteklif.com.tr'), s.get('alt_sag', 'Bağlantı profilde'))

def t_ucfoto(s):  # başlık + 3'lü fotoğraf şeridi + çipler (firma duyurusu vb.)
    chips = ''.join(f'<span class="chip">{c}</span>' for c in s.get('cipler', []))
    ims = ''.join(f'<div class="ph"><img src="{img(x)}"></div>' for x in s['imgs'][:3])
    return frame(f'''<div style="margin-top:60px;display:flex;flex-direction:column;gap:26px"><h1 class="ser" style="font-size:{s.get("boy",92)}px">{s["h"]}</h1>
{f'<p class="body" style="max-width:900px">{s["p"]}</p>' if s.get("p") else ""}</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:38px 0 30px;flex:1">{ims}</div>
<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:6px">{chips}</div>''', s.get('koyu', True), s.get('etiket', ''), s.get('alt_sol', 'prefabrikteklif.com.tr'), s.get('alt_sag', ''))

def t_alinti(s):  # büyük tek cümle / soru + kısa açıklama (fotoğrafsız, çok sade)
    return frame(f'''<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:34px"><span class="num" style="font-size:120px;line-height:.6">“</span>
<h1 class="ser" style="font-size:{s.get("boy",100)}px">{s["h"]}</h1>{f'<p class="body" style="max-width:880px">{s["p"]}</p>' if s.get("p") else ""}</div>''',
                 s.get('koyu', False), s.get('etiket', ''), s.get('alt_sol', 'prefabrikteklif.com.tr'), s.get('alt_sag', ''))

SABLON = dict(kapak=t_kapak, liste=t_liste, kontrol=t_kontrol, cta=t_cta, ucfoto=t_ucfoto, alinti=t_alinti)

# ---------------- Reels ----------------
RCSS = f'''.sc{{position:absolute;inset:0;opacity:0}}
.lg{{position:absolute;left:0;right:0;top:120px;display:flex;justify-content:center;z-index:9}}
.hd{{position:absolute;left:84px;right:84px;top:300px}}
.hd h1{{font-family:S;font-weight:600;font-size:116px;line-height:1.06;letter-spacing:-.02em}}
.hd h1 em{{font-style:italic;font-weight:500;color:{C['green']}}}
.hd p{{margin-top:28px;font:500 40px/1.35 M;color:{C['ink2']}}}
.w{{display:inline-block;opacity:0}}
.rph{{position:absolute;left:72px;right:72px;top:880px;height:700px;border-radius:44px;overflow:hidden;background:{C['sand']};box-shadow:0 30px 70px rgba(21,33,27,.18)}}
.rph img{{width:100%;height:100%;object-fit:cover}}
.grid{{position:absolute;left:72px;right:72px;top:880px;height:700px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:16px}}
.grid div{{border-radius:30px;overflow:hidden;opacity:0}} .grid img{{width:100%;height:100%;object-fit:cover}}
.chips{{position:absolute;left:72px;right:72px;top:1620px;display:flex;gap:14px;flex-wrap:wrap;justify-content:center}}
.rchip{{font:700 34px M;padding:16px 28px;border-radius:999px;background:{C['sage']};color:{C['forest']};opacity:0}}
.big{{font-family:S;font-weight:600;font-size:230px;line-height:.9;color:{C['green']};letter-spacing:-.04em}}
.son{{position:absolute;inset:0;background:{C['forest']};color:{C['ivory']};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:48px;text-align:center;padding:0 80px}}
.son h1{{font-family:S;font-weight:600;font-size:96px;line-height:1.08;letter-spacing:-.02em}} .son h1 em{{font-style:italic;font-weight:500;color:{C['sage2']}}}
.url{{font:800 46px M;background:{C['ivory']};color:{C['forest']};padding:24px 44px;border-radius:999px}}
.son p{{font:600 36px M;color:#D9E2DB}}'''
RJS = '''const cl=x=>Math.min(Math.max(x,0),1); const e=x=>1-Math.pow(1-cl(x),3);
window.setT=(t)=>{ const n=T.length-1; let last=0; for(let i=0;i<n;i++) if(t>=T[i]) last=i;
 document.getElementById('lg').style.opacity = document.querySelector('#s'+last+' .son') ? 0 : 1;
 for(let i=0;i<n;i++){ const s=document.getElementById('s'+i); const a=T[i], b=T[i+1], l=t-a, d=b-a;
  let o=0; if(t>=a && t<b+0.25){ o = i===0 ? 1 : e(l/0.25); if(i<n-1 && t>=b) o=1-e((t-b)/0.25); }
  s.style.opacity=o; s.style.zIndex = t>=a?2:1; if(!o) continue;
  s.querySelectorAll('.w').forEach((w,k)=>{ const x=e((l-0.06*k)/0.35); w.style.opacity=x; w.style.transform=`translateY(${(1-x)*36}px)`; });
  const p=s.querySelector('.hd p'); if(p) p.style.opacity=e((l-0.45)/0.35);
  const ph=s.querySelector('.rph'); if(ph){ const x=e((l-0.1)/0.5); ph.style.transform=`translateY(${(1-x)*70}px) scale(${0.96+0.04*x})`; ph.style.opacity=x; const im=ph.querySelector('img'); if(im) im.style.transform=`scale(${1.03+0.08*cl(l/d)})`; }
  s.querySelectorAll('.grid div').forEach((g,k)=>{ const x=e((l-0.08*k)/0.3); g.style.opacity=x; g.style.transform=`scale(${0.9+0.1*x})`; });
  s.querySelectorAll('.rchip').forEach((c,k)=>{ const x=e((l-0.5-0.15*k)/0.3); c.style.opacity=x; c.style.transform=`translateY(${(1-x)*20}px)`; });
  const big=s.querySelector('.big'); if(big) big.textContent=Math.round(big.dataset.n*e((l-0.2)/1.2)).toLocaleString('tr-TR');
  const u=s.querySelector('.url'); if(u){ const x=e((l-0.5)/0.4); u.style.opacity=x; u.style.transform=`scale(${0.9+0.1*x})`; }
  const sp=s.querySelector('.son p'); if(sp) sp.style.opacity=e((l-0.8)/0.4);
 } };'''

def kelimeler(h):
    out = []
    for part in h.replace('<em>', ' <em> ').replace('</em>', ' </em> ').split():
        out.append(part if part in ('<em>', '</em>') else f'<span class="w">{part}</span>')
    return ' '.join(out).replace('<em> ', '<em>').replace(' </em>', '</em>')

def reels_html(r):
    S = r['sahneler']; html = f'<div class="cv"><div class="lg" id="lg">{logo(False, 470)}</div>'
    for i, s in enumerate(S):
        if s['tur'] == 'son':
            html += f'<div class="sc" id="s{i}"><div class="son">{logo(True, 560)}<h1>{kelimeler(s["h"])}</h1><span class="url">prefabrikteklif.com.tr</span><p>{s.get("p", "")}</p></div></div>'
            continue
        vis = ''
        if s['tur'] == 'foto': vis = f'<div class="rph"><img src="{img(s["img"])}"></div>'
        elif s['tur'] == 'grid': vis = '<div class="grid">' + ''.join(f'<div><img src="{img(x)}"></div>' for x in s['imgs'][:4]) + '</div>'
        elif s['tur'] == 'sayi': vis = f'<div class="rph" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:{C["sage"]}"><span class="big" data-n="{s["n"]}">0</span><span style="font:700 40px M;color:{C["forest"]}">{s.get("birim","")}</span></div>'
        chips = ''.join(f'<span class="rchip">{c}</span>' for c in s.get('cipler', []))
        p = f'<p>{s["p"]}</p>' if s.get('p') else ''
        html += f'<div class="sc" id="s{i}"><div class="hd"><h1>{kelimeler(s["h"])}</h1>{p}</div>{vis}<div class="chips">{chips}</div></div>'
    T = [s['t'] for s in S] + [r['sure']]
    return page(html + f'</div><script>const T={json.dumps(T)};{RJS}</script>', RCSS, 1080, 1920)

if __name__ == '__main__':
    mod, spec, out = sys.argv[1], json.load(open(sys.argv[2])), pathlib.Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    if mod == 'tasarim':
        jobs = []
        for g in spec['tasarimlar']:
            for k, sl in enumerate(g['kartlar']):
                jobs.append(dict(w=1080, h=1350, out=str(out / f'{g["ad"]}-{k + 1}.jpg'), html=page(SABLON[sl['sablon']](sl))))
        (out / 'jobs.json').write_text(json.dumps(jobs))
    elif mod == 'reels':
        (out / 'reels.html').write_text(reels_html(spec['reels']))

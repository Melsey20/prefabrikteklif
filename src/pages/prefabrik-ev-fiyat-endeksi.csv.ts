// Endeks verisi (CSV): kaynak gösterilerek serbestçe kullanılabilir
import { fiyatli } from '../lib/endeks';
import { TIPLER, meta } from '../lib/data';
export function GET() {
  const e = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const satir = [['firma', 'model', 'tip', 'm2', 'oda', 'fiyat_tl', 'm2_fiyat_tl', 'kdv', 'kaynak', 'kontrol_tarihi'].join(','),
    ...fiyatli.map((m) => [m.firmaAd, m.ad, TIPLER[m.tip]?.ad || m.tip, m.m2 ?? '', m.oda, m.fiyat, m.m2Fiyat ?? '', m.kdv || 'belirtilmemiş', m.kaynak, meta.sonKontrol].map(e).join(','))];
  return new Response('﻿' + satir.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
}

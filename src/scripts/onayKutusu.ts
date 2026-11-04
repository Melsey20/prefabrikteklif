// Girişten sonra: kullanıcı/firma güncel sözleşmeleri onaylamadıysa bir kez onay istenir (onay kaydı sunucuda saklanır)
import { h, modal, toast } from './ui';
import { eksikOnaylar, onayVer, cikis, type Ben } from './fb';
const AD: Record<string, [string, string]> = {
  kullanici: ['Kullanıcı Sözleşmesi', '/kullanici-sozlesmesi/'], kvkk: ['KVKK Aydınlatma Metni', '/kvkk-aydinlatma-metni/'], gizlilik: ['Gizlilik ve Veri Koruma Politikası', '/gizlilik-politikasi/'],
  firma: ['Firma Üyelik Sözleşmesi', '/firma-uyelik-sozlesmesi/'], abonelik: ['Abonelik, Ödeme ve İptal Koşulları', '/abonelik-ve-iptal-kosullari/'],
};
export function onayIste(ben: Ben | null): Promise<void> {
  const eksik = ben ? eksikOnaylar(ben) : [];
  if (!eksik.length) return Promise.resolve();
  return new Promise((bitti) => {
    const kutu = h('input', { type: 'checkbox' }) as HTMLInputElement;
    const paz = h('input', { type: 'checkbox' }) as HTMLInputElement;
    const hata = h('p', { class: 'err', hidden: true, role: 'alert' });
    const linkler: (Node | string)[] = [];
    eksik.forEach((k, i) => { linkler.push(h('a', { href: AD[k][1], target: '_blank' }, AD[k][0])); linkler.push(i < eksik.length - 2 ? ', ' : i === eksik.length - 2 ? ' ve ' : ''); });
    let kapat: () => void = () => {};
    const f = h('form', { class: 'form', style: { gap: '12px' }, onsubmit: async (e: Event) => {
      e.preventDefault(); hata.hidden = true;
      if (!kutu.checked) { hata.textContent = 'Devam etmek için metinleri onaylayın.'; hata.hidden = false; return; }
      try { await onayVer(eksik, ben?.rol === 'firma' ? 'firma-hesap' : 'hesap', paz.checked); kapat(); toast('Teşekkürler, onayınız kaydedildi'); bitti(); } catch (err: any) { hata.textContent = err.message; hata.hidden = false; }
    } },
      h('p', { class: 'small', style: { margin: 0 } }, 'Hesabınızı kullanmaya devam etmek için güncel metinleri onaylamanız gerekiyor. Onayınız, tarih ve sürüm bilgisiyle kaydedilir.'),
      h('label', { class: 'chk' }, kutu, h('span', {}, ...linkler, ' metinlerini okudum, kabul ediyorum.')),
      ben?.rol === 'firma' ? null : h('label', { class: 'chk' }, paz, h('span', {}, 'Fiyat düşüşü ve yeni modellerden e-postayla haberdar olmak istiyorum (isteğe bağlı).')),
      hata, h('button', { class: 'btn btn-p', type: 'submit' }, 'Onayla ve devam et'),
      h('button', { class: 'btn btn-g btn-s', type: 'button', style: { border: 0 }, onclick: async () => { await cikis(); location.href = '/'; } }, 'Onaylamıyorum, çıkış yap'));
    kapat = modal('Sözleşme onayı', f, { kapatilamaz: true });
  });
}

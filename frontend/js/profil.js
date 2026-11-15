'use strict';

(async () => {
  const { el } = Y;
  if (!(await Y.sayfaBaslat())) return;

  const bilgiler = document.getElementById('bilgiler');
  const form = document.getElementById('alerjen-formu');
  const alan = document.getElementById('alerjenler');
  const ROLLER = { ogrenci: 'Öğrenci', personel: 'Personel', yonetici: 'Yönetici' };

  try {
    const veri = await Y.api('/profil');
    bilgileriCiz(veri.kullanici);
    alerjenleriCiz(veri.alerjenler, new Set(veri.secili_alerjenler));
  } catch (hata) {
    Y.bildir(hata.message);
    return;
  }

  form.addEventListener('submit', kaydet);

  function bilgileriCiz(k) {
    const satirlar = [
      ['Ad soyad', `${k.ad} ${k.soyad}`],
      ['E-posta', k.eposta],
      ['Rol', ROLLER[k.rol] || k.rol],
      k.ogrenci_no ? ['Öğrenci no', k.ogrenci_no] : null,
    ].filter(Boolean);
    bilgiler.replaceChildren(...satirlar.map(([ad, deger]) =>
      el('div', {}, el('dt', {}, ad), el('dd', {}, deger))));
  }

  function alerjenleriCiz(liste, secili) {
    alan.append(...liste.map((a) =>
      el('label', {},
        el('input', { type: 'checkbox', name: 'alerjen', value: a.id, checked: secili.has(a.id) }),
        el('span', {}, a.ad))));
  }

  async function kaydet(olay) {
    olay.preventDefault();
    Y.bildirimTemizle();
    const alerjen_idler = [...alan.querySelectorAll('input:checked')].map((i) => Number(i.value));
    const dugme = form.querySelector('button[type="submit"]');
    dugme.disabled = true;
    try {
      const sonuc = await Y.api('/profil/alerjenler', { method: 'PUT', govde: { alerjen_idler } });
      Y.bildir(sonuc.mesaj, 'basari');
    } catch (hata) {
      Y.bildir(hata.message);
    } finally {
      dugme.disabled = false;
    }
  }
})();

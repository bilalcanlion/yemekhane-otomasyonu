'use strict';

(async () => {
  const { el } = Y;
  if (!(await Y.sayfaBaslat())) return;

  const bakiyeYazi = document.getElementById('bakiye');
  const hedef = document.getElementById('hareketler');
  const form = document.getElementById('yukle-formu');
  const turAdi = { yukleme: 'Yükleme', rezervasyon: 'Rezervasyon', iade: 'İade' };

  document.querySelectorAll('[data-tutar]').forEach((b) =>
    b.addEventListener('click', () => {
      form.tutar.value = b.dataset.tutar;
      form.tutar.focus();
    }));

  form.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    Y.bildirimTemizle();
    const dugme = form.querySelector('button[type="submit"]');
    dugme.disabled = true;
    try {
      const sonuc = await Y.api('/bakiye/yukle', { method: 'POST', govde: { tutar: form.tutar.value } });
      form.reset();
      await yukle();
      Y.bakiyeGoster(sonuc.bakiye);
      bakiyeYazi.textContent = Y.tl(sonuc.bakiye);
      Y.bildir(`${sonuc.mesaj} Yeni bakiyeniz: ${Y.tl(sonuc.bakiye)}`, 'basari');
    } catch (hata) {
      Y.bildir(hata.message);
    } finally {
      dugme.disabled = false;
    }
  });

  yukle();

  async function yukle() {
    Y.bekle(hedef);
    try {
      const veri = await Y.api('/bakiye');
      bakiyeYazi.textContent = Y.tl(veri.bakiye);
      Y.bakiyeGoster(veri.bakiye);
      ciz(veri.hareketler);
    } catch (hata) {
      hedef.replaceChildren();
      Y.bildir(hata.message);
    }
  }

  function ciz(hareketler) {
    if (hareketler.length === 0) {
      hedef.replaceChildren(el('p', { class: 'bos-durum' }, 'Henüz hareket yok.'));
      return;
    }
    hedef.replaceChildren(el('div', {}, hareketler.map((h) =>
      el('div', { class: 'hareket' },
        el('span', {}, h.aciklama || turAdi[h.tur]),
        el('span', { class: `tutar ${h.tutar > 0 ? 'arti' : 'eksi'}` }, `${h.tutar > 0 ? '+' : '−'}${Y.tl(Math.abs(h.tutar))}`),
        el('span', { class: 'zaman' }, `${Y.tarihSaatYaz(h.olusturma)} · ${turAdi[h.tur]}`)))));
  }
})();

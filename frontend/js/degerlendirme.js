'use strict';

(async () => {
  const { el } = Y;
  if (!(await Y.sayfaBaslat())) return;

  const hedef = document.getElementById('liste');
  yukle();

  async function yukle() {
    Y.bekle(hedef);
    try {
      const { menuler } = await Y.api('/degerlendirmeler');
      if (menuler.length === 0) {
        hedef.replaceChildren(el('div', { class: 'kart bos-durum' },
          'Henüz kullandığınız bir menü yok. Turnikeden geçtiğiniz öğünler burada listelenir.'));
        return;
      }
      menuler.sort((a, b) => Number(a.degerlendirildi) - Number(b.degerlendirildi));
      hedef.replaceChildren(el('div', { class: 'iki-sutun' }, menuler.map(kart)));
    } catch (hata) {
      hedef.replaceChildren();
      Y.bildir(hata.message);
    }
  }

  function yildizGoster(puan) {
    return el('span', { class: 'puan-goster', 'aria-label': `${puan} / 5` },
      '★'.repeat(puan), el('span', { class: 'bos' }, '★'.repeat(5 - puan)));
  }

  function kart(m) {
    const baslik = el('div', { class: 'kart-baslik' },
      el('div', {},
        el('h3', {}, `${Y.tarihYaz(m.tarih)} · ${m.ogun}`),
        el('p', { class: 'soluk kucuk sikisik' }, m.yemekhane)),
      m.degerlendirildi ? yildizGoster(m.puan) : el('span', { class: 'rozet rozet-alerjen' }, 'Puan bekliyor'));

    if (m.degerlendirildi) {
      return el('article', { class: 'kart' }, baslik,
        m.yorum ? el('p', { class: 'kucuk yorum' }, `“${m.yorum}”`) : null);
    }

    const ad = `puan-${m.menu_id}`;
    const form = el('form', { class: 'ust-bosluk', novalidate: true },
      el('fieldset', { class: 'yildizlar' },
        el('legend', {}, 'Puanınız'),
        [5, 4, 3, 2, 1].map((p) => [
          el('input', { type: 'radio', name: ad, id: `${ad}-${p}`, value: p }),
          el('label', { for: `${ad}-${p}`, title: `${p} yıldız` }, '★'),
        ])),
      el('div', { class: 'alan' },
        el('label', { for: `yorum-${m.menu_id}` }, 'Yorum (isteğe bağlı)'),
        el('textarea', { id: `yorum-${m.menu_id}`, name: 'yorum', rows: 3, maxlength: 500, placeholder: 'Yemekler nasıldı?' })),
      el('button', { class: 'dugme', type: 'submit' }, 'Gönder'));

    form.addEventListener('submit', async (olay) => {
      olay.preventDefault();
      const secili = form.querySelector(`input[name="${ad}"]:checked`);
      const dugme = form.querySelector('button');
      dugme.disabled = true;
      try {
        const sonuc = await Y.api('/degerlendirmeler', {
          method: 'POST',
          govde: { menu_id: m.menu_id, puan: secili ? Number(secili.value) : null, yorum: form.yorum.value },
        });
        await yukle();
        Y.bildir(sonuc.mesaj, 'basari');
      } catch (hata) {
        Y.bildir(hata.message);
        dugme.disabled = false;
      }
    });

    return el('article', { class: 'kart' }, baslik, form);
  }
})();

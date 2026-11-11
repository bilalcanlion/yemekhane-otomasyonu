'use strict';

(async () => {
  const { el } = Y;
  if (!(await Y.sayfaBaslat())) return;

  const form = document.getElementById('filtre');
  const hedef = document.getElementById('menu');

  try {
    const t = await Y.api('/tanimlar');
    Y.secenekDoldur(form.yemekhane, t.yemekhaneler);
    Y.secenekDoldur(form.ogun, t.ogunler);
    form.tarih.value = t.bugun;
    const saat = t.simdi.slice(11, 16);
    const siradaki = t.ogunler.find((o) => o.son_saat > saat) || t.ogunler[t.ogunler.length - 1];
    form.ogun.value = siradaki.id;
  } catch (hata) {
    Y.bildir(hata.message);
    return;
  }

  form.addEventListener('submit', (olay) => olay.preventDefault());
  form.addEventListener('change', yukle);
  yukle();

  async function yukle() {
    Y.bildirimTemizle();
    Y.bekle(hedef);
    const p = new URLSearchParams({
      yemekhane_id: form.yemekhane.value,
      ogun_id: form.ogun.value,
      tarih: form.tarih.value,
    });
    try {
      ciz(await Y.api(`/menuler/gunluk?${p}`));
    } catch (hata) {
      hedef.replaceChildren(el('div', { class: 'kart bos-durum' }, hata.message));
    }
  }

  function ciz(m) {
    const gruplar = [];
    for (const y of m.yemekler) {
      const son = gruplar[gruplar.length - 1];
      if (son && son.kategori === y.kategori) son.yemekler.push(y);
      else gruplar.push({ kategori: y.kategori, yemekler: [y] });
    }

    hedef.replaceChildren(
      el('article', { class: 'kart' },
        el('div', { class: 'kart-baslik' },
          el('div', {},
            el('h2', {}, `${m.ogun} · ${m.yemekhane}`),
            el('p', { class: 'soluk kucuk sikisik' }, Y.tarihYaz(m.tarih, true))),
          m.tamami_vejetaryen ? el('span', { class: 'rozet rozet-veg' }, 'Tamamı vejetaryen') : null),

        el('dl', { class: 'ozet' },
          el('div', {}, el('dt', {}, 'Ücret (size)'), el('dd', { class: 'vurgu' }, Y.tl(m.fiyat))),
          el('div', {}, el('dt', {}, 'Toplam kalori'), el('dd', {}, `${m.toplam_kalori} kcal`)),
          el('div', {}, el('dt', {}, 'Boş yer'), el('dd', {}, `${m.bos_yer} / ${m.kapasite}`))),

        gruplar.map((g) =>
          el('section', { class: 'kategori' },
            el('h3', {}, g.kategori),
            el('ul', { class: 'yemekler' }, g.yemekler.map(yemekSatiri)))),

        el('div', { class: 'ogun-alt ust-bosluk' },
          el('span', { class: 'soluk kucuk' }, `Rezervasyon son saati: ${Y.tarihSaatYaz(m.rezervasyon_son)}`),
          m.rezerve_edilebilir
            ? el('a', { class: 'dugme', href: `/haftalik.html?yemekhane_id=${m.yemekhane_id}&baslangic=${m.tarih}` }, 'Rezervasyon yap')
            : el('span', { class: 'rozet' }, m.neden))),
    );
  }

  function yemekSatiri(y) {
    return el('li', { class: 'yemek' },
      el('span', { class: 'yemek-ad' }, y.yemek),
      el('span', { class: 'yemek-kalori' }, `${y.kalori} kcal`),
      (y.vejetaryen || y.alerjenler.length)
        ? el('span', { class: 'yemek-etiketler' },
          y.vejetaryen ? el('span', { class: 'rozet rozet-veg' }, 'Vejetaryen') : null,
          y.alerjenler.map((a) => el('span', { class: 'rozet rozet-alerjen' }, a)))
        : null);
  }
})();

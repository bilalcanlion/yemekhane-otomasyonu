'use strict';

(async () => {
  const { el } = Y;
  if (!(await Y.sayfaBaslat({ rol: 'yonetici' }))) return;

  const form = document.getElementById('menu-formu');
  const formBaslik = document.getElementById('form-baslik');
  const yeniDugme = document.getElementById('yeni');
  const yemekAlani = document.getElementById('f-yemekler');
  const secimOzet = document.getElementById('secim-ozet');
  const filtre = document.getElementById('rapor-filtre');
  const rapor = document.getElementById('rapor');

  let duzenlenenId = null;
  let bugun;

  try {
    const [t, { yemekler }] = await Promise.all([Y.api('/tanimlar'), Y.api('/yonetim/yemekler')]);
    bugun = t.bugun;
    Y.secenekDoldur(form.yemekhane_id, t.yemekhaneler);
    Y.secenekDoldur(form.ogun_id, t.ogunler);
    Y.secenekDoldur(filtre.yemekhane_id, t.yemekhaneler, { bos: 'Tümü' });
    filtre.baslangic.value = Y.gunEkle(bugun, -7);
    filtre.bitis.value = Y.gunEkle(bugun, 7);
    yemekleriCiz(yemekler);
    formuSifirla();
  } catch (hata) {
    Y.bildir(hata.message);
    return;
  }

  filtre.addEventListener('submit', (olay) => olay.preventDefault());
  filtre.addEventListener('change', raporYukle);
  yeniDugme.addEventListener('click', () => {
    Y.bildirimTemizle();
    formuSifirla();
  });
  yemekAlani.addEventListener('change', secimOzetiYaz);
  form.addEventListener('submit', kaydet);
  raporYukle();

  function yemekleriCiz(yemekler) {
    let sonKategori = null;
    const parcalar = [];
    for (const y of yemekler) {
      if (y.kategori !== sonKategori) {
        parcalar.push(el('h4', {}, y.kategori));
        sonKategori = y.kategori;
      }
      parcalar.push(el('label', {},
        el('input', { type: 'checkbox', name: 'yemek', value: y.id, 'data-kalori': y.kalori }),
        el('span', {}, y.ad, y.vejetaryen ? ' 🌱' : ''),
        el('span', { class: 'kcal' }, `${y.kalori} kcal`)));
    }
    yemekAlani.append(...parcalar);
  }

  function secimOzetiYaz() {
    const secili = [...yemekAlani.querySelectorAll('input:checked')];
    const kalori = secili.reduce((t, i) => t + Number(i.dataset.kalori), 0);
    secimOzet.textContent = secili.length ? `· ${secili.length} yemek, ${kalori} kcal` : '';
  }

  function formuSifirla() {
    duzenlenenId = null;
    form.reset();
    form.tarih.value = Y.gunEkle(bugun, 1);
    for (const alan of [form.yemekhane_id, form.tarih, form.ogun_id]) alan.disabled = false;
    formBaslik.textContent = 'Yeni menü';
    yeniDugme.hidden = true;
    secimOzetiYaz();
    rapor.querySelectorAll('tr.secili').forEach((s) => s.classList.remove('secili'));
  }

  async function duzenle(menuId) {
    Y.bildirimTemizle();
    try {
      const { menu } = await Y.api(`/yonetim/menuler/${menuId}`);
      duzenlenenId = menu.id;
      form.yemekhane_id.value = menu.yemekhane_id;
      form.tarih.value = menu.tarih;
      form.ogun_id.value = menu.ogun_id;
      form.ogrenci_fiyati.value = menu.ogrenci_fiyati;
      form.personel_fiyati.value = menu.personel_fiyati;
      for (const alan of [form.yemekhane_id, form.tarih, form.ogun_id]) alan.disabled = true;
      const secili = new Set(menu.yemek_idler);
      yemekAlani.querySelectorAll('input').forEach((i) => {
        i.checked = secili.has(Number(i.value));
      });
      formBaslik.textContent = `Menü #${menu.id} düzenleniyor`;
      yeniDugme.hidden = false;
      secimOzetiYaz();
      rapor.querySelectorAll('tr').forEach((s) => s.classList.toggle('secili', s.dataset.menu === String(menu.id)));
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (hata) {
      Y.bildir(hata.message);
    }
  }

  async function kaydet(olay) {
    olay.preventDefault();
    Y.bildirimTemizle();
    const govde = {
      ogrenci_fiyati: form.ogrenci_fiyati.value,
      personel_fiyati: form.personel_fiyati.value,
      yemek_idler: [...yemekAlani.querySelectorAll('input:checked')].map((i) => Number(i.value)),
    };
    const dugme = form.querySelector('button[type="submit"]');
    dugme.disabled = true;
    try {
      let sonuc;
      if (duzenlenenId) {
        sonuc = await Y.api(`/yonetim/menuler/${duzenlenenId}`, { method: 'PUT', govde });
      } else {
        Object.assign(govde, {
          yemekhane_id: form.yemekhane_id.value,
          tarih: form.tarih.value,
          ogun_id: form.ogun_id.value,
        });
        sonuc = await Y.api('/yonetim/menuler', { method: 'POST', govde });
      }
      formuSifirla();
      await raporYukle();
      Y.bildir(`${sonuc.mesaj} (Menü #${sonuc.menu_id})`, 'basari');
    } catch (hata) {
      Y.bildir(hata.message);
    } finally {
      dugme.disabled = false;
    }
  }

  async function raporYukle() {
    Y.bekle(rapor);
    const p = new URLSearchParams({ baslangic: filtre.baslangic.value, bitis: filtre.bitis.value });
    if (filtre.yemekhane_id.value) p.set('yemekhane_id', filtre.yemekhane_id.value);
    try {
      const { menuler } = await Y.api(`/yonetim/menuler?${p}`);
      raporCiz(menuler);
    } catch (hata) {
      rapor.replaceChildren();
      Y.bildir(hata.message);
    }
  }

  function dolulukHucresi(m) {
    const yuzde = Number(m.doluluk_yuzde);
    const sinif = yuzde >= 100 ? 'dolu' : yuzde >= 80 ? 'yuksek' : null;
    return el('div', { class: 'doluluk' },
      el('div', { class: 'cubuk', role: 'img', 'aria-label': `%${yuzde} dolu` },
        el('span', { class: sinif, style: `width:${Math.min(yuzde, 100)}%` })),
      el('span', { class: 'sayi' }, `${m.rezerve}/${m.kapasite}`));
  }

  function puanHucresi(m) {
    if (m.ortalama_puan === null) return el('span', { class: 'soluk' }, '—');
    return [
      el('span', { class: 'puan-goster' }, '★'),
      ` ${Number(m.ortalama_puan).toFixed(2)} `,
      el('span', { class: 'soluk' }, `(${m.oy_sayisi})`),
    ];
  }

  function raporCiz(menuler) {
    if (menuler.length === 0) {
      rapor.replaceChildren(el('p', { class: 'bos-durum' }, 'Bu aralıkta menü yok.'));
      return;
    }
    rapor.replaceChildren(el('table', { class: 'tablo' },
      el('thead', {}, el('tr', {},
        el('th', {}, 'Tarih'),
        el('th', {}, 'Yemekhane / Öğün'),
        el('th', { class: 'sayi' }, 'Fiyat Ö/P'),
        el('th', {}, 'Doluluk'),
        el('th', {}, 'Puan'),
        el('th', {}, ''))),
      el('tbody', {}, menuler.map((m) =>
        el('tr', { 'data-menu': m.menu_id, class: m.menu_id === duzenlenenId ? 'secili' : null },
          el('td', { class: 'tek-satir' }, Y.tarihYaz(m.tarih)),
          el('td', {}, m.yemekhane, el('br'), el('span', { class: 'soluk' }, m.ogun)),
          el('td', { class: 'sayi tek-satir' }, Y.tl(m.ogrenci_fiyati), el('br'), el('span', { class: 'soluk' }, Y.tl(m.personel_fiyati))),
          el('td', {}, dolulukHucresi(m)),
          el('td', { class: 'tek-satir' }, puanHucresi(m)),
          el('td', {}, el('button', { class: 'dugme dugme-cizgili dugme-kucuk', type: 'button', onclick: () => duzenle(m.menu_id) }, 'Düzenle')))))));
  }
})();

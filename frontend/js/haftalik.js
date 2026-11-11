'use strict';

(async () => {
  const { el } = Y;
  if (!(await Y.sayfaBaslat())) return;

  const form = document.getElementById('filtre');
  const hedef = document.getElementById('hafta');
  const aralik = document.getElementById('aralik');
  const adres = new URLSearchParams(location.search);

  let bugun;
  let baslangic;

  try {
    const t = await Y.api('/tanimlar');
    Y.secenekDoldur(form.yemekhane, t.yemekhaneler);
    bugun = t.bugun;
    baslangic = /^\d{4}-\d{2}-\d{2}$/.test(adres.get('baslangic') || '') ? adres.get('baslangic') : bugun;
    if (adres.get('yemekhane_id')) form.yemekhane.value = adres.get('yemekhane_id');
  } catch (hata) {
    Y.bildir(hata.message);
    return;
  }

  form.addEventListener('submit', (olay) => olay.preventDefault());
  form.addEventListener('change', yukle);
  document.getElementById('onceki').addEventListener('click', () => {
    baslangic = Y.gunEkle(baslangic, -7);
    yukle();
  });
  document.getElementById('sonraki').addEventListener('click', () => {
    baslangic = Y.gunEkle(baslangic, 7);
    yukle();
  });
  yukle();

  async function yukle() {
    Y.bildirimTemizle();
    Y.bekle(hedef);
    const p = new URLSearchParams({ yemekhane_id: form.yemekhane.value, baslangic });
    try {
      const veri = await Y.api(`/menuler/haftalik?${p}`);
      aralik.textContent = `${Y.tarihYaz(veri.baslangic)} – ${Y.tarihYaz(veri.bitis)}`;
      ciz(veri);
    } catch (hata) {
      hedef.replaceChildren();
      Y.bildir(hata.message);
    }
  }

  function ciz(veri) {
    if (veri.menuler.length === 0) {
      hedef.replaceChildren(el('div', { class: 'kart bos-durum' }, 'Bu tarih aralığında menü yok.'));
      return;
    }
    const gunler = new Map();
    for (const m of veri.menuler) {
      if (!gunler.has(m.tarih)) gunler.set(m.tarih, []);
      gunler.get(m.tarih).push(m);
    }
    hedef.replaceChildren(...[...gunler].map(([tarih, menuler]) =>
      el('section', { class: `gun${tarih === bugun ? ' bugun' : ''}` },
        el('h2', {}, Y.tarihYaz(tarih, true)),
        el('div', { class: 'gun-ogunler' }, menuler.map(ogunKarti)))));
  }

  function ogunKarti(m) {
    const dugme = el('button', { class: 'dugme', type: 'button', disabled: !m.rezerve_edilebilir },
      m.rezerve_edilebilir ? 'Rezerve et' : m.neden);
    dugme.addEventListener('click', () => rezerveEt(m, dugme));

    return el('article', { class: 'kart ogun-kart' },
      el('div', { class: 'kart-baslik' },
        el('h3', {}, m.ogun),
        el('span', { class: 'fiyat' }, Y.tl(m.fiyat))),
      el('p', { class: 'yemek-ozet' }, m.yemekler),
      el('div', { class: 'meta' },
        el('span', {}, 'Boş yer ', el('b', {}, `${m.bos_yer}/${m.kapasite}`)),
        el('span', {}, el('b', {}, m.toplam_kalori), ' kcal'),
        el('span', {}, 'Son ', el('b', {}, Y.saatYaz(m.rezervasyon_son)))),
      el('div', { class: 'ogun-alt' },
        m.rezervasyon_durum ? Y.durumRozeti(m.rezervasyon_durum) : el('span'),
        dugme));
  }

  async function rezerveEt(m, dugme) {
    dugme.disabled = true;
    dugme.textContent = 'İşleniyor…';
    try {
      const sonuc = await Y.api('/rezervasyonlar', { method: 'POST', govde: { menu_id: m.menu_id } });
      Y.bakiyeGoster(sonuc.bakiye);
      await yukle();
      Y.bildir(`${sonuc.mesaj} ${Y.tarihYaz(m.tarih)} ${m.ogun} · Ücret: ${Y.tl(sonuc.ucret)} · Kalan bakiye: ${Y.tl(sonuc.bakiye)}`, 'basari');
    } catch (hata) {
      Y.bildir(hata.message);
      dugme.disabled = false;
      dugme.textContent = 'Rezerve et';
    }
  }
})();

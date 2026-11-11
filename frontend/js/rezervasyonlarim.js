'use strict';

(async () => {
  const { el } = Y;
  if (!(await Y.sayfaBaslat())) return;

  const hedef = document.getElementById('liste');
  const cipler = document.querySelectorAll('.cipler button');
  let rezervasyonlar = [];
  let suzgec = '';

  cipler.forEach((c) => c.addEventListener('click', () => {
    suzgec = c.dataset.durum;
    cipler.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    ciz();
  }));

  yukle();

  async function yukle() {
    Y.bekle(hedef);
    try {
      rezervasyonlar = (await Y.api('/rezervasyonlar')).rezervasyonlar;
      ciz();
    } catch (hata) {
      hedef.replaceChildren();
      Y.bildir(hata.message);
    }
  }

  function ciz() {
    const liste = rezervasyonlar.filter((r) => !suzgec || r.durum === suzgec);
    if (liste.length === 0) {
      hedef.replaceChildren(el('div', { class: 'kart bos-durum' },
        'Bu durumda rezervasyonunuz yok. ', el('a', { href: '/haftalik.html' }, 'Haftalık menüye git')));
      return;
    }
    hedef.replaceChildren(el('div', { class: 'iki-sutun' }, liste.map(kart)));
  }

  function altBilgi(r) {
    if (r.iptal_edilebilir) {
      const dugme = el('button', { class: 'dugme dugme-tehlike dugme-kucuk', type: 'button' }, 'İptal et');
      dugme.addEventListener('click', () => iptalEt(r, dugme));
      return el('div', { class: 'ogun-alt' },
        el('span', { class: 'soluk kucuk' }, `İptal için son: ${Y.tarihSaatYaz(r.rezervasyon_son)}`), dugme);
    }
    if (r.durum === 'aktif') {
      return el('p', { class: 'soluk kucuk sikisik' }, 'İptal süresi doldu.');
    }
    if (r.durum === 'kullanildi') {
      return el('p', { class: 'soluk kucuk sikisik' }, `Kullanıldı: ${Y.tarihSaatYaz(r.kullanma_zamani)}`);
    }
    return el('p', { class: 'soluk kucuk sikisik' }, `İptal: ${Y.tarihSaatYaz(r.iptal_zamani)} · ücret iade edildi`);
  }

  function kart(r) {
    return el('article', { class: 'kart' },
      el('div', { class: 'kart-baslik' },
        el('div', {},
          el('h3', {}, `${Y.tarihYaz(r.tarih)} · ${r.ogun}`),
          el('p', { class: 'soluk kucuk sikisik' }, r.yemekhane)),
        Y.durumRozeti(r.durum)),
      el('div', { class: 'meta meta-aralikli' },
        el('span', {}, 'Ücret ', el('b', {}, Y.tl(r.ucret))),
        el('span', {}, `No #${r.id}`)),
      altBilgi(r));
  }

  async function iptalEt(r, dugme) {
    if (!confirm(`${Y.tarihYaz(r.tarih)} ${r.ogun} rezervasyonu iptal edilsin mi? ${Y.tl(r.ucret)} bakiyenize iade edilecek.`)) return;
    dugme.disabled = true;
    try {
      const sonuc = await Y.api(`/rezervasyonlar/${r.id}/iptal`, { method: 'POST' });
      Y.bakiyeGoster(sonuc.bakiye);
      await yukle();
      Y.bildir(`${sonuc.mesaj} İade: ${Y.tl(sonuc.iade)} · Güncel bakiye: ${Y.tl(sonuc.bakiye)}`, 'basari');
    } catch (hata) {
      Y.bildir(hata.message);
      dugme.disabled = false;
    }
  }
})();

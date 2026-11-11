'use strict';

const Y = (() => {
  const SAYFALAR = [
    { yol: '/menu.html', ad: 'Günün Menüsü' },
    { yol: '/haftalik.html', ad: 'Haftalık Menü' },
    { yol: '/rezervasyonlarim.html', ad: 'Rezervasyonlarım' },
    { yol: '/bakiye.html', ad: 'Bakiye' },
    { yol: '/degerlendirme.html', ad: 'Değerlendirme' },
    { yol: '/yonetim.html', ad: 'Yönetim', rol: 'yonetici' },
  ];

  let kullanici = null;

  async function api(yol, { method = 'GET', govde } = {}) {
    const ayar = { method, headers: { Accept: 'application/json' }, credentials: 'same-origin' };
    if (govde !== undefined) {
      ayar.headers['Content-Type'] = 'application/json';
      ayar.body = JSON.stringify(govde);
    }

    let yanit;
    try {
      yanit = await fetch('/api' + yol, ayar);
    } catch {
      throw new Error('Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.');
    }

    let veri = null;
    try { veri = await yanit.json(); } catch { veri = null; }

    if (yanit.status === 401 && yol !== '/oturum/giris') {
      location.href = '/index.html?oturum=bitti';
    }
    if (!yanit.ok) {
      const hata = new Error(veri?.hata || `İstek başarısız oldu (HTTP ${yanit.status}).`);
      hata.durum = yanit.status;
      throw hata;
    }
    return veri;
  }

  function el(etiket, ozellik = {}, ...cocuklar) {
    const e = document.createElement(etiket);
    for (const [ad, deger] of Object.entries(ozellik)) {
      if (deger === null || deger === undefined || deger === false) continue;
      if (ad === 'class') e.className = deger;
      else if (ad.startsWith('on')) e.addEventListener(ad.slice(2), deger);
      else if (ad in e && typeof deger !== 'string') e[ad] = deger;
      else e.setAttribute(ad, deger === true ? '' : deger);
    }
    for (const c of cocuklar.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      e.append(c instanceof Node ? c : String(c));
    }
    return e;
  }

  function bildir(mesaj, tur = 'hata') {
    const kutu = document.getElementById('bildirim');
    if (!kutu) return;
    kutu.textContent = mesaj;
    kutu.className = `bildirim bildirim-${tur}`;
    kutu.setAttribute('role', tur === 'hata' ? 'alert' : 'status');
    kutu.hidden = false;
    kutu.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function bildirimTemizle() {
    const kutu = document.getElementById('bildirim');
    if (kutu) kutu.hidden = true;
  }

  const paraBicimi = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
  const tl = (sayi) => paraBicimi.format(Number(sayi) || 0);

  function tarihYaz(metin, uzun = false) {
    const [y, a, g] = metin.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, a - 1, g)).toLocaleDateString('tr-TR', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      weekday: uzun ? 'long' : 'short',
      year: uzun ? 'numeric' : undefined,
    });
  }

  const saatYaz = (metin) => metin.slice(11, 16);
  const tarihSaatYaz = (metin) => `${tarihYaz(metin)} ${saatYaz(metin)}`;

  function gunEkle(t, gun) {
    const d = new Date(`${t}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + gun);
    return d.toISOString().slice(0, 10);
  }

  function secenekDoldur(select, liste, { bos } = {}) {
    const secenekler = liste.map((x) => el('option', { value: x.id }, x.ad));
    if (bos) secenekler.unshift(el('option', { value: '' }, bos));
    select.replaceChildren(...secenekler);
  }

  function durumRozeti(durum) {
    const adlar = { aktif: 'Aktif', kullanildi: 'Kullanıldı', iptal: 'İptal' };
    return el('span', { class: `rozet rozet-${durum}` }, adlar[durum] || durum);
  }

  function bekle(hedef, metin = 'Yükleniyor…') {
    hedef.replaceChildren(el('p', { class: 'soluk yukleniyor' }, metin));
  }

  async function sayfaBaslat({ rol } = {}) {
    try {
      kullanici = (await api('/oturum/ben')).kullanici;
    } catch {
      return null;
    }
    if (rol && kullanici.rol !== rol) {
      location.replace('/menu.html');
      return null;
    }
    ustMenuCiz();
    return kullanici;
  }

  function ustMenuCiz() {
    const ust = document.getElementById('ust');
    const rolAdi = { ogrenci: 'Öğrenci', personel: 'Personel', yonetici: 'Yönetici' }[kullanici.rol];
    ust.replaceChildren(
      el('div', { class: 'ust-satir kapsayici' },
        el('a', { class: 'marka', href: '/menu.html' }, el('span', { class: 'marka-isaret', 'aria-hidden': 'true' }), 'Yemekhane'),
        el('div', { class: 'ust-kullanici' },
          el('span', { class: 'ust-ad' }, `${kullanici.ad} ${kullanici.soyad}`, el('small', {}, rolAdi)),
          el('a', { class: 'bakiye-cip', href: '/bakiye.html', id: 'ust-bakiye', title: 'Güncel bakiye' }, tl(kullanici.bakiye)),
          el('button', { class: 'dugme dugme-ikincil dugme-kucuk', type: 'button', onclick: cikis }, 'Çıkış'))),
      el('nav', { class: 'sekmeler', 'aria-label': 'Ana menü' },
        el('ul', { class: 'kapsayici' },
          SAYFALAR.filter((s) => !s.rol || s.rol === kullanici.rol).map((s) =>
            el('li', {}, el('a', { href: s.yol, 'aria-current': s.yol === location.pathname ? 'page' : null }, s.ad))))),
    );
    document.querySelector('.sekmeler [aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function bakiyeGoster(bakiye) {
    if (kullanici) kullanici.bakiye = bakiye;
    const cip = document.getElementById('ust-bakiye');
    if (!cip) return;
    cip.textContent = tl(bakiye);
    cip.classList.remove('parla');
    void cip.offsetWidth;
    cip.classList.add('parla');
  }

  async function cikis() {
    try { await api('/oturum/cikis', { method: 'POST' }); } catch { }
    location.href = '/index.html';
  }

  return {
    api, el, bildir, bildirimTemizle, tl, tarihYaz, saatYaz, tarihSaatYaz, gunEkle,
    secenekDoldur, durumRozeti, bekle, sayfaBaslat, bakiyeGoster,
    get kullanici() { return kullanici; },
  };
})();

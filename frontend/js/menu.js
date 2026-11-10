'use strict';

(async () => {
  const kullanici = await Y.sayfaBaslat();
  if (!kullanici) return;

  document.getElementById('menu').replaceChildren(
    Y.el('div', { class: 'kart bos-durum' },
      Y.el('p', {}, `Hoş geldin, ${kullanici.ad}.`),
      Y.el('p', { class: 'soluk' }, 'Menü ekranı yakında burada olacak.')),
  );
})();

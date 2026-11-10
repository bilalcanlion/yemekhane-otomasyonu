'use strict';

(() => {
  const form = document.getElementById('giris-formu');
  const dugme = form.querySelector('button');

  if (new URLSearchParams(location.search).get('oturum') === 'bitti') {
    Y.bildir('Oturumunuzun süresi doldu ya da çıkış yaptınız. Lütfen tekrar giriş yapın.', 'bilgi');
  }

  fetch('/api/oturum/ben', { credentials: 'same-origin' })
    .then((y) => { if (y.ok) location.replace('/menu.html'); })
    .catch(() => {});

  form.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    Y.bildirimTemizle();
    const eposta = form.eposta.value.trim();
    const sifre = form.sifre.value;
    if (!eposta || !sifre) {
      Y.bildir('E-posta ve şifre gereklidir.');
      return;
    }

    dugme.disabled = true;
    dugme.textContent = 'Giriş yapılıyor…';
    try {
      await Y.api('/oturum/giris', { method: 'POST', govde: { eposta, sifre } });
      location.replace('/menu.html');
    } catch (hata) {
      Y.bildir(hata.message);
      form.sifre.value = '';
      form.sifre.focus();
    } finally {
      dugme.disabled = false;
      dugme.textContent = 'Giriş yap';
    }
  });
})();

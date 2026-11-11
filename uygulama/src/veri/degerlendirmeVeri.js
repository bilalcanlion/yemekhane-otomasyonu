const { okuTek, yaz } = require('./baglanti');

async function menuKullanildiMi(kullaniciId, menuId) {
  const satir = await okuTek(
    `SELECT 1 AS var FROM rezervasyonlar
      WHERE kullanici_id = ? AND menu_id = ? AND durum = 'kullanildi'`,
    [kullaniciId, menuId],
    'yazma',
  );
  return Boolean(satir);
}

function ekle(kullaniciId, menuId, puan, yorum) {
  return yaz(
    'INSERT INTO degerlendirmeler (kullanici_id, menu_id, puan, yorum) VALUES (?, ?, ?, ?)',
    [kullaniciId, menuId, puan, yorum],
  );
}

module.exports = { menuKullanildiMi, ekle };

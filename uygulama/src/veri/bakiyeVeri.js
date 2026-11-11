const { oku, yordam } = require('./baglanti');

function bakiyeYukle(kullaniciId, tutar) {
  return yordam('sp_bakiye_yukle', [kullaniciId, tutar]);
}

function hareketler(kullaniciId, kaynak, limit = 50) {
  return oku(
    `SELECT id, tur, tutar, aciklama, rezervasyon_id, olusturma
       FROM bakiye_hareketleri
      WHERE kullanici_id = ?
      ORDER BY olusturma DESC, id DESC
      LIMIT ?`,
    [kullaniciId, limit],
    kaynak,
  );
}

module.exports = { bakiyeYukle, hareketler };

const { okuTek } = require('./baglanti');

function epostaIleBul(eposta) {
  return okuTek(
    `SELECT id, ad, soyad, eposta, sifre_hash, rol, aktif, bakiye
       FROM kullanicilar WHERE eposta = ?`,
    [eposta],
  );
}

function idIleBul(id, kaynak) {
  return okuTek(
    `SELECT id, ad, soyad, eposta, rol, ogrenci_no, bakiye
       FROM kullanicilar WHERE id = ?`,
    [id],
    kaynak,
  );
}

module.exports = { epostaIleBul, idIleBul };

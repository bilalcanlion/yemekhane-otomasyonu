const bakiyeVeri = require('../veri/bakiyeVeri');
const kullaniciVeri = require('../veri/kullaniciVeri');
const { yazmaYapildi } = require('../ara-katman/oturum');
const { IstekHatasi } = require('../ara-katman/hata');

async function getir(req, res) {
  const [kullanici, hareketler] = await Promise.all([
    kullaniciVeri.idIleBul(req.oturum.id, req.okumaKaynagi),
    bakiyeVeri.hareketler(req.oturum.id, req.okumaKaynagi),
  ]);
  res.json({ bakiye: kullanici.bakiye, hareketler, kaynak: req.okumaKaynagi });
}

async function yukle(req, res) {
  const tutar = Number(req.body?.tutar);
  if (!Number.isFinite(tutar)) throw new IstekHatasi('Geçerli bir tutar girin.');

  const sonuc = await bakiyeVeri.bakiyeYukle(req.oturum.id, tutar);
  await yazmaYapildi(req);
  res.status(201).json({ mesaj: 'Bakiye yüklendi.', hareket_id: sonuc.hareket_id, bakiye: sonuc.bakiye });
}

module.exports = { getir, yukle };

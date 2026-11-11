const rezervasyonVeri = require('../veri/rezervasyonVeri');
const { yazmaYapildi } = require('../ara-katman/oturum');
const { pozitifTamSayi } = require('../ara-katman/dogrulama');

async function yap(req, res) {
  const menuId = pozitifTamSayi(req.body?.menu_id, 'Menü');

  const sonuc = await rezervasyonVeri.rezervasyonYap(req.oturum.id, menuId);
  await yazmaYapildi(req);

  res.status(201).json({
    mesaj: 'Rezervasyonunuz alındı.',
    rezervasyon_id: sonuc.rezervasyon_id,
    ucret: sonuc.ucret,
    bakiye: sonuc.bakiye,
  });
}

async function iptal(req, res) {
  const rezervasyonId = pozitifTamSayi(req.params.id, 'Rezervasyon');

  const sonuc = await rezervasyonVeri.rezervasyonIptal(req.oturum.id, rezervasyonId);
  await yazmaYapildi(req);

  res.json({
    mesaj: 'Rezervasyon iptal edildi, ücret iade edildi.',
    rezervasyon_id: sonuc.rezervasyon_id,
    iade: sonuc.iade,
    bakiye: sonuc.bakiye,
  });
}

async function listele(req, res) {
  const satirlar = await rezervasyonVeri.kullaniciRezervasyonlari(req.oturum.id, req.okumaKaynagi);
  res.json({
    rezervasyonlar: satirlar.map((s) => ({ ...s, iptal_edilebilir: Boolean(s.iptal_edilebilir) })),
  });
}

module.exports = { yap, iptal, listele };

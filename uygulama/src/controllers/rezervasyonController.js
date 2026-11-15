const rezervasyonVeri = require('../veri/rezervasyonVeri');
const { yazmaYapildi } = require('../ara-katman/oturum');
const { IstekHatasi } = require('../ara-katman/hata');
const { pozitifTamSayi } = require('../ara-katman/dogrulama');

const PORSIYONLAR = ['tam', 'yarim'];

async function yap(req, res) {
  const menuId = pozitifTamSayi(req.body?.menu_id, 'Menü');
  const porsiyon = req.body?.porsiyon ?? 'tam';
  if (!PORSIYONLAR.includes(porsiyon)) throw new IstekHatasi('Geçersiz porsiyon seçimi.');

  const sonuc = await rezervasyonVeri.rezervasyonYap(req.oturum.id, menuId, porsiyon);
  await yazmaYapildi(req);

  res.status(201).json({
    mesaj: 'Rezervasyonunuz alındı.',
    rezervasyon_id: sonuc.rezervasyon_id,
    porsiyon: sonuc.porsiyon,
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

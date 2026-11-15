const kullaniciVeri = require('../veri/kullaniciVeri');
const profilVeri = require('../veri/profilVeri');
const { yazmaYapildi } = require('../ara-katman/oturum');
const { IstekHatasi } = require('../ara-katman/hata');
const { tamSayiListesi } = require('../ara-katman/dogrulama');

const YABANCI_ANAHTAR = 1452;
const ARALIK_DISI = 1264;

async function getir(req, res) {
  const [kullanici, alerjenler, secili] = await Promise.all([
    kullaniciVeri.idIleBul(req.oturum.id, req.okumaKaynagi),
    profilVeri.alerjenler(),
    profilVeri.kullaniciAlerjenleri(req.oturum.id, req.okumaKaynagi),
  ]);
  res.json({ kullanici, alerjenler, secili_alerjenler: secili.map((a) => a.id) });
}

async function alerjenleriKaydet(req, res) {
  const alerjenIdler = tamSayiListesi(req.body?.alerjen_idler, 'alerjen', { bosOlabilir: true });

  try {
    await profilVeri.alerjenleriKaydet(req.oturum.id, alerjenIdler);
  } catch (hata) {
    if (hata.errno === YABANCI_ANAHTAR || hata.errno === ARALIK_DISI) throw new IstekHatasi('Geçersiz alerjen seçimi.');
    throw hata;
  }
  await yazmaYapildi(req);

  res.json({
    mesaj: alerjenIdler.length ? 'Alerjenleriniz kaydedildi.' : 'Alerjen listeniz temizlendi.',
    secili_alerjenler: alerjenIdler,
  });
}

module.exports = { getir, alerjenleriKaydet };

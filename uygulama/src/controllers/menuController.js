const menuVeri = require('../veri/menuVeri');
const menuServisi = require('../servisler/menuServisi');
const { IstekHatasi } = require('../ara-katman/hata');
const { pozitifTamSayi, tarih, gunEkle } = require('../ara-katman/dogrulama');

async function tanimlar(req, res) {
  const [yemekhaneler, ogunler, zaman] = await Promise.all([
    menuVeri.yemekhaneler(),
    menuVeri.ogunler(),
    menuVeri.bugun(),
  ]);
  res.json({ yemekhaneler, ogunler, bugun: zaman.bugun, simdi: zaman.simdi });
}

async function gunluk(req, res) {
  const yemekhaneId = pozitifTamSayi(req.query.yemekhane_id, 'Yemekhane');
  const ogunId = pozitifTamSayi(req.query.ogun_id, 'Öğün');
  const gun = tarih(req.query.tarih, 'Tarih');

  const menu = await menuServisi.menuGetir(yemekhaneId, gun, ogunId);
  if (!menu) throw new IstekHatasi('Bu yemekhane, tarih ve öğün için menü yok.', 404);

  const durum = await menuVeri.doluluk(menu.menu_id, req.oturum.id);
  res.json({
    ...menu,
    fiyat: menuServisi.rolFiyati(menu, req.oturum.rol),
    bos_yer: durum.bos_yer,
    kapasite: durum.kapasite,
    suresi_doldu: Boolean(durum.suresi_doldu),
    rezervasyon_durum: durum.rezervasyon_durum,
    ...menuServisi.rezervasyonDurumu(durum),
  });
}

async function haftalik(req, res) {
  const yemekhaneId = pozitifTamSayi(req.query.yemekhane_id, 'Yemekhane');
  const baslangic = tarih(req.query.baslangic, 'Başlangıç tarihi');
  const bitis = gunEkle(baslangic, 6);

  const satirlar = await menuVeri.haftalik(yemekhaneId, baslangic, bitis, req.oturum.id);
  const menuler = satirlar.map((s) => ({
    menu_id: s.menu_id,
    tarih: s.tarih,
    ogun_id: s.ogun_id,
    ogun: s.ogun,
    yemekler: s.yemekler,
    toplam_kalori: Number(s.toplam_kalori) || 0,
    kapasite: s.kapasite,
    bos_yer: s.bos_yer,
    rezervasyon_son: s.rezervasyon_son,
    suresi_doldu: Boolean(s.suresi_doldu),
    fiyat: menuServisi.rolFiyati(s, req.oturum.rol),
    rezervasyon_durum: s.rezervasyon_durum,
    ...menuServisi.rezervasyonDurumu(s),
  }));
  res.json({ baslangic, bitis, menuler });
}

module.exports = { tanimlar, gunluk, haftalik };

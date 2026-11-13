const yonetimVeri = require('../veri/yonetimVeri');
const menuServisi = require('../servisler/menuServisi');
const { yazmaYapildi } = require('../ara-katman/oturum');
const { IstekHatasi } = require('../ara-katman/hata');
const d = require('../ara-katman/dogrulama');

const TEKRAR_KAYIT = 1062;
const YABANCI_ANAHTAR = 1452;
const ARALIK_DISI = 1264;

async function menuRaporu(req, res) {
  const baslangic = d.tarih(req.query.baslangic, 'Başlangıç tarihi');
  const bitis = d.tarih(req.query.bitis, 'Bitiş tarihi');
  if (bitis < baslangic) throw new IstekHatasi('Bitiş tarihi başlangıçtan önce olamaz.');
  const yemekhaneId = req.query.yemekhane_id ? d.pozitifTamSayi(req.query.yemekhane_id, 'Yemekhane') : null;

  const menuler = await yonetimVeri.menuRaporu(baslangic, bitis, yemekhaneId, req.okumaKaynagi);
  res.json({ menuler });
}

async function yemekler(req, res) {
  res.json({ yemekler: await yonetimVeri.yemekler() });
}

async function menuGetir(req, res) {
  const menu = await yonetimVeri.menuGetir(d.pozitifTamSayi(req.params.id, 'Menü'), req.okumaKaynagi);
  if (!menu) throw new IstekHatasi('Menü bulunamadı.', 404);
  res.json({ menu });
}

function menuGovdesi(govde = {}) {
  return {
    ogrenci_fiyati: d.fiyat(govde.ogrenci_fiyati, 'Öğrenci fiyatı'),
    personel_fiyati: d.fiyat(govde.personel_fiyati, 'Personel fiyatı'),
    yemek_idler: d.tamSayiListesi(govde.yemek_idler, 'yemek'),
  };
}

function veritabaniHatasiniCevir(hata) {
  if (hata.errno === TEKRAR_KAYIT) return new IstekHatasi('Bu yemekhane, tarih ve öğün için zaten bir menü var.', 409);
  if (hata.errno === YABANCI_ANAHTAR || hata.errno === ARALIK_DISI) return new IstekHatasi('Geçersiz yemekhane, öğün ya da yemek seçimi.');
  return hata;
}

async function menuOlustur(req, res) {
  const govde = req.body ?? {};
  const menu = {
    yemekhane_id: d.pozitifTamSayi(govde.yemekhane_id, 'Yemekhane'),
    tarih: d.tarih(govde.tarih, 'Tarih'),
    ogun_id: d.pozitifTamSayi(govde.ogun_id, 'Öğün'),
    ...menuGovdesi(govde),
  };

  let menuId;
  try {
    menuId = await yonetimVeri.menuOlustur(menu);
  } catch (hata) {
    throw veritabaniHatasiniCevir(hata);
  }
  await yazmaYapildi(req);
  res.status(201).json({ mesaj: 'Menü oluşturuldu.', menu_id: menuId });
}

async function menuGuncelle(req, res) {
  const menuId = d.pozitifTamSayi(req.params.id, 'Menü');
  const degisiklik = menuGovdesi(req.body);

  const mevcut = await yonetimVeri.menuGetir(menuId, 'yazma');
  if (!mevcut) throw new IstekHatasi('Menü bulunamadı.', 404);

  try {
    await yonetimVeri.menuGuncelle(menuId, degisiklik);
  } catch (hata) {
    throw veritabaniHatasiniCevir(hata);
  }
  await menuServisi.onbellegiYenile(mevcut.yemekhane_id, mevcut.tarih, mevcut.ogun_id);
  await yazmaYapildi(req);
  res.json({ mesaj: 'Menü güncellendi.', menu_id: menuId });
}

module.exports = { menuRaporu, yemekler, menuGetir, menuOlustur, menuGuncelle };

const bcrypt = require('bcryptjs');
const kullaniciVeri = require('../veri/kullaniciVeri');
const oturumServisi = require('../servisler/oturumServisi');
const { CEREZ } = require('../ara-katman/oturum');
const { IstekHatasi } = require('../ara-katman/hata');

const SAHTE_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.uY7pV6QWm2Cq1xH0JY5o8l1JxQ5e';

const cerezAyari = { httpOnly: true, sameSite: 'strict', path: '/' };

async function giris(req, res) {
  const { eposta, sifre } = req.body ?? {};
  if (typeof eposta !== 'string' || typeof sifre !== 'string' || !eposta.trim() || !sifre) {
    throw new IstekHatasi('E-posta ve şifre gereklidir.');
  }

  const kullanici = await kullaniciVeri.epostaIleBul(eposta.trim().toLowerCase());
  const sifreDogru = await bcrypt.compare(sifre, kullanici ? kullanici.sifre_hash : SAHTE_HASH);
  if (!kullanici || !sifreDogru) throw new IstekHatasi('E-posta veya şifre hatalı.', 401);
  if (!kullanici.aktif) throw new IstekHatasi('Hesabınız pasif durumda.', 403);

  const oturum = {
    id: kullanici.id,
    ad: kullanici.ad,
    soyad: kullanici.soyad,
    eposta: kullanici.eposta,
    rol: kullanici.rol,
  };
  const token = await oturumServisi.olustur(oturum);
  res.cookie(CEREZ, token, cerezAyari);
  console.log(`[oturum] giriş: ${kullanici.eposta} (${kullanici.rol})`);
  res.json({ kullanici: { ...oturum, bakiye: kullanici.bakiye } });
}

async function cikis(req, res) {
  await oturumServisi.sil(req.cookies?.[CEREZ]);
  res.clearCookie(CEREZ, cerezAyari);
  res.json({ mesaj: 'Çıkış yapıldı.' });
}

async function ben(req, res) {
  const kullanici = await kullaniciVeri.idIleBul(req.oturum.id, req.okumaKaynagi);
  if (!kullanici) throw new IstekHatasi('Kullanıcı bulunamadı.', 404);
  res.json({ kullanici });
}

module.exports = { giris, cikis, ben };

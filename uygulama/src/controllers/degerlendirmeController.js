const rezervasyonVeri = require('../veri/rezervasyonVeri');
const degerlendirmeVeri = require('../veri/degerlendirmeVeri');
const { yazmaYapildi } = require('../ara-katman/oturum');
const { IstekHatasi } = require('../ara-katman/hata');
const { pozitifTamSayi } = require('../ara-katman/dogrulama');

const TEKRAR_KAYIT = 1062;

async function listele(req, res) {
  const satirlar = await rezervasyonVeri.kullaniciRezervasyonlari(req.oturum.id, req.okumaKaynagi, 'kullanildi');
  res.json({
    menuler: satirlar.map((s) => ({
      menu_id: s.menu_id,
      tarih: s.tarih,
      yemekhane: s.yemekhane,
      ogun: s.ogun,
      kullanma_zamani: s.kullanma_zamani,
      puan: s.puan,
      yorum: s.yorum,
      degerlendirildi: s.puan !== null,
    })),
  });
}

async function ekle(req, res) {
  const menuId = pozitifTamSayi(req.body?.menu_id, 'Menü');
  const puan = Number(req.body?.puan);
  if (!Number.isInteger(puan) || puan < 1 || puan > 5) throw new IstekHatasi('Puan 1 ile 5 arasında olmalıdır.');

  let yorum = typeof req.body?.yorum === 'string' ? req.body.yorum.trim() : '';
  if (yorum.length > 500) throw new IstekHatasi('Yorum en fazla 500 karakter olabilir.');
  if (!yorum) yorum = null;

  if (!(await degerlendirmeVeri.menuKullanildiMi(req.oturum.id, menuId))) {
    throw new IstekHatasi('Yalnızca kullandığınız menüleri değerlendirebilirsiniz.', 403);
  }

  try {
    await degerlendirmeVeri.ekle(req.oturum.id, menuId, puan, yorum);
  } catch (hata) {
    if (hata.errno === TEKRAR_KAYIT) throw new IstekHatasi('Bu menüyü zaten değerlendirdiniz.', 409);
    throw hata;
  }
  await yazmaYapildi(req);
  res.status(201).json({ mesaj: 'Değerlendirmeniz için teşekkürler.' });
}

module.exports = { listele, ekle };

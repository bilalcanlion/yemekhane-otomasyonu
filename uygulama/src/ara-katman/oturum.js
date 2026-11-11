const oturumServisi = require('../servisler/oturumServisi');
const config = require('../config');

const CEREZ = 'oturum';

async function oturumGerekli(req, res, next) {
  const token = req.cookies?.[CEREZ];
  const oturum = await oturumServisi.getirVeYenile(token);
  if (!oturum) {
    res.clearCookie(CEREZ);
    return res.status(401).json({ hata: 'Oturumunuz yok ya da süresi doldu. Lütfen giriş yapın.' });
  }
  req.oturum = oturum;
  req.oturumToken = token;

  const tazeMi = Date.now() - (oturum.sonYazma || 0) < config.tazeOkumaMs;
  req.okumaKaynagi = tazeMi ? 'yazma' : 'okuma';
  next();
}

function rolGerekli(...roller) {
  return (req, res, next) => {
    if (!roller.includes(req.oturum.rol)) {
      return res.status(403).json({ hata: 'Bu işlem için yetkiniz yok.' });
    }
    next();
  };
}

function yazmaYapildi(req) {
  return oturumServisi.yazmaKaydet(req.oturumToken, req.oturum);
}

module.exports = { CEREZ, oturumGerekli, rolGerekli, yazmaYapildi };

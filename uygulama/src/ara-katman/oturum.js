const oturumServisi = require('../servisler/oturumServisi');

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
  next();
}

module.exports = { CEREZ, oturumGerekli };

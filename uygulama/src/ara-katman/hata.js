class IstekHatasi extends Error {
  constructor(mesaj, durum = 400) {
    super(mesaj);
    this.durum = durum;
  }
}

const SP_SIGNAL = 1644;
const CHECK_IHLALI = 3819;
const READ_ONLY = 1290;

function bulunamadi(req, res) {
  res.status(404).json({ hata: 'İstenen adres bulunamadı.' });
}

function hataYakalayici(hata, req, res, next) {
  if (hata instanceof IstekHatasi) {
    return res.status(hata.durum).json({ hata: hata.message });
  }

  if (hata.errno === SP_SIGNAL) {
    console.log(`[iş kuralı] ${req.method} ${req.originalUrl}: ${hata.sqlMessage}`);
    return res.status(400).json({ hata: hata.sqlMessage });
  }

  if (hata.type === 'entity.parse.failed') {
    return res.status(400).json({ hata: 'İstek gövdesi geçerli bir JSON değil.' });
  }

  if (hata.errno === CHECK_IHLALI) console.error('[CHECK ihlali - programlama hatası]', hata.sqlMessage);
  else if (hata.errno === READ_ONLY) console.error('[read-only] replikaya yazma denendi!', hata.sqlMessage);
  else console.error(hata);

  res.status(500).json({ hata: 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.' });
}

module.exports = { IstekHatasi, bulunamadi, hataYakalayici };

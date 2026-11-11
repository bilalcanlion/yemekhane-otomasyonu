const { IstekHatasi } = require('./hata');

function pozitifTamSayi(deger, alan) {
  const sayi = Number(deger);
  if (!Number.isInteger(sayi) || sayi <= 0) throw new IstekHatasi(`${alan} geçersiz.`);
  return sayi;
}

function tarih(deger, alan) {
  if (typeof deger !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deger) || Number.isNaN(Date.parse(deger))) {
    throw new IstekHatasi(`${alan} YYYY-AA-GG biçiminde olmalıdır.`);
  }
  return deger;
}

function gunEkle(t, gun) {
  const d = new Date(`${t}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + gun);
  return d.toISOString().slice(0, 10);
}

module.exports = { pozitifTamSayi, tarih, gunEkle };

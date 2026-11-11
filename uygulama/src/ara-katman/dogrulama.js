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

function fiyat(deger, alan) {
  const sayi = Number(deger);
  if (deger === '' || deger === null || deger === undefined || !Number.isFinite(sayi) || sayi < 0 || sayi > 10000) {
    throw new IstekHatasi(`${alan} 0 veya daha büyük bir sayı olmalıdır.`);
  }
  return Math.round(sayi * 100) / 100;
}

function tamSayiListesi(deger, alan) {
  if (!Array.isArray(deger) || deger.length === 0) throw new IstekHatasi(`En az bir ${alan} seçin.`);
  return [...new Set(deger.map((d) => pozitifTamSayi(d, alan)))];
}

function gunEkle(t, gun) {
  const d = new Date(`${t}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + gun);
  return d.toISOString().slice(0, 10);
}

module.exports = { pozitifTamSayi, tarih, fiyat, tamSayiListesi, gunEkle };

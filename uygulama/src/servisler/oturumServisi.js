const crypto = require('crypto');
const config = require('../config');

const oturumlar = new Map();
const TOKEN_BICIMI = /^[a-f0-9]{64}$/;

const yeniBitis = () => Date.now() + config.oturumSuresiSn * 1000;

async function olustur(kullanici) {
  const token = crypto.randomBytes(32).toString('hex');
  oturumlar.set(token, { veri: { ...kullanici, sonYazma: 0 }, bitis: yeniBitis() });
  return token;
}

async function getirVeYenile(token) {
  if (!token || !TOKEN_BICIMI.test(token)) return null;
  const kayit = oturumlar.get(token);
  if (!kayit) return null;
  if (kayit.bitis < Date.now()) {
    oturumlar.delete(token);
    return null;
  }
  kayit.bitis = yeniBitis();
  return kayit.veri;
}

async function yazmaKaydet(token, oturum) {
  oturum.sonYazma = Date.now();
  const kayit = oturumlar.get(token);
  if (kayit) kayit.veri.sonYazma = oturum.sonYazma;
}

async function sil(token) {
  oturumlar.delete(token);
}

module.exports = { olustur, getirVeYenile, yazmaKaydet, sil };

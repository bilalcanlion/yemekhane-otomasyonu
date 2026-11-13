const crypto = require('crypto');
const { istemci } = require('../veri/redis');
const config = require('../config');

const anahtar = (token) => `oturum:${token}`;
const TOKEN_BICIMI = /^[a-f0-9]{64}$/;

async function olustur(kullanici) {
  const token = crypto.randomBytes(32).toString('hex');
  const veri = { ...kullanici, sonYazma: 0 };
  await istemci.set(anahtar(token), JSON.stringify(veri), { EX: config.oturumSuresiSn });
  return token;
}

async function getirVeYenile(token) {
  if (!token || !TOKEN_BICIMI.test(token)) return null;
  const json = await istemci.getEx(anahtar(token), { EX: config.oturumSuresiSn });
  return json ? JSON.parse(json) : null;
}

async function yazmaKaydet(token, oturum) {
  oturum.sonYazma = Date.now();
  await istemci.set(anahtar(token), JSON.stringify(oturum), { KEEPTTL: true, XX: true });
}

async function sil(token) {
  if (token && TOKEN_BICIMI.test(token)) await istemci.del(anahtar(token));
}

module.exports = { olustur, getirVeYenile, yazmaKaydet, sil };

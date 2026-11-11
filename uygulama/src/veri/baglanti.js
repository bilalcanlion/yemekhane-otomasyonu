const mysql = require('mysql2/promise');
const config = require('../config');

const ortak = {
  port: config.db.port,
  database: config.db.veritabani,
  user: config.db.kullanici,
  password: config.db.sifre,
  charset: 'utf8mb4',
  timezone: '+03:00',
  dateStrings: true,
  decimalNumbers: true,
  waitForConnections: true,
  connectionLimit: 10,
};

const havuzlar = {
  yazma: mysql.createPool({ host: config.db.yazmaHost, ...ortak }),
  okuma: mysql.createPool({ host: config.db.okumaHost, ...ortak }),
};

const BAGLANTI_HATALARI = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST']);

async function oku(sql, parametreler = [], kaynak = 'okuma') {
  try {
    const [satirlar] = await havuzlar[kaynak].query(sql, parametreler);
    return satirlar;
  } catch (hata) {
    if (kaynak === 'okuma' && BAGLANTI_HATALARI.has(hata.code)) {
      console.warn(`[db] replikaya ulaşılamadı (${hata.code}), okuma kaynaktan yapılıyor`);
      const [satirlar] = await havuzlar.yazma.query(sql, parametreler);
      return satirlar;
    }
    throw hata;
  }
}

async function okuTek(sql, parametreler = [], kaynak = 'okuma') {
  const satirlar = await oku(sql, parametreler, kaynak);
  return satirlar[0] || null;
}

async function yaz(sql, parametreler = []) {
  const [sonuc] = await havuzlar.yazma.query(sql, parametreler);
  return sonuc;
}

async function islem(is) {
  const baglanti = await havuzlar.yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    const sonuc = await is(baglanti);
    await baglanti.commit();
    return sonuc;
  } catch (hata) {
    await baglanti.rollback();
    throw hata;
  } finally {
    baglanti.release();
  }
}

async function yordam(ad, parametreler = []) {
  const yer = parametreler.map(() => '?').join(', ');
  const [sonuclar] = await havuzlar.yazma.query(`CALL ${ad}(${yer})`, parametreler);
  return sonuclar[0][0];
}

async function saglik() {
  const sonuc = {};
  for (const ad of ['yazma', 'okuma']) {
    try {
      await havuzlar[ad].query('SELECT 1');
      sonuc[ad] = 'ok';
    } catch (h) {
      sonuc[ad] = h.code || 'hata';
    }
  }
  return sonuc;
}

module.exports = { oku, okuTek, yaz, islem, yordam, saglik };

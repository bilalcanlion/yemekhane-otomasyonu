const { oku, yordam } = require('./baglanti');

function rezervasyonYap(kullaniciId, menuId) {
  return yordam('sp_rezervasyon_yap', [kullaniciId, menuId]);
}

function rezervasyonIptal(kullaniciId, rezervasyonId) {
  return yordam('sp_rezervasyon_iptal', [kullaniciId, rezervasyonId]);
}

function kullaniciRezervasyonlari(kullaniciId, kaynak) {
  return oku(
    `SELECT r.id, r.menu_id, r.durum, r.ucret, r.olusturma, r.kullanma_zamani, r.iptal_zamani,
            m.tarih, m.yemekhane_id, yh.ad AS yemekhane, o.ad AS ogun,
            TIMESTAMP(m.tarih, o.son_saat) AS rezervasyon_son,
            (r.durum = 'aktif' AND NOW() < TIMESTAMP(m.tarih, o.son_saat)) AS iptal_edilebilir
       FROM rezervasyonlar r
       JOIN menuler m       ON m.id  = r.menu_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       JOIN ogunler o       ON o.id  = m.ogun_id
      WHERE r.kullanici_id = ?
      ORDER BY m.tarih DESC, o.sira DESC`,
    [kullaniciId],
    kaynak,
  );
}

module.exports = { rezervasyonYap, rezervasyonIptal, kullaniciRezervasyonlari };

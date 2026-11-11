const { oku, yordam } = require('./baglanti');

function rezervasyonYap(kullaniciId, menuId) {
  return yordam('sp_rezervasyon_yap', [kullaniciId, menuId]);
}

function rezervasyonIptal(kullaniciId, rezervasyonId) {
  return yordam('sp_rezervasyon_iptal', [kullaniciId, rezervasyonId]);
}

function kullaniciRezervasyonlari(kullaniciId, kaynak, sadeceDurum = null) {
  const parametreler = [kullaniciId];
  let durumKosulu = '';
  if (sadeceDurum) {
    durumKosulu = 'AND r.durum = ?';
    parametreler.push(sadeceDurum);
  }
  return oku(
    `SELECT r.id, r.menu_id, r.durum, r.ucret, r.olusturma, r.kullanma_zamani, r.iptal_zamani,
            m.tarih, m.yemekhane_id, yh.ad AS yemekhane, o.ad AS ogun,
            TIMESTAMP(m.tarih, o.son_saat) AS rezervasyon_son,
            (r.durum = 'aktif' AND NOW() < TIMESTAMP(m.tarih, o.son_saat)) AS iptal_edilebilir,
            d.puan, d.yorum
       FROM rezervasyonlar r
       JOIN menuler m       ON m.id  = r.menu_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       JOIN ogunler o       ON o.id  = m.ogun_id
       LEFT JOIN degerlendirmeler d ON d.menu_id = r.menu_id AND d.kullanici_id = r.kullanici_id
      WHERE r.kullanici_id = ? ${durumKosulu}
      ORDER BY m.tarih DESC, o.sira DESC`,
    parametreler,
    kaynak,
  );
}

module.exports = { rezervasyonYap, rezervasyonIptal, kullaniciRezervasyonlari };

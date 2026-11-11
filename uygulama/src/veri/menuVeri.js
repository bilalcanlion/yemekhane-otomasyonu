const { oku, okuTek } = require('./baglanti');

function yemekhaneler() {
  return oku('SELECT id, ad, konum, kapasite FROM yemekhaneler ORDER BY id');
}

function ogunler() {
  return oku(
    `SELECT id, ad, sira, TIME_FORMAT(son_saat, '%H:%i') AS son_saat
       FROM ogunler ORDER BY sira`,
  );
}

function bugun() {
  return okuTek('SELECT CURDATE() AS bugun, NOW() AS simdi');
}

function menuDetay(yemekhaneId, tarih, ogunId) {
  return oku(
    `SELECT menu_id, tarih, yemekhane_id, yemekhane, ogun_id, ogun, rezervasyon_son,
            ogrenci_fiyati, personel_fiyati, yemek_id, yemek, kategori, kategori_sira,
            kalori, vejetaryen, alerjenler, alerjen_idler
       FROM v_menu_detay
      WHERE yemekhane_id = ? AND tarih = ? AND ogun_id = ?
      ORDER BY kategori_sira, yemek`,
    [yemekhaneId, tarih, ogunId],
  );
}

function doluluk(menuId, kullaniciId, kaynak) {
  return okuTek(
    `SELECT d.menu_id, d.kapasite, d.rezerve, d.bos_yer, d.doluluk_yuzde, d.rezervasyon_son,
            NOW() >= d.rezervasyon_son AS suresi_doldu,
            r.id AS rezervasyon_id, r.durum AS rezervasyon_durum
       FROM v_menu_doluluk d
       LEFT JOIN rezervasyonlar r ON r.menu_id = d.menu_id AND r.kullanici_id = ?
      WHERE d.menu_id = ?`,
    [kullaniciId, menuId],
    kaynak,
  );
}

function haftalik(yemekhaneId, baslangic, bitis, kullaniciId, kaynak) {
  return oku(
    `SELECT d.menu_id, d.tarih, d.ogun_id, d.ogun, d.kapasite, d.bos_yer, d.rezervasyon_son,
            NOW() >= d.rezervasyon_son AS suresi_doldu,
            m.ogrenci_fiyati, m.personel_fiyati,
            (SELECT GROUP_CONCAT(v.yemek ORDER BY v.kategori_sira, v.yemek SEPARATOR ', ')
               FROM v_menu_detay v WHERE v.menu_id = d.menu_id) AS yemekler,
            (SELECT SUM(v.kalori) FROM v_menu_detay v WHERE v.menu_id = d.menu_id) AS toplam_kalori,
            r.id AS rezervasyon_id, r.durum AS rezervasyon_durum
       FROM v_menu_doluluk d
       JOIN menuler m ON m.id = d.menu_id
       JOIN ogunler o ON o.id = d.ogun_id
       LEFT JOIN rezervasyonlar r ON r.menu_id = d.menu_id AND r.kullanici_id = ?
      WHERE d.yemekhane_id = ? AND d.tarih BETWEEN ? AND ?
      ORDER BY d.tarih, o.sira`,
    [kullaniciId, yemekhaneId, baslangic, bitis],
    kaynak,
  );
}

module.exports = { yemekhaneler, ogunler, bugun, menuDetay, doluluk, haftalik };

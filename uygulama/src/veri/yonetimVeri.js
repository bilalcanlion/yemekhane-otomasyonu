const { oku, okuTek, islem } = require('./baglanti');

function menuRaporu(baslangic, bitis, yemekhaneId, kaynak) {
  const parametreler = [baslangic, bitis];
  let kosul = '';
  if (yemekhaneId) {
    kosul = 'AND d.yemekhane_id = ?';
    parametreler.push(yemekhaneId);
  }
  return oku(
    `SELECT d.menu_id, d.tarih, d.yemekhane_id, d.yemekhane, d.ogun_id, d.ogun,
            d.kapasite, d.rezerve, d.bos_yer, d.doluluk_yuzde,
            m.ogrenci_fiyati, m.personel_fiyati,
            p.oy_sayisi, p.ortalama_puan
       FROM v_menu_doluluk d
       JOIN menuler m     ON m.id = d.menu_id
       JOIN v_menu_puan p ON p.menu_id = d.menu_id
       JOIN ogunler o     ON o.id = d.ogun_id
      WHERE d.tarih BETWEEN ? AND ? ${kosul}
      ORDER BY d.tarih, d.yemekhane_id, o.sira`,
    parametreler,
    kaynak,
  );
}

function yemekler() {
  return oku(
    `SELECT y.id, y.ad, y.kalori, y.vejetaryen, k.id AS kategori_id, k.ad AS kategori, k.sira AS kategori_sira
       FROM yemekler y JOIN yemek_kategorileri k ON k.id = y.kategori_id
      ORDER BY k.sira, y.ad`,
  );
}

async function menuGetir(menuId, kaynak) {
  const menu = await okuTek(
    `SELECT id, yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati
       FROM menuler WHERE id = ?`,
    [menuId],
    kaynak,
  );
  if (!menu) return null;
  const satirlar = await oku('SELECT yemek_id FROM menu_yemekleri WHERE menu_id = ? ORDER BY yemek_id', [menuId], kaynak);
  menu.yemek_idler = satirlar.map((s) => s.yemek_id);
  return menu;
}

function menuOlustur({ yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati, yemek_idler }) {
  return islem(async (b) => {
    const [sonuc] = await b.query(
      `INSERT INTO menuler (yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati)
       VALUES (?, ?, ?, ?, ?)`,
      [yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati],
    );
    const menuId = sonuc.insertId;
    await b.query('INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?', [yemek_idler.map((y) => [menuId, y])]);
    return menuId;
  });
}

function menuGuncelle(menuId, { ogrenci_fiyati, personel_fiyati, yemek_idler }) {
  return islem(async (b) => {
    await b.query(
      'UPDATE menuler SET ogrenci_fiyati = ?, personel_fiyati = ? WHERE id = ?',
      [ogrenci_fiyati, personel_fiyati, menuId],
    );
    await b.query('DELETE FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
    await b.query('INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?', [yemek_idler.map((y) => [menuId, y])]);
  });
}

module.exports = { menuRaporu, yemekler, menuGetir, menuOlustur, menuGuncelle };

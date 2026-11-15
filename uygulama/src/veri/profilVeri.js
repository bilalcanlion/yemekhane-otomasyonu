const { oku, islem } = require('./baglanti');

function alerjenler() {
  return oku('SELECT id, ad FROM alerjenler ORDER BY ad');
}

function kullaniciAlerjenleri(kullaniciId, kaynak) {
  return oku(
    `SELECT a.id, a.ad
       FROM kullanici_alerjenleri ka
       JOIN alerjenler a ON a.id = ka.alerjen_id
      WHERE ka.kullanici_id = ?
      ORDER BY a.ad`,
    [kullaniciId],
    kaynak,
  );
}

function alerjenleriKaydet(kullaniciId, alerjenIdler) {
  return islem(async (b) => {
    await b.query('DELETE FROM kullanici_alerjenleri WHERE kullanici_id = ?', [kullaniciId]);
    if (alerjenIdler.length > 0) {
      await b.query(
        'INSERT INTO kullanici_alerjenleri (kullanici_id, alerjen_id) VALUES ?',
        [alerjenIdler.map((a) => [kullaniciId, a])],
      );
    }
  });
}

module.exports = { alerjenler, kullaniciAlerjenleri, alerjenleriKaydet };

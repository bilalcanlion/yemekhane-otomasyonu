const { istemci } = require('../veri/redis');
const menuVeri = require('../veri/menuVeri');

const anahtar = (yemekhaneId, tarih, ogunId) => `menu:${yemekhaneId}:${tarih}:${ogunId}`;

function gunSonu(tarih) {
  return Math.floor(new Date(`${tarih}T23:59:59+03:00`).getTime() / 1000);
}

function bugunIstanbul() {
  return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

function menuOlustur(satirlar) {
  const ilk = satirlar[0];
  const yemekler = satirlar.map((s) => ({
    yemek_id: s.yemek_id,
    yemek: s.yemek,
    kategori: s.kategori,
    kategori_sira: s.kategori_sira,
    kalori: s.kalori,
    vejetaryen: Boolean(s.vejetaryen),
    alerjenler: s.alerjenler ? s.alerjenler.split(', ') : [],
    alerjen_idler: s.alerjen_idler ? s.alerjen_idler.split(',').map(Number) : [],
  }));
  return {
    menu_id: ilk.menu_id,
    tarih: ilk.tarih,
    yemekhane_id: ilk.yemekhane_id,
    yemekhane: ilk.yemekhane,
    ogun_id: ilk.ogun_id,
    ogun: ilk.ogun,
    rezervasyon_son: ilk.rezervasyon_son,
    ogrenci_fiyati: ilk.ogrenci_fiyati,
    personel_fiyati: ilk.personel_fiyati,
    toplam_kalori: yemekler.reduce((t, y) => t + y.kalori, 0),
    tamami_vejetaryen: yemekler.every((y) => y.vejetaryen),
    yemekler,
  };
}

async function veritabanindanYukle(yemekhaneId, tarih, ogunId, kaynak) {
  const a = anahtar(yemekhaneId, tarih, ogunId);
  const satirlar = await menuVeri.menuDetay(yemekhaneId, tarih, ogunId, kaynak);
  console.log(`[önbellek] ${a} -> veritabanından geldi (${kaynak === 'yazma' ? 'kaynak' : 'replika'})`);
  if (satirlar.length === 0) return null;

  const menu = menuOlustur(satirlar);
  const bitis = Math.max(gunSonu(tarih), gunSonu(bugunIstanbul()));
  await istemci.set(a, JSON.stringify(menu), { EXAT: bitis });
  return menu;
}

async function menuGetir(yemekhaneId, tarih, ogunId) {
  const a = anahtar(yemekhaneId, tarih, ogunId);
  const onbellekte = await istemci.get(a);
  if (onbellekte) {
    console.log(`[önbellek] ${a} -> Redis'ten geldi`);
    return JSON.parse(onbellekte);
  }
  return veritabanindanYukle(yemekhaneId, tarih, ogunId, 'okuma');
}

async function onbellegiYenile(yemekhaneId, tarih, ogunId) {
  const a = anahtar(yemekhaneId, tarih, ogunId);
  const silinen = await istemci.del(a);
  console.log(`[önbellek] ${a} silindi (${silinen ? 'vardı' : 'yoktu'})`);
  await veritabanindanYukle(yemekhaneId, tarih, ogunId, 'yazma');
}

function rolFiyati(menu, rol) {
  return rol === 'ogrenci' ? menu.ogrenci_fiyati : menu.personel_fiyati;
}

function rezervasyonDurumu({ suresi_doldu, bos_yer, rezervasyon_durum }) {
  if (rezervasyon_durum === 'aktif') return { rezerve_edilebilir: false, neden: 'Rezervasyonunuz var' };
  if (rezervasyon_durum === 'kullanildi') return { rezerve_edilebilir: false, neden: 'Kullanıldı' };
  if (suresi_doldu) return { rezerve_edilebilir: false, neden: 'Son saat geçti' };
  if (bos_yer <= 0) return { rezerve_edilebilir: false, neden: 'Kapasite dolu' };
  return { rezerve_edilebilir: true, neden: null };
}

module.exports = { menuGetir, onbellegiYenile, rolFiyati, rezervasyonDurumu };

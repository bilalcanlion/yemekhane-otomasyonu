const { Router } = require('express');
const { oturumGerekli, rolGerekli } = require('../ara-katman/oturum');
const { saglik } = require('../veri/baglanti');
const oturum = require('../controllers/oturumController');
const menu = require('../controllers/menuController');
const rezervasyon = require('../controllers/rezervasyonController');
const bakiye = require('../controllers/bakiyeController');
const degerlendirme = require('../controllers/degerlendirmeController');
const yonetim = require('../controllers/yonetimController');

const r = Router();

r.get('/', (req, res) => res.json({ uygulama: 'yemekhane-api', durum: 'çalışıyor' }));
r.get('/saglik', async (req, res) => res.json({ db: await saglik() }));

r.post('/oturum/giris', oturum.giris);
r.post('/oturum/cikis', oturum.cikis);
r.get('/oturum/ben', oturumGerekli, oturum.ben);

r.get('/tanimlar', oturumGerekli, menu.tanimlar);
r.get('/menuler/gunluk', oturumGerekli, menu.gunluk);
r.get('/menuler/haftalik', oturumGerekli, menu.haftalik);

r.get('/rezervasyonlar', oturumGerekli, rezervasyon.listele);
r.post('/rezervasyonlar', oturumGerekli, rezervasyon.yap);
r.post('/rezervasyonlar/:id/iptal', oturumGerekli, rezervasyon.iptal);

r.get('/bakiye', oturumGerekli, bakiye.getir);
r.post('/bakiye/yukle', oturumGerekli, bakiye.yukle);

r.get('/degerlendirmeler', oturumGerekli, degerlendirme.listele);
r.post('/degerlendirmeler', oturumGerekli, degerlendirme.ekle);

const yonetici = [oturumGerekli, rolGerekli('yonetici')];
r.get('/yonetim/menuler', ...yonetici, yonetim.menuRaporu);
r.get('/yonetim/yemekler', ...yonetici, yonetim.yemekler);
r.get('/yonetim/menuler/:id', ...yonetici, yonetim.menuGetir);
r.post('/yonetim/menuler', ...yonetici, yonetim.menuOlustur);
r.put('/yonetim/menuler/:id', ...yonetici, yonetim.menuGuncelle);

module.exports = r;

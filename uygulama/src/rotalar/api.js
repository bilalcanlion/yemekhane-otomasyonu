const { Router } = require('express');
const { oturumGerekli } = require('../ara-katman/oturum');
const { saglik } = require('../veri/baglanti');
const oturum = require('../controllers/oturumController');
const menu = require('../controllers/menuController');

const r = Router();

r.get('/', (req, res) => res.json({ uygulama: 'yemekhane-api', durum: 'çalışıyor' }));
r.get('/saglik', async (req, res) => res.json({ db: await saglik() }));

r.post('/oturum/giris', oturum.giris);
r.post('/oturum/cikis', oturum.cikis);
r.get('/oturum/ben', oturumGerekli, oturum.ben);

r.get('/tanimlar', oturumGerekli, menu.tanimlar);
r.get('/menuler/gunluk', oturumGerekli, menu.gunluk);
r.get('/menuler/haftalik', oturumGerekli, menu.haftalik);

module.exports = r;

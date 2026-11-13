const express = require('express');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { redisBaglan } = require('./veri/redis');
const apiRotalari = require('./rotalar/api');
const { bulunamadi, hataYakalayici } = require('./ara-katman/hata');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  const baslangic = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - baslangic} ms)`);
  });
  next();
});

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
}, apiRotalari);

app.use(bulunamadi);
app.use(hataYakalayici);

async function basla() {
  await redisBaglan();
  app.listen(config.port, () => {
    console.log(`[uygulama] ${config.port} portunda dinleniyor`);
    console.log(`[uygulama] yazma: ${config.db.yazmaHost}, okuma: ${config.db.okumaHost}`);
  });
}

basla().catch((hata) => {
  console.error('[uygulama] başlatılamadı:', hata.message);
  process.exit(1);
});

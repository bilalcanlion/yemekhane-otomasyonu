// Yemekhane Otomasyonu · Web API giriş noktası
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8000;

// İstek gövdesi JSON ise okuyabilmek için
app.use(express.json());

// Durum kontrolü: Apache /api/ isteklerini buraya iletir
app.get('/api/', (req, res) => {
  res.json({ uygulama: 'yemekhane-api', durum: 'çalışıyor' });
});

app.listen(PORT, () => {
  console.log(`[uygulama] ${PORT} portunda dinleniyor`);
});

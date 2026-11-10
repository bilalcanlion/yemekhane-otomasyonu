const express = require('express');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

app.get('/api/', (req, res) => {
  res.json({ uygulama: 'yemekhane-api', durum: 'çalışıyor' });
});

app.listen(PORT, () => {
  console.log(`[uygulama] ${PORT} portunda dinleniyor`);
});

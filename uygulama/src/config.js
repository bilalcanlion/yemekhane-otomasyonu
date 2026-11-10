module.exports = {
  port: Number(process.env.PORT || 8000),

  db: {
    yazmaHost: process.env.DB_YAZMA_HOST || 'localhost',
    okumaHost: process.env.DB_OKUMA_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    veritabani: process.env.DB_ADI || 'yemekhane',
    kullanici: process.env.DB_KULLANICI || 'yemekhane_app',
    sifre: process.env.DB_SIFRE || '',
  },

  oturumSuresiSn: 30 * 60,
};

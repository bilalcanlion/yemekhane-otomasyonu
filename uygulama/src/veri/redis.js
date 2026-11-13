const { createClient } = require('redis');
const config = require('../config');

const istemci = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
    reconnectStrategy: (deneme) => Math.min(deneme * 200, 3000),
  },
});

istemci.on('error', (hata) => console.error('[redis]', hata.message));

async function redisBaglan() {
  await istemci.connect();
  console.log(`[redis] ${config.redis.host}:${config.redis.port} bağlandı`);
}

async function redisSaglik() {
  try {
    return (await istemci.ping()) === 'PONG' ? 'ok' : 'hata';
  } catch (h) {
    return h.code || 'hata';
  }
}

module.exports = { istemci, redisBaglan, redisSaglik };

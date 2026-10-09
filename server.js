const server = require('./api/_lib/backend-server.js');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`[SERVER] Crayon Box Engine running on http://${HOST}:${PORT}`);
  });
}

module.exports = server;

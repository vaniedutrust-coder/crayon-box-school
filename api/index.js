const server = require('./_lib/backend-server.js');

module.exports = (req, res) => {
  server.emit('request', req, res);
};

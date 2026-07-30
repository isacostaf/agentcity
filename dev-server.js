/* ---------------------------------------------------------------------------
   Servidor de desenvolvimento LOCAL do AgentCity.
   Emula o ambiente da Vercel: serve o index.html e roteia /api/* para as
   mesmas funções que rodarão em produção. Use só para testar na sua máquina.

   Como rodar:
       node dev-server.js
   Depois abra:  http://localhost:3000

   Opcional — para testar com Redis de verdade (persistir eventos), crie um
   arquivo  .env.local  na raiz com:
       UPSTASH_REDIS_REST_URL=...
       UPSTASH_REDIS_REST_TOKEN=...
       AGENTCITY_SECRET=um-segredo-qualquer
   Sem esse arquivo, o dashboard funciona igual, só não guarda histórico
   (o health-check dos links continua funcionando normalmente).
--------------------------------------------------------------------------- */
const http = require('http');
const fs = require('fs');
const path = require('path');

/* carrega .env.local (se existir) para process.env ANTES de importar os handlers */
(function loadEnv() {
  const f = path.join(__dirname, '.env.local');
  if (!fs.existsSync(f)) return;
  fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach(function (line) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
  console.log('[dev] .env.local carregado');
})();

const stateHandler = require('./api/state.js');
const eventHandler = require('./api/event.js');

const PORT = process.env.PORT || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

/* adiciona os métodos que os handlers da Vercel esperam (status().json(), etc.) */
function decorate(res) {
  res.status = function (code) { res.statusCode = code; return res; };
  res.json = function (obj) {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

function readBody(req) {
  return new Promise(function (resolve) {
    let data = '';
    req.on('data', function (c) { data += c; });
    req.on('end', function () {
      if (!data) return resolve(undefined);
      try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
    });
  });
}

const server = http.createServer(async function (req, res) {
  decorate(res);
  const url = req.url.split('?')[0];

  try {
    if (url === '/api/state') return void stateHandler(req, res);
    if (url === '/api/event') {
      req.body = await readBody(req);
      return void eventHandler(req, res);
    }

    /* estático: qualquer coisa fora de /api */
    let rel = url === '/' ? '/index.html' : url;
    const filePath = path.join(__dirname, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    if (!filePath.startsWith(__dirname) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.statusCode = 404; return res.end('Not found');
    }
    res.setHeader('Content-Type', TYPES[path.extname(filePath)] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.statusCode = 500;
    res.end('Erro: ' + e.message);
  }
});

server.listen(PORT, function () {
  const redisOn = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  console.log('\n  AgentCity (dev)  ->  http://localhost:' + PORT);
  console.log('  Redis: ' + (redisOn ? 'ligado (eventos persistem)' : 'desligado (só health-check e modos)'));
  console.log('  Ctrl+C para parar.\n');
});

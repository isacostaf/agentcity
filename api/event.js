/* ---------------------------------------------------------------------------
   POST /api/event
   Recebe eventos enviados pelos agentes (via instrumentation/agentcity.js).
   Guarda cada evento num sorted set do Redis com TTL de ~25h, e limpa tudo
   que passou de 24h a cada escrita.

   Autenticação: header `x-agentcity-secret` (ou campo `secret` no corpo)
   precisa bater com a env var AGENTCITY_SECRET.

   Corpo esperado (JSON):
     {
       "system": "radar-colegiados",   // slug (ver lib/systems.js)
       "type":   "cron_success",       // ver ALLOWED abaixo
       "user":   "fulano",             // opcional (para login)
       "detail": "texto livre"         // opcional
     }
--------------------------------------------------------------------------- */
const { SYSTEMS } = require('../lib/systems');
const redis = require('../lib/redis');

const ALLOWED = ['cron_start', 'cron_success', 'cron_error', 'search', 'login', 'used'];
const DAY_MS = 24 * 60 * 60 * 1000;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-agentcity-secret');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const secret = req.headers['x-agentcity-secret'] || body.secret;
  if (!process.env.AGENTCITY_SECRET || secret !== process.env.AGENTCITY_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const sys = SYSTEMS.find(s => s.slug === body.system);
  if (!sys) return res.status(400).json({ error: 'unknown system' });
  if (ALLOWED.indexOf(body.type) < 0) return res.status(400).json({ error: 'unknown type' });

  const now = Date.now();
  const ev = {
    id: now + '-' + Math.random().toString(36).slice(2, 7),
    type: body.type,
    ts: now,
    user: body.user ? String(body.user).slice(0, 80) : null,
    detail: body.detail ? String(body.detail).slice(0, 240) : null
  };

  if (redis.enabled) {
    const key = 'events:' + sys.slug;
    await redis.cmd(['ZADD', key, String(now), JSON.stringify(ev)]);
    await redis.cmd(['ZREMRANGEBYSCORE', key, '0', String(now - DAY_MS)]);
    await redis.cmd(['EXPIRE', key, '90000']); // ~25h
  }

  return res.status(200).json({ ok: true, stored: redis.enabled });
};

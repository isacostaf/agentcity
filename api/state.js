/* ---------------------------------------------------------------------------
   GET /api/state
   Estado que o dashboard (index.html) poleia a cada 30s.
   Para cada sistema retorna:
     - mode: modo do robô ('workingmode' | 'idlemode' | 'errormode'
             | 'sleepingmode' | 'devmode')
     - health: 'up' | 'down' | null   (health-check da URL, só p/ 'running')
     - lastCron: { status:'success'|'error'|'running', ts } | null
     - events: eventos das últimas 24h (mais recente primeiro)

   Regras de status (sistemas 'running'):
     URL fora do ar ............ errormode
     último cron deu erro ...... errormode
     cron em execução .......... workingmode
     pesquisa/login/uso < 5min . workingmode
     senão ..................... idlemode (disponível)
--------------------------------------------------------------------------- */
const { SYSTEMS } = require('../lib/systems');
const redis = require('../lib/redis');

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_MS = 5 * 60 * 1000;    // janela em que pesquisa/login/uso => "trabalhando"
const HEALTH_TTL = 60;              // segundos de cache de um resultado "up"
const HEALTH_TIMEOUT = 15000;       // ms — folgado por causa do cold start (Render free hiberna)
const FAIL_THRESHOLD = 2;           // nº de falhas seguidas antes de declarar "fora do ar"

// Faz uma requisição real e diz se o servidor respondeu (< 500 = vivo).
async function ping(url) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT);
    const r = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal });
    clearTimeout(to);
    return (r.status >= 200 && r.status < 400); // 2xx/3xx = página no ar; 4xx (404) e 5xx = fora do ar
  } catch (e) {
    return false;
  }
}

async function checkHealth(sys) {
  if (sys.type !== 'running' || !sys.url) return null;
  const okKey = 'health:' + sys.slug;
  const failKey = 'healthfail:' + sys.slug;

  // resultado "up" fica em cache por HEALTH_TTL para não bater na URL toda hora
  if (redis.enabled) {
    const cached = await redis.cmd(['GET', okKey]);
    if (cached === 'up') return 'up';
  }

  const alive = await ping(sys.url);

  if (alive) {
    if (redis.enabled) {
      await redis.cmd(['SET', okKey, 'up', 'EX', String(HEALTH_TTL)]);
      await redis.cmd(['DEL', failKey]);
    }
    return 'up';
  }

  // falhou: só marca "down" após FAIL_THRESHOLD falhas seguidas (evita falso-positivo de cold start)
  if (!redis.enabled) return 'down'; // sem estado não dá pra contar — reporta o que viu agora
  const fails = await redis.cmd(['INCR', failKey]);
  await redis.cmd(['EXPIRE', failKey, '300']);
  return (fails && fails >= FAIL_THRESHOLD) ? 'down' : 'up';
}

async function readEvents(slug, now) {
  if (!redis.enabled) return [];
  const key = 'events:' + slug;
  await redis.cmd(['ZREMRANGEBYSCORE', key, '0', String(now - DAY_MS)]);
  const raw = await redis.cmd(['ZRANGE', key, '0', '-1']);
  if (!Array.isArray(raw)) return [];
  const evs = [];
  for (const m of raw) { try { evs.push(JSON.parse(m)); } catch (e) { /* ignora */ } }
  evs.sort((a, b) => b.ts - a.ts); // mais recente primeiro
  return evs;
}

function computeMode(sys, events, health, now) {
  if (sys.type === 'paper') return { mode: 'sleepingmode', lastCron: null };
  if (sys.type === 'dev') return { mode: 'devmode', lastCron: null };

  // sistema 'running': procura o último evento de cron (events já vem do mais novo p/ o mais antigo)
  let lastCron = null;
  for (const e of events) {
    if (e.type === 'cron_success') { lastCron = { status: 'success', ts: e.ts }; break; }
    if (e.type === 'cron_error')   { lastCron = { status: 'error',   ts: e.ts }; break; }
    if (e.type === 'cron_start')   { lastCron = { status: 'running', ts: e.ts }; break; }
  }

  if (health === 'down') return { mode: 'errormode', lastCron, reason: 'offline' };
  if (lastCron && lastCron.status === 'error')   return { mode: 'errormode', lastCron, reason: 'cron' };
  if (lastCron && lastCron.status === 'running') return { mode: 'workingmode', lastCron };

  const recent = events.some(e =>
    (e.type === 'search' || e.type === 'login' || e.type === 'used') && (now - e.ts) < ACTIVE_MS
  );
  if (recent) return { mode: 'workingmode', lastCron };

  return { mode: 'idlemode', lastCron };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const now = Date.now();
  const out = [];

  for (const sys of SYSTEMS) {
    const events = sys.type === 'running' ? await readEvents(sys.slug, now) : [];
    const health = await checkHealth(sys);
    const c = computeMode(sys, events, health, now);
    out.push({
      slug: sys.slug,
      name: sys.name,
      type: sys.type,
      url: sys.url || null,
      desc: sys.desc,
      hasLogin: !!sys.hasLogin,
      cronWindows: sys.cronWindows || null,
      robotIndex: sys.robotIndex,
      mode: c.mode,
      health: health,
      lastCron: c.lastCron || null,
      reason: c.reason || null,
      events: events.slice(0, 40)
    });
  }

  return res.status(200).json({ now, backend: redis.enabled ? 'redis' : 'memoryless', systems: out });
};

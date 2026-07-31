/* ---------------------------------------------------------------------------
   agentcity.js — reporter mínimo para o AgentCity.

   COPIE este arquivo para dentro de cada agente (ex.: lib/agentcity.js) e
   configure 3 variáveis de ambiente NO PROJETO DO AGENTE:

     AGENTCITY_URL     = https://SEU-AGENTCITY.vercel.app
     AGENTCITY_SECRET  = (o mesmo segredo definido no AgentCity)
     AGENTCITY_SYSTEM  = radar-colegiados | push-deorg | vigencia

   Uso (nunca quebra o agente — falha em silêncio):

     const agentcity = require('./lib/agentcity');

     // cronjob:
     agentcity.cronStart();
     try { ...trabalho...; agentcity.cronSuccess('12 atos encontrados'); }
     catch (e) { agentcity.cronError(e.message); throw e; }

     // pesquisa manual do usuário:
     agentcity.search('termo pesquisado');

     // login (só Push Deorg):
     agentcity.login('nome.usuario');

     // uso manual (Vigência):
     agentcity.used('verificação mensal');

   Se estiver usando ES Modules (import/export), troque a última linha por:
     export default { cronStart, cronSuccess, cronError, search, login, used };
--------------------------------------------------------------------------- */
const AGENTCITY_URL = process.env.AGENTCITY_URL;
const AGENTCITY_SECRET = process.env.AGENTCITY_SECRET;
const AGENTCITY_SYSTEM = process.env.AGENTCITY_SYSTEM;

async function report(type, extra) {
  if (!AGENTCITY_URL || !AGENTCITY_SECRET || !AGENTCITY_SYSTEM) return;
  try {
    await fetch(AGENTCITY_URL.replace(/\/+$/, '') + '/api/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agentcity-secret': AGENTCITY_SECRET
      },
      body: JSON.stringify(Object.assign({ system: AGENTCITY_SYSTEM, type }, extra || {}))
    });
  } catch (e) {
    /* monitoramento nunca deve derrubar o agente */
  }
}

module.exports = {
  cronStart:   ()       => report('cron_start'),
  cronSuccess: (detail) => report('cron_success', { detail }),
  cronError:   (detail) => report('cron_error',   { detail }),
  search:      (detail) => report('search',       { detail }),
  login:       (user)   => report('login',        { user }),
  used:        (detail) => report('used',         { detail })
};

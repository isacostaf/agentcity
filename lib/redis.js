/* ---------------------------------------------------------------------------
   Cliente mínimo do Upstash Redis via API REST (sem dependências npm).
   Usa a `fetch` global (Node 18+, padrão na Vercel).

   Variáveis de ambiente necessárias (você cria no painel da Vercel):
     UPSTASH_REDIS_REST_URL
     UPSTASH_REDIS_REST_TOKEN

   Se elas não estiverem definidas, `enabled` fica false e o dashboard
   continua funcionando (só sem histórico de eventos) — health-check ainda roda.
--------------------------------------------------------------------------- */
const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const enabled = !!(URL && TOKEN);

async function cmd(args) {
  if (!enabled) return null;
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    });
    const json = await res.json();
    return json.result;
  } catch (e) {
    return null;
  }
}

module.exports = { cmd, enabled };

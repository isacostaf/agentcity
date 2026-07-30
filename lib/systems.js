/* ---------------------------------------------------------------------------
   Configuração central dos 6 sistemas do AgentCity.
   É a fonte da verdade do BACKEND (as funções em /api usam este arquivo).
   O frontend (index.html) tem uma cópia equivalente inline — se mudar um slug
   ou a ordem aqui, ajuste lá também (procure por "var SYSTEMS").

   type:
     'running' -> sistema em produção (tem url, health-check e eventos)
     'dev'     -> em desenvolvimento (robô fica no modo "devmode")
     'paper'   -> só no papel (robô sempre "dormindo")

   robotIndex: posição do robô na sala (ordem do array `positions` no index.html).
--------------------------------------------------------------------------- */
const SYSTEMS = [
  {
    slug: 'radar-colegiados',
    name: 'Radar Colegiados',
    type: 'running',
    url: 'https://radarcolegiados.vercel.app',
    desc: 'Busca no Diário Oficial por atos de interesse. CronJob diário de manhã e à noite.',
    cronWindows: [['08:00', '09:00'], ['20:00', '21:00']],
    hasLogin: false,
    robotIndex: 0
  },
  {
    slug: 'push-deorg',
    name: 'Push Deorg',
    type: 'running',
    url: 'https://pushdeorg.vercel.app',
    desc: 'Busca processos específicos no Diário Oficial por suas características. Possui login.',
    cronWindows: [['08:00', '09:00']],
    hasLogin: true,
    robotIndex: 1
  },
  {
    slug: 'vigencia',
    name: 'Vigência Colegiados',
    type: 'running',
    url: 'https://vigenciacolegiados.onrender.com',
    desc: 'Uma vez por mês verifica se os colegiados estão ativos no sistema do MDLegis.',
    cronWindows: null,
    hasLogin: false,
    robotIndex: 2
  },
  {
    slug: 'radar-remunerados',
    name: 'Radar Colegiados Remunerados',
    type: 'dev',
    url: null,
    desc: 'Em desenvolvimento. Versão do Radar voltada aos colegiados remunerados. Ainda não entrou em produção.',
    hasLogin: false,
    robotIndex: 3
  },
  {
    slug: 'futuro-1',
    name: 'Estação reservada',
    type: 'paper',
    url: null,
    desc: 'Espaço reservado para um sistema futuro. Este posto será ocupado em breve.',
    hasLogin: false,
    robotIndex: 4
  },
  {
    slug: 'futuro-2',
    name: 'Estação reservada',
    type: 'paper',
    url: null,
    desc: 'Espaço reservado para um sistema futuro. Este posto será ocupado em breve.',
    hasLogin: false,
    robotIndex: 5
  }
];

module.exports = { SYSTEMS };

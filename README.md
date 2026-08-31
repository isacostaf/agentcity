# agenticcity

Um "escritório" 3D (three.js, tudo num `index.html` só, sem build) que mostra o status de
4 robôs de automação como se fossem funcionários sentados em mesas: trabalhando, ociosos,
dormindo ou com erro — dependendo do que cada robô reportou no Supabase dele. Tem também um
painel central com números do dia e uma barra pra revisitar como a sala estava em outro dia.

Este README é o ponto de partida. Detalhes de implementação de cada parte ficam comentados
dentro do próprio `index.html`, que tem um **mapa de seções** logo no topo do `<script>`
(procure por `MAPA DESTE ARQUIVO`) — cada seção do mapa abaixo tem um banner fácil de achar
com Ctrl+F procurando por `SEÇÃO N`.

## Como rodar

Não tem build nem dependências pra instalar: é um arquivo estático. Abra `index.html`
direto no navegador, ou sirva a pasta com qualquer servidor estático. As bibliotecas
(three.js e o cliente do Supabase) vêm de CDN via `<script src>` no fim do `<head>`.

## Estrutura geral do arquivo

- **`<style>`** — CSS só das camadas de HTML por cima do `<canvas>` (barra "AO VIVO",
  tooltip do holograma, botão/modal de "ler representações", balão do easter egg...). A
  sala 3D em si não usa CSS nenhum, é tudo desenhado via WebGL/three.js.
- **`<body>`** — o `<canvas id="c">` (onde o three.js desenha) mais os overlays de HTML
  acima, cada um com o `#id` correspondente no CSS.
- **`<script>`** — toda a lógica, dividida nas 16 seções do mapa do topo (SEÇÃO 1 a 16),
  na mesma ordem em que aparecem no arquivo. Resumo rápido:

  | Seção | O que tem |
  |---|---|
  | 1 | Renderer, cena, câmera (setup do three.js) |
  | 2 | Texturas/materiais reaproveitados |
  | 3 | Casco da sala (chão, teto, paredes) |
  | 4 | O painel "Dashboard" desenhado na parede |
  | 5 | Janelas, luzes de teto, poeira |
  | 6 | Fábricas de geometria: xícara, mesa, cadeira, robô |
  | 7 | Móveis: café, bebedouro, sofá, impressora, arquivo, triturador |
  | 8 | **`ROBOS[]`** (config do Supabase de cada robô) + montagem das 4 mesas |
  | 9 | Busca no Supabase + decide o modo de cada robô + barra "AO VIVO"/dia |
  | 10 | Decoração pequena (plantas, lixeiras) |
  | 11 | Pilar holográfico + bolo de aniversário (escondido) |
  | 12 | Interações de mouse: hover, cliques, o easter egg do aniversário |
  | 13 | Câmera fixa |
  | 14 | Animação dos robôs: IK dos braços, os 4 modos, fumaça, dança |
  | 15 | `animate()` — o loop principal, roda a cada frame |
  | 16 | Inicialização final |

## Plugando/consertando um robô (SEÇÃO 8)

Cada robô é um objeto dentro do array `ROBOS[]`, com sua própria conexão de Supabase —
**são 4 projetos Supabase diferentes**, não uma tabela só filtrada por robô. O comentário
bem acima do array explica campo a campo (url, anonKey, tabela, colunaData, colunaStatus,
link, e os campos opcionais colunaLinhas/colunaPushCount usados no painel). Deixe em branco
(`""`) o que não tiver ainda — o código pula um robô incompleto sem quebrar os outros.

## Como o modo de cada robô é decidido

- **AO VIVO** (padrão): a cada 1 minuto, `atualizarEstadoDoPainel()` (SEÇÃO 9) busca a
  linha de hoje na tabela de cada robô e chama `statusParaModo(status, agora)`:
  - status `"enviado"` → `workingmode`
  - status `"pendente"` → `sleepingmode`
  - sem dado hoje → `errormode` depois das 11h, `idlemode` antes disso
- **Um dia escolhido na barra do topo**: mesma lógica, mas com `dataISO` fixo naquele dia
  e a "hora atual" sempre fixada em 12:00 daquele dia (não muda sozinho depois).
- `var robo1..robo4` (perto de `ROBOT_MODES`, SEÇÃO 8) é só o modo **inicial**, antes da
  primeira resposta do Supabase chegar — na prática ele é sobrescrito na primeira busca.

### Os 4 modos de comportamento (SEÇÃO 14)

Cada modo é uma função `function modeNome(r, t)` (`r` = objeto do robô, `t` = tempo do
clock) que define a pose daquele frame. Ficam logo acima de `ROBOT_MODE_HANDLERS`
(SEÇÃO 15), que mapeia o nome do modo (string) pra função:

- **`modeWorking`** (`workingmode`) — digitando, com pausa pro café de vez em quando.
- **`modeIdle`** (`idlemode`) — parado, respiração sutil, sem digitar nem tomar café.
- **`modeSleeping`** (`sleepingmode`) — cabeça curvada até a mesa, ícone de "zzz" subindo.
- **`modeError`** (`errormode`) — mãos na cabeça, corpo tremendo, luz vermelha piscando,
  café derramado, e uma fumaça grande saindo do monitor (`updateSmoke`, SEÇÃO 14).

**Pra adicionar um modo novo:** escreva `function modeSeuNome(r, t){ ... }` do lado dos
outros, adicione `seunomemode: modeSeuNome` em `ROBOT_MODE_HANDLERS`, e retorne esse nome
em `statusParaModo` (ou use direto num dos `robo1..robo4`, se for só teste). Um modo que
não bate com nenhuma chave de `ROBOT_MODE_HANDLERS` cai em `modeWorking` por padrão.

## O painel central (SEÇÃO 4)

Não é HTML — é um `<canvas>` 2D redesenhado a cada poucos frames (`drawDashboard`) e
aplicado como textura numa parede da sala. Pra adicionar uma métrica nova, ache o array
`stats` dentro de `drawDashboard`: cada `{ label, value, color }` vira uma linha sozinha
(`drawStatRow`), sem precisar redesenhar o layout.

## Interações (SEÇÃO 12)

- **Clicar num robô** abre o link do app dele (campo `link` em `ROBOS[]`) numa aba nova.
- **Botão "Ler representações"**, ao lado da 1ª linha do painel, abre um modal listando os
  documentos daquele dia (nome + link do PDF, clicável) — dado cru vem de
  `representacoesHojeLista`, preenchido junto com o resto em `atualizarEstadoDoPainel`.
- **Easter egg "modo aniversário"**: clicar 2x no bebedouro + 1x na impressora (nessa
  ordem, com menos de 2,5s entre cliques) liga luzes coloridas piscando, troca a bolinha
  holográfica por um bolo gigante e bota os 4 robôs pra dançar, por 10 segundos. Tudo isso
  fica com `visible=false` fora da janela do easter egg — não pesa a cena o resto do tempo
  (ver o comentário sobre `depthWrite`/luzes invisíveis na SEÇÃO 12 se for mexer nisso).

## Erros comuns ao mexer no código

- **Um objeto invisível "sumiu" com algo atrás dele**: hitboxes de clique usam
  `MeshBasicMaterial({ opacity:0, depthWrite:false })` de propósito — sem `depthWrite:false`,
  um material transparente ainda escreve no depth buffer e pode tapar o que está atrás,
  mesmo sendo ele mesmo invisível. Mantenha esse padrão em qualquer hitbox novo.
- **Cena ficou lenta depois de adicionar uma luz**: uma `THREE.Light` com `visible:true`
  é processada no shader de todo objeto iluminado da cena a cada frame, mesmo com
  `intensity:0`. Se a luz só deve existir às vezes (como as do easter egg), deixe
  `visible:false` por padrão e só ligue `visible:true` quando for realmente usar.

## Caso especial: Push Remunerado (SEÇÃO 9)

Só a tabela do Push Remunerado (`execucao`) grava **2 linhas por dia** — uma de manhã, outra
à noite, diferenciadas pela coluna `rotina` (`"manha"`/`"noite"`), cada uma com sua própria
`rotina_sucesso` (true/false). **Só quando um dia é escolhido no calendário** (não ao vivo),
`atualizarEstadoDoPainel` desvia esse robô pra `buscarStatusPushRemuneradoNoDia`, que busca
as duas rotinas daquele dia e decide: as duas existem e as duas com `rotina_sucesso = true`
→ `workingmode`; se qualquer uma faltar ou vier `false` → `errormode`. Ao vivo, esse robô
continua no caminho normal (`buscarStatus`, 1 linha esperada) sem essa checagem dupla.

# Copa Gamer – inscrições (CS 1.6, Mortal Kombat 1 e FIFA 26)

Node.js + Express, frontend em EJS (HTML/CSS/JS), PostgreSQL (Supabase) e Docker.

## Como rodar
1. `cp .env.example .env` e edite `ADMIN_PASSWORD` e `DATABASE_URL` (Supabase: Connect > Session pooler).
   As tabelas são criadas sozinhas ao iniciar (ou rode `db/schema.sql` no SQL Editor).
2. `docker compose up --build` e abra http://localhost:3000

Teste sem Supabase: use a URL local comentada no `.env` e `docker compose --profile local up --build`.

## Páginas
- `/` – escolha do jogo (botões com imagem)
- `/jogos/cs16` – equipes (limite de 6), inscrição de equipe e gerenciamento com PIN
- `/jogos/mk1` e `/jogos/fifa26` – inscrição individual (nome e idade), participantes, confrontos pendentes e partidas realizadas
- `/admin` – gerenciar equipes e jogadores, sortear rodadas, registrar o vencedor de cada confronto (reabrir/excluir) e acompanhar até o campeão

Cada jogo exibe seu regulamento na aba de inscrição (texto em `src/regulations.js`; limite de equipes em `src/games.js`).

## Estrutura
```
server.js            inicialização
src/games.js         configuração dos jogos (nome, tipo, imagem)
src/db.js            conexão e criação das tabelas
src/services.js      consultas de equipes e jogadores
src/bracket.js       chaveamento: rodadas, sorteio, vencedores e campeão
src/routes/          pages.js, teams.js, players.js, bracket.js
views/               templates EJS (+ partials/)
public/              css, js e img/ (imagens dos botões)
```

## Trocar as imagens dos botões
Coloque a arte oficial em `public/img/` e ajuste o caminho em `src/games.js`.

## Como funciona o chaveamento (CS 1.6, MK1 e FIFA 26)
1. **Sortear 1ª rodada**: todos os inscritos são pareados aleatoriamente. Se o número for ímpar, um participante fica com folga e avança direto (quem ainda não teve folga tem prioridade).
2. Em cada confronto, o admin clica em **Venceu: [nome]**. Também é possível reabrir ou excluir confrontos da rodada atual.
3. Com todos os confrontos da rodada concluídos, **Sortear próxima rodada** pareia só os vencedores (mais quem teve folga).
4. Repete-se até a **Final**; o vencedor é exibido como campeão.

Outras regras: **Refazer rodada atual** só funciona se nenhum confronto dela estiver concluído; **Reiniciar** apaga todo o chaveamento do jogo.
Enquanto houver chaveamento, não é possível excluir participantes (reinicie antes).

// Chaveamento de mata-mata (eliminação simples) com estrutura FIXA:
// o vencedor do jogo 1 enfrenta o vencedor do jogo 2, e assim por diante até a final.
// O sorteio acontece uma única vez (posições da 1ª rodada); depois o vencedor de cada jogo avança sozinho.
const { randomInt } = require('crypto');
const { pool } = require('./db');
const { cached } = require('./cache');
const { GAMES } = require('./games');

const cols = (g) => (g.type === 'team' ? ['team1_id', 'team2_id'] : ['player1_id', 'player2_id']);
const httpErr = (status, message) => Object.assign(new Error(message), { status });

const roundName = (round, total) => {
  const left = total - round;
  return left === 0 ? 'Final' : left === 1 ? 'Semifinal' : left === 2 ? 'Quartas de final' : left === 3 ? 'Oitavas de final' : `Rodada ${round}`;
};

// ---------- leitura ----------
async function listMatches(slug) {
  const side = (n) => `COALESCE(p${n}.name, t${n}.name) AS n${n},
    CASE WHEN p${n}.id IS NOT NULL THEN p${n}.age::text || ' anos'
         ELSE (SELECT string_agg(x.name, ', ' ORDER BY x.id) FROM members x WHERE x.team_id = t${n}.id) END AS s${n}`;
  const { rows } = await pool.query(`
    SELECT m.id, m.round, m.position, m.status, m.winner, m.bye, m.finished_at, m.scheduled_at, ${side(1)}, ${side(2)}
    FROM matches m
    LEFT JOIN players p1 ON p1.id = m.player1_id LEFT JOIN players p2 ON p2.id = m.player2_id
    LEFT JOIN teams   t1 ON t1.id = m.team1_id   LEFT JOIN teams   t2 ON t2.id = m.team2_id
    WHERE m.game = $1 AND m.archived_at IS NULL ORDER BY m.round, m.position`, [slug]);
  return rows.map((r) => ({
    id: r.id, round: r.round, position: r.position, status: r.status, winner: r.winner, bye: r.bye,
    finishedAt: r.finished_at, scheduledAt: r.scheduled_at,
    p1: r.n1 ? { name: r.n1, sub: r.s1 } : null, // null = ainda a definir
    p2: r.n2 ? { name: r.n2, sub: r.s2 } : null, // (em folga, o lado 2 fica vazio)
  }));
}

async function buildBracket(game) {
  const all = await listMatches(game.slug);
  const total = all.length ? Math.max(...all.map((m) => m.round)) : 0;
  const byKey = new Map(all.map((m) => [`${m.round}:${m.position}`, m]));

  let num = 0; // numeração dos jogos (folgas não contam)
  all.forEach((m) => { m.number = m.bye ? null : ++num; });
  all.forEach((m) => {
    const next = byKey.get(`${m.round + 1}:${Math.ceil(m.position / 2)}`);
    const src = (pos) => { const f = byKey.get(`${m.round - 1}:${pos}`); return f && f.number ? `Vencedor do jogo ${f.number}` : null; };
    m.src1 = m.p1 ? null : src(2 * m.position - 1);  // texto do lado ainda indefinido
    m.src2 = m.p2 ? null : src(2 * m.position);
    m.playable = !!(m.p1 && m.p2 && !m.bye && m.status !== 'done');
    m.canReopen = m.status === 'done' && !m.bye && !(next && next.status === 'done');
  });

  const rounds = [];
  for (let r = 1; r <= total; r++) rounds.push({ round: r, short: roundName(r, total), matches: all.filter((m) => m.round === r) });

  const real = all.filter((m) => !m.bye);
  const done = real.filter((m) => m.status === 'done');
  const final = byKey.get(`${total}:1`);
  const champion = final && final.status === 'done' ? (final.winner === 1 ? final.p1 : final.p2) : null;
  return {
    exists: all.length > 0, total, rounds, champion,
    canRedraw: all.length > 0 && done.length === 0,
    played: done.length, pending: real.length - done.length,
    progress: { done: done.length, total: real.length },
    doneList: [...done].sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt)),
  };
}

// versão com cache (o cache é limpo automaticamente a cada alteração)
const getBracket = (game) => cached(`bracket:${game.slug}`, () => buildBracket(game));

// ---------- sorteio ----------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ordem padrão de semeadura para S vagas (S potência de 2): [1,S,...]. Os jogos da 1ª rodada
// são (ordem[0] x ordem[1]), (ordem[2] x ordem[3])... e as folgas ficam espalhadas pela árvore.
function seedOrder(S) {
  let order = [1, 2];
  while (order.length < S) { const n = order.length * 2; order = order.flatMap((s) => [s, n + 1 - s]); }
  return order;
}

async function entities(client, game) {
  const q = game.type === 'team' ? ['SELECT id, name FROM teams ORDER BY id', []] : ['SELECT id, name FROM players WHERE game = $1 ORDER BY id', [game.slug]];
  return (await client.query(...q)).rows;
}

// cria TODAS as partidas (todas as rodadas) de uma vez
async function createBracket(client, game, list) {
  const [c1, c2] = cols(game);
  const names = new Map(list.map((e) => [e.id, e.name]));
  const N = list.length;
  let S = 2; while (S < N) S *= 2;          // tamanho da árvore (potência de 2)
  const R = Math.log2(S);                    // nº de rodadas
  const seeds = shuffle(list.map((e) => e.id)); // sorteio: a posição na lista define o "seed"
  const order = seedOrder(S);
  const idOf = {};

  for (let r = R; r >= 1; r--) {             // da final para a 1ª rodada (para já saber o "próximo jogo")
    for (let p = 1; p <= S / 2 ** r; p++) {
      let a = null, b = null;
      if (r === 1) { a = seeds[order[2 * p - 2] - 1] ?? null; b = seeds[order[2 * p - 1] - 1] ?? null; }
      const bye = r === 1 && b === null;     // sem adversário: folga, avança direto
      const next = r < R ? idOf[`${r + 1}:${Math.ceil(p / 2)}`] : null;
      const slot = r < R ? (p % 2 ? 1 : 2) : null;
      const { rows } = await client.query(
        `INSERT INTO matches (game, round, position, ${c1}, ${c2}, side1_name, side2_name, status, winner, bye, next_match_id, next_slot)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [game.slug, r, p, a, b, a ? names.get(a) : null, b ? names.get(b) : null, bye ? 'done' : 'pending', bye ? 1 : null, bye, next, slot]);
      idOf[`${r}:${p}`] = rows[0].id;
      if (bye && next) { // quem tem folga já entra na próxima rodada
        await client.query(`UPDATE matches SET ${slot === 1 ? c1 : c2} = $1, ${slot === 1 ? 'side1_name' : 'side2_name'} = $2 WHERE id = $3`, [a, names.get(a), next]);
      }
    }
  }
}

// redo=false: sorteia o chaveamento. redo=true: refaz o sorteio (só se nenhuma partida foi concluída).
async function drawBracket(game, redo = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [game.slug]);
    const { rows: ex } = await client.query('SELECT status, bye FROM matches WHERE game = $1 AND archived_at IS NULL', [game.slug]);
    if (ex.length && !redo) throw httpErr(400, 'Já existe um chaveamento. Use "Refazer sorteio" ou "Reiniciar".');
    if (redo) {
      if (!ex.length) throw httpErr(400, 'Não há sorteio para refazer.');
      if (ex.some((m) => m.status === 'done' && !m.bye)) throw httpErr(400, 'Já existem partidas concluídas. Use "Reiniciar" para começar um novo chaveamento.');
      await client.query('DELETE FROM matches WHERE game = $1 AND archived_at IS NULL', [game.slug]);
    }
    const list = await entities(client, game);
    if (list.length < 2) throw httpErr(400, `É preciso ter pelo menos 2 ${game.type === 'team' ? 'equipes' : 'jogadores'} inscritos.`);
    await createBracket(client, game, list);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

// Reiniciar: descarta o que não foi jogado e ARQUIVA as partidas realizadas (nada que foi jogado é apagado)
async function resetBracket(game) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("DELETE FROM matches WHERE game = $1 AND archived_at IS NULL AND (status <> 'done' OR side2_name IS NULL)", [game.slug]);
    await client.query('UPDATE matches SET archived_at = now() WHERE game = $1 AND archived_at IS NULL', [game.slug]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

// ---------- resultado de um jogo ----------
// winner: 1 ou 2 (registra o vencedor e o faz avançar) | null (reabre o jogo)
async function setWinner(id, winner) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [id]);
    const m = rows[0];
    if (!m) throw httpErr(404, 'Confronto não encontrado.');
    if (m.archived_at) throw httpErr(400, 'Esta partida está arquivada no histórico.');
    if (m.bye) throw httpErr(400, 'Uma folga avança automaticamente e não pode ser alterada.');

    const [c1, c2] = cols(GAMES[m.game]);
    const next = m.next_match_id ? (await client.query('SELECT id, status FROM matches WHERE id = $1 FOR UPDATE', [m.next_match_id])).rows[0] : null;
    const nCol = m.next_slot === 1 ? c1 : c2, nName = m.next_slot === 1 ? 'side1_name' : 'side2_name';

    if (winner) {
      if (!m[c1] || !m[c2]) throw httpErr(400, 'Este confronto ainda não tem os dois participantes. Conclua os jogos anteriores.');
      if (m.status === 'done') throw httpErr(400, 'Este confronto já tem vencedor. Reabra-o antes de alterar.');
      await client.query("UPDATE matches SET status = 'done', winner = $1, finished_at = now() WHERE id = $2", [winner, id]);
      if (next) await client.query(`UPDATE matches SET ${nCol} = $1, ${nName} = $2 WHERE id = $3`,
        [winner === 1 ? m[c1] : m[c2], winner === 1 ? m.side1_name : m.side2_name, next.id]);
    } else if (m.status === 'done') {
      if (next && next.status === 'done') throw httpErr(400, 'Reabra antes o jogo seguinte, que já tem vencedor.');
      await client.query("UPDATE matches SET status = 'pending', winner = NULL, finished_at = NULL WHERE id = $1", [id]);
      if (next) await client.query(`UPDATE matches SET ${nCol} = NULL, ${nName} = NULL WHERE id = $1`, [next.id]);
    }
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

// define (ou limpa) o horário de um jogo (pode ser definido antes de os participantes serem conhecidos)
async function setSchedule(id, value) {
  const { rows } = await pool.query('SELECT bye, archived_at FROM matches WHERE id = $1', [id]);
  if (!rows[0]) throw httpErr(404, 'Confronto não encontrado.');
  if (rows[0].archived_at) throw httpErr(400, 'Esta partida está arquivada no histórico.');
  if (rows[0].bye) throw httpErr(400, 'Uma folga não tem horário.');
  let when = null;
  if (value) { when = new Date(value); if (Number.isNaN(when.getTime())) throw httpErr(400, 'Data inválida.'); }
  await pool.query('UPDATE matches SET scheduled_at = $1 WHERE id = $2', [when, id]);
}

module.exports = { getBracket, drawBracket, resetBracket, setWinner, setSchedule };
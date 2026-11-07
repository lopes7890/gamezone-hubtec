// Chaveamento por rodadas (mata-mata) para jogadores (MK1/FIFA 26) e equipes (CS 1.6).
const { randomInt } = require('crypto');
const { pool } = require('./db');

const cols = (g) => (g.type === 'team' ? ['team1_id', 'team2_id'] : ['player1_id', 'player2_id']);
const httpErr = (status, message) => Object.assign(new Error(message), { status });

// ---------- leitura ----------
async function listMatches(slug) {
  const side = (n) => `COALESCE(p${n}.name, t${n}.name) AS n${n},
    CASE WHEN p${n}.id IS NOT NULL THEN p${n}.age::text || ' anos'
         ELSE (SELECT string_agg(x.name, ', ' ORDER BY x.id) FROM members x WHERE x.team_id = t${n}.id) END AS s${n}`;
  const { rows } = await pool.query(`
    SELECT m.id, m.round, m.position, m.status, m.winner, m.finished_at, ${side(1)}, ${side(2)}
    FROM matches m
    LEFT JOIN players p1 ON p1.id = m.player1_id LEFT JOIN players p2 ON p2.id = m.player2_id
    LEFT JOIN teams   t1 ON t1.id = m.team1_id   LEFT JOIN teams   t2 ON t2.id = m.team2_id
    WHERE m.game = $1 AND m.archived_at IS NULL ORDER BY m.round, m.position`, [slug]);
  return rows.map((r) => ({
    id: r.id, round: r.round, status: r.status, winner: r.winner, finishedAt: r.finished_at,
    p1: { name: r.n1, sub: r.s1 },
    p2: r.n2 ? { name: r.n2, sub: r.s2 } : null, // null = folga (avança direto)
  }));
}

function roundLabel(round, matches) {
  const n = matches.length * 2 - matches.filter((m) => !m.p2).length; // participantes na rodada
  const name = n <= 2 ? 'Final' : n <= 4 ? 'Semifinal' : n <= 8 ? 'Quartas de final' : n <= 16 ? 'Oitavas de final' : null;
  return name ? `Rodada ${round} · ${name}` : `Rodada ${round}`;
}

async function getBracket(game) {
  const all = await listMatches(game.slug);
  const byRound = new Map();
  all.forEach((m) => { if (!byRound.has(m.round)) byRound.set(m.round, []); byRound.get(m.round).push(m); });
  const rounds = [...byRound.entries()].sort((a, b) => a[0] - b[0])
    .map(([round, matches]) => ({ round, label: roundLabel(round, matches), matches }));
  const last = rounds[rounds.length - 1];
  const lastDone = !!last && last.matches.every((m) => m.status === 'done' && m.winner);
  const champion = lastDone && last.matches.length === 1 && last.matches[0].p2
    ? (last.matches[0].winner === 1 ? last.matches[0].p1 : last.matches[0].p2) : null;
  const real = all.filter((m) => m.p2); // partidas de verdade (sem folgas)
  const lastReal = last ? last.matches.filter((m) => m.p2) : [];
  return {
    rounds, current: last ? last.round : 0, champion, canDrawNext: lastDone && !champion,
    played: real.filter((m) => m.status === 'done').length,
    pending: real.filter((m) => m.status !== 'done').length,
    progress: { done: lastReal.filter((m) => m.status === 'done').length, total: lastReal.length },
    doneList: real.filter((m) => m.status === 'done').sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt)),
  };
}

// ---------- sorteio ----------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// embaralha e forma os pares; se for ímpar, um participante fica com folga
// (de preferência quem ainda não teve folga)
function makePairs(ids, hadBye = new Set()) {
  let s = shuffle(ids), bye = null;
  if (s.length % 2) {
    const pool_ = s.filter((id) => !hadBye.has(id));
    bye = (pool_.length ? pool_ : s)[randomInt((pool_.length ? pool_ : s).length)];
    s = s.filter((id) => id !== bye);
  }
  const pairs = [];
  for (let i = 0; i < s.length; i += 2) pairs.push([s[i], s[i + 1]]);
  if (bye !== null) pairs.push([bye, null]);
  return pairs;
}

async function entityIds(client, game) {
  const q = game.type === 'team' ? ['SELECT id FROM teams ORDER BY id', []] : ['SELECT id FROM players WHERE game = $1 ORDER BY id', [game.slug]];
  return (await client.query(...q)).rows.map((r) => r.id);
}

async function winnersOf(client, game, round) {
  const [c1, c2] = cols(game);
  const { rows } = await client.query(`SELECT ${c1} AS a, ${c2} AS b, winner FROM matches WHERE game = $1 AND round = $2 AND archived_at IS NULL ORDER BY position`, [game.slug, round]);
  return rows.map((r) => (r.winner === 1 ? r.a : r.b));
}

// redo=false: sorteia a 1ª rodada ou a próxima (com os vencedores). redo=true: refaz a rodada atual.
async function drawRound(game, redo = false) {
  const [c1, c2] = cols(game);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [game.slug]);
    const { rows: ms } = await client.query(`SELECT round, status, winner, (${c2} IS NULL) AS bye FROM matches WHERE game = $1 AND archived_at IS NULL`, [game.slug]);
    const last = ms.length ? Math.max(...ms.map((m) => m.round)) : 0;
    const cur = ms.filter((m) => m.round === last);
    let round, ids;

    if (redo) {
      if (!last) throw httpErr(400, 'Não há sorteio para refazer.');
      if (cur.some((m) => m.status === 'done' && !m.bye)) throw httpErr(400, 'Há confrontos concluídos nesta rodada. Reabra-os antes de refazer o sorteio.');
      await client.query('DELETE FROM matches WHERE game = $1 AND round = $2 AND archived_at IS NULL', [game.slug, last]);
      round = last;
      ids = last === 1 ? await entityIds(client, game) : await winnersOf(client, game, last - 1);
    } else if (!last) {
      round = 1; ids = await entityIds(client, game);
    } else {
      if (!cur.every((m) => m.status === 'done' && m.winner)) throw httpErr(400, 'Conclua todos os confrontos da rodada atual antes de sortear a próxima.');
      ids = await winnersOf(client, game, last);
      if (ids.length < 2) throw httpErr(400, 'A competição já tem um campeão.');
      round = last + 1;
    }
    if (ids.length < 2) throw httpErr(400, `É preciso ter pelo menos 2 ${game.type === 'team' ? 'equipes' : 'jogadores'} inscritos.`);

    const { rows: byes } = await client.query(`SELECT ${c1} AS id FROM matches WHERE game = $1 AND ${c2} IS NULL AND archived_at IS NULL`, [game.slug]);
    const pairs = makePairs(ids, new Set(byes.map((b) => b.id)));
    // grava os nomes junto com a partida (o histórico não depende do cadastro continuar existindo)
    const { rows: nm } = await client.query(
      game.type === 'team' ? 'SELECT id, name FROM teams' : 'SELECT id, name FROM players WHERE game = $1',
      game.type === 'team' ? [] : [game.slug]);
    const names = new Map(nm.map((r) => [r.id, r.name]));
    for (let i = 0; i < pairs.length; i++) {
      const [a, b] = pairs[i];
      await client.query(
        `INSERT INTO matches (game, round, position, ${c1}, ${c2}, status, winner, side1_name, side2_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [game.slug, round, i + 1, a, b, b === null ? 'done' : 'pending', b === null ? 1 : null, names.get(a), b === null ? null : names.get(b)]);
    }
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

// ---------- resultado de um confronto (só na rodada atual) ----------
async function loadEditableMatch(id) {
  const { rows } = await pool.query('SELECT game, round, status, archived_at, (player2_id IS NULL AND team2_id IS NULL) AS bye FROM matches WHERE id = $1', [id]);
  if (!rows[0]) throw httpErr(404, 'Confronto não encontrado.');
  if (rows[0].archived_at) throw httpErr(400, 'Esta partida está arquivada no histórico.');
  const { rows: mx } = await pool.query('SELECT MAX(round) AS r FROM matches WHERE game = $1 AND archived_at IS NULL', [rows[0].game]);
  if (rows[0].round < mx[0].r) throw httpErr(400, 'Só é possível alterar confrontos da rodada atual.');
  return rows[0];
}

async function setWinner(id, winner) { // winner: 1, 2 ou null (reabrir)
  const m = await loadEditableMatch(id);
  if (m.bye) throw httpErr(400, 'Uma folga avança automaticamente e não pode ser alterada.');
  await pool.query('UPDATE matches SET status = $1, winner = $2, finished_at = $3 WHERE id = $4',
    [winner ? 'done' : 'pending', winner, winner ? new Date() : null, id]);
}

async function deleteMatch(id) {
  const m = await loadEditableMatch(id);
  if (m.status === 'done' && !m.bye) throw httpErr(400, 'Partidas realizadas ficam no histórico e não podem ser excluídas. Reabra o confronto antes, se necessário.');
  await pool.query('DELETE FROM matches WHERE id = $1', [id]);
}

module.exports = { getBracket, drawRound, resetBracket, setWinner, deleteMatch };

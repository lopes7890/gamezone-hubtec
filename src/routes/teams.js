const router = require('express').Router();
const { pool } = require('../db');
const { wrap, adminOnly } = require('../middleware');
const { GAMES } = require('../games');
// const { publicTeam, listTeams, getTeam } = require('../services');

const { publicTeam, listTeams, getTeam, isRegistrationOpen } = require('../services');

const REG_CLOSED = 'As inscrições deste jogo estão encerradas.';
const LIMIT_MSG = 'Limite de inscrições atingido: todas as vagas do CS 1.6 foram preenchidas.';

function validMembers(members) {
  if (!Array.isArray(members) || members.length !== 5) return 'A equipe precisa ter exatamente 5 integrantes.';
  for (const m of members) {
    if (!m.name || !String(m.name).trim()) return 'Preencha o nome de todos os integrantes.';
    const s = Number(m.semester);
    if (!Number.isInteger(s) || s < 1 || s > 12) return 'Semestre inválido.';
  }
  return null;
}

async function replaceMembers(client, teamId, members) {
  await client.query('DELETE FROM members WHERE team_id = $1', [teamId]);
  for (const m of members) {
    await client.query('INSERT INTO members (team_id, name, semester) VALUES ($1, $2, $3)', [
      teamId, String(m.name).trim().slice(0, 60), Number(m.semester),
    ]);
  }
}

// ---------- públicas ----------
router.get('/api/teams', wrap(async (req, res) => res.json((await listTeams()).map(publicTeam))));

router.post('/api/teams', wrap(async (req, res) => {
  if (!(await isRegistrationOpen('cs16'))) return res.status(403).json({ error: REG_CLOSED });
  const { name, pin, members } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Informe o nome da equipe.' });
  if (!pin || String(pin).length < 4) return res.status(400).json({ error: 'O PIN precisa ter pelo menos 4 caracteres.' });
  const err = validMembers(members);
  if (err) return res.status(400).json({ error: err });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(16)'); // evita 2 inscrições simultâneas furarem o limite
    const { rows: c } = await client.query('SELECT COUNT(*)::int AS n FROM teams');
    if (c[0].n >= GAMES.cs16.maxTeams) { await client.query('ROLLBACK'); return res.status(409).json({ error: LIMIT_MSG }); }
    const { rows } = await client.query('INSERT INTO teams (name, pin) VALUES ($1, $2) RETURNING id', [name.trim().slice(0, 40), String(pin)]);
    await replaceMembers(client, rows[0].id, members);
    await client.query('COMMIT');
    res.status(201).json({ id: rows[0].id });
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return res.status(409).json({ error: 'Já existe uma equipe com esse nome.' });
    throw e;
  } finally { client.release(); }
}));

router.post('/api/teams/:id/auth', wrap(async (req, res) => {
  const team = await getTeam(req.params.id);
  if (!team || team.pin !== String(req.body.pin)) return res.status(401).json({ error: 'PIN incorreto.' });
  res.json(publicTeam(team));
}));

router.put('/api/teams/:id', wrap(async (req, res) => {
  const team = await getTeam(req.params.id);
  if (!team || team.pin !== String(req.body.pin)) return res.status(401).json({ error: 'PIN incorreto.' });
  const err = validMembers(req.body.members);
  if (err) return res.status(400).json({ error: err });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await replaceMembers(client, team.id, req.body.members);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}));

// ---------- administrador ----------
router.get('/api/admin/teams', adminOnly, wrap(async (req, res) => res.json(await listTeams())));

router.put('/api/admin/teams/:id', adminOnly, wrap(async (req, res) => {
  const { name, pin, members } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Informe o nome da equipe.' });
  const err = validMembers(members);
  if (err) return res.status(400).json({ error: err });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("UPDATE teams SET name = $1, pin = COALESCE(NULLIF($2, ''), pin) WHERE id = $3", [name.trim().slice(0, 40), pin || '', req.params.id]);
    await replaceMembers(client, req.params.id, members);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return res.status(409).json({ error: 'Já existe uma equipe com esse nome.' });
    throw e;
  } finally { client.release(); }
}));

router.delete('/api/admin/teams/:id', adminOnly, wrap(async (req, res) => {
  const locked = await pool.query("SELECT 1 FROM matches WHERE game = 'cs16' AND archived_at IS NULL LIMIT 1");
  if (locked.rowCount) return res.status(409).json({ error: 'Há um chaveamento em andamento. Reinicie o chaveamento antes de excluir equipes.' });
  await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

module.exports = router;

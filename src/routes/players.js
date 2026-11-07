const router = require('express').Router();
const { pool } = require('../db');
const { GAMES } = require('../games');
const { wrap, adminOnly } = require('../middleware');
const { listPlayers } = require('../services');

// só MK1 e FIFA 26 (jogos individuais)
function soloGame(req, res, next) {
  const g = GAMES[req.params.game];
  if (!g || g.type !== 'solo') return res.status(404).json({ error: 'Jogo inválido.' });
  req.game = g;
  next();
}

function validPlayer({ name, age }) {
  if (!name || !String(name).trim()) return 'Informe o nome.';
  const a = Number(age);
  if (!Number.isInteger(a) || a < 5 || a > 99) return 'Informe uma idade válida.';
  return null;
}
const DUP = 'Já existe um jogador com esse nome neste jogo.';

// ---------- públicas ----------
router.get('/api/games/:game/players', soloGame, wrap(async (req, res) => res.json(await listPlayers(req.game.slug))));

router.post('/api/games/:game/players', soloGame, wrap(async (req, res) => {
  const err = validPlayer(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    await pool.query('INSERT INTO players (game, name, age) VALUES ($1, $2, $3)', [req.game.slug, req.body.name.trim().slice(0, 60), Number(req.body.age)]);
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: DUP });
    throw e;
  }
}));

// ---------- administrador ----------
router.put('/api/admin/players/:id', adminOnly, wrap(async (req, res) => {
  const err = validPlayer(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    await pool.query('UPDATE players SET name = $1, age = $2 WHERE id = $3', [req.body.name.trim().slice(0, 60), Number(req.body.age), req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: DUP });
    throw e;
  }
}));

// não permite excluir participantes com chaveamento em andamento
router.delete('/api/admin/players/:id', adminOnly, wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT game FROM players WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.json({ ok: true });
  const locked = await pool.query('SELECT 1 FROM matches WHERE game = $1 AND archived_at IS NULL LIMIT 1', [rows[0].game]);
  if (locked.rowCount) return res.status(409).json({ error: 'Há um chaveamento em andamento. Reinicie o chaveamento antes de excluir jogadores.' });
  await pool.query('DELETE FROM players WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

module.exports = router;

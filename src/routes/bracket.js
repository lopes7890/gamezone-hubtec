const router = require('express').Router();
const { GAMES } = require('../games');
const { wrap, adminOnly } = require('../middleware');
const { getBracket, drawRound, resetBracket, setWinner, deleteMatch } = require('../bracket');

function game(req, res, next) {
  req.game = GAMES[req.params.game];
  return req.game ? next() : res.status(404).json({ error: 'Jogo inválido.' });
}

// pública (somente leitura)
router.get('/api/games/:game/bracket', game, wrap(async (req, res) => res.json(await getBracket(req.game))));

// administrador
router.post('/api/admin/games/:game/draw', adminOnly, game, wrap(async (req, res) => {
  await drawRound(req.game); res.json(await getBracket(req.game));
}));
router.post('/api/admin/games/:game/redraw', adminOnly, game, wrap(async (req, res) => {
  await drawRound(req.game, true); res.json(await getBracket(req.game));
}));
router.delete('/api/admin/games/:game/matches', adminOnly, game, wrap(async (req, res) => {
  await resetBracket(req.game); res.json({ ok: true });
}));

// registrar vencedor (winner 1 ou 2) ou reabrir (winner null)
router.patch('/api/admin/matches/:id', adminOnly, wrap(async (req, res) => {
  const w = req.body.winner;
  if (![1, 2, null].includes(w)) return res.status(400).json({ error: 'Vencedor inválido.' });
  await setWinner(req.params.id, w);
  res.json({ ok: true });
}));
router.delete('/api/admin/matches/:id', adminOnly, wrap(async (req, res) => {
  await deleteMatch(req.params.id); res.json({ ok: true });
}));

module.exports = router;

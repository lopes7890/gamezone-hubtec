const router = require('express').Router();
const { GAMES } = require('../games');
const { wrap, adminOnly } = require('../middleware');
const { getRegistration, setRegistration } = require('../services');

// pública: { cs16: true, mk1: false, ... }  (true = inscrições abertas)
router.get('/api/settings', wrap(async (req, res) => {
  const reg = await getRegistration();
  res.json(Object.fromEntries(Object.keys(GAMES).map((slug) => [slug, reg[slug] !== false])));
}));

// administrador: abrir/encerrar as inscrições de um jogo
router.put('/api/admin/games/:game/registration', adminOnly, wrap(async (req, res) => {
  const game = GAMES[req.params.game];
  if (!game) return res.status(404).json({ error: 'Jogo inválido.' });
  if (typeof req.body.open !== 'boolean') return res.status(400).json({ error: 'Informe open: true ou false.' });
  await setRegistration(game.slug, req.body.open);
  res.json({ ok: true, open: req.body.open });
}));

module.exports = router;
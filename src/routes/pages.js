const router = require('express').Router();
const { GAMES } = require('../games');
const REGULATIONS = require('../regulations');
// const { listTeams, publicTeam, listPlayers, getCounts } = require('../services');
const { listTeams, publicTeam, listPlayers, getCounts, getRegistration } = require('../services');
const { getBracket } = require('../bracket');

const pageWrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', pageWrap(async (req, res) => {
  const [counts, registration] = await Promise.all([getCounts(), getRegistration()]);
  res.render('index', { counts, registration, active: '/' });
}));

router.get('/jogos/:slug', pageWrap(async (req, res, next) => {
  const game = GAMES[req.params.slug];
  if (!game) return next();
  const bracket = await getBracket(game);
  const data = game.type === 'team'
    ? { teams: (await listTeams()).map(publicTeam), bracket }
    : { players: await listPlayers(game.slug), bracket };
  const registrationOpen = (await getRegistration())[game.slug] !== false;
  res.render('game', { game, active: `/jogos/${game.slug}`, rules: REGULATIONS[game.slug], registrationOpen, ...data });
}));

router.get('/cadastro', (req, res) => res.redirect('/jogos/cs16'));
router.get('/admin', (req, res) => res.render('admin', { active: '/admin' }));

module.exports = router;

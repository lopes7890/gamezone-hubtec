const { pool } = require('./db');
const { cached } = require('./cache');

// ---------- CS 1.6 ----------
const SELECT_TEAMS = `
  SELECT t.id, t.name, t.pin, t.created_at,
    COALESCE(json_agg(json_build_object('id', m.id, 'name', m.name, 'semester', m.semester)
      ORDER BY m.id) FILTER (WHERE m.id IS NOT NULL), '[]') AS members
  FROM teams t LEFT JOIN members m ON m.team_id = t.id`;

const publicTeam = ({ pin, ...t }) => t;

async function listTeams() {
  return cached('teams', async () => {
    const { rows } = await pool.query(`${SELECT_TEAMS} GROUP BY t.id ORDER BY t.created_at`);
    return rows;
  });
}

async function getTeam(id) {
  const { rows } = await pool.query(`${SELECT_TEAMS} WHERE t.id = $1 GROUP BY t.id`, [id]);
  return rows[0];
}

// ---------- jogos individuais ----------
async function listPlayers(game) {
  return cached(`players:${game}`, async () => {
    const { rows } = await pool.query('SELECT id, name, age FROM players WHERE game = $1 ORDER BY created_at, id', [game]);
    return rows;
  });
}

// ---------- inscrições abertas/encerradas ----------
async function getRegistration() { // { mk1: false, ... } só com jogos configurados; ausente = aberto
  return cached('registration', async () => {
    const { rows } = await pool.query('SELECT game, registration_open FROM game_settings');
    const map = {};
    rows.forEach((r) => { map[r.game] = r.registration_open; });
    return map;
  });
}
const isRegistrationOpen = async (slug) => (await getRegistration())[slug] !== false;

async function setRegistration(slug, open) {
  await pool.query(
    'INSERT INTO game_settings (game, registration_open) VALUES ($1, $2) ON CONFLICT (game) DO UPDATE SET registration_open = EXCLUDED.registration_open',
    [slug, open]);
}

async function getCounts() {
  return cached('counts', async () => {
    const [teams, players] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS n FROM teams'),
      pool.query('SELECT game, COUNT(*)::int AS n FROM players GROUP BY game'),
    ]);
    const counts = { cs16: teams.rows[0].n, mk1: 0, fifa26: 0 };
    players.rows.forEach((r) => { counts[r.game] = r.n; });
    return counts;
  });
}

module.exports = { publicTeam, listTeams, getTeam, listPlayers, getCounts, getRegistration, isRegistrationOpen, setRegistration };

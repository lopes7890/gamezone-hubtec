const express = require('express');
const path = require('path');
const { init } = require('./src/db');
const { GAMES } = require('./src/games');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.games = GAMES;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(require('./src/routes/pages'));
app.use(require('./src/routes/teams'));
app.use(require('./src/routes/players'));
app.use(require('./src/routes/bracket'));

app.use((req, res) => res.status(404).send('Página não encontrada.'));
app.use((err, req, res, next) => { console.error(err); res.status(500).send('Erro no servidor.'); });

init()
  .then(() => app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`)))
  .catch((e) => { console.error(e); process.exit(1); });

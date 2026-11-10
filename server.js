const express = require('express');
const path = require('path');
const { init } = require('./src/db');
const { GAMES } = require('./src/games');
const { invalidate } = require('./src/cache');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.games = GAMES;

app.use(express.json());
// arquivos estáticos (css/js/img): o navegador reaproveita por 1h em produção (sempre revalida via ETag)
app.use(express.static(path.join(__dirname, 'public'), { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

// páginas e API: o navegador sempre confirma com o servidor (ETag -> 304 se nada mudou)
app.use((req, res, next) => { res.set('Cache-Control', 'no-cache'); next(); });

// qualquer alteração bem-sucedida na API (POST/PUT/PATCH/DELETE) limpa o cache do servidor
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET') {
    const send = res.json.bind(res);
    res.json = (body) => { if (res.statusCode < 400) invalidate(); return send(body); };
  }
  next();
});
app.use(require('./src/routes/pages'));
app.use(require('./src/routes/teams'));
app.use(require('./src/routes/players'));
app.use(require('./src/routes/bracket'));
app.use(require('./src/routes/settings'));

app.use((req, res) => res.status(404).send('Página não encontrada.'));
app.use((err, req, res, next) => { console.error(err); res.status(500).send('Erro no servidor.'); });

init()
  .then(() => app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`)))
  .catch((e) => { console.error(e); process.exit(1); });

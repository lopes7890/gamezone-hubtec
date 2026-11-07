const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const wrap = (fn) => (req, res, next) =>
  fn(req, res, next).catch((e) => {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error(e);
    res.status(500).json({ error: 'Erro no servidor.' });
  });

const adminOnly = (req, res, next) =>
  req.get('x-admin-password') === ADMIN_PASSWORD
    ? next()
    : res.status(401).json({ error: 'Senha de administrador incorreta.' });

module.exports = { wrap, adminOnly };

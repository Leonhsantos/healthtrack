const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('Defina JWT_SECRET no arquivo .env');
  process.exit(1);
}

const assinar = (u) => jwt.sign({ id: u.id, tipo: u.tipo }, SECRET, { expiresIn: '7d' });

function exigirLogin(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Faça login para continuar' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ erro: 'Sessão inválida ou expirada' });
  }
}

const exigirTipo = (tipo) => (req, res, next) =>
  req.user.tipo === tipo ? next() : res.status(403).json({ erro: 'Acesso negado para este tipo de conta' });

module.exports = { assinar, exigirLogin, exigirTipo };

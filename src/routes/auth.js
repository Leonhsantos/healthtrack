const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { assinar, exigirLogin } = require('../auth');
const { wrap, duplicado } = require('../util');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// RF01 - cadastro
router.post('/cadastro', wrap(async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  const tipo = req.body.tipo;
  const esp = String(req.body.especialidade || '').trim();

  if (nome.length < 2 || nome.length > 120) return res.status(400).json({ erro: 'Informe seu nome' });
  if (!EMAIL.test(email)) return res.status(400).json({ erro: 'E-mail inválido' });
  if (senha.length < 6) return res.status(400).json({ erro: 'A senha precisa ter ao menos 6 caracteres' });
  if (!['aluno', 'profissional'].includes(tipo)) return res.status(400).json({ erro: 'Escolha o tipo de conta' });
  if (tipo === 'profissional' && !esp) return res.status(400).json({ erro: 'Informe sua especialidade' });

  const hash = await bcrypt.hash(senha, 10);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const u = (await client.query(
      'INSERT INTO usuario (nome, email, senha_hash, tipo) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, tipo',
      [nome, email, hash, tipo]
    )).rows[0];
    if (tipo === 'profissional') {
      await client.query('INSERT INTO profissional (usuario_id, especialidade) VALUES ($1, $2)', [u.id, esp.slice(0, 60)]);
    }
    await client.query('COMMIT');
    res.status(201).json({ token: assinar(u), usuario: u });
  } catch (e) {
    await client.query('ROLLBACK');
    if (duplicado(e)) return res.status(409).json({ erro: 'Este e-mail já está cadastrado' });
    throw e;
  } finally {
    client.release();
  }
}));

// RF02 - login
router.post('/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  const u = (await pool.query('SELECT id, nome, email, tipo, senha_hash FROM usuario WHERE email = $1', [email])).rows[0];
  const ok = u && (await bcrypt.compare(senha, u.senha_hash));
  if (!ok) return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
  delete u.senha_hash;
  res.json({ token: assinar(u), usuario: u });
}));

router.get('/me', exigirLogin, wrap(async (req, res) => {
  const u = (await pool.query('SELECT id, nome, email, tipo FROM usuario WHERE id = $1', [req.user.id])).rows[0];
  if (!u) return res.status(401).json({ erro: 'Usuário não encontrado' });
  res.json(u);
}));

module.exports = router;

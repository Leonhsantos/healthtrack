const router = require('express').Router();
const pool = require('../db');
const { wrap, periodo } = require('../util');
const { indicadores, registrosDoPeriodo } = require('../stats');

// RN05: só quem tem vínculo AUTORIZADO acessa o aluno
async function exigirVinculo(req, res, next) {
  try {
    const r = await pool.query(
      `SELECT 1 FROM vinculo v JOIN profissional p ON p.id = v.profissional_id
        WHERE p.usuario_id = $1 AND v.aluno_id = $2 AND v.status = 'autorizado'`,
      [req.user.id, req.params.id]
    );
    if (!r.rowCount) return res.status(403).json({ erro: 'Este aluno não autorizou o seu acesso' });
    next();
  } catch (e) {
    next(e);
  }
}

// RF10 - alunos que autorizaram
router.get('/alunos', wrap(async (req, res) => {
  const r = await pool.query(
    `SELECT u.id, u.nome, u.email
       FROM vinculo v
       JOIN profissional p ON p.id = v.profissional_id
       JOIN usuario u ON u.id = v.aluno_id
      WHERE p.usuario_id = $1 AND v.status = 'autorizado'
      ORDER BY u.nome`,
    [req.user.id]
  );
  res.json(r.rows);
}));

router.get('/alunos/:id/dashboard', exigirVinculo, wrap(async (req, res) => {
  const { inicio, fim } = periodo(req.query);
  res.json(await indicadores(req.params.id, inicio, fim));
}));

router.get('/alunos/:id/registros', exigirVinculo, wrap(async (req, res) => {
  const { inicio, fim } = periodo(req.query);
  res.json(await registrosDoPeriodo(req.params.id, inicio, fim));
}));

// Relatórios compartilhados com este profissional
router.get('/relatorios', wrap(async (req, res) => {
  const r = await pool.query(
    `SELECT r.id, r.periodo_inicio, r.periodo_fim, r.treinos, r.dias_registrados, r.dias_seguindo_plano,
            rc.compartilhado_em, u.nome AS aluno_nome
       FROM relatorio_compartilhado rc
       JOIN relatorio r ON r.id = rc.relatorio_id
       JOIN vinculo v ON v.id = rc.vinculo_id
       JOIN profissional p ON p.id = v.profissional_id
       JOIN usuario u ON u.id = r.aluno_id
      WHERE p.usuario_id = $1 AND v.status = 'autorizado'
      ORDER BY rc.compartilhado_em DESC`,
    [req.user.id]
  );
  res.json(r.rows);
}));

module.exports = router;

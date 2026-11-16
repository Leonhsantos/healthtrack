const router = require('express').Router();
const pool = require('../db');
const { wrap } = require('../util');

// RF08 - lista os vínculos do aluno
router.get('/', wrap(async (req, res) => {
  const r = await pool.query(
    `SELECT v.id, v.status, v.solicitado_em, v.autorizado_em, v.revogado_em, u.nome, u.email, p.especialidade
       FROM vinculo v
       JOIN profissional p ON p.id = v.profissional_id
       JOIN usuario u ON u.id = p.usuario_id
      WHERE v.aluno_id = $1
      ORDER BY v.solicitado_em DESC`,
    [req.user.id]
  );
  res.json(r.rows);
}));

// Convida um profissional pelo e-mail (fica "pendente" até o aluno autorizar)
router.post('/', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const prof = (await pool.query(
    `SELECT p.id FROM profissional p JOIN usuario u ON u.id = p.usuario_id WHERE u.email = $1`,
    [email]
  )).rows[0];
  if (!prof) return res.status(404).json({ erro: 'Nenhum profissional cadastrado com este e-mail' });

  const r = await pool.query(
    `INSERT INTO vinculo (aluno_id, profissional_id) VALUES ($1, $2)
     ON CONFLICT (aluno_id, profissional_id)
     DO UPDATE SET status = 'pendente', revogado_em = NULL WHERE vinculo.status = 'revogado'
     RETURNING id`,
    [req.user.id, prof.id]
  );
  if (!r.rowCount) return res.status(409).json({ erro: 'Este profissional já está na sua lista' });
  res.status(201).json(r.rows[0]);
}));

// Autorizar ou revogar (RN05, RN06)
router.patch('/:id', wrap(async (req, res) => {
  const { status } = req.body;
  if (!['autorizado', 'revogado'].includes(status)) return res.status(400).json({ erro: 'Status inválido' });
  const r = await pool.query(
    `UPDATE vinculo
        SET status = $1::text,
            autorizado_em = CASE WHEN $1::text = 'autorizado' THEN NOW() ELSE autorizado_em END,
            revogado_em   = CASE WHEN $1::text = 'revogado' THEN NOW() ELSE NULL END
      WHERE id = $2 AND aluno_id = $3 RETURNING id, status`,
    [status, req.params.id, req.user.id]
  );
  if (!r.rowCount) return res.status(404).json({ erro: 'Vínculo não encontrado' });
  res.json(r.rows[0]);
}));

module.exports = router;

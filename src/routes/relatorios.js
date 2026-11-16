const router = require('express').Router();
const pool = require('../db');
const { exigirTipo } = require('../auth');
const { wrap, isData } = require('../util');
const { indicadores, registrosDoPeriodo } = require('../stats');
const { gerarPdf } = require('../pdf');

const soAluno = exigirTipo('aluno');

router.get('/', soAluno, wrap(async (req, res) => {
  const r = await pool.query(
    `SELECT id, periodo_inicio, periodo_fim, treinos, dias_registrados, dias_seguindo_plano, gerado_em
       FROM relatorio WHERE aluno_id = $1 ORDER BY gerado_em DESC`,
    [req.user.id]
  );
  res.json(r.rows);
}));

// RF07 - gerar relatório do período
router.post('/', soAluno, wrap(async (req, res) => {
  const { inicio, fim } = req.body;
  if (!isData(inicio) || !isData(fim)) return res.status(400).json({ erro: 'Informe as datas do período' });
  if (fim < inicio) return res.status(400).json({ erro: 'A data final não pode ser anterior à inicial' });
  const ind = await indicadores(req.user.id, inicio, fim);
  if (ind.dias_registrados === 0) return res.status(400).json({ erro: 'Não há registros neste período' }); // RN08
  const r = await pool.query(
    `INSERT INTO relatorio (aluno_id, periodo_inicio, periodo_fim, treinos, dias_registrados, dias_seguindo_plano)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [req.user.id, inicio, fim, ind.treinos, ind.dias_registrados, ind.dias_seguindo_plano]
  );
  res.status(201).json(r.rows[0]);
}));

// RF09 - compartilhar com um profissional que o aluno autorizou
router.post('/:id/compartilhar', soAluno, wrap(async (req, res) => {
  const rel = await pool.query('SELECT id FROM relatorio WHERE id = $1 AND aluno_id = $2', [req.params.id, req.user.id]);
  if (!rel.rowCount) return res.status(404).json({ erro: 'Relatório não encontrado' });
  const vin = await pool.query(
    `SELECT id FROM vinculo WHERE id = $1 AND aluno_id = $2 AND status = 'autorizado'`,
    [req.body.vinculo_id, req.user.id]
  );
  if (!vin.rowCount) return res.status(400).json({ erro: 'Escolha um profissional autorizado' });
  await pool.query(
    `INSERT INTO relatorio_compartilhado (relatorio_id, vinculo_id) VALUES ($1, $2)
     ON CONFLICT (relatorio_id, vinculo_id) DO NOTHING`,
    [req.params.id, req.body.vinculo_id]
  );
  res.status(201).json({ ok: true });
}));

// PDF: o dono ou um profissional autorizado a quem o relatório foi compartilhado (RN05, RN06)
router.get('/:id/pdf', wrap(async (req, res) => {
  const rel = (await pool.query(
    `SELECT r.*, u.nome AS aluno_nome FROM relatorio r JOIN usuario u ON u.id = r.aluno_id WHERE r.id = $1`,
    [req.params.id]
  )).rows[0];
  if (!rel) return res.status(404).json({ erro: 'Relatório não encontrado' });

  let permitido = req.user.tipo === 'aluno' && rel.aluno_id === req.user.id;
  if (req.user.tipo === 'profissional') {
    const c = await pool.query(
      `SELECT 1 FROM relatorio_compartilhado rc
         JOIN vinculo v ON v.id = rc.vinculo_id
         JOIN profissional p ON p.id = v.profissional_id
        WHERE rc.relatorio_id = $1 AND p.usuario_id = $2 AND v.status = 'autorizado'`,
      [rel.id, req.user.id]
    );
    permitido = c.rowCount > 0;
  }
  if (!permitido) return res.status(403).json({ erro: 'Você não tem acesso a este relatório' });

  const regs = await registrosDoPeriodo(rel.aluno_id, rel.periodo_inicio, rel.periodo_fim);
  gerarPdf(res, rel, rel.aluno_nome, regs);
}));

module.exports = router;

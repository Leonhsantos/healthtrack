const router = require('express').Router();
const pool = require('../db');
const { wrap, isData, periodo, duplicado } = require('../util');

const ALIM = ['seguiu', 'parcial', 'nao_seguiu'];

// Regras RN01 a RN03
function validar(b) {
  if (!isData(b.data)) return { erro: 'Informe uma data válida' };
  const academia = b.academia === true;
  let duracao = null;
  if (academia) {
    duracao = Number(b.duracao_minutos);
    if (!Number.isInteger(duracao) || duracao <= 0 || duracao > 600)
      return { erro: 'Informe a duração do treino em minutos (de 1 a 600)' };
  }
  if (!ALIM.includes(b.alimentacao)) return { erro: 'Escolha como foi a alimentação' };
  const obs = String(b.observacao || '').trim().slice(0, 1000);
  return { valores: [b.data, academia, duracao, b.alimentacao, obs || null] };
}

// RF04 - consultar
router.get('/', wrap(async (req, res) => {
  const { inicio, fim } = periodo(req.query);
  const r = await pool.query(
    `SELECT id, data, academia, duracao_minutos, alimentacao, observacao
       FROM registro_diario WHERE usuario_id = $1 AND data BETWEEN $2 AND $3 ORDER BY data DESC`,
    [req.user.id, inicio, fim]
  );
  res.json(r.rows);
}));

// RF03 - criar
router.post('/', wrap(async (req, res) => {
  const v = validar(req.body);
  if (v.erro) return res.status(400).json({ erro: v.erro });
  try {
    const r = await pool.query(
      `INSERT INTO registro_diario (usuario_id, data, academia, duracao_minutos, alimentacao, observacao)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [req.user.id, ...v.valores]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (duplicado(e)) return res.status(409).json({ erro: 'Já existe um registro nesta data. Use "Editar" na lista.' });
    throw e;
  }
}));

// RF04 - editar
router.put('/:id', wrap(async (req, res) => {
  const v = validar(req.body);
  if (v.erro) return res.status(400).json({ erro: v.erro });
  try {
    const r = await pool.query(
      `UPDATE registro_diario
          SET data = $1, academia = $2, duracao_minutos = $3, alimentacao = $4, observacao = $5, atualizado_em = NOW()
        WHERE id = $6 AND usuario_id = $7 RETURNING id`,
      [...v.valores, req.params.id, req.user.id]
    );
    if (!r.rowCount) return res.status(404).json({ erro: 'Registro não encontrado' });
    res.json(r.rows[0]);
  } catch (e) {
    if (duplicado(e)) return res.status(409).json({ erro: 'Já existe outro registro nesta data' });
    throw e;
  }
}));

module.exports = router;

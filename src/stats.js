const pool = require('./db');

// Indicadores do dashboard e dos relatórios (RF05, RF06, RF07)
async function indicadores(alunoId, inicio, fim) {
  const geral = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE academia)::int                  AS treinos,
            COUNT(*)::int                                          AS dias_registrados,
            COUNT(*) FILTER (WHERE alimentacao = 'seguiu')::int    AS dias_seguindo_plano,
            COUNT(*) FILTER (WHERE alimentacao = 'parcial')::int   AS dias_parcial,
            COALESCE(SUM(duracao_minutos), 0)::int                 AS minutos
       FROM registro_diario
      WHERE usuario_id = $1 AND data BETWEEN $2 AND $3`,
    [alunoId, inicio, fim]
  );
  const semanas = await pool.query(
    `SELECT to_char(date_trunc('week', data), 'YYYY-MM-DD')        AS semana,
            COUNT(*) FILTER (WHERE academia)::int                  AS treinos,
            COUNT(*)::int                                          AS registros
       FROM registro_diario
      WHERE usuario_id = $1 AND data BETWEEN $2 AND $3
      GROUP BY 1 ORDER BY 1`,
    [alunoId, inicio, fim]
  );
  return { inicio, fim, ...geral.rows[0], semanas: semanas.rows };
}

const registrosDoPeriodo = async (alunoId, inicio, fim) =>
  (
    await pool.query(
      `SELECT id, data, academia, duracao_minutos, alimentacao, observacao
         FROM registro_diario
        WHERE usuario_id = $1 AND data BETWEEN $2 AND $3
        ORDER BY data DESC`,
      [alunoId, inicio, fim]
    )
  ).rows;

module.exports = { indicadores, registrosDoPeriodo };

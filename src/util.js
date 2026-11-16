// Repassa erros de funções async para o tratador de erros do Express
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const isData = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
};

const hojeISO = () => new Date().toISOString().slice(0, 10);

const somarDias = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Período vindo da URL (?inicio=&fim=). Padrão: últimos 30 dias.
const periodo = (q) => {
  const fim = isData(q.fim) ? q.fim : hojeISO();
  const inicio = isData(q.inicio) ? q.inicio : somarDias(fim, -29);
  return { inicio, fim };
};

const duplicado = (e) => e && e.code === '23505';
const fmtData = (s) => String(s).slice(0, 10).split('-').reverse().join('/');

module.exports = { wrap, isData, periodo, duplicado, fmtData };

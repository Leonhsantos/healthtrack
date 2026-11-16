require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('./src/db');
const { exigirLogin, exigirTipo } = require('./src/auth');

const app = express();
app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/registros', exigirLogin, exigirTipo('aluno'), require('./src/routes/registros'));
app.use('/api/dashboard', exigirLogin, exigirTipo('aluno'), require('./src/routes/dashboard'));
app.use('/api/vinculos', exigirLogin, exigirTipo('aluno'), require('./src/routes/vinculos'));
app.use('/api/relatorios', exigirLogin, require('./src/routes/relatorios'));
app.use('/api/profissional', exigirLogin, exigirTipo('profissional'), require('./src/routes/profissional'));

app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno. Tente novamente.' });
});

async function iniciar() {
  // Cria as tabelas se ainda não existirem
  await pool.query(fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8'));
  const porta = process.env.PORT || 3000;
  app.listen(porta, () => console.log(`HealthTrack no ar: http://localhost:${porta}`));
}

iniciar().catch((e) => {
  console.error('Não foi possível iniciar:', e.message);
  process.exit(1);
});

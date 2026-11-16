require('dotenv').config();
const { Pool, types } = require('pg');

// Devolve colunas DATE como texto "2026-09-24" (evita problemas de fuso horário)
types.setTypeParser(1082, (v) => v);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Defina DATABASE_URL no arquivo .env');
  process.exit(1);
}
const local = /localhost|127\.0\.0\.1/.test(url);

module.exports = new Pool({
  connectionString: url,
  ssl: local ? false : { rejectUnauthorized: false },
});

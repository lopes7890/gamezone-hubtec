const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// cria as tabelas (com tentativas, para esperar o banco subir)
async function init() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  for (let i = 1; i <= 10; i++) {
    try { await pool.query(sql); console.log('Banco conectado.'); return; }
    catch (e) { console.log(`Aguardando banco (${i}/10): ${e.message}`); await new Promise((r) => setTimeout(r, 3000)); }
  }
  throw new Error('Não foi possível conectar ao banco.');
}

module.exports = { pool, init };

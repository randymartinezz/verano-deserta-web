const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,                    // single connection per function instance
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => {
      console.error('Unexpected Postgres pool error:', err.message);
    });
  }
  return pool;
}

module.exports = { getPool };

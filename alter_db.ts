import { db } from './src/db.js';

async function run() {
  await db.initialize();
  const pool = (db as any).pool;
  await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_alterada BOOLEAN DEFAULT FALSE');
  console.log("DB altered");
  process.exit(0);
}

run().catch(console.error);

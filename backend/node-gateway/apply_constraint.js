require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || 'grc_copilot',
  user: process.env.PG_USER || 'grc_user',
  password: process.env.PG_PASSWORD,
});

async function run() {
  try {
    console.log('Adding UNIQUE constraint to risks table...');
    await pool.query('ALTER TABLE risks DROP CONSTRAINT IF EXISTS unique_assessment_control');
    await pool.query('ALTER TABLE risks ADD CONSTRAINT unique_assessment_control UNIQUE (assessment_id, control_id)');
    console.log('Constraint added successfully.');
  } catch (err) {
    console.error('Failed to add constraint:', err.message);
  } finally {
    await pool.end();
  }
}

run();

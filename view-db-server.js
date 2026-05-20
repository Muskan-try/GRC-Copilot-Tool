const express = require('express');
const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();

const pgPool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: 5432,
  database: 'grc_copilot',
  user: 'grc_user',
  password: 'grc_secure_password_2025',
});

async function getPostgresData() {
  const tables = ['users', 'organizations', 'assessments', 'frameworks', 'controls', 'questions', 'responses', 'risks', 'control_mappings', 'insurance_requirements'];
  const data = {};

  for (const table of tables) {
    try {
      const countResult = await pgPool.query(`SELECT COUNT(*) FROM ${table}`);
      const sampleResult = await pgPool.query(`SELECT * FROM ${table} LIMIT 5`);
      data[table] = {
        total_rows: parseInt(countResult.rows[0].count),
        sample: sampleResult.rows
      };
    } catch (err) {
      console.error(`Error fetching ${table}:`, err.message);
      data[table] = { total_rows: 0, sample: [] };
    }
  }

  return data;
}

async function getMongoData() {
  const client = new MongoClient('mongodb://localhost:27017/grc_copilot');
  const collections = ['questionbanks', 'assessmentquestionnaires', 'assessmentresponses', 'evidencefiles', 'reports', 'questions'];
  const data = {};

  try {
    await client.connect();
    const db = client.db();

    for (const collection of collections) {
      try {
        const count = await db.collection(collection).countDocuments();
        const sample = await db.collection(collection).find().limit(5).toArray();
        data[collection] = {
          total_docs: count,
          sample: sample
        };
      } catch (err) {
        console.error(`Error fetching ${collection}:`, err.message);
        data[collection] = { total_docs: 0, sample: [] };
      }
    }
  } finally {
    await client.close();
  }

  return data;
}

app.get('/api/database', async (req, res) => {
  try {
    const postgresql = await getPostgresData();
    const mongodb = await getMongoData();
    res.json({ postgresql, mongodb });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'view-db.html'));
});

const PORT = 3001;
app.listen(PORT, async () => {
  console.log(`Database Viewer running at http://localhost:${PORT}`);
  
  // Auto-open in browser
  try {
    const open = (await import('open')).default;
    open(`http://localhost:${PORT}`);
  } catch (e) {
    // Fallback for Linux
    const { exec } = require('child_process');
    exec('xdg-open http://localhost:3001');
  }
});

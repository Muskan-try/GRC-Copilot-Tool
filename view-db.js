const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const fs = require('fs');

const pgPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'grc_copilot',
  user: 'grc_user',
  password: 'grc_secure_password_2025',
});

async function viewDatabase() {
  console.log('=== GRC Copilot Database Viewer ===\n');

  // PostgreSQL Data
  console.log('--- PostgreSQL Tables ---\n');

  const pgTables = [
    'users', 'organizations', 'assessments', 'frameworks',
    'controls', 'questions', 'responses', 'risks',
    'control_mappings', 'insurance_requirements'
  ];

  const pgData = {};

  for (const table of pgTables) {
    try {
      const result = await pgPool.query(`SELECT * FROM ${table} LIMIT 5`);
      const countResult = await pgPool.query(`SELECT COUNT(*) FROM ${table}`);
      pgData[table] = {
        total_rows: parseInt(countResult.rows[0].count),
        sample: result.rows
      };
      console.log(`${table}: ${countResult.rows[0].count} rows`);
    } catch (err) {
      console.log(`${table}: Error - ${err.message}`);
    }
  }

  // MongoDB Data
  console.log('\n--- MongoDB Collections ---\n');

  const mongoClient = new MongoClient('mongodb://localhost:27017/grc_copilot');
  await mongoClient.connect();
  const db = mongoClient.db();

  const mongoCollections = [
    'questionbanks', 'assessmentquestionnaires', 'assessmentresponses',
    'evidencefiles', 'reports', 'questions'
  ];

  const mongoData = {};

  for (const collection of mongoCollections) {
    try {
      const count = await db.collection(collection).countDocuments();
      const sample = await db.collection(collection).find().limit(2).toArray();
      mongoData[collection] = {
        total_docs: count,
        sample: sample
      };
      console.log(`${collection}: ${count} documents`);
    } catch (err) {
      console.log(`${collection}: Error - ${err.message}`);
    }
  }

  await mongoClient.close();
  await pgPool.end();

  // Save to file
  const output = {
    postgresql: pgData,
    mongodb: mongoData,
    generated_at: new Date().toISOString()
  };

  fs.writeFileSync('database-export.json', JSON.stringify(output, null, 2));
  console.log('\n✓ Full data exported to: database-export.json');
}

viewDatabase().catch(console.error);

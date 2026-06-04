const { query } = require('./config/postgres');
query('SELECT id, policy_name, policy_type, file_url, status, compliance_score, ai_analysis_report, created_at FROM policies WHERE org_id = $1 ORDER BY created_at DESC', ['b7cbb6b7-f53d-48c0-8bd5-13bb32ba19dc'])
  .then(res => console.log('SUCCESS! ROWS COUNT:', res.rows.length, 'FIRST ROW:', res.rows[0]))
  .catch(err => console.error('QUERY FAILED:', err));

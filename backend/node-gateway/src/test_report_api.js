const { connectPostgres } = require('./config/postgres');
const { connectMongo } = require('./config/mongo');
const reportingService = require('./modules/reporting/services/reporting.service');

async function run() {
  await connectPostgres();
  await connectMongo();
  
  console.log('Fetching report data...');
  const data = await reportingService.generateReportData('00b83954-c38d-4839-99ee-7fea534ac93c', 'aa711fca-c978-4d30-8460-26790e674580');
  console.log('REPORT KEYS:', Object.keys(data));
  console.log('POLICY HUB DOCUMENTS COUNT:', data.policy_hub_documents?.length);
  console.log('POLICY HUB DOCUMENTS:', JSON.stringify(data.policy_hub_documents, null, 2));
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('FAILED:', err);
    process.exit(1);
  });

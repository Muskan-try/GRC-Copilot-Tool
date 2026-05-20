const request = require('supertest');
const app = require('./src/server');
const { query } = require('./src/config/postgres');

let token;
let assessmentId;
let questionId;

async function runTests() {
  console.log('--- STARTING V2 E2E TESTS ---');
  
  // Wait for DB connections and migrations
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 1. Create a User and Login
  console.log('1. Registering user...');
  const email = `test_${Date.now()}@example.com`;
  const resAuth = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'Password123!', org_name: 'Test Org' });
  
  if (resAuth.statusCode !== 201) {
    console.error('Registration failed:', resAuth.body);
    process.exit(1);
  }
  token = resAuth.body.token;

  // 2. Create Assessment (V2)
  console.log('2. Creating V2 Assessment...');
  const resCreate = await request(app)
    .post('/api/v2/assessment/create')
    .set('Authorization', `Bearer ${token}`)
    .send({
      organization_name: 'Test Org',
      selected_frameworks: ['GDPR', 'SOC 2'],
      scope: { departments: ['Engineering'] }
    });

  if (resCreate.statusCode !== 201) {
    console.error('Create assessment failed:', resCreate.body);
    process.exit(1);
  }
  assessmentId = resCreate.body.id;
  console.log(`Assessment created: ${assessmentId}`);

  // 3. Get Questions (Smart Mapped)
  console.log('3. Getting Questions...');
  const resQuestions = await request(app)
    .get(`/api/v2/questionnaire/assessment/${assessmentId}/questions`)
    .set('Authorization', `Bearer ${token}`);
  
  if (resQuestions.statusCode !== 200) {
    console.error('Get questions failed:', resQuestions.body);
    process.exit(1);
  }
  
  const domains = resQuestions.body.questions;
  console.log(`Retrieved ${domains.length} domains.`);
  
  const firstQuestion = domains[0]?.controls[0]?.questions[0];
  if (!firstQuestion) {
    console.error('No questions found!');
    process.exit(1);
  }
  questionId = firstQuestion.question_id;

  // 4. Submit Response
  console.log('4. Submitting Response...');
  const resResponse = await request(app)
    .post(`/api/v2/questionnaire/assessment/${assessmentId}/response`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      question_id: questionId,
      answer_index: 0, // Yes
      answer_text: 'We have documented everything.'
    });

  if (resResponse.statusCode !== 200) {
    console.error('Submit response failed:', resResponse.body);
    process.exit(1);
  }
  console.log('Response submitted and scores recalculated.');

  // 5. Get Gaps
  console.log('5. Getting Gaps...');
  const resGaps = await request(app)
    .get(`/api/v2/assessment/${assessmentId}/gaps`)
    .set('Authorization', `Bearer ${token}`);
  
  if (resGaps.statusCode !== 200) {
    console.error('Get gaps failed:', resGaps.body);
    process.exit(1);
  }
  console.log(`Found ${resGaps.body.summary.missing_count} missing controls.`);

  // 6. Get Dashboard
  console.log('6. Getting Dashboard...');
  const resDash = await request(app)
    .get(`/api/v2/assessment/${assessmentId}/dashboard`)
    .set('Authorization', `Bearer ${token}`);
  
  if (resDash.statusCode !== 200) {
    console.error('Get dashboard failed:', resDash.body);
    process.exit(1);
  }
  console.log(`Dashboard compliance score: ${resDash.body.stats.compliance_percentage}%`);

  // 7. Get Insurance Score
  console.log('7. Getting Insurance Score...');
  const resIns = await request(app)
    .get(`/api/v2/assessment/${assessmentId}/insurance-score`)
    .set('Authorization', `Bearer ${token}`);
  
  if (resIns.statusCode !== 200) {
    console.error('Get insurance score failed:', resIns.body);
    process.exit(1);
  }
  console.log(`Insurance Readiness: ${resIns.body.overall_readiness_score}%`);

  // 8. Get Report
  console.log('8. Generating Report...');
  const resReport = await request(app)
    .get(`/api/v2/reporting/assessment/${assessmentId}?format=json`)
    .set('Authorization', `Bearer ${token}`);
  
  if (resReport.statusCode !== 200) {
    console.error('Get report failed:', resReport.body);
    process.exit(1);
  }
  console.log('Report generated successfully!');

  console.log('--- ALL TESTS PASSED ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

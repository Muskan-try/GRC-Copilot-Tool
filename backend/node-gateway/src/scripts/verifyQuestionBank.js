const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/grc_copilot';

const QuestionBankSchema = new mongoose.Schema({
  question_id: String,
  framework: String,
  domain: String,
  depth_levels: [String],
});

const QuestionBank = mongoose.model('QuestionBank', QuestionBankSchema);

async function verify() {
  await mongoose.connect(MONGO_URI);
  const frameworks = await QuestionBank.distinct('framework');
  
  console.log('\n=== Question Bank Verification ===\n');
  console.log('Framework                                      | Total | Quick | Standard | Comprehensive');
  console.log('-'.repeat(95));
  
  for (const fw of frameworks.sort()) {
    const total = await QuestionBank.countDocuments({ framework: fw });
    const quick = await QuestionBank.countDocuments({ framework: fw, depth_levels: 'quick' });
    const standard = await QuestionBank.countDocuments({ framework: fw, depth_levels: 'standard' });
    const comprehensive = await QuestionBank.countDocuments({ framework: fw, depth_levels: 'comprehensive' });
    const pad = ' '.repeat(47 - fw.length);
    console.log(`${fw}${pad}| ${String(total).padStart(5)} | ${String(quick).padStart(5)} | ${String(standard).padStart(8)} | ${String(comprehensive).padStart(13)}`);
  }
  
  const grandTotal = await QuestionBank.countDocuments();
  console.log('-'.repeat(95));
  console.log(`GRAND TOTAL${' '.repeat(36)}| ${String(grandTotal).padStart(5)}`);
  
  await mongoose.disconnect();
  process.exit(0);
}

verify().catch(err => { console.error(err); process.exit(1); });

require('dotenv').config();
const { callDeepSeek } = require('./src/services/ai.service');

async function test() {
  console.log('Testing DeepSeek API with NEW KEY...');
  console.log('Using API URL:', process.env.DEEPSEEK_API_URL);
  console.log('Using MODEL:', process.env.DEEPSEEK_MODEL);

  const systemPrompt = "You are a helpful assistant. Return JSON object with a 'message' field.";
  const userPrompt = "Say hello and confirm you are working!";

  try {
    const result = await callDeepSeek(systemPrompt, userPrompt);
    if (result) {
      console.log('SUCCESS! Response from DeepSeek:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error('FAILED to get a response from DeepSeek. Check logs/errors.');
    }
  } catch (error) {
    console.error('An error occurred during testing:', error.message);
  }
}

test();

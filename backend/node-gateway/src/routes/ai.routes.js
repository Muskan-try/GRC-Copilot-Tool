const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { callDeepSeek } = require('../services/ai.service');
const { authenticate } = require('../middleware/auth');

router.post('/chat', authenticate, [
  body('message').trim().notEmpty().withMessage('Message required').isLength({ max: 2000 }).withMessage('Message too long'),
  body('history').optional().isArray({ max: 50 }).withMessage('History must be an array (max 50 items)'),
  body('context.orgName').optional().trim().isLength({ max: 200 }),
  body('context.framework').optional().trim().isLength({ max: 200 }),
  body('context.score').optional().isNumeric(),
  body('context.riskLevel').optional().trim().isLength({ max: 50 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { message, history, context } = req.body;

    const systemPrompt = `You are a GRC (Governance, Risk, and Compliance) Assistant. 
    You help users understand security frameworks like ISO 27001, GDPR, NIST, etc.
    Current Context:
    - User Organization: ${context?.orgName || 'Unknown'}
    - Framework: ${context?.framework || 'General GRC'}
    - Compliance Score: ${context?.score || '0'}%
    - Risk Level: ${context?.riskLevel || 'Unknown'}

    Rules:
    - Be professional, technical, and helpful.
    - Keep responses concise but informative.
    - Return a JSON object with a "reply" field.`;

    const userPrompt = `History: ${JSON.stringify(history || [])}\nUser Message: ${message}`;

    let result = await callDeepSeek(systemPrompt, userPrompt, 1000);
    
    if (!result || !result.reply) {
      // Rule-based engine if AI fails
      const msg = message.toLowerCase();
      let reply = "";

      if (msg.includes("score") || msg.includes("compliance")) {
        reply = `Your current compliance score for the ${context?.framework || 'assessment'} is ${context?.score || 0}%. This is calculated based on the controls you've addressed so far.`;
      } else if (msg.includes("risk")) {
        reply = `Your current risk level is rated as ${context?.riskLevel || 'Unknown'}. You can see the specific risks identified in the 'Risk Identified' section above.`;
      } else if (msg.includes("remediation") || msg.includes("cost") || msg.includes("fix")) {
        reply = `To improve your score, I recommend looking at the 'Actions to Take' section. The total estimated remediation cost is approximately what's shown in your financial summary.`;
      } else if (msg.includes("insurance")) {
        reply = `Based on your ${context?.score}% score, your cyber insurance requirement is currently ${context?.riskLevel === 'Low' ? 'Optional' : 'Recommended/Required'}. Check the insurance card for coverage limits.`;
      } else if (msg.includes("hello") || msg.includes("hi")) {
        reply = `Hello! I'm your GRC Assistant. I've analyzed ${context?.orgName}'s assessment for ${context?.framework}. How can I help you improve your security posture today?`;
      } else {
        reply = `I'm here to help with your ${context?.framework} journey. You can ask me about your compliance score, identified risks, or remediation steps. How can I assist you further?`;
      }
      
      result = { reply };
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

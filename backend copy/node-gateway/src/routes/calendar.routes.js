const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const calendar = require('../services/calendar.service');
const audit = require('../services/audit.service');
const router = express.Router();

const VALID_TYPES = ['audit_date', 'certification_expiry', 'policy_review', 'regulatory_filing', 'custom'];

// GET /api/calendar/events — list events
router.get('/events', authenticate, async (req, res, next) => {
  try {
    const { type, status, from, to, year, month } = req.query;
    const events = await calendar.listEvents(req.user.user_id, { type, status, from, to, year, month });
    res.json({ events });
  } catch (err) { next(err); }
});

// GET /api/calendar/events/:id — single event
router.get('/events/:id', authenticate, async (req, res, next) => {
  try {
    const event = await calendar.getEvent(req.params.id, req.user.user_id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) { next(err); }
});

// POST /api/calendar/events — create event
router.post('/events', authenticate, [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('event_type').isIn(VALID_TYPES).withMessage(`Type must be one of: ${VALID_TYPES.join(', ')}`),
  body('event_date').isDate().withMessage('Valid event_date required (YYYY-MM-DD)'),
  body('reminder_days').optional().isInt({ min: 0, max: 365 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    const event = await calendar.createEvent(req.user.user_id, req.body);
    await audit.log(req.user.user_id, 'calendar.event_create', 'compliance_event', event.id,
      { title: req.body.title, event_type: req.body.event_type, event_date: req.body.event_date }, req).catch(() => {});
    res.status(201).json(event);
  } catch (err) { next(err); }
});

// PUT /api/calendar/events/:id
router.put('/events/:id', authenticate, async (req, res, next) => {
  try {
    const event = await calendar.updateEvent(req.params.id, req.user.user_id, req.body);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) { next(err); }
});

// DELETE /api/calendar/events/:id
router.delete('/events/:id', authenticate, async (req, res, next) => {
  try {
    const deleted = await calendar.deleteEvent(req.params.id, req.user.user_id);
    if (!deleted) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) { next(err); }
});

module.exports = router;

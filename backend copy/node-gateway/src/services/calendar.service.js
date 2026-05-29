const { query } = require('../config/postgres');

async function createEvent(userId, data) {
  const { title, event_type, description, event_date, reminder_days, framework, status } = data;
  const result = await query(
    `INSERT INTO compliance_events (user_id, title, event_type, description, event_date, reminder_days, framework, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'upcoming')) RETURNING *`,
    [userId, title, event_type, description, event_date, reminder_days || 30, framework || null, status || 'upcoming']
  );
  return result.rows[0];
}

async function getEvent(eventId, userId) {
  const result = await query(
    'SELECT * FROM compliance_events WHERE id = $1 AND user_id = $2',
    [eventId, userId]
  );
  return result.rows[0] || null;
}

async function listEvents(userId, { type, status, from, to, year, month } = {}) {
  const conditions = ['user_id = $1'];
  const params = [userId];
  let idx = 2;

  if (type) { conditions.push(`event_type = $${idx++}`); params.push(type); }
  if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
  if (from) { conditions.push(`event_date >= $${idx++}`); params.push(from); }
  if (to) { conditions.push(`event_date <= $${idx++}`); params.push(to); }
  if (year && month) {
    conditions.push(`EXTRACT(YEAR FROM event_date) = $${idx++}`);
    params.push(year);
    conditions.push(`EXTRACT(MONTH FROM event_date) = $${idx++}`);
    params.push(month);
  }

  const result = await query(
    `SELECT * FROM compliance_events WHERE ${conditions.join(' AND ')} ORDER BY event_date ASC`,
    params
  );
  return result.rows;
}

async function updateEvent(eventId, userId, data) {
  const fields = [];
  const params = [];
  let idx = 1;

  for (const key of ['title', 'event_type', 'description', 'event_date', 'reminder_days', 'framework', 'status']) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      params.push(data[key]);
    }
  }
  if (fields.length === 0) return null;
  fields.push('updated_at = NOW()');
  params.push(eventId, userId);

  const result = await query(
    `UPDATE compliance_events SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx++} RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

async function deleteEvent(eventId, userId) {
  const result = await query(
    'DELETE FROM compliance_events WHERE id = $1 AND user_id = $2 RETURNING id',
    [eventId, userId]
  );
  return result.rows.length > 0;
}

async function getUpcomingReminders() {
  // Find events where reminder is due but not yet sent
  const result = await query(
    `SELECT ce.*, u.email
     FROM compliance_events ce
     JOIN users u ON u.id = ce.user_id
     WHERE ce.is_reminded = false
       AND ce.event_date <= (NOW() + (ce.reminder_days || ' days')::INTERVAL)
       AND ce.status = 'upcoming'
     ORDER BY ce.event_date ASC`
  );
  return result.rows;
}

async function markReminded(eventId) {
  await query(
    'UPDATE compliance_events SET is_reminded = true WHERE id = $1',
    [eventId]
  );
}

module.exports = {
  createEvent, getEvent, listEvents, updateEvent, deleteEvent,
  getUpcomingReminders, markReminded,
};

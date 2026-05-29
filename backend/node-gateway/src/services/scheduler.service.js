const cron = require('node-cron');
const { query } = require('../config/postgres');
const logger = require('../config/logger');
const calendar = require('./calendar.service');

let cronTask = null;

function start() {
  if (cronTask) return;
  logger.info('Starting compliance scheduler...');

  cronTask = cron.schedule('0 8 * * *', async () => {
    logger.info('Scheduler: checking calendar reminders...');
    try {
      await processCalendarReminders();
      logger.info('Scheduler: daily check complete');
    } catch (err) {
      logger.error('Scheduler error:', err.message);
    }
  });

  logger.info('Compliance scheduler started (daily 8:00 AM)');
}

function stop() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('Compliance scheduler stopped');
  }
}

async function processCalendarReminders() {
  try {
    const dueReminders = await calendar.getUpcomingReminders();
    for (const event of dueReminders) {
      await query(
        `INSERT INTO notifications (user_id, title, message, notification_type, link)
         VALUES ($1, $2, $3, $4, $5)`,
        [event.user_id, `Upcoming: ${event.title}`,
         `${event.title} is due on ${event.event_date}. ${event.description || ''}`,
         'reminder', null]
      );
      await calendar.markReminded(event.id);
      logger.info(`Calendar reminder sent for event ${event.id}: ${event.title}`);
    }
  } catch (err) {
    logger.error('Calendar reminder processing error:', err.message);
  }
}

module.exports = { start, stop };

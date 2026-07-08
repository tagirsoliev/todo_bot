import { config } from '../config.js';

// Quiet-hours check (groundwork for a future hourly auto-broadcast).
// Returns true when `date` falls within [WORK_START, WORK_END) in the configured
// time zone (default 08:00–21:00, Asia/Tashkent). Not invoked anywhere yet.
export function isWorkingHour(date: Date = new Date()): boolean {
  // Hour (0–23) in the target time zone, independent of the server's zone.
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone,
    hour: 'numeric',
    hour12: false,
  }).format(date);

  let hour = Number(hourStr);
  if (hour === 24) hour = 0; // some environments return 24 for midnight

  return hour >= config.workStart && hour < config.workEnd;
}

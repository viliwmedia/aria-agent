const db = require('./db');

function workingDaysBetween(start, end) {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function isWeekday(d) {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

function buildSummary(monthKey) {
  const mk = monthKey || db.todayISO().slice(0, 7);
  const rows = db.getMonthEntries(mk);
  const totals = rows.reduce((acc, r) => {
    acc.dials += r.dials; acc.appts += r.appts; acc.shows += r.shows; acc.closes += r.closes;
    return acc;
  }, { dials: 0, appts: 0, shows: 0, closes: 0 });

  const showRate = totals.appts > 0 ? +(totals.shows / totals.appts * 100).toFixed(1) : 0;
  const closeRate = totals.shows > 0 ? +(totals.closes / totals.shows * 100).toFixed(1) : 0;
  const settings = db.getSettings();

  const result = {
    month: mk,
    totals,
    show_rate_pct: showRate,
    close_rate_pct: closeRate,
    goal: settings ? { type: settings.goal_type, target: settings.goal_number } : null,
    pace: null,
  };

  if (settings) {
    const goalVal = { appointments: totals.appts, shows: totals.shows, closes: totals.closes }[settings.goal_type];
    const [y, m] = mk.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0);
    const now = new Date();
    const isCurrentMonth = mk === db.todayISO().slice(0, 7);
    const asOf = isCurrentMonth ? now : monthEnd;

    const totalWorkingDays = workingDaysBetween(monthStart, monthEnd);
    const workingDaysElapsed = Math.max(workingDaysBetween(monthStart, asOf), 1);
    const workingDaysRemaining = isCurrentMonth
      ? Math.max(workingDaysBetween(asOf, monthEnd) - 1, 0) + (isWeekday(asOf) ? 1 : 0)
      : 0;

    const remaining = Math.max(settings.goal_number - goalVal, 0);
    const dailyAvg = +(goalVal / workingDaysElapsed).toFixed(2);
    const requiredPerDay = workingDaysRemaining > 0 ? +(remaining / workingDaysRemaining).toFixed(2) : remaining;
    const projected = Math.round(goalVal + dailyAvg * workingDaysRemaining);

    let status = 'on_pace';
    if (goalVal >= settings.goal_number) status = 'target_hit';
    else if (projected < settings.goal_number * 0.85) status = 'behind';
    else if (projected < settings.goal_number) status = 'at_risk';

    result.pace = {
      current_value: goalVal,
      target: settings.goal_number,
      pct_to_goal: settings.goal_number > 0 ? +Math.min(goalVal / settings.goal_number * 100, 100).toFixed(1) : 0,
      working_days_total: totalWorkingDays,
      working_days_elapsed: workingDaysElapsed,
      working_days_remaining: workingDaysRemaining,
      current_daily_avg: dailyAvg,
      required_per_remaining_day: requiredPerDay,
      projected_month_end: projected,
      status,
    };

    if (totals.dials > 0 && goalVal > 0 && settings.goal_type !== 'closes') {
      const convRate = goalVal / totals.dials;
      result.pace.required_dials_per_day = convRate > 0 ? Math.ceil(requiredPerDay / convRate) : null;
    }
  }

  return result;
}

const definitions = [
  {
    name: 'log_activity',
    description: "Add activity numbers to the user's tracked totals for a date. Use when the user reports what they did (e.g. 'made 40 dials, booked 6 appointments'). Values ADD to whatever is already logged for that date.",
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD. Defaults to today.' },
        dials: { type: 'number' },
        appointments_set: { type: 'number' },
        shows: { type: 'number', description: 'Appointments that were held.' },
        closes: { type: 'number', description: 'Deals closed.' },
      },
    },
  },
  {
    name: 'correct_entry',
    description: "Overwrite (not add to) the numbers for a date. Use when the user fixes a mistake, e.g. 'actually I did 12 dials not 20'.",
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD. Defaults to today.' },
        dials: { type: 'number' },
        appointments_set: { type: 'number' },
        shows: { type: 'number' },
        closes: { type: 'number' },
      },
      required: ['date'],
    },
  },
  {
    name: 'delete_entry',
    description: "Delete a day's entry entirely.",
    input_schema: {
      type: 'object',
      properties: { date: { type: 'string', description: 'YYYY-MM-DD' } },
      required: ['date'],
    },
  },
  {
    name: 'get_performance_summary',
    description: "Get totals, conversion rates, and monthly-goal pace math (required per day, projected month-end, status). Call this any time the user asks how they're doing or what they need to hit goal. Never do the pace math yourself.",
    input_schema: {
      type: 'object',
      properties: { month: { type: 'string', description: 'YYYY-MM. Defaults to current month.' } },
    },
  },
  {
    name: 'get_recent_entries',
    description: 'List recently logged daily entries, most recent first.',
    input_schema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Defaults to 15.' } },
    },
  },
  {
    name: 'set_monthly_goal',
    description: "Set or update the user's monthly goal metric and target number.",
    input_schema: {
      type: 'object',
      properties: {
        goal_type: { type: 'string', enum: ['appointments', 'shows', 'closes'] },
        goal_number: { type: 'number' },
      },
      required: ['goal_type', 'goal_number'],
    },
  },
];

function execute(name, input) {
  switch (name) {
    case 'log_activity': return db.addActivity(input);
    case 'correct_entry': return db.correctEntry(input);
    case 'delete_entry': return { deleted: db.deleteEntry(input.date) };
    case 'get_performance_summary': return buildSummary(input.month);
    case 'get_recent_entries': return db.getRecentEntries(input.limit || 15);
    case 'set_monthly_goal': return db.setGoal(input.goal_type, input.goal_number);
    default: return { error: `Unknown tool: ${name}` };
  }
}

module.exports = { definitions, execute, buildSummary };

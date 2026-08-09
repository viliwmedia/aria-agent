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
    goal: settings ? { type: settings.goal_type, target: settings.goal_number, revenue_per_close: settings.revenue_per_close || null } : null,
    pace: null,
  };

  if (settings) {
    const isIncome = settings.goal_type === 'income';
    const revenuePerClose = settings.revenue_per_close || 0;
    const goalVal = isIncome
      ? +(totals.closes * revenuePerClose).toFixed(2)
      : { appointments: totals.appts, shows: totals.shows, closes: totals.closes }[settings.goal_type];

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

    if (isIncome && revenuePerClose > 0) {
      // Back-calculate the full activity ladder needed to hit the income
      // target: closes -> shows -> appointments -> dials, each derived from
      // this month's real conversion rates so the numbers reflect actual
      // performance, not a generic assumption.
      const requiredClosesPerDay = +(requiredPerDay / revenuePerClose).toFixed(2);
      result.pace.revenue_per_close = revenuePerClose;
      result.pace.required_closes_per_day = requiredClosesPerDay;

      if (closeRate > 0) {
        result.pace.required_shows_per_day = +(requiredClosesPerDay / (closeRate / 100)).toFixed(2);
      }
      if (showRate > 0 && result.pace.required_shows_per_day) {
        result.pace.required_appts_per_day = +(result.pace.required_shows_per_day / (showRate / 100)).toFixed(2);
      }
      if (totals.dials > 0 && totals.appts > 0 && result.pace.required_appts_per_day) {
        const apptsPerDial = totals.appts / totals.dials;
        result.pace.required_dials_per_day = apptsPerDial > 0
          ? Math.ceil(result.pace.required_appts_per_day / apptsPerDial)
          : null;
      }
    } else if (totals.dials > 0 && goalVal > 0 && settings.goal_type !== 'closes') {
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
    description: "Set or update the user's monthly goal. For 'income', goal_number is the dollar income target and revenue_per_close (dollars earned per closed deal) is required so the required daily activity (closes, shows, appointments, dials) can be back-calculated from real conversion rates. For other types, goal_number is a plain count.",
    input_schema: {
      type: 'object',
      properties: {
        goal_type: { type: 'string', enum: ['appointments', 'shows', 'closes', 'income'] },
        goal_number: { type: 'number', description: 'Target count, or dollar income target if goal_type is income.' },
        revenue_per_close: { type: 'number', description: 'Required when goal_type is income: average dollars earned per closed deal.' },
      },
      required: ['goal_type', 'goal_number'],
    },
  },
  {
    name: 'save_note',
    description: "Save a fact about the user's job, role, targets, product, commission structure, or anything else they want remembered and available in every future conversation. Use this whenever the user shares context worth retaining long-term (not just this conversation) \u2014 e.g. 'my commission is 20%', 'my manager is Sarah', 'we sell a $3k/mo SaaS product'. Don't ask permission first, just save it and confirm briefly.",
    input_schema: {
      type: 'object',
      properties: { content: { type: 'string', description: 'The fact to remember, written as a short standalone statement.' } },
      required: ['content'],
    },
  },
  {
    name: 'get_notes',
    description: "List saved facts about the user. Usually unnecessary \u2014 known facts are already included in your instructions \u2014 but useful if the user asks what you know or have saved about them.",
    input_schema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Defaults to 50.' } },
    },
  },
  {
    name: 'delete_note',
    description: 'Delete a previously saved fact by its id (get the id from get_notes).',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
  {
    name: 'create_event',
    description: "Create an event or reminder at a specific date and time. Once push notifications are enabled on the user's device, they'll be notified at that time. Always resolve relative times ('tomorrow at 3pm', 'in two hours') to an absolute date and time yourself using the current date and time given in your instructions, and pass event_at in 'YYYY-MM-DD HH:MM' 24-hour format.",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title, e.g. "Follow up with Acme Corp".' },
        event_at: { type: 'string', description: "Absolute date and time as 'YYYY-MM-DD HH:MM' in 24-hour format." },
        notes: { type: 'string', description: 'Optional extra detail.' },
      },
      required: ['title', 'event_at'],
    },
  },
  {
    name: 'update_event',
    description: 'Change the title, time, or notes of an existing event. Get the id from list_events.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        event_at: { type: 'string', description: "'YYYY-MM-DD HH:MM' 24-hour format." },
        notes: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_event',
    description: 'Cancel/delete an event by id.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
  {
    name: 'list_events',
    description: "List the user's upcoming events/reminders, soonest first. Use this whenever they ask what's on their schedule, what's coming up, or before creating an event to check for conflicts.",
    input_schema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Defaults to 20.' } },
    },
  },
  {
    name: 'search_conversations',
    description: "Search everything the user has ever said or been told, across all past conversations \u2014 not just the recent messages you can already see. Use this when they reference something from further back than your current context, like 'what did I tell you about the Meridian deal' or 'did we already talk about pricing'.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', description: 'Defaults to 20.' },
      },
      required: ['query'],
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
    case 'set_monthly_goal': return db.setGoal(input.goal_type, input.goal_number, input.revenue_per_close);
    case 'save_note': return db.addNote(input.content);
    case 'get_notes': return db.getNotes(input.limit || 50);
    case 'delete_note': return { deleted: db.deleteNote(input.id) };
    case 'create_event': return db.createEvent({ title: input.title, event_at: parseEventTime(input.event_at), notes: input.notes });
    case 'update_event': return db.updateEvent(input.id, {
      title: input.title,
      event_at: input.event_at ? parseEventTime(input.event_at) : undefined,
      notes: input.notes,
    });
    case 'delete_event': return { deleted: db.deleteEvent(input.id) };
    case 'list_events': return db.listUpcomingEvents(input.limit || 20).map(formatEventOut);
    case 'search_conversations': return db.searchHistory(input.query, input.limit || 20);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// Converts the 'YYYY-MM-DD HH:MM' string Claude sends into a stored epoch ms.
function parseEventTime(str) {
  const d = new Date(String(str).replace(' ', 'T'));
  if (isNaN(d.getTime())) throw new Error(`Could not parse event time: ${str}`);
  return d.getTime();
}

function formatEventOut(e) {
  return { id: e.id, title: e.title, event_at: new Date(e.event_at).toISOString(), notes: e.notes };
}

module.exports = { definitions, execute, buildSummary };

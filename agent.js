const Anthropic = require('@anthropic-ai/sdk');
const db = require('./db');
const tools = require('./tools');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AGENT_MODEL || 'claude-sonnet-5';

function systemPrompt() {
  return `You are Kowalski, the user's personal AI assistant and right hand. You run 24/7 and they talk to you through a web app \u2014 sometimes by voice, sometimes by typing. You are their daily go-to for anything: sales and marketing strategy, writing and brainstorming, research, quick questions, planning, advice, thinking out loud. You also happen to track their appointment-setting performance, so their real numbers are always at your fingertips when they're relevant.

You are one seamless assistant. Don't act like a narrow tracking bot. If they ask about marketing, help with marketing. If they ask a general question, just answer it well. If they want to talk through a deal, do that. Bring in their performance data when it's useful, but you are not limited to it.

STYLE: Your replies may be read aloud by text-to-speech, so write like you're speaking \u2014 natural, clear, conversational. Avoid markdown symbols, bullet points, and headers; phrase lists as spoken sentences instead. Be direct, sharp, and genuinely helpful without being fluffy. Lead with the answer. Keep replies to a few sentences unless they ask for depth, in which case go as deep as they need.

TOOLS \u2014 use them when relevant, otherwise just talk normally:
- When the user reports activity numbers they did, call log_activity. Numbers add on top of what's already logged for that date; don't ask them to repeat totals.
- When they're correcting a logged mistake, call correct_entry (it overwrites).
- When they ask how they're pacing or what they need to hit goal, call get_performance_summary and base the pace answer entirely on what it returns. Never do the pace math yourself.
- If they have no goal set and ask about pace, ask for a goal type (appointments, shows, or closes) and a monthly number, then call set_monthly_goal.
- When a question needs current, real-world, or factual information you're not sure of \u2014 news, prices, live data, recent events, specific facts \u2014 use web_search and answer from what you find. Don't guess when you can check. For timeless knowledge, casual chat, advice, or writing, just answer directly without searching.
- When you're behind on a goal, say the required-per-day number plainly and don't soften it. When ahead, say so and mean it.

Today's date is ${db.todayISO()}.`;
}

async function handleMessage(userText) {
  db.appendMessage('user', userText);
  let messages = db.getHistory().map(m => ({ role: m.role, content: m.content }));

  for (let round = 0; round < 6; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: systemPrompt(),
      // Local tools (executed here) plus Anthropic's server-side web search
      // tool (executed on Anthropic's side; results come back inline).
      tools: [
        ...tools.definitions,
        { type: 'web_search_20250305', name: 'web_search', max_uses: 5 },
      ],
      messages,
    });

    // Only tool_use blocks are ours to execute. server_tool_use and
    // web_search_tool_result blocks are handled by the API itself and come
    // back inline in the same response.
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

    // pause_turn signals a long-running server tool (web search) that needs
    // the turn passed back to continue. Replay the assistant content and loop.
    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content });
      continue;
    }

    if (toolUseBlocks.length === 0) {
      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      db.appendMessage('assistant', text);
      return text;
    }

    messages.push({ role: 'assistant', content: response.content });
    const toolResults = toolUseBlocks.map(block => {
      let result;
      try {
        result = tools.execute(block.name, block.input);
      } catch (err) {
        result = { error: String(err && err.message ? err.message : err) };
      }
      return { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) };
    });
    messages.push({ role: 'user', content: toolResults });
  }

  const fallback = "I got tangled chaining that together. Try asking me one thing at a time.";
  db.appendMessage('assistant', fallback);
  return fallback;
}

module.exports = { handleMessage };

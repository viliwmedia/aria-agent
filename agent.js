const Anthropic = require('@anthropic-ai/sdk');
const db = require('./db');
const tools = require('./tools');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AGENT_MODEL || 'claude-sonnet-5';

function systemPrompt() {
  const notes = db.getNotesForPrompt(40);
  const knowledgeBlock = notes
    ? `\n\nKNOWN FACTS ABOUT THE USER (saved from past conversations or entered manually \u2014 treat these as ground truth):\n${notes}`
    : '';
  const now = new Date();
  const nowStr = now.toLocaleString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

  return `You are Kawalski, the user's personal AI assistant and right hand. You run 24/7 and they talk to you through a web app \u2014 sometimes by voice, sometimes by typing. You are their daily go-to for anything: sales and marketing strategy, writing and brainstorming, research, quick questions, planning, advice, thinking out loud. You also happen to track their appointment-setting performance and manage their calendar of events, so their real numbers and schedule are always at your fingertips when they're relevant.

You are one seamless assistant with full access to their data \u2014 performance numbers, saved facts, events, and past conversations. Don't act like a narrow tracking bot, and don't make them repeat things you can look up yourself. If they ask about marketing, help with marketing. If they ask a general question, just answer it well. If they want to talk through a deal, do that.

STYLE: Your replies may be read aloud by text-to-speech, so write like you're speaking \u2014 natural, clear, conversational. Avoid markdown symbols, bullet points, and headers; phrase lists as spoken sentences instead. Be direct, sharp, and genuinely helpful without being fluffy. Lead with the answer. Keep replies to a few sentences unless they ask for depth, in which case go as deep as they need.

TOOLS \u2014 use them proactively when relevant, otherwise just talk normally:
- When the user reports activity numbers they did, call log_activity. Numbers add on top of what's already logged for that date; don't ask them to repeat totals.
- When they're correcting a logged mistake, call correct_entry (it overwrites).
- When they ask how they're pacing or what they need to hit goal, call get_performance_summary and base the pace answer entirely on what it returns. Never do the pace math yourself.
- If they have no goal set and ask about pace, ask what kind of goal: a plain count (appointments, shows, or closes) or an income target. If income, you also need their average revenue per closed deal so the required daily activity can be calculated \u2014 ask for it, then call set_monthly_goal with goal_type "income".
- When the goal is income-based, get_performance_summary returns a full activity ladder: required closes/day, shows/day, appointments/day, and dials/day, each derived from their real conversion rates this month. Use those numbers, don't estimate your own.
- Whenever the user shares a durable fact about their job, targets, product, commission, or context worth remembering going forward, call save_note. Do this proactively, without asking permission.
- When the user wants to schedule, plan, or be reminded of something, call create_event. Always resolve relative times ("tomorrow at 3", "in two hours") into an absolute date and time yourself using the current date and time given below, and pass it as 'YYYY-MM-DD HH:MM'. If they haven't enabled notifications yet and this is their first event, mention once that they'll need to tap "Enable Notifications" in the app for reminders to actually alert them \u2014 the event is saved either way.
- When they ask what's coming up, call list_events. Use update_event or delete_event to change or cancel something.
- If the user references something from further back than you can see in this conversation, call search_conversations before saying you don't know.
- When a question needs current, real-world, or factual information you're not sure of \u2014 news, prices, live data, recent events, specific facts \u2014 use web_search and answer from what you find. Don't guess when you can check. For timeless knowledge, casual chat, advice, or writing, just answer directly without searching.
- When you're behind on a goal, say the required-per-day number plainly and don't soften it. When ahead, say so and mean it.

The current date and time is ${nowStr}.${knowledgeBlock}`;
}

// Builds the Anthropic content-block array for the current user turn,
// mixing in any attached images alongside the text.
function buildUserContent(text, images) {
  const content = [];
  if (images && images.length) {
    for (const img of images) {
      content.push({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } });
    }
  }
  content.push({ type: 'text', text: text && text.trim() ? text : '(see attached image)' });
  return content;
}

// onToken, if provided, is called with each text delta as Claude generates
// it, so the caller can stream partial output to the client immediately
// instead of waiting for the whole reply \u2014 this is what makes replies feel
// fast: the first sentence can be shown/spoken while later ones are still
// being generated. Tool-use rounds still complete in full before the next
// round starts (a tool call can't run on a partial JSON input), but any
// text Claude produces alongside or after tool calls streams immediately.
async function handleMessage(userText, images, onToken) {
  const imageNote = images && images.length ? ' [image attached]' : '';
  // Persist a small inline preview (first image only, to keep the row light)
  // so refreshing the page still shows what was attached.
  const previewImage = images && images[0] ? `data:${images[0].media_type};base64,${images[0].data}` : null;
  db.appendMessage('user', userText + imageNote, previewImage);

  let messages = db.getHistory().map(m => ({ role: m.role, content: m.content }));
  // Swap in the real multimodal content for the message we just sent, this
  // request only \u2014 older turns stay text-only in context to control cost.
  if (images && images.length) {
    messages[messages.length - 1] = { role: 'user', content: buildUserContent(userText, images) };
  }

  let fullReplyText = '';

  for (let round = 0; round < 6; round++) {
    const stream = anthropic.messages.stream({
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

    if (onToken) {
      stream.on('text', (delta) => { fullReplyText += delta; onToken(delta); });
    }

    const response = await stream.finalMessage();
    if (!onToken) {
      // Non-streaming callers (if any): accumulate this round's text directly.
      fullReplyText += response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    }

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
      const text = fullReplyText.trim();
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
  if (onToken) onToken(fallback);
  return fallback;
}

module.exports = { handleMessage };

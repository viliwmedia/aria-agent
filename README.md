# ARIA · Personal Agent + Setter HUD

A voice-enabled, JARVIS-style web app with ARIA — your general-purpose daily
assistant. Ask her anything: sales and marketing strategy, research, writing,
brainstorming, quick questions, planning. She also tracks your
appointment-setting performance and coaches you to your monthly goal, with
your real numbers always on tap. Talk to her (by voice or text), she talks
back, and a live dashboard shows your pace. Accessible from any device with a
browser — phone, desktop, anywhere — with full memory of everything you've
discussed.

## What's in the box

- **General assistant (ARIA)** — powered by the Claude API, with memory
  across sessions. One seamless assistant for anything you need day to day,
  who also happens to know your performance numbers cold.
- **Web search** — ARIA can look up current info (news, prices, live research,
  recent facts) and answer with sources. She decides when a question needs a
  search versus a direct answer.
- **Voice input** — tap the mic, speak, it transcribes and responds.
- **Spoken responses** — ARIA reads its replies aloud, with a **Narration
  toggle** in the top bar to turn the voice on or off any time.
- **Live dashboard** — pace ring (% to goal), required-per-day, projected
  month-end, status, and your KPIs (dials, appointments, show rate, close
  rate), all updating as you log.
- **Manual entry** — a Quick Log form on the dashboard, plus you can just
  tell ARIA in plain language ("did 40 dials, 6 sets today").
- **One database** — everything (numbers, goal, conversation) persists in a
  local SQLite file.

Voice input and speech both use the browser's built-in Web Speech API, so
there's no extra voice service to pay for or configure. Works best in Chrome
and Edge; Safari supports speech output but voice *input* can be spotty.

## 1. Get an Anthropic API key

Create one at https://console.anthropic.com — this is `ANTHROPIC_API_KEY`.
This is billed separately from any Claude.ai subscription; it's metered
pay-as-you-go per token. Usage here is light, but it is a real cost.

## 2. Configure

```
cp .env.example .env
```

Set `ANTHROPIC_API_KEY`. Optionally set `APP_PASSWORD` to a shared secret so
the app asks for a password before letting anyone in — recommended if it's
going to live at a public URL, since otherwise anyone with the link can talk
to it and see your numbers.

## 3. Run locally

```
npm install
npm start
```

Open http://localhost:3000. Set a goal (top-right EDIT on the goal panel, or
just tell ARIA), then start logging.

Note: browsers only allow microphone access on `localhost` or over HTTPS. On
localhost you're fine; once deployed, make sure it's served over HTTPS (the
hosts below all do this automatically) or the mic won't work.

## 4. Deploy so it runs 24/7 and you can reach it anywhere

You want this at a real URL so your phone can reach it from anywhere. All of
these give you HTTPS out of the box:

**Railway** (simplest)
1. Push this folder to a GitHub repo.
2. https://railway.app → New Project → Deploy from GitHub repo.
3. Add a **Volume** mounted at `/data`, and set env var
   `DATABASE_PATH=/data/setter.db` (without a volume your data resets on
   every redeploy).
4. Add `ANTHROPIC_API_KEY` (and `APP_PASSWORD` if you want one) as env vars.
5. Deploy. Railway gives you a public HTTPS URL — open it on any device.

**Render** — New → Web Service from your repo; build `npm install`, start
`npm start`; add a persistent disk mounted at `/data` and the same env vars.

**Fly.io** — `fly launch`, create a volume with `fly volumes create`, set the
env vars with `fly secrets set`, then `fly deploy`.

Once deployed, bookmark the URL on your phone's home screen and it behaves
like an app.

## Talking to ARIA

By voice (tap mic) or text. Performance tracking:
> "did 42 dials today, set 5 appointments, 2 showed"
> "how am I looking for the month?"
> "what do I need per day to hit goal?"
> "my goal is 60 appointments this month"
> "actually today was 12 dials not 20"

Anything else — she's your general assistant:
> "help me write a follow-up email to a prospect who went quiet"
> "give me three cold-open angles for a LinkedIn DM"
> "what's a good framework for handling the 'I need to think about it' objection?"
> "what's the news on [company] — are they hiring?" (uses web search)
> "brainstorm a promo idea for this month"
> "explain how a marketing funnel should feed my setting pipeline"

## Customizing ARIA's personality

The entire personality lives in the `systemPrompt()` function in `agent.js`.
Edit it to make ARIA blunter, warmer, funnier — whatever fits how you want
to be coached. You can also rename ARIA there.

## A note on data & privacy

Everything is stored in your own SQLite database on your own host. Your
messages are sent to the Anthropic API to generate responses (as with any
use of Claude), but the data itself lives only where you deploy this. If you
set `APP_PASSWORD`, keep it to yourself.

## Later: auto-importing your numbers

Right now you enter numbers by voice, text, or the Quick Log form. If your
raw activity lives somewhere with an export (a CSV, a sheet), a small import
endpoint could batch it in automatically. Ask when you're ready and it can
be added.

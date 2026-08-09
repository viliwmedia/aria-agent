# Kawalski · Personal Agent + Setter HUD

A voice-enabled, JARVIS-style web app with Kawalski — your general-purpose
daily assistant. Ask him anything: sales and marketing strategy, research,
writing, brainstorming, quick questions, planning. He also tracks your
appointment-setting performance, coaches you to your monthly goal (including
income-based goals with a full required-activity breakdown), plans events and
reminds you at the right time, and remembers anything you tell him
permanently. Talk to him (by voice, hands-free, or text), he talks back, and
a live dashboard shows your pace. Accessible from any device with a browser —
phone, desktop, anywhere.

## What's in the box

- **General assistant (Kawalski)** — powered by the Claude API, with full
  memory across sessions. One seamless assistant for anything you need day
  to day, who also happens to know your performance numbers cold.
- **Full data access** — Kawalski can read and write everything himself:
  log and correct activity, set goals, save facts, plan events, and search
  every past conversation you've ever had with him. You rarely need to touch
  the dashboard directly.
- **Web search** — Kawalski can look up current info (news, prices, live
  research, recent facts) and answer with sources.
- **Income goals** — set a monthly dollar target and your revenue per close,
  and Kawalski back-calculates the full activity ladder (required closes,
  shows, appointments, and dials per day) from your real conversion rates.
- **Events & push reminders** — tell him to remind you of something and he
  resolves the time and saves it. With VAPID keys configured (see below), he
  can push a real notification to your device when it's due — even if the
  tab isn't open.
- **Knowledge base** — a permanent memory of facts about your job, saved
  either by telling him directly or through the KNOWLEDGE panel, always
  included in his context.
- **Hands-free voice** — tap the mic once and it stays in a continuous
  back-and-forth conversation; he keeps listening after each reply.
- **Spoken responses** — a **Narration toggle** in the top bar turns his
  voice on or off, and a voice picker lets you choose the installed voice.
- **Live dashboard** — pace ring, required-per-day, projected month-end,
  status, and your KPIs, all updating as you log.
- **One database** — everything persists in a local SQLite file.

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

### Push notifications (optional, for event reminders)

Kawalski can create events and remind you at the right time via a real push
notification, even if the app tab isn't open. This needs two keys:

```
npm install
node generate-vapid-keys.js
```

Copy the two lines it prints into your `.env` (or your host's environment
variables):
```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

Without these set, events still save and Kawalski can still talk about
your schedule — you just won't get an actual push notification when the
time comes. Once the keys are set and the app is deployed over HTTPS, open
the **EVENTS** panel in the app and tap **Enable Notifications** on each
device you want reminders on (notifications are per-browser, per-device —
enable it separately on your phone and your desktop).

## 3. Run locally

```
npm install
npm start
```

Open http://localhost:3000. Set a goal (top-right EDIT on the goal panel, or
just tell Kawalski), then start logging.

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

## Talking to Kawalski

By voice (tap the mic once for a hands-free back-and-forth — he keeps
listening after each reply, no need to tap again between turns) or text.

Performance tracking:
> "did 42 dials today, set 5 appointments, 2 showed"
> "how am I looking for the month?"
> "my goal is $8000 this month, I make $500 per close"
> "actually today was 12 dials not 20"

Scheduling and reminders:
> "remind me to follow up with Acme tomorrow at 3pm"
> "what's on my schedule this week?"
> "cancel the Acme reminder"

Memory:
> "remember that my commission is 20% of first month revenue"
> "what do you know about my job so far?"
> "what did I tell you about the Meridian deal?" (searches all past conversations)

Anything else — he's your general assistant:
> "help me write a follow-up email to a prospect who went quiet"
> "give me three cold-open angles for a LinkedIn DM"
> "what's a good framework for handling the 'I need to think about it' objection?"
> "what's the news on [company] — are they hiring?" (uses web search)
> "brainstorm a promo idea for this month"
> "explain how a marketing funnel should feed my setting pipeline"

## Customizing Kawalski's personality

The entire personality lives in the `systemPrompt()` function in `agent.js`.
Edit it to make Kawalski blunter, warmer, funnier — whatever fits how you want
to be coached. You can also rename Kawalski there.

## A note on data & privacy

Everything is stored in your own SQLite database on your own host. Your
messages are sent to the Anthropic API to generate responses (as with any
use of Claude), but the data itself lives only where you deploy this. If you
set `APP_PASSWORD`, keep it to yourself.

## What's still ahead

- **Polish-accented voice** — browser text-to-speech only offers voices by
  language, not accent-on-a-different-language, so there's no built-in way
  to get English spoken with a Polish accent. The real path is a premium
  voice service like ElevenLabs (a small per-character cost). Parked for
  later by request.
- **Auto-importing your numbers** — if your raw activity lives somewhere
  with an export (a CSV, a sheet, Slack), a small import endpoint could
  batch it in automatically instead of manual/voice entry.

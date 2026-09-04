# CampusOS

**AI Build Hackathon — AUST CSE Carnival 8.0**

A campus data manager and an AI agent sitting on top of the same live database. Edit a room's capacity or post an announcement in the dashboard, then ask the agent about it in the panel beside it — it already knows, because every tool call reads the database at the moment it runs.

---

## Project overview

CampusOS holds five campus systems — class schedules, rooms, events, announcements and assignment deadlines — in a SQLite database seeded from the provided JSON files on first boot. The dashboard lists all five and supports add, edit and delete on every one of them; changes are written to the database and appear in the interface immediately with no manual refresh. The assistant lives behind the round button in the bottom-right corner, and talks to a language model with **real function calling**: it has fifteen tools that query and mutate that same database, and it decides which to call. Because those tools run SQL at call time and nothing is cached, a change made in the dashboard a second earlier is what the agent reads.

The agent also handles the awkward cases. It checks announcements against the timetable and tells you when a notice has moved a class. It refuses to book a room that already has a booking or a scheduled class in that window, and says what is in the way. When a request is too vague to act on — "just book me any room tomorrow afternoon" — it asks which room and which hours instead of guessing. And it declines to touch another student's registrations or bookings.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | JavaScript |
| Database | SQLite via `better-sqlite3` — file-based, zero setup, persists across restarts |
| LLM | Google Gemini (`gemini-3.6-flash`) by default; OpenAI and Groq also supported |
| Tool calling | Native function calling, called over the provider's REST API |
| Styling | Hand-written CSS, no UI framework |

Four dependencies in total. There is no cloud database to provision and no account to create — clone, install, add one API key, run.

## Setup

```bash
git clone https://github.com/fairuz-anadi/cse-carnival-hampton.git
cd cse-carnival-hampton

npm install

cp .env.example .env       # Windows: copy .env.example .env
# open .env and set ONE model key (see below)

npm run dev
```

Open **http://localhost:3000**.

**Which key to use.** Any one of Groq, OpenAI or Google works. If you are picking one now, use **Groq** — it is free and its limits are generous. Google's free tier allows only **20 requests per day**, and one agent question costs 2–4 requests, so a fresh Google key runs dry after roughly six questions.

```
LLM_PROVIDER=groq
GROQ_API_KEY=your_key_here
```

## Deploy to Render (One-Click)

CampusOS is ready for production deployment on Render (free tier available):

1. Go to https://render.com and sign in with GitHub
2. Click **"New +"** → **"Web Service"**  
3. Search for `fairuz-anadi/cse-carnival-hampton` and connect
4. Configure:
   - **Build:** `npm ci && npm run build`
   - **Start:** `npm start`
   - **Add one API key** (Groq recommended, free)
5. Deploy — live in 3–5 minutes

[See full deployment guide](./RENDER_DEPLOYMENT_GUIDE.md) for detailed instructions, troubleshooting, and FAQ.

**Live demo link will appear in your Render dashboard.** Share it with judges — they can test without any local setup.

The database file (`campusos.db`) is created and seeded from `data/*.json` the first time the app starts. To wipe it and reload the seed data at any point:

```bash
npm run seed
```

## Environment variables

| Key | Required | Notes |
|---|---|---|
| `LLM_PROVIDER` | no | `groq`, `openai` or `gemini`. Set it when more than one key is present, otherwise the first key found wins |
| `GROQ_API_KEY` | yes* | Free and generous — https://console.groq.com/keys. The recommended choice |
| `OPENAI_API_KEY` | yes* | Paid — https://platform.openai.com/api-keys |
| `GOOGLE_API_KEY` | yes* | Free at https://aistudio.google.com/apikey, but capped at 20 requests/day |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.6-flash` |
| `OPENAI_MODEL` | no | Defaults to `gpt-4o-mini` |
| `GROQ_MODEL` | no | Defaults to `llama-3.3-70b-versatile` |
| `DATABASE_PATH` | no | Defaults to `./campusos.db` |

\* Exactly one model key is required — any one of the three. The dashboard shows which provider is active in the top-right; with no key it says so instead of failing silently.

## What you can do in the dashboard

CampusOS runs as one of two people, switched from the toggle in the header:

- **Student** — reads everything, books rooms, takes and gives up their own place at an event. Cannot add, edit or delete records, and cannot cancel a booking somebody else made.
- **Department Admin** — everything above, plus managing the five systems and cancelling any booking.

Those rules are enforced server-side in `lib/session.js` and `lib/require-admin.js`, so they hold for the dashboard and the agent alike. Switch role and the same request changes outcome: as a student, cancelling `bk-002` returns 403 and names whose booking it is; as staff it succeeds.

Each of the five sections supports **add, edit and delete** *when you are acting as Department Admin*, and every change is written to the database and reflected in the interface immediately.

Rooms and events carry the two extra actions the brief asks for, and they sit on the row itself:

- **Rooms** — **Book** opens a panel for date, time and purpose. It refuses a slot that already has a booking, a timetabled class or an event in that window, and names what is in the way. Bookings already held on the room are listed underneath with a **Cancel** on each.
- **Events** — **Register** takes a place and updates the count; the button then becomes **Cancel place**. An event with no seats left shows a disabled **Full** rather than letting you try.

These post to the same `/api/actions/*` endpoints the agent's tools call, so a room booked in the dashboard and one booked in chat are the same operation with the same conflict checks.

## Using the agent

Open the assistant with the round button in the bottom-right corner. It is built for the way a student actually asks:

- *When is my next class?*
- *What classes do I have on Wednesday?*
- *What have I got due this week?*
- *Show me all high priority announcements.*
- *I'm free until 2 PM — is there anything on campus I could drop into?*
- *Which labs have a projector and can fit at least 30 people?*
- *Book Room 7A02 tomorrow from 3 PM to 5 PM.*
- *Register me for the Guest Lecture on Deep Learning.*
- *I need a room for 5 people with a projector, tomorrow between 2 and 4.*

**To see the live-data behaviour:** switch to Department Admin, open the Notices tab, edit any notice, then ask the agent about it. Or edit a room's capacity and ask which rooms fit that many people. The answer changes on the next message — there is no refresh, no reindex, no restart.

Things it will not do: book a room that is occupied, register you twice for the same event, act on another student's records, or book anything when you have not said which room or when.

## How it works

```
app/
  page.js                     dashboard + chat shell
  ui/                         Workspace, RecordTable, RecordForm, BookingPanel, Chat (client components)
  api/[resource]/             GET list, POST create
  api/[resource]/[id]/        GET one, PATCH update, DELETE
  api/actions/[action]/       book-room, cancel-booking, register-event, cancel-registration
  api/chat/                   the agent loop
lib/
  db.js                       schema, connection, seeding
  store.js                    reads and generic CRUD for all five systems
  actions.js                  booking, registration, availability and conflict logic
  agent-tools.js              the 15 tool definitions + the system prompt
  session.js                  the two actors and what each may do
  require-admin.js            guard used by every record-mutating route
  llm.js                      function-calling loop (Gemini / OpenAI / Groq)
data/                         the provided seed JSON, untouched
```

The five systems are normalised into seven tables — room bookings and event registrations are child tables with foreign keys rather than JSON blobs, which is what makes overlap checks and seat counts correct rather than approximate. Event registration counts are computed from the registrations table on every read, so they can never drift from the underlying rows.

## Agent tools

Eleven read tools and four that write.

**Read** — `get_current_datetime` · `get_class_schedule` · `get_next_class` · `get_assignments` · `get_announcements` · `get_events` · `get_rooms` · `find_available_rooms` · `check_room_availability` · `whats_on` · `get_my_bookings_and_registrations`

**Write** — `book_room` · `cancel_room_booking` · `register_for_event` · `cancel_event_registration`

Three of these are worth calling out:

- `find_available_rooms` excludes a room if it has an overlapping booking, a timetabled class **or** an event held there in that window, so "free" means actually free.
- `check_room_availability` answers "is 7A02 free at 3?" without writing anything. Without it the only way to test a named room is to try booking it, which is a mutation.
- `get_current_datetime` returns the campus clock in Asia/Dhaka, so "tomorrow" is resolved against the real date instead of whatever the model assumed. Every date the tools accept is resolved in that same zone, on any machine.

There is deliberately **no** tool that creates, edits or deletes a schedule, room, event, announcement or assignment. Those are dashboard operations. A student asking the agent to delete a notice is refused because the capability genuinely is not there, not because a prompt talked it out of it.

## Checking it works

Two test scripts, neither of which needs an API key:

```bash
npm run smoke
```

Runs the service layer against a throwaway database — seed integrity, booking conflicts, half-open time windows, capacity, ownership refusals. Every assertion mirrors a query or an adversarial case from the brief.

```bash
npm run smoke:agent
```

Runs the tool layer the model calls — schema validity, tool dispatch, that checking a room writes nothing, that refusals come back as data rather than exceptions, and that the system prompt carries rules rather than a copy of the campus data.

---

Built for the AI Build Hackathon, AUST CSE Carnival 8.0.

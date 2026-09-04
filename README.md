# CampusOS

**AI Build Hackathon — AUST CSE Carnival 8.0**

A campus data manager and an AI agent sitting on top of the same live database. Edit a room's capacity or post an announcement in the dashboard, then ask the agent about it in the panel beside it — it already knows, because every tool call reads the database at the moment it runs.

---

## Project overview

CampusOS holds five campus systems — class schedules, rooms, events, announcements and assignment deadlines — in a SQLite database seeded from the provided JSON files on first boot. The dashboard on the left lists all five and supports add, edit and delete on every one of them; changes are written to the database and appear in the interface immediately with no manual refresh. The agent on the right talks to a language model with **real function calling**: it has fifteen tools that query and mutate that same database, and it decides which to call. Because those tools run SQL at call time and nothing is cached, a change made in the dashboard a second earlier is what the agent reads. Every answer shows the tool calls it made underneath it, so you can see exactly what it read and what it did.

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

<<<<<<< Updated upstream
## Setup
=======
```
campusos-hackathon/
│
├── README.md                    ← You are here
├── PROBLEM_STATEMENT.md         ← Full problem statement + scoring
├── SUBMISSION.md                ← How and where to submit
│
├── data/                        ← Seed data (load these into your backend)
│   ├── schedules.json
│   ├── rooms.json
│   ├── events.json
│   ├── announcements.json
│   └── assignments.json
│
├── schema/
│   └── schema.md                ← Field names, types, and constraints for all 5 systems
│
└── sample_queries/
    └── sample_queries.md        ← Queries we will use when judging your agent
```

---

## Run Locally

```bash
cd web
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. If that port is already in use, Vite will print the next available URL, such as `http://127.0.0.1:5174`. The Vite dev server includes the local `/api` backend, seeds from `data/*.json`, and persists dashboard/agent changes in `.campusos-db/campusos.json`.

For a production-style run:

```bash
cd web
npm run build
npm start
```

Open `http://localhost:3000`.

---

## How to Participate

### 1. Fork the repository

Click **Fork** in the top-right corner of this repo's GitHub page. This creates your own copy under your GitHub account, where you'll build your solution.

### 2. Clone your fork
>>>>>>> Stashed changes

```bash
git clone https://github.com/fairuz-anadi/cse-carnival-hampton.git
cd cse-carnival-hampton

npm install

cp .env.example .env       # Windows: copy .env.example .env
# open .env and set GOOGLE_API_KEY

npm run dev
```

Open **http://localhost:3000**.

The database file (`campusos.db`) is created and seeded from `data/*.json` the first time the app starts. To wipe it and reload the seed data at any point:

```bash
npm run seed
```

## Environment variables

| Key | Required | Notes |
|---|---|---|
| `GOOGLE_API_KEY` | yes* | Google AI Studio key — free at https://aistudio.google.com/apikey |
| `OPENAI_API_KEY` | — | Alternative to the above; used if `GOOGLE_API_KEY` is absent |
| `GROQ_API_KEY` | — | Second alternative |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.6-flash` |
| `OPENAI_MODEL` | no | Defaults to `gpt-4o-mini` |
| `GROQ_MODEL` | no | Defaults to `llama-3.3-70b-versatile` |
| `DATABASE_PATH` | no | Defaults to `./campusos.db` |

\* Exactly one model key is required. The dashboard shows which provider is active in the top-right; with no key it says so instead of failing silently.

## Using the agent

Type into the panel on the right. It is built for the way a student actually asks:

- *When is my next class?*
- *What classes do I have on Wednesday?*
- *What have I got due this week?*
- *Show me all high priority announcements.*
- *I'm free until 2 PM — is there anything on campus I could drop into?*
- *Which labs have a projector and can fit at least 30 people?*
- *Book Room 7A02 tomorrow from 3 PM to 5 PM.*
- *Register me for the Guest Lecture on Deep Learning.*
- *I need a room for 5 people with a projector, tomorrow between 2 and 4.*

**To see the live-data behaviour:** open the Announcements tab, edit any notice, then ask the agent about it. Or edit a room's capacity and ask which rooms fit that many people. The answer changes on the next message — there is no refresh, no reindex, no restart.

Things it will not do: book a room that is occupied, register you twice for the same event, act on another student's records, or book anything when you have not said which room or when.

## How it works

```
app/
  page.js                     dashboard + chat shell
  ui/                         Workspace, RecordTable, RecordForm, Chat (client components)
  api/[resource]/             GET list, POST create
  api/[resource]/[id]/        GET one, PATCH update, DELETE
  api/actions/[action]/       book-room, cancel-booking, register-event, cancel-registration
  api/chat/                   the agent loop
lib/
  db.js                       schema, connection, seeding
  store.js                    reads and generic CRUD for all five systems
  actions.js                  booking, registration, availability and conflict logic
  agent-tools.js              the 15 tool definitions + the system prompt
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

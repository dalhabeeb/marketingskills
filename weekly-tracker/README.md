# Weekly Tracker

A personal weekly planning board: 4 domains (TEDx, Study, Research, Creative),
4 habit counters, a Thursday review ritual, and a quick-add box that parses
pasted plans into cards. Full stack — React frontend, Express backend, SQLite
storage — so history persists indefinitely, not just in browser memory.

## Stack

- **Frontend:** React 18 + Vite
- **Backend:** Node/Express
- **Database:** SQLite via `better-sqlite3` (file at `server/data/tracker.db`)

## Run locally

```bash
npm install
npm run dev
```

This starts the Express API on `http://localhost:4000` and the Vite dev
server on `http://localhost:5173` (which proxies `/api` to the backend).
Open `http://localhost:5173`.

The SQLite database is created automatically on first run at
`server/data/tracker.db`, seeded with the starting week described below.
It is gitignored — your data persists on disk across restarts but isn't
committed to the repo.

## Production build

```bash
npm run build   # builds the client into client/dist
npm start        # builds, then serves client/dist from the Express server on PORT (default 4000)
```

In production the Express server serves the built client directly, so only
one process/port is needed to deploy (e.g. on a small VPS or a container
platform). Point `DB_PATH` at a persistent volume if your host's filesystem
isn't durable across deploys.

## Data model

- **Domains** (fixed): TEDx, Study, Research, Creative — each holds a list
  of cards.
- **Cards**: title, deadline (Mon–Sun, defaults Thu), done state, optional
  subtasks. A card with subtasks derives its done state from all subtasks
  being done.
- **Habits** (fixed, weekly counters): Quran (2 pages, half-steps), Steps (7
  days at 10k), Training (3 sessions), Running (2 sessions).
- **History**: every closed-out week's number, completion percentage, and
  optional note — kept forever.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/state` | Full current state: week, domains/cards, habits, completion, history |
| POST | `/api/cards` | Add a card `{domainId, title, deadline, subtasks?}` |
| DELETE | `/api/cards/:id` | Remove a card |
| PATCH | `/api/cards/:id/toggle` | Toggle a card with no subtasks |
| PATCH | `/api/subtasks/:id/toggle` | Toggle a subtask (parent card done state is derived) |
| PATCH | `/api/habits/:key` | Adjust a habit counter `{delta}` |
| POST | `/api/quickadd/parse` | Parse pasted text `{text}` into a preview of `{domainId, title, deadline}` items |
| POST | `/api/quickadd/confirm` | Bulk-insert confirmed/edited items from the preview |
| POST | `/api/review/close` | Archive the current week into history, carry over unfinished cards with fresh IDs, reset habits, increment week number `{notes?}` |

## Quick-add parsing

Pasted text is split on newlines/commas, numbering markers (`1-`, `2)`, etc.)
are stripped, and each resulting line is classified into a domain by scoring
fixed keyword lists (e.g. "pathology"/"pharma" → Study, "doctor" → Research)
plus overlap with every title/subtask ever created in that domain historically
(kept in a `classifier_terms` table that survives week closes). A day-of-week
mention sets the deadline; otherwise it defaults to Thu. Results are shown in
an editable preview before anything is saved.

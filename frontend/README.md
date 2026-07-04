# Lumen Audio — Frontend

A React + TypeScript (Vite) chat UI for the Lumen Audio grounded Q&A backend. It
sends questions to the backend `POST /ask` endpoint and renders the grounded
answer together with its cited source article(s), or a clear "not covered"
message when the assistant declines.

## Tech stack

- **React 18** + **TypeScript**
- **Vite 6** dev server / bundler
- **Tailwind CSS 3** for styling

## Project structure

```
frontend/
├── index.html
├── vite.config.ts          # dev server + proxy to the Flask backend
├── tailwind.config.js
├── src/
│   ├── main.tsx            # app entry
│   ├── App.tsx             # layout shell
│   ├── index.css          # Tailwind layers + base styles
│   ├── config/            # runtime config (API base URL, endpoints, timeouts)
│   ├── types/             # shared TypeScript types (chat + API contract)
│   ├── api/               # backend client (fetch wrapper, ApiError)
│   ├── hooks/             # useChat (transcript + request lifecycle), useHealth
│   └── components/        # one folder per component
│       ├── ChatWindow/    # top-level container wiring hooks to UI
│       ├── Header/        # branding + connectivity status + "New chat"
│       ├── MessageList/   # scrolling transcript
│       ├── MessageBubble/ # a single user/assistant message
│       ├── Sources/       # cited source chips
│       ├── ChatInput/     # auto-growing composer
│       ├── TypingIndicator/
│       └── EmptyState/    # welcome screen + suggested questions
```

Each component lives in its own directory with a barrel `index.ts`, so imports
stay clean (`@/components/Header`) and the tree scales as features are added.

## Getting started

Requires **Node.js 18+**.

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

The dev server proxies `/ask` and `/health` to the backend, so run the backend
(from the repo root) in another shell first. On macOS `python` may not exist —
use `python3`. Port `5000` is frequently occupied (by macOS AirPlay / Cursor),
so this project defaults the proxy to `:8000`:

```bash
# from the repo root, using the project's virtualenv
.venv/bin/flask --app app run --port 8000
# or, if 5000 is free for you:  python3 app.py  (then set VITE_BACKEND_URL=http://localhost:5000)
```

### Configuration

Copy `.env.example` to `.env` to override defaults:

| Variable             | Purpose                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `VITE_API_BASE_URL`  | Origin the browser calls. Empty = use the dev proxy (same origin).      |
| `VITE_BACKEND_URL`   | Target the Vite dev proxy forwards to (default `http://localhost:8000`).|

## Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the Vite dev server.           |
| `npm run build`     | Type-check and build for production. |
| `npm run preview`   | Preview the production build.        |
| `npm run typecheck` | Type-check without emitting.         |

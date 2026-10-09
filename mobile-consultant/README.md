# WeHive Mobile Consultant

A mobile-style study-abroad consultant UI (React 19 + Vite + Tailwind 4) served by a small
Express server (`server.ts`). AI features are proxied to the main WeHive FastAPI backend
(`/api/agentic/hive/ask`); documents are stored locally in `uploads/` and `db.json`.

## Prerequisites

- Node.js 20+
- A running WeHive backend (see the root `README.md`), default `http://localhost:8000`

## Run locally

```bash
cd mobile-consultant
npm install
cp .env.example .env      # adjust API_URL / VITE_API_URL if the backend is elsewhere
npm run dev               # Express + Vite middleware on http://localhost:3000
```

## Scripts

| Command         | What it does                                                   |
|-----------------|----------------------------------------------------------------|
| `npm run dev`   | Dev server (`tsx server.ts`, Vite in middleware mode)          |
| `npm run lint`  | Type-check with `tsc --noEmit`                                 |
| `npm run build` | Build the client to `dist/` and bundle the server to `dist/server.cjs` |
| `npm start`     | Run the production build (`NODE_ENV=production node dist/server.cjs`) |

## Known limitations

- **OCR is not implemented.** `/api/ocr` and `/api/ocr-base64` return `501 OCR_NOT_AVAILABLE`
  because the backend endpoint is text-only and never sees the image. Users enter document
  details manually until a vision-capable model is wired in.
- Document storage (`uploads/`, `db.json`) is local-disk only and has no authentication;
  do not expose this server publicly as-is.

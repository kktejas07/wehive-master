# WeHive app (iOS, Android and web)

One React Native codebase (Expo SDK 58, Expo Router) for the WeHive mobile apps and website.
It talks to the existing FastAPI backend in `../backend`; the current React website in
`../frontend` keeps running until every feature has moved here.

## Run

```bash
cd wehive-app
npm install
EXPO_PUBLIC_API_URL=https://wehive.co.in npx expo start   # i = iOS, a = Android, w = web
```

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint (Expo config, React Compiler rules) |
| `npm test` | Unit tests for model logic (Node test runner) |
| `npm run export:web` | Static website in `dist/` (every page pre-rendered with its own title and description) |
| `npx eas-cli build -p ios|android` | Store builds in the cloud |

`EXPO_PUBLIC_API_URL` is the backend origin (default `https://wehive.co.in`). It is baked in at build time.

## Architecture: MVVM, one folder per feature

```
src/
  app/                      routes only (Expo Router). Each file renders one feature view.
  core/                     shared by every feature
    api/                    one HTTP client (JSON, bearer token, error detail)
    auth/                   session provider; token in Keychain/Keystore (native) or localStorage (web)
    theme/                  design tokens (brand colours, type, spacing), light + dark
    motion/                 durations, easing, springs used by every animation
    navigation/             bottom tabs (native) / top navbar (web) from one list of sections
    ui/                     Button, Card, Chip, Text, TextField, Screen, GradientHero, AnimatedIcon, states
  features/<feature>/
    model/                  types, API calls, pure logic (unit-tested, no React)
    viewmodel/              hooks holding state and decisions (no UI)
    view/                   screens and components (no API calls, no business rules)
```

Rules: views never call the API; viewmodels never render; models never import React.

## Converted so far

| Feature | Native | Web | Notes |
|---|---|---|---|
| Home | ✓ | ✓ | Brand gradient hero, search, shortcuts, latest news |
| Destinations | ✓ | ✓ | Search, requirement filters, decision times |
| Country page | ✓ | ✓ | Decision time with its source, rules to follow, visa types and documents |
| News | ✓ | ✓ | Paged, opens the original source |
| Sign in (email / WhatsApp code) and account | ✓ | ✓ | Same session token as the website |

Next, in order: applications and tracking, document upload and AI scan, US visa slots, Hive chat,
study abroad and universities, payments, community, then the admin and agent portals.

## Motion and accessibility

Icons animate (pop or wiggle) on selection and state changes, buttons and cards press-scale,
lists fade in, and the hero light drifts slowly. Every animation turns off when the device's
"reduce motion" setting is on. Buttons, links and headings carry accessibility roles.

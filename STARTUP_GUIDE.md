# KSHETRA — Startup Guide

> Quick reference for getting the app up and running on any machine.

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | ≥ 20.x | `node -v` |
| npm | ≥ 10.x | `npm -v` |
| Git | any | `git --version` |
| Expo Go (mobile) | Latest from App Store / Play Store | For testing on physical device |

---

## 1. Install Dependencies

```bash
# From project root
npm install
```

This installs all workspaces: `apps/mobile`, `apps/api`, `packages/shared`.

---

## 2. Start the API Server

```bash
# Terminal 1
cd apps/api
npx tsx src/server.ts
```

Verify: open `http://localhost:3001/api/health` — should return `{"status":"ok"}`.

Key endpoints:
- `GET /api/health` — health check
- `GET /api/v1/states/TS/constituencies` — all 119 Telangana constituencies
- `GET /api/v1/states/TS/constituencies/:id` — constituency detail
- `GET /api/v1/states/TS/constituencies/search?q=&party=&district=&type=` — search
- `GET /api/v1/states/TS/analytics` — election analytics
- `GET /api/v1/states/TS/elections` — election history (2014/2018/2023)
- `GET /api/v1/states/TS/mla` — MLA profiles
- `POST /api/v1/ai/chat` — AI chat (requires OPENAI_API_KEY)

---

## 3. Start the Mobile App

```bash
# Terminal 2
cd apps/mobile
npx expo start --clear
```

Then:
- **Physical device**: Scan the QR code with Expo Go (Android) or Camera (iOS)
- **Android emulator**: Press `a` in the terminal
- **Web browser**: Press `w` in the terminal

### Expo Go vs Development Build

| Feature | Expo Go | Dev Build |
|---|---|---|
| Explore tab (search/filter) | ✅ Works | ✅ Works |
| Intelligence tab (analytics) | ✅ Works | ✅ Works |
| Profile tab (settings) | ✅ Works | ✅ Works |
| AI Chat | ✅ Works | ✅ Works |
| Constituency detail | ✅ Works | ✅ Works |
| **Interactive Mapbox map** | ❌ Fallback UI | ✅ Full map |
| **MMKV persistence** | ❌ In-memory | ✅ Disk persistence |
| Push notifications | ❌ Limited | ✅ Full |

For the full interactive map, create a development build:
```bash
cd apps/mobile
npx expo run:android    # local Android build
# or
npx eas build --profile development --platform android
```

---

## 4. Run Tests

```bash
# All tests (from project root)
cd packages/shared && npx jest --forceExit
cd ../../apps/api && npx jest --forceExit
cd ../../data/seed && npx jest --forceExit
```

Expected: **110/110 tests passing** (59 shared + 31 API + 20 seed).

---

## 5. Environment Variables (Optional)

The app runs fully offline without any API keys. Add keys to unlock additional features:

### `apps/mobile/.env`

```env
# Mapbox — interactive map tiles
EXPO_PUBLIC_MAPBOX_TOKEN=your_token_here

# Supabase — cloud auth + database sync
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# API server URL (defaults to localhost:3001)
EXPO_PUBLIC_API_URL=http://localhost:3001
```

### `apps/api/.env`

```env
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# OpenAI — powers KSHETRA AI chat
OPENAI_API_KEY=sk-your_key_here
```

### How to Get Each Key

| Service | Free Tier | Steps |
|---|---|---|
| **Mapbox** | 50k map loads/mo | 1. Sign up at [mapbox.com](https://account.mapbox.com) → 2. Dashboard → Access tokens → Copy default public token |
| **Supabase** | 2 projects free | 1. Sign up at [supabase.com](https://supabase.com) → 2. New Project → 3. Settings → API → Copy URL + anon key |
| **OpenAI** | Pay-as-you-go | 1. Sign up at [platform.openai.com](https://platform.openai.com) → 2. API Keys → Create new key |
| **EAS (Expo)** | Free builds | 1. `npx eas init` in `apps/mobile/` → 2. Follow prompts → 3. Replace `EAS_PROJECT_ID_PLACEHOLDER` in `app.json` |

---

## 6. Project Structure

```
kshetra/
├── apps/
│   ├── mobile/          # React Native + Expo app
│   │   ├── app/         # File-based routing (expo-router)
│   │   ├── components/  # Reusable UI components
│   │   ├── lib/         # Utilities, hooks, constants
│   │   └── stores/      # Zustand state stores
│   └── api/             # Fastify backend
│       └── src/
│           ├── routes/  # API route handlers
│           └── services/# Business logic (AI, etc.)
├── packages/
│   └── shared/          # Shared types, geo utils, analytics
├── data/
│   ├── geo/             # GeoJSON boundary files
│   └── seed/            # Constituency + election seed data
├── supabase/
│   └── migrations/      # DB schema + seed SQL
├── docs/
│   └── architecture/    # ADR decision records
├── building.md          # Detailed build log (all milestones)
└── STARTUP_GUIDE.md     # This file
```

---

## 7. Common Issues

### Metro bundler cache issues
```bash
cd apps/mobile
npx expo start --clear
```

### Port 3001 already in use
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <pid> /F

# Or use a different port
PORT=3002 npx tsx src/server.ts
```

### Mapbox warnings about deprecated token
These are harmless config plugin warnings. The map works fine with `EXPO_PUBLIC_MAPBOX_TOKEN` in `.env`.

### Tests failing in `data/` directory
Always run seed tests from `data/seed/`, not from `data/`:
```bash
cd data/seed
npx jest --forceExit
```

---

## 8. Git Workflow

```bash
# Check status
git status

# Run tests before committing
npm run test

# Commit
git add -A
git commit -m "feat: description"
```

All work is tracked in `building.md` with milestone numbers and test counts.

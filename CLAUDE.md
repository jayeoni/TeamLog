# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Type-check then build (tsc -b && vite build)
npm run lint      # ESLint
npm run preview   # Preview production build
```

No test suite is configured.

## Environment

Firebase credentials must be provided via a `.env` file at the project root:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_KAKAO_JS_KEY=          # Kakao JavaScript App Key — enables KakaoTalk share on log page
```

## Architecture

TeamLog is a Korean-language sports team training log app. Two roles exist — **athlete** and **coach** — with entirely separate page trees under `/athlete/*` and `/coach/*`.

**Auth & routing** (`src/App.tsx`): Firebase `onAuthStateChanged` populates `useAuthStore`. `ProtectedRoute` wraps both role subtrees and redirects unauthenticated users to `/login` and wrong-role users to their own root. Both subtrees share the same `Layout` shell (sidebar + topbar + `<Outlet />`).

**State** (`src/store/`): Only two Zustand stores exist.
- `authStore` — holds the current `AppUser | null` and a loading flag.
- `themeStore` — persists dark/light preference to `localStorage` under key `teamlog-theme`; toggling adds/removes the `dark` class on `<html>`.

**Data model** (`src/types/index.ts`): Three Firestore collections are implied:
- `users` — keyed by Firebase Auth UID; has `role`, `teamId`, `sport`, `specialty`.
- `teams` — has a `code` field athletes use to join; `coachIds[]`.
- `dailyLogs` — keyed by auto-ID; fields include `athleteId`, `teamId`, `date` (YYYY-MM-DD string), `condition` (1–5), `painArea`, `status` (`draft` | `submitted`), and optional coach feedback fields.

**Pages by role:**
- Athlete: Dashboard (streak/week KPIs + today's log), Calendar (`StampCalendar`), Log editor (`/athlete/log/:date`).
- Coach: Dashboard (team overview + today's athlete list), Date view (`/coach/date/:date`), Athlete history view (`/coach/athlete/:athleteId`), Team management.

**Dates**: All dates are stored and compared as `YYYY-MM-DD` strings. `src/utils/dateUtils.ts` is the single source of truth for date formatting, calendar grid generation, and the `generateTeamCode()` helper.

## Styling

Tailwind CSS v4 with a custom theme defined in `src/index.css` (not `tailwind.config.*`). Dark mode uses a `.dark` class on `<html>` (not `prefers-color-scheme`). Reusable utility classes (`.card`, `.btn-primary`, `.btn-ghost`, `.btn-outline`, `.input-field`, `.label`, `.badge-*`) are defined in `@layer components` — prefer these over ad-hoc utility strings.

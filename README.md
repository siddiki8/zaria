# What Should Play? — DJ Voting App

Real-time crowd voting for DJ sets. Built with TanStack Start on Cloudflare Workers, Firebase Auth (Google), Firestore, and Last.fm search.

## Stack

- **Frontend:** TanStack Start / TanStack Router
- **Hosting:** Cloudflare Workers
- **Auth:** Firebase Auth (Google)
- **Database:** Firestore
- **Music search:** Last.fm API

## Setup

### 1. Install dependencies

```bash
npm install
```

**WSL users:** If you see a `Cannot find native binding` error from `rolldown`, reinstall in WSL (not Windows):

```bash
rm -rf node_modules package-lock.json
npm install --include=optional
```

Use Node **22.12+** (`nvm use 22`).

### 2. Firebase (Firebase Console only — no CLI required)

See the manual setup section below, or follow along in the console.

### 3. Last.fm

Get an API key from [Last.fm API](https://www.last.fm/api/account/create) and add to `.dev.vars`:

```
LASTFM_API_KEY=your_key
FIREBASE_WEB_API_KEY=your_firebase_web_api_key
```

`FIREBASE_WEB_API_KEY` must match `VITE_FIREBASE_API_KEY` from `.env.local` — server functions (song search auth) read it from Wrangler, not from the Vite client env.

For production:

```bash
npx wrangler secret put LASTFM_API_KEY
npx wrangler secret put FIREBASE_WEB_API_KEY
```

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 5. Deploy

```bash
npm run deploy
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | DJ Google sign-in |
| `/dashboard` | DJ set list |
| `/sets/new` | Create a set |
| `/sets/:setId` | DJ live dashboard |
| `/s/:slug` | Public voting page |

## MVP features

- DJ Google login
- Create / schedule / end sets
- Last.fm song search + manual add
- Public link + QR code
- Real-time guest voting
- Mark songs as played

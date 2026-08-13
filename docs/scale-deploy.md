# Voting deploy checklist

Voting uses an atomic Firestore transaction to update each voter's ballot and
the song's `voteCount`. This works on Firebase's free Spark plan and does not
require Cloud Functions.

## Firebase console (one-time)

1. **Authentication** → Sign-in method → enable **Anonymous**.
2. **App Check** → register the web app with **reCAPTCHA v3**.
   - Add `VITE_FIREBASE_APP_CHECK_SITE_KEY` to `.env.local`.
   - For local dev, register a debug token and set `VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN`.
3. **Local server env:** add `FIREBASE_WEB_API_KEY` to `.dev.vars` (same value as `VITE_FIREBASE_API_KEY`) so DJ song search can verify Firebase ID tokens.
4. After deploy, **enforce** App Check on Firestore.

## Deploy order

```bash
# 1. Firestore rules and indexes
npm run firebase:deploy

# 2. Web app (Cloudflare)
npm run deploy
```

## Notes

- Existing ballots and `voteCount` values are preserved.
- Vote counts update directly in the same transaction as the ballot.
- Anonymous voters cannot open DJ routes (`/dashboard`, `/sets/*`).

## Smoke test (two devices)

1. Open the public vote URL on phone A — should show “Starting voting session…” then the ranking.
2. Vote on phone A — checkmark appears immediately; count updates on phone B in real time.
3. Open DJ dashboard on a signed-in Google account — ranking matches, search works.
4. Open vote URL while signed in as Google DJ — uses Google uid (not a second anonymous session).
5. Try `/dashboard` on phone A (anonymous) — redirects to login.
6. Try song search without DJ sign-in — “Sign in as a DJ to search tracks.”

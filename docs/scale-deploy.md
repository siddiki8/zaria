# Scale voting deploy checklist

Deploy backend changes **before** shipping the web client that stops writing `voteCount` directly.

## Firebase console (one-time)

1. **Authentication** → Sign-in method → enable **Anonymous**.
2. **App Check** → register the web app with **reCAPTCHA v3**.
   - Add `VITE_FIREBASE_APP_CHECK_SITE_KEY` to `.env.local`.
   - For local dev, register a debug token and set `VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN`.
3. After deploy, **enforce** App Check on Firestore (and Cloud Functions if offered).

## Deploy order

```bash
# 1. Rules + Cloud Functions (ballot aggregation)
npm run firebase:deploy

# 2. Web app (Cloudflare)
npm run deploy
```

## Cutover notes

- Old `songs/{songId}/votes/{voterId}` docs are ignored; voter checkmarks reset.
- Existing `voteCount` values are kept; new votes update via shard flush (may lag ~1s on other phones).
- Anonymous voters cannot open DJ routes (`/dashboard`, `/sets/*`).

## Smoke test (two devices)

1. Open the public vote URL on phone A — should show “Starting voting session…” then the ranking.
2. Vote on phone A — checkmark appears immediately; count updates on phone B within ~1s.
3. Open DJ dashboard on a signed-in Google account — ranking matches, search works.
4. Open vote URL while signed in as Google DJ — uses Google uid (not a second anonymous session).
5. Try `/dashboard` on phone A (anonymous) — redirects to login.
6. Try song search without DJ sign-in — “Sign in as a DJ to search tracks.”

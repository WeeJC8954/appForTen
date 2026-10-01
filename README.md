# appForTen

Minimal app with login + database: **Firebase Auth** (email/password) + **Cloud Firestore**.
Plain HTML/JS — no build step. Firebase SDK v12.19.0 loaded from gstatic.

Two tabs after login:
- **Notes**: personal notes, live-updating.
- **Pokédex**: search Pokémon (data from [PokeAPI](https://pokeapi.co)), see artwork, types and base stats,
  and save a team of up to 6 to your account.

**Live site:** https://weejc8954.github.io/appForTen/

## One-time Firebase setup (in the console)

1. https://console.firebase.google.com → **Add project**.
2. **Build → Authentication → Get started** → enable **Email/Password**.
3. **Build → Firestore Database → Create database** (production mode; pick a region).
4. **Project settings → General → Your apps → Web (`</>`)** → register an app, copy the config
   into `public/firebase-config.js`.

## Deploy rules + index (Firebase CLI)

```powershell
npm install -g firebase-tools
firebase login
firebase use --add            # pick your project
firebase deploy --only firestore
```

## Run locally

```powershell
firebase serve --only hosting   # http://localhost:5000
```

(Any static server works, e.g. `npx serve public`. Opening the file directly won't — ES modules need http.)

## Publish

**GitHub Pages (automatic):** every push to `main` that changes `public/` runs
`.github/workflows/pages.yml`, which publishes `public/` to https://weejc8954.github.io/appForTen/.
To redeploy without a change: **Actions → Deploy to GitHub Pages → Run workflow**, or
`gh workflow run pages.yml`.

Database rules and indexes are **not** part of that workflow. After changing `firestore.rules` or
`firestore.indexes.json`, run `firebase deploy --only firestore` yourself.

**Firebase Hosting (optional alternative):** `firebase deploy --only hosting` publishes the same folder to
https://appforten-9ec32.web.app.

## Contributing

Never commit straight to `main`. Make changes on a branch and open a PR. A Claude code review runs on each PR
(`.github/workflows/claude-code-review.yml`), and mentioning `@claude` in a PR or issue starts Claude
(`.github/workflows/claude.yml`).

## Layout

| Path | What it is |
|---|---|
| `public/` | Frontend: `index.html`, `style.css`, and ES modules (`app.js`, `firebase.js`, `notes.js`, `pokedex.js`, `ui.js`, `firebase-config.js`) |
| `firestore.rules` | Security rules — users can only read/write their own `notes` and `teams/{uid}` |
| `firestore.indexes.json` | Composite index for the `owner + created` query |
| `firebase.json` | Firebase CLI config (hosting + firestore) |
| `.github/workflows/` | GitHub Actions: Pages deploy, Claude PR review, `@claude` mentions |

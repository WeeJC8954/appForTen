# appForTen

Minimal app with login + database: **Firebase Auth** (email/password) + **Cloud Firestore**.
Plain HTML/JS — no build step. Firebase SDK v12.19.0 loaded from gstatic.

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

```powershell
firebase deploy --only hosting
```

## Layout

| Path | What it is |
|---|---|
| `public/` | Frontend: `index.html`, `app.js`, `style.css`, `firebase-config.js` |
| `firestore.rules` | Security rules — users can only read/write their own `notes` |
| `firestore.indexes.json` | Composite index for the `owner + created` query |
| `firebase.json` | Firebase CLI config (hosting + firestore) |

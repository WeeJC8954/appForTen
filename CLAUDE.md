# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A notes app with login: plain HTML/JS in `public/` (no bundler, no `package.json`, no tests or linter), backed by
Firebase Auth (email/password) and Cloud Firestore in Firebase project `appforten-9ec32` (set in `.firebaserc`).
Firestore location is `nam5`.

## Commands

Requires the Firebase CLI (`npm install -g firebase-tools`) and `firebase login`.

```powershell
firebase serve --only hosting       # local dev at http://localhost:5000 (must be served over http — ES modules)
firebase deploy --only firestore    # push firestore.rules + firestore.indexes.json
firebase deploy --only hosting      # publish public/ to https://appforten-9ec32.web.app
node --check public/app.js          # quick syntax check (the only "build" step there is)
```

Local dev talks to the **live** Firebase project — there is no emulator config, so sign-ups and notes created
while testing are real data.

## Architecture

- `public/app.js` is the whole app. It imports the Firebase modular SDK directly from
  `https://www.gstatic.com/firebasejs/<version>/firebase-*.js`; all imports must use the same pinned version.
  UI is two `<section>`s in `index.html` toggled by `onAuthStateChanged`; the notes list is a live `onSnapshot`
  query that is unsubscribed on sign-out.
- `public/firebase-config.js` holds the public web-app config (from `firebase apps:sdkconfig WEB`). It is not
  secret — `firestore.rules` is the only access control.
- Data model: top-level `notes` collection, documents `{ text, owner: <auth uid>, created: serverTimestamp() }`.

### Rules, queries and indexes must change together

- Firestore rules are not filters: every client query on `notes` must include `where("owner", "==", uid)` or the
  whole query is rejected.
- There is no `update` rule, so notes are currently create/delete only — adding editing needs a rule change.
- `create` validates `owner == request.auth.uid` and `text` is a string ≤ 2000 chars (mirrored by `maxlength`
  in the HTML). New fields must be allowed by the rule.
- The `owner ==` + `orderBy("created", "desc")` query needs the composite index in `firestore.indexes.json`.
  Any new compound query needs an index added there, then `firebase deploy --only firestore`.

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
firebase deploy --only hosting      # optional: publish public/ to https://appforten-9ec32.web.app
node --check public/app.js          # quick syntax check (the only "build" step there is)
gh workflow run pages.yml           # redeploy GitHub Pages by hand
```

The main live site is GitHub Pages, at https://weejc8954.github.io/appForTen/. `.github/workflows/pages.yml`
publishes `public/` on every push to `main` that touches `public/`. That workflow does **not** deploy Firestore
rules or indexes, so run `firebase deploy --only firestore` yourself after changing them. Pages serves
the site under the `/appForTen/` subpath, so keep every asset and module path in `public/` relative (no leading `/`).

Local dev talks to the **live** Firebase project — there is no emulator config, so sign-ups and notes created
while testing are real data.

## Architecture

Native ES modules in `public/`, no bundler:

- `firebase.js` is the **only** file that imports the Firebase SDK (from
  `https://www.gstatic.com/firebasejs/<version>/firebase-*.js`, pinned to one version). It initialises the app and
  re-exports `auth`, `db` and the SDK functions the features use — import from `./firebase.js`, not gstatic.
- `app.js` coordinates everything: `onAuthStateChanged` calls each feature's `start*(user)` on sign-in and
  `stop*()` on sign-out (which unsubscribes its `onSnapshot` listeners), plus the auth form and tab switching.
  A new feature module follows the same `start`/`stop` contract and gets a `data-tab` button and a
  `<feature>-view` section in `index.html`.
- `notes.js`: notes tab. `pokedex.js`: Pokédex tab, using data from PokeAPI (`https://pokeapi.co/api/v2`, no key):
  `/pokemon?limit=2000` for the name datalist (cached in `sessionStorage`) and `/pokemon/{name|id}` for details.
- `ui.js`: shared `$`, `showMessage`, `errorText`, and the `el()` DOM builder. Render user/API text with
  `textContent` / `el()`, never `innerHTML`.
- `firebase-config.js` holds the public web-app config (from `firebase apps:sdkconfig WEB`). It is not
  secret — `firestore.rules` is the only access control.
- The login page styling comes from `body:has(#auth-view:not([hidden]))` in `style.css`; no JS is involved.

Data model:
- `notes/{autoId}`: `{ text, owner: <auth uid>, created: serverTimestamp() }`
- `teams/{uid}`: `{ members: [{ id, name, sprite, types }], updated }`. One document per user, at most 6 members.
  Writes go through `runTransaction` in `pokedex.js`, which enforces the cap and no duplicates.

### Rules, queries and indexes must change together

- Firestore rules are not filters: every client query on `notes` must include `where("owner", "==", uid)` or the
  whole query is rejected.
- There is no `update` rule, so notes are currently create/delete only — adding editing needs a rule change.
- `create` validates `owner == request.auth.uid` and `text` is a string ≤ 2000 chars (mirrored by `maxlength`
  in the HTML). New fields must be allowed by the rule.
- The `owner ==` + `orderBy("created", "desc")` query needs the composite index in `firestore.indexes.json`.
  Any new compound query needs an index added there, then `firebase deploy --only firestore`.
- `teams/{uid}` is readable and writable only by that uid. Writes may contain only `members` and `updated`, with
  `members.size() <= 6`. Adding a field to the team document needs a rule change.

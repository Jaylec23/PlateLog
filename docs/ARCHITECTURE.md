# Plate Log: architecture

A gym logbook that runs entirely in the browser. No build step. Data is saved on the device, or in the user's Supabase account when they sign in.
Read this first in any session, then attach only the files for the area being changed.

## Repository layout
```
site/                 what Cloudflare Pages serves (build output directory = site)
  index.html          page skeleton: header, tabs, empty panels, script tags
  config.js           Supabase URL + publishable key (safe to publish; never the secret key). Optional CONTACT_EMAIL shows on the privacy page.
  privacy.html        standalone privacy policy page (linked from the menu, footer, sign-in card and Guide)
  _headers            tells browsers to revalidate files, so updates show up
  manifest.webmanifest, *.png   Home Screen icons
  styles/             one stylesheet per area (see table)
  js/                 one script per area (see table)
docs/                 ARCHITECTURE.md, SETUP.md, supabase.sql (not served)
tests/run_tests.py    browser tests (Chrome headless + mock Supabase)
```

## How the scripts fit together
Classic `<script>` tags, not modules. Every file shares ONE global scope, so functions call each other by bare name. This keeps it working when opened from disk and needs no tooling.
Load order is fixed in `index.html` and matters:

`theme.js` (in `<head>`) > `config.js` > `cloud.js` > `data.js` > `util.js` > `state.js` > `storage.js` > `log.js` > `weeks.js` > `year.js` > `people.js` > `plan.js` > `installart.js` > `guide.js` > `export.js` > `main.js`

Rules that follow from this:
- A file may call functions from later files at run time (inside functions), but must not call them while loading.
- `main.js` is last. It wires events, renders, then calls `startStorage()`. Nothing may start loading data before every file has loaded.
- Keep top-level names unique across files. New files need a `<script>` tag in `index.html` and a mention here.

## File map: what each file owns
| File | Owns |
|---|---|
| `js/cloud.js` | Optional Supabase accounts. Sign-in screen, the account area inside the top-right menu (`#acct`), and a small shim that exposes `window.claude.use('db'|'user')` so the rest of the app does not care where data lives. No keys configured = local only. |
| `js/data.js` | Constants: slot ids and colours, `SPLITS` (ready-made splits), `LIB` (exercise library), `CHIPS` (muscle filters), `buildSplit()`. |
| `js/util.js` | Pure helpers: dates, escaping, `e1rm`, `hasContent`, `sessionsList`, `keyOf`, `parseTarget`, and the weight-unit helpers (`UNIT`, `dv`, `inW`, `outW`, `fw`). |
| `js/state.js` | The `S` state object, config normalising (`normCfg`, `normPlan`), plan helpers (`getPlan`, `dayOf`, `nameFor`, `stampLabels`), `setStatus` (also mirrors the text into the menu), `say`. `normCfg` also restores the saved unit. |
| `js/storage.js` | `startStorage` (picks account or device), `onData`, debounced saves (`scheduleSave`, `scheduleCfg`, `commit`, `flush`), `deleteSessions`. |
| `js/log.js` | Log tab: drafts (`loadDraft`, `blankFrom`, `lastSession`), `renderLog`, set entry, per-session target editor. Each exercise is a drop-down; which ones are open lives in `S.openEx` and resets when the session changes. |
| `js/weeks.js` | Weeks tab. |
| `js/year.js` | Year tab charts (heatmap, weekly volume, e1RM line), records, tooltip, example data. |
| `js/people.js` | People bar: add, rename, remove, switch person. |
| `js/plan.js` | Plan tab: split dropdown, day accordions, exercise search, custom days. |
| `js/theme.js` | Appearance: mode, look, session colours, accent. Loaded in `<head>` (before the styles finish) so the saved look is applied before first paint. Applies choices as inline CSS variables on `<html>` (nothing is applied for the default look, so `base.css` stays the source of the defaults), remembers them in `localStorage` key `platelog.theme`, and also holds the Appearance sheet's rendering. The account config doc carries the same object as `theme`. Buttons and selected states use `--accent` / `--on-accent`, which default to the text and background colours. |
| `js/installart.js` | Inline SVG phone drawings for the home-screen install steps (iPhone and Android, 4 steps each). They are simplified illustrations, not real screenshots, and can be swapped for real images later. |
| `js/guide.js` | Guide tab: plain how-to text (no saved data), the install section, and the install banner on the main screen. The banner (`#install` in `index.html`) shows only on touch devices not already running as an installed app, until dismissed. Dismissal is stored per device in `localStorage` key `platelog.hideInstall`. "Show me how" opens the Guide's install section. |
| `js/export.js` | CSV export, in the selected unit. |
| `js/main.js` | `setTab`, `renderActive`, event wiring, start-up, the top-right account menu (`toggleMenu`) and the kg/lb switch under it (`setUnit`). |
| `styles/base.css` | Colour tokens (light/dark), layout, header, tabs, shared controls. |
| `styles/theme.css` (Appearance sheet), `styles/log.css` `weeks.css` `year.css` `plan.css` `people.css` `guide.css` | Styles for the matching area. Each holds its own phone (`max-width:560px`) layout. |
| `styles/auth.css` | Sign-in screen and the top-right account menu / status dot. |

## Data model
Everything is stored as small documents with an id, either in localStorage (`platelog.v1`, one object keyed by doc id) or in the Supabase table `docs (user_id, id, data jsonb)`.

**Session doc**, id `s_<date>_<slot>` for the first person, `s_<personId>_<date>_<slot>` for others:
`{date:'2026-10-18', type:'upperA', label:'Upper A', notes:'', profile:'p1', updated:ms, exercises:[{name, target:'4 × 4–6', sets:[{w:kg|null, r:reps|null}]}]}`
- `type` is a SLOT id, not a name. Slots: `upperA, lowerA, upperB, lowerB, extra, day6`. They give each day its colour (`--c-<slot>`).
- `label` is the day name at the time of logging. History always shows `label`, so changing split never renames old sessions.

**Config doc**, id `config`: `{people:[{id,name}], plans:{<personId>: Plan}, unit:'kg'|'lb'}`
**Plan**: `{split:'ul'|'ppl'|'fb'|'bp'|'custom', days:[Day]}`
**Day**: `{id:<slot>, name, tag, dow:0-6|null (Mon=0), optional:bool, ex:[{name, sets, lo, hi}]}`
Older saves (one array per fixed session type) are migrated by `normPlan`.

## Rules to keep
0. Weights are ALWAYS stored in kg. The unit (`UNIT`) only changes what is shown and typed: use `dv()`/`fw()` to display, `inW()` to fill an input, `outW()` to read one. Never save a converted number.
1. The app must work with no account and no network (device storage).
2. History is never rewritten when the split changes (labels are stamped by `stampLabels`).
3. Stored snapshots from the account backend are frozen: always `clone` before editing (`normCfg` does).
4. Saves are debounced and chained (`chain`) so writes never overlap.
5. Plan tab edits exercise names only. Sets and reps come from the split and can be changed per session on the Log tab.
6. Never put the Supabase secret / service_role key in the repo.

## Common changes
- **New ready-made split:** add an entry to `SPLITS` in `data.js` (max 6 days). Nothing else needed.
- **New library exercises:** add to the `LIB` string in `data.js` as `Name|Group|c` (compound) or `i` (isolation).
- **New tab:** add a tab button and panel in `index.html`, add to `TABS` and `renderActive` in `main.js`, new `js/<name>.js` plus `<script>` tag, new stylesheet plus `<link>`.
- **New field on a session or config:** add it where created, sanitise it in `normCfg`/`normPlan` (config) or keep it optional (session), and update the data model above.
- **Colours / fonts:** tokens in `styles/base.css`.

## Testing
`python3 tests/run_tests.py` (needs Chrome or Chromium; set `CHROME=/path` if not found). It copies `site/`, injects a mock Supabase and a scripted driver, and prints PASS/FAIL. All should pass before deploying. When adding a feature, add checks to the `DRIVERS` in that file.
Note: the mock keeps its fake session inside its fake database, because Chrome headless did not reliably persist a separate localStorage key between runs.

## Deploying
See `SETUP.md`. In short: commit changed files to GitHub; Cloudflare Pages redeploys `site/` within about a minute.

## Not built yet
- Payments (Stripe) and an access check. Plan: `subscriptions` table keyed by user, Stripe Checkout, a Cloudflare Worker or Supabase Edge Function for the webhook, row-level security that only lets paid users save.
- Terms of service page before public launch (a basic privacy policy exists in `site/privacy.html`; review it before sharing widely and update it when payments are added).
- Password-reset new-password screen is written (`cloud.js`, `newpass` mode) but only tested against the mock.

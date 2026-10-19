# Plate Log changelog

Every update has a version number and a name. Use the name when you want something changed, removed or brought back, for example "bring back the old Year tab from v1.4" or "remove the accent colours from v1.5-themes".

| Version | Name | What it added |
|---|---|---|
| v1.0 | launch | Log, Weeks, Year and Plan tabs, accounts and sync |
| v1.1 | units-and-guide | kg/lb switch, account menu top right, phone stacking, Guide tab, privacy page |
| v1.2 | dropdown-exercises | Exercise drop-downs on Log, kg/lb switch under the account button |
| v1.3 | install-prompt | "Tap to log sets" prompt, install banner on the main screen, home-screen install drawings in the Guide |
| v1.4 | island-and-example-week | Space for the iPhone Dynamic Island, example week on the Weeks tab until real data exists |
| v1.5 | themes | Appearance sheet: light/dark/auto, six looks, four session colour sets, accent colour, reset. Saved per device and synced to the account |
| v1.5.1 | guest-button | "Continue as guest" is now a full-width button on the sign-in and create-account screen |
| v1.6 | widgets | Customise button on Weeks and Year: add, remove, reorder and reset blocks, saved to the account. 13 new blocks (total reps, training days, average session, personal records, heaviest set, muscle groups, week streak, sessions per month, most-trained exercises) |

Planned: v1.7 block options (choose the exercise or time range for a block, rename it, make a tile wide).

## Where the old versions are kept

Every released version is saved on GitHub as its own branch, named `backup/<version>-<name>` (for example `backup/v1.4-island-and-example-week`). The website itself is built from `main`. Backups are never deployed and never change.

## How to go back

**Quick: Cloudflare.** Open the project in Cloudflare Pages, go to Deployments, find the deployment from the version you want and choose Rollback. The site changes within seconds. Nothing in GitHub changes.

**Lasting: GitHub.** Ask Claude to restore a version (for example "restore v1.4"). The files from that backup branch are copied back onto `main` as a new commit, so the history stays intact and you can move forward again later.

## Your data and rollbacks

Logs are stored in kg and every version keeps reading the older data formats. Settings saved by a newer version (the look from v1.5, the block layout from v1.6) are ignored by an older one and go back to default if you save there, so rolling back never loses logs.

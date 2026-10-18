# Plate Log: setup and updates

Free to start. You need a Supabase project (accounts + storage), a GitHub repository, and a Cloudflare Pages site.

## 1. Supabase (accounts and storage)
1. Create a project at supabase.com (region nearest your users).
2. SQL Editor, New query, paste all of `docs/supabase.sql`, Run.
3. Project Settings, API: copy the Project URL and the publishable (anon) key into `site/config.js`. Never use the secret / service_role key.
4. Authentication, URL Configuration: set Site URL and add a Redirect URL, both your site address (after step 3).
5. Authentication, Providers, Email: keep Confirm email on for real use. Supabase's built-in email is for testing only (a few emails an hour); add your own SMTP sender (Resend, Brevo, Postmark have free tiers) before inviting many people.

## 2. GitHub
1. Create a repository (private is fine) and upload this whole folder (`site/`, `docs/`, `tests/`).

## 3. Cloudflare Pages connected to GitHub
1. Workers & Pages, Create, Pages, Connect to Git, pick the repository.
2. Framework preset: None. Build command: leave empty. Build output directory: `site`.
3. Save and deploy. The site is live at `<project>.pages.dev`. Add a custom domain under the project's Custom domains tab if you want your own address.
4. On iPhone: open the address in Safari, Share, Add to Home Screen.
(If you prefer no GitHub: Create a project with Upload assets and drag in the contents of `site/`. That cannot be switched to GitHub later.)

## 4. Updating
- Edit or upload the changed file(s) on GitHub (Add file, Upload files, or the pencil icon). Cloudflare republishes automatically within about a minute, with history you can roll back.
- Usually only one or two files change (for example `site/js/plan.js`).
- After an update people may need to reload once (or close and reopen the Home Screen app).
- Run `python3 tests/run_tests.py` first if you can.

## Things to know
- Free Supabase projects pause after about a week of no activity (restore in one click).
- Free Supabase has no automatic backups; the app's Export (CSV) button is the user's backup.
- You will store emails and training data: add a privacy policy and terms before launching publicly. In Australia, check ABN and tax before charging.

# Sueños Tequila CRM

Single-file React app (React UMD + Babel-standalone) assembled from source parts
into one `index.html`, deployed as a static PWA. Backend is Supabase (Postgres +
Auth + Edge Functions).

## How it builds

`assemble_cloud.py` concatenates the `suenos-crm-*.js` parts (in a fixed order)
into `index.html`, injecting the Supabase URL/anon key and Google Maps key.
`build.sh` runs the assembler and stages only the static app shell into `dist/`.

```bash
bash build.sh      # → dist/ (index.html, sw.js, manifest.json, icons)
```

## Deploying (Netlify, continuous)

Netlify is configured via `netlify.toml`:
- Build command: `bash build.sh`
- Publish directory: `dist`

Every push to the default branch triggers a Netlify build & deploy. No manual
zips — edit a source part, commit, and the site rebuilds itself.

## What lives where

| Path | Purpose |
|---|---|
| `suenos-crm-*.js` | App source (parts assembled in `assemble_cloud.py`) |
| `assemble_cloud.py` | The build script (concatenate + inject keys) |
| `build.sh` / `netlify.toml` | CI build + publish config |
| `sw.js`, `manifest.json`, `icon-*.png` | PWA shell/static assets |

## NOT in this repo (kept private)

- **Database migrations (`*.sql`)** — some contain shared secrets; store them
  privately. They are not needed to build the site.
- **Supabase Edge Functions** — deployed separately via the Supabase dashboard.
- Server secrets (service-role key, Resend, tokens) live only as Supabase
  function secrets, never in this repo.

> Keep this repository **private** — the built app embeds a client Google Maps
> key (restrict it by HTTP referrer to crm.suenos.ca in Google Cloud Console).

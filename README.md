# published-pages
Tools and pages

## Development

Prerequisites: [Node.js](https://nodejs.org/) (v22+)

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (frontend only, no Functions)
npm run build        # Type-check and build for production
npm test             # Run tests (Vitest)
npm run lint         # Lint and format check (Biome)
npm run lint:fix     # Auto-fix lint and format issues
npm run typecheck    # Type-check only (TypeScript — frontend + functions)
```

`npm run dev` only runs the static site. To exercise the Settle Up Pages
Functions (plus its KV namespace) locally, run a production build first
then `wrangler pages dev`:

```bash
npm run build
npx wrangler pages dev dist --kv=SPLITWISE
```

## Settle Up: Cloudflare KV setup (one-time)

Group state is stored as a single JSON blob per group in a Cloudflare KV
namespace, keyed by `group:<uuid>`. To wire it up on a fresh Cloudflare
Pages project:

1. Create the namespace:
   ```bash
   npx wrangler kv:namespace create SPLITWISE
   ```

2. In the Pages dashboard, bind it to the Pages project under
   **Settings → Functions → KV namespace bindings**:
   - **Variable name:** `SPLITWISE`
   - **Namespace:** pick the one you just created

   Save, then redeploy the latest commit so the binding takes effect.

### Caveats

- KV is eventually consistent. Writes can take up to ~60s to propagate
  globally. For this app (one person usually editing a group at a time)
  it's fine, but two simultaneous writers could lose an update.
- All Pages deploys (production + previews) share the bound namespace
  by default. Use the dashboard's per-environment bindings if you want
  a separate preview namespace.

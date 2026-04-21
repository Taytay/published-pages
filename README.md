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
Functions locally, run `npm run build` first and then:

```bash
npx wrangler pages dev dist --d1=DB=splitwise-db
```

## Settle Up: Cloudflare D1 setup (one-time)

The Settle Up tool persists group data in a Cloudflare D1 database via Pages
Functions under `functions/api/`. To wire it up on a fresh Cloudflare Pages
project:

1. Create the database:
   ```bash
   npx wrangler d1 create splitwise-db
   ```
   Copy the printed `database_id` into `wrangler.toml`.

2. Apply the schema:
   ```bash
   npx wrangler d1 execute splitwise-db --remote --file=migrations/0001_init.sql
   ```

3. Confirm the Pages project binds the database as `DB` — either via the
   dashboard (**Settings → Functions → D1 database bindings**) or by keeping
   `wrangler.toml` checked in (Cloudflare picks it up automatically).

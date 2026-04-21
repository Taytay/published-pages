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
Functions (plus its Durable Object) locally:

```bash
cp wrangler.example.toml wrangler.toml   # first time only
npm run build
npx wrangler pages dev dist
```

## Settle Up: Cloudflare Durable Object setup (one-time)

The Settle Up tool stores each group in its own Durable Object instance (class
`GroupDO`, defined in `functions/group-do.ts`), keyed by the group's secret
UUID. To wire it up on a fresh Cloudflare Pages project:

1. Copy the example config so local dev works:
   ```bash
   cp wrangler.example.toml wrangler.toml
   ```
   `wrangler.toml` is gitignored; you don't need to edit it.

2. Push the code. On first deploy Cloudflare will detect the new `GroupDO`
   class but won't bind it automatically.

3. In the Pages dashboard, add the binding under
   **Settings → Functions → Durable Object bindings**:
   - **Variable name:** `GROUPS`
   - **Datastore:** *(from current Pages script)* → `GroupDO`

   Save, then redeploy the latest commit so the binding takes effect.

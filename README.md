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
Functions (plus the `GroupDO` Durable Object) locally:

```bash
npm run build
npx wrangler pages dev dist
```

## Settle Up: Cloudflare Durable Object

The Settle Up tool stores each group in its own Durable Object instance (class
`GroupDO`, defined in `functions/group-do.ts`), keyed by the group's secret
UUID. The binding is declared in `wrangler.toml` (checked in) — Cloudflare
Pages reads it at build time and registers/binds the class automatically on
deploy. No dashboard setup required.

If you ever need to wipe all group data, delete the Durable Object namespace
from the Pages project's dashboard; a new one will be created on the next
deploy.

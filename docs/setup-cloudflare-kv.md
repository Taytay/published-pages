# One-time Cloudflare KV setup for Settle Up

Paste the block below — starting from the line after the fence — into a Claude
Code session that has `CLOUDFLARE_API_TOKEN` set and can reach
`api.cloudflare.com`. Delete this file once the setup is done.

---

I need you to set up a Cloudflare Workers KV namespace and bind it to an
existing Cloudflare Pages project. The `CLOUDFLARE_API_TOKEN` env var is
already set.

**Context:**
- Cloudflare account ID: `80e02701311e717b4f7bbafe1b273f01`
- Pages project name: `taytays-tools`
- KV binding variable name (must match): `SPLITWISE`
- The Pages project already deploys a branch called
  `claude/publish-splitwise-app-kTLFp` whose Pages Functions expect
  `env.SPLITWISE` to be bound. Without the binding the API calls 500 at
  runtime.

**Do this:**

1. Verify the token works and scope looks right:

   ```bash
   npx wrangler whoami
   ```

2. Create the KV namespace. One namespace is fine; Pages will share it
   across prod + preview, which is what we want:

   ```bash
   npx wrangler kv namespace create SPLITWISE
   ```

   Capture the returned `id` (a 32-char hex string). You can double-check
   with `npx wrangler kv namespace list`.

3. Bind the namespace to the Pages project for **both** the `production`
   and `preview` environments. Wrangler's Pages binding CLI is thin, so
   PATCH the project config via the REST API:

   ```bash
   curl -sS -X PATCH \
     "https://api.cloudflare.com/client/v4/accounts/80e02701311e717b4f7bbafe1b273f01/pages/projects/taytays-tools" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "deployment_configs": {
         "production": {
           "kv_namespaces": { "SPLITWISE": { "namespace_id": "<PASTE_NAMESPACE_ID>" } }
         },
         "preview": {
           "kv_namespaces": { "SPLITWISE": { "namespace_id": "<PASTE_NAMESPACE_ID>" } }
         }
       }
     }' | jq .
   ```

   Expect `"success": true` with `kv_namespaces` populated for both
   environments.

4. Trigger a fresh deploy of the `claude/publish-splitwise-app-kTLFp`
   branch. Find the latest deployment on that branch and retry it:

   ```bash
   curl -sS \
     "https://api.cloudflare.com/client/v4/accounts/80e02701311e717b4f7bbafe1b273f01/pages/projects/taytays-tools/deployments" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | \
     jq '.result[] | select(.deployment_trigger.metadata.branch == "claude/publish-splitwise-app-kTLFp") | {id, created_on, short_id}' | head -20
   ```

   Take the newest `id` and retry it:

   ```bash
   curl -sS -X POST \
     "https://api.cloudflare.com/client/v4/accounts/80e02701311e717b4f7bbafe1b273f01/pages/projects/taytays-tools/deployments/<DEPLOYMENT_ID>/retry" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq .
   ```

5. Poll the new deployment until it's `success` or `failure`:

   ```bash
   curl -sS \
     "https://api.cloudflare.com/client/v4/accounts/80e02701311e717b4f7bbafe1b273f01/pages/projects/taytays-tools/deployments/<NEW_DEPLOYMENT_ID>" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | \
     jq '.result | {latest_stage: .latest_stage.status, url}'
   ```

**Report back:**

- The KV namespace ID you created.
- Whether the PATCH returned `success: true` and the binding is visible
  on both `production` and `preview` in the JSON response.
- Whether the retriggered deployment succeeded.
- The deployment's preview URL.

If step 3's PATCH returns an error about missing required fields, the Pages
API wants the full `deployment_configs` block preserved. In that case: GET
the project first, merge the `kv_namespaces` field into the existing
config, and PATCH the merged result back.

# Sueños CRM agent bridge

Companion to the OAuth/MCP service in `thesuenocompany/Suenos-OS`. The bridge supports account searches, account history, reps, follow-ups, recorded sales aggregation and audited task creation/updates. It does not expose raw queries, deletes, messaging, or account mutations.

## Deploy

Apply `supabase/migrations/20260914203918_suenos_agent_bridge.sql` to CRM project `dowfjjthshbbgnvwxzjv`. Deploy the complete `supabase/functions/suenos-agent-bridge` directory:

```sh
supabase functions deploy suenos-agent-bridge --project-ref dowfjjthshbbgnvwxzjv --no-verify-jwt
```

Gateway JWT verification is disabled because this function implements its own mandatory opaque OAuth token authentication. It accepts only `sua_` credentials, introspects them at the fixed OS issuer `https://os.thesuenocompany.com/api/agent/session`, enforces the requested scope, maps the verified OS subject to a CRM user in a server-only allowlist, and rechecks active CRM administrator status. Missing, expired, revoked, unmapped and inactive credentials fail closed. Supabase injects the CRM service credential into the function; no OS key is stored in CRM and no credential is returned to clients.

The initial migration maps only the previously verified owner identities. Adding another person requires verifying both identities and explicitly adding their mapping. Do not match users by display name.

Apply/deploy the OS companion before authorizing the first ChatGPT connection. The owner connects through the OS **Agent connections** page; there is no second CRM password form.

## Integrity

Task writes and audit entries share a transaction. Retries use a stable request hash and UUID key; changed inputs with a reused key are rejected. Updates require a full-row snapshot hash to detect concurrent edits from the existing CRM UI. The existing tasks schema and application RLS policies are unchanged. All new tables use RLS with service-only grants; all new functions are security invoker and have service-only execute grants.

Sales summaries aggregate recorded sales directly, excluding orders, over a maximum 36-month span. Revenue is labelled recorded revenue with unknown currency because the source rows do not store currency. The service never interprets missing records as proof that sales did not occur.

## Verify and disable

Run `npm ci --ignore-scripts` and `npm run test:agent` for HTTP authentication, permission, mapping, validation, routing and failure checks. Run `tests/agent-database.sql` after the migration to check native inserts, idempotency, snapshots, sales and membership; all test records roll back.

Revoke a connection from the OS page to stop both systems, or set the CRM membership mapping inactive to stop CRM access. Requests already in progress may complete. Retain audit tables during rollback. This bridge runs on demand; it creates no schedule and sends no messages.

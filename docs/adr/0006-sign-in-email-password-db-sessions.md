# 0006: Sign-in: email + password, sessions in Postgres

## Status

Accepted (2026-11-23). Decides HFP-025 (#48). Passkeys may be added later as a second credential type.

## Context

Until now the API acts as one fixed User (`DEV_USER_ID`, see [0005](0005-api-hono-raw-sql-same-origin.md)). Every query is already scoped by `projects.owner_id`, so replacing that fixed User with the signed-in one is enough to make the app multi-user. [0004](0004-data-model.md) left the auth tables to this decision.

The constraints:

- [0001](0001-hosted-first-own-api-and-eu-postgres.md): no third parties, and we write the auth ourselves because learning it is a goal.
- Researchers store interview transcripts, which are personal data about other people. A stolen account exposes them.
- The host, and therefore any way of sending email, is still open (HFP-024). Nothing in sign-in may depend on email yet.
- The app and API share one origin (0005), so a `SameSite=Strict`, `HttpOnly` cookie works with no CORS.

## Decision

### Method: email + password

- A User signs in with their email address and a password.
- Passwords are hashed with **argon2id**, starting at OWASP's minimum (19 MiB memory, 2 iterations, parallelism 1). The hash is stored as a PHC string, which records the algorithm, parameters and salt, so the parameters can be raised later and old hashes upgraded on the next successful sign-in. This adds one native npm package to `server/`, chosen when sign-in is implemented.
- Password rules follow NIST SP 800-63B: at least 12 characters, at most 128 (a cap stops very long inputs from tying up the hasher), and no composition rules or forced rotation. No breached-password check for now, because the usual one (Have I Been Pwned) is a third-party call.
- **No open sign-up yet.** Accounts are created by the operator with a server script (`npm run user:create`). Open sign-up needs email verification, and email waits for HFP-024.
- **No self-service password reset yet.** The operator resets a password with a script, which also ends all of that User's sessions. Self-service reset by email comes with HFP-024.

### Sessions: an opaque token, stored hashed

- On sign-in the server creates a new session: 32 random bytes, sent to the browser base64url-encoded. The database stores only the **SHA-256 of the token**, so a database leak or backup does not contain usable sessions.
- Cookie: `__Host-session`, `HttpOnly; Secure; SameSite=Strict; Path=/`, no `Domain`. The `__Host-` prefix makes the browser reject the cookie unless it is `Secure`, has `Path=/` and has no `Domain`, so a subdomain cannot set or overwrite it.
- Lifetime: a session expires after **7 days without use** and **30 days after sign-in** at the latest. `last_seen_at` is updated at most once an hour, so reading a session does not write to the database on every request.
- A new session is always created on sign-in, never reused, which rules out session fixation.
- Revocation: sign-out deletes the session row. A password change or reset deletes every session for that User. Expired rows are deleted when they are looked up and by a periodic `DELETE … WHERE expires_at < now()`.

### Tables (migration written by the owner)

| Table | Columns |
|---|---|
| `password_credentials` | `user_id` (primary key, → users, cascade), `password_hash`, `created_at`, `updated_at` |
| `sessions` | `user_id` (→ users, cascade), `token_hash` (bytea, primary key), `created_at`, `last_seen_at`, `expires_at` |

The password hash lives in its own table, not on `users`, so a passkey table can sit next to it later without changing `users`, and a User row can be read without loading the hash.

### Request handling

- A middleware reads the cookie, hashes the token, looks up an unexpired session and sets the current User. `/api/projects/*` and every later route return **401** without one; `/api/auth/sign-in` is the only open route.
- State-changing requests must carry an `Origin` header that matches our origin (Hono's built-in `csrf` middleware). `SameSite=Strict` already blocks cross-site requests in current browsers; the `Origin` check also covers older ones.
- Sign-in failures always return the same message ("Email or password is incorrect"). When no User matches the email, the server still hashes the password against a dummy hash, so the response time does not reveal which emails have accounts.
- Sign-in attempts are rate-limited per email and per IP address, in memory: 10 failures in 15 minutes locks that email or IP out for 15 minutes. This only works while the API runs as a single process, and it resets on restart.
- `DEV_USER_ID` is removed. The development seed creates a User with a known password, and API tests create sessions directly in the database.

### Personal data stored

- `users.email` (needed to sign in) and `users.display_name` (optional), as in 0004.
- The password hash.
- Per session: token hash, created, last seen and expiry times. **No IP address or user agent is stored.** The rate limiter keeps IP addresses in memory for at most 15 minutes.
- Emails and passwords are never written to logs.

### Deleting an account

`DELETE FROM users WHERE id = $1` deletes the User's credentials, sessions and projects, and through 0004's cascades everything under those projects. A server test checks that nothing owned by the User is left afterwards. For now the operator deletes an account with a script; a self-service "delete my account" (with password re-entry) is a later issue. Deleted data stays in database backups until they rotate out; the backup retention period is decided with the host (HFP-024).

## Rejected alternatives

- **Magic links.** No secret to store, but sign-in would depend entirely on sending email, which needs either a third-party email provider (with a DPA) or our own mail server, and HFP-024 has not picked either. Links also end up in spam, and corporate mail scanners can use up single-use links by opening them.
- **Passkeys first.** Phishing-resistant, and the server stores only a public key. But a User who loses all their devices needs another way back in, and without email that is recovery codes or the operator. Also more to learn at once (WebAuthn challenges, the relying-party ID tied to the final domain). Kept as the next step: a `passkey_credentials` table next to `password_credentials`, with the same sessions.
- **A hosted or self-hosted identity provider** (an EU-hosted service, or Keycloak, Zitadel, Authentik). A hosted one is a third party processing every User; a self-hosted one is a second service to run and patch. Both take away the auth work 0001 wants us to do ourselves.
- **An auth library such as better-auth.** It would generate the tables and flows, which is the part we want to write and understand. Lucia's guides (the library itself is deprecated) are a good reference for the same design.
- **Stateless JWTs.** They cannot be revoked before they expire without a server-side denylist, which is a session table again. HFP-025 requires that sign-out ends the session on the server.
- **Token in `localStorage` with an `Authorization` header.** Any script running on the page could read it. An `HttpOnly` cookie cannot be read from JavaScript.
- **scrypt from `node:crypto`.** It comes with Node, so it needs no dependency, and OWASP accepts it. But argon2id is OWASP's first choice, and the PHC string format makes later parameter changes straightforward. One native package is a small price for that.

## Consequences

- No email is needed for anything in this ADR. Open sign-up, self-service reset and email verification all wait for HFP-024.
- Until then, every account is created, reset and deleted by the operator. That is fine for a handful of researchers and not beyond.
- The in-memory rate limiter ties the API to one process. Running more than one instance means moving the counters into Postgres.
- `__Host-` cookies require `Secure`. Chrome and Firefox accept `Secure` cookies on `http://localhost`; Safari may not, so development is tested in Chrome or Firefox, or over HTTPS.
- A `GET /api/auth/me` endpoint lets the app find out whether it is signed in; the router sends Users without a session to a sign-in screen, and any 401 from the API does the same.
- Adding passkeys later adds a table and two routes (register, sign in); sessions, middleware and deletion do not change.

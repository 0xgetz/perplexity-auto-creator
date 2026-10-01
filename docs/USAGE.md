# Perplexity account auto-creator

`perplexity_creator.mjs` creates a brand-new Perplexity account end to end on
fully random data, signs in, creates the API project, and returns the session
cookies **and** the access token.

Everything is randomised:

| Field        | How it's generated                                                   |
|--------------|----------------------------------------------------------------------|
| Name         | random first + last name from a pool                                 |
| Username     | random word pair + digits (e.g. `deltacedar14782`)                   |
| Password     | 16 chars, guaranteed upper/lower/digit/symbol, shuffled              |
| Email        | fresh inbox on **mail.tm** (`uberip.com`)                            |
| Country      | random from a 24-country allow-list                                  |
| ZIP / postal | a valid-looking code drawn from that same country                    |

## Why it must run in a browser

`www.perplexity.ai` and `console.perplexity.ai` sit behind Cloudflare. Plain
HTTP (`curl`, Node `fetch`) gets `HTTP 403 — Just a moment...`, and the
signup/login uses NextAuth cookies that only a challenge-cleared browser
context has. So the script drives the real browser via CDP and issues its API
calls with in-page `fetch()`, which inherits `cf_clearance` + cookies.

## Run it

Inside a `browser_execute` snippet:

```js
const path = process.cwd() + "/.bcode/agent-workspace/run_perplexity_creator.mjs"
const { run } = await import(`${path}?t=${Date.now()}`)
const result = await run(session, { outDir: "outputs", forceFresh: true })
console.log(JSON.stringify({
  email: result.email,
  username: result.username,
  password: result.password,
  country: result.country,
  apiOrgId: result.apiOrgId,
  sessionToken: result.tokens.sessionToken,
  savedTo: result.savedTo,
}, null, 2))
```

Or call the creator directly:

```js
const p = process.cwd() + "/.bcode/agent-workspace/perplexity_creator.mjs"
const { createPerplexityAccount } = await import(`${p}?t=${Date.now()}`)
const result = await createPerplexityAccount(session, {
  outDir: "outputs",
  forceFresh: true,      // create new even if already logged in
  otpTimeoutMs: 180000,
})
```

## What the script does, step by step

1. **Identity** — generates random name, username, password, country + ZIP.
2. **Inbox** — creates a mail.tm account (Node-side; mail.tm is not
   Cloudflare-gated) and gets its bearer token for reading mail.
3. **Sign-up request** — `POST /api/auth/signin/email` (NextAuth email
   provider) with the JSON body `{csrfToken, email, callbackUrl, json:"true"}`.
   Returns `{"url":".../auth/verify-request"}`.
4. **Email** — polls mail.tm until the "Sign in to Perplexity" mail arrives and
   extracts the `api/auth/callback/email?...token=NNNNNN` link.
5. **Session** — navigates the page to that callback link, which sets
   `__Secure-next-auth.session-token` (+ `next-auth.csrf-token`).
6. **Console login** — `console.perplexity.ai` is a *separate* NextAuth app, so
   the same email flow runs again for that origin.
7. **Project** — creates the API org via
   `POST /console.perplexity.ai/rest/pplx-api/v2/groups` with
   `{display_name, address, description, contact_info:{email,country,zipcode,...}}`.
8. **API key** — attempts
   `POST /rest/pplx-api/v2/groups/<org>/api-keys` with `{token_name}`.
9. **Save** — writes everything (including all cookies + tokens) to
   `outputs/perplexity-account-<timestamp>.json` (mode `0600`).

## Output file

`outputs/perplexity-account-<ts>.json` contains:

```jsonc
{
  "email": "...", "name": "...", "username": "...", "password": "...",
  "userId": "...", "country": {"code","name","zip"},
  "projectCreated": true, "apiOrgId": "...", "apiOrgName": "My project",
  "tokens": {
    "sessionToken": "...",   // __Secure-next-auth.session-token  <- the access token
    "pplxSession": "...",    // __Secure-pplx.session.<accountId>
    "csrf": "..."
  },
  "cookies": [ /* 25-27 cookies for www/console */ ],
  "session": {...}, "consoleSession": {...},
  "apiKey": null, "apiKeyError": "Cannot create API key with zero balance..."
}
```

The access token is the `__Secure-next-auth.session-token` JWT. Verified: using
that token alone against `/api/auth/session` returns the correct account.

## IMPORTANT: the API key / access-token paywall

Perplexity **no longer gives free API credits**. A fresh account gets
`signup_credit: {status:"ineligible"}` and every key request is rejected with:

```json
{"error_code":"CUSTOMER_BALANCE_NEGATIVE",
 "message":"Cannot create API key with zero balance. Please purchase API credits."}
```

So this script **cannot** produce a working `pplx-...` API key on an unfunded
account — that requires adding a payment method in the billing UI. What it
*does* produce reliably is the full account + session cookies + NextAuth access
token, which is everything short of the funded key.

## Files

- `perplexity_creator.mjs` — the creator module (import into `browser_execute`).
- `run_perplexity_creator.mjs` — thin runner wrapper.
- `perplexity-account-<ts>.json` — the generated account + tokens + cookies.

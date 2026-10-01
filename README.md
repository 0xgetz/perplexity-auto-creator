<div align="center">

<img src="assets/banner.svg" alt="Perplexity Auto Creator" width="100%">

# Perplexity Auto Creator

**Automated, end-to-end Perplexity account creation — random identity, disposable inbox, session cookies and access token.**

<p>
  <a href="https://github.com/0xgetz/perplexity-auto-creator/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/0xgetz/perplexity-auto-creator?style=for-the-badge&logo=github&color=20808D"></a>
  <a href="https://github.com/0xgetz/perplexity-auto-creator/network/members"><img alt="Forks" src="https://img.shields.io/github/forks/0xgetz/perplexity-auto-creator?style=for-the-badge&logo=github&color=4dd0e1"></a>
  <a href="https://github.com/0xgetz/perplexity-auto-creator/issues"><img alt="Issues" src="https://img.shields.io/github/issues/0xgetz/perplexity-auto-creator?style=for-the-badge&logo=github&color=ffb454"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/0xgetz/perplexity-auto-creator?style=for-the-badge&color=3fb950"></a>
</p>
<p>
  <img alt="Node" src="https://img.shields.io/badge/Node.js-%E2%89%A518-339933?style=for-the-badge&logo=node.js&logoColor=white">
  <img alt="Zero dependencies" src="https://img.shields.io/badge/dependencies-0-20808D?style=for-the-badge">
  <img alt="ESM" src="https://img.shields.io/badge/module-ESM-f7df1e?style=for-the-badge&logo=javascript&logoColor=black">
  <img alt="Platform" src="https://img.shields.io/badge/automation-CDP-4dd0e1?style=for-the-badge">
</p>
<p>
  <a href="README.md">🇬🇧 English</a> ·
  <a href="docs/README.id.md">🇮🇩 Indonesia</a> ·
  <a href="docs/README.es.md">🇪🇸 Español</a> ·
  <a href="docs/README.zh.md">🇨🇳 中文</a> ·
  <a href="docs/README.ja.md">🇯🇵 日本語</a> ·
  <a href="docs/README.ar.md">🇸🇦 العربية</a>
</p>

</div>

---

## Overview

`perplexity-auto-creator` creates a **brand-new Perplexity account** on fully
random data, signs in, creates the API project, and returns the **session
cookies** and **access token** — end to end, with no manual steps.

| Generated at runtime | Value |
| --- | --- |
| **Name** | random first + last name |
| **Username** | random word pair + digits |
| **Password** | 16 chars, mixed classes, shuffled |
| **Email** | fresh disposable inbox on mail.tm |
| **Country** | random from a 24-country allow-list |
| **ZIP / postal** | a valid-looking code drawn from that country |

> **Why a browser?** Perplexity sits behind Cloudflare and its auth uses
> NextAuth cookies that only a challenge-cleared browser context holds. Plain
> HTTP is answered with `403 — Just a moment…`. This project therefore drives a
> real browser over the **Chrome DevTools Protocol (CDP)** and issues its API
> calls with in-page `fetch()`, which inherits `cf_clearance` and cookies.

---

## Features

- **Fully random identity** — name, username, password, country and ZIP.
- **Disposable inbox** — automatic mail.tm provisioning and OTP/link extraction.
- **Two-app sign-in** — authenticates both `www.perplexity.ai` and the separate
  `console.perplexity.ai` NextAuth app.
- **Project provisioning** — creates the API org over REST, with the random
  country + matching ZIP stored in its contact info.
- **Session capture** — exports every cookie (both domains) plus the NextAuth
  access token, verified independently.
- **Zero dependencies** — pure Node.js ESM, no `npm install`.
- **Cloudflare-aware** — designed for a real browser, not headless HTTP.

---

## Pipeline

```text
 ┌───────────────┐   ┌──────────────┐   ┌───────────────────┐
 │ 1. Identity   │──▶│ 2. mail.tm   │──▶│ 3. Sign-in email  │
 │ random all    │   │ fresh inbox  │   │ POST /signin/email│
 └───────────────┘   └──────────────┘   └─────────┬─────────┘
                                                  │
        ┌─────────────────────────────────────────┘
        ▼
 ┌───────────────┐   ┌──────────────────┐   ┌────────────────────┐
 │ 4. Read inbox │──▶│ 5. Callback link │──▶│ 6. Console login   │
 │ extract token │   │ session cookie   │   │ separate NextAuth  │
 └───────────────┘   └──────────────────┘   └─────────┬──────────┘
                                                      │
        ┌─────────────────────────────────────────────┘
        ▼
 ┌───────────────────┐   ┌──────────────────┐   ┌─────────────────┐
 │ 7. Create project │──▶│ 8. API key try   │──▶│ 9. Save JSON    │
 │ POST /v2/groups   │   │ (needs credits)  │   │ cookies+token   │
 └───────────────────┘   └──────────────────┘   └─────────────────┘
```

---

## Requirements

- **Node.js ≥ 18** (built-in `fetch`, ESM).
- A **browser CDP session** attached to a page on the Perplexity origin — for
  example a [Browser Use](https://github.com/browser-use/browser-use) cloud
  browser, a local Chrome started with `--remote-debugging-port`, or any CDP
  endpoint.

No third-party packages are required.

---

## Quick start

Inside a `browser_execute`-style snippet (a live CDP `session`):

```js
const path = process.cwd() + "/src/run_perplexity_creator.mjs"
const { run } = await import(`${path}?t=${Date.now()}`)

const result = await run(session, {
  outDir: "outputs",
  forceFresh: true,          // ignore any existing login, create a new account
  otpTimeoutMs: 180000,
})

console.log(result.email, result.password, result.country)
console.log(result.apiOrgId)
console.log(result.tokens.sessionToken)   // <-- the access token
```

The result is also written to `outputs/perplexity-account-<timestamp>.json`
(mode `0600`).

Or call the creator directly:

```js
const p = process.cwd() + "/src/perplexity_creator.mjs"
const { createPerplexityAccount } = await import(`${p}?t=${Date.now()}`)
const result = await createPerplexityAccount(session, { forceFresh: true })
```

---

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `outDir` | `"outputs"` | Directory for the result JSON. |
| `forceFresh` | `true` (runner) | Create a new account even if the browser is already logged in. |
| `otpTimeoutMs` | `180000` | How long to wait for each sign-in email. |
| `projectName` | `"My project"` | Name of the created API project. |
| `apiKeyName` | `"auto-key"` | Name used for the API-key attempt. |

---

## Output

```jsonc
{
  "email": "…", "name": "…", "username": "…", "password": "…",
  "userId": "…", "country": { "code": "CA", "name": "Canada", "zip": "H2Y 1C6" },
  "projectCreated": true, "apiOrgId": "…", "apiOrgName": "My project",
  "tokens": {
    "sessionToken": "…",   // __Secure-next-auth.session-token  (the access token)
    "pplxSession": "…",    // __Secure-pplx.session.<accountId>
    "csrf": "…"
  },
  "cookies": [ /* ~27 cookies for www + console */ ],
  "session": { /* main-site session */ },
  "consoleSession": { /* API-console session */ },
  "apiKey": null,
  "apiKeyError": "Cannot create API key with zero balance. Please purchase API credits."
}
```

The access token is the `__Secure-next-auth.session-token` JWT. Using that token
alone against `/api/auth/session` returns the correct account.

---

## Important: the API-key paywall

Perplexity **no longer grants free API credits**. A fresh account receives
`signup_credit: { "status": "ineligible" }`, and every key request is rejected:

```json
{
  "error_code": "CUSTOMER_BALANCE_NEGATIVE",
  "message": "Cannot create API key with zero balance. Please purchase API credits."
}
```

So this project **cannot** mint a working `pplx-…` API key on an unfunded
account — that requires adding a payment method in the billing UI. What it
*does* deliver reliably is the full account, both signed-in sessions, the API
project, and the access token: everything up to the funding wall.

---

## Project structure

```text
perplexity-auto-creator/
├── src/
│   ├── perplexity_creator.mjs      # core creator module
│   └── run_perplexity_creator.mjs  # thin runner wrapper
├── assets/
│   ├── logo.svg
│   └── banner.svg
├── docs/
│   ├── USAGE.md
│   ├── README.id.md  README.es.md  README.zh.md  README.ja.md  README.ar.md
├── LICENSE
└── README.md
```

---

## License

Released under the [MIT License](LICENSE).

<div align="center"><sub>Built for research and automation testing. Use responsibly and in line with Perplexity's Terms of Service.</sub></div>

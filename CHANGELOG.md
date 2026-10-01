# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-09-27

### Added

- End-to-end Perplexity account creation with a fully random identity:
  name, username, password, country, and matching ZIP/postal code.
- Automatic disposable inbox provisioning on **mail.tm** with OTP / callback
  link extraction.
- NextAuth email sign-in for both `www.perplexity.ai` and the separate
  `console.perplexity.ai` app.
- API project (org) creation via `POST /rest/pplx-api/v2/groups`, storing the
  random country and ZIP in the org's contact info.
- Session capture: all cookies for both domains plus the
  `__Secure-next-auth.session-token` access token.
- `run_perplexity_creator.mjs` runner wrapper.
- Documentation in six languages (EN, ID, ES, ZH, JA, AR) with shields.io
  badges.
- SVG logo and banner assets.
- MIT license, contribution and security policies.

### Notes

- Perplexity no longer grants free API credits. A funded account is required to
  mint a working `pplx-…` API key; the key request returns
  `CUSTOMER_BALANCE_NEGATIVE` on a zero balance.
- The tool is Cloudflare-aware and must run against a real browser CDP session.

# Security Policy

## Reporting a vulnerability

If you discover a security issue, please **do not** open a public issue.
Instead, report it privately via GitHub's
[Security Advisories](https://github.com/0xgetz/perplexity-auto-creator/security/advisories/new)
or by opening an issue asking for a private channel.

Please include:

- a description of the issue and its impact,
- steps to reproduce,
- any relevant logs (redact secrets first).

You can expect an acknowledgement within a few days.

## Handling of credentials

This project creates accounts and captures **session cookies and access
tokens**. Treat every generated artifact as a live credential:

- Result files are written with mode `0600` and are **git-ignored** by default.
- Never commit `outputs/`, `perplexity-account-*.json`, or any `.env` file.
- Never paste real cookies, tokens, or passwords into issues or pull requests.

## Scope

This is an automation tooling project. It does not run a network service and
does not process third-party data on your behalf. The main security surface is
local: the credentials it produces and the browser session you point it at.

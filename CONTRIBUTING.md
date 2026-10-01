# Contributing

Thanks for your interest in **perplexity-auto-creator**! Contributions of all
kinds are welcome — bug reports, fixes, docs, and translations.

## Getting started

1. Fork the repository and clone your fork.
2. Create a branch: `git checkout -b feat/short-description`.
3. Make your change. Keep the code dependency-free (pure Node.js ESM).
4. Sanity-check the syntax: `npm run check`.
5. Commit with a clear message and open a Pull Request.

## Guidelines

- **No dependencies.** The project intentionally ships with zero npm packages.
  Use Node.js built-ins only (`node:fs`, `node:path`, `fetch`, …).
- **Keep it end-to-end.** Any change should preserve the full pipeline:
  identity → inbox → sign-in → console → project → capture.
- **Match the style.** The code uses small, named helpers and comments that
  explain *why*, not *what*.
- **Never commit secrets.** Account JSON, cookies and tokens are git-ignored —
  keep it that way.
- **Test in a real browser.** Because of Cloudflare, changes must be validated
  against a live CDP session, not mocked HTTP.

## Translations

The README is available in six languages under `docs/`. When you change the
main `README.md`, please update the translations you can, and note in the PR
which ones still need work.

## Reporting bugs

Open an issue with:

- what you expected vs. what happened,
- the full error/stack trace,
- your Node version and how the browser session was provided.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).

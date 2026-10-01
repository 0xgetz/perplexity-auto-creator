/**
 * run_perplexity_creator.mjs
 *
 * One-liner runner for the Perplexity account auto-creator.
 *
 * Because Perplexity is behind Cloudflare and its signup/login relies on
 * NextAuth cookies that only a real browser holds, this must run INSIDE a
 * `browser_execute` snippet (a live CDP session on the Perplexity origin).
 *
 * Paste this into a browser_execute call:
 *
 *   const path = process.cwd() + "/.bcode/agent-workspace/run_perplexity_creator.mjs"
 *   const { run } = await import(`${path}?t=${Date.now()}`)
 *   const result = await run(session, { outDir: "outputs", forceFresh: true })
 *   console.log(JSON.stringify({
 *     email: result.email, username: result.username,
 *     password: result.password, country: result.country,
 *     apiOrgId: result.apiOrgId,
 *     sessionToken: result.tokens.sessionToken,
 *     savedTo: result.savedTo,
 *   }, null, 2))
 *
 * The returned object is also written to outputs/perplexity-account-<ts>.json.
 */

export async function run(session, opts = {}) {
  const creatorPath =
    process.cwd() + "/.bcode/agent-workspace/perplexity_creator.mjs";
  const { createPerplexityAccount } = await import(
    `${creatorPath}?t=${Date.now()}`
  );
  return createPerplexityAccount(session, {
    outDir: opts.outDir || "outputs",
    // forceFresh: true => ignore any logged-in session and create a brand-new
    // account. Set false to reuse the browser's current Perplexity login.
    forceFresh: opts.forceFresh !== false,
    otpTimeoutMs: opts.otpTimeoutMs || 180000,
    projectName: opts.projectName || "My project",
    apiKeyName: opts.apiKeyName || "auto-key",
  });
}

export default run;

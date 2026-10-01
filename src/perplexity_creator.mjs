/**
 * perplexity_creator.mjs
 *
 * End-to-end Perplexity account auto-creator.
 *
 * Creates a brand-new Perplexity account with:
 *   - random name + random strong password
 *   - random temporary inbox on mail.tm
 *   - random country from an allow-list + ZIP matching that country
 * then signs in, creates an API project (org), and returns the session
 * cookies + access token for both www.perplexity.ai and console.perplexity.ai.
 *
 * WHY THIS RUNS INSIDE A BROWSER
 * ------------------------------
 * www.perplexity.ai is fronted by Cloudflare. Plain HTTP calls (curl / node
 * fetch) get a 403 "Just a moment..." challenge, and the signup/login flow uses
 * NextAuth cookies that only a real, challenge-cleared browser context has.
 * So this module is designed to be imported and executed *inside*
 * `browser_execute`, where `session` is a live CDP session attached to a page
 * on the Perplexity origin. In-page `fetch()` calls inherit cf_clearance and
 * the NextAuth CSRF cookie, so the REST/NextAuth endpoints answer normally.
 *
 * Usage (from a browser_execute snippet):
 *
 *   const path = process.cwd() + "/.bcode/agent-workspace/perplexity_creator.mjs"
 *   const m = await import(`${path}?t=${Date.now()}`)
 *   const result = await m.createPerplexityAccount(session, { outDir: "outputs" })
 *   console.log(JSON.stringify(result, null, 2))
 *
 * Options (second arg):
 *   outDir        Directory for the result JSON. Default "outputs".
 *   forceFresh    If true, signs out / clears Perplexity auth cookies first so a
 *                 brand-new account is created even if the browser is logged in.
 *                 Default false (reuse a logged-in session to save an account).
 *   otpTimeoutMs  How long to wait for the login email. Default 180000.
 *
 * Requires: a browser CDP session whose active page is on the Perplexity origin.
 * mail.tm reads happen in Node (not the browser) and work from datacenter IPs.
 */

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const APP = "https://www.perplexity.ai";
const CONSOLE = "https://console.perplexity.ai";
const MAILTM = "https://api.mail.tm";
const DEFAULT_OUT = "outputs";

// Countries Perplexity accepts at project creation, each with a plausible ZIP
// pattern. This is the "allowed country + matching zip" pool.
const COUNTRIES = [
  { code: "US", name: "United States", zips: ["10001", "94105", "60601", "73301", "02108"] },
  { code: "CA", name: "Canada", zips: ["M5H 2N2", "V6B 1A1", "K1A 0B1", "H2Y 1C6"] },
  { code: "GB", name: "United Kingdom", zips: ["EC1A 1BB", "SW1A 1AA", "M1 1AE", "B1 1AA"] },
  { code: "DE", name: "Germany", zips: ["10115", "80331", "20095", "60311"] },
  { code: "FR", name: "France", zips: ["75001", "69001", "33000", "13001"] },
  { code: "AU", name: "Australia", zips: ["2000", "3000", "4000", "6000"] },
  { code: "NL", name: "Netherlands", zips: ["1011", "3011", "5611", "9711"] },
  { code: "ES", name: "Spain", zips: ["28001", "08001", "41001", "46001"] },
  { code: "IT", name: "Italy", zips: ["00118", "20121", "50122", "80133"] },
  { code: "SE", name: "Sweden", zips: ["111 22", "411 03", "211 34"] },
  { code: "PL", name: "Poland", zips: ["00-001", "30-001", "50-001"] },
  { code: "IE", name: "Ireland", zips: ["D01", "D02", "T12"] },
  { code: "JP", name: "Japan", zips: ["100-0001", "530-0001", "460-0001"] },
  { code: "SG", name: "Singapore", zips: ["018956", "038987", "238823"] },
  { code: "IN", name: "India", zips: ["110001", "400001", "560001", "600001"] },
  { code: "BR", name: "Brazil", zips: ["01001-000", "20040-020", "30130-010"] },
  { code: "MX", name: "Mexico", zips: ["01000", "06000", "44100"] },
  { code: "ZA", name: "South Africa", zips: ["0001", "2001", "8001"] },
  { code: "NO", name: "Norway", zips: ["0150", "5003", "7010"] },
  { code: "DK", name: "Denmark", zips: ["1050", "2100", "8000"] },
  { code: "FI", name: "Finland", zips: ["00100", "33100", "90100"] },
  { code: "AT", name: "Austria", zips: ["1010", "4020", "8010"] },
  { code: "CH", name: "Switzerland", zips: ["8001", "1201", "4001"] },
  { code: "BE", name: "Belgium", zips: ["1000", "2000", "9000"] },
  { code: "PT", name: "Portugal", zips: ["1000-001", "4000-001", "8000-001"] },
];

// ---------------------------------------------------------------------------
// Random identity helpers
// ---------------------------------------------------------------------------

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];

const FIRST = [
  "James", "Marcus", "Daniel", "Ethan", "Liam", "Noah", "Oliver", "Lucas", "Henry",
  "Jack", "Sofia", "Elena", "Ava", "Mia", "Isabella", "Amelia", "Harper", "Chloe",
  "Grace", "Zoe", "Andre", "Victor", "Nadia", "Priya", "Omar", "Leo", "Ivan",
  "Marco", "Tobias", "Felix", "Hannah", "Sienna", "Maya", "Elias", "Jonas", "Clara",
];
const LAST = [
  "Holloway", "Bennett", "Foster", "Ramirez", "Novak", "Walsh", "Brennan", "Carter",
  "Delgado", "Ellis", "Fontaine", "Griffin", "Hayes", "Iverson", "Jensen", "Keller",
  "Lambert", "Mercer", "Nolan", "Ortega", "Parker", "Quinn", "Reeves", "Sinclair",
  "Thornton", "Underwood", "Vaughn", "Whitaker", "Yates", "Zimmerman",
];

function randomName() {
  return `${pick(FIRST)} ${pick(LAST)}`;
}

function randomPassword(len = 16) {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const sym = "!@$%&*#?";
  const take = (s, n) => Array.from({ length: n }, () => s[rnd(s.length)]).join("");
  // Guaranteed one of each class, then padded, then shuffled.
  const base = [pick(upper), pick(lower), pick(digits), pick(sym)];
  const all = upper + lower + digits + sym;
  while (base.length < len) base.push(all[rnd(all.length)]);
  for (let i = base.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.join("");
}

function randomUsername() {
  const a = ["swift", "calm", "bright", "north", "lunar", "ember", "quiet", "vivid",
    "amber", "solar", "frost", "river", "delta", "noble", "crisp", "zesty", "misty",
    "brave", "silent", "rapid", "azure", "golden", "pale", "wild"];
  const b = ["fox", "lynx", "orbit", "pixel", "cedar", "comet", "harbor", "falcon",
    "willow", "quartz", "raven", "maple", "otter", "badger", "heron", "finch",
    "koala", "puma", "wren", "bison", "dove", "hare", "crow", "moth"];
  return `${pick(a)}${pick(b)}${rnd(9000) + 1000}`;
}

function randomLocalPart() {
  // mail.tm rejects an address whose username already exists, so mix in enough
  // entropy (word pair + 4 digits + a short random hex tail) to avoid collisions.
  const base = randomUsername().replace(/[^a-z0-9]/gi, "").toLowerCase();
  const tail = Math.random().toString(16).slice(2, 8);
  return `${base}${tail}`;
}

function randomCountry() {
  const c = pick(COUNTRIES);
  return { code: c.code, name: c.name, zip: pick(c.zips) };
}

// ---------------------------------------------------------------------------
// mail.tm temporary inbox (Node-side, no Cloudflare involved)
// ---------------------------------------------------------------------------

async function mailtmCreate(localPart) {
  const domainsRes = await fetch(`${MAILTM}/domains`);
  if (!domainsRes.ok) throw new Error(`mail.tm /domains failed: ${domainsRes.status}`);
  const domains = await domainsRes.json();
  const domain = domains["hydra:member"]?.[0]?.domain;
  if (!domain) throw new Error("mail.tm: no active domain returned.");

  let lastErr = "";
  // A 422 means the address was already taken; retry with fresh entropy.
  for (let attempt = 0; attempt < 5; attempt++) {
    const local =
      attempt === 0
        ? localPart
        : `${localPart.slice(0, 20)}${Math.random().toString(16).slice(2, 10)}`;
    const address = `${local}@${domain}`;
    const password = randomPassword(14);

    const create = await fetch(`${MAILTM}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, password }),
    });
    if (!create.ok) {
      lastErr = `mail.tm /accounts failed (${create.status}): ${(await create.text()).slice(0, 200)}`;
      if (create.status === 422) continue; // address taken — try again
      throw new Error(lastErr);
    }

    const tokenRes = await fetch(`${MAILTM}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, password }),
    });
    if (!tokenRes.ok) throw new Error(`mail.tm /token failed: ${tokenRes.status}`);
    const { token } = await tokenRes.json();

    return { address, password, domain, token };
  }
  throw new Error(`mail.tm: could not create a unique inbox. Last: ${lastErr}`);
}

async function mailtmMessages(token) {
  const r = await fetch(`${MAILTM}/messages`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`mail.tm /messages failed: ${r.status}`);
  const j = await r.json();
  return j["hydra:member"] || [];
}

async function mailtmMessage(token, id) {
  const r = await fetch(`${MAILTM}/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
}

function htmlToText(html) {
  if (!html) return "";
  // mail.tm returns html as an array of body fragments.
  const raw = Array.isArray(html) ? html.join("\n") : String(html);
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Pull the magic sign-in link + 6-digit token out of a Perplexity email.
function parsePerplexityMail(msg) {
  const textBody = Array.isArray(msg.text) ? msg.text.join("\n") : (msg.text || "");
  const text = [
    msg.subject,
    textBody,
    htmlToText(msg.html),
  ].filter(Boolean).join("\n");
  const link =
    text.match(/https:\/\/[^\s"'<>]*\/api\/auth\/callback\/email\?[^\s"'<>]+/i)?.[0] ||
    null;
  let code = null;
  const near = text.match(/(?:code|otp|verification)[^0-9]{0,40}(\d{6})/i);
  if (near) code = near[1];
  if (!code && link) {
    try { code = new URL(link).searchParams.get("token"); } catch { /* ignore */ }
  }
  if (!code) code = text.match(/(?<!\d)(\d{6})(?!\d)/)?.[1] || null;
  return { link, code, text };
}

async function waitForPerplexityMail(mailToken, { timeoutMs = 180000, since = 0 } = {}) {
  const started = Date.now();
  const seen = new Set();
  while (Date.now() - started < timeoutMs) {
    const list = await mailtmMessages(mailToken);
    for (const m of list) {
      if (m.seen === undefined && !m.id) continue;
      const from = (m.from?.address || "").toLowerCase();
      const subj = (m.subject || "").toLowerCase();
      const relevant = from.includes("perplexity") || /perplexity|sign in|verify/.test(subj);
      if (!relevant) continue;
      if (since && new Date(m.createdAt).getTime() < since) continue;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      const full = await mailtmMessage(mailToken, m.id);
      const parsed = parsePerplexityMail(full);
      if (parsed.code || parsed.link) return { ...parsed, id: m.id, subject: m.subject };
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return null;
}

// ---------------------------------------------------------------------------
// Browser-side helpers (all in-page fetch => inherits Cloudflare + cookies)
// ---------------------------------------------------------------------------

async function pageLocation(session) {
  const r = await session.Runtime.evaluate({
    expression: "JSON.stringify({href: location.href, origin: location.origin})",
    returnByValue: true,
  });
  return JSON.parse(r.result.value);
}

async function ensureOrigin(session, url) {
  const loc = await pageLocation(session);
  const want = new URL(url).origin;
  if (loc.origin !== want) {
    await session.Page.enable();
    const loaded = session.waitFor("Page.loadEventFired", { timeoutMs: 30000 });
    await session.Page.navigate({ url });
    await Promise.race([loaded, new Promise((r) => setTimeout(r, 20000))]);
    await new Promise((r) => setTimeout(r, 2500));
  }
}

// Evaluate an async expression in the page and parse the JSON string result.
async function evalJson(session, expression) {
  const r = await session.Runtime.evaluate({ expression, awaitPromise: true, returnByValue: true });
  const v = r.result?.value;
  if (v === undefined || v === null) {
    const desc = r.exceptionDetails?.exception?.description || "no value";
    throw new Error(`in-page eval returned no value: ${String(desc).slice(0, 200)}`);
  }
  try { return JSON.parse(v); } catch { return v; }
}

// In-page fetch (same origin) — used for REST + NextAuth endpoints.
function inPageFetch(pathOrUrl, { method = "GET", body, headers = {} } = {}) {
  return `(async()=>{try{
    const res = await fetch(${JSON.stringify(pathOrUrl)}, {
      method: ${JSON.stringify(method)},
      credentials: 'include',
      headers: ${JSON.stringify({ "Content-Type": "application/json", ...headers })},
      body: ${body === undefined ? "null" : JSON.stringify(JSON.stringify(body))}
    });
    const text = await res.text();
    let json = null; try { json = text ? JSON.parse(text) : null; } catch(e) {}
    return JSON.stringify({ status: res.status, url: res.url, json, text: text.slice(0, 2000) });
  } catch(e) { return JSON.stringify({ error: String(e && e.message || e) }); }})()`;
}

async function apiCall(session, pathOrUrl, opts) {
  return evalJson(session, inPageFetch(pathOrUrl, opts));
}

// ---------------------------------------------------------------------------
// Auth: who is logged in?
// ---------------------------------------------------------------------------

async function readSession(session) {
  const s = await apiCall(session, "/api/auth/session?version=2.18&source=default");
  return s?.json?.user ? s.json : null;
}

async function readUserInfo(session) {
  const r = await apiCall(session, "/rest/user/info");
  return r?.json || null;
}

// Get the NextAuth CSRF token from the in-page cookie endpoint.
async function getCsrf(session) {
  const r = await apiCall(session, "/api/auth/csrf");
  return r?.json?.csrfToken || null;
}

// ---------------------------------------------------------------------------
// Signup / login via the NextAuth email provider
// ---------------------------------------------------------------------------

/**
 * Ask Perplexity to email a sign-in link/code. NextAuth's email provider expects
 * a urlencoded form POST including the CSRF token. Returns the HTTP result.
 */
async function requestEmailCode(session, email, callbackUrl) {
  const csrf = await getCsrf(session);
  if (!csrf) throw new Error("Could not obtain NextAuth csrfToken.");
  // This deployment's NextAuth variant requires a JSON body that also carries
  // the CSRF token, and returns 200 {"url":".../auth/verify-request"} on success.
  const payload = JSON.stringify({
    csrfToken: csrf,
    email,
    callbackUrl: callbackUrl || `${APP}/`,
    json: "true",
  });
  const expr = `(async()=>{try{
    const res = await fetch('/api/auth/signin/email', {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: ${JSON.stringify(payload)}
    });
    const t = await res.text();
    return JSON.stringify({ status: res.status, url: res.url, text: t.slice(0, 500) });
  } catch(e){ return JSON.stringify({ error: String(e && e.message || e) }); }})()`;
  return evalJson(session, expr);
}

/**
 * Complete the sign-in by hitting the callback URL from the email. This is what
 * clicking the "Sign in" button in the email does. The callback sets the
 * `__Secure-next-auth.session-token` cookie on the Perplexity domain.
 */
async function completeCallback(session, link) {
  // Navigate the page to the callback so cookies are set for both app + console.
  await session.Page.enable();
  const loaded = session.waitFor("Page.loadEventFired", { timeoutMs: 30000 });
  await session.Page.navigate({ url: link });
  await Promise.race([loaded, new Promise((r) => setTimeout(r, 18000))]);
  await new Promise((r) => setTimeout(r, 3000));
  return readSession(session);
}

// ---------------------------------------------------------------------------
// API console: login, then the project setup wizard
// ---------------------------------------------------------------------------

async function listGroups(session) {
  const r = await apiCall(session, `${CONSOLE}/rest/pplx-api/v2/groups`);
  return r?.json?.orgs || [];
}

/**
 * Create the API project (org) directly through the console REST API. This is
 * exactly what the setup wizard does under the hood (verified against the
 * console bundle: POST /rest/pplx-api/v2/groups with
 * {display_name, address, description, contact_info}). Doing it over REST is
 * far more reliable than driving the React wizard.
 */
async function createGroupApi(session, { displayName, description, contactInfo }) {
  const r = await apiCall(session, `${CONSOLE}/rest/pplx-api/v2/groups`, {
    method: "POST",
    body: {
      display_name: displayName,
      address: "",
      description: description || "",
      contact_info: contactInfo,
    },
  });
  if (r?.json?.org?.api_org_id) return { ok: true, org: r.json.org, signupCredit: r.json.signup_credit };
  return { ok: false, status: r?.status, detail: r?.json || r?.text };
}

/** Try to create the org; if the account already has one, return it. */
async function ensureProject(session, { projectName, country, zip, email }) {
  const existing = await listGroups(session);
  if (existing.length) return { org: existing[0], created: false, groups: existing };

  const created = await createGroupApi(session, {
    displayName: projectName,
    description: "",
    contactInfo: {
      email: email || "",
      country: country.code,
      zipcode: zip,
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
    },
  });
  if (!created.ok) return { org: null, created: false, error: created };

  const groups = await listGroups(session);
  return {
    org: groups[0] || created.org,
    created: true,
    groups,
    signupCredit: created.signupCredit,
  };
}

async function readConsoleSession(session) {
  const r = await apiCall(session, `${CONSOLE}/api/auth/session?version=2.18&source=default`);
  return r?.json?.user ? r.json : null;
}

/**
 * The API console (console.perplexity.ai) is a separate NextAuth app from the
 * main site. Signing in on www does not sign you in here, so we run the same
 * email-provider flow for the console origin.
 */
async function consoleLogin(session, email, mailToken, { timeoutMs = 180000 } = {}) {
  await ensureOrigin(session, `${CONSOLE}/`);
  // If a *different* account is already signed in, drop it first.
  const cur = await readConsoleSession(session);
  if (cur?.user && cur.user.email !== email) {
    await signOutOrigin(session, CONSOLE);
    await ensureOrigin(session, `${CONSOLE}/`);
  }
  const already = await readConsoleSession(session);
  if (already?.user?.email === email) return already;

  const csrf = await apiCall(session, `${CONSOLE}/api/auth/csrf`);
  const token = csrf?.json?.csrfToken;
  if (!token) throw new Error("console: could not obtain csrfToken.");
  const payload = JSON.stringify({
    csrfToken: token, email, callbackUrl: `${CONSOLE}/`, json: "true",
  });
  const expr = `(async()=>{try{
    const res = await fetch('/api/auth/signin/email',{method:'POST',credentials:'include',
      headers:{'Content-Type':'application/json'},body:${JSON.stringify(payload)}});
    return JSON.stringify({status:res.status, text:(await res.text()).slice(0,300)});
  }catch(e){return JSON.stringify({error:String(e&&e.message||e)})}})()`;
  const requested = await evalJson(session, expr);
  if (!requested || requested.status >= 400) {
    throw new Error(`console sign-in request failed: ${JSON.stringify(requested)}`);
  }
  const since = Date.now() - 15000;
  const mail = await waitForPerplexityMail(mailToken, { timeoutMs, since });
  if (!mail?.link) throw new Error("Timed out waiting for the console sign-in email.");
  await completeCallback(session, mail.link);
  const sess = await readConsoleSession(session);
  if (!sess?.user) throw new Error("Console callback completed but no session.");
  return sess;
}

/** Sign out of a NextAuth origin (used before switching accounts). */
async function signOutOrigin(session, origin) {
  const csrf = await apiCall(session, `${origin}/api/auth/csrf`);
  const token = csrf?.json?.csrfToken;
  if (!token) return false;
  const expr = `(async()=>{try{
    const res=await fetch('/api/auth/signout',{method:'POST',credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({csrfToken:${JSON.stringify(token)},callbackUrl:${JSON.stringify(origin + "/")},json:"true"})});
    return JSON.stringify({status:res.status});
  }catch(e){return JSON.stringify({error:String(e&&e.message||e)})}})()`;
  const r = await evalJson(session, expr);
  return r?.status === 200;
}

/**
 * Drive the console's "Get started" wizard, which is what actually creates the
 * API project/org. It has 3 steps:
 *   1) role + docs language + building type
 *   2) project name + country + zip + agree to terms
 *   3) add credits -> Skip
 * Step 2 is where the random country + matching zip go.
 */
async function runConsoleSetupWizard(session, { projectName, country, zip }) {
  // Always do a full navigation to the setup route: the console SPA redirects
  // /account/setup -> /projects once it thinks setup is in progress, so we must
  // force a fresh document load to reliably land on the wizard's first step.
  await session.Page.enable();
  const loaded = session.waitFor("Page.loadEventFired", { timeoutMs: 30000 });
  await session.Page.navigate({ url: `${CONSOLE}/account/setup` });
  await Promise.race([loaded, new Promise((r) => setTimeout(r, 20000))]);
  await new Promise((r) => setTimeout(r, 5000));

  // If setup was already completed, there is nothing to do.
  const parked = await session.Runtime.evaluate({
    expression: "location.href", returnByValue: true,
  });
  if (/\/projects/.test(parked.result.value || "")) {
    const groups = await listGroups(session).catch(() => []);
    if (groups.length) return groups;
  }

  const clickText = async (t) => {
    const expr = `(()=>{const e=[...document.querySelectorAll('button,div[role=button],a')]
      .find(x=>x.innerText&&x.innerText.trim().toLowerCase()===${JSON.stringify(t.toLowerCase())});
      if(e){e.click();return 'ok'}return 'nf'})()`;
    return (await session.Runtime.evaluate({ expression: expr, returnByValue: true })).result.value;
  };

  // --- Step 1 ---
  await clickText("Other");
  await new Promise((r) => setTimeout(r, 1200));
  await clickText("Python");
  await new Promise((r) => setTimeout(r, 1200));
  await clickText("Chatbot");
  await new Promise((r) => setTimeout(r, 1200));
  await clickText("Next");
  await new Promise((r) => setTimeout(r, 4000));

  // --- Step 2: name + country + zip + terms ---
  const filled = await session.Runtime.evaluate({
    expression: `(()=>{
      const setEl=(el,v)=>{const d=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value').set;d.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};
      const nameInp=[...document.querySelectorAll('input[type=text]')][0];
      if(nameInp) setEl(nameInp, ${JSON.stringify(projectName)});
      const sel=document.querySelector('select');
      if(sel){const o=[...sel.options].find(x=>new RegExp('^'+${JSON.stringify(country.name)}+'$','i').test(x.text));if(o){sel.value=o.value;sel.dispatchEvent(new Event('change',{bubbles:true}));}}
      const zipInp=[...document.querySelectorAll('input[type=text]')][1];
      if(zipInp) setEl(zipInp, ${JSON.stringify(zip)});
      return JSON.stringify({name:nameInp&&nameInp.value, country:sel&&sel.options[sel.selectedIndex].text, zip:zipInp&&zipInp.value});
    })()`,
    returnByValue: true,
  });
  console.log("[pplx] wizard step2:", filled.result.value);
  await new Promise((r) => setTimeout(r, 1200));

  // The terms checkbox is a custom <button> paired with a hidden input. Clicking
  // the visible button (real mouse event) is what React listens for.
  const cb = await session.Runtime.evaluate({
    expression: `(()=>{
      const inp=document.querySelector('input[type=checkbox]');
      if(!inp) return 'nf';
      const row=inp.closest('label')||inp.parentElement;
      const btn=[...row.querySelectorAll('button')].find(b=>b.offsetWidth>0);
      if(!btn) return 'nf';
      const rc=btn.getBoundingClientRect();
      return JSON.stringify({x:rc.x+rc.width/2,y:rc.y+rc.height/2});
    })()`,
    returnByValue: true,
  });
  if (cb.result.value !== "nf") {
    const { x, y } = JSON.parse(cb.result.value);
    await session.Input.dispatchMouseEvent({ type: "mouseMoved", x, y });
    await session.Input.dispatchMouseEvent({ type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await session.Input.dispatchMouseEvent({ type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    await new Promise((r) => setTimeout(r, 1200));
  }

  // Next → submits project creation.
  const nextEnabled = await session.Runtime.evaluate({
    expression: `(()=>{const b=[...document.querySelectorAll('button')].find(e=>/^next$/i.test(e.innerText.trim()));return JSON.stringify({disabled:b?b.disabled:'nf'})})()`,
    returnByValue: true,
  });
  console.log("[pplx] wizard next:", nextEnabled.result.value);
  await clickText("Next");

  // Wait for the credits step (step 3) to appear, then Skip.
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const txt = await session.Runtime.evaluate({
      expression: "document.body.innerText", returnByValue: true,
    });
    if (/Add API credits|Create API key|Skip/i.test(txt.result.value || "")) break;
  }
  await clickText("Skip");
  await new Promise((r) => setTimeout(r, 4000));

  const groups = await listGroups(session);
  return groups;
}

// ---------------------------------------------------------------------------
// Fresh-context helper: drop the auth cookies so a new account can be created
// ---------------------------------------------------------------------------

/**
 * Delete Perplexity auth cookies from the browser so the next sign-in creates a
 * NEW account instead of reusing the current session. Uses the CDP
 * Network.deleteCookies command (no storage wipe for unrelated sites).
 */
async function clearPerplexityAuth(session) {
  // The cookies that matter for "who am I".
  const namesToDrop = (c) =>
    c.domain.includes("perplexity.ai") &&
    (c.name === "__Secure-next-auth.session-token" ||
      c.name === "next-auth.csrf-token" ||
      c.name === "next-auth.callback-url" ||
      /^__Secure-pplx\.session\./.test(c.name));
  const r = await session.Network.getCookies({
    urls: [APP, CONSOLE, "https://api.perplexity.ai"],
  });
  for (const c of r.cookies || []) {
    if (!namesToDrop(c)) continue;
    await session.Network.deleteCookies({ name: c.name, domain: c.domain, path: c.path });
  }
  // Also clear the cached next-auth session object the SPA keeps.
  await session.Runtime.evaluate({
    expression: `(()=>{try{localStorage.removeItem('pplx-next-auth-session')}catch(e){};return 'ok'})()`,
    returnByValue: true,
  });
}

// ---------------------------------------------------------------------------
// Cookies + access token
// ---------------------------------------------------------------------------

async function collectCookies(session, urls) {
  const r = await session.Network.getCookies({ urls });
  return (r.cookies || []).map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    httpOnly: c.httpOnly,
    secure: c.secure,
    sameSite: c.sameSite,
    expires: c.expires,
  }));
}

/**
 * The Perplexity "access token" is the NextAuth session JWT stored in the
 * `__Secure-next-auth.session-token` cookie. The API console additionally keeps
 * a `__Secure-pplx.session.<accountId>` cookie. Both are returned.
 */
function extractTokens(cookies) {
  const find = (pred) => cookies.find(pred)?.value || null;
  return {
    sessionToken:
      find((c) => c.domain.includes("perplexity.ai") && c.name === "__Secure-next-auth.session-token") ||
      find((c) => c.name === "__Secure-next-auth.session-token"),
    pplxSession:
      cookies.find((c) => /^__Secure-pplx\.session\./.test(c.name))?.value || null,
    csrf:
      find((c) => c.name === "next-auth.csrf-token") || null,
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function createPerplexityAccount(session, opts = {}) {
  const outDir = opts.outDir || DEFAULT_OUT;
  const forceFresh = !!opts.forceFresh;
  const otpTimeoutMs = opts.otpTimeoutMs || 180000;

  const log = (...a) => console.log("[pplx]", ...a);

  // 0. Make sure we're on the Perplexity origin.
  await ensureOrigin(session, APP);
  await session.Network.enable();

  // 1. Identity.
  const identity = {
    name: randomName(),
    username: randomUsername(),
    password: randomPassword(),
  };
  const country = randomCountry();
  const projectName = opts.projectName || "My project";
  log("identity:", identity.username, "| country:", country.name, country.zip);

  // 2. Who are we already?
  let existing = await readSession(session);
  if (existing?.user && forceFresh) {
    log("forceFresh: clearing existing session for", existing.user.email);
    await clearPerplexityAuth(session);
    await ensureOrigin(session, APP); // reload anon
    existing = await readSession(session);
  }

  let email, mailToken, mailPassword;
  if (existing?.user && !forceFresh) {
    log("reusing logged-in account:", existing.user.email);
    email = existing.user.email;
  } else {
    // 3a. Fresh temp inbox on mail.tm.
    log("creating mail.tm inbox ...");
    const inbox = await mailtmCreate(randomLocalPart());
    email = inbox.address;
    mailToken = inbox.token;
    mailPassword = inbox.password;
    log("inbox:", email);

    // 3b. Ask Perplexity to email a sign-in link/code.
    log("requesting sign-in email ...");
    const requested = await requestEmailCode(session, email, `${APP}/`);
    if (requested?.error) throw new Error(`sign-in request failed: ${requested.error}`);
    if (requested.status >= 400) {
      throw new Error(`sign-in request rejected (${requested.status}): ${requested.text}`);
    }

    // 3c. Wait for the email, then complete the callback (sets session cookie).
    log("waiting for email ...");
    const startedAt = Date.now() - 15000; // small skew allowance
    const mail = await waitForPerplexityMail(mailToken, { timeoutMs: otpTimeoutMs, since: startedAt });
    if (!mail) throw new Error("Timed out waiting for the Perplexity sign-in email.");
    log("email received:", mail.subject, mail.code ? `code=${mail.code}` : "(link only)");

    if (!mail.link) throw new Error("Sign-in email had no callback link.");
    existing = await completeCallback(session, mail.link);
    if (!existing?.user) throw new Error("Callback completed but no session was established.");
    log("signed in as:", existing.user.username || existing.user.email);
  }

  // 4. Sign in to the separate API console (it has its own NextAuth session).
  log("signing in to API console ...");
  let consoleSession = null;
  if (mailToken) {
    consoleSession = await consoleLogin(session, email, mailToken, { timeoutMs: otpTimeoutMs });
  } else {
    // Reused main-site session: the console may or may not already be signed in.
    consoleSession = await readConsoleSession(session);
  }
  log("console session:", consoleSession?.user?.username || consoleSession?.user?.email || "(none)");

  // 5. Create the API project/org with the random country + matching zip.
  log("ensuring API project ...");
  const project = await ensureProject(session, {
    projectName, country, zip: country.zip, email,
  });
  const groups = project.groups || (project.org ? [project.org] : []);
  if (project.created) log("project created:", project.org?.api_org_id);
  if (project.error) log("project creation issue:", JSON.stringify(project.error).slice(0, 200));
  const userInfo = await readUserInfo(session);
  log("api orgs:", groups.map((g) => g.display_name).join(", ") || "(none)");

  // 6. Gather cookies + tokens from both origins.
  const cookies = await collectCookies(session, [APP, CONSOLE, "https://api.perplexity.ai"]);
  const tokens = extractTokens(cookies);

  // 7. Try to create an API key (will fail on a $0 balance — capture the reason).
  let apiKey = null;
  let apiKeyError = null;
  const org = groups[0];
  if (org?.api_org_id) {
    const r = await apiCall(session, `${CONSOLE}/rest/pplx-api/v2/groups/${org.api_org_id}/api-keys`, {
      method: "POST",
      body: { token_name: opts.apiKeyName || "auto-key" },
    });
    if (r?.json?.api_key || r?.json?.key || r?.json?.token) {
      apiKey = r.json.api_key || r.json.key || r.json.token;
    } else {
      apiKeyError = r?.json?.detail?.message || r?.json?.detail || r?.text || `HTTP ${r?.status}`;
    }
  }

  // 8. Persist everything.
  const record = {
    createdAt: new Date().toISOString(),
    email,
    mailtmPassword: mailPassword || null,
    name: identity.name,
    username: existing?.user?.username || identity.username,
    password: identity.password,
    userId: existing?.user?.id || null,
    country: { code: country.code, name: country.name, zip: country.zip },
    projectName,
    projectCreated: !!project?.created,
    signupCredit: project?.signupCredit || null,
    apiOrgId: org?.api_org_id || null,
    apiOrgName: org?.display_name || null,
    apiKey,
    apiKeyError,
    tokens,
    cookies,
    session: existing,
    consoleSession,
    userInfo,
  };

  if (outDir !== false) {
    fs.mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, `perplexity-account-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(record, null, 2), { mode: 0o600 });
    record.savedTo = file;
  }

  return record;
}

// ---------------------------------------------------------------------------
// CLI-ish entry (only used if someone runs this file with node directly)
// ---------------------------------------------------------------------------

export {
  randomName,
  randomPassword,
  randomUsername,
  randomCountry,
  mailtmCreate,
  waitForPerplexityMail,
  clearPerplexityAuth,
  readSession,
  requestEmailCode,
  completeCallback,
  collectCookies,
  extractTokens,
  consoleLogin,
  runConsoleSetupWizard,
  ensureProject,
  createGroupApi,
  listGroups,
  COUNTRIES,
};

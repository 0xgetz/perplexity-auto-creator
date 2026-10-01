<div align="center" dir="rtl">

<img src="../assets/banner.svg" alt="Perplexity Auto Creator" width="100%">

# Perplexity Auto Creator

**إنشاء حساب Perplexity آليًا من البداية إلى النهاية — هوية عشوائية، صندوق بريد مؤقت، كوكيز الجلسة، ورمز الوصول.**

<p>
  <a href="https://github.com/0xgetz/perplexity-auto-creator/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/0xgetz/perplexity-auto-creator?style=for-the-badge&logo=github&color=20808D"></a>
  <a href="https://github.com/0xgetz/perplexity-auto-creator/network/members"><img alt="Forks" src="https://img.shields.io/github/forks/0xgetz/perplexity-auto-creator?style=for-the-badge&logo=github&color=4dd0e1"></a>
  <a href="https://github.com/0xgetz/perplexity-auto-creator/issues"><img alt="Issues" src="https://img.shields.io/github/issues/0xgetz/perplexity-auto-creator?style=for-the-badge&logo=github&color=ffb454"></a>
  <a href="../LICENSE"><img alt="License" src="https://img.shields.io/github/license/0xgetz/perplexity-auto-creator?style=for-the-badge&color=3fb950"></a>
</p>
<p>
  <img alt="Node" src="https://img.shields.io/badge/Node.js-%E2%89%A518-339933?style=for-the-badge&logo=node.js&logoColor=white">
  <img alt="Zero dependencies" src="https://img.shields.io/badge/dependencies-0-20808D?style=for-the-badge">
  <img alt="ESM" src="https://img.shields.io/badge/module-ESM-f7df1e?style=for-the-badge&logo=javascript&logoColor=black">
  <img alt="Platform" src="https://img.shields.io/badge/automation-CDP-4dd0e1?style=for-the-badge">
</p>
<p dir="ltr">
  <a href="../README.md">🇬🇧 English</a> ·
  <a href="README.id.md">🇮🇩 Indonesia</a> ·
  <a href="README.es.md">🇪🇸 Español</a> ·
  <a href="README.zh.md">🇨🇳 中文</a> ·
  <a href="README.ja.md">🇯🇵 日本語</a> ·
  <a href="README.ar.md">🇸🇦 العربية</a>
</p>

</div>

---

<div dir="rtl">

## نظرة عامة

ينشئ `perplexity-auto-creator` **حساب Perplexity جديدًا** ببيانات عشوائية
بالكامل، ثم يسجّل الدخول، وينشئ مشروع الـ API، ويعيد **كوكيز الجلسة** و**رمز
الوصول** — من البداية إلى النهاية وبدون أي خطوات يدوية.

| يُولَّد أثناء التشغيل | القيمة |
| --- | --- |
| **الاسم** | اسم أول + اسم عائلة عشوائيان |
| **اسم المستخدم** | زوج كلمات عشوائي + أرقام |
| **كلمة المرور** | 16 حرفًا بمزيج من الفئات، مخلوطة |
| **البريد** | صندوق بريد مؤقت جديد على mail.tm |
| **الدولة** | عشوائية من قائمة تضم 24 دولة |
| **الرمز البريدي** | رمز صالح مطابق لتلك الدولة |

> **لماذا نحتاج متصفحًا؟** يقع Perplexity خلف Cloudflare، ويعتمد مصادقته على
> كوكيز NextAuth التي لا يملكها إلا سياق متصفح اجتاز التحدي. الطلبات عبر HTTP
> العادي تُقابَل بـ `403 — Just a moment…`. لذلك يتحكم هذا المشروع بمتصفح حقيقي
> عبر **بروتوكول Chrome DevTools (CDP)** ويستدعي الـ API بواسطة `fetch()` داخل
> الصفحة، فيرث `cf_clearance` والكوكيز.

---

## الميزات

- **هوية عشوائية بالكامل** — الاسم، اسم المستخدم، كلمة المرور، الدولة، والرمز البريدي.
- **صندوق بريد مؤقت** — تزويد تلقائي عبر mail.tm واستخراج الرمز/الرابط.
- **تسجيل دخول لتطبيقين** — يصادق على `www.perplexity.ai` وعلى تطبيق NextAuth
  المنفصل `console.perplexity.ai`.
- **إنشاء المشروع** — ينشئ منظمة الـ API عبر REST، مع حفظ الدولة والرمز البريدي
  العشوائيين في معلومات الاتصال.
- **التقاط الجلسة** — يصدّر كل الكوكيز (لكلا النطاقين) إضافةً إلى رمز وصول
  NextAuth، بعد التحقق منه بشكل مستقل.
- **بدون تبعيات** — Node.js ESM خالص، دون `npm install`.
- **مدرك لـ Cloudflare** — مصمم لمتصفح حقيقي، لا لـ HTTP بلا واجهة.

---

## خط سير العمل

```text
 1. هوية عشوائية → 2. صندوق mail.tm → 3. بريد الدخول (POST /signin/email)
   → 4. قراءة الصندوق واستخراج الرمز → 5. فتح رابط الاستدعاء (كوكي الجلسة)
   → 6. تسجيل الدخول للوحة (NextAuth منفصل) → 7. إنشاء المشروع (POST /v2/groups)
   → 8. محاولة إنشاء API key → 9. حفظ JSON (الكوكيز + الرمز)
```

---

## المتطلبات

- **Node.js ≥ 18** (دعم `fetch` المدمج، ESM).
- **جلسة متصفح CDP** متصلة بصفحة على أصل Perplexity — مثل متصفح سحابي من
  [Browser Use](https://github.com/browser-use/browser-use)، أو Chrome محلي
  يعمل بـ `--remote-debugging-port`، أو أي نقطة نهاية CDP.

لا حاجة لأي حزم خارجية.

---

## البدء السريع

داخل مقتطف من نوع `browser_execute` (مع `session` CDP نشطة):

```js
const path = process.cwd() + "/src/run_perplexity_creator.mjs"
const { run } = await import(`${path}?t=${Date.now()}`)

const result = await run(session, {
  outDir: "outputs",
  forceFresh: true,          // تجاهل أي تسجيل دخول قائم وأنشئ حسابًا جديدًا
  otpTimeoutMs: 180000,
})

console.log(result.email, result.password, result.country)
console.log(result.apiOrgId)
console.log(result.tokens.sessionToken)   // <-- رمز الوصول
```

تُكتب النتيجة أيضًا إلى `outputs/perplexity-account-<timestamp>.json` (بصلاحيات `0600`).

---

## الخيارات

| الخيار | الافتراضي | المعنى |
| --- | --- | --- |
| `outDir` | `"outputs"` | مجلد ملف JSON الناتج. |
| `forceFresh` | `true` (runner) | إنشاء حساب جديد حتى لو كان المتصفح مسجَّلًا. |
| `otpTimeoutMs` | `180000` | أقصى مدة انتظار لكل بريد دخول. |
| `projectName` | `"My project"` | اسم مشروع الـ API المُنشأ. |
| `apiKeyName` | `"auto-key"` | الاسم المستخدم لمحاولة إنشاء API key. |

---

## المخرجات

```jsonc
{
  "email": "…", "name": "…", "username": "…", "password": "…",
  "country": { "code": "CA", "name": "Canada", "zip": "H2Y 1C6" },
  "projectCreated": true, "apiOrgId": "…",
  "tokens": { "sessionToken": "…", "pplxSession": "…", "csrf": "…" },
  "cookies": [ /* نحو 27 كوكي لـ www + console */ ],
  "apiKey": null,
  "apiKeyError": "Cannot create API key with zero balance. Please purchase API credits."
}
```

---

## مهم: حاجز الدفع الخاص بمفتاح API

لم تعد Perplexity **تمنح أرصدة API مجانية**. يحصل الحساب الجديد على
`signup_credit: { "status": "ineligible" }`، ويُرفض كل طلب مفتاح:

```json
{
  "error_code": "CUSTOMER_BALANCE_NEGATIVE",
  "message": "Cannot create API key with zero balance. Please purchase API credits."
}
```

لذلك **لا يمكن** لهذا المشروع إنتاج مفتاح `pplx-…` فعّال على حساب بدون رصيد —
فذلك يتطلب إضافة وسيلة دفع في واجهة الفوترة. أما ما **يقدّمه** بشكل موثوق فهو:
الحساب الكامل، والجلستان المسجَّلتان، ومشروع الـ API، ورمز الوصول — أي كل شيء
حتى حاجز التمويل.

---

## الترخيص

منشور بموجب [ترخيص MIT](../LICENSE).

<div align="center"><sub>بُني لأغراض البحث واختبار الأتمتة. استخدمه بمسؤولية ووفقًا لشروط خدمة Perplexity.</sub></div>

</div>

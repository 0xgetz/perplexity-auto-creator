<div align="center">

<img src="../assets/banner.svg" alt="Perplexity Auto Creator" width="100%">

# Perplexity Auto Creator

**端到端自动创建 Perplexity 账号 —— 随机身份、一次性收件箱、会话 Cookie 与访问令牌。**

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
<p>
  <a href="../README.md">🇬🇧 English</a> ·
  <a href="README.id.md">🇮🇩 Indonesia</a> ·
  <a href="README.es.md">🇪🇸 Español</a> ·
  <a href="README.zh.md">🇨🇳 中文</a> ·
  <a href="README.ja.md">🇯🇵 日本語</a> ·
  <a href="README.ar.md">🇸🇦 العربية</a>
</p>

</div>

---

## 概述

`perplexity-auto-creator` 会使用完全随机的数据创建一个**全新的 Perplexity
账号**，完成登录、创建 API 项目，并返回**会话 Cookie**与**访问令牌** ——
全程自动化，无需任何手动步骤。

| 运行时生成 | 取值 |
| --- | --- |
| **姓名** | 随机名 + 姓 |
| **用户名** | 随机词对 + 数字 |
| **密码** | 16 位，含大小写/数字/符号，随机打乱 |
| **邮箱** | mail.tm 上全新的一次性收件箱 |
| **国家** | 从 24 个国家列表中随机选择 |
| **邮政编码** | 与该国家匹配的合法编码 |

> **为什么需要浏览器？** Perplexity 位于 Cloudflare 之后，其认证依赖只有通过
> 挑战的浏览器上下文才持有的 NextAuth Cookie。普通 HTTP 请求会被回应
> `403 — Just a moment…`。因此本项目通过 **Chrome DevTools Protocol (CDP)**
> 驱动真实浏览器，并在页面内用 `fetch()` 调用 API，从而继承 `cf_clearance`
> 与 Cookie。

---

## 特性

- **完全随机身份** —— 姓名、用户名、密码、国家与邮编。
- **一次性收件箱** —— 自动创建 mail.tm 收件箱并提取验证码/链接。
- **双应用登录** —— 同时登录 `www.perplexity.ai` 与独立的 NextAuth 应用
  `console.perplexity.ai`。
- **项目创建** —— 通过 REST 创建 API 组织，并把随机国家与匹配邮编写入其联系信息。
- **会话抓取** —— 导出两个域名的全部 Cookie 以及 NextAuth 访问令牌，并已独立验证。
- **零依赖** —— 纯 Node.js ESM，无需 `npm install`。
- **感知 Cloudflare** —— 面向真实浏览器设计，而非无头 HTTP。

---

## 流程

```text
 1. 随机身份 → 2. mail.tm 收件箱 → 3. 登录邮件 (POST /signin/email)
   → 4. 读取收件箱并提取令牌 → 5. 打开回调链接 (写入会话 Cookie)
   → 6. 登录控制台 (独立 NextAuth) → 7. 创建项目 (POST /v2/groups)
   → 8. 尝试创建 API key → 9. 保存 JSON (Cookie + 令牌)
```

---

## 环境要求

- **Node.js ≥ 18**（内置 `fetch`，ESM）。
- 一个连接到 Perplexity 源页面的**浏览器 CDP 会话** —— 例如
  [Browser Use](https://github.com/browser-use/browser-use) 云浏览器、以
  `--remote-debugging-port` 启动的本地 Chrome，或任意 CDP 端点。

无需任何第三方包。

---

## 快速开始

在类似 `browser_execute` 的代码片段中（拥有可用的 CDP `session`）：

```js
const path = process.cwd() + "/src/run_perplexity_creator.mjs"
const { run } = await import(`${path}?t=${Date.now()}`)

const result = await run(session, {
  outDir: "outputs",
  forceFresh: true,          // 忽略现有登录，创建新账号
  otpTimeoutMs: 180000,
})

console.log(result.email, result.password, result.country)
console.log(result.apiOrgId)
console.log(result.tokens.sessionToken)   // <-- 访问令牌
```

结果同时写入 `outputs/perplexity-account-<timestamp>.json`（权限 `0600`）。

---

## 选项

| 选项 | 默认值 | 含义 |
| --- | --- | --- |
| `outDir` | `"outputs"` | 结果 JSON 的输出目录。 |
| `forceFresh` | `true`（runner） | 即使已登录也创建新账号。 |
| `otpTimeoutMs` | `180000` | 每封登录邮件的最长等待时间。 |
| `projectName` | `"My project"` | 所创建 API 项目的名称。 |
| `apiKeyName` | `"auto-key"` | API key 尝试所用的名称。 |

---

## 输出

```jsonc
{
  "email": "…", "name": "…", "username": "…", "password": "…",
  "country": { "code": "CA", "name": "Canada", "zip": "H2Y 1C6" },
  "projectCreated": true, "apiOrgId": "…",
  "tokens": { "sessionToken": "…", "pplxSession": "…", "csrf": "…" },
  "cookies": [ /* 约 27 个 Cookie，覆盖 www + console */ ],
  "apiKey": null,
  "apiKeyError": "Cannot create API key with zero balance. Please purchase API credits."
}
```

---

## 重要：API key 付费墙

Perplexity **不再发放免费 API 额度**。新账号会得到
`signup_credit: { "status": "ineligible" }`，并且所有 key 请求都会被拒绝：

```json
{
  "error_code": "CUSTOMER_BALANCE_NEGATIVE",
  "message": "Cannot create API key with zero balance. Please purchase API credits."
}
```

因此本项目**无法**在未充值账号上生成可用的 `pplx-…` API key ——
那需要在计费界面添加支付方式。它能可靠交付的是：完整账号、两个已登录会话、
API 项目以及访问令牌 —— 直到付费墙之前的全部内容。

---

## 许可证

基于 [MIT 许可证](../LICENSE) 发布。

<div align="center"><sub>用于研究与自动化测试。请负责任地使用，并遵守 Perplexity 的服务条款。</sub></div>

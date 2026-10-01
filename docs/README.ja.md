<div align="center">

<img src="../assets/banner.svg" alt="Perplexity Auto Creator" width="100%">

# Perplexity Auto Creator

**Perplexity アカウントをエンドツーエンドで自動作成 — ランダムな識別情報、使い捨て受信箱、セッション Cookie、アクセストークン。**

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

## 概要

`perplexity-auto-creator` は完全にランダムなデータで**新しい Perplexity
アカウント**を作成し、サインイン、API プロジェクトの作成を行い、**セッション
Cookie** と **アクセストークン**を返します — 手作業なしのエンドツーエンドです。

| 実行時に生成 | 値 |
| --- | --- |
| **名前** | ランダムな名 + 姓 |
| **ユーザー名** | ランダムな単語ペア + 数字 |
| **パスワード** | 16 文字、大小英数記号をシャッフル |
| **メール** | mail.tm の新規使い捨て受信箱 |
| **国** | 24 か国のリストからランダム |
| **郵便番号** | その国に対応する有効なコード |

> **なぜブラウザが必要か?** Perplexity は Cloudflare の背後にあり、認証は
> チャレンジを通過したブラウザコンテキストだけが持つ NextAuth Cookie に依存
> します。素の HTTP は `403 — Just a moment…` を返します。そのため本プロジェクト
> は **Chrome DevTools Protocol (CDP)** で実ブラウザを操作し、ページ内の
> `fetch()` で API を呼ぶことで `cf_clearance` と Cookie を引き継ぎます。

---

## 特徴

- **完全ランダムな識別情報** — 名前、ユーザー名、パスワード、国、郵便番号。
- **使い捨て受信箱** — mail.tm の自動プロビジョニングと OTP/リンク抽出。
- **2 アプリへのサインイン** — `www.perplexity.ai` と、別系統の NextAuth アプリ
  `console.perplexity.ai` の両方にログイン。
- **プロジェクト作成** — REST で API 組織を作成し、ランダムな国と郵便番号を
  連絡先情報に保存。
- **セッション取得** — 両ドメインの全 Cookie と NextAuth アクセストークンを
  エクスポートし、独立して検証済み。
- **依存ゼロ** — 純粋な Node.js ESM、`npm install` 不要。
- **Cloudflare 対応** — ヘッドレス HTTP ではなく実ブラウザ向けに設計。

---

## パイプライン

```text
 1. ランダム識別情報 → 2. mail.tm 受信箱 → 3. サインインメール (POST /signin/email)
   → 4. 受信箱を読みトークン抽出 → 5. コールバックを開く (セッション Cookie)
   → 6. コンソールにログイン (別系統 NextAuth) → 7. プロジェクト作成 (POST /v2/groups)
   → 8. API key を試行 → 9. JSON 保存 (Cookie + トークン)
```

---

## 必要要件

- **Node.js ≥ 18**（組み込み `fetch`、ESM）。
- Perplexity オリジンのページに接続された**ブラウザ CDP セッション** —
  例: [Browser Use](https://github.com/browser-use/browser-use) クラウド
  ブラウザ、`--remote-debugging-port` で起動したローカル Chrome、任意の CDP
  エンドポイント。

サードパーティ製パッケージは不要です。

---

## クイックスタート

`browser_execute` 形式のスニペット内で（CDP `session` が有効な状態）:

```js
const path = process.cwd() + "/src/run_perplexity_creator.mjs"
const { run } = await import(`${path}?t=${Date.now()}`)

const result = await run(session, {
  outDir: "outputs",
  forceFresh: true,          // 既存ログインを無視して新規アカウントを作成
  otpTimeoutMs: 180000,
})

console.log(result.email, result.password, result.country)
console.log(result.apiOrgId)
console.log(result.tokens.sessionToken)   // <-- アクセストークン
```

結果は `outputs/perplexity-account-<timestamp>.json`（権限 `0600`）にも書き出されます。

---

## オプション

| オプション | 既定値 | 意味 |
| --- | --- | --- |
| `outDir` | `"outputs"` | 結果 JSON の出力先。 |
| `forceFresh` | `true`（runner） | 既にログイン済みでも新規アカウントを作成。 |
| `otpTimeoutMs` | `180000` | 各サインインメールの最大待機時間。 |
| `projectName` | `"My project"` | 作成する API プロジェクト名。 |
| `apiKeyName` | `"auto-key"` | API key 試行時の名前。 |

---

## 出力

```jsonc
{
  "email": "…", "name": "…", "username": "…", "password": "…",
  "country": { "code": "CA", "name": "Canada", "zip": "H2Y 1C6" },
  "projectCreated": true, "apiOrgId": "…",
  "tokens": { "sessionToken": "…", "pplxSession": "…", "csrf": "…" },
  "cookies": [ /* www + console 用の Cookie 約 27 件 */ ],
  "apiKey": null,
  "apiKeyError": "Cannot create API key with zero balance. Please purchase API credits."
}
```

---

## 重要: API key の課金の壁

Perplexity は**無料の API クレジットを付与しなくなりました**。新規アカウントは
`signup_credit: { "status": "ineligible" }` となり、key リクエストはすべて拒否されます:

```json
{
  "error_code": "CUSTOMER_BALANCE_NEGATIVE",
  "message": "Cannot create API key with zero balance. Please purchase API credits."
}
```

したがって本プロジェクトは、残高のないアカウントで動作する `pplx-…` API key を
**生成できません** — それには請求 UI で支払い方法の追加が必要です。確実に提供できる
のは、完全なアカウント、2 つのサインイン済みセッション、API プロジェクト、
アクセストークン — 課金の壁までのすべてです。

---

## ライセンス

[MIT ライセンス](../LICENSE) の下で公開されています。

<div align="center"><sub>研究および自動化テスト向けに構築。責任を持って、Perplexity の利用規約に従って使用してください。</sub></div>

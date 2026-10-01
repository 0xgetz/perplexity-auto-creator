<div align="center">

<img src="../assets/banner.svg" alt="Perplexity Auto Creator" width="100%">

# Perplexity Auto Creator

**Pembuatan akun Perplexity otomatis end-to-end — identitas acak, inbox sekali pakai, cookie sesi, dan access token.**

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

## Ringkasan

`perplexity-auto-creator` membuat **akun Perplexity baru** dengan data acak
sepenuhnya, melakukan login, membuat project API, lalu mengembalikan **cookie
sesi** dan **access token** — dari awal sampai akhir, tanpa langkah manual.

| Dibuat saat berjalan | Nilai |
| --- | --- |
| **Nama** | nama depan + belakang acak |
| **Username** | pasangan kata acak + angka |
| **Password** | 16 karakter, campuran kelas, diacak |
| **Email** | inbox sekali pakai baru di mail.tm |
| **Negara** | acak dari daftar 24 negara |
| **Kode pos** | kode valid sesuai negara tersebut |

> **Kenapa butuh browser?** Perplexity berada di balik Cloudflare dan autentikasinya
> memakai cookie NextAuth yang hanya dimiliki konteks browser yang sudah lolos
> tantangan. HTTP biasa dijawab `403 — Just a moment…`. Karena itu proyek ini
> mengendalikan browser nyata melalui **Chrome DevTools Protocol (CDP)** dan
> memanggil API lewat `fetch()` di dalam halaman, sehingga mewarisi `cf_clearance`
> dan cookie.

---

## Fitur

- **Identitas acak penuh** — nama, username, password, negara, dan kode pos.
- **Inbox sekali pakai** — provisi mail.tm otomatis dan ekstraksi OTP/tautan.
- **Login dua aplikasi** — masuk ke `www.perplexity.ai` dan aplikasi NextAuth
  terpisah `console.perplexity.ai`.
- **Penyiapan project** — membuat org API via REST, dengan negara + kode pos acak
  tersimpan di contact info-nya.
- **Pengambilan sesi** — mengekspor semua cookie (kedua domain) plus access token
  NextAuth, yang sudah diverifikasi mandiri.
- **Tanpa dependensi** — Node.js ESM murni, tanpa `npm install`.
- **Sadar Cloudflare** — dirancang untuk browser nyata, bukan HTTP headless.

---

## Alur

```text
 1. Identitas acak  →  2. Inbox mail.tm  →  3. Email login (POST /signin/email)
        →  4. Baca inbox & ambil token  →  5. Buka tautan callback (cookie sesi)
        →  6. Login console (NextAuth terpisah)  →  7. Buat project (POST /v2/groups)
        →  8. Coba buat API key  →  9. Simpan JSON (cookie + token)
```

---

## Kebutuhan

- **Node.js ≥ 18** (`fetch` bawaan, ESM).
- **Sesi browser CDP** yang terhubung ke halaman di origin Perplexity — misalnya
  browser cloud [Browser Use](https://github.com/browser-use/browser-use), Chrome
  lokal dengan `--remote-debugging-port`, atau endpoint CDP apa pun.

Tidak ada paket pihak ketiga yang diperlukan.

---

## Mulai cepat

Di dalam snippet bergaya `browser_execute` (dengan `session` CDP aktif):

```js
const path = process.cwd() + "/src/run_perplexity_creator.mjs"
const { run } = await import(`${path}?t=${Date.now()}`)

const result = await run(session, {
  outDir: "outputs",
  forceFresh: true,          // abaikan login lama, buat akun baru
  otpTimeoutMs: 180000,
})

console.log(result.email, result.password, result.country)
console.log(result.apiOrgId)
console.log(result.tokens.sessionToken)   // <-- access token
```

Hasilnya juga ditulis ke `outputs/perplexity-account-<timestamp>.json` (mode `0600`).

---

## Opsi

| Opsi | Default | Arti |
| --- | --- | --- |
| `outDir` | `"outputs"` | Direktori untuk JSON hasil. |
| `forceFresh` | `true` (runner) | Buat akun baru meski browser sudah login. |
| `otpTimeoutMs` | `180000` | Lama menunggu setiap email login. |
| `projectName` | `"My project"` | Nama project API yang dibuat. |
| `apiKeyName` | `"auto-key"` | Nama untuk percobaan pembuatan API key. |

---

## Keluaran

```jsonc
{
  "email": "…", "name": "…", "username": "…", "password": "…",
  "country": { "code": "CA", "name": "Canada", "zip": "H2Y 1C6" },
  "projectCreated": true, "apiOrgId": "…",
  "tokens": { "sessionToken": "…", "pplxSession": "…", "csrf": "…" },
  "cookies": [ /* ±27 cookie untuk www + console */ ],
  "apiKey": null,
  "apiKeyError": "Cannot create API key with zero balance. Please purchase API credits."
}
```

---

## Penting: paywall API key

Perplexity **tidak lagi memberi kredit API gratis**. Akun baru menerima
`signup_credit: { "status": "ineligible" }`, dan setiap permintaan key ditolak:

```json
{
  "error_code": "CUSTOMER_BALANCE_NEGATIVE",
  "message": "Cannot create API key with zero balance. Please purchase API credits."
}
```

Jadi proyek ini **tidak bisa** membuat API key `pplx-…` yang berfungsi pada akun
tanpa saldo — itu memerlukan metode pembayaran di UI billing. Yang **bisa**
dihasilkan secara andal: akun lengkap, kedua sesi login, project API, dan access
token — semuanya sampai batas pendanaan.

---

## Lisensi

Dirilis di bawah [MIT License](../LICENSE).

<div align="center"><sub>Dibuat untuk riset dan pengujian otomasi. Gunakan dengan bijak dan sesuai Ketentuan Layanan Perplexity.</sub></div>

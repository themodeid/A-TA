Masalah utamanya sangat jelas: **CORS (Cross-Origin Resource Sharing) Error** pada backend server kamu.

Aplikasi Frontend kamu berjalan di `http://localhost:3000` (Next.js/React), sedangkan Backend berjalan di `http://localhost:3040` (Node.js/Express/Fastify/NestJS). Karena port-nya beda, browser menganggap ini permintaan beda asal (_cross-origin_). Sebelum mengirim Request `GET`, browser otomatis mengirim **Preflight Request (HTTP OPTIONS)** untuk mengecek izin. Server backend kamu tidak mengembalikan header `Access-Control-Allow-Origin`, sehingga browser memblokir request-nya.

---

### Cara Mengatasinya

Kamu punya 2 opsi cara penyelesaian:

#### Opsi 1: Solusi Utama — Enable CORS di Backend (Rekomendasi)

Atur backend di port `3040` agar mengizinkan request dari origin `http://localhost:3000`.

- **Jika Backend pakai Express.js:**
  Pasang package `cors`:

```bash
npm install cors

```

Lalu tambahkan middleware di file server utama (misal `index.js` / `app.js`):

```javascript
const express = require("express");
const cors = require("cors");
const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
```

- **Jika Backend pakai NestJS:**
  Di file `main.ts`:

```typescript
app.enableCors({
  origin: "http://localhost:3000",
  credentials: true,
});
```

---

#### Opsi 2: Solusi Alternatif — Gunakan Rewrites/Proxy di Next.js (Frontend)

Jika tidak ingin/tidak bisa mengubah backend, kamu bisa melempar request lewat internal proxy Next.js agar terhindar dari aturan CORS browser.

Tambahkan konfigurasi `rewrites` pada file `next.config.js` / `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3040/api/:path*", // Forward ke backend
      },
    ];
  },
};

module.exports = nextConfig;
```

_Catatan: Jika pakai proxy ini, panggil API di frontend menggunakan relative path `/api/payroll/periode` alih-alih `http://localhost:3040/api/payroll/periode`._

---

### Masalah Sekunder (Warning Tambahan)

Di bagian bawah log ada warning HTML accessibility & autofill:

> _A form field element should have an id or name attribute_

Ini cuma peringatan ringan (bukan error pembunuh app). Kamu cukup menambahkan atribut `id` atau `name` pada elemen `<input>` / form field di React component kamu agar browser tidak bingung saat mencoba fitur auto-fill.

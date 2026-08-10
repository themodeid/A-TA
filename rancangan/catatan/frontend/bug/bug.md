
### 2. Isu Koneksi Database di Dalam Docker (Network Isolated)

Di `.env` kamu punya dua variabel database:

- `DATABASE_URL=postgresql://postgres:adamwahyukur@localhost:5439/TADB` (Buat lokal)
- `DATABASE_URL_DOCKER=postgresql://postgres:adamwahyukur@postgres:5432/TADB` (Buat Docker)

Jika backend kamu berjalan di **dalam Docker Container**, dia **TIDAK BISA** connect ke `localhost:5439`. Dia wajib pakai nama service-nya (`postgres:5432`).

Jika backend mencoba query ke database pakai host `localhost`, query-nya bakal _gantung_ (timeout) atau melempar error koneksi yang bikin request ke reset.

- **Solusi Cek:** Pastikan di file `config/database.ts` kamu membaca `process.env.DATABASE_URL_DOCKER` (atau `DATABASE_URL` yang host-nya diset ke `postgres` saat di Docker).

---

### 3. Crash Akibat Body-Parser / Middleware Limit

Jika request `/payroll/periode` mengirim data payload atau header yang terlalu besar melebihi limit `10kb` di `.env` kamu (`JSON_BODY_LIMIT=10kb`), Express bisa langsung memutus koneksi secara mendadak.

---

### Langkah Diagnosa Cepat:

1. Buka terminal Docker kamu, perhatikan log `backend-hosting`.
2. Lakukan _refresh_ di browser (`http://localhost:3000`).
3. Intip teks apa yang keluar di terminal backend persis saat error `ERR_CONNECTION_RESET` itu muncul. Kalau ada pesan error-nya, kirim ke sini biar kita bereskan!

# vibe-coding

Backend API untuk manajemen **User & Session Authentication** menggunakan **Bun** + **ExpressJS** + **Prisma** + **MySQL/MariaDB**.

Aplikasi ini menyediakan API untuk registrasi user, login (menghasilkan token session), mendapatkan user saat ini (berdasarkan Bearer token), dan logout (menghapus session).

## Technology Stack

| Teknologi       | Fungsi                                    |
| --------------- | ----------------------------------------- |
| Bun             | Runtime JavaScript/TypeScript             |
| ExpressJS 5     | Web framework (routing, middleware)       |
| Prisma 7        | ORM & migration                           |
| MySQL / MariaDB | Database                                  |
| TypeScript      | Bahasa pemrograman (strict mode)          |
| bcryptjs        | Hashing password                          |
| bun:test        | Test runner bawaan Bun                    |

## Library yang Digunakan

**Dependencies:**

| Library                  | Keterangan                                            |
| ------------------------ | ----------------------------------------------------- |
| `express` ^5.2.1         | Web framework                                         |
| `@prisma/client` 7      | Prisma Client (generated ke `src/generated/prisma`)   |
| `@prisma/adapter-mariadb` ^7.10.0 | Driver adapter MariaDB untuk Prisma         |
| `mariadb` ^3.5.4         | Driver MariaDB yang dipakai oleh adapter              |
| `bcryptjs` ^3.0.3        | Hash & verifikasi password (bcrypt)                  |

**DevDependencies:**

| Library              | Keterangan                          |
| -------------------- | ----------------------------------- |
| `prisma` 7           | Prisma CLI (migrate, generate)     |
| `@types/bun`         | Type definitions Bun               |
| `@types/express`     | Type definitions Express           |
| `typescript` ^7      | TypeScript (peerDependency)        |

## Struktur Folder & Penamaan File

```
.
├── prisma/
│   ├── schema.prisma          # Skema database Prisma (model User, Session)
│   └── migrations/           # File migration SQL (timestamp_nama_migration)
├── scripts/
│   └── db-check.ts           # Smoke test koneksi & CRUD database
├── src/
│   ├── index.ts              # Entry point: setup Express, mounting route, /health
│   ├── db.ts                 # Instansiasi PrismaClient dengan adapter MariaDB
│   ├── docs/
│   │   └── openapi.ts        # Spec OpenAPI 3 untuk Swagger UI
│   ├── routes/
│   │   ├── docs-route.ts     # Route Swagger UI (/api-docs)
│   │   └── users-route.ts    # Route /api/users (delegasi ke service)
│   ├── services/
│   │   └── users-service.ts  # Business logic: register, login, current, logout
│   └── generated/
│       └── prisma/           # Prisma Client hasil generate (JANGAN diedit manual)
├── tests/
│   ├── helpers.ts            # Helper test: start server, API client, cleanup data
│   ├── health.test.ts        # Test endpoint /health
│   ├── register.test.ts      # Test registrasi user
│   ├── login.test.ts         # Test login
│   ├── current.test.ts       # Test GET user saat ini
│   └── logout.test.ts        # Test logout
├── prisma.config.ts          # Konfigurasi Prisma CLI (schema path, datasource URL)
├── package.json
├── tsconfig.json             # Konfigurasi TypeScript (strict, bundler mode)
└── .env                      # Environment variables (tidak di-commit)
```

**Konvensi penamaan:**

- Route file: kebab-case dengan suffix `-route.ts` (cth: `users-route.ts`)
- Service file: kebab-case dengan suffix `-service.ts` (cth: `users-service.ts`)
- Test file: `*.test.ts` sesuai fitur yang diuji
- Migration: folder `timestamp_snake_case_description`
- Service mengembalikan pola `Result`: `{ status, body }` — route hanya meneruskan status & body ke response, sehingga logic mudah diuji tanpa HTTP

## Arsitektur

Arsitektur berlapis sederhana (layered architecture):

```
Request → Express middleware (express.json)
        → Route (src/routes/)     — parsing input dari req.body / req.headers
        → Service (src/services/) — validasi, business logic, akses database via Prisma
        → Response (JSON: { data } atau { error })
```

- **Route layer** tidak berisi logic, hanya mengekstrak input dan meneruskan hasil service.
- **Service layer** melakukan validasi input (wajib diisi, format email, panjang maksimal 255 karakter), hashing password dengan bcrypt, pembuatan/verifikasi token session (UUID v4), dan operasi database.
- **Database layer** dihandle `src/db.ts` (PrismaClient + adapter MariaDB, connection limit 5).

## API yang Tersedia

Dokumentasi interaktif tersedia di Swagger UI: `http://localhost:3000/api-docs` (dev server harus jalan). Ringkasan endpoint:

Base URL: `http://localhost:3000`

### `POST /api/users` — Registrasi

Body:

```json
{ "name": "Budi", "email": "budi@example.com", "password": "rahasia" }
```

Response sukses — `201`:

```json
{ "data": "OK" }
```

Error: `400` (field kosong, format email tidak valid, melebihi 255 karakter, email sudah terdaftar), `500` (internal).

### `POST /api/users/login` — Login

Body:

```json
{ "email": "budi@example.com", "password": "rahasia" }
```

Response sukses — `200` (token session UUID):

```json
{ "data": "550e8400-e29b-41d4-a716-446655440000" }
```

Error: `400` (field kosong), `401` (email atau password salah), `500`.

### `GET /api/users/current` — User Saat Ini

Header: `Authorization: Bearer <token>`

Response sukses — `200`:

```json
{
  "data": { "id": 1, "name": "Budi", "email": "budi@example.com", "created_at": "..." }
}
```

Error: `401` (token tidak valid/tidak ada), `500`.

### `DELETE /api/users/logout` — Logout

Header: `Authorization: Bearer <token>`

Response sukses — `200`:

```json
{ "data": "OK" }
```

Error: `401`, `500`.

### `GET /health` — Health Check

Response — `200` (database connected) atau `503` (database unreachable):

```json
{ "status": "ok", "database": "connected", "uptime": 12.34 }
```

## Skema Database

### Tabel `users`

| Kolom       | Tipe                | Keterangan                          |
| ----------- | ------------------- | ---------------------------------- |
| `id`        | INT, PK, AI         | Primary key auto-increment          |
| `name`      | VARCHAR(255)        | Nama user                          |
| `email`     | VARCHAR(255), UNIQUE | Email (untuk login)               |
| `password`  | VARCHAR(255)        | Password ter-hash bcrypt           |
| `created_at`| DATETIME            | Default `now()`                    |

### Tabel `sessions`

| Kolom        | Tipe                | Keterangan                         |
| ------------ | ------------------- | --------------------------------- |
| `id`         | INT, PK, AI         | Primary key auto-increment         |
| `token`      | VARCHAR(255), UNIQUE | Token session (UUID v4)          |
| `user_id`    | INT, FK → `users.id` | Relasi ke user                    |
| `created_at` | DATETIME            | Default `now()`                    |

Relasi: satu `User` memiliki banyak `Session` (one-to-many).

## Setup Project

Prasyarat: [Bun](https://bun.sh) v1.4+ dan MySQL/MariaDB yang berjalan.

1. Install dependencies:

   ```bash
   bun install
   ```

2. Buat file `.env` di root project dan sesuaikan kredensial database:

   ```env
   DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/DB_NAME"
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=USER
   DB_PASSWORD=PASSWORD
   DB_NAME=DB_NAME
   PORT=3000
   ```

3. Terapkan schema ke database:

   ```bash
   bunx prisma migrate dev
   ```

   > `bun install` juga otomatis menjalankan `prisma generate` via script `postinstall`.

## Menjalankan Aplikasi

Development (hot reload / watch mode):

```bash
bun run dev
```

Production:

```bash
bun run start
```

Server berjalan di `http://localhost:3000`. Verifikasi:

```bash
curl http://localhost:3000/health
```

Dokumentasi API interaktif (Swagger UI) tersedia di `http://localhost:3000/api-docs`.

## Menjalankan Test

Test integration menggunakan `bun:test` — server Express dijalankan di random port (`app.listen(0)`), request dikirim via `fetch`, dan data test dibersihkan langsung via Prisma setiap `beforeEach`:

```bash
bun test
```

Menjalankan satu file test saja:

```bash
bun test tests/register.test.ts
```

## Perintah Berguna

| Perintah                  | Fungsi                            |
| ------------------------- | --------------------------------- |
| `bun run dev`             | Jalankan server dengan watch mode |
| `bun run start`           | Jalankan server                   |
| `bun test`                | Jalankan semua test               |
| `bunx prisma migrate dev` | Buat/terapkan migration           |
| `bunx prisma generate`     | Regenerate Prisma Client          |
| `bun scripts/db-check.ts` | Tes koneksi & CRUD database       |

---

Project ini dibuat dengan `bun init` pada Bun v1.4.2.

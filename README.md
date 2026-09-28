# vibe-coding

Backend API menggunakan **Bun** + **ExpressJS** + **Prisma** + **MySQL**.

## Setup

1. Install dependencies:

   ```bash
   bun install
   ```

2. Salin `.env` (atau buat sendiri) dan sesuaikan kredensial MySQL lokal:

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

## Menjalankan

```bash
bun run dev
```

Server berjalan di `http://localhost:3000`. Cek health (termasuk koneksi database):

```bash
curl http://localhost:3000/health
```

## Struktur

```
src/index.ts        # entry point Express + /health
src/db.ts           # PrismaClient dengan MySQL adapter
prisma/schema.prisma
prisma/migrations/
scripts/db-check.ts # smoke test koneksi & CRUD
```

## Perintah Berguna

| Perintah                  | Fungsi                          |
| ------------------------- | ------------------------------- |
| `bun run dev`             | Jalankan server dengan hot reload |
| `bunx prisma migrate dev` | Buat/terapkan migration         |
| `bunx prisma generate`    | Regenerate Prisma Client        |
| `bun scripts/db-check.ts` | Tes koneksi & query database    |

Project ini dibuat dengan `bun init` pada Bun v1.4.2.

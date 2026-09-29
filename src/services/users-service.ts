import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { prisma } from "../db";

type RegisterInput = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

type Result<T = unknown> = {
  status: number;
  body: { data: T } | { error: string };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+$/;
const MAX_LENGTH = 255;

/**
 * Validasi bahwa nilai input adalah string yang tidak kosong (setelah trim).
 * Dipakai sebagai type guard untuk field name, email, dan password.
 *
 * @param value - Nilai apa pun yang akan diperiksa (biasanya dari request body).
 * @returns `true` jika value adalah string non-kosong (sekaligus type guard ke `string`), `false` jika tidak.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Membuat response standar untuk error internal (status 500).
 * Dipakai di catch block agar detail error tidak bocor ke client.
 *
 * @returns `Result` dengan status 500 dan pesan error generik.
 */
function internalError(): Result<never> {
  return { status: 500, body: { error: "Terjadi kesalahan internal" } };
}

/**
 * Memverifikasi header Authorization berformat "Bearer <token>"
 * lalu mencari session (beserta user-nya) di database berdasarkan token.
 *
 * @param authorizationHeader - Isi header `Authorization` dari request, diharapkan berformat "Bearer <token>".
 * @returns Data session beserta relasi user-nya jika token valid dan ditemukan di database, `null` jika format salah atau session tidak ada.
 * @throws Error dari Prisma jika query ke database gagal (ditangkap oleh pemanggil).
 */
async function authenticateBearer(authorizationHeader?: string) {
  if (
    typeof authorizationHeader !== "string" ||
    !authorizationHeader.startsWith("Bearer ")
  ) {
    return null;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (token.length === 0) {
    return null;
  }

  return prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
}

/**
 * Registrasi user baru (POST /api/users).
 * Memvalidasi field name, email, dan password (wajib diisi, maksimal 255 karakter,
 * format email valid, email belum terdaftar), meng-hash password dengan bcrypt,
 * lalu menyimpan user ke database.
 *
 * @param input - Payload registrasi dari request body: `{ name, email, password }`.
 * @returns `Result` berisi data "OK" dengan status 201 jika sukses, atau status 400 jika validasi gagal.
 * @throws Tidak melempar error — semua exception internal ditangkap dan dikembalikan sebagai `Result` status 500.
 */
export async function registerUser(input: RegisterInput): Promise<Result> {
  try {
    if (
      !isNonEmptyString(input.name) ||
      !isNonEmptyString(input.email) ||
      !isNonEmptyString(input.password)
    ) {
      return {
        status: 400,
        body: { error: "Name, email, dan password wajib diisi" },
      };
    }

    const name = input.name.trim();
    const email = input.email.trim();
    const password = input.password;

    if (name.length > MAX_LENGTH) {
      return {
        status: 400,
        body: { error: "Name maksimal 255 karakter" },
      };
    }

    if (email.length > MAX_LENGTH) {
      return {
        status: 400,
        body: { error: "Email maksimal 255 karakter" },
      };
    }

    if (password.length > MAX_LENGTH) {
      return {
        status: 400,
        body: { error: "Password maksimal 255 karakter" },
      };
    }

    if (!EMAIL_REGEX.test(email)) {
      return {
        status: 400,
        body: { error: "Format email tidak valid" },
      };
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return {
        status: 400,
        body: { error: "Email sudah terdaftar" },
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    return {
      status: 201,
      body: { data: "OK" },
    };
  } catch {
    return internalError();
  }
}

type LoginInput = {
  email?: unknown;
  password?: unknown;
};

/**
 * Login user (POST /api/users/login).
 * Mencari user berdasarkan email, memverifikasi password dengan bcrypt.compare,
 * lalu membuat session baru dengan token UUID v4 yang disimpan ke database.
 *
 * @param input - Payload login dari request body: `{ email, password }`.
 * @returns `Result` berisi token session (UUID v4) dengan status 200 jika kredensial valid, status 400 jika field kosong, atau status 401 jika email/password salah.
 * @throws Tidak melempar error — semua exception internal ditangkap dan dikembalikan sebagai `Result` status 500.
 */
export async function loginUser(input: LoginInput): Promise<Result> {
  try {
    if (!isNonEmptyString(input.email) || !isNonEmptyString(input.password)) {
      return {
        status: 400,
        body: { error: "Email dan password wajib diisi" },
      };
    }

    const email = input.email.trim();
    const password = input.password;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return {
        status: 401,
        body: { error: "Email atau Password salah" },
      };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return {
        status: 401,
        body: { error: "Email atau Password salah" },
      };
    }

    const token = randomUUID();

    await prisma.session.create({
      data: { token, userId: user.id },
    });

    return {
      status: 200,
      body: { data: token },
    };
  } catch {
    return internalError();
  }
}

/**
 * Mendapatkan data user yang sedang login (GET /api/users/current).
 * Memverifikasi Bearer token lewat authenticateBearer, lalu mengembalikan
 * data user (id, name, email, created_at) tanpa mengungkap password.
 *
 * @param authorizationHeader - Isi header `Authorization` dari request, berformat "Bearer <token>".
 * @returns `Result` berisi data user dengan status 200 jika token valid, atau status 401 jika tidak valid/tidak ada.
 * @throws Tidak melempar error — semua exception internal ditangkap dan dikembalikan sebagai `Result` status 500.
 */
export async function getCurrentUser(
  authorizationHeader?: string
): Promise<Result> {
  try {
    const session = await authenticateBearer(authorizationHeader);
    if (!session) {
      return {
        status: 401,
        body: { error: "Unauthorized" },
      };
    }

    return {
      status: 200,
      body: {
        data: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          created_at: session.user.createdAt,
        },
      },
    };
  } catch {
    return internalError();
  }
}

/**
 * Logout user (DELETE /api/users/logout).
 * Memverifikasi Bearer token lewat authenticateBearer, lalu menghapus
 * session dari database sehingga token tidak bisa dipakai lagi.
 *
 * @param authorizationHeader - Isi header `Authorization` dari request, berformat "Bearer <token>".
 * @returns `Result` berisi data "OK" dengan status 200 jika session berhasil dihapus, atau status 401 jika token tidak valid/tidak ada.
 * @throws Tidak melempar error — semua exception internal ditangkap dan dikembalikan sebagai `Result` status 500.
 */
export async function logoutUser(
  authorizationHeader?: string
): Promise<Result<string>> {
  try {
    const session = await authenticateBearer(authorizationHeader);
    if (!session) {
      return {
        status: 401,
        body: { error: "Unauthorized" },
      };
    }

    await prisma.session.delete({ where: { token: session.token } });

    return {
      status: 200,
      body: { data: "OK" },
    };
  } catch {
    return internalError();
  }
}

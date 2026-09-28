import bcrypt from "bcryptjs";
import { prisma } from "../db";

type RegisterInput = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

type Result = {
  status: number;
  body: { data: string } | { error: string };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function registerUser(input: RegisterInput): Promise<Result> {
  try {
    if (
      !isNonEmptyString(input.name) ||
      !isNonEmptyString(input.email) ||
      !isNonEmptyString(input.password)
    ) {
      return {
        status: 400,
        body: { error: "name, email, dan password wajib diisi" },
      };
    }

    const name = input.name.trim();
    const email = input.email.trim();
    const password = input.password;

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
    return {
      status: 500,
      body: { error: "Terjadi kesalahan internal" },
    };
  }
}

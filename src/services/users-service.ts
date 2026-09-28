import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
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

type LoginInput = {
  email?: unknown;
  password?: unknown;
};

export async function loginUser(input: LoginInput): Promise<Result> {
  try {
    if (!isNonEmptyString(input.email) || !isNonEmptyString(input.password)) {
      return {
        status: 400,
        body: { error: "email dan password wajib diisi" },
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
    return {
      status: 500,
      body: { error: "Terjadi kesalahan internal" },
    };
  }
}

export async function getCurrentUser(
  authorizationHeader?: string
): Promise<{ status: number; body: { data: unknown } | { error: string } }> {
  try {
    if (
      typeof authorizationHeader !== "string" ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return {
        status: 401,
        body: { error: "Unauthorized" },
      };
    }

    const token = authorizationHeader.slice("Bearer ".length).trim();
    if (token.length === 0) {
      return {
        status: 401,
        body: { error: "Unauthorized" },
      };
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
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
    return {
      status: 500,
      body: { error: "Terjadi kesalahan internal" },
    };
  }
}

export async function logoutUser(
  authorizationHeader?: string
): Promise<{ status: number; body: { data: string } | { error: string } }> {
  try {
    if (
      typeof authorizationHeader !== "string" ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return {
        status: 401,
        body: { error: "Unauthorized" },
      };
    }

    const token = authorizationHeader.slice("Bearer ".length).trim();
    if (token.length === 0) {
      return {
        status: 401,
        body: { error: "Unauthorized" },
      };
    }

    const session = await prisma.session.findUnique({ where: { token } });
    if (!session) {
      return {
        status: 401,
        body: { error: "Unauthorized" },
      };
    }

    await prisma.session.delete({ where: { token } });

    return {
      status: 200,
      body: { data: "OK" },
    };
  } catch {
    return {
      status: 500,
      body: { error: "Terjadi kesalahan internal" },
    };
  }
}

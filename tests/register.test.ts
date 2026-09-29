import { afterAll, beforeEach, expect, test } from "bun:test";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db";
import {
  closeTestServer,
  removeTestData,
  startTestServer,
} from "./helpers";

const EMAIL = "test-register@localhost";

const REG_EMAILS = [
  EMAIL,
  "test-register-dup@localhost",
  "test-register-255@localhost",
];

const { server, client } = startTestServer();

beforeEach(async () => {
  await removeTestData(REG_EMAILS);
});

afterAll(() => {
  closeTestServer(server);
});

test("1. registrasi sukses — data valid", async () => {
  const res = await client.register({
    name: "Test Register",
    email: EMAIL,
    password: "rahasia",
  });

  expect(res.status).toBe(201);
  const body = (await res.json()) as { data: string };
  expect(body.data).toBe("OK");
});

test("2. user tersimpan dengan benar — password ter-hash bcrypt", async () => {
  const res = await client.register({
    name: "Test Register",
    email: EMAIL,
    password: "rahasia",
  });
  expect(res.status).toBe(201);

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error("user tidak ditemukan di database");

  expect(user.name).toBe("Test Register");
  expect(user.email).toBe(EMAIL);
  expect(user.password).not.toBe("rahasia");
  expect(await bcrypt.compare("rahasia", user.password)).toBe(true);
});

test("3. email sudah terdaftar", async () => {
  await client.register({
    name: "Test Register",
    email: EMAIL,
    password: "rahasia",
  });

  const res = await client.register({
    name: "Test Register Dua",
    email: EMAIL,
    password: "rahasia",
  });

  expect(res.status).toBe(400);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe("Email sudah terdaftar");
});

test("4. field name kosong / tidak dikirim", async () => {
  const resKosong = await client.register({
    name: "",
    email: EMAIL,
    password: "rahasia",
  });
  expect(resKosong.status).toBe(400);
  const bodyKosong = (await resKosong.json()) as { error: string };
  expect(bodyKosong.error).toBe("Name, email, dan password wajib diisi");

  const resMissing = await client.register({
    email: EMAIL,
    password: "rahasia",
  });
  expect(resMissing.status).toBe(400);
  const bodyMissing = (await resMissing.json()) as { error: string };
  expect(bodyMissing.error).toBe("Name, email, dan password wajib diisi");
});

test("5. field email kosong / tidak dikirim", async () => {
  const resKosong = await client.register({
    name: "Test Register",
    email: "",
    password: "rahasia",
  });
  expect(resKosong.status).toBe(400);
  const bodyKosong = (await resKosong.json()) as { error: string };
  expect(bodyKosong.error).toBe("Name, email, dan password wajib diisi");

  const resMissing = await client.register({
    name: "Test Register",
    password: "rahasia",
  });
  expect(resMissing.status).toBe(400);
  const bodyMissing = (await resMissing.json()) as { error: string };
  expect(bodyMissing.error).toBe("Name, email, dan password wajib diisi");
});

test("6. field password kosong / tidak dikirim", async () => {
  const resKosong = await client.register({
    name: "Test Register",
    email: EMAIL,
    password: "",
  });
  expect(resKosong.status).toBe(400);
  const bodyKosong = (await resKosong.json()) as { error: string };
  expect(bodyKosong.error).toBe("Name, email, dan password wajib diisi");

  const resMissing = await client.register({
    name: "Test Register",
    email: EMAIL,
  });
  expect(resMissing.status).toBe(400);
  const bodyMissing = (await resMissing.json()) as { error: string };
  expect(bodyMissing.error).toBe("Name, email, dan password wajib diisi");
});

test("7. format email tidak valid", async () => {
  const res = await client.register({
    name: "Test Register",
    email: "bukan-email",
    password: "rahasia",
  });

  expect(res.status).toBe(400);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe("Format email tidak valid");
});

test("8. name lebih dari 255 karakter", async () => {
  const res = await client.register({
    name: "a".repeat(256),
    email: EMAIL,
    password: "rahasia",
  });

  expect(res.status).toBe(400);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe("Name maksimal 255 karakter");
});

test("9. email lebih dari 255 karakter", async () => {
  const email = "x".repeat(250) + "@localhost";
  const res = await client.register({
    name: "Test Register",
    email,
    password: "rahasia",
  });

  expect(res.status).toBe(400);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe("Email maksimal 255 karakter");
});

test("10. password lebih dari 255 karakter", async () => {
  const res = await client.register({
    name: "Test Register",
    email: EMAIL,
    password: "p".repeat(256),
  });

  expect(res.status).toBe(400);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe("Password maksimal 255 karakter");
});

test("11. batas atas valid — name tepat 255 karakter", async () => {
  const res = await client.register({
    name: "b".repeat(255),
    email: "test-register-255@localhost",
    password: "rahasia",
  });

  expect(res.status).toBe(201);
  const body = (await res.json()) as { data: string };
  expect(body.data).toBe("OK");
});

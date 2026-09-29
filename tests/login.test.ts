import { afterAll, beforeEach, expect, test } from "bun:test";
import { prisma } from "../src/db";
import {
  closeTestServer,
  isUuid,
  registerUser,
  removeTestData,
  startTestServer,
} from "./helpers";

const EMAIL = "test-login@localhost";

const { server, client } = startTestServer();

beforeEach(async () => {
  await removeTestData([EMAIL]);
});

afterAll(() => {
  closeTestServer(server);
});

test("1. login sukses — menghasilkan token UUID", async () => {
  await registerUser(client, EMAIL);

  const res = await client.login({ email: EMAIL, password: "rahasia" });

  expect(res.status).toBe(200);
  const body = (await res.json()) as { data: string };
  expect(isUuid(body.data)).toBe(true);
});

test("2. session tersimpan dengan benar — token sama dengan response, user_id sesuai", async () => {
  await registerUser(client, EMAIL);
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error("user tidak ditemukan di database");

  const res = await client.login({ email: EMAIL, password: "rahasia" });
  const body = (await res.json()) as { data: string };

  const session = await prisma.session.findUnique({
    where: { token: body.data },
  });
  if (!session) throw new Error("session tidak ditemukan di database");

  expect(session.token).toBe(body.data);
  expect(session.userId).toBe(user.id);
});

test("3. password salah", async () => {
  await registerUser(client, EMAIL);

  const res = await client.login({ email: EMAIL, password: "salah" });

  expect(res.status).toBe(401);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe("Email atau Password salah");
});

test("4. email tidak terdaftar — pesan identik dengan password salah", async () => {
  const resSalah = await client.login({
    email: EMAIL,
    password: "rahasia",
  });
  expect(resSalah.status).toBe(401);
  const bodySalah = (await resSalah.json()) as { error: string };
  expect(bodySalah.error).toBe("Email atau Password salah");

  const resTakTerdaftar = await client.login({
    email: "tidak-terdaftar@localhost",
    password: "rahasia",
  });
  expect(resTakTerdaftar.status).toBe(401);
  const bodyTakTerdaftar = (await resTakTerdaftar.json()) as { error: string };
  expect(bodyTakTerdaftar.error).toBe("Email atau Password salah");
  expect(bodyTakTerdaftar.error).toBe(bodySalah.error);
});

test("5. field email kosong / tidak dikirim", async () => {
  const resKosong = await client.login({ email: "", password: "rahasia" });
  expect(resKosong.status).toBe(400);
  const bodyKosong = (await resKosong.json()) as { error: string };
  expect(bodyKosong.error).toBe("Email dan password wajib diisi");

  const resMissing = await client.login({ password: "rahasia" });
  expect(resMissing.status).toBe(400);
  const bodyMissing = (await resMissing.json()) as { error: string };
  expect(bodyMissing.error).toBe("Email dan password wajib diisi");
});

test("6. field password kosong / tidak dikirim", async () => {
  const resKosong = await client.login({ email: EMAIL, password: "" });
  expect(resKosong.status).toBe(400);
  const bodyKosong = (await resKosong.json()) as { error: string };
  expect(bodyKosong.error).toBe("Email dan password wajib diisi");

  const resMissing = await client.login({ email: EMAIL });
  expect(resMissing.status).toBe(400);
  const bodyMissing = (await resMissing.json()) as { error: string };
  expect(bodyMissing.error).toBe("Email dan password wajib diisi");
});

test("7. multi-session — login dua kali menghasilkan dua session berbeda", async () => {
  await registerUser(client, EMAIL);

  const res1 = await client.login({ email: EMAIL, password: "rahasia" });
  const token1 = (await res1.json()) as { data: string };

  const res2 = await client.login({ email: EMAIL, password: "rahasia" });
  const token2 = (await res2.json()) as { data: string };

  expect(token1.data).not.toBe(token2.data);

  const sessions = await prisma.session.findMany({
    where: { user: { email: EMAIL } },
  });
  expect(sessions.length).toBe(2);

  const tokens = sessions.map((s) => s.token).sort();
  expect(tokens).toEqual([token1.data, token2.data].sort());
});

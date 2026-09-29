import { afterAll, beforeEach, expect, test } from "bun:test";
import { prisma } from "../src/db";
import {
  closeTestServer,
  loginUser,
  registerUser,
  removeTestData,
  startTestServer,
} from "./helpers";

const EMAIL = "test-logout@localhost";

const { server, client } = startTestServer();

beforeEach(async () => {
  await removeTestData([EMAIL]);
});

afterAll(() => {
  closeTestServer(server);
});

test("1. logout sukses", async () => {
  await registerUser(client, EMAIL);
  const token = await loginUser(client, EMAIL);

  const res = await client.logout(`Bearer ${token}`);

  expect(res.status).toBe(200);
  const body = (await res.json()) as { data: string };
  expect(body.data).toBe("OK");
});

test("2. session terhapus dari database", async () => {
  await registerUser(client, EMAIL);
  const token = await loginUser(client, EMAIL);

  const res = await client.logout(`Bearer ${token}`);
  expect(res.status).toBe(200);

  const session = await prisma.session.findUnique({ where: { token } });
  expect(session).toBeNull();
});

test("3. token mati setelah logout — current menolak", async () => {
  await registerUser(client, EMAIL);
  const token = await loginUser(client, EMAIL);

  const resLogout = await client.logout(`Bearer ${token}`);
  expect(resLogout.status).toBe(200);

  const resCurrent = await client.current(`Bearer ${token}`);
  expect(resCurrent.status).toBe(401);
  const body = (await resCurrent.json()) as { error: string };
  expect(body.error).toBe("Unauthorized");
});

test("4. logout kedua kali dengan token sama", async () => {
  await registerUser(client, EMAIL);
  const token = await loginUser(client, EMAIL);

  await client.logout(`Bearer ${token}`);

  const res = await client.logout(`Bearer ${token}`);

  expect(res.status).toBe(401);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe("Unauthorized");
});

test("5. token tidak valid", async () => {
  const res = await client.logout("Bearer token-palsu");

  expect(res.status).toBe(401);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe("Unauthorized");
});

test("6. header Authorization tidak dikirim", async () => {
  const res = await client.logout();

  expect(res.status).toBe(401);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe("Unauthorized");
});

test("7. hanya satu session yang terhapus — device lain tetap aktif", async () => {
  await registerUser(client, EMAIL);

  const token1 = await loginUser(client, EMAIL);
  const token2 = await loginUser(client, EMAIL);

  const resLogout = await client.logout(`Bearer ${token1}`);
  expect(resLogout.status).toBe(200);

  const resCurrent = await client.current(`Bearer ${token2}`);
  expect(resCurrent.status).toBe(200);

  const sessions = await prisma.session.findMany({
    where: { user: { email: EMAIL } },
  });
  expect(sessions.length).toBe(1);
  expect(sessions[0]?.token).toBe(token2);
});

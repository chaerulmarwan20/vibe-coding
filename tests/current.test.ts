import { afterAll, beforeEach, expect, test } from "bun:test";
import {
  closeTestServer,
  loginUser,
  registerUser,
  removeTestData,
  startTestServer,
} from "./helpers";

const EMAIL = "test-current@localhost";
const EMAIL_B = "test-current-b@localhost";

const CURRENT_EMAILS = [EMAIL, EMAIL_B];

const { server, client } = startTestServer();

beforeEach(async () => {
  await removeTestData(CURRENT_EMAILS);
});

afterAll(() => {
  closeTestServer(server);
});

test("1. token valid — data user sesuai pemilik token", async () => {
  await registerUser(client, EMAIL, "Test Current");
  const token = await loginUser(client, EMAIL);

  const res = await client.current(`Bearer ${token}`);

  expect(res.status).toBe(200);
  const body = (await res.json()) as {
    data: { id: number; name: string; email: string; created_at: string };
  };
  expect(body.data.name).toBe("Test Current");
  expect(body.data.email).toBe(EMAIL);
});

test("2. response tidak bocor — tidak ada field password", async () => {
  await registerUser(client, EMAIL);
  const token = await loginUser(client, EMAIL);

  const res = await client.current(`Bearer ${token}`);

  expect(res.status).toBe(200);
  const body = (await res.json()) as { data: Record<string, unknown> };
  expect("password" in body.data).toBe(false);
});

test("3. created_at terisi — timestamp valid", async () => {
  await registerUser(client, EMAIL);
  const token = await loginUser(client, EMAIL);

  const res = await client.current(`Bearer ${token}`);

  expect(res.status).toBe(200);
  const body = (await res.json()) as { data: { created_at: string } };
  expect(body.data.created_at).not.toBeNull();
  expect(Number.isNaN(new Date(body.data.created_at).getTime())).toBe(false);
});

test("4. token tidak valid", async () => {
  const res = await client.current("Bearer token-palsu");

  expect(res.status).toBe(401);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe("Unauthorized");
});

test("5. header Authorization tidak dikirim", async () => {
  const res = await client.current();

  expect(res.status).toBe(401);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe("Unauthorized");
});

test("6. header tanpa prefix Bearer — token mentah", async () => {
  await registerUser(client, EMAIL);
  const token = await loginUser(client, EMAIL);

  const res = await client.current(token);

  expect(res.status).toBe(401);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe("Unauthorized");
});

test("7. prefix Bearer tanpa token", async () => {
  const resKosong = await client.current("Bearer ");
  expect(resKosong.status).toBe(401);
  const bodyKosong = (await resKosong.json()) as { error: string };
  expect(bodyKosong.error).toBe("Unauthorized");

  const resTanpaSpasi = await client.current("Bearer");
  expect(resTanpaSpasi.status).toBe(401);
  const bodyTanpaSpasi = (await resTanpaSpasi.json()) as { error: string };
  expect(bodyTanpaSpasi.error).toBe("Unauthorized");
});

test("8. dua user berbeda — tiap token mengembalikan data user-nya sendiri", async () => {
  await registerUser(client, EMAIL, "User Satu");
  await registerUser(client, EMAIL_B, "User Dua");

  const tokenA = await loginUser(client, EMAIL);
  const tokenB = await loginUser(client, EMAIL_B);

  const resA = await client.current(`Bearer ${tokenA}`);
  const bodyA = (await resA.json()) as { data: { email: string; name: string } };
  expect(bodyA.data.email).toBe(EMAIL);
  expect(bodyA.data.name).toBe("User Satu");

  const resB = await client.current(`Bearer ${tokenB}`);
  const bodyB = (await resB.json()) as { data: { email: string; name: string } };
  expect(bodyB.data.email).toBe(EMAIL_B);
  expect(bodyB.data.name).toBe("User Dua");
});

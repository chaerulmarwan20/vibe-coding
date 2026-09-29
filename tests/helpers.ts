import type { Server } from "node:http";
import { expect } from "bun:test";
import app from "../src/index";
import { prisma } from "../src/db";

export type ApiClient = {
  register: (body: unknown) => Promise<Response>;
  login: (body: unknown) => Promise<Response>;
  current: (token?: string) => Promise<Response>;
  logout: (token?: string) => Promise<Response>;
  health: () => Promise<Response>;
};

export function startTestServer(): { server: Server; client: ApiClient } {
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const url = `http://localhost:${port}`;

  const client: ApiClient = {
    register: (body) =>
      fetch(`${url}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    login: (body) =>
      fetch(`${url}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    current: (token) =>
      fetch(`${url}/api/users/current`, {
        headers: token === undefined ? {} : { Authorization: token },
      }),
    logout: (token) =>
      fetch(`${url}/api/users/logout`, {
        method: "DELETE",
        headers: token === undefined ? {} : { Authorization: token },
      }),
    health: () => fetch(`${url}/health`),
  };

  return { server, client };
}

export function closeTestServer(server: Server) {
  server.close();
}

export async function removeTestData(emails: string[]) {
  await prisma.session.deleteMany({
    where: { user: { email: { in: emails } } },
  });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export async function registerUser(
  client: ApiClient,
  email: string,
  name = "Test User",
  password = "rahasia"
) {
  const res = await client.register({ name, email, password });
  expect(res.status).toBe(201);
  await res.json();
}

export async function loginUser(
  client: ApiClient,
  email: string,
  password = "rahasia"
): Promise<string> {
  const res = await client.login({ email, password });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { data: string };
  return body.data;
}

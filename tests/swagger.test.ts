import { afterAll, expect, test } from "bun:test";
import app from "../src/index";

const server = app.listen(0);
const port = (server.address() as { port: number }).port;
const url = `http://localhost:${port}`;

afterAll(() => {
  server.close();
});

test("swagger UI tersedia di /api-docs", async () => {
  const res = await fetch(`${url}/api-docs/`);
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("text/html");
});

test("spec openapi.json tersedia dan berisi semua endpoint", async () => {
  const res = await fetch(`${url}/api-docs/openapi.json`);
  expect(res.status).toBe(200);

  const spec = (await res.json()) as { paths: Record<string, unknown> };

  for (const path of [
    "/api/users",
    "/api/users/login",
    "/api/users/current",
    "/api/users/logout",
    "/health",
  ]) {
    expect(spec.paths[path]).toBeDefined();
  }
});

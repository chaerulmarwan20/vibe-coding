import { afterAll, expect, test } from "bun:test";
import {
  closeTestServer,
  startTestServer,
} from "./helpers";

const { server, client } = startTestServer();

afterAll(() => {
  closeTestServer(server);
});

test("health check sukses — database connected", async () => {
  const res = await client.health();

  expect(res.status).toBe(200);
  const body = (await res.json()) as {
    status: string;
    database: string;
    uptime: number;
  };
  expect(body.status).toBe("ok");
  expect(body.database).toBe("connected");
  expect(typeof body.uptime).toBe("number");
});

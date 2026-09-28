import express from "express";
import { prisma } from "./db";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: "ok", database: "unreachable", uptime: process.uptime() });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

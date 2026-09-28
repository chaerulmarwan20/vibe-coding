import { prisma } from "../src/db";

const user = await prisma.user.create({
  data: { email: "test@example.com", name: "Test User" },
});
console.log("created:", user);

const users = await prisma.user.findMany();
console.log("findMany:", users);

await prisma.user.delete({ where: { id: user.id } });
console.log("deleted. users remaining:", await prisma.user.count());
process.exit(0);

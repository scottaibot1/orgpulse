/**
 * Fix Bella's report filed under 4/1 → should be 3/31
 * submittedAt = 2026-04-01T03:39:54 UTC = 2026-03-31 11:39 PM ET
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.report.updateMany({
    where: {
      submittedAt: {
        gte: new Date("2026-04-01T03:00:00.000Z"),
        lt:  new Date("2026-04-01T04:00:00.000Z"),
      },
      user: { name: { contains: "Bella", mode: "insensitive" } },
    },
    data: { reportDate: new Date("2026-03-31T00:00:00.000Z") },
  });
  console.log(`Updated ${result.count} report(s) → reportDate = 2026-03-31`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

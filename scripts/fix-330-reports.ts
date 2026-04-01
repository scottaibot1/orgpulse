/**
 * Move reports filed under 3/31 UTC that are actually 3/30 US time
 * (uploaded between UTC 00:00–08:00 on 3/31 = US evening 3/30)
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Preview first
  const reports = await prisma.report.findMany({
    where: {
      submittedAt: {
        gte: new Date("2026-03-31T00:00:00.000Z"),
        lt:  new Date("2026-03-31T08:00:00.000Z"),
      },
    },
    select: { id: true, reportDate: true, submittedAt: true, user: { select: { name: true } } },
  });

  console.log("Reports to move from 3/31 → 3/30:");
  for (const r of reports) {
    console.log(`  user=${r.user.name}  submittedAt=${r.submittedAt.toISOString()}  currentReportDate=${r.reportDate?.toISOString() ?? "null"}`);
  }

  if (reports.length === 0) { console.log("  (none)"); return; }

  const ids = reports.map((r) => r.id);
  const result = await prisma.report.updateMany({
    where: { id: { in: ids } },
    data: { reportDate: new Date("2026-03-30T00:00:00.000Z") },
  });
  console.log(`\nUpdated ${result.count} report(s) → reportDate = 2026-03-30`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

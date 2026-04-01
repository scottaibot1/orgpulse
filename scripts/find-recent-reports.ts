import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const reports = await prisma.report.findMany({
    where: { submittedAt: { gte: new Date("2026-03-30T00:00:00.000Z") } },
    select: { id: true, reportDate: true, submittedAt: true, user: { select: { name: true } } },
    orderBy: { submittedAt: "desc" },
  });
  for (const r of reports) {
    console.log(`user=${r.user.name}  reportDate=${r.reportDate?.toISOString() ?? "null"}  submittedAt=${r.submittedAt.toISOString()}`);
  }
}
main().finally(() => prisma.$disconnect());

/**
 * Shared schedule utilities used by both the cron job and the manual summary
 * generation route to determine which users are expected to report on a given day.
 */

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Returns true if the person is due to submit a report on `today`.
 * reportDueDays: day-of-week indices (0=Sun…6=Sat) for weekly/biweekly/custom,
 *               day-of-month numbers (1–31) for monthly.
 */
export function isPersonDueToday(
  cadence: string,
  reportDueDays: number[],
  biweeklyWeek: string,
  today: Date,
  biweeklyStartDate: Date | null
): boolean {
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const dayOfMonth = today.getDate();

  switch (cadence) {
    case "daily":
      return true;

    case "weekly":
      return reportDueDays.includes(dayOfWeek);

    case "biweekly": {
      if (!reportDueDays.includes(dayOfWeek)) return false;
      if (!biweeklyStartDate) return true;
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weeksSinceStart = Math.floor((today.getTime() - biweeklyStartDate.getTime()) / msPerWeek);
      const isWeekA = weeksSinceStart % 2 === 0;
      return biweeklyWeek === "A" ? isWeekA : !isWeekA;
    }

    case "monthly":
      return reportDueDays.includes(dayOfMonth);

    case "custom":
      return reportDueDays.includes(dayOfWeek);

    default:
      return true;
  }
}

/**
 * Produces a human-readable schedule description for the placeholder line shown
 * when an entire department is not expected to report on the current generation date.
 * Examples: "reports weekly on Fridays", "reports weekly on Tuesdays and Fridays",
 *           "reports daily", "reports monthly on the 1st and 15th"
 */
export function buildScheduleLabel(cadence: string, dueDays: number[]): string {
  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
  };

  switch (cadence) {
    case "daily":
      return "reports daily";

    case "weekly":
    case "custom": {
      const names = dueDays.map((d) => DAY_NAMES[d]).filter(Boolean).map((n) => n + "s");
      if (!names.length) return "reports weekly";
      if (names.length === 1) return `reports weekly on ${names[0]}`;
      return `reports weekly on ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    }

    case "biweekly": {
      const names = dueDays.map((d) => DAY_NAMES[d]).filter(Boolean).map((n) => n + "s");
      return `reports every other ${names[0] ?? "week"}`;
    }

    case "monthly": {
      const sorted = [...dueDays].sort((a, b) => a - b);
      return `reports monthly on the ${sorted.map(ordinal).join(" and ")}`;
    }

    default:
      return "reports on a custom schedule";
  }
}

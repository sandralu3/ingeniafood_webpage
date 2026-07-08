import type { WeekDay } from "@/lib/plan/constants";

export function getTodayWeekDay(): WeekDay {
  const weekDays: WeekDay[] = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado"
  ];
  return weekDays[new Date().getDay()];
}

export function getMondayOfWeek(date = new Date()): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function formatWeekDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short"
  }).format(date);
}

export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getDateForWeekDay(monday: Date, dayIndex: number): Date {
  const date = new Date(monday);
  date.setDate(monday.getDate() + dayIndex);
  return date;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function parseISODateToLocalDate(isoDate: string): Date {
  // isoDate: YYYY-MM-DD -> Date a medianoche local
  const [y, m, d] = isoDate.split("-").map((v) => Number(v));
  const date = new Date();
  date.setFullYear(y, (m ?? 1) - 1, d ?? 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatMonthShortWithoutDot(date: Date): string {
  // es-ES suele devolver "jul." con punto; lo removemos para que quede "jul"
  return new Intl.DateTimeFormat("es-ES", { month: "short" })
    .format(date)
    .replace(/\./g, "");
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const start = new Intl.DateTimeFormat("es-ES", { day: "numeric" }).format(weekStart);
  const startMonth = formatMonthShortWithoutDot(weekStart);
  const weekEnd = addDays(weekStart, 6);
  const end = new Intl.DateTimeFormat("es-ES", { day: "numeric" }).format(weekEnd);
  const endMonth = formatMonthShortWithoutDot(weekEnd);
  return `${start} ${startMonth} - ${end} ${endMonth}`;
}


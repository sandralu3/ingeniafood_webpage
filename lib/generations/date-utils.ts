const DEFAULT_TIME_ZONE = "Europe/Madrid";

export function getTodayDateKey(timeZone = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}
